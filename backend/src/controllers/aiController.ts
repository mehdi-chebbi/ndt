import { Request, Response } from 'express';
import pool from '../config/database';
import { aiLogger } from '../utils/logger';
import { searchKnowledgeBase, getKnowledgeStatus } from '../services/knowledgeService';
import {
  AiRequestPlan,
  expandKnowledgeQuery,
  planAiRequest,
} from '../services/aiRequestPlanner';

// ── System Prompts ─────────────────────────────────────────────────

const SYSTEM_PROMPT_TEMPLATE = (layerCatalog: string, knowledgeInfo: string) => `You are the AI Copilot for AfriGeoData, a geospatial platform for African development data.

LANGUAGE RULE (HIGHEST PRIORITY): You MUST respond in the same language the user uses. If the user writes in English, your ENTIRE response must be in English. If the user writes in French, your ENTIRE response must be in French. NEVER echo the language of source documents, database results, or data if it differs from the user's language. Always translate concepts and findings into the user's language.

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

AVAILABLE LAYERS IN DATABASE:
${layerCatalog}

LAYER NAME RULES:
- When calling tools that require a layer name, you MUST use the EXACT display_name from the list above. Do NOT abbreviate, expand, or rewrite it.
- If multiple layers share the same display_name, they differ by group (category). Use the group parameter to disambiguate.
- When a user's request matches MULTIPLE layers (e.g. "spi" matches 5 SPI layers, "land cover" matches layers in ESA and OSS groups), you MUST list ALL matching layers with their groups and ask the user to pick one. Do NOT assume data doesn't exist — the user just needs to specify which one.
- You may recognize common abbreviations from the user (e.g. "ndvi" → "Normalized Difference Vegetation Index", "spi 2005" → "spi2005") — map them to the exact display_name before calling tools.
- NEVER tell a user that a layer type has no data without first asking them to clarify which specific layer they mean if there are multiple matches.

DATABASE QUERY TOOLS:
You have access to the platform's database to retrieve real data. When a user asks about specific data (layers, stats, countries), you MUST use these tools instead of guessing.

To query the database, respond with ONLY a valid JSON object — no text before or after, no markdown, no explanation:
{"tools": [{"name": "<tool_name>", "args": {"<arg1>": "<value1>"}}, {"name": "<tool_name2>", "args": {}}]}

⚠️ ABSOLUTE RULE: When you decide to use tools, your ENTIRE response must be ONLY the JSON object starting with { — ABSOLUTELY NO text before it.
- Do NOT write "Let me check", "Sure!", "I'll look that up", or ANY other text before the JSON
- Do NOT write any text after the JSON either
- The VERY FIRST character of your response MUST be { — if it is not, the tool call will fail
- ALL tools must be inside a single "tools" array — never output two separate JSON objects
- Valid: {"tools": [{"name": "get_country_stats", "args": {...}}, {"name": "show_country_on_map", "args": {...}}]}
- Invalid: Sure, let me look that up. {"tools": [...]}  ← WRONG: text before JSON
- Invalid: {"tools": [...]} Here are the results  ← WRONG: text after JSON
- Invalid: {"tools": [...]} {"tools": [...]}  ← WRONG: two objects

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
   - Args:
     - country (string, required): country name in English (e.g. "Nigeria", "Algeria", "Kenya")
     - layer (string, required): the EXACT display_name from the layer list above
     - group (string, optional): direct parent group name to disambiguate when multiple layers share the same name (e.g. "ESA", "OSS")
   - Returns: statistics including total area, pixel size, and class distribution with percentages
   - Use when: user asks about stats for a specific country+layer combination

3. get_countries_for_layer
   - Description: Get all countries that have pre-computed statistics for a given layer
   - Args:
     - layer (string, required): the EXACT display_name from the layer list above
     - group (string, optional): direct parent group name to disambiguate when multiple layers share the same name
   - Returns: list of countries with available data for that layer
   - Use when: user asks "which countries have trends data?", "what countries are available for X?"

4. show_country_on_map
   - Description: Switch the map to show a clipped country layer. Checks if a pre-clipped raster exists for the country+layer combination, and if so, tells the frontend to switch to the clipped layer, show the country polygon border, and zoom in.
   - Args:
     - country (string, required): country name in English (e.g. "Tunisia", "Nigeria", "Kenya")
     - layer (string, required): the EXACT display_name from the layer list above
     - group (string, optional): direct parent group name to disambiguate when multiple layers share the same name
   - Returns: clipped layer info if available, or "not_clipped" status
   - Use when: user asks about a specific country and you want to show it on the map (e.g. "show me Tunisia's land cover", "what's the LC of Algeria?", "display Kenya on the map")
   - IMPORTANT: ALWAYS call this tool when a user asks about a specific country+layer combination, alongside get_country_stats. This makes the map automatically zoom to the country and show the clipped data.

5. compare_country_layers
   - Description: Compare statistics for a country across ALL layers matching a keyword. Automatically finds every layer matching the search term, queries stats for each one, and returns a structured comparison. Use this for any request involving comparison, trends over time, or when multiple layers share a common theme (e.g. all SPI periods, all land cover change layers).
   - Args:
     - country (string, required): country name in English (e.g. "Nigeria", "Algeria", "Kenya")
     - search (string, required): keyword to find matching layers (e.g. "SPI", "land cover change", "water access")
     - group (string, optional): filter by group/category name to narrow results
   - Returns: comparison object with stats for each matching layer, or status info if no data found
   - Use when: user asks to compare, view trends, or see data across multiple periods/variations (e.g. "compare Togo SPI across all years", "show me Tunisia land cover change", "Algeria water access trends", "compare all SPI periods")
   - IMPORTANT: This is the PREFERRED tool for any comparison or multi-period request. Do NOT call get_country_stats multiple times — use this single tool instead. The backend handles finding all matching layers and querying them efficiently.

NOTE: Knowledge base search (official documents, policies, frameworks) is NOT available in this mode. If a user asks about official documents or policies, inform them that they can enable Sources mode (📄 button) to search the knowledge base of official documents.

IMPORTANT TOOL RULES:
- ALWAYS use the exact display_name from the AVAILABLE LAYERS list when calling tools. Do NOT make up or rewrite layer names.
- If multiple layers share the same display_name but differ by group, ask the user to clarify OR pass the group parameter.
- When you receive tool results with status "multiple_matches", list the matching options and ask the user to clarify. NEVER guess which one they meant.
- When you receive status "not_found", tell the user no matching data was found and suggest they check the exact name.
- When you receive status "no_stats", tell the user no pre-computed stats exist yet for that country+layer combination. Do NOT generalize this to say the entire layer type has no data — it may be specific to that one layer.
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

// ── Sources Mode System Prompt ────────────────────────────────────

const SOURCES_MODE_SYSTEM_PROMPT = (knowledgeInfo: string) => `You are the AI Copilot for AfriGeoData in SOURCES MODE.

LANGUAGE RULE (HIGHEST PRIORITY): You MUST respond in the same language the user uses. If the user writes in English, your ENTIRE response must be in English. If the user writes in French, your ENTIRE response must be in French. Knowledge base documents are often in French, but you MUST translate and respond in the user's language regardless. NEVER echo the language of retrieved documents.

SOURCES MODE ACTIVE.
You MUST search the knowledge base before answering ANY question. Do not answer from general knowledge — always search first.

When constructing your search query, ALWAYS include key terms in BOTH English and French:
- Example: user asks "secheresse Algerie" -> search for "secheresse drought Algerie Algeria"
- Example: user asks "drought policy" -> search for "drought politique de secheresse"
- Example: user asks "land degradation Benin" -> search for "land degradation degradation des terres Benin"
- Example: user asks "water access framework" -> search for "water access acces a l'eau framework cadre"

KNOWLEDGE BASE:
${knowledgeInfo}

To search the knowledge base, respond with ONLY a valid JSON object:
{"tools": [{"name": "search_knowledge", "args": {"query": "<your multilingual search terms>"}}]}

Rules:
- If no relevant documents are found, say so clearly. Do NOT guess or fabricate information.
- Always cite the source document name in your response (e.g. "According to Plan National Secheresse Algerie...").
- Keep responses focused on what the documents actually say.
- Respond in the same language the user uses. This is MANDATORY — even if all retrieved documents are in French, you must translate and respond in the user's detected language.
- Be concise and helpful.

You also have access to these database tools for geospatial data:

1. get_available_layers - List map layers (args: search?, group?)
2. get_country_stats - Get stats for country+layer (args: country, layer, group?)
3. get_countries_for_layer - Countries with data for a layer (args: layer, group?)
4. show_country_on_map - Show country on map (args: country, layer, group?)
5. compare_country_layers - Compare stats across layers (args: country, search, group?)

Use these tools alongside search_knowledge when the user asks about specific geospatial data.

CHART GENERATION:
When presenting numerical data with 3+ categories, include a chart:
\`\`\`chart
{"type": "pie", "title": "...", "data": [{"name": "...", "value": 45.2}]}
\`\`\`
Chart types: pie, donut, bar, horizontal-bar, line.`;

