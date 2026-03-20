import { useCallback } from 'react'
import { Layer, Polygon, PolygonGeometry } from './types'
import { Country } from './useMapState'
import { api } from '@/lib/authFetch'

interface UseMapHandlersProps {
  // State setters
  setExpandedGroups: (value: Set<number | string> | ((prev: Set<number | string>) => Set<number | string>)) => void
  setClipMessage: (value: string) => void
  setCurrentPolygon: (value: Polygon | null) => void
  setReportingMode: (value: boolean) => void
  setReportingStep: (value: 'draw' | 'comment') => void
  setInvalidAreaPolygon: (value: Polygon | null) => void
  setReportComment: (value: string) => void
  setReportMessage: (value: string) => void
  setStatsMode: (value: boolean) => void
  setStatsPolygon: (value: PolygonGeometry | null) => void
  setStatsResults: (value: any) => void
  setStatsError: (value: string) => void
  setIsSubmittingReport: (value: boolean) => void
  setIsCalculatingStats: (value: boolean) => void
  reportingMode: boolean
  reportingStep: 'draw' | 'comment'
  currentPolygon: Polygon | null
  invalidAreaPolygon: Polygon | null
  reportComment: string
  selectedLayerId: number | null
  allLayers: Layer[]
  statsPolygon: PolygonGeometry | null
  statsLayerId: number | null
  statsMode: boolean
  selectedCountry: Country | null
  // Functions from useMapInitialization
  clearDrawnItems: () => void
  // Map ref access for bounds
  getMapBounds: () => L.LatLngBounds | null
}

interface UseMapHandlersReturn {
  handleToggleGroup: (groupId: number | string) => void
  handleClearDrawings: () => void
  handleStartReport: () => void
  handleSubmitReport: () => Promise<void>
  handleCancelReport: () => void
  handleStartStats: () => void
  handleCalculateStats: () => Promise<void>
  handleCancelStats: () => void
}

// We need to import L for bounds
import L from 'leaflet'

export function useMapHandlers(props: UseMapHandlersProps): UseMapHandlersReturn {
  const {
    setExpandedGroups,
    setClipMessage,
    setCurrentPolygon,
    setReportingMode,
    setReportingStep,
    setInvalidAreaPolygon,
    setReportComment,
    setReportMessage,
    setStatsMode,
    setStatsPolygon,
    setStatsResults,
    setStatsError,
    setIsSubmittingReport,
    setIsCalculatingStats,
    currentPolygon,
    invalidAreaPolygon,
    reportComment,
    selectedLayerId,
    allLayers,
    statsPolygon,
    statsLayerId,
    selectedCountry,
    clearDrawnItems,
    getMapBounds,
  } = props

  // Toggle group expansion
  const handleToggleGroup = useCallback((groupId: number | string) => {
    setExpandedGroups((prev: Set<number | string>) => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }, [setExpandedGroups])

  // Clear drawings handler
  const handleClearDrawings = useCallback(() => {
    clearDrawnItems()
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
  }, [
    clearDrawnItems,
    setClipMessage,
    setCurrentPolygon,
    setReportingMode,
    setReportingStep,
    setInvalidAreaPolygon,
    setReportComment,
    setReportMessage,
    setStatsMode,
    setStatsPolygon,
    setStatsResults,
    setStatsError,
  ])

  // Report handlers
  const handleStartReport = useCallback(() => {
    // Clear only the drawn polygons
    clearDrawnItems()

    // Set the current view bounds as the polygon for reporting
    const bounds = getMapBounds()
    if (bounds && selectedLayerId) {
      const layerConfig = allLayers.find(l => l.id === selectedLayerId)
      if (layerConfig) {
        // Create a polygon from the current view bounds
        const boundsPolygon: Polygon = {
          type: 'Polygon',
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
  }, [
    clearDrawnItems,
    getMapBounds,
    selectedLayerId,
    allLayers,
    setCurrentPolygon,
    setReportingMode,
    setReportingStep,
    setClipMessage,
  ])

  const handleSubmitReport = useCallback(async () => {
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
      const response = await api.post('/reports', {
        original_polygon: currentPolygon,
        original_layer: selectedLayer.geoserver_name,
        original_colormap: 'default',
        invalid_area_polygon: invalidAreaPolygon,
        comment: reportComment,
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
      clearDrawnItems()

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
  }, [
    currentPolygon,
    invalidAreaPolygon,
    reportComment,
    selectedLayerId,
    allLayers,
    setReportMessage,
    setIsSubmittingReport,
    setReportingMode,
    setReportingStep,
    setInvalidAreaPolygon,
    setReportComment,
    setClipMessage,
    clearDrawnItems,
  ])

  const handleCancelReport = useCallback(() => {
    setReportingMode(false)
    setReportingStep('draw')
    setInvalidAreaPolygon(null)
    setReportComment('')
    setReportMessage('')
    setClipMessage('')

    // Clear any polygons drawn during reporting
    clearDrawnItems()
  }, [
    setReportingMode,
    setReportingStep,
    setInvalidAreaPolygon,
    setReportComment,
    setReportMessage,
    setClipMessage,
    clearDrawnItems,
  ])

  // Stats handlers
  const handleStartStats = useCallback(() => {
    clearDrawnItems()
    setStatsMode(true)
    if (!selectedCountry) {
      setStatsPolygon(null)  // Only clear if no country is loaded
    }
    setStatsResults(null)
    setStatsError('')
    setClipMessage(
      selectedCountry
        ? '✓ Country boundary ready. Click Calculate Stats or draw to override.'
        : 'Select a layer and draw a polygon to calculate statistics'
    )
  }, [
    clearDrawnItems,
    setStatsMode,
    setStatsPolygon,
    setStatsResults,
    setStatsError,
    setClipMessage,
    selectedCountry,
  ])

  const handleCalculateStats = useCallback(async () => {
    if (!statsPolygon || !statsLayerId) {
      setStatsError('Please select a layer and draw a polygon')
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
      const response = await api.post('/layers/stats', {
        layer_name: layerConfig.geoserver_name,
        polygon: statsPolygon,
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
  }, [
    statsPolygon,
    statsLayerId,
    allLayers,
    setStatsError,
    setIsCalculatingStats,
    setStatsResults,
    setClipMessage,
  ])

  const handleCancelStats = useCallback(() => {
    setStatsMode(false)
    setStatsPolygon(null)
    setStatsResults(null)
    setStatsError('')
    setClipMessage('')

    clearDrawnItems()
  }, [
    setStatsMode,
    setStatsPolygon,
    setStatsResults,
    setStatsError,
    setClipMessage,
    clearDrawnItems,
  ])

  return {
    handleToggleGroup,
    handleClearDrawings,
    handleStartReport,
    handleSubmitReport,
    handleCancelReport,
    handleStartStats,
    handleCalculateStats,
    handleCancelStats,
  }
}
