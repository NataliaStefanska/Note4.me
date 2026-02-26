import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  loginWithGoogle, logout, onAuth, loadAllData,
  saveUserPrefs, deleteNoteFirestore,
  saveAllSpaces, saveAllNotes, saveAllTasks,
} from "../firebase";
import { getToday, INITIAL_SPACES, INITIAL_NOTES, daysSince } from "../constants/data";
import { T } from "../i18n/translations";
import { textPreview } from "../utils/helpers";
import { initEmbedder, indexNotes, vectorSearch as vsearch, isEmbedderReady } from "../utils/vectorSearch";
import Fuse from "fuse.js";

const AppContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [lang,        setLang]        = useState(() => { try { return localStorage.getItem("noteio_lang") || "pl"; } catch { return "pl"; } });
  const [theme,       setThemeState]  = useState(() => { try { return localStorage.getItem("noteio_theme") || "light"; } catch { return "light"; } });
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
  const [filterFolder,setFilterFolder]= useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [syncStatus,  setSyncStatus]  = useState("idle");
  const [isOnline,    setIsOnline]    = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [linkSearch, setLinkSearch] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const [embedderStatus, setEmbedderStatus] = useState("idle"); // "idle" | "loading" | "ready" | "error"
  const [semanticResults, setSemanticResults] = useState(null);

  const titleRef = useRef();
  const editorRef = useRef(null);
  const saveToastTimer = useRef(null);
  const autoSaveTimer = useRef(null);
  const autoSaveStatusTimer = useRef(null);

  const t = T[lang] || T.pl;

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Firebase Auth listener — loads from subcollections (auto-migrates from v1)
  useEffect(() => {
    const unsub = onAuth(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setSyncStatus("loading");
        try {
          const data = await loadAllData(firebaseUser.uid);
          if (data) {
            if (data.spaces) setSpaces(data.spaces);
            if (data.activeSpace) setActiveSpace(data.activeSpace);
            if (data.allNotes) setAllNotes(data.allNotes);
            if (data.standaloneTasks) setStandaloneTasks(data.standaloneTasks);
            if (data.lang) setLang(data.lang);
          }
          setSyncStatus("synced");
        } catch (err) {
          // Gracefully handle offline/network failures — use local data, don't show error
          console.warn("Firebase load failed, using local data:", err?.message || err);
          setSyncStatus(navigator.onLine ? "error" : "offline");
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

  // Debounced incremental Firestore sync (subcollections)
  const syncTimer = useRef(null);
  const prevSpaces = useRef(null);
  const prevAllNotes = useRef(null);
  const prevStandaloneTasks = useRef(null);
  const prevLang = useRef(null);
  const prevActiveSpace = useRef(null);

  const syncToFirestore = useCallback(() => {
    if (!user || authLoading) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      setSyncStatus("saving");
      try {
        const promises = [];

        // Sync user preferences if lang or activeSpace changed
        if (lang !== prevLang.current || activeSpace !== prevActiveSpace.current) {
          promises.push(saveUserPrefs(user.uid, { lang, activeSpace }));
          prevLang.current = lang;
          prevActiveSpace.current = activeSpace;
        }

        // Sync spaces if changed
        if (spaces !== prevSpaces.current) {
          promises.push(saveAllSpaces(user.uid, spaces));
          prevSpaces.current = spaces;
        }

        // Sync notes if changed
        if (allNotes !== prevAllNotes.current) {
          for (const [spaceId, notes] of Object.entries(allNotes)) {
            const prevNotes = prevAllNotes.current ? prevAllNotes.current[spaceId] : null;
            if (notes !== prevNotes) {
              promises.push(saveAllNotes(user.uid, notes, spaceId));
            }
          }
          // Detect deleted notes (spaces that existed before but not now)
          if (prevAllNotes.current) {
            for (const spaceId of Object.keys(prevAllNotes.current)) {
              if (!allNotes[spaceId]) {
                const oldNotes = prevAllNotes.current[spaceId] || [];
                oldNotes.forEach(n => promises.push(deleteNoteFirestore(user.uid, n.id)));
              }
            }
          }
          prevAllNotes.current = allNotes;
        }

        // Sync standalone tasks if changed
        if (standaloneTasks !== prevStandaloneTasks.current) {
          for (const [spaceId, tasks] of Object.entries(standaloneTasks)) {
            const prevTasks = prevStandaloneTasks.current ? prevStandaloneTasks.current[spaceId] : null;
            if (tasks !== prevTasks) {
              promises.push(saveAllTasks(user.uid, tasks, spaceId));
            }
          }
          prevStandaloneTasks.current = standaloneTasks;
        }

        if (promises.length > 0) {
          await Promise.all(promises);
        }
        setSyncStatus("synced");
      } catch (err) {
        console.warn("Firebase sync failed:", err?.message || err);
        setSyncStatus(navigator.onLine ? "error" : "offline");
      }
    }, 1500);
  }, [user, authLoading, lang, activeSpace, spaces, allNotes, standaloneTasks]);

  useEffect(() => { try { localStorage.setItem("noteio_lang", lang); } catch { /* localStorage unavailable */ } }, [lang]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("noteio_theme", theme); } catch { /* localStorage unavailable */ }
  }, [theme]);
  function setTheme(t) { setThemeState(t); }
  useEffect(() => {
    if (!user || authLoading) return;
    syncToFirestore();
  }, [spaces, activeSpace, allNotes, standaloneTasks, lang, user, authLoading, syncToFirestore]);

  const notes  = allNotes[activeSpace] || [];
  const space  = spaces.find(sp => sp.id===activeSpace) || spaces[0];
  const allTags= [...new Set([...notes.flatMap(n=>n.tags), ...(active ? active.tags : [])])];
  const allFolders= [...new Set(notes.map(n=>n.folder).filter(Boolean))].sort();
  const staleN = notes.filter(n=>!n.archived&&daysSince(n.lastOpened)>=30).length;
  const archivedN = notes.filter(n=>n.archived).length;

  // Vector search: lazy init embedder in background on first search
  const embedderInitAttempted = useRef(false);
  useEffect(() => {
    if (!search.trim() || embedderInitAttempted.current) return;
    embedderInitAttempted.current = true;
    if (isEmbedderReady()) { setEmbedderStatus("ready"); return; }
    setEmbedderStatus("loading");
    initEmbedder().then(() => setEmbedderStatus("ready")).catch(() => setEmbedderStatus("error"));
  }, [search]);

  // Vector search: index notes when embedder is ready
  const vectorSearchTimer = useRef(null);
  useEffect(() => {
    if (embedderStatus !== "ready") return;
    indexNotes(notes);
  }, [notes, embedderStatus]);

  // Fuse.js index for fuzzy text search
  const fuseIndex = useMemo(() => {
    const prepared = notes.map(n => ({
      ...n,
      _contentText: textPreview(n.content, 99999),
      _tagsJoined: n.tags.join(" "),
      _tasksJoined: n.tasks.map(tk => tk.text).join(" "),
    }));
    return new Fuse(prepared, {
      keys: [
        { name: "title", weight: 2 },
        { name: "intent", weight: 1.5 },
        { name: "_contentText", weight: 1 },
        { name: "_tagsJoined", weight: 1.5 },
        { name: "_tasksJoined", weight: 0.8 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      includeMatches: true,
    });
  }, [notes]);

  const textFiltered = (() => {
    let pool;
    if (search.trim()) {
      const fuseResults = fuseIndex.search(search);
      const matchedIds = new Set(fuseResults.map(r => r.item.id));
      pool = fuseResults.map(r => notes.find(n => n.id === r.item.id)).filter(Boolean);
      // Also include exact substring matches that fuse might miss
      notes.forEach(n => {
        if (matchedIds.has(n.id)) return;
        const q = search.toLowerCase();
        if (
          n.title.toLowerCase().includes(q) ||
          textPreview(n.content,99999).toLowerCase().includes(q) ||
          n.tags.some(tg => tg.toLowerCase().includes(q)) ||
          n.tasks.some(tk => tk.text.toLowerCase().includes(q)) ||
          (n.intent || '').toLowerCase().includes(q)
        ) pool.push(n);
      });
    } else {
      pool = [...notes];
    }
    return pool
      .filter(n => {
        const ma = showArchived ? !!n.archived : !n.archived;
        const mt = filterTag ? n.tags.includes(filterTag) : true;
        const mf = dateFrom ? n.updatedAt>=dateFrom : true;
        const mtd= dateTo   ? n.updatedAt<=dateTo   : true;
        const mfol = filterFolder ? (n.folder||"")=== filterFolder : true;
        return ma&&mt&&mf&&mtd&&mfol;
      })
      .sort((a,b)=>sortOrder==="desc"?b.updatedAt.localeCompare(a.updatedAt):a.updatedAt.localeCompare(b.updatedAt));
  })();

  // Auto-fallback: if text search finds 0 and semantic is ready, try semantic
  const useSemanticFallback = search.trim().length >= 3 && textFiltered.length === 0 && embedderStatus === "ready";

  // Debounced semantic search when fallback is needed
  useEffect(() => {
    if (!useSemanticFallback || !search.trim()) { setSemanticResults(null); return; }
    if (vectorSearchTimer.current) clearTimeout(vectorSearchTimer.current);
    vectorSearchTimer.current = setTimeout(async () => {
      const results = await vsearch(search, notes);
      setSemanticResults(results);
    }, 400);
    return () => { if (vectorSearchTimer.current) clearTimeout(vectorSearchTimer.current); };
  }, [search, notes, useSemanticFallback]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = (useSemanticFallback && semanticResults)
    ? semanticResults.filter(n => {
        const ma = showArchived ? !!n.archived : !n.archived;
        const mt = filterTag ? n.tags.includes(filterTag) : true;
        const mf = dateFrom ? n.updatedAt>=dateFrom : true;
        const mtd= dateTo   ? n.updatedAt<=dateTo   : true;
        const mfol = filterFolder ? (n.folder||"")=== filterFolder : true;
        return ma&&mt&&mf&&mtd&&mfol;
      })
    : textFiltered;

  function switchSpace(id) { setActiveSpace(id); setActive(null); setFilterTag(null); setFilterFolder(null); setSearch(""); setShowDrop(false); setShowArchived(false); }
  function createNote()   { setShowIntent(true); }
  function createTask()   { setShowTask(true); }
  function quickCapture() {
    const n={ id:"n"+Date.now(), title:"", content:"", tags:[], linkedNotes:[], tasks:[], intent:"", folder:filterFolder||"",
      updatedAt:getToday().toISOString().split("T")[0], lastOpened:getToday().toISOString().split("T")[0] };
    setAllNotes(p=>({...p,[activeSpace]:[n,...(p[activeSpace]||[])]}));
    setActive({...n});
    setTimeout(()=>{ if(titleRef.current) titleRef.current.focus(); },80);
  }

  function handleIntent(intent) {
    const n={ id:"n"+Date.now(), title:"", content:"", tags:[], linkedNotes:[], tasks:[], intent, folder:filterFolder||"",
      updatedAt:getToday().toISOString().split("T")[0], lastOpened:getToday().toISOString().split("T")[0] };
    setAllNotes(p=>({...p,[activeSpace]:[n,...(p[activeSpace]||[])]}));
    setActive({...n}); setShowIntent(false);
    setTimeout(()=>{ if(titleRef.current) titleRef.current.focus(); },80);
  }

  function handleTaskIntent(why, what, dueDate) {
    const task = { id:"t"+Date.now(), text:what, done:false, intent:why,
      createdAt:getToday().toISOString().split("T")[0], dueDate:dueDate||"" };
    setStandaloneTasks(p=>({...p,[activeSpace]:[task,...(p[activeSpace]||[])]}));
    setShowTask(false);
  }
  function setStandaloneTaskDueDate(taskId, dueDate) {
    setStandaloneTasks(prev=>({...prev,[activeSpace]:(prev[activeSpace]||[]).map(t=>t.id===taskId?{...t,dueDate}:t)}));
  }

  function openNote(note) {
    const opened = {...note, lastOpened:getToday().toISOString().split("T")[0]};
    setActive(opened);
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).map(n=>n.id===opened.id?{...n,lastOpened:opened.lastOpened}:n)}));
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
    const updated = {...active, content, linkedNotes, updatedAt:getToday().toISOString().split("T")[0]};
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
  function addTask(dueDate) {
    if(!newTask.trim()) return;
    setActive(p=>{
      const updated = {...p,tasks:[...p.tasks,{id:"t"+Date.now(),text:newTask,done:false,dueDate:dueDate||""}]};
      setAllNotes(prev=>({...prev,[activeSpace]:(prev[activeSpace]||[]).map(n=>n.id===updated.id?{...updated}:n)}));
      return updated;
    });
    setNewTask("");
  }
  function removeTask(taskId) {
    setActive(p=>{
      const updated = {...p, tasks:p.tasks.filter(tk=>tk.id!==taskId)};
      setAllNotes(prev=>({...prev,[activeSpace]:(prev[activeSpace]||[]).map(n=>n.id===updated.id?{...updated}:n)}));
      return updated;
    });
  }
  function setTaskDueDate(taskId, dueDate) {
    setActive(p=>{
      const updated = {...p, tasks:p.tasks.map(tk=>tk.id===taskId?{...tk,dueDate}:tk)};
      setAllNotes(prev=>({...prev,[activeSpace]:(prev[activeSpace]||[]).map(n=>n.id===updated.id?{...updated}:n)}));
      return updated;
    });
  }

  function setNoteFolder(noteId, folder) {
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).map(n=>n.id===noteId?{...n,folder:folder||""}:n)}));
    if (active && active.id===noteId) setActive(prev=>({...prev,folder:folder||""}));
  }
  function renameFolder(oldName, newName) {
    if (!oldName || !newName.trim() || oldName===newName) return;
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).map(n=>(n.folder||"")===oldName?{...n,folder:newName.trim()}:n)}));
    if (active && (active.folder||"")===oldName) setActive(prev=>({...prev,folder:newName.trim()}));
    if (filterFolder===oldName) setFilterFolder(newName.trim());
  }
  function deleteFolder(name) {
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).map(n=>(n.folder||"")===name?{...n,folder:""}:n)}));
    if (active && (active.folder||"")===name) setActive(prev=>({...prev,folder:""}));
    if (filterFolder===name) setFilterFolder(null);
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

  function reorderNotes(dragId, dropId) {
    if (dragId === dropId) return;
    setAllNotes(p => {
      const arr = [...(p[activeSpace] || [])];
      const dragIdx = arr.findIndex(n => n.id === dragId);
      const dropIdx = arr.findIndex(n => n.id === dropId);
      if (dragIdx === -1 || dropIdx === -1) return p;
      const [item] = arr.splice(dragIdx, 1);
      arr.splice(dropIdx, 0, item);
      return { ...p, [activeSpace]: arr };
    });
  }

  function reorderTasks(dragId, dropId) {
    if (dragId === dropId) return;
    setActive(p => {
      const arr = [...p.tasks];
      const dragIdx = arr.findIndex(t => t.id === dragId);
      const dropIdx = arr.findIndex(t => t.id === dropId);
      if (dragIdx === -1 || dropIdx === -1) return p;
      const [item] = arr.splice(dragIdx, 1);
      arr.splice(dropIdx, 0, item);
      const updated = { ...p, tasks: arr };
      setAllNotes(prev => ({ ...prev, [activeSpace]: (prev[activeSpace] || []).map(n => n.id === updated.id ? { ...updated } : n) }));
      return updated;
    });
  }

  function deleteNote(noteId) {
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).filter(n=>n.id!==noteId)}));
    if (active && active.id===noteId) { setActive(null); }
    setShowDeleteConfirm(null);
    // Also delete from Firestore subcollection directly
    if (user) deleteNoteFirestore(user.uid, noteId).catch(() => {});
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
    lang, setLang, theme, setTheme, user, authLoading, spaces, setSpaces, activeSpace, setActiveSpace,
    allNotes, setAllNotes, standaloneTasks, setStandaloneTasks, active, setActive,
    search, setSearch, filterTag, setFilterTag, newTask, setNewTask,
    showIntent, setShowIntent, showTask, setShowTask, showTagPick, setShowTagPick,
    showSpaceMgr, setShowSpaceMgr, showDrop, setShowDrop, sortOrder, setSortOrder,
    dateFrom, setDateFrom, dateTo, setDateTo, showDate, setShowDate,
    showDrawer, setShowDrawer, showArchived, setShowArchived, filterFolder, setFilterFolder,
    showDeleteConfirm, setShowDeleteConfirm, syncStatus, showSaveToast, isOnline,
    linkSearch, setLinkSearch, autoSaveStatus, setAutoSaveStatus,
    embedderStatus, useSemanticFallback,
    // refs
    titleRef, editorRef,
    // derived
    t, notes, space, allTags, allFolders, staleN, archivedN, filtered,
    // actions
    switchSpace, createNote, createTask, quickCapture, handleIntent, handleTaskIntent,
    openNote, saveNote, triggerAutoSave, toggleTask, toggleTaskInList, toggleStandaloneTask,
    addTask, removeTask, setTaskDueDate, setStandaloneTaskDueDate,
    setNoteFolder, renameFolder, deleteFolder,
    handleLinkSelect, toggleTag, reorderNotes, reorderTasks, deleteNote, archiveNote, unarchiveNote,
    handleLogin, handleLogout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
