#!/usr/bin/env python3
"""
Raster statistics calculator for polygon areas.
Clips a raster to a polygon and calculates pixel counts per class.
Uses windowed reading for memory efficiency with large rasters.
"""
import argparse
import json
import sys
import math
import rasterio
from rasterio.windows import from_bounds
from rasterio.features import geometry_mask
import numpy as np
from shapely.geometry import shape


def calculate_stats(filepath, polygon_geojson):
    """
    Calculate pixel statistics for a raster clipped to a polygon.

    Args:
        filepath: Path to the raster file
        polygon_geojson: GeoJSON polygon geometry (Polygon or MultiPolygon)

    Returns:
        Dictionary with pixel counts and area calculations
    """
    # Parse polygon (supports both Polygon and MultiPolygon)
    polygon = shape(polygon_geojson)

    with rasterio.open(filepath) as src:
        # Get pixel size in degrees
        pixel_size_deg = src.res

        # Use polygon bounds for center_lat (more accurate than full raster bounds)
        poly_bounds = polygon.bounds  # (minx, miny, maxx, maxy)
        center_lat = (poly_bounds[1] + poly_bounds[3]) / 2

        # Calculate pixel size in meters at the polygon's latitude
        pixel_height_m = pixel_size_deg[1] * 111320
        pixel_width_m = pixel_size_deg[0] * 111320 * math.cos(math.radians(center_lat))
        pixel_area_ha = (pixel_width_m * pixel_height_m) / 10000

        # Clamp polygon bounds to raster bounds to avoid out-of-bounds window
        raster_bounds = src.bounds
        clamped_bounds = (
            max(poly_bounds[0], raster_bounds.left),
            max(poly_bounds[1], raster_bounds.bottom),
            min(poly_bounds[2], raster_bounds.right),
            min(poly_bounds[3], raster_bounds.top),
        )

        # Check if polygon intersects raster at all
        if clamped_bounds[0] >= clamped_bounds[2] or clamped_bounds[1] >= clamped_bounds[3]:
            return {
                'total_pixels': 0,
                'total_area_km2': 0,
                'pixel_size_m': round((pixel_width_m + pixel_height_m) / 2, 1),
                'classes': []
            }

        # Get window for polygon bounds only (memory efficient - reads only what we need)
        window = from_bounds(
            clamped_bounds[0], clamped_bounds[1], clamped_bounds[2], clamped_bounds[3],
            src.transform
        )

        # Read only band 1 within the window
        windowed_transform = src.window_transform(window)
        windowed_data = src.read(1, window=window)

        # Get nodata value
        nodata = src.nodata if src.nodata is not None else 255

        # Create polygon mask within the window
        mask = geometry_mask(
            [polygon],
            transform=windowed_transform,
            invert=True,
            out_shape=windowed_data.shape,
            all_touched=True
        )

        # Apply polygon mask and nodata filter
        valid_data = windowed_data[mask & (windowed_data != nodata)]

    # Count pixels per class
    if len(valid_data) == 0:
        return {
            'total_pixels': 0,
            'total_area_km2': 0,
            'pixel_size_m': round((pixel_width_m + pixel_height_m) / 2, 1),
            'classes': []
        }

    unique, counts = np.unique(valid_data, return_counts=True)

    classes = []
    total_pixels = 0
    total_area_ha = 0

    for class_id, pixel_count in zip(unique.tolist(), counts.tolist()):
        area_ha = pixel_count * pixel_area_ha
        area_km2 = area_ha / 100

        classes.append({
            'class_id': class_id,
            'pixels': pixel_count,
            'area_km2': round(area_km2, 2)
        })

        total_pixels += pixel_count
        total_area_ha += area_ha

    # Sort by class_id
    classes.sort(key=lambda x: x['class_id'])

    return {
        'total_pixels': total_pixels,
        'total_area_km2': round(total_area_ha / 100, 2),
        'pixel_size_m': round((pixel_width_m + pixel_height_m) / 2, 1),
        'classes': classes
    }


def main():
    parser = argparse.ArgumentParser(description='Calculate raster statistics for a polygon')
    parser.add_argument('--file', required=True, help='Path to raster file')

    args = parser.parse_args()

    try:
        polygon_geojson = json.load(sys.stdin)
        stats = calculate_stats(args.file, polygon_geojson)
        print(json.dumps(stats))
    except Exception as e:
        error_result = {'error': str(e)}
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()