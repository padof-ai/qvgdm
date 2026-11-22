"use strict";
/* Page animateur — projetée. Utilise common.js (avatars, utilitaires) et default-config.js */
function ask(msg,{ok="Confirmer",cancel="Annuler"}={}){
  return new Promise(res=>{
    const ov=document.createElement("div"); ov.className="ov dlg"; ov.setAttribute("role","alertdialog"); ov.setAttribute("aria-modal","true");
    ov.innerHTML=`<div class="ovp" style="max-width:540px"><p style="color:#fff;font-size:19px;line-height:1.4;margin:0 0 22px">${esc(msg)}</p>
      <div class="row center">${cancel?`<button class="btn ghost" data-r="0">${esc(cancel)}</button>`:""}<button class="btn gold" data-r="1">${esc(ok)}</button></div></div>`;
    const done=v=>{ ov.remove(); res(v); };
    ov.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>done(b.dataset.r==="1"));
    ov.addEventListener("keydown",e=>{ if(e.key==="Escape"){ e.stopPropagation(); done(false); } });
    document.body.appendChild(ov); ov.querySelector('[data-r="1"]').focus();
  });
}
const notice = msg => ask(msg,{ok:"Compris",cancel:null});
/* ================= Storage (settings stay in this browser) ================= */
const NS="";
const KEY_CFG="qvgda_online_config_v1", KEY_SNAP="qvgda_online_snapshot_v1", KEY_ADMIN="qvgda_online_admin_key";
function load(k){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):null; }catch(e){ return null; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); return true; }catch(e){ toast("Sauvegarde impossible : stockage plein ou indisponible. Pensez à exporter la configuration."); return false; } }
const numOrNull=v=>(v===null||v===undefined||v===""||!isFinite(+v))?null:Math.max(0,Math.min(1000,Math.round(+v)));
function normalizeConfig(c){
  const d=clone(DEFAULT_CONFIG);
  const o=Object.assign({}, d, c||{});
  o.host=Object.assign({}, d.host, (c&&c.host)||{});
  { const t=String(o.title||"").trim(), q=/\?\s*$/.test(t)?" ?":"", w=t.replace(/\s*\?\s*$/,"").split(/\s+/).filter(Boolean);
    const last=w.length>1?w.pop():(w[0]||""); const e=(c&&c.emblem)||{};
    o.emblem={ top:e.top!=null?String(e.top):w.join(" ").toUpperCase(), bottom:e.bottom!=null?String(e.bottom):"",
      center:e.center!=null?String(e.center):(last+q).toUpperCase(),
      logo:(e.logo&&["emoji","img","none"].includes(e.logo.kind))?e.logo:{kind:"emoji",v:"👏"},
      logoSize:Math.max(30,Math.min(110,+e.logoSize||48)) }; }
  o.showDifficulty=!!(c&&c.showDifficulty);
  o.host2=Object.assign({on:false,first:"",last:"",avatar:{kind:"gen",seed:777}}, (c&&c.host2)||{});
  o.phoneSec=Math.max(5,Math.min(180, (c&&c.phoneSec)!=null?+c.phoneSec:30));
  o.jokers=Object.assign({fifty:true,public:true,phone:false}, (c&&c.jokers)||{});
  o.jokerScope=(c&&c.jokerScope)==="question"?"question":"game";
  o.autoClose=!(c&&c.autoClose===false);
  o.basePoints=Math.max(1,+o.basePoints||3); o.jokerCost=Math.max(0,o.jokerCost==null?1:+o.jokerCost);
  o.questions=Array.isArray(o.questions)?o.questions.map(q=>({id:q.id||uid("q"),text:String(q.text||""),answers:[0,1,2,3].map(i=>String((q.answers||[])[i]||"")),
    correct:Math.min(3,Math.max(0,+q.correct||0)), label:String(q.label||""), note:String(q.note||""),
    jokerCost:numOrNull(q.jokerCost), points:numOrNull(q.points),
    difficulty:[1,2,3,4].includes(+q.difficulty)?+q.difficulty:2,
    imgMode:["none","single","answers"].includes(q.imgMode)?q.imgMode:"none",img:q.img||null,aImgs:[0,1,2,3].map(i=>(q.aImgs||[])[i]||null)})):[];
  o.soundOn=Object.assign({}, (c&&c.soundOn)||{});
  o.soundVol=Object.assign({}, (c&&c.soundVol)||{});
  o.suspenseSec=Math.max(1,Math.min(10, o.suspenseSec==null?6:+o.suspenseSec));
  o.revealMode=(c&&c.revealMode)==="auto"?"auto":"manual";
  o.timer=Math.max(0,Math.min(600,o.timer==null?30:+o.timer||0));
  delete o.teams; delete o.draw; delete o.fixedPlayers; delete o.drawEnabled; delete o.noRepeat;
  return o;
}
let CFG = normalizeConfig(load(KEY_CFG) || DEFAULT_CONFIG);
let saveTimer; function saveCfg(){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>{ save(KEY_CFG,CFG); syncSettings(); },300); }

/* ================= Audio (synthesized) ================= */
let AC=null, muted=false, BUS=null;
function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC&&AC.state==="suspended") AC.resume(); return AC; }
function tone(freq, t0, dur, type="sine", vol=.2, glide){
  const c=ac(); if(!c||muted) return; const o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.setValueAtTime(freq,c.currentTime+t0);
  if(glide) o.frequency.exponentialRampToValueAtTime(glide,c.currentTime+t0+dur);
  g.gain.setValueAtTime(0.0001,c.currentTime+t0); g.gain.exponentialRampToValueAtTime(vol,c.currentTime+t0+.02); g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+t0+dur);
  o.connect(g).connect(BUS||c.destination); o.start(c.currentTime+t0); o.stop(c.currentTime+t0+dur+.05);
}
function noise(t0,dur,vol=.15,freq=1200,q=.7){
  const c=ac(); if(!c||muted) return; const b=c.createBuffer(1,c.sampleRate*dur,c.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  const s=c.createBufferSource(); s.buffer=b; const f=c.createBiquadFilter(); f.type="bandpass"; f.frequency.value=freq; f.Q.value=q; const g=c.createGain();
  g.gain.setValueAtTime(vol,c.currentTime+t0); g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+t0+dur); s.connect(f).connect(g).connect(BUS||c.destination); s.start(c.currentTime+t0);
}
const SFX={
  tick(){ tone(1400,0,.04,"square",.06); },
  lock(){ tone(220,0,.5,"sawtooth",.08); tone(330,0,.5,"sine",.1); },
  suspense(d=2.6){ for(let i=0;i<d*4;i++){ tone(110+(i%2)*6,i*.25,.26,"sawtooth",.05); } tone(55,0,d,"sine",.18,110); },
  good(){ [523,659,784,1047].forEach((f,i)=>tone(f,i*.11,.5,"triangle",.18)); tone(1568,.45,.9,"sine",.1); },
  bad(){ tone(196,0,.45,"square",.1,150); tone(147,.4,.8,"square",.1,100); },
  win(){ tone(784,0,.12,"triangle",.16); tone(1047,.12,.4,"triangle",.18); },
  fifty(){ tone(880,0,.15,"sine",.15,440); tone(440,.18,.3,"sine",.12,220); },
  // ~8 s of "the audience is voting" music
  public(){ for(let i=0;i<30;i++) tone(i%4===0?880:660,i*.25,.08,"triangle",.07);
    tone(196,0,7.5,"sine",.06); tone(247,2.5,5,"sine",.05); tone(294,5,2.5,"sine",.05);
    [523,659,784].forEach((f,i)=>tone(f,7.5+i*.06,.9,"triangle",.14)); return 8.6; },
  // 10 DTMF digits then 2 or 3 French ring tones
  dial(num){ const D={"1":[697,1209],"2":[697,1336],"3":[697,1477],"4":[770,1209],"5":[770,1336],"6":[770,1477],"7":[852,1209],"8":[852,1336],"9":[852,1477],"0":[941,1336]};
    const n=String(num||"0612345678").replace(/\D/g,"").slice(0,10); let t=0;
    for(const d of n){ const [a,b]=D[d]||D["0"]; tone(a,t,.12,"sine",.09); tone(b,t,.12,"sine",.09); t+=.2; }
    t+=.8; const rings=2+rnd(2); for(let r=0;r<rings;r++){ tone(440,t,1.5,"sine",.13); t+=(r<rings-1)?3.0:1.5; }
    return t+.4; },
  // looping phrase for the phone call (2.4 s)
  hold(){ [523,659,784,659,587,698,880,698].forEach((f,i)=>tone(f,i*.3,.26,"triangle",.07)); tone(131,0,1.2,"sine",.07); tone(147,1.2,1.2,"sine",.07); return 2.4; },
  hangup(){ noise(0,.06,.25,900,1); for(let i=0;i<3;i++) tone(440,.35+i*.5,.25,"sine",.12); return 1.9; },
  applause(d=3){ for(let i=0;i<d*30;i++) noise(i/30+Math.random()*.02,.06,.05+Math.random()*.08,1800+Math.random()*2500,1.2); },
  phone(){ for(let r=0;r<2;r++) for(let i=0;i<10;i++){ tone(440,r*1.6+i*.05,.05,"sine",.12); tone(480,r*1.6+i*.05,.05,"sine",.12); } },
  intro(){ tone(196,0,.5,"sawtooth",.06); tone(294,.25,.5,"sawtooth",.06); tone(392,.5,1.2,"sawtooth",.07); tone(98,0,1.8,"sine",.2); }
};

/* ================= Sounds (played on the projected PC only) ================= */
const SND_SLOTS=[
 {k:"generique",name:"Générique",when:"Accueil et remerciements",def:"generique",vol:.8},
 {k:"hub",name:"Transition",when:"Arrivée sur le tableau des questions",def:"transition",vol:1},
 {k:"question",name:"Musique de la question",when:"De l'écran « Question » jusqu'à la clôture des réponses (en boucle)",def:"question",vol:.55,loop:true},
 {k:"suspense",name:"Suspense",when:"Après la clôture des réponses, en boucle jusqu'à la révélation",def:"suspense",vol:.9,loop:true},
 {k:"good",name:"Révélation",when:"Affichage de la bonne réponse",def:null,synth:"good",vol:1},
 {k:"applause",name:"Applaudissements",when:"Classement et remerciements",def:"applaudissements",synth:"applause",vol:1}];
const SLOT=Object.fromEntries(SND_SLOTS.map(s=>[s.k,s]));
const CUSTOM={}; // k -> {url,name}
const AUD={};
function slotOn(k){ return CFG.soundOn[k]!==false; }
function slotVol(k){ const v=CFG.soundVol[k]; return v==null?SLOT[k].vol:+v; }
function slotSrc(k){ return CUSTOM[k]?.url || (SLOT[k].def ? `/sounds/${SLOT[k].def}.mp3` : null); }
function isPlaying(k){ const a=AUD[k]; return !!(a && !a.paused && !a.ended); }
const SYNBUS={}, SYNLOOP={};
function synthPlay(k,arg){ const s=SLOT[k], c=ac(); if(!c||!s.synth||!SFX[s.synth]) return 0; stopSynth(k);
  const g=c.createGain(); g.gain.value=Math.min(1,slotVol(k)); g.connect(c.destination); SYNBUS[k]=g;
  const run=()=>{ BUS=g; let d=0; try{ d=SFX[s.synth](arg)||0; } finally{ BUS=null; } return d; };
  const d=run(); if(s.loop && s.synthLoop) SYNLOOP[k]=setInterval(run,s.synthLoop*1000); return d; }
function stopSynth(k,fade=0){ clearInterval(SYNLOOP[k]); delete SYNLOOP[k]; const g=SYNBUS[k]; if(!g) return; delete SYNBUS[k];
  try{ g.gain.setTargetAtTime(0,AC.currentTime,Math.max(.01,fade/3000)); setTimeout(()=>{ try{g.disconnect();}catch(e){} },fade+400); }catch(e){} }
