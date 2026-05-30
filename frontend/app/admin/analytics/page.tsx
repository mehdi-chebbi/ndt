'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/authFetch'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

// Types
interface UserActivity {
  id: number
  name: string
  email: string
  role: string
  country: string | null
  institution: string | null
  created_at: string
  layer_views: string
  compare_started: string
  map_exported: string
  chat_sessions: string
  chat_messages: string
  last_active: string | null
}

interface Totals {
  total_layer_views: string
  total_compares: string
  total_exports: string
  total_actions: string
  total_chat_sessions: string
  total_chat_messages: string
  active_users_7d: string
}

interface TimelineEntry {
  date: string
  layer_views: string
  compares: string
  exports: string
}

interface ChatTimelineEntry {
  date: string
  chat_sessions: string
  chat_messages: string
}

interface TopLayer {
  layer_name: string
  view_count: string
}

interface FeatureBreakdown {
  action_type: string
  count: string
}

interface UserDetailAction {
  action_type: string
  metadata: any
  created_at: string
}

interface UserDetailChatSession {
  id: number
  title: string | null
  created_at: string
  updated_at: string
  user_messages: string
  assistant_messages: string
}

interface UserDetail {
  user: { id: number; name: string; email: string; role: string; country: string | null; institution: string | null; created_at: string }
  actions: UserDetailAction[]
  chatSessions: UserDetailChatSession[]
  actionCounts: { action_type: string; count: string }[]
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useTranslation('admin')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Analytics data
  const [users, setUsers] = useState<UserActivity[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [chatTimeline, setChatTimeline] = useState<ChatTimelineEntry[]>([])
  const [topLayers, setTopLayers] = useState<TopLayer[]>([])
  const [featureBreakdown, setFeatureBreakdown] = useState<FeatureBreakdown[]>([])

  // User detail panel
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [userDetailLoading, setUserDetailLoading] = useState(false)

  // Search/filter
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      window.location.href = '/login'
      return
    }

