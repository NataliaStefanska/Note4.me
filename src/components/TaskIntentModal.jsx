import { useState, useRef } from "react";
import { m } from "../styles/modalStyles";

export default function TaskIntentModal({ color, onConfirm, onClose, t }) {
  const [step, setStep] = useState("why");
  const [why, setWhy] = useState("");
  const [what, setWhat] = useState("");
  const [dueDate, setDueDate] = useState("");
  const whatRef = useRef();

  function goNext() {
    setStep("what");
    setTimeout(() => { if (whatRef.current) whatRef.current.focus(); }, 60);
  }

  function finish() {
    if (!what.trim()) return;
    onConfirm(why, what, dueDate);
  }

  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={{ ...m.box, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        {step === "why" ? (
          <div>
            <div style={m.q}>{t.taskQ}</div>
            <div style={m.sub}>{t.taskSub}</div>
            <textarea style={{ ...m.inp, minHeight: 72, resize: "none" }}
              autoFocus placeholder={t.taskPh}
              value={why} onChange={e => setWhy(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); goNext(); } }} />
            <div style={m.row}>
              <button style={m.skip} onClick={goNext}>{t.taskSkip}</button>
              <button style={{ ...m.ok, background: color }} onClick={goNext}>{t.taskNext}</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={m.q}>{t.taskWhatQ}</div>
            {why.trim() && <div style={{ fontSize:12, color:"#A8A29E", fontStyle:"italic", marginBottom:8 }}>{"\u2192"} {why}</div>}
            <input ref={whatRef} style={m.inp} placeholder={t.taskWhatPh}
              value={what} onChange={e => setWhat(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") finish(); }} />
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4, marginBottom:4 }}>
              <span style={{ fontSize:12, color:"#A8A29E" }}>{t.edDueDate || "Termin:"}</span>
              <input type="date" style={{ border:"1px solid #E7E5E4", borderRadius:6, padding:"5px 8px", fontSize:12, fontFamily:"inherit", color:"#1C1917", background:"#FAFAF9", outline:"none" }}
                value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div style={m.row}>
              <button style={m.skip} onClick={() => setStep("why")}>{t.taskBack}</button>
              <button style={{ ...m.ok, opacity: what.trim() ? 1 : 0.4, background: color }} onClick={finish}>{t.taskAdd}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
