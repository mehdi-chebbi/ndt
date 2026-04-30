import fs from 'fs';
import path from 'path';
import { aiLogger } from '../utils/logger';

// ── Config ──────────────────────────────────────────────────────────

const KNOWLEDGE_DIR = path.join(process.cwd(), 'knowledge');
const INDEX_FILE = path.join(KNOWLEDGE_DIR, 'index.json');

const CHUNK_SIZE = 500;  // words per chunk
const CHUNK_OVERLAP = 100; // word overlap between consecutive chunks
const DEFAULT_TOP_K = 5;  // chunks to return per search

// BM25 parameters
const BM25_K1 = 1.5;   // term frequency saturation
const BM25_B = 0.75;   // length normalization

// Entity filter: max files an entity can match before we skip it for Pool A
const ENTITY_MAX_FILE_MATCHES = 10;

// Diversity cap: max chunks per source file
const MAX_PER_SOURCE = 2;

// ── Types ───────────────────────────────────────────────────────────

export interface Chunk {
  chunk_id: number;
  source: string;
  title: string;
  chunk_index: number;
  text: string;
}

export interface SearchResult {
  chunks: Chunk[];
  totalChunks: number;
  documentCount: number;
  queryTerms: string[];
}

export interface KnowledgeStatus {
  available: boolean;
  chunkCount: number;
  documentCount: number;
}

/** Precomputed per-chunk data for BM25 scoring */
interface IndexedChunk {
  chunk: Chunk;
  tfMap: Record<string, number>;  // term → count
  tokenCount: number;
}

/** Precomputed search index with BM25 data */
interface SearchIndex {
  chunks: IndexedChunk[];
  idf: Record<string, number>;   // term → IDF score
  avgTokenCount: number;         // average chunk token count
  sourceFileCount: Record<string, number>; // source filename → how many files have a similar name (unused, but useful for entity filter)
  uniqueSources: string[];       // list of unique source filenames
}

// ── Stop words (English + French) ───────────────────────────────────

const STOP_WORDS = new Set([
  // English
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'ought',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or', 'if',
  'while', 'about', 'up', 'down', 'this', 'that', 'these', 'those',
  'it', 'its', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'him', 'his', 'she', 'her', 'they', 'them', 'their', 'what', 'which',
  'who', 'whom', 'also', 'however', 'therefore', 'thus', 'well',
  // French
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'en',
  'est', 'que', 'qui', 'dans', 'pour', 'sur', 'avec', 'par', 'au',
  'aux', 'son', 'sa', 'ses', 'ce', 'cette', 'ces', 'il', 'elle',
  'nous', 'vous', 'ils', 'elles', 'ne', 'pas', 'plus', 'mais',
  'donc', 'car', 'ni', 'tres', 'peu', 'tout', 'tous', 'toute',
  'fait', 'ete', 'etre', 'avoir', 'peut', 'aussi', 'entre', 'sans',
  'vers', 'donnees', 'contre', 'depuis', 'sont', 'ont',
]);

// ── French/English geo aliases (small set for false negatives) ──────

const GEO_ALIASES: Record<string, string> = {
  'libye': 'libya',
  'tchad': 'chad',
  'soudan': 'sudan',
  'maroc': 'morocco',
  'egypte': 'egypt',
  'senegal': 'senegal',
  'ethiopie': 'ethiopia',
  'algerie': 'algeria',
  'tunisie': 'tunisia',
  'niger': 'niger',
  'mali': 'mali',
  'gambie': 'gambia',
  'guinee': 'guinea',
  'congo': 'congo',
  'sahel': 'sahel',
  'maghreb': 'maghreb',
  'afrique': 'africa',
};

// ── Compound geo names (normalized, hyphens stripped) ──────────────

const COMPOUND_GEOS: string[] = [
  'burkina faso',
  'sierra leone',
  'south sudan',
  'soudan du sud',
  'guinea bissau',
  'guinee bissau',
  'equatorial guinea',
  'guinee equatoriale',
  'central african republic',
  'republique centrafricaine',
  'cape verde',
  'cap vert',
  'democratic republic congo',
  'republique democratique congo',
  'sao tome principe',
  'cote divoire',
  'cote ivoire',
];

// ── In-memory index ─────────────────────────────────────────────────

let searchIndex: SearchIndex | null = null;

// ── Helpers ─────────────────────────────────────────────────────────

/** Strip diacritics so accented chars match their base form (FR accent normalization) */
function normalizeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Normalize text for filename comparison: lowercase, strip accents, strip hyphens */
function normalizeForMatch(text: string): string {
  return normalizeAccents(text.toLowerCase().replace(/[-_]/g, ' '));
}

