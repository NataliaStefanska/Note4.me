import { useRef } from "react";
import { useApp } from "../context/AppContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { textPreview } from "../utils/helpers";
import { s } from "../styles/appStyles";

function noteToMarkdown(note) {
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
  if (note.linkedNotes?.length) lines.push("", "**Linked notes:** " + note.linkedNotes.join(", "));
  lines.push("", "---", `Updated: ${note.updatedAt}`);
  return lines.join("\n");
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsView() {
  const { t, user, space, lang, setLang, theme, setTheme, syncStatus, handleLogout,
    allNotes, spaces, standaloneTasks, setAllNotes, setSpaces, setStandaloneTasks,
  } = useApp();
  const isMobile = useIsMobile();
  const importRef = useRef();

  function exportMarkdown() {
    const allMd = [];
    spaces.forEach(sp => {
      const notes = allNotes[sp.id] || [];
      if (!notes.length) return;
      allMd.push(`\n# ${sp.emoji} ${sp.name}\n`);
      notes.forEach(n => allMd.push(noteToMarkdown(n), "\n"));
    });
    downloadFile(allMd.join("\n"), "noteio-export.md", "text/markdown");
  }

  function exportJSON() {
    const data = { spaces, allNotes, standaloneTasks, exportedAt: new Date().toISOString() };
    downloadFile(JSON.stringify(data, null, 2), "noteio-export.json", "application/json");
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.spaces && data.allNotes) {
          if (data.spaces) setSpaces(data.spaces);
          if (data.allNotes) setAllNotes(data.allNotes);
          if (data.standaloneTasks) setStandaloneTasks(data.standaloneTasks);
          alert(lang === "pl" ? "Import zakończony!" : "Import complete!");
        } else {
          alert(lang === "pl" ? "Nieprawidłowy format pliku" : "Invalid file format");
        }
      } catch {
        alert(lang === "pl" ? "Błąd parsowania pliku JSON" : "Error parsing JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
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

        {/* Theme */}
        <div style={s.setSection}>
          <div style={s.setLabel}>{t.setTheme}</div>
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <button style={{ ...s.ctrlBtn, ...(theme==="light"?{background:space.color+"18",color:space.color,borderColor:space.color+"44"}:{}) }}
              onClick={()=>setTheme("light")}>{t.setLight}</button>
            <button style={{ ...s.ctrlBtn, ...(theme==="dark"?{background:space.color+"18",color:space.color,borderColor:space.color+"44"}:{}) }}
              onClick={()=>setTheme("dark")}>{t.setDark}</button>
          </div>
        </div>

        {/* Export / Import */}
        <div style={s.setSection}>
          <div style={s.setLabel}>{t.setExport || "Export / Import"}</div>
          <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
            <button style={s.ctrlBtn} onClick={exportMarkdown}>{t.exportMd || "Export Markdown"}</button>
            <button style={s.ctrlBtn} onClick={exportJSON}>{t.exportJson || "Export JSON"}</button>
            <button style={s.ctrlBtn} onClick={() => importRef.current?.click()}>{t.importJson || "Import JSON"}</button>
            <input ref={importRef} type="file" accept=".json" style={{ display:"none" }} onChange={handleImport}/>
          </div>
          <div style={{ fontSize:11, color:"#A8A29E", marginTop:6 }}>
            {lang === "pl" ? "Eksportuj notatki do Markdown lub JSON. Importuj z pliku JSON." : "Export notes to Markdown or JSON. Import from a JSON file."}
          </div>
        </div>

        {/* Data sync info */}
        <div style={s.setSection}>
          <div style={s.setLabel}>{t.setData}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:syncStatus==="synced"?"#10B981":syncStatus==="saving"?"#F59E0B":syncStatus==="offline"?"#A8A29E":"#EF4444" }}/>
            <span style={{ fontSize:12, color:"var(--text-muted)" }}>
              {t["sync_"+syncStatus] || syncStatus}
            </span>
          </div>
          <div style={{ fontSize:12, color:"#A8A29E", marginTop:6 }}>{user.email}</div>
        </div>

        {/* About */}
        <div style={s.setSection}>
          <div style={s.setLabel}>{t.setAbout}</div>
          <div style={{ fontSize:13, color:"#78716C", lineHeight:1.6, marginTop:4 }}>{t.setAboutDesc}</div>
          <div style={{ fontSize:11, color:"#A8A29E", marginTop:8 }}>v1.1.0</div>
        </div>
      </div>
    </div>
  );
}
