"""
Clipping Microservice
Cuts raster files to GeoJSON polygon boundaries using GDAL and publishes to GeoServer
"""

import os
import uuid
import asyncio
import logging
import requests
from typing import Optional
from subprocess import run, CalledProcessError
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from pathlib import Path

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3005)
