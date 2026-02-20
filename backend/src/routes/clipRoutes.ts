import { Router, Request, Response } from 'express';

const router = Router();

// GeoServer configuration
const GEOSERVER_REST_URL = 'http://geoserver:8080/geoserver/rest';
const GEOSERVER_WMS_URL = 'http://localhost:8080/geoserver';
const GEOSERVER_USER = process.env.GEOSERVER_USER || 'admin';
const GEOSERVER_PASSWORD = process.env.GEOSERVER_PASSWORD || 'geoserver';

// Create Basic Auth header
const GEOSERVER_AUTH = 'Basic ' + Buffer.from(`${GEOSERVER_USER}:${GEOSERVER_PASSWORD}`).toString('base64');

// Headers for GeoServer REST API requests
const GEOSERVER_HEADERS = {
  'Accept': 'application/json',
  'Authorization': GEOSERVER_AUTH
};

// Cache for layers (refresh every 5 minutes)
let layersCache: any[] = [];
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Common bounds for all layers (as per user requirement)
const DEFAULT_BOUNDS = [[-34.83, -25.36], [37.56, 60.00]];

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

        // Extract workspace from resource name (e.g., "LC:LandcoverOSS2000" -> "LC")
        const resourceName = layer.resource?.name || layerItem.name;
        const workspace = resourceName.includes(':') 
          ? resourceName.split(':')[0] 
          : layerItem.name.split(':')[0] || 'default';

        // Construct layer object
        return {
          id: layer.name,
          name: layer.name,
          description: layer.name,
          wmsUrl: `${GEOSERVER_WMS_URL}/${workspace}/wms`,
          layerName: layerItem.name, // Full name with workspace (e.g., "LC:LandcoverOSS2000")
          bounds: DEFAULT_BOUNDS,
          type: layer.type,
          style: layer.defaultStyle?.name,
          dateCreated: layer.dateCreated,
          dateModified: layer.dateModified,
        };
      } catch (error) {
        console.error(`Error fetching details for layer ${layerItem.name}:`, error);
        return null;
      }
    });

    // Wait for all detail requests and filter out failed ones
    const layerDetails = await Promise.all(layerDetailsPromises);
    return layerDetails.filter(layer => layer !== null);
  } catch (error) {
    console.error('Error fetching layers from GeoServer:', error);
    throw error;
  }
}

// Get available layers (dynamic from GeoServer)
router.get('/layers', async (req: Request, res: Response) => {
  try {
    // Check cache
    const now = Date.now();
    if (layersCache.length > 0 && (now - lastCacheTime) < CACHE_TTL) {
      return res.json(layersCache);
    }

    // Fetch fresh data from GeoServer
    const layers = await fetchLayersFromGeoServer();
    
    // Update cache
    layersCache = layers;
    lastCacheTime = now;

    res.json(layers);
  } catch (error: any) {
    console.error('Error in /layers endpoint:', error);
    
    // Return cached data if available, otherwise return empty array
    if (layersCache.length > 0) {
      return res.json(layersCache);
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch layers from GeoServer',
      message: error.message 
    });
  }
});

// Force refresh cache (admin endpoint)
router.post('/layers/refresh', async (req: Request, res: Response) => {
  try {
    const layers = await fetchLayersFromGeoServer();
    layersCache = layers;
    lastCacheTime = Date.now();
    
    res.json({ 
      message: 'Layers cache refreshed successfully',
      count: layers.length,
      layers 
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to refresh layers',
      message: error.message 
    });
  }
});

export default router;
