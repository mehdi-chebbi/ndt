import { Router, Request, Response } from 'express';
import pool from '../config/database';

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

    // 2. Fetch details for each layer (in parallel)
    const layerDetailsPromises = layersList.map(async (layerItem: any) => {
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

        return {
          geoserver_name: layerItem.name,
          display_name: layer.name,
          wmsUrl: `/api/clip/wms?workspace=${workspace}`,
          layerName: layerItem.name,
          bounds: DEFAULT_BOUNDS,
          type: layer.type,
          style: layer.defaultStyle?.name,
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
        // Only update display_name if it was never set (preserve user customizations)
        await pool.query(`
          UPDATE layers
          SET display_name = COALESCE(display_name, $1), updated_at = CURRENT_TIMESTAMP
          WHERE geoserver_name = $2
        `, [gsLayer.display_name, gsLayer.geoserver_name]);
        updated++;
      } else {
        // Insert new layer
        await pool.query(`
          INSERT INTO layers (geoserver_name, display_name)
          VALUES ($1, $2)
        `, [gsLayer.geoserver_name, gsLayer.display_name]);
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

export default router;
