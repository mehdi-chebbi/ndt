import { useCallback } from 'react'
import { Layer, Polygon, PolygonGeometry } from './types'
import { Country } from './useMapState'
import { api } from '@/lib/authFetch'

// Helper function to calculate polygon area in km² using spherical calculation
function calculatePolygonAreaKm2(polygon: Polygon | PolygonGeometry): number {
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
  setStatsPolygonArea: (value: number) => void
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
  // AI Analysis state
  aiAnalysisMode: boolean
  aiAnalysisPolygon: PolygonGeometry | null
  aiAnalysisArea: number
  aiAnalysisLayerId: number | null
  setAiAnalysisMode: (value: boolean) => void
  setAiAnalysisPolygon: (value: PolygonGeometry | null) => void
  setAiAnalysisArea: (value: number) => void
  setAiAnalysisLayerId: (value: number | null) => void
  setIsComputingStatsForAI: (value: boolean) => void
  setAiAnalysisError: (value: string) => void
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
  handleFetchCountryStats: (countryFile: string) => Promise<void>
  handleStartAIAnalysis: () => void
  handleAnalyzeArea: () => Promise<void>
  handleCancelAIAnalysis: () => void
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
    setStatsPolygonArea,
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
    // AI Analysis props
    aiAnalysisMode,
    aiAnalysisPolygon,
    aiAnalysisArea,
    aiAnalysisLayerId,
    setAiAnalysisMode,
    setAiAnalysisPolygon,
    setAiAnalysisArea,
    setAiAnalysisLayerId,
    setIsComputingStatsForAI,
    setAiAnalysisError,
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
    setStatsPolygonArea(0)
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
    setStatsPolygonArea,
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
    // Always clear the stats polygon when starting stats mode
    // User must manually draw a polygon for stats calculations
    setStatsPolygon(null)
    setStatsPolygonArea(0)
    setStatsResults(null)
    setStatsError('')
    setClipMessage('Draw a polygon on the map to calculate statistics')
  }, [
    clearDrawnItems,
    setStatsMode,
    setStatsPolygon,
    setStatsPolygonArea,
    setStatsResults,
    setStatsError,
    setClipMessage,
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
    setStatsPolygonArea(0)
    setStatsResults(null)
    setStatsError('')
    setClipMessage('')

    clearDrawnItems()
  }, [
    setStatsMode,
    setStatsPolygon,
    setStatsPolygonArea,
    setStatsResults,
    setStatsError,
    setClipMessage,
    clearDrawnItems,
  ])

  // AI Analysis handlers
  const handleStartAIAnalysis = useCallback(() => {
    clearDrawnItems()
    setAiAnalysisMode(true)
    setAiAnalysisPolygon(null)
    setAiAnalysisArea(0)
    setAiAnalysisError('')
    setClipMessage('Draw a polygon on the map to analyze with AI')

    // Auto-select the active layer if there's exactly one
    if (selectedLayerId) {
      setAiAnalysisLayerId(selectedLayerId)
    }
  }, [
    clearDrawnItems,
    setAiAnalysisMode,
    setAiAnalysisPolygon,
    setAiAnalysisArea,
    setAiAnalysisError,
    setClipMessage,
    selectedLayerId,
    setAiAnalysisLayerId,
  ])

  const handleAnalyzeArea = useCallback(async () => {
    if (!aiAnalysisPolygon || !aiAnalysisLayerId) {
      setAiAnalysisError('Please select a layer and draw a polygon')
      return
    }

    const layerConfig = allLayers.find(l => l.id === aiAnalysisLayerId)
    if (!layerConfig) {
      setAiAnalysisError('Layer not found')
      return
    }

    if (!layerConfig.hasStats) {
      setAiAnalysisError('This layer is not configured for AI analysis. Please contact an admin.')
      return
    }

    setIsComputingStatsForAI(true)
    setAiAnalysisError('')

    // Open AI Copilot immediately with analyzing state
    sessionStorage.setItem('aiAnalysisState', 'analyzing')
    window.dispatchEvent(new CustomEvent('open-ai-copilot'))

    try {
      const response = await api.post('/ai/analyze-area', {
        layer_name: layerConfig.geoserver_name,
        polygon: aiAnalysisPolygon,
      })

      if (!response.ok) {
        throw new Error('Failed to analyze area')
      }

      // Read the SSE stream
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let stats: any = null
      let sessionId: number | null = null
      let accumulatedContent = ''

      // Process stream
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6))

              if (parsed.type === 'stats') {
                // Received stats - update UI
                stats = parsed.stats
                sessionId = parsed.sessionId
                window.dispatchEvent(new CustomEvent('ai-analysis-stats', {
                  detail: { stats, layerName: parsed.layerName || layerConfig.name }
                }))
              } else if (parsed.type === 'content') {
                // Streaming AI content - forward to AICopilot
                accumulatedContent += parsed.content
                window.dispatchEvent(new CustomEvent('ai-analysis-stream', {
                  detail: { content: parsed.content }
                }))
              } else if (parsed.type === 'complete') {
                // Analysis complete
                sessionId = sessionId || parsed.sessionId
                sessionStorage.setItem('aiAnalysisResult', JSON.stringify({
                  sessionId: sessionId,
                  stats,
                  aiResponse: parsed.finalContent,
                  layerName: layerConfig.name,
                  polygon: aiAnalysisPolygon,
                }))
                window.dispatchEvent(new CustomEvent('ai-analysis-complete'))
              } else if (parsed.type === 'error') {
                throw new Error(parsed.error || parsed.details || 'Analysis failed')
              }
            } catch (e) {
              console.error('Parse error:', e)
            }
          }
        }
      }

    } catch (err: any) {
      setAiAnalysisError(err.message)
      sessionStorage.setItem('aiAnalysisError', err.message)
      window.dispatchEvent(new CustomEvent('ai-analysis-error'))
    } finally {
      setIsComputingStatsForAI(false)
    }
  }, [
    aiAnalysisPolygon,
    aiAnalysisLayerId,
    allLayers,
    setAiAnalysisError,
    setIsComputingStatsForAI,
    setClipMessage,
  ])

  const handleCancelAIAnalysis = useCallback(() => {
    setAiAnalysisMode(false)
    setAiAnalysisPolygon(null)
    setAiAnalysisArea(0)
    setAiAnalysisError('')
    setClipMessage('')

    clearDrawnItems()
  }, [
    setAiAnalysisMode,
    setAiAnalysisPolygon,
    setAiAnalysisArea,
    setAiAnalysisError,
    setClipMessage,
    clearDrawnItems,
  ])

  // Fetch pre-calculated country stats
  const handleFetchCountryStats = useCallback(async (countryFile: string) => {
    if (!statsLayerId) {
      setStatsError('Please select a layer first')
      return
    }

    const layerConfig = allLayers.find(l => l.id === statsLayerId)
    if (!layerConfig) {
      setStatsError('Layer not found')
      return
    }

    setIsCalculatingStats(true)
    setStatsError('')
    setStatsResults(null)

    try {
      const response = await api.get(`/stats/country/${countryFile}/layer/${statsLayerId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Stats not available for this country')
      }

      setStatsResults({
        layer_name: layerConfig.geoserver_name,
        total_area_km2: data.total_area_km2,
        pixel_size_m: data.pixel_size_m,
        classes: data.classes,
      })
    } catch (err: any) {
      setStatsError(err.message)
    } finally {
      setIsCalculatingStats(false)
    }
  }, [statsLayerId, allLayers, setStatsError, setIsCalculatingStats, setStatsResults])

  return {
    handleToggleGroup,
    handleClearDrawings,
    handleStartReport,
    handleSubmitReport,
    handleCancelReport,
    handleStartStats,
    handleCalculateStats,
    handleCancelStats,
    handleFetchCountryStats,
    handleStartAIAnalysis,
    handleAnalyzeArea,
    handleCancelAIAnalysis,
  }
}
