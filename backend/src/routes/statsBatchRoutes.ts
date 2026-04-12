import { Router, Request, Response } from 'express';
import pool from '../config/database';
import path from 'path';
import fs from 'fs';

const router = Router();

// ============================================
// BATCH STATS - Admin Stats Pre-calculation
// ============================================

// In-memory set to track layers currently being batch-calculated
const runningBatchStatsLayers = new Set<number>();

const CLIP_SERVICE_URL = process.env.CLIP_SERVICE_URL || 'http://clip-service:3005';
const GEOJSON_DIR = process.env.GEOJSON_DIR || '/app/geojson';

// Helper: Check if clip-service is healthy, with retries
async function waitForClipService(maxRetries = 5, delayMs = 3000): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const resp = await fetch(`${CLIP_SERVICE_URL}/health`, { signal: AbortSignal.timeout(5000) });
      if (resp.ok) return true;
    } catch {
      // service not ready yet
    }
    if (i < maxRetries - 1) {
      console.log(`[Batch Stats] Clip-service not ready, retrying in ${delayMs / 1000}s... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

// Helper: Read geojson files from disk
function getGeojsonFiles(): string[] {
  const geojsonDir = path.join(__dirname, '../../geojson');
  if (!fs.existsSync(geojsonDir)) return [];
  return fs.readdirSync(geojsonDir)
    .filter((file: string) => file.endsWith('.geojson'))
    .sort();
}

// GET /api/stats/batch-status
// Returns all stat-capable layers with their pre-calculation progress
router.get('/batch-status', async (req: Request, res: Response) => {
  try {
    // Get all layers that have both file_path and class_labels
    const layersResult = await pool.query(`
      SELECT id, geoserver_name, display_name, file_path, class_labels
      FROM layers
      WHERE file_path IS NOT NULL
        AND file_path != ''
        AND class_labels IS NOT NULL
        AND NOT geoserver_name LIKE 'clip_%'
      ORDER BY display_name ASC NULLS LAST, geoserver_name ASC
    `);

    const totalCountries = getGeojsonFiles().length;

    // For each layer, count how many countries are already calculated
    const layersWithProgress = await Promise.all(
      layersResult.rows.map(async (layer: any) => {
        const countResult = await pool.query(
          'SELECT COUNT(*) as count FROM country_stats WHERE layer_id = $1',
          [layer.id]
        );
        const calculatedCount = parseInt(countResult.rows[0]?.count || '0');
        return {
          id: layer.id,
          geoserver_name: layer.geoserver_name,
          display_name: layer.display_name || layer.geoserver_name,
          file_path: layer.file_path,
          calculatedCountries: calculatedCount,
          totalCountries,
          fullyCalculated: calculatedCount >= totalCountries,
          isRunning: runningBatchStatsLayers.has(layer.id),
          canCalculate: !!layer.file_path && !!layer.class_labels,
        };
      })
    );

    res.json({
      layers: layersWithProgress,
      totalCountries,
    });
  } catch (error: any) {
    console.error('[Stats Batch Status] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch stats batch status',
      message: error.message
    });
  }
});

// GET /api/stats/layer/:layerId/calculated-countries
// Returns the list of calculated vs remaining countries for a specific layer
router.get('/layer/:layerId/calculated-countries', async (req: Request, res: Response) => {
  try {
    const { layerId } = req.params;

    // Get all geojson files (all available countries)
    const allCountries = getGeojsonFiles().map(f => f.replace('.geojson', ''));

    // Get calculated countries from DB
    const calculatedResult = await pool.query(
      'SELECT country_file FROM country_stats WHERE layer_id = $1',
      [layerId]
    );
    const calculatedFiles = new Set(calculatedResult.rows.map((r: any) => r.country_file.replace('.geojson', '')));

    const calculated = allCountries.filter(c => calculatedFiles.has(c));
    const remaining = allCountries.filter(c => !calculatedFiles.has(c));

    res.json({
      total: allCountries.length,
      calculated,
      remaining,
    });
  } catch (error: any) {
    console.error('[Calculated Countries] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch calculated countries',
      message: error.message
    });
  }
});

// GET /api/stats/country/:countryFile/layer/:layerId
// Get pre-calculated stats for a specific country+layer (user-facing, instant)
router.get('/country/:countryFile/layer/:layerId', async (req: Request, res: Response) => {
  try {
    const { countryFile, layerId } = req.params;

    const result = await pool.query(
      'SELECT * FROM country_stats WHERE country_file = $1 AND layer_id = $2',
      [countryFile, layerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Stats not found',
        message: 'Pre-calculated stats for this country and layer are not available yet.'
      });
    }

    const row = result.rows[0];
    res.json({
      layer_name: row.layer_name || null,
      country_file: row.country_file,
      total_area_km2: row.total_area_km2,
      pixel_size_m: row.pixel_size_m,
      classes: row.class_stats,
      computed_at: row.computed_at,
    });
  } catch (error: any) {
    console.error('[Country Stats] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch country stats',
      message: error.message
    });
  }
});

// Helper: Check if clip-service is healthy
async function waitForClipService(maxRetries = 5, delayMs = 3000): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const resp = await fetch(`${CLIP_SERVICE_URL}/health`, { signal: AbortSignal.timeout(5000) });
      if (resp.ok) return true;
    } catch {
      // service not ready yet
    }
    if (i < maxRetries - 1) {
      console.log(`[Batch Stats] Clip-service not ready, retrying in ${delayMs / 1000}s... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

// Helper: Calculate stats for a single country for a given layer
async function calculateStatsForCountry(
  countryFile: string,
  layerDbId: number,
  file_path: string,
  geoserver_name: string,
  classLabels: any
): Promise<{ success: boolean; countryFile: string; error?: string }> {
  const countryName = countryFile.replace('.geojson', '');

  try {
    console.log(`[Batch Stats] Calculating stats for ${countryName} on ${geoserver_name}...`);

    // Send geojson_path (file on disk) instead of full polygon body
    // This avoids sending massive payloads (up to 157k vertices) over HTTP
    const geojsonPath = path.join(GEOJSON_DIR, countryFile);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 min

    const response = await fetch(`${CLIP_SERVICE_URL}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raster_path: file_path,
        geojson_path: geojsonPath,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[Batch Stats] Failed for ${countryName}:`, errorData);
      return { success: false, countryFile, error: errorData || 'Unknown error' };
    }

    const stats = await response.json();

    // Build class_stats array with names
    const classStats = stats.classes.map((cls: any) => ({
      class_id: cls.class_id,
      class_name: classLabels[String(cls.class_id)] || `Unknown (${cls.class_id})`,
      pixels: cls.pixels,
      area_km2: cls.area_km2,
      percentage: stats.total_pixels > 0 ? Math.round((cls.pixels / stats.total_pixels) * 100 * 10) / 10 : 0,
    }));

    // Store in country_stats table
    await pool.query(
      `INSERT INTO country_stats (layer_id, country_file, total_area_km2, pixel_size_m, class_stats)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (layer_id, country_file) DO UPDATE
       SET total_area_km2 = EXCLUDED.total_area_km2,
           pixel_size_m = EXCLUDED.pixel_size_m,
           class_stats = EXCLUDED.class_stats,
           computed_at = CURRENT_TIMESTAMP`,
      [layerDbId, countryFile, stats.total_area_km2, stats.pixel_size_m, JSON.stringify(classStats)]
    );

    console.log(`[Batch Stats] Success: ${countryName} on ${geoserver_name} (${stats.total_area_km2} km2)`);
    return { success: true, countryFile };
  } catch (error: any) {
    console.error(`[Batch Stats] Error calculating stats for ${countryName}:`, error.message);
    return { success: false, countryFile, error: error.message };
  }
}

// POST /api/stats/batch
// Starts batch stats pre-calculation for a layer (fire-and-forget)
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { layerId } = req.body;

    if (!layerId) {
      return res.status(400).json({ error: 'layerId is required' });
    }

    // Check if already running
    if (runningBatchStatsLayers.has(layerId)) {
      return res.status(409).json({
        error: 'Batch already in progress',
        message: 'This layer is already being calculated. Please wait for it to finish.'
      });
    }

    // Get layer info
    const layerResult = await pool.query(
      'SELECT id, file_path, geoserver_name, class_labels FROM layers WHERE id = $1',
      [layerId]
    );

    if (!layerResult.rows[0]) {
      return res.status(404).json({ error: 'Layer not found' });
    }

    const layer = layerResult.rows[0];

    if (!layer.file_path || !layer.class_labels) {
      return res.status(400).json({
        error: 'Layer not configured for stats',
        message: 'This layer needs both file_path and class_labels.'
      });
    }

    // Mark as running
    runningBatchStatsLayers.add(layerId);

    // Get all geojson files
    const geojsonFiles = getGeojsonFiles();

    console.log(`[Batch Stats] Starting batch for layer ${layer.geoserver_name} (${geojsonFiles.length} countries)`);

    // Fire-and-forget: respond immediately
    res.json({
      status: 'started',
      message: `Batch stats calculation started for ${layer.display_name || layer.geoserver_name}`,
      totalCountries: geojsonFiles.length,
    });

    // Run the batch loop asynchronously (one at a time)
    (async () => {
      let successCount = 0;
      let skipCount = 0;
      let failCount = 0;
      const failures: { countryFile: string; error: string }[] = [];

      for (const countryFile of geojsonFiles) {
        const countryName = countryFile.replace('.geojson', '');

        // Check if already calculated (skip cache hits)
        const cacheCheck = await pool.query(
          'SELECT 1 FROM country_stats WHERE country_file = $1 AND layer_id = $2',
          [countryFile, layer.id]
        );

        if (cacheCheck.rows.length > 0) {
          skipCount++;
          console.log(`[Batch Stats] Skipping ${countryName} (already calculated)`);
          continue;
        }

        const result = await calculateStatsForCountry(
          countryFile, layer.id, layer.file_path,
          layer.geoserver_name, layer.class_labels
        );

        if (result.success) {
          successCount++;
        } else {
          failCount++;
          failures.push({ countryFile: result.countryFile, error: result.error || 'Unknown' });

          // If clip-service seems down, wait for it to recover before next attempt
          console.log(`[Batch Stats] Checking clip-service health after failure...`);
          const isAlive = await waitForClipService(3, 5000);
          if (!isAlive) {
            console.error('[Batch Stats] Clip-service is down, aborting batch');
            break;
          }
          console.log('[Batch Stats] Clip-service recovered, continuing...');
        }
      }

      // Remove from running set
      runningBatchStatsLayers.delete(layerId);

      console.log(`[Batch Stats] Completed for ${layer.geoserver_name}: ${successCount} calculated, ${skipCount} skipped, ${failCount} failed`);
      if (failures.length > 0) {
        console.error(`[Batch Stats] Failures:`, failures);
      }
    })();

  } catch (error: any) {
    runningBatchStatsLayers.delete(parseInt(req.body.layerId));
    console.error('[Batch Stats] Error starting batch:', error);
    res.status(500).json({
      error: 'Failed to start batch stats calculation',
      message: error.message
    });
  }
});

export default router;
