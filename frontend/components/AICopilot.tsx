'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API_BASE = 'http://localhost:3001'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface SessionMessage {
  role: string
  content: string
  created_at: string
}

/* ── Markdown prose styles for assistant messages ── */
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
        <code className="bg-gray-100 text-green-700 text-[13px] px-1.5 py-0.5 rounded font-mono" {...props}>
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
  hr: () => <hr className="border-gray-200 my-3" />,
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-[13px] border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="bg-gray-100 text-left px-2 py-1 font-semibold text-gray-800 border border-gray-200">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="px-2 py-1 border border-gray-200">{children}</td>
  ),
}

export default function AICopilot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Get auth token
  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('token')
  }, [])

  // Always create a new session when copilot opens
  const ensureSession = useCallback(async () => {
    if (!getToken()) return false

    try {
      const createRes = await fetch(`${API_BASE}/api/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      })

      if (!createRes.ok) return false

      const createData = await createRes.json()
      setSessionId(createData.session.id)
      const loaded: Message[] = (createData.session.messages || []).map((m: SessionMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
      setMessages(loaded)
      return true
    } catch (err) {
      console.error('Failed to create session:', err)
      return false
    }
  }, [getToken])

  // When copilot opens, load session
  useEffect(() => {
    if (isOpen && !sessionReady && getToken()) {
      ensureSession().then((ready) => {
        setSessionReady(ready)
      })
    }
  }, [isOpen, sessionReady, ensureSession, getToken])

  const handleSend = async () => {
    const trimmedInput = inputText.trim()
    if (!trimmedInput || isLoading || !sessionId) return

    setError(null)

    // Add user message to UI immediately
    const userMessage: Message = { role: 'user', content: trimmedInput }
    setMessages(prev => [...prev, userMessage])
    setInputText('')

    // Create placeholder for assistant response
    const assistantIndex = messages.length + 1
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])
    setIsLoading(true)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: trimmedInput,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errorData.error || 'Failed to get AI response')
      }

      // Read SSE stream
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue

          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6))

              if (parsed.error) {
                throw new Error(parsed.error)
              }

              if (parsed.content) {
                accumulatedContent += parsed.content
                setMessages(prev => {
                  const updated = [...prev]
                  if (updated[assistantIndex]?.role === 'assistant') {
                    updated[assistantIndex] = { role: 'assistant', content: accumulatedContent }
                  }
                  return updated
                })
              }
            } catch {
              // Non-critical parse error
            }
          }
        }
      }

      // If we got no content, remove the empty assistant message
      if (!accumulatedContent) {
        setMessages(prev => prev.slice(0, -1))
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Something went wrong. Please try again.')

        // Remove the empty assistant placeholder
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && !last.content) {
            return prev.slice(0, -1)
          }
          return prev
        })
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const dismissError = () => setError(null)

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 bg-white hover:bg-gray-50
                     text-gray-700 w-12 h-12 rounded-full shadow-lg border border-gray-200
                     flex items-center justify-center transition-all duration-200
                     hover:scale-110 hover:shadow-xl"
          title="AI Copilot"
        >
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-end">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[360px]
                      max-h-[500px] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-500 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-green-300 animate-pulse' : 'bg-green-400'}`} />
                <span className="text-white font-semibold text-sm">AI Copilot</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-[300px]">
              {!sessionReady ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-3" />
                  <p className="text-sm">Loading...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-12 h-12 mb-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-sm text-center">Ask me anything about the map or data!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          msg.role === 'user'
                            ? 'bg-green-600 text-white rounded-br-md'
                            : 'bg-white text-gray-700 rounded-bl-md shadow-sm border border-gray-200'
                        }`}
                      >
                        {!msg.content ? (
                          <span className="text-gray-400 italic">Thinking...</span>
                        ) : msg.role === 'assistant' ? (
                          <div className="markdown-body">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Error message */}
                  {error && (
                    <div className="flex justify-center">
                      <div className="bg-red-50 text-red-600 rounded-lg px-3 py-2 text-sm
                                  border border-red-200 max-w-[85%] relative">
                        <button
                          onClick={dismissError}
                          className="absolute top-1 right-1.5 text-red-400 hover:text-red-600 text-xs leading-none"
                        >
                          ✕
                        </button>
                        {error}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-gray-200">
              <div className="flex items-center gap-2">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  disabled={isLoading || !sessionReady}
                  className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                             disabled:bg-gray-100 disabled:cursor-not-allowed
                             placeholder-gray-400"
                  style={{ minHeight: '36px', maxHeight: '100px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isLoading || !sessionReady}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                             text-white rounded-lg px-3 py-2 transition-colors flex items-center justify-center"
                  style={{ minHeight: '36px', minWidth: '36px' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                AI responses may not be accurate
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
