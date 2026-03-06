import { useState, useRef, useEffect } from "react";
import { m } from "../styles/modalStyles";

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export default function TaskIntentModal({ color, onConfirm, onClose, t }) {
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showDate, setShowDate] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 60);
  }, []);

  function finish() {
    if (!text.trim()) return;
    onConfirm("", text, dueDate);
  }

  const today = new Date().toISOString().split("T")[0];

  const chipStyle = (active) => ({
    fontSize: 12, padding: "6px 14px", borderRadius: 20,
    border: active ? `1.5px solid ${color}` : "1px solid var(--border)",
    background: active ? color + "15" : "transparent",
    color: active ? color : "var(--text-muted)",
    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
    transition: "all .15s",
  });

  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={{
        ...m.box, maxWidth: 480, padding: "28px 32px", gap: 0,
        borderRadius: 16,
      }} onClick={e => e.stopPropagation()}>

        {/* Task input */}
        <input
          ref={inputRef}
          style={{
            border: "none", outline: "none", fontSize: 16, fontWeight: 500,
            color: "var(--text-primary)", background: "transparent", fontFamily: "inherit",
            width: "100%", padding: "8px 0", boxSizing: "border-box",
            borderBottom: `2px solid ${text.trim() ? color : "var(--border)"}`,
            transition: "border-color .2s",
          }}
          placeholder={t.taskWhatPh || "np. Wysłać email do Ani..."}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") finish(); if (e.key === "Escape") onClose(); }}
        />

        {/* Due date section */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "transparent", border: "none", cursor: "pointer",
              color: dueDate ? color : "var(--text-faint)", fontSize: 13,
              fontFamily: "inherit", padding: "4px 0",
            }}
            onClick={() => setShowDate(v => !v)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {dueDate ? (
              <span style={{ fontWeight: 500 }}>
                {dueDate === today ? (t.dueDateToday || "Dziś") :
                 dueDate === addDays(1) ? (t.dueDateTomorrow || "Jutro") :
                 dueDate}
              </span>
            ) : (
              <span>{t.edDueDate || "Termin"}</span>
            )}
          </button>
          {dueDate && (
            <button onClick={() => setDueDate("")} style={{
              background: "transparent", border: "none", color: "var(--text-faint)",
              cursor: "pointer", fontSize: 14, padding: "2px 4px", lineHeight: 1,
            }}>&times;</button>
          )}
        </div>

        {showDate && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
            <button style={chipStyle(dueDate === today)} onClick={() => { setDueDate(today); setShowDate(false); }}>
              {t.dueDateToday || "Dziś"}
            </button>
            <button style={chipStyle(dueDate === addDays(1))} onClick={() => { setDueDate(addDays(1)); setShowDate(false); }}>
              {t.dueDateTomorrow || "Jutro"}
            </button>
            <button style={chipStyle(dueDate === addDays(3))} onClick={() => { setDueDate(addDays(3)); setShowDate(false); }}>
              +3d
            </button>
            <button style={chipStyle(dueDate === addDays(7))} onClick={() => { setDueDate(addDays(7)); setShowDate(false); }}>
              +1w
            </button>
            <input
              type="date" value={dueDate}
              onChange={e => { setDueDate(e.target.value); setShowDate(false); }}
              style={{
                border: "1px solid var(--border)", borderRadius: 8,
                padding: "6px 10px", fontSize: 12, fontFamily: "inherit",
                color: "var(--text-primary)", background: "var(--bg-input)",
                outline: "none",
              }}
            />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button style={{
            background: "transparent", border: "none", color: "var(--text-faint)",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: "10px 16px",
          }} onClick={onClose}>{t.deleteConfirmNo || "Anuluj"}</button>
          <button style={{
            background: text.trim() ? color : "var(--border)",
            color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px",
            fontSize: 14, fontWeight: 600, cursor: text.trim() ? "pointer" : "default",
            fontFamily: "inherit", transition: "all .2s",
            opacity: text.trim() ? 1 : 0.5,
          }} onClick={finish}>{t.taskAdd || "Dodaj zadanie"}</button>
        </div>
      </div>
    </div>
  );
}
