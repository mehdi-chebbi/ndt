import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

const router = Router();

// Clip raster to polygon using TiTiler /feature endpoint
router.post('/clip', async (req: Request, res: Response) => {
  try {
    const { polygon, layer, colormap } = req.body;

    // Validate input
    if (!polygon || !polygon.coordinates) {
      return res.status(400).json({ error: 'Invalid polygon: missing coordinates' });
    }

    if (polygon.type !== 'Polygon') {
      return res.status(400).json({ error: 'Invalid geometry type: must be Polygon' });
    }

    // Layer configuration
    const layerConfigs: { [key: string]: string } = {
      'africa-ndvi': 'C:/Users/mehdi/OneDrive/Desktop/New folder (5)/clip_Africa_Landsat_LC_2000_v8_cog.tif',
    };

    const layerUrl = layerConfigs[layer];
    if (!layerUrl) {
      return res.status(400).json({ error: `Unknown layer: ${layer}` });
    }

    // Call TiTiler /feature endpoint
    const titilerUrl = 'http://localhost:5000/cog/feature.png';
    const queryParams = new URLSearchParams({
      url: layerUrl,
      bidx: '1',
      colormap_name: colormap || 'viridis',
      max_size: '2048',
    });

    // Convert polygon geometry to GeoJSON Feature
    const feature = {
      type: 'Feature',
      geometry: polygon,
      properties: {},
    };

    const response = await fetch(`${titilerUrl}?${queryParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feature),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TiTiler error:', errorText);
      return res.status(response.status).json({
        error: 'Failed to clip raster',
        details: errorText,
      });
    }

    // Get the image buffer
    const imageBuffer = await response.buffer();

    // Return the image directly
    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);

  } catch (error: any) {
    console.error('Clip error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get available layers
router.get('/layers', (req: Request, res: Response) => {
  const layers = [
    {
      id: 'africa-ndvi',
      name: 'Africa Landsat LC 2000',
      description: 'Africa Land Cover data from Landsat 2000',
    },
  ];

  res.json(layers);
});

// Get statistics for polygon using TiTiler /statistics endpoint
router.post('/statistics', async (req: Request, res: Response) => {
  try {
    const { polygon, layer } = req.body;

    // Validate input
    if (!polygon || !polygon.coordinates) {
      return res.status(400).json({ error: 'Invalid polygon: missing coordinates' });
    }

    if (polygon.type !== 'Polygon') {
      return res.status(400).json({ error: 'Invalid geometry type: must be Polygon' });
    }

    // Layer configuration
    const layerConfigs: { [key: string]: string } = {
      'africa-ndvi': 'C:/Users/mehdi/OneDrive/Desktop/New folder (5)/clip_Africa_Landsat_LC_2000_v8_cog.tif',
    };

    const layerUrl = layerConfigs[layer];
    if (!layerUrl) {
      return res.status(400).json({ error: `Unknown layer: ${layer}` });
    }

    // Convert polygon geometry to GeoJSON Feature
    const feature = {
      type: 'Feature',
      geometry: polygon,
      properties: {},
    };

    // Call TiTiler /statistics endpoint
    const titilerUrl = 'http://localhost:5000/cog/statistics';
    const queryParams = new URLSearchParams({
      url: layerUrl,
      bidx: '1',
    });

    const response = await fetch(`${titilerUrl}?${queryParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feature),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TiTiler statistics error:', errorText);
      return res.status(response.status).json({
        error: 'Failed to get statistics',
        details: errorText,
      });
    }

    // Parse and return the statistics
    const statistics = await response.json();
    res.json(statistics);

  } catch (error: any) {
    console.error('Statistics error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