/** Lowercase, strip accents, strip punctuation, remove stop words */
function tokenize(text: string): string[] {
  return normalizeAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

/** Split text into overlapping word-based chunks */
function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= size) return [text];

  const result: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + size, words.length);
    result.push(words.slice(start, end).join(' '));

    // Move forward by (size - overlap), but stop if the remainder is too small
    const next = start + (size - overlap);
    if (next >= words.length - overlap) break;
    start = next;
  }

  return result;
}

/** Derive a human-readable title from filename */
function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.txt$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/** Build a term frequency map from tokens */
function buildTFMap(tokens: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of tokens) {
    map[t] = (map[t] ?? 0) + 1;
  }
  return map;
}

/** Check if any .txt file is newer than the index */
function indexIsStale(): boolean {
  if (!fs.existsSync(INDEX_FILE)) return true;

  try {
    const indexMtime = fs.statSync(INDEX_FILE).mtimeMs;
    const txtFiles = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.txt'));

    for (const file of txtFiles) {
      if (fs.statSync(path.join(KNOWLEDGE_DIR, file)).mtimeMs > indexMtime) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

// ── Entity Detection ──────────────────────────────────────────────

/**
 * Detect entity tokens from the original query.
 * Layer 1: Capitalization heuristic (catches proper nouns the AI capitalizes)
 * Layer 2: French alias map (for all-lowercase false negatives)
 * Layer 3: Compound geo names (multi-word entities)
 */
function extractEntityTokens(originalQuery: string, tokens: string[]): Set<string> {
  const entities = new Set<string>();

  // Layer 1: Capitalization heuristic
  const words = originalQuery.trim().split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const clean = words[i].replace(/[^a-zA-Z\u00C0-\u017F\-]/g, '');
    if (clean.length < 3) continue;

    const isCapitalized = clean[0] === clean[0].toUpperCase()
                       && clean[0] !== clean[0].toLowerCase();

    // Skip sentence-start only if it's a common word
    const isSentenceStart = i === 0;
    const isStopWord = STOP_WORDS.has(clean.toLowerCase());

    if (isCapitalized && !(isSentenceStart && isStopWord)) {
      entities.add(normalizeAccents(clean.toLowerCase()));
    }
  }

  // Layer 2: French alias map (resolve to canonical form)
  const resolved = new Set<string>();
  for (const e of entities) {
    resolved.add(GEO_ALIASES[e] ?? e);
  }
  // Also check all tokens against aliases (catches lowercase French forms the AI might use)
  for (const t of tokens) {
    if (GEO_ALIASES[t]) {
      resolved.add(GEO_ALIASES[t]);
    }
  }

  // Layer 3: Compound geo names
  const normalizedQuery = normalizeForMatch(originalQuery);
  for (const compound of COMPOUND_GEOS) {
    if (normalizedQuery.includes(compound)) {
      // Add all individual words from the compound as entities
      for (const word of compound.split(/\s+/)) {
        if (word.length > 2) {
          resolved.add(word);
        }
      }
    }
  }

  return resolved;
}

// ── BM25 ───────────────────────────────────────────────────────────

/** Precompute IDF values across all chunks */
function buildIDF(indexedChunks: IndexedChunk[]): Record<string, number> {
  const N = indexedChunks.length;
  const df: Record<string, number> = {};

  for (const ic of indexedChunks) {
    const uniqueTerms = new Set(Object.keys(ic.tfMap));
    for (const term of uniqueTerms) {
      df[term] = (df[term] ?? 0) + 1;
    }
  }

  const idf: Record<string, number> = {};
  for (const [term, freq] of Object.entries(df)) {
    // Robertson/Sparck Jones IDF (always positive)
    idf[term] = Math.log((N - freq + 0.5) / (freq + 0.5) + 1);
  }

  return idf;
}

/**
 * BM25 rank chunks from a given pool.
 * Uses precomputed IDF and TF maps.
 */
function bm25Rank(
  pool: IndexedChunk[],
  queryTokens: string[],
  topK: number,
  idf: Record<string, number>,
  avgTokenCount: number,
): { chunk: Chunk; score: number }[] {
  const scored: { chunk: Chunk; score: number }[] = [];

  for (const ic of pool) {
    let score = 0;

    for (const term of queryTokens) {
      const tf = ic.tfMap[term] ?? 0;
      if (tf === 0) continue;

      const termIDF = idf[term] ?? 0;

      // BM25 TF normalization
      const tfNorm = (tf * (BM25_K1 + 1)) /
        (tf + BM25_K1 * (1 - BM25_B + BM25_B * ic.tokenCount / avgTokenCount));

      score += termIDF * tfNorm;
    }

    if (score > 0) {
      scored.push({ chunk: ic.chunk, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Apply diversity cap: max `maxPerSource` chunks per source file.
 */
function applyDiversityCap(
  ranked: { chunk: Chunk; score: number }[],
  topK: number,
  maxPerSource: number,
): Chunk[] {
  const sourceCounts: Record<string, number> = {};
  const result: Chunk[] = [];

  for (const { chunk } of ranked) {
    const count = sourceCounts[chunk.source] ?? 0;
    if (count < maxPerSource) {
      result.push(chunk);
      sourceCounts[chunk.source] = count + 1;
    }
    if (result.length >= topK) break;
  }

  return result;
}

// ── Index build ─────────────────────────────────────────────────────

/**
 * Read all .txt files, chunk them, build TF maps and IDF.
 * Write chunk data to index.json (without TF maps — those are rebuilt at load).
 */
function buildSearchIndex(): SearchIndex | null {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
    aiLogger.warning('Knowledge directory created but is empty');
    return null;
  }

  const txtFiles = fs.readdirSync(KNOWLEDGE_DIR)
    .filter(f => f.endsWith('.txt'))
    .sort();

  if (txtFiles.length === 0) {
    aiLogger.warning('No .txt files found in knowledge directory');
    return null;
  }

  // Build chunks with precomputed TF maps
  const indexedChunks: IndexedChunk[] = [];
  const allChunks: Chunk[] = [];
  let chunkId = 0;

  for (const file of txtFiles) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const pieces = chunkText(content);
    const title = titleFromFilename(file);

    for (let i = 0; i < pieces.length; i++) {
      const tokens = tokenize(pieces[i]);
      const chunk: Chunk = {
        chunk_id: chunkId++,
        source: file,
        title,
        chunk_index: i,
        text: pieces[i],
      };
      allChunks.push(chunk);
      indexedChunks.push({
        chunk,
        tfMap: buildTFMap(tokens),
        tokenCount: tokens.length,
      });
    }
  }

  // Compute IDF
  const idf = buildIDF(indexedChunks);
  const avgTokenCount = indexedChunks.length > 0
    ? indexedChunks.reduce((s, ic) => s + ic.tokenCount, 0) / indexedChunks.length
    : 1;

  const uniqueSources = [...new Set(allChunks.map(c => c.source))];

  // Save lightweight index (chunks only, TF/IDF rebuilt at load for correctness)
  fs.writeFileSync(INDEX_FILE, JSON.stringify(allChunks, null, 2));

  const index: SearchIndex = { chunks: indexedChunks, idf, avgTokenCount, sourceFileCount: {}, uniqueSources };
  aiLogger.info(
    `Knowledge index built: ${allChunks.length} chunks from ${uniqueSources.length} documents (BM25 ready)`,
  );
  return index;
}

// ── Index load ──────────────────────────────────────────────────────

function loadIndex(): boolean {
  if (searchIndex !== null) return true;

  let allChunks: Chunk[];

  if (indexIsStale()) {
    const idx = buildSearchIndex();
    if (!idx) return false;
    searchIndex = idx;
    return true;
  }

  // Load existing index and rebuild TF/IDF from it
  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
    allChunks = JSON.parse(raw) as Chunk[];

    // Rebuild TF maps and IDF (they're not stored in the file)
    const indexedChunks: IndexedChunk[] = [];
    for (const chunk of allChunks) {
      const tokens = tokenize(chunk.text);
      indexedChunks.push({
        chunk,
        tfMap: buildTFMap(tokens),
        tokenCount: tokens.length,
      });
    }

    const idf = buildIDF(indexedChunks);
    const avgTokenCount = indexedChunks.length > 0
      ? indexedChunks.reduce((s, ic) => s + ic.tokenCount, 0) / indexedChunks.length
      : 1;
    const uniqueSources = [...new Set(allChunks.map(c => c.source))];

    searchIndex = { chunks: indexedChunks, idf, avgTokenCount, sourceFileCount: {}, uniqueSources };

    aiLogger.info(
      `Knowledge index loaded: ${allChunks.length} chunks from ${uniqueSources.length} documents (BM25 ready)`,
    );
    return true;
  } catch (err) {
    aiLogger.error('Failed to load knowledge index, rebuilding…', err as Error);
    const idx = buildSearchIndex();
    return idx !== null;
  }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Search the knowledge base for chunks relevant to `query`.
 *
 * Architecture: Entity Detection → Dual-Pool Search → Merge → Diversity Cap
 *
 * Pool A: chunks from files whose filename matches a detected entity (country-specific)
 * Pool B: full corpus BM25 rank, excluding Pool A selections (catches cross-country docs)
 * Merged with diversity cap (max 2 per source file).
 */
export function searchKnowledgeBase(
  query: string,
  topK = DEFAULT_TOP_K,
): SearchResult | null {
  if (!loadIndex() || !searchIndex || searchIndex.chunks.length === 0) {
    return null;
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return null;

  const { chunks: indexedChunks, idf, avgTokenCount, uniqueSources } = searchIndex;

  // ── Step 1: Entity Detection ──
  const entities = extractEntityTokens(query, queryTokens);

  // ── Step 2: Determine filter entities (only those matching < ENTITY_MAX_FILE_MATCHES files) ──
  const filterEntities: string[] = [];
  if (entities.size > 0) {
    for (const entity of entities) {
      // Count how many unique source files contain this entity
      let matchCount = 0;
      for (const source of uniqueSources) {
        if (normalizeForMatch(source).includes(entity)) {
          matchCount++;
        }
      }
      // Only use for filename filtering if it matches a small number of files
      // (country names are good, generic acronyms like "UNCCD" are not)
      if (matchCount > 0 && matchCount <= ENTITY_MAX_FILE_MATCHES) {
        filterEntities.push(entity);
      }
    }
  }

  // ── Step 3: Dual-Pool BM25 Search ──
  const poolASize = filterEntities.length > 0 ? Math.ceil(topK * 0.6) : 0; // 60% from Pool A
  const poolBSize = topK - poolASize;
  const overFetch = topK * 3; // over-fetch for diversity cap

  let selectedChunks: Chunk[] = [];
  const selectedIds = new Set<number>();

  // Pool A: filename-filtered chunks
  if (filterEntities.length > 0) {
    const poolA = indexedChunks.filter(ic =>
      filterEntities.some(e => normalizeForMatch(ic.chunk.source).includes(e))
    );

    if (poolA.length > 0) {
      // Dynamic maxPerSource: allow more depth if pool is narrow
      const poolAMaxPerSource = poolA.length < 20 ? topK : MAX_PER_SOURCE;
      const poolATopK = Math.max(poolASize * 2, poolA.length); // over-fetch within Pool A

      const rankedA = bm25Rank(poolA, queryTokens, poolATopK, idf, avgTokenCount);
      const cappedA = applyDiversityCap(rankedA, poolASize, poolAMaxPerSource);

      for (const c of cappedA) {
        selectedChunks.push(c);
        selectedIds.add(c.chunk_id);
      }
    }
  }

  // Pool B: full corpus, excluding already selected
  const remainingSlots = topK - selectedChunks.length;
  if (remainingSlots > 0) {
    const poolB = indexedChunks.filter(ic => !selectedIds.has(ic.chunk_id));
    const rankedB = bm25Rank(poolB, queryTokens, overFetch, idf, avgTokenCount);
    const cappedB = applyDiversityCap(rankedB, remainingSlots, MAX_PER_SOURCE);

    selectedChunks.push(...cappedB);
  }

  if (selectedChunks.length === 0) return null;

  const sources = new Set(selectedChunks.map(c => c.source));

  return {
    chunks: selectedChunks,
    totalChunks: indexedChunks.length,
    documentCount: sources.size,
    queryTerms: queryTokens,
  };
}

/**
 * Return availability stats for the knowledge base.
 */
export function getKnowledgeStatus(): KnowledgeStatus {
  if (searchIndex === null) {
    loadIndex();
  }

  if (!searchIndex || searchIndex.chunks.length === 0) {
    return { available: false, chunkCount: 0, documentCount: 0 };
  }

  const sources = new Set(searchIndex.chunks.map(c => c.chunk.source));
  return {
    available: true,
    chunkCount: searchIndex.chunks.length,
    documentCount: sources.size,
  };
}

/**
 * Force a full index rebuild.
 */
export function rebuildIndex(): boolean {
  searchIndex = null;
  // Force stale by deleting the index file
  if (fs.existsSync(INDEX_FILE)) {
    fs.unlinkSync(INDEX_FILE);
  }
  return loadIndex();
}

/**
 * Initialize the knowledge base at server startup.
 */
export function initializeKnowledgeBase(): void {
  const status = getKnowledgeStatus();
  if (status.available) {
    console.log(
      `📚 Knowledge base ready: ${status.documentCount} documents, ${status.chunkCount} chunks indexed (BM25)`,
    );
  } else {
    console.log('📚 Knowledge base: no .txt documents found in knowledge/ directory');
  }
}
