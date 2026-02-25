import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useIsMobile } from "../hooks/useIsMobile";
import ForceGraph from "../components/ForceGraph";

export default function GraphView() {
  const { t, space, filtered, openNote } = useApp();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  function handleOpenNote(note) {
    openNote(note);
    navigate("/editor");
  }

  return (
    <div style={{ position:"relative", height:"100%", background:"#0C0A09" }}>
      <div style={{ position:"absolute", top:18, left:22, color:"#57534E", fontSize:11, letterSpacing:".1em", textTransform:"uppercase", zIndex:10 }}>{t.navGraph} {"\u00B7"} {space.emoji} {space.name}</div>
      <ForceGraph notes={filtered} spaceColor={space.color} onOpenNote={handleOpenNote}/>
      <div style={{ position:"absolute", bottom:80, left:"50%", transform:"translateX(-50%)", color:"#44403C", fontSize:11, whiteSpace:"nowrap" }}>
        {isMobile?t.graphHintM:t.graphHintD}
      </div>
    </div>
  );
}
