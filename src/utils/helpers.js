// S1 fix: use DOMParser for robust HTML-to-text extraction instead of naive regex
export function textPreview(html, max) {
  if (!html) return '';
  let txt;
  if (typeof DOMParser !== 'undefined') {
    try {
      // Replace <br> with space before parsing so textContent preserves line breaks as spaces
      const prepared = html.replace(/<br\s*\/?>/gi, ' ');
      const doc = new DOMParser().parseFromString(prepared, 'text/html');
      txt = (doc.body.textContent || '').replace(/\u00A0/g, ' ');
    } catch {
      txt = html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
    }
  } else {
    txt = html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
  }
  return txt.length > max ? txt.slice(0, max) + '\u2026' : txt;
}

export function contentToHtml(content) {
  if (!content) return '';
  if (content.includes('<')) return content;
  return content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}
