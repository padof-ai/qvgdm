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
const SKIN=["#fde0c8","#f6cfae","#eebb94","#d99d72","#b97a50","#8d5835","#64391f"];
const HAIR=["#1d1a1a","#3b2416","#5a3418","#7a4a24","#a5652b","#d9a441","#ecd49a","#9a9a9a","#b8352b","#2c3570"];
const TOP=["#1f5fa8","#d6453b","#2f9e6b","#f2b33d","#7b4bc4","#e57a2f","#2a2f45","#e9ecf5","#d94f8a","#1d8f9a","#8a9a2b","#3a7bd5"];
const BOTTOM=["#2b2d38","#3d5a8a","#2d3f66","#c8b48c","#4a4a4a","#6b4a3a","#1c2440"];
const SHOE=["#2d4fd1","#d63b3b","#f2f2f2","#1f1f1f","#2fae5f","#f2b33d","#7b4bc4","#e57a2f"];
const shade=(hex,f)=>{ const n=parseInt(hex.slice(1),16); const c=[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(f<0?v*(1+f):v+(255-v)*f)))); return "#"+c.map(v=>v.toString(16).padStart(2,"0")).join(""); };
// Full-body "chibi" character (big head, hoodie, trousers, sneakers), portrait 120 x 160, transparent background
const HAIRSTYLES=["long","pony","bob","bun","curlyLong","spiky","side","curly","buzz","quiff"];
// The seed draws a character; "o" (avatar builder on the phone) overrides any feature by its index
function genAvatarSVG(seed,o){
  o=o||{};
  const r=mulberry(seed*9301+49297), p=a=>a[Math.floor(r()*a.length)], O_=(k,v,list)=>Number.isInteger(o[k])?(list?list[o[k]]:o[k]):v;
  const skin=O_("skin",p(SKIN),SKIN), hair=O_("hair",p(HAIR),HAIR), top=O_("top",p(TOP),TOP), bottom=O_("bottom",p(BOTTOM),BOTTOM), shoe=O_("shoe",p(SHOE),SHOE);
  const lh0=r()<.4, hs0=lh0?["long","pony","bob","bun","curlyLong"][Math.floor(r()*5)]:["spiky","side","curly","buzz","quiff"][Math.floor(r()*5)];
  const hs=O_("hs",hs0,HAIRSTYLES), longHair=HAIRSTYLES.indexOf(hs)<5;
  const g0=r()<.22, f0=r()<.25, lashes=longHair?r()<.75:r()<.1, b0=!longHair&&r()<.12;
  const glasses=!!O_("glasses",g0), freckles=!!O_("freckles",f0), beard=!!O_("beard",b0);
  const pose=O_("pose",Math.floor(r()*3)), topKind=O_("topKind",Math.floor(r()*3)), logo=O_("logo",Math.floor(r()*6)), sk0=longHair&&r()<.3, skirt=!!O_("skirt",sk0), smile=O_("smile",Math.floor(r()*3));
  const O='stroke="#2a1a14" stroke-width="1.3" stroke-linejoin="round"', topD=shade(top,-.22), skinD=shade(skin,-.12), hairL=shade(hair,.18);
  const sleeve=(d)=>`<path d="${d}" fill="none" stroke="#2a1a14" stroke-width="12.6" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${top}" stroke-width="10" stroke-linecap="round"/>`;
  const hand=(x,y)=>`<circle cx="${x}" cy="${y}" r="5.2" fill="${skin}" ${O}/>`;
  // thumbs-up: a wide fist with curled fingers, the thumb leaning to one side
  const thumb=(x,y)=>`<g ${O} fill="${skin}"><path d="M${x-1} ${y-1} Q${x-3} ${y-9} ${x+1} ${y-11} Q${x+4.5} ${y-11} ${x+4} ${y-6} L${x+3} ${y-1} Z"/><rect x="${x-6.5}" y="${y-2}" width="13" height="10.5" rx="4"/></g><path d="M${x-6.2} ${y+1.5} H${x+1.5} M${x-6.2} ${y+4.6} H${x+1.5}" stroke="#2a1a14" stroke-width=".9" stroke-linecap="round"/>`;
  // legs, trousers or skirt, sneakers
  let legs="";
  if(skirt) legs=`<path d="M45 104 L44 134 M75 104 L76 134" stroke="${skinD}" stroke-width="9" stroke-linecap="round"/><path d="M45 104 L44 134 M75 104 L76 134" stroke="${skin}" stroke-width="7" stroke-linecap="round"/>
    <path d="M38 100 L82 100 L90 122 Q60 128 30 122 Z" fill="${bottom}" ${O}/>`;
  else legs=`<path d="M40 102 L80 102 L84 136 L66 137 L60 114 L54 137 L36 136 Z" fill="${bottom}" ${O}/>
    <path d="M60 106 L60 114" stroke="#2a1a14" stroke-width="1"/><path d="M38 131 L55 131 M65 131 L82 131" stroke="${shade(bottom,-.3)}" stroke-width="1.4"/>`;
  const shoes=`<g ${O}><path d="M33 137 Q33 133 40 133 L54 133 Q57 138 57 142 L57 146 L31 146 Q29 141 33 137Z" fill="${shoe}"/><path d="M63 133 L80 133 Q87 133 88 137 Q91 141 89 146 L63 146 L63 142 Q63 138 63 133Z" fill="${shoe}"/></g>
    <path d="M31 146 L57 146 M63 146 L89 146" stroke="#2a1a14" stroke-width="3.2"/><path d="M31.5 145.2 L56.5 145.2 M63.5 145.2 L88.5 145.2" stroke="#fff" stroke-width="2.4"/>
    <path d="M42 136 L50 136 M45 139 L52 139 M70 136 L78 136 M68 139 L75 139" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".9"/>`;
  // arms (behind / in front of the body depending on the pose)
  let armsBack="", armsFront="";
  if(pose===0){ armsFront=sleeve("M39 78 Q28 80 22 70")+thumb(20,66)+sleeve("M81 78 Q87 90 84 101"); }
  else if(pose===1){ armsFront=sleeve("M39 78 Q33 90 33 101")+hand(33,105)+sleeve("M81 78 Q87 90 87 101")+hand(87,105); }
  else { armsFront=sleeve("M39 78 Q33 90 34 101")+hand(34,105)+`<g class="av-wave">`+sleeve("M81 78 Q92 72 96 60")+`<g ${O} fill="${skin}"><ellipse cx="97" cy="54" rx="5.6" ry="6.4"/></g><path d="M94 49 L93 46 M97 48 L97 44.5 M100 49 L101 46" stroke="#2a1a14" stroke-width="1" stroke-linecap="round"/></g>`; }
  if(pose===0) armsFront=armsFront.replace(sleeve("M39 78 Q28 80 22 70")+thumb(20,66),`<g class="av-thumb">${sleeve("M39 78 Q28 80 22 70")+thumb(20,66)}</g>`);
  // top: hoodie, sweater or t-shirt (t-shirt shows the forearms)
  const logos=[
    `<path d="M60 84 l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="#f6c343" stroke="#2a1a14" stroke-width=".8"/>`,
    `<g stroke="#2a1a14" stroke-width=".9"><rect x="49" y="85" width="22" height="11" rx="5.5" fill="#1f1f24"/><path d="M54 88.5v4 M52 90.5h4" stroke="#fff"/><circle cx="66" cy="89" r="1.3" fill="#e84a4a"/><circle cx="64" cy="92" r="1.3" fill="#3fbf6b"/></g>`,
    `<path d="M62 82 L54 93 L60 93 L57 102 L67 89 L61 89 Z" fill="#f6c343" stroke="#2a1a14" stroke-width=".8"/>`,
    `<path d="M60 99 C50 92 52 84 57 85 Q59 85.5 60 88 Q61 85.5 63 85 C68 84 70 92 60 99Z" fill="#ff6b81" stroke="#2a1a14" stroke-width=".8"/>`,
    `<path d="M41 88 H79 M40 94 H80" stroke="${shade(top,.45)}" stroke-width="3"/>`, ""];
  const hood=topKind===0?`<path d="M42 74 Q38 64 48 63 Q60 70 72 63 Q82 64 78 74 Q60 82 42 74Z" fill="${topD}" ${O}/>`:"";
  const body=`<path d="M38 80 Q39 71 52 69 Q60 72 68 69 Q81 71 82 80 L84 104 Q60 108 36 104 Z" fill="${top}" ${O}/>`+hood+
    (topKind===0?`<path d="M55 72 L54 83 M65 72 L66 83" stroke="#f4f4f4" stroke-width="1.3" stroke-linecap="round"/><path d="M48 96 Q60 94 72 96 L71 104 L49 104Z" fill="${topD}" opacity=".55"/>`
     :topKind===1?`<path d="M52 69 Q60 75 68 69" fill="none" stroke="${topD}" stroke-width="2.6"/><path d="M37 101 L83 101" stroke="${topD}" stroke-width="3"/>`
     :`<path d="M52 69 Q60 76 68 69" fill="${skin}" ${O}/>`)+logos[logo];
  // head
  const ears=`<g ${O} fill="${skin}"><ellipse cx="35.5" cy="49" rx="4.2" ry="6"/><ellipse cx="84.5" cy="49" rx="4.2" ry="6"/></g>`;
  let hb="", hf="";
  const H=`fill="${hair}" ${O}`;
  if(hs==="long") { hb=`<path d="M33 42 Q30 80 36 90 Q48 94 60 92 Q72 94 84 90 Q90 80 87 42 Q86 16 60 16 Q34 16 33 42Z" ${H}/>`; hf=`<path d="M34 46 Q33 17 60 17 Q87 17 86 46 Q79 33 70 30 Q62 38 44 36 Q38 40 34 46Z" ${H}/>`; }
  if(hs==="pony") { hb=`<path d="M80 30 Q100 34 96 62 Q94 74 88 80 Q92 60 82 44Z" ${H}/>`; hf=`<path d="M34 47 Q32 17 60 17 Q88 17 86 47 Q82 30 60 29 Q42 30 34 47Z" ${H}/><circle cx="83" cy="31" r="3" fill="#e84a7a" stroke="#2a1a14" stroke-width="1"/>`; }
  if(hs==="bob") { hb=`<path d="M31 46 Q29 70 38 72 L82 72 Q91 70 89 46 Q88 15 60 15 Q32 15 31 46Z" ${H}/>`; hf=`<path d="M34 50 Q31 18 60 17 Q89 18 86 50 Q84 36 76 32 L44 32 Q36 36 34 50Z" ${H}/>`; }
  if(hs==="bun") { hb=`<circle cx="60" cy="14" r="9.5" ${H}/>`; hf=`<path d="M34 47 Q32 18 60 18 Q88 18 86 47 Q80 31 64 30 Q50 33 42 31 Q36 37 34 47Z" ${H}/>`; }
  if(hs==="curlyLong") { hb=`<g ${H}>${[[34,40],[31,54],[32,68],[38,80],[86,40],[89,54],[88,68],[82,80]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="9"/>`).join("")}</g>`; hf=`<g ${H}>${[[38,30],[48,21],[60,18],[72,21],[82,30],[36,40],[84,40]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="9"/>`).join("")}</g>`; }
  if(hs==="spiky") hf=`<path d="M33 48 Q30 30 38 23 L37 14 L46 19 L49 9 L56 16 L62 7 L66 16 L74 10 L75 20 L84 17 L82 27 Q90 34 87 48 Q83 34 74 31 Q66 36 56 32 Q46 36 40 34 Q35 40 33 48Z" ${H}/>`;
  if(hs==="side") hf=`<path d="M33 48 Q31 18 60 16 Q89 17 87 46 Q84 30 74 27 Q60 36 40 34 Q35 40 33 48Z" ${H}/><path d="M56 22 Q66 24 76 30" stroke="${hairL}" stroke-width="1.6" fill="none"/>`;
  if(hs==="curly") hf=`<g ${H}>${[[36,38],[38,27],[47,20],[58,16],[70,18],[80,25],[84,36],[52,26],[64,25]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="8"/>`).join("")}</g>`;
  if(hs==="buzz") hf=`<path d="M35 44 Q34 20 60 19 Q86 20 85 44 Q80 30 60 29 Q40 30 35 44Z" fill="${hair}" opacity=".9" ${O}/>`;
  if(hs==="quiff") hf=`<path d="M34 48 Q32 26 44 20 Q50 8 66 10 Q80 12 78 20 Q88 26 86 48 Q82 33 72 30 Q60 35 46 32 Q37 38 34 48Z" ${H}/><path d="M50 16 Q60 12 70 15" stroke="${hairL}" stroke-width="1.6" fill="none"/>`;
  const face=`<ellipse cx="60" cy="48" rx="25" ry="25.5" fill="${skin}" ${O}/>`;
  const eye=(x)=>`<ellipse cx="${x}" cy="51" rx="4.4" ry="5.4" fill="#3a2414"/><circle cx="${x+1.5}" cy="49" r="1.7" fill="#fff"/><circle cx="${x-1.4}" cy="53.2" r=".8" fill="#fff" opacity=".8"/>`;
  const eyes=eye(50)+eye(70)+(lashes?`<path d="M45 47 L43.5 45.5 M75 47 L76.5 45.5" stroke="#2a1a14" stroke-width="1.2" stroke-linecap="round"/>`:"");
  const brows=`<path d="M45 42.5 Q50 40 54 42 M66 42 Q70 40 75 42.5" stroke="${shade(hair,-.25)}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const nose=`<path d="M59 57 Q60.5 58.5 62 57" stroke="${shade(skin,-.35)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  const mouth=smile===0?`<path d="M54 62 Q60 66.5 66 62" stroke="#7a2a20" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
    :smile===1?`<path d="M53.5 61.5 Q60 69 66.5 61.5 Z" fill="#8a2c24" stroke="#2a1a14" stroke-width="1"/><path d="M55 62.2 Q60 63.8 65 62.2" stroke="#fff" stroke-width="1.6" fill="none"/>`
    :`<path d="M55 62.5 Q61 65.5 66 61.5" stroke="#7a2a20" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const blush=`<ellipse cx="45" cy="59" rx="4" ry="2.4" fill="#ff8a8a" opacity=".35"/><ellipse cx="75" cy="59" rx="4" ry="2.4" fill="#ff8a8a" opacity=".35"/>`;
  const fr=freckles?`<g fill="${shade(skin,-.35)}" opacity=".7"><circle cx="45" cy="56" r=".7"/><circle cx="47.5" cy="57.5" r=".7"/><circle cx="44" cy="58.5" r=".7"/><circle cx="75" cy="56" r=".7"/><circle cx="72.5" cy="57.5" r=".7"/><circle cx="76" cy="58.5" r=".7"/></g>`:"";
  const gl=glasses?`<g fill="rgba(255,255,255,.12)" stroke="#1b1b2f" stroke-width="1.6"><rect x="43" y="45" width="14" height="11" rx="4"/><rect x="63" y="45" width="14" height="11" rx="4"/><path d="M57 50 H63 M43 49 L37 47 M77 49 L83 47" fill="none"/></g>`:"";
  const bd=beard?`<path d="M38 56 Q42 74 60 75 Q78 74 82 56 Q78 66 60 67 Q42 66 38 56Z" fill="${hair}" opacity=".9"/>`:"";
  return `<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="60" cy="149" rx="34" ry="4.5" fill="#000" opacity=".22"/>
  ${legs}${shoes}${hb}${armsBack}${body}${armsFront}${ears}${face}${hf}${bd}${fr}${blush}${brows}<g class="av-eyes">${eyes}</g>${nose}${mouth}${gl}</svg>`;
}
function initials(name){ return name.split(/[\s-]+/).filter(Boolean).slice(0,2).map(s=>s[0].toUpperCase()).join(""); }
// Avatars are full-length portraits (3:4): "size" is the height, the width follows, and the whole picture is shown
const AV_RATIO=.75;
const avHash=s=>{ let h=7; for(const c of String(s)) h=(h*31+c.charCodeAt(0))>>>0; return h; };
function avatarHTML(av, name, size=64, extra="", cls=""){
  av=av||{kind:"gen",seed:1};
  let inner;
  if(av.kind==="img" && av.src) inner=`<img src="${esc(av.src)}" alt="" loading="lazy" decoding="async">`;
  else if(av.kind==="emoji") inner=`<div class="emo" style="font-size:${Math.round(size*.42)}px">${esc(av.v)}</div>`;
  else if(av.kind==="ini") inner=`<div class="ini" style="background:${esc(av.color||"#3c49d6")};font-size:${Math.round(size*.3)}px">${esc(initials(name||"?"))}</div>`;
  else inner=genAvatarSVG(+av.seed||1,av.o);
  const h=avHash((name||"")+(av.seed||av.v||av.src||"").toString().slice(-12));      // each avatar moves with its own rhythm
  return `<span class="av ${cls}" style="width:${Math.round(size*AV_RATIO)}px;height:${size}px;--d:-${(h%3000)/1000}s;--d2:-${(h%7919)/1000}s;${extra}" role="img" aria-label="${esc(name||"avatar")}">${inner}</span>`;
}
/* Imported picture -> avatar: white (or plain) background removed, trimmed to the character, fitted in 3:4, light WebP.
   Returns a data URL. */
