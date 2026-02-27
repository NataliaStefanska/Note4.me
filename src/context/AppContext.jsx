import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  loadAllData, saveUserPrefs, deleteNoteFirestore,
  saveAllSpaces, saveAllNotes, saveAllTasks,
} from "../firebase";
import { getToday, INITIAL_SPACES, INITIAL_NOTES, daysSince } from "../constants/data";
import { textPreview } from "../utils/helpers";
import { initEmbedder, indexNotes, vectorSearch as vsearch, isEmbedderReady } from "../utils/vectorSearch";
import Fuse from "fuse.js";
import { useAuth } from "./AuthContext";
import { useUI } from "./UIContext";

const AppContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  // Consume sub-contexts
  const { user, authLoading, handleLogin, handleLogout } = useAuth();
  const {
    lang, setLang, theme, setTheme, t,
    showIntent, setShowIntent, showTask, setShowTask,
    showTagPick, setShowTagPick, showSpaceMgr, setShowSpaceMgr,
    showDrop, setShowDrop, showDrawer, setShowDrawer,
    showDeleteConfirm, setShowDeleteConfirm,
    showSaveToast, setShowSaveToast,
    linkSearch, setLinkSearch,
    autoSaveStatus, setAutoSaveStatus,
  } = useUI();

  // Data state
  const [spaces,      setSpaces]      = useState(INITIAL_SPACES);
  const [activeSpace, setActiveSpace] = useState("s1");
  const [allNotes,    setAllNotes]    = useState(INITIAL_NOTES);
  const [standaloneTasks, setStandaloneTasks] = useState({});
  const [active,      setActive]      = useState(null);
  const [search,      setSearch]      = useState("");
  const [filterTag,   setFilterTag]   = useState(null);
  const [newTask,     setNewTask]     = useState("");
  const [sortOrder,   setSortOrder]   = useState("desc");
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [showDate,    setShowDate]    = useState(false);
  const [showArchived,setShowArchived]= useState(false);
  const [syncStatus,  setSyncStatus]  = useState("idle");
  const [isOnline,    setIsOnline]    = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [embedderStatus, setEmbedderStatus] = useState("idle");
  const [semanticResults, setSemanticResults] = useState(null);
  const [crossSpaceSearch, setCrossSpaceSearch] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [noteVersions, setNoteVersions] = useState({});

  const titleRef = useRef();
  const editorRef = useRef(null);
  const saveToastTimer = useRef(null);
  const autoSaveTimer = useRef(null);
  const autoSaveStatusTimer = useRef(null);

  // B1 fix: keep refs to latest state so saveNote/triggerAutoSave always read fresh values
  const activeRef = useRef(active);
  const activeSpaceRef = useRef(activeSpace);
  const allNotesRef = useRef(allNotes);
  useEffect(() => { activeRef.current = active; });
  useEffect(() => { activeSpaceRef.current = activeSpace; });
  useEffect(() => { allNotesRef.current = allNotes; });

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (autoSaveStatusTimer.current) clearTimeout(autoSaveStatusTimer.current);
    };
  }, []);

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

  // Load data when user authenticates
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync status tracks external Firebase load
      setSyncStatus("loading");
      loadAllData(user.uid).then(data => {
        if (data) {
          if (data.spaces) setSpaces(data.spaces);
          if (data.activeSpace) setActiveSpace(data.activeSpace);
          if (data.allNotes) setAllNotes(data.allNotes);
          if (data.standaloneTasks) setStandaloneTasks(data.standaloneTasks);
          if (data.lang) setLang(data.lang);
        }
        setSyncStatus("synced");
      }).catch(err => {
        console.warn("Firebase load failed, using local data:", err?.message || err);
        setSyncStatus(navigator.onLine ? "error" : "offline");
      });
    } else {
      setSpaces(INITIAL_SPACES);
      setAllNotes(INITIAL_NOTES);
      setStandaloneTasks({});
      setActiveSpace("s1");
    }
  }, [user, authLoading, setLang]);

  // Debounced incremental Firestore sync
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
        if (lang !== prevLang.current || activeSpace !== prevActiveSpace.current) {
          promises.push(saveUserPrefs(user.uid, { lang, activeSpace }));
          prevLang.current = lang;
          prevActiveSpace.current = activeSpace;
        }
        if (spaces !== prevSpaces.current) {
          promises.push(saveAllSpaces(user.uid, spaces));
          prevSpaces.current = spaces;
        }
        if (allNotes !== prevAllNotes.current) {
          for (const [spaceId, notes] of Object.entries(allNotes)) {
            const prevNotes = prevAllNotes.current ? prevAllNotes.current[spaceId] : null;
            if (notes !== prevNotes) promises.push(saveAllNotes(user.uid, notes, spaceId));
          }
          if (prevAllNotes.current) {
            for (const spaceId of Object.keys(prevAllNotes.current)) {
              if (!allNotes[spaceId]) {
                (prevAllNotes.current[spaceId] || []).forEach(n => promises.push(deleteNoteFirestore(user.uid, n.id)));
              }
            }
          }
          prevAllNotes.current = allNotes;
        }
        if (standaloneTasks !== prevStandaloneTasks.current) {
          for (const [spaceId, tasks] of Object.entries(standaloneTasks)) {
            const prevTasks = prevStandaloneTasks.current ? prevStandaloneTasks.current[spaceId] : null;
            if (tasks !== prevTasks) promises.push(saveAllTasks(user.uid, tasks, spaceId));
          }
          prevStandaloneTasks.current = standaloneTasks;
        }
        if (promises.length > 0) await Promise.all(promises);
        setSyncStatus("synced");
      } catch (err) {
        console.warn("Firebase sync failed:", err?.message || err);
        setSyncStatus(navigator.onLine ? "error" : "offline");
      }
    }, 1500);
  }, [user, authLoading, lang, activeSpace, spaces, allNotes, standaloneTasks]);

  useEffect(() => {
    if (!user || authLoading) return;
    syncToFirestore();
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [spaces, activeSpace, allNotes, standaloneTasks, lang, user, authLoading, syncToFirestore]);

  // Derived values
  const notes  = useMemo(() => allNotes[activeSpace] || [], [allNotes, activeSpace]);
  const space  = useMemo(() => spaces.find(sp => sp.id===activeSpace) || spaces[0], [spaces, activeSpace]);
  const allTags= useMemo(() => [...new Set([...notes.flatMap(n=>n.tags), ...(active ? active.tags : [])])], [notes, active]);
  const staleN = useMemo(() => notes.filter(n=>!n.archived&&daysSince(n.lastOpened)>=30).length, [notes]);
  const archivedN = useMemo(() => notes.filter(n=>n.archived).length, [notes]);

  // Feature 5: Overdue tasks count (across note tasks + standalone tasks for current space)
  const overdueTasks = useMemo(() => {
    const today = getToday().toISOString().split("T")[0];
    const fromNotes = notes.flatMap(n => n.tasks || []).filter(t => !t.done && t.dueDate && t.dueDate < today);
    const fromStandalone = (standaloneTasks[activeSpace] || []).filter(t => !t.done && t.dueDate && t.dueDate < today);
    return [...fromNotes, ...fromStandalone];
  }, [notes, standaloneTasks, activeSpace]);

  // Vector search: lazy init
  const embedderInitAttempted = useRef(false);
  useEffect(() => {
    if (!search.trim() || embedderInitAttempted.current) return;
    embedderInitAttempted.current = true;
    if (isEmbedderReady()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync check on external system
      setEmbedderStatus("ready");
      return;
    }
    setEmbedderStatus("loading");
    initEmbedder().then(() => setEmbedderStatus("ready")).catch(() => setEmbedderStatus("error"));
  }, [search]);

  const vectorSearchTimer = useRef(null);
  useEffect(() => {
    if (embedderStatus !== "ready") return;
    indexNotes(notes);
  }, [notes, embedderStatus]);

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
      threshold: 0.35, ignoreLocation: true, includeMatches: true,
    });
  }, [notes]);

  const textFiltered = useMemo(() => {
    let pool;
    if (search.trim()) {
      const fuseResults = fuseIndex.search(search);
      const matchedIds = new Set(fuseResults.map(r => r.item.id));
      pool = fuseResults.map(r => notes.find(n => n.id === r.item.id)).filter(Boolean);
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
        return ma&&mt&&mf&&mtd;
      })
      .sort((a,b)=>sortOrder==="desc"?b.updatedAt.localeCompare(a.updatedAt):a.updatedAt.localeCompare(b.updatedAt));
  }, [search, fuseIndex, notes, showArchived, filterTag, dateFrom, dateTo, sortOrder]);

  const useSemanticFallback = search.trim().length >= 3 && textFiltered.length === 0 && embedderStatus === "ready";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cleanup when search conditions change
    if (!useSemanticFallback || !search.trim()) { setSemanticResults(null); return; }
    if (vectorSearchTimer.current) clearTimeout(vectorSearchTimer.current);
    vectorSearchTimer.current = setTimeout(async () => {
      try {
        const results = await Promise.race([
          vsearch(search, notes),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000)),
        ]);
        setSemanticResults(results);
      } catch { /* timeout or error — silently ignore */ }
    }, 400);
    return () => { if (vectorSearchTimer.current) clearTimeout(vectorSearchTimer.current); };
  }, [search, notes, useSemanticFallback]);

  const filtered = useMemo(() => (useSemanticFallback && semanticResults)
    ? semanticResults.filter(n => {
        const ma = showArchived ? !!n.archived : !n.archived;
        const mt = filterTag ? n.tags.includes(filterTag) : true;
        const mf = dateFrom ? n.updatedAt>=dateFrom : true;
        const mtd= dateTo   ? n.updatedAt<=dateTo   : true;
        return ma&&mt&&mf&&mtd;
      })
    : textFiltered, [useSemanticFallback, semanticResults, textFiltered, showArchived, filterTag, dateFrom, dateTo]);

  // Actions
  function switchSpace(id) { setActiveSpace(id); setActive(null); setFilterTag(null); setSearch(""); setShowDrop(false); setShowArchived(false); }
  function createNote()   { setShowIntent(true); }
  function createTask()   { setShowTask(true); }
  function quickCapture() {
    const n={ id:"n"+Date.now(), title:"", content:"", tags:[], linkedNotes:[], tasks:[], intent:"",
      updatedAt:getToday().toISOString().split("T")[0], lastOpened:getToday().toISOString().split("T")[0] };
    setAllNotes(p=>({...p,[activeSpace]:[n,...(p[activeSpace]||[])]}));
    setActive({...n});
    setTimeout(()=>{ if(titleRef.current) titleRef.current.focus(); },80);
  }
  function handleIntent(intent) {
    const n={ id:"n"+Date.now(), title:"", content:"", tags:[], linkedNotes:[], tasks:[], intent,
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

  const saveNoteImpl = useCallback((silent) => {
    const currentActive = activeRef.current;
    if (!currentActive) return;
    const content = editorRef.current ? editorRef.current.getHTML() : currentActive.content;
    const text = content.replace(/<[^>]*>/g, '');
    const matches = [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]);
    const spaceNotes = allNotesRef.current[activeSpaceRef.current] || [];
    const ids = [];
    matches.forEach(title => {
      const found = spaceNotes.find(n => n.title && n.title.toLowerCase() === title.toLowerCase());
      if (found && found.id !== currentActive.id) ids.push(found.id);
    });
    const linkedNotes = [...new Set(ids)];
    const updated = {...currentActive, content, linkedNotes, updatedAt:getToday().toISOString().split("T")[0]};

    // Feature 6: Save version snapshot (only on explicit save, not auto-save)
    if (!silent && currentActive.content !== content) {
      setNoteVersions(prev => {
        const versions = prev[currentActive.id] || [];
        const snapshot = { content: currentActive.content, title: currentActive.title, savedAt: new Date().toISOString() };
        return { ...prev, [currentActive.id]: [snapshot, ...versions].slice(0, 20) };
      });
    }

    setAllNotes(p=>({...p,[activeSpaceRef.current]:(p[activeSpaceRef.current]||[]).map(n=>n.id===updated.id?{...updated}:n)}));
    setActive(updated);
    if (!silent) {
      setShowSaveToast(true);
      if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
      saveToastTimer.current = setTimeout(() => setShowSaveToast(false), 1500);
    }
  }, [setShowSaveToast]);

  function saveNote(silent) { saveNoteImpl(silent); }

  function triggerAutoSave() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveStatus("saving");
    autoSaveTimer.current = setTimeout(() => {
      saveNoteImpl(true);
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

  // Feature 6: Restore note version
  function restoreVersion(noteId, version) {
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).map(n=>n.id===noteId?{...n,title:version.title,content:version.content,updatedAt:getToday().toISOString().split("T")[0]}:n)}));
    if (active && active.id===noteId) {
      setActive(prev=>({...prev,title:version.title,content:version.content,updatedAt:getToday().toISOString().split("T")[0]}));
    }
  }

  // Feature 7: Cross-space search results
  const crossSpaceFiltered = useMemo(() => {
    if (!crossSpaceSearch || !search.trim()) return [];
    const results = [];
    const q = search.toLowerCase();
    for (const [spaceId, spNotes] of Object.entries(allNotes)) {
      if (spaceId === activeSpace) continue;
      const sp = spaces.find(s => s.id === spaceId);
      (spNotes || []).forEach(n => {
        if (n.archived) return;
        if (
          (n.title || '').toLowerCase().includes(q) ||
          textPreview(n.content, 99999).toLowerCase().includes(q) ||
          n.tags.some(tg => tg.toLowerCase().includes(q))
        ) {
          results.push({ ...n, _spaceId: spaceId, _spaceName: sp?.name, _spaceEmoji: sp?.emoji, _spaceColor: sp?.color });
        }
      });
    }
    return results;
  }, [crossSpaceSearch, search, allNotes, activeSpace, spaces]);

  // Feature 8: Bulk operations
  function toggleBulkSelect(noteId) {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId); else next.add(noteId);
      return next;
    });
  }
  function bulkSelectAll() {
    setBulkSelected(new Set(filtered.map(n => n.id)));
  }
  function bulkDeselectAll() {
    setBulkSelected(new Set());
  }
  function bulkArchive() {
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).map(n=>bulkSelected.has(n.id)?{...n,archived:true}:n)}));
    setBulkMode(false);
    setBulkSelected(new Set());
  }
  function bulkDelete() {
    const ids = bulkSelected;
    const existingIds = new Set((allNotes[activeSpace] || []).map(n => n.id));
    setAllNotes(p=>({...p,[activeSpace]:(p[activeSpace]||[]).filter(n=>!ids.has(n.id))}));
    if (active && ids.has(active.id)) setActive(null);
    ids.forEach(id => { if (user && existingIds.has(id)) deleteNoteFirestore(user.uid, id).catch(() => {}); });
    setBulkMode(false);
    setBulkSelected(new Set());
  }

  // Feature 9: Per-note markdown export
  function exportNoteMd(note) {
    const lines = [];
    lines.push("# " + (note.title || "Untitled"));
    if (note.intent) lines.push("", "> " + note.intent);
    if (note.tags.length) lines.push("", "**Tags:** " + note.tags.join(", "));
    lines.push("", textPreview(note.content, 999999).replace(/\n{3,}/g, "\n\n"));
    if (note.tasks.length) {
      lines.push("", "## Tasks");
      note.tasks.forEach(tk => {
        const due = tk.dueDate ? ` (due: ${tk.dueDate})` : "";
        lines.push(`- [${tk.done ? "x" : " "}] ${tk.text}${due}`);
      });
    }
    lines.push("", "---", `Updated: ${note.updatedAt}`);
    const md = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (note.title || "note").replace(/[^a-zA-Z0-9\u00C0-\u024F\u0100-\u017F -]/g, "_") + ".md";
    a.click();
    URL.revokeObjectURL(url);
  }

  const value = {
    // from AuthContext
    user, authLoading, handleLogin, handleLogout,
    // from UIContext
    lang, setLang, theme, setTheme, t,
    showIntent, setShowIntent, showTask, setShowTask,
    showTagPick, setShowTagPick, showSpaceMgr, setShowSpaceMgr,
    showDrop, setShowDrop, showDrawer, setShowDrawer,
    showDeleteConfirm, setShowDeleteConfirm,
    showSaveToast, linkSearch, setLinkSearch,
    autoSaveStatus, setAutoSaveStatus,
    // data state
    spaces, setSpaces, activeSpace, setActiveSpace,
    allNotes, setAllNotes, standaloneTasks, setStandaloneTasks, active, setActive,
    search, setSearch, filterTag, setFilterTag, newTask, setNewTask,
    sortOrder, setSortOrder, dateFrom, setDateFrom, dateTo, setDateTo,
    showDate, setShowDate, showArchived, setShowArchived,
    syncStatus, isOnline, embedderStatus, useSemanticFallback,
    // Feature 5: overdue
    overdueTasks,
    // Feature 7: cross-space
    crossSpaceSearch, setCrossSpaceSearch, crossSpaceFiltered,
    // Feature 8: bulk
    bulkMode, setBulkMode, bulkSelected, toggleBulkSelect, bulkSelectAll, bulkDeselectAll, bulkArchive, bulkDelete,
    // Feature 6: versioning
    noteVersions, restoreVersion,
    // refs
    titleRef, editorRef,
    // derived
    notes, space, allTags, staleN, archivedN, filtered,
    // actions
    switchSpace, createNote, createTask, quickCapture, handleIntent, handleTaskIntent,
    openNote, saveNote, triggerAutoSave, toggleTask, toggleTaskInList, toggleStandaloneTask,
    addTask, removeTask, setTaskDueDate, setStandaloneTaskDueDate,
    handleLinkSelect, toggleTag, reorderNotes, reorderTasks, deleteNote, archiveNote, unarchiveNote,
    exportNoteMd,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
