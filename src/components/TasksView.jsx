import { useState, useEffect, useCallback } from "react";
import { s } from "../styles/appStyles";
import DueDatePicker from "./DueDatePicker";

function DueBadge({ dueDate, done }) {
  if (!dueDate) return null;
  const today = new Date().toISOString().split("T")[0];
  const overdue = !done && dueDate < today;
  const isToday = dueDate === today;
  const color = overdue ? "#EF4444" : isToday ? "#D97706" : "var(--text-faint)";
  const bg = overdue ? "#EF444418" : isToday ? "#D9770618" : "transparent";
  const label = overdue ? "\u26A0" : isToday ? "\u23F0" : "";
  return (
    <span style={{ fontSize:10, color, background:bg, borderRadius:4, padding:"1px 5px", whiteSpace:"nowrap" }}>
      {label}{label?" ":""}{dueDate}
    </span>
  );
}

function CelebrationModal({ taskText, onClose }) {
  const stableClose = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    const t = setTimeout(stableClose, 2800);
    return () => clearTimeout(t);
  }, [stableClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 600, backdropFilter: "blur(2px)",
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-surface)", borderRadius: 20, padding: "36px 44px",
        maxWidth: "90vw", width: 380, textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,.25)",
        animation: "celebPop .4s cubic-bezier(.34,1.56,.64,1)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{"\u{1F973}"}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
          Zadanie ukończone!
        </div>
        <div style={{
          fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {taskText}
        </div>
        <div style={{ marginTop: 16, fontSize: 28 }}>
          {"\u{1F389}\u{1F3C6}\u2728"}
        </div>
      </div>
      <style>{`
        @keyframes celebPop {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function TasksView({ notes, color, allTags, onOpenNote, onCreate, onToggleTask, standaloneTasks, onToggleStandaloneTask, onSetDueDate, onSetStandaloneDueDate, onEditStandaloneTask, onEditNoteTask, onArchiveDoneTasks, t }) {
  const [tag, setTag] = useState(null);
  const [sort, setSort] = useState("desc");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showDate, setShowDate] = useState(false);
  const [showDone, setShowDone] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [celebration, setCelebration] = useState(null);
  const ALL = t.tvAll;

  const noteTasks = notes
    .filter(n => {
      const mt = tag ? n.tags.includes(tag) : true;
      const mf = from ? n.updatedAt >= from : true;
      const mtd = to ? n.updatedAt <= to : true;
      return mt && mf && mtd;
    })
    .flatMap(n => n.tasks
      .filter(tk => !tk.archived && (showDone || !tk.done))
      .map(tk => ({ ...tk, noteTitle:n.title, noteDate:n.updatedAt, noteTags:n.tags, note:n, standalone:false }))
    );

  const standaloneItems = (standaloneTasks || [])
    .filter(tk => !tk.archived && (showDone || !tk.done))
    .filter(tk => {
      const mf = from ? tk.createdAt >= from : true;
      const mtd = to ? tk.createdAt <= to : true;
      return mf && mtd;
    })
    .map(tk => ({ ...tk, noteTitle:null, noteDate:tk.createdAt, noteTags:[], note:null, standalone:true }));

  const tasks = [...noteTasks, ...standaloneItems]
    .sort((a,b) => sort==="desc" ? b.noteDate.localeCompare(a.noteDate) : a.noteDate.localeCompare(b.noteDate));

  const doneN = tasks.filter(tk => tk.done).length;

  function handleToggle(tk) {
    const wasDone = tk.done;
    if (tk.standalone) {
      onToggleStandaloneTask(tk.id);
    } else {
      onToggleTask(tk.note.id, tk.id);
    }
    if (!wasDone) {
      setCelebration(tk.text);
    }
  }

  function startEdit(tk) {
    setEditingId(tk.id + (tk.standalone ? "-s" : ""));
    setEditText(tk.text);
  }

  function commitEdit(tk) {
    if (editText.trim() && editText.trim() !== tk.text) {
      if (tk.standalone) {
        onEditStandaloneTask?.(tk.id, editText.trim());
      } else {
        onEditNoteTask?.(tk.note.id, tk.id, editText.trim());
      }
    }
    setEditingId(null);
    setEditText("");
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {celebration && (
        <CelebrationModal taskText={celebration} onClose={() => setCelebration(null)} />
      )}
      <div style={s.tvHead}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18, fontWeight:700, letterSpacing:"-0.02em" }}>{t.tvTitle}</span>
          <span style={s.badge}>{doneN}/{tasks.length}</span>
          <div style={{ flex:1 }} />
          <button style={{ ...s.ctrlBtn, background:color, color:"#fff", border:"none" }} onClick={onCreate}>{t.tvNew}</button>
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
          {doneN > 0 && onArchiveDoneTasks && (
            <button
              style={{ ...s.ctrlBtn, color: "#EF4444", background: "#EF444412", border: "1px solid #EF444422", fontSize: 11 }}
              onClick={onArchiveDoneTasks}
              title={t.tvArchiveDone || "Archiwizuj ukończone"}
            >
              {"\uD83D\uDCE6"} {t.tvArchiveDone || "Archiwizuj ukończone"} ({doneN})
            </button>
          )}
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
        {tasks.map((tk) => {
          const key = tk.id + (tk.standalone ? "-s" : "");
          const isEditing = editingId === key;
          return (
            <div key={key} style={s.tvRow}>
              <div style={{ ...s.chk, ...(tk.done?{background:color,borderColor:color}:{}) }} onClick={() => handleToggle(tk)}>
                {tk.done && <span style={{ color:"#fff", fontSize:10 }}>{"\u2713"}</span>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") commitEdit(tk); if (e.key === "Escape") setEditingId(null); }}
                      onBlur={() => commitEdit(tk)}
                      style={{
                        flex: 1, fontSize: 14, fontWeight: 500, fontFamily: "inherit",
                        border: "none", borderBottom: `2px solid ${color}`,
                        background: "transparent", color: "var(--text-primary)",
                        outline: "none", padding: "2px 0",
                      }}
                    />
                  ) : (
                    <span
                      style={{ fontSize:14, fontWeight:500, textDecoration:tk.done?"line-through":"none", color:tk.done?"var(--text-faint)":"var(--text-primary)", flex:1, cursor: tk.done ? "default" : "pointer" }}
                      onClick={() => !tk.done && startEdit(tk)}
                      title={tk.done ? "" : (t.smEdit || "Edytuj")}
                    >
                      {tk.done ? "\u2705 " : "\u{1F4CB} "}{tk.text}
                    </span>
                  )}
                  <DueBadge dueDate={tk.dueDate} done={tk.done}/>
                  <DueDatePicker value={tk.dueDate||""} onChange={v => tk.standalone ? onSetStandaloneDueDate?.(tk.id, v) : onSetDueDate?.(tk.note?.id, tk.id, v)} t={t}/>
                </div>
                {tk.standalone ? (
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginTop:3 }}>
                    <span style={{ fontSize:11, color:"#A8A29E" }}>{tk.noteDate}</span>
                    {tk.intent && <span style={{ fontSize:11, fontStyle:"italic", color:"#A8A29E" }}>{"\u2192"} {tk.intent}</span>}
                  </div>
                ) : (
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginTop:3, cursor:"pointer" }} onClick={() => onOpenNote(tk.note)}>
                    <span style={{ fontSize:11, fontStyle:"italic", color }}>{"\u2197"} {tk.noteTitle||t.tvNoTitle}</span>
                    <span style={{ fontSize:11, color:"#A8A29E" }}>{tk.noteDate}</span>
                    {tk.noteTags.map(tg => <span key={tg} style={s.tinyTag}>{tg}</span>)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
