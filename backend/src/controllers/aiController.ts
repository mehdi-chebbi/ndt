import { Request, Response } from 'express';
import pool from '../config/database';
import { aiLogger } from '../utils/logger';

// ── System Prompts ─────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the AI Copilot for AfriGeoData, a geospatial platform for African development data.

You help users explore and understand:
- Interactive maps with GeoServer WMS layers covering 54+ African countries
- WaterWatch Africa: water access data from 2000-2023 (urban vs rural gaps, country rankings)
- GiniWatch Africa: income inequality (Gini index) trends across the continent
- Land cover classification statistics via custom polygon drawing
- Data reporting and invalid data flagging
- Pre-computed country-level statistics per layer

STRICT BOUNDARIES:
- You are EXCLUSIVELY a geospatial assistant for AfriGeoData. You do NOT generate code, scripts, essays, poems, recipes, or any content unrelated to the platform.
- If a user asks you to generate code or perform tasks completely unrelated to geospatial/African development data, politely refuse and redirect them to the platform's features.
- You may briefly clarify a general concept ONLY if it directly helps the user understand the platform's data (e.g. explaining what a Gini index is).

COLOR & LEGEND AWARENESS:
- When a user asks about a color (e.g. "what does grey mean?", "c'est quoi le couleur rose?", "what's that blue area?"), ALWAYS look for color legend context in the conversation history and answer based on the map legend — never answer with general color theory.
- If no legend is available in the conversation history, say so and ask the user to run an area analysis first.

DATABASE QUERY TOOLS:
You have access to the platform's database to retrieve real data. When a user asks about specific data (layers, stats, countries), you MUST use these tools instead of guessing.

To query the database, respond with ONLY a JSON object (no other text before or after):
{"tools": [{"name": "<tool_name>", "args": {"<arg1>": "<value1>"}}]}

You can call multiple tools in a single request by including multiple entries in the tools array.
Do NOT add any explanation before or after the JSON.

Available tools:

1. get_available_layers
   - Description: List all available map layers on the platform
   - Args (all optional):
     - search (string): keyword to filter layers by name (e.g. "water", "forest", "trends")
     - group (string): filter by group/category name (e.g. "Water", "Trends.Earth")
   - Returns: list of layers with their names, groups, and descriptions
   - Use when: user asks "what layers do you have?", "what data is available for water?", "show me all layers", "what groups exist"

2. get_country_stats
   - Description: Get pre-computed land cover statistics for a specific country and layer
   - Args (both required):
     - country (string): country name in English (e.g. "Nigeria", "Algeria", "Kenya")
     - layer (string): layer keyword to search by (e.g. "trends", "water", "gini", "land cover")
   - Returns: statistics including total area, pixel size, and class distribution with percentages
   - Use when: user asks about stats for a specific country+layer combination

3. get_countries_for_layer
   - Description: Get all countries that have pre-computed statistics for a given layer
   - Args:
     - layer (string, required): layer keyword (e.g. "trends", "water")
   - Returns: list of countries with available data for that layer
   - Use when: user asks "which countries have trends data?", "what countries are available for X?"

IMPORTANT TOOL RULES:
- Pass the user's words as-is to the tools — the backend handles fuzzy matching. Do NOT try to guess or construct exact internal layer names (e.g. use "trends" not "LPD-Trends.Earth-250m").
- When you receive tool results with status "multiple_matches", list the matching options and ask the user to clarify. NEVER guess which one they meant.
- When you receive status "not_found", tell the user no matching data was found and suggest they check the exact name.
- When you receive status "no_stats", tell the user no pre-computed stats exist yet for that country+layer combination.
- When the user's question is general and does NOT require database lookups (e.g. "how do I draw a polygon?", "what is Gini index?"), respond directly WITHOUT using any tools.

CHART GENERATION:
When your response includes numerical data with 3+ categories that would benefit from visualization (percentages, distributions, comparisons, trends), you MUST include a chart specification. This makes data much easier to understand.

To include a chart, add a fenced code block with the \`chart\` language tag:

\`\`\`chart
{
  "type": "pie",
  "title": "Nigeria Land Cover Distribution",
  "data": [
    {"name": "Forest", "value": 32.5},
    {"name": "Agriculture", "value": 45.2},
    {"name": "Urban", "value": 8.1},
    {"name": "Water", "value": 5.3}
  ]
}
\`\`\`

Chart types and when to use them:
- "pie": Class distributions, percentage breakdowns, land cover composition
- "donut": Same as pie but cleaner look for 3-6 categories
- "bar": Comparing quantities across categories (vertical bars)
- "horizontal-bar": Same as bar but better when category names are long
- "line": Time-series data, trends over years

Data format rules:
- For pie/donut: each item MUST have "name" (string) and "value" (number) keys
- For bar/horizontal-bar: each item MUST have "name" (string) and "value" (number) keys
- For line: each item MUST have "name" (string, e.g. year) and "value" (number) keys
- "title" is optional but recommended
- You may include multiple charts in a single response
- Do NOT include a chart for simple 1-2 number answers or yes/no questions
- ALWAYS include a chart when presenting statistical data with 3+ categories
- Keep the chart data array flat and simple — no nested objects

Guidelines:
- Be concise and helpful. This is a side-panel chat, keep responses focused.
- Respond in the same language the user uses.
- When discussing data, be specific about numbers, dates, and sources when possible.
- Never claim to have real-time access to the map — you can only discuss what you've been told via tools or conversation history.
- NEVER ask the user for permission to use database tools. If a question requires data, call the tools immediately and present the results. Do not say "Shall I query?" or "Would you like me to?" — just do it.
- When a question requires querying multiple countries or a large batch, do NOT ask for confirmation. Execute all necessary tool calls and present the results.
- Never drift into general assistant behavior. Always bring the conversation back to AfriGeoData's features and data.`;

