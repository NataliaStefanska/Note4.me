import { useRef, useEffect } from "react";
import { textPreview } from "../utils/helpers";

export default function LinkAutocomplete({ notes, query, pos, onSelect, onClose, t }) {
  const ref = useRef();
  const filtered = notes.filter(n =>
    n.title && n.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  if (!pos) return null;
  return (
    <div ref={ref} style={{
      position: "absolute", top: pos.top, left: pos.left,
      background: "#fff", border: "1px solid #E7E5E4", borderRadius: 8,
      padding: 4, zIndex: 60, minWidth: 200, maxWidth: 300,
      boxShadow: "0 8px 24px rgba(0,0,0,.12)",
      maxHeight: 220, overflowY: "auto"
    }}>
      {filtered.length === 0 && (
        <div style={{ fontSize: 12, color: "#A8A29E", padding: "6px 8px" }}>{t.linkSearchPh}</div>
      )}
      {filtered.map(n => (
        <button key={n.id} onMouseDown={(e) => { e.preventDefault(); onSelect(n); }} style={{
          display: "block", width: "100%", background: "transparent", border: "none",
          padding: "7px 10px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          textAlign: "left", borderRadius: 5, color: "#1C1917"
        }}>
          <div style={{ fontWeight: 500, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{n.title || t.listNoTitle}</div>
          {n.content && <div style={{ fontSize: 11, color: "#A8A29E", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{textPreview(n.content, 40)}</div>}
        </button>
      ))}
    </div>
  );
}
