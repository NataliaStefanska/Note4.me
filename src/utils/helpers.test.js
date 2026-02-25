import { describe, it, expect } from 'vitest';
import { textPreview, contentToHtml } from './helpers';

describe('textPreview', () => {
  it('strips HTML tags', () => {
    expect(textPreview('<p>Hello <b>world</b></p>', 100)).toBe('Hello world');
  });

  it('converts <br> to space', () => {
    expect(textPreview('Line1<br>Line2', 100)).toBe('Line1 Line2');
  });

  it('converts <br/> and <br /> to space', () => {
    expect(textPreview('A<br/>B<br />C', 100)).toBe('A B C');
  });

  it('decodes HTML entities', () => {
    expect(textPreview('&amp; &lt; &gt; &nbsp;', 100)).toBe('& < >  ');
  });

  it('truncates long text with ellipsis', () => {
    const result = textPreview('Hello world', 5);
    expect(result).toBe('Hello\u2026');
  });

  it('does not truncate text within limit', () => {
    expect(textPreview('Hello', 10)).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(textPreview('', 100)).toBe('');
  });
});

describe('contentToHtml', () => {
  it('returns empty string for falsy input', () => {
    expect(contentToHtml('')).toBe('');
    expect(contentToHtml(null)).toBe('');
    expect(contentToHtml(undefined)).toBe('');
  });

  it('returns HTML content as-is', () => {
    const html = '<p>Hello <b>world</b></p>';
    expect(contentToHtml(html)).toBe(html);
  });

  it('converts plain text to HTML', () => {
    expect(contentToHtml('Hello\nWorld')).toBe('Hello<br>World');
  });

  it('escapes ampersands and greater-than in plain text', () => {
    expect(contentToHtml('A & B')).toBe('A &amp; B');
    expect(contentToHtml('2 > 1')).toBe('2 &gt; 1');
  });

  it('treats strings containing < as HTML (returns as-is)', () => {
    // contentToHtml uses < as a heuristic to detect HTML content
    expect(contentToHtml('1 < 2')).toBe('1 < 2');
  });
});