function loadImageFile(file){
  return new Promise((ok,ko)=>{ const u=URL.createObjectURL(file), im=new Image(); im.onload=()=>{ URL.revokeObjectURL(u); ok(im); }; im.onerror=()=>{ URL.revokeObjectURL(u); ko(new Error("image")); }; im.src=u; });
}
async function makeAvatarImage(file, opts={}){
  const im=await loadImageFile(file);
  const MAXH=opts.maxH||360, W0=im.naturalWidth, H0=im.naturalHeight;
  const k=Math.min(1, 900/Math.max(W0,H0));                      // work on a reasonable size
  const w=Math.max(1,Math.round(W0*k)), h=Math.max(1,Math.round(H0*k));
  const c=document.createElement("canvas"); c.width=w; c.height=h; const x=c.getContext("2d",{willReadFrequently:true});
  x.drawImage(im,0,0,w,h);
  const d=x.getImageData(0,0,w,h), px=d.data;
  // 1. plain background: flood fill from the edges when the corners share a light, uniform colour
  if(opts.removeBg!==false){
    const at=(i)=>[px[i*4],px[i*4+1],px[i*4+2],px[i*4+3]];
    const corners=[0,w-1,(h-1)*w,h*w-1].map(at);
    const opaque=corners.every(c=>c[3]>250);
    const ref=corners.reduce((a,c)=>[a[0]+c[0]/4,a[1]+c[1]/4,a[2]+c[2]/4],[0,0,0]);
    const near=(i,tol)=>Math.abs(px[i*4]-ref[0])+Math.abs(px[i*4+1]-ref[1])+Math.abs(px[i*4+2]-ref[2])<tol;
    const similar=corners.filter(c=>Math.abs(c[0]-ref[0])+Math.abs(c[1]-ref[1])+Math.abs(c[2]-ref[2])<60).length>=3;
    if(opaque && similar && Math.min(...ref)>170){
      // light and greyish (the soft ground shadow included), so that the fill also passes between the legs
      const light=i=>{ const R=px[i*4],G=px[i*4+1],Bl=px[i*4+2], mx=Math.max(R,G,Bl), mn=Math.min(R,G,Bl); return near(i,60) || (mn>=Math.min(...ref)-72 && mx-mn<30); };
      const bg=new Uint8Array(w*h), st=[];
      for(let i=0;i<w;i++){ st.push(i, (h-1)*w+i); } for(let j=0;j<h;j++){ st.push(j*w, j*w+w-1); }
      while(st.length){ const i=st.pop(); if(bg[i]||!light(i)) continue; bg[i]=1; const X=i%w, Y=(i/w)|0;
        if(X>0) st.push(i-1); if(X<w-1) st.push(i+1); if(Y>0) st.push(i-w); if(Y<h-1) st.push(i+w); }
      for(let i=0;i<w*h;i++){ if(bg[i]) px[i*4+3]=0;
        else { const X=i%w, Y=(i/w)|0; const edge=(X>0&&bg[i-1])||(X<w-1&&bg[i+1])||(Y>0&&bg[i-w])||(Y<h-1&&bg[i+w]); if(edge && near(i,110)) px[i*4+3]=110; } }
      x.putImageData(d,0,0);
    }
  }
  // 2. trim to the visible pixels
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let Y=0;Y<h;Y++) for(let X=0;X<w;X++) if(px[(Y*w+X)*4+3]>24){ if(X<x0)x0=X; if(X>x1)x1=X; if(Y<y0)y0=Y; if(Y>y1)y1=Y; }
  if(x1<0){ x0=0;y0=0;x1=w-1;y1=h-1; }
  const bw=x1-x0+1, bh=y1-y0+1;
  // 3. fit in a 3:4 frame (whole picture, feet at the bottom), small margin
  const OH=Math.min(MAXH, Math.max(120, Math.round(bh*1.04))), OW=Math.round(OH*AV_RATIO);
  const s=Math.min((OW*.96)/bw, (OH*.97)/bh);
  const o=document.createElement("canvas"); o.width=OW; o.height=OH; const ox=o.getContext("2d");
  ox.imageSmoothingQuality="high";
  ox.drawImage(c,x0,y0,bw,bh,(OW-bw*s)/2,OH-bh*s-OH*.015,bw*s,bh*s);
  let url=o.toDataURL("image/webp",.86);
  if(!url.startsWith("data:image/webp")) url=o.toDataURL("image/png");
  for(let q=.78; url.length>AV_MAX && q>.3; q-=.12){ url=o.toDataURL("image/webp",q); if(!url.startsWith("data:image/webp")) break; }
  if(url.length>AV_MAX){ const j=document.createElement("canvas"); j.width=OW; j.height=OH; const jx=j.getContext("2d"); jx.fillStyle="#1d2280"; jx.fillRect(0,0,OW,OH); jx.drawImage(o,0,0); url=j.toDataURL("image/jpeg",.8); }
  return url;
}
const AV_MAX=180000;                       // size limit of an avatar picture (characters of the data URL), same as the server

