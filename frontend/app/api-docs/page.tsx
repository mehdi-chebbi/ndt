'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/authFetch'

interface Layer {
  id: number
  name: string
  geoserver_name: string
  layerName: string
  wmsUrl: string
  bounds: [[number, number], [number, number]]
  hasStats: boolean
}

interface Group {
  id: number
  name: string
  description: string | null
  parent_id: number | null
  children: Group[]
  layers: Layer[]
}

interface GroupedLayers {
  groups: Group[]
  ungroupedLayers: Layer[]
}

interface Country {
  name: string
  file: string
}

const BASE_URL = 'http://ldn-africa.oss-online.org'

function collectLayers(groups: Group[]): Layer[] {
  const layers: Layer[] = []
  const walk = (g: Group) => {
    for (const l of g.layers) layers.push(l)
    for (const c of g.children || []) walk(c)
  }
  for (const g of groups) walk(g)
  return layers
}

function countAllLayers(group: Group): number {
  let total = group.layers.length
  if (group.children && group.children.length > 0) {
    for (const child of group.children) {
      total += countAllLayers(child)
    }
  }
  return total
}

function generateLeafletSnippet(
  wmsUrl: string,
  layerGeoserverName: string,
  areaLabel: string
): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>' + areaLabel + '</title>',
    '  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />',
    '  <' + 'script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><' + '/script>',
    '  <style>',
    '    * { margin: 0; padding: 0; box-sizing: border-box; }',
    '    #map { width: 100%; height: 100vh; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <div id="map"></div>',
    '  <' + 'script>',
    '    const map = L.map("map").setView([5, 20], 3);',
    '',
    '    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {',
    '      attribution: "\u00a9 OpenStreetMap"',
    '    }).addTo(map);',
    '',
    '    L.tileLayer.wms("' + wmsUrl + '", {',
    '      layers: "' + layerGeoserverName + '",',
    '      format: "image/png",',
    '      transparent: true,',
    '      crossOrigin: "anonymous",',
    '      opacity: 0.7',
    '    }).addTo(map);',
    '  <' + '/script>',
    '</body>',
    '</html>',
  ].join('\n')
}

