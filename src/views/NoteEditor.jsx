import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { daysSince } from "../constants/data";
import { contentToHtml } from "../utils/helpers";
import { s } from "../styles/appStyles";
import TiptapEditor from "../components/TiptapEditor";
import LinkAutocomplete from "../components/LinkAutocomplete";
import TagPicker from "../components/TagPicker";

export default function NoteEditor() {
  const {
    t, space, active, setActive, allNotes, activeSpace, linkSearch, setLinkSearch,
    autoSaveStatus, setAutoSaveStatus, showTagPick, setShowTagPick,
    newTask, setNewTask, titleRef, editorRef,
    saveNote, triggerAutoSave, toggleTask, addTask, setTaskDueDate, reorderTasks, toggleTag, openNote, handleLinkSelect,
    archiveNote, unarchiveNote, setShowDeleteConfirm,
  } = useApp();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const contentWrapRef = useRef(null);
  const [taskDragOverId, setTaskDragOverId] = useState(null);

  useEffect(() => {
    if (!active) navigate("/", { replace: true });
  }, [active, navigate]);

  if (!active) return null;

  function goBack() {
    saveNote(true);
    setLinkSearch(null);
    setAutoSaveStatus(null);
    navigate("/");
  }

  const spaceNotes = allNotes[activeSpace] || [];
  const linked = (active.linkedNotes||[]).map(id => spaceNotes.find(n=>n.id===id)).filter(Boolean);
  const backlinks = spaceNotes.filter(n => n.id!==active.id && (n.linkedNotes||[]).includes(active.id));

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflowY:"auto" }}>
      {daysSince(active.lastOpened)>=30 && !active.archived && (
        <div style={s.staleBar}>
          {"\u23F3"} {daysSince(active.lastOpened)} {t.edStale}
          <button style={s.staleBtn} onClick={()=>{ saveNote(true); navigate("/"); }}>{t.edKeep}</button>
          <button style={{ ...s.staleBtn, color:"#EF4444" }} onClick={()=>setShowDeleteConfirm(active.id)}>{t.edDelete}</button>
        </div>
      )}
      {active.archived && (
        <div style={{ ...s.staleBar, background:"#EDE9FE", color:"#5B21B6" }}>
          {"\u{1F4E6}"} {t.archivedBadge}
          <button style={{ ...s.staleBtn, borderColor:"#7C3AED", color:"#5B21B6" }} onClick={()=>unarchiveNote(active.id)}>{t.unarchiveBtn}</button>
          <button style={{ ...s.staleBtn, color:"#EF4444", borderColor:"#EF4444" }} onClick={()=>setShowDeleteConfirm(active.id)}>{t.deleteBtn}</button>
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 20px", borderBottom:"1px solid #E7E5E4" }}>
        <button style={s.backBtn} onClick={goBack}>{t.edBack}</button>
        {active.intent && !isMobile && <div style={{ flex:1, fontSize:12, color:"#A8A29E", fontStyle:"italic", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{"\u2192"} {active.intent}</div>}
        <div style={{ display:"flex", gap:6, marginLeft:"auto", alignItems:"center" }}>
          {autoSaveStatus && (
            <span style={{ fontSize:12, color:autoSaveStatus==="saved"?"#10B981":"#A8A29E", display:"flex", alignItems:"center", gap:4, transition:"opacity .3s" }}>
              {autoSaveStatus==="saved" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
              {autoSaveStatus==="saving"?t.autoSaving:t.autoSaved}
            </span>
          )}
          {!active.archived && <button style={{ ...s.ctrlBtn, color:"#78716C" }} onClick={()=>{archiveNote(active.id);navigate("/");}} title={t.archiveBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
          </button>}
          <button style={{ ...s.ctrlBtn, color:"#EF4444", borderColor:"#FECACA" }} onClick={()=>setShowDeleteConfirm(active.id)} title={t.deleteBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
      <div style={{ flex:1, padding:"20px", display:"flex", flexDirection:"column", gap:12, overflow:"hidden" }}>
        <input ref={titleRef} style={s.titleInp} value={active.title} placeholder={t.edTitlePh} onChange={e=>{setActive(p=>({...p,title:e.target.value}));triggerAutoSave();}}/>
        <div ref={contentWrapRef} style={{ position:"relative", flex:1, minHeight:isMobile?160:220, display:"flex", flexDirection:"column" }}>
          <TiptapEditor
            key={active.id}
            content={contentToHtml(active.content)}
            placeholder={t.edContentPh}
            editorRef={editorRef}
            wrapRef={contentWrapRef}
            onUpdate={triggerAutoSave}
            onLinkSearch={setLinkSearch}
            isMobile={isMobile}
          />
          {linkSearch && (
            <LinkAutocomplete
              notes={(allNotes[activeSpace]||[]).filter(n=>n.id!==active.id && !n.archived)}
              query={linkSearch.query}
              pos={linkSearch.pos}
              onSelect={handleLinkSelect}
              onClose={()=>setLinkSearch(null)}
              t={t}/>
          )}
        </div>
      </div>
      <div style={{ display:"flex", gap:isMobile?16:28, padding:isMobile?"12px 16px":"14px 40px", borderTop:"1px solid #E7E5E4", flexWrap:"wrap" }}>
        <div style={s.toolSec}>
          <div style={s.toolLbl}>{t.edTags}</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            {active.tags.map(tg=>(
              <span key={tg} style={{ fontSize:12, padding:"3px 8px", borderRadius:6, background:space.color+"22", color:space.color, cursor:"pointer" }} onClick={()=>toggleTag(tg)}>{tg} {"\u00D7"}</span>
            ))}
            <div style={{ position:"relative" }}>
              <button style={s.addTagBtn} onClick={()=>setShowTagPick(v=>!v)}>+ tag</button>
              {showTagPick && <TagPicker active={active.tags} onSelect={tg=>{toggleTag(tg);setShowTagPick(false);}} onClose={()=>setShowTagPick(false)} t={t}/>}
            </div>
          </div>
        </div>
        <div style={{ ...s.toolSec, minWidth:isMobile?"100%":220 }}>
          <div style={s.toolLbl}>{t.edTasks}</div>
          {active.tasks.map(task=>{
            const today = new Date().toISOString().split("T")[0];
            const overdue = task.dueDate && !task.done && task.dueDate < today;
            const dueToday = task.dueDate && task.dueDate === today;
            const isOver = taskDragOverId === task.id;
            return (
            <div key={task.id} draggable
              onDragStart={e=>{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",task.id);}}
              onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move";if(taskDragOverId!==task.id)setTaskDragOverId(task.id);}}
              onDrop={e=>{e.preventDefault();const dragId=e.dataTransfer.getData("text/plain");setTaskDragOverId(null);if(dragId&&dragId!==task.id)reorderTasks(dragId,task.id);}}
              onDragEnd={()=>setTaskDragOverId(null)}
              style={{ display:"flex", alignItems:"center", gap:8, ...(isOver?{borderTop:"2px solid "+space.color}:{}) }}>
              <span style={{ cursor:"grab", color:"var(--text-faint)", fontSize:12 }}>{"\u2630"}</span>
              <div style={{ ...s.chk, ...(task.done?{background:space.color,borderColor:space.color}:{}) }} onClick={()=>toggleTask(task.id)}>
                {task.done && <span style={{ color:"#fff", fontSize:10 }}>{"\u2713"}</span>}
              </div>
              <span style={{ fontSize:13, color:"#44403C", textDecoration:task.done?"line-through":"none", flex:1 }}>{task.text}</span>
              <input type="date" value={task.dueDate||""} onChange={e=>setTaskDueDate(task.id,e.target.value)}
                style={{ ...s.dateInp, fontSize:10, padding:"2px 4px", width:task.dueDate?110:28, opacity:task.dueDate?1:0.4,
                  color: overdue?"#EF4444":dueToday?"#D97706":"#78716C",
                  borderColor: overdue?"#FECACA":dueToday?"#FDE68A":"#E7E5E4" }}
                title={t.edDueDate||"Due date"}/>
            </div>);
          })}
          <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:2 }}>
            <input style={s.taskInp} placeholder={t.edAddTask} value={newTask}
              onChange={e=>setNewTask(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") addTask(); }}/>
            <button style={{ background:"transparent", border:"none", color:"#A8A29E", fontSize:18, cursor:"pointer" }} onClick={addTask}>+</button>
          </div>
        </div>
      </div>
      {(linked.length > 0 || backlinks.length > 0) && (
        <div style={{ display:"flex", gap:isMobile?16:28, padding:isMobile?"8px 16px":"8px 40px", borderTop:"1px solid #F5F5F4", flexWrap:"wrap" }}>
          {linked.length > 0 && (
            <div style={s.toolSec}>
              <div style={s.toolLbl}>{t.linkedNotesLabel}</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {linked.map(n => (
                  <button key={n.id} onClick={()=>openNote(n)} style={{
                    fontSize:12, padding:"4px 10px", borderRadius:6,
                    background:space.color+"12", color:space.color, border:"1px solid "+space.color+"33",
                    cursor:"pointer", fontFamily:"inherit"
                  }}>
                    {n.title || t.listNoTitle}
                  </button>
                ))}
              </div>
            </div>
          )}
          {backlinks.length > 0 && (
            <div style={s.toolSec}>
              <div style={s.toolLbl}>{t.backlinksLabel}</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {backlinks.map(n => (
                  <button key={n.id} onClick={()=>openNote(n)} style={{
                    fontSize:12, padding:"4px 10px", borderRadius:6,
                    background:"#F5F5F4", color:"#57534E", border:"1px solid #E7E5E4",
                    cursor:"pointer", fontFamily:"inherit"
                  }}>
                    {n.title || t.listNoTitle}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