// Plays a slot and resolves when it has finished (file ended, or synthesized length elapsed)
async function playAndWait(k,arg,fallback=4){
  if(muted||!slotOn(k)){ await sleep(fallback*1000); return; }
  const src=slotSrc(k);
  if(!src){ const d=play(k,{arg}); await sleep((d||fallback)*1000); return; }
  play(k); const a=AUD[k]; if(!a) return; const d=await audioDuration(k);
  await new Promise(r=>{ const t=setTimeout(r,((d||fallback)+1.5)*1000); const done=()=>{ clearTimeout(t); r(); };
    a.addEventListener("ended",done,{once:true}); a.addEventListener("pause",done,{once:true}); });
}
function play(k,{restart=true,arg}={}){
  const s=SLOT[k]; if(!s||muted||!slotOn(k)) return 0;
  const src=slotSrc(k);
  if(!src) return synthPlay(k,arg);
  let a=AUD[k]; if(!a || a.dataset.src!==src){ if(a) a.pause(); a=new Audio(src); a.dataset.src=src; a.preload="auto"; AUD[k]=a; }
  clearInterval(a._fade); a.loop=!!s.loop; a.volume=Math.min(1,slotVol(k));
  if(restart||a.ended) a.currentTime=0;
  const p=a.play(); if(p&&p.catch) p.catch(()=>{});
}
function stop(k,fade=500){
  stopSynth(k,fade);
  const a=AUD[k]; if(!a||a.paused) return; clearInterval(a._fade);
  if(!fade){ a.pause(); return; }
  const v0=a.volume, steps=Math.max(1,Math.round(fade/50)); let i=0;
  a._fade=setInterval(()=>{ i++; a.volume=Math.max(0,v0*(1-i/steps)); if(i>=steps){ clearInterval(a._fade); a.pause(); a.volume=v0; } },50);
}
function stopAll(fade=0){ Object.keys(AUD).forEach(k=>stop(k,fade)); Object.keys(SYNBUS).forEach(k=>stopSynth(k,fade)); }
// Custom sound files, kept in this browser (IndexedDB)
function audioDuration(k){
  const a=AUD[k]; if(!a) return Promise.resolve(0);
  if(isFinite(a.duration)&&a.duration>0) return Promise.resolve(a.duration);
  return new Promise(r=>{ const t=setTimeout(()=>r(0),1500); a.addEventListener("loadedmetadata",()=>{ clearTimeout(t); r(isFinite(a.duration)?a.duration:0); },{once:true}); });
}
function idb(){ return new Promise((res,rej)=>{ const r=indexedDB.open("qvgda_sounds",2); r.onupgradeneeded=()=>{ const d=r.result; if(!d.objectStoreNames.contains("files")) d.createObjectStore("files"); if(!d.objectStoreNames.contains("images")) d.createObjectStore("images"); }; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function idbOp(mode,fn,store="files"){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction(store,mode), st=tx.objectStore(store); const r=fn(st); tx.oncomplete=()=>res(r&&r.result); tx.onerror=()=>rej(tx.error); }); }
async function loadCustomSounds(){
  try{ const db=await idb(); const tx=db.transaction("files","readonly"), st=tx.objectStore("files");
    const keys=await new Promise(r=>{ const q=st.getAllKeys(); q.onsuccess=()=>r(q.result); q.onerror=()=>r([]); });
    for(const key of keys){
      // only the sounds of this copy of the game
      const k=NS?(String(key).endsWith(NS)?String(key).slice(0,-NS.length):null):(String(key).includes("@")?null:String(key));
      if(!k||!SLOT[k]) continue;
      const v=await new Promise(r=>{ const q=st.get(key); q.onsuccess=()=>r(q.result); q.onerror=()=>r(null); }); if(v&&v.blob) CUSTOM[k]={url:URL.createObjectURL(v.blob),name:v.name}; }
  }catch(e){}
}
async function setCustomSound(k,file){
  try{ await idbOp("readwrite",st=>st.put({blob:file,name:file.name},k+NS)); }catch(e){ toast("Ce son ne pourra pas être conservé après fermeture (stockage indisponible)."); }
  if(CUSTOM[k]) URL.revokeObjectURL(CUSTOM[k].url); CUSTOM[k]={url:URL.createObjectURL(file),name:file.name};
}
async function clearCustomSound(k){ try{ await idbOp("readwrite",st=>st.delete(k+NS)); }catch(e){} if(CUSTOM[k]) URL.revokeObjectURL(CUSTOM[k].url); delete CUSTOM[k]; if(AUD[k]){ AUD[k].pause(); delete AUD[k]; } }

/* Question illustrations, kept in IndexedDB (too large for localStorage) */
const IMG={}, IMGBLOB={}; // id -> object URL / Blob (kept in memory so export never needs a network request)
async function loadImages(){
  try{ const db=await idb(); const tx=db.transaction("images","readonly"), st=tx.objectStore("images");
    await new Promise(r=>{ const q=st.openCursor(); q.onsuccess=()=>{ const c=q.result; if(!c) return r(); IMGBLOB[c.key]=c.value; IMG[c.key]=URL.createObjectURL(c.value); c.continue(); }; q.onerror=()=>r(); });
  }catch(e){}
}
function resizeImage(file,max=1100){
  return new Promise((res,rej)=>{ const url=URL.createObjectURL(file), im=new Image();
    im.onload=()=>{ const s=Math.min(1,max/Math.max(im.width,im.height)), c=document.createElement("canvas"); c.width=Math.round(im.width*s); c.height=Math.round(im.height*s);
      const g=c.getContext("2d"); g.fillStyle="#fff"; g.fillRect(0,0,c.width,c.height); g.drawImage(im,0,0,c.width,c.height); URL.revokeObjectURL(url); c.toBlob(b=>b?res(b):rej(),"image/jpeg",.85); };
    im.onerror=()=>{ URL.revokeObjectURL(url); rej(); }; im.src=url; });
}
async function addImage(file){
  const blob=await resizeImage(file); const id=uid("img");
  try{ await idbOp("readwrite",st=>st.put(blob,id),"images"); }catch(e){ toast("Cette image ne pourra pas être conservée après fermeture (stockage indisponible)."); }
  IMGBLOB[id]=blob; IMG[id]=URL.createObjectURL(blob); return id;
}
async function removeImage(id){ if(!id) return; const used=CFG.questions.some(q=>q.img===id||q.aImgs.includes(id)); if(used) return; if(IMG[id]){ URL.revokeObjectURL(IMG[id]); delete IMG[id]; } delete IMGBLOB[id]; }
async function exportMedia(){
  const ids=new Set(); CFG.questions.forEach(q=>{ if(q.img) ids.add(q.img); q.aImgs.forEach(i=>i&&ids.add(i)); });
  const out={};
  for(const id of ids){ const blob=IMGBLOB[id]; if(!blob) continue;
    out[id]=await new Promise((r,j)=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.onerror=()=>j(fr.error); fr.readAsDataURL(blob); }); }
  return out;
}
function dataUrlToBlob(u){ const m=/^data:([^;,]*)(;base64)?,(.*)$/s.exec(String(u)); if(!m) throw new Error("bad data url");
  const bin=m[2]?atob(m[3]):decodeURIComponent(m[3]); const a=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) a[i]=bin.charCodeAt(i); return new Blob([a],{type:m[1]||"application/octet-stream"}); }
async function importMedia(media){
  for(const [id,data] of Object.entries(media||{})){ try{ const blob=dataUrlToBlob(data); try{ await idbOp("readwrite",st=>st.put(blob,id),"images"); }catch(e){} IMGBLOB[id]=blob; IMG[id]=URL.createObjectURL(blob); }catch(e){} }
}

/* ================= Stars background ================= */
(function stars(){
  const cv=$("#stars"), cx=cv.getContext("2d"); let st=[];
  function size(){ cv.width=innerWidth*devicePixelRatio; cv.height=innerHeight*devicePixelRatio; st=[...Array(160)].map(()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.6+.3,p:Math.random()*6})); }
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  function draw(t){ cx.clearRect(0,0,cv.width,cv.height); for(const s of st){ const a=reduce?.7:.35+.5*Math.abs(Math.sin(t/1400+s.p)); cx.fillStyle=`rgba(220,230,255,${a})`; cx.beginPath(); cx.arc(s.x*cv.width,s.y*cv.height,s.r*devicePixelRatio,0,7); cx.fill(); } if(!reduce) requestAnimationFrame(draw); }
  addEventListener("resize",size); size(); requestAnimationFrame(draw);
})();

/* ================= Emblem ================= */
function emblemSVG(cls="",E=CFG.emblem){
  const FONT="Barlow Condensed,Arial Narrow,sans-serif";
  const fit=(txt,size,max)=>{ const est=txt.length*size*.5; return est>max?`textLength="${max}" lengthAdjust="spacingAndGlyphs"`:""; };
  const top=(E.top||"").trim(), bottom=(E.bottom||"").trim();
  const lines=String(E.center||"").split(/\n/).map(s=>s.trim()).filter(Boolean).slice(0,3);
  const logo=E.logo||{kind:"none"}, hasLogo=logo.kind==="emoji"&&logo.v || logo.kind==="img"&&logo.src;
  const ls=+E.logoSize||48;
  const fs=[0,50,40,32][lines.length]||32, lh=fs*1.08;
  const blockH=lines.length*lh, gap=hasLogo?10:0, total=blockH+(hasLogo?gap+ls:0);
  const y0=200-total/2;                       // top of the whole centre block
  const widths=[[226],[214,214],[176,226,176]][lines.length-1]||[];
  const center=lines.map((l,i)=>`<text x="200" y="${(y0+lh*(i+1)-fs*.2).toFixed(1)}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${fs}" fill="url(#gd)" stroke="#3a2600" stroke-width=".8" ${fit(l,fs,widths[i])}>${esc(l)}</text>`).join("");
  const ly=y0+blockH+gap;
  const logoSVG=!hasLogo?"": logo.kind==="emoji"
    ? `<text x="200" y="${(ly+ls*.86).toFixed(1)}" text-anchor="middle" font-size="${ls}">${esc(logo.v)}</text>`
    : `<image href="${esc(logo.src)}" x="${200-ls/2}" y="${ly.toFixed(1)}" width="${ls}" height="${ls}" preserveAspectRatio="xMidYMid meet"/>`;
  return `<svg class="emblem ${cls}" viewBox="0 0 400 400" role="img" aria-label="${esc([top,lines.join(" "),bottom].filter(Boolean).join(" "))}">
  <defs><radialGradient id="eg" cx="50%" cy="40%"><stop offset="0" stop-color="#2a2fc0"/><stop offset="1" stop-color="#05063a"/></radialGradient>
  <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a3"/><stop offset=".5" stop-color="#f2c14e"/><stop offset="1" stop-color="#9a6a1c"/></linearGradient>
  <path id="arcT" d="M 59 251 A 150 150 0 1 1 341 251"/><path id="arcB" d="M 50.5 269.7 A 165 165 0 0 0 349.5 269.7"/></defs>
  <circle cx="200" cy="200" r="194" fill="url(#gd)"/><circle cx="200" cy="200" r="182" fill="url(#eg)"/><circle cx="200" cy="200" r="122" fill="none" stroke="url(#gd)" stroke-width="4"/>
  ${[...Array(24)].map((_,i)=>{const a=i*Math.PI/12;return `<line x1="${200+105*Math.cos(a)}" y1="${200+105*Math.sin(a)}" x2="${200+112*Math.cos(a)}" y2="${200+112*Math.sin(a)}" stroke="#f2c14e" stroke-width="2" opacity=".6"/>`}).join("")}
  ${top?`<text font-family="${FONT}" font-weight="800" font-size="32" fill="#fff"><textPath href="#arcT" startOffset="50%" text-anchor="middle" ${fit(top,32,520)}>${esc(top)}</textPath></text>`:""}
  ${center}${logoSVG}
  ${bottom?`<text font-family="${FONT}" font-weight="700" font-size="25" fill="#f2c14e"><textPath href="#arcB" startOffset="50%" text-anchor="middle" ${fit(bottom,25,360)}>${esc(bottom)}</textPath></text>`
          :`<g fill="#f2c14e">${[-2,-1,0,1,2].map(k=>`<circle cx="${200+k*22}" cy="${352-Math.abs(k)*4}" r="${k?3:4.5}"/>`).join("")}</g>`}
  </svg>`;
}

/* ================= Online game (projected screen) ================= */
const L="ABCD";
const qLabel = q => (q.label||"").trim() || `Question ${CFG.questions.indexOf(q)+1}`;
const basePts = q => (q && q.points!=null && q.points!=="" && isFinite(+q.points)) ? Math.max(0,+q.points) : (+CFG.basePoints||3);
const jokerPts = q => (q && q.jokerCost!=null && q.jokerCost!=="" && isFinite(+q.jokerCost)) ? Math.max(0,+q.jokerCost) : (+CFG.jokerCost||0);
const pointsFor = (j,q) => Math.max(0, basePts(q) - j*jokerPts(q));
const nJokers = () => (CFG.jokers.fifty?1:0)+(CFG.jokers.public?1:0)+(CFG.jokers.phone?1:0);
const JOIN_URL = location.origin + "/";
const qrSrc = () => "/api/qr.svg?t=" + encodeURIComponent(JOIN_URL);
let ADMIN_KEY = (()=>{ try{ return localStorage.getItem(KEY_ADMIN)||""; }catch(e){ return ""; } })();
let S = null;              // last state from the server
let screen = "home";
let es = null, connected = false, firstState = true;
const app = $("#app");
const playerById = id => S && S.players.find(p=>p.pid===id);
const resultOf = q => S && S.results[q.id];

async function admin(action, extra){
  const r = await api("/api/admin", Object.assign({key:ADMIN_KEY, action}, extra||{})).catch(()=>({ok:false,error:"Serveur injoignable."}));
  if(r.unauthorized){ ADMIN_KEY=""; try{ localStorage.removeItem(KEY_ADMIN); }catch(e){} renderLogin("Mot de passe incorrect ou modifié."); }
  return r;
}
function serverSettings(){ return { jokers:CFG.jokers, jokerScope:CFG.jokerScope, phoneSec:CFG.phoneSec, autoClose:CFG.autoClose }; }
let syncT; function syncSettings(){ clearTimeout(syncT); syncT=setTimeout(()=>{ if(connected) admin("settings",{settings:serverSettings()}); },200); }

/* ---------------------------------------------------------------- login */
function renderLogin(msg){
  if(es){ es.close(); es=null; } connected=false;
  app.innerHTML=`<section class="screen home"><div class="box" style="max-width:460px">
    <h3>Accès animateur</h3>
    <p style="text-align:center;color:var(--ice-dim);margin:0 0 12px">Saisissez le mot de passe défini sur Render (variable ADMIN_PASSWORD).</p>
    <form id="lf"><label class="sr" for="pw">Mot de passe</label><input id="pw" type="password" autocomplete="current-password" class="inp" style="width:100%;font-size:20px;padding:10px;border-radius:8px;border:1px solid var(--line);background:#070a40;color:#fff">
    ${msg?`<p role="alert" style="color:#ff9a9e;text-align:center">${esc(msg)}</p>`:""}
    <div class="row center" style="margin-top:14px"><button class="btn gold" type="submit">Entrer</button></div></form></div></section>`;
  $("#pw").focus();
  $("#lf").onsubmit=async e=>{ e.preventDefault(); const k=$("#pw").value;
    const r=await api("/api/admin/check",{key:k}).catch(()=>({}));
    if(r.ok){ ADMIN_KEY=k; try{ localStorage.setItem(KEY_ADMIN,k); }catch(e){} firstState=true; start(); render(); } else renderLogin("Mot de passe incorrect."); };
}