    if (!authLoading && user && user.role === 'admin') {
      fetchAnalytics()
    }
  }, [authLoading, user])

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/analytics')
      if (!response.ok) throw new Error('Failed to fetch analytics')
      const data = await response.json()
      setUsers(data.users || [])
      setTotals(data.totals || null)
      setTimeline(data.timeline || [])
      setChatTimeline(data.chatTimeline || [])
      setTopLayers(data.topLayers || [])
      setFeatureBreakdown(data.featureBreakdown || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUserDetail = async (userId: number) => {
    try {
      setUserDetailLoading(true)
      const response = await api.get(`/analytics/user/${userId}`)
      if (!response.ok) throw new Error('Failed to fetch user details')
      const data = await response.json()
      setSelectedUser(data)
    } catch (err) {
      console.error('Error fetching user detail:', err)
    } finally {
      setUserDetailLoading(false)
    }
  }

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const formatActionType = (type: string) => {
    switch (type) {
      case 'layer_view': return '👁️ Layer View'
      case 'compare_started': return '⇔ Compare'
      case 'map_exported': return '📥 Export'
      default: return type
    }
  }

  // Filtered users
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.country || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.institution || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Chart: Feature Popularity (Doughnut)
  const featureChartData = {
    labels: featureBreakdown.map(f => {
      switch (f.action_type) {
        case 'layer_view': return 'Layer Views'
        case 'compare_started': return 'Comparisons'
        case 'map_exported': return 'Exports'
        default: return f.action_type
      }
    }),
    datasets: [{
      data: featureBreakdown.map(f => parseInt(f.count)),
      backgroundColor: ['#10b981', '#f59e0b', '#6366f1'],
      borderWidth: 0,
    }]
  }

  // Chart: Activity Timeline (Bar)
  const timelineChartData = {
    labels: timeline.map(t => {
      const d = new Date(t.date)
      return `${d.getMonth() + 1}/${d.getDate()}`
    }),
    datasets: [
      {
        label: 'Layer Views',
        data: timeline.map(t => parseInt(t.layer_views)),
        backgroundColor: '#10b981',
        borderRadius: 4,
      },
      {
        label: 'Comparisons',
        data: timeline.map(t => parseInt(t.compares)),
        backgroundColor: '#f59e0b',
        borderRadius: 4,
      },
      {
        label: 'Exports',
        data: timeline.map(t => parseInt(t.exports)),
        backgroundColor: '#6366f1',
        borderRadius: 4,
      },
    ]
  }

  // Merge chat timeline into a combined timeline
  const combinedTimelineLabels = [...new Set([
    ...timeline.map(t => t.date),
    ...chatTimeline.map(t => t.date)
  ])].sort()

  const combinedTimelineData = {
    labels: combinedTimelineLabels.map(d => {
      const date = new Date(d)
      return `${date.getMonth() + 1}/${date.getDate()}`
    }),
    datasets: [
      {
        label: 'Layer Views',
        data: combinedTimelineLabels.map(d => {
          const entry = timeline.find(t => t.date === d)
          return entry ? parseInt(entry.layer_views) : 0
        }),
        backgroundColor: '#10b981',
        borderRadius: 4,
      },
      {
        label: 'Comparisons',
        data: combinedTimelineLabels.map(d => {
          const entry = timeline.find(t => t.date === d)
          return entry ? parseInt(entry.compares) : 0
        }),
        backgroundColor: '#f59e0b',
        borderRadius: 4,
      },
      {
        label: 'Exports',
        data: combinedTimelineLabels.map(d => {
          const entry = timeline.find(t => t.date === d)
          return entry ? parseInt(entry.exports) : 0
        }),
        backgroundColor: '#6366f1',
        borderRadius: 4,
      },
      {
        label: 'AI Chats',
        data: combinedTimelineLabels.map(d => {
          const entry = chatTimeline.find(t => t.date === d)
          return entry ? parseInt(entry.chat_sessions) : 0
        }),
        backgroundColor: '#ec4899',
        borderRadius: 4,
      },
    ]
  }

  const totalActionCount = featureBreakdown.reduce((sum, f) => sum + parseInt(f.count), 0)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('shared.loading')}</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-lg transition">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
              <p className="text-gray-600 mt-1">{t('analytics.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('shared.refresh')}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{t('analytics.totalActions')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{parseInt(totals?.total_actions || '0') + parseInt(totals?.total_chat_sessions || '0')}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{t('analytics.layerViews')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{parseInt(totals?.total_layer_views || '0')}</p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{t('analytics.aiChats')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{parseInt(totals?.total_chat_sessions || '0')}</p>
              </div>
              <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{t('analytics.activeUsers7d')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{parseInt(totals?.active_users_7d || '0')}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Activity Timeline */}
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.activityTimeline')}</h2>
            {combinedTimelineLabels.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400">
                <p>{t('analytics.noDataYet')}</p>
              </div>
            ) : (
              <div style={{ height: 280 }}>
                <Bar
                  data={combinedTimelineData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: { stacked: true, grid: { display: false } },
                      y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
                    },
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } } },
                  }}
                />
              </div>
            )}
          </div>

          {/* Feature Popularity */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.featurePopularity')}</h2>
            {totalActionCount === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400">
                <p>{t('analytics.noDataYet')}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Doughnut
                  data={featureChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } },
                    },
                    cutout: '60%',
                  }}
                  height={220}
                />
              </div>
            )}
          </div>
        </div>

        {/* Top Layers */}
        {topLayers.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.topLayers')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {topLayers.slice(0, 10).map((layer, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-6">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{layer.layer_name}</p>
                    <p className="text-xs text-gray-500">{parseInt(layer.view_count)} views</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Activity Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{t('analytics.userActivity')}</h2>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('analytics.searchUsers')}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent w-full sm:w-64"
              />
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-600">{t('analytics.noDataYet')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('analytics.table.user')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      👁️ {t('analytics.table.layerViews')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ⇔ {t('analytics.table.compares')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      📥 {t('analytics.table.exports')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      💬 {t('analytics.table.chats')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      💬 {t('analytics.table.messages')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('analytics.table.lastActive')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('analytics.table.details')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => fetchUserDetail(u.id)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{u.name}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 text-xs font-semibold rounded-full ${
                          parseInt(u.layer_views) > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {parseInt(u.layer_views)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 text-xs font-semibold rounded-full ${
                          parseInt(u.compare_started) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {parseInt(u.compare_started)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 text-xs font-semibold rounded-full ${
                          parseInt(u.map_exported) > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {parseInt(u.map_exported)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 text-xs font-semibold rounded-full ${
                          parseInt(u.chat_sessions) > 0 ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {parseInt(u.chat_sessions)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm text-gray-600">{parseInt(u.chat_messages)}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatRelativeTime(u.last_active)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => { e.stopPropagation(); fetchUserDetail(u.id) }}
                          className="text-gray-900 hover:text-gray-700 font-medium flex items-center gap-1"
                        >
                          {t('analytics.viewDetails')}
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* User Detail Slide-over Panel */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedUser(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-lg bg-white shadow-xl h-full overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-gray-900">{t('analytics.userDetails')}</h2>
              <button onClick={() => setSelectedUser(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {userDetailLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* User Info */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600">
                    {selectedUser.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedUser.user.name}</h3>
                    <p className="text-sm text-gray-500">{selectedUser.user.email}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        selectedUser.user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedUser.user.role}
                      </span>
                      {selectedUser.user.country && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {selectedUser.user.country}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Counts Summary */}
                <div className="grid grid-cols-3 gap-3">
                  {selectedUser.actionCounts.map(ac => (
                    <div key={ac.action_type} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">{parseInt(ac.count)}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatActionType(ac.action_type)}</p>
                    </div>
                  ))}
                  {/* Chat sessions count */}
                  <div className="bg-pink-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{selectedUser.chatSessions.length}</p>
                    <p className="text-xs text-gray-500 mt-1">💬 Chat Sessions</p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('analytics.recentActivity')}</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedUser.actions.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">{t('analytics.noActivityRecorded')}</p>
                    ) : (
                      selectedUser.actions.map((action, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm">{formatActionType(action.action_type).split(' ')[0]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {action.metadata?.layerName || action.metadata?.leftLayer || action.metadata?.format || formatActionType(action.action_type).split(' ')[1]}
                            </p>
                            {action.metadata?.rightLayer && (
                              <p className="text-xs text-gray-500">vs {action.metadata.rightLayer}</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 whitespace-nowrap">{formatRelativeTime(action.created_at)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Chat Sessions */}
                {selectedUser.chatSessions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('analytics.chatSessions')}</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedUser.chatSessions.map(session => (
                        <div key={session.id} className="bg-pink-50 rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {session.title || `Chat #${session.id}`}
                            </p>
                            <p className="text-xs text-gray-400 whitespace-nowrap ml-2">{formatRelativeTime(session.updated_at)}</p>
                          </div>
                          <div className="flex gap-3 mt-1">
                            <span className="text-xs text-gray-500">{parseInt(session.user_messages)} messages</span>
                            <span className="text-xs text-gray-500">{parseInt(session.assistant_messages)} responses</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
