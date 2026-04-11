import { Request, Response } from 'express';
import pool from '../config/database';
import { aiLogger } from '../utils/logger';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const SYSTEM_PROMPT = `You are the AI Copilot for AfriGeoData, a geospatial platform for African development data. You have vision capabilities — when a user sends an image, analyze it carefully.

You help users explore and understand:
- Interactive maps with GeoServer WMS layers covering 54+ African countries
- WaterWatch Africa: water access data from 2000-2023 (urban vs rural gaps, country rankings)
- GiniWatch Africa: income inequality (Gini index) trends across the continent
- Land cover classification statistics via custom polygon drawing
- Data reporting and invalid data flagging

STRICT BOUNDARIES:
- You are EXCLUSIVELY a geospatial assistant for AfriGeoData. You do NOT generate code, scripts, essays, poems, recipes, or any content unrelated to the platform.
- If a user asks you to generate code or perform tasks completely unrelated to geospatial/African development data, politely refuse and redirect them to the platform's features.
- You may briefly clarify a general concept ONLY if it directly helps the user understand the platform's data (e.g. explaining what a Gini index is).

COLOR & LEGEND AWARENESS:
- When a user asks about a color (e.g. "what does grey mean?", "c'est quoi le couleur rose?", "what's that blue area?"), ALWAYS look for color legend context in the conversation history and answer based on the map legend — never answer with general color theory.
- If no legend is available in the conversation history, say so and ask the user to run an area analysis first.

Guidelines:
- Be concise and helpful. This is a side-panel chat, keep responses focused.
- When an image is attached, analyze it and relate it to the platform's geospatial data.
- Respond in the same language the user uses.
- When discussing data, be specific about numbers, dates, and sources when possible.
- Never claim to have real-time access to the map — you can only discuss what you've been told.
- Never drift into general assistant behavior. Always bring the conversation back to AfriGeoData's features and data.`;