// Special system prompt for area analysis (structured output) — unchanged
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

CHART: You MUST include a chart visualizing the class distribution. Use a fenced code block with the \`chart\` language tag:

\`\`\`chart
{
  "type": "pie",
  "title": "Land Cover Distribution",
  "data": [
    {"name": "Class Name", "value": 45.2},
    {"name": "Another Class", "value": 32.1}
  ]
}
\`\`\`

Use "pie" or "donut" for class distributions. Each data item MUST have "name" (string) and "value" (number, use the percentage) keys. If there are many small classes, group the ones under 5% into an "Other" category.

Be concise, spatially aware, and data-driven. Focus on actionable insights.
Respond in the same language the user uses.`;

const MAX_CONTEXT_MESSAGES = 20;

// ── Types ──────────────────────────────────────────────────────────

interface ApiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ToolCall {
  name: string;
  args: Record<string, any>;
}

interface ToolResult {
  tool: string;
  args: Record<string, any>;
  status: string;
  data?: any;
  message?: string;
}

interface ChatRequestBody {
  sessionId: number;
  message: string;
}

// ── DB Tools ───────────────────────────────────────────────────────

async function getAvailableLayers(args: Record<string, any>): Promise<any> {
  const search = args.search ? String(args.search) : null;
  const group = args.group ? String(args.group) : null;

  let query = `
    SELECT l.geoserver_name, l.display_name, l.is_active, l.sort_order,
           g.name as group_name, g.description as group_description
    FROM layers l
    LEFT JOIN layer_groups g ON l.group_id = g.id
    WHERE l.is_active = true
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (search) {
    query += ` AND (l.geoserver_name ILIKE $${paramIndex} OR l.display_name ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (group) {
    query += ` AND g.name ILIKE $${paramIndex}`;
    params.push(`%${group}%`);
    paramIndex++;
  }

  query += ` ORDER BY g.sort_order ASC NULLS LAST, l.sort_order ASC`;

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    return {
      status: 'not_found',
      message: search
        ? `No layers found matching "${search}"${group ? ` in group "${group}"` : ''}`
        : `No layers found${group ? ` in group "${group}"` : ''}`,
    };
  }

  return {
    status: 'found',
    layers: result.rows.map((row) => ({
      name: row.geoserver_name,
      display_name: row.display_name,
      group: row.group_name,
      group_description: row.group_description,
    })),
  };
}

async function getCountryStats(args: Record<string, any>): Promise<any> {
  const country = args.country ? String(args.country) : null;
  const layerKeyword = args.layer ? String(args.layer) : null;

  if (!country || !layerKeyword) {
    return { status: 'error', message: 'Both "country" and "layer" are required' };
  }

  // Step 1: Find matching layers
  const layerResult = await pool.query(
    `SELECT l.id, l.geoserver_name, l.display_name, g.name as group_name
     FROM layers l
     LEFT JOIN layer_groups g ON l.group_id = g.id
     WHERE l.is_active = true
       AND (l.geoserver_name ILIKE $1 OR l.display_name ILIKE $1)
     ORDER BY l.sort_order ASC`,
    [`%${layerKeyword}%`],
  );

  if (layerResult.rows.length === 0) {
    return { status: 'not_found', message: `No layer found matching "${layerKeyword}"` };
  }

  if (layerResult.rows.length > 1) {
    return {
      status: 'multiple_matches',
      message: `Multiple layers match "${layerKeyword}". Please ask the user to clarify.`,
      matches: layerResult.rows.map((r) => ({
        name: r.geoserver_name,
        display_name: r.display_name,
        group: r.group_name,
      })),
    };
  }

  const layer = layerResult.rows[0];

  // Step 2: Find matching country stats
  const statsResult = await pool.query(
    `SELECT country_file, total_area_km2, pixel_size_m, class_stats, computed_at
     FROM country_stats
     WHERE layer_id = $1 AND country_file ILIKE $2`,
    [layer.id, `%${country}%`],
  );

  if (statsResult.rows.length === 0) {
    // Check what countries ARE available for this layer (sample)
    const availableResult = await pool.query(
      `SELECT country_file FROM country_stats WHERE layer_id = $1 ORDER BY country_file ASC LIMIT 10`,
      [layer.id],
    );
    const availableCountries = availableResult.rows.map((r) =>
      r.country_file.replace('.geojson', ''),
    );

    return {
      status: 'no_stats',
      message: `No pre-computed stats found for "${country}" on layer "${layer.geoserver_name}"`,
      available_countries_sample: availableCountries,
    };
  }

  if (statsResult.rows.length > 1) {
    return {
      status: 'multiple_matches',
      message: `Multiple countries match "${country}"`,
      matches: statsResult.rows.map((r) => ({
        country: r.country_file.replace('.geojson', ''),
        total_area_km2: r.total_area_km2,
        computed_at: r.computed_at,
      })),
    };
  }

  // Single match — build full stats response
  const stats = statsResult.rows[0];
  const countryName = stats.country_file.replace('.geojson', '');

  // Get class labels for human-readable names
  const layerInfo = await pool.query('SELECT class_labels FROM layers WHERE id = $1', [layer.id]);
  const classLabels = layerInfo.rows[0]?.class_labels || {};

  // Format class_stats: handles both array (from batch route) and dict formats
  const classStatsRaw = stats.class_stats || {};
  const classStatsArray = Array.isArray(classStatsRaw)
    ? classStatsRaw
    : Object.values(classStatsRaw);
  const totalPixels = classStatsArray.reduce(
    (sum: number, c: any) => sum + (c.pixels || 0),
    0,
  );

  const formattedClasses = classStatsArray.map((data: any) => {
    const classId = String(data.class_id ?? '');
    return {
      class_id: classId,
      class_name: data.class_name || classLabels[classId] || `Unknown (${classId})`,
      pixels: data.pixels || 0,
      area_km2: data.area_km2 || 0,
      percentage: totalPixels > 0 ? Math.round(((data.pixels || 0) / totalPixels) * 1000) / 10 : 0,
    };
  });

  return {
    status: 'found',
    country: countryName,
    layer: {
      name: layer.geoserver_name,
      display_name: layer.display_name,
      group: layer.group_name,
    },
    total_area_km2: stats.total_area_km2,
    pixel_size_m: stats.pixel_size_m,
    classes: formattedClasses,
    computed_at: stats.computed_at,
  };
}

