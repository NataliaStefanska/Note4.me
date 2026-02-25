import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { loginWithGoogle, logout, onAuth, saveUserData, loadUserData } from "../firebase";
import { TODAY, INITIAL_SPACES, INITIAL_NOTES, daysSince } from "../constants/data";
import { T } from "../i18n/translations";
import { textPreview } from "../utils/helpers";

const AppContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [lang,        setLang]        = useState(() => { try { return localStorage.getItem("noteio_lang") || "pl"; } catch { return "pl"; } });
  const [user,        setUser]        = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [spaces,      setSpaces]      = useState(INITIAL_SPACES);
  const [activeSpace, setActiveSpace] = useState("s1");
  const [allNotes,    setAllNotes]    = useState(INITIAL_NOTES);
  const [standaloneTasks, setStandaloneTasks] = useState({});
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
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [linkSearch, setLinkSearch] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);

  const titleRef = useRef();
  const editorRef = useRef(null);
  const saveTimer = useRef(null);
  const saveToastTimer = useRef(null);
  const autoSaveTimer = useRef(null);
  const autoSaveStatusTimer = useRef(null);

  const t = T[lang] || T.pl;

  // Firebase Auth listener
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

  // Debounced Firestore save
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

  useEffect(() => { try { localStorage.setItem("noteio_lang", lang); } catch { /* localStorage unavailable */ } }, [lang]);
  useEffect(() => {
    if (!user || authLoading) return;
    syncToFirestore({ spaces, activeSpace, allNotes, standaloneTasks, lang });
  }, [spaces, activeSpace, allNotes, standaloneTasks, lang, user, authLoading, syncToFirestore]);

  const notes  = allNotes[activeSpace] || [];
  const space  = spaces.find(sp => sp.id===activeSpace) || spaces[0];
  const allTags= [...new Set([...notes.flatMap(n=>n.tags), ...(active ? active.tags : [])])];
  const staleN = notes.filter(n=>!n.archived&&daysSince(n.lastOpened)>=30).length;
  const archivedN = notes.filter(n=>n.archived).length;

  const filtered = notes
    .filter(n => {
      const ma = showArchived ? !!n.archived : !n.archived;
      const mt = filterTag ? n.tags.includes(filterTag) : true;
      const q = search.toLowerCase();
      const ms = search ? (
        n.title.toLowerCase().includes(q) ||
        textPreview(n.content,99999).toLowerCase().includes(q) ||
        n.tags.some(tg => tg.toLowerCase().includes(q)) ||
        n.tasks.some(tk => tk.text.toLowerCase().includes(q)) ||
        (n.intent || '').toLowerCase().includes(q)
      ) : true;
      const mf = dateFrom ? n.updatedAt>=dateFrom : true;
      const mtd= dateTo   ? n.updatedAt<=dateTo   : true;
      return ma&&mt&&ms&&mf&&mtd;
    })
    .sort((a,b)=>sortOrder==="desc"?b.updatedAt.localeCompare(a.updatedAt):a.updatedAt.localeCompare(b.updatedAt));

  function switchSpace(id) { setActiveSpace(id); setActive(null); setFilterTag(null); setSearch(""); setShowDrop(false); setShowArchived(false); }
  function createNote()   { setShowIntent(true); }
  function createTask()   { setShowTask(true); }
  function quickCapture() {
    const n={ id:"n"+Date.now(), title:"", content:"", tags:[], linkedNotes:[], tasks:[], intent:"",
      updatedAt:TODAY.toISOString().split("T")[0], lastOpened:TODAY.toISOString().split("T")[0] };
    setAllNotes(p=>({...p,[activeSpace]:[n,...(p[activeSpace]||[])]}));
    setActive({...n});
    setTimeout(()=>{ if(titleRef.current) titleRef.current.focus(); },80);
  }

  function handleIntent(intent) {
    const n={ id:"n"+Date.now(), title:"", content:"", tags:[], linkedNotes:[], tasks:[], intent,
      updatedAt:TODAY.toISOString().split("T")[0], lastOpened:TODAY.toISOString().split("T")[0] };
    setAllNotes(p=>({...p,[activeSpace]:[n,...(p[activeSpace]||[])]}));
    setActive({...n}); setShowIntent(false);
    setTimeout(()=>{ if(titleRef.current) titleRef.current.focus(); },80);
  }

  function handleTaskIntent(why, what, dueDate) {
    const task = { id:"t"+Date.now(), text:what, done:false, intent:why,
      createdAt:TODAY.toISOString().split("T")[0], dueDate:dueDate||"" };
    setStandaloneTasks(p=>({...p,[activeSpace]:[task,...(p[activeSpace]||[])]}));
    setShowTask(false);
  }
  function setStandaloneTaskDueDate(taskId, dueDate) {
    setStandaloneTasks(prev=>({...prev,[activeSpace]:(prev[activeSpace]||[]).map(t=>t.id===taskId?{...t,dueDate}:t)}));
  }

  function openNote(note) {
    setActive({...note, lastOpened:TODAY.toISOString().split("T")[0]});
  }

  function parseLinkedNotes(html) {
    const text = html.replace(/<[^>]*>/g, '');
    const matches = [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]);
    const spaceNotes = allNotes[activeSpace] || [];
    const ids = [];
    matches.forEach(title => {
      const found = spaceNotes.find(n => n.title && n.title.toLowerCase() === title.toLowerCase());
      if (found && found.id !== (active && active.id)) ids.push(found.id);
    });
    return [...new Set(ids)];
  }

  function saveNote(silent) {
    if(!active) return;
    const content = editorRef.current ? editorRef.current.getHTML() : active.content;
    const linkedNotes = parseLinkedNotes(content);
    const updated = {...active, content, linkedNotes, updatedAt:TODAY.toISOString().split("T")[0]};
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).map(n=>n.id===updated.id?{...updated}:n)}));
    setActive(updated);
    if (!silent) {
      setShowSaveToast(true);
      if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
      saveToastTimer.current = setTimeout(() => setShowSaveToast(false), 1500);
    }
  }

  function triggerAutoSave() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveStatus("saving");
    autoSaveTimer.current = setTimeout(() => {
      saveNote(true);
      setAutoSaveStatus("saved");
      if (autoSaveStatusTimer.current) clearTimeout(autoSaveStatusTimer.current);
      autoSaveStatusTimer.current = setTimeout(() => setAutoSaveStatus(null), 2000);
    }, 800);
  }

  function toggleTask(id) {
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
  function addTask(dueDate) { if(!newTask.trim()) return; setActive(p=>({...p,tasks:[...p.tasks,{id:"t"+Date.now(),text:newTask,done:false,dueDate:dueDate||""}]})); setNewTask(""); }
  function setTaskDueDate(taskId, dueDate) {
    setActive(p=>{
      const updated = {...p, tasks:p.tasks.map(tk=>tk.id===taskId?{...tk,dueDate}:tk)};
      setAllNotes(prev=>({...prev,[activeSpace]:(prev[activeSpace]||[]).map(n=>n.id===updated.id?{...updated}:n)}));
      return updated;
    });
  }

  function handleLinkSelect(note) {
    const editor = editorRef.current;
    if (!editor) { setLinkSearch(null); return; }
    const { state } = editor;
    const { from } = state.selection;
    const start = Math.max(0, from - 200);
    let textBefore;
    try { textBefore = state.doc.textBetween(start, from, null, '\ufffc'); }
    catch { setLinkSearch(null); return; }
    const openIdx = textBefore.lastIndexOf('[[');
    if (openIdx === -1) { setLinkSearch(null); return; }
    const replaceFrom = from - (textBefore.length - openIdx);
    editor.chain().focus()
      .deleteRange({ from: replaceFrom, to: from })
      .insertContent('[[' + note.title + ']]')
      .run();
    setLinkSearch(null);
    triggerAutoSave();
  }

  function toggleTag(tag) {
    setActive(p=>{
      const updated = {...p, tags:p.tags.includes(tag)?p.tags.filter(t=>t!==tag):[...p.tags,tag]};
      setAllNotes(prev=>({...prev,[activeSpace]:(prev[activeSpace]||[]).map(n=>n.id===updated.id?{...updated}:n)}));
      return updated;
    });
  }

  function deleteNote(noteId) {
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).filter(n=>n.id!==noteId)}));
    if (active && active.id===noteId) { setActive(null); }
    setShowDeleteConfirm(null);
  }
  function archiveNote(noteId) {
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).map(n=>n.id===noteId?{...n,archived:true}:n)}));
    if (active && active.id===noteId) { setActive(null); }
  }
  function unarchiveNote(noteId) {
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).map(n=>n.id===noteId?{...n,archived:false}:n)}));
    if (active && active.id===noteId) setActive(prev=>({...prev, archived:false}));
  }

  async function handleLogin() {
    try { await loginWithGoogle(); } catch (e) { console.error("Login failed:", e); }
  }
  async function handleLogout() {
    try { await logout(); } catch (e) { console.error("Logout failed:", e); }
  }

  const value = {
    // state
    lang, setLang, user, authLoading, spaces, setSpaces, activeSpace, setActiveSpace,
    allNotes, setAllNotes, standaloneTasks, setStandaloneTasks, active, setActive,
    search, setSearch, filterTag, setFilterTag, newTask, setNewTask,
    showIntent, setShowIntent, showTask, setShowTask, showTagPick, setShowTagPick,
    showSpaceMgr, setShowSpaceMgr, showDrop, setShowDrop, sortOrder, setSortOrder,
    dateFrom, setDateFrom, dateTo, setDateTo, showDate, setShowDate,
    showDrawer, setShowDrawer, showArchived, setShowArchived,
    showDeleteConfirm, setShowDeleteConfirm, syncStatus, showSaveToast,
    linkSearch, setLinkSearch, autoSaveStatus, setAutoSaveStatus,
    // refs
    titleRef, editorRef,
    // derived
    t, notes, space, allTags, staleN, archivedN, filtered,
    // actions
    switchSpace, createNote, createTask, quickCapture, handleIntent, handleTaskIntent,
    openNote, saveNote, triggerAutoSave, toggleTask, toggleTaskInList, toggleStandaloneTask,
    addTask, setTaskDueDate, setStandaloneTaskDueDate,
    handleLinkSelect, toggleTag, deleteNote, archiveNote, unarchiveNote,
    handleLogin, handleLogout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
