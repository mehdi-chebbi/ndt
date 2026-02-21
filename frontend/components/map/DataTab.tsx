'use client'

import { DataTabProps, Layer, Group } from './types'

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
}: DataTabProps) {
  // Render a layer button
  const renderLayerButton = (layer: Layer) => {
    const isActive = activeDataLayers.includes(layer.geoserver_name)
    return (
      <button
        key={layer.id}
        onClick={() => onDataLayerToggle(layer)}
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

      {/* Clear Button */}
      {activeDataLayers.length > 0 && (
        <button
          onClick={onClearDrawings}
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
          onClick={onStartReport}
          className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
        >
          Report Invalid Data
        </button>
      )}
    </div>
  )
}
