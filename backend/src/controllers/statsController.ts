import { Response, AuthRequest } from 'express';
import pool from '../config/database';
import path from 'path';

const CLIP_SERVICE_URL = process.env.CLIP_SERVICE_URL || 'http://clip-service:3005';
const STATS_TIMEOUT = 10 * 60 * 1000; // 10 minutes

// Helper function to count coordinates in a polygon
function countPolygonCoordinates(polygon: any): number {
  if (!polygon || !polygon.coordinates) return 0;

  if (polygon.type === 'Polygon') {
    return polygon.coordinates.reduce((sum: number, ring: any) => sum + ring.length, 0);
  } else if (polygon.type === 'MultiPolygon') {
    return polygon.coordinates.reduce((sum: number, poly: any) => {
      return sum + poly.reduce((polySum: number, ring: any) => polySum + ring.length, 0);
    }, 0);
  }

  return 0;
}

// Get stats for a polygon area
export const getStatsForPolygon = async (req: AuthRequest, res: Response) => {
  try {
    const { layer_name, polygon } = req.body;

    if (!layer_name || !polygon) {
      return res.status(400).json({ error: 'Missing layer_name or polygon' });
    }

    // Get layer from database
    const result = await pool.query(
      'SELECT * FROM layers WHERE geoserver_name = $1',
      [layer_name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Layer not found',
        message: 'This layer does not exist in the database.'
      });
    }

    const layer = result.rows[0];
    const filePath = layer.file_path;
    const classLabels = layer.class_labels;

    if (!filePath) {
      return res.status(400).json({
        error: 'Layer not configured for stats',
        message: 'This layer has not been configured with a file path. Please contact an admin.'
      });
    }

    if (!classLabels) {
      return res.status(400).json({
        error: 'Layer not configured for stats',
        message: 'This layer has not been configured with class labels. Please contact an admin.'
      });
    }

    // Call clip-service /stats endpoint instead of spawning python
    console.log(`[Stats] Calling clip-service for layer: ${layer_name} | polygon type: ${polygon.type} | coordinates: ${countPolygonCoordinates(polygon)}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), STATS_TIMEOUT);

    try {
      const response = await fetch(`${CLIP_SERVICE_URL}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raster_path: filePath,
          polygon: polygon
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[Stats] Clip-service error: ${response.status} - ${errorBody}`);
        return res.status(response.status).json({
          error: 'Failed to process raster',
          details: errorBody || `Clip-service returned ${response.status}`
        });
      }

      const stats = await response.json();

      // Calculate percentage for each class
      const totalPixels = stats.total_pixels;
      const classesWithPercentage = stats.classes.map((cls: any) => ({
        class_id: cls.class_id,
        class_name: classLabels[cls.class_id] || `Unknown (${cls.class_id})`,
        area_km2: cls.area_km2,
        percentage: totalPixels > 0 ? Math.round((cls.pixels / totalPixels) * 100 * 10) / 10 : 0
      }));

      console.log(`[Stats] Success: ${classesWithPercentage.length} classes, ${stats.total_area_km2} km2 total`);

      res.status(200).json({
        layer_name,
        total_area_km2: stats.total_area_km2,
        pixel_size_m: stats.pixel_size_m,
        classes: classesWithPercentage
      });

    } catch (fetchError: any) {
      clearTimeout(timeout);

      if (fetchError.name === 'AbortError') {
        console.error('[Stats] Clip-service request timed out after', STATS_TIMEOUT / 1000, 'seconds');
        return res.status(504).json({
          error: 'Stats computation timed out',
          details: 'The raster processing took too long. Try a smaller area.'
        });
      }

      console.error('[Stats] Failed to reach clip-service:', fetchError.message);
      return res.status(502).json({
        error: 'Failed to connect to raster processing service',
        details: fetchError.message
      });
    }

  } catch (error: any) {
    console.error('[Stats] Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
