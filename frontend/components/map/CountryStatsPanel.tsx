'use client'

import { StatsResult } from './types'
import StatsBarChart from './StatsBarChart'

interface CountryStatsPanelProps {
  countryName: string | null
  layerName: string | null
  stats: StatsResult | null
  isLoading: boolean
  onClose: () => void
}

export default function CountryStatsPanel({
  countryName,
  layerName,
  stats,
  isLoading,
  onClose,
}: CountryStatsPanelProps) {
  if (!stats || !countryName) return null

  return (
    <div className="absolute right-0 top-0 h-full z-[100] w-[380px] max-w-[90vw] animate-slide-in-right">
      <div className="h-full bg-white shadow-xl border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">{countryName}</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{layerName || 'Active Layer'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
            title="Close stats panel"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                <span className="text-sm text-gray-500">Loading stats...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Total Area</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {stats.total_area_km2?.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </p>
                  <p className="text-xs text-gray-500">km²</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Resolution</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {stats.pixel_size_m?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">m/px</p>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Class Distribution</h4>
                <StatsBarChart
                  classes={stats.classes || []}
                  totalArea={stats.total_area_km2 || 0}
                />
              </div>

              {/* Detailed breakdown table */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Breakdown</h4>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">Class</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Area (km²)</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 w-14">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.classes
                        ?.sort((a, b) => b.percentage - a.percentage)
                        .map((cls, idx) => (
                        <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
                          <td className="py-2 px-3 text-gray-800 font-medium text-sm">{cls.class_name}</td>
                          <td className="py-2 px-3 text-right text-gray-600 tabular-nums">
                            {cls.area_km2?.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-900 font-semibold tabular-nums">{cls.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
