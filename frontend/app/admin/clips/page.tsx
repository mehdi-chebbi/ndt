'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/authFetch'
import { useAuth } from '@/contexts/AuthContext'

interface LayerClipStatus {
  id: number
  geoserver_name: string
  display_name: string
  file_path: string
  style_name: string | null
  clippedCountries: number
  totalCountries: number
  fullyClipped: boolean
  isRunning: boolean
  canClip: boolean
}

interface BatchStatusResponse {
  layers: LayerClipStatus[]
  totalCountries: number
}

export default function ClipManagementPage() {
  const { user, loading: authLoading } = useAuth()
  const [layers, setLayers] = useState<LayerClipStatus[]>([])
  const [totalCountries, setTotalCountries] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clippingLayerId, setClippingLayerId] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info')

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

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
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

  const getProgressPercentage = (layer: LayerClipStatus) => {
    if (layer.totalCountries === 0) return 0
    return Math.round((layer.clippedCountries / layer.totalCountries) * 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            {toastType === 'success' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toastType === 'error' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toastType === 'info' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Total Rasters</p>
            <p className="text-3xl font-bold text-gray-900">{layers.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Fully Clipped</p>
            <p className="text-3xl font-bold text-green-600">{fullyClippedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Partially Clipped</p>
            <p className="text-3xl font-bold text-amber-600">{partiallyClippedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Not Clipped</p>
            <p className="text-3xl font-bold text-red-600">{notClippedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm">Running</p>
            <p className="text-3xl font-bold text-blue-600">{runningCount}</p>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Layer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{layer.display_name}</div>
                            <div className="text-xs text-gray-500">{layer.geoserver_name}</div>
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 min-w-[60px]">
                              {layer.clippedCountries}/{layer.totalCountries}
                            </span>
                            <div className="w-32 bg-gray-200 rounded-full h-2">
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
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4 whitespace-nowrap">
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

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {layer.isRunning ? (
                            <span className="text-sm text-blue-600 font-medium flex items-center gap-1">
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Processing...
                            </span>
                          ) : layer.fullyClipped ? (
                            <span className="text-sm text-green-600 font-medium">Up to date</span>
                          ) : (
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
                              {layer.clippedCountries > 0 ? 'Clip Remaining' : 'Clip All'}
                            </button>
                          )}
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
            <li>- Clicking &quot;Clip All&quot; clips the raster for all {totalCountries} countries using the clip-service</li>
            <li>- Clicking &quot;Clip Remaining&quot; only processes countries not yet in cache</li>
            <li>- Large countries (Algeria, DR Congo, Sudan, etc.) may take 10-15 minutes each</li>
            <li>- The page auto-refreshes every 5 seconds while a batch is running</li>
            <li>- If interrupted, click Clip again to resume from where it left off</li>
            <li>- Clipped TIFFs are saved to <code className="bg-gray-200 px-1 rounded text-xs">/data/tiffs/clipped/{'{raster_name}'}/</code></li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600">
            &copy; 2025 Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
