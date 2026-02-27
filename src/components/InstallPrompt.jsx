import { useState, useEffect } from "react";
import { useIsMobile } from "../hooks/useIsMobile";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

export default function InstallPrompt({ t }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    const dismissedAt = localStorage.getItem("noteio-install-dismissed");
    return dismissedAt ? Date.now() - Number(dismissedAt) < 86400000 : false;
  });
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isStandalone() || dismissed) return;

    function handlePrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", handlePrompt);

    if (isIos()) {
      const timer = setTimeout(() => setShowIos(true), 3000);
      return () => { clearTimeout(timer); window.removeEventListener("beforeinstallprompt", handlePrompt); };
    }

    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, [dismissed]);

  useEffect(() => {
    function handleUpdate() { setUpdateAvailable(true); }
    window.addEventListener("sw-updated", handleUpdate);
    return () => window.removeEventListener("sw-updated", handleUpdate);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIos(false);
    localStorage.setItem("noteio-install-dismissed", String(Date.now()));
  }

  // Bottom position: above mobile nav (64px) + gap, or at bottom on desktop
  const bottomPos = isMobile ? 76 : 20;

  if (updateAvailable) {
    return (
      <div style={{ ...styles.banner, bottom: bottomPos }}>
        <span style={styles.text}>{t.updateAvailable}</span>
        <button style={styles.installBtn} onClick={() => window.location.reload()}>
          {t.updateBtn}
        </button>
      </div>
    );
  }

  if (dismissed || isStandalone()) return null;

  if (deferredPrompt) {
    return (
      <div style={{ ...styles.banner, bottom: bottomPos }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={styles.title}>{t.installTitle}</div>
          <div style={styles.desc}>{t.installDesc}</div>
        </div>
        <button style={styles.installBtn} onClick={handleInstall}>{t.installBtn}</button>
        <button style={styles.dismissBtn} onClick={handleDismiss}>{"\u00D7"}</button>
      </div>
    );
  }

  if (showIos) {
    return (
      <div style={{ ...styles.banner, bottom: bottomPos }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={styles.title}>{t.installTitle}</div>
          <div style={styles.desc}>
            {t.installIos}{" "}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign:"middle" }}>
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            {" "}<strong>{t.installIosShare}</strong>, {t.installIosThen}
          </div>
        </div>
        <button style={styles.dismissBtn} onClick={handleDismiss}>{"\u00D7"}</button>
      </div>
    );
  }

  return null;
}

const styles = {
  banner: {
    position: "fixed",
    left: 16,
    right: 16,
    maxWidth: 440,
    margin: "0 auto",
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    boxShadow: "0 8px 32px rgba(0,0,0,.25)",
    zIndex: 700,
    fontFamily: "inherit",
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  desc: {
    fontSize: 12,
    color: "var(--text-muted)",
    marginTop: 2,
  },
  text: {
    fontSize: 13,
    color: "var(--text-primary)",
    flex: 1,
  },
  installBtn: {
    background: "#10B981",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  dismissBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-faint)",
    fontSize: 18,
    cursor: "pointer",
    padding: 4,
    lineHeight: 1,
    flexShrink: 0,
  },
};
