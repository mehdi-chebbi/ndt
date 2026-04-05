#!/usr/bin/env python3
"""
Merge all African country GeoJSON files with Gini data from GiniWatch.
Creates a complete Africa GeoJSON with all Gini statistics embedded.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional

# Gini data extracted from GiniWatch page
# Format: Country name -> list of {year, value} readings
GINI_DATA = {
    "Algeria": [{"year": 2011, "value": 27.6}],
    "Angola": [
        {"year": 2000, "value": 51.9},
        {"year": 2008, "value": 42.7},
        {"year": 2018, "value": 51.3},
        {"year": 2021, "value": 53.0}
    ],
    "Benin": [
        {"year": 2003, "value": 38.6},
        {"year": 2011, "value": 43.4},
        {"year": 2015, "value": 47.6},
        {"year": 2018, "value": 37.9},
        {"year": 2021, "value": 34.4}
    ],
    "Botswana": [
        {"year": 2002, "value": 61.5},
        {"year": 2009, "value": 56.9},
        {"year": 2015, "value": 54.9},
        {"year": 2021, "value": 53.3}
    ],
    "Burkina Faso": [
        {"year": 2003, "value": 43.3},
        {"year": 2009, "value": 39.8},
        {"year": 2014, "value": 35.3},
        {"year": 2018, "value": 43.0},
        {"year": 2021, "value": 37.4}
    ],
    "Burundi": [
        {"year": 2006, "value": 33.4},
        {"year": 2013, "value": 38.6},
        {"year": 2020, "value": 37.5}
    ],
    "Cabo Verde": [
        {"year": 2001, "value": 52.5},
        {"year": 2007, "value": 47.2},
        {"year": 2015, "value": 42.4},
        {"year": 2021, "value": 40.5}
    ],
    "Cameroon": [
        {"year": 2001, "value": 42.1},
        {"year": 2007, "value": 42.8},
        {"year": 2014, "value": 46.6},
        {"year": 2021, "value": 42.2}
    ],
    "Central African Republic": [
        {"year": 2008, "value": 56.2},
        {"year": 2021, "value": 43.0}
    ],
    "Chad": [
        {"year": 2003, "value": 39.8},
        {"year": 2011, "value": 43.3},
        {"year": 2019, "value": 37.5},
        {"year": 2023, "value": 37.4}
    ],
    "Comoros": [
        {"year": 2004, "value": 55.9},
        {"year": 2014, "value": 45.3},
        {"year": 2021, "value": 43.0}
    ],
    "Congo, Democratic Republic of the": [
        {"year": 2004, "value": 41.6},
        {"year": 2012, "value": 42.1},
        {"year": 2020, "value": 44.7}
    ],
    "Congo": [
        {"year": 2005, "value": 47.3},
        {"year": 2011, "value": 48.9},
        {"year": 2021, "value": 46.5}
    ],
    "Côte d'Ivoire": [
        {"year": 2002, "value": 41.3},
        {"year": 2008, "value": 43.2},
        {"year": 2015, "value": 41.5},
        {"year": 2018, "value": 37.2},
        {"year": 2021, "value": 35.3}
    ],
    "Djibouti": [
        {"year": 2002, "value": 40.0},
        {"year": 2013, "value": 45.1},
        {"year": 2014, "value": 44.1},
        {"year": 2017, "value": 41.6}
    ],
    "Egypt": [
        {"year": 2004, "value": 31.8},
        {"year": 2008, "value": 31.1},
        {"year": 2010, "value": 30.2},
        {"year": 2012, "value": 28.3},
        {"year": 2015, "value": 31.8},
        {"year": 2017, "value": 31.5},
        {"year": 2019, "value": 31.9},
        {"year": 2021, "value": 28.5}
    ],
    "Equatorial Guinea": [
        {"year": 2022, "value": 38.5}
    ],
    "Eswatini": [
        {"year": 2000, "value": 53.1},
        {"year": 2010, "value": 51.4},
        {"year": 2016, "value": 54.6}
    ],
    "Ethiopia": [
        {"year": 2004, "value": 29.8},
        {"year": 2010, "value": 33.2},
        {"year": 2015, "value": 35.0},
        {"year": 2021, "value": 31.1}
    ],
    "Gabon": [
        {"year": 2005, "value": 42.2},
        {"year": 2017, "value": 38.0}
    ],
    "Gambia": [
        {"year": 2003, "value": 47.3},
        {"year": 2010, "value": 43.6},
        {"year": 2015, "value": 35.9},
        {"year": 2020, "value": 38.8}
    ],
    "Ghana": [
        {"year": 2005, "value": 42.8},
        {"year": 2012, "value": 42.4},
        {"year": 2016, "value": 43.5}
    ],
    "Guinea": [
        {"year": 2002, "value": 43.0},
        {"year": 2007, "value": 39.4},
        {"year": 2012, "value": 33.7},
        {"year": 2018, "value": 29.6}
    ],
    "Guinea-Bissau": [
        {"year": 2002, "value": 35.6},
        {"year": 2010, "value": 50.6},
        {"year": 2018, "value": 34.8},
        {"year": 2021, "value": 33.4}
    ],
    "Kenya": [
        {"year": 2005, "value": 46.4},
        {"year": 2015, "value": 40.8},
        {"year": 2020, "value": 36.2},
        {"year": 2021, "value": 38.7},
        {"year": 2022, "value": 37.7}
    ],
    "Lesotho": [
        {"year": 2002, "value": 51.2},
        {"year": 2017, "value": 44.9}
    ],
    "Liberia": [
        {"year": 2007, "value": 36.4},
        {"year": 2014, "value": 33.2},
        {"year": 2016, "value": 35.3}
    ],
    "Madagascar": [
        {"year": 2001, "value": 47.4},
        {"year": 2005, "value": 39.9},
        {"year": 2010, "value": 42.4},
        {"year": 2012, "value": 42.6},
        {"year": 2021, "value": 36.8}
    ],
    "Malawi": [
        {"year": 2004, "value": 39.9},
        {"year": 2010, "value": 45.5},
        {"year": 2016, "value": 44.7},
        {"year": 2019, "value": 38.5}
    ],
    "Mali": [
        {"year": 2001, "value": 39.9},
        {"year": 2006, "value": 38.9},
        {"year": 2009, "value": 33.0},
        {"year": 2018, "value": 36.0},
        {"year": 2021, "value": 35.7}
    ],
    "Mauritania": [
        {"year": 2000, "value": 39.0},
        {"year": 2004, "value": 40.2},
        {"year": 2008, "value": 35.7},
        {"year": 2014, "value": 32.6},
        {"year": 2019, "value": 32.0}
    ],
    "Mauritius": [
        {"year": 2006, "value": 35.7},
        {"year": 2012, "value": 38.5},
        {"year": 2017, "value": 36.8}
    ],
    "Morocco": [
        {"year": 2000, "value": 40.6},
        {"year": 2006, "value": 40.7},
        {"year": 2013, "value": 39.5}
    ],
    "Mozambique": [
        {"year": 2002, "value": 46.9},
        {"year": 2008, "value": 45.5},
        {"year": 2014, "value": 54.0},
        {"year": 2019, "value": 50.7},
        {"year": 2022, "value": 49.6}
    ],
    "Namibia": [
        {"year": 2003, "value": 63.3},
        {"year": 2009, "value": 61.0},
        {"year": 2015, "value": 59.1}
    ],
    "Niger": [
        {"year": 2005, "value": 44.4},
        {"year": 2007, "value": 37.3},
        {"year": 2011, "value": 31.5},
        {"year": 2014, "value": 34.3},
        {"year": 2018, "value": 37.3},
        {"year": 2021, "value": 32.9}
    ],
    "Nigeria": [
        {"year": 2003, "value": 40.1},
        {"year": 2009, "value": 35.7},
        {"year": 2011, "value": 35.5},
        {"year": 2015, "value": 35.9},
        {"year": 2018, "value": 35.1},
        {"year": 2022, "value": 33.9}
    ],
    "Rwanda": [
        {"year": 2000, "value": 48.5},
        {"year": 2005, "value": 52.0},
        {"year": 2010, "value": 47.2},
        {"year": 2013, "value": 45.1},
        {"year": 2016, "value": 43.7},
        {"year": 2023, "value": 39.4}
    ],
    "Sao Tome and Principe": [
        {"year": 2000, "value": 32.1},
        {"year": 2010, "value": 30.8},
        {"year": 2017, "value": 40.7}
    ],
    "Senegal": [
        {"year": 2001, "value": 41.2},
        {"year": 2005, "value": 39.2},
        {"year": 2011, "value": 40.3},
        {"year": 2018, "value": 38.3},
        {"year": 2021, "value": 36.2}
    ],
    "Seychelles": [
        {"year": 2006, "value": 42.8},
        {"year": 2013, "value": 46.8},
        {"year": 2018, "value": 32.1}
    ],
    "Sierra Leone": [
        {"year": 2003, "value": 40.2},
        {"year": 2011, "value": 34.0},
        {"year": 2018, "value": 35.7}
    ],
    "South Africa": [
        {"year": 2000, "value": 57.8},
        {"year": 2005, "value": 64.8},
        {"year": 2008, "value": 63.0},
        {"year": 2010, "value": 63.4},
        {"year": 2014, "value": 63.0}
    ],
    "South Sudan": [
        {"year": 2009, "value": 46.3},
        {"year": 2016, "value": 44.0}
    ],
    "Sudan": [
        {"year": 2009, "value": 35.4},
        {"year": 2014, "value": 34.2}
    ],
    "Tanzania, United Republic of": [
        {"year": 2000, "value": 37.3},
        {"year": 2007, "value": 40.3},
        {"year": 2011, "value": 37.8},
        {"year": 2019, "value": 40.5}
    ],
    "Togo": [
        {"year": 2006, "value": 42.2},
        {"year": 2011, "value": 46.0},
        {"year": 2015, "value": 43.0},
        {"year": 2018, "value": 42.5},
        {"year": 2021, "value": 37.9}
    ],
    "Tunisia": [
        {"year": 2000, "value": 40.8},
        {"year": 2005, "value": 37.7},
        {"year": 2010, "value": 38.5},
        {"year": 2015, "value": 32.8},
        {"year": 2021, "value": 33.7}
    ],
    "Uganda": [
        {"year": 2002, "value": 45.2},
        {"year": 2005, "value": 42.9},
        {"year": 2009, "value": 44.2},
        {"year": 2012, "value": 41.0},
        {"year": 2016, "value": 42.8},
        {"year": 2019, "value": 42.7}
    ],
    "Zambia": [
        {"year": 2002, "value": 42.1},
        {"year": 2004, "value": 54.3},
        {"year": 2006, "value": 54.6},
        {"year": 2010, "value": 52.0},
        {"year": 2015, "value": 55.8},
        {"year": 2022, "value": 51.5}
    ],
    "Zimbabwe": [
        {"year": 2011, "value": 43.2},
        {"year": 2017, "value": 44.3},
        {"year": 2019, "value": 50.3}
    ]
}

# Country name mappings for GeoJSON files to Gini data
COUNTRY_NAME_MAPPINGS = {
    "Côte d'Ivoire": "Côte d'Ivoire",
    "Democratic Republic of the Congo": "Congo, Democratic Republic of the",
    "United Republic of Tanzania": "Tanzania, United Republic of",
    "Sao Tome and Principe": "Sao Tome and Principe",
    "Central African Republic": "Central African Republic",
    "Congo": "Congo",
    "Western Sahara": None,  # No Gini data
    "Eritrea": None,  # No Gini data
    "Libya": None,  # No Gini data
    "Somalia": None,  # No Gini data
}


def normalize_country_name(geojson_name: str) -> Optional[str]:
    """Map GeoJSON country name to Gini data key."""
    return COUNTRY_NAME_MAPPINGS.get(geojson_name, geojson_name)


def get_gini_stats(country_name: str) -> Dict:
    """Calculate Gini statistics for a country."""
    normalized_name = normalize_country_name(country_name)

    if not normalized_name or normalized_name not in GINI_DATA:
        return {
            "has_gini_data": False,
            "gini_data": [],
            "gini_latest": None,
            "gini_latest_year": None,
            "gini_earliest": None,
            "gini_earliest_year": None,
            "gini_change": None,
            "gini_readings_count": 0
        }

    readings = GINI_DATA[normalized_name]

    if not readings:
        return {
            "has_gini_data": False,
            "gini_data": [],
            "gini_latest": None,
            "gini_latest_year": None,
            "gini_earliest": None,
            "gini_earliest_year": None,
            "gini_change": None,
            "gini_readings_count": 0
        }

    # Sort by year
    sorted_readings = sorted(readings, key=lambda x: x["year"])
    earliest = sorted_readings[0]
    latest = sorted_readings[-1]
    change = round(latest["value"] - earliest["value"], 1)

    # Create year-value mapping for quick lookup
    year_value_map = {r["year"]: r["value"] for r in readings}

    return {
        "has_gini_data": True,
        "gini_data": readings,
        "gini_latest": latest["value"],
        "gini_latest_year": latest["year"],
        "gini_earliest": earliest["value"],
        "gini_earliest_year": earliest["year"],
        "gini_change": change,
        "gini_readings_count": len(readings),
        "gini_by_year": year_value_map
    }


def merge_geojsons(geojson_dir: str, output_path: str):
    """Merge all country GeoJSON files into one Africa GeoJSON with Gini data."""
    geojson_path = Path(geojson_dir)

    if not geojson_path.exists():
        print(f"❌ Error: GeoJSON directory not found: {geojson_dir}")
        return False

    # Get all GeoJSON files
    geojson_files = sorted(geojson_path.glob("*.geojson"))
    print(f"📁 Found {len(geojson_files)} GeoJSON files")

    if not geojson_files:
        print("❌ No GeoJSON files found!")
        return False

    # Initialize output GeoJSON
    output_geojson = {
        "type": "FeatureCollection",
        "name": "Africa Gini Index",
        "description": "African countries with Gini index data (2000-2023)",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:EPSG::4326"}
        },
        "features": []
    }

    # Process each country GeoJSON
    for geojson_file in geojson_files:
        country_name = geojson_file.stem

        try:
            with open(geojson_file, 'r', encoding='utf-8') as f:
                country_data = json.load(f)

            # Get Gini stats
            gini_stats = get_gini_stats(country_name)

            # Add Gini properties to each feature
            for feature in country_data.get("features", []):
                properties = feature.get("properties", {})
                properties.update({
                    "country_name": country_name,
                    **gini_stats
                })
                feature["properties"] = properties

            # Add features to output
            output_geojson["features"].extend(country_data.get("features", []))

            if gini_stats["has_gini_data"]:
                print(f"  ✓ {country_name}: {gini_stats['gini_readings_count']} readings, "
                      f"latest {gini_stats['gini_latest']} ({gini_stats['gini_latest_year']})")
            else:
                print(f"  ⚠ {country_name}: No Gini data")

        except Exception as e:
            print(f"  ❌ Error processing {country_name}: {e}")
            continue

    # Write output file
    output_file_path = Path(output_path)
    output_file_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file_path, 'w', encoding='utf-8') as f:
        json.dump(output_geojson, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Successfully created: {output_path}")
    print(f"   Total features: {len(output_geojson['features'])}")

    # Print statistics
    with_data = sum(1 for f in output_geojson["features"]
                    if f["properties"].get("has_gini_data", False))
    without_data = len(output_geojson["features"]) - with_data

    print(f"   Countries with Gini data: {with_data}")
    print(f"   Countries without Gini data: {without_data}")

    return True


def main():
    """Main function."""
    # Paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    geojson_dir = project_root / "backend" / "geojson"
    output_dir = project_root / "backend" / "geojson" / "merged"
    output_path = output_dir / "africa-gini-complete.geojson"

    print("=" * 60)
    print("🌍 Merging African GeoJSON files with Gini Data")
    print("=" * 60)
    print(f"📂 Input directory: {geojson_dir}")
    print(f"📂 Output file: {output_path}")
    print()

    success = merge_geojsons(geojson_dir, output_path)

    if success:
        print("\n" + "=" * 60)
        print("✅ Merge completed successfully!")
        print("=" * 60)
        print("\n📋 Next steps:")
        print("1. Upload the merged GeoJSON to GeoServer")
        print("2. Apply the SLD styles (gini_latest.sld, gini_change.sld)")
        print("3. Preview the layers in GeoServer")
        print("4. Add layer entries to your database")
        return 0
    else:
        print("\n❌ Merge failed!")
        return 1


if __name__ == "__main__":
    exit(main())