// Special system prompt for area analysis (structured output)
const ANALYSIS_SYSTEM_PROMPT_TEMPLATE = (context: {
  layerName: string;
  location: string;
  totalArea: string;
  classDistribution: string;
  colorMapping: string;
}) => `You are analyzing geospatial data for AfriGeoData. You are EXCLUSIVELY a geospatial assistant — do NOT generate code, scripts, or answer questions unrelated to the platform's data, even if asked.

ANALYSIS CONTEXT:
- Layer: ${context.layerName}
- Location: ${context.location}
- Total Area: ${context.totalArea} km²

CLASS DISTRIBUTION (with colors):
${context.classDistribution}

COLOR LEGEND:
${context.colorMapping}

COLOR AWARENESS: When the user asks about a color (e.g. "what does grey mean?", "c'est quoi le couleur rose?"), ALWAYS reference the COLOR LEGEND above to identify the corresponding land cover class. Never explain colors in general terms.

STRICT BOUNDARIES:
- Do NOT generate code, scripts, or any content unrelated to this geospatial analysis.
- If asked off-topic questions, politely decline and redirect the user to explore the map data further.
- You may clarify a concept only if it directly relates to understanding the analysis results.

TASK: Provide a structured analysis in this exact format:

**Summary**
[Brief overview of what the data shows at a glance]

**Key Findings**
[3-5 bullet points with spatial context about the most important patterns]



Be concise, spatially aware, and data-driven. Focus on actionable insights.
Respond in the same language the user uses.`;
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
    const baseUrl = process.env.AI_BASE_URL;
    const apiKey = process.env.AI_API_KEY;
    const modelName = process.env.AI_MODEL;

    if (!baseUrl) {
      aiLogger.error('AI_BASE_URL is not configured');
      return res.status(500).json({ error: 'AI service is not properly configured' });
    }

    if (!apiKey) {
      aiLogger.error('AI_API_KEY is not configured');
      return res.status(500).json({ error: 'AI service is not properly configured' });
    }

    if (!modelName) {
      aiLogger.error('AI_MODEL is not configured');
      return res.status(500).json({ error: 'AI model is not configured' });
    }

    aiLogger.info('Context built', {
      totalDbMessages: dbMessages.length,
      sentToApi: apiMessages.length,
      model: modelName,
      multimodal: isMultimodal,
    });

    // ── Call AI API ──
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Build headers - always include Authorization, only add OpenRouter-specific headers if APP_URL is set
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    // Only add OpenRouter-specific headers if APP_URL is configured
    if (process.env.AI_APP_URL) {
      headers['HTTP-Referer'] = process.env.AI_APP_URL;
      headers['X-Title'] = process.env.AI_APP_NAME || 'NDT Platform';
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        messages: apiMessages,
        stream: true,
      }),
    });

    aiLogger.info('AI API response', {
      status: response.status,
      statusText: response.statusText,
    });

    // ── Handle AI API errors ──
    if (!response.ok) {
      const errorText = await response.text();
      aiLogger.error('AI API error', { status: response.status, body: errorText });

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

// ── Helper: Calculate stats using raster_stats.py (reused from statsController) ──

// Helper: Convert hex color to user-friendly color name
function hexToColorName(hex: string): string {
  const color = hex.replace('#', '').toLowerCase();

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;

  const namedColors: { name: string; r: number; g: number; b: number }[] = [
    { name: 'red',          r: 220, g: 20,  b: 30  },
    { name: 'dark red',     r: 139, g: 0,   b: 0   },
    { name: 'pink',         r: 255, g: 150, b: 200 },
    { name: 'light pink',   r: 255, g: 182, b: 220 },
    { name: 'magenta',      r: 255, g: 0,   b: 255 },
    { name: 'orange',       r: 255, g: 140, b: 0   },
    { name: 'brown orange', r: 180, g: 100, b: 20  },
    { name: 'brown',        r: 139, g: 69,  b: 19  },
    { name: 'beige',        r: 196, g: 196, b: 138 },
    { name: 'yellow',       r: 255, g: 220, b: 0   },
    { name: 'yellow green', r: 180, g: 210, b: 80  },
    { name: 'light green',  r: 144, g: 238, b: 100 },
    { name: 'green',        r: 0,   g: 180, b: 0   },
    { name: 'dark green',   r: 0,   g: 80,  b: 0   },
    { name: 'olive',        r: 107, g: 142, b: 35  },
    { name: 'cyan',         r: 0,   g: 210, b: 210 },
    { name: 'light blue',   r: 100, g: 180, b: 255 },
    { name: 'blue',         r: 30,  g: 100, b: 220 },
    { name: 'dark blue',    r: 0,   g: 0,   b: 139 },
    { name: 'navy',         r: 0,   g: 0,   b: 80  },
    { name: 'purple',       r: 148, g: 0,   b: 211 },
    { name: 'light purple', r: 200, g: 150, b: 220 },
    { name: 'light grey',   r: 211, g: 211, b: 211 },
    { name: 'grey',         r: 128, g: 128, b: 128 },
    { name: 'dark grey',    r: 64,  g: 64,  b: 64  },
    { name: 'white',        r: 255, g: 255, b: 255 },
    { name: 'black',        r: 0,   g: 0,   b: 0   },
    { name: 'sand',         r: 210, g: 190, b: 140 },
    { name: 'cream',        r: 255, g: 240, b: 200 },
    { name: 'turquoise',    r: 64,  g: 224, b: 208 },
    { name: 'gold',         r: 210, g: 180, b: 30  },
  ];

  let closestName = hex;
  let minDistance = Infinity;

  for (const { name, r: nr, g: ng, b: nb } of namedColors) {
    const distance = Math.sqrt(
      Math.pow(r - nr, 2) +
      Math.pow(g - ng, 2) +
      Math.pow(b - nb, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestName = name;
    }
  }

  return closestName;
}

// Helper: Find inherited legend by traversing parent chain (like frontend)
function findInheritedLegend(groupId: number | null, groups: any[]): any[] | null {
  if (!groupId) return null;

  const group = groups.find(g => g.id === groupId);
  if (!group) return null;

  // If this group has a legend, use it
  if (group.legend && group.legend.length > 0) {
    return group.legend;
  }

  // If no legend and has parent, check parent
  if (group.parent_id) {
    return findInheritedLegend(group.parent_id, groups);
  }

  // No legend and no parent = no legend
  return null;
}

async function calculatePolygonStats(layerName: string, polygon: any): Promise<any> {
  // Get layer from database with group information
  const result = await pool.query(
    `SELECT l.*, g.id as group_table_id, g.name as group_name, g.parent_id as group_parent_id, g.legend as group_legend
     FROM layers l
     LEFT JOIN layer_groups g ON l.group_id = g.id
     WHERE l.geoserver_name = $1`,
    [layerName]
  );

  if (result.rows.length === 0) {
    throw new Error('Layer not found');
  }

  const layer = result.rows[0];
  const filePath = layer.file_path;
  const classLabels = layer.class_labels;

  if (!filePath) {
    throw new Error('Layer not configured for stats: no file path');
  }

  if (!classLabels) {
    throw new Error('Layer not configured for stats: no class labels');
  }

  // Fetch all groups for legend inheritance
  const allGroupsResult = await pool.query(
    'SELECT id, name, parent_id, legend FROM layer_groups ORDER BY sort_order ASC, created_at ASC'
  );
  const allGroups = allGroupsResult.rows;

  // Call Python script for raster processing
  const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'raster_stats.py');

  aiLogger.info('Running stats for layer', { layerName, polygonType: polygon.type });

  const pythonProcess = spawn('python3', [scriptPath, '--file', filePath]);

  // Write polygon to stdin
  const polygonStr = JSON.stringify(polygon);
  pythonProcess.stdin.write(polygonStr);
  pythonProcess.stdin.end();

  return new Promise((resolve, reject) => {
    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        aiLogger.error('Python script failed:', errorData);
        reject(new Error(errorData || 'Failed to process raster'));
        return;
      }

      try {
        const stats = JSON.parse(outputData);

        // Determine legend: use layer-specific legend, otherwise inherit from group
        const legend = (layer.legend && layer.legend.length > 0)
          ? layer.legend
          : findInheritedLegend(layer.group_id, allGroups);

        // Build color mapping from legend: class_name -> color
        const colorMapping: { [key: string]: string } = {};
        if (legend && legend.length > 0) {
          legend.forEach((item: any) => {
            if (item.class && item.color) {
              colorMapping[item.class] = item.color;
            }
          });
        }

        // Calculate percentage for each class
        const totalPixels = stats.total_pixels;
        const classesWithPercentage = stats.classes.map((cls: any) => ({
          class_id: cls.class_id,
          class_name: classLabels[cls.class_id] || `Unknown (${cls.class_id})`,
          area_km2: cls.area_km2,
          percentage: totalPixels > 0 ? Math.round((cls.pixels / totalPixels) * 100 * 10) / 10 : 0,
          color: colorMapping[classLabels[cls.class_id]] || null
        }));

        resolve({
          layer_name: layerName,
          total_area_km2: stats.total_area_km2,
          pixel_size_m: stats.pixel_size_m,
          classes: classesWithPercentage,
          legend: legend || null
        });
      } catch (parseError) {
        aiLogger.error('Failed to parse Python output:', outputData);
        reject(new Error('Failed to parse stats result'));
      }
    });

    pythonProcess.on('error', (err) => {
      aiLogger.error('Failed to start Python process:', err.message);
      reject(new Error('Failed to start statistics computation'));
    });
  });
}

