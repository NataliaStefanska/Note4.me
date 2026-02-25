import { useState, useRef, useEffect, useCallback } from "react";
import { loginWithGoogle, logout, onAuth, saveUserData, loadUserData } from "./firebase";

// ─── Data ──────────────────────────────────────────────────────────────────
const TODAY = new Date();
const daysAgo = (d) => new Date(TODAY - d * 86400000).toISOString().split("T")[0];
function daysSince(d) { return Math.floor((TODAY - new Date(d)) / 86400000); }

const INITIAL_SPACES = [
  { id: "s1", name: "Praca A",   emoji: "💼", color: "#6366F1" },
  { id: "s2", name: "Praca B",   emoji: "🏗️", color: "#0EA5E9" },
  { id: "s3", name: "Osobiste",  emoji: "🌿", color: "#10B981" },
];

const INITIAL_NOTES = {
  s1: [
    { id:"n1", title:"Pomysły na projekt", tags:["produkt"],
      content:"Research konkurencji — co robią inaczej, czego im brakuje.\n\nRozmowa z Anią ujawniła problem z onboardingiem.",
      tasks:[{id:"t1",text:"Draft onboardingu",done:false},{id:"t2",text:"Spotkanie z teamem",done:true}],
      intent:"Referencja przed piątkowym meetingiem", linkedNotes:[], lastOpened:daysAgo(1), updatedAt:daysAgo(1) },
    { id:"n2", title:"Notatki ze spotkania 17.02", tags:["spotkania"],
      content:"MVP do końca marca. Klient chce prostszy interfejs.\n\nNie dokładać funkcji — dopracować to co jest.",
      tasks:[{id:"t3",text:"Wysłać podsumowanie emailem",done:false}],
      intent:"Ślad decyzji na przyszłość", linkedNotes:[], lastOpened:daysAgo(4), updatedAt:daysAgo(4) },
  ],
  s2: [
    { id:"n3", title:"Q1 roadmap", tags:["strategia"],
      content:"Cele na Q1:\n- Wdrożenie nowego CRM\n- Migracja danych\n- Szkolenie zespołu",
      tasks:[{id:"t4",text:"Prezentacja dla zarządu",done:false}],
      intent:"Plan na pierwsze półrocze", linkedNotes:[], lastOpened:daysAgo(2), updatedAt:daysAgo(2) },
  ],
  s3: [
    { id:"n4", title:"Książki 2025", tags:["rozwój"],
      content:"Atomic Habits — przeczytana ✓\nDune — w trakcie, s. 180",
      tasks:[{id:"t5",text:"Skończyć Dune",done:false}],
      intent:"Wracam co miesiąc żeby zaznaczyć postęp", linkedNotes:[], lastOpened:daysAgo(35), updatedAt:daysAgo(35) },
  ],
};

const EMOJI_OPTIONS = ["💼","🏗️","🌿","🎨","📚","🔬","💡","🏠","✈️","🎯","🛠️","🌍"];
const COLOR_OPTIONS = ["#6366F1","#0EA5E9","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6"];
const SUGGESTED_TAGS = ["produkt","spotkania","strategia","rozwój","osobiste","pomysły","research","decyzje"];
const HUB_COLORS   = ["#6366F1","#0EA5E9","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#F97316","#84CC16"];

// ─── i18n ───────────────────────────────────────────────────────────────────
const T = {
  pl: {
    loginTagline:"Twoje notatki. Twoje zasady.", loginSync:"Synchronizacja między urządzeniami",
    loginSpaces:"Oddzielne przestrzenie robocze", loginGraph:"Graf połączeń między notatkami",
    loginBtn:"Zaloguj się przez Google", loginLegal:"Logując się akceptujesz regulamin · Twoje dane są tylko Twoje",
    intentQ:"Po co ta notatka?", intentSub:"Przemek pyta: jaki cel ma spełniać ta notatka?",
    intentPh:"np. żeby nie zapomnieć decyzji ze spotkania...", intentSkip:"Pomiń", intentOk:"Zacznij pisać →",
    taskQ:"Po co to zadanie?", taskSub:"Przemek pyta: co się zmieni gdy je zrobisz?",
    taskPh:"np. żeby zamknąć temat z klientem przed piątkiem...", taskSkip:"Pomiń pytanie", taskNext:"Dalej →",
    taskWhatQ:"Co konkretnie zrobisz?", taskWhatPh:"np. Wysłać email do Ani...",
    taskBack:"← Wróć", taskAdd:"Dodaj zadanie",
    tagPh:"Wpisz lub wybierz...", tagNone:"Brak wyników", tagCreate:"+ Utwórz",
    smTitle:"Przestrzenie", smEdit:"Edytuj", smDone:"Gotowe", smCancel:"Anuluj",
    smNamePh:"Nazwa przestrzeni...", smAdd:"Dodaj", smNew:"+ Nowa przestrzeń", smSave:"Zapisz",
    tvTitle:"Zadania", tvAll:"wszystkie", tvDateAsc:"↑ data", tvDateDesc:"↓ data",
    tvWithDone:"✓ z zrobionymi", tvOpenOnly:"tylko otwarte", tvFrom:"Od", tvTo:"Do",
    tvClear:"Wyczyść", tvEmpty:"Brak zadań do wyświetlenia", tvNew:"+ Nowe", tvNoTitle:"Bez tytułu",
    navNotes:"Notatki", navTasks:"Zadania", navGraph:"Graf", navSettings:"Ustawienia",
    sbSpace:"Przestrzeń", sbTags:"Tagi", sbAll:"wszystkie",
    sbManage:"⚙ Zarządzaj przestrzeniami", sbSynced:"Zsynchronizowano",
    sbStale1:"notatka czeka na przegląd", sbStaleN:"notatki czekają na przegląd",
    listSearch:"Szukaj...", listNew:"+ Nowa", listEmpty:"Brak notatek · stwórz pierwszą →", listNoTitle:"Bez tytułu",
    edBack:"← Wróć", edSave:"Zapisz", edTags:"Tagi", edTasks:"Zadania",
    edAddTask:"Dodaj zadanie...", edStale:"dni. Nadal potrzebna?",
    edKeep:"Zostaw", edDelete:"Usuń", edTitlePh:"Tytuł...",
    edContentPh:"Pisz to co ważne, nie wszystko co możliwe.",
    graphHintM:"Dotknij węzła · 🟡 = przegląd",
    graphHintD:"Przeciągaj węzły · kliknij by otworzyć · 🟡 = czeka na przegląd",
    setTitle:"Ustawienia", setLang:"Język", setPolish:"Polski", setEnglish:"English",
    setData:"Synchronizacja danych", setDataDesc:"Dane synchronizowane z chmurą Firebase.",
    setProfile:"Profil", setLogout:"Wyloguj się",
    setAbout:"O aplikacji", setAboutDesc:"Note.io — minimalistyczne notatki z grafem połączeń.",
    archiveBtn:"Archiwizuj", unarchiveBtn:"Przywróć", deleteBtn:"Usuń",
    archiveConfirm:"Zarchiwizowano", deleteConfirmQ:"Usunąć tę notatkę?",
    deleteConfirmSub:"Tej operacji nie da się cofnąć.",
    deleteConfirmYes:"Usuń", deleteConfirmNo:"Anuluj",
    sbArchived:"Archiwum", archivedBadge:"zarchiwizowana",
    listShowArchived:"Archiwum", listHideArchived:"Aktywne",
  },
  en: {
    loginTagline:"Your notes. Your rules.", loginSync:"Cross-device synchronization",
    loginSpaces:"Separate workspaces", loginGraph:"Connection graph between notes",
    loginBtn:"Sign in with Google", loginLegal:"By signing in you accept the terms · Your data is yours only",
    intentQ:"What is this note for?", intentSub:"Przemek asks: what purpose should this note serve?",
    intentPh:"e.g. to not forget decisions from the meeting...", intentSkip:"Skip", intentOk:"Start writing →",
    taskQ:"What is this task for?", taskSub:"Przemek asks: what will change when you do it?",
    taskPh:"e.g. to close the issue with the client before Friday...", taskSkip:"Skip question", taskNext:"Next →",
    taskWhatQ:"What exactly will you do?", taskWhatPh:"e.g. Send email to Anna...",
    taskBack:"← Back", taskAdd:"Add task",
    tagPh:"Type or choose...", tagNone:"No results", tagCreate:"+ Create",
    smTitle:"Spaces", smEdit:"Edit", smDone:"Done", smCancel:"Cancel",
    smNamePh:"Space name...", smAdd:"Add", smNew:"+ New space", smSave:"Save",
    tvTitle:"Tasks", tvAll:"all", tvDateAsc:"↑ date", tvDateDesc:"↓ date",
    tvWithDone:"✓ with done", tvOpenOnly:"open only", tvFrom:"From", tvTo:"To",
    tvClear:"Clear", tvEmpty:"No tasks to display", tvNew:"+ New", tvNoTitle:"Untitled",
    navNotes:"Notes", navTasks:"Tasks", navGraph:"Graph", navSettings:"Settings",
    sbSpace:"Space", sbTags:"Tags", sbAll:"all",
    sbManage:"⚙ Manage spaces", sbSynced:"Synchronized",
    sbStale1:"note awaits review", sbStaleN:"notes await review",
    listSearch:"Search...", listNew:"+ New", listEmpty:"No notes · create your first →", listNoTitle:"Untitled",
    edBack:"← Back", edSave:"Save", edTags:"Tags", edTasks:"Tasks",
    edAddTask:"Add task...", edStale:"days. Still needed?",
    edKeep:"Keep", edDelete:"Delete", edTitlePh:"Title...",
    edContentPh:"Write what matters, not everything possible.",
    graphHintM:"Tap a node · 🟡 = review",
    graphHintD:"Drag nodes · click to open · 🟡 = awaits review",
    setTitle:"Settings", setLang:"Language", setPolish:"Polski", setEnglish:"English",
    setData:"Data sync", setDataDesc:"Data synchronized with Firebase cloud.",
    setProfile:"Profile", setLogout:"Log out",
    setAbout:"About", setAboutDesc:"Note.io — minimalist notes with a connection graph.",
    archiveBtn:"Archive", unarchiveBtn:"Restore", deleteBtn:"Delete",
    archiveConfirm:"Archived", deleteConfirmQ:"Delete this note?",
    deleteConfirmSub:"This action cannot be undone.",
    deleteConfirmYes:"Delete", deleteConfirmNo:"Cancel",
    sbArchived:"Archive", archivedBadge:"archived",
    listShowArchived:"Archive", listHideArchived:"Active",
  },
};

