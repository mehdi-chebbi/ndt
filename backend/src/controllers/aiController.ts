import { Request, Response } from 'express';
import pool from '../config/database';
import { aiLogger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

const SYSTEM_PROMPT = `You are the AI Copilot for AfriGeoData, a geospatial platform for African development data. You have vision capabilities — when a user sends an image, analyze it carefully.

You help users explore and understand:
- Interactive maps with GeoServer WMS layers covering 54+ African countries
- WaterWatch Africa: water access data from 2000-2023 (urban vs rural gaps, country rankings)
- GiniWatch Africa: income inequality (Gini index) trends across the continent
- Land cover classification statistics via custom polygon drawing
- Data reporting and invalid data flagging

Guidelines:
- Be concise and helpful. This is a side-panel chat, keep responses focused.
- When an image is attached, analyze it and relate it to the platform's geospatial data when relevant.
- If asked about topics unrelated to the platform, briefly answer then redirect to the platform's features.
- Respond in the same language the user uses.
- When discussing data, be specific about numbers, dates, and sources when possible.
- Never claim to have real-time access to the map — you can only discuss what you've been told.`;

const MAX_CONTEXT_MESSAGES = 20; // last 10 turns (10 user + 10 assistant)

// ── Multimodal content types ──────────────────────────────────────────

interface TextContentPart {
  type: 'text';
  text: string;
}

interface ImageContentPart {
  type: 'image_url';
  image_url: {
    url: string; // "/api/ai-images/uuid.png" (disk path)
  };
}

type ContentPart = TextContentPart | ImageContentPart;

// OpenRouter message format (sent to API)
interface OpenRouterTextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterMultimodalMessage {
  role: 'user';
  content: { type: string; text?: string; image_url?: { url: string } }[];
}

type OpenRouterMessage = OpenRouterTextMessage | OpenRouterMultimodalMessage;

// ── Helpers ──────────────────────────────────────────────────────────

/** Check if a DB content string is multimodal JSON */
function isMultimodalContent(content: string): boolean {
  return content.startsWith('[');
}

/** Parse multimodal JSON from DB */
function parseMultimodalContent(content: string): ContentPart[] {
  try {
    return JSON.parse(content);
  } catch {
    return [{ type: 'text', text: content }];
  }
}

/** Extract plain text from content (string or ContentPart[]) */
function extractText(content: string | ContentPart[]): string {
  if (typeof content === 'string') return content;
  return content
    .filter((p): p is TextContentPart => p.type === 'text')
    .map(p => p.text)
    .join(' ')
    .trim();
}

/** Read an image file from disk and return a base64 data URI */
function imageToBase64DataUri(imagePath: string): string {
  const filename = imagePath.split('/').pop();
  const fullPath = path.join(process.cwd(), 'ai-imgs', filename!);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Image file not found: ${fullPath}`);
  }

  const fileBuffer = fs.readFileSync(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const base64 = fileBuffer.toString('base64');

  return `data:${mime};base64,${base64}`;
}

/**
 * Build the OpenRouter messages array.
 * - System prompt is always a plain string.
 * - Historical messages are sent as plain text (we don't re-send old images to save tokens).
 * - The new user message is sent as multimodal if it contains images.
 */
function buildApiMessages(
  dbMessages: { role: string; content: string }[],
  newMessage: string | ContentPart[]
): OpenRouterMessage[] {
  const apiMessages: OpenRouterMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Historical messages: send as plain text only
  const recentDb = dbMessages
    .filter(m => m.role !== 'system')
    .slice(-MAX_CONTEXT_MESSAGES);

  for (const msg of recentDb) {
    const text = extractText(
      isMultimodalContent(msg.content) ? parseMultimodalContent(msg.content) : msg.content
    );
    if (text) {
      apiMessages.push({ role: msg.role as 'user' | 'assistant', content: text });
    }
  }

  // New user message: send as multimodal if it has images
  if (typeof newMessage === 'string') {
    if (newMessage.trim()) {
      apiMessages.push({ role: 'user', content: newMessage });
    }
  } else {
    // ContentPart[] — convert image paths to base64 data URIs for OpenRouter
    const openRouterParts: { type: string; text?: string; image_url?: { url: string } }[] = [];

    for (const part of newMessage) {
      if (part.type === 'text' && part.text) {
        openRouterParts.push({ type: 'text', text: part.text });
      } else if (part.type === 'image_url') {
        const base64Uri = imageToBase64DataUri(part.image_url.url);
        openRouterParts.push({
          type: 'image_url',
          image_url: { url: base64Uri },
        });
      }
    }

    if (openRouterParts.length > 0) {
      apiMessages.push({
        role: 'user',
        content: openRouterParts,
      } as OpenRouterMultimodalMessage);
    }
  }

  return apiMessages;
}

// ── Request body ─────────────────────────────────────────────────────

interface ChatRequestBody {
  sessionId: number;
  message: string | ContentPart[];
}

// ── Main handler ─────────────────────────────────────────────────────

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

    // Normalize: if message is a plain string with no images, treat as string
    const isMultimodal = Array.isArray(message);

    const messageText = isMultimodal ? extractText(message as ContentPart[]) : (message as string);
    aiLogger.debug('Request', {
      userId,
      sessionId,
      multimodal: isMultimodal,
      messagePreview: messageText.substring(0, 50),
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

    const dbMessages = messagesResult.rows as { role: string; content: string }[];

    // ── Build API messages (convert disk image paths to base64 for new message) ──
    let apiMessages: OpenRouterMessage[];
    try {
      apiMessages = buildApiMessages(dbMessages, message);
    } catch (error: any) {
      aiLogger.error('Failed to build API messages', error);
      return res.status(400).json({ error: error.message || 'Failed to process images' });
    }

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
      multimodal: isMultimodal,
    });

    // ── Call OpenRouter ──
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

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

      if (response.status === 451) {
        res.write(`data: ${JSON.stringify({ error: 'Your message was blocked by the content filter. Please rephrase and try again.' })}\n\n`);
        res.end();
        return;
      }

      res.write(`data: ${JSON.stringify({ error: 'Failed to get AI response. Please try again.' })}\n\n`);
      res.end();
      return;
    }

    // ── Save user message to DB ──
    // Store as JSON string for multimodal, plain string for text-only
    const userContentToStore = isMultimodal
      ? JSON.stringify(message)
      : (message as string);

    const userMessageCount = dbMessages.filter(m => m.role === 'user').length;

    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'user', userContentToStore]
    );

    // Auto-set title from the first user message's text
    if (userMessageCount === 0) {
      const title = messageText.length > 60 ? messageText.substring(0, 57) + '...' : messageText;
      await pool.query(
        "UPDATE chat_sessions SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [title || 'Image message', sessionId]
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
                if (res.flush) res.flush();
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
      if (res.flush) res.flush();
      res.end();

      aiLogger.success(`Request [${requestId}] completed`, {
        responseLength: accumulatedContent.length,
      });
      aiLogger.separator();

    } catch (streamError) {
      aiLogger.error('Stream error', streamError);

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
