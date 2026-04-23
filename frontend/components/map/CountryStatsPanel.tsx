'use client'

import { useTranslation } from 'react-i18next'
import { StatsResult } from './types'
import StatsBarChart from './StatsBarChart'
import { resolveCountryName } from '@/lib/i18n-utils'

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
  const { t } = useTranslation('map')

  if (!stats || !countryName) return null

  return (
    <div className="absolute right-4 top-4 z-[100] w-[340px] max-w-[90vw] animate-slide-in-right">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">{resolveCountryName(countryName)}</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{layerName || t('countryStatsPanel.activeLayer')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
            title={t('countryStatsPanel.closeStatsPanel')}
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chart */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                <span className="text-sm text-gray-500">{t('countryStatsPanel.loadingStats')}</span>
              </div>
            </div>
          ) : (
            <StatsBarChart
              classes={stats.classes || []}
              totalArea={stats.total_area_km2 || 0}
            />
          )}
        </div>
      </div>
    </div>
  )
}
