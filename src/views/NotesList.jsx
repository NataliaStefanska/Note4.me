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
    embedderStatus, useSemanticFallback,
    crossSpaceSearch, setCrossSpaceSearch, crossSpaceFiltered,
    bulkMode, setBulkMode, bulkSelected, toggleBulkSelect, bulkSelectAll, bulkDeselectAll, bulkArchive, bulkDelete,
    switchSpace,
  } = useApp();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [dragOverId, setDragOverId] = useState(null);

  function handleOpenNote(note, spaceId) {
    if (spaceId) switchSpace(spaceId);
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
        {/* Search row */}
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <input style={{ ...s.searchBox, flex:1, minWidth:0 }} placeholder={t.listSearch} value={search} onChange={e=>setSearch(e.target.value)}/>
          {search.trim() && (
            <button style={{ ...s.ctrlBtn, padding:isMobile?"7px 8px":"7px 10px", ...(crossSpaceSearch?{background:space.color+"18",color:space.color,borderColor:space.color+"44"}:{}) }}
              onClick={()=>setCrossSpaceSearch(v=>!v)} title={t.crossSpaceSearch} aria-label={t.crossSpaceSearch}>
              {"\u{1F30D}"}
            </button>
          )}
        </div>
        {/* Controls row */}
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          <button style={{ ...s.ctrlBtn, padding:isMobile?"7px 8px":"7px 10px", ...(showArchived?{background:space.color+"18",color:space.color,borderColor:space.color+"44"}:{}) }}
            onClick={()=>setShowArchived(v=>!v)} aria-label={showArchived ? t.listShowArchived : "Archive"}>
            {showArchived ? "\u{1F4E6}" : "\u{1F4CB}"}
          </button>
          <button style={{ ...s.ctrlBtn, padding:isMobile?"7px 8px":"7px 10px", ...(sortOrder==="desc"?{color:space.color}:{}) }}
            onClick={()=>setSortOrder(v=>v==="desc"?"asc":"desc")} aria-label="Sort order">
            {sortOrder==="desc"?"\u2193":"\u2191"}
          </button>
          <button style={{ ...s.ctrlBtn, padding:isMobile?"7px 8px":"7px 10px", ...(showDate||dateFrom||dateTo?{color:space.color,background:space.color+"15"}:{}) }}
            onClick={()=>setShowDate(v=>!v)} aria-label="Date filter">
            {"\u{1F4C5}"}
          </button>
          <button style={{ ...s.ctrlBtn, padding:isMobile?"7px 8px":"7px 10px", fontSize:11, ...(bulkMode?{background:space.color+"18",color:space.color,borderColor:space.color+"44"}:{}) }}
            onClick={()=>{setBulkMode(v=>!v);bulkDeselectAll();}} aria-label={t.bulkSelect}>
            {isMobile ? "\u2611" : t.bulkSelect}
          </button>
          {!isMobile && <button style={{ ...s.ctrlBtn, background:space.color, color:"#fff", border:"none" }} onClick={handleQuickCapture}>{t.listNew}</button>}
        </div>
        {/* Bulk actions bar */}
        {bulkMode && (
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:"var(--text-faint)" }}>{bulkSelected.size} {t.bulkCount}</span>
            <button style={{ ...s.ctrlBtn, fontSize:11, padding:"5px 8px" }} onClick={bulkSelectAll}>{t.bulkSelectAll}</button>
            <button style={{ ...s.ctrlBtn, fontSize:11, padding:"5px 8px" }} onClick={bulkDeselectAll}>{t.bulkDeselectAll}</button>
            {bulkSelected.size > 0 && (
              <>
                <button style={{ ...s.ctrlBtn, fontSize:11, padding:"5px 8px", color:"#7C3AED", borderColor:"#7C3AED44" }} onClick={bulkArchive}>{t.bulkArchive}</button>
                <button style={{ ...s.ctrlBtn, fontSize:11, padding:"5px 8px", color:"#EF4444", borderColor:"#FECACA" }} onClick={bulkDelete}>{t.bulkDelete}</button>
              </>
            )}
          </div>
        )}
        {search.trim() && useSemanticFallback && (
          <div style={{ fontSize:11, color:space.color, display:"flex", alignItems:"center", gap:6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={space.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            {t.searchSemanticActive || "Semantic search active"}
          </div>
        )}
        {search.trim() && embedderStatus === "loading" && (
          <div style={{ fontSize:11, color:"var(--text-faint)", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ display:"inline-block", width:10, height:10, border:"2px solid var(--text-faint)", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
            {t.searchLoading}
          </div>
        )}
        {showArchived && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, color:"#7C3AED", fontWeight:500 }}>{"\u{1F4E6}"} {t.listShowArchived}</span>
            <span style={s.badge}>{archivedN}</span>
          </div>
        )}
        {showDate && (
          <div style={{ display:"flex", gap:isMobile?8:12, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}><span style={{ fontSize:11, color:"#A8A29E" }}>{t.tvFrom}</span><input type="date" style={{ ...s.dateInp, maxWidth:isMobile?130:"none" }} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}><span style={{ fontSize:11, color:"#A8A29E" }}>{t.tvTo}</span><input type="date" style={{ ...s.dateInp, maxWidth:isMobile?130:"none" }} value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div>
            {(dateFrom||dateTo) && <button style={s.clearBtn} onClick={()=>{setDateFrom("");setDateTo("");}}>{t.tvClear}</button>}
          </div>
        )}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:isMobile?"10px 6px 8px":"16px 8px 8px" }}>
        {filtered.length===0 && !crossSpaceSearch && <div style={s.empty}>{t.listEmpty}</div>}
        {filtered.length===0 && crossSpaceSearch && crossSpaceFiltered.length===0 && <div style={s.empty}>{t.listEmpty}</div>}
        {filtered.map(note=>{
          const stale=daysSince(note.lastOpened)>=30;
          const done=note.tasks.filter(tk=>tk.done).length;
          const isDragOver = dragOverId === note.id;
          return (
            <div key={note.id}
              draggable={!bulkMode && !isMobile}
              onDragStart={e=>handleDragStart(e, note.id)}
              onDragOver={e=>handleDragOver(e, note.id)}
              onDrop={e=>handleDrop(e, note.id)}
              onDragEnd={handleDragEnd}
              style={{ ...s.noteRow, gap:isMobile?10:16, padding:isMobile?"10px 8px":"13px 10px", opacity:stale&&!note.archived?.55:1, ...(isDragOver?{borderTop:"2px solid "+space.color}:{}), ...(bulkMode && bulkSelected.has(note.id)?{background:space.color+"0A"}:{}) }}>
              {bulkMode && (
                <div style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                  <div style={{ ...s.chk, width:22, height:22, ...(bulkSelected.has(note.id)?{background:space.color,borderColor:space.color}:{}) }}
                    onClick={(e)=>{e.stopPropagation();toggleBulkSelect(note.id);}}>
                    {bulkSelected.has(note.id) && <span style={{ color:"#fff", fontSize:11 }}>{"\u2713"}</span>}
                  </div>
                </div>
              )}
              {!bulkMode && !isMobile && (
                <div style={{ display:"flex", alignItems:"center", cursor:"grab", color:"var(--text-faint)", fontSize:14, flexShrink:0 }} onMouseDown={e=>e.stopPropagation()}>
                  {"\u2630"}
                </div>
              )}
              <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:3, cursor:"pointer" }} onClick={()=>bulkMode?toggleBulkSelect(note.id):handleOpenNote(note)}>
                <div style={{ fontSize:isMobile?13:14, fontWeight:600, color:"var(--text-primary)", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{search ? <Highlight text={note.title||t.listNoTitle} query={search}/> : (note.title||t.listNoTitle)}</div>
                {note.intent && <div style={{ fontSize:11, color:"var(--text-faint)", fontStyle:"italic", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{"\u2192"} {search ? <Highlight text={note.intent} query={search}/> : note.intent}</div>}
                <div style={{ fontSize:12, color:"var(--text-muted)", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{search ? <Highlight text={textPreview(note.content, isMobile?50:72)} query={search}/> : textPreview(note.content, isMobile?50:72)}</div>
                {/* Tags inline on mobile */}
                {isMobile && note.tags.length > 0 && (
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:2 }}>
                    {note.tags.slice(0, 3).map(tg=><span key={tg} style={{ ...s.tinyTag, ...(search && tg.toLowerCase().includes(search.toLowerCase()) ? {background:"#FEF08A"} : {}) }}>{tg}</span>)}
                    {note.tags.length > 3 && <span style={s.tinyTag}>+{note.tags.length-3}</span>}
                  </div>
                )}
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                  <div style={{ fontSize:10, color:"#A8A29E" }}>{isMobile ? (note.updatedAt||"").slice(5) : note.updatedAt}</div>
                  {!bulkMode && (
                    <div style={{ display:"flex", gap:2 }}>
                      {note.archived ? (
                        <button style={s.rowAction} onClick={e=>{e.stopPropagation();unarchiveNote(note.id);}} title={t.unarchiveBtn} aria-label={t.unarchiveBtn}>
                          <svg width={isMobile?14:12} height={isMobile?14:12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                        </button>
                      ) : (
                        <button style={s.rowAction} onClick={e=>{e.stopPropagation();archiveNote(note.id);}} title={t.archiveBtn} aria-label={t.archiveBtn}>
                          <svg width={isMobile?14:12} height={isMobile?14:12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                        </button>
                      )}
                      <button style={{ ...s.rowAction, color:"#EF4444" }} onClick={e=>{e.stopPropagation();setShowDeleteConfirm(note.id);}} title={t.deleteBtn} aria-label={t.deleteBtn}>
                        <svg width={isMobile?14:12} height={isMobile?14:12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </div>
                  )}
                </div>
                {/* Tags on desktop only (mobile shows inline) */}
                {!isMobile && <div style={{ display:"flex", gap:4, flexWrap:"wrap", justifyContent:"flex-end" }}>{note.tags.map(tg=><span key={tg} style={{ ...s.tinyTag, ...(search && tg.toLowerCase().includes(search.toLowerCase()) ? {background:"#FEF08A"} : {}) }}>{tg}</span>)}</div>}
                {note.tasks.length>0 && <div style={{ fontSize:10, color:"#A8A29E" }}>{done}/{note.tasks.length}</div>}
                {stale && !note.archived && <div style={{ width:6,height:6,borderRadius:"50%",background:"#F59E0B" }}/>}
                {note.archived && <span style={{ fontSize:9, color:"#7C3AED", background:"#EDE9FE", padding:"1px 5px", borderRadius:3 }}>{"\u{1F4E6}"}</span>}
              </div>
            </div>
          );
        })}
        {/* Cross-space results */}
        {crossSpaceSearch && search.trim() && crossSpaceFiltered.length > 0 && (
          <>
            <div style={{ fontSize:11, color:"var(--text-faint)", padding:"12px 6px 4px", fontWeight:600, letterSpacing:".05em", textTransform:"uppercase" }}>
              {t.crossSpaceSearch}
            </div>
            {crossSpaceFiltered.map(note => (
              <div key={note.id+note._spaceId} style={{ ...s.noteRow, gap:isMobile?10:16, padding:isMobile?"10px 8px":"13px 10px", opacity:.85 }}>
                <div style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                  <span style={{ fontSize:14 }}>{note._spaceEmoji}</span>
                </div>
                <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:3, cursor:"pointer" }} onClick={()=>handleOpenNote(note, note._spaceId)}>
                  <div style={{ fontSize:isMobile?13:14, fontWeight:600, color:"var(--text-primary)", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                    <Highlight text={note.title||t.listNoTitle} query={search}/>
                  </div>
                  <div style={{ fontSize:12, color:"var(--text-muted)", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                    <Highlight text={textPreview(note.content, isMobile?50:72)} query={search}/>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                  <span style={{ fontSize:10, color:note._spaceColor, fontWeight:500 }}>{t.crossSpaceFrom} {note._spaceName}</span>
                  <div style={{ fontSize:10, color:"#A8A29E" }}>{isMobile ? (note.updatedAt||"").slice(5) : note.updatedAt}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
