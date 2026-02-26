import { useState, useRef, useEffect } from "react";
import { s } from "../styles/appStyles";
import DueDatePicker from "./DueDatePicker";

function DueBadge({ dueDate, done }) {
  if (!dueDate) return null;
  const today = new Date().toISOString().split("T")[0];
  const overdue = !done && dueDate < today;
  const isToday = dueDate === today;
  const color = overdue ? "#EF4444" : isToday ? "#D97706" : "#A8A29E";
  const bg = overdue ? "#FEF2F2" : isToday ? "#FFFBEB" : "transparent";
  const label = overdue ? "\u26A0" : isToday ? "\u23F0" : "";
  return (
    <span style={{ fontSize:10, color, background:bg, borderRadius:4, padding:"1px 5px", whiteSpace:"nowrap" }}>
      {label}{label?" ":""}{dueDate}
    </span>
  );
}

export default function TasksView({
  notes, color, allTags, onOpenNote, onCreate, onToggleTask,
  standaloneTasks, onToggleStandaloneTask,
  onUpdateStandaloneTask, onAddSubtask, onToggleSubtask, onRemoveSubtask, onDeleteStandaloneTask,
  onSetDueDate, onSetStandaloneDueDate, t,
}) {
  const [tag, setTag] = useState(null);
  const [sort, setSort] = useState("desc");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showDate, setShowDate] = useState(false);
  const [showDone, setShowDone] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newSubText, setNewSubText] = useState("");
  const [quickText, setQuickText] = useState("");
  const quickRef = useRef();
  const editRef = useRef();
  const ALL = t.tvAll;

  // Auto-focus edit input for new empty tasks
  const newTaskId = useRef(null);
  useEffect(() => {
    if (newTaskId.current && expandedId === newTaskId.current && editRef.current) {
      editRef.current.focus();
      newTaskId.current = null;
    }
  }, [expandedId]);

  const noteTasks = notes
    .filter(n => {
      const mt = tag ? n.tags.includes(tag) : true;
      const mf = from ? n.updatedAt >= from : true;
      const mtd = to ? n.updatedAt <= to : true;
      return mt && mf && mtd;
    })
    .flatMap(n => n.tasks
      .filter(tk => showDone || !tk.done)
      .map(tk => ({ ...tk, noteTitle:n.title, noteDate:n.updatedAt, noteTags:n.tags, note:n, standalone:false }))
    );

  const standaloneItems = (standaloneTasks || [])
    .filter(tk => showDone || !tk.done)
    .filter(tk => {
      const mf = from ? tk.createdAt >= from : true;
      const mtd = to ? tk.createdAt <= to : true;
      return mf && mtd;
    })
    .map(tk => ({ ...tk, noteTitle:null, noteDate:tk.createdAt, noteTags:[], note:null, standalone:true }));

  const tasks = [...noteTasks, ...standaloneItems]
    .sort((a,b) => sort==="desc" ? b.noteDate.localeCompare(a.noteDate) : a.noteDate.localeCompare(b.noteDate));

  const doneN = tasks.filter(tk => tk.done).length;

  function handleCreate() {
    const taskId = onCreate();
    if (taskId) {
      newTaskId.current = taskId;
      setExpandedId(taskId);
      setEditText("");
      setEditDesc("");
      setNewSubText("");
    }
  }

  function handleQuickAdd() {
    if (!quickText.trim()) return;
    const taskId = onCreate();
    if (taskId && onUpdateStandaloneTask) {
      setTimeout(() => onUpdateStandaloneTask(taskId, { text: quickText.trim() }), 10);
    }
    setQuickText("");
  }

  function handleExpand(tk) {
    if (expandedId === tk.id) {
      if (tk.standalone && onUpdateStandaloneTask) {
        onUpdateStandaloneTask(tk.id, { text: editText, description: editDesc });
      }
      setExpandedId(null);
    } else {
      setExpandedId(tk.id);
      setEditText(tk.text || "");
      setEditDesc(tk.description || "");
      setNewSubText("");
    }
  }

  function handleSaveEdit(tk) {
    if (tk.standalone && onUpdateStandaloneTask) {
      onUpdateStandaloneTask(tk.id, { text: editText, description: editDesc });
    }
  }

  function handleAddSub(taskId) {
    if (!newSubText.trim() || !onAddSubtask) return;
    onAddSubtask(taskId, newSubText.trim());
    setNewSubText("");
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={s.tvHead}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18, fontWeight:700, letterSpacing:"-0.02em" }}>{t.tvTitle}</span>
          <span style={s.badge}>{doneN}/{tasks.length}</span>
          <div style={{ flex:1 }} />
          <button style={{ ...s.ctrlBtn, background:color, color:"#fff", border:"none" }} onClick={handleCreate}>{t.tvNew}</button>
        </div>
        {/* Quick add inline */}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input
            ref={quickRef}
            style={{ ...s.searchBox, flex:1 }}
            placeholder={t.tvQuickAdd || "Add task..."}
            value={quickText}
            onChange={e => setQuickText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleQuickAdd(); }}
          />
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {[ALL, ...allTags].map(tg => {
            const a = tg===ALL ? tag===null : tag===tg;
            return (
              <button key={tg} style={{ ...s.tagChip, ...(a?{background:color+"22",color,borderColor:color+"44"}:{}) }}
                onClick={() => setTag(tg===ALL ? null : (tag===tg ? null : tg))}>
                {tg}
              </button>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button style={{ ...s.ctrlBtn, ...(sort==="desc"?{color}:{}) }} onClick={() => setSort(v => v==="desc"?"asc":"desc")}>
            {sort==="desc" ? t.tvDateDesc : t.tvDateAsc}
          </button>
          <button style={{ ...s.ctrlBtn, ...(showDate||from||to?{color,background:color+"15"}:{}) }} onClick={() => setShowDate(v => !v)}>{"\u{1F4C5}"}</button>
          <button style={{ ...s.ctrlBtn, ...(showDone?{}:{color,background:color+"15"}) }} onClick={() => setShowDone(v => !v)}>
            {showDone ? t.tvWithDone : t.tvOpenOnly}
          </button>
        </div>
        {showDate && (
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#A8A29E" }}>{t.tvFrom}</span>
              <input type="date" style={s.dateInp} value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#A8A29E" }}>{t.tvTo}</span>
              <input type="date" style={s.dateInp} value={to} onChange={e => setTo(e.target.value)} />
            </div>
            {(from||to) && <button style={s.clearBtn} onClick={() => { setFrom(""); setTo(""); }}>{t.tvClear}</button>}
          </div>
        )}
      </div>
      <div style={s.tvList}>
        {tasks.length === 0 && <div style={s.empty}>{t.tvEmpty}</div>}
        {tasks.map((tk, i) => {
          const expanded = expandedId === tk.id;
          const subtasks = tk.subtasks || [];
          const subDone = subtasks.filter(st => st.done).length;
          return (
            <div key={tk.id + "-" + i} style={{ ...s.tvRow, flexDirection:"column", gap:0, padding: expanded ? "14px 0 16px" : "14px 0" }}>
              {/* Main row */}
              <div style={{ display:"flex", alignItems:"flex-start", gap:12, width:"100%" }}>
                <div style={{ ...s.chk, ...(tk.done?{background:color,borderColor:color}:{}) }}
                  onClick={() => tk.standalone ? onToggleStandaloneTask(tk.id) : onToggleTask(tk.note.id, tk.id)}>
                  {tk.done && <span style={{ color:"#fff", fontSize:10 }}>{"\u2713"}</span>}
                </div>
                <div style={{ flex:1, minWidth:0, cursor:"pointer" }} onClick={() => handleExpand(tk)}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:14, fontWeight:500, textDecoration:tk.done?"line-through":"none", color:tk.done?"var(--text-faint)":"var(--text-primary)", flex:1 }}>
                      {tk.text || (t.tvNewTask || "New task...")}
                    </span>
                    {subtasks.length > 0 && (
                      <span style={{ fontSize:10, color:"var(--text-faint)", flexShrink:0 }}>{subDone}/{subtasks.length}</span>
                    )}
                  </div>
                  {tk.description && !expanded && (
                    <div style={{ fontSize:11, color:"var(--text-faint)", marginTop:2, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                      {tk.description}
                    </div>
                  )}
                  {tk.standalone ? (
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginTop:3 }}>
                      <span style={{ fontSize:11, color:"var(--text-faint)" }}>{tk.noteDate}</span>
                    </div>
                  ) : (
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginTop:3 }} onClick={e => { e.stopPropagation(); onOpenNote(tk.note); }}>
                      <span style={{ fontSize:11, fontStyle:"italic", color }}>{"\u2197"} {tk.noteTitle||t.tvNoTitle}</span>
                      <span style={{ fontSize:11, color:"var(--text-faint)" }}>{tk.noteDate}</span>
                      {tk.noteTags.map(tg => <span key={tg} style={s.tinyTag}>{tg}</span>)}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", gap:4, alignItems:"center", flexShrink:0 }}>
                  <DueBadge dueDate={tk.dueDate} done={tk.done}/>
                  <DueDatePicker value={tk.dueDate||""} onChange={v => tk.standalone ? onSetStandaloneDueDate?.(tk.id, v) : onSetDueDate?.(tk.note?.id, tk.id, v)} t={t}/>
                </div>
              </div>
              {/* Expanded: edit, description, subtasks */}
              {expanded && (
                <div style={{ marginLeft:32, marginTop:10, display:"flex", flexDirection:"column", gap:10, width:"calc(100% - 44px)" }}>
                  {/* Edit task text (standalone only) */}
                  {tk.standalone && (
                    <input
                      ref={editRef}
                      style={{ border:"1px solid var(--border)", borderRadius:7, padding:"8px 12px", fontSize:14, fontFamily:"inherit", color:"var(--text-primary)", background:"var(--bg-input)", outline:"none", width:"100%", boxSizing:"border-box" }}
                      value={editText}
                      placeholder={t.tvNewTask || "Task name..."}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={() => handleSaveEdit(tk)}
                      onKeyDown={e => { if (e.key === "Enter") { handleSaveEdit(tk); editRef.current?.blur(); } }}
                    />
                  )}
                  {/* Description (standalone only) */}
                  {tk.standalone && (
                    <textarea
                      style={{ border:"1px solid var(--border)", borderRadius:7, padding:"8px 12px", fontSize:12, fontFamily:"inherit", color:"var(--text-secondary)", background:"var(--bg-input)", outline:"none", resize:"vertical", minHeight:48, width:"100%", boxSizing:"border-box" }}
                      placeholder={t.tvDescPh || "Add description..."}
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      onBlur={() => handleSaveEdit(tk)}
                    />
                  )}
                  {/* Subtasks (standalone only) */}
                  {tk.standalone && (
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {subtasks.length > 0 && (
                        <div style={{ fontSize:10, color:"var(--text-faint)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:2 }}>
                          {t.tvSubtasks || "Subtasks"} ({subDone}/{subtasks.length})
                        </div>
                      )}
                      {subtasks.map(sub => (
                        <div key={sub.id} style={{ display:"flex", alignItems:"center", gap:8, paddingLeft:4 }}>
                          <div style={{ ...s.chk, width:16, height:16, borderRadius:3, ...(sub.done?{background:color,borderColor:color}:{}) }}
                            onClick={() => onToggleSubtask?.(tk.id, sub.id)}>
                            {sub.done && <span style={{ color:"#fff", fontSize:8 }}>{"\u2713"}</span>}
                          </div>
                          <span style={{ fontSize:12, flex:1, textDecoration:sub.done?"line-through":"none", color:sub.done?"var(--text-faint)":"var(--text-secondary)" }}>
                            {sub.text}
                          </span>
                          <button onClick={() => onRemoveSubtask?.(tk.id, sub.id)}
                            style={{ background:"transparent", border:"none", color:"var(--text-faint)", cursor:"pointer", fontSize:12, padding:2 }}>{"\u00D7"}</button>
                        </div>
                      ))}
                      <div style={{ display:"flex", gap:6, alignItems:"center", paddingLeft:4 }}>
                        <input
                          style={{ flex:1, border:"none", borderBottom:"1px solid var(--border)", background:"transparent", fontFamily:"inherit", fontSize:12, color:"var(--text-primary)", outline:"none", padding:"4px 0" }}
                          placeholder={t.tvAddSubtask || "+ Subtask..."}
                          value={newSubText}
                          onChange={e => setNewSubText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleAddSub(tk.id); }}
                        />
                      </div>
                    </div>
                  )}
                  {/* Actions */}
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:2 }}>
                    {tk.standalone && onDeleteStandaloneTask && (
                      <button onClick={() => { onDeleteStandaloneTask(tk.id); setExpandedId(null); }}
                        style={{ fontSize:11, color:"#EF4444", background:"transparent", border:"1px solid #FECACA", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit" }}>
                        {t.deleteBtn || "Delete"}
                      </button>
                    )}
                    <button onClick={() => { handleSaveEdit(tk); setExpandedId(null); }}
                      style={{ fontSize:11, color:"var(--text-muted)", background:"transparent", border:"1px solid var(--border)", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit", marginLeft:"auto" }}>
                      {t.helpClose || "OK"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
