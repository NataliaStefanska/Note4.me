import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { s } from "../styles/appStyles";
import { NAV_ITEMS } from "./navItems";

export default function Sidebar({ onClose }) {
  const {
    t, space, spaces, activeSpace, filterTag, setFilterTag,
    showDrop, setShowDrop, showArchived, setShowArchived,
    allTags, archivedN, staleN, syncStatus,
    switchSpace, setShowSpaceMgr,
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const NAV = NAV_ITEMS(t);
  const sidebarNav = NAV.filter(item => item.id !== "settings");
  const ALL = t.sbAll;

  function handleNav(path) {
    navigate(path);
    if (onClose) onClose();
  }

  return (
    <>
      {onClose && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div style={s.logo}><div style={s.logoMark}>N</div><span style={s.logoTxt}>Note.io</span></div>
          <button style={s.iconBtn} onClick={onClose}>{"\u2715"}</button>
        </div>
      )}
      <div style={s.label}>{t.sbSpace}</div>
      <div style={{ position:"relative" }}>
        <button style={{ ...s.spacePill, borderColor:space.color+"88" }} onClick={()=>setShowDrop(v=>!v)}>
          <span>{space.emoji}</span><span style={{ flex:1, textAlign:"left", fontSize:13, fontWeight:500 }}>{space.name}</span><span style={{ color:"#57534E", fontSize:11 }}>{"\u25BE"}</span>
        </button>
        {showDrop && (
          <div style={s.drop}>
            {spaces.map(sp=>(
              <button key={sp.id} style={{ ...s.dropItem, ...(sp.id===activeSpace?{background:"#292524",color:"#E7E5E4"}:{}) }}
                onClick={()=>{ switchSpace(sp.id); navigate("/"); if(onClose)onClose(); }}>
                <span style={{ width:8,height:8,borderRadius:"50%",background:sp.color,flexShrink:0,display:"inline-block" }}/>
                <span>{sp.emoji}</span>
                <span style={{ flex:1, textAlign:"left" }}>{sp.name}</span>
                {sp.id===activeSpace && <span style={{ color:space.color, fontSize:12 }}>{"\u2713"}</span>}
              </button>
            ))}
            <div style={s.div}/>
            <button style={s.dropManage} onClick={()=>{ setShowDrop(false); setShowSpaceMgr(true); if(onClose)onClose(); }}>{t.sbManage}</button>
          </div>
        )}
      </div>
      <div style={s.div}/>
      {sidebarNav.map(item=>(
        <button key={item.id} style={{ ...s.navBtn, ...(location.pathname===item.path?s.navActive:{}) }}
          onClick={()=>handleNav(item.path)}>
          {item.icon}<span style={{ fontSize:13 }}>{item.label}</span>
        </button>
      ))}
      <div style={s.div}/>
      <div style={s.label}>{t.sbTags}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        {[ALL,...allTags].map(tag=>{
          const a=tag===ALL?filterTag===null:filterTag===tag;
          return (
            <button key={tag} style={{ ...s.tagPill, ...(a?{background:space.color+"22",color:space.color}:{}) }}
              onClick={()=>{ setFilterTag(tag===ALL?null:(filterTag===tag?null:tag)); if(onClose)onClose(); }}>
              {tag}
            </button>
          );
        })}
      </div>
      <div style={{ flex:1 }}/>
      {archivedN>0 && (
        <button style={{ ...s.tagPill, color:showArchived?"#E7E5E4":"#78716C", background:showArchived?"#292524":"transparent" }}
          onClick={()=>{ setShowArchived(v=>!v); navigate("/"); if(onClose)onClose(); }}>
          {"\u{1F4E6}"} {archivedN} {t.sbArchived}
        </button>
      )}
      {staleN>0 && <div style={s.staleHint}>{"\u23F3"} {staleN} {staleN===1?t.sbStale1:t.sbStaleN}</div>}
      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 6px" }}>
        <span style={{ width:6,height:6,borderRadius:"50%",background:syncStatus==="synced"?"#10B981":syncStatus==="saving"?"#F59E0B":"#EF4444",flexShrink:0 }}/>
        <span style={{ fontSize:11, color:"#57534E" }}>{syncStatus==="synced"?t.sbSynced:syncStatus==="saving"?"...":(syncStatus==="error"?"!":t.sbSynced)}</span>
      </div>
    </>
  );
}
