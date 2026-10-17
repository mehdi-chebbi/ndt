import { aiLogger } from '../utils/logger';

export type AiIntent =
  | 'general_question'
  | 'list_layers'
  | 'country_statistics'
  | 'countries_for_layer'
  | 'compare_layers'
  | 'show_on_map'
  | 'search_sources'
  | 'recover_with_catalog'
  | 'clarification';

export interface AiRequestPlan {
  intent: AiIntent;
  country?: string;
  layerQuery?: string;
  groupQuery?: string;
  searchQuery?: string;
  clarification?: string;
  clarificationContext?: string;
}

interface PlannerInput {
  requestId?: string;
  message: string;
  history: { role: string; content: string }[];
  sourcesMode: boolean;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  appUrl?: string;
  appName?: string;
}

const VALID_INTENTS = new Set<AiIntent>([
  'general_question',
  'list_layers',
  'country_statistics',
  'countries_for_layer',
  'compare_layers',
  'show_on_map',
  'search_sources',
  'recover_with_catalog',
  'clarification',
]);

const PLANNER_PROMPT = `You route requests for an African geospatial data platform.
Return one JSON object only. Never answer the user's question.
Make the routing decision immediately. Do not explain or deliberate.

Schema:
{
  "intent": "general_question | list_layers | country_statistics | countries_for_layer | compare_layers | show_on_map | clarification",
  "country": "country name in English when present",
  "layerQuery": "the user's layer/theme words; do not invent an exact database layer name",
  "groupQuery": "group/category only when explicitly mentioned",
  "searchQuery": "filter words for layer listing/comparison",
  "clarification": "short question only when the request cannot be understood"
}

Routing rules:
- Questions asking for actual data about a country and layer/theme are country_statistics.
- Requests to display/load/add/show a layer on the map are show_on_map. A country is required because map display uses a country-clipped layer; inherit it from context when available.
- If a map request identifies a layer but no country is available, return clarification with a short question asking only for the country. Do not return show_on_map with an empty country.
- If an action request is missing another required value, return clarification and ask only for that missing value. A missing required action value is a clarification case even when the rest of the request is understandable.
- Comparisons, trends, multiple years or multiple periods are compare_layers.
- Questions asking which countries have a layer are countries_for_layer.
- Questions asking what layers/data are available are list_layers.
- Conceptual or platform-usage questions are general_question.
- For list_layers, put only the requested theme in searchQuery. Use no searchQuery when the user asks for every layer.
- Correct obvious spelling mistakes in country, layer, and theme names (for example "ladn cover" means "land cover").
- Keep layerQuery semantic and concise. Never guess an exact catalog display name.
- A follow-up such as "what about land productivity?" inherits the previous intent when the conversation was listing or searching layers.
- When the assistant has asked the user to choose a layer/source for a pending map action, a short selection such as "Landcover 2000" or "from OSS" inherits show_on_map and the previously selected details.
- When the assistant asks which country to use for a pending map action, a short country reply inherits show_on_map and the previously selected layer and source.
- Choosing a specific layer after asking to display/load layers means show_on_map, not list_layers.
- Use prior conversation to resolve references such as "it", "that layer", "what about X", or "compare with Algeria".
- Never copy the entire user sentence into layerQuery or searchQuery; extract only the country, layer, or theme needed by the backend.`;

