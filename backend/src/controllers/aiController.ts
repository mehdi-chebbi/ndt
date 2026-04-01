import { Request, Response } from 'express';
import pool from '../config/database';
import { aiLogger } from '../utils/logger';

const SYSTEM_PROMPT = `You are the AI Copilot for AfriGeoData, a geospatial platform for African development data.

You help users explore and understand:
- Interactive maps with GeoServer WMS layers covering 54+ African countries
- WaterWatch Africa: water access data from 2000-2023 (urban vs rural gaps, country rankings)
- GiniWatch Africa: income inequality (Gini index) trends across the continent
- Land cover classification statistics via custom polygon drawing
- Data reporting and invalid data flagging

Guidelines:
- Be concise and helpful. This is a side-panel chat, keep responses focused.
- If asked about topics unrelated to the platform, briefly answer then redirect to the platform's features.
- Respond in the same language the user uses.
- When discussing data, be specific about numbers, dates, and sources when possible.
- Never claim to have real-time access to the map — you can only discuss what you've been told.`;

const MAX_CONTEXT_MESSAGES = 20; // last 10 turns (10 user + 10 assistant)

interface ChatRequestBody {
  sessionId: number;
  message: string;
}

export async function chat(req: Request, res: Response) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    aiLogger.separator();
    aiLogger.info(`=== New Chat Request [${requestId}] ===`);

    const { sessionId, message }: ChatRequestBody = req.body;
    const userId = (req as any).userId;

    // ── Validate input ──
    if (!sessionId || !message) {
      aiLogger.warning('Invalid request', { sessionId, hasMessage: !!message });
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    aiLogger.debug('Request', {
      userId,
      sessionId,
      messagePreview: message.substring(0, 50),
    });

    // ── Verify session belongs to user ──
    const sessionCheck = await pool.query(
      'SELECT id, user_id FROM chat_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (sessionCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // ── Build context from DB ──
    const messagesResult = await pool.query(
      'SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );

    // Build the messages array for OpenRouter:
    // [system prompt] + [last N messages from DB] + [new user message]
    const dbMessages = messagesResult.rows as { role: string; content: string }[];

    // Get last N messages (user + assistant only, no system)
    const recentMessages = dbMessages
      .filter(m => m.role !== 'system')
      .slice(-MAX_CONTEXT_MESSAGES);

    const apiMessages: { role: string; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recentMessages,
      { role: 'user', content: message },
    ];

    // ── Validate environment ──
    const apiKey = process.env.OPENROUTER_API_KEY;
    const modelName = process.env.MODEL_NAME;

    if (!apiKey) {
      aiLogger.error('OPENROUTER_API_KEY is not configured');
      return res.status(500).json({ error: 'AI service is not properly configured' });
    }

    if (!modelName) {
      aiLogger.error('MODEL_NAME is not configured');
      return res.status(500).json({ error: 'AI model is not configured' });
    }

    aiLogger.info('Context built', {
      totalDbMessages: dbMessages.length,
      sentToApi: apiMessages.length,
      model: modelName,
    });

    // ── Call OpenRouter ──
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const response = await fetch(openRouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': process.env.APP_NAME || 'NDT Platform',
      },
      body: JSON.stringify({
        model: modelName,
        messages: apiMessages,
        stream: true,
      }),
    });

    aiLogger.info('OpenRouter response', {
      status: response.status,
      statusText: response.statusText,
    });

    // ── Handle censorship / errors ──
    if (!response.ok) {
      const errorText = await response.text();
      aiLogger.error('OpenRouter error', { status: response.status, body: errorText });

      // If 451 (censorship), the user's new message is the problem
      // Don't save it to DB, just tell the user to rephrase
      if (response.status === 451) {
        res.write(`data: ${JSON.stringify({ error: 'Your message was blocked by the content filter. Please rephrase and try again.' })}\n\n`);
        res.end();
        return;
      }

      res.write(`data: ${JSON.stringify({ error: 'Failed to get AI response. Please try again.' })}\n\n`);
      res.end();
      return;
    }

    // ── Save user message to DB (only after we know it's not blocked) ──
    // Generate auto-title from first user message in session
    const userMessageCount = dbMessages.filter(m => m.role === 'user').length;

    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'user', message]
    );

    // Auto-set title from the first user message
    if (userMessageCount === 0) {
      const title = message.length > 60 ? message.substring(0, 57) + '...' : message;
      await pool.query(
        "UPDATE chat_sessions SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [title, sessionId]
      );
    } else {
      await pool.query(
        'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId]
      );
    }

    // ── Stream response ──
    const reader = response.body?.getReader();
    if (!reader) {
      aiLogger.error('No response body from OpenRouter');
      res.write(`data: ${JSON.stringify({ error: 'Invalid AI response. Please try again.' })}\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedContent = '';

    aiLogger.info('Streaming started');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulatedContent += content;
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch {
              // Non-critical parse error, skip
            }
          }
        }
      }

      // ── Save assistant response to DB ──
      if (accumulatedContent) {
        await pool.query(
          'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
          [sessionId, 'assistant', accumulatedContent]
        );
        await pool.query(
          'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [sessionId]
        );
      }

      res.write('data: [DONE]\n\n');
      res.end();

      aiLogger.success(`Request [${requestId}] completed`, {
        responseLength: accumulatedContent.length,
      });
      aiLogger.separator();

    } catch (streamError) {
      aiLogger.error('Stream error', streamError);

      // Still try to save whatever we got
      if (accumulatedContent) {
        await pool.query(
          'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
          [sessionId, 'assistant', accumulatedContent]
        ).catch(() => {});
      }

      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted. Please try again.' })}\n\n`);
      res.end();
    }

  } catch (error: any) {
    aiLogger.error('Chat error', error);

    if (!res.headersSent) {
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Something went wrong. Please try again.' })}\n\n`);
      res.end();
    }
  }
}
