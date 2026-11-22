"use strict";
/* Shared by the projected screen and the phones */
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const uid = p => p + Math.random().toString(36).slice(2, 9);
// True random: crypto-based integer in [0,n)
function rnd(n){ if(n<=0) return 0; const a=new Uint32Array(1), lim=Math.floor(0x100000000/n)*n; let x; do{ crypto.getRandomValues(a); x=a[0]; }while(x>=lim); return x%n; }
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=rnd(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const sleep = ms => new Promise(r=>setTimeout(r,ms));
function toast(msg){ const t=document.createElement("div"); t.className="toast"; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2600); }
const fullName = m => [m.first, m.last].filter(Boolean).join(" ");
/* ================= Avatars ================= */
function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const SKIN=["#f9d4b4","#f1c09a","#e0a77d","#c98a5f","#a86b45","#7c4a2d","#5a3520"];
const HAIR=["#1d1a1a","#3b2416","#6b3f1e","#a5652b","#d9a441","#e8d4a0","#8d8d8d","#b8352b","#2a2f6e"];
const BG=["#3c49d6","#6b3bd1","#c0398a","#e07a2e","#1d9a8a","#2f86d6","#8c45c9","#d64545","#2fae5f"];
const SHIRT=["#0a0c62","#e2e8ff","#c0392b","#16a085","#f2c14e","#34495e","#8e44ad","#e67e22"];
function genAvatarSVG(seed){
  const r=mulberry(seed*9301+49297), p=a=>a[Math.floor(r()*a.length)];
  const skin=p(SKIN), hair=p(HAIR), bg=p(BG), shirt=p(SHIRT), style=Math.floor(r()*7), glasses=r()<.28, beard=r()<.2, smile=Math.floor(r()*3);
  let back="", front="";
  if(style===1) back=`<path d="M27 44 Q24 86 30 92 L70 92 Q76 86 73 44 Z" fill="${hair}"/>`;
  if(style===4) back=`<circle cx="50" cy="19" r="9" fill="${hair}"/>`;
  if(style===5) back=`<g fill="${hair}">${[...Array(9)].map((_,i)=>{const a=Math.PI+i*Math.PI/8;return `<circle cx="${50+24*Math.cos(a)}" cy="${42+22*Math.sin(a)}" r="8"/>`}).join("")}</g>`;
  if(style===0||style===1||style===4) front=`<path d="M29 44 Q28 20 50 20 Q72 20 71 44 Q66 30 50 30 Q36 30 29 44 Z" fill="${hair}"/>`;
  if(style===2) front=`<path d="M29 42 L31 22 L38 28 L44 18 L50 26 L57 17 L62 27 L69 21 L71 42 Q64 30 50 31 Q36 30 29 42 Z" fill="${hair}"/>`;
  if(style===3) front=`<path d="M29 46 Q27 18 52 19 Q74 21 71 40 Q60 26 40 32 Q32 36 29 46 Z" fill="${hair}"/>`;
  if(style===5) front=`<path d="M30 40 Q34 24 50 24 Q66 24 70 40 Q60 32 50 32 Q40 32 30 40Z" fill="${hair}"/>`;
  const mouth = smile===0?`<path d="M42 58 Q50 65 58 58" stroke="#5a2a1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    : smile===1?`<path d="M41 57 Q50 68 59 57 Z" fill="#7a2a20"/><path d="M43 58 Q50 61 57 58" fill="#fff"/>`
    : `<ellipse cx="50" cy="60" rx="4" ry="3" fill="#7a2a20"/>`;
  const gl = glasses?`<g fill="none" stroke="#1b1b2f" stroke-width="2"><circle cx="41.5" cy="47" r="6"/><circle cx="58.5" cy="47" r="6"/><path d="M47.5 47 H52.5"/></g>`:"";
  const bd = beard?`<path d="M31 50 Q33 74 50 76 Q67 74 69 50 Q66 64 50 66 Q34 64 31 50Z" fill="${hair}" opacity=".95"/>`:"";
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="100" height="100" fill="${bg}"/>
  <circle cx="50" cy="40" r="44" fill="#fff" opacity=".08"/>${back}
  <path d="M14 104 Q16 78 50 76 Q84 78 86 104Z" fill="${shirt}"/><rect x="44" y="62" width="12" height="14" fill="${skin}"/>
  <ellipse cx="29" cy="48" rx="4" ry="6" fill="${skin}"/><ellipse cx="71" cy="48" rx="4" ry="6" fill="${skin}"/>
  <ellipse cx="50" cy="46" rx="21" ry="24" fill="${skin}"/>${front}${bd}
  <circle cx="41.5" cy="47" r="2.6" fill="#1b1b2f"/><circle cx="58.5" cy="47" r="2.6" fill="#1b1b2f"/>
  <path d="M37 40 Q41 38 45 40 M55 40 Q59 38 63 40" stroke="#3b2416" stroke-width="1.8" fill="none" stroke-linecap="round"/>${gl}
  <circle cx="36" cy="55" r="3.5" fill="#ff7b7b" opacity=".25"/><circle cx="64" cy="55" r="3.5" fill="#ff7b7b" opacity=".25"/>${mouth}</svg>`;
}
function initials(name){ return name.split(/[\s-]+/).filter(Boolean).slice(0,2).map(s=>s[0].toUpperCase()).join(""); }
function avatarHTML(av, name, size=64, extra=""){
  av=av||{kind:"gen",seed:1};
  let inner;
  if(av.kind==="img" && av.src) inner=`<img src="${esc(av.src)}" alt="">`;
  else if(av.kind==="emoji") inner=`<div class="emo" style="font-size:${Math.round(size*.58)}px">${esc(av.v)}</div>`;
  else if(av.kind==="ini") inner=`<div class="ini" style="background:${esc(av.color||"#3c49d6")};font-size:${Math.round(size*.4)}px">${esc(initials(name||"?"))}</div>`;
  else inner=genAvatarSVG(+av.seed||1);
  return `<span class="av" style="width:${size}px;height:${size}px;${extra}" role="img" aria-label="${esc(name||"avatar")}">${inner}</span>`;
}

const ICON_PHONE=`<svg viewBox="0 0 48 32" aria-hidden="true"><path fill="#fff" d="M14 4c-3 0-6 2-6 6v2h8l2-4c2-1 10-1 12 0l2 4h8v-2c0-4-3-6-6-6H14z"/><path fill="#fff" d="M17 13 12 26c0 2 1 3 3 3h18c2 0 3-1 3-3l-5-13H17zm7 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/></svg>`;
const ICON_PUBLIC=`<svg viewBox="0 0 48 32" fill="#fff" aria-hidden="true"><circle cx="24" cy="9" r="6"/><path d="M13 30q0-11 11-11t11 11z"/><circle cx="10" cy="12" r="4.5" opacity=".85"/><path d="M1 30q0-9 9-9 4 0 6 2-4 3-5 7z" opacity=".85"/><circle cx="38" cy="12" r="4.5" opacity=".85"/><path d="M47 30q0-9-9-9-4 0-6 2 4 3 5 7z" opacity=".85"/></svg>`;
const ICON_FIFTY = "50:50";
const ptsTxt = n => `${n} point${n>1?"s":""}`;
async function api(path, body){
  const r = await fetch(path, {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body||{})});
  let j={}; try{ j=await r.json(); }catch(e){}
  if(r.status===401) j.unauthorized=true;
  return j;
}
