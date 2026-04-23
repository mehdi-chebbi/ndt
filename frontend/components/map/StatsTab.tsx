'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { StatsTabProps, Layer, Group } from './types'
import StatsBarChart from './StatsBarChart'
import { authFetch } from '@/lib/authFetch'
import { resolveBilingualText, resolveCountryName } from '@/lib/i18n-utils'

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

interface CountryOption {
  name: string
  file: string
}

export default function StatsTab({
  statsMode,
  statsLayerId,
  statsPolygon,
  statsPolygonArea,
  statsResults,
  isCalculatingStats,
  statsError,
  groupedLayers,
  expandedGroups,
  allLayers,
  onStartStats,
  onCalculateStats,
  onCancelStats,
  onFetchCountryStats,
  onStatsLayerChange,
  onToggleGroup,
  onSetStatsMessage,
}: StatsTabProps) {
  const { t } = useTranslation('map')

  // Country selector state
  const [countries, setCountries] = useState<CountryOption[]>([])
  const [countriesLoading, setCountriesLoading] = useState(true)
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null)
  const countryDropdownRef = useRef<HTMLDivElement>(null)

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await authFetch('/countries', { skipAuth: true })
        if (!res.ok) throw new Error('Failed to fetch countries')
        const data = await res.json()
        setCountries(data)
      } catch (error) {
        console.error('Failed to fetch countries:', error)
      } finally {
        setCountriesLoading(false)
      }
    }
    fetchCountries()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter layers that have stats capability
  const layersWithStats = allLayers.filter(l => l.hasStats)

  // Check if polygon area is within limits
  const MAX_AREA_KM2 = 200_000
  const isPolygonTooLarge = statsPolygonArea > MAX_AREA_KM2
  const canCalculateStats = statsPolygon && statsLayerId && !isPolygonTooLarge && !isCalculatingStats

  // Filter countries by search
  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  // Handle country selection
  const handleCountrySelect = (country: CountryOption) => {
    setSelectedCountry(country)
    setCountrySearch('')
    setCountryDropdownOpen(false)
    if (statsLayerId) {
      onFetchCountryStats(country.file)
    }
  }

  const handleCountryClear = () => {
    setSelectedCountry(null)
    setCountrySearch('')
  }

  // Update stats message when polygon changes
  React.useEffect(() => {
    if (statsPolygon) {
      if (isPolygonTooLarge) {
        onSetStatsMessage(
          t('initialization.polygonTooLarge', { area: statsPolygonArea.toLocaleString(), maxArea: MAX_AREA_KM2.toLocaleString() }),
          true
        )
      } else {
        onSetStatsMessage(
          t('initialization.polygonCaptured', { area: statsPolygonArea.toLocaleString() }),
          false
        )
      }
    } else if (statsMode) {
      onSetStatsMessage('', false)
    }
  }, [statsPolygon, statsPolygonArea, isPolygonTooLarge, statsMode, onSetStatsMessage, t])

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
            <span className="text-xs font-semibold text-green-700">{t('statsTab.selected')}</span>
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
        {t('statsTab.selectLayerThenCountry')}
      </div>

      {/* Country Selector - always visible when a layer is selected */}
      {statsLayerId && !statsMode && (
        <div ref={countryDropdownRef} className="space-y-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('statsTab.quickStatsByCountry')}</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
              disabled={countriesLoading || isCalculatingStats}
              className={`
                w-full flex items-center justify-between gap-2 px-3 py-2.5 
                bg-white border border-gray-300 rounded-lg shadow-sm
                text-sm font-medium text-gray-700
                ${countriesLoading || isCalculatingStats ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}
                transition-colors
              `}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                <span className="truncate">
                  {countriesLoading ? t('statsTab.loadingCountries') : selectedCountry ? resolveCountryName(selectedCountry.name) : t('statsTab.selectCountryForStats')}
                </span>
              </div>
              <svg 
                className={`w-4 h-4 text-gray-500 transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {countryDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-[100] max-h-64 overflow-hidden">
                <div className="p-2 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder={t('statsTab.searchCountry')}
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    autoFocus
                  />
                </div>

                {selectedCountry && (
                  <button
                    onClick={handleCountryClear}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 border-b border-gray-200"
                  >
                    {t('statsTab.clearSelection')}
                  </button>
                )}

                <div className="overflow-y-auto max-h-44">
                  {filteredCountries.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 text-center">{t('statsTab.noCountriesFound')}</div>
                  ) : (
                    filteredCountries.map((country) => (
                      <button
                        key={country.file}
                        onClick={() => handleCountrySelect(country)}
                        className={`
                          w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors
                          ${selectedCountry?.file === country.file ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'}
                        `}
                      >
                        {resolveCountryName(country.name)}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400">{t('statsTab.or')}</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>
        </div>
      )}

      {/* Stats Mode Actions */}
      {!statsMode ? (
        <button
          data-tutorial="stats-start-drawing"
          onClick={onStartStats}
          disabled={!statsLayerId}
          className={`w-full py-3 rounded-lg font-medium transition ${
            !statsLayerId
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {t('statsTab.startDrawing')}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              data-tutorial="stats-calculate"
              onClick={onCalculateStats}
              disabled={!canCalculateStats}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                !canCalculateStats
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isCalculatingStats ? t('statsTab.calculating') : t('statsTab.calculateStats')}
            </button>
            <button
              onClick={onCancelStats}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              {t('dataTab.cancel')}
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
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{t('statsTab.results')}</h3>
            {selectedCountry && !statsMode && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{resolveCountryName(selectedCountry.name)}</span>
            )}
          </div>

          {/* Summary box */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">{t('statsTab.pixelSize')}</p>
              <p className="text-sm font-semibold text-gray-900 mb-2">{statsResults.pixel_size_m}m</p>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <p className="text-xs text-gray-500 mb-1">{t('statsTab.totalArea')}</p>
                <p className="text-lg font-bold text-gray-900">
                  {statsResults.total_area_km2?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  <span className="text-sm font-normal text-gray-600 ml-1">km²</span>
                </p>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div data-tutorial="stats-chart" className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <StatsBarChart
              classes={statsResults.classes || []}
              totalArea={statsResults.total_area_km2 || 0}
            />
          </div>

          {/* Detailed breakdown table */}
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b">
                  <th className="text-left py-2 text-gray-600">{t('statsTab.class')}</th>
                  <th className="text-right py-2 text-gray-600">{t('statsTab.areaKm2')}</th>
                  <th className="text-right py-2 text-gray-600">{t('statsTab.percentage')}</th>
                </tr>
              </thead>
              <tbody>
                {statsResults.classes?.map((cls, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 text-gray-900">{resolveBilingualText(cls.class_name)}</td>
                    <td className="py-2 text-right text-gray-600">{cls.area_km2?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 text-right text-gray-600">{cls.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Layer Selection - Grouped */}
      {layersWithStats.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500 text-sm">{t('statsTab.noLayersForStats')}</p>
          <p className="text-gray-400 text-xs mt-1">{t('statsTab.contactAdminForStats')}</p>
        </div>
      ) : (
        <div data-tutorial="stats-layer-select" className="space-y-2">
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
                  <span className="font-semibold text-gray-600">{t('dataTab.otherLayers')}</span>
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
    </div>
  )
}
