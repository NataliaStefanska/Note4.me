import { describe, it, expect } from 'vitest';
import { daysSince, daysAgo, INITIAL_SPACES, INITIAL_NOTES, EMOJI_OPTIONS, COLOR_OPTIONS, SUGGESTED_TAGS } from './data';

describe('daysSince', () => {
  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(daysSince(today)).toBe(0);
  });

  it('returns positive number for past dates', () => {
    const result = daysSince('2020-01-01');
    expect(result).toBeGreaterThan(0);
  });
});

describe('daysAgo', () => {
  it('returns a date string', () => {
    const result = daysAgo(5);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns today for 0 days ago', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(daysAgo(0)).toBe(today);
  });
});

describe('INITIAL_SPACES', () => {
  it('has at least one space', () => {
    expect(INITIAL_SPACES.length).toBeGreaterThan(0);
  });

  it('each space has required fields', () => {
    INITIAL_SPACES.forEach(sp => {
      expect(sp).toHaveProperty('id');
      expect(sp).toHaveProperty('name');
      expect(sp).toHaveProperty('emoji');
      expect(sp).toHaveProperty('color');
    });
  });

  it('all space IDs are unique', () => {
    const ids = INITIAL_SPACES.map(sp => sp.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('INITIAL_NOTES', () => {
  it('has notes for each initial space', () => {
    INITIAL_SPACES.forEach(sp => {
      expect(INITIAL_NOTES).toHaveProperty(sp.id);
      expect(INITIAL_NOTES[sp.id].length).toBeGreaterThan(0);
    });
  });

  it('each note has required fields', () => {
    Object.values(INITIAL_NOTES).flat().forEach(note => {
      expect(note).toHaveProperty('id');
      expect(note).toHaveProperty('title');
      expect(note).toHaveProperty('content');
      expect(note).toHaveProperty('tags');
      expect(note).toHaveProperty('tasks');
      expect(note).toHaveProperty('intent');
      expect(note).toHaveProperty('updatedAt');
      expect(note).toHaveProperty('lastOpened');
      expect(Array.isArray(note.tags)).toBe(true);
      expect(Array.isArray(note.tasks)).toBe(true);
    });
  });
});

describe('constants arrays', () => {
  it('EMOJI_OPTIONS is non-empty', () => {
    expect(EMOJI_OPTIONS.length).toBeGreaterThan(0);
  });

  it('COLOR_OPTIONS are valid hex colors', () => {
    COLOR_OPTIONS.forEach(c => {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('SUGGESTED_TAGS is non-empty', () => {
    expect(SUGGESTED_TAGS.length).toBeGreaterThan(0);
  });
});