// ── Helper: Extract location from polygon bounds ──
function extractLocationFromPolygon(polygon: any): string {
  if (!polygon || !polygon.coordinates) {
    return 'Unknown location';
  }

  let coords: number[][];
  
  if (polygon.type === 'Polygon') {
    coords = polygon.coordinates[0];
  } else if (polygon.type === 'MultiPolygon') {
    // Get the first polygon's first ring
    coords = polygon.coordinates[0][0];
  } else {
    return 'Unknown location';
  }

  if (!coords || coords.length === 0) {
    return 'Unknown location';
  }

  // Calculate centroid
  const lats = coords.map(c => c[1]);
  const lons = coords.map(c => c[0]);
  
  const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const avgLon = lons.reduce((a, b) => a + b, 0) / lons.length;

  // Format coordinates
  const latDir = avgLat >= 0 ? 'N' : 'S';
  const lonDir = avgLon >= 0 ? 'E' : 'W';
  
  return `${Math.abs(avgLat).toFixed(1)}°${latDir}, ${Math.abs(avgLon).toFixed(1)}°${lonDir}`;
}

// ── Request body for analyze-area ─────────────────────────────────────────

interface AnalyzeAreaRequestBody {
  layer_name: string;
  polygon: any;
}

// ── Main handler: Analyze Area with AI ─────────────────────────────────────