const ICON_PHONE=`<svg viewBox="0 0 48 32" aria-hidden="true"><path fill="#fff" d="M14 4c-3 0-6 2-6 6v2h8l2-4c2-1 10-1 12 0l2 4h8v-2c0-4-3-6-6-6H14z"/><path fill="#fff" d="M17 13 12 26c0 2 1 3 3 3h18c2 0 3-1 3-3l-5-13H17zm7 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/></svg>`;
const ICON_PUBLIC=`<svg viewBox="0 0 48 32" fill="#fff" aria-hidden="true"><circle cx="24" cy="9" r="6"/><path d="M13 30q0-11 11-11t11 11z"/><circle cx="10" cy="12" r="4.5" opacity=".85"/><path d="M1 30q0-9 9-9 4 0 6 2-4 3-5 7z" opacity=".85"/><circle cx="38" cy="12" r="4.5" opacity=".85"/><path d="M47 30q0-9-9-9-4 0-6 2 4 3 5 7z" opacity=".85"/></svg>`;
const ICON_FIFTY = "50:50";
const ptsTxt = n => `${n} point${n>1?"s":""}`;
const secTxt = ms => (Math.max(0,ms)/1000).toFixed(1).replace(".",",")+" s";
async function api(path, body){
  const r = await fetch(path, {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body||{})});
  let j={}; try{ j=await r.json(); }catch(e){}
  if(r.status===401) j.unauthorized=true;
  return j;
}