const RESPONSE_SYSTEM_PROMPT = (sourcesMode: boolean) => `You are the AI Copilot for AfriGeoData, an African geospatial data platform.

Respond in the same language as the user's latest message. Be concise, accurate, and focused on African geospatial data, land degradation, water access, inequality, map layers, reports, and platform usage.

${sourcesMode
  ? `SOURCES MODE IS ACTIVE. Base factual claims only on the supplied SOURCE RESULTS. Cite sources using their exact document title in square brackets. If the supplied evidence is insufficient, say that the available official documents do not contain enough information. Never fabricate a source or claim.`
  : `For general conceptual or platform-usage questions, answer directly. When verified platform data is supplied, use it instead of guessing.`}

OUTPUT SAFETY:
- Return natural-language Markdown only.
- Never output internal plans, tool calls, JSON request objects, database queries, or reasoning traces.
- Do not claim that an operation succeeded unless the supplied results say it succeeded.
- Offer only actions that are supported by the supplied platform operations. Never imply that you can perform an unsupported action now or later.
- You cannot create, trigger, or request layer clipping or pre-clipping jobs. Never offer to clip or pre-clip a layer.
- Preserve supplied layer names and identifiers exactly, and use supplied totals instead of recounting them.
- If a result is ambiguous, present the choices and ask the user to clarify.
- If a result is missing, explain that clearly without generalizing beyond that result.

When numerical results contain 3 or more useful categories, you may include one fenced \`chart\` block using this shape:
\`\`\`chart
{"type":"bar","title":"...","data":[{"name":"...","value":1}]}
\`\`\``;

const MAX_CONTEXT_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

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
  sourcesMode?: boolean;
}

// ── Layer Catalog ──────────────────────────────────────────────────

async function buildLayerCatalog(): Promise<string> {
  const result = await pool.query(`
    WITH RECURSIVE group_path AS (
      SELECT id, name, name_en, name_fr,
             CONCAT_WS(' / ', COALESCE(name_en, name), COALESCE(name_fr, name))::text AS breadcrumb
      FROM layer_groups
      WHERE parent_id IS NULL

      UNION ALL

      SELECT g.id, g.name, g.name_en, g.name_fr,
             CONCAT(gp.breadcrumb, ' > ', CONCAT_WS(' / ', COALESCE(g.name_en, g.name), COALESCE(g.name_fr, g.name)))
      FROM layer_groups g
      JOIN group_path gp ON g.parent_id = gp.id
    )
    SELECT
      l.display_name,
      l.display_name_en,
      l.display_name_fr,
      gp.breadcrumb AS group_path
    FROM layers l
    LEFT JOIN group_path gp ON l.group_id = gp.id
    WHERE l.is_active = true
    ORDER BY gp.breadcrumb ASC NULLS LAST, l.display_name ASC
  `);

  if (result.rows.length === 0) {
    return 'No layers currently available.';
  }

  return result.rows
    .map((row) => {
      const groupPath = row.group_path || 'Ungrouped';
      const names = [...new Set([row.display_name_en, row.display_name_fr, row.display_name].filter(Boolean))].join(' / ');
      return `  - "${names}" → ${groupPath}`;
    })
    .join('\n');
}

// ── Shared Layer Lookup ────────────────────────────────────────────

const LAYER_TERM_ALIASES: Record<string, string[]> = {
  ndvi: ['normalized', 'difference', 'vegetation', 'index'],
  spi: ['standardized', 'precipitation', 'index'],
  lc: ['land', 'cover'],
  ldn: ['land', 'degradation', 'neutrality'],
};

const LAYER_QUERY_STOP_WORDS = new Set([
  'the', 'a', 'an', 'for', 'of', 'in', 'on', 'show', 'display', 'map', 'data',
  'layer', 'layers', 'please', 'me', 'what', 'is', 'are', 'any', 'available', 'country', 'compare',
  'le', 'la', 'les', 'de', 'des', 'du', 'pour', 'dans', 'sur', 'affiche', 'montre',
  'il', 'elle', 'existe', 'disponible', 'disponibles', 'quel', 'quelle', 'quels', 'quelles',
  'couche', 'couches', 'donnees', 'données', 'pays', 'comparer',
]);

function normalizeLayerText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function canonicalizeLayerToken(token: string): string {
  // Lightweight language-agnostic normalization for the common English/French
  // plural forms used by catalog labels. Avoid short acronyms such as OSS.
  if (token.length <= 4) return token;
  if (token.endsWith('ies') && token.length > 5) return `${token.slice(0, -3)}y`;
  if (token.endsWith('eaux')) return `${token.slice(0, -1)}`;
  if (token.endsWith('s') && !token.endsWith('ss') && !token.endsWith('us') && !token.endsWith('is')) {
    return token.slice(0, -1);
  }
  return token;
}

function layerTokens(value: string): string[] {
  const raw = normalizeLayerText(value)
    .split(/\s+/)
    .filter(token => token.length > 1 && !LAYER_QUERY_STOP_WORDS.has(token))
    .map(canonicalizeLayerToken);
  const expanded = raw.flatMap(token => [token, ...(LAYER_TERM_ALIASES[token] || []).map(canonicalizeLayerToken)]);
  return [...new Set(expanded)];
}

function tokensAreSimilar(left: string, right: string): boolean {
  if (left === right) return true;
  if (left.length < 5 || right.length < 5) return false;
  return editDistance(left, right) <= 1;
}

function scoreTokenMatch(keyword: string, candidateValues: string[]): number {
  const queryTerms = layerTokens(keyword);
  if (queryTerms.length === 0) return 0;

  const candidateTerms = [...new Set(candidateValues.flatMap(layerTokens))];
  const matched = queryTerms.filter(queryTerm =>
    candidateTerms.some(candidateTerm => tokensAreSimilar(queryTerm, candidateTerm)),
  ).length;
  const coverage = matched / queryTerms.length;
  const precision = matched / Math.max(candidateTerms.length, 1);
  return coverage * 0.85 + precision * 0.15;
}

function scoreGroupCandidate(keyword: string, row: any): number {
  const values = [row.group_name, row.group_name_en, row.group_name_fr]
    .filter(Boolean)
    .map(String);
  const query = normalizeLayerText(keyword);
  const normalizedValues = values.map(normalizeLayerText);

  if (normalizedValues.some(value => value === query)) return 1;
  if (normalizedValues.some(value => value.includes(query) || query.includes(value))) return 0.94;
  return scoreTokenMatch(keyword, values);
}

function scoreLayerCandidate(keyword: string, row: any): number {
  const query = normalizeLayerText(keyword);
  const display = normalizeLayerText(row.display_name || '');
  const displayEn = normalizeLayerText(row.display_name_en || '');
  const displayFr = normalizeLayerText(row.display_name_fr || '');
  const geoserver = normalizeLayerText(row.geoserver_name || '');
  const group = normalizeLayerText(row.group_name || '');
  const groupEn = normalizeLayerText(row.group_name_en || '');
  const groupFr = normalizeLayerText(row.group_name_fr || '');

  if ([display, displayEn, displayFr, geoserver].some(value => value && query === value)) return 1;
  if ([display, displayEn, displayFr, geoserver].some(value => value && value.includes(query))) return 0.92;
  if ([display, displayEn, displayFr].some(value => value.length > 3 && query.includes(value))) return 0.88;

  return scoreTokenMatch(keyword, [display, displayEn, displayFr, geoserver, group, groupEn, groupFr]);
}

async function findLayer(
  layerKeyword: string,
  groupKeyword?: string,
): Promise<{ status: string; layer?: any; matches?: any[]; message?: string }> {
  let layerQuery = `
    SELECT l.id, l.geoserver_name, l.display_name, l.display_name_en, l.display_name_fr, l.file_path,
           g.name as group_name, g.name_en as group_name_en, g.name_fr as group_name_fr
    FROM layers l
    LEFT JOIN layer_groups g ON l.group_id = g.id
    WHERE l.is_active = true
  `;
  layerQuery += ` ORDER BY l.sort_order ASC`;

  const layerResult = await pool.query(layerQuery);
  const matchingGroupRows = groupKeyword
    ? layerResult.rows.filter((row: any) => scoreGroupCandidate(groupKeyword, row) >= 0.55)
    : [];
  // A group is a disambiguation hint, not a gate. The planner may describe a
  // semantic category (for example a theme) while the stored group uses an
  // indicator code. Only constrain by group when that hint matches real data.
  const candidateRows = groupKeyword && matchingGroupRows.length > 0
    ? matchingGroupRows
    : layerResult.rows;

  if (groupKeyword && matchingGroupRows.length === 0) {
    aiLogger.info('Layer group hint did not match catalog; falling back to layer names', {
      groupKeyword,
      layerKeyword,
    });
  }

  const ranked = candidateRows
    .map((row: any) => ({ row, score: scoreLayerCandidate(layerKeyword, row) }))
    .sort((a: any, b: any) => b.score - a.score);

  const best = ranked[0];

  if (!best || best.score < 0.45) {
    return {
      status: 'not_found',
      message: `No layer found matching "${layerKeyword}"${groupKeyword ? ` in group "${groupKeyword}"` : ''}`,
      matches: ranked.slice(0, 5).map(({ row, score }: any) => ({
        name: row.geoserver_name,
        display_name: row.display_name,
        display_name_en: row.display_name_en,
        display_name_fr: row.display_name_fr,
        group: row.group_name,
        group_en: row.group_name_en,
        group_fr: row.group_name_fr,
        confidence: Math.round(score * 100) / 100,
      })),
    };
  }

  const closeMatches = ranked.filter(({ score }: any) =>
    score >= 0.45 && (best.score - score <= 0.08),
  );

  if (closeMatches.length > 1) {
    return {
      status: 'multiple_matches',
      message: `Multiple layers match "${layerKeyword}"${groupKeyword ? ` in group "${groupKeyword}"` : ''}. Please ask the user to clarify.`,
      matches: closeMatches.slice(0, 10).map(({ row, score }: any) => ({
        name: row.geoserver_name,
        display_name: row.display_name,
        display_name_en: row.display_name_en,
        display_name_fr: row.display_name_fr,
        group: row.group_name,
        group_en: row.group_name_en,
        group_fr: row.group_name_fr,
        confidence: Math.round(score * 100) / 100,
      })),
    };
  }

  return { status: 'found', layer: best.row };
}

