/* Page joueur : s'ouvre sur le téléphone après avoir scanné le QR code */
"use strict";
const app = $("#app");
const KEY = "qvgda_player";
let ME = (() => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } })();
let V = null;               // last state received from the server
let clockOffset = 0;        // server clock - local clock
let es = null, tick = null, lostTimer = null;
const L = "ABCD";
const EMOJIS = "😀 😎 🤓 🥳 😇 🤠 🦊 🐻 🐼 🐨 🦁 🐯 🐸 🐵 🦉 🐧 🐙 🦄 🐬 🦀 🐢 🌻 ⚓ ⛵ 🏰 🚀 ⚡ 🔥 🍀 ⭐ 🎯 🏆".split(" ");
let joinAv = { kind: "gen", seed: rnd(1e6) }, seeds = [...Array(8)].map(() => rnd(1e6)), showEmo = false, joinErr = "", joinName = "";
const BANKEY = "qvgda_banned";
function showBanned() {
  stopTick(); lastSig = "";
  app.innerHTML = `<div class="brand">Qui veut gagner des applaudissements ?</div><div class="card center"><p class="big">Vous ne participez plus à cette partie</p><p class="dim" style="margin-bottom:0">L'animateur vous a retiré du jeu.</p></div>`;
}
let voteAt = {}, voteT = null;   // when the audience vote result shows (after its music)
let lastSig = "";          // qid -> true once the vote animation has played

function saveMe(m) { ME = m; try { m ? localStorage.setItem(KEY, JSON.stringify(m)) : localStorage.removeItem(KEY); } catch (e) { } }

/* ------------------------------------------------------------------ join */
function renderJoin() {
  lastSig = "";
  stopTick();
  app.innerHTML = `<div class="brand">Qui veut gagner des applaudissements ?</div>
  <h1>Rejoindre la partie</h1>
  <div class="card">
    <label class="lbl" for="nm">Votre prénom (ou prénom + initiale)</label>
    <input class="inp" id="nm" maxlength="24" autocomplete="given-name" autocapitalize="words" enterkeyhint="go" value="${esc(joinName)}" placeholder="Ex. : Marie D.">
    ${joinErr ? `<p class="err" role="alert">${esc(joinErr)}</p>` : ""}
  </div>
  <div class="card">
    <span class="lbl">Votre avatar</span>
    ${joinAv.kind === "img" ? `<div class="mypic">${avatarHTML(joinAv, joinName, 120)}<div><b>Votre image</b><br><button class="linkbtn" id="nopic">Choisir plutôt un personnage</button></div></div>` : ""}
    <div class="avgrid">${showEmo
      ? EMOJIS.slice(0, 16).map(e => `<button data-e="${e}" aria-pressed="${joinAv.kind === "emoji" && joinAv.v === e}" aria-label="${e}">${avatarHTML({ kind: "emoji", v: e }, "", 64)}</button>`).join("")
      : seeds.map(s => `<button data-s="${s}" aria-pressed="${joinAv.kind === "gen" && joinAv.seed === s}" aria-label="Personnage">${avatarHTML({ kind: "gen", seed: s }, "", 64)}</button>`).join("")}</div>
    <div style="display:flex;justify-content:space-between;margin-top:6px">
      <button class="linkbtn" id="more">${showEmo ? "Voir des personnages" : "Autres personnages"}</button>
      <button class="linkbtn" id="emo">${showEmo ? "Autres émojis" : "Choisir un émoji"}</button>
    </div>
    <label class="picbtn">📷 Utiliser mon image (avatar, photo…)<input type="file" accept="image/*" id="pf" class="sr"></label>
  </div>
  <button class="btn" id="go">C'est parti !</button>
  <p class="foot">Gardez cette page ouverte pendant tout le jeu.</p>`;
  const nm = $("#nm");
  nm.oninput = () => { joinName = nm.value; };
  nm.onkeydown = e => { if (e.key === "Enter") join(); };
  app.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { joinAv = { kind: "gen", seed: +b.dataset.s }; renderJoin(); });
  app.querySelectorAll("[data-e]").forEach(b => b.onclick = () => { joinAv = { kind: "emoji", v: b.dataset.e }; renderJoin(); });
  $("#more").onclick = () => { if (showEmo) showEmo = false; else seeds = [...Array(8)].map(() => rnd(1e6)); renderJoin(); };
  $("#emo").onclick = () => { if (showEmo) EMOJIS.push(...EMOJIS.splice(0, 16)); showEmo = true; renderJoin(); };
  $("#go").onclick = join;
  $("#pf").onchange = async e => { const f = e.target.files[0]; if (!f) return;
    try { joinAv = { kind: "img", src: await makeAvatarImage(f) }; joinErr = ""; } catch (err) { joinErr = "Image illisible : choisissez une photo JPG, PNG ou WebP."; }
    renderJoin(); };
  if ($("#nopic")) $("#nopic").onclick = () => { joinAv = { kind: "gen", seed: seeds[0] }; renderJoin(); };
}
async function join() {
  const name = ($("#nm").value || "").trim(); joinName = name;
  if (!name) { joinErr = "Indiquez votre prénom."; return renderJoin(); }
  $("#go").disabled = true;
  let r; try { r = await api("/api/join", { name, avatar: joinAv }); } catch (e) { r = { ok: false, error: "Connexion impossible. Vérifiez le réseau et réessayez." }; }
  if (r.banned) return showBanned();
  if (!r.ok) { joinErr = r.error || "Inscription impossible."; return renderJoin(); }
  joinErr = ""; saveMe({ pid: r.pid, token: r.token, name }); connect();
  try { navigator.vibrate && navigator.vibrate(30); } catch (e) { }
}

