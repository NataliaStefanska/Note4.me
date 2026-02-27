import { createContext, useContext, useState, useMemo } from "react";
import { T } from "../i18n/translations";

const UIContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useUI() { return useContext(UIContext); }

export function UIProvider({ children }) {
  const [lang, setLangState] = useState(() => { try { return localStorage.getItem("noteio_lang") || "pl"; } catch { return "pl"; } });
  const [theme, setThemeState] = useState(() => { try { return localStorage.getItem("noteio_theme") || "light"; } catch { return "light"; } });
  const [showIntent, setShowIntent] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [showTagPick, setShowTagPick] = useState(false);
  const [showSpaceMgr, setShowSpaceMgr] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [linkSearch, setLinkSearch] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);

  const t = useMemo(() => T[lang] || T.pl, [lang]);

  function setLang(l) {
    setLangState(l);
    try { localStorage.setItem("noteio_lang", l); } catch { /* */ }
  }
  function setTheme(t) {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("noteio_theme", t); } catch { /* */ }
  }

  const value = {
    lang, setLang, theme, setTheme, t,
    showIntent, setShowIntent, showTask, setShowTask,
    showTagPick, setShowTagPick, showSpaceMgr, setShowSpaceMgr,
    showDrop, setShowDrop, showDrawer, setShowDrawer,
    showDeleteConfirm, setShowDeleteConfirm,
    showSaveToast, setShowSaveToast,
    linkSearch, setLinkSearch,
    autoSaveStatus, setAutoSaveStatus,
  };
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
