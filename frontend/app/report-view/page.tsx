'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

interface ReportData {
  id: number
  original_layer: string
  invalid_area_polygon: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  comment: string
  reporter_name: string
  reporter_email: string
  status: 'invalid' | 'fixed'
  created_at: string
}

interface Layer {
  id: number
  name: string
  geoserver_name: string
  layerName: string
  wmsUrl: string
  bounds: [[number, number], [number, number]]
}

// Dynamically import the map component to avoid SSR issues with Leaflet
const ReportMapComponent = dynamic(() => import('./ReportMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>
  ),
})

function ReportViewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [report, setReport] = useState<ReportData | null>(null)
  const [layer, setLayer] = useState<Layer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const viewReportId = searchParams.get('viewReport')

    if (!viewReportId) {
      router.push('/reports')
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError('')

      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/login')
          return
        }

        // Fetch report
        const reportRes = await fetch(`/api/reports/${viewReportId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })

        if (!reportRes.ok) {
          throw new Error('Failed to fetch report')
        }

        const reportData = await reportRes.json()
        setReport(reportData.report)

        // Fetch layers to find the one referenced in the report
        const layersRes = await fetch('/api/clip/layers', {
          headers: { 'Authorization': `Bearer ${token}` },
        })

        if (layersRes.ok) {
          const layersData = await layersRes.json()

          // Find layer by geoserver_name
          const findLayer = (groups: any[], ungrouped: any[]): Layer | null => {
            for (const group of groups) {
              const found = group.layers?.find((l: Layer) => l.geoserver_name === reportData.report.original_layer)
              if (found) return found
              if (group.children?.length > 0) {
                const childFound = findLayer(group.children, [])
                if (childFound) return childFound
              }
            }
            return ungrouped.find((l: Layer) => l.geoserver_name === reportData.report.original_layer) || null
          }

          const foundLayer = findLayer(layersData.groups || [], layersData.ungroupedLayers || [])
          setLayer(foundLayer)
        }
      } catch (err: any) {
        console.error('Error fetching data:', err)
        setError(err.message || 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [searchParams, router])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Report</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/reports')}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Back to Reports
          </button>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Report Not Found</h3>
          <button
            onClick={() => router.push('/reports')}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Back to Reports
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0 flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900">Report #{report.id}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              report.status === 'invalid'
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {report.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Layer Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Layer
            </label>
            <p className="text-base font-semibold text-gray-900 capitalize">
              {layer?.name || report.original_layer || 'Unknown'}
            </p>
          </div>

          {/* Report Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Report Comment
            </label>
            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200">
              {report.comment || 'No comment provided'}
            </p>
          </div>

          {/* Reported By */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Reported By
            </label>
            <p className="text-sm font-medium text-gray-900">{report.reporter_name}</p>
            <p className="text-xs text-gray-500">{report.reporter_email}</p>
          </div>

          {/* Date Reported */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Date Reported
            </label>
            <p className="text-sm text-gray-900">{formatDate(report.created_at)}</p>
          </div>

          {/* Legend */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-500 mb-2">
              Map Legend
            </label>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 border-2 border-red-600 bg-red-600/30 rounded" style={{ borderStyle: 'dashed' }}></div>
              <span className="text-sm text-gray-700">Reported Invalid Area</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={() => router.push('/reports')}
            className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition font-medium"
          >
            Back to Reports
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 h-full relative">
        <ReportMapComponent report={report} layer={layer} />

        {/* Report indicator overlay */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">
            Viewing Report #{report.id}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            report.status === 'invalid' ? 'bg-red-800' : 'bg-green-600'
          }`}>
            {report.status.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ReportViewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ReportViewContent />
    </Suspense>
  )
}