async function getCountriesForLayer(args: Record<string, any>): Promise<any> {
  const layerKeyword = args.layer ? String(args.layer) : null;

  if (!layerKeyword) {
    return { status: 'error', message: '"layer" is required' };
  }

  // Find matching layers
  const layerResult = await pool.query(
    `SELECT l.id, l.geoserver_name, l.display_name
     FROM layers l
     WHERE l.is_active = true
       AND (l.geoserver_name ILIKE $1 OR l.display_name ILIKE $1)
     ORDER BY l.sort_order ASC`,
    [`%${layerKeyword}%`],
  );

  if (layerResult.rows.length === 0) {
    return { status: 'not_found', message: `No layer found matching "${layerKeyword}"` };
  }

  if (layerResult.rows.length > 1) {
    return {
      status: 'multiple_matches',
      message: `Multiple layers match "${layerKeyword}". Please ask the user to clarify.`,
      matches: layerResult.rows.map((r) => ({
        name: r.geoserver_name,
        display_name: r.display_name,
      })),
    };
  }

  const layer = layerResult.rows[0];

  // Get countries with stats for this layer
  const statsResult = await pool.query(
    `SELECT country_file, total_area_km2, computed_at
     FROM country_stats
     WHERE layer_id = $1
     ORDER BY country_file ASC`,
    [layer.id],
  );

  if (statsResult.rows.length === 0) {
    return {
      status: 'no_stats',
      message: `No pre-computed stats available for layer "${layer.geoserver_name}" yet`,
    };
  }

  return {
    status: 'found',
    layer: {
      name: layer.geoserver_name,
      display_name: layer.display_name,
    },
    countries: statsResult.rows.map((r) => ({
      name: r.country_file.replace('.geojson', ''),
      total_area_km2: r.total_area_km2,
      computed_at: r.computed_at,
    })),
    total_countries: statsResult.rows.length,
  };
}

// ── Tool Registry ──────────────────────────────────────────────────

const toolRegistry: Record<string, (args: Record<string, any>) => Promise<any>> = {
  get_available_layers: getAvailableLayers,
  get_country_stats: getCountryStats,
  get_countries_for_layer: getCountriesForLayer,
};

// ── DB Request Parsing ─────────────────────────────────────────────

/** Extract {"tools": [...]} from AI response — lenient parser for small models */
function parseDbRequest(content: string): ToolCall[] | null {
  // Strategy 1: Find {"tools": in the response and extract JSON from that point
  const toolsIndex = content.indexOf('{"tools"');
  const toolsIndex2 = content.indexOf('{\n  "tools"');
  const startIdx = toolsIndex !== -1 ? toolsIndex : toolsIndex2;

  if (startIdx === -1) return null;

  // Extract from the opening { to the matching closing }
  let depth = 0;
  let endIdx = -1;

  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') depth--;
    if (depth === 0) {
      endIdx = i + 1;
      break;
    }
  }

  if (endIdx === -1) return null;

  const jsonStr = content.substring(startIdx, endIdx);

  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.tools && Array.isArray(parsed.tools) && parsed.tools.length > 0) {
      return parsed.tools.map((t: any) => ({
        name: String(t.name),
        args: t.args || {},
      }));
    }
    aiLogger.warning('Parsed JSON has no valid tools array', { jsonStr });
    return null;
  } catch (e) {
    aiLogger.warning('Failed to parse tools JSON', { jsonStr, error: e });
    return null;
  }
}

