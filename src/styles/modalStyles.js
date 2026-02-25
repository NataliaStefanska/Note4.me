export const m = {
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, backdropFilter:"blur(3px)" },
  box:     { background:"#fff", borderRadius:12, padding:"32px 36px", width:420, maxWidth:"90vw", display:"flex", flexDirection:"column", gap:12, boxShadow:"0 20px 60px rgba(0,0,0,.2)" },
  q:       { fontSize:20, fontWeight:700, color:"#1C1917", letterSpacing:"-0.02em" },
  sub:     { fontSize:13, color:"#78716C" },
  inp:     { border:"1.5px solid #E7E5E4", borderRadius:8, padding:"10px 14px", fontSize:14, fontFamily:"inherit", color:"#1C1917", outline:"none", background:"#FAFAF9", width:"100%", boxSizing:"border-box" },
  row:     { display:"flex", justifyContent:"flex-end", gap:10, marginTop:4 },
  skip:    { background:"transparent", border:"none", color:"#A8A29E", fontSize:13, cursor:"pointer", fontFamily:"inherit", padding:"8px 4px" },
  ok:      { background:"#1C1917", color:"#FAFAF9", border:"none", borderRadius:7, padding:"8px 18px", fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:500 },
};
