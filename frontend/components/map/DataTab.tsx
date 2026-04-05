'use client'

import { DataTabProps, Layer, Group, PolygonGeometry } from './types'

// Recursively count all layers in a group and its children
function countAllLayers(group: Group): number {
  let total = group.layers.length
  if (group.children?.length > 0) {
    for (const child of group.children) {
      total += countAllLayers(child)
    }
  }
  return total
}

// Calculate polygon area in km²
function calculatePolygonAreaKm2(polygon: PolygonGeometry): number {
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

export default function DataTab({
  groupedLayers,
  expandedGroups,
  activeDataLayers,
  isLoadingLayers,
  layerError,
  hasDrawnPolygon,
  reportingMode,
  reportingStep,
  invalidAreaPolygon,
  reportComment,
  isSubmittingReport,
  reportMessage,
  selectedLayerId,
  allLayers,
  onToggleGroup,
  onDataLayerToggle,
  onClearDrawings,
  onStartReport,
  onSubmitReport,
  onCancelReport,
  onReportCommentChange,
  // AI Analysis props
  aiAnalysisMode,
  aiAnalysisLayerId,
  aiAnalysisPolygon,
  aiAnalysisArea,
  isComputingStats,
  aiAnalysisError,
  onStartAIAnalysis,
  onAnalyzeArea,
  onCancelAIAnalysis,
  onAIAnalysisLayerChange,
}: DataTabProps) {
  // Track first rendered layer for tutorial targeting
  let firstLayerAssigned = false
  const renderLayerButton = (layer: Layer) => {
    const isActive = activeDataLayers.includes(layer.geoserver_name)
    const isSelectedForAI = aiAnalysisMode && aiAnalysisLayerId === layer.id
    const isFirst = !firstLayerAssigned
    if (isFirst) firstLayerAssigned = true

    // In AI analysis mode, clicking selects the layer
    const handleClick = () => {
      if (aiAnalysisMode) {
        if (layer.hasStats) {
          onAIAnalysisLayerChange(layer.id)
        }
      } else {
        if (!isActive) {
          // Only dispatch when activating (not deactivating)
          window.dispatchEvent(new CustomEvent('layer-activated'))
        }
        onDataLayerToggle(layer)
      }
    }

    return (
      <button
        key={layer.id}
        data-tutorial={isFirst ? 'layer-first-available' : undefined}
        onClick={handleClick}
        className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
          isSelectedForAI
            ? 'bg-purple-100 text-purple-900 border-2 border-purple-600'
            : isActive
            ? 'bg-green-100 text-green-900 border border-green-600'
            : aiAnalysisMode && !layer.hasStats
            ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium">{layer.name}</span>
          <div className="flex items-center gap-2">
            {!layer.hasStats && (
              <span className="text-xs text-amber-600">(no stats)</span>
            )}
            {isSelectedForAI && (
              <span className="text-xs font-semibold text-purple-700">Selected</span>
            )}
            {isActive && !aiAnalysisMode && (
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
            onClick={() => onToggleGroup(group.id)}
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
              <span className="text-xs text-gray-500">({countAllLayers(group)})</span>
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

      {/* Action Buttons - At the top */}
      {!isLoadingLayers && !layerError && activeDataLayers.length > 0 && !aiAnalysisMode && (
        <div className="space-y-2 pb-2 border-b border-gray-200">
          <button
            data-tutorial="report-button"
            onClick={onStartReport}
            className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            Report Invalid Data
          </button>
          <button
            onClick={onStartAIAnalysis}
            disabled={activeDataLayers.length !== 1 || !allLayers.find(l => l.geoserver_name === activeDataLayers[0])?.hasStats}
            className={`w-full py-3 text-white rounded-lg transition font-medium ${
              activeDataLayers.length === 1 && allLayers.find(l => l.geoserver_name === activeDataLayers[0])?.hasStats
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Analyze with AI
          </button>
          <button
            onClick={onClearDrawings}
            disabled={!hasDrawnPolygon}
            className={`w-full py-2 rounded-lg font-medium transition text-sm ${
              !hasDrawnPolygon
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Clear Drawings
          </button>
        </div>
      )}

      {/* AI Analysis Mode UI */}
      {aiAnalysisMode && (
        <div className="space-y-3 pb-2 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-purple-900">AI Analysis Mode</h3>
            <button
              onClick={onCancelAIAnalysis}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>

          {/* Instructions */}
          <p className="text-sm text-gray-600">
            1. Select a layer below<br/>
            2. Draw a polygon on the map<br/>
            3. Click "Analyze" to get AI insights
          </p>

          {/* Area Status */}
          {aiAnalysisPolygon && (
            <div
              className={`p-3 rounded-lg ${
                aiAnalysisArea > 200000
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}
            >
              <p className="text-sm font-medium">
                Area: {aiAnalysisArea.toFixed(2)} km²
              </p>
              {aiAnalysisArea > 200000 && (
                <p className="text-xs mt-1">
                  Area exceeds 200,000 km² limit. Please draw a smaller polygon.
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {aiAnalysisError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {aiAnalysisError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={onAnalyzeArea}
              disabled={!aiAnalysisPolygon || !aiAnalysisLayerId || aiAnalysisArea > 200000 || isComputingStats}
              className={`w-full py-3 text-white rounded-lg transition font-medium ${
                !aiAnalysisPolygon || !aiAnalysisLayerId || aiAnalysisArea > 200000 || isComputingStats
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isComputingStats ? 'Analyzing...' : 'Analyze with AI'}
            </button>
            <button
              onClick={onCancelAIAnalysis}
              className="w-full py-2 rounded-lg font-medium transition text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Cancel Analysis
            </button>
          </div>
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
                onClick={() => onToggleGroup('ungrouped')}
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
    </div>
  )
}
