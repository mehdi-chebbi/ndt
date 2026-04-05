import { Response, AuthRequest } from 'express';
import pool from '../config/database';
import { spawn } from 'child_process';
import path from 'path';

// Helper function to count coordinates in a polygon
function countPolygonCoordinates(polygon: any): number {
  if (!polygon || !polygon.coordinates) return 0;

  if (polygon.type === 'Polygon') {
    // Polygon: coordinates is [rings], where rings is [positions]
    // Sum all positions across all rings
    return polygon.coordinates.reduce((sum: number, ring: any) => sum + ring.length, 0);
  } else if (polygon.type === 'MultiPolygon') {
    // MultiPolygon: coordinates is [polygons], where polygons is [rings], where rings is [positions]
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

    // Call Python script for raster processing
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'raster_stats.py');

    console.log('Running stats for layer:', layer_name, '| polygon type:', polygon.type, '| coordinates:', countPolygonCoordinates(polygon));

    const pythonProcess = spawn('python3', [
      scriptPath,
      '--file', filePath,
    ]);

    // Log polygon JSON size before writing to stdin
    const polygonStr = JSON.stringify(polygon);
    console.log('Polygon JSON size (bytes):', Buffer.byteLength(polygonStr, 'utf8'));

    // Write polygon to stdin with error handling
    pythonProcess.stdin.write(polygonStr);
    pythonProcess.stdin.end();

    pythonProcess.stdin.on('error', (err) => {
      console.error('stdin write error:', err.message);
    });

    // Handle process spawn errors
    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err.message);
      console.error('Error code:', (err as any).code);
    });

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code, signal) => {
      // Log if process was killed by a signal
      if (signal) {
        console.error('Python process killed by signal:', signal);
      }

      if (code !== 0) {
        console.error('Python script failed with code:', code);
        console.error('File path:', filePath);
        console.error('Polygon type:', polygon.type);
        console.error('Polygon coordinate count:', countPolygonCoordinates(polygon));
        console.error('Stderr:', errorData);
        console.error('Stdout:', outputData);
        return res.status(500).json({
          error: 'Failed to process raster',
          details: errorData || outputData || 'No output from Python script'
        });
      }

      try {
        const stats = JSON.parse(outputData);

        // Calculate percentage for each class
        const totalPixels = stats.total_pixels;
        const classesWithPercentage = stats.classes.map((cls: any) => ({
          class_id: cls.class_id,
          class_name: classLabels[cls.class_id] || `Unknown (${cls.class_id})`,
          area_km2: cls.area_km2,
          percentage: totalPixels > 0 ? Math.round((cls.pixels / totalPixels) * 100 * 10) / 10 : 0
        }));

        res.status(200).json({
          layer_name,
          total_area_km2: stats.total_area_km2,
          pixel_size_m: stats.pixel_size_m,
          classes: classesWithPercentage
        });
      } catch (parseError) {
        console.error('Failed to parse Python output:', outputData);
        res.status(500).json({ error: 'Failed to parse stats result' });
      }
    });

  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
