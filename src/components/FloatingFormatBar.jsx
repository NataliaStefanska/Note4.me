import { useState, useEffect } from "react";

export default function FloatingFormatBar({ wrapRef, contentRef }) {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    function check() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !contentRef.current || !contentRef.current.contains(sel.anchorNode)) {
        setPos(null); return;
      }
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const wRect = wrapRef.current.getBoundingClientRect();
        if (rect.width < 2) { setPos(null); return; }
        setPos({
          top: rect.top - wRect.top - 44,
          left: Math.max(70, Math.min(rect.left - wRect.left + rect.width / 2, wRect.width - 70))
        });
      } catch { setPos(null); }
    }
    document.addEventListener('selectionchange', check);
    return () => document.removeEventListener('selectionchange', check);
  }, [wrapRef, contentRef]);
  if (!pos) return null;
  function fmt(cmd) { return (e) => { e.preventDefault(); document.execCommand(cmd, false, null); }; }
  const bar = { position:"absolute", top:pos.top, left:pos.left, transform:"translateX(-50%)",
    display:"flex", gap:2, background:"#1C1917", borderRadius:8, padding:"4px 6px",
    boxShadow:"0 4px 16px rgba(0,0,0,.25)", zIndex:60 };
  const btn = { background:"transparent", border:"none", color:"#E7E5E4", cursor:"pointer",
    width:30, height:30, borderRadius:5, display:"flex", alignItems:"center",
    justifyContent:"center", fontSize:13, fontFamily:"inherit" };
  return (
    <div style={bar}>
      <button style={btn} onMouseDown={fmt('bold')} title="Ctrl+B"><b>B</b></button>
      <button style={btn} onMouseDown={fmt('italic')} title="Ctrl+I"><i>I</i></button>
      <button style={btn} onMouseDown={fmt('underline')} title="Ctrl+U"><u>U</u></button>
      <button style={btn} onMouseDown={fmt('strikeThrough')} title="Ctrl+Shift+S"><s>S</s></button>
    </div>
  );
}
