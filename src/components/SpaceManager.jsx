import { useState } from "react";
import { EMOJI_OPTIONS, COLOR_OPTIONS } from "../constants/data";
import { m } from "../styles/modalStyles";
import { s } from "../styles/appStyles";

export default function SpaceManager({ spaces, onSave, onClose, t }) {
  const [list, setList] = useState(spaces.map(sp => ({ ...sp })));
  const [editId, setEditId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [nName, setNName] = useState("");
  const [nEmoji, setNEmoji] = useState("\u{1F4A1}");
  const [nColor, setNColor] = useState("#6366F1");
  const upd = (id, k, v) => setList(l => l.map(sp => sp.id === id ? { ...sp, [k]: v } : sp));
  return (
    <div style={m.overlay}>
      <div style={{ ...m.box, width:480, gap:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:17, fontWeight:700 }}>{t.smTitle}</span>
          <button style={s.iconBtn} onClick={onClose}>{"\u2715"}</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {list.map(sp => (
            <div key={sp.id} style={s.smRow}>
              {editId === sp.id ? (
                <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%" }}>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>{EMOJI_OPTIONS.map(e => <button key={e} style={{ ...s.eBtn, ...(sp.emoji===e?s.eBtnA:{}) }} onClick={() => upd(sp.id,"emoji",e)}>{e}</button>)}</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{COLOR_OPTIONS.map(c => <div key={c} style={{ ...s.cBtn, background:c, ...(sp.color===c?s.cBtnA:{}) }} onClick={() => upd(sp.id,"color",c)} />)}</div>
                  <input style={s.smInp} value={sp.name} onChange={e => upd(sp.id,"name",e.target.value)} />
                  <div style={{ display:"flex", gap:8 }}>
                    <button style={s.smOk} onClick={() => setEditId(null)}>{t.smDone}</button>
                    <button style={s.smCan} onClick={() => setEditId(null)}>{t.smCancel}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flex:1 }}>
                    <div style={{ width:30, height:30, borderRadius:7, background:sp.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{sp.emoji}</div>
                    <span style={{ fontSize:14, fontWeight:500 }}>{sp.name}</span>
                  </div>
                  <button style={s.smEditBtn} onClick={() => setEditId(sp.id)}>{t.smEdit}</button>
                  <button style={s.iconBtn} onClick={() => setList(l => l.filter(x => x.id !== sp.id))}>{"\u2715"}</button>
                </>
              )}
            </div>
          ))}
          {adding ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10, padding:12, borderRadius:8, background:"#FAFAF9", border:"1px dashed #E7E5E4" }}>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>{EMOJI_OPTIONS.map(e => <button key={e} style={{ ...s.eBtn, ...(nEmoji===e?s.eBtnA:{}) }} onClick={() => setNEmoji(e)}>{e}</button>)}</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{COLOR_OPTIONS.map(c => <div key={c} style={{ ...s.cBtn, background:c, ...(nColor===c?s.cBtnA:{}) }} onClick={() => setNColor(c)} />)}</div>
              <input style={s.smInp} placeholder={t.smNamePh} value={nName} onChange={e => setNName(e.target.value)} />
              <div style={{ display:"flex", gap:8 }}>
                <button style={s.smOk} onClick={() => { if (nName.trim()) { setList(l => [...l, { id:"s"+Date.now(), name:nName, emoji:nEmoji, color:nColor }]); setAdding(false); setNName(""); } }}>{t.smAdd}</button>
                <button style={s.smCan} onClick={() => setAdding(false)}>{t.smCancel}</button>
              </div>
            </div>
          ) : (
            <button style={{ ...s.smCan, border:"1px dashed #D6D3D1", color:"#A8A29E", padding:10 }} onClick={() => setAdding(true)}>{t.smNew}</button>
          )}
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button style={s.smOk} onClick={() => onSave(list)}>{t.smSave}</button>
        </div>
      </div>
    </div>
  );
}