function editDistance(left: string, right: string): number {
  const rows = left.length + 1;
  const columns = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(columns).fill(0));
  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < columns; j++) matrix[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < columns; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
  }
  return matrix[left.length][right.length];
}

async function resolveCountryName(countryQuery: string): Promise<{
  status: 'found' | 'not_found' | 'multiple_matches';
  country?: string;
  matches?: string[];
}> {
  const result = await pool.query(`
    SELECT DISTINCT country_file FROM (
      SELECT country_file FROM country_stats
      UNION
      SELECT country_file FROM clipped_layers_cache
    ) countries
    WHERE country_file IS NOT NULL
  `);

  const requested = normalizeLayerText(countryQuery.replace(/\.geojson$/i, ''));
  const ranked = result.rows
    .map((row: any) => {
      const country = String(row.country_file).replace(/\.geojson$/i, '');
      const normalized = normalizeLayerText(country);
      const contains = normalized.includes(requested) || requested.includes(normalized);
      const distance = editDistance(requested, normalized);
      const similarity = contains ? 0.95 : 1 - distance / Math.max(requested.length, normalized.length, 1);
      return { country, similarity };
    })
    .sort((a: any, b: any) => b.similarity - a.similarity);

  if (!ranked[0] || ranked[0].similarity < 0.62) return { status: 'not_found' };
  const close = ranked.filter((item: any) => ranked[0].similarity - item.similarity <= 0.04);
  if (close.length > 1) {
    return { status: 'multiple_matches', matches: close.slice(0, 8).map((item: any) => item.country) };
  }
  return { status: 'found', country: ranked[0].country };
}

// ── DB Tools ───────────────────────────────────────────────────────

async function getAvailableLayers(args: Record<string, any>): Promise<any> {
  const search = args.search ? String(args.search) : null;
  const group = args.group ? String(args.group) : null;

  let query = `
    SELECT l.geoserver_name, l.display_name, l.display_name_en, l.display_name_fr,
           l.is_active, l.sort_order, g.name as group_name, g.name_en as group_name_en,
           g.name_fr as group_name_fr, g.description as group_description,
           g.description_en as group_description_en, g.description_fr as group_description_fr
    FROM layers l
    LEFT JOIN layer_groups g ON l.group_id = g.id
    WHERE l.is_active = true
  `;
  query += ` ORDER BY g.sort_order ASC NULLS LAST, l.sort_order ASC`;

  const result = await pool.query(query);
  const matchingGroupRows = group
    ? result.rows.filter((row: any) => scoreGroupCandidate(group, row) >= 0.55)
    : [];
  const candidateRows = group && matchingGroupRows.length > 0
    ? matchingGroupRows
    : result.rows;

  const matchingRows = search
    ? candidateRows
        .map((row: any) => ({ row, score: scoreLayerCandidate(search, row) }))
        .filter(({ score }: any) => score >= 0.45)
        .sort((a: any, b: any) => b.score - a.score)
        .map(({ row }: any) => row)
    : candidateRows;

  if (matchingRows.length === 0) {
    return {
      status: 'not_found',
      message: search
        ? `No layers found matching "${search}"${group ? ` in group "${group}"` : ''}`
        : `No layers found${group ? ` in group "${group}"` : ''}`,
    };
  }

  return {
    status: 'found',
    total: matchingRows.length,
    layers: matchingRows.map((row: any) => ({
      name: row.geoserver_name,
      display_name: row.display_name,
      display_name_en: row.display_name_en,
      display_name_fr: row.display_name_fr,
      group: row.group_name,
      group_en: row.group_name_en,
      group_fr: row.group_name_fr,
      group_description: row.group_description,
      group_description_en: row.group_description_en,
      group_description_fr: row.group_description_fr,
    })),
  };
}

