import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-side-by-side'
import { FeatureGroup } from 'leaflet'
import leafletImage from 'leaflet-image'

import { basemaps } from './basemaps'
import { Group, GroupedLayers, Layer, Polygon, PolygonGeometry } from './types'
import { Country } from './useMapState'
import { authFetch } from '@/lib/authFetch'

// Helper function to calculate polygon area in km² using spherical calculation
function calculatePolygonAreaKm2(polygon: Polygon): number {
  if (!polygon || !polygon.coordinates || !polygon.coordinates[0]) {
    return 0
  }

  const coords = polygon.coordinates[0]
  const R = 6371 // Earth's radius in km
  let area = 0

  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length
    const [lon1, lat1] = coords[i] as [number, number]
    const [lon2, lat2] = coords[j] as [number, number]

    const phi1 = lat1 * Math.PI / 180
    const phi2 = lat2 * Math.PI / 180
    const deltaLambda = (lon2 - lon1) * Math.PI / 180

    area += deltaLambda * (2 + Math.sin(phi1) + Math.sin(phi2))
  }

  return Math.abs(area * R * R / 2.0)
}

interface UseMapInitializationProps {
  // State values
  activeBasemap: string
  setActiveBasemap: (value: string) => void
  groupedLayers: GroupedLayers
  setGroupedLayers: (value: GroupedLayers) => void
  setIsLoadingLayers: (value: boolean) => void
  setLayerError: (value: string) => void
  setHasDrawnPolygon: (value: boolean) => void
  reportingMode: boolean
  reportingStep: 'draw' | 'comment'
  setReportingStep: (value: 'draw' | 'comment') => void
  setInvalidAreaPolygon: (value: Polygon | null) => void
  setClipMessage: (value: string) => void
  statsMode: boolean
  setStatsPolygon: (value: PolygonGeometry | null) => void
  setStatsPolygonArea: (value: number) => void
  activeDataLayers: string[]
  setActiveDataLayers: (value: string[]) => void
  setSelectedLayerId: (value: number | null) => void
  setCurrentPolygon: (value: Polygon | null) => void
  // Country polygon state
  selectedCountry: Country | null
  setSelectedCountry: (value: Country | null) => void
}

interface UseMapInitializationReturn {
  mapContainerRef: React.RefObject<HTMLDivElement | null>
  handleBasemapChange: (basemapName: string) => void
  handleDataLayerToggle: (layer: Layer) => void
  clearDrawnItems: () => void
  clearCountryPolygon: () => void
  getMapBounds: () => L.LatLngBounds | null
  viewReportOnMap: (layerName: string, polygon: Polygon) => void
  loadCountryPolygon: (country: Country) => Promise<void>
  handleExport: (setIsExporting: (value: boolean) => void) => void
  handleStartCompare: (leftLayer: Layer, rightLayer: Layer, shouldZoom?: boolean) => void
  handleExitCompare: () => void
}

