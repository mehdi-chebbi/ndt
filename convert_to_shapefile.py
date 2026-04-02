#!/usr/bin/env python3
"""
Convert GeoJSON to Shapefile format for GeoServer.
This is needed because GeoServer's Properties data source requires shapefiles.
"""

import geopandas as gpd
from pathlib import Path
import sys

def convert_geojson_to_shapefile(geojson_path: str, output_dir: str):
    """Convert GeoJSON to Shapefile."""
    geojson_file = Path(geojson_path)
    output_path = Path(output_dir)

    if not geojson_file.exists():
        print(f"❌ Error: GeoJSON file not found: {geojson_path}")
        return False

    print(f"📂 Reading GeoJSON: {geojson_path}")

    try:
        # Read GeoJSON
        gdf = gpd.read_file(geojson_file)
        print(f"✅ Loaded {len(gdf)} features")

        # Create output directory
        output_path.mkdir(parents=True, exist_ok=True)

        # Convert to shapefile
        shapefile_path = output_path / "africa-gini"
        gdf.to_file(shapefile_path, driver='ESRI Shapefile', encoding='utf-8')

        print(f"✅ Successfully created shapefile: {shapefile_path}")
        print(f"\n📁 Created files:")
        for ext in ['shp', 'shx', 'dbf', 'prj', 'cpg']:
            file_path = shapefile_path.with_suffix(f'.{ext}')
            if file_path.exists():
                size_kb = file_path.stat().st_size / 1024
                print(f"   - {file_path.name} ({size_kb:.1f} KB)")

        return True

    except Exception as e:
        print(f"❌ Error converting: {e}")
        return False


def main():
    """Main function."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    geojson_path = project_root / "backend" / "geojson" / "merged" / "africa-gini-complete.geojson"
    output_dir = project_root / "backend" / "geojson" / "shapefiles"

    print("=" * 60)
    print("🔄 Converting GeoJSON to Shapefile")
    print("=" * 60)

    success = convert_geojson_to_shapefile(geojson_path, output_dir)

    if success:
        print("\n" + "=" * 60)
        print("✅ Conversion completed successfully!")
        print("=" * 60)
        print("\n📋 Next steps:")
        print("1. In GeoServer, create a new Data Store")
        print("2. Select: Directory of spatial files (shapefiles)")
        print("3. Set directory to: file:///data/geojson/shapefiles")
        print("4. Publish the 'africa-gini' layer")
        print("5. Apply the SLD styles")
        return 0
    else:
        print("\n❌ Conversion failed!")
        return 1


if __name__ == "__main__":
    exit(main())
