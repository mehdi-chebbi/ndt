import { Router, Request, Response } from 'express';

const router = Router();

// Get available layers (GeoServer WMS configuration)
router.get('/layers', (req: Request, res: Response) => {
  const layers = [
    {
      id: 'africa-ndvi-2020',
      name: 'Africa NDVI 2020',
      description: 'Africa NDVI 2020 data',
      wmsUrl: 'http://localhost:8080/geoserver/africa/wms',
      layerName: 'africa:Africa_NDVI_2020',
      bounds: [[-34.83, -25.36], [37.56, 60.00]],
    },
  ];

  res.json(layers);
});

export default router;
