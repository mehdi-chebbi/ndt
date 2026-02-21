import { Response, AuthRequest } from 'express';
import pool from '../config/database';
import { spawn } from 'child_process';
import path from 'path';

// Get stats for a polygon area
export const getStatsForPolygon = async (req: AuthRequest, res: Response) => {
  try {
    const { layer_name, polygon } = req.body;

    if (!layer_name || !polygon) {
      return res.status(400).json({ error: 'Missing layer_name or polygon' });
    }

    // Get layer metadata from database
    const result = await pool.query(
      'SELECT * FROM layer_metadata WHERE geoserver_name = $1',
      [layer_name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Layer not configured for stats',
        message: 'This layer has not been configured with file path. Please contact an admin.'
      });
    }

    const metadata = result.rows[0];
    const filePath = metadata.file_path;
    const classLabels = metadata.class_labels;

    // Call Python script for raster processing
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'raster_stats.py');
    
    const pythonProcess = spawn('python3', [
      scriptPath,
      '--file', filePath,
      '--polygon', JSON.stringify(polygon)
    ]);

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', errorData);
        return res.status(500).json({ 
          error: 'Failed to process raster',
          details: errorData
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

    // Handle timeout
    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      res.status(500).json({ error: 'Failed to start raster processing' });
    });

  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
