'use client'

import { StatsTabProps } from './types'

export default function StatsTab({
  statsMode,
  statsLayerId,
  statsPolygon,
  statsResults,
  isCalculatingStats,
  statsError,
  allLayers,
  onStartStats,
  onCalculateStats,
  onCancelStats,
  onStatsLayerChange,
}: StatsTabProps) {
  // Filter layers that have stats capability
  const layersWithStats = allLayers.filter(l => l.hasStats)

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 mb-4">
        Calculate land cover statistics for a selected area.
      </div>

      {/* Layer Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Layer
        </label>
        <select
          value={statsLayerId || ''}
          onChange={(e) => onStatsLayerChange(parseInt(e.target.value) || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="">Select a layer...</option>
          {layersWithStats.map((layer) => (
            <option key={layer.id} value={layer.id}>
              {layer.group_name ? `${layer.group_name} / ` : ''}{layer.name}
            </option>
          ))}
        </select>
        {layersWithStats.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">No layers configured for statistics</p>
        )}
      </div>

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
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Draw a polygon on the map to define your area of interest, then click Calculate.
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
