'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
        {/* User Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
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
        </div>

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
                  {/* Session Row */}
                  <button
                    onClick={() => handleExpandSession(session.id)}
                    className="w-full px-8 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      session.is_active ? 'bg-green-50' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-5 h-5 ${session.is_active ? 'text-green-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>

                    {/* Content */}
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

                    {/* Meta */}
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs text-gray-400">{formatDate(session.updated_at)}</p>
                      <p className="text-[11px] text-gray-300 mt-0.5">
                        {session.message_count} messages
                      </p>
                    </div>

                    {/* Actions */}
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

                  {/* Expanded Messages */}
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
