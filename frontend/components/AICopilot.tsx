'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ChartRenderer, { parseChartSpec } from './AICharts'

const API_BASE = '' // Use relative paths for reverse proxy compatibility

// ── Types ──────────────────────────────────────────────────────────

interface TextContentPart {
  type: 'text'
  text: string
}

interface ImageContentPart {
  type: 'image_url'
  image_url: {
    url: string // "/api/ai-images/uuid.png"
  }
}

type ContentPart = TextContentPart | ImageContentPart

interface Message {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

interface PendingImage {
  file: File
  preview: string // object URL for preview
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  imageUrl?: string // "/api/ai-images/uuid.png" after upload
}

interface SessionMessage {
  role: string
  content: string
  created_at: string
}

// ── Helpers ────────────────────────────────────────────────────────

/** Parse a DB content string into ContentPart[] if it's multimodal JSON */
function parseContent(raw: string): ContentPart[] {
  if (raw.startsWith('[')) {
    try {
      return JSON.parse(raw) as ContentPart[]
    } catch {
      return [{ type: 'text', text: raw }]
    }
  }
  return [{ type: 'text', text: raw }]
}

/** Extract plain text from ContentPart[] */
function extractText(content: string | ContentPart[]): string {
  if (typeof content === 'string') return content
  return content
    .filter((p): p is TextContentPart => p.type === 'text')
    .map(p => p.text)
    .join(' ')
    .trim()
}

/** Extract image URLs from ContentPart[] */
function extractImageUrls(content: string | ContentPart[]): string[] {
  if (typeof content === 'string') return []
  return content
    .filter((p): p is ImageContentPart => p.type === 'image_url')
    .map(p => p.image_url.url)
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

// ── Image rendering component ──────────────────────────────────────

function MessageImages({ urls }: { urls: string[] }) {
  const { t } = useTranslation('ai-copilot')
  if (urls.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1.5 mb-1.5 ${urls.length > 1 ? 'flex-col' : ''}`}>
      {urls.map((url, i) => (
        <img
          key={i}
          src={url}
          alt={t('alt.uploaded')}
          className="rounded-lg max-w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          style={{ maxHeight: '180px' }}
        />
      ))}
    </div>
  )
}

// ── Render assistant content with charts ────────────────────────────

/** Split text on ```chart ... ``` blocks and render each segment */
function renderAssistantContent(text: string) {
  const segments: Array<{ type: 'text' | 'chart'; content: string }> = []

  // Match ```chart ... ``` blocks (non-greedy, supports multiline JSON)
  const chartRegex = /```chart\s*\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = chartRegex.exec(text)) !== null) {
    // Text before this chart block
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    // The chart JSON
    segments.push({ type: 'chart', content: match[1].trim() })
    lastIndex = match.index + match[0].length
  }

  // Remaining text after last chart
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) })
  }

  // If no charts found, just render the whole thing as markdown
  if (segments.length === 0) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {text}
      </ReactMarkdown>
    )
  }

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'chart') {
          const spec = parseChartSpec(seg.content)
          if (spec) {
            return (
              <div key={i} className="my-2 bg-white rounded-lg">
                <ChartRenderer spec={spec} />
              </div>
            )
          }
          // If chart parsing fails, show raw JSON in a code block
          return (
            <pre key={i} className="bg-gray-900 text-gray-100 text-[12px] rounded-lg p-3 my-2 overflow-x-auto leading-relaxed font-mono">
              {seg.content}
            </pre>
          )
        }
        // Text segment — render with ReactMarkdown
        if (!seg.content.trim()) return null
        return (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {seg.content}
          </ReactMarkdown>
        )
      })}
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────