export async function analyzeAreaWithAI(req: Request, res: Response) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    aiLogger.separator();
    aiLogger.info(`=== New Analyze Area Request [${requestId}] ===`);

    const { layer_name, polygon }: AnalyzeAreaRequestBody = req.body;
    const userId = (req as any).userId;

    // ── Validate input ──
    if (!layer_name || !polygon) {
      aiLogger.warning('Invalid request', { layer_name, hasPolygon: !!polygon });
      return res.status(400).json({ error: 'layer_name and polygon are required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    aiLogger.info('Request', { userId, layer_name, polygonType: polygon.type });

    // ── Step 1: Calculate statistics using raster_stats.py ──
    aiLogger.info('Step 1: Computing statistics...');
    let stats: any;
    try {
      stats = await calculatePolygonStats(layer_name, polygon);
      aiLogger.info('Statistics computed', { totalArea: stats.total_area_km2, classCount: stats.classes.length });
    } catch (statsError: any) {
      aiLogger.error('Failed to compute statistics', statsError);
      return res.status(500).json({ 
        error: 'Failed to compute statistics',
        details: statsError.message 
      });
    }

    // ── Step 2: Build analysis context ──
    const location = extractLocationFromPolygon(polygon);

    // Format class distribution for AI (with user-friendly color names)
    const classDistribution = stats.classes
      .map((cls: any) => {
        const colorInfo = cls.color ? ` (${hexToColorName(cls.color)})` : '';
        return `- ${cls.class_name}${colorInfo}: ${cls.percentage}% (${cls.area_km2.toFixed(2)} km²)`;
      })
      .join('\n');

    // Build color mapping summary for AI (with user-friendly names)
    const colorMapping = stats.legend && stats.legend.length > 0
      ? stats.legend
          .map((item: any) => `- ${item.class}: ${hexToColorName(item.color)}`)
          .join('\n')
      : 'No color information available.';

    const analysisContext = {
      layerName: layer_name,
      location,
      totalArea: stats.total_area_km2.toFixed(2),
      classDistribution,
      colorMapping
    };

    // ── Step 3: Create new AI chat session ──
    aiLogger.info('Step 2: Creating AI session...');
    let sessionId: number;
    try {
      const sessionResult = await pool.query(
        `INSERT INTO chat_sessions (user_id, title, is_active) 
         VALUES ($1, $2, true) 
         RETURNING id`,
        [userId, `Analysis: ${layer_name}`]
      );
      sessionId = sessionResult.rows[0].id;
      aiLogger.info('AI session created', { sessionId });
    } catch (dbError: any) {
      aiLogger.error('Failed to create AI session', dbError);
      return res.status(500).json({ error: 'Failed to create AI session' });
    }

    // ── Step 4: Send initial message with analysis request ──
    aiLogger.info('Step 3: Sending analysis request to AI...');
    
    const userMessage = 'Analyze this area based on the provided geospatial data.';
    
    try {
      await pool.query(
        'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
        [sessionId, 'user', userMessage]
      );
    } catch (dbError: any) {
      aiLogger.error('Failed to save user message', dbError);
      // Continue anyway, session is created
    }

    // ── Step 5: Stream stats and AI response to frontend ──
    aiLogger.info('Step 4: Streaming AI response...');

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send stats first (non-streamed part)
    res.write(`data: ${JSON.stringify({ type: 'stats', sessionId, stats, layerName: layer_name })}\n\n`);

    // Call AI API with custom analysis prompt
    const baseUrl = process.env.AI_BASE_URL;
    const apiKey = process.env.AI_API_KEY;
    const modelName = process.env.AI_MODEL;

    if (!baseUrl) {
      aiLogger.error('AI_BASE_URL is not configured');
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'AI service is not properly configured' })}\n\n`);
      res.end();
      return;
    }

    if (!apiKey) {
      aiLogger.error('AI_API_KEY is not configured');
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'AI service is not properly configured' })}\n\n`);
      res.end();
      return;
    }

    if (!modelName) {
      aiLogger.error('AI_MODEL is not configured');
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'AI model is not configured' })}\n\n`);
      res.end();
      return;
    }

    const messages = [
      {
        role: 'system',
        content: ANALYSIS_SYSTEM_PROMPT_TEMPLATE(analysisContext)
      },
      {
        role: 'user',
        content: userMessage
      }
    ];

    aiLogger.info('Calling AI API with analysis context (streaming)', { model: modelName });

    // Build headers - always include Authorization, only add OpenRouter-specific headers if APP_URL is set
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    // Only add OpenRouter-specific headers if APP_URL is configured
    if (process.env.AI_APP_URL) {
      headers['HTTP-Referer'] = process.env.AI_APP_URL;
      headers['X-Title'] = process.env.AI_APP_NAME || 'NDT Platform';
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        messages,
        stream: true, // Enable streaming for real-time updates
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      aiLogger.error('AI API error', { status: response.status, body: errorText });
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to get AI analysis', details: errorText })}\n\n`);
      res.end();
      return;
    }

    // Stream the AI response
    const reader = response.body?.getReader();
    if (!reader) {
      aiLogger.error('No response body from AI API');
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Invalid AI response. Please try again.' })}\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedContent = '';

    aiLogger.info('Streaming AI analysis started');

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
                // Forward content to frontend
                res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
              }
            } catch {
              // Non-critical parse error, skip
            }
          }
        }
      }

      // Save complete AI response to DB (with color legend prepended for context)
      if (accumulatedContent) {
        // Prepend color legend to the assistant's response so follow-up questions have color context
        const colorLegendText = stats.legend && stats.legend.length > 0
          ? `\n\n---\n**Color Legend for Reference:**\n${stats.legend.map((item: any) => `- ${item.class}: ${hexToColorName(item.color)}`).join('\n')}`
          : '';

        const responseWithContext = accumulatedContent + colorLegendText;

        await pool.query(
          'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
          [sessionId, 'assistant', responseWithContext]
        );
        await pool.query(
          'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [sessionId]
        );
      }

      // Send completion signal
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        sessionId,
        finalContent: accumulatedContent
      })}\n\n`);
      res.end();

      aiLogger.success(`Analyze Area Request [${requestId}] completed`, {
        sessionId,
        totalArea: stats.total_area_km2,
        responseLength: accumulatedContent.length,
      });
      aiLogger.separator();

    } catch (streamError) {
      aiLogger.error('Stream error', streamError);

      if (accumulatedContent) {
        // Prepend color legend to the assistant's response so follow-up questions have color context
        const colorLegendText = stats.legend && stats.legend.length > 0
          ? `\n\n---\n**Color Legend for Reference:**\n${stats.legend.map((item: any) => `- ${item.class}: ${hexToColorName(item.color)}`).join('\n')}`
          : '';

        const responseWithContext = accumulatedContent + colorLegendText;

        await pool.query(
          'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
          [sessionId, 'assistant', responseWithContext]
        ).catch(() => {});
      }

      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream interrupted. Please try again.' })}\n\n`);
      res.end();
    }

  } catch (error: any) {
    aiLogger.error('Analyze Area error', error);

    // Check if headers already sent (streaming mode)
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Something went wrong during analysis',
        details: error.message
      });
    } else {
      // Send error as stream event
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Something went wrong during analysis', details: error.message })}\n\n`);
      res.end();
    }
  }
}
