import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { s } from "../styles/appStyles";
import { NAV_ITEMS } from "./navItems";

export default function Sidebar({ onClose }) {
  const {
    t, space, spaces, activeSpace, filterTag, setFilterTag,
    showArchived, setShowArchived,
    allTags, archivedN, staleN, syncStatus, isOnline,
    switchSpace, setShowSpaceMgr, overdueTasks,
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

  function handleSwitchSpace(spId) {
    switchSpace(spId);
    navigate("/");
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
      {/* Navigation */}
      {sidebarNav.map(item=>(
        <button key={item.id} style={{ ...s.navBtn, ...(location.pathname===item.path?s.navActive:{}) }}
          onClick={()=>handleNav(item.path)}>
          {item.icon}<span style={{ fontSize:13 }}>{item.label}</span>
        </button>
      ))}
      <div style={s.div}/>
      {/* Spaces - shown directly */}
      <div style={s.label}>{t.sbSpace}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        {spaces.map(sp=>{
          const isActive = sp.id === activeSpace;
          return (
            <button key={sp.id}
              style={{
                ...s.spaceItem,
                ...(isActive ? { background:sp.color+"18", color:sp.color, borderColor:sp.color+"44" } : {}),
              }}
              onClick={()=>handleSwitchSpace(sp.id)}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:sp.color, flexShrink:0 }}/>
              <span>{sp.emoji}</span>
              <span style={{ flex:1, textAlign:"left", fontSize:13, fontWeight:isActive?600:400 }}>{sp.name}</span>
              {isActive && <span style={{ color:sp.color, fontSize:11 }}>{"\u2713"}</span>}
            </button>
          );
        })}
        <button style={s.addSpaceBtn} onClick={()=>{ setShowSpaceMgr(true); if(onClose)onClose(); }}>
          <span style={{ fontSize:14, lineHeight:1 }}>+</span>
          <span>{t.smNew}</span>
        </button>
      </div>
      <div style={s.div}/>
      {/* Tags */}
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
        <button style={{ ...s.tagPill, color:showArchived?"var(--text-primary)":"var(--text-muted)", background:showArchived?"var(--bg-card)":"transparent" }}
          onClick={()=>{ setShowArchived(v=>!v); navigate("/"); if(onClose)onClose(); }}>
          {"\u{1F4E6}"} {archivedN} {t.sbArchived}
        </button>
      )}
      {overdueTasks.length>0 && (
        <button style={{ ...s.tagPill, color:"#DC2626", background:"#FEE2E2", fontWeight:500, fontSize:11, display:"flex", alignItems:"center", gap:6 }}
          onClick={()=>{ navigate("/tasks"); if(onClose)onClose(); }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#EF4444", flexShrink:0 }}/> {overdueTasks.length} {t.overdueNotif}
        </button>
      )}
      {staleN>0 && <div style={s.staleHint}>{"\u23F3"} {staleN} {staleN===1?t.sbStale1:t.sbStaleN}</div>}
      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 6px" }}>
        <span style={{ width:6,height:6,borderRadius:"50%",background:!isOnline?"#78716C":syncStatus==="synced"?"#10B981":syncStatus==="saving"?"#F59E0B":"#EF4444",flexShrink:0 }}/>
        <span style={{ fontSize:11, color:"var(--text-faint)" }}>
          {!isOnline ? (t.sbOffline || "Offline") : syncStatus==="synced"?t.sbSynced:syncStatus==="saving"?"...":(syncStatus==="error"?"!":t.sbSynced)}
        </span>
      </div>
    </>
  );
}
