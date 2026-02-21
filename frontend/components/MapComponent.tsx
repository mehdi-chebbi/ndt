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

interface Layer {
  id: number
  name: string
  geoserver_name: string
  layerName: string
  wmsUrl: string
  bounds: [[number, number], [number, number]]
  hasStats: boolean
  group_id: number | null
  group_name: string | null
}

interface Group {
  id: number
  name: string
  description: string | null
  parent_id: number | null
  children: Group[]
  layers: Layer[]
}

interface GroupedLayers {
  groups: Group[]
  ungroupedLayers: Layer[]
}

const MapComponent = () => {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const baseLayersRef = useRef<{ [key: string]: L.TileLayer | L.TileLayer.WMS }>({})
  const dataLayersRef = useRef<{ [key: string]: L.TileLayer }>({})
  const drawnItemsRef = useRef<FeatureGroup | null>(null)
  const drawControlRef = useRef<any>(null)

  const [activeBasemap, setActiveBasemap] = useState('OpenStreetMap')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'basemaps' | 'data' | 'stats'>('basemaps')
  const [activeDataLayers, setActiveDataLayers] = useState<string[]>([])
  const [groupedLayers, setGroupedLayers] = useState<GroupedLayers>({ groups: [], ungroupedLayers: [] })
  const [expandedGroups, setExpandedGroups] = useState<Set<number | string>>(new Set())
  const [clipMessage, setClipMessage] = useState('')
  const [hasDrawnPolygon, setHasDrawnPolygon] = useState(false)
  const [isLoadingLayers, setIsLoadingLayers] = useState(true)
  const [layerError, setLayerError] = useState('')

  // Invalid data reporting state
  const [reportingMode, setReportingMode] = useState(false)
  const [reportingStep, setReportingStep] = useState<'draw' | 'comment'>('draw')
  const [invalidAreaPolygon, setInvalidAreaPolygon] = useState<any>(null)
  const [reportComment, setReportComment] = useState('')
  const [currentPolygon, setCurrentPolygon] = useState<any>(null)
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null)
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportMessage, setReportMessage] = useState('')

  // Stats state
  const [statsMode, setStatsMode] = useState(false)
  const [statsLayerId, setStatsLayerId] = useState<number | null>(null)
  const [statsPolygon, setStatsPolygon] = useState<any>(null)
  const [statsResults, setStatsResults] = useState<any>(null)
  const [isCalculatingStats, setIsCalculatingStats] = useState(false)
  const [statsError, setStatsError] = useState('')

  // Get all layers flat for easy access
  const flattenLayers = (groups: Group[]): Layer[] => {
    const result: Layer[] = []
    const flatten = (groupList: Group[]) => {
      groupList.forEach(g => {
        result.push(...g.layers)
        if (g.children?.length > 0) {
          flatten(g.children)
        }
      })
    }
    flatten(groups)
    return result
  }

  const allLayers = [
    ...flattenLayers(groupedLayers.groups),
    ...groupedLayers.ungroupedLayers
  ]

  // Fetch available layers from database
  const fetchLayers = async () => {
    setIsLoadingLayers(true)
    setLayerError('')
    try {
      const res = await fetch('/api/clip/layers')
      if (!res.ok) {
        throw new Error('Failed to fetch layers')
      }
      const data: GroupedLayers = await res.json()
      setGroupedLayers(data)
      
      // Expand all groups by default
      const allGroupIds = new Set<number | string>()
      const collectIds = (groupList: Group[]) => {
        groupList.forEach(g => {
          allGroupIds.add(g.id)
          if (g.children?.length > 0) {
            collectIds(g.children)
          }
        })
      }
      collectIds(data.groups)
      allGroupIds.add('ungrouped')
      setExpandedGroups(allGroupIds)
      
      // Set first layer as selected
      const firstLayer = data.groups[0]?.layers[0] || 
                         data.groups[0]?.children?.[0]?.layers[0] || 
                         data.ungroupedLayers[0]
      if (firstLayer) {
        setSelectedLayerId(firstLayer.id)
      }
    } catch (err: any) {
      console.error('Failed to fetch layers:', err)
      setLayerError('Failed to load layers')
    } finally {
      setIsLoadingLayers(false)
    }
  }

  // Fetch layers on mount
  useEffect(() => {
    fetchLayers()
  }, [])

  // Toggle group expansion
  const toggleGroup = (groupId: number | string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

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
  const createWMSLayer = (layerConfig: Layer) => {
    return L.tileLayer.wms(layerConfig.wmsUrl, {
      layers: layerConfig.layerName,
      format: 'image/png',
      transparent: true,
      attribution: `GeoServer - ${layerConfig.name}`,
      bounds: layerConfig.bounds,
    })
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
  useEffect(() => {
    if (reportingMode && reportingStep === 'draw') {
      console.log("Reporting mode active. Waiting for user action.")
    }
  }, [reportingMode, reportingStep])

  // Effect to handle draw created event for stats
  useEffect(() => {
    if (!mapRef.current) return

    const handleDrawCreatedForStats = (event: any) => {
      // If in stats mode, capture the polygon
      if (statsMode) {
        const layer = event.layer
        const drawnLayer = layer as L.Polygon
        const latlngs = drawnLayer.getLatLngs()[0] as L.LatLng[]
        const coordinates = latlngs.map((latlng) => [latlng.lng, latlng.lat])
        const closedCoordinates = [...coordinates, coordinates[0]]
        const polygon = {
          type: 'Polygon' as const,
          coordinates: [closedCoordinates],
        }
        setStatsPolygon(polygon)
        setClipMessage('Polygon captured. Click "Calculate Stats" to proceed.')
      }
    }

    mapRef.current.on(L.Draw.Event.CREATED, handleDrawCreatedForStats)

    return () => {
      if (mapRef.current) {
        mapRef.current.off(L.Draw.Event.CREATED, handleDrawCreatedForStats)
      }
    }
  }, [statsMode])

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

  const handleDataLayerToggle = (layer: Layer) => {
    if (!mapRef.current) return

    const layerKey = layer.geoserver_name

    if (activeDataLayers.includes(layerKey)) {
      // Remove layer
      if (dataLayersRef.current[layerKey]) {
        mapRef.current.removeLayer(dataLayersRef.current[layerKey] as L.Layer)
        delete dataLayersRef.current[layerKey]
      }
      setActiveDataLayers(activeDataLayers.filter(name => name !== layerKey))
    } else {
      // Add WMS layer
      const newLayer = createWMSLayer(layer)
      newLayer.addTo(mapRef.current)
      dataLayersRef.current[layerKey] = newLayer

      // Zoom to layer bounds
      if (layer.bounds) {
        mapRef.current.fitBounds(layer.bounds)
      }

      setActiveDataLayers([...activeDataLayers, layerKey])
      setSelectedLayerId(layer.id)
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
      // Clear stats
      setStatsMode(false)
      setStatsPolygon(null)
      setStatsResults(null)
      setStatsError('')
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
      const layerConfig = allLayers.find(l => l.id === selectedLayerId)
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

    const selectedLayer = allLayers.find(l => l.id === selectedLayerId)
    if (!selectedLayer) {
      setReportMessage('Please select a layer')
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
          original_layer: selectedLayer.geoserver_name,
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

  // Stats functions
  const handleStartStats = () => {
    // Clear previous drawings
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
      setHasDrawnPolygon(false)
    }

    setStatsMode(true)
    setStatsPolygon(null)
    setStatsResults(null)
    setStatsError('')
    setClipMessage('Select a layer and draw a polygon to calculate statistics')
  }

  const handleCalculateStats = async () => {
    if (!statsPolygon || !statsLayerId) {
      setStatsError('Please select a layer and draw a polygon')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setStatsError('You must be logged in to calculate statistics')
      return
    }

    // Find the layer
    const layerConfig = allLayers.find(l => l.id === statsLayerId)
    if (!layerConfig) {
      setStatsError('Layer not found')
      return
    }

    if (!layerConfig.hasStats) {
      setStatsError('This layer is not configured for statistics. Please contact an admin.')
      return
    }

    setIsCalculatingStats(true)
    setStatsError('')

    try {
      const response = await fetch('/api/layers/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          layer_name: layerConfig.geoserver_name,
          polygon: statsPolygon,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to calculate statistics')
      }

      setStatsResults(data)
      setClipMessage('')
    } catch (err: any) {
      setStatsError(err.message)
    } finally {
      setIsCalculatingStats(false)
    }
  }

  const handleCancelStats = () => {
    setStatsMode(false)
    setStatsPolygon(null)
    setStatsResults(null)
    setStatsError('')
    setClipMessage('')

    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
      setHasDrawnPolygon(false)
    }
  }

  // Render a layer button
  const renderLayerButton = (layer: Layer) => {
    const isActive = activeDataLayers.includes(layer.geoserver_name)
    return (
      <button
        key={layer.id}
        onClick={() => handleDataLayerToggle(layer)}
        className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
          isActive
            ? 'bg-green-100 text-green-900 border border-green-600'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium">{layer.name}</span>
          <div className="flex items-center gap-2">
            {!layer.hasStats && (
              <span className="text-xs text-amber-600">(no stats)</span>
            )}
            {isActive && (
              <span className="text-xs font-semibold text-green-700">Active</span>
            )}
          </div>
        </div>
      </button>
    )
  }

  // Render nested groups recursively
  const renderGroup = (group: Group, depth = 0) => {
    const isExpanded = expandedGroups.has(group.id)
    const hasContent = group.layers.length > 0 || (group.children?.length > 0)

    return (
      <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Group header */}
        {hasContent && (
          <button
            onClick={() => toggleGroup(group.id)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition"
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
          >
            <div className="flex items-center gap-2">
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="font-semibold text-gray-800">{group.name}</span>
              <span className="text-xs text-gray-500">({group.layers.length})</span>
            </div>
          </button>
        )}

        {/* Expanded content */}
        {isExpanded && (
          <div className="bg-white">
            {/* Child groups */}
            {group.children?.map(child => renderGroup(child, depth + 1))}
            
            {/* Layers in this group */}
            {group.layers.length > 0 && (
              <div className="p-2 space-y-2" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
                {group.layers.map(renderLayerButton)}
              </div>
            )}
          </div>
        )}
      </div>
    )
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
              <div className="space-y-3">
                {/* Loading State */}
                {isLoadingLayers && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                )}

                {/* Error State */}
                {layerError && !isLoadingLayers && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    <p>{layerError}</p>
                  </div>
                )}

                {/* Empty State */}
                {!isLoadingLayers && !layerError && allLayers.length === 0 && (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <p className="text-gray-500 text-sm">No layers available</p>
                    <p className="text-gray-400 text-xs mt-1">Contact admin to add layers</p>
                  </div>
                )}

                {/* Nested Groups */}
                {!isLoadingLayers && !layerError && allLayers.length > 0 && (
                  <div className="space-y-2">
                    {/* Root Groups */}
                    {groupedLayers.groups.map(group => renderGroup(group))}

                    {/* Ungrouped Layers */}
                    {groupedLayers.ungroupedLayers.length > 0 && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleGroup('ungrouped')}
                          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition"
                        >
                          <div className="flex items-center gap-2">
                            <svg
                              className={`w-4 h-4 text-gray-600 transition-transform ${expandedGroups.has('ungrouped') ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            <span className="font-semibold text-gray-600">Other Layers</span>
                          </div>
                        </button>
                        {expandedGroups.has('ungrouped') && (
                          <div className="p-2 space-y-2 bg-white">
                            {groupedLayers.ungroupedLayers.map(renderLayerButton)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

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

            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div className="text-sm text-gray-600 mb-4">
                  Calculate land cover statistics for a selected area.
                </div>

                {/* Layer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Layer
                  </label>
                  <select
                    value={statsLayerId || ''}
                    onChange={(e) => setStatsLayerId(parseInt(e.target.value) || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select a layer...</option>
                    {allLayers.filter(l => l.hasStats).map((layer) => (
                      <option key={layer.id} value={layer.id}>
                        {layer.group_name ? `${layer.group_name} / ` : ''}{layer.name}
                      </option>
                    ))}
                  </select>
                  {allLayers.filter(l => l.hasStats).length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No layers configured for statistics</p>
                  )}
                </div>

                {/* Stats Mode Actions */}
                {!statsMode ? (
                  <button
                    onClick={handleStartStats}
                    disabled={!statsLayerId}
                    className={`w-full py-3 rounded-lg font-medium transition ${
                      !statsLayerId
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    Start Drawing
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        Draw a polygon on the map to define your area of interest, then click Calculate.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleCalculateStats}
                        disabled={!statsPolygon || isCalculatingStats}
                        className={`flex-1 py-2 rounded-lg font-medium transition ${
                          !statsPolygon || isCalculatingStats
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {isCalculatingStats ? 'Calculating...' : 'Calculate Stats'}
                      </button>
                      <button
                        onClick={handleCancelStats}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                      >
                        Cancel
                      </button>
                    </div>

                    {statsError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                        {statsError}
                      </div>
                    )}
                  </div>
                )}

                {/* Stats Results */}
                {statsResults && (
                  <div className="mt-4 border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Results</h3>

                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Pixel Size:</span>
                          <span className="font-medium ml-1">{statsResults.pixel_size_m}m</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Area:</span>
                          <span className="font-medium ml-1">{statsResults.total_area_km2?.toLocaleString()} km²</span>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b">
                            <th className="text-left py-2 text-gray-600">Class</th>
                            <th className="text-right py-2 text-gray-600">Area (km²)</th>
                            <th className="text-right py-2 text-gray-600">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statsResults.classes?.map((cls: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="py-2 text-gray-900">{cls.class_name}</td>
                              <td className="py-2 text-right text-gray-600">{cls.area_km2?.toLocaleString()}</td>
                              <td className="py-2 text-right text-gray-600">{cls.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
