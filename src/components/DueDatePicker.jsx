import { useState, useRef, useEffect } from "react";

function addDays(d, n) {
  const date = d ? new Date(d) : new Date();
  date.setDate(date.getDate() + n);
  return date.toISOString().split("T")[0];
}

function formatShort(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(12,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return { label: "today", color: "#D97706" };
  if (diff === 1) return { label: "tomorrow", color: "#0EA5E9" };
  if (diff === -1) return { label: "yesterday", color: "#EF4444" };
  if (diff < -1) return { label: `${Math.abs(diff)}d ago`, color: "#EF4444" };
  if (diff <= 7) return { label: `in ${diff}d`, color: "#10B981" };
  return { label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), color: "var(--text-muted)" };
}

export default function DueDatePicker({ value, onChange, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const today = new Date().toISOString().split("T")[0];
  const display = formatShort(value);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const chipStyle = (active) => ({
    fontSize: 11, padding: "4px 10px", borderRadius: 12,
    border: "1px solid var(--border)", background: active ? "var(--bg-card)" : "transparent",
    color: active ? "var(--text-primary)" : "var(--text-muted)",
    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
  });

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          fontSize: 11, padding: "3px 8px", borderRadius: 6,
          border: value ? `1px solid ${display.color}33` : "1px dashed var(--border-dashed)",
          background: value ? `${display.color}11` : "transparent",
          color: value ? display.color : "var(--text-faint)",
          cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          minWidth: 50, textAlign: "center",
        }}
        title={value || (t.edDueDate || "Due date")}
      >
        {display ? display.label : (t.edDueDate || "Due date")}
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "100%", right: 0, marginBottom: 4,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 10, padding: 8, zIndex: 50, minWidth: 200,
          boxShadow: "0 8px 24px var(--shadow)",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button style={chipStyle(value === today)} onClick={() => { onChange(today); setOpen(false); }}>
              {t.dueDateToday || "Today"}
            </button>
            <button style={chipStyle(value === addDays(null, 1))} onClick={() => { onChange(addDays(null, 1)); setOpen(false); }}>
              {t.dueDateTomorrow || "Tomorrow"}
            </button>
            <button style={chipStyle(value === addDays(null, 3))} onClick={() => { onChange(addDays(null, 3)); setOpen(false); }}>
              +3d
            </button>
            <button style={chipStyle(value === addDays(null, 7))} onClick={() => { onChange(addDays(null, 7)); setOpen(false); }}>
              +1w
            </button>
          </div>
          <input
            type="date" value={value || ""}
            onChange={e => { onChange(e.target.value); setOpen(false); }}
            style={{
              border: "1px solid var(--border)", borderRadius: 6,
              padding: "5px 8px", fontSize: 12, fontFamily: "inherit",
              color: "var(--text-primary)", background: "var(--bg-input)", outline: "none",
              width: "100%", boxSizing: "border-box",
            }}
          />
          {value && (
            <button onClick={() => { onChange(""); setOpen(false); }}
              style={{
                fontSize: 11, color: "var(--text-faint)", background: "transparent",
                border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: "2px 0",
              }}>
              {t.tvClear || "Clear"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
