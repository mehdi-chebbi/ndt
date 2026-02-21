'use client'

// Import tab components
import BasemapsTab from './map/BasemapsTab'
import DataTab from './map/DataTab'
import StatsTab from './map/StatsTab'
import ReportingOverlay from './map/ReportingOverlay'

// Import hooks
import { useMapState, flattenLayers } from './map/useMapState'
import { useMapInitialization } from './map/useMapInitialization'
import { useMapHandlers } from './map/useMapHandlers'

const MapComponent = () => {
  // Get all state from custom hook
  const state = useMapState()

  // Get all layers flattened
  const allLayers = [
    ...flattenLayers(state.groupedLayers.groups),
    ...state.groupedLayers.ungroupedLayers
  ]

  // Initialize map and get handlers
  const {
    mapContainerRef,
    handleBasemapChange,
    handleDataLayerToggle,
    clearDrawnItems,
    getMapBounds,
  } = useMapInitialization({
    activeBasemap: state.activeBasemap,
    setActiveBasemap: state.setActiveBasemap,
    groupedLayers: state.groupedLayers,
    setGroupedLayers: state.setGroupedLayers,
    expandedGroups: state.expandedGroups,
    setExpandedGroups: state.setExpandedGroups,
    isLoadingLayers: state.isLoadingLayers,
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

  return (
    <div className="flex w-full h-full relative">
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
                allLayers={allLayers}
                onStartStats={handleStartStats}
                onCalculateStats={handleCalculateStats}
                onCancelStats={handleCancelStats}
                onStatsLayerChange={state.setStatsLayerId}
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
      {state.clipMessage && !state.reportingMode && (
        <div className="absolute top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {state.clipMessage}
        </div>
      )}
    </div>
  )
}

export default MapComponent
