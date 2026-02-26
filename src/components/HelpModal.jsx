import { useEffect } from "react";
import { m } from "../styles/modalStyles";

export default function HelpModal({ onClose, t }) {
  useEffect(() => {
    function handleKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const section = { marginTop: 16 };
  const sectionTitle = {
    fontSize: 12, fontWeight: 600, color: "var(--text-primary)",
    letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 8,
  };
  const row = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "5px 0", fontSize: 13, color: "var(--text-secondary)",
  };
  const kbd = {
    fontSize: 11, padding: "2px 6px", borderRadius: 4,
    background: "var(--bg-input)", border: "1px solid var(--border)",
    color: "var(--text-primary)", fontFamily: "monospace", whiteSpace: "nowrap",
  };
  const tip = {
    fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6,
    padding: "6px 10px", background: "var(--bg-input)", borderRadius: 8,
    border: "1px solid var(--border-light)",
  };

  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={{ ...m.box, width: 460, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={m.q}>{t.helpTitle || "Keyboard shortcuts & tips"}</div>
          <button onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>{"\u00D7"}</button>
        </div>

        <div style={section}>
          <div style={sectionTitle}>{t.helpEditing || "Editing"}</div>
          <div style={row}><span>Bold</span><span style={kbd}>Ctrl+B</span></div>
          <div style={row}><span>Italic</span><span style={kbd}>Ctrl+I</span></div>
          <div style={row}><span>Underline</span><span style={kbd}>Ctrl+U</span></div>
          <div style={row}><span>Strikethrough</span><span style={kbd}>Ctrl+Shift+X</span></div>
          <div style={row}><span>Heading 1</span><span style={kbd}>Ctrl+Alt+1</span></div>
          <div style={row}><span>Heading 2</span><span style={kbd}>Ctrl+Alt+2</span></div>
          <div style={row}><span>Bullet list</span><span style={kbd}>Ctrl+Shift+8</span></div>
          <div style={row}><span>Ordered list</span><span style={kbd}>Ctrl+Shift+7</span></div>
          <div style={row}><span>Blockquote</span><span style={kbd}>Ctrl+Shift+B</span></div>
          <div style={row}><span>Code block</span><span style={kbd}>Ctrl+Alt+C</span></div>
          <div style={row}><span>Undo</span><span style={kbd}>Ctrl+Z</span></div>
          <div style={row}><span>Redo</span><span style={kbd}>Ctrl+Shift+Z</span></div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>{t.helpLinking || "Linking notes"}</div>
          <div style={tip}>
            {t.helpLinkTip || "Type [[ to search and link to another note. The autocomplete will appear as you type. Select a note to insert a link."}
          </div>
          <div style={{ ...row, marginTop: 6 }}>
            <span>{t.helpLinkExample || "Example"}</span>
            <code style={{ ...kbd, fontSize: 12 }}>[[Meeting notes]]</code>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
            {t.helpLinkDesc || "Linked notes appear in the \"Linked notes\" section below the editor and as connections in the Graph view."}
          </div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>{t.helpFeatures || "Features"}</div>
          <div style={tip}>
            {t.helpFeaturesList || "Search uses fuzzy text matching. When no text results are found, semantic AI search activates automatically. Use AI Suggestions to discover related notes and tags."}
          </div>
        </div>

        <div style={{ ...m.row, marginTop: 12 }}>
          <button style={m.ok} onClick={onClose}>{t.helpClose || "Got it"}</button>
        </div>
      </div>
    </div>
  );
}