/* ----------------------------------------------------------- connection */
function start(){
  if(es) es.close();
  es=new EventSource(`/api/stream?role=admin&key=${encodeURIComponent(ADMIN_KEY)}`);
  es.onopen=()=>{ connected=true; setNet(true); admin("hello",{settings:serverSettings()}); };
  es.onerror=()=>{ connected=false; setNet(false); };
  es.onmessage=e=>{ const m=JSON.parse(e.data); if(m.type==="state") onState(m.state); };
}
function setNet(ok){ const n=$("#net"); if(n){ n.hidden=ok; } }
let snapT=null, lastSnapSig="";
async function onState(st){
  const prev=S; S=st;
  // The server restarted (Render sleep or redeploy): give it back the last copy of the game kept on this PC
  if(!prev || prev.gameId!==S.gameId){
    const snap=load(KEY_SNAP);
    if(!S.players.length && !S.order.length && snap && snap.gameId!==S.gameId && (snap.players.length || snap.order.length)){
      const r=await admin("restore",{snapshot:snap});
      if(r.ok){ toast(`Partie restaurée : ${snap.players.length} joueur(s), ${snap.order.length} question(s) jouée(s).`); if(screen==="intro"||screen==="question"){ stop("question",300); endSuspense(); screen="hub"; } return; }
    }
  }
  if(firstState){
    firstState=false;
    // the projected page was reloaded in the middle of a question: get back to it
    if(S.cur && ["intro","question","closed","revealed"].includes(S.phase)){ const q=CFG.questions.find(x=>x.id===S.cur.qid); if(q){ CUR={q,n:CFG.questions.indexOf(q)+1}; screen=S.phase==="intro"?"intro":"question"; } }
    render(); return;
  }
  // keep a copy of the game (with players' reconnection keys) on this PC
  const sig=S.players.map(p=>p.pid).join()+"|"+S.order.join()+"|"+Object.values(S.results).map(r=>r.at).join();
  if(sig!==lastSnapSig){ lastSnapSig=sig; clearTimeout(snapT); snapT=setTimeout(async()=>{ const r=await admin("snapshot"); if(r.ok&&r.snapshot) save(KEY_SNAP,r.snapshot); },800); }
  if(prev && prev.players.length<S.players.length && (screen==="home"||screen==="hub")) SFX.win();
  update(prev);
}
// Light refresh of the current screen; full renders only when the situation changes
function update(prev){
  if(screen==="home"){ const w=$("#wall"); if(w){ w.innerHTML=wallHTML(); bindWall(); const c=$("#nPl"); if(c) c.textContent=plCount(); return; } }
  if(screen==="hub"){ return renderHub(); }
  if(screen==="intro"){ const c=$("#nOn"); if(c) c.textContent=onlineCount(); return; }
  if(screen==="question"){
    const ph=S.phase, pph=prev&&prev.phase;
    if(!S.cur){ return; }
    if(ph!==pph || !prev || !prev.cur || prev.cur.qid!==S.cur.qid) return phaseChanged(pph);
    updateLive(); return;
  }
  if(screen==="results" && prev && JSON.stringify(prev.ranking)!==JSON.stringify(S.ranking)) return renderResults(true);
}
const onlineCount = () => S ? S.players.filter(p=>p.online).length : 0;
const plCount = () => { const n=S?S.players.length:0; return `${n} joueur${n>1?"s":""}`; };
function wallHTML(){
  if(!S||!S.players.length) return `<p class="wait">En attente des premiers joueurs…</p>`;
  return S.players.map(p=>`<button class="pl ${p.online?"":"off"}" data-pl="${p.pid}" title="${esc(p.name)}${p.online?"":" (déconnecté)"} : changer l'avatar ou exclure">${avatarHTML(p.avatar,p.name,52)}<span>${esc(p.name)}</span></button>`).join("");
}
function bindWall(){ app.querySelectorAll("[data-pl]").forEach(b=>b.onclick=()=>playerCard(b.dataset.pl)); }
// The host picks a player's avatar (character, emoji, initials or photo)
function pickPlayerAvatar(pid,after){
  const p=playerById(pid); if(!p) return;
  const tmp={first:p.name,last:"",avatar:p.avatar};
  avatarPicker(tmp,async()=>{ const r=await admin("avatar",{pid,avatar:tmp.avatar}); if(!r.ok) toast("Avatar refusé : choisissez une image plus légère (JPG ou PNG)."); else toast(`Avatar de ${p.name} modifié`); after&&setTimeout(after,250); });
}
async function excludePlayer(pid){
  const p=playerById(pid); if(!p) return false;
  if(!await ask(`Exclure ${p.name} du jeu ? Ses points sont retirés, son téléphone affiche qu'il ne participe plus, et il ne pourra pas revenir sous ce nom (sauf si vous le réautorisez).`,{ok:"Exclure"})) return false;
  await admin("kick",{pid}); toast(`${p.name} a été exclu du jeu`); return true;
}
function playerCard(pid){
  const draw=ov=>{
    const p=playerById(pid); if(!p){ ov._close(); return; }
    ov.querySelector(".ovp").innerHTML=`<div style="text-align:center">${avatarHTML(p.avatar,p.name,120)}<h3 style="margin-top:10px">${esc(p.name)}</h3>
      <p>${p.online?"● connecté":"○ déconnecté"} · ${ptsTxt(p.score?p.score.points:0)}</p></div>
      <div class="row center" style="margin-top:8px"><button class="btn" id="cAv">Changer l'avatar</button><button class="btn ghost" id="cEx">Exclure du jeu</button><button class="btn gold" id="cX">Fermer</button></div>`;
    $("#cAv",ov).onclick=()=>pickPlayerAvatar(pid,()=>draw(ov));
    $("#cEx",ov).onclick=async()=>{ if(await excludePlayer(pid)) ov._close(); };
    $("#cX",ov).onclick=()=>ov._close();
  };
  const ov=overlay("","Joueur",520); draw(ov);
}

/* ------------------------------------------------------------- screens */
function go(s){
  const prev=screen; screen=s; clearInterval(timerInt);
  if(prev!==s){
    if((prev==="home"||prev==="credits") && s!=="home" && s!=="credits") stop("generique",800);
    if((prev==="intro"||prev==="question") && s!=="intro" && s!=="question"){ stop("question",600); endSuspense(); }
    if(s==="hub") play("hub");
  }
  if(["home","hub","results","credits"].includes(s)) admin("show",{screen:s});
  render(); app.scrollTop=0;
}
function render(){ ({home:renderHome,hub:renderHub,intro:renderIntro,question:renderQuestion,results:renderResults,credits:renderCredits})[screen](); }

function hostsList(){ return [CFG.host, CFG.host2.on?CFG.host2:null].filter(h=>h&&(h.first||h.last)); }
function hostsHTML(size){ const hs=hostsList(); if(!hs.length) return "";
  return `<div class="host"><span class="hosts">${hs.map(h=>avatarHTML(h.avatar,fullName(h),size)).join("")}</span><div><div class="lbl">Animé par</div><div class="nm">${hs.map(h=>esc(fullName(h))).join(" et ")}</div></div></div>`; }
function qrCard(big){
  return `<div class="qrcard ${big?"big":""}"><img src="${qrSrc()}" alt="QR code pour rejoindre la partie"><div class="qrtxt">${big?`<b>Scannez pour jouer !</b>`:""}<span class="url">${esc(JOIN_URL.replace(/^https?:\/\//,"").replace(/\/$/,""))}</span></div></div>`;
}
function renderHome(){
  app.innerHTML=`<section class="screen home2">
    <div class="hleft">${emblemSVG()}
      ${CFG.tagline?`<div class="tag">${esc(CFG.tagline)}</div>`:""}
      ${CFG.subtitle?`<div class="sub">${esc(CFG.subtitle)}</div>`:""}
      ${hostsHTML(56)}
      <div class="row center"><button class="btn gold" id="bStart">${S&&S.order.length?"Reprendre la partie":"Lancer le jeu"}</button></div>
      ${CFG.footer?`<div class="foot">${esc(CFG.footer)}</div>`:""}</div>
    <div class="hright">${qrCard(true)}<div class="plhead"><b id="nPl">${plCount()}</b> inscrits</div><div class="wall2" id="wall">${wallHTML()}</div></div>
  </section>`;
  $("#bStart").onclick=()=>go("hub");
  bindWall();
  play("generique",{restart:false});
}

function renderHub(){
  if(!S){ app.innerHTML=`<section class="screen home"><p>Connexion au serveur…</p></section>`; return; }
  const nQ=CFG.questions.length, played=CFG.questions.filter(q=>resultOf(q)).length;
  const DIFF=["","Facile","Moyenne","Difficile","Très difficile"];
  const diffBadge=q=>CFG.showDifficulty?`<span class="diff d${q.difficulty}" title="Difficulté ${q.difficulty}/4 : ${DIFF[q.difficulty]}" aria-label="Difficulté ${q.difficulty} sur 4">${[1,2,3,4].map(k=>`<i class="${k<=q.difficulty?"on":""}"></i>`).join("")}</span>`:"";
  const rows=CFG.questions.map(q=>{
    const r=resultOf(q), rows=r?Object.values(r.rows):[], good=rows.filter(x=>x.ok).length, n=rows.length;
    const pct=n?Math.round(good/n*100):0;
    const cls=r?(pct>=50?"ok":"ko"):"";
    let who="";
    if(r){ const best=Object.entries(r.rows).filter(([,x])=>x.ok).sort((a,b)=>a[1].ms-b[1].ms).slice(0,3).map(([pid])=>playerById(pid)).filter(Boolean);
      who=`<span class="who"><span class="gauge" title="${good} bonne(s) réponse(s) sur ${n}"><i style="width:${pct}%"></i></span><span class="nm">${good}/${n} bonne${good>1?"s":""} réponse${good>1?"s":""}</span>${best.length?`<span class="avs" title="Les plus rapides : ${esc(best.map(p=>p.name).join(", "))}">${best.map(p=>avatarHTML(p.avatar,p.name,28)).join("")}</span>`:""}</span>`; }
    return `<div class="trow"><span class="tcheck ${r?"on":""}" aria-hidden="true">✓</span>
      <button class="tcode ${cls}" data-q="${q.id}" title="${esc(qLabel(q)+" — "+q.text)}"><span class="tl">${esc(qLabel(q))}</span></button>
      <span class="tjok">${diffBadge(q)}${who}</span>
      <button class="tpts" data-p="${q.id}" title="${r?"Voir le détail et corriger":""}" ${r?"":"disabled"}>${r?`${pct} %`:`<span style="color:var(--ice-dim);font-size:.8em">${ptsTxt(basePts(q))} en jeu</span>`}</button></div>`;
  }).join("");
  const nj=nJokers(), q0=CFG.questions[0];
  const uniform=new Set(CFG.questions.map(q=>basePts(q)+"/"+jokerPts(q))).size<=1;
  const rules=(uniform
    ? [0,1,2,3].slice(0,nj+1).map(j=>`<li>Bonne réponse ${j===0?"sans joker":j===1?"avec 1 joker":`avec ${j} jokers`} = ${ptsTxt(pointsFor(j,q0))}</li>`).join("")
    : `<li>Bonne réponse = les points en jeu de la question</li>${nj?`<li>Chaque joker utilisé retire des points</li>`:""}`)+`<li>Mauvaise réponse = 0 point</li>`;
  app.innerHTML=`<section class="screen"><div class="hub">
    <div><h1 class="h-title">${nQ} question${nQ>1?"s":""}<small>${played}/${nQ} jouée${played>1?"s":""}</small></h1>
      ${nQ?`<div class="teams">${rows}</div>`:`<div class="box"><p>Aucune question pour le moment. Ouvrez les paramètres (⚙) pour ajouter vos questions.</p><button class="btn" id="bCfg2">Ouvrir les paramètres</button></div>`}
    </div>
    <div class="side">
      ${qrCard(false)}
      <button class="plbtn" id="bPl">👥 <b>${onlineCount()}</b> joueur${onlineCount()>1?"s":""} connecté${onlineCount()>1?"s":""}${S.players.length>onlineCount()?` <small>/ ${S.players.length} inscrits</small>`:""}</button>
      ${nj?`<div class="box"><h3>${nj} joker${nj>1?"s":""} ${CFG.jokerScope==="game"?"par joueur":"par question"}</h3><div class="jbadges">${CFG.jokers.fifty?`<div class="jbadge">50:50</div>`:""}${CFG.jokers.public?`<div class="jbadge">${ICON_PUBLIC}</div>`:""}${CFG.jokers.phone?`<div class="jbadge">${ICON_PHONE}</div>`:""}</div></div>`:""}
      <div class="box"><ul class="rules">${rules}</ul></div>
      <div class="row center stack">
        <button class="btn" id="bRand" ${played>=nQ?"disabled":""}>Question au hasard</button>
        <button class="btn gold" id="bRes" ${played?"":"disabled"}>Classement</button>
      </div>
      <div class="row center"><button class="btn ghost" id="bHome">Accueil</button><button class="btn ghost" id="bReset">Nouvelle partie</button></div>
    </div></div></section>`;
  fitButtons();
  app.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>playQuestion(b.dataset.q));
  app.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{ const q=CFG.questions.find(x=>x.id===b.dataset.p); if(q&&resultOf(q)) showRound(q); });
  $("#bCfg2")&&($("#bCfg2").onclick=openConfig);
  $("#bPl").onclick=managePlayers;
  $("#bRand").onclick=async()=>{
    const left=CFG.questions.filter(q=>!resultOf(q)); if(!left.length) return;
    const btns=left.map(q=>app.querySelector(`[data-q="${q.id}"]`)); const win=rnd(left.length);
    let delay=60; for(let i=0;i<14+win;i++){ btns.forEach(b=>b.style.outline=""); btns[i%btns.length].style.outline="3px solid var(--gold)"; SFX.tick(); await sleep(delay); delay=Math.min(delay*1.12,320); }
    btns.forEach(b=>b.style.outline=""); btns[win].style.outline="4px solid var(--gold)"; SFX.win(); await sleep(700); playQuestion(left[win].id);
  };
  $("#bRes").onclick=()=>go("results");
  $("#bHome").onclick=()=>go("home");
  $("#bReset").onclick=async()=>{ if(await ask("Effacer tous les scores pour recommencer une nouvelle partie ? Les joueurs inscrits restent connectés.",{ok:"Nouvelle partie"})){ await admin("resetScores"); toast("Nouvelle partie prête"); } };
}
function fitButtons(){
  const btns=[...app.querySelectorAll(".tcode[data-q]")]; if(!btns.length) return;
  btns.forEach(b=>{ b.style.minHeight=""; const s=$(".tl",b); s.style.fontSize=""; s.style.overflowWrap=""; s.style.letterSpacing=""; });
  const cs=getComputedStyle(btns[0]), base=parseFloat(cs.fontSize);
  const padY=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom);
  const LH=1.05, boxH=base*LH*1.55;
  btns.forEach(b=>{ b.style.minHeight=Math.ceil(boxH+padY)+"px"; });
  btns.forEach(b=>{
    const s=$(".tl",b), cb=getComputedStyle(b), avail=b.clientWidth-parseFloat(cb.paddingLeft)-parseFloat(cb.paddingRight);
    let fs=base;
    const fits=()=>s.scrollWidth<=avail+.5 && s.offsetHeight<=boxH+.5;
    const setFs=v=>{ s.style.fontSize=v+"px"; s.style.letterSpacing=v<base?".01em":""; };
    setFs(fs);
    while(!fits() && fs>9){ fs-=.5; setFs(fs); }
    if(!fits()) s.style.overflowWrap="anywhere";
  });
}
addEventListener("resize",()=>{ if(screen==="hub") fitButtons(); if(screen==="question") fitQuestionImage(); });

