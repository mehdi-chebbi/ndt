'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

interface ReportToView {
  id: number
  original_layer: string
  original_colormap: string
  invalid_area_polygon: any
  comment: string
  status: string
  reporter_name: string
  created_at: string
}

interface LayerMetadata {
  display_name: string
  description: string
}

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>
  ),
})

function ReportMapPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [reportToView, setReportToView] = useState<ReportToView | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [layerMetadata, setLayerMetadata] = useState<LayerMetadata | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    const user = JSON.parse(userData)
    if (user.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    const viewReportId = searchParams.get('viewReport')

    if (!viewReportId) {
      setReportError('Missing report id')
      return
    }

    const fetchReportAndLayer = async () => {
      setReportLoading(true)
      setReportError('')

      try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Not authenticated')

        const reportResponse = await fetch(`/api/reports/${viewReportId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!reportResponse.ok) {
          const error = await reportResponse.json()
          throw new Error(error.error || 'Failed to fetch report')
        }

        const reportData = await reportResponse.json()
        setReportToView(reportData.report)

        const layerResponse = await fetch(`/api/layers/name/${encodeURIComponent(reportData.report.original_layer)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (layerResponse.ok) {
          const layerData = await layerResponse.json()
          setLayerMetadata({
            display_name: layerData.layer?.display_name || reportData.report.original_layer,
            description: layerData.layer?.description || 'No description available',
          })
        } else {
          setLayerMetadata({
            display_name: reportData.report.original_layer,
            description: 'No description available',
          })
        }
      } catch (err: any) {
        console.error('Error fetching report map data:', err)
        setReportError(err.message || 'Failed to load report map')
      } finally {
        setReportLoading(false)
      }
    }

    fetchReportAndLayer()
  }, [searchParams])

  const submittedDate = useMemo(() => {
    if (!reportToView?.created_at) return '-'
    return new Date(reportToView.created_at).toLocaleString()
  }, [reportToView?.created_at])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0 overflow-hidden">
      {reportLoading ? (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading report map...</p>
          </div>
        </div>
      ) : reportError || !reportToView ? (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <div className="text-center bg-white p-8 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Report</h3>
            <p className="text-gray-500 mb-4">{reportError || 'Report not found'}</p>
            <button
              onClick={() => router.push('/reports')}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Back to Reports
            </button>
          </div>
        </div>
      ) : (
        <MapComponent
          reportToView={reportToView}
          readonlyReportMode
          reportSidebarContent={(
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Report Map View</h2>
                <p className="text-sm text-gray-500">Read-only map preview for this report.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Layer Name</p>
                  <p className="text-sm font-semibold text-gray-900">{layerMetadata?.display_name || reportToView.original_layer}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Description</p>
                  <p className="text-sm text-gray-700">{layerMetadata?.description || 'No description available'}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Submitted On</p>
                  <p className="text-sm text-gray-900">{submittedDate}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Submitted By</p>
                  <p className="text-sm text-gray-900">{reportToView.reporter_name}</p>
                </div>
              </div>

              <button
                onClick={() => router.push('/reports')}
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Back to Reports
              </button>
            </div>
          )}
        />
      )}
    </div>
  )
}

export default function ReportMapPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ReportMapPageContent />
    </Suspense>
  )
}