/* ------------------------------------------------------------ connection */
function connect() {
  lastSig = "";
  if (es) es.close();
  app.innerHTML = `<div class="card center"><div class="pulse"></div><p>Connexion…</p></div>`;
  es = new EventSource(`/api/stream?role=player&pid=${encodeURIComponent(ME.pid)}&token=${encodeURIComponent(ME.token)}`);
  es.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.type === "kicked") { es.close(); saveMe(null);
      if (m.banned) { try { localStorage.setItem(BANKEY, m.gameId || "1"); } catch (e) { } return showBanned(); }
      joinErr = "L'animateur a réinitialisé la liste des joueurs : rejoignez à nouveau la partie."; return renderJoin(); }
    if (m.type === "unknown") { es.close(); return lost(); }
    if (m.type === "state") { clearTimeout(lostTimer); V = m.state; if (V.q && V.q.serverNow) clockOffset = V.q.serverNow - Date.now(); render(); }
  };
  es.onerror = () => { /* EventSource reconnects by itself */ };
  keepAwake();
}
// The server does not know us (it restarted): the projected screen restores the game in a few seconds
function lost() {
  lastSig = "";
  app.innerHTML = `<div class="card center"><div class="pulse"></div><p class="big" style="font-size:22px">Reconnexion à la partie…</p>
    <p class="dim">Le jeu redémarre. Cela prend en général quelques secondes.</p></div>
    <button class="btn ghost" id="again">Rejoindre avec un nouveau nom</button>`;
  $("#again").onclick = () => { saveMe(null); renderJoin(); };
  clearTimeout(lostTimer);
  lostTimer = setTimeout(async () => {
    const r = await api("/api/join", { pid: ME.pid, token: ME.token }).catch(() => ({}));
    if (r.ok && r.pid === ME.pid) connect(); else lost();
  }, 3000);
}
let wake = null;
async function keepAwake() { try { if ("wakeLock" in navigator && !wake) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); } } catch (e) { } }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && ME) keepAwake(); });

