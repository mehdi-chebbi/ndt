'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/authFetch'
import { useAuth } from '@/contexts/AuthContext'

interface Report {
  id: number
  user_id: number
  reporter_name: string
  reporter_email: string
  original_polygon: any
  original_layer: string
  original_colormap: string
  invalid_area_polygon: any
  comment: string
  status: 'invalid' | 'fixed'
  created_at: string
  updated_at: string
}

interface NotificationRecipient {
  id: number
  email: string
  is_active: boolean
  created_at: string
}

export default function ReportsPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'invalid' | 'fixed'>('invalid')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Notification modal state
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false)
  const [isAddingEmail, setIsAddingEmail] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchReports()
  }, [filterStatus])

  const checkAuth = () => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/login'
      return
    }

    if (!user || user.role !== 'admin') {
      window.location.href = '/dashboard'
      return
    }
  }

  const fetchReports = async () => {
    setLoading(true)
    setError('')

    try {
      const url = filterStatus === 'all'
        ? '/reports/all'
        : `/reports/all?status=${filterStatus}`

      const response = await api.get(url)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch reports')
      }

      const data = await response.json()
      setReports(data.reports || [])
    } catch (err: any) {
      console.error('Fetch reports error:', err)
      setError(err.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const updateReportStatus = async (reportId: number, newStatus: 'invalid' | 'fixed') => {
    setIsUpdating(true)

    try {
      const response = await api.patch(`/reports/${reportId}/status`, { status: newStatus })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update report')
      }

      // Update local state
      setReports(reports.map(report =>
        report.id === reportId ? { ...report, status: newStatus } : report
      ))

      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport({ ...selectedReport, status: newStatus })
      }
    } catch (err: any) {
      console.error('Update report error:', err)
      alert(err.message || 'Failed to update report')
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteReport = async (reportId: number) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return
    }

    try {
      const response = await api.delete(`/reports/${reportId}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete report')
      }

      // Update local state
      setReports(reports.filter(report => report.id !== reportId))
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(null)
      }
    } catch (err: any) {
      console.error('Delete report error:', err)
      alert(err.message || 'Failed to delete report')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Notification recipients functions
  const fetchRecipients = async () => {
    setIsLoadingRecipients(true)
    try {
      const response = await api.get('/notifications')

      if (!response.ok) {
        throw new Error('Failed to fetch recipients')
      }

      const data = await response.json()
      setRecipients(data.recipients || [])
    } catch (err) {
      console.error('Fetch recipients error:', err)
    } finally {
      setIsLoadingRecipients(false)
    }
  }

  const addRecipient = async () => {
    if (!newEmail.trim()) return

    setIsAddingEmail(true)
    try {
      const response = await api.post('/notifications', { email: newEmail.trim() })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add recipient')
      }

      const data = await response.json()
      setRecipients([...recipients, data.recipient])
      setNewEmail('')
    } catch (err: any) {
      console.error('Add recipient error:', err)
      alert(err.message || 'Failed to add recipient')
    } finally {
      setIsAddingEmail(false)
    }
  }

  const removeRecipient = async (id: number) => {
    try {
      const response = await api.delete(`/notifications/${id}`)

      if (!response.ok) {
        throw new Error('Failed to remove recipient')
      }

      setRecipients(recipients.filter(r => r.id !== id))
    } catch (err) {
      console.error('Remove recipient error:', err)
      alert('Failed to remove recipient')
    }
  }

  const openNotificationModal = () => {
    setShowNotificationModal(true)
    fetchRecipients()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Invalid Data Reports</h1>
            <p className="text-gray-600">Manage and review reports about invalid data</p>
          </div>
          <button
            onClick={openNotificationModal}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Configure Notifications
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterStatus === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('invalid')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterStatus === 'invalid'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Invalid ({reports.filter(r => r.status === 'invalid').length})
              </button>
              <button
                onClick={() => setFilterStatus('fixed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterStatus === 'fixed'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Fixed ({reports.filter(r => r.status === 'fixed').length})
              </button>
            </div>
            <button
              onClick={fetchReports}
              className="ml-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
            <p className="text-gray-500">
              {filterStatus === 'all'
                ? 'There are no reports yet.'
                : filterStatus === 'invalid'
                ? 'There are no invalid reports.'
                : 'There are no fixed reports.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reports List */}
            <div className="lg:col-span-2 space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`bg-white rounded-lg shadow-sm p-6 cursor-pointer transition hover:shadow-md ${
                    selectedReport?.id === report.id ? 'ring-2 ring-gray-900' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          report.status === 'invalid'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {report.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          #{report.id}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900">{report.comment}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{report.reporter_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs">{report.reporter_email}</span>
                    </div>
                    <span className="text-xs">{formatDate(report.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Layer:</span>
                    <span className="capitalize">{report.original_layer}</span>
                    <span className="text-gray-300">|</span>
                    <span className="font-medium">Colormap:</span>
                    <span className="capitalize">{report.original_colormap}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Report Details Panel */}
            <div className="lg:col-span-1">
              {selectedReport ? (
                <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Report Details</h2>
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="text-gray-400 hover:text-gray-600 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedReport.status === 'invalid'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedReport.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Comment */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comment
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {selectedReport.comment}
                    </p>
                  </div>

                  {/* Reporter Info */}
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Reporter</span>
                      <span className="font-medium text-gray-900">{selectedReport.reporter_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Email</span>
                      <span className="font-medium text-gray-900">{selectedReport.reporter_email}</span>
                    </div>
                  </div>

                  {/* Layer Info */}
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Layer</span>
                      <span className="font-medium text-gray-900 capitalize">{selectedReport.original_layer}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Colormap</span>
                      <span className="font-medium text-gray-900 capitalize">{selectedReport.original_colormap}</span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="mb-6 space-y-2 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Created</span>
                      <span>{formatDate(selectedReport.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Updated</span>
                      <span>{formatDate(selectedReport.updated_at)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {selectedReport.status === 'invalid' && (
                      <button
                        onClick={() => updateReportStatus(selectedReport.id, 'fixed')}
                        disabled={isUpdating}
                        className={`w-full px-4 py-2 bg-green-600 text-white rounded-lg transition font-medium ${
                          isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
                        }`}
                      >
                        {isUpdating ? 'Updating...' : 'Mark as Fixed'}
                      </button>
                    )}

                    {selectedReport.status === 'fixed' && (
                      <button
                        onClick={() => updateReportStatus(selectedReport.id, 'invalid')}
                        disabled={isUpdating}
                        className={`w-full px-4 py-2 bg-red-600 text-white rounded-lg transition font-medium ${
                          isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
                        }`}
                      >
                        {isUpdating ? 'Updating...' : 'Mark as Invalid'}
                      </button>
                    )}

                    <button
                      onClick={() => deleteReport(selectedReport.id)}
                      className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                    >
                      Delete Report
                    </button>
                  </div>

                  {/* View on Map Button */}
                  <button
                    onClick={() => router.push(`/report-view?viewReport=${selectedReport.id}`)}
                    className="w-full mt-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition font-medium"
                  >
                    View on Map
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center sticky top-4">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Report</h3>
                  <p className="text-gray-500 text-sm">Click on a report to view its details.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">Notification Recipients</h2>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                These email addresses will receive notifications when a new invalid data report is submitted.
              </p>

              {/* Add Email Form */}
              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addRecipient()
                    }
                  }}
                />
                <button
                  onClick={addRecipient}
                  disabled={isAddingEmail || !newEmail.trim()}
                  className={`px-4 py-2 bg-gray-900 text-white rounded-lg font-medium transition ${
                    isAddingEmail || !newEmail.trim()
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  {isAddingEmail ? 'Adding...' : 'Add'}
                </button>
              </div>

              {/* Recipients List */}
              <div className="max-h-64 overflow-y-auto">
                {isLoadingRecipients ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p>No recipients added yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-900">{recipient.email}</span>
                        </div>
                        <button
                          onClick={() => removeRecipient(recipient.id)}
                          className="text-red-500 hover:text-red-700 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