export default function AICopilot() {
  const { t } = useTranslation('ai-copilot')
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      // Revoke object URLs for pending images
      pendingImages.forEach(img => URL.revokeObjectURL(img.preview))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Get auth token
  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('token')
  }, [])

  // Always create a new session when copilot opens, unless reusing an AI analysis session
  const ensureSession = useCallback(async () => {
    if (!getToken()) return false

    try {
      const aiAnalysisState = sessionStorage.getItem('aiAnalysisState')
      const aiAnalysisError = sessionStorage.getItem('aiAnalysisError')
      const aiAnalysisResultStr = sessionStorage.getItem('aiAnalysisResult')

      if (aiAnalysisState === 'analyzing') {
        // Show analyzing message - this will be replaced when streaming starts
        // Create a fresh session for the upcoming analysis
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
        setMessages([{ role: 'assistant', content: t('messages.analyzing') }])
        sessionStorage.removeItem('aiAnalysisState')
        return true
      }

      if (aiAnalysisError) {
        // Show error message - create a fresh session since the previous analysis failed
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
        setMessages([{ role: 'assistant', content: `❌ Error: ${aiAnalysisError}` }])
        sessionStorage.removeItem('aiAnalysisError')
        return true
      }

      if (aiAnalysisResultStr) {
        // Reuse the session the backend already created during analysis
        const aiAnalysisResult = JSON.parse(aiAnalysisResultStr)
        setSessionId(aiAnalysisResult.sessionId)  // reuse session, don't create new one
        setMessages([{ role: 'assistant', content: aiAnalysisResult.aiResponse }])
        sessionStorage.removeItem('aiAnalysisResult')
        return true
      }

      // No analysis result → create a fresh session (e.g. user opened copilot manually)
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
      setMessages([])
      return true

    } catch (err) {
      console.error('Failed to create/load session:', err)
      return false
    }
  }, [getToken])

  // Handle open-ai-copilot event
  useEffect(() => {
    const handleOpenAICopilot = () => {
      setIsOpen(true)
      setSessionReady(false) // Force session reload
    }

    window.addEventListener('open-ai-copilot', handleOpenAICopilot)

    return () => {
      window.removeEventListener('open-ai-copilot', handleOpenAICopilot)
    }
  }, [])

  // Handle analysis complete event
  useEffect(() => {
    const handleAnalysisComplete = () => {
      // Reload session to show results
      setSessionReady(false)
    }

    const handleAnalysisError = () => {
      // Reload session to show error
      setSessionReady(false)
    }

    window.addEventListener('ai-analysis-complete', handleAnalysisComplete)
    window.addEventListener('ai-analysis-error', handleAnalysisError)

    return () => {
      window.removeEventListener('ai-analysis-complete', handleAnalysisComplete)
      window.removeEventListener('ai-analysis-error', handleAnalysisError)
    }
  }, [])

  // Handle streaming analysis events
  useEffect(() => {
    const handleStats = (e: any) => {
      const { stats, layerName } = e.detail
      // Remove the "analyzing" message and start with empty assistant message
      // Stats are kept in the background, not shown to the user
      setMessages([])
      // Start streaming assistant message immediately (no user message visible)
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
    }

    const handleStream = (e: any) => {
      const { content } = e.detail
      setMessages(prev => {
        const updated = [...prev]
        const lastIndex = updated.length - 1
        if (updated[lastIndex]?.role === 'assistant') {
          updated[lastIndex] = {
            role: 'assistant',
            content: (updated[lastIndex].content as string) + content
          }
        }
        return updated
      })
    }

    window.addEventListener('ai-analysis-stats', handleStats)
    window.addEventListener('ai-analysis-stream', handleStream)

    return () => {
      window.removeEventListener('ai-analysis-stats', handleStats)
      window.removeEventListener('ai-analysis-stream', handleStream)
    }
  }, [])

  // When copilot opens, load session
  useEffect(() => {
    if (isOpen && !sessionReady && getToken()) {
      ensureSession().then((ready) => {
        setSessionReady(ready)
      })
    }
  }, [isOpen, sessionReady, ensureSession, getToken])

  // ── Image handling ────────────────────────────────────────────

  const handleImageSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const allowed = ['image/png', 'image/jpeg', 'image/webp']

    Array.from(files).forEach(file => {
      if (!allowed.includes(file.type)) return

      const preview = URL.createObjectURL(file)
      setPendingImages(prev => [
        ...prev,
        { file, preview, status: 'pending' },
      ])
    })

    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const removePendingImage = (index: number) => {
    setPendingImages(prev => {
      const img = prev[index]
      URL.revokeObjectURL(img.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  /** Upload all pending images to backend and return their URLs */
  const uploadImages = async (): Promise<string[]> => {
    if (pendingImages.length === 0) return []

    // Mark all as uploading
    setPendingImages(prev => prev.map(img => ({ ...img, status: 'uploading' })))

    const formData = new FormData()
    pendingImages.forEach(img => {
      formData.append('images', img.file)
    })

    try {
      const res = await fetch(`${API_BASE}/api/ai/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
        body: formData,
      })

      if (!res.ok) {
        throw new Error(t('errors.imageUploadFailed'))
      }

      const data = await res.json()
      const urls: string[] = data.images.map((img: { imageUrl: string }) => img.imageUrl)

      setPendingImages(prev => prev.map((img, i) => ({
        ...img,
        status: 'uploaded',
        imageUrl: urls[i],
      })))

      return urls
    } catch {
      setPendingImages(prev => prev.map(img => ({ ...img, status: 'error' })))
      throw new Error(t('errors.failedToUploadImages'))
    }
  }

  // ── Send message ──────────────────────────────────────────────

  const handleSend = async () => {
    const trimmedInput = inputText.trim()
    const hasImages = pendingImages.length > 0

    if ((!trimmedInput && !hasImages) || isLoading || !sessionId) return

    setError(null)
    setIsLoading(true)

    try {
      // Step 1: Upload images if any
      let imageUrls: string[] = []
      if (hasImages) {
        imageUrls = await uploadImages()
      }

      // Step 2: Build the message content
      let messageToSend: string | ContentPart[]
      const parts: ContentPart[] = []

      if (trimmedInput) {
        parts.push({ type: 'text', text: trimmedInput })
      }
      for (const url of imageUrls) {
        parts.push({ type: 'image_url', image_url: { url } })
      }

      // If only text, send as plain string; otherwise send as array
      messageToSend = parts.length === 1 && parts[0].type === 'text'
        ? trimmedInput
        : parts

      // Step 3: Add user message to UI immediately
      const userMessage: Message = { role: 'user', content: messageToSend }
      setMessages(prev => [...prev, userMessage])
      setInputText('')

      // Clear pending images
      pendingImages.forEach(img => URL.revokeObjectURL(img.preview))
      setPendingImages([])

      // Dispatch tutorial event for step advancement
      window.dispatchEvent(new CustomEvent('ai-message-sent', { detail: { sent: true } }))

      // Step 4: Create placeholder for assistant response
      const assistantIndex = messages.length + 1
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      abortControllerRef.current = new AbortController()

      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: messageToSend,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t('errors.requestFailed') }))
        throw new Error(errorData.error || t('errors.failedToGetResponse'))
      }

      // Read SSE stream
      const reader = response.body?.getReader()
      if (!reader) throw new Error(t('errors.noResponseBody'))

      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedContent = ''
      let isSearching = false // Track if we're showing "searching" indicator

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

              // Handle "searching" event — backend is querying the database
              if (parsed.type === 'searching') {
                isSearching = true
                setMessages(prev => {
                  const updated = [...prev]
                  if (updated[assistantIndex]?.role === 'assistant') {
                    updated[assistantIndex] = { role: 'assistant', content: t('messages.searching') }
                  }
                  return updated
                })
                continue
              }

              // Handle "map_action" event — backend wants the map to switch to a clipped country layer
              if (parsed.type === 'map_action') {
                window.dispatchEvent(new CustomEvent('ai-map-action', {
                  detail: parsed,
                }))
                continue
              }

              if (parsed.content) {
                // If we were showing "searching" indicator, reset for actual content
                if (isSearching) {
                  isSearching = false
                  accumulatedContent = ''
                }
                accumulatedContent += parsed.content
                setMessages(prev => {
                  const updated = [...prev]
                  if (updated[assistantIndex]?.role === 'assistant') {
                    updated[assistantIndex] = { role: 'assistant', content: accumulatedContent }
                  }
                  return updated
                })
              }
            } catch (e: any) {
              // Re-throw actual errors (from parsed.error)
              if (e.message && !e.message.includes('JSON')) throw e
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
        setError(err.message || t('errors.somethingWentWrong'))

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

  const canSend = (inputText.trim() || pendingImages.length > 0) && !isLoading && sessionReady

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={handleFilesChange}
      />

      {/* Toggle Button */}
      {!isOpen && (
        <button
          data-tutorial="ai-button"
          onClick={() => setIsOpen(true)}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 bg-white hover:bg-gray-50
                     text-gray-700 w-16 h-16 rounded-full shadow-lg border border-gray-200
                     flex items-center justify-center transition-all duration-200
                     hover:scale-110 hover:shadow-xl font-bold text-sm"
          title={t('header.title')}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M14 2C14 2.74028 13.5978 3.38663 13 3.73244V4H20C21.6569 4 23 5.34315 23 7V19C23 20.6569 21.6569 22 20 22H4C2.34315 22 1 20.6569 1 19V7C1 5.34315 2.34315 4 4 4H11V3.73244C10.4022 3.38663 10 2.74028 10 2C10 0.895431 10.8954 0 12 0C13.1046 0 14 0.895431 14 2ZM4 6H11H13H20C20.5523 6 21 6.44772 21 7V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V7C3 6.44772 3.44772 6 4 6ZM15 11.5C15 10.6716 15.6716 10 16.5 10C17.3284 10 18 10.6716 18 11.5C18 12.3284 17.3284 13 16.5 13C15.6716 13 15 12.3284 15 11.5ZM16.5 8C14.567 8 13 9.567 13 11.5C13 13.433 14.567 15 16.5 15C18.433 15 20 13.433 20 11.5C20 9.567 18.433 8 16.5 8ZM7.5 10C6.67157 10 6 10.6716 6 11.5C6 12.3284 6.67157 13 7.5 13C8.32843 13 9 12.3284 9 11.5C9 10.6716 8.32843 10 7.5 10ZM4 11.5C4 9.567 5.567 8 7.5 8C9.433 8 11 9.567 11 11.5C11 13.433 9.433 15 7.5 15C5.567 15 4 13.433 4 11.5ZM10.8944 16.5528C10.6474 16.0588 10.0468 15.8586 9.55279 16.1056C9.05881 16.3526 8.85858 16.9532 9.10557 17.4472C9.68052 18.5971 10.9822 19 12 19C13.0178 19 14.3195 18.5971 14.8944 17.4472C15.1414 16.9532 14.9412 16.3526 14.4472 16.1056C13.9532 15.8586 13.3526 16.0588 13.1056 16.5528C13.0139 16.7362 12.6488 17 12 17C11.3512 17 10.9861 16.7362 10.8944 16.5528Z" fill="currentColor"/>
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-end">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[400px]
                      max-h-[520px] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-500 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-green-300 animate-pulse' : 'bg-green-400'}`} />
                <span className="text-white font-semibold text-sm">{t('header.title')}</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors text-white hover:text-red-300 font-bold text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-[300px]">
              {!sessionReady ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-3" />
                  <p className="text-sm">{t('messages.loading')}</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-12 h-12 mb-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-center">{t('messages.emptyState')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, index) => {
                    const imageUrls = msg.role === 'user' ? extractImageUrls(msg.content) : []
                    const textContent = extractText(msg.content)

                    return (
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
                          {!msg.content || (msg.role === 'assistant' && !textContent) ? (
                            <span className="text-gray-400 italic">{t('messages.thinking')}</span>
                          ) : msg.role === 'assistant' ? (
                            <div className="markdown-body">
                              {renderAssistantContent(textContent)}
                            </div>
                          ) : (
                            <>
                              {/* Render images first */}
                              <MessageImages urls={imageUrls} />
                              {/* Then text */}
                              {textContent && <p className="whitespace-pre-wrap">{textContent}</p>}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}

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

            {/* Image previews */}
            {pendingImages.length > 0 && (
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {pendingImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img.preview}
                        alt={t('alt.uploadPreview')}
                        className={`w-14 h-14 rounded-lg object-cover border border-gray-200 ${
                          img.status === 'uploading' ? 'opacity-50' : ''
                        } ${img.status === 'error' ? 'border-red-400 opacity-70' : ''}`}
                      />
                      {(img.status === 'pending' || img.status === 'error') && (
                        <button
                          onClick={() => removePendingImage(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full
                                     flex items-center justify-center text-xs leading-none opacity-0 group-hover:opacity-100
                                     transition-opacity hover:bg-red-600 shadow-sm"
                        >
                          ×
                        </button>
                      )}
                      {img.status === 'uploading' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 bg-white border-t border-gray-200">
              <div className="flex items-end gap-2">
                {/* Attach image button */}
                <button
                  onClick={handleImageSelect}
                  disabled={isLoading || !sessionReady}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100
                             rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('input.attachImage')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

                <textarea
                  data-tutorial="ai-chat-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('input.placeholder')}
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
                  disabled={!canSend}
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
                {t('disclaimer')}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}