/* ---------------------------------------------------------------- screens */
function stopTick() { clearInterval(tick); tick = null; }
function meHTML() {
  const m = V.me;
  return `<div class="card"><div class="me">${avatarHTML(m.avatar, m.name, 84)}<div class="nm">${esc(m.name)}</div></div>
    <div class="stats"><div class="stat"><b>${m.points}</b><span>point${m.points > 1 ? "s" : ""}</span></div>
    <div class="stat"><b>${m.rank ? m.rank + (m.rank === 1 ? "er" : "e") : "–"}</b><span>sur ${m.of} joueur${m.of > 1 ? "s" : ""}</span></div></div></div>`;
}
function render(force) {
  if (!V || !ME) return;
  const sig = JSON.stringify(Object.assign({}, V, { q: V.q && Object.assign({}, V.q, { serverNow: 0 }) }));
  if (!force && sig === lastSig) return;
  lastSig = sig;
  if (V.gone) return lost();
  const q = V.q;
  if (V.phase === "question" && q) return renderQuestion();
  stopTick(); stopCall(false); if (mp3El) { mp3El.pause(); mp3El = null; }
  if (V.phase === "intro" && q) {
    app.innerHTML = `<div class="brand">Question ${q.n || ""}</div><div class="card center"><p class="big">${esc(q.label || "Nouvelle question")}</p>
      <p style="margin:10px 0 0"><span class="chip">${ptsTxt(q.points)} en jeu</span></p><p class="dim" style="margin-bottom:0">Préparez-vous : la question arrive !</p></div>${meHTML()}`;
    return;
  }
  if (V.phase === "closed" && q) {
    app.innerHTML = `<div class="brand">Question ${q.n || ""}</div><div class="card center">${q.mine != null
      ? `<p class="big">Réponse ${L[q.mine]} enregistrée</p><p class="dim">« ${esc(q.answers[q.mine])} »</p>`
      : `<p class="big">Trop tard !</p><p class="dim">Les réponses sont closes.</p>`}
      <div class="pulse"></div><p style="margin:0">Suspense… regardez l'écran !</p></div>${meHTML()}`;
    return;
  }
  if (V.phase === "revealed" && q) {
    const r = q.result;
    app.innerHTML = `<div class="brand">Question ${q.n || ""}</div>
      <div class="result ${r ? (r.ok ? "ok" : "ko") : "none"}"><div class="t">${r ? (r.ok ? "Bonne réponse !" : "Mauvaise réponse…") : "Pas de réponse"}</div>
      <div class="p">${r ? (r.ok ? "+ " + ptsTxt(r.points) : "0 point") : "0 point"}</div>${r && r.ms != null && V.settings.tieSpeed ? `<div class="dim" style="margin-top:4px;font-size:14px">⏱ Réponse en ${secTxt(r.ms)}</div>` : ""}</div>
      <div class="card"><span class="lbl">La bonne réponse</span><div class="ans good" style="min-height:52px"><span class="L">${L[q.correct]}</span><span>${esc(q.answers[q.correct])}</span></div>
      ${r && !r.ok ? `<p class="dim" style="margin:10px 0 0">Vous aviez répondu ${L[q.mine]} : « ${esc(q.answers[q.mine])} »</p>` : ""}</div>
      ${q.note ? `<div class="card"><span class="lbl">👉 Le saviez-vous ?</span><p style="margin:0;line-height:1.45;color:#fff">${esc(q.note)}</p></div>` : ""}${meHTML()}`;
    try { navigator.vibrate && navigator.vibrate(r && r.ok ? [40, 60, 40] : 120); } catch (e) { }
    return;
  }
  if (V.phase === "results") {
    const m = V.me;
    app.innerHTML = `<div class="brand">Le classement</div><div class="card center">${avatarHTML(m.avatar, m.name, 170)}
      <p class="big" style="margin:10px 0 4px">${esc(m.name)}</p><div class="rank">${m.rank}${m.rank === 1 ? "er" : "e"}</div>
      <p class="dim" style="margin:4px 0 0">sur ${m.of} joueur${m.of > 1 ? "s" : ""}, avec ${ptsTxt(m.points)}</p>
      ${V.settings.tieSpeed && m.tied && m.points > 0 ? `<p class="dim" style="margin:6px 0 0;font-size:14px">⏱ À égalité de points avec ${m.tied} joueur${m.tied > 1 ? "s" : ""} : départagé${m.tied > 1 ? "s" : ""} à la vitesse (${secTxt(m.ms)} cumulées sur vos bonnes réponses)</p>` : ""}
      <p style="margin:12px 0 0;font-size:18px">${m.rank === 1 ? "🏆 Bravo, vous êtes en tête !" : m.rank <= 3 ? "👏 Sur le podium !" : "Merci pour votre participation !"}</p></div>`;
    return;
  }
  if (V.phase === "credits") {
    app.innerHTML = `<div class="brand">Merci !</div><div class="card center"><p class="big">Merci d'avoir joué ! 👏</p><p class="dim">Vous pouvez fermer cette page.</p></div>${meHTML()}`;
    return;
  }
  app.innerHTML = `<div class="brand">Qui veut gagner des applaudissements ?</div>${meHTML()}
    <div class="card center"><div class="pulse"></div><p class="big" style="font-size:22px">${V.me.points || V.me.good ? "En attente de la prochaine question…" : "Vous êtes inscrit !"}</p>
    <p class="dim" style="margin-bottom:0">Regardez l'écran : les questions s'affichent ici dès qu'elles commencent.</p></div>
    <p class="foot">Gardez cette page ouverte.</p>`;
}

