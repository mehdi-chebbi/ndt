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
  
  const [activeBasemap, setActiveBasemap] = useState('OpenStreetMap')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'basemaps' | 'data'>('basemaps')
  const [activeDataLayers, setActiveDataLayers] = useState<string[]>([])
  const [availableLayers, setAvailableLayers] = useState<any[]>([])
  const [clipMessage, setClipMessage] = useState('')
  const [hasDrawnPolygon, setHasDrawnPolygon] = useState(false)

  // Invalid data reporting state
  const [reportingMode, setReportingMode] = useState(false)
  const [reportingStep, setReportingStep] = useState<'draw' | 'comment'>('draw')
  const [invalidAreaPolygon, setInvalidAreaPolygon] = useState<any>(null)
  const [reportComment, setReportComment] = useState('')
  const [currentPolygon, setCurrentPolygon] = useState<any>(null)
  const [selectedLayerId, setSelectedLayerId] = useState<string>('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportMessage, setReportMessage] = useState('')

  // Fetch available layers from backend on mount
  useEffect(() => {
    fetch('/api/clip/layers')
      .then(res => res.json())
      .then(data => {
        setAvailableLayers(data)
        if (data.length > 0) {
          setSelectedLayerId(data[0].id)
        }
      })
      .catch(err => {
        console.error('Failed to fetch layers:', err)
        setClipMessage('Failed to load layers')
      })
  }, [])

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

  // Function to create WMS data layer from GeoServer
  const createWMSLayer = (layerConfig: any) => {
    return L.tileLayer.wms(layerConfig.wmsUrl, {
      layers: layerConfig.layerName,
      format: 'image/png',
      transparent: true,
      attribution: `GeoServer - ${layerConfig.name}`,
      bounds: layerConfig.bounds,
    })
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

  const handleDataLayerToggle = (layerId: string, layerName: string) => {
    if (!mapRef.current) return

    if (activeDataLayers.includes(layerName)) {
      // Remove layer
      if (dataLayersRef.current[layerName]) {
        mapRef.current.removeLayer(dataLayersRef.current[layerName] as L.Layer)
        delete dataLayersRef.current[layerName]
      }
      setActiveDataLayers(activeDataLayers.filter(name => name !== layerName))
    } else {
      // Find layer config
      const layerConfig = availableLayers.find(l => l.id === layerId)
      if (!layerConfig) {
        console.error('Layer not found:', layerId)
        return
      }

      // Add WMS layer
      const newLayer = createWMSLayer(layerConfig)
      newLayer.addTo(mapRef.current)
      dataLayersRef.current[layerName] = newLayer

      // Zoom to layer bounds
      if (layerConfig.bounds) {
        mapRef.current.fitBounds(layerConfig.bounds)
      }

      setActiveDataLayers([...activeDataLayers, layerName])
      setSelectedLayerId(layerId)
      setCurrentPolygon(null)
    }
  }

  const handleClearDrawings = () => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
      setHasDrawnPolygon(false)
      setClipMessage('')
      setCurrentPolygon(null)
      setReportingMode(false)
      setReportingStep('draw')
      setInvalidAreaPolygon(null)
      setReportComment('')
      setReportMessage('')
    }
  }

  const handleStartReport = () => {
    // Clear only the drawn polygons
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
      setHasDrawnPolygon(false)
    }

    // Set the current view bounds as the polygon for reporting
    if (mapRef.current && selectedLayerId) {
      const bounds = mapRef.current.getBounds()
      const layerConfig = availableLayers.find(l => l.id === selectedLayerId)
      if (layerConfig) {
        // Create a polygon from the current view bounds
        const boundsPolygon = {
          type: 'Polygon' as const,
          coordinates: [[
            [bounds.getWest(), bounds.getSouth()],
            [bounds.getEast(), bounds.getSouth()],
            [bounds.getEast(), bounds.getNorth()],
            [bounds.getWest(), bounds.getNorth()],
            [bounds.getWest(), bounds.getSouth()]
          ]],
        }
        setCurrentPolygon(boundsPolygon)
      }
    }

    setReportingMode(true)
    setReportingStep('draw')
    setClipMessage('Draw a polygon around the invalid area')
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
          original_layer: selectedLayerId,
          original_colormap: 'default',
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
                {/* Layer List */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Data Layers
                  </label>
                  <div className="space-y-2">
                    {availableLayers.map((layer) => {
                      const isActive = activeDataLayers.includes(layer.name)
                      return (
                        <button
                          key={layer.id}
                          onClick={() => handleDataLayerToggle(layer.id, layer.name)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition ${
                            isActive
                              ? 'bg-green-100 text-green-900 border-2 border-green-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{layer.name}</span>
                            {isActive && (
                              <span className="text-xs font-semibold">Active</span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Clear Button */}
                {activeDataLayers.length > 0 && (
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
                )}

                {/* Report Invalid Data Button */}
                {activeDataLayers.length > 0 && (
                  <button
                    onClick={handleStartReport}
                    className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    Report Invalid Data
                  </button>
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
                Draw a polygon around the area with invalid data.
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
      {clipMessage && !reportingMode && (
        <div className="absolute top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {clipMessage}
        </div>
      )}
    </div>
  )
}

export default MapComponent