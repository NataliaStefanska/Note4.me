import { isEmbedderReady } from './vectorSearch';
import { textPreview } from './helpers';
import { pipeline } from '@huggingface/transformers';

const suggestionsCache = new Map(); // noteId -> { text, embedding }

function noteToText(note) {
  const parts = [note.title || ''];
  if (note.intent) parts.push(note.intent);
  parts.push(textPreview(note.content || '', 500));
  if (note.tags.length) parts.push(note.tags.join(' '));
  if (note.tasks.length) parts.push(note.tasks.map(t => t.text).join('. '));
  return parts.join('. ').trim();
}

function cosineSim(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-8);
}

let embedder = null;
async function getEmbedder() {
  if (embedder) return embedder;
  // Try to get the already-loaded pipeline
  try {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'fp32' });
  } catch {
    return null;
  }
  return embedder;
}

async function embed(text) {
  const pipe = await getEmbedder();
  if (!pipe) return null;
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

async function getOrComputeEmbedding(note) {
  const text = noteToText(note);
  const cached = suggestionsCache.get(note.id);
  if (cached && cached.text === text) return cached.embedding;
  const embedding = await embed(text);
  if (embedding) {
    suggestionsCache.set(note.id, { text, embedding });
  }
  return embedding;
}

/**
 * Suggest notes that are semantically similar but not yet linked.
 * Returns: [{ note, score }] sorted by similarity, top 5.
 */
export async function suggestConnections(activeNote, allSpaceNotes, topK = 5) {
  if (!isEmbedderReady()) return [];

  const activeEmb = await getOrComputeEmbedding(activeNote);
  if (!activeEmb) return [];

  const existingLinks = new Set(activeNote.linkedNotes || []);
  const candidates = allSpaceNotes.filter(n =>
    n.id !== activeNote.id && !n.archived && !existingLinks.has(n.id)
  );

  const scored = [];
  for (const note of candidates) {
    const emb = await getOrComputeEmbedding(note);
    if (!emb) continue;
    const score = cosineSim(activeEmb, emb);
    if (score > 0.25) { // Higher threshold than search — we want meaningful suggestions
      scored.push({ note, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Suggest tags based on what similar notes are tagged with.
 * Returns: [{ tag, score, fromNotes }] sorted by relevance, top 8.
 */
export async function suggestTags(activeNote, allSpaceNotes, topK = 8) {
  if (!isEmbedderReady()) return [];

  const activeEmb = await getOrComputeEmbedding(activeNote);
  if (!activeEmb) return [];

  const existingTags = new Set(activeNote.tags || []);
  const candidates = allSpaceNotes.filter(n =>
    n.id !== activeNote.id && !n.archived && n.tags.length > 0
  );

  // Score each candidate note
  const tagScores = new Map(); // tag -> { totalScore, fromNotes }

  for (const note of candidates) {
    const emb = await getOrComputeEmbedding(note);
    if (!emb) continue;
    const sim = cosineSim(activeEmb, emb);
    if (sim < 0.2) continue;

    for (const tag of note.tags) {
      if (existingTags.has(tag)) continue;
      const entry = tagScores.get(tag) || { totalScore: 0, fromNotes: [] };
      entry.totalScore += sim;
      if (!entry.fromNotes.includes(note.title || 'Untitled')) {
        entry.fromNotes.push(note.title || 'Untitled');
      }
      tagScores.set(tag, entry);
    }
  }

  const results = [...tagScores.entries()]
    .map(([tag, { totalScore, fromNotes }]) => ({ tag, score: totalScore, fromNotes }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return results;
}
