import { useState, useRef, useEffect } from "react";
import { SUGGESTED_TAGS } from "../constants/data";
import { s } from "../styles/appStyles";

export default function TagPicker({ active, onSelect, onClose, t }) {
  const [q, setQ] = useState("");
  const ref = useRef();
  useEffect(() => { if (ref.current) ref.current.focus(); }, []);
  const list = SUGGESTED_TAGS.filter(tg => !active.includes(tg) && tg.includes(q.toLowerCase()));
  const canCreate = q.trim() && !active.includes(q.trim()) && !SUGGESTED_TAGS.includes(q.trim());
  return (
    <div style={s.pickerWrap}>
      <input ref={ref} style={s.pickerInput} placeholder={t.tagPh}
        value={q} onChange={e => setQ(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && q.trim()) onSelect(q.trim()); if (e.key === "Escape") onClose(); }} />
      {list.map(tg => <button key={tg} style={s.pickerItem} onClick={() => onSelect(tg)}>{tg}</button>)}
      {canCreate && <button style={{ ...s.pickerItem, color:"#6366F1" }} onClick={() => onSelect(q.trim())}>{t.tagCreate} \u201E{q.trim()}\u201D</button>}
      {!list.length && !canCreate && <div style={{ fontSize:11, color:"#A8A29E", padding:"4px 8px" }}>{t.tagNone}</div>}
    </div>
  );
}