/** Strip any DB_REQUEST markers or raw JSON from text before showing to user */
function cleanResponseForUser(content: string): string {
  let cleaned = content;
  // Remove [DB_REQUEST] and [/DB_REQUEST] tags
  cleaned = cleaned.replace(/\[\/]?DB_REQUEST\]/g, '');
  // Remove any standalone {"tools": ...} JSON blocks
  cleaned = cleaned.replace(/\s*\{[^{}]*"tools"[\\s\\S]*?\}\s*/g, '');
  return cleaned.trim();
}

// ── Execute Tools ──────────────────────────────────────────────────

async function executeTools(toolCalls: ToolCall[]): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const call of toolCalls) {
    const toolFn = toolRegistry[call.name];

    if (!toolFn) {
      aiLogger.warning('Unknown tool requested', { tool: call.name });
      results.push({
        tool: call.name,
        args: call.args,
        status: 'error',
        message: `Unknown tool: ${call.name}`,
      });
      continue;
    }

    try {
      aiLogger.info(`Executing tool: ${call.name}`, { args: call.args });
      const result = await toolFn(call.args);
      results.push({
        tool: call.name,
        args: call.args,
        status: result.status || 'found',
        data: result,
      });
      aiLogger.info(`Tool ${call.name} completed`, { status: result.status });
    } catch (error: any) {
      aiLogger.error(`Tool ${call.name} failed`, error);
      results.push({
        tool: call.name,
        args: call.args,
        status: 'error',
        message: `Database error: ${error.message}`,
      });
    }
  }

  return results;
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Extract plain text from stored message content.
 * Handles legacy multimodal JSON arrays (old format) and plain strings.
 */
function extractTextFromContent(content: string): string {
  if (!content) return '';
  if (!content.startsWith('[')) return content; // plain string

  try {
    const parts = JSON.parse(content);
    if (!Array.isArray(parts)) return content;
    return parts
      .filter((p: any) => p.type === 'text' && p.text)
      .map((p: any) => p.text)
      .join(' ')
      .trim();
  } catch {
    return content; // not valid JSON, return as-is
  }
}

/** Build the messages array for the AI API */
function buildApiMessages(
  dbMessages: { role: string; content: string }[],
  newMessage: string,
): ApiMessage[] {
  const apiMessages: ApiMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];

  // Include recent messages from DB (including system messages for DB context)
  const recent = dbMessages.slice(-MAX_CONTEXT_MESSAGES);

  for (const msg of recent) {
    const text = extractTextFromContent(msg.content);
    if (!text) continue;

    if (msg.role === 'system') {
      // Preserve DB context system messages
      apiMessages.push({ role: 'system', content: text });
    } else if (msg.role === 'user' || msg.role === 'assistant') {
      apiMessages.push({ role: msg.role, content: text });
    }
  }

  // Add new user message
  if (newMessage.trim()) {
    apiMessages.push({ role: 'user', content: newMessage });
  }

  return apiMessages;
}

