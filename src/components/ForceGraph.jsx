import { useState, useRef, useEffect } from "react";
import { daysSince } from "../constants/data";
import { HUB_COLORS } from "../constants/data";

export default function ForceGraph({ notes, spaceColor, onOpenNote }) {
  const svgRef = useRef();
  const nodes = useRef([]);
  const links = useRef([]);
  const raf = useRef();
  const drag = useRef(null);
  const clickStart = useRef(null);
  const [, redraw] = useState(0);
  const [hov, setHov] = useState(null);

  useEffect(() => {
    const W = svgRef.current ? svgRef.current.clientWidth : 720;
    const H = svgRef.current ? svgRef.current.clientHeight : 500;
    const allTags = [...new Set(notes.flatMap(n => n.tags))];
    const byId = new Map(nodes.current.map(n => [n.id, n]));

    const tagNodes = allTags.map((tag, i) => {
      const id = "tag:" + tag;
      if (byId.has(id)) return { ...byId.get(id), tag };
      const a = (i / allTags.length) * 2 * Math.PI;
      return { id, tag, kind:"tag", color:HUB_COLORS[i % HUB_COLORS.length],
        x:W/2+Math.cos(a)*120+(Math.random()-.5)*60, y:H/2+Math.sin(a)*120+(Math.random()-.5)*60,
        vx:0, vy:0, fx:0, fy:0 };
    });

    const noteNodes = notes.map(note => {
      if (byId.has(note.id)) return { ...byId.get(note.id), note };
      return { id:note.id, note, kind:"note",
        x:W*.15+Math.random()*W*.7, y:H*.15+Math.random()*H*.7,
        vx:0, vy:0, fx:0, fy:0 };
    });

    nodes.current = [...tagNodes, ...noteNodes];
    const tagLinks = notes.flatMap(n => n.tags.map(tag => ({ s:n.id, t:"tag:"+tag, kind:"tag" })));
    const noteLinks = notes.flatMap(n => (n.linkedNotes||[]).filter(lid => notes.some(nn=>nn.id===lid)).map(lid => ({ s:n.id, t:lid, kind:"link" })));
    links.current = [...tagLinks, ...noteLinks];
  }, [notes]);

  useEffect(() => {
    function tick() {
      const ns = nodes.current;
      const ls = links.current;
      const W = svgRef.current ? svgRef.current.clientWidth : 720;
      const H = svgRef.current ? svgRef.current.clientHeight : 500;
      ns.forEach(n => { n.fx=0; n.fy=0; });
      for (let i=0;i<ns.length;i++) {
        for (let j=i+1;j<ns.length;j++) {
          const a=ns[i], b=ns[j];
          const dx=b.x-a.x, dy=b.y-a.y, dist=Math.sqrt(dx*dx+dy*dy)||1;
          const r = a.kind==="tag"&&b.kind==="tag" ? 5000 : a.kind==="tag"||b.kind==="tag" ? 1400 : 2200;
          const f=r/(dist*dist), fx=(dx/dist)*f, fy=(dy/dist)*f;
          a.fx-=fx; a.fy-=fy; b.fx+=fx; b.fy+=fy;
        }
      }
      ls.forEach(({ s, t, kind }) => {
        const a=ns.find(n=>n.id===s), b=ns.find(n=>n.id===t);
        if (!a||!b) return;
        const dx=b.x-a.x, dy=b.y-a.y, dist=Math.sqrt(dx*dx+dy*dy)||1;
        const spring = kind==="link" ? 100 : 130;
        const strength = kind==="link" ? 0.02 : 0.014;
        const f=(dist-spring)*strength, fx=(dx/dist)*f, fy=(dy/dist)*f;
        a.fx+=fx; a.fy+=fy; b.fx-=fx; b.fy-=fy;
      });
      ns.forEach(n => {
        n.fx+=(W/2-n.x)*(n.kind==="tag"?.005:.002);
        n.fy+=(H/2-n.y)*(n.kind==="tag"?.005:.002);
      });
      ns.forEach(n => {
        if (drag.current===n.id) return;
        n.vx=(n.vx+n.fx)*.92; n.vy=(n.vy+n.fy)*.92;
        n.x=Math.max(50,Math.min(W-50,n.x+n.vx));
        n.y=Math.max(50,Math.min(H-50,n.y+n.vy));
      });
      redraw(c=>c+1);
      raf.current=requestAnimationFrame(tick);
    }
    raf.current=requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  useEffect(() => {
    function mv(e) {
      if (!drag.current||!svgRef.current) return;
      if (e.cancelable) e.preventDefault();
      const r=svgRef.current.getBoundingClientRect();
      const cx=e.touches?e.touches[0].clientX:e.clientX;
      const cy=e.touches?e.touches[0].clientY:e.clientY;
      const nd=nodes.current.find(n=>n.id===drag.current);
      if (nd) { nd.x=cx-r.left; nd.y=cy-r.top; nd.vx=0; nd.vy=0; }
    }
    function up() { drag.current=null; }
    window.addEventListener("mousemove",mv);
    window.addEventListener("mouseup",up);
    window.addEventListener("touchmove",mv,{passive:false});
    window.addEventListener("touchend",up);
    return () => {
      window.removeEventListener("mousemove",mv);
      window.removeEventListener("mouseup",up);
      window.removeEventListener("touchmove",mv);
      window.removeEventListener("touchend",up);
    };
  }, []);

  function onDown(e, id) {
    e.stopPropagation();
    drag.current=id;
    const cx=e.clientX||(e.touches&&e.touches[0]&&e.touches[0].clientX)||0;
    const cy=e.clientY||(e.touches&&e.touches[0]&&e.touches[0].clientY)||0;
    clickStart.current={id, time:Date.now(), x:cx, y:cy};
    const nd=nodes.current.find(n=>n.id===id);
    if (nd) { nd.vx=0; nd.vy=0; }
  }

  function onUp(e, node) {
    drag.current=null;
    const cs=clickStart.current;
    if (!cs||cs.id!==node.id) return;
    const cx=e.clientX||(e.changedTouches&&e.changedTouches[0]&&e.changedTouches[0].clientX)||cs.x;
    const cy=e.clientY||(e.changedTouches&&e.changedTouches[0]&&e.changedTouches[0].clientY)||cs.y;
    if (Date.now()-cs.time<250&&Math.hypot(cx-cs.x,cy-cs.y)<8&&node.kind==="note") onOpenNote(node.note);
    clickStart.current=null;
  }

  const hovLinks=hov ? links.current.filter(l=>l.s===hov||l.t===hov) : [];
  const conn=new Set(hovLinks.flatMap(l=>[l.s,l.t]));

  return (
    <svg ref={svgRef} width="100%" height="100%" style={{ display:"block" }}>
      <defs>
        <radialGradient id="gbg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1C1917"/><stop offset="100%" stopColor="#080604"/>
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#gbg)"/>
      {links.current.map((l,i) => {
        const a=nodes.current.find(n=>n.id===l.s), b=nodes.current.find(n=>n.id===l.t);
        if (!a||!b) return null;
        const hot=hov&&(l.s===hov||l.t===hov);
        const isNoteLink = l.kind==="link";
        const tn=nodes.current.find(n=>n.kind==="tag"&&(n.id===l.s||n.id===l.t));
        const lc=isNoteLink?spaceColor:(tn?tn.color:spaceColor);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={hot?lc+"EE":lc+(isNoteLink?"55":"30")}
          strokeWidth={isNoteLink?(hot?3:1.5):(hot?2:.8)}
          strokeDasharray={isNoteLink?undefined:"none"}
          style={{ transition:"stroke .15s" }}/>;
      })}
      {nodes.current.filter(n=>n.kind==="tag").map(node => {
        const h=hov===node.id, cd=conn.has(node.id), dim=hov&&!h&&!cd;
        const R=18+notes.filter(n=>n.tags.includes(node.tag)).length*4;
        return (
          <g key={node.id} style={{ cursor:"grab" }}
            onMouseEnter={()=>setHov(node.id)} onMouseLeave={()=>setHov(null)}
            onMouseDown={e=>onDown(e,node.id)} onMouseUp={e=>onUp(e,node)}
            onTouchStart={e=>onDown(e,node.id)} onTouchEnd={e=>onUp(e,node)}>
            {h && <circle cx={node.x} cy={node.y} r={R+10} fill="none" stroke={node.color} strokeWidth="1" opacity=".25" filter="url(#glow)"/>}
            <circle cx={node.x} cy={node.y} r={h?R+4:R} fill={dim?"#232120":node.color} style={{ transition:"r .15s,fill .2s" }}/>
            {h && <text x={node.x} y={node.y-R-10} textAnchor="middle" fill={node.color} fontSize="11" fontWeight="600" style={{ pointerEvents:"none", userSelect:"none" }}>#{node.tag}</text>}
          </g>
        );
      })}
      {nodes.current.filter(n=>n.kind==="note").map(node => {
        const h=hov===node.id, cd=conn.has(node.id), dim=hov&&!h&&!cd;
        const stale=daysSince(node.note.lastOpened)>=30;
        const R=h?11:7;
        const tn=nodes.current.find(n=>n.kind==="tag"&&n.tag===node.note.tags[0]);
        const nc=tn?tn.color:spaceColor;
        const title=node.note.title||"Bez tytu\u0142u";
        return (
          <g key={node.id} style={{ cursor:"grab" }}
            onMouseEnter={()=>setHov(node.id)} onMouseLeave={()=>setHov(null)}
            onMouseDown={e=>onDown(e,node.id)} onMouseUp={e=>onUp(e,node)}
            onTouchStart={e=>onDown(e,node.id)} onTouchEnd={e=>onUp(e,node)}>
            {h && <circle cx={node.x} cy={node.y} r={R+8} fill={nc+"25"} filter="url(#glow)"/>}
            <circle cx={node.x} cy={node.y} r={R} fill={dim?"#232120":nc} style={{ transition:"r .12s,fill .15s" }}/>
            {stale&&!dim && <circle cx={node.x+R} cy={node.y-R} r="3.5" fill="#F59E0B"/>}
            <text x={node.x} y={node.y+R+12} textAnchor="middle"
              fill={dim?"#1e1c1a":h?"#E7E5E4":"#3D3A38"} fontSize="10"
              style={{ pointerEvents:"none", userSelect:"none", transition:"fill .15s" }}>
              {title.length>22?title.slice(0,22)+"\u2026":title}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