function overlay(html,label,wide){
  const ov=document.createElement("div"); ov.className="ov"; ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true"); ov.setAttribute("aria-label",label);
  ov.innerHTML=`<div class="ovp" style="max-width:${wide||640}px;max-height:88vh;overflow:auto">${html}</div>`;
  const close=()=>ov.remove(); ov._close=close; ov.addEventListener("click",e=>{ if(e.target===ov) close(); });
  document.body.appendChild(ov); return ov;
}
function managePlayers(){
  const draw=ov=>{
    const ps=(S.players||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,"fr"));
    ov.querySelector(".ovp").innerHTML=`<h3>Joueurs (${ps.length})</h3><p>${onlineCount()} connecté${onlineCount()>1?"s":""} en ce moment</p>
      <div style="display:flex;flex-direction:column;gap:6px"><p style="margin-top:-8px">Cliquez sur un avatar pour le changer.</p>
      ${ps.map(p=>`<div class="rk" style="grid-template-columns:auto 1fr auto auto;font-size:18px"><button class="avbtn" data-av="${p.pid}" title="Changer l'avatar de ${esc(p.name)}" aria-label="Changer l'avatar de ${esc(p.name)}">${avatarHTML(p.avatar,p.name,40)}</button><span>${esc(p.name)} <small style="color:${p.online?"#7dffb7":"var(--ice-dim)"};font-size:.7em">${p.online?"● connecté":"○ déconnecté"}</small></span><b>${ptsTxt(p.score?p.score.points:0)}</b><button class="exbtn" data-kick="${p.pid}" aria-label="Exclure ${esc(p.name)}">Exclure</button></div>`).join("")||`<p>Aucun joueur inscrit.</p>`}</div>
      ${(S.banned||[]).length?`<h3 style="font-size:20px;margin-top:18px">Exclus (${S.banned.length})</h3><div style="display:flex;flex-direction:column;gap:6px">${S.banned.map(x=>`<div class="rk" style="grid-template-columns:auto 1fr auto;font-size:18px;opacity:.8">${avatarHTML(x.avatar,x.name,30)}<span>${esc(x.name)}</span><button class="exbtn" data-unban="${esc(x.name)}">Réautoriser</button></div>`).join("")}</div>`:""}
      <div class="row center" style="margin-top:16px">${ps.length?`<button class="btn ghost" id="pClr">Vider la liste</button>`:""}<button class="btn gold" id="pX">Fermer</button></div>`;
    ov.querySelectorAll("[data-kick]").forEach(b=>b.onclick=async()=>{ if(await excludePlayer(b.dataset.kick)) setTimeout(()=>draw(ov),250); });
    ov.querySelectorAll("[data-av]").forEach(b=>b.onclick=()=>pickPlayerAvatar(b.dataset.av,()=>draw(ov)));
    ov.querySelectorAll("[data-unban]").forEach(b=>b.onclick=async()=>{ await admin("unban",{name:b.dataset.unban}); toast(`${b.dataset.unban} peut à nouveau rejoindre la partie`); setTimeout(()=>draw(ov),250); });
    $("#pX",ov).onclick=()=>ov._close();
    $("#pClr",ov)&&($("#pClr",ov).onclick=async()=>{ if(await ask("Retirer tous les joueurs et effacer les scores ? Chacun devra rescanner le QR code.",{ok:"Vider la liste"})){ await admin("clearPlayers"); save(KEY_SNAP,null); setTimeout(()=>draw(ov),200); } });
  };
  const ov=overlay("","Joueurs"); draw(ov);
}
function showRound(q){
  const draw=ov=>{
    const r=resultOf(q); if(!r){ ov._close(); return; }
    const list=Object.entries(r.rows).map(([pid,x])=>({p:playerById(pid),x,pid})).filter(e=>e.p).sort((a,b)=>(b.x.ok-a.x.ok)||(a.x.ms-b.x.ms));
    ov.querySelector(".ovp").innerHTML=`<h3>${esc(qLabel(q))}</h3><p>Bonne réponse : ${L[r.correct]} — ${esc(r.answers[r.correct])}</p>
      <div style="display:flex;flex-direction:column;gap:6px">${list.map(e=>`<div class="rk" style="grid-template-columns:auto 1fr auto auto auto;font-size:18px">${avatarHTML(e.p.avatar,e.p.name,32)}<span>${esc(e.p.name)} <small style="color:var(--ice-dim);font-size:.7em">${L[e.x.choice]} · ${(e.x.ms/1000).toFixed(1).replace(".",",")} s${Object.values(e.x.jokers||{}).some(Boolean)?" · joker":""}</small></span><span style="color:${e.x.ok?"#7dffb7":"#ff9a9e"}">${e.x.ok?"✓":"✗"}</span><b>${e.x.points}</b>
        <span class="adj"><button data-d="-1" data-pid="${e.pid}" aria-label="Retirer un point">−</button><button data-d="1" data-pid="${e.pid}" aria-label="Ajouter un point">+</button></span></div>`).join("")||`<p>Personne n'a répondu.</p>`}</div>
      <div class="row center" style="margin-top:16px"><button class="btn ghost" id="rDel">Annuler cette question</button><button class="btn gold" id="rX">Fermer</button></div>`;
    ov.querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{ await admin("adjust",{qid:q.id,pid:b.dataset.pid,delta:+b.dataset.d}); setTimeout(()=>draw(ov),150); });
    $("#rX",ov).onclick=()=>ov._close();
    $("#rDel",ov).onclick=async()=>{ if(await ask(`Annuler « ${qLabel(q)} » ? Les points de tous les joueurs sur cette question sont retirés et elle pourra être rejouée.`,{ok:"Annuler la question"})){ await admin("removeResult",{qid:q.id}); ov._close(); } };
  };
  const ov=overlay("","Détail de la question",720); draw(ov);
}

/* ------------------------------------------------------------ a question */
let CUR=null;   // {q, n}
async function playQuestion(qid){
  const q=CFG.questions.find(x=>x.id===qid); if(!q) return;
  if(!connected){ notice("Le serveur est injoignable : vérifiez la connexion Internet, puis réessayez."); return; }
  if(resultOf(q) && !await ask(`« ${qLabel(q)} » a déjà été jouée. La rejouer remplacera ses résultats. Continuer ?`,{ok:"Rejouer"})) return;
  if(!q.text.trim() || q.answers.some(a=>!a.trim())){ notice("Cette question est incomplète : complétez son texte et ses 4 propositions dans les paramètres."); return; }
  if(!onlineCount() && !await ask("Aucun joueur n'est connecté pour le moment. Lancer quand même la question ?",{ok:"Lancer"})) return;
  CUR={q,n:CFG.questions.indexOf(q)+1};
  await admin("intro",{q:payload(q)});
  go("intro");
}
function payload(q){ return {id:q.id,label:qLabel(q),note:q.note||"",n:CFG.questions.indexOf(q)+1,text:q.text,answers:q.answers,correct:q.correct,points:basePts(q),jokerCost:jokerPts(q),difficulty:q.difficulty}; }
function renderIntro(){
  const q=CUR.q;
  app.innerHTML=`<section class="screen intro">
    <div class="q">${esc(qLabel(q))}</div><div class="lab">Question ${CUR.n}</div>
    <div class="stake" style="font-size:clamp(20px,2.4vw,30px)">${ptsTxt(basePts(q))} en jeu</div>
    <p style="font-size:clamp(18px,1.8vw,24px);color:#fff;margin:0">📱 <b id="nOn">${onlineCount()}</b> joueur(s) prêt(s) à répondre${CFG.timer?` · ${CFG.timer} secondes pour répondre`:""}</p>
    <div class="row center"><button class="btn gold" id="bQ">Afficher la question</button><button class="btn ghost" id="bX">Retour</button></div></section>`;
  $("#bQ").onclick=async()=>{ $("#bQ").disabled=true; const r=await admin("open",{q:payload(q),timer:CFG.timer}); if(r.ok){ screen="question"; renderQuestion(); } else { $("#bQ").disabled=false; toast("Le serveur n'a pas répondu : réessayez."); } };
  $("#bX").onclick=async()=>{ await admin("cancel"); go("hub"); };
  if(!isPlaying("question")) play("question");
}
function mediaHTML(q,revealed){
  const L="ABCD";
  if(q.imgMode==="single" && IMG[q.img]) return `<div class="qmedia single"><button class="qimg one" data-zoom="${esc(IMG[q.img])}" aria-label="Agrandir l'illustration"><img src="${esc(IMG[q.img])}" alt=""></button></div>`;
  if(q.imgMode==="answers" && q.aImgs.some(id=>IMG[id])){
    return `<div class="qmedia single grid"><div class="qimgs">${[0,1,2,3].map(i=>{ const src=IMG[q.aImgs[i]];
      const c=revealed?(i===q.correct?"good":"gone"):"";
      return src?`<button class="qimg ${c}" data-zoom="${esc(src)}" aria-label="Agrandir l'illustration de la réponse ${L[i]}"><img src="${esc(src)}" alt=""><span class="L">${L[i]}</span></button>`
                :`<div class="qimg ${c}" style="cursor:default"><span class="L">${L[i]}</span></div>`; }).join("")}</div></div>`;
  }
  return "";
}
// Make the single illustration as large as possible: it may climb into the top bar, between the players and the jokers
function fitQuestionImage(){
  const sec=$(".qscreen.withimg"); if(!sec) return;
  const med=$(".qmedia.single",sec), top=$(".qtop",sec); if(!med) return;
  const grid=med.classList.contains("grid");
  const box=grid?$(".qimgs",med):$(".qimg.one",med); if(!box) return;
  const imgs=[...box.querySelectorAll("img")];
  const waiting=imgs.filter(i=>!i.naturalWidth); if(waiting.length){ waiting.forEach(i=>i.addEventListener("load",fitQuestionImage,{once:true})); return; }
  sec.classList.remove("overlay");
  const B=6, GAP=grid?Math.round(Math.max(10,Math.min(20,innerHeight*.016))):0;
  // aspect of what is drawn: the picture itself, or (grid) one cell, shaped like the average of the four pictures
  const a=grid ? Math.max(.75,Math.min(1.8, imgs.reduce((s,i)=>s+i.naturalWidth/i.naturalHeight,0)/imgs.length)) : imgs[0].naturalWidth/imgs[0].naturalHeight;
  // height of the drawn block (borders excluded) for an available box W x H
  const fit=(W,H)=> grid ? Math.max(40,Math.min((H-GAP)/2-2*B, ((W-GAP)/2-2*B)/a)) : Math.max(60,Math.min(H-2*B, W/a-2*B));
  const mr=med.getBoundingClientRect(), W=innerWidth;
  const blockH=c=>grid?2*(c+2*B)+GAP:c+2*B;
  let best=fit(W*.9, mr.height-16), over=false;
  if(W>=900){
    const tr=top.getBoundingClientRect(), mid=W/2;
    const items=[...top.querySelectorAll(":scope > *")].map(e=>e.getBoundingClientRect());
    const leftEdge=Math.max(0,...items.filter(r=>r.left<mid).map(r=>r.right));
    const rightEdge=Math.min(W-160,...items.filter(r=>r.left>=mid).map(r=>r.left));
    const freeW=2*Math.max(0,Math.min(mid-leftEdge,rightEdge-mid)-18);
    const hOver=fit(freeW, mr.bottom-tr.top-16);
    if(blockH(hOver)>blockH(best)+24){ best=hOver; over=true; }
  }
  if(over){ sec.classList.add("overlay"); box.style.top=`${-(mr.top-sec.getBoundingClientRect().top)+6}px`; } else box.style.top="8px";
  if(grid){
    const ch=Math.round(best), cw=Math.round(best*a);
    box.style.gap=`${GAP}px`;
    box.querySelectorAll(".qimg").forEach(c=>{ c.style.width=cw+2*B+"px"; c.style.height=ch+2*B+"px"; });
    imgs.forEach(i=>{ i.style.width="100%"; i.style.height="100%"; });
  } else imgs[0].style.height=Math.round(best)+"px";
}
addEventListener("resize",()=>{ if(screen==="question") fitQuestionImage(); });
let timerInt=null;
function renderQuestion(){
  if(!CUR || !S || !S.cur){ return; }
  const q=CUR.q, ph=S.phase, revealed=ph==="revealed";
  const big=(q.imgMode==="single" && IMG[q.img]) || (q.imgMode==="answers" && q.aImgs.some(id=>IMG[id]));
  const r=revealed?S.results[q.id]:null;
  const dist=r?[0,1,2,3].map(i=>Object.values(r.rows).filter(x=>x.choice===i).length):[0,0,0,0];
  const tot=r?Object.keys(r.rows).length:0;
  app.innerHTML=`<section class="screen qscreen ${big?"withimg":""}">
    <div class="qtop">
      <div class="row" style="gap:10px"><div class="players"><b>${esc(qLabel(q))}</b><span id="cnt"></span></div>
        <div class="stake">${ptsTxt(basePts(q))} en jeu</div></div>
      <div class="jokers" id="jk">${CFG.timer && ph==="question"?`<div class="timer" id="timer"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="rgba(10,12,98,.8)" stroke="rgba(255,255,255,.2)" stroke-width="3"/><circle id="tArc" cx="18" cy="18" r="16" fill="none" stroke="var(--gold)" stroke-width="3" stroke-dasharray="100.5" stroke-dashoffset="0"/></svg><b id="tNum"></b></div>`:""}</div>
    </div>
    ${mediaHTML(q,revealed)}
    <div class="qzone">
      <div class="wire"><div class="qbox">${esc(q.text)}</div></div>
      <div class="answers">${q.answers.map((a,i)=>{ const pc=tot?Math.round(dist[i]/tot*100):0;
        return `<div class="wire"><div class="ans ${revealed&&i===q.correct?"good":""}" style="${revealed&&i!==q.correct?"opacity:.75":""}"><span class="L">${L[i]} :</span><span style="flex:1">${esc(a)}</span><span class="picks" data-pk="${i}"></span>${revealed?`<span class="pct"><i style="width:${pc}%"></i><b>${pc} %</b></span>`:""}</div></div>`; }).join("")}</div>
      <div class="qfoot" id="qfoot"></div>
    </div></section>`;
  app.querySelectorAll("[data-zoom]").forEach(b=>b.onclick=()=>zoom(b.dataset.zoom));
  if(big) fitQuestionImage();
  updateLive(); footer(); renderPicks(false);
  if(ph==="question"){ if(!isPlaying("question")) play("question",{restart:false}); startTimer(); }
}
// Once answers are closed, each player's avatar appears in front of the answer they chose
function renderPicks(animate){
  const pk=S&&S.cur&&S.cur.picks; if(!pk) return;
  const by=[[],[],[],[]]; Object.entries(pk).forEach(([pid,c])=>{ const p=playerById(pid); if(p&&by[c]) by[c].push(p); });
  const MAX=9; let k=0;
  app.querySelectorAll("[data-pk]").forEach(el=>{
    const ps=by[+el.dataset.pk], extra=ps.length-MAX;
    el.title=ps.map(p=>p.name).join(", ");
    el.innerHTML=ps.slice(0,extra>0?MAX-1:MAX).map(p=>`<span class="pk" style="${animate?`animation-delay:${(k++)*70}ms`:"animation:none"}">${avatarHTML(p.avatar,p.name,38)}</span>`).join("")+(extra>0?`<span class="pkmore">+${extra+1}</span>`:"");
  });
}
function updateLive(){
  const c=$("#cnt"); if(!c||!S.cur) return;
  const on=onlineCount(), n=S.cur.answered;
  c.textContent = S.phase==="revealed" ? "" : `${n}/${Math.max(on,n)} réponse${n>1?"s":""}`;
  const jk=S.cur.jokers, used=(jk.fifty||0)+(jk.public||0)+(jk.phone||0);
  let j=$("#jkInfo"); if(!j && used && S.phase==="question"){ j=document.createElement("span"); j.id="jkInfo"; j.className="jkinfo"; $("#jk").prepend(j); }
  if(j) j.textContent = used ? `Jokers utilisés : ${[jk.fifty?`50:50 ×${jk.fifty}`:"",jk.public?`public ×${jk.public}`:"",jk.phone?`ami ×${jk.phone}`:""].filter(Boolean).join(" · ")}` : "";
}
function footer(){
  const f=$("#qfoot"); if(!f) return; const ph=S.phase, q=CUR.q;
  if(ph==="question"){ f.innerHTML=`<button class="btn gold" id="bClose">Clore les réponses</button><button class="btn ghost" id="bCancel">Annuler la question</button>`;
    $("#bClose").onclick=()=>admin("close");
    $("#bCancel").onclick=async()=>{ if(await ask("Annuler cette question ? Les réponses déjà données sont perdues.",{ok:"Annuler la question"})){ await admin("cancel"); go("hub"); } };
  } else if(ph==="closed"){ f.innerHTML=`<div class="verdict" style="font-size:clamp(20px,2.2vw,30px)">Les réponses sont closes…</div><button class="btn gold" id="bRev">Révéler la bonne réponse</button>`;
    $("#bRev").onclick=()=>{ $("#bRev").disabled=true; admin("reveal"); };
  } else if(ph==="revealed"){
    const r=S.results[q.id], rows=r?Object.entries(r.rows):[], good=rows.filter(([,x])=>x.ok);
    const fast=good.sort((a,b)=>a[1].ms-b[1].ms).slice(0,3).map(([pid,x])=>({p:playerById(pid),x})).filter(e=>e.p);
    f.innerHTML=`<div class="verdict">${good.length} bonne${good.length>1?"s":""} réponse${good.length>1?"s":""} sur ${rows.length}</div>
      ${fast.length?`<div class="fast"><span>⚡ Les plus rapides :</span>${fast.map((e,k)=>`<span class="fp">${avatarHTML(e.p.avatar,e.p.name,34)}<b>${esc(e.p.name)}</b><small>${(e.x.ms/1000).toFixed(1).replace(".",",")} s</small></span>`).join("")}</div>`:""}
      <button class="btn ghost" id="bHub">Tableau des questions</button><button class="btn gold" id="bRk">Classement</button>
      ${(q.note||"").trim()?`<div class="hostnote" role="note"><span aria-hidden="true">👉</span><div>${esc(q.note.trim()).replace(/\n/g,"<br>")}</div></div>`:""}`;
    $("#bHub").onclick=()=>go("hub"); $("#bRk").onclick=()=>go("results");
  }
}
let revealT=null;
function endSuspense(){ clearTimeout(revealT); revealT=null; stop("suspense",400); }
function phaseChanged(pph){
  const ph=S.phase;
  if(ph==="closed"){ clearInterval(timerInt); stop("question",400); play("suspense");
    if(CFG.revealMode==="auto") revealT=setTimeout(()=>admin("reveal"),Math.max(1,Math.min(10,+CFG.suspenseSec||6))*1000);
    const t=$("#timer"); if(t) t.remove(); updateLive(); footer(); renderPicks(true); return; }
  if(ph==="revealed"){ endSuspense(); stop("question",200); play("good"); renderQuestion(); const r=S.results[CUR.q.id]; if(r&&Object.values(r.rows).some(x=>x.ok)) confetti(1800); return; }
  if(ph==="question"){ renderQuestion(); return; }
}
function startTimer(){
  clearInterval(timerInt); if(!S.cur||!S.cur.deadline) return;
  const total=CFG.timer||1;
  const upd=()=>{ const n=$("#tNum"), a=$("#tArc"); if(!n||!S.cur||!S.cur.deadline){ clearInterval(timerInt); return; }
    const left=Math.max(0,(S.cur.deadline-Date.now())/1000);
    n.textContent=Math.ceil(left); a.setAttribute("stroke-dashoffset",String(100.5*(1-Math.min(1,left/total)))); a.setAttribute("stroke",left<=5?"var(--red)":"var(--gold)");
    if(left<=5 && left>0 && Math.abs(left-Math.round(left))<.13) SFX.tick();
    if(left<=0) clearInterval(timerInt); };
  upd(); timerInt=setInterval(upd,250);
}
function zoom(src){ const lb=document.createElement("div"); lb.className="lightbox"; lb.innerHTML=`<img src="${esc(src)}" alt="Illustration agrandie">`; lb.onclick=()=>lb.remove(); document.body.appendChild(lb); }

/* ---------------------------------------------------------- ranking */
function renderResults(quiet){
  const list=(S?S.ranking:[]).map(e=>({...e,p:playerById(e.pid)})).filter(e=>e.p);
  const top=list.slice(0,3), order=[1,0,2].filter(i=>top[i]);
  const H={1:150,2:105,3:80};
  const tied=e=>e.points>0 && list.filter(x=>x.points===e.points).length>1;
  const fmtS=ms=>(ms/1000).toFixed(1).replace(".",",")+" s";
  app.innerHTML=`<section class="screen res"><h2>Le classement</h2>
    ${list.length&&S.order.length?`<div class="podium">${order.map(i=>{ const e=top[i]; return `<div class="pod">${avatarHTML(e.p.avatar,e.p.name,e.rank===1?110:86,"margin:0 auto 6px;display:block;box-shadow:0 0 0 4px var(--gold)")}
      <div class="tn" style="font-size:clamp(18px,2vw,26px)">${esc(e.p.name)}</div><div class="tp">${ptsTxt(e.points)}${tied(e)?` <small style="color:var(--ice-dim)">· ${fmtS(e.ms)}</small>`:""}</div>
      <div class="st" style="height:${H[e.rank]||70}px">${e.rank}</div></div>`; }).join("")}</div>
    <div class="ranking cols">${list.slice(3).map(e=>`<div class="rk" style="grid-template-columns:40px 1fr auto"><i>${e.rank}</i><span style="display:flex;align-items:center;gap:10px">${avatarHTML(e.p.avatar,e.p.name,30)}${esc(e.p.name)}${tied(e)?` <small style="color:var(--ice-dim);font-size:.7em">${fmtS(e.ms)}</small>`:""}</span><b>${e.points}</b></div>`).join("")}</div>
    ${list.some(tied)?`<p style="text-align:center;color:var(--ice-dim);margin:2vh 0 0">À points égaux, le plus rapide passe devant (temps cumulé sur ses bonnes réponses).</p>`:""}`
    :`<p style="text-align:center;color:var(--ice-dim)">Aucune question n'a encore été jouée.</p>`}
    <div class="row center" style="margin-top:3vh"><button class="btn ghost" id="bH">Tableau des questions</button><button class="btn gold" id="bC">Remerciements</button></div></section>`;
  $("#bH").onclick=()=>go("hub"); $("#bC").onclick=()=>go("credits");
  if(!quiet){ play("applause"); confetti(3500); }
}
function renderCredits(){
  const all=S?S.players:[];
  app.innerHTML=`<section class="screen credits res">${emblemSVG("sm")}<h2>Merci d'avoir participé !</h2>
    ${hostsList().length?`<div class="row center">${hostsHTML(56)}</div>`:""}
    <div class="cwall">${all.map(p=>`<div>${avatarHTML(p.avatar,p.name,64)}<br>${esc(p.name)}</div>`).join("")}</div>
    <div class="row center"><button class="btn ghost" id="bH">Accueil</button></div></section>`;
  $("#bH").onclick=()=>go("home"); play("applause"); play("generique");
}

/* ================= Confetti ================= */
function confetti(ms){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv=$("#confetti"), cx=cv.getContext("2d"); cv.width=innerWidth; cv.height=innerHeight;
  const cols=["#f2c14e","#ffffff","#4a64ff","#00b050","#e97132","#ff5a8a"];
  const P=[...Array(160)].map(()=>({x:Math.random()*cv.width,y:-20-Math.random()*cv.height*.5,vx:(Math.random()-.5)*3,vy:2+Math.random()*4,r:Math.random()*6.3,s:4+Math.random()*6,c:cols[rnd(cols.length)]}));
  const end=performance.now()+ms;
  (function f(t){ cx.clearRect(0,0,cv.width,cv.height); P.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.r+=.1; cx.save(); cx.translate(p.x,p.y); cx.rotate(p.r); cx.fillStyle=p.c; cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2); cx.restore();});
    if(t<end) requestAnimationFrame(f); else cx.clearRect(0,0,cv.width,cv.height); })(performance.now());
}
addEventListener("pointerdown",()=>{ ac(); if(screen==="home" && !isPlaying("generique") && !muted) play("generique",{restart:false}); },{capture:true});
addEventListener("keydown",e=>{
  if($(".dlg")) return;
  if($(".lightbox")){ if(e.key==="Escape") $(".lightbox").remove(); return; }
  if($(".cfg")||$(".ov")||$(".pick")) { if(e.key==="Escape"){ const o=$(".pick")||$(".ov"); if(o){ o._close?o._close():o.remove(); } } return; }
  if(e.target.matches("input,textarea,select")) return;
  if(screen==="question" && S && e.key==="Enter"){ if(S.phase==="closed") admin("reveal"); else if(S.phase==="question") admin("close"); }
});

/* ================= Configuration module ================= */
let cfgTab="general";
function openConfig(){
  let el=$(".cfg"); if(!el){ el=document.createElement("div"); el.className="cfg"; el.setAttribute("role","dialog"); el.setAttribute("aria-label","Paramètres du jeu"); document.body.appendChild(el); }
  const tabs=[["general","Général"],["questions","Questions"],["sounds","Sons"],["data","Sauvegarde"]];
  el.innerHTML=`<header><h2>Paramètres du jeu</h2><button class="cb pri" id="cClose">Fermer et revenir au jeu</button></header>
    <nav class="tabs" role="tablist">${tabs.map(([k,l])=>`<button class="tab ${cfgTab===k?"on":""}" role="tab" aria-selected="${cfgTab===k}" data-tab="${k}">${l}</button>`).join("")}</nav>
    <div class="cbody"><div class="cwrap" id="cBody"></div></div>`;
  el.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{ cfgTab=b.dataset.tab; openConfig(); });
  $("#cClose").onclick=()=>{ stopAll(200); save(KEY_CFG,CFG); syncSettings(); el.remove(); if(screen!=="question"&&screen!=="intro") render(); };
  ({general:cfgGeneral,questions:cfgQuestions,sounds:cfgSounds,data:cfgData})[cfgTab]($("#cBody"));
}
function bindInputs(root, obj, after){
  root.querySelectorAll("[data-k]").forEach(inp=>{
    const k=inp.dataset.k; const path=k.split("."); let o=obj; for(let i=0;i<path.length-1;i++) o=o[path[i]];
    const last=path[path.length-1];
    if(inp.type==="checkbox") inp.checked=!!o[last]; else inp.value=o[last]??"";
    inp.addEventListener(inp.type==="checkbox"||inp.tagName==="SELECT"?"change":"input",()=>{
      o[last]=inp.type==="checkbox"?inp.checked:(inp.type==="number"?+inp.value:inp.value); saveCfg(); after&&after(k);
    });
  });
}
function cfgGeneral(b){
  b.innerHTML=`<div class="ccard"><h4>Présentation</h4>
    <div class="f"><label for="g1">Nom du jeu</label><input class="inp" id="g1" data-k="title"><span class="hint">Affiché dans l'onglet du navigateur. Le texte de l'emblème se règle juste en dessous.</span></div>
    <div class="grid2"><div class="f"><label for="g2">Sous-titre</label><input class="inp" id="g2" data-k="subtitle"></div>
    <div class="f"><label for="g3">Accroche (bulle d'accueil)</label><input class="inp" id="g3" data-k="tagline"></div></div>
    <div class="f"><label for="g4">Mention en bas de l'accueil</label><input class="inp" id="g4" data-k="footer"></div>
    <label class="chk" style="margin:0"><input type="checkbox" data-k="showDifficulty"> Afficher le niveau de difficulté de chaque question à côté de son bouton, dans le tableau des questions</label></div>
  <div class="ccard"><h4>Emblème du jeu</h4>
    <div class="emb-grid"><div>
      <div class="f"><label for="e1">Titre 1 (arc de cercle du haut)</label><input class="inp" id="e1" data-k="emblem.top"></div>
      <div class="f"><label for="e3">Titre 3 (texte au centre)</label><textarea id="e3" data-k="emblem.center" rows="3"></textarea><span class="hint">Une ligne par retour à la ligne, 3 lignes au maximum. Le texte se resserre automatiquement s'il est long.</span></div>
      <div class="f"><label for="e2">Titre 2 (arc de cercle du bas)</label><input class="inp" id="e2" data-k="emblem.bottom"><span class="hint">Laissez vide pour afficher de petits points dorés.</span></div>
      <div class="f"><span class="flab">Logo au centre</span>
        <div class="row" style="gap:6px;margin-top:4px">
          <button class="cb sm" data-lk="emoji" aria-pressed="${CFG.emblem.logo.kind==="emoji"}">Émoji</button>
          <label class="cb sm" style="cursor:pointer">Importer une image…<input type="file" accept="image/*" id="eImg" class="sr"></label>
          <button class="cb sm" data-lk="none" aria-pressed="${CFG.emblem.logo.kind==="none"}">Aucun logo</button>
        </div>
        <div class="egrid" id="eEmo" style="${CFG.emblem.logo.kind==="emoji"?"":"display:none"}">${["👏","🏆","⭐","🎤","💡","🎉","⚓","⛵","🏰","🧠","❓","💰","🔥","🎯","🌊","🦞"].map(e=>`<button data-emo="${e}" aria-label="${e}">${e}</button>`).join("")}</div>
        <label class="flab" style="display:flex;align-items:center;gap:8px;margin-top:6px">Taille du logo <input type="range" min="30" max="110" step="2" data-k="emblem.logoSize" style="flex:1"></label>
      </div>
      <div class="row"><button class="cb sm" id="eReset">Revenir au texte d'origine</button></div>
    </div>
    <div class="emb-prev" id="ePrev" aria-label="Aperçu de l'emblème">${emblemSVG()}</div></div></div>
  <div class="ccard"><h4>Animateur</h4><div class="mrow" style="grid-template-columns:72px 1fr 1fr">
    <button class="avb" id="hostAv" aria-label="Changer l'avatar de l'animateur" style="border:0;background:none;padding:0">${avatarHTML(CFG.host.avatar,fullName(CFG.host),64)}</button>
    <input class="inp" data-k="host.first" placeholder="Prénom" aria-label="Prénom de l'animateur"><input class="inp" data-k="host.last" placeholder="Nom" aria-label="Nom de l'animateur"></div></div>
  <div class="ccard"><h4>Deuxième animateur</h4><label class="chk"><input type="checkbox" data-k="host2.on"> Le jeu est animé à deux</label>
    <div class="mrow" style="grid-template-columns:72px 1fr 1fr">
    <button class="avb" id="host2Av" aria-label="Changer l'avatar du deuxième animateur" style="border:0;background:none;padding:0">${avatarHTML(CFG.host2.avatar,fullName(CFG.host2),64)}</button>
    <input class="inp" data-k="host2.first" placeholder="Prénom" aria-label="Prénom du deuxième animateur"><input class="inp" data-k="host2.last" placeholder="Nom" aria-label="Nom du deuxième animateur"></div></div>
  <div class="ccard"><h4>Règles</h4>
    <div class="grid3"><div class="f"><label for="g6">Points par défaut pour une bonne réponse sans joker</label><input class="inp" id="g6" type="number" min="1" max="1000" data-k="basePoints"><span class="hint">Utilisé pour les questions sans points personnalisés (onglet Questions).</span></div>
    <div class="f"><label for="g7">Points retirés par défaut par joker utilisé</label><input class="inp" id="g7" type="number" min="0" max="10" data-k="jokerCost"></div>
    <div class="f"><label for="g8">Temps pour répondre (secondes, 0 = sans limite)</label><input class="inp" id="g8" type="number" min="0" max="600" data-k="timer"><span class="hint">Sans limite, c'est vous qui closez les réponses.</span></div></div>
    <label class="chk"><input type="checkbox" data-k="autoClose"> Clore automatiquement les réponses dès que tous les joueurs connectés ont répondu</label>
    <h4 style="margin-top:14px">Jokers (sur le téléphone de chaque joueur)</h4>
    <label class="chk"><input type="checkbox" data-k="jokers.fifty"> Joker 50:50 : retire deux mauvaises réponses sur le téléphone du joueur</label>
    <label class="chk"><input type="checkbox" data-k="jokers.public"> Joker vote du public : affiche un vote simulé selon la difficulté de la question</label>
    <div class="row" style="gap:16px;margin-bottom:10px"><label class="chk" style="margin:0"><input type="checkbox" data-k="jokers.phone"> Joker appel à un ami : lance un compte à rebours sur le téléphone</label>
      <span class="row" style="gap:6px"><label class="flab" for="g10">Durée de l'appel (secondes)</label><input class="inp" id="g10" type="number" min="5" max="180" data-k="phoneSec" style="width:80px"></span></div>
    <div class="f" style="max-width:520px"><label for="g11">Chaque joker est utilisable</label><select id="g11" data-k="jokerScope"><option value="game">une seule fois par joueur pendant toute la partie (comme à la télévision)</option><option value="question">à chaque question</option></select></div>
    <p style="font-size:13px;color:var(--cfg-dim);margin:0 0 12px">Avec le barème par défaut, une bonne réponse obtenue avec les 3 jokers rapporte ${ptsTxt(pointsFor(3))}.</p>
    </div>`;
  const prev=()=>{ $("#ePrev").innerHTML=emblemSVG(); };
  const pressed=()=>b.querySelectorAll("[data-lk]").forEach(x=>x.setAttribute("aria-pressed",String(CFG.emblem.logo.kind===x.dataset.lk)));
  b.querySelectorAll("[data-lk]").forEach(x=>x.onclick=()=>{ if(x.dataset.lk==="emoji"){ if(CFG.emblem.logo.kind!=="emoji") CFG.emblem.logo={kind:"emoji",v:"👏"}; $("#eEmo").style.display=""; }
    else { CFG.emblem.logo={kind:"none"}; $("#eEmo").style.display="none"; } saveCfg(); pressed(); prev(); });
  b.querySelectorAll("[data-emo]").forEach(x=>x.onclick=()=>{ CFG.emblem.logo={kind:"emoji",v:x.dataset.emo}; saveCfg(); pressed(); prev(); });
  $("#eImg").onchange=e=>{ const f=e.target.files[0]; if(!f) return; const url=URL.createObjectURL(f), im=new Image();
    im.onload=()=>{ const S=256, r=Math.min(1,S/Math.max(im.width,im.height)), c=document.createElement("canvas"); c.width=Math.round(im.width*r); c.height=Math.round(im.height*r);
      c.getContext("2d").drawImage(im,0,0,c.width,c.height); URL.revokeObjectURL(url); CFG.emblem.logo={kind:"img",src:c.toDataURL("image/png")}; $("#eEmo").style.display="none"; saveCfg(); pressed(); prev(); toast("Logo remplacé"); };
    im.onerror=()=>{ URL.revokeObjectURL(url); toast("Image illisible : choisissez un fichier PNG, JPG, WebP ou SVG."); }; im.src=url; };
  $("#eReset").onclick=()=>{ const d=normalizeConfig({title:DEFAULT_CONFIG.title}).emblem; CFG.emblem=d; saveCfg(); cfgGeneral(b); };
  bindInputs(b,CFG,k=>{ if(k.startsWith("emblem.")) prev();
 if(k==="title") document.title=CFG.title||"Quiz"; if(k.startsWith("host.")) $("#hostAv").innerHTML=avatarHTML(CFG.host.avatar,fullName(CFG.host),64); if(k.startsWith("host2.")) $("#host2Av").innerHTML=avatarHTML(CFG.host2.avatar,fullName(CFG.host2),64); });
  $("#hostAv").onclick=()=>avatarPicker(CFG.host,()=>{ $("#hostAv").innerHTML=avatarHTML(CFG.host.avatar,fullName(CFG.host),64); });
  $("#host2Av").onclick=()=>avatarPicker(CFG.host2,()=>{ $("#host2Av").innerHTML=avatarHTML(CFG.host2.avatar,fullName(CFG.host2),64); });
}
const EMOJIS="😀 😎 🤓 🥳 😇 🤠 🧐 😺 🦊 🐻 🐼 🐨 🦁 🐯 🐸 🐵 🦉 🐧 🐙 🦄 🐝 🦋 🐬 🐳 🦀 🦭 🐢 🐉 🌵 🌻 ⚓ ⛵ 🏰 🎩 🎸 🚀 ⚡ 🔥 🍀 ⭐ 🎯 🏆 🍕 🥐 🦸 🧙 🧑‍🚀 🧑‍🍳 🏴‍☠️ 🧜".split(" ");
const INICOL=["#3c49d6","#6b3bd1","#c0398a","#e07a2e","#1d9a8a","#2f86d6","#d64545","#2fae5f"];
function avatarPicker(person,done){
  const pk=document.createElement("div"); pk.className="pick"; pk.setAttribute("role","dialog"); pk.setAttribute("aria-label","Choisir un avatar");
  const name=fullName(person);
  const draw=()=>{
    const seeds=[...Array(12)].map(()=>rnd(1e6));
    pk.innerHTML=`<div class="pickp"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Avatar de ${esc(name||"ce participant")}</h3>${avatarHTML(person.avatar,name,64)}</div>
    <div class="flab" style="margin-top:14px">Personnages</div><div class="pgrid">${seeds.map(s=>`<button data-g="${s}" aria-label="Personnage">${avatarHTML({kind:"gen",seed:s},"",60)}</button>`).join("")}</div>
    <button class="cb sm" id="apMore">Proposer d'autres personnages</button>
    <div class="flab" style="margin-top:14px">Émojis</div><div class="egrid">${EMOJIS.map(e=>`<button data-e="${e}" aria-label="${e}">${e}</button>`).join("")}</div>
    <div class="flab">Initiales</div><div class="pgrid">${INICOL.map(c=>`<button data-i="${c}" aria-label="Initiales">${avatarHTML({kind:"ini",color:c},name,60)}</button>`).join("")}</div>
    <div class="flab">Photo ou image</div><div class="row" style="margin:8px 0 16px"><label class="cb pri" style="cursor:pointer">Importer une image…<input type="file" accept="image/*" id="apF" class="sr"></label><span style="font-size:13px;color:var(--cfg-dim)">Recadrée en carré et réduite automatiquement.</span></div>
    <div class="row" style="justify-content:flex-end"><button class="cb" id="apC">Fermer</button></div></div>`;
    const set=a=>{ person.avatar=a; saveCfg(); done(); pk.remove(); };
    pk.querySelectorAll("[data-g]").forEach(x=>x.onclick=()=>set({kind:"gen",seed:+x.dataset.g}));
    pk.querySelectorAll("[data-e]").forEach(x=>x.onclick=()=>set({kind:"emoji",v:x.dataset.e}));
    pk.querySelectorAll("[data-i]").forEach(x=>x.onclick=()=>set({kind:"ini",color:x.dataset.i}));
    $("#apMore",pk).onclick=draw; $("#apC",pk).onclick=()=>pk.remove();
    $("#apF",pk).onchange=e=>{ const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ const im=new Image(); im.onload=()=>{
      const S=180, c=document.createElement("canvas"); c.width=c.height=S; const s=Math.min(im.width,im.height); c.getContext("2d").drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,S,S);
      set({kind:"img",src:c.toDataURL("image/jpeg",.82)}); }; im.onerror=()=>toast("Image illisible : choisissez un fichier JPG, PNG ou WebP."); im.src=rd.result; }; rd.readAsDataURL(f); };
  };
  draw(); document.body.appendChild(pk); pk.addEventListener("click",e=>{ if(e.target===pk) pk.remove(); });
}
function thumbHTML(id,attr,label,extra=""){ const src=IMG[id];
  return `<span class="row" style="gap:4px;flex-wrap:nowrap"><label class="thumb ${src?"has":""} ${extra}" style="${src?`background-image:url('${esc(src)}')`:""}" title="${esc(label)}">${src?"":"📷"}<input type="file" accept="image/*" ${attr} aria-label="${esc(label)}"></label>
    ${src?`<button class="cb sm dan" ${attr.replace("data-","data-rm-")} aria-label="Retirer : ${esc(label)}">✕</button>`:""}</span>`; }
function ptsHint(q){ const nj=(CFG.jokers.fifty?1:0)+(CFG.jokers.public?1:0)+(CFG.jokers.phone?1:0);
  return `Bonne réponse : ${[0,1,2,3].slice(0,nj+1).map(j=>`${pointsFor(j,q)}${j?` avec ${j} joker${j>1?"s":""}`:" sans joker"}`).join(", ")}. Champs vides = valeurs par défaut de l'onglet Général.`; }
const builtinFor = () => (typeof DEFAULT_MEDIA_FOR!=="undefined"?DEFAULT_MEDIA_FOR:{});
function cfgQuestions(b){
  const L="ABCD";
  const bf=builtinFor(), missing=CFG.questions.filter(q=>bf[q.id] && IMG[bf[q.id]] && !(q.imgMode==="single"&&q.img===bf[q.id]));
  b.innerHTML=`${missing.length?`<div class="ccard" style="border-color:var(--gold);display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:240px">🖼️ ${missing.length} illustration${missing.length>1?"s":""} proposée${missing.length>1?"s":""} pour ces questions ne ${missing.length>1?"sont":"est"} pas encore utilisée${missing.length>1?"s":""}.</span><button class="cb pri" id="qBuiltin">Ajouter les illustrations proposées</button></div>`:""}
  <p style="margin:0 0 12px;color:var(--cfg-dim)">${CFG.questions.length} question${CFG.questions.length>1?"s":""}. Donnez un nom au bouton du tableau des scores, cochez la bonne réponse, réglez les points en jeu, choisissez la difficulté (elle détermine le résultat du vote du public). La bonne réponse n'est jamais envoyée aux téléphones avant la révélation.</p>
  ${CFG.questions.map((q,i)=>`<div class="ccard qitem" data-q="${q.id}"><div class="qnum">${i+1}</div><div>
    <div class="f" style="max-width:420px"><label for="ql${i}">Nom du bouton (tableau des scores)</label><input class="inp" id="ql${i}" data-qlabel value="${esc(q.label)}" placeholder="${esc(qLabel(Object.assign({},q,{label:""})))}"></div>
    <div class="f"><label for="qt${i}">Question</label><textarea id="qt${i}" data-qf="text" rows="2">${esc(q.text)}</textarea></div>
    <div class="f"><label for="qn${i}">Rebond pour l'animateur (affiché après la révélation de la réponse)</label><textarea id="qn${i}" data-qnote rows="2" placeholder="Ex. : Diapositive 8 – ouvrir le PowerPoint et présenter l'organisation…">${esc(q.note)}</textarea></div>
    ${q.answers.map((a,j)=>`<div class="arow"><b>${L[j]}</b><input type="radio" name="c_${q.id}" value="${j}" ${q.correct===j?"checked":""} aria-label="${L[j]} est la bonne réponse" title="Bonne réponse"><input class="inp" data-qa="${j}" value="${esc(a)}" aria-label="Réponse ${L[j]}">
      ${q.imgMode==="answers"?thumbHTML(q.aImgs[j],`data-ai="${j}"`,`Photo de la réponse ${L[j]}`):"<span></span>"}</div>`).join("")}
    <div class="qmeta"><label class="flab" for="qp${i}">Points en jeu</label><input class="inp" id="qp${i}" data-qpts type="number" min="0" max="1000" style="width:110px" value="${q.points??""}" placeholder="${+CFG.basePoints||3} (défaut)">
      <label class="flab" for="qj${i}" style="margin-left:8px">Points perdus par joker</label><input class="inp" id="qj${i}" data-qjc type="number" min="0" max="1000" style="width:110px" value="${q.jokerCost??""}" placeholder="${+CFG.jokerCost||0} (défaut)"></div>
    <div class="qmeta" style="margin-top:2px"><span class="hint" style="font-size:13px;color:var(--cfg-dim)" data-qpts-hint>${ptsHint(q)}</span></div>
    <div class="qmeta"><label class="flab" for="qd${i}">Difficulté</label><select id="qd${i}" data-qdiff>
      ${[[1,"1 – Facile : le public est quasi unanime"],[2,"2 – Moyenne : le public penche nettement"],[3,"3 – Difficile : le public hésite"],[4,"4 – Très difficile : le public peut se tromper"]].map(([v,l])=>`<option value="${v}" ${q.difficulty===v?"selected":""}>${l}</option>`).join("")}</select></div>
    <div class="qmeta"><label class="flab" for="qm${i}">Illustration</label><select id="qm${i}" data-qmode>
      <option value="none" ${q.imgMode==="none"?"selected":""}>Aucune</option><option value="single" ${q.imgMode==="single"?"selected":""}>Une photo pour toute la question</option><option value="answers" ${q.imgMode==="answers"?"selected":""}>Une photo par proposition (2 × 2)</option></select>
      ${q.imgMode==="single"?thumbHTML(q.img,`data-qi`,"Photo de la question","bigthumb"):""}
      ${q.imgMode==="answers"?`<span style="font-size:13px;color:var(--cfg-dim)">Cliquez sur les vignettes à droite de chaque proposition.</span>`:""}</div>
    <div class="qmeta"><button class="cb sm" data-mv="-1">Monter</button><button class="cb sm" data-mv="1">Descendre</button><button class="cb sm" data-sh>Mélanger les réponses</button><button class="cb sm dan" data-del>Supprimer</button></div></div></div>`).join("")||`<div class="empty">Aucune question. Ajoutez la première.</div>`}
  <div class="row"><button class="cb pri" id="qAdd">+ Ajouter une question</button></div>`;
  b.querySelectorAll("[data-q]").forEach(card=>{
    const q=CFG.questions.find(x=>x.id===card.dataset.q), i=()=>CFG.questions.indexOf(q);
    card.querySelector("[data-qf]").oninput=e=>{ q.text=e.target.value; saveCfg(); };
    card.querySelector("[data-qlabel]").oninput=e=>{ q.label=e.target.value; saveCfg(); };
    card.querySelector("[data-qnote]").oninput=e=>{ q.note=e.target.value; saveCfg(); };
    card.querySelectorAll("[data-qa]").forEach(inp=>inp.oninput=()=>{ q.answers[+inp.dataset.qa]=inp.value; saveCfg(); });
    card.querySelectorAll("input[type=radio]").forEach(r=>r.onchange=()=>{ q.correct=+r.value; saveCfg(); });
    card.querySelector("[data-qpts]").oninput=e=>{ const v=e.target.value.trim(); q.points=v===""?null:Math.max(0,Math.min(1000,Math.round(+v)||0)); saveCfg(); card.querySelector("[data-qpts-hint]").textContent=ptsHint(q); };
    card.querySelector("[data-qjc]").oninput=e=>{ const v=e.target.value.trim(); q.jokerCost=v===""?null:Math.max(0,Math.min(1000,Math.round(+v)||0)); saveCfg(); card.querySelector("[data-qpts-hint]").textContent=ptsHint(q); };
    card.querySelector("[data-qdiff]").onchange=e=>{ q.difficulty=+e.target.value; saveCfg(); };
    card.querySelector("[data-qmode]").onchange=e=>{ q.imgMode=e.target.value; saveCfg(); cfgQuestions(b); };
    const up=async(file,setter)=>{ if(!file) return; try{ const id=await addImage(file); setter(id); saveCfg(); cfgQuestions(b); }catch(_){ toast("Image illisible : choisissez un fichier JPG, PNG ou WebP."); } };
    card.querySelectorAll("input[data-ai]").forEach(inp=>inp.onchange=e=>{ const j=+inp.dataset.ai, old=q.aImgs[j]; up(e.target.files[0],id=>{ q.aImgs[j]=id; removeImage(old); }); });
    card.querySelectorAll("[data-rm-ai]").forEach(btn=>btn.onclick=()=>{ const j=+btn.dataset.rmAi, old=q.aImgs[j]; q.aImgs[j]=null; saveCfg(); removeImage(old); cfgQuestions(b); });
    const qi=card.querySelector("input[data-qi]"); qi&&(qi.onchange=e=>{ const old=q.img; up(e.target.files[0],id=>{ q.img=id; removeImage(old); }); });
    const rq=card.querySelector("[data-rm-qi]"); rq&&(rq.onclick=()=>{ const old=q.img; q.img=null; saveCfg(); removeImage(old); cfgQuestions(b); });
    card.querySelectorAll("[data-mv]").forEach(btn=>btn.onclick=()=>{ const a=i(), z=a+ +btn.dataset.mv; if(z<0||z>=CFG.questions.length) return; [CFG.questions[a],CFG.questions[z]]=[CFG.questions[z],CFG.questions[a]]; saveCfg(); cfgQuestions(b); });
    card.querySelector("[data-sh]").onclick=()=>{ const ord=shuffle([0,1,2,3]); q.answers=ord.map(k=>q.answers[k]); q.aImgs=ord.map(k=>q.aImgs[k]); q.correct=ord.indexOf(q.correct); saveCfg(); cfgQuestions(b); };
    card.querySelector("[data-del]").onclick=async()=>{ if(await ask("Supprimer cette question ?",{ok:"Supprimer"})){ CFG.questions.splice(i(),1); saveCfg(); cfgQuestions(b);} };
  });
  $("#qBuiltin")&&($("#qBuiltin").onclick=()=>{ missing.forEach(q=>{ q.imgMode="single"; q.img=bf[q.id]; }); saveCfg(); toast(`${missing.length} illustration(s) ajoutée(s)`); cfgQuestions(b); });
  $("#qAdd").onclick=()=>{ CFG.questions.push({id:uid("q"),label:"",note:"",text:"",answers:["","","",""],correct:0,points:null,jokerCost:null,difficulty:2,imgMode:"none",img:null,aImgs:[null,null,null,null]}); saveCfg(); cfgQuestions(b); const ts=b.querySelectorAll("textarea"); ts[ts.length-1]?.focus(); };
}
function cfgSounds(b){
  const srcLabel=s=>CUSTOM[s.k]?`Fichier importé : ${esc(CUSTOM[s.k].name)}`:(s.def?"Son d'origine":"Son synthétisé");
  b.innerHTML=`<p style="margin:0 0 12px;color:var(--cfg-dim)">Les sons sont joués sur l'ordinateur projeté uniquement (pas sur les téléphones). Vous pouvez remplacer chacun d'eux par votre propre fichier : il reste enregistré dans ce navigateur.</p>
  <div class="ccard"><h4>Révélation de la bonne réponse</h4><div class="grid2">
    <div class="f" style="margin:0"><label for="sRev">Dès que les réponses sont closes, la musique de suspense tourne en boucle jusqu'à</label><select id="sRev" data-k="revealMode"><option value="manual">un clic sur « Révéler la bonne réponse » (ou la touche Entrée)</option><option value="auto">une révélation automatique</option></select></div>
    <div class="f" style="margin:0"><label for="sSus">Délai de la révélation automatique (1 à 10 secondes)</label><input class="inp" id="sSus" type="number" min="1" max="10" data-k="suspenseSec"></div></div></div>
  ${SND_SLOTS.map(s=>`<div class="ccard" data-s="${s.k}"><div class="row" style="justify-content:space-between;align-items:flex-start">
      <div><h4 style="margin:0 0 2px">${esc(s.name)}</h4><div style="font-size:13px;color:var(--cfg-dim)">${esc(s.when)}</div><div style="font-size:13px;margin-top:4px">${srcLabel(s)}</div></div>
      <label class="chk" style="margin:0"><input type="checkbox" data-on ${slotOn(s.k)?"checked":""}> Activé</label></div>
    <div class="row" style="margin-top:10px">
      <button class="cb sm" data-play>▶ Écouter</button><button class="cb sm" data-stop>■ Arrêter</button>
      <label class="flab" style="display:flex;align-items:center;gap:6px">Volume <input type="range" min="0" max="1" step="0.05" value="${slotVol(s.k)}" data-vol aria-label="Volume ${esc(s.name)}"></label>
      <label class="cb sm" style="cursor:pointer">Remplacer par un fichier…<input type="file" accept="audio/*" class="sr" data-file></label>
      ${CUSTOM[s.k]?`<button class="cb sm dan" data-reset>${s.def?"Revenir au son d'origine":"Retirer le fichier"}</button>`:""}
    </div></div>`).join("")}`;
  bindInputs(b,CFG,k=>{ if(k==="suspenseSec"){ const v=+CFG.suspenseSec; if(!(v>=1&&v<=10)){ CFG.suspenseSec=Math.max(1,Math.min(10,v||6)); saveCfg(); } } });
  const ss=$("#sSus",b); ss&&ss.addEventListener("change",()=>{ ss.value=CFG.suspenseSec; });
  b.querySelectorAll("[data-s]").forEach(card=>{
    const k=card.dataset.s;
    card.querySelector("[data-play]").onclick=()=>{ const was=muted; muted=false; const on=CFG.soundOn[k]; CFG.soundOn[k]=true; stopAll(); play(k); CFG.soundOn[k]=on; muted=was; };
    card.querySelector("[data-stop]").onclick=()=>stop(k,200);
    card.querySelector("[data-on]").onchange=e=>{ CFG.soundOn[k]=e.target.checked; if(!e.target.checked) stop(k,0); saveCfg(); };
    card.querySelector("[data-vol]").oninput=e=>{ CFG.soundVol[k]=+e.target.value; if(AUD[k]) AUD[k].volume=+e.target.value; saveCfg(); };
    card.querySelector("[data-file]").onchange=async e=>{ const f=e.target.files[0]; if(!f) return; stop(k,0); await setCustomSound(k,f); toast("Son « "+SLOT[k].name+" » remplacé"); cfgSounds(b); };
    const r=card.querySelector("[data-reset]"); r&&(r.onclick=async()=>{ await clearCustomSound(k); cfgSounds(b); });
  });
}
/* ================= Excel import (no library: an .xlsx is a zip of XML files) ================= */
async function unzip(buf){
  const dv=new DataView(buf), u8=new Uint8Array(buf), out={};
  let e=buf.byteLength-22; while(e>=0 && dv.getUint32(e,true)!==0x06054b50) e--;
  if(e<0) throw new Error("zip");
  const n=dv.getUint16(e+10,true); let p=dv.getUint32(e+16,true);
  const dec=new TextDecoder();
  for(let k=0;k<n;k++){
    const method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), xl=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), off=dv.getUint32(p+42,true);
    const name=dec.decode(u8.subarray(p+46,p+46+nl)); p+=46+nl+xl+cl;
    out[name]=async()=>{ const ln=dv.getUint16(off+26,true), lx=dv.getUint16(off+28,true), start=off+30+ln+lx, data=u8.slice(start,start+csize);
      if(method===0) return dec.decode(data);
      const st=new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return await new Response(st).text(); };
  }
  return out;
}
async function readXlsxRows(file){
  const z=await unzip(await file.arrayBuffer()), X=s=>new DOMParser().parseFromString(s,"application/xml");
  const nsr="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const wbx=X(await z["xl/workbook.xml"]()), sheets=[...wbx.getElementsByTagName("sheet")];
  const sh=sheets.find(x=>(x.getAttribute("name")||"").trim().toLowerCase()==="questions")||sheets.find(x=>!/mode/i.test(x.getAttribute("name")))||sheets[0];
  const rid=sh.getAttributeNS(nsr,"id")||sh.getAttribute("r:id");
  const rel=[...X(await z["xl/_rels/workbook.xml.rels"]()).getElementsByTagName("Relationship")].find(r=>r.getAttribute("Id")===rid);
  let target=rel.getAttribute("Target").replace(/^\/?xl\//,"").replace(/^\//,""); target="xl/"+target;
  const shared=z["xl/sharedStrings.xml"]?[...X(await z["xl/sharedStrings.xml"]()).getElementsByTagName("si")].map(si=>[...si.getElementsByTagName("t")].map(t=>t.textContent).join("")):[];
  const rows=[];
  for(const r of X(await z[target]()).getElementsByTagName("row")){
    const row={};
    for(const c of r.getElementsByTagName("c")){
      const col=(c.getAttribute("r")||"").replace(/\d+/g,""), t=c.getAttribute("t"), v=c.getElementsByTagName("v")[0];
      let val= t==="s" ? shared[+(v&&v.textContent)] : t==="inlineStr" ? [...c.getElementsByTagName("t")].map(x=>x.textContent).join("") : (v?v.textContent:"");
      row[col]=String(val??"").trim();
    }
    rows.push(row);
  }
  return rows;
}
async function importXlsx(file){
  let rows; try{ rows=await readXlsxRows(file); }catch(e){ notice("Ce fichier Excel n'a pas pu être lu. Enregistrez-le au format .xlsx (Classeur Excel) puis réessayez."); return; }
  const head=rows.shift()||{}, norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  const col=(...keys)=>Object.keys(head).find(k=>keys.some(key=>norm(head[k]).startsWith(key)));
  const C={sel:col("selection"),ord:col("ordre"),lab:col("nom du bouton"),txt:col("question"),a:col("reponse a"),b:col("reponse b"),c:col("reponse c"),d:col("reponse d"),
    ok:col("bonne reponse"),diff:col("difficulte"),pts:col("points en jeu"),jc:col("points perdus"),note:col("laius","rebond"),id:col("identifiant")};
  if(!C.txt||!C.a||!C.ok){ notice("Colonnes introuvables : le fichier doit contenir au moins « Question », « Réponse A » à « Réponse D » et « Bonne réponse » sur sa première ligne."); return; }
  const num=v=>{ const t=String(v||"").replace(",",".").trim(); return t===""||!isFinite(+t)?null:Math.round(+t); };
  let list=rows.map((r,k)=>({r,k})).filter(({r})=>r[C.txt]&&(!C.sel||/^(oui|o|yes|x|1|vrai|true)$/i.test(r[C.sel]||"")));
  list.sort((x,y)=>{ const a=num(x.r[C.ord]), b=num(y.r[C.ord]); return (a??1e9)-(b??1e9) || x.k-y.k; });
  const bad=[];
  const qs=list.map(({r,k})=>{
    const old=r[C.id]&&CFG.questions.find(q=>q.id===r[C.id]);
    const letter=String(r[C.ok]||"").trim().toUpperCase().charAt(0), correct="ABCD".indexOf(letter);
    if(correct<0||!["a","b","c","d"].every(x=>r[C[x]])) bad.push(k+2);
    return {id:old?old.id:(r[C.id]||uid("q")),label:r[C.lab]||"",text:r[C.txt],answers:["a","b","c","d"].map(x=>r[C[x]]||""),correct:Math.max(0,correct),
      difficulty:Math.max(1,Math.min(4,num(r[C.diff])||2)),points:num(r[C.pts]),jokerCost:num(r[C.jc]),note:r[C.note]||"",
      imgMode:old?old.imgMode:"none",img:old?old.img:null,aImgs:old?old.aImgs:[null,null,null,null]};
  });
  if(!qs.length){ notice("Aucune question sélectionnée : mettez « Oui » dans la colonne Sélection des questions à importer."); return; }
  if(!await ask(`Remplacer les ${CFG.questions.length} questions actuelles par les ${qs.length} questions sélectionnées dans « ${file.name} » ?${bad.length?` Attention : ligne${bad.length>1?"s":""} ${bad.join(", ")} incomplète${bad.length>1?"s":""} (réponse ou bonne réponse manquante).`:""}`,{ok:"Importer"})) return;
  CFG=normalizeConfig(Object.assign({},CFG,{questions:qs})); save(KEY_CFG,CFG); syncSettings();
  toast(`${qs.length} questions importées depuis Excel`);
}
function cfgData(b){
  b.innerHTML=`<div class="ccard"><h4>Où sont enregistrés vos réglages ?</h4>
    <p style="font-size:14px;margin:0">Les questions, illustrations, sons et réglages sont enregistrés dans <b>ce navigateur, sur cet ordinateur</b> (ils ne sont pas envoyés sur le serveur, seul le texte de la question en cours l'est). Pour animer depuis un autre ordinateur ou un autre navigateur, exportez la configuration ici puis importez-la là-bas.</p></div>
  <div class="ccard"><h4>Exporter la configuration</h4><p style="color:var(--cfg-dim);font-size:14px;margin-top:0">Fichier .json avec les questions, illustrations et réglages : c'est votre copie de sécurité. Les sons importés ne sont pas inclus.</p>
    <button class="cb pri" id="dExp">Exporter (fichier .json)</button></div>
  <div class="ccard"><h4>Importer des questions ou une configuration</h4><p style="color:var(--cfg-dim);font-size:14px;margin-top:0"><b>Fichier Excel (.xlsx)</b> : les questions marquées « Oui » dans la colonne Sélection remplacent celles du jeu, dans l'ordre de la colonne Ordre ; l'emblème, les sons et les réglages sont conservés.<br><b>Fichier .json</b> : configuration complète exportée depuis le jeu (ou depuis la version HTML).</p><label class="cb pri" style="cursor:pointer;display:inline-block">Choisir un fichier .xlsx ou .json…<input type="file" accept=".json,application/json,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" id="dImp" class="sr"></label></div>
  <div class="ccard"><h4>Partie en cours</h4><div class="row"><button class="cb" id="dGame">Effacer les scores</button><button class="cb" id="dPl">Retirer tous les joueurs</button><button class="cb dan" id="dDef">Revenir à la configuration d'origine</button></div></div>
  <div class="ccard"><h4>Accès animateur</h4><p style="font-size:14px;margin:0 0 8px">${PROTECTED?"Cette page est protégée par le mot de passe défini sur Render.":"⚠️ Cette page n'est pas protégée : définissez la variable ADMIN_PASSWORD sur Render pour que personne d'autre ne puisse piloter le jeu."}</p>${PROTECTED?`<button class="cb" id="dOut">Se déconnecter de cet ordinateur</button>`:""}</div>`;
  $("#dExp").onclick=async()=>{
    const btn=$("#dExp"); btn.disabled=true;
    try{ let media={}; try{ media=await exportMedia(); }catch(e){ toast("Certaines illustrations n'ont pas pu être incluses dans l'export."); }
      const blob=new Blob([JSON.stringify(Object.assign({},CFG,{media}),null,1)],{type:"application/json"});
      const d=new Date(), p=n=>String(n).padStart(2,"0");
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`quiz-configuration-${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}.json`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href),4000); toast("Configuration exportée");
    }catch(e){ notice("L'export a échoué : "+(e&&e.message||e)); } finally{ btn.disabled=false; }
  };
  $("#dImp").onchange=e=>{ const f=e.target.files[0]; if(!f) return;
    if(/\.xlsx$/i.test(f.name)){ e.target.value=""; return importXlsx(f).then(()=>openConfig()); }
    f.text().then(async t=>{ try{ const o=JSON.parse(t); if(!Array.isArray(o.questions)) throw 0;
      CFG=normalizeConfig(o); if(o.media) await importMedia(o.media); save(KEY_CFG,CFG); syncSettings(); toast(`Configuration importée : ${CFG.questions.length} questions`); openConfig(); }
    catch(_){ toast("Ce fichier n'est pas une configuration du quiz (questions introuvables)."); } }); };
  $("#dGame").onclick=async()=>{ if(await ask("Effacer tous les scores ? Les joueurs restent inscrits.",{ok:"Effacer"})){ await admin("resetScores"); toast("Scores effacés"); } };
  $("#dPl").onclick=async()=>{ if(await ask("Retirer tous les joueurs et effacer les scores ? Chacun devra rescanner le QR code.",{ok:"Retirer tout le monde"})){ await admin("clearPlayers"); save(KEY_SNAP,null); toast("Liste des joueurs vidée"); } };
  $("#dDef").onclick=async()=>{ if(await ask("Remplacer toutes vos questions et réglages par la configuration d'origine ?",{ok:"Rétablir"})){ CFG=normalizeConfig(clone(DEFAULT_CONFIG)); save(KEY_CFG,CFG); syncSettings(); toast("Configuration d'origine restaurée"); openConfig(); } };
  $("#dOut")&&($("#dOut").onclick=()=>{ try{ localStorage.removeItem(KEY_ADMIN); }catch(e){} location.reload(); });
}

