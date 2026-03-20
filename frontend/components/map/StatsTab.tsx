'use client'

import { StatsTabProps, Layer, Group } from './types'

// Recursively count all layers in a group and its children (that have stats)
function countAllLayersWithStats(group: Group): number {
  let total = group.layers.filter(l => l.hasStats).length
  if (group.children?.length > 0) {
    for (const child of group.children) {
      total += countAllLayersWithStats(child)
    }
  }
  return total
}

export default function StatsTab({
  statsMode,
  statsLayerId,
  statsPolygon,
  statsResults,
  isCalculatingStats,
  statsError,
  groupedLayers,
  expandedGroups,
  allLayers,
  onStartStats,
  onCalculateStats,
  onCancelStats,
  onStatsLayerChange,
  onToggleGroup,
}: StatsTabProps) {
  // Filter layers that have stats capability
  const layersWithStats = allLayers.filter(l => l.hasStats)

  // Render a layer button
  const renderLayerButton = (layer: Layer) => {
    if (!layer.hasStats) return null
    
    const isSelected = statsLayerId === layer.id
    return (
      <button
        key={layer.id}
        onClick={() => onStatsLayerChange(isSelected ? null : layer.id)}
        className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
          isSelected
            ? 'bg-green-100 text-green-900 border border-green-600'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium">{layer.name}</span>
          {isSelected && (
            <span className="text-xs font-semibold text-green-700">Selected</span>
          )}
        </div>
      </button>
    )
  }

  // Render nested groups recursively
  const renderGroup = (group: Group, depth = 0) => {
    const isExpanded = expandedGroups.has(group.id)
    const statsLayerCount = countAllLayersWithStats(group)
    const hasContent = statsLayerCount > 0

    if (!hasContent) return null

    return (
      <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Group header */}
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
            <span className="text-xs text-gray-500">({statsLayerCount})</span>
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="bg-white">
            {/* Child groups */}
            {group.children?.map(child => renderGroup(child, depth + 1))}

            {/* Layers in this group */}
            {group.layers.filter(l => l.hasStats).length > 0 && (
              <div className="p-2 space-y-2" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
                {group.layers.filter(l => l.hasStats).map(renderLayerButton)}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600">
        Select a layer, draw a polygon, and calculate land cover statistics.
      </div>

      {/* Layer Selection - Grouped */}
      {layersWithStats.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500 text-sm">No layers configured for statistics</p>
          <p className="text-gray-400 text-xs mt-1">Contact admin to configure layers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Root Groups */}
          {groupedLayers.groups.map(group => renderGroup(group))}

          {/* Ungrouped Layers with stats */}
          {groupedLayers.ungroupedLayers.filter(l => l.hasStats).length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => onToggleGroup('ungrouped-stats')}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-4 h-4 text-gray-600 transition-transform ${expandedGroups.has('ungrouped-stats') ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="font-semibold text-gray-600">Other Layers</span>
                </div>
              </button>
              {expandedGroups.has('ungrouped-stats') && (
                <div className="p-2 space-y-2 bg-white">
                  {groupedLayers.ungroupedLayers.filter(l => l.hasStats).map(renderLayerButton)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats Mode Actions */}
      {!statsMode ? (
        <button
          onClick={onStartStats}
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
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              {statsPolygon
                ? '✓ Area loaded. Click Calculate Stats to proceed, or draw a new polygon to override.'
                : 'Draw a polygon on the map, or select a country from the menu above.'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onCalculateStats}
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
              onClick={onCancelStats}
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
                {statsResults.classes?.map((cls, idx) => (
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
  )
}
