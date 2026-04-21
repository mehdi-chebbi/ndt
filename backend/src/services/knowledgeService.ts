import fs from 'fs';
import path from 'path';
import { aiLogger } from '../utils/logger';

// ── Config ──────────────────────────────────────────────────────────

const KNOWLEDGE_DIR = path.join(process.cwd(), 'knowledge');
const INDEX_FILE = path.join(KNOWLEDGE_DIR, 'index.json');

const CHUNK_SIZE = 500;  // words per chunk
const CHUNK_OVERLAP = 100; // word overlap between consecutive chunks
const DEFAULT_TOP_K = 5;  // chunks to return per search

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
  'donc', 'car', 'ni', 'très', 'peu', 'tout', 'tous', 'toute',
  'fait', 'été', 'être', 'avoir', 'peut', 'aussi', 'entre', 'sans',
  'vers', 'données', 'contre', 'depuis', 'sont', 'ont', 'été',
]);

// ── In-memory index ─────────────────────────────────────────────────

let chunks: Chunk[] | null = null;

// ── Helpers ─────────────────────────────────────────────────────────

/** Lowercase, strip punctuation, remove stop words */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zàâäéèêëïîôùûüÿçœæ0-9\s-]/g, ' ')
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

// ── Index build ─────────────────────────────────────────────────────

/**
 * Read all .txt files in the knowledge directory, chunk them, and
 * write the resulting index to index.json.  Idempotent.
 */
export function buildIndex(): boolean {
  // Ensure directory exists
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
    aiLogger.warning('Knowledge directory created but is empty');
    return false;
  }

  const txtFiles = fs.readdirSync(KNOWLEDGE_DIR)
    .filter(f => f.endsWith('.txt'))
    .sort();

  if (txtFiles.length === 0) {
    aiLogger.warning('No .txt files found in knowledge directory');
    return false;
  }

  const allChunks: Chunk[] = [];
  let chunkId = 0;

  for (const file of txtFiles) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const pieces = chunkText(content);
    const title = titleFromFilename(file);

    for (let i = 0; i < pieces.length; i++) {
      allChunks.push({
        chunk_id: chunkId++,
        source: file,
        title,
        chunk_index: i,
        text: pieces[i],
      });
    }
  }

  fs.writeFileSync(INDEX_FILE, JSON.stringify(allChunks, null, 2));
  chunks = allChunks;

  const sources = new Set(allChunks.map(c => c.source));
  aiLogger.info(
    `Knowledge index built: ${allChunks.length} chunks from ${sources.size} documents`,
  );
  return true;
}

// ── Index load ──────────────────────────────────────────────────────

function loadIndex(): boolean {
  // Already loaded
  if (chunks !== null) return true;

  // Needs rebuild?
  if (indexIsStale()) {
    return buildIndex();
  }

  // Load existing index
  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
    chunks = JSON.parse(raw) as Chunk[];

    const sources = new Set(chunks.map(c => c.source));
    aiLogger.info(
      `Knowledge index loaded: ${chunks.length} chunks from ${sources.size} documents`,
    );
    return true;
  } catch (err) {
    aiLogger.error('Failed to load knowledge index, rebuilding…', err as Error);
    return buildIndex();
  }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Search the knowledge base for chunks relevant to `query`.
 * Returns the top-K scoring chunks, or null if the knowledge base is empty.
 */
export function searchKnowledgeBase(
  query: string,
  topK = DEFAULT_TOP_K,
): SearchResult | null {
  if (!loadIndex() || !chunks || chunks.length === 0) {
    return null;
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return null;

  // Score every chunk
  const scored = chunks.map(chunk => {
    let score = 0;
    const textLower = chunk.text.toLowerCase();
    const sourceLower = `${chunk.source} ${chunk.title}`.toLowerCase();

    for (const term of queryTokens) {
      // Text matches (each occurrence = 1 pt)
      const textHits = textLower.split(term).length - 1;
      score += textHits;

      // Title / source match (bonus)
      if (sourceLower.includes(term)) {
        score += 3;
      }
    }

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored
    .filter(s => s.score > 0)
    .slice(0, topK)
    .map(s => s.chunk);

  if (topChunks.length === 0) return null;

  const sources = new Set(topChunks.map(c => c.source));

  return {
    chunks: topChunks,
    totalChunks: chunks.length,
    documentCount: sources.size,
    queryTerms: queryTokens,
  };
}

/**
 * Return availability stats for the knowledge base.
 * Will auto-build the index if .txt files exist but index.json doesn't.
 */
export function getKnowledgeStatus(): KnowledgeStatus {
  if (chunks === null) {
    // Try loading — loadIndex() handles: already cached, stale rebuild, or fresh build
    loadIndex();
  }

  if (!chunks || chunks.length === 0) {
    return { available: false, chunkCount: 0, documentCount: 0 };
  }

  const sources = new Set(chunks.map(c => c.source));
  return {
    available: true,
    chunkCount: chunks.length,
    documentCount: sources.size,
  };
}

/**
 * Force a full index rebuild (e.g. after adding new documents).
 * Returns true if the rebuild succeeded.
 */
export function rebuildIndex(): boolean {
  chunks = null;
  return buildIndex();
}

/**
 * Initialize the knowledge base at server startup.
 * Builds or loads the index so it's ready before any chat request.
 */
export function initializeKnowledgeBase(): void {
  const status = getKnowledgeStatus();
  if (status.available) {
    console.log(
      `📚 Knowledge base ready: ${status.documentCount} documents, ${status.chunkCount} chunks indexed`,
    );
  } else {
    console.log('📚 Knowledge base: no .txt documents found in knowledge/ directory');
  }
}