/* ================= Tools & boot ================= */
$("#tSound").onclick=e=>{ muted=!muted; if(muted) stopAll(300); e.currentTarget.textContent=muted?"🔇":"🔊"; e.currentTarget.setAttribute("aria-label",muted?"Activer le son":"Couper le son"); };
$("#tFull").onclick=()=>{ try{ if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(()=>toast("Plein écran refusé : utilisez la touche F11.")); }catch(e){ toast("Plein écran indisponible : utilisez la touche F11."); } };
$("#tCfg").onclick=openConfig;
let PROTECTED=true;
document.title=CFG.title||"Quiz";
document.fonts && document.fonts.ready.then(()=>{ if(screen==="home"&&S) render(); });
loadCustomSounds();
loadImages();
// Render (free plan) puts the server to sleep after 15 minutes without requests: keep it awake while this page is open
setInterval(()=>{ fetch("/healthz",{cache:"no-store"}).catch(()=>{}); },4*60*1000);
(async()=>{
  const r=await api("/api/admin/check",{key:ADMIN_KEY}).catch(()=>null);
  if(!r){ app.innerHTML=`<section class="screen home"><div class="box" style="max-width:520px"><h3>Serveur injoignable</h3><p style="text-align:center">Vérifiez la connexion Internet. Sur Render (offre gratuite), le serveur peut mettre une minute à se réveiller : rechargez la page dans un instant.</p></div></section>`; setTimeout(()=>location.reload(),8000); return; }
  PROTECTED=!!r.protected;
  if(!r.ok) return renderLogin();
  start(); render();
})();
