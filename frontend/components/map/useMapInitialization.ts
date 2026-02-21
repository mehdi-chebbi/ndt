import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import { FeatureGroup } from 'leaflet'

import { basemaps } from './basemaps'
import { Group, GroupedLayers, Layer, Polygon } from './types'

interface UseMapInitializationProps {
  // State values
  activeBasemap: string
  setActiveBasemap: (value: string) => void
  groupedLayers: GroupedLayers
  setGroupedLayers: (value: GroupedLayers) => void
  expandedGroups: Set<number | string>
  setExpandedGroups: (value: Set<number | string>) => void
  isLoadingLayers: boolean
  setIsLoadingLayers: (value: boolean) => void
  setLayerError: (value: string) => void
  setHasDrawnPolygon: (value: boolean) => void
  reportingMode: boolean
  reportingStep: 'draw' | 'comment'
  setReportingStep: (value: 'draw' | 'comment') => void
  setInvalidAreaPolygon: (value: Polygon | null) => void
  setClipMessage: (value: string) => void
  statsMode: boolean
  setStatsPolygon: (value: Polygon | null) => void
  activeDataLayers: string[]
  setActiveDataLayers: (value: string[]) => void
  setSelectedLayerId: (value: number | null) => void
  setCurrentPolygon: (value: Polygon | null) => void
}

interface UseMapInitializationReturn {
  mapContainerRef: React.RefObject<HTMLDivElement | null>
  handleBasemapChange: (basemapName: string) => void
  handleDataLayerToggle: (layer: Layer) => void
  clearDrawnItems: () => void
  getMapBounds: () => L.LatLngBounds | null
  viewReportOnMap: (layerName: string, polygon: Polygon) => void
}

export function useMapInitialization(props: UseMapInitializationProps): UseMapInitializationReturn {
  const {
    activeBasemap,
    setActiveBasemap,
    groupedLayers,
    setGroupedLayers,
    expandedGroups,
    setExpandedGroups,
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
    activeDataLayers,
    setActiveDataLayers,
    setSelectedLayerId,
    setCurrentPolygon,
  } = props

  // Refs
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const baseLayersRef = useRef<{ [key: string]: L.TileLayer | L.TileLayer.WMS }>({})
  const dataLayersRef = useRef<{ [key: string]: L.TileLayer }>({})
  const drawnItemsRef = useRef<FeatureGroup | null>(null)
  const reportPolygonRef = useRef<L.Polygon | null>(null)

  // Helper to collect group IDs
  const collectGroupIds = useCallback((groupList: Group[]): Set<number | string> => {
    const allGroupIds = new Set<number | string>()
    const collectIds = (groups: Group[]) => {
      groups.forEach(g => {
        allGroupIds.add(g.id)
        if (g.children?.length > 0) {
          collectIds(g.children)
        }
      })
    }
    collectIds(groupList)
    return allGroupIds
  }, [])

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
      const res = await fetch('/api/clip/layers')
      if (!res.ok) {
        throw new Error('Failed to fetch layers')
      }
      const data: GroupedLayers = await res.json()
      setGroupedLayers(data)

      // Expand all groups by default
      const allGroupIds = collectGroupIds(data.groups)
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
  }, [setIsLoadingLayers, setLayerError, setGroupedLayers, collectGroupIds, setExpandedGroups, setSelectedLayerId])

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
    if (!mapRef.current) return

    const handleDrawCreated = (event: any) => {
      if (reportingMode && reportingStep === 'draw') {
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
      }
    }

    mapRef.current.on(L.Draw.Event.CREATED, handleDrawCreated)

    return () => {
      if (mapRef.current) {
        mapRef.current.off(L.Draw.Event.CREATED, handleDrawCreated)
      }
    }
  }, [reportingMode, reportingStep, setReportingStep, setInvalidAreaPolygon, setClipMessage])

  // Handle draw created for stats mode
  useEffect(() => {
    if (!mapRef.current) return

    const handleDrawCreated = (event: any) => {
      if (statsMode) {
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
        setClipMessage('Polygon captured. Click "Calculate Stats" to proceed.')
      }
    }

    mapRef.current.on(L.Draw.Event.CREATED, handleDrawCreated)

    return () => {
      if (mapRef.current) {
        mapRef.current.off(L.Draw.Event.CREATED, handleDrawCreated)
      }
    }
  }, [statsMode, setStatsPolygon, setClipMessage])

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

  // Data layer toggle handler
  const handleDataLayerToggle = useCallback((layer: Layer) => {
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
      const newLayer = L.tileLayer.wms(layer.wmsUrl, {
        layers: layer.layerName,
        format: 'image/png',
        transparent: true,
        attribution: `GeoServer - ${layer.name}`,
        bounds: layer.bounds,
      })
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
  }, [activeDataLayers, setActiveDataLayers, setSelectedLayerId, setCurrentPolygon])

  // Clear drawn items
  const clearDrawnItems = useCallback(() => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
      setHasDrawnPolygon(false)
    }
  }, [setHasDrawnPolygon])

  // Get map bounds
  const getMapBounds = useCallback((): L.LatLngBounds | null => {
    if (mapRef.current) {
      return mapRef.current.getBounds()
    }
    return null
  }, [])

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

    // Enable the layer if not already active
    if (!activeDataLayers.includes(layerName)) {
      // Add WMS layer
      const newLayer = L.tileLayer.wms(layer.wmsUrl, {
        layers: layer.layerName,
        format: 'image/png',
        transparent: true,
        attribution: `GeoServer - ${layer.name}`,
        bounds: layer.bounds,
      })
      newLayer.addTo(mapRef.current)
      dataLayersRef.current[layerName] = newLayer
      setActiveDataLayers([...activeDataLayers, layerName])
      setSelectedLayerId(layer.id)
    }

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
  }, [groupedLayers, activeDataLayers, findLayerByName, setActiveDataLayers, setSelectedLayerId, setHasDrawnPolygon, setClipMessage])

  return {
    mapContainerRef,
    handleBasemapChange,
    handleDataLayerToggle,
    clearDrawnItems,
    getMapBounds,
    viewReportOnMap,
  }
}
