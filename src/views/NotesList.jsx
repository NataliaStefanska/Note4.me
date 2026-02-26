import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { daysSince } from "../constants/data";
import { textPreview } from "../utils/helpers";
import { s } from "../styles/appStyles";

function Highlight({ text, query }) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<mark style={{ background:"#FEF08A", color:"inherit", borderRadius:2, padding:"0 1px" }}>{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>;
}

export default function NotesList() {
  const {
    t, space, notes, filtered, search, setSearch, showArchived, setShowArchived,
    sortOrder, setSortOrder, showDate, setShowDate, dateFrom, setDateFrom,
    dateTo, setDateTo, archivedN, quickCapture, openNote, archiveNote,
    unarchiveNote, setShowDeleteConfirm, reorderNotes,
    searchMode, setSearchMode, embedderStatus,
  } = useApp();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [dragOverId, setDragOverId] = useState(null);

  function handleOpenNote(note) {
    openNote(note);
    navigate("/editor");
  }

  function handleQuickCapture() {
    quickCapture();
    navigate("/editor");
  }

  function handleDragStart(e, noteId) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", noteId);
  }

  function handleDragOver(e, noteId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== noteId) setDragOverId(noteId);
  }

  function handleDrop(e, dropNoteId) {
    e.preventDefault();
    const dragId = e.dataTransfer.getData("text/plain");
    setDragOverId(null);
    if (dragId && dragId !== dropNoteId) reorderNotes(dragId, dropNoteId);
  }

  function handleDragEnd() {
    setDragOverId(null);
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
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ display:"flex", flex:1, minWidth:140, gap:4, alignItems:"center" }}>
            <input style={{ ...s.searchBox, flex:1 }} placeholder={t.listSearch} value={search} onChange={e=>setSearch(e.target.value)}/>
            <div style={{ display:"flex", borderRadius:6, overflow:"hidden", border:"1px solid var(--border)", flexShrink:0 }}>
              <button onClick={()=>setSearchMode("text")}
                style={{ fontSize:10, padding:"4px 8px", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:searchMode==="text"?600:400,
                  background:searchMode==="text"?space.color:  "var(--bg-input)", color:searchMode==="text"?"#fff":"var(--text-secondary)" }}>
                {t.searchText}
              </button>
              <button onClick={()=>setSearchMode("vector")}
                style={{ fontSize:10, padding:"4px 8px", border:"none", borderLeft:"1px solid var(--border)", cursor:"pointer", fontFamily:"inherit", fontWeight:searchMode==="vector"?600:400,
                  background:searchMode==="vector"?space.color:"var(--bg-input)", color:searchMode==="vector"?"#fff":"var(--text-secondary)" }}>
                {t.searchSemantic}
              </button>
            </div>
          </div>
          <button style={{ ...s.ctrlBtn, ...(showArchived?{background:space.color+"18",color:space.color,borderColor:space.color+"44"}:{}) }}
            onClick={()=>setShowArchived(v=>!v)}>
            {showArchived ? "\u{1F4E6}" : "\u{1F4CB}"}
          </button>
          <button style={{ ...s.ctrlBtn, ...(sortOrder==="desc"?{color:space.color}:{}) }} onClick={()=>setSortOrder(v=>v==="desc"?"asc":"desc")}>{sortOrder==="desc"?"\u2193":"\u2191"}</button>
          <button style={{ ...s.ctrlBtn, ...(showDate||dateFrom||dateTo?{color:space.color,background:space.color+"15"}:{}) }} onClick={()=>setShowDate(v=>!v)}>{"\u{1F4C5}"}</button>
          {!isMobile && <button style={{ ...s.ctrlBtn, background:space.color, color:"#fff", border:"none" }} onClick={handleQuickCapture}>{t.listNew}</button>}
        </div>
        {searchMode === "vector" && embedderStatus !== "ready" && (
          <div style={{ fontSize:11, color:embedderStatus==="error"?"#EF4444":"#A8A29E", display:"flex", alignItems:"center", gap:6 }}>
            {embedderStatus === "loading" && <span style={{ display:"inline-block", width:12, height:12, border:"2px solid "+space.color, borderTop:"2px solid transparent", borderRadius:"50%", animation:"spin 1s linear infinite" }}/>}
            {embedderStatus === "loading" ? t.searchLoading : embedderStatus === "error" ? t.searchError : ""}
          </div>
        )}
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
          const isDragOver = dragOverId === note.id;
          return (
            <div key={note.id}
              draggable
              onDragStart={e=>handleDragStart(e, note.id)}
              onDragOver={e=>handleDragOver(e, note.id)}
              onDrop={e=>handleDrop(e, note.id)}
              onDragEnd={handleDragEnd}
              style={{ ...s.noteRow, opacity:stale&&!note.archived?.55:1, ...(isDragOver?{borderTop:"2px solid "+space.color}:{}) }}>
              <div style={{ display:"flex", alignItems:"center", marginRight:6, cursor:"grab", color:"var(--text-faint)", fontSize:14 }} onMouseDown={e=>e.stopPropagation()}>
                {"\u2630"}
              </div>
              <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:3, cursor:"pointer" }} onClick={()=>handleOpenNote(note)}>
                <div style={{ fontSize:14, fontWeight:600, color:"var(--text-primary)", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{search ? <Highlight text={note.title||t.listNoTitle} query={search}/> : (note.title||t.listNoTitle)}</div>
                {note.intent && <div style={{ fontSize:11, color:"var(--text-faint)", fontStyle:"italic" }}>{"\u2192"} {search ? <Highlight text={note.intent} query={search}/> : note.intent}</div>}
                <div style={{ fontSize:12, color:"var(--text-muted)", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{search ? <Highlight text={textPreview(note.content, 72)} query={search}/> : textPreview(note.content, 72)}</div>
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
                <div style={{ display:"flex", gap:4, flexWrap:"wrap", justifyContent:"flex-end" }}>{note.tags.map(tg=><span key={tg} style={{ ...s.tinyTag, ...(search && tg.toLowerCase().includes(search.toLowerCase()) ? {background:"#FEF08A"} : {}) }}>{tg}</span>)}</div>
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
