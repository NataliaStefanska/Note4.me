import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "./context/AppContext";
import { useIsMobile } from "./hooks/useIsMobile";
import { s } from "./styles/appStyles";
import { m } from "./styles/modalStyles";

import LoginScreen from "./components/LoginScreen";
import IntentPrompt from "./components/IntentPrompt";
import TaskIntentModal from "./components/TaskIntentModal";
import SpaceManager from "./components/SpaceManager";
import HelpModal from "./components/HelpModal";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";

import NotesList from "./views/NotesList";
import NoteEditor from "./views/NoteEditor";
import TasksPage from "./views/TasksPage";
import GraphView from "./views/GraphView";
import SettingsView from "./views/SettingsView";

export default function App() {
  const {
    user, authLoading, t, space, spaces, setSpaces,
    showIntent, showTask, setShowTask, showSpaceMgr, setShowSpaceMgr,
    showDeleteConfirm, setShowDeleteConfirm, showSaveToast,
    showDrawer, setShowDrawer, filterTag,
    handleLogin, handleIntent, handleTaskIntent, deleteNote,
  } = useApp();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);

  // Global keyboard shortcut: ? for help
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !["INPUT","TEXTAREA"].includes(e.target.tagName) && !e.target.closest("[contenteditable]")) {
        setShowHelp(v => !v);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Loading
  if (authLoading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#0C0A09" }}>
      <div style={{ color:"#57534E", fontSize:14 }}>Loading...</div>
    </div>
  );

  // Not logged in
  if (!user) return <LoginScreen onLogin={handleLogin} t={t} />;

  function handleIntentConfirm(intent) {
    handleIntent(intent);
    navigate("/editor");
  }

  function handleDeleteConfirm(noteId) {
    deleteNote(noteId);
    if (location.pathname === "/editor") navigate("/");
  }

  const isEditor = location.pathname === "/editor";
  const isSettings = location.pathname === "/settings";

  return (
    <div style={s.root}>
      {/* Modals */}
      {showIntent && <IntentPrompt onConfirm={handleIntentConfirm} onSkip={()=>handleIntentConfirm("")} t={t}/>}
      {showTask && <TaskIntentModal color={space.color} onConfirm={handleTaskIntent} onClose={()=>setShowTask(false)} t={t}/>}
      {showSpaceMgr && <SpaceManager spaces={spaces} onSave={u=>{setSpaces(u);setShowSpaceMgr(false);}} onClose={()=>setShowSpaceMgr(false)} t={t}/>}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} t={t}/>}
      {showDeleteConfirm && (
        <div style={m.overlay} onClick={()=>setShowDeleteConfirm(null)}>
          <div style={{ ...m.box, maxWidth:360 }} onClick={e=>e.stopPropagation()}>
            <div style={m.q}>{t.deleteConfirmQ}</div>
            <div style={m.sub}>{t.deleteConfirmSub}</div>
            <div style={m.row}>
              <button style={m.skip} onClick={()=>setShowDeleteConfirm(null)}>{t.deleteConfirmNo}</button>
              <button style={{ ...m.ok, background:"#EF4444" }} onClick={()=>handleDeleteConfirm(showDeleteConfirm)}>{t.deleteConfirmYes}</button>
            </div>
          </div>
        </div>
      )}

      {/* Save toast */}
      {showSaveToast && (
        <div style={s.saveToast}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          {t.savedToast}
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile && showDrawer && (
        <div style={s.drawerOverlay} onClick={()=>setShowDrawer(false)}>
          <div style={s.drawer} onClick={e=>e.stopPropagation()}>
            <Sidebar onClose={()=>setShowDrawer(false)}/>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={s.sidebar}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={s.logo}><div style={s.logoMark}>N</div><span style={s.logoTxt}>Note.io</span></div>
            {user.photoURL
              ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={{ ...s.avatar, ...(isSettings?{borderColor:space.color,boxShadow:"0 0 0 2px "+space.color+"44"}:{}) }} onClick={()=>navigate("/settings")} />
              : <div style={{ ...s.avatar, ...(isSettings?{borderColor:space.color,boxShadow:"0 0 0 2px "+space.color+"44"}:{}) }} onClick={()=>navigate("/settings")}>{(user.displayName||"U")[0]}</div>
            }
          </div>
          <Sidebar/>
        </div>
      )}

      {/* Main content */}
      <div style={{ ...s.main, paddingBottom:isMobile?76:0 }}>
        {/* Mobile topbar */}
        {isMobile && !isEditor && !isSettings && (
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
              ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={s.avatar} onClick={()=>navigate("/settings")} />
              : <div style={s.avatar} onClick={()=>navigate("/settings")}>{(user.displayName||"U")[0]}</div>
            }
          </div>
        )}

        <Routes>
          <Route path="/" element={<NotesList />} />
          <Route path="/editor" element={<NoteEditor />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/graph" element={<GraphView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </div>

      {/* Help button (desktop only) */}
      {!isMobile && (
        <button onClick={() => setShowHelp(true)}
          title={t.helpTitle || "Keyboard shortcuts & tips"}
          style={{
            position: "fixed", bottom: 16, right: 16, width: 32, height: 32, borderRadius: "50%",
            background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)",
            fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", boxShadow: "0 2px 8px var(--shadow)", zIndex: 100, fontFamily: "inherit",
          }}>?</button>
      )}

      {/* Mobile bottom nav */}
      {isMobile && !isEditor && <MobileNav />}
    </div>
  );
}
