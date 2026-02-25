import { describe, it, expect } from 'vitest';
import { T } from './translations';

describe('translations', () => {
  it('has pl and en languages', () => {
    expect(T).toHaveProperty('pl');
    expect(T).toHaveProperty('en');
  });

  it('both languages have the same keys', () => {
    const plKeys = Object.keys(T.pl).sort();
    const enKeys = Object.keys(T.en).sort();
    expect(plKeys).toEqual(enKeys);
  });

  it('no translation value is empty', () => {
    for (const lang of ['pl', 'en']) {
      for (const [key, value] of Object.entries(T[lang])) {
        expect(value, `${lang}.${key} should not be empty`).not.toBe('');
      }
    }
  });

  it('has critical UI keys', () => {
    const required = ['navNotes', 'navTasks', 'navGraph', 'navSettings', 'setTitle', 'setTheme', 'setLight', 'setDark'];
    for (const key of required) {
      expect(T.pl, `pl.${key} missing`).toHaveProperty(key);
      expect(T.en, `en.${key} missing`).toHaveProperty(key);
    }
  });
});