function renderQuestion() {
  const q = V.q, answered = q.mine != null;
  const J = V.settings.jokers || {}, anyJ = !answered && (J.fifty || J.public || J.phone);
  const phoneLeft = q.phoneUntil ? Math.max(0, Math.ceil((q.phoneUntil - (Date.now() + clockOffset)) / 1000)) : 0;
  const showVote = q.vote && !answered;
  if (q.vote && !voteAt[q.qid]) voteAt[q.qid] = Date.now() + VOTE_MS;
  const voteDone = q.vote && Date.now() >= voteAt[q.qid];
  app.innerHTML = `<div class="qhead"><span class="brand" style="text-align:left">Question ${q.n || ""}</span><span class="chip">${ptsTxt(Math.max(0, q.points - Object.values(q.used || {}).filter(Boolean).length * (q.jokerCost || 0)))} en jeu</span>${soundsWanted() ? `<button class="sndbtn" id="snd" aria-label="${sndOn ? "Couper le son des jokers" : "Activer le son des jokers"}">${sndOn ? "🔊" : "🔇"}</button>` : ""}<span class="timer" id="tm"></span></div>
    <div class="card"><div class="qtext">${esc(q.text)}</div></div>
    ${answered
      ? `<div class="card center"><p class="big">Réponse ${L[q.mine]} enregistrée ✓</p><p class="dim">« ${esc(q.answers[q.mine])} »</p><p style="margin:0">Attendez la révélation sur l'écran…</p></div>`
      : `<div class="answers">${q.answers.map((a, i) => `<button class="ans ${q.gone.includes(i) ? "gone" : ""}" data-a="${i}" ${q.gone.includes(i) ? "disabled" : ""}><span class="L">${L[i]}</span><span>${esc(a)}</span></button>`).join("")}</div>`}
    ${phoneLeft > 0 && !answered ? `<div class="card phone"><span class="lbl">📞 Appel à un ami</span><div class="n" id="ph">${phoneLeft}</div><p class="dim" style="margin:4px 0 0">Demandez de l'aide à quelqu'un… puis répondez !</p></div>` : ""}
    ${showVote ? `<div class="card"><span class="lbl">👥 Vote du public <span id="vmsg">${voteDone ? "" : "· le public vote…"}</span></span>
      <div class="vote">${[0, 1, 2, 3].map(i => `<div class="vcol" style="${q.gone.includes(i) ? "opacity:.3" : ""}"><span data-pc="${i}">${voteDone ? q.vote[i] + " %" : "?"}</span><div class="vbar" data-bar="${i}" style="height:${voteDone ? q.vote[i] * 1.2 : 4}px"></div><b>${L[i]}</b></div>`).join("")}</div></div>` : ""}
    ${anyJ ? `<div class="jokers">
      ${J.fifty ? `<button class="joker" data-j="fifty" ${q.avail.fifty ? "" : "disabled"} aria-label="Joker 50:50">50:50</button>` : ""}
      ${J.public ? `<button class="joker" data-j="public" ${q.avail.public ? "" : "disabled"} aria-label="Joker vote du public">${ICON_PUBLIC}</button>` : ""}
      ${J.phone ? `<button class="joker" data-j="phone" ${q.avail.phone ? "" : "disabled"} aria-label="Joker appel à un ami">${ICON_PHONE}</button>` : ""}</div>
      <div class="jhint">${V.settings.jokerScope === "game" ? "Chaque joker ne sert qu'une fois dans la partie" : "Jokers disponibles à chaque question"}${q.jokerCost ? ` · −${ptsTxt(q.jokerCost)} par joker` : ""}</div>` : ""}
    ${meHTML()}`;
  app.querySelectorAll("[data-a]").forEach(b => b.onclick = () => answer(+b.dataset.a, b));
  app.querySelectorAll("[data-j]").forEach(b => b.onclick = () => joker(b.dataset.j, b));
  if ($("#snd")) $("#snd").onclick = () => { sndOn = !sndOn; try { localStorage.setItem("qvgda_snd", sndOn ? "1" : "0"); } catch (e) { } if (sndOn) audioUnlock(); else stopCall(false); render(true); };
  clearTimeout(voteT);
  if (showVote && !voteDone) {
    voteT = setTimeout(() => {
      app.querySelectorAll("[data-bar]").forEach(b => b.style.height = q.vote[+b.dataset.bar] * 1.2 + "px");
      app.querySelectorAll("[data-pc]").forEach(s => s.textContent = q.vote[+s.dataset.pc] + " %");
      const m = $("#vmsg"); if (m) m.textContent = "";
    }, voteAt[q.qid] - Date.now());
  }
  stopTick();
  const upd = () => {
    const t = Date.now() + clockOffset;
    const el = $("#tm");
    if (el && q.deadline) { const s = Math.max(0, Math.ceil((q.deadline - t) / 1000)); el.textContent = s + " s"; el.classList.toggle("low", s <= 5); }
    const ph = $("#ph"); if (ph && q.phoneUntil) { const s = Math.max(0, Math.ceil((q.phoneUntil - t) / 1000)); ph.textContent = s; if (!s) { stopCall(true); render(true); } }
  };
  upd(); tick = setInterval(upd, 250);
}
async function answer(i, btn) {
  if (V.q.mine != null) return;
  app.querySelectorAll("[data-a]").forEach(b => b.disabled = true); btn.classList.add("sel");
  stopCall(true);                                   // answering ends the phone call
  try { navigator.vibrate && navigator.vibrate(25); } catch (e) { }
  const r = await api("/api/answer", { pid: ME.pid, token: ME.token, qid: V.q.qid, choice: i }).catch(() => ({ ok: false, error: "Réseau indisponible : réessayez." }));
  if (!r.ok) { toast(r.error || "Réponse refusée."); render(true); }
}
async function joker(k, btn) {
  btn.disabled = true;
  audioUnlock();                                    // must happen during the tap (mobile browsers)
  const qid = V.q.qid;
  const r = await api("/api/joker", { pid: ME.pid, token: ME.token, qid, kind: k }).catch(() => ({ ok: false, error: "Réseau indisponible : réessayez." }));
  if (!r.ok) { toast(r.error || "Joker indisponible."); btn.disabled = false; return; }
  jokerSound(k, qid);
}

/* --------------------------------------------------- joker sounds (on the phone) */
// Synthesized like on the projected screen; an MP3 put in public/sounds (joker-5050.mp3, joker-public.mp3, joker-phone.mp3) replaces them.
const VOTE_MS = 5000;
let AC = null, sndOn = (() => { try { return localStorage.getItem("qvgda_snd") !== "0"; } catch (e) { return true; } })();
const soundsWanted = () => V && V.settings && V.settings.jokerSounds !== false && Object.values(V.settings.jokers || {}).some(Boolean);
function audioUnlock() {
  if (!sndOn || !soundsWanted()) return;
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { }   // iPhone: play even with the silent switch
  try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) { }
}
function tone(f, t0, dur, type = "sine", vol = .2, glide) {
  const c = AC; if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0; o.type = type; o.frequency.setValueAtTime(f, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05);
}
function noise(t0, dur, vol = .15, freq = 1200) {
  const c = AC; if (!c) return; const b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; const g = c.createGain(), t = c.currentTime + t0;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(f).connect(g).connect(c.destination); s.start(t);
}
const JSND = {
  fifty() { tone(880, 0, .15, "sine", .18, 440); tone(440, .18, .3, "sine", .15, 220); noise(.05, .35, .08, 2500); },
  // the audience votes: ~5 s, the result appears with the final chord
  public() { for (let i = 0; i < 18; i++) tone(i % 4 === 0 ? 880 : 660, i * .25, .08, "triangle", .08);
    tone(196, 0, 4.4, "sine", .07); tone(247, 1.5, 2.9, "sine", .06); tone(294, 3, 1.4, "sine", .06);
    [523, 659, 784].forEach((f, i) => tone(f, 4.5 + i * .06, .9, "triangle", .16)); },
  // 10 DTMF digits then 2 French ring tones
  dial() { const D = { "1": [697, 1209], "2": [697, 1336], "3": [697, 1477], "4": [770, 1209], "5": [770, 1336], "6": [770, 1477], "7": [852, 1209], "8": [852, 1336], "9": [852, 1477], "0": [941, 1336] };
    let t = 0; for (const d of "06" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0")) { const [a, b] = D[d]; tone(a, t, .1, "sine", .1); tone(b, t, .1, "sine", .1); t += .16; }
    t += .5; for (let r = 0; r < 2; r++) { tone(440, t, 1.2, "sine", .14); t += r ? 1.2 : 2.4; } return t + .2; },
  hold() { [523, 659, 784, 659, 587, 698, 880, 698].forEach((f, i) => tone(f, i * .3, .26, "triangle", .08)); tone(131, 0, 1.2, "sine", .08); tone(147, 1.2, 1.2, "sine", .08); return 2.4; },
  hangup() { noise(0, .06, .25, 900); for (let i = 0; i < 3; i++) tone(440, .35 + i * .5, .25, "sine", .13); }
};
const MP3 = { fifty: "joker-5050", public: "joker-public", phone: "joker-phone" };
let mp3El = null, call = null;
function playFile(k, loop) {
  const have = (V.settings.jokerFiles || []).includes(MP3[k]); if (!have) return null;
  const a = new Audio(`/sounds/${MP3[k]}.mp3`); a.loop = !!loop; a.play().catch(() => { }); return a;
}
function jokerSound(k, qid) {
  if (!sndOn || !soundsWanted()) return;
  audioUnlock();
  if (k === "fifty") { if (!playFile("fifty")) JSND.fifty(); }
  if (k === "public") { mp3El = playFile("public"); if (!mp3El) JSND.public(); }
  if (k === "phone") {
    stopCall(false);
    const c = call = { qid, timers: [], audio: null };
    const d = JSND.dial() * 1000;
    c.timers.push(setTimeout(() => {           // after the rings: waiting music until the end of the call
      if (call !== c) return;
      c.audio = playFile("phone", true);
      if (!c.audio) { const loop = () => { if (call === c) { JSND.hold(); c.timers.push(setTimeout(loop, 2400)); } }; loop(); }
    }, d));
  }
}
function stopCall(hangup) {
  if (!call) return; const c = call; call = null;
  c.timers.forEach(clearTimeout); if (c.audio) { c.audio.pause(); c.audio = null; }
  if (hangup && sndOn) JSND.hangup();
}

/* ------------------------------------------------------------------- boot */
(async () => {
  // a player excluded by the host stays out of this game (a new game lifts it)
  let banned = null; try { banned = localStorage.getItem(BANKEY); } catch (e) { }
  if (banned) {
    const g = await fetch("/api/game", { cache: "no-store" }).then(r => r.json()).catch(() => null);
    if (g && g.gameId === banned) return showBanned();
    try { localStorage.removeItem(BANKEY); } catch (e) { }
  }
  if (ME && ME.pid) connect(); else renderJoin();
})();