// ─── Hook ──────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [v, set] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const fn = () => set(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return v;
}

// ─── Login ─────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, t }) {
  return (
    <div style={ls.wrap}>
      <div style={ls.card}>
        <div style={ls.logoRow}><div style={ls.logoBox}>N</div><span style={ls.logoName}>Note.io</span></div>
        <div style={ls.tagline}>{t.loginTagline}</div>
        <div style={ls.feats}>
          <div style={ls.feat}><span>⚡</span> {t.loginSync}</div>
          <div style={ls.feat}><span>🗂️</span> {t.loginSpaces}</div>
          <div style={ls.feat}><span>🔗</span> {t.loginGraph}</div>
        </div>
        <button style={ls.btn} onClick={onLogin}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
          </svg>
          {t.loginBtn}
        </button>
        <div style={ls.legal}>{t.loginLegal}</div>
      </div>
    </div>
  );
}

// ─── Intent Prompt (notatka) ────────────────────────────────────────────────
function IntentPrompt({ onConfirm, onSkip, t }) {
  const [val, setVal] = useState("");
  return (
    <div style={m.overlay}>
      <div style={m.box}>
        <div style={m.q}>{t.intentQ}</div>
        <div style={m.sub}>{t.intentSub}</div>
        <input style={m.inp} autoFocus placeholder={t.intentPh}
          value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && val.trim()) onConfirm(val); }} />
        <div style={m.row}>
          <button style={m.skip} onClick={onSkip}>{t.intentSkip}</button>
          <button style={{ ...m.ok, opacity: val.trim() ? 1 : 0.4 }}
            onClick={() => val.trim() && onConfirm(val)}>{t.intentOk}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Intent Modal ──────────────────────────────────────────────────────
