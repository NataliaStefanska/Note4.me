import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { s } from "../styles/appStyles";
import { NAV_ITEMS } from "./navItems";

export default function MobileNav() {
  const { t, space, quickCapture, createTask } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const NAV = NAV_ITEMS(t);

  function handleFab() {
    if (location.pathname === "/tasks") {
      createTask();
    } else {
      quickCapture();
      navigate("/editor");
    }
  }

  return (
    <div style={s.mNav}>
      {NAV.slice(0,2).map(item=>(
        <button key={item.id} style={{ ...s.mNavBtn, ...(location.pathname===item.path?{color:space.color}:{}) }} onClick={()=>navigate(item.path)}>
          {item.icon}
          <span style={{ fontSize:10 }}>{item.label}</span>
        </button>
      ))}
      <button style={{ ...s.fab, background:space.color }} onClick={handleFab}>
        <span style={{ fontSize:26, lineHeight:1, color:"#fff" }}>+</span>
      </button>
      {NAV.slice(2,4).map(item=>(
        <button key={item.id} style={{ ...s.mNavBtn, ...(location.pathname===item.path?{color:space.color}:{}) }} onClick={()=>navigate(item.path)}>
          {item.icon}
          <span style={{ fontSize:10 }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