/* ================= Souvenir picture (podium + every player) ================= */
function avatarImage(av,name){
  return new Promise(res=>{
    const im=new Image(); im.onload=()=>res(im); im.onerror=()=>res(null);
    if(av&&av.kind==="img"&&av.src){ im.src=av.src; return; }
    if(av&&(av.kind==="emoji"||av.kind==="ini")){
      const t=av.kind==="emoji"?av.v:initials(name||"?"), bg=av.kind==="ini"?(av.color||"#3c49d6"):"none";
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">${bg!=="none"?`<rect width="120" height="160" rx="16" fill="${bg}"/>`:""}<text x="60" y="${av.kind==="emoji"?100:98}" font-size="${av.kind==="emoji"?64:44}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" fill="#fff">${esc(t)}</text></svg>`;
      im.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg); return; }
    im.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(genAvatarSVG(+(av&&av.seed)||1,av&&av.o));
  });
}
async function souvenirCanvas(d,mePid){
  const W=1600, players=d.players||[], top=players.filter(p=>p.rank<=3).slice(0,3), rest=players;
  const cols=Math.max(6,Math.min(12,Math.ceil(Math.sqrt(rest.length*2.2)))), cw=W/cols-10, ch=cw/AV_RATIO*.62, rows=Math.ceil(rest.length/cols);
  const H=Math.round(560+rows*(ch+40)+90);
  const c=document.createElement("canvas"); c.width=W; c.height=H; const g=c.getContext("2d");
  const bg=g.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#1a1f9a"); bg.addColorStop(.45,"#0a0c62"); bg.addColorStop(1,"#04052e"); g.fillStyle=bg; g.fillRect(0,0,W,H);
  for(let i=0;i<140;i++){ g.fillStyle=`rgba(255,255,255,${.15+Math.random()*.5})`; g.fillRect(Math.random()*W,Math.random()*H,2,2); }
  g.textAlign="center"; g.fillStyle="#f2c14e"; g.font="800 54px 'Barlow Condensed',Arial,sans-serif"; g.fillText(d.title||"Qui veut gagner des applaudissements ?",W/2,78);
  g.fillStyle="#d9e6ff"; g.font="600 26px Barlow,Arial,sans-serif"; g.fillText([d.subtitle,new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})].filter(Boolean).join(" · "),W/2,118);
  const imgs=await Promise.all(players.map(p=>avatarImage(p.avatar,p.name)));
  const imgOf=p=>imgs[players.indexOf(p)];
  const draw=(p,x,y,h,ring)=>{ const w=h*AV_RATIO, im=imgOf(p);
    g.save(); g.beginPath(); g.roundRect?g.roundRect(x-w/2,y,w,h,w*.14):g.rect(x-w/2,y,w,h); g.fillStyle="#2a30b0"; g.fill(); g.clip();
    if(im){ const k=Math.min(w/im.width,h/im.height); g.drawImage(im,x-im.width*k/2,y+h-im.height*k,im.width*k,im.height*k); }
    g.restore(); if(ring){ g.lineWidth=5; g.strokeStyle=ring; g.beginPath(); g.roundRect?g.roundRect(x-w/2,y,w,h,w*.14):g.rect(x-w/2,y,w,h); g.stroke(); } };
  // podium
  const spots={1:[W/2,250,250],2:[W/2-330,300,205],3:[W/2+330,330,180]};
  for(const p of top){ const [x,y,h]=spots[p.rank]||spots[3]; draw(p,x,y-h+150,h,"#f2c14e");
    if(p.rank===1){ g.font="64px serif"; g.fillText("👑",x,y-h+140); }
    g.fillStyle="#fff"; g.font="800 34px 'Barlow Condensed',Arial,sans-serif"; g.fillText(p.name,x,y+195);
    g.fillStyle="#f2c14e"; g.font="700 26px Barlow,Arial,sans-serif"; g.fillText(`${p.rank===1?"1er":p.rank+"e"} · ${p.points} pt${p.points>1?"s":""}`,x,y+228); }
  // everyone
  g.fillStyle="#9aa9d6"; g.font="600 24px Barlow,Arial,sans-serif"; g.fillText(`Tous les joueurs (${rest.length})`,W/2,555);
  rest.forEach((p,i)=>{ const col=i%cols, row=Math.floor(i/cols), n=Math.min(cols,rest.length-row*cols), x0=W/2-(n*(cw+10))/2+(cw+10)/2;
    const x=x0+col*(cw+10), y=580+row*(ch+40); draw(p,x,y,ch,p.pid===mePid?"#f2c14e":null);
    g.fillStyle=p.pid===mePid?"#f2c14e":"#fff"; g.font="600 18px Barlow,Arial,sans-serif"; g.fillText(p.name.length>14?p.name.slice(0,13)+"…":p.name,x,y+ch+24); });
  g.fillStyle="#9aa9d6"; g.font="italic 20px Barlow,Arial,sans-serif"; g.fillText("Merci d'avoir joué !",W/2,H-30);
  return c;
}
function downloadCanvas(c,name){ c.toBlob(b=>{ const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); },"image/png"); }
