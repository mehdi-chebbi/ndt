import L from 'leaflet'

// Basemap metadata with thumbnail paths
export interface BasemapInfo {
  name: string
  thumbnail: string
}

// Basemap metadata for UI display
export const basemapInfo: BasemapInfo[] = [
  { name: 'OpenStreetMap', thumbnail: '/basemaps/osm.png' },
  { name: 'Satellite', thumbnail: '/basemaps/sat.png' },
  { name: 'Dark', thumbnail: '/basemaps/dark.png' },
  { name: 'Light', thumbnail: '/basemaps/light.png' },
  { name: 'Topographic', thumbnail: '/basemaps/topo.png' },
  { name: 'S2 Cloudless', thumbnail: '/basemaps/s2.png' },
  // { name: 'ESA WorldCover 2021', thumbnail: '/basemaps/2021.png' },
  // { name: 'ESA WorldCover 2020', thumbnail: '/basemaps/2020.png' },
  { name: 'Population Density', thumbnail: '/basemaps/pop.png' },
  { name: 'Macrostrat Geology', thumbnail: '/basemaps/geology.png' },
  { name: 'Stamen Watercolor', thumbnail: '/basemaps/watercolor.png' },
]

// Basemaps configuration - all available base map layers
export const basemaps: { [key: string]: L.TileLayer | L.TileLayer.WMS } = {
  'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    crossOrigin: 'anonymous',
  }),
  'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri',
    crossOrigin: 'anonymous',
  }),
  'Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    attribution: '© CARTO',
    crossOrigin: 'anonymous',
  }),
  'Light': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '© CARTO',
    crossOrigin: 'anonymous',
  }),
  'Topographic': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenTopoMap contributors',
    crossOrigin: 'anonymous',
  }),
  'S2 Cloudless': L.tileLayer('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg', {
    attribution: '<a href="https://s2maps.eu">Sentinel-2 cloudless</a> by <a href="https://eox.at">EOX IT Services GmbH</a>',
    crossOrigin: 'anonymous',
  }),
  // 'ESA WorldCover 2021': L.tileLayer.wms('https://services.terrascope.be/wms/v2', {
  //   layers: 'WORLDCOVER_2021_MAP',
  //   format: 'image/png',
  //   attribution: '© ESA WorldCover 2021',
  //   crossOrigin: 'anonymous',
  // }),
  // 'ESA WorldCover 2020': L.tileLayer.wms('https://services.terrascope.be/wms/v2', {
  //   layers: 'WORLDCOVER_2020_MAP',
  //   format: 'image/png',
  //   attribution: '© ESA WorldCover 2020',
  //   crossOrigin: 'anonymous',
  // }),
  'Population Density': L.tileLayer(
    'https://earth.gov/ghgcenter/api/raster/collections/sedac-popdensity-yeargrid5yr-v4.11/items/sedac-popdensity-yeargrid5yr-v4.11-gpw_v4_population_density_rev11_2020_30_sec_2020/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?assets=population-density&colormap_name=rainbow&rescale=0,1000',
    {
      attribution: '© NASA SEDAC',
      crossOrigin: 'anonymous',
    }
  ),
  'Macrostrat Geology': L.tileLayer('https://tiles.macrostrat.org/carto/{z}/{x}/{y}.png', {
    attribution: '© Macrostrat - CC BY 4.0',
    crossOrigin: 'anonymous',
    maxZoom: 9,
  }),
  'Stamen Watercolor': L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.png?api_key=3015d71f-71d7-4b54-8466-8787b23b2ec0', {
    attribution: '© Stadia Stamen Watercolor',
    crossOrigin: 'anonymous',
  }),
}

// List of basemap names for iteration
export const basemapNames = Object.keys(basemaps)
