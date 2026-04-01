import { Request, Response } from 'express';
import { aiLogger } from '../utils/logger';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: Message[];
}

export async function chat(req: Request, res: Response) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    aiLogger.separator();
    aiLogger.info(`=== New Chat Request [${requestId}] ===`);

    const { messages }: ChatRequest = req.body;

    aiLogger.debug('Request body', {
      messagesCount: messages?.length,
      lastMessage: messages?.[messages.length - 1]?.content?.substring(0, 50),
    });

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      aiLogger.warning('Invalid request - no messages');
      return res.status(400).json({
        error: 'Messages array is required and must not be empty'
      });
    }

    // Validate environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    const modelName = process.env.MODEL_NAME;

    if (!apiKey) {
      aiLogger.error('OPENROUTER_API_KEY is not configured');
      return res.status(500).json({
        error: 'AI service is not properly configured'
      });
    }

    if (!modelName) {
      aiLogger.error('MODEL_NAME is not configured');
      return res.status(500).json({
        error: 'AI model is not configured'
      });
    }

    aiLogger.success('Configuration validated', {
      model: modelName,
      hasApiKey: !!apiKey,
    });

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    aiLogger.info('SSE headers set, starting OpenRouter request');

    // Call OpenRouter API with streaming enabled
    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const requestBody = {
      model: modelName,
      messages: messages,
      stream: true,
    };

    aiLogger.debug('OpenRouter request', {
      url: openRouterUrl,
      body: {
        ...requestBody,
        messages: messages.map((m, i) => ({
          index: i,
          role: m.role,
          contentPreview: m.content.substring(0, 50) + '...',
        })),
      },
    });

    const response = await fetch(openRouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': process.env.APP_NAME || 'NDT Platform',
      },
      body: JSON.stringify(requestBody),
    });

    aiLogger.info('OpenRouter response received', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
    });

    if (!response.ok) {
      const errorText = await response.text();
      aiLogger.error('OpenRouter API error', {
        status: response.status,
        body: errorText,
      });
      res.write(`data: ${JSON.stringify({ error: 'Failed to get AI response. Please try again.' })}\n\n`);
      res.end();
      return;
    }

    aiLogger.success('Stream connection established');

    // Handle streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      aiLogger.error('No response body from OpenRouter');
      res.write(`data: ${JSON.stringify({ error: 'Invalid AI response. Please try again.' })}\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    let contentChunksSent = 0;

    aiLogger.info('Starting to read stream from OpenRouter...');

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          aiLogger.success('Stream completed', {
            totalChunks: chunkCount,
            contentChunksSent,
          });
          break;
        }

        chunkCount++;
        buffer += decoder.decode(value, { stream: true });

        if (chunkCount % 10 === 0) {
          aiLogger.debug(`Progress: ${chunkCount} chunks received`);
        }

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed) {
            continue;
          }

          if (trimmed === 'data: [DONE]') {
            aiLogger.info('Received [DONE] from OpenRouter');
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);

            try {
              const parsed = JSON.parse(data);

              // Extract the content delta
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                contentChunksSent++;
                // Send the content chunk to the client
                res.write(`data: ${JSON.stringify({ content })}\n\n`);

                if (contentChunksSent === 1) {
                  aiLogger.success('First content chunk sent to client', {
                    preview: content.substring(0, 30),
                  });
                }
              }
            } catch (parseError) {
              aiLogger.warning('Error parsing SSE data (non-critical)', {
                error: (parseError as Error).message,
                dataPreview: data.substring(0, 50),
              });
            }
          }
        }
      }

      // Send end signal
      res.write('data: [DONE]\n\n');
      res.end();

      aiLogger.success(`Request [${requestId}] completed successfully`);
      aiLogger.separator();

    } catch (streamError) {
      aiLogger.error('Error reading stream', streamError);
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted. Please try again.' })}\n\n`);
      res.end();
    }

  } catch (error) {
    aiLogger.error('AI chat error', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Something went wrong. Please try again.'
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Something went wrong. Please try again.' })}\n\n`);
      res.end();
    }
  }
}
