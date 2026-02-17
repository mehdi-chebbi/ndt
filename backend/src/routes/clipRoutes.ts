import { Router, Request, Response } from 'express';

const router = Router();

// Get available layers (GeoServer WMS configuration)
router.get('/layers', (req: Request, res: Response) => {
  const layers = [
{
  id: 'africa-landsat-lc-2000',
  name: 'Africa Landsat LC 2000',
  description: 'Africa Landsat Land Cover 2000 v8',
  wmsUrl: 'http://localhost:8080/geoserver/africa/wms',
  layerName: 'africa:clip_Africa_Landsat_LC_2000_v8_cog',
  bounds: [[-34.83, -25.36], [37.56, 60.00]],
}
  ];

  res.json(layers);
});

export default router;