/** Build AI API headers */
function buildApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.AI_API_KEY}`,
    'Content-Type': 'application/json',
  };

  if (process.env.AI_APP_URL) {
    headers['HTTP-Referer'] = process.env.AI_APP_URL;
    headers['X-Title'] = process.env.AI_APP_NAME || 'NDT Platform';
  }

  return headers;
}

/** Validate AI env vars */
function validateAiConfig(): { ok: boolean; error?: string } {
  if (!process.env.AI_BASE_URL) return { ok: false, error: 'AI_BASE_URL is not configured' };
  if (!process.env.AI_API_KEY) return { ok: false, error: 'AI_API_KEY is not configured' };
  if (!process.env.AI_MODEL) return { ok: false, error: 'AI_MODEL is not configured' };
  return { ok: true };
}

/** Smart-stream Round 1: buffers initially to detect tool calls, then flushes+streams if safe.
 *
 *  Strategy:
 *  1. Buffer chunks silently while we check if the response starts with `{` (tool call pattern)
 *  2. As soon as we see the first non-whitespace char is NOT `{`, it's a regular response
 *     → flush the buffered content to client and switch to streaming mode
 *  3. If it starts with `{`, keep buffering silently (might be a tool call)
 *  4. Returns { text, alreadyStreaming } so the caller knows whether content was already sent
 */
async function smartStreamRound1(
  res: Response,
  messages: ApiMessage[],
): Promise<{ text: string; alreadyStreaming: boolean }> {
  const { baseUrl, modelName } = {
    baseUrl: process.env.AI_BASE_URL!,
    modelName: process.env.AI_MODEL!,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildApiHeaders(),
    body: JSON.stringify({
      model: modelName,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body from AI API');

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let alreadyStreaming = false;

  // We buffer until we can determine if this is a tool call or not.
  // Tool calls always start with `{` (like {"tools": [...]}).
  // Regular responses start with letters, markdown, spaces, etc.
  let decisionMade = false;

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
            accumulated += content;

            if (!decisionMade) {
              // Check if we have enough text to make a decision
              const trimmedAccum = accumulated.trimStart();

              if (trimmedAccum.length > 0) {
                // We have visible content — is it a tool call?
                if (trimmedAccum[0] === '{') {
                  // Starts with { — could be a tool call, keep buffering silently
                  // But also check: if it's been going on for a while without
                  // looking like a tool call, it might be a markdown code block or similar
                  if (trimmedAccum.includes('"tools"') || trimmedAccum.length < 200) {
                    // Still looks like it could be a tool call, keep buffering
                    continue;
                  } else {
                    // Started with { but doesn't contain "tools" and is long —
                    // probably not a tool call, safe to stream
                    decisionMade = true;
                    alreadyStreaming = true;
                    res.write(`data: ${JSON.stringify({ content: accumulated })}\n\n`);
                  }
                } else {
                  // Doesn't start with { — definitely NOT a tool call, safe to stream!
                  decisionMade = true;
                  alreadyStreaming = true;
                  res.write(`data: ${JSON.stringify({ content: accumulated })}\n\n`);
                }
              }
              // else: still only whitespace, keep buffering
            } else if (alreadyStreaming) {
              // Decision already made — stream directly to client
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          }
        } catch {
          // Non-critical parse error, skip
        }
      }
    }
  }

  return { text: accumulated, alreadyStreaming };
}

/** Stream AI response and forward chunks to client, returns accumulated text */
async function streamAiToClient(
  res: Response,
  messages: ApiMessage[],
): Promise<string> {
  const { baseUrl, modelName } = {
    baseUrl: process.env.AI_BASE_URL!,
    modelName: process.env.AI_MODEL!,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildApiHeaders(),
    body: JSON.stringify({
      model: modelName,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body from AI API');

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

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
            accumulated += content;
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        } catch {
          // Non-critical parse error, skip
        }
      }
    }
  }

  return accumulated;
}

// ── Main Chat Handler ──────────────────────────────────────────────

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

    // Normalize message to string
    const messageText = typeof message === 'string' ? message : String(message);

    aiLogger.debug('Request', {
      userId,
      sessionId,
      messagePreview: messageText.substring(0, 80),
    });

    // ── Verify session belongs to user ──
    const sessionCheck = await pool.query(
      'SELECT id, user_id FROM chat_sessions WHERE id = $1',
      [sessionId],
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (sessionCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // ── Load chat history ──
    const messagesResult = await pool.query(
      'SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId],
    );

    const dbMessages = messagesResult.rows as { role: string; content: string }[];

    // ── Validate AI config ──
    const configCheck = validateAiConfig();
    if (!configCheck.ok) {
      aiLogger.error(configCheck.error!);
      return res.status(500).json({ error: `AI service error: ${configCheck.error}` });
    }

    // ── Set up SSE ──
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // ── Save user message to DB ──
    const userMessageCount = dbMessages.filter((m) => m.role === 'user').length;

    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'user', messageText],
    );

    if (userMessageCount === 0) {
      const title =
        messageText.length > 60
          ? messageText.substring(0, 57) + '...'
          : messageText;
      await pool.query(
        'UPDATE chat_sessions SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [title || 'New chat', sessionId],
      );
    } else {
      await pool.query(
        'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId],
      );
    }

    // ── Build messages ──
    const apiMessages = buildApiMessages(dbMessages, messageText);

    aiLogger.info('Context built', {
      totalDbMessages: dbMessages.length,
      sentToApi: apiMessages.length,
      model: process.env.AI_MODEL,
    });

    // ═══════════════════════════════════════════════════════════════
    // ROUND 1: Smart-stream — buffer to detect tool calls, then flush+stream if safe
    // ═══════════════════════════════════════════════════════════════

    let round1Text: string;
    let alreadyStreaming: boolean;
    try {
      aiLogger.info('Round 1: Smart-streaming (buffering to detect tool calls)...');
      const round1Result = await smartStreamRound1(res, apiMessages);
      round1Text = round1Result.text;
      alreadyStreaming = round1Result.alreadyStreaming;
      aiLogger.info('Round 1 complete', {
        length: round1Text.length,
        hasTools: round1Text.includes('"tools"'),
        alreadyStreaming,
      });
    } catch (error: any) {
      aiLogger.error('Round 1 failed', error);

      if (error.message?.includes('451')) {
        res.write(
          `data: ${JSON.stringify({
            error: 'Your message was blocked by the content filter. Please rephrase and try again.',
          })}\n\n`,
        );
      } else {
        res.write(
          `data: ${JSON.stringify({
            error: 'Failed to get AI response. Please try again.',
          })}\n\n`,
        );
      }
      res.end();
      return;
    }

    // ── Check for tool calls ──
    const toolCalls = parseDbRequest(round1Text);

    if (!toolCalls) {
      // ═══════════════════════════════════════════════════════════
      // NO DB NEEDED — content already streamed to client (or send now if still buffered)
      // ═══════════════════════════════════════════════════════════

      aiLogger.info('No DB query needed — finalizing response', { alreadyStreaming });

      // Clean any accidental markers before showing to user
      const cleanResponse = cleanResponseForUser(round1Text);

      // Save assistant response
      if (cleanResponse) {
        await pool.query(
          'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
          [sessionId, 'assistant', round1Text],
        );
        await pool.query(
          'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [sessionId],
        );
      }

      if (alreadyStreaming) {
        // Content was already streamed chunk-by-chunk to the client — just close
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        // Still buffered (started with '{' but wasn't a tool call) — send as one chunk
        res.write(`data: ${JSON.stringify({ content: cleanResponse })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }

      aiLogger.success(`Request [${requestId}] completed (direct)`, {
        responseLength: cleanResponse.length,
        alreadyStreaming,
      });
      aiLogger.separator();
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // DB QUERY NEEDED — execute tools, then stream AI response
    // ═══════════════════════════════════════════════════════════════

    aiLogger.info(`DB query needed — executing ${toolCalls.length} tool(s)`, {
      tools: toolCalls.map((t) => t.name),
    });

    // Notify frontend that we're searching the database
    res.write(`data: ${JSON.stringify({ type: 'searching' })}\n\n`);

    // Execute tools
    const toolResults = await executeTools(toolCalls);

    aiLogger.info('Tool execution complete', {
      results: toolResults.map((r) => ({ tool: r.tool, status: r.status })),
    });

    // Build DB results context for AI
    const dbContextParts = toolResults.map((r) => {
      const resultStr = JSON.stringify(r.data, null, 2);
      return `Tool: ${r.tool}(args: ${JSON.stringify(r.args)})\nResult: ${resultStr}`;
    });

    const dbResultsMessage = `DATABASE QUERY RESULTS:\n\n${dbContextParts.join('\n\n---\n\n')}\n\nINSTRUCTIONS:
- If any result has status "multiple_matches", list the matching options and ask the user to clarify. NEVER guess.
- If any result has status "not_found" or "no_stats", inform the user accordingly.
- If results have status "found", analyze the data and provide a clear, helpful response.`;

    // Save DB results as system message for conversation continuity
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'system', dbResultsMessage],
    );

    // ═══════════════════════════════════════════════════════════════
    // ROUND 2: Streamed call — AI analyzes DB results
    // ═══════════════════════════════════════════════════════════════

    aiLogger.info('Round 2: Streaming AI response with DB context...');

    // Build messages for round 2: original messages + DB results + AI's round 1 as assistant
    const round2Messages: ApiMessage[] = [
      ...apiMessages,
      { role: 'assistant', content: JSON.stringify({ tools: toolCalls }) },
      { role: 'system', content: dbResultsMessage },
    ];

    let round2Content: string;
    try {
      round2Content = await streamAiToClient(res, round2Messages);
    } catch (error: any) {
      aiLogger.error('Round 2 failed', error);
      res.write(
        `data: ${JSON.stringify({
          error: 'Failed to analyze database results. Please try again.',
        })}\n\n`,
      );
      res.end();
      return;
    }

    // Save final assistant response
    if (round2Content) {
      await pool.query(
        'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
        [sessionId, 'assistant', round2Content],
      );
      await pool.query(
        'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId],
      );
    }

    res.write('data: [DONE]\n\n');
    res.end();

    aiLogger.success(`Request [${requestId}] completed (DB-assisted)`, {
      toolsUsed: toolCalls.map((t) => t.name),
      toolResults: toolResults.map((r) => r.status),
      responseLength: round2Content.length,
    });
    aiLogger.separator();
  } catch (error: any) {
    aiLogger.error('Chat error', error);

    if (!res.headersSent) {
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    } else {
      res.write(
        `data: ${JSON.stringify({ error: 'Something went wrong. Please try again.' })}\n\n`,
      );
      res.end();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// Analyze Area with AI — unchanged
// ═══════════════════════════════════════════════════════════════════

// Helper: Convert hex color to user-friendly color name
function hexToColorName(hex: string): string {
  const color = hex.replace('#', '').toLowerCase();

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;

  const namedColors: { name: string; r: number; g: number; b: number }[] = [
    { name: 'red', r: 220, g: 20, b: 30 },
    { name: 'dark red', r: 139, g: 0, b: 0 },
    { name: 'pink', r: 255, g: 150, b: 200 },
    { name: 'light pink', r: 255, g: 182, b: 220 },
    { name: 'magenta', r: 255, g: 0, b: 255 },
    { name: 'orange', r: 255, g: 140, b: 0 },
    { name: 'brown orange', r: 180, g: 100, b: 20 },
    { name: 'brown', r: 139, g: 69, b: 19 },
    { name: 'beige', r: 196, g: 196, b: 138 },
    { name: 'yellow', r: 255, g: 220, b: 0 },
    { name: 'yellow green', r: 180, g: 210, b: 80 },
    { name: 'light green', r: 144, g: 238, b: 100 },
    { name: 'green', r: 0, g: 180, b: 0 },
    { name: 'dark green', r: 0, g: 80, b: 0 },
    { name: 'olive', r: 107, g: 142, b: 35 },
    { name: 'cyan', r: 0, g: 210, b: 210 },
    { name: 'light blue', r: 100, g: 180, b: 255 },
    { name: 'blue', r: 30, g: 100, b: 220 },
    { name: 'dark blue', r: 0, g: 0, b: 139 },
    { name: 'navy', r: 0, g: 0, b: 80 },
    { name: 'purple', r: 148, g: 0, b: 211 },
    { name: 'light purple', r: 200, g: 150, b: 220 },
    { name: 'light grey', r: 211, g: 211, b: 211 },
    { name: 'grey', r: 128, g: 128, b: 128 },
    { name: 'dark grey', r: 64, g: 64, b: 64 },
    { name: 'white', r: 255, g: 255, b: 255 },
    { name: 'black', r: 0, g: 0, b: 0 },
    { name: 'sand', r: 210, g: 190, b: 140 },
    { name: 'cream', r: 255, g: 240, b: 200 },
    { name: 'turquoise', r: 64, g: 224, b: 208 },
    { name: 'gold', r: 210, g: 180, b: 30 },
  ];

  let closestName = hex;
  let minDistance = Infinity;

  for (const { name, r: nr, g: ng, b: nb } of namedColors) {
    const distance = Math.sqrt(
      Math.pow(r - nr, 2) + Math.pow(g - ng, 2) + Math.pow(b - nb, 2),
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

  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;

  if (group.legend && group.legend.length > 0) {
    return group.legend;
  }

  if (group.parent_id) {
    return findInheritedLegend(group.parent_id, groups);
  }

  return null;
}

async function calculatePolygonStats(layerName: string, polygon: any): Promise<any> {
  const result = await pool.query(
    `SELECT l.*, g.id as group_table_id, g.name as group_name, g.parent_id as group_parent_id, g.legend as group_legend
     FROM layers l
     LEFT JOIN layer_groups g ON l.group_id = g.id
     WHERE l.geoserver_name = $1`,
    [layerName],
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

  const allGroupsResult = await pool.query(
    'SELECT id, name, parent_id, legend FROM layer_groups ORDER BY sort_order ASC, created_at ASC',
  );
  const allGroups = allGroupsResult.rows;

  const clipServiceUrl = process.env.CLIP_SERVICE_URL || 'http://clip-service:3005';
  aiLogger.info('[AI-Stats] Calling clip-service for layer', {
    layerName,
    polygonType: polygon.type,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);

  try {
    const response = await fetch(`${clipServiceUrl}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raster_path: filePath, polygon }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text();
      aiLogger.error('[AI-Stats] Clip-service error', {
        status: response.status,
        body: errorBody,
      });
      throw new Error(errorBody || `Clip-service returned ${response.status}`);
    }

    const stats = await response.json();

    const legend =
      layer.legend && layer.legend.length > 0
        ? layer.legend
        : findInheritedLegend(layer.group_id, allGroups);

    const colorMapping: { [key: string]: string } = {};
    if (legend && legend.length > 0) {
      legend.forEach((item: any) => {
        if (item.class && item.color) {
          colorMapping[item.class] = item.color;
        }
      });
    }

    const totalPixels = stats.total_pixels;
    const classesWithPercentage = stats.classes.map((cls: any) => ({
      class_id: cls.class_id,
      class_name: classLabels[cls.class_id] || `Unknown (${cls.class_id})`,
      area_km2: cls.area_km2,
      percentage:
        totalPixels > 0 ? Math.round((cls.pixels / totalPixels) * 100 * 10) / 10 : 0,
      color: colorMapping[classLabels[cls.class_id]] || null,
    }));

    aiLogger.info('[AI-Stats] Success', {
      layerName,
      classCount: classesWithPercentage.length,
      totalArea: stats.total_area_km2,
    });

    return {
      layer_name: layerName,
      total_area_km2: stats.total_area_km2,
      pixel_size_m: stats.pixel_size_m,
      classes: classesWithPercentage,
      legend: legend || null,
    };
  } catch (error: any) {
    clearTimeout(timeout);

    if (error.name === 'AbortError') {
      aiLogger.error('[AI-Stats] Clip-service request timed out');
      throw new Error('Stats computation timed out');
    }

    throw error;
  }
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
    coords = polygon.coordinates[0][0];
  } else {
    return 'Unknown location';
  }

  if (!coords || coords.length === 0) {
    return 'Unknown location';
  }

  const lats = coords.map((c) => c[1]);
  const lons = coords.map((c) => c[0]);

  const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const avgLon = lons.reduce((a, b) => a + b, 0) / lons.length;

  const latDir = avgLat >= 0 ? 'N' : 'S';
  const lonDir = avgLon >= 0 ? 'E' : 'W';

  return `${Math.abs(avgLat).toFixed(1)}°${latDir}, ${Math.abs(avgLon).toFixed(1)}°${lonDir}`;
}

interface AnalyzeAreaRequestBody {
  layer_name: string;
  polygon: any;
}

export async function analyzeAreaWithAI(req: Request, res: Response) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    aiLogger.separator();
    aiLogger.info(`=== New Analyze Area Request [${requestId}] ===`);

    const { layer_name, polygon }: AnalyzeAreaRequestBody = req.body;
    const userId = (req as any).userId;

    if (!layer_name || !polygon) {
      aiLogger.warning('Invalid request', { layer_name, hasPolygon: !!polygon });
      return res.status(400).json({ error: 'layer_name and polygon are required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    aiLogger.info('Request', { userId, layer_name, polygonType: polygon.type });

    aiLogger.info('Step 1: Computing statistics...');
    let stats: any;
    try {
      stats = await calculatePolygonStats(layer_name, polygon);
      aiLogger.info('Statistics computed', {
        totalArea: stats.total_area_km2,
        classCount: stats.classes.length,
      });
    } catch (statsError: any) {
      aiLogger.error('Failed to compute statistics', statsError);
      return res
        .status(500)
        .json({ error: 'Failed to compute statistics', details: statsError.message });
    }

    const location = extractLocationFromPolygon(polygon);

    const classDistribution = stats.classes
      .map((cls: any) => {
        const colorInfo = cls.color ? ` (${hexToColorName(cls.color)})` : '';
        return `- ${cls.class_name}${colorInfo}: ${cls.percentage}% (${cls.area_km2.toFixed(2)} km²)`;
      })
      .join('\n');

    const colorMapping =
      stats.legend && stats.legend.length > 0
        ? stats.legend
            .map((item: any) => `- ${item.class}: ${hexToColorName(item.color)}`)
            .join('\n')
        : 'No color information available.';

    const analysisContext = {
      layerName: layer_name,
      location,
      totalArea: stats.total_area_km2.toFixed(2),
      classDistribution,
      colorMapping,
    };

    aiLogger.info('Step 2: Creating AI session...');
    let sessionId: number;
    try {
      const sessionResult = await pool.query(
        `INSERT INTO chat_sessions (user_id, title, is_active) VALUES ($1, $2, true) RETURNING id`,
        [userId, `Analysis: ${layer_name}`],
      );
      sessionId = sessionResult.rows[0].id;
      aiLogger.info('AI session created', { sessionId });
    } catch (dbError: any) {
      aiLogger.error('Failed to create AI session', dbError);
      return res.status(500).json({ error: 'Failed to create AI session' });
    }

    aiLogger.info('Step 3: Sending analysis request to AI...');

    const userMessage = 'Analyze this area based on the provided geospatial data.';

    try {
      await pool.query(
        'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
        [sessionId, 'user', userMessage],
      );
    } catch (dbError: any) {
      aiLogger.error('Failed to save user message', dbError);
    }

    aiLogger.info('Step 4: Streaming AI response...');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(
      `data: ${JSON.stringify({ type: 'stats', sessionId, stats, layerName: layer_name })}\n\n`,
    );

    const baseUrl = process.env.AI_BASE_URL;
    const apiKey = process.env.AI_API_KEY;
    const modelName = process.env.AI_MODEL;

    if (!baseUrl || !apiKey || !modelName) {
      aiLogger.error('AI config incomplete');
      res.write(
        `data: ${JSON.stringify({ type: 'error', error: 'AI service is not properly configured' })}\n\n`,
      );
      res.end();
      return;
    }

    const messages = [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT_TEMPLATE(analysisContext) },
      { role: 'user', content: userMessage },
    ];

    aiLogger.info('Calling AI API with analysis context (streaming)', { model: modelName });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    if (process.env.AI_APP_URL) {
      headers['HTTP-Referer'] = process.env.AI_APP_URL;
      headers['X-Title'] = process.env.AI_APP_NAME || 'NDT Platform';
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: modelName, messages, stream: true }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      aiLogger.error('AI API error', { status: response.status, body: errorText });
      res.write(
        `data: ${JSON.stringify({ type: 'error', error: 'Failed to get AI analysis', details: errorText })}\n\n`,
      );
      res.end();
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      aiLogger.error('No response body from AI API');
      res.write(
        `data: ${JSON.stringify({ type: 'error', error: 'Invalid AI response. Please try again.' })}\n\n`,
      );
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
                res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
              }
            } catch {
              // Non-critical parse error, skip
            }
          }
        }
      }

      if (accumulatedContent) {
        const colorLegendText =
          stats.legend && stats.legend.length > 0
            ? `\n\n---\n**Color Legend for Reference:**\n${stats.legend.map((item: any) => `- ${item.class}: ${hexToColorName(item.color)}`).join('\n')}`
            : '';

        const responseWithContext = accumulatedContent + colorLegendText;

        await pool.query(
          'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
          [sessionId, 'assistant', responseWithContext],
        );
        await pool.query(
          'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [sessionId],
        );
      }

      res.write(
        `data: ${JSON.stringify({ type: 'complete', sessionId, finalContent: accumulatedContent })}\n\n`,
      );
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
        const colorLegendText =
          stats.legend && stats.legend.length > 0
            ? `\n\n---\n**Color Legend for Reference:**\n${stats.legend.map((item: any) => `- ${item.class}: ${hexToColorName(item.color)}`).join('\n')}`
            : '';

        const responseWithContext = accumulatedContent + colorLegendText;

        await pool.query(
          'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
          [sessionId, 'assistant', responseWithContext],
        ).catch(() => {});
      }

      res.write(
        `data: ${JSON.stringify({ type: 'error', error: 'Stream interrupted. Please try again.' })}\n\n`,
      );
      res.end();
    }
  } catch (error: any) {
    aiLogger.error('Analyze Area error', error);

    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: 'Something went wrong during analysis', details: error.message });
    } else {
      res.write(
        `data: ${JSON.stringify({ type: 'error', error: 'Something went wrong during analysis', details: error.message })}\n\n`,
      );
      res.end();
    }
  }
}
