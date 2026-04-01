'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import CountrySelect from '@/components/ui/CountrySelect'
import PhoneInput from '@/components/ui/PhoneInput'

const markdownComponents = {
  h1: ({ children }: any) => <h1 className="text-base font-bold mt-3 mb-1 text-gray-900">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-[15px] font-bold mt-3 mb-1 text-gray-900">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-semibold mt-2 mb-1 text-gray-800">{children}</h3>,
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }: any) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-gray-600">{children}</em>,
  ul: ({ children }: any) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-3 border-green-400 bg-green-50/60 pl-3 pr-2 py-1 my-2 rounded-r-md text-gray-700 italic">
      {children}
    </blockquote>
  ),
  code: ({ inline, className, children, ...props }: any) => {
    if (inline || !className) {
      return (
        <code className="bg-gray-200 text-green-700 text-[13px] px-1.5 py-0.5 rounded font-mono" {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className={`${className} block`} {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children }: any) => (
    <pre className="bg-gray-900 text-gray-100 text-[12px] rounded-lg p-3 my-2 overflow-x-auto leading-relaxed font-mono">
      {children}
    </pre>
  ),
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-green-600 underline underline-offset-2 hover:text-green-700">
      {children}
    </a>
  ),
  hr: () => <hr className="border-gray-300 my-3" />,
}

interface Session {
  id: number
  title: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  message_count: string
  last_user_message: string | null
}

interface SessionDetail {
  session: { id: number; title: string | null }
  messages: { role: string; content: string; created_at: string }[]
}

const API_BASE = 'http://localhost:3001'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState<number | null>(null)
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Profile editing
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCountry, setEditCountry] = useState('')
  const [editJobTitle, setEditJobTitle] = useState('')
  const [editInstitution, setEditInstitution] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')

  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userData))
  }, [router])

  useEffect(() => {
    if (!user) return

    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API_BASE}/api/sessions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!res.ok) throw new Error('Failed to load sessions')

        const data = await res.json()
        setSessions(data.sessions || [])
      } catch (err) {
        console.error('Failed to load sessions:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [user])

  // ── Profile editing ──
  const startEditing = () => {
    setEditName(user.name || '')
    setEditPhone(user.phone_number || '')
    setEditCountry(user.country || '')
    setEditJobTitle(user.job_title || '')
    setEditInstitution(user.institution || '')
    setIsEditing(true)
    setProfileSuccess('')
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setProfileSuccess('')
  }

  const saveProfile = async () => {
    if (!editName.trim()) return
    setProfileLoading(true)
    setProfileSuccess('')

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/admin/me/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName,
          phone_number: editPhone,
          country: editCountry,
          job_title: editJobTitle,
          institution: editInstitution,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      const data = await res.json()
      const updatedUser = { ...user, ...data.user }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setIsEditing(false)
      setProfileSuccess('Profile updated successfully')
      setTimeout(() => setProfileSuccess(''), 3000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setProfileLoading(false)
    }
  }

  // ── Password change ──
  const changePassword = async () => {
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('All fields are required')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    setPasswordLoading(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/admin/me/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to change password')
      }

      setPasswordSuccess('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setTimeout(() => {
        setShowPasswordModal(false)
        setPasswordSuccess('')
      }, 2000)
    } catch (err: any) {
      setPasswordError(err.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  // ── Session handling ──
  const handleExpandSession = async (sessionId: number) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null)
      setSessionDetail(null)
      return
    }

    setExpandedSession(sessionId)
    setLoadingDetail(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) throw new Error('Failed to load messages')

      const data = await res.json()
      setSessionDetail(data)
    } catch (err) {
      console.error('Failed to load session messages:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Delete this conversation? This cannot be undone.')) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) throw new Error('Failed to delete')

      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (expandedSession === sessionId) {
        setExpandedSession(null)
        setSessionDetail(null)
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncate = (str: string, len: number) => {
    if (!str) return '—'
    return str.length > len ? str.substring(0, len) + '...' : str
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">

        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-2xl font-bold">
                  {user.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                <p className="text-sm text-gray-500">{user.email}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin'
                      ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20'
                      : 'bg-gray-100 text-gray-700 ring-1 ring-gray-600/20'
                  }`}>
                    {user.role}
                  </span>
                  <Link
                    href="/map"
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Go to Map →
                  </Link>
                </div>
              </div>
            </div>
            {!isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={startEditing}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 transition"
                >
                  Change Password
                </button>
              </div>
            )}
          </div>

          {profileSuccess && (
            <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded-lg mb-6 text-sm">
              {profileSuccess}
            </div>
          )}

          {/* Profile details / edit form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                  <CountrySelect
                    value={editCountry}
                    onChange={setEditCountry}
                    placeholder="Search or select country"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <PhoneInput
                    country={editCountry}
                    phone={editPhone}
                    onPhoneChange={setEditPhone}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Title</label>
                  <input
                    type="text"
                    value={editJobTitle}
                    onChange={(e) => setEditJobTitle(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                    placeholder="e.g. Researcher"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Institution</label>
                  <input
                    type="text"
                    value={editInstitution}
                    onChange={(e) => setEditInstitution(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                    placeholder="e.g. University of Lagos"
                  />
                </div>
                <div className="sm:col-span-2 flex gap-3 justify-end">
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveProfile}
                    disabled={profileLoading || !editName.trim()}
                    className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {profileLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Phone</p>
                  <p className="text-sm text-gray-700">{user.phone_number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Country</p>
                  <p className="text-sm text-gray-700">{user.country || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Job Title</p>
                  <p className="text-sm text-gray-700">{user.job_title || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Institution</p>
                  <p className="text-sm text-gray-700">{user.institution || '—'}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Change Password</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your current password and choose a new one</p>

              {passwordError && (
                <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded-lg mb-4 text-sm">
                  {passwordSuccess}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordSuccess('') }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={changePassword}
                  disabled={passwordLoading}
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 pt-8 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Chat History</h2>
            <p className="text-sm text-gray-500 mt-1">Your AI Copilot conversations</p>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-500 font-medium">No conversations yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Start chatting with the AI Copilot from the{' '}
                <Link href="/map" className="text-green-600 hover:underline">map page</Link>
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sessions.map((session) => (
                <div key={session.id}>
                  <button
                    onClick={() => handleExpandSession(session.id)}
                    className="w-full px-8 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      session.is_active ? 'bg-green-50' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-5 h-5 ${session.is_active ? 'text-green-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {session.title || 'Untitled conversation'}
                        </h3>
                        {session.is_active && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-600">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {session.last_user_message
                          ? truncate(session.last_user_message, 80)
                          : 'No messages'}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs text-gray-400">{formatDate(session.updated_at)}</p>
                      <p className="text-[11px] text-gray-300 mt-0.5">
                        {session.message_count} messages
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete conversation"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedSession === session.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {expandedSession === session.id && (
                    <div className="px-8 pb-6 border-t border-gray-100">
                      {loadingDetail ? (
                        <div className="py-8 flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                        </div>
                      ) : sessionDetail && sessionDetail.messages.length > 0 ? (
                        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-2">
                          {sessionDetail.messages.map((msg, i) => (
                            <div
                              key={i}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                                  msg.role === 'user'
                                    ? 'bg-green-600 text-white rounded-br-sm'
                                    : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                                }`}
                              >
                                {msg.role === 'user' ? (
                                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                ) : (
                                  <div className="markdown-body">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                      {msg.content}
                                    </ReactMarkdown>
                                  </div>
                                )}
                                <p className={`text-[10px] mt-1 ${
                                  msg.role === 'user' ? 'text-green-200' : 'text-gray-400'
                                }`}>
                                  {formatDate(msg.created_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-sm text-gray-400">
                          No messages in this conversation
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-gray-400">
            © 2025 AfriGeoData. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
