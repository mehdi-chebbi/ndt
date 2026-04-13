"""
Clipping Microservice
Cuts raster files to GeoJSON polygon boundaries using GDAL and publishes to GeoServer

Supports two clipping modes:
- Synchronous (POST /clip): For on-demand map clipping, returns result after completion
- Asynchronous (POST /clip/async): For batch clipping, returns immediately and processes in background
"""

import os
import json
import uuid
import math
import asyncio
import logging
import requests
from typing import Optional
from subprocess import run, CalledProcessError
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime
import rasterio
from rasterio.windows import from_bounds, Window
from rasterio.features import geometry_mask
import numpy as np
from shapely.geometry import shape
from shapely.ops import unary_union
import psycopg2

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Clipping Service", version="2.0.0")

# -----------------------------
# CONFIGURATION
# -----------------------------
GEOSERVER_URL = os.getenv("GEOSERVER_URL", "http://geoserver:8080/geoserver")
GEOSERVER_REST_URL = f"{GEOSERVER_URL}/rest"
GEOSERVER_USER = os.getenv("GEOSERVER_USER", "admin")
GEOSERVER_PASSWORD = os.getenv("GEOSERVER_PASSWORD", "geoserver")

# Clipped raster storage — both clip-service and GeoServer mount the same PVC
# clip-service writes here, GeoServer reads from GEOSERVER_FILE_BASE
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "/data/clipped-rasters")

# Path where GeoServer sees the shared PVC (may differ from OUTPUT_DIR)
# Used to build the file:// URL that GeoServer references
GEOSERVER_FILE_BASE = os.getenv("GEOSERVER_FILE_BASE", "/opt/clipped-rasters")

GEOJSON_DIR = os.getenv("GEOJSON_DIR", "/app/geojson")

# Database configuration
DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "platform_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# Concurrency control for async clip jobs
MAX_CONCURRENT_CLIPS = int(os.getenv("MAX_CONCURRENT_CLIPS", "3"))
clip_semaphore = asyncio.Semaphore(MAX_CONCURRENT_CLIPS)

# Ensure output directory exists
Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)


# -----------------------------
# DATABASE HELPER
# -----------------------------
def get_db_connection():
    """Create a new PostgreSQL connection"""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )


def insert_clip_cache(country_file: str, layer_db_id: int, clipped_layer_name: str, file_size_bytes: Optional[int] = None):
    """Insert or update a clipped layer in the cache table"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO clipped_layers_cache (country_file, layer_id, clipped_layer_name, file_size_bytes)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (country_file, layer_id) DO UPDATE
               SET clipped_layer_name = EXCLUDED.clipped_layer_name,
                   file_size_bytes = COALESCE(EXCLUDED.file_size_bytes, clipped_layers_cache.file_size_bytes)""",
            (country_file, layer_db_id, clipped_layer_name, file_size_bytes)
        )
        conn.commit()
        cur.close()
        conn.close()
        logger.info(f"DB cache updated: {country_file} -> {clipped_layer_name}")
    except Exception as e:
        logger.error(f"Failed to update DB cache for {country_file}: {e}")


