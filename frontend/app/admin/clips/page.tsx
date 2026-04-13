'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { api, authFetch } from '@/lib/authFetch'
import { useAuth } from '@/contexts/AuthContext'

interface LayerClipStatus {
  id: number
  geoserver_name: string
  display_name: string
  file_path: string
  style_name: string | null
  clippedCountries: number
  totalCountries: number
  totalSizeBytes: number
  fullyClipped: boolean
  isRunning: boolean
  canClip: boolean
}

interface BatchStatusResponse {
  layers: LayerClipStatus[]
  totalCountries: number
}

interface ClippedCountriesResponse {
  total: number
  clipped: string[]
  remaining: string[]
}

// Format bytes to human-readable string
function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / Math.pow(k, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export default function ClipManagementPage() {
  const { user, loading: authLoading } = useAuth()
  const [layers, setLayers] = useState<LayerClipStatus[]>([])
  const [totalCountries, setTotalCountries] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clippingLayerId, setClippingLayerId] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info')

  // Country detail modal
  const [modalLayer, setModalLayer] = useState<LayerClipStatus | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalData, setModalData] = useState<ClippedCountriesResponse | null>(null)
  const [countrySearch, setCountrySearch] = useState('')

  // Delete states
  const [deletingCountry, setDeletingCountry] = useState<string | null>(null)
  const [deletingLayerId, setDeletingLayerId] = useState<number | null>(null)

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{
    type: 'country' | 'layer'
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      window.location.href = '/login'
      return
    }

    if (!authLoading && user && user.role === 'admin') {
      fetchStatus()
    }
  }, [authLoading, user])

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/clip/batch-status')
      if (!response.ok) {
        throw new Error('Failed to fetch clip status')
      }
      const data: BatchStatusResponse = await response.json()
      setLayers(data.layers)
      setTotalCountries(data.totalCountries)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh if any layer is running
  useEffect(() => {
    const anyRunning = layers.some(l => l.isRunning)
    if (!anyRunning) return

    const interval = setInterval(() => {
      fetchStatus()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [layers, fetchStatus])

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToastMessage(message)
    setToastType(type)
    setTimeout(() => setToastMessage(''), 5000)
  }

  const handleStartClip = async (layer: LayerClipStatus) => {
    if (!layer.canClip) {
      showToast('This layer has no style assigned. Sync layers first.', 'error')
      return
    }

    if (layer.isRunning) {
      showToast('Batch already in progress for this layer.', 'info')
      return
    }

    setClippingLayerId(layer.id)
    setError('')

    try {
      const response = await api.post('/clip/batch', { layerId: layer.id })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to start batch')
      }

      showToast(`Batch clipping started: ${layer.display_name} (${data.totalCountries} countries)`, 'success')

      // Refresh to show running state
      fetchStatus()
    } catch (err: any) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setClippingLayerId(null)
    }
  }

  const handleOpenCountryModal = async (layer: LayerClipStatus) => {
    setModalLayer(layer)
    setModalData(null)
    setCountrySearch('')
    setModalLoading(true)

    try {
      const response = await api.get(`/clip/layer/${layer.id}/clipped-countries`)
      if (!response.ok) {
        throw new Error('Failed to fetch country details')
      }
      const data: ClippedCountriesResponse = await response.json()
      setModalData(data)
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setModalLoading(false)
    }
  }

  const handleCloseModal = () => {
    setModalLayer(null)
    setModalData(null)
    setCountrySearch('')
  }

  const handleDeleteCountry = (layer: LayerClipStatus, country: string) => {
    setConfirmAction({
      type: 'country',
      title: 'Delete Clipped Layer',
      message: `Remove the clipped layer for "${country}" from ${layer.display_name}? This will unpublish it from GeoServer.`,
      onConfirm: async () => {
        setConfirmAction(null)
        setDeletingCountry(country)
        try {
          const response = await authFetch('/clip/clipped-layer?XTransformPort=3001', {
            method: 'DELETE',
            body: JSON.stringify({ layerId: layer.id, countryFile: `${country}.geojson` }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Delete failed')
          showToast(`Deleted clipped layer for ${country}`, 'success')
          // Refresh modal data
          handleOpenCountryModal(layer)
          fetchStatus()
        } catch (err: any) {
          showToast(err.message, 'error')
        } finally {
          setDeletingCountry(null)
        }
      },
    })
  }

  const handleDeleteAllForLayer = (layer: LayerClipStatus) => {
    const sizeStr = formatBytes(layer.totalSizeBytes)
    setConfirmAction({
      type: 'layer',
      title: 'Delete All Clipped Layers',
      message: `Remove ALL ${layer.clippedCountries} clipped layers (${sizeStr}) for "${layer.display_name}" from GeoServer? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmAction(null)
        setDeletingLayerId(layer.id)
        try {
          const response = await authFetch('/clip/batch-delete?XTransformPort=3001', {
            method: 'DELETE',
            body: JSON.stringify({ layerId: layer.id }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Delete failed')

          if (data.status === 'partial') {
            showToast(data.message, 'warning')
          } else {
            showToast(`Deleted all clipped layers for ${layer.display_name}`, 'success')
          }
          fetchStatus()
          // Close modal if open for this layer
          if (modalLayer?.id === layer.id) handleCloseModal()
        } catch (err: any) {
          showToast(err.message, 'error')
        } finally {
          setDeletingLayerId(null)
        }
      },
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  const fullyClippedCount = layers.filter(l => l.fullyClipped).length
  const partiallyClippedCount = layers.filter(l => l.clippedCountries > 0 && !l.fullyClipped).length
  const notClippedCount = layers.filter(l => l.clippedCountries === 0).length
  const runningCount = layers.filter(l => l.isRunning).length
  const totalStorageBytes = layers.reduce((sum, l) => sum + (l.totalSizeBytes || 0), 0)

  const getProgressPercentage = (layer: LayerClipStatus) => {
    if (layer.totalCountries === 0) return 0
    return Math.round((layer.clippedCountries / layer.totalCountries) * 100)
  }

  // Filter countries for the modal search
  const filteredClipped = modalData?.clipped.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  ) || []
  const filteredRemaining = modalData?.remaining.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  ) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clip Management</h1>
              <p className="text-gray-600 mt-1">Pre-clip rasters to country boundaries for instant loading</p>
            </div>
          </div>
          <button
            onClick={fetchStatus}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 ${
            toastType === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            toastType === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
            toastType === 'warning' ? 'bg-amber-50 border border-amber-200 text-amber-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            {toastType === 'success' && (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toastType === 'error' && (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toastType === 'warning' && (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
            {toastType === 'info' && (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <p className="text-gray-600 text-xs sm:text-sm">Total Rasters</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{layers.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <p className="text-gray-600 text-xs sm:text-sm">Fully Clipped</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">{fullyClippedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <p className="text-gray-600 text-xs sm:text-sm">Partially Clipped</p>
            <p className="text-2xl sm:text-3xl font-bold text-amber-600">{partiallyClippedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <p className="text-gray-600 text-xs sm:text-sm">Not Clipped</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-600">{notClippedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <p className="text-gray-600 text-xs sm:text-sm">Running</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{runningCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <p className="text-gray-600 text-xs sm:text-sm">Total Storage</p>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600">{formatBytes(totalStorageBytes)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Raster Layers
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({totalCountries} countries per raster)
              </span>
            </h2>
            {runningCount > 0 && (
              <div className="flex items-center gap-2 text-blue-600">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">Auto-refreshing every 5s</span>
              </div>
            )}
          </div>

          {layers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-600">No clippable layers found</p>
              <p className="text-gray-400 text-sm mt-1">Layers need a file_path to be clip-able</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Layer
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Storage
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {layers.map((layer) => {
                    const progress = getProgressPercentage(layer)
                    return (
                      <tr key={layer.id} className={`hover:bg-gray-50 ${layer.isRunning ? 'bg-blue-50' : ''}`}>
                        {/* Layer Name */}
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{layer.display_name}</div>
                            <div className="text-xs text-gray-500">{layer.geoserver_name}</div>
                          </div>
                        </td>

                        {/* Progress - Clickable */}
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenCountryModal(layer)}
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition group"
                            title="Click to view country details"
                          >
                            <span className="text-sm font-medium text-gray-700 min-w-[60px]">
                              {layer.clippedCountries}/{layer.totalCountries}
                            </span>
                            <div className="w-24 sm:w-32 bg-gray-200 rounded-full h-2 relative">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  layer.fullyClipped ? 'bg-green-500' :
                                  layer.clippedCountries > 0 ? 'bg-amber-500' :
                                  'bg-gray-300'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{progress}%</span>
                            <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          {layer.isRunning ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Clipping...
                            </span>
                          ) : layer.fullyClipped ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Complete
                            </span>
                          ) : layer.clippedCountries > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                              Partial
                            </span>
                          ) : !layer.canClip ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                              No Style
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              Not Clipped
                            </span>
                          )}
                        </td>

                        {/* Storage */}
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          {layer.clippedCountries > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">{formatBytes(layer.totalSizeBytes)}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {layer.isRunning ? (
                              <span className="text-sm text-blue-600 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Processing...
                              </span>
                            ) : (
                              <>
                                {!layer.fullyClipped && (
                                  <button
                                    onClick={() => handleStartClip(layer)}
                                    disabled={clippingLayerId === layer.id || !layer.canClip}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition flex items-center gap-1.5 ${
                                      !layer.canClip
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-900 text-white hover:bg-gray-800'
                                    } ${clippingLayerId === layer.id ? 'opacity-50' : ''}`}
                                    title={!layer.canClip ? 'Sync layer to assign a style first' : `Clip remaining countries (${layer.totalCountries - layer.clippedCountries} left)`}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                                    </svg>
                                    <span className="hidden sm:inline">{layer.clippedCountries > 0 ? 'Clip Remaining' : 'Clip All'}</span>
                                    <span className="sm:hidden">Clip</span>
                                  </button>
                                )}
                                {layer.clippedCountries > 0 && (
                                  <button
                                    onClick={() => handleDeleteAllForLayer(layer)}
                                    disabled={deletingLayerId === layer.id || layer.isRunning}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition flex items-center gap-1.5 ${
                                      deletingLayerId === layer.id
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                    }`}
                                    title={`Delete all ${layer.clippedCountries} clipped layers`}
                                  >
                                    {deletingLayerId === layer.id ? (
                                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    )}
                                    <span className="hidden sm:inline">Delete All</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">How it works</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>- Click the progress bar to see which countries are done and which remain</li>
            <li>- Clicking &quot;Clip All&quot; clips the raster for all {totalCountries} countries using the clip-service</li>
            <li>- Clicking &quot;Clip Remaining&quot; only processes countries not yet in cache</li>
            <li>- Large countries (Algeria, DR Congo, Sudan, etc.) may take 10-15 minutes each</li>
            <li>- The page auto-refreshes every 5 seconds while a batch is running</li>
            <li>- If interrupted, click Clip again to resume from where it left off</li>
            <li>- Use &quot;Delete All&quot; to unpublish clipped layers from GeoServer and clear the cache</li>
            <li>- In the country detail modal, you can delete individual country clips</li>
          </ul>
        </div>
      </main>

      {/* Country Detail Modal */}
      {modalLayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalLayer.display_name}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {modalLayer.clippedCountries} of {modalLayer.totalCountries} countries clipped
                  {modalLayer.totalSizeBytes > 0 && (
                    <span className="ml-2 text-purple-600 font-medium">
                      ({formatBytes(modalLayer.totalSizeBytes)})
                    </span>
                  )}
                </p>
              </div>
              <button onClick={handleCloseModal} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : modalData ? (
                <>
                  {/* Progress bar in modal */}
                  <div className="mb-5">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          modalLayer.fullyClipped ? 'bg-green-500' :
                          modalLayer.clippedCountries > 0 ? 'bg-amber-500' :
                          'bg-gray-300'
                        }`}
                        style={{ width: `${getProgressPercentage(modalLayer)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-xs text-gray-500">
                      <span>{getProgressPercentage(modalLayer)}% complete</span>
                      <span>{modalData.total - modalLayer.clippedCountries} remaining</span>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="mb-4">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Search countries..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Clipped Countries */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Clipped ({countrySearch ? filteredClipped.length : modalData.clipped.length})
                      </span>
                      {modalData.clipped.length > 0 && !modalLayer.isRunning && (
                        <button
                          onClick={() => handleDeleteAllForLayer(modalLayer)}
                          disabled={deletingLayerId === modalLayer.id}
                          className="text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition"
                        >
                          {deletingLayerId === modalLayer.id ? 'Deleting...' : 'Delete All'}
                        </button>
                      )}
                    </h4>
                    <div className="max-h-48 overflow-y-auto border border-green-200 rounded-lg bg-green-50/50">
                      {filteredClipped.length === 0 ? (
                        <p className="text-sm text-gray-400 py-3 px-3">No matches</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 p-2">
                          {filteredClipped.map(country => (
                            <span key={country} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-md text-xs font-medium group/clip">
                              {deletingCountry === country ? (
                                <svg className="w-3 h-3 animate-spin text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {country}
                                  {!modalLayer.isRunning && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteCountry(modalLayer, country) }}
                                      className="ml-0.5 text-green-400 hover:text-red-600 transition"
                                      title={`Delete clip for ${country}`}
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Remaining Countries */}
                  {filteredRemaining.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Remaining ({countrySearch ? filteredRemaining.length : modalData.remaining.length})
                      </h4>
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="flex flex-wrap gap-1.5 p-2">
                          {filteredRemaining.map(country => (
                            <span key={country} className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                              {country}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">Failed to load country details</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{confirmAction.title}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">{confirmAction.message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction.onConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600">
            &copy; 2025 Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
