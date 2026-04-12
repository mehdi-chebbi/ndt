"""
Clipping Microservice
Cuts raster files to GeoJSON polygon boundaries using GDAL and publishes to GeoServer
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
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from pathlib import Path
import rasterio
from rasterio.windows import from_bounds, Window
from rasterio.features import geometry_mask
import numpy as np
from shapely.geometry import shape
from shapely.ops import unary_union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Clipping Service", version="1.0.0")

# -----------------------------
# CONFIGURATION
# -----------------------------
GEOSERVER_URL = os.getenv("GEOSERVER_URL", "http://192.168.2.93:8080/geoserver")
GEOSERVER_REST_URL = f"{GEOSERVER_URL}/rest"
GEOSERVER_USER = os.getenv("GEOSERVER_USER", "admin")
GEOSERVER_PASSWORD = os.getenv("GEOSERVER_PASSWORD", "geoserver")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "/data/tiffs/clipped")
GEOJSON_DIR = os.getenv("GEOJSON_DIR", "/app/geojson")

# Ensure output directory exists
Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)


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


class ClipResponse(BaseModel):
    status: str
    layer_name: str
    message: str


class StatsRequest(BaseModel):
    raster_path: str
    polygon: Optional[dict] = None  # GeoJSON (for user-drawn polygons)
    geojson_path: Optional[str] = None  # Path to GeoJSON file (for country files, avoids sending large payloads)


# -----------------------------
# HELPER FUNCTIONS
# -----------------------------
def sanitize_filename(name: str) -> str:
    """Replace spaces and special characters with underscores"""
    return name.replace(" ", "_").replace("-", "_").replace("(", "").replace(")", "")


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
        total = count_geom(g.get('coordinates', []), g.get('type', ''))
    else:
        total = count_geom(geojson.get('coordinates', []), geo_type)

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
        "-of", "GTiff",
        "-ot", "Byte",
        "-r", "near",
        "-multi",  # Enable multi-threading
        "-wo", f"NUM_THREADS={num_threads}",  # Use all CPU cores
        "-co", "COMPRESS=LZW",  # Enable compression for faster I/O
        "-co", "TILED=YES",  # Enable tiling for better performance
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
        raise HTTPException(
            status_code=500,
            detail=f"GDAL clipping failed: {e.stderr}"
        )


def publish_to_geoserver(
    tif_path: str,
    workspace: str,
    layer_id: str
) -> bool:
    """
    Publish clipped GeoTIFF to GeoServer via REST API
    """
    publish_url = f"{GEOSERVER_REST_URL}/workspaces/{workspace}/coveragestores/{layer_id}/file.geotiff?configure=all"

    logger.info(f"Publishing to GeoServer: {publish_url}")

    with open(tif_path, "rb") as f:
        response = requests.put(
            publish_url,
            data=f,
            auth=(GEOSERVER_USER, GEOSERVER_PASSWORD),
            headers={"Content-type": "image/tiff"}
        )

    if response.status_code not in [200, 201]:
        logger.error(f"GeoServer publish failed: {response.status_code} - {response.text}")
        raise HTTPException(
            status_code=500,
            detail=f"GeoServer publish failed: {response.text}"
        )

    logger.info(f"Successfully published to GeoServer: {workspace}:{layer_id}")
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


# -----------------------------
# ROUTES
# -----------------------------
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "clipping-service"}


@app.post("/clip", response_model=ClipResponse)
async def clip_layer(request: ClipRequest):
    """
    Clip a raster layer to a GeoJSON polygon and publish to GeoServer

    Steps:
    1. Validate input files exist
    2. Generate unique output layer name
    3. Run GDAL warp to clip the raster
    4. Publish clipped GeoTIFF to GeoServer
    5. Assign the specified style
    6. Return the new layer name
    """
    import time
    start_time = time.time()

    try:
        # 1. Validate files exist
        geojson_path = Path(request.geojson_path)
        raster_path = Path(request.raster_path)

        if not geojson_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"GeoJSON file not found: {request.geojson_path}"
            )

        if not raster_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Raster file not found: {request.raster_path}"
            )

        logger.info(f"Starting clip operation: {request.country_name} - {request.layer_name}")

        # 2. Generate output layer name
        output_layer_id = generate_output_layer_name(request.country_name, request.layer_name)
        # Organize by raster name: /data/tiffs/clipped/{raster_name}/{output_layer_id}.tif
        output_subdir = os.path.join(OUTPUT_DIR, request.layer_name)
        os.makedirs(output_subdir, exist_ok=True)
        output_tif = os.path.join(output_subdir, f"{output_layer_id}.tif")

        logger.info(f"Output layer name: {request.workspace}:{output_layer_id}")

        # 3. Run GDAL warp (in thread pool to avoid blocking the event loop)
        #    Limit threads per process so concurrent clips don't fight for CPU
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
            workspace=request.workspace,
            layer_id=output_layer_id
        )
        publish_time = time.time() - publish_start
        logger.info(f"GeoServer publish took {publish_time:.2f} seconds")

        # 5. Assign style (in thread pool — requests is blocking)
        await asyncio.to_thread(
            assign_style,
            workspace=request.workspace,
            layer_id=output_layer_id,
            style_name=request.style_name
        )

        # 6. Return success
        full_layer_name = f"{request.workspace}:{output_layer_id}"
        total_time = time.time() - start_time
        logger.info(f"Clip operation completed successfully: {full_layer_name} (Total: {total_time:.2f}s, GDAL: {gdal_time:.2f}s, Publish: {publish_time:.2f}s)")

        return ClipResponse(
            status="success",
            layer_name=full_layer_name,
            message=f"Successfully clipped and published layer in {total_time:.2f}s"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during clip operation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


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