def check_clip_cache(country_file: str, layer_db_id: int) -> bool:
    """Check if a clip already exists in cache"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM clipped_layers_cache WHERE country_file = %s AND layer_id = %s",
            (country_file, layer_db_id)
        )
        exists = cur.fetchone() is not None
        cur.close()
        conn.close()
        return exists
    except Exception as e:
        logger.error(f"Failed to check DB cache: {e}")
        return False


# -----------------------------
# MODELS
# -----------------------------
class ClipRequest(BaseModel):
    geojson_path: str
    raster_path: str
    workspace: str
    layer_name: str
    style_name: str
    country_name: str
    # Optional: for DB cache insert (used by backend to let clip-service manage cache)
    layer_db_id: Optional[int] = None
    country_file: Optional[str] = None


class ClipResponse(BaseModel):
    status: str
    layer_name: str
    message: str
    file_size_bytes: Optional[int] = None


class AsyncClipRequest(BaseModel):
    """Request for async (fire-and-forget) clipping"""
    geojson_path: str
    raster_path: str
    workspace: str
    layer_name: str
    style_name: str
    country_name: str
    # Required for async: clip-service manages DB cache
    layer_db_id: int
    country_file: str


class AsyncClipResponse(BaseModel):
    status: str  # "accepted"
    job_id: str
    message: str


class JobStatus(BaseModel):
    job_id: str
    country_name: str
    status: str  # "pending", "processing", "completed", "failed"
    submitted_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None
    clipped_layer_name: Optional[str] = None


class StatsRequest(BaseModel):
    raster_path: str
    polygon: Optional[dict] = None  # GeoJSON (for user-drawn polygons)
    geojson_path: Optional[str] = None  # Path to GeoJSON file (for country files, avoids sending large payloads)


# -----------------------------
# JOB TRACKING (in-memory, for monitoring)
# -----------------------------
class JobTracker:
    """Track async clip jobs in memory for status monitoring"""

    def __init__(self):
        self.jobs: dict[str, dict] = {}

    def create_job(self, country_name: str) -> str:
        job_id = uuid.uuid4().hex[:12]
        self.jobs[job_id] = {
            "job_id": job_id,
            "country_name": country_name,
            "status": "pending",
            "submitted_at": datetime.utcnow().isoformat() + "Z",
            "completed_at": None,
            "error": None,
            "clipped_layer_name": None,
        }
        return job_id

    def update_job(self, job_id: str, **kwargs):
        if job_id in self.jobs:
            self.jobs[job_id].update(kwargs)

    def get_job(self, job_id: str) -> Optional[dict]:
        return self.jobs.get(job_id)

    def get_all_jobs(self) -> list[dict]:
        return list(self.jobs.values())

    def cleanup_old_jobs(self, max_age_seconds: int = 3600):
        """Remove completed/failed jobs older than max_age_seconds"""
        now = datetime.utcnow()
        to_remove = []
        for job_id, job in self.jobs.items():
            if job["status"] in ("completed", "failed"):
                if job["completed_at"]:
                    completed = datetime.fromisoformat(job["completed_at"].replace("Z", "+00:00")).replace(tzinfo=None)
                    age = (now - completed).total_seconds()
                    if age > max_age_seconds:
                        to_remove.append(job_id)
        for job_id in to_remove:
            del self.jobs[job_id]


job_tracker = JobTracker()


# -----------------------------
# HELPER FUNCTIONS
# -----------------------------
def sanitize_filename(name: str) -> str:
    """Replace spaces, special characters, and accented chars with safe ASCII equivalents."""
    import unicodedata
    # Normalize unicode: decompose accented chars (e.g. ô → o + combining accent), then strip combining marks
    normalized = unicodedata.normalize('NFD', name)
    ascii_name = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
    # Replace problematic characters with underscores
    return ascii_name.replace(" ", "_").replace("'", "_").replace("-", "_").replace("(", "").replace(")", "")


def generate_output_layer_name(country_name: str, original_layer: str) -> str:
    """
    Generate output layer name following convention:
    clip_{sanitized_country}_{original_layer}_{uuid}
    Example: clip_Democratic_Republic_of_the_Congo_JRC_1_a3f8b2c1
    """
    sanitized_country = sanitize_filename(country_name)
    unique_id = uuid.uuid4().hex[:8]
    return f"clip_{sanitized_country}_{original_layer}_{unique_id}"


def extract_geometry(geojson: dict):
    """
    Extract a shapely geometry from any GeoJSON type:
    FeatureCollection -> union of all feature geometries
    Feature -> feature geometry
    Geometry -> direct shape
    """
    geo_type = geojson.get('type', '')

    if geo_type == 'FeatureCollection':
        features = geojson.get('features', [])
        if not features:
            raise ValueError('FeatureCollection has no features')
        geometries = []
        for feat in features:
            geom = feat.get('geometry')
            if geom:
                geometries.append(shape(geom))
        if not geometries:
            raise ValueError('FeatureCollection has no geometries')
        return unary_union(geometries)

    elif geo_type == 'Feature':
        geom = geojson.get('geometry')
        if not geom:
            raise ValueError('Feature has no geometry')
        return shape(geom)

    else:
        return shape(geojson)


def count_geojson_vertices(geojson: dict) -> int:
    """Count total coordinate vertices in any GeoJSON type."""
    geo_type = geojson.get('type', '')
    total = 0

    def count_geom(coords, geom_type):
        if geom_type in ('Point',):
            return 1
        elif geom_type in ('LineString', 'MultiPoint'):
            return len(coords)
        elif geom_type == 'Polygon' or geom_type == 'MultiLineString':
            return sum(len(ring) for ring in coords)
        elif geom_type == 'MultiPolygon':
            return sum(len(ring) for poly in coords for ring in poly)
        return 0

    if geo_type == 'FeatureCollection':
        for feat in geojson.get('features', []):
            g = feat.get('geometry', {})
            total += count_geom(g.get('coordinates', []), g.get('type', ''))
    elif geo_type == 'Feature':
        g = geojson.get('geometry', {})
        total += count_geom(g.get('coordinates', []), g.get('type', ''))
    else:
        total += count_geom(geojson.get('coordinates', []), geo_type)

    return total


def calculate_raster_stats(raster_path: str, polygon_geojson: dict) -> dict:
    """
    Calculate pixel statistics for a raster clipped to a polygon.
    Uses tiled processing (4096x4096 tiles) to stay within memory limits.
    Proven: ~950 MB peak for Algeria vs ~21 GB with full-window loading.

    Handles any GeoJSON type: FeatureCollection, Feature, or direct Geometry.

    Returns dict with: total_pixels, total_area_km2, pixel_size_m, classes
    """
    import gc
    import time as _time

    TILE_SIZE = 4096
    _t0 = _time.time()

    polygon = extract_geometry(polygon_geojson)

    with rasterio.open(raster_path) as src:
        pixel_size_deg = src.res
        poly_bounds = polygon.bounds
        center_lat = (poly_bounds[1] + poly_bounds[3]) / 2

        pixel_height_m = pixel_size_deg[1] * 111320
        pixel_width_m = pixel_size_deg[0] * 111320 * math.cos(math.radians(center_lat))
        pixel_area_ha = (pixel_width_m * pixel_height_m) / 10000

        raster_bounds = src.bounds
        clamped_bounds = (
            max(poly_bounds[0], raster_bounds.left),
            max(poly_bounds[1], raster_bounds.bottom),
            min(poly_bounds[2], raster_bounds.right),
            min(poly_bounds[3], raster_bounds.top),
        )

        if clamped_bounds[0] >= clamped_bounds[2] or clamped_bounds[1] >= clamped_bounds[3]:
            logger.info(f"Polygon does not intersect raster bounds: {raster_path}")
            return {
                'total_pixels': 0,
                'total_area_km2': 0,
                'pixel_size_m': round((pixel_width_m + pixel_height_m) / 2, 1),
                'classes': []
            }

        # Get the full intersection window (in raster pixel coordinates)
        full_window = from_bounds(
            clamped_bounds[0], clamped_bounds[1], clamped_bounds[2], clamped_bounds[3],
            src.transform
        )

        nodata = src.nodata if src.nodata is not None else 255

        # Accumulate class counts across all tiles
        class_counts: dict[int, int] = {}
        total_pixels = 0
        tiles_processed = 0
        tiles_skipped = 0

        # Iterate over the full window in TILE_SIZE chunks
        # Cast to int: rasterio Window dimensions can be numpy.float64
        win_h = int(full_window.height)
        win_w = int(full_window.width)
        for row_off in range(0, win_h, TILE_SIZE):
            for col_off in range(0, win_w, TILE_SIZE):
                tile_h = min(TILE_SIZE, win_h - row_off)
                tile_w = min(TILE_SIZE, win_w - col_off)

                # Tile window in raster pixel coordinates
                tile_window = Window(
                    col_off=full_window.col_off + col_off,
                    row_off=full_window.row_off + row_off,
                    width=tile_w,
                    height=tile_h
                )

                tile_data = src.read(1, window=tile_window)

                # Skip tiles that are entirely nodata
                if tile_data.size == 0 or np.all(tile_data == nodata):
                    tiles_skipped += 1
                    del tile_data
                    continue

                tile_transform = src.window_transform(tile_window)

                try:
                    mask = geometry_mask(
                        [polygon],
                        transform=tile_transform,
                        invert=True,
                        out_shape=(tile_h, tile_w),
                        all_touched=True
                    )
                except Exception:
                    # Tile doesn't intersect the polygon geometry
                    tiles_skipped += 1
                    del tile_data
                    continue

                # Skip tiles where mask is entirely False (no polygon overlap)
                if not np.any(mask):
                    tiles_skipped += 1
                    del tile_data, mask
                    continue

                # Extract valid pixels: inside polygon AND not nodata
                valid = mask & (tile_data != nodata)
                valid_data = tile_data[valid]

                if len(valid_data) == 0:
                    tiles_skipped += 1
                    del tile_data, mask, valid, valid_data
                    continue

                # Count classes in this tile and accumulate
                unique, counts = np.unique(valid_data, return_counts=True)
                for cls_id, cnt in zip(unique.tolist(), counts.tolist()):
                    class_counts[cls_id] = class_counts.get(cls_id, 0) + cnt
                    total_pixels += cnt

                tiles_processed += 1

                # Explicit cleanup to keep memory low
                del tile_data, mask, valid, valid_data, unique, counts

            # Periodic GC every row of tiles to release memory back to OS
            gc.collect()

    elapsed = _time.time() - _t0

    if total_pixels == 0:
        logger.info(f"No valid pixels found in polygon area for: {raster_path}")
        return {
            'total_pixels': 0,
            'total_area_km2': 0,
            'pixel_size_m': round((pixel_width_m + pixel_height_m) / 2, 1),
            'classes': []
        }

    # Build sorted classes list
    classes = []
    total_area_ha = 0
    for class_id in sorted(class_counts.keys()):
        pixel_count = class_counts[class_id]
        area_ha = pixel_count * pixel_area_ha
        area_km2 = area_ha / 100
        classes.append({
            'class_id': class_id,
            'pixels': pixel_count,
            'area_km2': round(area_km2, 2)
        })
        total_area_ha += area_ha

    logger.info(
        f"Stats computed: {len(classes)} classes, {total_pixels} total pixels, "
        f"{round(total_area_ha / 100, 2)} km2 total area | "
        f"tiles: {tiles_processed} processed, {tiles_skipped} skipped | "
        f"{elapsed:.2f}s"
    )

    return {
        'total_pixels': total_pixels,
        'total_area_km2': round(total_area_ha / 100, 2),
        'pixel_size_m': round((pixel_width_m + pixel_height_m) / 2, 1),
        'classes': classes
    }


def run_gdalwarp(geojson_path: str, raster_path: str, output_path: str, num_threads: int = None) -> bool:
    """
    Run gdalwarp to clip raster to GeoJSON boundary with multi-threading optimization
    """
    import os

    # Use provided thread count or all available CPU cores
    num_threads = num_threads or (os.cpu_count() or 4)

    cmd = [
        "gdalwarp",
        "-cutline", geojson_path,
        "-crop_to_cutline",
        "-of", "COG",
        "-ot", "Byte",
        "-r", "near",
        "-dstnodata", "255",
        "-multi",  # Enable multi-threading
        "-wo", f"NUM_THREADS={num_threads}",  # Use all CPU cores
        raster_path,
        output_path
    ]

    logger.info(f"Running GDAL warp with {num_threads} threads: {' '.join(cmd)}")

    try:
        result = run(cmd, capture_output=True, text=True, check=True)
        logger.info(f"GDAL warp completed successfully: {output_path}")
        return True
    except CalledProcessError as e:
        logger.error(f"GDAL warp failed: {e.stderr}")
        raise RuntimeError(f"GDAL clipping failed: {e.stderr}")


def publish_to_geoserver(
    tif_path: str,
    workspace: str,
    layer_id: str
) -> bool:
    """
    Publish clipped GeoTIFF to GeoServer via REST API.
    Uses external file reference (file:// URL) so GeoServer reads directly
    from the shared PVC — no file copy into GeoServer's data dir.
    """
    # Convert clip-service path to GeoServer's view of the same file
    # e.g. /data/clipped-rasters/Landcover/clip_xxx.tif → /opt/clipped-rasters/Landcover/clip_xxx.tif
    try:
        geoserver_tif_path = tif_path.replace(OUTPUT_DIR, GEOSERVER_FILE_BASE, 1)
    except ValueError:
        # If OUTPUT_DIR is not a prefix of tif_path, try direct replacement
        geoserver_tif_path = tif_path
    file_url = f"file://{geoserver_tif_path}"

    logger.info(f"Publishing to GeoServer (external ref): {file_url}")

    # Use external.geotiff to reference file without copying
    publish_url = (
        f"{GEOSERVER_REST_URL}/workspaces/{workspace}"
        f"/coveragestores/{layer_id}/external.geotiff?configure=all"
    )

    response = requests.put(
        publish_url,
        data=file_url,
        auth=(GEOSERVER_USER, GEOSERVER_PASSWORD),
        headers={"Content-Type": "text/plain"}
    )

    if response.status_code not in [200, 201, 202]:
        logger.error(f"GeoServer publish failed: {response.status_code} - {response.text}")
        raise RuntimeError(f"GeoServer publish failed: {response.text}")

    logger.info(f"Successfully published to GeoServer (external ref): {workspace}:{layer_id}")
    return True


def assign_style(workspace: str, layer_id: str, style_name: str) -> bool:
    """
    Assign default style to the published layer
    """
    style_url = f"{GEOSERVER_REST_URL}/layers/{workspace}:{layer_id}"
    style_payload = f"<layer><defaultStyle><name>{style_name}</name></defaultStyle></layer>"

    logger.info(f"Assigning style {style_name} to {workspace}:{layer_id}")

    response = requests.put(
        style_url,
        data=style_payload,
        auth=(GEOSERVER_USER, GEOSERVER_PASSWORD),
        headers={"Content-type": "application/xml"}
    )

    if response.status_code not in [200, 201]:
        logger.warning(f"Style assignment failed: {response.status_code} - {response.text}")
        # Don't fail the entire operation if style assignment fails
        return False

    logger.info(f"Successfully assigned style: {style_name}")
    return True


async def perform_clip(
    geojson_path: str,
    raster_path: str,
    workspace: str,
    layer_name: str,
    style_name: str,
    country_name: str,
) -> dict:
    """
    Core clip operation: validate → gdalwarp → publish → style
    Returns dict with: clipped_layer_name, output_tif_path, file_size_bytes

    Raises RuntimeError on failure.
    """
    import time

    # 1. Validate files exist
    geojson_path_obj = Path(geojson_path)
    raster_path_obj = Path(raster_path)

    if not geojson_path_obj.exists():
        raise RuntimeError(f"GeoJSON file not found: {geojson_path}")

    if not raster_path_obj.exists():
        raise RuntimeError(f"Raster file not found: {raster_path}")

    logger.info(f"Starting clip operation: {country_name} - {layer_name}")

    # 2. Generate output layer name
    output_layer_id = generate_output_layer_name(country_name, layer_name)
    output_subdir = os.path.join(OUTPUT_DIR, layer_name)
    os.makedirs(output_subdir, exist_ok=True)
    output_tif = os.path.join(output_subdir, f"{output_layer_id}.tif")

    logger.info(f"Output layer name: {workspace}:{output_layer_id}")

    # 3. Run GDAL warp (in thread pool to avoid blocking the event loop)
    cpu_count = os.cpu_count() or 4
    threads_per_clip = max(2, cpu_count // 3)
    gdal_start = time.time()
    await asyncio.to_thread(
        run_gdalwarp,
        geojson_path=str(geojson_path),
        raster_path=str(raster_path),
        output_path=output_tif,
        num_threads=threads_per_clip
    )
    gdal_time = time.time() - gdal_start
    logger.info(f"GDAL warp took {gdal_time:.2f} seconds")

    # 4. Publish to GeoServer (in thread pool — requests is blocking)
    publish_start = time.time()
    await asyncio.to_thread(
        publish_to_geoserver,
        tif_path=output_tif,
        workspace=workspace,
        layer_id=output_layer_id
    )
    publish_time = time.time() - publish_start
    logger.info(f"GeoServer publish took {publish_time:.2f} seconds")

    # 5. Assign style (in thread pool — requests is blocking)
    await asyncio.to_thread(
        assign_style,
        workspace=workspace,
        layer_id=output_layer_id,
        style_name=style_name
    )

    # 6. Get file size
    file_size_bytes = None
    if os.path.exists(output_tif):
        file_size_bytes = os.path.getsize(output_tif)

    full_layer_name = f"{workspace}:{output_layer_id}"

    return {
        "clipped_layer_name": full_layer_name,
        "output_tif": output_tif,
        "file_size_bytes": file_size_bytes,
    }


# -----------------------------
# ROUTES
# -----------------------------
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "clipping-service", "version": "2.0.0"}


@app.post("/clip", response_model=ClipResponse)
async def clip_layer(request: ClipRequest):
    """
    Synchronous clip: Clip a raster layer and wait for result.
    Used by the map for on-demand clipping.

    If layer_db_id and country_file are provided, also inserts into DB cache.
    """
    import time
    start_time = time.time()

    try:
        # If DB cache params provided, check cache first (skip redundant clips)
        if request.layer_db_id and request.country_file:
            if check_clip_cache(request.country_file, request.layer_db_id):
                logger.info(f"[Sync Clip] Cache hit for {request.country_file} (layer {request.layer_db_id})")
                return ClipResponse(
                    status="success",
                    layer_name="cached",
                    message="Already clipped (cache hit)",
                    file_size_bytes=None
                )

        # Perform the actual clip
        result = await perform_clip(
            geojson_path=request.geojson_path,
            raster_path=request.raster_path,
            workspace=request.workspace,
            layer_name=request.layer_name,
            style_name=request.style_name,
            country_name=request.country_name,
        )

        # Insert into DB cache if params provided
        if request.layer_db_id and request.country_file:
            insert_clip_cache(
                country_file=request.country_file,
                layer_db_id=request.layer_db_id,
                clipped_layer_name=result["clipped_layer_name"],
                file_size_bytes=result["file_size_bytes"],
            )

        total_time = time.time() - start_time
        logger.info(
            f"Sync clip completed: {result['clipped_layer_name']} "
            f"(Total: {total_time:.2f}s, Size: {result['file_size_bytes']} bytes)"
        )

        return ClipResponse(
            status="success",
            layer_name=result["clipped_layer_name"],
            message=f"Successfully clipped and published layer in {total_time:.2f}s",
            file_size_bytes=result["file_size_bytes"]
        )

    except RuntimeError as e:
        logger.error(f"Sync clip failed for {request.country_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during sync clip: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/clip/async", response_model=AsyncClipResponse)
async def clip_layer_async(request: AsyncClipRequest):
    """
    Asynchronous clip: Accept job and return immediately.
    The clip is processed in a background task with concurrency control.
    Used by the admin batch clipping system.

    Clip-service handles the full lifecycle: clip → publish → DB cache insert.
    """
    # Register the job
    job_id = job_tracker.create_job(request.country_name)

    logger.info(
        f"[Async Clip] Job {job_id} accepted for {request.country_name} "
        f"(layer {request.layer_db_id}, queue: {job_tracker.get_all_jobs().__len__()})"
    )

    # Spawn background task
    asyncio.create_task(_process_async_job(job_id, request))

    return AsyncClipResponse(
        status="accepted",
        job_id=job_id,
        message=f"Clip job queued for {request.country_name}"
    )


async def _process_async_job(job_id: str, request: AsyncClipRequest):
    """Background task that processes a single async clip job"""
    import time

    job_tracker.update_job(job_id, status="processing")

    async with clip_semaphore:
        try:
            logger.info(f"[Async Clip] Job {job_id} started processing: {request.country_name}")
            start_time = time.time()

            # Check cache (skip if already clipped)
            if check_clip_cache(request.country_file, request.layer_db_id):
                logger.info(f"[Async Clip] Job {job_id} cache hit, skipping: {request.country_name}")
                job_tracker.update_job(
                    job_id,
                    status="completed",
                    completed_at=datetime.utcnow().isoformat() + "Z",
                    clipped_layer_name="cached",
                )
                return

            # Perform the clip
            result = await perform_clip(
                geojson_path=request.geojson_path,
                raster_path=request.raster_path,
                workspace=request.workspace,
                layer_name=request.layer_name,
                style_name=request.style_name,
                country_name=request.country_name,
            )

            # Insert into DB cache
            insert_clip_cache(
                country_file=request.country_file,
                layer_db_id=request.layer_db_id,
                clipped_layer_name=result["clipped_layer_name"],
                file_size_bytes=result["file_size_bytes"],
            )

            total_time = time.time() - start_time
            logger.info(
                f"[Async Clip] Job {job_id} completed: {result['clipped_layer_name']} "
                f"(Total: {total_time:.2f}s, GDAL included, Size: {result['file_size_bytes']} bytes)"
            )

            job_tracker.update_job(
                job_id,
                status="completed",
                completed_at=datetime.utcnow().isoformat() + "Z",
                clipped_layer_name=result["clipped_layer_name"],
            )

        except Exception as e:
            error_msg = str(e)
            logger.error(f"[Async Clip] Job {job_id} FAILED for {request.country_name}: {error_msg}")
            job_tracker.update_job(
                job_id,
                status="failed",
                completed_at=datetime.utcnow().isoformat() + "Z",
                error=error_msg,
            )


@app.get("/clip/jobs")
async def list_jobs():
    """List all async clip jobs and their statuses"""
    # Cleanup old completed/failed jobs
    job_tracker.cleanup_old_jobs()
    return {"jobs": job_tracker.get_all_jobs()}


# -----------------------------
# FILE DELETION ENDPOINTS
# -----------------------------
# These are called by the backend after unpublishing from GeoServer catalog.
# They remove the physical .tif files from the shared PVC.

def find_clipped_file(clipped_layer_name: str) -> Optional[str]:
    """
    Find the physical .tif file on disk for a given clipped layer name.
    Searches OUTPUT_DIR subdirectories for a file matching the clip ID.
    
    clipped_layer_name format: "workspace:clip_CountryName_LayerName_uuid"
    Returns the full path to the .tif file, or None if not found.
    """
    # Extract the clip ID (everything after the colon)
    if ':' in clipped_layer_name:
        clip_id = clipped_layer_name.split(':', 1)[1]
    else:
        clip_id = clipped_layer_name

    target_filename = f"{clip_id}.tif"
    logger.info(f"Searching for file: {target_filename} in {OUTPUT_DIR}")

    # Walk OUTPUT_DIR to find the file
    if not os.path.exists(OUTPUT_DIR):
        logger.warning(f"OUTPUT_DIR does not exist: {OUTPUT_DIR}")
        return None

    for root, dirs, files in os.walk(OUTPUT_DIR):
        if target_filename in files:
            return os.path.join(root, target_filename)

    logger.warning(f"File not found for {clipped_layer_name}: {target_filename}")
    return None


class DeleteFileRequest(BaseModel):
    clipped_layer_name: str


class DeleteFilesRequest(BaseModel):
    clipped_layer_names: list[str]


@app.delete("/clip/file")
async def delete_clipped_file(request: DeleteFileRequest):
    """
    Delete a single physical clipped .tif file from the shared PVC.
    Called by the backend after unpublishing from GeoServer catalog.
    """
    file_path = find_clipped_file(request.clipped_layer_name)

    if not file_path:
        logger.warning(f"File not found, skipping delete for: {request.clipped_layer_name}")
        return {"status": "not_found", "message": f"File not found for {request.clipped_layer_name}"}

    try:
        os.remove(file_path)
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        logger.info(f"Deleted clipped file: {file_path}")

        # Try to clean up empty subdirectories
        parent_dir = os.path.dirname(file_path)
        try:
            if os.path.exists(parent_dir) and not os.listdir(parent_dir):
                os.rmdir(parent_dir)
                logger.info(f"Removed empty directory: {parent_dir}")
        except OSError:
            pass

        return {"status": "success", "deleted": file_path, "clipped_layer_name": request.clipped_layer_name}

    except OSError as e:
        logger.error(f"Failed to delete file {file_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {e}")


@app.delete("/clip/files")
async def delete_clipped_files(request: DeleteFilesRequest):
    """
    Delete multiple physical clipped .tif files from the shared PVC.
    Called by the backend during batch-delete operations.
    """
    deleted = []
    not_found = []
    failed = []

    for name in request.clipped_layer_names:
        file_path = find_clipped_file(name)
        if not file_path:
            not_found.append(name)
            continue

        try:
            os.remove(file_path)
            deleted.append({"clipped_layer_name": name, "path": file_path})

            # Try to clean up empty subdirectories
            parent_dir = os.path.dirname(file_path)
            try:
                if os.path.exists(parent_dir) and not os.listdir(parent_dir):
                    os.rmdir(parent_dir)
            except OSError:
                pass

        except OSError as e:
            logger.error(f"Failed to delete {file_path}: {e}")
            failed.append({"clipped_layer_name": name, "error": str(e)})

    logger.info(
        f"Batch file delete: {len(deleted)} deleted, {len(not_found)} not found, {len(failed)} failed"
    )

    return {
        "status": "success" if len(failed) == 0 else "partial",
        "deleted": deleted,
        "not_found": not_found,
        "failed": failed if failed else None,
        "total": len(request.clipped_layer_names),
    }


@app.post("/stats")
async def compute_stats(request: StatsRequest):
    """
    Calculate raster statistics for a polygon area.

    Two modes:
    - polygon: GeoJSON dict in body (for user-drawn polygons, small)
    - geojson_path: file path on disk (for country GeoJSONs, large)
    """
    import time
    start_time = time.time()

    raster_path = Path(request.raster_path)

    if not raster_path.exists():
        logger.error(f"Raster file not found: {request.raster_path}")
        raise HTTPException(
            status_code=404,
            detail=f"Raster file not found: {request.raster_path}"
        )

    # Load polygon: from file path or from body
    if request.geojson_path:
        geojson_file = Path(request.geojson_path)
        if not geojson_file.exists():
            logger.error(f"GeoJSON file not found: {request.geojson_path}")
            raise HTTPException(
                status_code=404,
                detail=f"GeoJSON file not found: {request.geojson_path}"
            )
        logger.info(f"[STATS] Reading GeoJSON from file: {request.geojson_path}")
        with open(geojson_file, 'r') as f:
            polygon = json.load(f)
    elif request.polygon:
        polygon = request.polygon
    else:
        raise HTTPException(
            status_code=400,
            detail="Either 'polygon' or 'geojson_path' must be provided"
        )

    polygon_type = polygon.get('type', 'unknown')
    coord_count = count_geojson_vertices(polygon)
    logger.info(f"[STATS] Starting computation for raster: {request.raster_path} | polygon type: {polygon_type} | coordinate count: {coord_count}")

    try:
        result = await asyncio.to_thread(
            calculate_raster_stats,
            raster_path=str(raster_path),
            polygon_geojson=polygon
        )

        elapsed = time.time() - start_time
        logger.info(f"[STATS] Computation completed in {elapsed:.2f}s | raster: {request.raster_path} | classes: {len(result['classes'])} | total_area: {result['total_area_km2']} km2")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[STATS] Error computing stats: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Stats computation failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3005)