export default function ApiDocsPage() {
  const [groupedLayers, setGroupedLayers] = useState<GroupedLayers | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null)
  const [areaMode, setAreaMode] = useState<'africa' | 'country'>('africa')
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [clippedCountries, setClippedCountries] = useState<string[]>([])
  const [clippedLayerInfo, setClippedLayerInfo] = useState<{ clippedLayerName: string; workspace: string } | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<number | string>>(new Set())
  const [isLoadingLayers, setIsLoadingLayers] = useState(true)
  const [isLoadingClipped, setIsLoadingClipped] = useState(false)
  const [isLoadingCountryClip, setIsLoadingCountryClip] = useState(false)
  const [copied, setCopied] = useState(false)
  const [layerSearch, setLayerSearch] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [layersRes, countriesRes] = await Promise.all([
          authFetch('/clip/layers', { skipAuth: true }),
          authFetch('/countries', { skipAuth: true }),
        ])

        if (layersRes.ok) {
          const data = await layersRes.json()
          setGroupedLayers(data)
          if (data.groups && data.groups.length > 0) {
            setExpandedGroups(new Set([data.groups[0].id]))
          }
        }

        if (countriesRes.ok) {
          const data = await countriesRes.json()
          setCountries(data)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoadingLayers(false)
      }
    }
    fetchData()
  }, [])

  // When a country is selected, fetch the real clipped layer name from backend
  const handleSelectCountry = useCallback(async function (countryFile: string) {
    setSelectedCountry(countryFile)
    if (!selectedLayer || !countryFile) {
      setClippedLayerInfo(null)
      return
    }
    setIsLoadingCountryClip(true)
    setClippedLayerInfo(null)
    try {
      const res = await authFetch('/clip/country', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ countryFile: countryFile, layerId: selectedLayer.id }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'success' && data.cached && data.clippedLayerName) {
          const full = data.clippedLayerName
          const ws = full.includes(':') ? full.split(':')[0] : ''
          setClippedLayerInfo({ clippedLayerName: full, workspace: ws })
        } else {
          setClippedLayerInfo(null)
        }
      } else if (res.status === 401) {
        setClippedLayerInfo({ clippedLayerName: '', workspace: '__auth_required__' })
      } else {
        setClippedLayerInfo(null)
      }
    } catch (err) {
      console.error('Failed to fetch clipped layer info:', err)
      setClippedLayerInfo(null)
    } finally {
      setIsLoadingCountryClip(false)
    }
  }, [selectedLayer])

  const handleSelectLayer = useCallback(async (layer: Layer) => {
    setSelectedLayer(layer)
    setAreaMode('africa')
    setSelectedCountry('')
    setClippedLayerInfo(null)
    setIsLoadingClipped(true)
    try {
      const res = await authFetch('/clip/layer/' + layer.id + '/clipped-countries', { skipAuth: true })
      if (res.ok) {
        const data = await res.json()
        setClippedCountries(data.clipped || [])
      }
    } catch (error) {
      console.error('Failed to fetch clipped countries:', error)
      setClippedCountries([])
    } finally {
      setIsLoadingClipped(false)
    }
  }, [])

  const toggleGroup = (groupId: number | string) => {
    setExpandedGroups(function (prev) {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const groupMatchesSearch = function (group: Group, search: string): boolean {
    const lower = search.toLowerCase()
    if (group.name.toLowerCase().includes(lower)) return true
    if (group.layers.some(function (l) { return l.name.toLowerCase().includes(lower) })) return true
    return (group.children || []).some(function (c) { return groupMatchesSearch(c, search) })
  }

  const layerMatchesSearch = function (layer: Layer, search: string): boolean {
    return layer.name.toLowerCase().includes(search.toLowerCase())
  }

  const getSnippetConfig = function (): { wmsUrl: string; layerGeoserverName: string; areaLabel: string } | null {
    if (!selectedLayer) return null

    if (areaMode === 'africa') {
      return {
        wmsUrl: BASE_URL + selectedLayer.wmsUrl,
        layerGeoserverName: selectedLayer.geoserver_name,
        areaLabel: selectedLayer.name + ' - Africa',
      }
    }

    if (!selectedCountry) return null
    if (!clippedLayerInfo) return null

    // Auth required but user not logged in
    if (clippedLayerInfo.workspace === '__auth_required__') {
      return { wmsUrl: '', layerGeoserverName: '', areaLabel: '__auth_required__' }
    }

    if (!clippedLayerInfo.clippedLayerName) return null

    const countryName = selectedCountry.replace('.geojson', '')
    const capitalizedName = countryName.charAt(0).toUpperCase() + countryName.slice(1)
    const workspace = clippedLayerInfo.workspace

    return {
      wmsUrl: BASE_URL + '/api/clip/wms?workspace=' + workspace,
      layerGeoserverName: clippedLayerInfo.clippedLayerName,
      areaLabel: selectedLayer.name + ' - ' + capitalizedName,
    }
  }

  const snippetConfig = getSnippetConfig()
  const snippet = snippetConfig
    ? generateLeafletSnippet(snippetConfig.wmsUrl, snippetConfig.layerGeoserverName, snippetConfig.areaLabel)
    : ''

  const handleCopy = async function () {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(function () { setCopied(false) }, 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = snippet
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(function () { setCopied(false) }, 2000)
    }
  }

  const allLayers = groupedLayers
    ? collectLayers(groupedLayers.groups).concat(groupedLayers.ungroupedLayers)
    : []

  const availableCountries = countries.filter(function (c) {
    return clippedCountries.includes(c.name)
  })

  const renderGroup = function (group: Group, depth: number = 0) {
    if (layerSearch && !groupMatchesSearch(group, layerSearch)) return null

    const isExpanded = expandedGroups.has(group.id)
    const hasContent = group.layers.length > 0 || (group.children && group.children.length > 0)
    const padLeft = depth * 12 + 12
    const layerPadLeft = depth * 12 + 28

    return (
      <div key={group.id}>
        {hasContent && (
          <button
            onClick={function () { toggleGroup(group.id) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition rounded-md"
            style={{ paddingLeft: padLeft + 'px' }}
          >
            <svg
              className={
                'w-4 h-4 text-gray-500 transition-transform flex-shrink-0' +
                (isExpanded ? ' rotate-90' : '')
              }
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-semibold text-gray-300">{group.name}</span>
            <span className="text-xs text-gray-600 ml-auto">{countAllLayers(group)}</span>
          </button>
        )}

        {isExpanded && (
          <div>
            {group.children && group.children.map(function (child) {
              return renderGroup(child, depth + 1)
            })}

            {group.layers
              .filter(function (l) { return !layerSearch || layerMatchesSearch(l, layerSearch) })
              .map(function (layer) {
                const isActive = selectedLayer && selectedLayer.id === layer.id
                const activeClass = isActive
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                return (
                  <button
                    key={layer.id}
                    onClick={function () { handleSelectLayer(layer) }}
                    className={'w-full flex items-center px-3 py-2 text-left text-sm transition rounded-md ' + activeClass}
                    style={{ paddingLeft: layerPadLeft + 'px' }}
                  >
                    <span className="truncate">{layer.name}</span>
                  </button>
                )
              })}
          </div>
        )}
      </div>
    )
  }

  const chevronRight = (
    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  )

  const checkIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )

  const copyIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white">
      {/* Hero Section */}
      <div className="border-b border-white/10 bg-gradient-to-b from-green-950/20 to-transparent">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 text-xs font-semibold bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                API
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-3" style={{ fontFamily: 'Georgia, serif' }}>
              WMS Layers API
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
              Access our geospatial WMS layers programmatically. Browse available layers, pick a coverage area,
              and get ready-to-use code snippets for your mapping applications.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <div className="bg-[#111916] border border-white/10 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="px-3 py-3 border-b border-white/10">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    1. Choose a Layer
                  </h3>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-white/10">
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search layers..."
                      value={layerSearch}
                      onChange={function (e) { setLayerSearch(e.target.value) }}
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition"
                    />
                  </div>
                </div>

                {/* Layer List */}
                <div className="max-h-96 overflow-y-auto">
                  {isLoadingLayers ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-gray-600 border-t-green-400 rounded-full animate-spin" />
                    </div>
                  ) : groupedLayers && allLayers.length > 0 ? (
                    <div className="p-2 space-y-1">
                      {groupedLayers.groups.map(function (group) {
                        return renderGroup(group)
                      })}

                      {groupedLayers.ungroupedLayers.length > 0 && (
                        <React.Fragment>
                          {!layerSearch && (
                            <button
                              onClick={function () { toggleGroup('ungrouped') }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition rounded-md"
                            >
                              <svg
                                className={
                                  'w-4 h-4 text-gray-500 transition-transform flex-shrink-0' +
                                  (expandedGroups.has('ungrouped') ? ' rotate-90' : '')
                                }
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                              <span className="text-sm font-semibold text-gray-500">Other Layers</span>
                              <span className="text-xs text-gray-600 ml-auto">
                                {groupedLayers.ungroupedLayers.length}
                              </span>
                            </button>
                          )}
                          {expandedGroups.has('ungrouped') &&
                            groupedLayers.ungroupedLayers
                              .filter(function (l) { return !layerSearch || layerMatchesSearch(l, layerSearch) })
                              .map(function (layer) {
                                const isActive = selectedLayer && selectedLayer.id === layer.id
                                const activeClass = isActive
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                                return (
                                  <button
                                    key={layer.id}
                                    onClick={function () { handleSelectLayer(layer) }}
                                    className={
                                      'w-full flex items-center px-3 py-2 text-left text-sm transition rounded-md ml-5 ' +
                                      activeClass
                                    }
                                  >
                                    <span className="truncate">{layer.name}</span>
                                  </button>
                                )
                              })}
                        </React.Fragment>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 px-4">
                      <p className="text-gray-500 text-sm">No layers available</p>
                    </div>
                  )}
                </div>

                {/* Layer Count */}
                <div className="px-3 py-2 border-t border-white/10">
                  <span className="text-xs text-gray-600">{allLayers.length} layers available</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Panel */}
          <div className="lg:col-span-8">
            {!selectedLayer ? (
              <div className="flex items-center justify-center min-h-96 border border-white/10 rounded-xl bg-[#111916]">
                <div className="text-center px-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">Select a Layer</h3>
                  <p className="text-sm text-gray-600 max-w-sm">
                    Choose a layer from the sidebar to view WMS endpoints and get code snippets for your application.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected Layer Header */}
                <div className="flex items-center justify-between bg-[#111916] border border-white/10 rounded-xl px-6 py-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedLayer.name}</h2>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{selectedLayer.geoserver_name}</p>
                  </div>
                  <div className="px-3 py-1 text-xs bg-green-500/15 text-green-400 rounded-full border border-green-500/30">
                    WMS
                  </div>
                </div>

                {/* Area Selection */}
                <div className="bg-[#111916] border border-white/10 rounded-xl px-6 py-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4">2. Select Coverage Area</h3>
                  <div className="space-y-3">
                    {/* Africa */}
                    <button
                      onClick={function () { setAreaMode('africa'); setSelectedCountry('') }}
                      className={
                        'w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition ' +
                        (areaMode === 'africa'
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20')
                      }
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
                          />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className={'text-sm font-medium ' + (areaMode === 'africa' ? 'text-green-400' : 'text-gray-300')}>
                          All Africa
                        </div>
                        <div className="text-xs text-gray-500">Full continent coverage</div>
                      </div>
                      {areaMode === 'africa' && (
                        <span className="ml-auto">{chevronRight}</span>
                      )}
                    </button>

                    {/* Country */}
                    <div>
                      <button
                        onClick={function () { setAreaMode('country') }}
                        className={
                          'w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition ' +
                          (areaMode === 'country'
                            ? 'border-green-500/50 bg-green-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20')
                        }
                      >
                        <div
                          className={
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ' +
                            (areaMode === 'country' ? 'bg-green-500/15' : 'bg-white/5')
                          }
                        >
                          <svg
                            className={'w-4 h-4 ' + (areaMode === 'country' ? 'text-green-400' : 'text-gray-500')}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 text-left">
                          <div className={'text-sm font-medium ' + (areaMode === 'country' ? 'text-green-400' : 'text-gray-300')}>
                            Specific Country
                          </div>
                          <div className="text-xs text-gray-500">
                            {isLoadingClipped
                              ? 'Checking available countries...'
                              : availableCountries.length > 0
                                ? availableCountries.length + ' countries available'
                                : 'No clipped countries available for this layer'}
                          </div>
                        </div>
                        {areaMode === 'country' && (
                          <span className="flex-shrink-0">{chevronRight}</span>
                        )}
                      </button>

                      {/* Country dropdown */}
                      <div className="mt-2 ml-11">
                        {areaMode === 'country' && availableCountries.length > 0 && (
                          <select
                            value={selectedCountry}
                            onChange={function (e) { handleSelectCountry(e.target.value) }}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition appearance-none cursor-pointer [&>option]:text-black [&>option]:bg-white"
                          >
                            <option value="" disabled>
                              Choose a country...
                            </option>
                            {availableCountries.map(function (country) {
                              return (
                                <option key={country.file} value={country.file}>
                                  {country.name}
                                </option>
                              )
                            })}
                          </select>
                        )}
                        {areaMode === 'country' && isLoadingCountryClip && selectedCountry && (
                          <div className="flex items-center gap-2 py-2">
                            <div className="w-4 h-4 border-2 border-gray-600 border-t-green-400 rounded-full animate-spin" />
                            <span className="text-xs text-gray-500">Looking up clipped layer...</span>
                          </div>
                        )}
                        {areaMode === 'country' && !isLoadingCountryClip && selectedCountry && !clippedLayerInfo && (
                          <p className="text-xs text-yellow-500/80 py-2">
                            No cached clip found for this layer/country combination.
                          </p>
                        )}
                        {areaMode === 'country' && !isLoadingCountryClip && selectedCountry && clippedLayerInfo && clippedLayerInfo.workspace === '__auth_required__' && (
                          <p className="text-xs text-yellow-500/80 py-2">
                            Please <a href="/login" className="text-green-400 underline hover:text-green-300">sign in</a> to view country-specific layer details.
                          </p>
                        )}
                        {areaMode === 'country' && !isLoadingClipped && availableCountries.length === 0 && !selectedCountry && (
                          <p className="text-xs text-gray-600 py-2">
                            No pre-clipped data available for this layer. Only &quot;All Africa&quot; coverage is available.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Code Snippet */}
                {snippetConfig && snippetConfig.areaLabel !== '__auth_required__' && (
                  <div className="bg-[#111916] border border-white/10 rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-gray-300">3. Code Snippet</h3>
                        <span className="text-xs px-2 py-1 bg-white/5 text-gray-500 rounded">Leaflet</span>
                      </div>
                      <button
                        onClick={handleCopy}
                        className={
                          'flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md border transition ' +
                          (copied
                            ? 'bg-green-500/15 border-green-500/30 text-green-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20')
                        }
                      >
                        {copied ? (
                          <span className="flex items-center gap-1">
                            {checkIcon}
                            <span>Copied</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            {copyIcon}
                            <span>Copy</span>
                          </span>
                        )}
                      </button>
                    </div>

                    {/* WMS Info */}
                    <div className="px-6 py-3 bg-white/5 border-b border-white/5 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-14 flex-shrink-0">Endpoint:</span>
                        <code className="text-xs text-green-400 font-mono break-all">{snippetConfig.wmsUrl}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-14 flex-shrink-0">Layer:</span>
                        <code className="text-xs text-green-400 font-mono">{snippetConfig.layerGeoserverName}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-14 flex-shrink-0">Area:</span>
                        <code className="text-xs text-gray-400 font-mono">{snippetConfig.areaLabel}</code>
                      </div>
                    </div>

                    {/* Code */}
                    <pre className="p-6 overflow-x-auto text-sm leading-relaxed">
                      <code className="text-gray-300 font-mono text-xs">{snippet}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}