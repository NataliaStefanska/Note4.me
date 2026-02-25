export function textPreview(html, max) {
  const txt = html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
  return txt.length > max ? txt.slice(0, max) + '\u2026' : txt;
}

export function contentToHtml(content) {
  if (!content) return '';
  if (content.includes('<')) return content;
  return content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}