export function useMapInitialization(props: UseMapInitializationProps): UseMapInitializationReturn {
  const {
    activeBasemap,
    setActiveBasemap,
    groupedLayers,
    setGroupedLayers,
    setIsLoadingLayers,
    setLayerError,
    setHasDrawnPolygon,
    reportingMode,
    reportingStep,
    setReportingStep,
    setInvalidAreaPolygon,
    setClipMessage,
    statsMode,
    setStatsPolygon,
    setStatsPolygonArea,
    activeDataLayers,
    setActiveDataLayers,
    setSelectedLayerId,
    setCurrentPolygon,
    selectedCountry,
    setSelectedCountry,
  } = props

  // Refs
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const baseLayersRef = useRef<{ [key: string]: L.TileLayer | L.TileLayer.WMS }>({})
  const dataLayersRef = useRef<{ [key: string]: L.TileLayer }>({})
  const drawnItemsRef = useRef<FeatureGroup | null>(null)
  const reportPolygonRef = useRef<L.Polygon | null>(null)
  const drawControlRef = useRef<L.Control.Draw | null>(null)
  const countryPolygonRef = useRef<L.GeoJSON | null>(null)
  const compareControlRef = useRef<L.Control.SideBySide | null>(null)
  const compareLeftLayerRef = useRef<L.TileLayer.WMS | null>(null)
  const compareRightLayerRef = useRef<L.TileLayer.WMS | null>(null)

  // Helper to find layer by geoserver_name
  const findLayerByName = useCallback((name: string, groups: Group[], ungroupedLayers: Layer[]): Layer | null => {
    // Search in groups
    const searchInGroups = (groupList: Group[]): Layer | null => {
      for (const group of groupList) {
        const found = group.layers.find(l => l.geoserver_name === name)
        if (found) return found
        if (group.children?.length > 0) {
          const childFound = searchInGroups(group.children)
          if (childFound) return childFound
        }
      }
      return null
    }

    const groupResult = searchInGroups(groups)
    if (groupResult) return groupResult

    // Search in ungrouped layers
    return ungroupedLayers.find(l => l.geoserver_name === name) || null
  }, [])

  // Fetch layers
  const fetchLayers = useCallback(async () => {
    setIsLoadingLayers(true)
    setLayerError('')
    try {
      const res = await authFetch('/clip/layers', { skipAuth: true })
      if (!res.ok) {
        throw new Error('Failed to fetch layers')
      }
      const data: GroupedLayers = await res.json()
      setGroupedLayers(data)

      // Groups are collapsed by default (empty Set)

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
  }, [setIsLoadingLayers, setLayerError, setGroupedLayers, setSelectedLayerId])

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Fix for default marker icon in Next.js
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })

    // Initialize map centered on Africa
    const map = L.map(mapContainerRef.current, {
      center: [0, 20],
      zoom: 3,
      zoomControl: false,
      preferCanvas: true, // required for polygons to appear in export
    })

    // Add default basemap (OpenStreetMap)
    const defaultBasemap = basemaps['OpenStreetMap']
    defaultBasemap.addTo(map)
    baseLayersRef.current['OpenStreetMap'] = defaultBasemap

    // Create drawn items feature group
    const drawnItems = new FeatureGroup()
    map.addLayer(drawnItems)
    drawnItemsRef.current = drawnItems

    // Initialize draw control (but don't add it yet - only show when needed)
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
    // Store reference but don't add to map yet
    drawControlRef.current = drawControl

    // Add zoom control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapRef.current = map

    // Fetch layers after map is initialized
    fetchLayers()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [fetchLayers])

  // Handle draw created for basic polygon tracking
  useEffect(() => {
    if (!mapRef.current) return

    const handleDrawCreated = (event: any) => {
      const layer = event.layer
      if (drawnItemsRef.current) {
        // Clear existing polygons before adding new one (only keep one at a time)
        drawnItemsRef.current.clearLayers()
        drawnItemsRef.current.addLayer(layer)
      }
      setHasDrawnPolygon(true)
    }

    const handleDrawDeleted = () => {
      if (drawnItemsRef.current) {
        const layers = drawnItemsRef.current.getLayers()
        setHasDrawnPolygon(layers.length > 0)
      }
    }

    mapRef.current.on(L.Draw.Event.CREATED, handleDrawCreated)
    mapRef.current.on(L.Draw.Event.DELETED, handleDrawDeleted)

    return () => {
      if (mapRef.current) {
        mapRef.current.off(L.Draw.Event.CREATED, handleDrawCreated)
        mapRef.current.off(L.Draw.Event.DELETED, handleDrawDeleted)
      }
    }
  }, [setHasDrawnPolygon])

  // Handle draw created for reporting mode
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const handleDrawCreated = (event: any) => {
      if (reportingMode && reportingStep === 'draw') {
        // Clear country polygon (single active polygon rule)
        if (countryPolygonRef.current) {
          map.removeLayer(countryPolygonRef.current)
          countryPolygonRef.current = null
          setSelectedCountry(null)
        }

        const layer = event.layer
        const drawnLayer = layer as L.Polygon
        const latlngs = drawnLayer.getLatLngs()[0] as L.LatLng[]
        const coordinates = latlngs.map((latlng) => [latlng.lng, latlng.lat])
        const closedCoordinates = [...coordinates, coordinates[0]]
        const polygon: Polygon = {
          type: 'Polygon',
          coordinates: [closedCoordinates],
        }
        setInvalidAreaPolygon(polygon)
        setReportingStep('comment')
        setClipMessage('Please provide a comment about the invalid data')

        // Dispatch tutorial event for step advancement
        window.dispatchEvent(new CustomEvent('tutorial-draw-complete'))
      }
    }

    map.on(L.Draw.Event.CREATED, handleDrawCreated)

    return () => {
      map.off(L.Draw.Event.CREATED, handleDrawCreated)
    }
  }, [reportingMode, reportingStep, setReportingStep, setInvalidAreaPolygon, setClipMessage, setSelectedCountry])

  // Handle draw created for stats mode
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const handleDrawCreated = (event: any) => {
      if (statsMode) {
        // Clear country polygon (single active polygon rule)
        if (countryPolygonRef.current) {
          map.removeLayer(countryPolygonRef.current)
          countryPolygonRef.current = null
          setSelectedCountry(null)
        }

        const layer = event.layer
        const drawnLayer = layer as L.Polygon
        const latlngs = drawnLayer.getLatLngs()[0] as L.LatLng[]
        const coordinates = latlngs.map((latlng) => [latlng.lng, latlng.lat])
        const closedCoordinates = [...coordinates, coordinates[0]]
        const polygon: Polygon = {
          type: 'Polygon',
          coordinates: [closedCoordinates],
        }
        setStatsPolygon(polygon)

        // Calculate area and store it
        const areaKm2 = calculatePolygonAreaKm2(polygon)
        setStatsPolygonArea(areaKm2)

        // Show appropriate message based on area size
        const MAX_AREA_KM2 = 200_000
        if (areaKm2 > MAX_AREA_KM2) {
          setClipMessage(
            `✓ Polygon captured (${areaKm2.toLocaleString()} km²). Area too large - maximum is ${MAX_AREA_KM2.toLocaleString()} km². Please draw a smaller area.`
          )
        } else {
          setClipMessage(
            `✓ Polygon captured (${areaKm2.toLocaleString()} km²). Click "Calculate Stats" to proceed.`
          )
        }

        // Dispatch tutorial event for step advancement
        window.dispatchEvent(new CustomEvent('tutorial-draw-complete'))
      }
    }

    map.on(L.Draw.Event.CREATED, handleDrawCreated)

    return () => {
      map.off(L.Draw.Event.CREATED, handleDrawCreated)
    }
  }, [statsMode, setStatsPolygon, setStatsPolygonArea, setClipMessage, setSelectedCountry])

  // Show/hide draw control based on reporting mode or stats mode
  useEffect(() => {
    if (!mapRef.current || !drawControlRef.current) return

    const shouldShowDrawControl = reportingMode || statsMode
    const map = mapRef.current
    const drawControl = drawControlRef.current

    if (shouldShowDrawControl) {
      // Add draw control to map
      map.addControl(drawControl)
      // Set data-tutorial attribute on the Leaflet draw toolbar (programmatic)
      const drawToolbar = document.querySelector('.leaflet-draw-toolbar') as HTMLElement | null
      if (drawToolbar) drawToolbar.setAttribute('data-tutorial', 'draw-control')
    } else {
      // Remove draw control from map
      try {
        map.removeControl(drawControl)
      } catch (e) {
        // Control might not be on map, ignore error
      }
    }

    return () => {
      // Cleanup: remove control if it's on the map
      try {
        map.removeControl(drawControl)
      } catch (e) {
        // Ignore if not on map
      }
    }
  }, [reportingMode, statsMode])

  // Basemap change handler
  const handleBasemapChange = useCallback((basemapName: string) => {
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
  }, [activeBasemap, setActiveBasemap])

  // Data layer toggle handler (radio behavior - only one active at a time)
  const handleDataLayerToggle = useCallback((layer: Layer) => {
    if (!mapRef.current) return

    const layerKey = layer.geoserver_name

    if (activeDataLayers.includes(layerKey)) {
      // Remove layer (deselect)
      if (dataLayersRef.current[layerKey]) {
        mapRef.current.removeLayer(dataLayersRef.current[layerKey] as L.Layer)
        delete dataLayersRef.current[layerKey]
      }
      setActiveDataLayers([])
      setSelectedLayerId(null)
    } else {
      // Remove all existing layers first (radio behavior)
      activeDataLayers.forEach(activeKey => {
        if (dataLayersRef.current[activeKey]) {
          mapRef.current!.removeLayer(dataLayersRef.current[activeKey] as L.Layer)
          delete dataLayersRef.current[activeKey]
        }
      })

      // Add new WMS layer
      const newLayer = L.tileLayer.wms(layer.wmsUrl, {
        layers: layer.layerName,
        format: 'image/png',
        transparent: true,
        attribution: `GeoServer - ${layer.name}`,
        bounds: layer.bounds,
        crossOrigin: 'anonymous',
      })
      newLayer.addTo(mapRef.current)
      dataLayersRef.current[layerKey] = newLayer

      // Don't auto-zoom - preserve user's current view
      // if (layer.bounds) {
      //   mapRef.current.fitBounds(layer.bounds)
      // }

      setActiveDataLayers([layerKey])
      setSelectedLayerId(layer.id)
      setCurrentPolygon(null)
    }
  }, [activeDataLayers, setActiveDataLayers, setSelectedLayerId, setCurrentPolygon])

  // Clear drawn items
  const clearDrawnItems = useCallback(() => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
      setHasDrawnPolygon(false)
    }
  }, [setHasDrawnPolygon])

  // Clear country polygon
  const clearCountryPolygon = useCallback(() => {
    if (countryPolygonRef.current && mapRef.current) {
      mapRef.current.removeLayer(countryPolygonRef.current)
      countryPolygonRef.current = null
    }
    setSelectedCountry(null)
  }, [setSelectedCountry])

  // Get map bounds
  const getMapBounds = useCallback((): L.LatLngBounds | null => {
    if (mapRef.current) {
      return mapRef.current.getBounds()
    }
    return null
  }, [])

  // Load country polygon from GeoJSON
  const loadCountryPolygon = useCallback(async (country: Country) => {
    if (!mapRef.current) return

    try {
      // Fetch GeoJSON file - Next.js rewrites will proxy to backend
      const res = await fetch(`/geojson/${country.file}`)
      if (!res.ok) throw new Error('Failed to fetch country GeoJSON')
      const geojson = await res.json()

      // Clear existing country polygon
      if (countryPolygonRef.current) {
        mapRef.current.removeLayer(countryPolygonRef.current)
      }

      // Clear drawn items (single active polygon rule)
      if (drawnItemsRef.current) {
        drawnItemsRef.current.clearLayers()
        setHasDrawnPolygon(false)
      }

      // Clear report polygon if exists
      if (reportPolygonRef.current) {
        mapRef.current.removeLayer(reportPolygonRef.current)
        reportPolygonRef.current = null
      }

      // Add country polygon with border-only styling
      const countryLayer = L.geoJSON(geojson, {
        style: {
          color: '#3388ff',      // Blue border
          weight: 2,
          fill: false,           // No fill
        }
      })

      countryLayer.addTo(mapRef.current)
      countryPolygonRef.current = countryLayer
      setSelectedCountry(country)

      // Zoom to country bounds
      const bounds = countryLayer.getBounds()
      mapRef.current.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 10,
      })
    } catch (error) {
      console.error('Failed to load country polygon:', error)
      setClipMessage(`Failed to load ${country.name}`)
    }
  }, [setHasDrawnPolygon, setSelectedCountry, setClipMessage])

  // View report on map - enable layer, draw polygon, zoom to it
  const viewReportOnMap = useCallback((layerName: string, polygon: Polygon) => {
    if (!mapRef.current) return

    // Find the layer
    const layer = findLayerByName(layerName, groupedLayers.groups, groupedLayers.ungroupedLayers)
    
    if (!layer) {
      console.warn(`Layer ${layerName} not found`)
      setClipMessage(`Warning: Layer "${layerName}" not found in available layers`)
      return
    }

    // Remove all existing layers first (radio behavior)
    activeDataLayers.forEach(activeKey => {
      if (dataLayersRef.current[activeKey]) {
        mapRef.current!.removeLayer(dataLayersRef.current[activeKey] as L.Layer)
        delete dataLayersRef.current[activeKey]
      }
    })

    // Clear country polygon (single active polygon rule)
    if (countryPolygonRef.current) {
      mapRef.current.removeLayer(countryPolygonRef.current)
      countryPolygonRef.current = null
      setSelectedCountry(null)
    }

    // Add WMS layer
    const newLayer = L.tileLayer.wms(layer.wmsUrl, {
      layers: layer.layerName,
      format: 'image/png',
      transparent: true,
      attribution: `GeoServer - ${layer.name}`,
      bounds: layer.bounds,
      crossOrigin: 'anonymous',
    })
    newLayer.addTo(mapRef.current)
    dataLayersRef.current[layerName] = newLayer
    setActiveDataLayers([layerName])
    setSelectedLayerId(layer.id)

    // Remove previous report polygon if exists
    if (reportPolygonRef.current) {
      mapRef.current.removeLayer(reportPolygonRef.current)
    }

    // Convert GeoJSON polygon coordinates to Leaflet LatLng array
    // GeoJSON: [longitude, latitude], Leaflet: [latitude, longitude]
    const coordinates = polygon.coordinates[0]
    const latLngs: L.LatLng[] = coordinates.map(coord => 
      L.latLng(coord[1], coord[0])
    )

    // Create polygon with red styling for invalid area
    const reportPolygon = L.polygon(latLngs, {
      color: '#dc2626',        // Red border
      fillColor: '#dc2626',     // Red fill
      fillOpacity: 0.3,         // Semi-transparent
      weight: 3,
      dashArray: '10, 5',       // Dashed border
    })

    reportPolygon.addTo(mapRef.current)
    reportPolygonRef.current = reportPolygon

    // Zoom to the polygon bounds
    mapRef.current.fitBounds(reportPolygon.getBounds(), {
      padding: [50, 50],
      maxZoom: 16,
    })

    setHasDrawnPolygon(true)
    setClipMessage(`Viewing report for layer: ${layer.name}`)
  }, [groupedLayers, activeDataLayers, findLayerByName, setActiveDataLayers, setSelectedLayerId, setHasDrawnPolygon, setClipMessage, setSelectedCountry])

  // Export map as JPEG
  const handleExport = useCallback((setIsExporting: (value: boolean) => void) => {
    if (!mapRef.current) return
    setIsExporting(true)

    leafletImage(mapRef.current, (err, canvas) => {
      if (err) {
        console.error('Export failed:', err)
        setIsExporting(false)
        return
      }
      const link = document.createElement('a')
      link.download = 'map-export.jpg'
      link.href = canvas.toDataURL('image/jpeg', 0.92) // 0.92 = high quality, smaller file
      link.click()
      setIsExporting(false)
    })
  }, [])

  // Start compare mode with two layers side by side
  const handleStartCompare = useCallback((leftLayer: Layer, rightLayer: Layer, shouldZoom = true) => {
    if (!mapRef.current) return

    // Remove any existing compare layers
    if (compareLeftLayerRef.current) mapRef.current.removeLayer(compareLeftLayerRef.current)
    if (compareRightLayerRef.current) mapRef.current.removeLayer(compareRightLayerRef.current)
    if (compareControlRef.current) compareControlRef.current.remove()

    // Remove all active data layers (radio behavior)
    activeDataLayers.forEach(activeKey => {
      if (dataLayersRef.current[activeKey]) {
        mapRef.current!.removeLayer(dataLayersRef.current[activeKey] as L.Layer)
        delete dataLayersRef.current[activeKey]
      }
    })
    setActiveDataLayers([])

    // Create two WMS layers
    const leftWMSLayer = L.tileLayer.wms(leftLayer.wmsUrl, {
      layers: leftLayer.layerName,
      format: 'image/png',
      transparent: true,
      crossOrigin: 'anonymous',
      attribution: leftLayer.name,
    }).addTo(mapRef.current)

    const rightWMSLayer = L.tileLayer.wms(rightLayer.wmsUrl, {
      layers: rightLayer.layerName,
      format: 'image/png',
      transparent: true,
      crossOrigin: 'anonymous',
      attribution: rightLayer.name,
    }).addTo(mapRef.current)

    compareLeftLayerRef.current = leftWMSLayer
    compareRightLayerRef.current = rightWMSLayer

    // Create the side-by-side control
    compareControlRef.current = L.control.sideBySide(leftWMSLayer, rightWMSLayer).addTo(mapRef.current)

    // Set data-tutorial attribute on the compare slider (programmatic)
    const slider = document.querySelector('.leaflet-sbs-range') as HTMLElement | null
    if (slider) {
      slider.setAttribute('data-tutorial', 'compare-slider')
      // Dispatch tutorial event when the slider is moved
      slider.addEventListener('input', () => {
        window.dispatchEvent(new CustomEvent('tutorial-slide-complete'))
      }, { once: true })
    }

    // Only zoom to bounds on initial compare (when shouldZoom is true)
    if (shouldZoom && leftLayer.bounds) {
      mapRef.current.fitBounds(leftLayer.bounds)
    }
  }, [activeDataLayers, setActiveDataLayers])

  // Exit compare mode
  const handleExitCompare = useCallback(() => {
    if (!mapRef.current) return
    if (compareControlRef.current) {
      compareControlRef.current.remove()
      compareControlRef.current = null
    }
    if (compareLeftLayerRef.current) {
      mapRef.current.removeLayer(compareLeftLayerRef.current)
      compareLeftLayerRef.current = null
    }
    if (compareRightLayerRef.current) {
      mapRef.current.removeLayer(compareRightLayerRef.current)
      compareRightLayerRef.current = null
    }
  }, [])

  return {
    mapContainerRef,
    handleBasemapChange,
    handleDataLayerToggle,
    clearDrawnItems,
    clearCountryPolygon,
    getMapBounds,
    viewReportOnMap,
    loadCountryPolygon,
    handleExport,
    handleStartCompare,
    handleExitCompare,
  }
}
