import { useApp } from "../context/AppContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { s } from "../styles/appStyles";

export default function SettingsView() {
  const { t, user, space, lang, setLang, syncStatus, handleLogout } = useApp();
  const isMobile = useIsMobile();

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

        {/* Data sync info */}
        <div style={s.setSection}>
          <div style={s.setLabel}>{t.setData}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:syncStatus==="synced"?"#10B981":syncStatus==="saving"?"#F59E0B":"#EF4444" }}/>
            <span style={{ fontSize:12, color:"#78716C" }}>
              {syncStatus==="synced" ? (lang==="pl"?"Zsynchronizowano z Firebase":"Synced with Firebase")
               : syncStatus==="saving" ? (lang==="pl"?"Zapisywanie...":"Saving...")
               : syncStatus==="loading" ? (lang==="pl"?"Wczytywanie...":"Loading...")
               : (lang==="pl"?"B\u0142\u0105d synchronizacji":"Sync error")}
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
  );
}
