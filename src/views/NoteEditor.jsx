import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { daysSince } from "../constants/data";
import { contentToHtml } from "../utils/helpers";
import { s } from "../styles/appStyles";
import TiptapEditor from "../components/TiptapEditor";
import LinkAutocomplete from "../components/LinkAutocomplete";
import TagPicker from "../components/TagPicker";
import { isEmbedderReady } from "../utils/vectorSearch";
import { suggestConnections, suggestTags } from "../utils/aiSuggestions";

export default function NoteEditor() {
  const {
    t, space, active, setActive, allNotes, activeSpace, linkSearch, setLinkSearch,
    autoSaveStatus, setAutoSaveStatus, showTagPick, setShowTagPick,
    newTask, setNewTask, titleRef, editorRef,
    saveNote, triggerAutoSave, toggleTask, addTask, removeTask, setTaskDueDate, reorderTasks, toggleTag, openNote, handleLinkSelect,
    archiveNote, unarchiveNote, setShowDeleteConfirm,
  } = useApp();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const contentWrapRef = useRef(null);
  const [taskDragOverId, setTaskDragOverId] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null); // { connections, tags } | null
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiNoteId, setAiNoteId] = useState(null); // tracks which note suggestions belong to

  useEffect(() => {
    if (!active) navigate("/", { replace: true });
  }, [active, navigate]);

  // Reset AI suggestions when switching notes (inline check, no effect setState)
  if (active && active.id !== aiNoteId) {
    setAiNoteId(active.id);
    if (aiSuggestions) setAiSuggestions(null);
    if (showAiPanel) setShowAiPanel(false);
  }

  const [aiNotReady, setAiNotReady] = useState(false);
  const fetchAiSuggestions = useCallback(async () => {
    if (!active) return;
    if (!isEmbedderReady()) { setAiNotReady(true); setTimeout(() => setAiNotReady(false), 3000); return; }
    setAiLoading(true);
    try {
      const spNotes = allNotes[activeSpace] || [];
      const [connections, tags] = await Promise.all([
        suggestConnections(active, spNotes),
        suggestTags(active, spNotes),
      ]);
      setAiSuggestions({ connections, tags });
      setShowAiPanel(true);
    } catch {
      setAiSuggestions(null);
    }
    setAiLoading(false);
  }, [active, allNotes, activeSpace]);

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
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 20px", borderBottom:"1px solid var(--border)" }}>
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
      <div style={{ display:"flex", gap:isMobile?16:28, padding:isMobile?"12px 16px":"14px 40px", borderTop:"1px solid var(--border)", flexWrap:"wrap" }}>
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
              <span style={{ fontSize:13, color:"var(--text-secondary)", textDecoration:task.done?"line-through":"none", flex:1 }}>{task.text}</span>
              <input type="date" draggable={false} onMouseDown={e=>e.stopPropagation()} value={task.dueDate||""} onChange={e=>setTaskDueDate(task.id,e.target.value)}
                style={{ ...s.dateInp, fontSize:10, padding:"2px 4px", minWidth:110,
                  color: overdue?"#EF4444":dueToday?"#D97706":"#78716C",
                  borderColor: overdue?"#FECACA":dueToday?"#FDE68A":"#E7E5E4" }}
                title={t.edDueDate||"Due date"}/>
              <button onClick={()=>removeTask(task.id)} style={{ background:"transparent", border:"none", color:"var(--text-faint)", cursor:"pointer", padding:4, fontSize:14, lineHeight:1, flexShrink:0 }} title={t.deleteBtn}>{"\u00D7"}</button>
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
        <div style={{ display:"flex", gap:isMobile?16:28, padding:isMobile?"8px 16px":"8px 40px", borderTop:"1px solid var(--border-light)", flexWrap:"wrap" }}>
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
                    background:"var(--bg-card)", color:"var(--text-muted)", border:"1px solid var(--border)",
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
      {/* AI Suggestions */}
      <div style={{ padding:isMobile?"8px 16px":"8px 40px", borderTop:"1px solid var(--border-light)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button
            onClick={showAiPanel && aiSuggestions ? () => setShowAiPanel(v => !v) : fetchAiSuggestions}
            disabled={aiLoading}
            style={{
              fontSize:12, padding:"5px 12px", borderRadius:8,
              background: showAiPanel ? "linear-gradient(135deg, #8B5CF6, #6366F1)" : "var(--bg-card)",
              color: showAiPanel ? "#fff" : "var(--text-muted)",
              border: showAiPanel ? "none" : "1px solid var(--border)",
              cursor: aiLoading ? "wait" : "pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", gap:6,
              transition: "all .2s",
            }}
          >
            {aiLoading && <span style={{ display:"inline-block", width:12, height:12, border:"2px solid var(--text-faint)", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .6s linear infinite" }}/>}
            {t.aiSuggest || "AI Suggestions"}
          </button>
          {showAiPanel && aiSuggestions && (
            <button onClick={fetchAiSuggestions} disabled={aiLoading}
              style={{ fontSize:11, background:"transparent", border:"none", color:"var(--text-faint)", cursor:"pointer", fontFamily:"inherit" }}>
              {t.aiRefresh || "Refresh"}
            </button>
          )}
          {aiNotReady && <span style={{ fontSize:11, color:"#F59E0B" }}>{t.aiNotReady || "Enable semantic search first"}</span>}
        </div>
        {showAiPanel && aiSuggestions && (
          <div style={{ display:"flex", gap:isMobile?16:28, flexWrap:"wrap", marginTop:10, paddingBottom:6 }}>
            {/* Suggested connections */}
            {aiSuggestions.connections.length > 0 && (
              <div style={s.toolSec}>
                <div style={{ ...s.toolLbl, display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:13 }}>{"\u{1F517}"}</span> {t.aiConnections || "Suggested connections"}
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {aiSuggestions.connections.map(({ note: n, score }) => (
                    <button key={n.id} onClick={()=>openNote(n)} style={{
                      fontSize:12, padding:"4px 10px", borderRadius:6,
                      background:"linear-gradient(135deg, #8B5CF622, #6366F122)",
                      color:"#8B5CF6", border:"1px solid #8B5CF633",
                      cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", gap:4,
                    }}>
                      {n.title || t.listNoTitle}
                      <span style={{ fontSize:9, opacity:.6 }}>{Math.round(score*100)}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Suggested tags */}
            {aiSuggestions.tags.length > 0 && (
              <div style={s.toolSec}>
                <div style={{ ...s.toolLbl, display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:13 }}>{"\u{1F3F7}\uFE0F"}</span> {t.aiTags || "Suggested tags"}
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {aiSuggestions.tags.map(({ tag, fromNotes }) => (
                    <button key={tag} onClick={() => { toggleTag(tag); setAiSuggestions(prev => prev ? { ...prev, tags: prev.tags.filter(t => t.tag !== tag) } : prev); }}
                      style={{
                        fontSize:12, padding:"3px 10px", borderRadius:6,
                        background:"linear-gradient(135deg, #10B98122, #0EA5E922)",
                        color:"#10B981", border:"1px solid #10B98133",
                        cursor:"pointer", fontFamily:"inherit",
                      }}
                      title={fromNotes.slice(0, 3).join(", ")}>
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {aiSuggestions.connections.length === 0 && aiSuggestions.tags.length === 0 && (
              <div style={{ fontSize:12, color:"var(--text-faint)", padding:"4px 0" }}>
                {t.aiNoSuggestions || "No suggestions found — try adding more content."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
