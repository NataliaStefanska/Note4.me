import { pipeline } from '@huggingface/transformers';
import { textPreview } from './helpers';

let embedder = null;
let loading = false;
const waiters = [];

const MODEL = 'Xenova/all-MiniLM-L6-v2';

async function getEmbedder() {
  if (embedder) return embedder;
  if (loading) return new Promise(resolve => waiters.push(resolve));
  loading = true;
  try {
    embedder = await pipeline('feature-extraction', MODEL, {
      dtype: 'fp32',
    });
    waiters.forEach(fn => fn(embedder));
    waiters.length = 0;
    return embedder;
  } catch (err) {
    loading = false;
    throw err;
  }
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

function noteToText(note) {
  const parts = [note.title || ''];
  if (note.intent) parts.push(note.intent);
  parts.push(textPreview(note.content || '', 500));
  if (note.tags.length) parts.push(note.tags.join(' '));
  if (note.tasks.length) parts.push(note.tasks.map(t => t.text).join('. '));
  return parts.join('. ').trim();
}

// Cache: noteId -> { text, embedding }
const cache = new Map();

async function embed(text) {
  const pipe = await getEmbedder();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export async function initEmbedder(onProgress) {
  if (onProgress) onProgress('loading');
  await getEmbedder();
  if (onProgress) onProgress('ready');
}

export async function indexNotes(notes) {
  const pipe = await getEmbedder();
  if (!pipe) return;
  for (const note of notes) {
    const text = noteToText(note);
    const cached = cache.get(note.id);
    if (cached && cached.text === text) continue;
    const embedding = await embed(text);
    cache.set(note.id, { text, embedding });
  }
}

export async function vectorSearch(query, notes, topK = 20) {
  if (!query.trim()) return notes;
  const queryEmb = await embed(query);
  const scored = notes
    .map(note => {
      const cached = cache.get(note.id);
      if (!cached) return { note, score: 0 };
      return { note, score: cosineSim(queryEmb, cached.embedding) };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).filter(s => s.score > 0.15).map(s => s.note);
}

export function isEmbedderReady() {
  return embedder !== null;
}
