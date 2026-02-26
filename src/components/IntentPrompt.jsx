import { useState, useEffect } from "react";
import { m } from "../styles/modalStyles";

export default function IntentPrompt({ onConfirm, onSkip, t }) {
  const [val, setVal] = useState("");

  useEffect(() => {
    function handleKey(e) { if (e.key === "Escape") onSkip(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onSkip]);

  return (
    <div style={m.overlay} onClick={onSkip}>
      <div style={m.box} onClick={e => e.stopPropagation()}>
        <div style={m.q}>{t.intentQ}</div>
        <div style={m.sub}>{t.intentSub}</div>
        <input style={m.inp} autoFocus placeholder={t.intentPh}
          value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && val.trim()) onConfirm(val); }} />
        <div style={m.row}>
          <button style={m.skip} onClick={onSkip}>{t.intentSkip}</button>
          <button style={{ ...m.ok, opacity: val.trim() ? 1 : 0.4 }}
            disabled={!val.trim()}
            onClick={() => val.trim() && onConfirm(val)}>{t.intentOk}</button>
        </div>
      </div>
    </div>
  );
}
