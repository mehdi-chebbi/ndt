'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import { FeatureGroup } from 'leaflet'

// Fix for default marker icon in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const MapComponent = () => {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const baseLayersRef = useRef<{ [key: string]: L.TileLayer | L.TileLayer.WMS }>({})
  const dataLayersRef = useRef<{ [key: string]: L.TileLayer }>({})
  const drawnItemsRef = useRef<FeatureGroup | null>(null)
  const [activeBasemap, setActiveBasemap] = useState('OpenStreetMap')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'basemaps' | 'data' | 'clip' | 'stats'>('basemaps')
  const [activeDataLayers, setActiveDataLayers] = useState<string[]>([])
  const [selectedColormap, setSelectedColormap] = useState('viridis')
  const [selectedLayer, setSelectedLayer] = useState('africa-ndvi')
  const [isClipping, setIsClipping] = useState(false)
  const [clipMessage, setClipMessage] = useState('')
  const [hasDrawnPolygon, setHasDrawnPolygon] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [statsMessage, setStatsMessage] = useState('')
  const [statistics, setStatistics] = useState<any>(null)

  // Available colormaps
  const colormaps = [
    { name: 'Viridis', value: 'viridis' },
    { name: 'Terrain', value: 'terrain' },
    { name: 'Earth', value: 'gist_earth' },
    { name: 'Ocean', value: 'ocean' },
    { name: 'Blue-Red', value: 'RdBu_r' },
    { name: 'Yellow-Green', value: 'YlGn' },
    { name: 'Schwarzwald', value: 'schwarzwald' },
    { name: 'Plasma', value: 'plasma' },
    { name: 'Inferno', value: 'inferno' },
    { name: 'Rainbow', value: 'rainbow' },
    { name: 'Hot', value: 'hot' },
    { name: 'Cool', value: 'cool' },
    { name: 'Greens', value: 'greens' },
    { name: 'Blues', value: 'blues' },
  ]

  // Available layers for clipping
  const availableLayers = [
    { id: 'africa-ndvi', name: 'Africa Landsat LC 2000' },
  ]

  // Basemaps configuration
  const basemaps: { [key: string]: L.TileLayer | L.TileLayer.WMS } = {
    'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      crossOrigin: true,
    }),
    'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri',
      crossOrigin: true,
    }),
    'Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
      attribution: '© CARTO',
      crossOrigin: true,
    }),
    'Light': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      attribution: '© CARTO',
      crossOrigin: true,
    }),
    'Topographic': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenTopoMap contributors',
      crossOrigin: true,
    }),
    'S2 Cloudless': L.tileLayer('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg', {
      attribution: '<a href="https://s2maps.eu">Sentinel-2 cloudless</a> by <a href="https://eox.at">EOX IT Services GmbH</a>',
      crossOrigin: true,
    }),
    'ESA WorldCover 2021': L.tileLayer.wms('https://services.terrascope.be/wms/v2', {
      layers: 'WORLDCOVER_2021_MAP',
      format: 'image/png',
      attribution: '© ESA WorldCover 2021',
      crossOrigin: true,
    }),
    'ESA WorldCover 2020': L.tileLayer.wms('https://services.terrascope.be/wms/v2', {
      layers: 'WORLDCOVER_2020_MAP',
      format: 'image/png',
      attribution: '© ESA WorldCover 2020',
      crossOrigin: true,
    }),
    'Population Density': L.tileLayer(
      'https://earth.gov/ghgcenter/api/raster/collections/sedac-popdensity-yeargrid5yr-v4.11/items/sedac-popdensity-yeargrid5yr-v4.11-gpw_v4_population_density_rev11_2020_30_sec_2020/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?assets=population-density&colormap_name=rainbow&rescale=0,1000',
      {
        attribution: '© NASA SEDAC',
        crossOrigin: true,
      }
    ),
    'Macrostrat Geology': L.tileLayer('https://tiles.macrostrat.org/carto/{z}/{x}/{y}.png', {
      attribution: '© Macrostrat - CC BY 4.0',
      crossOrigin: true,
      maxZoom: 9,
    }),
    'Stamen Watercolor': L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.png?api_key=3015d71f-71d7-4b54-8466-8787b23b2ec0', {
      attribution: '© Stadia Stamen Watercolor',
      crossOrigin: true,
    }),
  }

  // Function to create data layer with colormap
  const createDataLayer = (colormap: string) => {
    return L.tileLayer(
      `http://localhost:5000/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png?url=C:/Users/mehdi/OneDrive/Desktop/New folder (5)/clip_Africa_Landsat_LC_2000_v8_cog.tif&bidx=1&colormap_name=${colormap}`,
      {
        attribution: 'TiTiler - Africa Landsat LC 2000',
        maxZoom: 18,
        opacity: 1,
        bounds: [[-34.83, -25.36], [37.56, 60.00]],
      }
    )
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Initialize map centered on Africa
    const map = L.map(mapContainerRef.current, {
      center: [0, 20],
      zoom: 3,
      zoomControl: false,
    })

    // Add default basemap (OpenStreetMap)
    const defaultBasemap = basemaps['OpenStreetMap']
    defaultBasemap.addTo(map)
    baseLayersRef.current['OpenStreetMap'] = defaultBasemap

    // Create drawn items feature group
    const drawnItems = new FeatureGroup()
    map.addLayer(drawnItems)
    drawnItemsRef.current = drawnItems

    // Initialize draw control
    const drawControl = new L.Control.Draw({
            position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
        },
        polyline: false,
        rectangle: true,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    })
    map.addControl(drawControl)

    // Handle draw created
    map.on(L.Draw.Event.CREATED, (event: any) => {
      const layer = event.layer
      drawnItems.addLayer(layer)
      setHasDrawnPolygon(true)
    })

    // Handle draw deleted
    map.on(L.Draw.Event.DELETED, () => {
      const layers = drawnItems.getLayers()
      setHasDrawnPolygon(layers.length > 0)
    })

    // Add zoom control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  const handleBasemapChange = (basemapName: string) => {
    if (!mapRef.current) return

    // Remove current basemap
    if (baseLayersRef.current[activeBasemap]) {
      mapRef.current.removeLayer(baseLayersRef.current[activeBasemap] as L.Layer)
    }

    // Add new basemap
    const newBasemap = basemaps[basemapName]
    newBasemap.addTo(mapRef.current)
    baseLayersRef.current[basemapName] = newBasemap

    setActiveBasemap(basemapName)
  }

  const handleDataLayerToggle = (layerName: string) => {
    if (!mapRef.current) return

    if (activeDataLayers.includes(layerName)) {
      // Remove layer
      if (dataLayersRef.current[layerName]) {
        mapRef.current.removeLayer(dataLayersRef.current[layerName] as L.Layer)
        delete dataLayersRef.current[layerName]
      }
      setActiveDataLayers(activeDataLayers.filter(name => name !== layerName))
    } else {
      // Add layer with current colormap
      const newLayer = createDataLayer(selectedColormap)
      newLayer.addTo(mapRef.current)
      dataLayersRef.current[layerName] = newLayer

      // Zoom to layer bounds
      if (newLayer.options.bounds) {
        mapRef.current.fitBounds(newLayer.options.bounds as L.LatLngBoundsExpression)
      }

      setActiveDataLayers([...activeDataLayers, layerName])
    }
  }

  const handleColormapChange = (colormap: string) => {
    setSelectedColormap(colormap)

    // If layer is active, reload it with new colormap
    if (activeDataLayers.includes('Africa Landsat LC 2000') && mapRef.current) {
      // Remove old layer
      if (dataLayersRef.current['Africa Landsat LC 2000']) {
        mapRef.current.removeLayer(dataLayersRef.current['Africa Landsat LC 2000'] as L.Layer)
      }

      // Add new layer with new colormap
      const newLayer = createDataLayer(colormap)
      newLayer.addTo(mapRef.current)
      dataLayersRef.current['Africa Landsat LC 2000'] = newLayer
    }
  }

  const handleClip = async () => {
    if (!mapRef.current || !drawnItemsRef.current) return

    const layers = drawnItemsRef.current.getLayers()
    if (layers.length === 0) {
      setClipMessage('Please draw a polygon first')
      return
    }

    setIsClipping(true)
    setClipMessage('Clipping layer...')

    try {
      // Get the first drawn layer (polygon)
      const drawnLayer = layers[0] as L.Polygon
      const latlngs = drawnLayer.getLatLngs()[0] as L.LatLng[]

      // Convert to GeoJSON polygon
      const coordinates = latlngs.map((latlng) => [latlng.lng, latlng.lat])

      // Close the polygon by adding the first coordinate to the end
      const closedCoordinates = [...coordinates, coordinates[0]]

      const polygon = {
        type: 'Polygon' as const,
        coordinates: [closedCoordinates],
      }

      // Call backend clip endpoint
      const response = await fetch('/api/clip/clip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          polygon,
          layer: selectedLayer,
          colormap: selectedColormap,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to clip layer')
      }

      // Get the image blob
      const blob = await response.blob()
      const imageUrl = URL.createObjectURL(blob)

      // Calculate bounds from the polygon
      const bounds = drawnLayer.getBounds()

      // Add image overlay to map
      const imageOverlay = L.imageOverlay(imageUrl, bounds, {
        opacity: 0.8,
        interactive: true,
      })

      if (mapRef.current) {
        mapRef.current.addLayer(imageOverlay)
        mapRef.current.fitBounds(bounds)
      }

      setClipMessage('Layer clipped successfully!')

      // Auto-hide message after 3 seconds
      setTimeout(() => {
        setClipMessage('')
      }, 3000)

    } catch (error: any) {
      console.error('Clip error:', error)
      setClipMessage(error.message || 'Failed to clip layer')
      setTimeout(() => {
        setClipMessage('')
      }, 5000)
    } finally {
      setIsClipping(false)
    }
  }

  const handleClearDrawings = () => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
      setHasDrawnPolygon(false)
      setClipMessage('')
      setStatistics(null)
      setStatsMessage('')
    }
  }

  const handleGetStatistics = async () => {
    if (!mapRef.current || !drawnItemsRef.current) return

    const layers = drawnItemsRef.current.getLayers()
    if (layers.length === 0) {
      setStatsMessage('Please draw a polygon first')
      return
    }

    setIsLoadingStats(true)
    setStatsMessage('Loading statistics...')
    setStatistics(null)

    try {
      // Get the first drawn layer (polygon)
      const drawnLayer = layers[0] as L.Polygon
      const latlngs = drawnLayer.getLatLngs()[0] as L.LatLng[]

      // Convert to GeoJSON polygon
      const coordinates = latlngs.map((latlng) => [latlng.lng, latlng.lat])

      // Close the polygon by adding the first coordinate to the end
      const closedCoordinates = [...coordinates, coordinates[0]]

      const polygon = {
        type: 'Polygon' as const,
        coordinates: [closedCoordinates],
      }

      // Call backend statistics endpoint
      const response = await fetch('/api/clip/statistics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          polygon,
          layer: selectedLayer,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get statistics')
      }

      // Get the statistics
      const stats = await response.json()
      console.log('Statistics received:', stats)
      setStatistics(stats)
      setStatsMessage('Statistics loaded successfully!')

      // Auto-hide message after 3 seconds
      setTimeout(() => {
        setStatsMessage('')
      }, 3000)

    } catch (error: any) {
      console.error('Statistics error:', error)
      setStatsMessage(error.message || 'Failed to get statistics')
      setTimeout(() => {
        setStatsMessage('')
      }, 5000)
    } finally {
      setIsLoadingStats(false)
    }
  }

  return (
    <div className="flex w-full h-full relative">
      {/* Sidebar */}
      <div
        className={`left-0 top-0 bg-white shadow-lg transition-all duration-300 z-50 h-full ${
          sidebarOpen ? 'w-80' : 'w-0'
        } overflow-hidden absolute`}
      >
        <div className="h-full overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Map Controls</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('basemaps')}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                activeTab === 'basemaps'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Base Maps
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                activeTab === 'data'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Data
            </button>
            <button
              onClick={() => setActiveTab('clip')}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                activeTab === 'clip'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Clip
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                activeTab === 'stats'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Stats
            </button>
          </div>

          {/* Basemap Selection */}
          {activeTab === 'basemaps' && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Select Basemap</h3>
              <div className="space-y-2 pb-4">
                {Object.keys(basemaps).map((basemapName) => (
                  <button
                    key={basemapName}
                    onClick={() => handleBasemapChange(basemapName)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      activeBasemap === basemapName
                        ? 'bg-gray-900 text-white font-medium'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    {basemapName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Data Layers */}
          {activeTab === 'data' && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Data Layers</h3>
              <div className="space-y-2 pb-4">
                <button
                  onClick={() => handleDataLayerToggle('Africa Landsat LC 2000')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between ${
                    activeDataLayers.includes('Africa Landsat LC 2000')
                      ? 'bg-gray-900 text-white font-medium'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  <span>Africa Landsat LC 2000</span>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    activeDataLayers.includes('Africa Landsat LC 2000')
                      ? 'bg-white border-white'
                      : 'border-gray-400'
                  }`}>
                    {activeDataLayers.includes('Africa Landsat LC 2000') && (
                      <svg className="w-3 h-3 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              </div>

              {/* Colormap Selection */}
              {activeDataLayers.includes('Africa Landsat LC 2000') && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Color Scheme</h3>
                  <div className="space-y-2">
                    {colormaps.map((colormap) => (
                      <button
                        key={colormap.value}
                        onClick={() => handleColormapChange(colormap.value)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition text-sm ${
                          selectedColormap === colormap.value
                            ? 'bg-blue-600 text-white font-medium'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                        }`}
                      >
                        {colormap.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Clip Tab */}
          {activeTab === 'clip' && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Clip Layer to Polygon</h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  1. Draw a polygon on the map using the draw tools
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  2. Select a layer and colormap
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  3. Click submit to clip
                </p>
              </div>

              {/* Layer Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Layer</label>
                <select
                  value={selectedLayer}
                  onChange={(e) => setSelectedLayer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableLayers.map((layer) => (
                    <option key={layer.id} value={layer.id}>
                      {layer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Colormap Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
                <select
                  value={selectedColormap}
                  onChange={(e) => setSelectedColormap(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {colormaps.map((colormap) => (
                    <option key={colormap.value} value={colormap.value}>
                      {colormap.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Message */}
              {clipMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  clipMessage.includes('success')
                    ? 'bg-green-100 text-green-800'
                    : clipMessage.includes('Please')
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {clipMessage}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleClip}
                disabled={isClipping || !hasDrawnPolygon}
                className={`w-full py-3 rounded-lg font-medium transition mb-3 ${
                  isClipping || !hasDrawnPolygon
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isClipping ? 'Clipping...' : 'Submit Clip'}
              </button>

              {/* Clear Button */}
              <button
                onClick={handleClearDrawings}
                disabled={!hasDrawnPolygon}
                className={`w-full py-3 rounded-lg font-medium transition ${
                  !hasDrawnPolygon
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Clear Drawings
              </button>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Raster Statistics</h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  1. Draw a polygon on the map
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  2. Click "Get Statistics" to analyze the data within the polygon
                </p>
              </div>

              {/* Layer Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Layer</label>
                <select
                  value={selectedLayer}
                  onChange={(e) => setSelectedLayer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableLayers.map((layer) => (
                    <option key={layer.id} value={layer.id}>
                      {layer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Message */}
              {statsMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  statsMessage.includes('success')
                    ? 'bg-green-100 text-green-800'
                    : statsMessage.includes('Please')
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {statsMessage}
                </div>
              )}

              {/* Get Statistics Button */}
              <button
                onClick={handleGetStatistics}
                disabled={isLoadingStats || !hasDrawnPolygon}
                className={`w-full py-3 rounded-lg font-medium transition mb-3 ${
                  isLoadingStats || !hasDrawnPolygon
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLoadingStats ? 'Loading...' : 'Get Statistics'}
              </button>

              {/* Clear Button */}
              <button
                onClick={handleClearDrawings}
                disabled={!hasDrawnPolygon}
                className={`w-full py-3 rounded-lg font-medium transition ${
                  !hasDrawnPolygon
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Clear Drawings
              </button>

              {/* Statistics Display */}
              {statistics && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Statistics Results</h4>

               

                  {/* Band Statistics */}
                  {statistics.properties && statistics.properties.statistics && statistics.properties.statistics.b1 && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Minimum</span>
                        <span className="text-sm font-medium text-gray-900">
                          {statistics.properties.statistics.b1.min?.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Maximum</span>
                        <span className="text-sm font-medium text-gray-900">
                          {statistics.properties.statistics.b1.max?.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Mean</span>
                        <span className="text-sm font-medium text-gray-900">
                          {statistics.properties.statistics.b1.mean?.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Std Dev</span>
                        <span className="text-sm font-medium text-gray-900">
                          {statistics.properties.statistics.b1.std?.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Median</span>
                        <span className="text-sm font-medium text-gray-900">
                          {statistics.properties.statistics.b1.median?.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`left-0 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white p-3 rounded-r-lg shadow-lg transition-all duration-300 z-50 absolute ${
          sidebarOpen ? 'ml-80' : 'ml-0'
        }`}
      >
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Map Container */}
      <div className="flex-1 h-full relative">
        <div
          ref={mapContainerRef}
          className="w-full h-full z-0"
          style={{ zIndex: 0 }}
        />
      </div>
    </div>
  )
}

export default MapComponent