import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { daysSince } from "../constants/data";
import { textPreview } from "../utils/helpers";
import { s } from "../styles/appStyles";

export default function NotesList() {
  const {
    t, space, notes, filtered, search, setSearch, showArchived, setShowArchived,
    sortOrder, setSortOrder, showDate, setShowDate, dateFrom, setDateFrom,
    dateTo, setDateTo, archivedN, quickCapture, openNote, archiveNote,
    unarchiveNote, setShowDeleteConfirm,
  } = useApp();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  function handleOpenNote(note) {
    openNote(note);
    navigate("/editor");
  }

  function handleQuickCapture() {
    quickCapture();
    navigate("/editor");
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={s.listHead}>
        {!isMobile && (
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <span style={{ fontSize:22 }}>{space.emoji}</span>
            <span style={{ fontSize:18, fontWeight:700, color:space.color }}>{space.name}</span>
            <span style={s.badge}>{filtered.length}/{notes.length}</span>
          </div>
        )}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input style={s.searchBox} placeholder={t.listSearch} value={search} onChange={e=>setSearch(e.target.value)}/>
          <button style={{ ...s.ctrlBtn, ...(showArchived?{background:space.color+"18",color:space.color,borderColor:space.color+"44"}:{}) }}
            onClick={()=>setShowArchived(v=>!v)}>
            {showArchived ? "\u{1F4E6}" : "\u{1F4CB}"}
          </button>
          <button style={{ ...s.ctrlBtn, ...(sortOrder==="desc"?{color:space.color}:{}) }} onClick={()=>setSortOrder(v=>v==="desc"?"asc":"desc")}>{sortOrder==="desc"?"\u2193":"\u2191"}</button>
          <button style={{ ...s.ctrlBtn, ...(showDate||dateFrom||dateTo?{color:space.color,background:space.color+"15"}:{}) }} onClick={()=>setShowDate(v=>!v)}>{"\u{1F4C5}"}</button>
          {!isMobile && <button style={{ ...s.ctrlBtn, background:space.color, color:"#fff", border:"none" }} onClick={handleQuickCapture}>{t.listNew}</button>}
        </div>
        {showArchived && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, color:"#7C3AED", fontWeight:500 }}>{"\u{1F4E6}"} {t.listShowArchived}</span>
            <span style={s.badge}>{archivedN}</span>
          </div>
        )}
        {showDate && (
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}><span style={{ fontSize:11, color:"#A8A29E" }}>{t.tvFrom}</span><input type="date" style={s.dateInp} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}><span style={{ fontSize:11, color:"#A8A29E" }}>{t.tvTo}</span><input type="date" style={s.dateInp} value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div>
            {(dateFrom||dateTo) && <button style={s.clearBtn} onClick={()=>{setDateFrom("");setDateTo("");}}>{t.tvClear}</button>}
          </div>
        )}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 8px 8px" }}>
        {filtered.length===0 && <div style={s.empty}>{t.listEmpty}</div>}
        {filtered.map(note=>{
          const stale=daysSince(note.lastOpened)>=30;
          const done=note.tasks.filter(tk=>tk.done).length;
          return (
            <div key={note.id} style={{ ...s.noteRow, opacity:stale&&!note.archived?.55:1 }}>
              <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:3, cursor:"pointer" }} onClick={()=>handleOpenNote(note)}>
                <div style={{ fontSize:14, fontWeight:600, color:"#1C1917" }}>{note.title||t.listNoTitle}</div>
                {note.intent && <div style={{ fontSize:11, color:"#A8A29E", fontStyle:"italic" }}>{"\u2192"} {note.intent}</div>}
                <div style={{ fontSize:12, color:"#78716C", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{textPreview(note.content, 72)}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                  <div style={{ fontSize:10, color:"#A8A29E" }}>{note.updatedAt}</div>
                  <div style={{ display:"flex", gap:2 }}>
                    {note.archived ? (
                      <button style={s.rowAction} onClick={e=>{e.stopPropagation();unarchiveNote(note.id);}} title={t.unarchiveBtn}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                      </button>
                    ) : (
                      <button style={s.rowAction} onClick={e=>{e.stopPropagation();archiveNote(note.id);}} title={t.archiveBtn}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                      </button>
                    )}
                    <button style={{ ...s.rowAction, color:"#EF4444" }} onClick={e=>{e.stopPropagation();setShowDeleteConfirm(note.id);}} title={t.deleteBtn}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </div>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap", justifyContent:"flex-end" }}>{note.tags.map(tg=><span key={tg} style={s.tinyTag}>{tg}</span>)}</div>
                {note.tasks.length>0 && <div style={{ fontSize:10, color:"#A8A29E" }}>{done}/{note.tasks.length}</div>}
                {stale && !note.archived && <div style={{ width:6,height:6,borderRadius:"50%",background:"#F59E0B" }}/>}
                {note.archived && <span style={{ fontSize:9, color:"#7C3AED", background:"#EDE9FE", padding:"1px 5px", borderRadius:3 }}>{"\u{1F4E6}"}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
