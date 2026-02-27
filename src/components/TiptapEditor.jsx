import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState, useCallback } from 'react';

export default function TiptapEditor({ content, placeholder, editorRef, wrapRef, onUpdate, onLinkSearch, onHeadingsChange, isMobile }) {
  const [bubblePos, setBubblePos] = useState(null);

  const extractHeadings = useCallback((ed) => {
    if (!onHeadingsChange || !ed) return;
    const headings = [];
    ed.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        headings.push({ level: node.attrs.level, text: node.textContent, pos });
      }
    });
    onHeadingsChange(headings);
  }, [onHeadingsChange]);

  const updateBubble = useCallback((ed) => {
    if (!ed) return;
    const { state, view } = ed;
    const { from, to, empty } = state.selection;
    if (empty || from === to) { setBubblePos(null); return; }
    try {
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);
      const editorDom = view.dom;
      const wrap = editorDom.closest('.tiptap-editor-root') || editorDom.parentElement;
      const wrapRect = wrap.getBoundingClientRect();
      const top = start.top - wrapRect.top - 44;
      const left = Math.max(70, Math.min((start.left + end.left) / 2 - wrapRect.left, wrapRect.width - 70));
      if (top < -50 || end.right - start.left < 2) { setBubblePos(null); return; }
      setBubblePos({ top, left });
    } catch { setBubblePos(null); }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder || '',
      }),
    ],
    content: content || '',
    onUpdate({ editor: ed }) {
      onUpdate?.();
      detectLinkSearch(ed);
      updateBubble(ed);
      extractHeadings(ed);
    },
    onSelectionUpdate({ editor: ed }) {
      detectLinkSearch(ed);
      updateBubble(ed);
    },
    onBlur() {
      setBubblePos(null);
    },
    onCreate({ editor: ed }) {
      extractHeadings(ed);
    },
    onDestroy() {
      if (editorRef) editorRef.current = null;
    },
  });

  // H1 fix: single source of truth for editorRef assignment
  useEffect(() => {
    if (editor && editorRef) editorRef.current = editor;
    return () => { if (editorRef) editorRef.current = null; };
  }, [editor, editorRef]);

  function detectLinkSearch(ed) {
    if (!onLinkSearch || !ed) return;
    const { state } = ed;
    const { from } = state.selection;
    const start = Math.max(0, from - 100);
    let textBefore;
    try { textBefore = state.doc.textBetween(start, from, null, '\ufffc'); }
    catch { onLinkSearch(null); return; }
    const openIdx = textBefore.lastIndexOf('[[');
    const closeIdx = textBefore.lastIndexOf(']]');
    if (openIdx !== -1 && openIdx > closeIdx) {
      const query = textBefore.slice(openIdx + 2);
      try {
        const coords = ed.view.coordsAtPos(from);
        const wrap = wrapRef?.current || ed.view.dom.parentElement;
        const wrapRect = wrap.getBoundingClientRect();
        onLinkSearch({
          query,
          pos: { top: coords.bottom - wrapRect.top + 4, left: Math.max(0, coords.left - wrapRect.left) },
        });
      } catch { onLinkSearch(null); }
    } else {
      onLinkSearch(null);
    }
  }

  if (!editor) return null;

  const tbtn = (active) => ({
    background: active ? 'var(--bg-card)' : 'transparent',
    border: active ? '1px solid var(--border)' : '1px solid transparent',
    borderRadius: 5, padding: '4px 7px', cursor: 'pointer',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 12,
    fontFamily: 'inherit', fontWeight: active ? 600 : 400,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 28, height: 28, transition: 'all .15s',
  });
  const sep = { width: 1, height: 18, background: 'var(--border)', margin: '0 4px', flexShrink: 0 };
  const bbtn = (active) => ({
    background: active ? '#44403C' : 'transparent', border: 'none',
    color: '#E7E5E4', cursor: 'pointer', width: 30, height: 30,
    borderRadius: 5, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 13, fontFamily: 'inherit',
  });

  return (
    <div
      className="tiptap-editor-root"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onLinkSearch?.(null); }}
    >
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 2, padding: '6px 8px', borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
        <button style={tbtn(editor.isActive('heading', { level: 1 }))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }} title="Heading 1">H1</button>
        <button style={tbtn(editor.isActive('heading', { level: 2 }))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }} title="Heading 2">H2</button>
        <button style={tbtn(editor.isActive('heading', { level: 3 }))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }} title="Heading 3">H3</button>
        <div style={sep} />
        <button style={tbtn(editor.isActive('bold'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }} title="Bold (Ctrl+B)"><b>B</b></button>
        <button style={tbtn(editor.isActive('italic'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }} title="Italic (Ctrl+I)"><i>I</i></button>
        <button style={tbtn(editor.isActive('underline'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }} title="Underline (Ctrl+U)"><u>U</u></button>
        <button style={tbtn(editor.isActive('strike'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }} title="Strikethrough"><s>S</s></button>
        <div style={sep} />
        <button style={tbtn(editor.isActive('bulletList'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }} title="Bullet list">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
        </button>
        <button style={tbtn(editor.isActive('orderedList'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }} title="Ordered list">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div style={sep} />
        <button style={tbtn(editor.isActive('blockquote'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }} title="Quote">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></svg>
        </button>
        <button style={tbtn(editor.isActive('codeBlock'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run(); }} title="Code block">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </button>
        {!isMobile && (
          <button style={tbtn(false)} onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHorizontalRule().run(); }} title="Horizontal rule">&mdash;</button>
        )}
      </div>

      {/* Floating format bar on text selection */}
      {bubblePos && (
        <div style={{
          position: 'absolute', top: bubblePos.top, left: bubblePos.left,
          transform: 'translateX(-50%)', zIndex: 60,
          display: 'flex', gap: 2, background: '#1C1917', borderRadius: 8,
          padding: '4px 6px', boxShadow: '0 4px 16px rgba(0,0,0,.25)',
        }}>
          <button style={bbtn(editor.isActive('bold'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}><b>B</b></button>
          <button style={bbtn(editor.isActive('italic'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}><i>I</i></button>
          <button style={bbtn(editor.isActive('underline'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}><u>U</u></button>
          <button style={bbtn(editor.isActive('strike'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}><s>S</s></button>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} className="tiptap-content" />
    </div>
  );
}