async function getCountryStats(args: Record<string, any>): Promise<any> {
  let country = args.country ? String(args.country) : null;
  const layerKeyword = args.layer ? String(args.layer) : null;
  const groupKeyword = args.group ? String(args.group) : null;

  if (!country || !layerKeyword) {
    return { status: 'error', message: 'Both "country" and "layer" are required' };
  }

  const countryLookup = await resolveCountryName(country);
  if (countryLookup.status !== 'found') {
    return {
      status: countryLookup.status,
      message: `Could not uniquely resolve country "${country}"`,
      matches: countryLookup.matches,
    };
  }
  country = countryLookup.country!;

  const layerLookup = await findLayer(layerKeyword, groupKeyword);
  if (layerLookup.status !== 'found') return layerLookup;
  const layer = layerLookup.layer!;

  const statsResult = await pool.query(
    `SELECT country_file, total_area_km2, pixel_size_m, class_stats, computed_at
     FROM country_stats
     WHERE layer_id = $1 AND country_file ILIKE $2`,
    [layer.id, `%${country}%`],
  );

  if (statsResult.rows.length === 0) {
    const availableResult = await pool.query(
      `SELECT country_file FROM country_stats WHERE layer_id = $1 ORDER BY country_file ASC LIMIT 10`,
      [layer.id],
    );
    return {
      status: 'no_stats',
      message: `No pre-computed stats found for "${country}" on layer "${layer.geoserver_name}"`,
      available_countries_sample: availableResult.rows.map((r) =>
        r.country_file.replace('.geojson', ''),
      ),
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

  const stats = statsResult.rows[0];
  const countryName = stats.country_file.replace('.geojson', '');

  const layerInfo = await pool.query('SELECT class_labels FROM layers WHERE id = $1', [layer.id]);
  const classLabels = layerInfo.rows[0]?.class_labels || {};

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
      id: layer.id,
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

async function showCountryOnMap(args: Record<string, any>): Promise<any> {
  let country = args.country ? String(args.country) : null;
  const layerKeyword = args.layer ? String(args.layer) : null;
  const groupKeyword = args.group ? String(args.group) : null;

  if (!country || !layerKeyword) {
    return { status: 'error', message: 'Both "country" and "layer" are required' };
  }

  const countryLookup = await resolveCountryName(country);
  if (countryLookup.status !== 'found') {
    return {
      status: countryLookup.status,
      message: `Could not uniquely resolve country "${country}"`,
      matches: countryLookup.matches,
    };
  }
  country = countryLookup.country!;

  const layerLookup = await findLayer(layerKeyword, groupKeyword);
  if (layerLookup.status !== 'found') return layerLookup;
  const layer = layerLookup.layer!;

  const countryFile = `${country}.geojson`;
  const cacheResult = await pool.query(
    'SELECT clipped_layer_name FROM clipped_layers_cache WHERE country_file ILIKE $1 AND layer_id = $2',
    [countryFile, layer.id],
  );

  if (cacheResult.rows.length === 0) {
    // Service/continent layers without a source raster cannot and do not need
    // to be clipped. Display their original WMS layer and use the country only
    // as the map viewport. This is capability-based, not group-name based.
    if (!layer.file_path) {
      const [workspace] = layer.geoserver_name.includes(':')
        ? layer.geoserver_name.split(':')
        : [null];
      return {
        status: 'original',
        country,
        countryFile,
        clipped: false,
        workspace,
        originalLayerName: layer.geoserver_name,
        message: `The original continent-scale layer "${layer.display_name}" is ready to display and the map can zoom to "${country}".`,
        layer: {
          id: layer.id,
          name: layer.geoserver_name,
          display_name: layer.display_name,
          display_name_en: layer.display_name_en,
          display_name_fr: layer.display_name_fr,
          group: layer.group_name,
        },
      };
    }

    return {
      status: 'not_clipped',
      message: `The layer "${layer.display_name}" has not been clipped for "${country}" yet. Ask the user to contact an admin to pre-clip it.`,
      country,
      layer: {
        name: layer.geoserver_name,
        display_name: layer.display_name,
        group: layer.group_name,
      },
    };
  }

  const clippedLayerName = cacheResult.rows[0].clipped_layer_name;
  const [workspace] = clippedLayerName.includes(':') ? clippedLayerName.split(':') : [null, clippedLayerName];

  return {
    status: 'clipped',
    country,
    countryFile,
    clipped: true,
    clippedLayerName,
    workspace,
    originalLayerName: layer.geoserver_name,
    layer: {
      id: layer.id,
      name: layer.geoserver_name,
      display_name: layer.display_name,
      group: layer.group_name,
    },
  };
}

async function getCountriesForLayer(args: Record<string, any>): Promise<any> {
  const layerKeyword = args.layer ? String(args.layer) : null;
  const groupKeyword = args.group ? String(args.group) : null;

  if (!layerKeyword) {
    return { status: 'error', message: '"layer" is required' };
  }

  const layerLookup = await findLayer(layerKeyword, groupKeyword);
  if (layerLookup.status !== 'found') return layerLookup;
  const layer = layerLookup.layer!;

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

async function compareCountryLayers(args: Record<string, any>): Promise<any> {
  let country = args.country ? String(args.country) : null;
  const search = args.search ? String(args.search) : null;
  const groupKeyword = args.group ? String(args.group) : null;

  if (!country || !search) {
    return { status: 'error', message: '"country" and "search" are required' };
  }

  const countryLookup = await resolveCountryName(country);
  if (countryLookup.status !== 'found') {
    return {
      status: countryLookup.status,
      message: `Could not uniquely resolve country "${country}"`,
      matches: countryLookup.matches,
    };
  }
  country = countryLookup.country!;

  // Find ALL layers matching the search keyword
  const layerQuery = `
    SELECT l.id, l.geoserver_name, l.display_name, l.display_name_en, l.display_name_fr,
           g.name as group_name, g.name_en as group_name_en, g.name_fr as group_name_fr
    FROM layers l
    LEFT JOIN layer_groups g ON l.group_id = g.id
    WHERE l.is_active = true
    ORDER BY l.display_name ASC
  `;

  const allLayersResult = await pool.query(layerQuery);
  const matchingGroupRows = groupKeyword
    ? allLayersResult.rows.filter((row: any) => scoreGroupCandidate(groupKeyword, row) >= 0.55)
    : [];
  const candidateRows = groupKeyword && matchingGroupRows.length > 0
    ? matchingGroupRows
    : allLayersResult.rows;
  const matchingLayers = candidateRows
    .map((row: any) => ({ row, score: scoreLayerCandidate(search, row) }))
    .filter(({ score }: any) => score >= 0.45)
    .sort((a: any, b: any) => b.score - a.score)
    .map(({ row }: any) => row);

  if (matchingLayers.length === 0) {
    return {
      status: 'not_found',
      message: `No layers found matching "${search}"${groupKeyword ? ` in group "${groupKeyword}"` : ''}`,
    };
  }

  // Query stats for each matching layer in parallel
  const results = await Promise.all(
    matchingLayers.map(async (layer: any) => {
      try {
        const statsResult = await pool.query(
          `SELECT country_file, total_area_km2, pixel_size_m, class_stats, computed_at
           FROM country_stats
           WHERE layer_id = $1 AND country_file ILIKE $2`,
          [layer.id, `%${country}%`],
        );

        if (statsResult.rows.length === 0) {
          return {
            layer: {
              id: layer.id,
              name: layer.geoserver_name,
              display_name: layer.display_name,
              group: layer.group_name,
            },
            status: 'no_stats',
            message: `No stats for "${country}" on this layer`,
          };
        }

        const stats = statsResult.rows[0];
        const countryName = stats.country_file.replace('.geojson', '');

        const layerInfo = await pool.query('SELECT class_labels FROM layers WHERE id = $1', [layer.id]);
        const classLabels = layerInfo.rows[0]?.class_labels || {};

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
          layer: {
            id: layer.id,
            name: layer.geoserver_name,
            display_name: layer.display_name,
            group: layer.group_name,
          },
          status: 'found',
          country: countryName,
          total_area_km2: stats.total_area_km2,
          pixel_size_m: stats.pixel_size_m,
          classes: formattedClasses,
          computed_at: stats.computed_at,
        };
      } catch (error: any) {
        return {
          layer: {
            id: layer.id,
            name: layer.geoserver_name,
            display_name: layer.display_name,
            group: layer.group_name,
          },
          status: 'error',
          message: error.message,
        };
      }
    }),
  );

  const foundCount = results.filter((r) => r.status === 'found').length;

  if (foundCount === 0) {
    return {
      status: 'no_stats',
      message: `No pre-computed stats found for "${country}" on any layer matching "${search}"`,
      layers_searched: layerResult.rows.length,
      results,
    };
  }

  return {
    status: 'found',
    country,
    comparison: results,
    total_layers: results.length,
    layers_with_data: foundCount,
  };
}

// ── Auto map-action helper ─────────────────────────────────────────

/**
 * Look up the clipped layer cache for a given country + layer ID.
 * Returns the map_action payload if a clipped layer exists, or null.
 */
async function lookupClippedLayer(country: string, layerId: number): Promise<{
  type: 'map_action';
  country: string;
  countryFile: string;
  clippedLayerName: string;
  workspace: string | null;
  originalLayerName: string;
  layerId: number;
} | null> {
  const countryFile = `${country}.geojson`;
  const cacheResult = await pool.query(
    'SELECT clipped_layer_name FROM clipped_layers_cache WHERE country_file ILIKE $1 AND layer_id = $2',
    [countryFile, layerId],
  );
  if (cacheResult.rows.length === 0) return null;

  const clippedLayerName = cacheResult.rows[0].clipped_layer_name;
  const layerResult = await pool.query(
    'SELECT geoserver_name FROM layers WHERE id = $1',
    [layerId],
  );
  const originalLayerName = layerResult.rows[0]?.geoserver_name || '';
  const [workspace] = clippedLayerName.includes(':') ? clippedLayerName.split(':') : [null, clippedLayerName];

  return {
    type: 'map_action',
    country,
    countryFile,
    clippedLayerName,
    workspace,
    originalLayerName,
    layerId,
  };
}

// ── Tool Registry ──────────────────────────────────────────────────

async function searchKnowledge(args: Record<string, any>): Promise<any> {
  const query = args.query ? String(args.query) : null;

  if (!query) {
    return { status: 'error', message: '"query" is required' };
  }

  const result = searchKnowledgeBase(query, 5);

  if (!result) {
    return {
      status: 'no_documents',
      message: 'The knowledge base is empty or no documents have been indexed yet. Ask the user to contact an admin to add documents.',
    };
  }

  return {
    status: 'found',
    query,
    matches: result.chunks.map(c => ({
      source: c.source,
      title: c.title,
      chunk_index: c.chunk_index,
      content: c.text,
    })),
    total_chunks_searched: result.totalChunks,
    relevant_chunks_returned: result.chunks.length,
  };
}

const toolRegistry: Record<string, (args: Record<string, any>) => Promise<any>> = {
  get_available_layers: getAvailableLayers,
  get_country_stats: getCountryStats,
  get_countries_for_layer: getCountriesForLayer,
  show_country_on_map: showCountryOnMap,
  search_knowledge: searchKnowledge,
  compare_country_layers: compareCountryLayers,
};

// ── Native Tool Definitions (OpenAI function calling format) ─────────

const SOURCE_MODE_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_knowledge',
      description: 'Search the knowledge base for relevant official documents, policies, and frameworks. Always use this tool in Sources Mode before answering any question.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Multilingual search terms — include both English and French terms for best results (e.g. "drought secheresse Algeria Algerie")',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_available_layers',
      description: 'List all available map layers on the platform. Optionally filter by keyword or group.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Keyword to filter layers by name' },
          group: { type: 'string', description: 'Filter by group/category name' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_country_stats',
      description: 'Get pre-computed land cover statistics for a specific country and layer.',
      parameters: {
        type: 'object',
        properties: {
          country: { type: 'string', description: 'Country name in English' },
          layer: { type: 'string', description: 'The exact display_name from the layer list' },
          group: { type: 'string', description: 'Direct parent group name to disambiguate' },
        },
        required: ['country', 'layer'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_countries_for_layer',
      description: 'Get all countries that have pre-computed statistics for a given layer.',
      parameters: {
        type: 'object',
        properties: {
          layer: { type: 'string', description: 'The exact display_name from the layer list' },
          group: { type: 'string', description: 'Direct parent group name to disambiguate' },
        },
        required: ['layer'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'show_country_on_map',
      description: 'Switch the map to show a clipped country layer. Checks if a pre-clipped raster exists for the country+layer combination.',
      parameters: {
        type: 'object',
        properties: {
          country: { type: 'string', description: 'Country name in English' },
          layer: { type: 'string', description: 'The exact display_name from the layer list' },
          group: { type: 'string', description: 'Direct parent group name to disambiguate' },
        },
        required: ['country', 'layer'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'compare_country_layers',
      description: 'Compare statistics for a country across ALL layers matching a keyword. Use for comparisons, trends over time, or multi-period analysis.',
      parameters: {
        type: 'object',
        properties: {
          country: { type: 'string', description: 'Country name in English' },
          search: { type: 'string', description: 'Keyword to find matching layers' },
          group: { type: 'string', description: 'Filter by group/category name' },
        },
        required: ['country', 'search'],
      },
    },
  },
];

// ── Tool Call Parsing ──────────────────────────────────────────────

/**
 * Extract the outermost JSON object from text using a brace-depth counter.
 * Handles preambles, trailing text, nested objects, and markdown fences.
 * Returns the extracted JSON string, or null if no valid object is found.
 */
function extractJsonObject(text: string): string | null {
  // Step 1: Try to extract from a markdown code fence first
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const toParse = fenceMatch ? fenceMatch[1].trim() : text.trim();

  // Step 2: Brace-depth scanner — find the first { and walk to matching }
  const firstBrace = toParse.indexOf('{');
  if (firstBrace === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = firstBrace; i < toParse.length; i++) {
    const ch = toParse[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) return null;
  return toParse.substring(firstBrace, end + 1);
}

/**
 * Parse {"tools": [...]} from AI response.
 * Uses brace-depth extraction + fence stripping for robustness.
 * Returns null if no valid tool call is found.
 */
function parseDbRequest(content: string): ToolCall[] | null {
  const jsonStr = extractJsonObject(content);
  if (!jsonStr) return null;

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed.tools) && parsed.tools.length > 0) {
      return parsed.tools.map((t: any) => ({
        name: String(t.name),
        args: t.args || {},
      }));
    }
    aiLogger.warning('Parsed JSON has no valid tools array', { matched: jsonStr });
    return null;
  } catch (e) {
    aiLogger.warning('Failed to parse tools JSON', { matched: jsonStr, error: e });
    return null;
  }
}

// ── Execute Tools ──────────────────────────────────────────────────

async function executeTools(toolCalls: ToolCall[]): Promise<ToolResult[]> {
  return Promise.all(toolCalls.map(async (call): Promise<ToolResult> => {
    const toolFn = toolRegistry[call.name];

    if (!toolFn) {
      aiLogger.warning('Unknown tool requested', { tool: call.name });
      return {
        tool: call.name,
        args: call.args,
        status: 'error',
        message: `Unknown tool: ${call.name}`,
      };
    }

    try {
      aiLogger.info(`Executing tool: ${call.name}`, { args: call.args });
      const result = await toolFn(call.args);
      const toolResult: ToolResult = {
        tool: call.name,
        args: call.args,
        status: result.status || 'found',
        data: result,
      };
      aiLogger.info(`Tool ${call.name} completed`, { status: result.status });
      return toolResult;
    } catch (error: any) {
      aiLogger.error(`Tool ${call.name} failed`, error);
      return {
        tool: call.name,
        args: call.args,
        status: 'error',
        message: `Database error: ${error.message}`,
      };
    }
  }));
}

function planToToolCalls(plan: AiRequestPlan, originalMessage: string): ToolCall[] {
  switch (plan.intent) {
    case 'search_sources':
      return [{
        name: 'search_knowledge',
        args: { query: expandKnowledgeQuery(plan.searchQuery || originalMessage) },
      }];
    case 'list_layers':
      // Discovery is semantic, not lexical. The final model receives the raw
      // user request plus the complete small verified catalogue and decides
      // which exact entries are relevant. Filters remain available to legacy
      // callers, but must not gate conversational discovery.
      return [{
        name: 'get_available_layers',
        args: {},
      }];
    case 'recover_with_catalog':
      // Planning failed, not the user. Supplying the verified catalogue lets
      // the final model answer naturally or recover a typo without inventing
      // layer names and without phrase-specific routing.
      return [{
        name: 'get_available_layers',
        args: {},
      }];
    case 'country_statistics':
      return [
        {
          name: 'get_country_stats',
          args: { country: plan.country, layer: plan.layerQuery, group: plan.groupQuery },
        },
        {
          name: 'show_country_on_map',
          args: { country: plan.country, layer: plan.layerQuery, group: plan.groupQuery },
        },
      ];
    case 'countries_for_layer':
      return [{
        name: 'get_countries_for_layer',
        args: { layer: plan.layerQuery, group: plan.groupQuery },
      }];
    case 'compare_layers':
      return [{
        name: 'compare_country_layers',
        args: {
          country: plan.country,
          search: plan.searchQuery || plan.layerQuery,
          group: plan.groupQuery,
        },
      }];
    case 'show_on_map':
      return [{
        name: 'show_country_on_map',
        args: { country: plan.country, layer: plan.layerQuery, group: plan.groupQuery },
      }];
    default:
      return [];
  }
}

function buildResponseMessages(
  dbMessages: { role: string; content: string }[],
  newMessage: string,
  sourcesMode: boolean,
  resultContext?: string,
): ApiMessage[] {
  const messages: ApiMessage[] = [
    { role: 'system', content: RESPONSE_SYSTEM_PROMPT(sourcesMode) },
  ];

  for (const message of dbMessages.slice(-10)) {
    if (message.role !== 'user' && message.role !== 'assistant') continue;
    const content = extractTextFromContent(message.content).slice(0, MAX_MESSAGE_LENGTH);
    if (content) messages.push({ role: message.role, content });
  }

  messages.push({ role: 'user', content: newMessage });
  if (resultContext) {
    messages.push({
      role: 'system',
      content: `${resultContext}\n\nUse these verified results to answer the user's latest request. Do not expose this internal envelope or reproduce raw JSON.`,
    });
  }

  return messages;
}

// ── Helpers ────────────────────────────────────────────────────────

function extractTextFromContent(content: string): string {
  if (!content) return '';
  if (!content.startsWith('[')) return content;

  try {
    const parts = JSON.parse(content);
    if (!Array.isArray(parts)) return content;
    return parts
      .filter((p: any) => p.type === 'text' && p.text)
      .map((p: any) => p.text)
      .join(' ')
      .trim();
  } catch {
    return content;
  }
}

function buildApiMessages(
  dbMessages: { role: string; content: string }[],
  newMessage: string,
  layerCatalog: string,
  sourcesMode: boolean = false,
): ApiMessage[] {
  const knowledgeStatus = getKnowledgeStatus();
  const knowledgeInfo = knowledgeStatus.available
    ? `Available with ${knowledgeStatus.documentCount} documents (${knowledgeStatus.chunkCount} indexed chunks). Use search_knowledge to find relevant information.`
    : 'Not available (no documents indexed).';

  const systemPrompt = sourcesMode
    ? SOURCES_MODE_SYSTEM_PROMPT(knowledgeInfo)
    : SYSTEM_PROMPT_TEMPLATE(layerCatalog, knowledgeInfo);
  const apiMessages: ApiMessage[] = [{ role: 'system', content: systemPrompt }];

  // Include recent messages — skip stored tool-result system messages to avoid
  // unbounded context growth. Those are identified by the DB_TOOL_RESULT tag.
  const recent = dbMessages.slice(-MAX_CONTEXT_MESSAGES);

  for (const msg of recent) {
    const text = extractTextFromContent(msg.content);
    if (!text) continue;

    if (msg.role === 'system') {
      // Only include system messages that are NOT tool results (they grow unboundedly)
      if (!text.startsWith('DATABASE QUERY RESULTS:')) {
        apiMessages.push({ role: 'system', content: text });
      }
    } else if (msg.role === 'user' || msg.role === 'assistant') {
      apiMessages.push({ role: msg.role, content: text });
    }
  }

  if (newMessage.trim()) {
    apiMessages.push({ role: 'user', content: newMessage });
  }

  return apiMessages;
}

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

function validateAiConfig(): { ok: boolean; error?: string } {
  if (!process.env.AI_BASE_URL) return { ok: false, error: 'AI_BASE_URL is not configured' };
  if (!process.env.AI_API_KEY) return { ok: false, error: 'AI_API_KEY is not configured' };
  if (!process.env.AI_MODEL) return { ok: false, error: 'AI_MODEL is not configured' };
  return { ok: true };
}

// ── Special Token Cleaner (DeepSeek safety) ────────────────────────

const DEEPSEEK_SPECIAL_TOKENS = [
  '<｜begin▁of▁sentence｜>',
  '<｜end▁of▁sentence｜>',
  '<｜Assistant｜>',
  '<｜User｜>',
  '<｜EOT｜>',
];

function cleanSpecialTokens(text: string): string {
  let cleaned = text;
  for (const token of DEEPSEEK_SPECIAL_TOKENS) {
    while (cleaned.includes(token)) {
      cleaned = cleaned.replace(token, '');
    }
  }
  return cleaned.trim();
}

// ── Garbage Response Detection ──────────────────────────────────────

const CODE_LEAK_PATTERNS = [
  /^(package |import |class |func |def |const |var |let |#include|from )/i,
  /^#!\//,  // shebang
];

function isGarbageResponse(text: string): boolean {
  if (!text || text.trim().length === 0) return true;

  // All special tokens, no real content
  const withoutSpecials = cleanSpecialTokens(text);
  if (withoutSpecials.trim().length === 0) return true;

  // Code leak detection
  for (const pattern of CODE_LEAK_PATTERNS) {
    if (pattern.test(withoutSpecials.trim())) return true;
  }

  // Language mismatch: >80% CJK characters in a platform that serves English/French
  const cjkCount = (withoutSpecials.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalChars = withoutSpecials.replace(/\s/g, '').length;
  if (totalChars > 20 && cjkCount / totalChars > 0.8) return true;

  return false;
}

// ── "Planning without executing" detection ──────────────────────────

/**
 * Detect when the model explains what it will do instead of actually
 * outputting a tool-call JSON.  Common with DeepSeek V3.2 after a
 * clarification exchange.
 *
 * Pattern: the response mentions fetching/looking up/checking/querying
 * a country or layer but contains no JSON tool call.
 */
const PLANNING_PHRASES = [
  /let me (fetch|look|check|query|get|retrieve|pull)/i,
  /i('ll| will) (fetch|look|check|query|get|retrieve|pull)/i,
  /i('ll| will) use the .+ (layer|dataset|data)/i,
];

function isPlanningWithoutExecuting(text: string): boolean {
  for (const pattern of PLANNING_PHRASES) {
    if (pattern.test(text)) return true;
  }
  return false;
}

// ── Round 1a: Non-streaming call with native tool calling (Sources Mode) ──

/**
 * Sources Mode Round 1: Ask the AI to call tools using native function calling.
 *
 * Strategy:
 * 1. Primary: Use OpenAI-native `tools` + `tool_choice: "required"` so the model
 *    emits tool calls into the structured `tool_calls` field — bypassing the
 *    reasoning/content split issue entirely.
 * 2. Fallback paths: If native `tool_calls` is missing, try parsing JSON from
 *    `content`, then from `reasoning` field (some reasoning models put output there).
 * 3. If all paths fail, return null so the caller can retry with a different strategy.
 *
 * NOTE: We do NOT send `reasoning: { enabled: false }` because some reasoning
 * models (e.g. gpt-oss-120b:free) MANDATE reasoning — rejecting requests that
 * try to disable it. With `tool_choice: 'required'`, the model is forced to emit
 * a tool call regardless of reasoning behavior.
 */
async function round1WithToolCalling(
  messages: ApiMessage[],
  tools: any[] = SOURCE_MODE_TOOL_DEFINITIONS,
): Promise<ToolCall[] | null> {
  const body: any = {
    model: process.env.AI_MODEL!,
    messages,
    stream: false,
    temperature: 0,
    max_tokens: 300,
    tools,
    tool_choice: 'required',
  };

  const response = await fetch(`${process.env.AI_BASE_URL!}/chat/completions`, {
    method: 'POST',
    headers: buildApiHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  // ── Path 1: Native tool_calls (preferred) ──
  const nativeToolCalls = data.choices?.[0]?.message?.tool_calls;
  if (nativeToolCalls && Array.isArray(nativeToolCalls) && nativeToolCalls.length > 0) {
    const parsed: ToolCall[] = [];
    for (const tc of nativeToolCalls) {
      try {
        const args = tc.function?.arguments
          ? JSON.parse(tc.function.arguments)
          : {};
        parsed.push({ name: String(tc.function?.name || ''), args });
      } catch (e) {
        aiLogger.warning('Failed to parse native tool_call arguments', {
          tool: tc.function?.name,
          error: e,
        });
      }
    }
    if (parsed.length > 0) {
      aiLogger.info('round1WithToolCalling: parsed from native tool_calls', {
        tools: parsed.map(t => t.name),
      });
      return parsed;
    }
  }

  // ── Path 2: Fallback — parse JSON from content field ──
  const rawContent = data.choices?.[0]?.message?.content ?? '';
  if (rawContent.trim()) {
    const parsed = parseDbRequest(rawContent.trim());
    if (parsed) {
      aiLogger.info('round1WithToolCalling: parsed from content fallback', {
        tools: parsed.map(t => t.name),
      });
      return parsed;
    }
  }

  // ── Path 3: Fallback — check reasoning field for JSON ──
  const rawReasoning = data.choices?.[0]?.message?.reasoning ?? '';
  if (rawReasoning.includes('{')) {
    const parsed = parseDbRequest(rawReasoning);
    if (parsed) {
      aiLogger.info('round1WithToolCalling: parsed from reasoning fallback', {
        tools: parsed.map(t => t.name),
      });
      return parsed;
    }
  }

  aiLogger.warning('round1WithToolCalling: no tool calls found in any field', {
    contentPreview: rawContent.substring(0, 100),
    reasoningPreview: rawReasoning.substring(0, 100),
    hasToolCalls: !!nativeToolCalls,
  });
  return null;
}

/**
 * Legacy non-streaming call — used as retry fallback when native tool calling
 * is not supported by the model/API.
 *
 * Checks both `content` and `reasoning` fields since reasoning models may
 * place output in either location.
 */
async function round1NonStreaming(messages: ApiMessage[]): Promise<string> {
  const response = await fetch(`${process.env.AI_BASE_URL!}/chat/completions`, {
    method: 'POST',
    headers: buildApiHeaders(),
    body: JSON.stringify({
      model: process.env.AI_MODEL!,
      messages,
      stream: false,
      temperature: 0,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content ?? '';
  const rawReasoning = data.choices?.[0]?.message?.reasoning ?? '';

  let content = rawContent;
  if (!content && rawReasoning) {
    // Only use reasoning if it contains something that looks like JSON.
    // "Need to search knowledge." is just chain-of-thought — not parseable.
    // {"tools": [...]} is actual JSON output placed in reasoning by some models.
    if (rawReasoning.includes('{')) {
      content = rawReasoning;
      aiLogger.info('round1NonStreaming: content was null, fell back to reasoning (contains JSON)');
    } else {
      aiLogger.info('round1NonStreaming: content was null, reasoning is plain text — treating as empty for retry', {
        reasoningPreview: rawReasoning.substring(0, 80),
      });
    }
  }
  return content.trim();
}

// ── Round 1 with retry and garbage detection ─────────────────────

const MAX_ROUND1_RETRIES = 1;

/**
 * Round 1 with automatic retry on garbage/malformed responses.
 *
 * For normal mode: non-streaming call → parse as tool call or direct response.
 * For sources mode: try native tool calling first → fallback to non-streaming parse.
 *
 * Returns either tool results (if tools were called) or the direct response text.
 */
async function round1WithRetry(
  messages: ApiMessage[],
  sourcesMode: boolean = false,
): Promise<{ toolResults: ToolResult[] | null; directContent: string }> {
  for (let attempt = 0; attempt <= MAX_ROUND1_RETRIES; attempt++) {
    try {
      if (sourcesMode) {
        // ── Sources mode: try native tool calling first ──
        const toolCalls = await round1WithToolCalling(messages);
        if (toolCalls) {
          const results = await executeTools(toolCalls);
          return { toolResults: results, directContent: '' };
        }

        // Fallback: non-streaming parse
        const rawContent = await round1NonStreaming(messages);
        const cleaned = cleanSpecialTokens(rawContent);

        if (isGarbageResponse(cleaned)) {
          aiLogger.warning(`round1WithRetry: garbage detected in sources mode (attempt ${attempt + 1})`, {
            preview: cleaned.substring(0, 100),
          });
          if (attempt < MAX_ROUND1_RETRIES) continue;
          return { toolResults: null, directContent: '' };
        }

        const parsed = parseDbRequest(cleaned);
        if (parsed) {
          const results = await executeTools(parsed);
          return { toolResults: results, directContent: '' };
        }

        // "Planning without executing" — model said it will fetch but didn't output JSON
        if (isPlanningWithoutExecuting(cleaned)) {
          aiLogger.warning(`round1WithRetry: planning-without-executing in sources mode (attempt ${attempt + 1})`, {
            preview: cleaned.substring(0, 150),
          });
          if (attempt < MAX_ROUND1_RETRIES) continue;
          return { toolResults: null, directContent: '' };
        }

        return { toolResults: null, directContent: cleaned };
      } else {
        // ── Normal mode: non-streaming call ──
        const rawContent = await round1NonStreaming(messages);
        const cleaned = cleanSpecialTokens(rawContent);

        // Check for garbage
        if (isGarbageResponse(cleaned)) {
          aiLogger.warning(`round1WithRetry: garbage response detected (attempt ${attempt + 1})`, {
            preview: cleaned.substring(0, 100),
          });
          if (attempt < MAX_ROUND1_RETRIES) continue;
          // All retries exhausted — proceed without tools
          return { toolResults: null, directContent: '' };
        }

        // Try to parse as tool call
        const toolCalls = parseDbRequest(cleaned);
        if (toolCalls) {
          const results = await executeTools(toolCalls);
          return { toolResults: results, directContent: '' };
        }

        // "Planning without executing" — model said it will fetch but didn't output JSON
        if (isPlanningWithoutExecuting(cleaned)) {
          aiLogger.warning(`round1WithRetry: planning-without-executing (attempt ${attempt + 1})`, {
            preview: cleaned.substring(0, 150),
          });
          if (attempt < MAX_ROUND1_RETRIES) continue;
          return { toolResults: null, directContent: '' };
        }

        // Valid direct response
        return { toolResults: null, directContent: cleaned };
      }
    } catch (error: any) {
      aiLogger.error(`round1WithRetry attempt ${attempt + 1} failed`, error);
      if (attempt < MAX_ROUND1_RETRIES) continue;
    }
  }

  // All retries exhausted
  return { toolResults: null, directContent: '' };
}

// ── Fake streaming for direct responses ───────────────────────────

/**
 * Send a pre-computed text response as character-based SSE chunks
 * to simulate streaming UX without making a second LLM call.
 */
async function fakeStreamToClient(res: Response, content: string): Promise<void> {
  if (content.length < 100) {
    // Short response — send immediately, no fake streaming
    res.write(`data: ${JSON.stringify({ content })}\n\n`);
    return;
  }

  // Longer response — fake stream for typing feel
  const chunkSize = 12;  // chars per SSE event
  const delayMs = 20;    // ms between chunks (~600 chars/sec)

  for (let i = 0; i < content.length; i += chunkSize) {
    const chunk = content.slice(i, i + chunkSize);
    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);

    if (i + chunkSize < content.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

// ── Round 2: Streaming AI response ────────────────────────────────

/**
 * Stream AI response and forward SSE chunks to client.
 * Returns the full accumulated text.
 */
async function streamAiToClient(
  res: Response,
  messages: ApiMessage[],
  eventType?: string, // optional type field for SSE events (used by analyzeAreaWithAI)
  filterToolJson: boolean = false, // if true, suppress {"tools" leaks mid-stream
  suppressReasoningFallback: boolean = false,
): Promise<string> {
  const response = await fetch(`${process.env.AI_BASE_URL!}/chat/completions`, {
    method: 'POST',
    headers: buildApiHeaders(),
    body: JSON.stringify({
      model: process.env.AI_MODEL!,
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
  let toolJsonLeaked = false; // track if we detected a tool JSON leak
  let hasSeenContent = false; // track if the model ever produced real content
  let reasoningBuffer = '';   // buffer for reasoning_content (in case model never produces content)

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      // Flush any remaining buffer before breaking
      if (buffer.trim()) {
        // process the last line inline (no function call needed here)
        const trimmed = buffer.trim();
        if (trimmed && trimmed !== 'data: [DONE]' && trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed.choices?.[0]?.delta;
            const content = delta?.content || '';
            const reasoning = delta?.reasoning_content || '';
            if (content) {
              hasSeenContent = true;
              accumulated += content;
            } else if (reasoning) {
              reasoningBuffer += reasoning;
            }
          } catch { /* skip */ }
        }
        buffer = '';
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;

      if (trimmed.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const delta = parsed.choices?.[0]?.delta;

          // Handle reasoning models (e.g. Qwen3):
          // - Some models put final answer in `content` and thinking in `reasoning_content`
          // - Some models put EVERYTHING in `reasoning_content` and never populate `content`
          // Strategy: prefer `content`; silently buffer `reasoning_content` as fallback.
          const content = delta?.content || '';
          const reasoning = delta?.reasoning_content || '';

          if (content) {
            hasSeenContent = true;
            accumulated += content;

            // Chat responses are held until completion so an internal JSON object
            // can never be partially streamed into the UI. Area analysis passes
            // filterToolJson=false and continues to stream normally.
            if (filterToolJson) {
              continue;
            }

            // Guard: if filtering is on and we detect a tool JSON leak, stop forwarding
            if (filterToolJson && !toolJsonLeaked && accumulated.includes('{"tools"')) {
              toolJsonLeaked = true;
              aiLogger.warning('Round 2: tool JSON leak detected — suppressing output');
              continue;
            }

            if (toolJsonLeaked) {
              continue;
            }

            const payload = eventType ? { type: eventType, content } : { content };
            res.write(`data: ${JSON.stringify(payload)}\n\n`);
          } else if (reasoning) {
            // Buffer reasoning silently — only used as fallback if no content ever arrives
            reasoningBuffer += reasoning;
          }
        } catch {
          // Non-critical parse error, skip
        }
      }
    }
  }

  if (filterToolJson && hasSeenContent) {
    const trimmed = accumulated.trim();
    const extracted = extractJsonObject(trimmed);
    let isInternalJson = /^```(?:json)?/i.test(trimmed) || trimmed.startsWith('{');

    if (extracted) {
      try {
        const parsed = JSON.parse(extracted);
        isInternalJson = isInternalJson || Boolean(
          parsed?.tools || parsed?.tool_calls || parsed?.intent || parsed?.operation,
        );
      } catch {
        // A JSON-looking malformed response is internal output, not user-facing prose.
        isInternalJson = isInternalJson || /"(?:tools|intent|operation)"\s*:/i.test(trimmed);
      }
    }

    if (isInternalJson) {
      aiLogger.warning('Suppressed internal JSON from answer generation', {
        preview: trimmed.substring(0, 160),
      });
      accumulated = 'I retrieved the information but could not format a safe response. Please try again.';
    }

    await fakeStreamToClient(res, accumulated);
    return accumulated;
  }

  // If tool JSON leaked, strip it from the stored response
  if (toolJsonLeaked) {
    const toolMatch = accumulated.match(/\{[\s\S]*?"tools"[\s\S]*\}/);
    if (toolMatch) {
      accumulated = accumulated.replace(toolMatch[0], '').trim();
    }
    // Send a clean fallback message
    if (!accumulated) {
      accumulated = 'I retrieved the data but encountered an issue formatting the response. Please try again.';
    }
    res.write(`data: ${JSON.stringify({ content: accumulated })}\n\n`);
  }

  // Fallback for reasoning-only models (e.g. Qwen3):
  // If the model never produced `content` but put everything in `reasoning_content`,
  // use the reasoning buffer as the final answer.
  if (!hasSeenContent && reasoningBuffer.trim()) {
    // Never expose a reasoning trace in chat. Some providers place plans,
    // internal JSON, or chain-of-thought in this field. The dedicated area
    // analysis flow retains its legacy fallback behavior.
    accumulated = (filterToolJson || suppressReasoningFallback)
      ? 'I could not generate a complete response. Please try again.'
      : reasoningBuffer.trim();
    aiLogger.info('streamAiToClient: no content field — applying safe fallback', {
      reasoningLength: reasoningBuffer.length,
      reasoningExposed: !(filterToolJson || suppressReasoningFallback),
    });
    // Stream the buffered reasoning content to the client
    await fakeStreamToClient(res, accumulated);
  }

  return accumulated;
}

// ── Main Chat Handler ──────────────────────────────────────────────

export async function chat(req: Request, res: Response) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    aiLogger.separator();
    aiLogger.info(`=== New Chat Request [${requestId}] ===`);

    const { sessionId, message, sourcesMode }: ChatRequestBody = req.body;
    const userId = (req as any).userId;

    // ── Validate input ──
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const messageText = typeof message === 'string' ? message : String(message);

    // Guard against absurdly large messages
    if (messageText.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    // ── Validate AI config early (before DB writes) ──
    const configCheck = validateAiConfig();
    if (!configCheck.ok) {
      aiLogger.error(configCheck.error!);
      return res.status(500).json({ error: `AI service error: ${configCheck.error}` });
    }

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

    aiLogger.info('Sources mode', { sourcesMode: !!sourcesMode });

    // ── Save user message to DB ──
    // Done BEFORE flushHeaders so we can still return HTTP errors if this fails.
    const userMessageCount = dbMessages.filter((m) => m.role === 'user').length;

    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'user', messageText],
    );

    if (userMessageCount === 0) {
      const title = messageText.length > 60 ? messageText.substring(0, 57) + '...' : messageText;
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

    // ── Set up SSE — only after all DB writes ──
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // ── Resolve a private, validated request plan ──
    // The raw planner response is never streamed to the browser.
    res.write(`data: ${JSON.stringify({ type: 'status', stage: 'resolving' })}\n\n`);

    let plan: AiRequestPlan;
    try {
      plan = await planAiRequest({
        requestId,
        message: messageText,
        history: dbMessages,
        sourcesMode: !!sourcesMode,
        apiBaseUrl: process.env.AI_BASE_URL!,
        apiKey: process.env.AI_API_KEY!,
        model: process.env.AI_MODEL!,
        appUrl: process.env.AI_APP_URL,
        appName: process.env.AI_APP_NAME,
      });
    } catch (error: any) {
      aiLogger.warning('Planner failed unexpectedly; falling back to general response', {
        error: error.message,
      });
      plan = { intent: 'general_question' };
    }

    aiLogger.info('Validated request plan', { plan });

    if (plan.intent === 'clarification' && plan.clarification) {
      const clarification = plan.clarification;
      await pool.query(
        'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
        [sessionId, 'assistant', clarification],
      );
      res.write(`data: ${JSON.stringify({ content: clarification })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const toolCalls = planToToolCalls(plan, messageText);
    let toolResults: ToolResult[] = [];
    if (toolCalls.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'status', stage: sourcesMode ? 'searching_sources' : 'querying_data' })}\n\n`);
      // Backward-compatible status for the current frontend.
      res.write(`data: ${JSON.stringify({ type: 'searching' })}\n\n`);
      toolResults = await executeTools(toolCalls);
    }

    // Emit map_action SSE events — automatically for any tool returning country+layer data
    const mapActionCandidates: { country: string; layerId: number }[] = [];

    for (const result of toolResults) {
      if (result.tool === 'show_country_on_map'
          && (result.status === 'clipped' || result.status === 'original')
          && result.data) {
        const mapAction = {
          type: 'map_action',
          displayMode: result.status,
          country: result.data.country,
          countryFile: result.data.countryFile,
          clippedLayerName: result.data.clippedLayerName,
          workspace: result.data.workspace,
          originalLayerName: result.data.originalLayerName,
          layerId: result.data.layer?.id,
        };
        res.write(`data: ${JSON.stringify(mapAction)}\n\n`);
        aiLogger.info('Emitted map_action SSE event (explicit)', { mapAction });
      } else if (result.tool === 'get_country_stats' && result.status === 'found' && result.data) {
        mapActionCandidates.push({
          country: result.data.country,
          layerId: result.data.layer?.id,
        });
      } else if (result.tool === 'compare_country_layers' && result.status === 'found' && result.data) {
        const comparison: any[] = result.data.comparison || [];
        const withData = comparison.filter((c: any) => c.status === 'found');
        if (withData.length > 0) {
          const lastWithData = withData[withData.length - 1];
          mapActionCandidates.push({
            country: result.data.country,
            layerId: lastWithData.layer?.id,
          });
        }
      }
    }

    // Auto-emit map_action for candidates
    for (const candidate of mapActionCandidates) {
      try {
        const mapAction = await lookupClippedLayer(candidate.country, candidate.layerId);
        if (mapAction) {
          res.write(`data: ${JSON.stringify(mapAction)}\n\n`);
          aiLogger.info('Emitted map_action SSE event (auto)', { mapAction });
        }
      } catch (err: any) {
        aiLogger.warning('Failed to auto-lookup clipped layer', { error: err.message });
      }
    }

    const isSourcesMode = !!sourcesMode;
    const isCompleteCatalogDiscovery = toolResults.some(result =>
      result.tool === 'get_available_layers'
      && !result.args.search
      && !result.args.group,
    );
    const catalogReasoningInstruction = isCompleteCatalogDiscovery
      ? `\n\nCATALOG DISCOVERY RULES:
- The complete verified layer catalogue is supplied below together with the user's original request.
- Interpret the user's theme semantically; do not require the exact request words to occur in a display name.
- Use your geospatial/domain knowledge to explain why catalogue entries are directly relevant or related.
- Availability claims must use only exact entries present in the supplied catalogue. Never invent a layer.
- If useful, distinguish direct indicators from supporting component layers.`
      : '';
    const hasMapOperation = toolResults.some(result => result.tool === 'show_country_on_map');
    const mapOperationInstruction = hasMapOperation
      ? `\n\nMAP OPERATION RULES:
- Describe only the verified map result supplied below.
- Never offer to clip or pre-clip a layer; that capability is not available to the copilot.
- A result with status "original" means the original layer was displayed and the requested country was used only to position or zoom the map. Do not say clipping is required or suggest clipping as a next step.`
      : '';
    const resultContext = toolResults.length > 0
      ? `VERIFIED ${isSourcesMode ? 'SOURCE' : 'PLATFORM DATA'} RESULTS:${catalogReasoningInstruction}${mapOperationInstruction}\n${toolResults
          .map(result => JSON.stringify({
            operation: result.tool,
            requested: result.args,
            status: result.status,
            result: result.data ?? result.message,
          }))
          .join('\n')}`
      : plan.intent === 'clarification' && plan.clarificationContext
        ? `CLARIFICATION REQUIRED: ${plan.clarificationContext}. Ask one concise question for the missing information in the user's language. Do not claim that any action was performed.`
        : undefined;

    const responseMessages = buildResponseMessages(
      dbMessages,
      messageText,
      isSourcesMode,
      resultContext,
    );

    res.write(`data: ${JSON.stringify({ type: 'status', stage: 'answering' })}\n\n`);

    let responseContent: string;
    try {
      // This is a dedicated prose-only generation call. Stream it directly for
      // responsiveness while still refusing provider reasoning traces.
      responseContent = await streamAiToClient(res, responseMessages, undefined, false, true);
    } catch (error: any) {
      aiLogger.error('Answer generation failed', error);
      res.write(
        `data: ${JSON.stringify({ error: 'Failed to generate a response. Please try again.' })}\n\n`,
      );
      res.end();
      return;
    }

    if (!responseContent.trim()) {
      responseContent = 'I could not generate a complete response. Please try again.';
      res.write(`data: ${JSON.stringify({ content: responseContent })}\n\n`);
    }

    if (responseContent) {
      await pool.query(
        'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
        [sessionId, 'assistant', responseContent],
      );
      await pool.query(
        'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId],
      );
    }

    res.write('data: [DONE]\n\n');
    res.end();

    aiLogger.success(`Request [${requestId}] completed`, {
      intent: plan.intent,
      operations: toolResults.map((result) => result.tool),
      operationStatuses: toolResults.map((result) => result.status),
      responseLength: responseContent.length,
    });
    aiLogger.separator();
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

// ═══════════════════════════════════════════════════════════════════
// Analyze Area with AI
// ═══════════════════════════════════════════════════════════════════

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

function findInheritedLegend(groupId: number | null, groups: any[]): any[] | null {
  if (!groupId) return null;
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;
  if (group.legend && group.legend.length > 0) return group.legend;
  if (group.parent_id) return findInheritedLegend(group.parent_id, groups);
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

  if (result.rows.length === 0) throw new Error('Layer not found');

  const layer = result.rows[0];
  const filePath = layer.file_path;
  const classLabels = layer.class_labels;

  if (!filePath) throw new Error('Layer not configured for stats: no file path');
  if (!classLabels) throw new Error('Layer not configured for stats: no class labels');

  const allGroupsResult = await pool.query(
    'SELECT id, name, parent_id, legend FROM layer_groups ORDER BY sort_order ASC, created_at ASC',
  );
  const allGroups = allGroupsResult.rows;

  const clipServiceUrl = process.env.CLIP_SERVICE_URL || 'http://clip-service:3005';
  aiLogger.info('[AI-Stats] Calling clip-service', { layerName, polygonType: polygon.type });

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
      aiLogger.error('[AI-Stats] Clip-service error', { status: response.status, body: errorBody });
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
        if (item.class && item.color) colorMapping[item.class] = item.color;
      });
    }

    const totalPixels = stats.total_pixels;
    const classesWithPercentage = stats.classes.map((cls: any) => ({
      class_id: cls.class_id,
      class_name: classLabels[cls.class_id] || `Unknown (${cls.class_id})`,
      area_km2: cls.area_km2,
      percentage: totalPixels > 0 ? Math.round((cls.pixels / totalPixels) * 100 * 10) / 10 : 0,
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

function extractLocationFromPolygon(polygon: any): string {
  if (!polygon || !polygon.coordinates) return 'Unknown location';

  let coords: number[][];
  if (polygon.type === 'Polygon') {
    coords = polygon.coordinates[0];
  } else if (polygon.type === 'MultiPolygon') {
    coords = polygon.coordinates[0][0];
  } else {
    return 'Unknown location';
  }

  if (!coords || coords.length === 0) return 'Unknown location';

  const lats = coords.map((c) => c[1]);
  const lons = coords.map((c) => c[0]);
  const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const avgLon = lons.reduce((a, b) => a + b, 0) / lons.length;

  return `${Math.abs(avgLat).toFixed(1)}°${avgLat >= 0 ? 'N' : 'S'}, ${Math.abs(avgLon).toFixed(1)}°${avgLon >= 0 ? 'E' : 'W'}`;
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
      return res.status(400).json({ error: 'layer_name and polygon are required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const configCheck = validateAiConfig();
    if (!configCheck.ok) {
      return res.status(500).json({ error: `AI service error: ${configCheck.error}` });
    }

    aiLogger.info('Request', { userId, layer_name, polygonType: polygon.type });

    // ── Compute stats ──
    aiLogger.info('Step 1: Computing statistics...');
    let stats: any;
    try {
      stats = await calculatePolygonStats(layer_name, polygon);
      aiLogger.info('Statistics computed', { totalArea: stats.total_area_km2, classCount: stats.classes.length });
    } catch (statsError: any) {
      aiLogger.error('Failed to compute statistics', statsError);
      return res.status(500).json({ error: 'Failed to compute statistics', details: statsError.message });
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
        ? stats.legend.map((item: any) => `- ${item.class}: ${hexToColorName(item.color)}`).join('\n')
        : 'No color information available.';

    // ── Create AI session ──
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

    const userMessage = 'Analyze this area based on the provided geospatial data.';

    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'user', userMessage],
    ).catch((e: any) => aiLogger.error('Failed to save user message', e));

    // ── Set up SSE ──
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(
      `data: ${JSON.stringify({ type: 'stats', sessionId, stats, layerName: layer_name })}\n\n`,
    );

    // ── Stream AI analysis ──
    aiLogger.info('Step 3: Streaming AI analysis...');

    const messages: ApiMessage[] = [
      {
        role: 'system',
        content: ANALYSIS_SYSTEM_PROMPT_TEMPLATE({
          layerName: layer_name,
          location,
          totalArea: stats.total_area_km2.toFixed(2),
          classDistribution,
          colorMapping,
        }),
      },
      { role: 'user', content: userMessage },
    ];

    let accumulatedContent = '';
    try {
      accumulatedContent = await streamAiToClient(res, messages, 'content');
    } catch (streamError: any) {
      aiLogger.error('Stream error', streamError);
      // Save whatever we got before the error
      if (accumulatedContent) {
        await pool.query(
          'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
          [sessionId, 'assistant', accumulatedContent],
        ).catch(() => {});
      }
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream interrupted. Please try again.' })}\n\n`);
      res.end();
      return;
    }

    if (accumulatedContent) {
      const colorLegendText =
        stats.legend && stats.legend.length > 0
          ? `\n\n---\n**Color Legend for Reference:**\n${stats.legend.map((item: any) => `- ${item.class}: ${hexToColorName(item.color)}`).join('\n')}`
          : '';

      await pool.query(
        'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
        [sessionId, 'assistant', accumulatedContent + colorLegendText],
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
  } catch (error: any) {
    aiLogger.error('Analyze Area error', error);

    if (!res.headersSent) {
      res.status(500).json({ error: 'Something went wrong during analysis', details: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Something went wrong during analysis' })}\n\n`);
      res.end();
    }
  }
}
