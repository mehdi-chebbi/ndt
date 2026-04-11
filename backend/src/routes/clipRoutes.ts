import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const router = Router();

// GeoServer configuration
const GEOSERVER_REST_URL = process.env.GEOSERVER_REST_URL || 'http://geoserver:8080/geoserver/rest';
const GEOSERVER_WMS_URL = process.env.GEOSERVER_WMS_URL || 'http://geoserver:8080/geoserver';
const GEOSERVER_USER = process.env.GEOSERVER_USER || 'admin';
const GEOSERVER_PASSWORD = process.env.GEOSERVER_PASSWORD || 'geoserver';

// Create Basic Auth header
const GEOSERVER_AUTH = 'Basic ' + Buffer.from(`${GEOSERVER_USER}:${GEOSERVER_PASSWORD}`).toString('base64');

// Headers for GeoServer REST API requests
const GEOSERVER_HEADERS = {
  'Accept': 'application/json',
  'Authorization': GEOSERVER_AUTH
};

// Common bounds for all layers (south-west, north-east corners)
const DEFAULT_BOUNDS: [[number, number], [number, number]] = [[-34.83, -25.36], [37.56, 60.00]];

// ============================================
// WMS Proxy Endpoint - Secure GeoServer Access
// ============================================
// This endpoint proxies all WMS requests to GeoServer, keeping it private.
// Frontend calls: GET /api/clip/wms?workspace=LC&service=WMS&version=1.1.1&request=GetMap&...
// Backend forwards to: http://geoserver:8080/geoserver/LC/wms?service=WMS&...
router.get('/wms', async (req: Request, res: Response) => {
  try {
    const { workspace, ...wmsParams } = req.query;

    if (!workspace) {
      return res.status(400).json({ error: 'workspace parameter is required' });
    }

    // Build GeoServer WMS URL
    const geoserverUrl = `${GEOSERVER_WMS_URL}/${workspace}/wms`;

    // Build query string from WMS parameters
    const queryString = new URLSearchParams(
      Object.entries(wmsParams).map(([key, value]) => [key, String(value)])
    ).toString();

    const fullUrl = `${geoserverUrl}?${queryString}`;

    // Forward request to GeoServer with auth
    const response = await fetch(fullUrl, {
      headers: {
        'Authorization': GEOSERVER_AUTH,
      },
    });

    if (!response.ok) {
      console.error(`GeoServer WMS error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: 'Failed to fetch from GeoServer',
        status: response.status 
      });
    }

    // Get content type from GeoServer response
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Stream the response body directly to client (no buffering)
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));

  } catch (error: any) {
    console.error('WMS proxy error:', error);
    res.status(500).json({ 
      error: 'WMS proxy error',
      message: error.message 
    });
  }
});

// Fetch layers from GeoServer REST API
async function fetchLayersFromGeoServer(): Promise<any[]> {
  try {
    // 1. Get list of all layers
    const layersListResponse = await fetch(`${GEOSERVER_REST_URL}/layers.json`, {
      headers: GEOSERVER_HEADERS
    });

    if (!layersListResponse.ok) {
      throw new Error(`Failed to fetch layers list: ${layersListResponse.status}`);
    }

    const layersListData = await layersListResponse.json();
    const layersList = layersListData.layers?.layer || [];

    // Filter out clipped layers (those starting with "clip_")
    const filteredLayersList = layersList.filter((layerItem: any) => {
      const layerName = layerItem.name || '';
      return !layerName.startsWith('clip_');
    });

    // 2. Fetch details for each layer (in parallel)
    const layerDetailsPromises = filteredLayersList.map(async (layerItem: any) => {
      try {
        const detailResponse = await fetch(layerItem.href, {
          headers: GEOSERVER_HEADERS
        });

        if (!detailResponse.ok) {
          console.error(`Failed to fetch layer details for ${layerItem.name}`);
          return null;
        }

        const detailData = await detailResponse.json();
        const layer = detailData.layer;

        // Extract workspace from resource name
        const resourceName = layer.resource?.name || layerItem.name;
        const workspace = resourceName.includes(':')
          ? resourceName.split(':')[0]
          : layerItem.name.split(':')[0] || 'default';

        // Extract style name from defaultStyle
        const styleName = layer.defaultStyle?.name || null;

        return {
          geoserver_name: layerItem.name,
          display_name: layer.name,
          wmsUrl: `/api/clip/wms?workspace=${workspace}`,
          layerName: layerItem.name,
          bounds: DEFAULT_BOUNDS,
          type: layer.type,
          style: styleName,
        };
      } catch (error) {
        console.error(`Error fetching details for layer ${layerItem.name}:`, error);
        return null;
      }
    });

    const layerDetails = await Promise.all(layerDetailsPromises);
    return layerDetails.filter(layer => layer !== null);
  } catch (error) {
    console.error('Error fetching layers from GeoServer:', error);
    throw error;
  }
}

// Build nested group structure
function buildGroupTree(groups: any[], layers: any[]): any[] {
  // Create a map for quick lookup
  const groupMap: { [key: number]: any } = {};
  groups.forEach((g: any) => {
    groupMap[g.id] = {
      id: g.id,
      name: g.name,
      description: g.description,
      legend: g.legend,
      parent_id: g.parent_id,
      children: [],
      layers: layers.filter((l: any) => l.group_id === g.id)
    };
  });

  // Build tree
  const rootGroups: any[] = [];
  groups.forEach((g: any) => {
    const group = groupMap[g.id];
    if (g.parent_id && groupMap[g.parent_id]) {
      groupMap[g.parent_id].children.push(group);
    } else {
      rootGroups.push(group);
    }
  });

  // Sort children by sort_order within each group
  const sortChildren = (groupList: any[]) => {
    groupList.forEach(group => {
      if (group.children?.length > 0) {
        group.children.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
        sortChildren(group.children);
      }
    });
  };
  sortChildren(rootGroups);

  // Sort root groups by sort_order
  rootGroups.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

  return rootGroups;
}

// Get all active layers grouped (for map display)
router.get('/layers', async (req: Request, res: Response) => {
  try {
    // Get all active layers with group info and legends
    const layersResult = await pool.query(`
      SELECT l.id, l.geoserver_name, l.display_name, l.group_id, l.file_path, l.class_labels, l.legend, l.sort_order,
             g.id as group_table_id, g.name as group_name, g.parent_id as group_parent_id, g.legend as group_legend
      FROM layers l
      LEFT JOIN layer_groups g ON l.group_id = g.id
      WHERE l.is_active = true
      ORDER BY l.sort_order ASC, l.created_at ASC
    `);

    // Get all groups with legend
    const groupsResult = await pool.query(`
      SELECT id, name, description, parent_id, legend, sort_order
      FROM layer_groups
      ORDER BY sort_order ASC, created_at ASC
    `);

    // Transform layers to include WMS info and legends
    const layers = layersResult.rows.map(layer => {
      // Extract workspace from geoserver_name (e.g., "LC:LandcoverOSS2000" -> "LC")
      const workspace = layer.geoserver_name.includes(':')
        ? layer.geoserver_name.split(':')[0]
        : 'default';

      return {
        id: layer.id,
        name: layer.display_name || layer.geoserver_name,
        geoserver_name: layer.geoserver_name,
        layerName: layer.geoserver_name,
        // Use WMS proxy endpoint instead of direct GeoServer URL
        // This keeps GeoServer private and adds auth/rate limiting capabilities
        wmsUrl: `/api/clip/wms?workspace=${workspace}`,
        bounds: DEFAULT_BOUNDS,
        hasStats: !!layer.file_path && !!layer.class_labels,
        group_id: layer.group_id,
        group_name: layer.group_name,
        group_legend: layer.group_legend,
        legend: layer.legend,
      };
    });

    // Build nested group structure
    const groups = buildGroupTree(groupsResult.rows, layers);

    // Layers without a group (ungrouped)
    const ungroupedLayers = layers.filter(l => !l.group_id);

    res.json({
      groups,
      ungroupedLayers
    });
  } catch (error: any) {
    console.error('Error fetching layers from database:', error);
    res.status(500).json({
      error: 'Failed to fetch layers',
      message: error.message
    });
  }
});

// Sync layers from GeoServer to database
router.post('/layers/sync', async (req: Request, res: Response) => {
  try {
    // Fetch layers from GeoServer
    const geoserverLayers = await fetchLayersFromGeoServer();

    // Get existing layers from database
    const existingResult = await pool.query('SELECT geoserver_name FROM layers');
    const existingNames = new Set(existingResult.rows.map(r => r.geoserver_name));

    let added = 0;
    let updated = 0;

    for (const gsLayer of geoserverLayers) {
      if (existingNames.has(gsLayer.geoserver_name)) {
        // Update display_name and style_name (preserve user customizations for display_name only)
        await pool.query(`
          UPDATE layers
          SET display_name = COALESCE(NULLIF(display_name, ''), $1),
              style_name = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE geoserver_name = $3
        `, [gsLayer.display_name, gsLayer.style, gsLayer.geoserver_name]);
        updated++;
      } else {
        // Insert new layer with style_name
        await pool.query(`
          INSERT INTO layers (geoserver_name, display_name, style_name)
          VALUES ($1, $2, $3)
        `, [gsLayer.geoserver_name, gsLayer.display_name, gsLayer.style]);
        added++;
      }
    }

    // Get all layers after sync
    const allLayers = await pool.query(`
      SELECT l.id, l.geoserver_name, l.display_name, l.group_id, l.file_path, l.class_labels, l.is_active, l.sort_order,
             g.name as group_name
      FROM layers l
      LEFT JOIN layer_groups g ON l.group_id = g.id
      ORDER BY g.sort_order ASC, l.sort_order ASC, l.created_at ASC
    `);

    res.json({
      message: 'Layers synced successfully',
      added,
      updated,
      total: allLayers.rows.length,
      layers: allLayers.rows
    });
  } catch (error: any) {
    console.error('Error syncing layers:', error);
    res.status(500).json({
      error: 'Failed to sync layers',
      message: error.message
    });
  }
});

// Clip layer to country boundary
router.post('/country', async (req: Request, res: Response) => {
  const requestStartTime = Date.now();
  console.log('[Backend Clip] Request received:', {
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { countryFile, layerId } = req.body;

    // Validate input
    if (!countryFile || !layerId) {
      console.log('[Backend Clip] Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'countryFile and layerId are required'
      });
    }

    const validationTime = Date.now();
    console.log('[Backend Clip] Validation complete:', `${(validationTime - requestStartTime) / 1000}s`);

    // 1. Get layer info from DB
    const layerResult = await pool.query(
      'SELECT id, file_path, geoserver_name, style_name FROM layers WHERE id = $1',
      [layerId]
    );

    if (!layerResult.rows[0]) {
      console.log('[Backend Clip] Layer not found:', layerId);
      return res.status(404).json({ error: 'Layer not found' });
    }

    const { id: layerDbId, file_path, geoserver_name, style_name } = layerResult.rows[0];

    const dbQueryTime = Date.now();
    console.log('[Backend Clip] DB query complete:', {
      layer: geoserver_name,
      hasStyle: !!style_name,
      queryTime: `${(dbQueryTime - validationTime) / 1000}s`
    });

    if (!file_path) {
      return res.status(400).json({
        error: 'Layer has no file path',
        message: 'This layer cannot be clipped'
      });
    }

    if (!style_name) {
      return res.status(400).json({
        error: 'Layer has no style',
        message: 'Please sync the layer to fetch style information'
      });
    }

    // 2. Parse workspace and layer name from geoserver_name
    const [workspace, layerName] = geoserver_name.split(':');
    if (!workspace || !layerName) {
      return res.status(400).json({
        error: 'Invalid geoserver_name format',
        message: 'Expected format: workspace:layerName'
      });
    }

    // 3. Check cache for existing clipped layer
    const cacheResult = await pool.query(
      'SELECT clipped_layer_name FROM clipped_layers_cache WHERE country_file = $1 AND layer_id = $2',
      [countryFile, layerDbId]
    );

    const cacheCheckTime = Date.now();
    console.log('[Backend Clip] Cache check complete:', {
      cached: cacheResult.rows.length > 0,
      cacheTime: `${(cacheCheckTime - dbQueryTime) / 1000}s`
    });

    if (cacheResult.rows.length > 0) {
      // Cache hit - return existing clipped layer
      console.log(`[Backend Clip] Cache hit for ${countryFile} + layer ${layerId}`);
      const cacheHitTime = Date.now();
      console.log('[Backend Clip] Total time (cache hit):', `${(cacheHitTime - requestStartTime) / 1000}s`);
      return res.json({
        clippedLayerName: cacheResult.rows[0].clipped_layer_name,
        originalLayer: geoserver_name,
        status: 'success',
        cached: true
      });
    }

    // 4. Cache miss - call clipping microservice
    const clipServiceUrl = process.env.CLIP_SERVICE_URL || 'http://clip-service:3005';

    // Resolve paths
    const geojsonPath = path.join(__dirname, '../../geojson', countryFile);

    // Extract country name from filename (remove .geojson extension)
    const countryName = countryFile.replace('.geojson', '');

    console.log('[Backend Clip] Calling clip service:', {
      serviceUrl: clipServiceUrl,
      country: countryName,
      layer: layerName,
      workspace,
      timestamp: new Date().toISOString()
    });

    const clipServiceStartTime = Date.now();

    // Set a 30-minute timeout for the clip service call (big countries can take 10-15 min)
    const clipController = new AbortController();
    const clipTimeoutId = setTimeout(() => clipController.abort(), 1_800_000);

    const clipResponse = await fetch(`${clipServiceUrl}/clip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        geojson_path: geojsonPath,
        raster_path: file_path,
        workspace,
        layer_name: layerName,
        style_name: style_name,
        country_name: countryName
      }),
      signal: clipController.signal,
    }).finally(() => clearTimeout(clipTimeoutId));

    const clipServiceEndTime = Date.now();
    console.log('[Backend Clip] Clip service responded:', {
      status: clipResponse.status,
      ok: clipResponse.ok,
      serviceTime: `${(clipServiceEndTime - clipServiceStartTime) / 1000}s`,
      totalTime: `${(clipServiceEndTime - requestStartTime) / 1000}s`
    });

    if (!clipResponse.ok) {
      const errorData = await clipResponse.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('[Backend Clip] Clipping service error:', errorData);
      return res.status(500).json({
        error: 'Clipping failed',
        details: errorData.detail || errorData.message || 'Unknown error'
      });
    }

    const clipData = await clipResponse.json();

    if (clipData.status !== 'success') {
      console.error('[Backend Clip] Clipping service returned non-success:', clipData);
      return res.status(500).json({
        error: 'Clipping failed',
        details: clipData.message || 'Unknown error'
      });
    }

    console.log('[Backend Clip] Storing in cache...');
    const cacheStartTime = Date.now();

    // 5. Store in cache
    await pool.query(
      `INSERT INTO clipped_layers_cache (country_file, layer_id, clipped_layer_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (country_file, layer_id) DO UPDATE
       SET clipped_layer_name = EXCLUDED.clipped_layer_name`,
      [countryFile, layerDbId, clipData.layer_name]
    );

    const cacheEndTime = Date.now();
    console.log('[Backend Clip] Cache store complete:', `${(cacheEndTime - cacheStartTime) / 1000}s`);

    // 6. Return success
    const responseEndTime = Date.now();
    console.log('[Backend Clip] Sending response:', {
      clippedLayerName: clipData.layer_name,
      totalTime: `${(responseEndTime - requestStartTime) / 1000}s`
    });

    res.json({
      clippedLayerName: clipData.layer_name,
      originalLayer: geoserver_name,
      status: 'success',
      cached: false
    });

  } catch (error: any) {
    const errorTime = Date.now();
    console.error('[Backend Clip] Error occurred:', {
      error: error.message,
      name: error.name,
      totalTime: `${(errorTime - requestStartTime) / 1000}s`,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================
// BATCH CLIPPING - Admin Clip Management
// ============================================

// In-memory set to track layers currently being batch-clipped
const runningBatchLayers = new Set<number>();

// Helper: Read geojson files from disk
function getGeojsonFiles(): string[] {
  const geojsonDir = path.join(__dirname, '../../geojson');
  if (!fs.existsSync(geojsonDir)) return [];
  return fs.readdirSync(geojsonDir)
    .filter((file: string) => file.endsWith('.geojson'))
    .sort();
}

// GET /api/clip/batch-status
// Returns all clippable layers with their clipping progress
router.get('/batch-status', async (req: Request, res: Response) => {
  try {
    // Get all layers that have file_path and don't start with clip_
    const layersResult = await pool.query(`
      SELECT id, geoserver_name, display_name, file_path, style_name
      FROM layers
      WHERE file_path IS NOT NULL
        AND file_path != ''
        AND NOT geoserver_name LIKE 'clip_%'
      ORDER BY display_name ASC NULLS LAST, geoserver_name ASC
    `);

    const totalCountries = getGeojsonFiles().length;

    // For each layer, count how many countries are already clipped
    const layersWithProgress = await Promise.all(
      layersResult.rows.map(async (layer: any) => {
        const cacheCount = await pool.query(
          'SELECT COUNT(*) as count FROM clipped_layers_cache WHERE layer_id = $1',
          [layer.id]
        );
        const clippedCount = parseInt(cacheCount.rows[0]?.count || '0');
        return {
          id: layer.id,
          geoserver_name: layer.geoserver_name,
          display_name: layer.display_name || layer.geoserver_name,
          file_path: layer.file_path,
          style_name: layer.style_name,
          clippedCountries: clippedCount,
          totalCountries,
          fullyClipped: clippedCount >= totalCountries,
          isRunning: runningBatchLayers.has(layer.id),
          canClip: !!layer.style_name,
        };
      })
    );

    res.json({
      layers: layersWithProgress,
      totalCountries,
    });
  } catch (error: any) {
    console.error('[Batch Status] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch batch status',
      message: error.message
    });
  }
});

// GET /api/clip/layer/:layerId/clipped-countries
// Returns the list of clipped countries for a specific layer
router.get('/layer/:layerId/clipped-countries', async (req: Request, res: Response) => {
  try {
    const { layerId } = req.params;

    // Get all geojson files (all available countries)
    const allCountries = getGeojsonFiles().map(f => f.replace('.geojson', ''));

    // Get clipped countries from cache
    const clippedResult = await pool.query(
      'SELECT country_file FROM clipped_layers_cache WHERE layer_id = $1',
      [layerId]
    );
    const clippedFiles = new Set(clippedResult.rows.map((r: any) => r.country_file.replace('.geojson', '')));

    const clippedCountries = allCountries.filter(c => clippedFiles.has(c));
    const remainingCountries = allCountries.filter(c => !clippedFiles.has(c));

    res.json({
      total: allCountries.length,
      clipped: clippedCountries,
      remaining: remainingCountries,
    });
  } catch (error: any) {
    console.error('[Clipped Countries] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch clipped countries',
      message: error.message
    });
  }
});

// Helper: Clip a single country for a given layer (reuses clip-service logic)
async function clipCountryForLayer(
  countryFile: string,
  layerDbId: number,
  file_path: string,
  geoserver_name: string,
  style_name: string,
  workspace: string,
  layerName: string
): Promise<{ success: boolean; countryFile: string; error?: string }> {
  const geojsonPath = path.join(__dirname, '../../geojson', countryFile);
  const countryName = countryFile.replace('.geojson', '');

  try {
    const clipServiceUrl = process.env.CLIP_SERVICE_URL || 'http://clip-service:3005';

    console.log(`[Batch Clip] Clipping ${countryName} for ${geoserver_name}...`);

    // Set a 30-minute timeout for the clip service call (big countries can take 10-15 min)
    const clipController = new AbortController();
    const clipTimeoutId = setTimeout(() => clipController.abort(), 1_800_000);

    const clipResponse = await fetch(`${clipServiceUrl}/clip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        geojson_path: geojsonPath,
        raster_path: file_path,
        workspace,
        layer_name: layerName,
        style_name: style_name,
        country_name: countryName,
      }),
      signal: clipController.signal,
    }).finally(() => clearTimeout(clipTimeoutId));

    if (!clipResponse.ok) {
      const errorData = await clipResponse.json().catch(() => ({ detail: 'Unknown error' }));
      console.error(`[Batch Clip] Failed for ${countryName}:`, errorData.detail || 'Unknown error');
      return { success: false, countryFile, error: errorData.detail || 'Unknown error' };
    }

    const clipData = await clipResponse.json();

    if (clipData.status !== 'success') {
      console.error(`[Batch Clip] Non-success for ${countryName}:`, clipData.message);
      return { success: false, countryFile, error: clipData.message || 'Non-success status' };
    }

    // Store in cache
    await pool.query(
      `INSERT INTO clipped_layers_cache (country_file, layer_id, clipped_layer_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (country_file, layer_id) DO UPDATE
       SET clipped_layer_name = EXCLUDED.clipped_layer_name`,
      [countryFile, layerDbId, clipData.layer_name]
    );

    console.log(`[Batch Clip] Success: ${countryName} for ${geoserver_name}`);
    return { success: true, countryFile };
  } catch (error: any) {
    console.error(`[Batch Clip] Error clipping ${countryName}:`, error.message);
    return { success: false, countryFile, error: error.message };
  }
}

// POST /api/clip/batch
// Starts batch clipping for a layer (fire-and-forget)
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { layerId } = req.body;

    if (!layerId) {
      return res.status(400).json({ error: 'layerId is required' });
    }

    // Check if already running
    if (runningBatchLayers.has(layerId)) {
      return res.status(409).json({
        error: 'Batch already in progress',
        message: 'This layer is already being clipped. Please wait for it to finish.'
      });
    }

    // Get layer info
    const layerResult = await pool.query(
      'SELECT id, file_path, geoserver_name, style_name FROM layers WHERE id = $1',
      [layerId]
    );

    if (!layerResult.rows[0]) {
      return res.status(404).json({ error: 'Layer not found' });
    }

    const layer = layerResult.rows[0];

    if (!layer.file_path) {
      return res.status(400).json({ error: 'Layer has no file path' });
    }

    if (!layer.style_name) {
      return res.status(400).json({
        error: 'Layer has no style',
        message: 'Please sync the layer to fetch style information before clipping.'
      });
    }

    const [workspace, layerName] = layer.geoserver_name.split(':');
    if (!workspace || !layerName) {
      return res.status(400).json({ error: 'Invalid geoserver_name format' });
    }

    // Mark as running
    runningBatchLayers.add(layerId);

    // Get all geojson files
    const geojsonFiles = getGeojsonFiles();

    console.log(`[Batch Clip] Starting batch for layer ${layer.geoserver_name} (${geojsonFiles.length} countries)`);

    // Fire-and-forget: respond immediately
    res.json({
      status: 'started',
      message: `Batch clipping started for ${layer.display_name || layer.geoserver_name}`,
      totalCountries: geojsonFiles.length,
    });

    // Run the batch loop asynchronously (doesn't block the event loop)
    (async () => {
      let successCount = 0;
      let skipCount = 0;
      let failCount = 0;
      const failures: { countryFile: string; error: string }[] = [];

      // Process countries with concurrency limit (3 workers)
      const CONCURRENCY = 3;
      let fileIndex = 0;

      async function worker() {
        while (fileIndex < geojsonFiles.length) {
          const idx = fileIndex++;
          const countryFile = geojsonFiles[idx];

          // Check if already clipped (skip cache hits)
          const cacheCheck = await pool.query(
            'SELECT 1 FROM clipped_layers_cache WHERE country_file = $1 AND layer_id = $2',
            [countryFile, layer.id]
          );

          if (cacheCheck.rows.length > 0) {
            skipCount++;
            continue;
          }

          const result = await clipCountryForLayer(
            countryFile, layer.id, layer.file_path,
            layer.geoserver_name, layer.style_name, workspace, layerName
          );

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            failures.push({ countryFile: result.countryFile, error: result.error || 'Unknown' });
          }
        }
      }

      const workerCount = Math.min(CONCURRENCY, geojsonFiles.length);
      await Promise.all(
        Array.from({ length: workerCount }, () => worker())
      );

      // Remove from running set
      runningBatchLayers.delete(layerId);

      console.log(`[Batch Clip] Completed for ${layer.geoserver_name}: ${successCount} clipped, ${skipCount} skipped, ${failCount} failed`);
      if (failures.length > 0) {
        console.error(`[Batch Clip] Failures:`, failures);
      }
    })();

  } catch (error: any) {
    runningBatchLayers.delete(parseInt(req.body.layerId));
    console.error('[Batch Clip] Error starting batch:', error);
    res.status(500).json({
      error: 'Failed to start batch clipping',
      message: error.message
    });
  }
});

export default router;
