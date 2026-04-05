import rasterio
import numpy as np
from collections import Counter
from multiprocessing import Pool
import rasterio.windows
import math

class_labels = {
    1: "Forêt",
    2: "Parcours",
    3: "Agriculture irriguée",
    4: "Agriculture pluviale",
    5: "Oasis",
    6: "Plan d'eau",
    7: "Urbain",
    8: "Sol nu",
    9: "Etendue dunaire",
}

filepath = r"C:\Users\mehdi\OneDrive\Desktop\LC_OSS\LandcoverOSS2000.tif"

def process_chunk(args):
    filepath, col_off, row_off, col_count, row_count = args
    with rasterio.open(filepath) as src:
        window = rasterio.windows.Window(col_off, row_off, col_count, row_count)
        chunk = src.read(1, window=window)
    chunk = chunk[chunk != 255]  # exclude nodata
    unique, counts = np.unique(chunk, return_counts=True)
    return dict(zip(unique.tolist(), counts.tolist()))

if __name__ == "__main__":
    chunk_size = 4096

    with rasterio.open(filepath) as src:
        pixel_size_deg = src.res
        width, height = src.width, src.height
        bounds = src.bounds
        print(f"Image: {width} x {height} | CRS: {src.crs}")

    # Pixel size in meters (center latitude approximation)
    center_lat = (bounds.top + bounds.bottom) / 2
    pixel_height_m = pixel_size_deg[1] * 111_320
    pixel_width_m  = pixel_size_deg[0] * 111_320 * math.cos(math.radians(center_lat))
    pixel_area_ha  = (pixel_width_m * pixel_height_m) / 10_000

    print(f"Approx pixel size: {pixel_width_m:.1f}m x {pixel_height_m:.1f}m")
    print(f"Approx pixel area: {pixel_area_ha:.4f} ha\n")

    tasks = []
    for row_off in range(0, height, chunk_size):
        row_count = min(chunk_size, height - row_off)
        for col_off in range(0, width, chunk_size):
            col_count = min(chunk_size, width - col_off)
            tasks.append((filepath, col_off, row_off, col_count, row_count))

    print(f"Total chunks: {len(tasks)} | Using 14 cores\n")

    total_counts = Counter()

    with Pool(processes=14) as pool:
        for i, result in enumerate(pool.imap_unordered(process_chunk, tasks), 1):
            for val, count in result.items():
                total_counts[val] += count
            print(f"\rProgress: {i}/{len(tasks)} chunks ({i/len(tasks)*100:.1f}%)", end="", flush=True)

    print("\n\nDone!\n")

    print(f"{'Class':<25} {'Pixels':>15} {'Area (ha)':>15} {'Area (km²)':>12}")
    print("-" * 70)

    total_ha = 0
    for val in sorted(total_counts):
        label = class_labels.get(val, f"Unknown ({val})")
        count = total_counts[val]
        area_ha = count * pixel_area_ha
        area_km2 = area_ha / 100
        total_ha += area_ha
        print(f"{label:<25} {count:>15,} {area_ha:>15,.0f} {area_km2:>12,.0f}")

    print("-" * 70)
    print(f"{'TOTAL':<25} {'':>15} {total_ha:>15,.0f} {total_ha/100:>12,.0f}")