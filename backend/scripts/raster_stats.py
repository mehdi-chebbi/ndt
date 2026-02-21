#!/usr/bin/env python3
"""
Raster statistics calculator for polygon areas.
Clips a raster to a polygon and calculates pixel counts per class.
"""

import argparse
import json
import sys
import math
import rasterio
import rasterio.mask
import numpy as np
from shapely.geometry import shape


def calculate_stats(filepath, polygon_geojson):
    """
    Calculate pixel statistics for a raster clipped to a polygon.
    
    Args:
        filepath: Path to the raster file
        polygon_geojson: GeoJSON polygon geometry
    
    Returns:
        Dictionary with pixel counts and area calculations
    """
    # Parse polygon
    polygon = shape(polygon_geojson)
    
    with rasterio.open(filepath) as src:
        # Get pixel size
        pixel_size_deg = src.res
        bounds = src.bounds
        
        # Calculate pixel size in meters (center latitude approximation)
        center_lat = (bounds.top + bounds.bottom) / 2
        pixel_height_m = pixel_size_deg[1] * 111320
        pixel_width_m = pixel_size_deg[0] * 111320 * math.cos(math.radians(center_lat))
        pixel_area_ha = (pixel_width_m * pixel_height_m) / 10000
        
        # Clip raster to polygon
        out_image, out_transform = rasterio.mask.mask(
            src, 
            [polygon], 
            crop=True,
            all_touched=True
        )
        
        # Get the clipped data (first band)
        clipped_data = out_image[0]
        
        # Get nodata value
        nodata = src.nodata if src.nodata is not None else 255
        
        # Mask out nodata values
        valid_mask = clipped_data != nodata
        valid_data = clipped_data[valid_mask]
    
    # Count pixels per class
    if len(valid_data) == 0:
        return {
            'total_pixels': 0,
            'total_area_ha': 0,
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
    parser.add_argument('--polygon', required=True, help='GeoJSON polygon geometry')
    
    args = parser.parse_args()
    
    try:
        polygon_geojson = json.loads(args.polygon)
        stats = calculate_stats(args.file, polygon_geojson)
        print(json.dumps(stats))
    except Exception as e:
        error_result = {'error': str(e)}
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
