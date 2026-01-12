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
  const drawControlRef = useRef<any>(null)
  const currentImageOverlayRef = useRef<L.ImageOverlay | null>(null)
  const currentBoundsRef = useRef<L.LatLngBounds | null>(null)
  
  const [activeBasemap, setActiveBasemap] = useState('OpenStreetMap')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'basemaps' | 'data' | 'stats'>('basemaps')
  const [activeDataLayers, setActiveDataLayers] = useState<string[]>([])
  const [selectedColormap, setSelectedColormap] = useState('viridis')
  const [selectedLayer, setSelectedLayer] = useState('africa-ndvi')
  const [isClipping, setIsClipping] = useState(false)
  const [clipMessage, setClipMessage] = useState('')
  const [hasDrawnPolygon, setHasDrawnPolygon] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [statsMessage, setStatsMessage] = useState('')
  const [statistics, setStatistics] = useState<any>(null)

  // Invalid data reporting state
  const [hasClippedImage, setHasClippedImage] = useState(false)
  const [reportingMode, setReportingMode] = useState(false)
  const [reportingStep, setReportingStep] = useState<'draw' | 'comment'>('draw')
  const [invalidAreaPolygon, setInvalidAreaPolygon] = useState<any>(null)
  const [reportComment, setReportComment] = useState('')
  const [currentPolygon, setCurrentPolygon] = useState<any>(null)
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportMessage, setReportMessage] = useState('')

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

  // Function to enable polygon drawing programmatically
  const enablePolygonDrawing = () => {
    if (!mapRef.current) return
    
    // Enable polygon drawing mode
    const drawPolygonHandler = new L.Draw.Polygon(mapRef.current, drawControlRef.current.options.draw.polygon)
    drawPolygonHandler.enable()
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
          shapeOptions: {
            color: '#3388ff',
            fillColor: 'transparent',
            fillOpacity: 0,
            weight: 3,
          },
        },
        polyline: false,
        rectangle: {
          shapeOptions: {
            color: '#3388ff',
            fillColor: 'transparent',
            fillOpacity: 0,
            weight: 3,
          },
        },
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
    drawControlRef.current = drawControl

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

  // Effect to handle draw created event for reporting
  useEffect(() => {
    if (!mapRef.current) return

    const handleDrawCreated = (event: any) => {
      const layer = event.layer
      if (drawnItemsRef.current) {
        drawnItemsRef.current.addLayer(layer)
      }
      setHasDrawnPolygon(true)

      // If in reporting mode, capture the invalid area polygon
      if (reportingMode && reportingStep === 'draw') {
        const drawnLayer = layer as L.Polygon
        const latlngs = drawnLayer.getLatLngs()[0] as L.LatLng[]
        const coordinates = latlngs.map((latlng) => [latlng.lng, latlng.lat])
        const closedCoordinates = [...coordinates, coordinates[0]]
        const polygon = {
          type: 'Polygon' as const,
          coordinates: [closedCoordinates],
        }
        setInvalidAreaPolygon(polygon)
        setReportingStep('comment')
        setClipMessage('Please provide a comment about the invalid data')
      }
    }

    mapRef.current.on(L.Draw.Event.CREATED, handleDrawCreated)

    return () => {
      if (mapRef.current) {
        mapRef.current.off(L.Draw.Event.CREATED, handleDrawCreated)
      }
    }
  }, [reportingMode, reportingStep])

  // Effect to handle reporting mode changes
  // Removed automatic enablePolygonDrawing() call
  useEffect(() => {
    if (reportingMode && reportingStep === 'draw') {
      // We no longer force enable drawing here. 
      // The user will trigger drawing manually or via a button if you add one.
      console.log("Reporting mode active. Waiting for user action.")
    }
  }, [reportingMode, reportingStep])

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
      // Clear old overlays (image overlays only)
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.ImageOverlay) {
          mapRef.current!.removeLayer(layer)
        }
      })

      // Get the first/newest drawn layer (polygon)
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
        opacity: 1,
        interactive: true,
      })

      if (mapRef.current) {
        mapRef.current.addLayer(imageOverlay)
        mapRef.current.fitBounds(bounds)
      }

      // Store references
      currentImageOverlayRef.current = imageOverlay
      currentBoundsRef.current = bounds

      // Store the polygon data for reporting and show metadata box
      setCurrentPolygon(polygon)
      setHasClippedImage(true)

      setClipMessage('Layer clipped successfully!')

      // Auto-hide message after 3 seconds
      setTimeout(() => {
        if (!reportingMode) setClipMessage('')
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
      setHasClippedImage(false)
      setCurrentPolygon(null)
      setReportingMode(false)
      setReportingStep('draw')
      setInvalidAreaPolygon(null)
      setReportComment('')
      setReportMessage('')
      
      // Clear image overlay
      if (currentImageOverlayRef.current && mapRef.current) {
        mapRef.current.removeLayer(currentImageOverlayRef.current)
        currentImageOverlayRef.current = null
      }
      currentBoundsRef.current = null
    }
  }

  const handleStartReport = () => {
    // Clear only the drawn polygons, keep the image
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
      setHasDrawnPolygon(false)
    }
    
    // Keep the image overlay and maintain current view
    // Don't reset bounds or zoom
    
    setReportingMode(true)
    setReportingStep('draw')
    setClipMessage('Draw a polygon around the invalid area')
    
    // REMOVED: setTimeout(() => { enablePolygonDrawing() }, 100)
    // The drawing tool will no longer auto-enable.
  }

  const handleSubmitReport = async () => {
    if (!currentPolygon || !invalidAreaPolygon || !reportComment.trim()) {
      setReportMessage('Please draw a polygon and provide a comment')
      return
    }

    setIsSubmittingReport(true)
    setReportMessage('Submitting report...')

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('You must be logged in to report invalid data')
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          original_polygon: currentPolygon,
          original_layer: selectedLayer,
          original_colormap: selectedColormap,
          invalid_area_polygon: invalidAreaPolygon,
          comment: reportComment,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit report')
      }

      // Close the reporting form immediately
      setReportingMode(false)
      setReportingStep('draw')
      setInvalidAreaPolygon(null)
      setReportComment('')
      setReportMessage('')
      setClipMessage('')
      
      // Clear the drawn polygon from reporting
      if (drawnItemsRef.current) {
        drawnItemsRef.current.clearLayers()
        setHasDrawnPolygon(false)
      }

      // Show success notification
      setClipMessage('Thank you! Your report has been submitted and will be reviewed by our team.')
      setTimeout(() => {
        setClipMessage('')
      }, 5000)

    } catch (error: any) {
      console.error('Report error:', error)
      setReportMessage(error.message || 'Failed to submit report')
      setTimeout(() => {
        setReportMessage('')
      }, 5000)
    } finally {
      setIsSubmittingReport(false)
    }
  }

  const handleCancelReport = () => {
    setReportingMode(false)
    setReportingStep('draw')
    setInvalidAreaPolygon(null)
    setReportComment('')
    setReportMessage('')
    setClipMessage('')
    
    // Clear any polygons drawn during reporting
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
      setHasDrawnPolygon(false)
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

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'basemaps' && (
              <div className="space-y-3">
                {Object.keys(basemaps).map((basemapName) => (
                  <button
                    key={basemapName}
                    onClick={() => handleBasemapChange(basemapName)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      activeBasemap === basemapName
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {basemapName}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                {/* Layer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Data Layer
                  </label>
                  <select
                    value={selectedLayer}
                    onChange={(e) => setSelectedLayer(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    {availableLayers.map((layer) => (
                      <option key={layer.id} value={layer.id}>
                        {layer.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Colormap Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Colormap
                  </label>
                  <select
                    value={selectedColormap}
                    onChange={(e) => handleColormapChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    {colormaps.map((colormap) => (
                      <option key={colormap.value} value={colormap.value}>
                        {colormap.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clip Button */}
                <button
                  onClick={handleClip}
                  disabled={isClipping || reportingMode}
                  className={`w-full py-3 rounded-lg font-medium transition ${
                    isClipping || reportingMode
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-900 text-white hover:bg-gray-700'
                  }`}
                >
                  {isClipping ? 'Clipping...' : reportingMode ? 'Reporting...' : 'Clip Layer'}
                </button>

                {/* Clear Button */}
                <button
                  onClick={handleClearDrawings}
                  disabled={!hasDrawnPolygon && !hasClippedImage}
                  className={`w-full py-3 rounded-lg font-medium transition ${
                    !hasDrawnPolygon && !hasClippedImage
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Clear Drawings
                </button>
              </div>
            )}

            {activeTab === 'stats' && (
              <div>
                {!statistics && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">
                      Use the Data tab to draw a polygon and clip the layer. Then return here to view statistics.
                    </p>
                    {/* Get Statistics Button moved here */}
                    <button
                      onClick={handleGetStatistics}
                      disabled={isLoadingStats || reportingMode}
                      className={`w-full mt-4 py-3 rounded-lg font-medium transition ${
                        isLoadingStats || reportingMode
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isLoadingStats ? 'Loading...' : 'Get Statistics'}
                    </button>
                  </div>
                )}

                {statistics && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                       <h4 className="text-sm font-semibold text-gray-900">Statistics Results</h4>
                       <button 
                         onClick={() => setStatistics(null)}
                         className="text-xs text-red-600 hover:text-red-800 underline"
                       >
                         Clear Stats
                       </button>
                    </div>
                   
                    {/* Show raw stats for debugging */}
                    {true && (
                      <details className="mb-4">
                        <summary className="text-xs text-gray-500 cursor-pointer">Raw Data (Debug)</summary>
                        <pre className="text-xs bg-gray-100 p-2 mt-2 overflow-auto max-h-40">
                          {JSON.stringify(statistics, null, 2)}
                        </pre>
                      </details>
                    )}

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
                        <div className="flex justify-between items-center py-2">
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

      {/* Metadata Box (Bottom Right) */}
      {hasClippedImage && !reportingMode && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-sm z-50 border border-gray-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-bold text-gray-900">Layer Metadata</h3>
            <button
              onClick={() => setHasClippedImage(false)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span className="font-medium">Layer:</span>
              <span>{availableLayers.find(l => l.id === selectedLayer)?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Colormap:</span>
              <span className="capitalize">{selectedColormap}</span>
            </div>
          </div>

          {/* Report Button */}
          <button
            onClick={handleStartReport}
            className="w-full mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm"
          >
            Report Invalid Data
          </button>
        </div>
      )}

      {/* Reporting Mode Indicator */}
      {reportingMode && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-sm z-50 border-2 border-red-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <h3 className="text-sm font-bold text-gray-900">Report Invalid Data</h3>
          </div>

          {reportingStep === 'draw' && (
            <div>
              <div className="text-sm text-gray-600 mb-3">
                <p className="mb-2">Draw a polygon around the area with invalid data.</p>
                {/* Updated text since drawing is no longer auto-enabled */}
                <p className="text-xs text-gray-500">Click the pentagon icon in the top-left toolbar to start drawing.</p>
              </div>
              <button
                onClick={handleCancelReport}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          )}

          {reportingStep === 'comment' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment
                </label>
                <textarea
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="Describe the issue (e.g., 'Blue should be water, not sand')"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSubmitReport}
                  disabled={isSubmittingReport}
                  className={`flex-1 px-4 py-2 bg-red-600 text-white rounded-lg transition font-medium text-sm ${
                    isSubmittingReport ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
                  }`}
                >
                  {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
                <button
                  onClick={handleCancelReport}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
                >
                  Cancel
                </button>
              </div>

              {reportMessage && (
                <div className={`text-xs p-2 rounded ${
                  reportMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {reportMessage}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Message Display */}
      {(clipMessage || statsMessage) && !reportingMode && (
        <div className="absolute top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {clipMessage || statsMessage}
        </div>
      )}
    </div>
  )
}

export default MapComponent