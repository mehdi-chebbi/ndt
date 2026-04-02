'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AICopilot from '@/components/AICopilot'
import TutorialOverlay from '@/components/tutorial/TutorialOverlay'
import { useAuth } from '@/contexts/AuthContext'
import { authFetch } from '@/lib/authFetch'

interface ReportToView {
  id: number
  original_layer: string
  original_colormap: string
  invalid_area_polygon: any
  comment: string
  status: string
}

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>
  ),
})

function MapPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading, isAuthenticated, updateUser } = useAuth()
  const [reportToView, setReportToView] = useState<ReportToView | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [tutorialActive, setTutorialActive] = useState(false)

  // Auto-launch tutorial if autoTutorial param is present and user hasn't completed it
  useEffect(() => {
    const autoTutorial = searchParams.get('autoTutorial')
    if (autoTutorial === 'true' && user && !user.tutorial_completed) {
      // Small delay so the map and sidebar fully render first
      const timer = setTimeout(() => setTutorialActive(true), 500)
      return () => clearTimeout(timer)
    }
  }, [searchParams, user])

  // Mark tutorial as completed on the backend and update local state
  const markTutorialCompleted = useCallback(async () => {
    setTutorialActive(false)
    try {
      await authFetch('/users/me/tutorial', {
        method: 'PATCH',
        body: JSON.stringify({ tutorial_completed: true }),
      })
      updateUser({ tutorial_completed: true })
    } catch (err) {
      console.error('Failed to mark tutorial as completed:', err)
    }
  }, [updateUser])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = '/login'
    }
  }, [loading, isAuthenticated])

  // Fetch report data if viewReport param exists
  useEffect(() => {
    const viewReportId = searchParams.get('viewReport')
    
    if (!viewReportId) {
      return
    }

    const fetchReport = async () => {
      setReportLoading(true)
      setReportError('')
      
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          throw new Error('Not authenticated')
        }

        const response = await fetch(`/api/reports/${viewReportId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch report')
        }

        const data = await response.json()
        setReportToView(data.report)
      } catch (err: any) {
        console.error('Error fetching report:', err)
        setReportError(err.message || 'Failed to load report')
      } finally {
        setReportLoading(false)
      }
    }

    fetchReport()
  }, [searchParams])

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

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0 overflow-hidden">
      {reportLoading ? (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading report...</p>
          </div>
        </div>
      ) : reportError ? (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <div className="text-center bg-white p-8 rounded-lg shadow-sm">
            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Report</h3>
            <p className="text-gray-500 mb-4">{reportError}</p>
            <button
              onClick={() => router.push('/reports')}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Back to Reports
            </button>
          </div>
        </div>
      ) : (
        <>
          <MapComponent
            reportToView={reportToView}
            tutorialCompleted={user?.tutorial_completed ?? false}
            onStartTutorial={() => setTutorialActive(true)}
          />
          <AICopilot />
          <TutorialOverlay
            isActive={tutorialActive}
            onComplete={markTutorialCompleted}
            onSkip={markTutorialCompleted}
          />
        </>
      )}
    </div>
  )
}

export default function MapPage() {
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
      <MapPageContent />
    </Suspense>
  )
}