function TaskIntentModal({ color, onConfirm, onClose, t }) {
  const [step, setStep] = useState("why");
  const [why, setWhy] = useState("");
  const [what, setWhat] = useState("");
  const whatRef = useRef();

  function goNext() {
    setStep("what");
    setTimeout(() => { if (whatRef.current) whatRef.current.focus(); }, 60);
  }

  function finish() {
    if (!what.trim()) return;
    onConfirm(why, what);
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
            {why.trim() && <div style={{ fontSize:12, color:"#A8A29E", fontStyle:"italic", marginBottom:8 }}>→ {why}</div>}
            <input ref={whatRef} style={m.inp} placeholder={t.taskWhatPh}
              value={what} onChange={e => setWhat(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") finish(); }} />
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

// ─── Tag Picker ─────────────────────────────────────────────────────────────
function TagPicker({ active, onSelect, onClose, t }) {
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
      {canCreate && <button style={{ ...s.pickerItem, color:"#6366F1" }} onClick={() => onSelect(q.trim())}>{t.tagCreate} „{q.trim()}"</button>}
      {!list.length && !canCreate && <div style={{ fontSize:11, color:"#A8A29E", padding:"4px 8px" }}>{t.tagNone}</div>}
    </div>
  );
}

// ─── Space Manager ───────────────────────────────────────────────────────────
function SpaceManager({ spaces, onSave, onClose, t }) {
  const [list, setList] = useState(spaces.map(sp => ({ ...sp })));
  const [editId, setEditId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [nName, setNName] = useState("");
  const [nEmoji, setNEmoji] = useState("💡");
  const [nColor, setNColor] = useState("#6366F1");
  const upd = (id, k, v) => setList(l => l.map(sp => sp.id === id ? { ...sp, [k]: v } : sp));
  return (
    <div style={m.overlay}>
      <div style={{ ...m.box, width:480, gap:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:17, fontWeight:700 }}>{t.smTitle}</span>
          <button style={s.iconBtn} onClick={onClose}>✕</button>
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
                  <button style={s.iconBtn} onClick={() => setList(l => l.filter(x => x.id !== sp.id))}>✕</button>
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

// ─── Tasks View ───────────────────────────────────────────────────────────────
function TasksView({ notes, color, allTags, onOpenNote, onCreate, onToggleTask, standaloneTasks, onToggleStandaloneTask, t }) {
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
          <button style={{ ...s.ctrlBtn, ...(showDate||from||to?{color,background:color+"15"}:{}) }} onClick={() => setShowDate(v => !v)}>📅</button>
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
        {tasks.map((tk, i) => (
          <div key={tk.id + "-" + i} style={s.tvRow}>
            <div style={{ ...s.chk, ...(tk.done?{background:color,borderColor:color}:{}) }} onClick={() => tk.standalone ? onToggleStandaloneTask(tk.id) : onToggleTask(tk.note.id, tk.id)}>
              {tk.done && <span style={{ color:"#fff", fontSize:10 }}>✓</span>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:500, textDecoration:tk.done?"line-through":"none", color:tk.done?"#A8A29E":"#1C1917" }}>{tk.text}</div>
              {tk.standalone ? (
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginTop:3 }}>
                  <span style={{ fontSize:11, color:"#A8A29E" }}>{tk.noteDate}</span>
                  {tk.intent && <span style={{ fontSize:11, fontStyle:"italic", color:"#A8A29E" }}>→ {tk.intent}</span>}
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

// ─── Force Graph ─────────────────────────────────────────────────────────────
function ForceGraph({ notes, spaceColor, onOpenNote }) {
  const svgRef = useRef();
  const nodes = useRef([]);
  const links = useRef([]);
  const raf = useRef();
  const drag = useRef(null);
  const clickStart = useRef(null);
  const [, redraw] = useState(0);
  const [hov, setHov] = useState(null);

  useEffect(() => {
    const W = svgRef.current ? svgRef.current.clientWidth : 720;
    const H = svgRef.current ? svgRef.current.clientHeight : 500;
    const allTags = [...new Set(notes.flatMap(n => n.tags))];
    const byId = new Map(nodes.current.map(n => [n.id, n]));

    const tagNodes = allTags.map((tag, i) => {
      const id = "tag:" + tag;
      if (byId.has(id)) return { ...byId.get(id), tag };
      const a = (i / allTags.length) * 2 * Math.PI;
      return { id, tag, kind:"tag", color:HUB_COLORS[i % HUB_COLORS.length],
        x:W/2+Math.cos(a)*120+(Math.random()-.5)*60, y:H/2+Math.sin(a)*120+(Math.random()-.5)*60,
        vx:0, vy:0, fx:0, fy:0 };
    });

    const noteNodes = notes.map(note => {
      if (byId.has(note.id)) return { ...byId.get(note.id), note };
      return { id:note.id, note, kind:"note",
        x:W*.15+Math.random()*W*.7, y:H*.15+Math.random()*H*.7,
        vx:0, vy:0, fx:0, fy:0 };
    });

    nodes.current = [...tagNodes, ...noteNodes];
    links.current = notes.flatMap(n => n.tags.map(tag => ({ s:n.id, t:"tag:"+tag })));
  }, [notes]);

  useEffect(() => {
    function tick() {
      const ns = nodes.current;
      const ls = links.current;
      const W = svgRef.current ? svgRef.current.clientWidth : 720;
      const H = svgRef.current ? svgRef.current.clientHeight : 500;
      ns.forEach(n => { n.fx=0; n.fy=0; });
      for (let i=0;i<ns.length;i++) {
        for (let j=i+1;j<ns.length;j++) {
          const a=ns[i], b=ns[j];
          const dx=b.x-a.x, dy=b.y-a.y, dist=Math.sqrt(dx*dx+dy*dy)||1;
          const r = a.kind==="tag"&&b.kind==="tag" ? 5000 : a.kind==="tag"||b.kind==="tag" ? 1400 : 2200;
          const f=r/(dist*dist), fx=(dx/dist)*f, fy=(dy/dist)*f;
          a.fx-=fx; a.fy-=fy; b.fx+=fx; b.fy+=fy;
        }
      }
      ls.forEach(({ s, t }) => {
        const a=ns.find(n=>n.id===s), b=ns.find(n=>n.id===t);
        if (!a||!b) return;
        const dx=b.x-a.x, dy=b.y-a.y, dist=Math.sqrt(dx*dx+dy*dy)||1;
        const f=(dist-130)*0.014, fx=(dx/dist)*f, fy=(dy/dist)*f;
        a.fx+=fx; a.fy+=fy; b.fx-=fx; b.fy-=fy;
      });
      ns.forEach(n => {
        n.fx+=(W/2-n.x)*(n.kind==="tag"?.005:.002);
        n.fy+=(H/2-n.y)*(n.kind==="tag"?.005:.002);
      });
      ns.forEach(n => {
        if (drag.current===n.id) return;
        n.vx=(n.vx+n.fx)*.92; n.vy=(n.vy+n.fy)*.92;
        n.x=Math.max(50,Math.min(W-50,n.x+n.vx));
        n.y=Math.max(50,Math.min(H-50,n.y+n.vy));
      });
      redraw(c=>c+1);
      raf.current=requestAnimationFrame(tick);
    }
    raf.current=requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  useEffect(() => {
    function mv(e) {
      if (!drag.current||!svgRef.current) return;
      if (e.cancelable) e.preventDefault();
      const r=svgRef.current.getBoundingClientRect();
      const cx=e.touches?e.touches[0].clientX:e.clientX;
      const cy=e.touches?e.touches[0].clientY:e.clientY;
      const nd=nodes.current.find(n=>n.id===drag.current);
      if (nd) { nd.x=cx-r.left; nd.y=cy-r.top; nd.vx=0; nd.vy=0; }
    }
    function up() { drag.current=null; }
    window.addEventListener("mousemove",mv);
    window.addEventListener("mouseup",up);
    window.addEventListener("touchmove",mv,{passive:false});
    window.addEventListener("touchend",up);
    return () => {
      window.removeEventListener("mousemove",mv);
      window.removeEventListener("mouseup",up);
      window.removeEventListener("touchmove",mv);
      window.removeEventListener("touchend",up);
    };
  }, []);

  function onDown(e, id) {
    e.stopPropagation();
    drag.current=id;
    const cx=e.clientX||(e.touches&&e.touches[0]&&e.touches[0].clientX)||0;
    const cy=e.clientY||(e.touches&&e.touches[0]&&e.touches[0].clientY)||0;
    clickStart.current={id, time:Date.now(), x:cx, y:cy};
    const nd=nodes.current.find(n=>n.id===id);
    if (nd) { nd.vx=0; nd.vy=0; }
  }

  function onUp(e, node) {
    drag.current=null;
    const cs=clickStart.current;
    if (!cs||cs.id!==node.id) return;
    const cx=e.clientX||(e.changedTouches&&e.changedTouches[0]&&e.changedTouches[0].clientX)||cs.x;
    const cy=e.clientY||(e.changedTouches&&e.changedTouches[0]&&e.changedTouches[0].clientY)||cs.y;
    if (Date.now()-cs.time<250&&Math.hypot(cx-cs.x,cy-cs.y)<8&&node.kind==="note") onOpenNote(node.note);
    clickStart.current=null;
  }

  const hovLinks=hov ? links.current.filter(l=>l.s===hov||l.t===hov) : [];
  const conn=new Set(hovLinks.flatMap(l=>[l.s,l.t]));

  return (
    <svg ref={svgRef} width="100%" height="100%" style={{ display:"block" }}>
      <defs>
        <radialGradient id="gbg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1C1917"/><stop offset="100%" stopColor="#080604"/>
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#gbg)"/>
      {links.current.map((l,i) => {
        const a=nodes.current.find(n=>n.id===l.s), b=nodes.current.find(n=>n.id===l.t);
        if (!a||!b) return null;
        const hot=hov&&(l.s===hov||l.t===hov);
        const tn=nodes.current.find(n=>n.kind==="tag"&&(n.id===l.s||n.id===l.t));
        const lc=tn?tn.color:spaceColor;
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hot?lc+"EE":lc+"30"} strokeWidth={hot?2:.8} style={{ transition:"stroke .15s" }}/>;
      })}
      {nodes.current.filter(n=>n.kind==="tag").map(node => {
        const h=hov===node.id, cd=conn.has(node.id), dim=hov&&!h&&!cd;
        const R=18+notes.filter(n=>n.tags.includes(node.tag)).length*4;
        return (
          <g key={node.id} style={{ cursor:"grab" }}
            onMouseEnter={()=>setHov(node.id)} onMouseLeave={()=>setHov(null)}
            onMouseDown={e=>onDown(e,node.id)} onMouseUp={e=>onUp(e,node)}
            onTouchStart={e=>onDown(e,node.id)} onTouchEnd={e=>onUp(e,node)}>
            {h && <circle cx={node.x} cy={node.y} r={R+10} fill="none" stroke={node.color} strokeWidth="1" opacity=".25" filter="url(#glow)"/>}
            <circle cx={node.x} cy={node.y} r={h?R+4:R} fill={dim?"#232120":node.color} style={{ transition:"r .15s,fill .2s" }}/>
            {h && <text x={node.x} y={node.y-R-10} textAnchor="middle" fill={node.color} fontSize="11" fontWeight="600" style={{ pointerEvents:"none", userSelect:"none" }}>#{node.tag}</text>}
          </g>
        );
      })}
      {nodes.current.filter(n=>n.kind==="note").map(node => {
        const h=hov===node.id, cd=conn.has(node.id), dim=hov&&!h&&!cd;
        const stale=daysSince(node.note.lastOpened)>=30;
        const R=h?11:7;
        const tn=nodes.current.find(n=>n.kind==="tag"&&n.tag===node.note.tags[0]);
        const nc=tn?tn.color:spaceColor;
        const title=node.note.title||"Bez tytułu";
        return (
          <g key={node.id} style={{ cursor:"grab" }}
            onMouseEnter={()=>setHov(node.id)} onMouseLeave={()=>setHov(null)}
            onMouseDown={e=>onDown(e,node.id)} onMouseUp={e=>onUp(e,node)}
            onTouchStart={e=>onDown(e,node.id)} onTouchEnd={e=>onUp(e,node)}>
            {h && <circle cx={node.x} cy={node.y} r={R+8} fill={nc+"25"} filter="url(#glow)"/>}
            <circle cx={node.x} cy={node.y} r={R} fill={dim?"#232120":nc} style={{ transition:"r .12s,fill .15s" }}/>
            {stale&&!dim && <circle cx={node.x+R} cy={node.y-R} r="3.5" fill="#F59E0B"/>}
            <text x={node.x} y={node.y+R+12} textAnchor="middle"
              fill={dim?"#1e1c1a":h?"#E7E5E4":"#3D3A38"} fontSize="10"
              style={{ pointerEvents:"none", userSelect:"none", transition:"fill .15s" }}>
              {title.length>22?title.slice(0,22)+"…":title}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function NoteIO() {
  // ALL hooks before any return
  const [lang,        setLang]        = useState(() => { try { return localStorage.getItem("noteio_lang") || "pl"; } catch { return "pl"; } });
  const [user,        setUser]        = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [spaces,      setSpaces]      = useState(INITIAL_SPACES);
  const [activeSpace, setActiveSpace] = useState("s1");
  const [allNotes,    setAllNotes]    = useState(INITIAL_NOTES);
  const [standaloneTasks, setStandaloneTasks] = useState({});
  const [view,        setView]        = useState("list");
  const [active,      setActive]      = useState(null);
  const [search,      setSearch]      = useState("");
  const [filterTag,   setFilterTag]   = useState(null);
  const [newTask,     setNewTask]     = useState("");
  const [showIntent,  setShowIntent]  = useState(false);
  const [showTask,    setShowTask]    = useState(false);
  const [showTagPick, setShowTagPick] = useState(false);
  const [showSpaceMgr,setShowSpaceMgr]= useState(false);
  const [showDrop,    setShowDrop]    = useState(false);
  const [sortOrder,   setSortOrder]   = useState("desc");
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [showDate,    setShowDate]    = useState(false);
  const [showDrawer,  setShowDrawer]  = useState(false);
  const [showArchived,setShowArchived]= useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [syncStatus,  setSyncStatus]  = useState("idle");
  const isMobile = useIsMobile();
  const titleRef = useRef();
  const t = T[lang] || T.pl;
  const saveTimer = useRef(null);

  // ─── Firebase Auth listener ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuth(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setSyncStatus("loading");
        try {
          const data = await loadUserData(firebaseUser.uid);
          if (data) {
            if (data.spaces) setSpaces(data.spaces);
            if (data.activeSpace) setActiveSpace(data.activeSpace);
            if (data.allNotes) setAllNotes(data.allNotes);
            if (data.standaloneTasks) setStandaloneTasks(data.standaloneTasks);
            if (data.lang) setLang(data.lang);
          }
          setSyncStatus("synced");
        } catch {
          setSyncStatus("error");
        }
      } else {
        setUser(null);
        setSpaces(INITIAL_SPACES);
        setAllNotes(INITIAL_NOTES);
        setStandaloneTasks({});
        setActiveSpace("s1");
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ─── Debounced Firestore save ───────────────────────────────────────────
  const syncToFirestore = useCallback((data) => {
    if (!user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSyncStatus("saving");
      try {
        await saveUserData(user.uid, data);
        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
      }
    }, 1500);
  }, [user]);

  useEffect(() => { try { localStorage.setItem("noteio_lang", lang); } catch {} }, [lang]);
  useEffect(() => {
    if (!user || authLoading) return;
    syncToFirestore({ spaces, activeSpace, allNotes, standaloneTasks, lang });
  }, [spaces, activeSpace, allNotes, standaloneTasks, lang, user, authLoading, syncToFirestore]);

  const notes  = allNotes[activeSpace] || [];
  const space  = spaces.find(sp => sp.id===activeSpace) || spaces[0];
  const allTags= [...new Set([...notes.flatMap(n=>n.tags), ...(active ? active.tags : [])])];
  const staleN = notes.filter(n=>daysSince(n.lastOpened)>=30).length;

  const archivedN = notes.filter(n=>n.archived).length;

  const filtered = notes
    .filter(n => {
      const ma = showArchived ? !!n.archived : !n.archived;
      const mt = filterTag ? n.tags.includes(filterTag) : true;
      const ms = search ? n.title.toLowerCase().includes(search.toLowerCase())||n.content.toLowerCase().includes(search.toLowerCase()) : true;
      const mf = dateFrom ? n.updatedAt>=dateFrom : true;
      const mtd= dateTo   ? n.updatedAt<=dateTo   : true;
      return ma&&mt&&ms&&mf&&mtd;
    })
    .sort((a,b)=>sortOrder==="desc"?b.updatedAt.localeCompare(a.updatedAt):a.updatedAt.localeCompare(b.updatedAt));

  function switchSpace(id) { setActiveSpace(id); setView("list"); setActive(null); setFilterTag(null); setSearch(""); setShowDrop(false); }
  function createNote()   { setShowIntent(true); }
  function createTask()   { setShowTask(true); }

  function handleIntent(intent) {
    const n={ id:"n"+Date.now(), title:"", content:"", tags:[], linkedNotes:[], tasks:[], intent,
      updatedAt:TODAY.toISOString().split("T")[0], lastOpened:TODAY.toISOString().split("T")[0] };
    setAllNotes(p=>({...p,[activeSpace]:[n,...(p[activeSpace]||[])]}));
    setActive({...n}); setShowIntent(false); setView("editor");
    setTimeout(()=>{ if(titleRef.current) titleRef.current.focus(); },80);
  }

  function handleTaskIntent(why, what) {
    const task = { id:"t"+Date.now(), text:what, done:false, intent:why,
      createdAt:TODAY.toISOString().split("T")[0] };
    setStandaloneTasks(p=>({...p,[activeSpace]:[task,...(p[activeSpace]||[])]}));
    setShowTask(false);
  }

  function openNote(note)  { setActive({...note, lastOpened:TODAY.toISOString().split("T")[0]}); setView("editor"); }
  function saveNote()      { if(!active) return; setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).map(n=>n.id===active.id?{...active}:n)})); }
  function toggleTask(id)  {
    setActive(p=>{
      const updated = {...p, tasks:p.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)};
      setAllNotes(prev=>({...prev,[activeSpace]:(prev[activeSpace]||[]).map(n=>n.id===updated.id?{...updated}:n)}));
      return updated;
    });
  }
  function toggleTaskInList(noteId, taskId) {
    setAllNotes(prev=>({...prev,[activeSpace]:(prev[activeSpace]||[]).map(n=>n.id===noteId?{...n,tasks:n.tasks.map(t=>t.id===taskId?{...t,done:!t.done}:t)}:n)}));
  }
  function toggleStandaloneTask(taskId) {
    setStandaloneTasks(prev=>({...prev,[activeSpace]:(prev[activeSpace]||[]).map(t=>t.id===taskId?{...t,done:!t.done}:t)}));
  }
  function addTask()       { if(!newTask.trim()) return; setActive(p=>({...p,tasks:[...p.tasks,{id:"t"+Date.now(),text:newTask,done:false}]})); setNewTask(""); }
  function toggleTag(tag)  {
    setActive(p=>{
      const updated = {...p, tags:p.tags.includes(tag)?p.tags.filter(t=>t!==tag):[...p.tags,tag]};
      setAllNotes(prev=>({...prev,[activeSpace]:(prev[activeSpace]||[]).map(n=>n.id===updated.id?{...updated}:n)}));
      return updated;
    });
  }

  function deleteNote(noteId) {
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).filter(n=>n.id!==noteId)}));
    if (active && active.id===noteId) { setActive(null); setView("list"); }
    setShowDeleteConfirm(null);
  }
  function archiveNote(noteId) {
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).map(n=>n.id===noteId?{...n,archived:true}:n)}));
    if (active && active.id===noteId) { setActive(null); setView("list"); }
  }
  function unarchiveNote(noteId) {
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).map(n=>n.id===noteId?{...n,archived:false}:n)}));
    if (active && active.id===noteId) setActive(prev=>({...prev, archived:false}));
  }

  // ─── Auth handlers ─────────────────────────────────────────────────────
  async function handleLogin() {
    try { await loginWithGoogle(); } catch (e) { console.error("Login failed:", e); }
  }
  async function handleLogout() {
    try { await logout(); setView("list"); } catch (e) { console.error("Logout failed:", e); }
  }

  // Conditional return AFTER all hooks
  if (authLoading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#0C0A09" }}>
      <div style={{ color:"#57534E", fontSize:14 }}>Loading...</div>
    </div>
  );
  if (!user) return <LoginScreen onLogin={handleLogin} t={t} />;

  const NAV = [
    { id:"list",  label:t.navNotes, icon:<svg width="20" height="20" viewBox="0 0 13 13" fill="none"><rect x="1" y="1.5" width="11" height="1.4" rx=".7" fill="currentColor"/><rect x="1" y="5.5" width="11" height="1.4" rx=".7" fill="currentColor"/><rect x="1" y="9.5" width="7" height="1.4" rx=".7" fill="currentColor"/></svg> },
    { id:"tasks", label:t.navTasks, icon:<svg width="20" height="20" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M3.5 6.5l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { id:"graph", label:t.navGraph, icon:<svg width="20" height="20" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="1.8" stroke="currentColor" strokeWidth="1.3"/><circle cx="2" cy="2.5" r="1.3" stroke="currentColor" strokeWidth="1.1"/><circle cx="11" cy="2.5" r="1.3" stroke="currentColor" strokeWidth="1.1"/><circle cx="6.5" cy="11.5" r="1.3" stroke="currentColor" strokeWidth="1.1"/><line x1="3" y1="3.3" x2="5.5" y2="5.5" stroke="currentColor" strokeWidth=".9"/><line x1="10" y1="3.3" x2="7.5" y2="5.5" stroke="currentColor" strokeWidth=".9"/><line x1="6.5" y1="8.3" x2="6.5" y2="10.2" stroke="currentColor" strokeWidth=".9"/></svg> },
    { id:"settings", label:t.navSettings, icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
  ];

  function SidebarBody({ onClose }) {
    const ALL = t.sbAll;
    const sidebarNav = NAV.filter(item => item.id !== "settings");
    return (
      <>
        {onClose && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={s.logo}><div style={s.logoMark}>N</div><span style={s.logoTxt}>Note.io</span></div>
            <button style={s.iconBtn} onClick={onClose}>✕</button>
          </div>
        )}
        <div style={s.label}>{t.sbSpace}</div>
        <div style={{ position:"relative" }}>
          <button style={{ ...s.spacePill, borderColor:space.color+"88" }} onClick={()=>setShowDrop(v=>!v)}>
            <span>{space.emoji}</span><span style={{ flex:1, textAlign:"left", fontSize:13, fontWeight:500 }}>{space.name}</span><span style={{ color:"#57534E", fontSize:11 }}>▾</span>
          </button>
          {showDrop && (
            <div style={s.drop}>
              {spaces.map(sp=>(
                <button key={sp.id} style={{ ...s.dropItem, ...(sp.id===activeSpace?{background:"#292524",color:"#E7E5E4"}:{}) }}
                  onClick={()=>{ switchSpace(sp.id); if(onClose)onClose(); }}>
                  <span style={{ width:8,height:8,borderRadius:"50%",background:sp.color,flexShrink:0,display:"inline-block" }}/>
                  <span>{sp.emoji}</span>
                  <span style={{ flex:1, textAlign:"left" }}>{sp.name}</span>
                  {sp.id===activeSpace && <span style={{ color:space.color, fontSize:12 }}>✓</span>}
                </button>
              ))}
              <div style={s.div}/>
              <button style={s.dropManage} onClick={()=>{ setShowDrop(false); setShowSpaceMgr(true); if(onClose)onClose(); }}>{t.sbManage}</button>
            </div>
          )}
        </div>
        <div style={s.div}/>
        {sidebarNav.map(item=>(
          <button key={item.id} style={{ ...s.navBtn, ...(view===item.id?s.navActive:{}) }}
            onClick={()=>{ setView(item.id); if(onClose)onClose(); }}>
            {item.icon}<span style={{ fontSize:13 }}>{item.label}</span>
          </button>
        ))}
        <div style={s.div}/>
        <div style={s.label}>{t.sbTags}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
          {[ALL,...allTags].map(tag=>{
            const a=tag===ALL?filterTag===null:filterTag===tag;
            return (
              <button key={tag} style={{ ...s.tagPill, ...(a?{background:space.color+"22",color:space.color}:{}) }}
                onClick={()=>{ setFilterTag(tag===ALL?null:(filterTag===tag?null:tag)); if(onClose)onClose(); }}>
                {tag}
              </button>
            );
          })}
        </div>
        <div style={{ flex:1 }}/>
        {archivedN>0 && (
          <button style={{ ...s.staleHint, background:showArchived?"#EDE9FE":"#F5F3FF", color:"#5B21B6", border:"none", cursor:"pointer", fontFamily:"inherit", width:"100%", textAlign:"left", marginBottom:2 }}
            onClick={()=>{ setShowArchived(v=>!v); setView("list"); if(onClose)onClose(); }}>
            📦 {archivedN} {t.sbArchived}
          </button>
        )}
        {staleN>0 && <div style={s.staleHint}>⏳ {staleN} {staleN===1?t.sbStale1:t.sbStaleN}</div>}
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 6px" }}>
          <span style={{ width:6,height:6,borderRadius:"50%",background:syncStatus==="synced"?"#10B981":syncStatus==="saving"?"#F59E0B":"#EF4444",flexShrink:0 }}/>
          <span style={{ fontSize:11, color:"#57534E" }}>{syncStatus==="synced"?t.sbSynced:syncStatus==="saving"?"...":(syncStatus==="error"?"!":t.sbSynced)}</span>
        </div>
      </>
    );
  }

  return (
    <div style={s.root}>
      {showIntent  && <IntentPrompt onConfirm={handleIntent} onSkip={()=>handleIntent("")} t={t}/>}
      {showTask    && <TaskIntentModal color={space.color} onConfirm={handleTaskIntent} onClose={()=>setShowTask(false)} t={t}/>}
      {showSpaceMgr&& <SpaceManager spaces={spaces} onSave={u=>{setSpaces(u);setShowSpaceMgr(false);}} onClose={()=>setShowSpaceMgr(false)} t={t}/>}
      {showDeleteConfirm && (
        <div style={m.overlay} onClick={()=>setShowDeleteConfirm(null)}>
          <div style={{ ...m.box, maxWidth:360 }} onClick={e=>e.stopPropagation()}>
            <div style={m.q}>{t.deleteConfirmQ}</div>
            <div style={m.sub}>{t.deleteConfirmSub}</div>
            <div style={m.row}>
              <button style={m.skip} onClick={()=>setShowDeleteConfirm(null)}>{t.deleteConfirmNo}</button>
              <button style={{ ...m.ok, background:"#EF4444" }} onClick={()=>deleteNote(showDeleteConfirm)}>{t.deleteConfirmYes}</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile && showDrawer && (
        <div style={s.drawerOverlay} onClick={()=>setShowDrawer(false)}>
          <div style={s.drawer} onClick={e=>e.stopPropagation()}>
            <SidebarBody onClose={()=>setShowDrawer(false)}/>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={s.sidebar}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={s.logo}><div style={s.logoMark}>N</div><span style={s.logoTxt}>Note.io</span></div>
            {user.photoURL
              ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={{ ...s.avatar, ...(view==="settings"?{borderColor:space.color,boxShadow:"0 0 0 2px "+space.color+"44"}:{}) }} onClick={()=>setView("settings")} />
              : <div style={{ ...s.avatar, ...(view==="settings"?{borderColor:space.color,boxShadow:"0 0 0 2px "+space.color+"44"}:{}) }} onClick={()=>setView("settings")}>{(user.displayName||"U")[0]}</div>
            }
          </div>
          <SidebarBody/>
        </div>
      )}

      {/* Main */}
      <div style={{ ...s.main, paddingBottom:isMobile?70:0 }}>

        {/* Mobile topbar */}
        {isMobile && view!=="editor" && view!=="settings" && (
          <div style={s.topBar}>
            <button style={s.menuBtn} onClick={()=>setShowDrawer(true)}>
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="4"   width="14" height="1.8" rx=".9" fill="#E7E5E4"/>
                <rect x="2" y="8.1" width="14" height="1.8" rx=".9" fill="#E7E5E4"/>
                <rect x="2" y="12.2" width="9" height="1.8" rx=".9" fill="#E7E5E4"/>
              </svg>
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:16 }}>{space.emoji}</span>
              <span style={{ fontSize:15, fontWeight:600, color:space.color }}>{space.name}</span>
              {filterTag && <span style={{ ...s.tinyTag, background:space.color+"22", color:space.color }}>{filterTag}</span>}
            </div>
            {user.photoURL
              ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={s.avatar} onClick={()=>setView("settings")} />
              : <div style={s.avatar} onClick={()=>setView("settings")}>{(user.displayName||"U")[0]}</div>
            }
          </div>
        )}

        {/* LIST */}
        {view==="list" && (
          <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
            <div style={s.listHead}>
              {!isMobile && (
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                  <span style={{ fontSize:22 }}>{space.emoji}</span>
                  <span style={{ fontSize:18, fontWeight:700, color:space.color }}>{space.name}</span>
                  <span style={s.badge}>{filtered.length}/{notes.length}</span>
                </div>
              )}
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input style={s.searchBox} placeholder={t.listSearch} value={search} onChange={e=>setSearch(e.target.value)}/>
                <button style={{ ...s.ctrlBtn, ...(showArchived?{background:space.color+"18",color:space.color,borderColor:space.color+"44"}:{}) }}
                  onClick={()=>setShowArchived(v=>!v)}>
                  {showArchived ? "📦" : "📋"}
                </button>
                <button style={{ ...s.ctrlBtn, ...(sortOrder==="desc"?{color:space.color}:{}) }} onClick={()=>setSortOrder(v=>v==="desc"?"asc":"desc")}>{sortOrder==="desc"?"↓":"↑"}</button>
                <button style={{ ...s.ctrlBtn, ...(showDate||dateFrom||dateTo?{color:space.color,background:space.color+"15"}:{}) }} onClick={()=>setShowDate(v=>!v)}>📅</button>
                {!isMobile && <button style={{ ...s.ctrlBtn, background:space.color, color:"#fff", border:"none" }} onClick={createNote}>{t.listNew}</button>}
              </div>
              {showArchived && (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:12, color:"#7C3AED", fontWeight:500 }}>📦 {t.listShowArchived}</span>
                  <span style={s.badge}>{archivedN}</span>
                </div>
              )}
              {showDate && (
                <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}><span style={{ fontSize:11, color:"#A8A29E" }}>{t.tvFrom}</span><input type="date" style={s.dateInp} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}><span style={{ fontSize:11, color:"#A8A29E" }}>{t.tvTo}</span><input type="date" style={s.dateInp} value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div>
                  {(dateFrom||dateTo) && <button style={s.clearBtn} onClick={()=>{setDateFrom("");setDateTo("");}}>{t.tvClear}</button>}
                </div>
              )}
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"16px 8px 8px" }}>
              {filtered.length===0 && <div style={s.empty}>{t.listEmpty}</div>}
              {filtered.map(note=>{
                const stale=daysSince(note.lastOpened)>=30;
                const done=note.tasks.filter(t=>t.done).length;
                return (
                  <div key={note.id} style={{ ...s.noteRow, opacity:stale&&!note.archived?.55:1 }}>
                    <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:3, cursor:"pointer" }} onClick={()=>openNote(note)}>
                      <div style={{ fontSize:14, fontWeight:600, color:"#1C1917" }}>{note.title||t.listNoTitle}</div>
                      {note.intent && <div style={{ fontSize:11, color:"#A8A29E", fontStyle:"italic" }}>→ {note.intent}</div>}
                      <div style={{ fontSize:12, color:"#78716C", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{note.content.slice(0,72)}{note.content.length>72?"…":""}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                        <div style={{ fontSize:10, color:"#A8A29E" }}>{note.updatedAt}</div>
                        <div style={{ display:"flex", gap:2 }}>
                          {note.archived ? (
                            <button style={s.rowAction} onClick={e=>{e.stopPropagation();unarchiveNote(note.id);}} title={t.unarchiveBtn}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                            </button>
                          ) : (
                            <button style={s.rowAction} onClick={e=>{e.stopPropagation();archiveNote(note.id);}} title={t.archiveBtn}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                            </button>
                          )}
                          <button style={{ ...s.rowAction, color:"#EF4444" }} onClick={e=>{e.stopPropagation();setShowDeleteConfirm(note.id);}} title={t.deleteBtn}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap", justifyContent:"flex-end" }}>{note.tags.map(t=><span key={t} style={s.tinyTag}>{t}</span>)}</div>
                      {note.tasks.length>0 && <div style={{ fontSize:10, color:"#A8A29E" }}>{done}/{note.tasks.length}</div>}
                      {stale && !note.archived && <div style={{ width:6,height:6,borderRadius:"50%",background:"#F59E0B" }}/>}
                      {note.archived && <span style={{ fontSize:9, color:"#7C3AED", background:"#EDE9FE", padding:"1px 5px", borderRadius:3 }}>📦</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EDITOR */}
        {view==="editor" && active && (
          <div style={{ display:"flex", flexDirection:"column", height:"100%", overflowY:"auto" }}>
            {daysSince(active.lastOpened)>=30 && !active.archived && (
              <div style={s.staleBar}>
                ⏳ {daysSince(active.lastOpened)} {t.edStale}
                <button style={s.staleBtn} onClick={()=>{ saveNote(); setView("list"); }}>{t.edKeep}</button>
                <button style={{ ...s.staleBtn, color:"#EF4444" }} onClick={()=>setShowDeleteConfirm(active.id)}>{t.edDelete}</button>
              </div>
            )}
            {active.archived && (
              <div style={{ ...s.staleBar, background:"#EDE9FE", color:"#5B21B6" }}>
                📦 {t.archivedBadge}
                <button style={{ ...s.staleBtn, borderColor:"#7C3AED", color:"#5B21B6" }} onClick={()=>unarchiveNote(active.id)}>{t.unarchiveBtn}</button>
                <button style={{ ...s.staleBtn, color:"#EF4444", borderColor:"#EF4444" }} onClick={()=>setShowDeleteConfirm(active.id)}>{t.deleteBtn}</button>
              </div>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 20px", borderBottom:"1px solid #E7E5E4" }}>
              <button style={s.backBtn} onClick={()=>{ saveNote(); setView("list"); }}>{t.edBack}</button>
              {active.intent && !isMobile && <div style={{ flex:1, fontSize:12, color:"#A8A29E", fontStyle:"italic", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>→ {active.intent}</div>}
              <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
                {!active.archived && <button style={{ ...s.ctrlBtn, color:"#78716C" }} onClick={()=>archiveNote(active.id)} title={t.archiveBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                </button>}
                <button style={{ ...s.ctrlBtn, color:"#EF4444", borderColor:"#FECACA" }} onClick={()=>setShowDeleteConfirm(active.id)} title={t.deleteBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
                <button style={{ ...s.ctrlBtn, background:space.color, color:"#fff", border:"none" }} onClick={saveNote}>{t.edSave}</button>
              </div>
            </div>
            <div style={{ flex:1, padding:"20px", display:"flex", flexDirection:"column", gap:12, overflowY:"auto" }}>
              <input ref={titleRef} style={s.titleInp} value={active.title} placeholder={t.edTitlePh} onChange={e=>setActive(p=>({...p,title:e.target.value}))}/>
              <textarea style={{ ...s.contentArea, minHeight:isMobile?160:220 }} value={active.content}
                placeholder={t.edContentPh}
                onChange={e=>setActive(p=>({...p,content:e.target.value}))}/>
            </div>
            <div style={{ display:"flex", gap:isMobile?16:28, padding:isMobile?"12px 16px":"14px 40px", borderTop:"1px solid #E7E5E4", flexWrap:"wrap" }}>
              <div style={s.toolSec}>
                <div style={s.toolLbl}>{t.edTags}</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                  {active.tags.map(t=>(
                    <span key={t} style={{ fontSize:12, padding:"3px 8px", borderRadius:6, background:space.color+"22", color:space.color, cursor:"pointer" }} onClick={()=>toggleTag(t)}>{t} ×</span>
                  ))}
                  <div style={{ position:"relative" }}>
                    <button style={s.addTagBtn} onClick={()=>setShowTagPick(v=>!v)}>+ tag</button>
                    {showTagPick && <TagPicker active={active.tags} onSelect={tg=>{toggleTag(tg);setShowTagPick(false);}} onClose={()=>setShowTagPick(false)} t={t}/>}
                  </div>
                </div>
              </div>
              <div style={{ ...s.toolSec, minWidth:isMobile?"100%":220 }}>
                <div style={s.toolLbl}>{t.edTasks}</div>
                {active.tasks.map(task=>(
                  <div key={task.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ ...s.chk, ...(task.done?{background:space.color,borderColor:space.color}:{}) }} onClick={()=>toggleTask(task.id)}>
                      {task.done && <span style={{ color:"#fff", fontSize:10 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:13, color:"#44403C", textDecoration:task.done?"line-through":"none" }}>{task.text}</span>
                  </div>
                ))}
                <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:2 }}>
                  <input style={s.taskInp} placeholder={t.edAddTask} value={newTask}
                    onChange={e=>setNewTask(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter") addTask(); }}/>
                  <button style={{ background:"transparent", border:"none", color:"#A8A29E", fontSize:18, cursor:"pointer" }} onClick={addTask}>+</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GRAPH */}
        {view==="graph" && (
          <div style={{ position:"relative", height:"100%", background:"#0C0A09" }}>
            <div style={{ position:"absolute", top:18, left:22, color:"#57534E", fontSize:11, letterSpacing:".1em", textTransform:"uppercase", zIndex:10 }}>{t.navGraph} · {space.emoji} {space.name}</div>
            <ForceGraph notes={filtered} spaceColor={space.color} onOpenNote={openNote}/>
            <div style={{ position:"absolute", bottom:80, left:"50%", transform:"translateX(-50%)", color:"#44403C", fontSize:11, whiteSpace:"nowrap" }}>
              {isMobile?t.graphHintM:t.graphHintD}
            </div>
          </div>
        )}

        {/* TASKS */}
        {view==="tasks" && (
          <TasksView notes={notes} color={space.color} allTags={allTags} onOpenNote={openNote} onCreate={createTask} onToggleTask={toggleTaskInList} standaloneTasks={standaloneTasks[activeSpace]||[]} onToggleStandaloneTask={toggleStandaloneTask} t={t}/>
        )}

        {/* SETTINGS */}
        {view==="settings" && (
          <div style={{ display:"flex", flexDirection:"column", height:"100%", overflowY:"auto" }}>
            {isMobile && (
              <div style={s.topBar}>
                <span style={{ fontSize:16, fontWeight:700, color:"#E7E5E4" }}>{t.setTitle}</span>
                {user.photoURL
                  ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={s.avatar} />
                  : <div style={s.avatar}>{(user.displayName||"U")[0]}</div>
                }
              </div>
            )}
            <div style={{ flex:1, padding:isMobile?"20px 16px":"32px 40px", display:"flex", flexDirection:"column", gap:24, maxWidth:520 }}>
              {!isMobile && <div style={{ fontSize:22, fontWeight:700, letterSpacing:"-0.02em" }}>{t.setTitle}</div>}

              {/* Profile */}
              <div style={s.setSection}>
                <div style={s.setLabel}>{t.setProfile}</div>
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0" }}>
                  {user.photoURL
                    ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={{ ...s.avatar, width:40, height:40 }} />
                    : <div style={{ ...s.avatar, width:40, height:40, fontSize:16 }}>{(user.displayName||"U")[0]}</div>
                  }
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{user.displayName||"User"}</div>
                    <div style={{ fontSize:12, color:"#A8A29E" }}>{user.email||""}</div>
                  </div>
                  <button style={{ ...s.ctrlBtn, color:"#EF4444", borderColor:"#FECACA" }} onClick={handleLogout}>{t.setLogout}</button>
                </div>
              </div>

              {/* Language */}
              <div style={s.setSection}>
                <div style={s.setLabel}>{t.setLang}</div>
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  <button style={{ ...s.ctrlBtn, ...(lang==="pl"?{background:space.color+"18",color:space.color,borderColor:space.color+"44"}:{}) }}
                    onClick={()=>setLang("pl")}>{t.setPolish}</button>
                  <button style={{ ...s.ctrlBtn, ...(lang==="en"?{background:space.color+"18",color:space.color,borderColor:space.color+"44"}:{}) }}
                    onClick={()=>setLang("en")}>{t.setEnglish}</button>
                </div>
              </div>

              {/* Data sync info */}
              <div style={s.setSection}>
                <div style={s.setLabel}>{t.setData}</div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:syncStatus==="synced"?"#10B981":syncStatus==="saving"?"#F59E0B":"#EF4444" }}/>
                  <span style={{ fontSize:12, color:"#78716C" }}>
                    {syncStatus==="synced" ? (lang==="pl"?"Zsynchronizowano z Firebase":"Synced with Firebase")
                     : syncStatus==="saving" ? (lang==="pl"?"Zapisywanie...":"Saving...")
                     : syncStatus==="loading" ? (lang==="pl"?"Wczytywanie...":"Loading...")
                     : (lang==="pl"?"Błąd synchronizacji":"Sync error")}
                  </span>
                </div>
                <div style={{ fontSize:12, color:"#A8A29E", marginTop:6 }}>{user.email}</div>
              </div>

              {/* About */}
              <div style={s.setSection}>
                <div style={s.setLabel}>{t.setAbout}</div>
                <div style={{ fontSize:13, color:"#78716C", lineHeight:1.6, marginTop:4 }}>{t.setAboutDesc}</div>
                <div style={{ fontSize:11, color:"#A8A29E", marginTop:8 }}>v1.0.0</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      {isMobile && view!=="editor" && (
        <div style={s.mNav}>
          {NAV.slice(0,2).map(item=>(
            <button key={item.id} style={{ ...s.mNavBtn, ...(view===item.id?{color:space.color}:{}) }} onClick={()=>setView(item.id)}>
              {item.icon}
              <span style={{ fontSize:10 }}>{item.label}</span>
            </button>
          ))}
          <button style={{ ...s.fab, background:space.color }} onClick={()=>view==="tasks"?createTask():createNote()}>
            <span style={{ fontSize:26, lineHeight:1, color:"#fff" }}>+</span>
          </button>
          {NAV.slice(2,4).map(item=>(
            <button key={item.id} style={{ ...s.mNavBtn, ...(view===item.id?{color:space.color}:{}) }} onClick={()=>setView(item.id)}>
              {item.icon}
              <span style={{ fontSize:10 }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ls = {
  wrap:    { position:"fixed", inset:0, background:"#0C0A09", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999 },
  card:    { background:"#1C1917", borderRadius:16, padding:"48px 40px", width:360, maxWidth:"90vw", display:"flex", flexDirection:"column", gap:20, boxShadow:"0 40px 80px rgba(0,0,0,.6)" },
  logoRow: { display:"flex", alignItems:"center", gap:12 },
  logoBox: { width:36, height:36, background:"#E7E5E4", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:800, color:"#1C1917", fontFamily:"inherit" },
  logoName:{ color:"#E7E5E4", fontSize:20, fontWeight:700, letterSpacing:"-0.02em", fontFamily:"inherit" },
  tagline: { color:"#78716C", fontSize:14, fontFamily:"inherit" },
  feats:   { display:"flex", flexDirection:"column", gap:10 },
  feat:    { display:"flex", alignItems:"center", gap:10, color:"#A8A29E", fontSize:13, fontFamily:"inherit" },
  btn:     { display:"flex", alignItems:"center", justifyContent:"center", gap:10, background:"#FAFAF9", border:"none", borderRadius:8, padding:"12px 20px", fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"inherit", color:"#1C1917", marginTop:8 },
  legal:   { color:"#44403C", fontSize:11, textAlign:"center", fontFamily:"inherit", lineHeight:1.5 },
};

const m = {
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, backdropFilter:"blur(3px)" },
  box:     { background:"#fff", borderRadius:12, padding:"32px 36px", width:420, maxWidth:"90vw", display:"flex", flexDirection:"column", gap:12, boxShadow:"0 20px 60px rgba(0,0,0,.2)" },
  q:       { fontSize:20, fontWeight:700, color:"#1C1917", letterSpacing:"-0.02em" },
  sub:     { fontSize:13, color:"#78716C" },
  inp:     { border:"1.5px solid #E7E5E4", borderRadius:8, padding:"10px 14px", fontSize:14, fontFamily:"inherit", color:"#1C1917", outline:"none", background:"#FAFAF9", width:"100%", boxSizing:"border-box" },
  row:     { display:"flex", justifyContent:"flex-end", gap:10, marginTop:4 },
  skip:    { background:"transparent", border:"none", color:"#A8A29E", fontSize:13, cursor:"pointer", fontFamily:"inherit", padding:"8px 4px" },
  ok:      { background:"#1C1917", color:"#FAFAF9", border:"none", borderRadius:7, padding:"8px 18px", fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:500 },
};

const s = {
  root:    { display:"flex", width:"100%", height:"100vh", background:"#FAFAF9", fontFamily:"'Inter',system-ui,sans-serif", overflow:"hidden", color:"#1C1917" },
  sidebar: { width:200, background:"#1C1917", display:"flex", flexDirection:"column", padding:"16px 12px", gap:4, flexShrink:0, overflowY:"auto" },
  logo:    { display:"flex", alignItems:"center", gap:8 },
  logoMark:{ width:26, height:26, background:"#E7E5E4", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#1C1917" },
  logoTxt: { color:"#E7E5E4", fontSize:14, fontWeight:600, letterSpacing:"-0.01em" },
  avatar:  { width:28, height:28, borderRadius:"50%", background:"#292524", color:"#A8A29E", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", objectFit:"cover" },
  label:   { fontSize:10, color:"#57534E", letterSpacing:".1em", textTransform:"uppercase", padding:"0 6px", marginBottom:4 },
  spacePill:{ display:"flex", alignItems:"center", gap:8, width:"100%", background:"#292524", border:"1.5px solid", borderRadius:8, padding:"8px 10px", cursor:"pointer", color:"#E7E5E4", fontFamily:"inherit", marginBottom:4 },
  drop:    { position:"absolute", top:"100%", left:0, right:0, background:"#292524", borderRadius:8, border:"1px solid #3F3C3A", zIndex:100, overflow:"hidden", marginTop:2 },
  dropItem:{ display:"flex", alignItems:"center", gap:8, width:"100%", background:"transparent", border:"none", padding:"9px 12px", cursor:"pointer", color:"#A8A29E", fontSize:13, fontFamily:"inherit" },
  dropManage:{ width:"100%", background:"transparent", border:"none", padding:"9px 12px", cursor:"pointer", color:"#57534E", fontSize:12, fontFamily:"inherit", textAlign:"left" },
  div:     { height:1, background:"#292524", margin:"8px 0" },
  navBtn:  { display:"flex", alignItems:"center", gap:8, background:"transparent", border:"none", borderRadius:7, padding:"8px 10px", cursor:"pointer", color:"#78716C", fontFamily:"inherit", width:"100%" },
  navActive:{ background:"#292524", color:"#E7E5E4" },
  tagPill: { background:"transparent", border:"none", borderRadius:6, padding:"6px 10px", fontSize:12, cursor:"pointer", color:"#78716C", fontFamily:"inherit", textAlign:"left", width:"100%" },
  staleHint:{ fontSize:11, color:"#92400E", background:"#FEF3C7", borderRadius:6, padding:"6px 10px", marginBottom:4 },
  main:    { flex:1, minWidth:0, overflow:"hidden", display:"flex", flexDirection:"column" },
  listHead:{ padding:"14px 16px 10px", borderBottom:"1px solid #E7E5E4", display:"flex", flexDirection:"column", gap:8 },
  badge:   { fontSize:11, color:"#A8A29E", background:"#F5F5F4", borderRadius:20, padding:"2px 8px" },
  searchBox:{ flex:1, padding:"8px 12px", border:"1px solid #E7E5E4", borderRadius:7, fontSize:13, background:"#FAFAF9", color:"#1C1917", outline:"none", fontFamily:"inherit" },
  ctrlBtn: { padding:"7px 10px", border:"1px solid #E7E5E4", borderRadius:7, fontSize:12, cursor:"pointer", background:"#FAFAF9", color:"#78716C", fontFamily:"inherit", whiteSpace:"nowrap", transition:"all .15s" },
  dateInp: { border:"1px solid #E7E5E4", borderRadius:6, padding:"5px 8px", fontSize:12, fontFamily:"inherit", color:"#1C1917", background:"#FAFAF9", outline:"none" },
  clearBtn:{ background:"transparent", border:"none", fontSize:12, color:"#A8A29E", cursor:"pointer", fontFamily:"inherit", textDecoration:"underline" },
  empty:   { color:"#A8A29E", fontSize:13, padding:"40px 20px", textAlign:"center" },
  noteRow: { display:"flex", justifyContent:"space-between", gap:16, padding:"13px 10px", borderRadius:8, borderBottom:"1px solid #F5F5F4" },
  rowAction:{ background:"transparent", border:"none", color:"#A8A29E", cursor:"pointer", padding:4, borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", transition:"color .15s" },
  tinyTag: { fontSize:10, padding:"2px 6px", borderRadius:4, background:"#F5F5F4", color:"#78716C" },
  staleBar:{ background:"#FEF3C7", padding:"10px 20px", display:"flex", alignItems:"center", gap:10, fontSize:12, color:"#92400E", flexShrink:0 },
  staleBtn:{ background:"transparent", border:"1px solid #D97706", borderRadius:5, padding:"3px 10px", fontSize:11, cursor:"pointer", color:"#92400E", fontFamily:"inherit" },
  backBtn: { background:"transparent", border:"none", color:"#78716C", fontSize:13, cursor:"pointer", fontFamily:"inherit" },
  titleInp:{ border:"none", outline:"none", fontSize:22, fontWeight:700, color:"#1C1917", background:"transparent", fontFamily:"inherit", letterSpacing:"-0.02em", width:"100%" },
  contentArea:{ flex:1, border:"none", outline:"none", fontSize:14, color:"#44403C", background:"transparent", fontFamily:"inherit", lineHeight:1.7, resize:"none", width:"100%" },
  toolSec: { display:"flex", flexDirection:"column", gap:8, minWidth:140 },
  toolLbl: { fontSize:10, color:"#A8A29E", letterSpacing:".1em", textTransform:"uppercase" },
  addTagBtn:{ fontSize:12, padding:"3px 8px", borderRadius:6, border:"1px dashed #D6D3D1", background:"transparent", color:"#A8A29E", cursor:"pointer", fontFamily:"inherit" },
  pickerWrap:{ position:"absolute", bottom:"100%", left:0, background:"#fff", border:"1px solid #E7E5E4", borderRadius:8, padding:6, zIndex:50, minWidth:180, boxShadow:"0 8px 24px rgba(0,0,0,.1)" },
  pickerInput:{ width:"100%", border:"1px solid #E7E5E4", borderRadius:6, padding:"6px 8px", fontSize:12, fontFamily:"inherit", outline:"none", marginBottom:4, boxSizing:"border-box" },
  pickerItem:{ display:"block", width:"100%", background:"transparent", border:"none", padding:"6px 8px", fontSize:12, cursor:"pointer", fontFamily:"inherit", textAlign:"left", borderRadius:5, color:"#44403C" },
  chk:     { width:17, height:17, borderRadius:4, border:"1.5px solid #D6D3D1", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 },
  taskInp: { flex:1, border:"none", borderBottom:"1px solid #E7E5E4", background:"transparent", fontFamily:"inherit", fontSize:13, color:"#1C1917", outline:"none", padding:"3px 0" },
  topBar:  { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"#1C1917", borderBottom:"1px solid #292524", flexShrink:0 },
  menuBtn: { background:"transparent", border:"none", cursor:"pointer", padding:4, display:"flex", alignItems:"center" },
  mNav:    { position:"fixed", bottom:0, left:0, right:0, height:64, background:"#1C1917", borderTop:"1px solid #292524", display:"flex", alignItems:"center", justifyContent:"space-evenly", zIndex:200 },
  mNavBtn: { display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"transparent", border:"none", color:"#57534E", cursor:"pointer", fontFamily:"inherit", padding:"6px 16px", transition:"color .15s" },
  fab:     { width:56, height:56, borderRadius:"50%", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 20px rgba(0,0,0,.4)", marginBottom:22 },
  drawerOverlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:400, backdropFilter:"blur(2px)" },
  drawer:  { position:"absolute", top:0, left:0, bottom:0, width:"78vw", maxWidth:300, background:"#1C1917", display:"flex", flexDirection:"column", padding:"16px 14px", gap:4, overflowY:"auto" },
  iconBtn: { background:"transparent", border:"none", color:"#57534E", fontSize:16, cursor:"pointer", padding:4 },
  smRow:   { display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:8, background:"#FAFAF9", border:"1px solid #F5F5F4" },
  smEditBtn:{ background:"transparent", border:"1px solid #E7E5E4", borderRadius:6, padding:"4px 10px", fontSize:12, cursor:"pointer", color:"#78716C", fontFamily:"inherit" },
  smInp:   { border:"1.5px solid #E7E5E4", borderRadius:7, padding:"8px 12px", fontSize:14, fontFamily:"inherit", color:"#1C1917", outline:"none", background:"#FAFAF9" },
  smOk:    { background:"#1C1917", color:"#fff", border:"none", borderRadius:6, padding:"7px 14px", fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:500 },
  smCan:   { background:"transparent", border:"1px solid #E7E5E4", borderRadius:6, padding:"7px 14px", fontSize:13, cursor:"pointer", fontFamily:"inherit", color:"#78716C" },
  eBtn:    { background:"transparent", border:"1px solid transparent", borderRadius:6, padding:"4px 7px", fontSize:16, cursor:"pointer" },
  eBtnA:   { background:"#F5F5F4", border:"1px solid #E7E5E4" },
  cBtn:    { width:20, height:20, borderRadius:"50%", border:"2.5px solid transparent", cursor:"pointer" },
  cBtnA:   { border:"2.5px solid #1C1917" },
  tvHead:  { padding:"16px 20px 12px", borderBottom:"1px solid #E7E5E4", display:"flex", flexDirection:"column", gap:10, flexShrink:0 },
  tvList:  { flex:1, overflowY:"auto", padding:"8px 20px 80px" },
  tvRow:   { display:"flex", alignItems:"flex-start", gap:12, padding:"12px 0", borderBottom:"1px solid #F5F5F4" },
  tagChip: { fontSize:12, padding:"4px 10px", borderRadius:20, border:"1px solid #E7E5E4", background:"transparent", color:"#78716C", cursor:"pointer", fontFamily:"inherit" },
  setSection:{ borderBottom:"1px solid #F5F5F4", paddingBottom:16 },
  setLabel: { fontSize:10, color:"#A8A29E", letterSpacing:".1em", textTransform:"uppercase" },
};
