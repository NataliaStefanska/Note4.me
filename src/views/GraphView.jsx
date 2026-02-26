import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useIsMobile } from "../hooks/useIsMobile";
import ForceGraph from "../components/ForceGraph";

export default function GraphView() {
  const { t, space, notes, filtered, openNote, allTags } = useApp();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [graphFilterTag, setGraphFilterTag] = useState(null);
  const [showOrphans, setShowOrphans] = useState(false);

  function handleOpenNote(note) {
    openNote(note);
    navigate("/editor");
  }

  // Use non-archived notes for graph
  const graphNotes = graphFilterTag
    ? filtered.filter(n => n.tags.includes(graphFilterTag))
    : filtered;

  return (
    <div style={{ position:"relative", height:"100%", background:"#0C0A09" }}>
      {/* Top bar */}
      <div style={{ position:"absolute", top:12, left:16, right:16, zIndex:10, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <span style={{ color:"#57534E", fontSize:11, letterSpacing:".1em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
          {t.navGraph} · {space.emoji} {space.name}
        </span>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", flex:1 }}>
          <button
            onClick={() => setGraphFilterTag(null)}
            style={{
              fontSize:10, padding:"3px 8px", borderRadius:10,
              border: !graphFilterTag ? `1px solid ${space.color}` : "1px solid #3F3C3A",
              background: !graphFilterTag ? space.color+"22" : "transparent",
              color: !graphFilterTag ? space.color : "#78716C",
              cursor:"pointer", fontFamily:"inherit",
            }}
          >
            {t.sbAll}
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setGraphFilterTag(graphFilterTag === tag ? null : tag)}
              style={{
                fontSize:10, padding:"3px 8px", borderRadius:10,
                border: graphFilterTag === tag ? `1px solid ${space.color}` : "1px solid #3F3C3A",
                background: graphFilterTag === tag ? space.color+"22" : "transparent",
                color: graphFilterTag === tag ? space.color : "#78716C",
                cursor:"pointer", fontFamily:"inherit",
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowOrphans(v => !v)}
          style={{
            fontSize:10, padding:"3px 8px", borderRadius:10,
            border: showOrphans ? "1px solid #F59E0B" : "1px solid #3F3C3A",
            background: showOrphans ? "#F59E0B22" : "transparent",
            color: showOrphans ? "#F59E0B" : "#78716C",
            cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
          }}
        >
          {t.graphOrphans || "Orphans"}
        </button>
      </div>
      <ForceGraph notes={graphNotes} allNotes={notes} spaceColor={space.color} onOpenNote={handleOpenNote} showOrphans={showOrphans}/>
      <div style={{ position:"absolute", bottom:80, left:"50%", transform:"translateX(-50%)", color:"#44403C", fontSize:11, whiteSpace:"nowrap" }}>
        {isMobile?t.graphHintM:t.graphHintD}
      </div>
    </div>
  );
}
