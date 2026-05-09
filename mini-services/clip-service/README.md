# Clipping Microservice

FastAPI service that clips raster files to GeoJSON polygon boundaries using GDAL and publishes them to GeoServer.

## Features

- Clip raster layers to country boundaries
- Publish clipped layers to GeoServer
- Assign styles to published layers
- RESTful API with automatic validation
- Health check endpoint

## API Endpoints

### POST /clip
Clip a raster layer and publish to GeoServer.

**Request Body:**
```json
{
  "geojson_path": "/app/geojson/Algeria.geojson",
  "raster_path": "/data/rasters/LandCoverESACCI_2010_COG.tif",
  "workspace": "LC",
  "layer_name": "JRC_1",
  "style_name": "LC:LPD",
  "country_name": "Algeria"
}
```

**Response:**
```json
{
  "status": "success",
  "layer_name": "LC:clip_Algeria_JRC_1_a3f8b2c1",
  "message": "Successfully clipped and published layer"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "clipping-service"
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEOSERVER_URL` | `http://192.168.2.93:8080/geoserver` | GeoServer base URL |
| `GEOSERVER_USER` | `admin` | GeoServer username |
| `GEOSERVER_PASSWORD` | `geoserver` | GeoServer password |
| `OUTPUT_DIR` | `/tmp/clipped` | Directory for temporary clipped files |
| `GEOJSON_DIR` | `/app/geojson` | Directory containing GeoJSON files |

## Layer Naming Convention

Clipped layers follow this naming pattern:
```
clip_{sanitized_country_name}_{original_layer_name}_{uuid}
```

Examples:
- `clip_Algeria_JRC_1_a3f8b2c1`
- `clip_Democratic_Republic_of_the_Congo_LandCover_2020_b4d9e3f2`

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn main:app --reload --host 0.0.0.0 --port 3005
```

## Docker

```bash
# Build image
docker build -t clip-service .

# Run container
docker run -p 3005:3005 \
  -e GEOSERVER_URL=http://geoserver:8080/geoserver \
  -v /path/to/geojson:/app/geojson \
  -v /path/to/rasters:/data/rasters \
  clip-service
```
