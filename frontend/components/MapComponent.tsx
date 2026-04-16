'use client'

import { useEffect, useMemo, useCallback, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { useRouter } from 'next/navigation'

// Import tab components
import BasemapsTab from './map/BasemapsTab'
import DataTab from './map/DataTab'
import StatsTab from './map/StatsTab'
import ReportingOverlay from './map/ReportingOverlay'
import Legend from './map/Legend'
import CompareLegend from './map/CompareLegend'
import CountrySelector from './map/CountrySelector'

// Import types
import { Group, LegendItem, Layer } from './map/types'
import { Country } from './map/useMapState'

// Import tutorial components
import TutorialButton from './tutorial/TutorialButton'

// Import hooks
import { useMapState, flattenLayers } from './map/useMapState'
import { useMapInitialization } from './map/useMapInitialization'
import { useMapHandlers } from './map/useMapHandlers'
import { api } from '@/lib/authFetch'

interface ReportToView {
  id: number
  original_layer: string
  original_colormap: string
  invalid_area_polygon: any
  comment: string
  status: string
}

export interface TutorialCallbacks {
  switchTab: (tab: 'basemaps' | 'data' | 'stats') => void
  activateRandomLayer: () => void
  cleanup: () => void
}

interface MapComponentProps {
  reportToView?: ReportToView | null
  tutorialCompleted?: boolean
  onStartTutorial?: () => void
}

// Helper: Find a group by ID in the tree
function findGroupById(groups: Group[], id: number): Group | null {
  for (const group of groups) {
    if (group.id === id) return group
    if (group.children.length > 0) {
      const found = findGroupById(group.children, id)
      if (found) return found
    }
  }
  return null
}

// Helper: Flatten groups with their layers for easy selection (including nested groups)
interface GroupWithLayers {
  id: number | string
  name: string
  path: string // Full path like "Parent → Child"
  layers: Layer[]
}

function flattenGroupsWithLayers(groups: Group[], ungroupedLayers: Layer[]): GroupWithLayers[] {
  const result: GroupWithLayers[] = []
  
  const flatten = (groupList: Group[], parentPath = '') => {
    for (const group of groupList) {
      const currentPath = parentPath ? `${parentPath} → ${group.name}` : group.name
      
      result.push({
        id: group.id,
        name: group.name,
        path: currentPath,
        layers: group.layers,
      })
      
      // Process children recursively
      if (group.children?.length > 0) {
        flatten(group.children, currentPath)
      }
    }
  }
  
  flatten(groups)
  
  // Add "Other Layers" for ungrouped layers
  if (ungroupedLayers.length > 0) {
    result.push({
      id: 'ungrouped',
      name: 'Other Layers',
      path: 'Other Layers',
      layers: ungroupedLayers,
    })
  }
  
  return result
}

// Helper: Find inherited legend by traversing parent chain
function findInheritedLegend(
  groupId: number,
  groups: Group[]
): LegendItem[] | null {
  const group = findGroupById(groups, groupId)
  if (!group) return null

  // If this group has a legend, use it
  if (group.legend && group.legend.length > 0) {
    return group.legend
  }

  // If no legend and has parent, check parent
  if (group.parent_id) {
    return findInheritedLegend(group.parent_id, groups)
  }

  // No legend and no parent = no legend to show
  return null
}

const MapComponent = forwardRef<TutorialCallbacks, MapComponentProps>(({
  reportToView,
  tutorialCompleted,
  onStartTutorial,
}, ref) => {
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [tiffDownloadUrl, setTiffDownloadUrl] = useState<string | null>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Close export menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu])

  // Get all state from custom hook
  const state = useMapState()

  // Compare mode state
  const [isCompareMode, setIsCompareMode] = useState(false)
  const [showComparePicker, setShowComparePicker] = useState(false)
  const [leftGroupId, setLeftGroupId] = useState<number | string | null>(null)
  const [leftLayerId, setLeftLayerId] = useState<string>('')
  const [rightGroupId, setRightGroupId] = useState<number | string | null>(null)
  const [rightLayerId, setRightLayerId] = useState<string>('')
  const [sidebarWasOpen, setSidebarWasOpen] = useState(true)

  // Layer change modal state
  const [showLayerChangeModal, setShowLayerChangeModal] = useState(false)
  const [editingSide, setEditingSide] = useState<'left' | 'right' | null>(null)
  const [tempGroupId, setTempGroupId] = useState<number | string | null>(null)
  const [tempLayerId, setTempLayerId] = useState<string>('')

  // Get all groups with their layers for compare picker
  const allGroupsWithLayers = useMemo(() => {
    return flattenGroupsWithLayers(state.groupedLayers.groups, state.groupedLayers.ungroupedLayers)
  }, [state.groupedLayers])

  // Get all layers flattened
  const allLayers = [
    ...flattenLayers(state.groupedLayers.groups),
    ...state.groupedLayers.ungroupedLayers
  ]

  // Find the active layer and its inherited legend
  const { activeLayerLegend, activeLayerName } = useMemo(() => {
    if (state.activeDataLayers.length === 0) {
      return { activeLayerLegend: null, activeLayerName: null }
    }

    const activeLayer = allLayers.find(l => l.geoserver_name === state.activeDataLayers[0])
    if (!activeLayer) {
      return { activeLayerLegend: null, activeLayerName: null }
    }

    // Use layer-specific legend if available, otherwise fall back to group legend
    const legend = activeLayer.legend && activeLayer.legend.length > 0
      ? activeLayer.legend
      : (activeLayer.group_id
          ? findInheritedLegend(activeLayer.group_id, state.groupedLayers.groups)
          : null)

    return {
      activeLayerLegend: legend,
      activeLayerName: activeLayer.name
    }
  }, [state.activeDataLayers, allLayers, state.groupedLayers.groups])

  // Find left and right layer legends for compare mode
  const { leftLayerLegend, leftLayerName, rightLayerLegend, rightLayerName } = useMemo(() => {
    if (!leftLayerId || !rightLayerId) {
      return {
        leftLayerLegend: null,
        leftLayerName: null,
        rightLayerLegend: null,
        rightLayerName: null
      }
    }

    const leftLayer = allLayers.find(l => l.geoserver_name === leftLayerId)
    const rightLayer = allLayers.find(l => l.geoserver_name === rightLayerId)

    // Use layer-specific legend if available, otherwise fall back to group legend
    const leftLegend = leftLayer?.legend && leftLayer.legend.length > 0
      ? leftLayer.legend
      : (leftLayer?.group_id
          ? findInheritedLegend(leftLayer.group_id, state.groupedLayers.groups)
          : null)

    const rightLegend = rightLayer?.legend && rightLayer.legend.length > 0
      ? rightLayer.legend
      : (rightLayer?.group_id
          ? findInheritedLegend(rightLayer.group_id, state.groupedLayers.groups)
          : null)

    return {
      leftLayerLegend: leftLegend,
      leftLayerName: leftLayer?.name || null,
      rightLayerLegend: rightLegend,
      rightLayerName: rightLayer?.name || null
    }
  }, [leftLayerId, rightLayerId, allLayers, state.groupedLayers.groups])

  // Initialize map and get handlers
  const {
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
    switchToClippedLayer,
  } = useMapInitialization({
    activeBasemap: state.activeBasemap,
    setActiveBasemap: state.setActiveBasemap,
    groupedLayers: state.groupedLayers,
    setGroupedLayers: state.setGroupedLayers,
    setIsLoadingLayers: state.setIsLoadingLayers,
    setLayerError: state.setLayerError,
    setHasDrawnPolygon: state.setHasDrawnPolygon,
    reportingMode: state.reportingMode,
    reportingStep: state.reportingStep,
    setReportingStep: state.setReportingStep,
    setInvalidAreaPolygon: state.setInvalidAreaPolygon,
    setClipMessage: state.setClipMessage,
    statsMode: state.statsMode,
    setStatsPolygon: state.setStatsPolygon,
    setStatsPolygonArea: state.setStatsPolygonArea,
    activeDataLayers: state.activeDataLayers,
    setActiveDataLayers: state.setActiveDataLayers,
    setSelectedLayerId: state.setSelectedLayerId,
    setCurrentPolygon: state.setCurrentPolygon,
    selectedCountry: state.selectedCountry,
    setSelectedCountry: state.setSelectedCountry,
    // AI Analysis mode
    aiAnalysisMode: state.aiAnalysisMode,
    setAiAnalysisPolygon: state.setAiAnalysisPolygon,
    setAiAnalysisArea: state.setAiAnalysisArea,
  })

  // Handle setting stats message
  const handleSetStatsMessage = useCallback((message: string, isError: boolean) => {
    state.setStatsMessage(message)
    state.setStatsMessageIsError(isError)
  }, [state.setStatsMessage, state.setStatsMessageIsError])

  // Handle country selection — auto-check cache for clipped layer
  const handleCountrySelect = useCallback(async (country: Country | null) => {
    // Clear previous clip state
    setTiffDownloadUrl(null)

    if (!country) {
      clearCountryPolygon()
      return
    }

    // Load polygon and zoom to country
    loadCountryPolygon(country)

    // Auto-check cache for the currently active layer
    const activeLayerKey = state.activeDataLayers[0]
    if (!activeLayerKey) return

    const layer = allLayers.find(l => l.geoserver_name === activeLayerKey)
    if (!layer?.id) return

    try {
      console.log('[AutoClip] Checking cache for', { country: country.name, layer: layer.geoserver_name })
      const response = await api.post('/clip/country', {
        countryFile: country.file,
        layerId: layer.id
      })

      if (!response.ok) {
        // Cache miss or error — just show the polygon, no clipping
        if (response.status === 404) {
          // "Layer not clipped" — silent, user just sees the polygon
          console.log('[AutoClip] No cached clip available')
        }
        return
      }

      const data = await response.json()
      if (data.status === 'success' && data.cached) {
        const [workspace] = data.clippedLayerName.split(':')
        // Swap the WMS layer on the map, but keep the original layer key
        // so the sidebar still shows "Active" and legend still renders
        switchToClippedLayer(activeLayerKey, data.clippedLayerName, workspace)

        if (data.downloadUrl) {
          setTiffDownloadUrl(data.downloadUrl)
        }

        console.log('[AutoClip] Switched to cached clipped layer:', data.clippedLayerName)
      }
    } catch (error) {
      // Silent fail — user just sees the polygon
      console.warn('[AutoClip] Cache check failed:', error)
    }
  }, [loadCountryPolygon, clearCountryPolygon, state.activeDataLayers, allLayers, switchToClippedLayer])

  // Get business logic handlers
  const {
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
  } = useMapHandlers({
    setExpandedGroups: state.setExpandedGroups,
    setClipMessage: state.setClipMessage,
    setCurrentPolygon: state.setCurrentPolygon,
    setReportingMode: state.setReportingMode,
    setReportingStep: state.setReportingStep,
    setInvalidAreaPolygon: state.setInvalidAreaPolygon,
    setReportComment: state.setReportComment,
    setReportMessage: state.setReportMessage,
    setStatsMode: state.setStatsMode,
    setStatsPolygon: state.setStatsPolygon,
    setStatsPolygonArea: state.setStatsPolygonArea,
    setStatsResults: state.setStatsResults,
    setStatsError: state.setStatsError,
    setIsSubmittingReport: state.setIsSubmittingReport,
    setIsCalculatingStats: state.setIsCalculatingStats,
    reportingMode: state.reportingMode,
    reportingStep: state.reportingStep,
    currentPolygon: state.currentPolygon,
    invalidAreaPolygon: state.invalidAreaPolygon,
    reportComment: state.reportComment,
    selectedLayerId: state.selectedLayerId,
    allLayers,
    statsPolygon: state.statsPolygon,
    statsLayerId: state.statsLayerId,
    statsMode: state.statsMode,
    selectedCountry: state.selectedCountry,
    clearDrawnItems,
    getMapBounds,
    // AI Analysis props
    aiAnalysisMode: state.aiAnalysisMode,
    aiAnalysisPolygon: state.aiAnalysisPolygon,
    aiAnalysisArea: state.aiAnalysisArea,
    aiAnalysisLayerId: state.aiAnalysisLayerId,
    setAiAnalysisMode: state.setAiAnalysisMode,
    setAiAnalysisPolygon: state.setAiAnalysisPolygon,
    setAiAnalysisArea: state.setAiAnalysisArea,
    setAiAnalysisLayerId: state.setAiAnalysisLayerId,
    setIsComputingStatsForAI: state.setIsComputingStatsForAI,
    setAiAnalysisError: state.setAiAnalysisError,
  })

  // Handle viewing a report when reportToView is provided
  useEffect(() => {
    if (reportToView && !state.isLoadingLayers && allLayers.length > 0) {
      // Small delay to ensure map is fully initialized
      const timer = setTimeout(() => {
        viewReportOnMap(reportToView.original_layer, reportToView.invalid_area_polygon)
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [reportToView, state.isLoadingLayers, allLayers.length, viewReportOnMap])

  // Auto-cancel stats mode when switching away from the stats tab
  useEffect(() => {
    if (state.activeTab !== 'stats' && state.statsMode) {
      handleCancelStats()
    }
  }, [state.activeTab, state.statsMode, handleCancelStats])

  // Auto-cancel AI analysis mode when switching away from the data tab or when layers change
  useEffect(() => {
    if (state.activeTab !== 'data' && state.aiAnalysisMode) {
      handleCancelAIAnalysis()
    }
  }, [state.activeTab, state.aiAnalysisMode, handleCancelAIAnalysis])

  // Auto-cancel AI analysis mode when active layers change (no layers or multiple layers)
  useEffect(() => {
    if (state.aiAnalysisMode && state.activeDataLayers.length !== 1) {
      handleCancelAIAnalysis()
    }
  }, [state.activeDataLayers.length, state.aiAnalysisMode, handleCancelAIAnalysis])

  // Handle starting compare mode
  const onStartCompare = useCallback(() => {
    if (!leftLayerId || !rightLayerId) return
    
    const leftLayer = allLayers.find(l => l.geoserver_name === leftLayerId)
    const rightLayer = allLayers.find(l => l.geoserver_name === rightLayerId)
    
    if (!leftLayer || !rightLayer) return
    
    // Remember sidebar state
    setSidebarWasOpen(state.sidebarOpen)
    
    // Collapse sidebar
    state.setSidebarOpen(false)
    
    // Start compare mode
    handleStartCompare(leftLayer, rightLayer)
    setIsCompareMode(true)
    setShowComparePicker(false)
  }, [leftLayerId, rightLayerId, allLayers, state.sidebarOpen, state.setSidebarOpen, handleStartCompare])

  // Handle exiting compare mode
  const onExitCompare = useCallback(() => {
    handleExitCompare()
    setIsCompareMode(false)
    setLeftGroupId(null)
    setLeftLayerId('')
    setRightGroupId(null)
    setRightLayerId('')
    // Restore sidebar state
    state.setSidebarOpen(sidebarWasOpen)
  }, [handleExitCompare, state.setSidebarOpen, sidebarWasOpen])

  // Handle opening layer change modal
  const handleOpenLayerChange = useCallback((side: 'left' | 'right') => {
    setEditingSide(side)
    if (side === 'left') {
      setTempGroupId(leftGroupId)
      setTempLayerId(leftLayerId)
    } else {
      setTempGroupId(rightGroupId)
      setTempLayerId(rightLayerId)
    }
    setShowLayerChangeModal(true)
  }, [leftGroupId, leftLayerId, rightGroupId, rightLayerId])

  // Handle confirming layer change
  const handleConfirmLayerChange = useCallback(() => {
    if (editingSide === 'left') {
      setLeftGroupId(tempGroupId)
      setLeftLayerId(tempLayerId)
      // Update the map with new left layer (don't zoom - preserve current view)
      const newLeftLayer = allLayers.find(l => l.geoserver_name === tempLayerId)
      if (newLeftLayer) {
        const rightLayer = allLayers.find(l => l.geoserver_name === rightLayerId)
        if (rightLayer) {
          handleStartCompare(newLeftLayer, rightLayer, false)
        }
      }
    } else if (editingSide === 'right') {
      setRightGroupId(tempGroupId)
      setRightLayerId(tempLayerId)
      // Update the map with new right layer (don't zoom - preserve current view)
      const newRightLayer = allLayers.find(l => l.geoserver_name === tempLayerId)
      if (newRightLayer) {
        const leftLayer = allLayers.find(l => l.geoserver_name === leftLayerId)
        if (leftLayer) {
          handleStartCompare(leftLayer, newRightLayer, false)
        }
      }
    }
    setShowLayerChangeModal(false)
  }, [editingSide, tempGroupId, tempLayerId, leftLayerId, rightLayerId, allLayers, handleStartCompare])

  // Helper to get layers for a selected group
  const getLayersForGroup = useCallback((groupId: number | string | null): Layer[] => {
    if (groupId === null) return []
    const group = allGroupsWithLayers.find(g => g.id === groupId)
    return group?.layers || []
  }, [allGroupsWithLayers])

  // Helper to get full layer label (group path + layer name)
  const getFullLayerLabel = useCallback((groupId: number | string | null, layerId: string): string => {
    if (groupId === null || !layerId) return ''

    const group = allGroupsWithLayers.find(g => g.id === groupId)
    if (!group) return ''

    const layer = group.layers.find(l => l.geoserver_name === layerId)
    if (!layer) return ''

    // Format: "Group → Child → Layer Name"
    return `${group.path} → ${layer.name}`
  }, [allGroupsWithLayers])

  // ── Tutorial Callbacks ────────────────────────────────────────────
  // Callback to switch tab for tutorial
  const handleTutorialSwitchTab = useCallback((tab: 'basemaps' | 'data' | 'stats') => {
    state.setActiveTab(tab)
  }, [state.setActiveTab])

  // Callback to activate a random layer for tutorial
  const handleTutorialActivateRandomLayer = useCallback(() => {
    if (allLayers.length === 0) return

    // Pick a random layer
    const randomIndex = Math.floor(Math.random() * allLayers.length)
    const randomLayer = allLayers[randomIndex]

    // Activate it by calling the toggle function
    handleDataLayerToggle(randomLayer)
  }, [allLayers, handleDataLayerToggle])

  // Callback to clean up after tutorial
  const handleTutorialCleanup = useCallback(() => {
    // Deactivate all active layers
    state.setActiveDataLayers([])
    // Switch to basemaps tab
    state.setActiveTab('basemaps')
  }, [state.setActiveDataLayers, state.setActiveTab])

  // Expose tutorial callbacks to parent via ref
  useImperativeHandle(ref, () => ({
    switchTab: handleTutorialSwitchTab,
    activateRandomLayer: handleTutorialActivateRandomLayer,
    cleanup: handleTutorialCleanup,
  }), [handleTutorialSwitchTab, handleTutorialActivateRandomLayer, handleTutorialCleanup])

  return (
    <div className="flex w-full h-full relative">
      {/* Report Viewing Indicator */}
      {reportToView && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">
              Viewing Report #{reportToView.id}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              reportToView.status === 'invalid' 
                ? 'bg-red-800' 
                : 'bg-green-600'
            }`}>
              {reportToView.status.toUpperCase()}
            </span>
          </div>
          <button
            onClick={() => router.push('/reports')}
            className="ml-4 px-3 py-1 bg-white text-red-600 rounded hover:bg-red-50 transition text-sm font-medium"
          >
            Back to Reports
          </button>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`left-0 top-0 bg-white shadow-lg transition-all duration-300 z-50 h-full ${
          state.sidebarOpen ? 'w-96' : 'w-0'
        } overflow-hidden absolute`}
      >
        <div className="h-full overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Map Controls</h2>
            <div className="flex items-center gap-2">
              {onStartTutorial && (
                <TutorialButton
                  onStart={onStartTutorial}
                  isCompleted={tutorialCompleted}
                />
              )}
              <button
                onClick={() => state.setSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 border-b border-gray-200">
            <button
              data-tutorial="basemaps-tab"
              onClick={() => state.setActiveTab('basemaps')}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                state.activeTab === 'basemaps'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Base Maps
            </button>
            <button
              data-tutorial="data-tab"
              onClick={() => state.setActiveTab('data')}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                state.activeTab === 'data'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Data
            </button>
            <button
              data-tutorial="stats-tab"
              onClick={() => state.setActiveTab('stats')}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                state.activeTab === 'stats'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Stats
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {state.activeTab === 'basemaps' && (
              <BasemapsTab
                activeBasemap={state.activeBasemap}
                onBasemapChange={handleBasemapChange}
              />
            )}

            {state.activeTab === 'data' && (
              <div data-tutorial="data-tab-content">
              <DataTab
                groupedLayers={state.groupedLayers}
                expandedGroups={state.expandedGroups}
                activeDataLayers={state.activeDataLayers}
                isLoadingLayers={state.isLoadingLayers}
                layerError={state.layerError}
                hasDrawnPolygon={state.hasDrawnPolygon}
                reportingMode={state.reportingMode}
                reportingStep={state.reportingStep}
                invalidAreaPolygon={state.invalidAreaPolygon}
                reportComment={state.reportComment}
                isSubmittingReport={state.isSubmittingReport}
                reportMessage={state.reportMessage}
                selectedLayerId={state.selectedLayerId}
                allLayers={allLayers}
                onToggleGroup={handleToggleGroup}
                onDataLayerToggle={handleDataLayerToggle}
                onClearDrawings={handleClearDrawings}
                onStartReport={handleStartReport}
                onSubmitReport={handleSubmitReport}
                onCancelReport={handleCancelReport}
                onReportCommentChange={state.setReportComment}
                // AI Analysis props
                aiAnalysisMode={state.aiAnalysisMode}
                aiAnalysisLayerId={state.aiAnalysisLayerId}
                aiAnalysisPolygon={state.aiAnalysisPolygon}
                aiAnalysisArea={state.aiAnalysisArea}
                isComputingStats={state.isComputingStatsForAI}
                aiAnalysisError={state.aiAnalysisError}
                onStartAIAnalysis={handleStartAIAnalysis}
                onAnalyzeArea={handleAnalyzeArea}
                onCancelAIAnalysis={handleCancelAIAnalysis}
                onAIAnalysisLayerChange={state.setAiAnalysisLayerId}
              />
              </div>
            )}

            {state.activeTab === 'stats' && (
              <StatsTab
                statsMode={state.statsMode}
                statsLayerId={state.statsLayerId}
                statsPolygon={state.statsPolygon}
                statsPolygonArea={state.statsPolygonArea}
                statsResults={state.statsResults}
                isCalculatingStats={state.isCalculatingStats}
                statsError={state.statsError}
                groupedLayers={state.groupedLayers}
                expandedGroups={state.expandedGroups}
                allLayers={allLayers}
                onStartStats={handleStartStats}
                onCalculateStats={handleCalculateStats}
                onCancelStats={handleCancelStats}
                onFetchCountryStats={handleFetchCountryStats}
                onStatsLayerChange={state.setStatsLayerId}
                onToggleGroup={handleToggleGroup}
                onSetStatsMessage={handleSetStatsMessage}
              />
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => state.setSidebarOpen(!state.sidebarOpen)}
        className={`left-0 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white p-3 rounded-r-lg shadow-lg transition-all duration-300 z-50 absolute ${
          state.sidebarOpen ? 'ml-96' : 'ml-0'
        }`}
      >
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${state.sidebarOpen ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Country Selector - positioned right next to sidebar */}
      <div
        className={`absolute top-16 z-40 transition-all duration-300 ${
          state.sidebarOpen ? 'left-[400px]' : 'left-[60px]'
        }`}
      >
        <div className="flex flex-col gap-2">
          <CountrySelector
            selectedCountry={state.selectedCountry?.name || null}
            onSelectCountry={handleCountrySelect}
            disabled={state.reportingMode || state.statsMode || state.aiAnalysisMode}
          />

          {/* Export Button with dropdown - JPEG or TIFF */}
          {!isCompareMode && !state.reportingMode && !state.statsMode && !state.aiAnalysisMode && !reportToView && (
            <div className="relative" ref={exportMenuRef}>
              <button
                data-tutorial="export-button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting}
                className="bg-white hover:bg-gray-100
                           text-gray-700 text-sm font-medium px-3 py-2 rounded shadow-md
                           border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2 transition-colors"
              >
                {isExporting ? 'Exporting...' : 'Export'}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showExportMenu && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded shadow-lg border border-gray-200 z-50">
                  <button
                    onClick={() => {
                      setShowExportMenu(false)
                      handleExport(setIsExporting)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 rounded-t"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    JPEG
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false)
                      if (tiffDownloadUrl) {
                        window.open(tiffDownloadUrl, '_blank')
                      }
                    }}
                    disabled={!tiffDownloadUrl}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 rounded-b border-t border-gray-100 ${
                      tiffDownloadUrl
                        ? 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    title={!tiffDownloadUrl ? 'TIFF available when a clipped layer is loaded' : 'Download clipped GeoTIFF'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    TIFF
                    {!tiffDownloadUrl && <span className="ml-auto text-xs opacity-60">🔒</span>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 h-full relative">
        <div
          data-tutorial="map-container"
          ref={mapContainerRef}
          className="w-full h-full z-0"
          style={{ zIndex: 0 }}
        />
      </div>

      {/* Reporting Mode Overlay */}
      <ReportingOverlay
        reportingMode={state.reportingMode}
        reportingStep={state.reportingStep}
        reportComment={state.reportComment}
        isSubmittingReport={state.isSubmittingReport}
        reportMessage={state.reportMessage}
        onSubmitReport={handleSubmitReport}
        onCancelReport={handleCancelReport}
        onReportCommentChange={state.setReportComment}
      />

      {/* AI Analysis Mode Banner */}
      {state.aiAnalysisMode && !reportToView && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-purple-600 text-white
                        text-sm font-medium px-4 py-2 rounded shadow-md flex items-center gap-3">
          <span>AI Analysis Mode - Draw a polygon to analyze</span>
        </div>
      )}

      {/* Stats Message Display - only show in stats mode */}
      {state.statsMessage && state.statsMode && !reportToView && (
        <div className={`absolute left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 top-4 ${
          state.statsMessageIsError
            ? 'bg-red-100 border-2 border-red-500 text-red-800'
            : 'bg-green-100 border-2 border-green-500 text-green-800'
        }`}>
          <p className="text-sm font-medium">{state.statsMessage}</p>
        </div>
      )}

      {/* Legend - bottom right */}
      {activeLayerLegend && activeLayerLegend.length > 0 && !state.reportingMode && !isCompareMode && (
        <Legend legend={activeLayerLegend} layerName={activeLayerName} />
      )}

      {/* Compare Layers Button - top right */}
      {!isCompareMode && !state.reportingMode && !state.statsMode && !state.aiAnalysisMode && !reportToView && (
        <button
          data-tutorial="compare-button"
          onClick={() => setShowComparePicker(true)}
          className="absolute top-4 right-4 z-[1000] bg-white hover:bg-gray-100
                     text-gray-700 text-sm font-medium px-3 py-2 rounded shadow-md
                     border border-gray-300 flex items-center gap-2 transition-colors"
        >
          <span className="text-lg">⇔</span>
          Compare Layers
        </button>
      )}

      {/* Compare Mode Banner */}
      {isCompareMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white
                        text-sm font-medium px-4 py-2 rounded shadow-md flex items-center gap-3">
          <span>Compare Mode Active</span>
          <button
            data-tutorial="compare-exit"
            onClick={onExitCompare}
            className="bg-white text-blue-600 px-2 py-0.5 rounded text-xs font-semibold hover:bg-blue-50"
          >
            Exit
          </button>
        </div>
      )}

      {/* Compare Mode Layer Labels */}
      {isCompareMode && (
        <>
          {/* Left Layer Label - Top Left (Clickable) */}
          <div
            data-tutorial="compare-left-label"
            onClick={() => handleOpenLayerChange('left')}
            className="absolute top-4 left-4 z-[1000] bg-black/75 text-white
                            text-sm font-medium px-3 py-2 rounded shadow-lg
                            max-w-xs truncate cursor-pointer hover:bg-black/85
                            transition-colors flex items-center gap-2"
          >
            <span>{getFullLayerLabel(leftGroupId, leftLayerId)}</span>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>

          {/* Right Layer Label - Top Right (Clickable) */}
          <div
            onClick={() => handleOpenLayerChange('right')}
            className="absolute top-4 right-4 z-[1000] bg-black/75 text-white
                            text-sm font-medium px-3 py-2 rounded shadow-lg
                            max-w-xs truncate cursor-pointer hover:bg-black/85
                            transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>{getFullLayerLabel(rightGroupId, rightLayerId)}</span>
          </div>

          {/* Left Layer Legend - Bottom Left */}
          {leftLayerLegend && leftLayerLegend.length > 0 && (
            <CompareLegend
              legend={leftLayerLegend}
              layerName={leftLayerName || undefined}
              position="left"
            />
          )}

          {/* Right Layer Legend - Bottom Right */}
          {rightLayerLegend && rightLayerLegend.length > 0 && (
            <CompareLegend
              legend={rightLayerLegend}
              layerName={rightLayerName || undefined}
              position="right"
            />
          )}
        </>
      )}

      {/* Compare Layer Picker Modal */}
      {showComparePicker && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[600px]">
            <h3 className="text-lg font-semibold mb-6 text-gray-900">Compare Layers</h3>

            {/* Left Layer Selection */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Left Layer
              </label>
              <div className="flex gap-2">
                <select
                  data-tutorial="compare-left-group"
                  value={leftGroupId ?? ''}
                  onChange={(e) => {
                    setLeftGroupId(e.target.value ? (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) : null)
                    setLeftLayerId('')
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select group...</option>
                  {allGroupsWithLayers.filter(g => g.layers.length > 0).map(group => (
                    <option key={group.id} value={group.id}>
                      {group.path}
                    </option>
                  ))}
                </select>
                <select
                  data-tutorial="compare-left-layer"
                  value={leftLayerId}
                  onChange={(e) => setLeftLayerId(e.target.value)}
                  disabled={!leftGroupId}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select layer...</option>
                  {getLayersForGroup(leftGroupId).map(layer => (
                    <option key={layer.geoserver_name} value={layer.geoserver_name}>
                      {layer.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Layer Selection */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Right Layer
              </label>
              <div className="flex gap-2">
                <select
                  data-tutorial="compare-right-group"
                  value={rightGroupId ?? ''}
                  onChange={(e) => {
                    setRightGroupId(e.target.value ? (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) : null)
                    setRightLayerId('')
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select group...</option>
                  {allGroupsWithLayers.filter(g => g.layers.length > 0).map(group => (
                    <option key={group.id} value={group.id}>
                      {group.path}
                    </option>
                  ))}
                </select>
                <select
                  data-tutorial="compare-right-layer"
                  value={rightLayerId}
                  onChange={(e) => setRightLayerId(e.target.value)}
                  disabled={!rightGroupId}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select layer...</option>
                  {getLayersForGroup(rightGroupId).map(layer => (
                    <option key={layer.geoserver_name} value={layer.geoserver_name}>
                      {layer.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error message if same layer selected */}
            {leftLayerId && rightLayerId && leftLayerId === rightLayerId && (
              <p className="text-sm text-red-600 mb-4">
                Please select different layers for comparison
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                data-tutorial="compare-modal-submit"
                onClick={onStartCompare}
                disabled={!leftLayerId || !rightLayerId || leftLayerId === rightLayerId}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Compare
              </button>
              <button
                onClick={() => {
                  setShowComparePicker(false)
                  setLeftGroupId(null)
                  setLeftLayerId('')
                  setRightGroupId(null)
                  setRightLayerId('')
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layer Change Modal */}
      {showLayerChangeModal && (
        <div className="absolute inset-0 z-[2100] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[600px]">
            <h3 className="text-lg font-semibold mb-6 text-gray-900">
              Change {editingSide === 'left' ? 'Left' : 'Right'} Layer
            </h3>

            {/* Group Selection */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Group
              </label>
              <select
                value={tempGroupId ?? ''}
                onChange={(e) => {
                  setTempGroupId(e.target.value ? (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) : null)
                  setTempLayerId('')
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select group...</option>
                {allGroupsWithLayers.filter(g => g.layers.length > 0).map(group => (
                  <option key={group.id} value={group.id}>
                    {group.path}
                  </option>
                ))}
              </select>
            </div>

            {/* Layer Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Layer
              </label>
              <select
                value={tempLayerId}
                onChange={(e) => setTempLayerId(e.target.value)}
                disabled={!tempGroupId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select layer...</option>
                {getLayersForGroup(tempGroupId).map(layer => (
                  <option key={layer.geoserver_name} value={layer.geoserver_name}>
                    {layer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                data-tutorial="edit-modal-confirm"
                onClick={handleConfirmLayerChange}
                disabled={!tempLayerId}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowLayerChangeModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

MapComponent.displayName = 'MapComponent'

export default MapComponent
