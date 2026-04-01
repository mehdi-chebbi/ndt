'use client'

import { useState, useRef, useEffect } from 'react'
import { aiLogger } from '@/lib/logger'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AICopilot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const assistantMessageIndexRef = useRef<number>(-1)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        aiLogger.info('Component unmounting, aborting any ongoing request')
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleSend = async () => {
    const trimmedInput = inputText.trim()

    if (!trimmedInput || isLoading) {
      aiLogger.warning('Send blocked', { isEmpty: !trimmedInput, isLoading })
      return
    }

    // Clear any previous error
    setError(null)

    aiLogger.separator()
    aiLogger.info('=== Starting new chat request ===')
    aiLogger.info('User message', trimmedInput)

    // Add user message to chat
    const userMessage: Message = { role: 'user', content: trimmedInput }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputText('')

    // Track the index of the assistant message we're about to create
    assistantMessageIndexRef.current = newMessages.length
    aiLogger.debug('Assistant message will be at index', assistantMessageIndexRef.current)

    // Create empty assistant message that will be updated with streaming content
    const messagesWithPlaceholder: Message[] = [
      ...newMessages,
      { role: 'assistant', content: '' }
    ]
    setMessages(messagesWithPlaceholder)
    setIsLoading(true)

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController()

    try {
      const requestUrl = 'http://localhost:3001/api/ai/chat'
      aiLogger.info('Sending request to', requestUrl)

      const requestBody = {
        messages: newMessages,
      }
      aiLogger.debug('Request body', requestBody)

      const startTime = Date.now()

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      })

      const responseTime = Date.now() - startTime
      aiLogger.info('Response received', {
        status: response.status,
        statusText: response.statusText,
        time: `${responseTime}ms`,
      })

      aiLogger.group('Response Headers', () => {
        response.headers.forEach((value, key) => {
          console.log(`  ${key}: ${value}`)
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        aiLogger.error('Request failed', {
          status: response.status,
          body: errorText,
        })
        throw new Error(errorText || 'Failed to get AI response')
      }

      aiLogger.success('Stream connection established')

      // Read the stream
      const reader = response.body?.getReader()

      if (!reader) {
        aiLogger.error('No response body reader available')
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let chunkCount = 0
      let totalBytes = 0
      let accumulatedContent = ''

      aiLogger.info('Starting to read stream...')

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          aiLogger.success('Stream completed', {
            totalChunks: chunkCount,
            totalBytes,
            finalContentLength: accumulatedContent.length,
          })
          break
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true })
        chunkCount++
        totalBytes += chunk.length

        buffer += chunk

        aiLogger.debug(`Chunk #${chunkCount}`, {
          size: chunk.length,
          preview: chunk.substring(0, 100),
          bufferLength: buffer.length,
        })

        // Process SSE messages
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        aiLogger.debug(`Processing ${lines.length} lines from chunk #${chunkCount}`)

        for (const line of lines) {
          const trimmed = line.trim()

          if (!trimmed) {
            continue
          }

          if (trimmed === 'data: [DONE]') {
            aiLogger.info('Received [DONE] signal')
            continue
          }

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6)

            try {
              const parsed = JSON.parse(data)
              aiLogger.debug('Parsed SSE message', parsed)

              // Check for error
              if (parsed.error) {
                aiLogger.error('Error in stream', parsed.error)
                throw new Error(parsed.error)
              }

              // Append content chunk
              const contentChunk = parsed.content
              if (contentChunk) {
                const oldLength = accumulatedContent.length
                accumulatedContent += contentChunk

                aiLogger.debug('Content update', {
                  chunk: contentChunk,
                  added: contentChunk.length,
                  total: accumulatedContent.length,
                })

                // Update the assistant message with accumulated content
                setMessages((prevMessages) => {
                  const updated = [...prevMessages]
                  const idx = assistantMessageIndexRef.current
                  if (idx >= 0 && updated[idx]?.role === 'assistant') {
                    updated[idx].content = accumulatedContent
                  } else {
                    aiLogger.warning('Could not update message', {
                      index: idx,
                      messageLength: updated.length,
                    })
                  }
                  return updated
                })
              }
            } catch (parseError) {
              aiLogger.error('Failed to parse SSE data', {
                error: parseError,
                data,
              })
            }
          }
        }
      }

      aiLogger.success('Chat request completed successfully')
      aiLogger.info('Final message length', accumulatedContent.length)

    } catch (err: any) {
      aiLogger.error('Chat request failed', err)

      if (err.name === 'AbortError') {
        aiLogger.info('Request was aborted')
      } else {
        setError(err.message || 'Something went wrong. Please try again.')

        // Remove the empty assistant message if there was an error
        setMessages((prevMessages) => {
          const updated = [...prevMessages]
          const lastMsg = updated[updated.length - 1]
          if (lastMsg?.role === 'assistant' && lastMsg.content === '') {
            aiLogger.debug('Removing empty assistant message due to error')
            return updated.slice(0, -1)
          }
          return updated
        })
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
      aiLogger.separator()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

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
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-[300px]">
              {messages.length === 0 ? (
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
                        {msg.content || (
                          <span className="text-gray-400 italic">Thinking...</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Error message */}
                  {error && (
                    <div className="flex justify-center">
                      <div className="bg-red-50 text-red-600 rounded-lg px-3 py-2 text-sm
                                  border border-red-200">
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
                  disabled={isLoading}
                  className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                             disabled:bg-gray-100 disabled:cursor-not-allowed
                             placeholder-gray-400"
                  style={{ minHeight: '36px', maxHeight: '100px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isLoading}
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
