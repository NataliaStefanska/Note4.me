import { isEmbedderReady, embed, cosineSim, noteToText } from './vectorSearch';

const suggestionsCache = new Map(); // noteId -> { text, embedding }

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
    if (score > 0.25) {
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

  const tagScores = new Map();

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

  return [...tagScores.entries()]
    .map(([tag, { totalScore, fromNotes }]) => ({ tag, score: totalScore, fromNotes }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
