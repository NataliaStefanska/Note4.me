import { useState } from "react";
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

export default function TasksView({ notes, color, allTags, onOpenNote, onCreate, onToggleTask, standaloneTasks, onToggleStandaloneTask, onSetDueDate, onSetStandaloneDueDate, t }) {
  const [tag, setTag] = useState(null);
  const [sort, setSort] = useState("desc");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showDate, setShowDate] = useState(false);
  const [showDone, setShowDone] = useState(true);
  const ALL = t.tvAll;

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

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
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
        {tasks.map((tk) => (
          <div key={tk.id + (tk.standalone ? "-s" : "")} style={s.tvRow}>
            <div style={{ ...s.chk, ...(tk.done?{background:color,borderColor:color}:{}) }} onClick={() => tk.standalone ? onToggleStandaloneTask(tk.id) : onToggleTask(tk.note.id, tk.id)}>
              {tk.done && <span style={{ color:"#fff", fontSize:10 }}>{"\u2713"}</span>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:14, fontWeight:500, textDecoration:tk.done?"line-through":"none", color:tk.done?"#A8A29E":"#1C1917", flex:1 }}>{tk.text}</span>
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
        ))}
      </div>
    </div>
  );
}
