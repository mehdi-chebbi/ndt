'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// Import tab components
import BasemapsTab from './map/BasemapsTab'
import DataTab from './map/DataTab'
import StatsTab from './map/StatsTab'
import ReportingOverlay from './map/ReportingOverlay'
import Legend from './map/Legend'

// Import types
import { Group, LegendItem } from './map/types'

// Import hooks
import { useMapState, flattenLayers } from './map/useMapState'
import { useMapInitialization } from './map/useMapInitialization'
import { useMapHandlers } from './map/useMapHandlers'

interface ReportToView {
  id: number
  original_layer: string
  original_colormap: string
  invalid_area_polygon: any
  comment: string
  status: string
}

interface MapComponentProps {
  reportToView?: ReportToView | null
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

const MapComponent = ({ reportToView }: MapComponentProps) => {
  const router = useRouter()
  
  // Get all state from custom hook
  const state = useMapState()

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

    // Find inherited legend from group hierarchy
    const legend = activeLayer.group_id
      ? findInheritedLegend(activeLayer.group_id, state.groupedLayers.groups)
      : null

    return {
      activeLayerLegend: legend,
      activeLayerName: activeLayer.name
    }
  }, [state.activeDataLayers, allLayers, state.groupedLayers.groups])

  // Initialize map and get handlers
  const {
    mapContainerRef,
    handleBasemapChange,
    handleDataLayerToggle,
    clearDrawnItems,
    getMapBounds,
    viewReportOnMap,
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
    activeDataLayers: state.activeDataLayers,
    setActiveDataLayers: state.setActiveDataLayers,
    setSelectedLayerId: state.setSelectedLayerId,
    setCurrentPolygon: state.setCurrentPolygon,
  })

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
    clearDrawnItems,
    getMapBounds,
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
          state.sidebarOpen ? 'w-80' : 'w-0'
        } overflow-hidden absolute`}
      >
        <div className="h-full overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Map Controls</h2>
            <button
              onClick={() => state.setSidebarOpen(false)}
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
              />
            )}

            {state.activeTab === 'stats' && (
              <StatsTab
                statsMode={state.statsMode}
                statsLayerId={state.statsLayerId}
                statsPolygon={state.statsPolygon}
                statsResults={state.statsResults}
                isCalculatingStats={state.isCalculatingStats}
                statsError={state.statsError}
                groupedLayers={state.groupedLayers}
                expandedGroups={state.expandedGroups}
                allLayers={allLayers}
                onStartStats={handleStartStats}
                onCalculateStats={handleCalculateStats}
                onCancelStats={handleCancelStats}
                onStatsLayerChange={state.setStatsLayerId}
                onToggleGroup={handleToggleGroup}
              />
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => state.setSidebarOpen(!state.sidebarOpen)}
        className={`left-0 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white p-3 rounded-r-lg shadow-lg transition-all duration-300 z-50 absolute ${
          state.sidebarOpen ? 'ml-80' : 'ml-0'
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

      {/* Map Container */}
      <div className="flex-1 h-full relative">
        <div
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

      {/* Message Display */}
      {state.clipMessage && !state.reportingMode && !reportToView && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {state.clipMessage}
        </div>
      )}

      {/* Legend - bottom right */}
      {activeLayerLegend && activeLayerLegend.length > 0 && !state.reportingMode && (
        <Legend legend={activeLayerLegend} layerName={activeLayerName} />
      )}
    </div>
  )
}

export default MapComponent