function buildHeaders(input: PlannerInput): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${input.apiKey}`,
    'Content-Type': 'application/json',
  };

  if (input.appUrl) {
    headers['HTTP-Referer'] = input.appUrl;
    headers['X-Title'] = input.appName || 'NDT Platform';
  }

  return headers;
}

function extractJsonObject(text: string): string | null {
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = firstBrace; i < text.length; i++) {
    const character = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (character === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (character === '{') depth++;
    if (character === '}') {
      depth--;
      if (depth === 0) return text.slice(firstBrace, i + 1);
    }
  }

  return null;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 300) : undefined;
}

interface PlanParseResult {
  plan: AiRequestPlan | null;
  error?: string;
}

function normalizeIntent(value: unknown): AiIntent | undefined {
  const raw = optionalString(value)?.toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw) return undefined;

  const aliases: Record<string, AiIntent> = {
    general: 'general_question',
    question: 'general_question',
    list_available_layers: 'list_layers',
    available_layers: 'list_layers',
    layer_list: 'list_layers',
    country_stats: 'country_statistics',
    layer_countries: 'countries_for_layer',
    compare: 'compare_layers',
    map: 'show_on_map',
    display_on_map: 'show_on_map',
    clarify: 'clarification',
  };

  const normalized = aliases[raw] || raw;
  return VALID_INTENTS.has(normalized as AiIntent) ? normalized as AiIntent : undefined;
}

function validatePlan(value: unknown): PlanParseResult {
  if (!value || typeof value !== 'object') {
    return { plan: null, error: 'response is not a JSON object' };
  }

  const outer = value as Record<string, unknown>;
  const candidate = (
    outer.plan && typeof outer.plan === 'object' ? outer.plan : outer
  ) as Record<string, unknown>;
  const intent = normalizeIntent(candidate.intent ?? candidate.action ?? candidate.type);
  if (!intent) {
    return { plan: null, error: 'missing or unsupported intent' };
  }

  const plan: AiRequestPlan = {
    intent,
    country: optionalString(candidate.country ?? candidate.countryName),
    layerQuery: optionalString(candidate.layerQuery ?? candidate.layer ?? candidate.layer_query),
    groupQuery: optionalString(candidate.groupQuery ?? candidate.group ?? candidate.group_query),
    searchQuery: optionalString(candidate.searchQuery ?? candidate.query ?? candidate.search_query),
    clarification: optionalString(candidate.clarification ?? candidate.question),
  };

  if (intent === 'country_statistics' || intent === 'show_on_map') {
    if (!plan.country || !plan.layerQuery) {
      const missing = [
        !plan.country ? 'country' : '',
        !plan.layerQuery ? 'specific layer' : '',
      ].filter(Boolean);
      return {
        plan: {
          intent: 'clarification',
          clarificationContext: `${intent} is missing: ${missing.join(', ')}`,
        },
      };
    }
  }
  if (intent === 'countries_for_layer' && !plan.layerQuery) {
    return {
      plan: {
        intent: 'clarification',
        clarificationContext: 'countries_for_layer is missing: specific layer',
      },
    };
  }
  if (intent === 'compare_layers' && (!plan.country || !(plan.searchQuery || plan.layerQuery))) {
    const missing = [
      !plan.country ? 'country' : '',
      !(plan.searchQuery || plan.layerQuery) ? 'layers or theme to compare' : '',
    ].filter(Boolean);
    return {
      plan: {
        intent: 'clarification',
        clarificationContext: `compare_layers is missing: ${missing.join(', ')}`,
      },
    };
  }
  if (intent === 'clarification' && !plan.clarification) {
    plan.clarificationContext = 'the request is ambiguous or lacks required information';
  }

  return { plan };
}

function parsePlan(content: string): PlanParseResult {
  const json = extractJsonObject(content);
  if (!json) return { plan: null, error: 'no complete JSON object found' };
  try {
    return validatePlan(JSON.parse(json));
  } catch (error: any) {
    return { plan: null, error: `invalid JSON: ${error.message}` };
  }
}

function safeFallbackPlan(message: string): AiRequestPlan {
  // A parser/provider failure is not evidence that the user's request is
  // ambiguous. The controller will load the small verified layer catalogue
  // and let the prose model recover using the original request and history.
  void message;
  return {
    intent: 'recover_with_catalog',
  };
}

function compactHistory(history: { role: string; content: string }[]): string {
  return history
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .slice(-6)
    .map(message => `${message.role}: ${message.content.slice(0, 600)}`)
    .join('\n');
}

function plannerText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (Array.isArray(value)) {
    const combined = value
      .map(part => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          const item = part as Record<string, unknown>;
          return typeof item.text === 'string' ? item.text : '';
        }
        return '';
      })
      .join('')
      .trim();
    return combined || null;
  }
  return null;
}

function diagnosticText(value: string | null): string {
  if (!value) return '(empty)';
  return value.replace(/\s+/g, ' ').trim().slice(0, 1200);
}

async function requestPlan(input: PlannerInput, useJsonMode: boolean): Promise<AiRequestPlan | null> {
  const body: Record<string, unknown> = {
    model: input.model,
    messages: [
      { role: 'system', content: PLANNER_PROMPT },
      {
        role: 'user',
        content: `Recent conversation:\n${compactHistory(input.history) || '(none)'}\n\nCurrent request:\n${input.message}`,
      },
    ],
    temperature: 0,
    max_tokens: 600,
    stream: false,
  };

  if (useJsonMode) {
    // GLM requires reasoning on some providers. Cap it instead of disabling it
    // so the short structured answer cannot be crowded out by deliberation.
    body.reasoning = { max_tokens: 256, exclude: true };
    body.response_format = { type: 'json_object' };
    body.plugins = [{ id: 'response-healing' }];
  } else {
    // Compatibility retry: omit optional reasoning controls in case a routed
    // provider rejects them, while leaving enough room to reach the JSON.
    body.max_tokens = 1400;
  }

  const response = await fetch(`${input.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(input),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Planner API error ${response.status}: ${await response.text()}`);
  }

  const data: any = await response.json();
  const choice = data.choices?.[0];
  const message = choice?.message;
  const content = plannerText(message?.content)
    || plannerText(choice?.text)
    || plannerText(message?.reasoning);
  const parsed = content
    ? parsePlan(content)
    : { plan: null, error: 'provider returned no usable content' };

  if (!parsed.plan) {
    aiLogger.warning('AI planner response failed validation', {
      requestId: input.requestId,
      mode: useJsonMode ? 'json' : 'prompt-only',
      requestedModel: input.model,
      responseModel: data.model,
      provider: data.provider,
      finishReason: choice?.finish_reason,
      validationError: parsed.error,
      responsePreview: diagnosticText(content),
    });
  } else {
    aiLogger.info('AI planner response accepted', {
      requestId: input.requestId,
      mode: useJsonMode ? 'json' : 'prompt-only',
      requestedModel: input.model,
      responseModel: data.model,
      provider: data.provider,
      finishReason: choice?.finish_reason,
      usage: data.usage,
    });
  }

  return parsed.plan;
}

/**
 * Build a private, validated request plan. No raw model output escapes this service.
 * Sources mode is deterministic and never asks the model whether retrieval is needed.
 */
export async function planAiRequest(input: PlannerInput): Promise<AiRequestPlan> {
  if (input.sourcesMode) {
    return { intent: 'search_sources', searchQuery: input.message };
  }

  try {
    const structuredPlan = await requestPlan(input, true);
    if (structuredPlan) return structuredPlan;
    aiLogger.warning('AI planner returned invalid structured output; retrying without JSON mode', {
      requestId: input.requestId,
    });
  } catch (error: any) {
    aiLogger.warning('AI planner JSON mode unavailable; retrying with prompt-only JSON', {
      requestId: input.requestId,
      error: error.message,
    });
  }

  try {
    const fallbackPlan = await requestPlan(input, false);
    if (fallbackPlan) return fallbackPlan;
  } catch (error: any) {
    aiLogger.warning('AI planner fallback request failed; recovering with catalog', {
      requestId: input.requestId,
      error: error.message,
    });
  }

  aiLogger.warning('AI planner exhausted; recovering with verified layer catalog', {
    requestId: input.requestId,
  });
  return safeFallbackPlan(input.message);
}

/** Add a small bilingual vocabulary boost without involving another model call. */
export function expandKnowledgeQuery(query: string): string {
  const additions: string[] = [];
  const normalized = query.toLowerCase();
  const aliases: [RegExp, string][] = [
    [/\bdrought\b|\bsécheresse\b|\bsecheresse\b/i, 'drought secheresse sécheresse'],
    [/\bland degradation\b|\bdégradation des terres\b|\bdegradation des terres\b/i, 'land degradation degradation des terres'],
    [/\bwater\b|\beau\b/i, 'water eau access acces accès'],
    [/\bpolicy\b|\bpolitique\b/i, 'policy politique framework cadre'],
    [/\baction plan\b|\bplan d.action\b/i, 'action plan plan action programme'],
  ];

  for (const [pattern, terms] of aliases) {
    if (pattern.test(normalized)) additions.push(terms);
  }

  return [...new Set([query, ...additions])].join(' ');
}
