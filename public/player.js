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
let building = false;
let joinAv = { kind: "gen", seed: rnd(1e6) }, seeds = [...Array(8)].map(() => rnd(1e6)), showEmo = false, joinErr = "", joinName = "";
const BANKEY = "qvgda_banned";
function showBanned() {
  stopTick(); lastSig = "";
  app.innerHTML = `<div class="brand">Qui veut gagner des applaudissements ?</div><div class="card center"><p class="big">Vous ne participez plus à cette partie</p><p class="dim" style="margin-bottom:0">L'animateur vous a retiré du jeu.</p></div>`;
}
let voteAt = {}, voteT = null, lastBeep = 0, lastBuzz = null, clapOn = false, editing = false;   // when the audience vote result shows (after its music)
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
    <button class="picbtn" id="bld" type="button">🎨 Personnaliser mon personnage</button>
    <label class="picbtn">📷 Utiliser mon image (avatar, photo…)<input type="file" accept="image/*" id="pf" class="sr"></label>
  </div>
  ${building ? `<div class="card" id="bldCard">${builderHTML(joinAv, joinName)}</div>` : ""}
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
  $("#bld").onclick = () => { if (joinAv.kind !== "gen") joinAv = { kind: "gen", seed: seeds[0] }; building = !building; renderJoin(); if (building) $("#bldCard").scrollIntoView({ behavior: "smooth", block: "start" }); };
  if (building) bindBuilder($("#bldCard"), () => joinAv, a => { joinAv = a; }, () => { const y = scrollY; renderJoin(); scrollTo(0, y); });
}
async function join() {
  audioUnlock(true);
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
function meHTML(still) {
  const m = V.me;
  return `<div class="card"><div class="me">${avatarHTML(m.avatar, m.name, 84, "", still ? "" : "alive")}<div class="nm">${esc(m.name)}${m.streak >= 3 ? ` <span class="streak">🔥 ${m.streak}</span>` : ""}</div></div>
    <div class="stats"><div class="stat"><b>${m.points}</b><span>point${m.points > 1 ? "s" : ""}</span></div>
    <div class="stat"><b>${m.rank ? m.rank + (m.rank === 1 ? "er" : "e") : "–"}</b><span>sur ${m.of} joueur${m.of > 1 ? "s" : ""}</span></div></div></div>`;
}
function render(force) {
  if (!V || !ME) return;
  if (V.gone) return lost();
  if (V.clap && V.clap.on) return clapScreen();
  if (clapOn) { clapOn = false; force = true; }
  if (editing && !force) { if (V.phase === "question") editing = false; else return; }   // the avatar builder stays open, except for a question
  const sig = JSON.stringify(Object.assign({}, V, { clap: null, q: V.q && Object.assign({}, V.q, { serverNow: 0 }) }));
  if (!force && sig === lastSig) return;
  lastSig = sig;
  const q = V.q;
  if (V.phase === "question" && q) return renderQuestion();
  stopTick(); stopCall(false); if (mp3El) { mp3El.stop(); mp3El = null; }
  if (V.phase === "intro" && q) {
    app.innerHTML = `<div class="brand">Question ${q.n || ""}</div>${spBanner(q)}<div class="card center"><p class="big">${esc(q.label || "Nouvelle question")}</p>
      <p style="margin:10px 0 0"><span class="chip">${ptsTxt(q.points * (q.special === "double" ? 2 : 1))} en jeu</span></p><p class="dim" style="margin-bottom:0">Préparez-vous : la question arrive !</p></div>${meHTML()}${rxHTML()}`; bindRx();
    return;
  }
  if (V.phase === "closed" && q) {
    app.innerHTML = `<div class="brand">Question ${q.n || ""}</div><div class="card center">${q.mine != null
      ? `<p class="big">Réponse ${L[q.mine]} enregistrée</p><p class="dim">« ${esc(q.answers[q.mine])} »</p>`
      : `<p class="big">Trop tard !</p><p class="dim">Les réponses sont closes.</p>`}
      <div class="pulse"></div><p style="margin:0">Suspense… regardez l'écran !</p></div>${meHTML()}${rxHTML()}`; bindRx();
    return;
  }
  if (V.phase === "revealed" && q) {
    const r = q.result;
    app.innerHTML = `<div class="brand">Question ${q.n || ""}</div>
      <div class="hero">${avatarHTML(V.me.avatar, V.me.name, 190, "", r && r.ok ? "jump loop" : r ? "sad" : "alive")}${V.me.streak >= 3 && r && r.ok ? `<div class="streak">🔥 ${V.me.streak} d'affilée !</div>` : ""}</div>
      <div class="result ${r ? (r.ok ? "ok" : "ko") : "none"}"><div class="t">${r ? (r.ok ? "Bonne réponse !" : "Mauvaise réponse…") : "Pas de réponse"}</div>
      <div class="p">${r ? (r.points > 0 ? "+ " + ptsTxt(r.points) : r.points < 0 ? "− " + ptsTxt(-r.points) : "0 point") : "0 point"}</div>
      ${r && r.double && r.ok ? `<div class="spres">×2 Points doublés !</div>` : ""}${r && r.bonus ? `<div class="spres">⚡ +${ptsTxt(r.bonus)} : vous avez été le plus rapide !</div>` : ""}
      ${r && r.bet ? `<div class="spres">🎲 ${r.ok ? `Mise gagnée : +${ptsTxt(r.bet)}` : `Mise perdue : −${ptsTxt(r.bet)}`}</div>` : ""}${r && r.ms != null && V.settings.tieSpeed ? `<div class="dim" style="margin-top:4px;font-size:14px">⏱ Réponse en ${secTxt(r.ms)}</div>` : ""}</div>
      <div class="card"><span class="lbl">La bonne réponse</span><div class="ans good" style="min-height:52px"><span class="L">${L[q.correct]}</span><span>${esc(q.answers[q.correct])}</span></div>
      ${r && !r.ok ? `<p class="dim" style="margin:10px 0 0">Vous aviez répondu ${L[q.mine]} : « ${esc(q.answers[q.mine])} »</p>` : ""}</div>
      ${rxHTML()}${q.note ? `<div class="card"><span class="lbl">👉 Le saviez-vous ?</span><p style="margin:0;line-height:1.45;color:#fff">${esc(q.note)}</p></div>` : ""}${meHTML(true)}`;
    bindRx();
    if (r && r.ok) sparkles($(".hero"));
    if (lastBuzz !== q.qid) { lastBuzz = q.qid; try { navigator.vibrate && navigator.vibrate(r && r.ok ? [40, 60, 40] : 120); } catch (e) { }
      if (r && !r.ok && sndOn && soundsWanted() && AC) { if (!playFile("wrong")) JSND.wrong(); } }
    return;
  }
  if (V.phase === "results" && V.hold) {
    app.innerHTML = `<div class="brand">Le classement</div><div class="card center"><p class="big">🥁 Roulement de tambour…</p><div class="pulse"></div><p class="dim" style="margin-bottom:0">Le podium se dévoile sur l'écran !</p></div>${meHTML(true)}${rxHTML()}`;
    bindRx(); return;
  }
  if (V.phase === "results") {
    const m = V.me;
    app.innerHTML = `<div class="brand">Le classement</div><div class="card center"><div class="hero">${avatarHTML(m.avatar, m.name, 230, "", m.rank <= 3 ? "dance" : "alive")}${m.rank === 1 ? `<div class="crown">👑</div>` : ""}</div>
      <p class="big" style="margin:10px 0 4px">${esc(m.name)}</p><div class="rank">${m.rank}${m.rank === 1 ? "er" : "e"}</div>
      <p class="dim" style="margin:4px 0 0">sur ${m.of} joueur${m.of > 1 ? "s" : ""}, avec ${ptsTxt(m.points)}</p>
      ${V.settings.tieSpeed && m.tied && m.points > 0 ? `<p class="dim" style="margin:6px 0 0;font-size:14px">⏱ À égalité de points avec ${m.tied} joueur${m.tied > 1 ? "s" : ""} : départagé${m.tied > 1 ? "s" : ""} à la vitesse (${secTxt(m.ms)} cumulées sur vos bonnes réponses)</p>` : ""}
      <p style="margin:12px 0 0;font-size:18px">${m.rank === 1 ? "🏆 Bravo, vous êtes en tête !" : m.rank <= 3 ? "👏 Sur le podium !" : "Merci pour votre participation !"}</p></div>
      ${(V.trophies || []).length ? `<div class="card"><span class="lbl">Vos trophées</span>${V.trophies.map(t => `<div class="trophy"><span class="ti">${t.icon}</span><div><b>${esc(t.title)}</b><br><span class="dim">${esc(t.txt)}</span></div></div>`).join("")}</div>` : ""}
      <button class="btn" id="souv">📸 Ma photo souvenir</button>${rxHTML()}`;
    bindRx(); $("#souv").onclick = souvenir;
    if (m.rank <= 3) sparkles($(".hero"));
    return;
  }
  if (V.phase === "credits") {
    app.innerHTML = `<div class="brand">Merci !</div><div class="card center"><p class="big">Merci d'avoir joué ! 👏</p><p class="dim">Vous pouvez fermer cette page.</p></div>${meHTML()}
      <button class="btn" id="souv">📸 Ma photo souvenir</button>${rxHTML()}`;
    bindRx(); $("#souv").onclick = souvenir;
    return;
  }
  app.innerHTML = `<div class="brand">${esc(V.settings.title || "Qui veut gagner des applaudissements ?")}</div>
    <div class="hero big">${avatarHTML(V.me.avatar, V.me.name, Math.round(Math.min(innerHeight * .42, 320)), "", "alive")}</div>
    <div class="hname">${esc(V.me.name)}${V.me.streak >= 3 ? ` <span class="streak">🔥 ${V.me.streak}</span>` : ""}</div>
    <div class="stats"><div class="stat"><b>${V.me.points}</b><span>point${V.me.points > 1 ? "s" : ""}</span></div>
    <div class="stat"><b>${V.me.rank ? V.me.rank + (V.me.rank === 1 ? "er" : "e") : "–"}</b><span>sur ${V.me.of} joueur${V.me.of > 1 ? "s" : ""}</span></div></div>
    <p class="wait">${V.me.points || V.me.good ? "En attente de la prochaine question…" : "Vous êtes inscrit ! Regardez l'écran : les questions s'affichent ici."}</p>
    ${V.me.avatar && V.me.avatar.kind === "gen" ? `<button class="linkbtn" id="edAv" style="display:block;margin:0 auto">🎨 Modifier mon personnage</button>` : `<button class="linkbtn" id="edAv" style="display:block;margin:0 auto">🎨 Choisir un personnage</button>`}
    ${rxHTML()}
    <p class="foot">Gardez cette page ouverte.</p>`;
  bindRx(); $("#edAv").onclick = editAvatar;
}

function renderQuestion() {
  const q = V.q, answered = q.mine != null;
  const J = V.settings.jokers || {}, anyJ = !answered && (J.fifty || J.public || J.phone);
  const phoneLeft = q.phoneUntil ? Math.max(0, Math.ceil((q.phoneUntil - (Date.now() + clockOffset)) / 1000)) : 0;
  const showVote = q.vote && !answered;
  if (q.vote && !voteAt[q.qid]) voteAt[q.qid] = Date.now() + VOTE_MS;
  const voteDone = q.vote && Date.now() >= voteAt[q.qid];
  app.innerHTML = `<div class="qhead"><span class="brand" style="text-align:left">Question ${q.n || ""}</span><span class="chip">${ptsTxt(Math.max(0, q.points - Object.values(q.used || {}).filter(Boolean).length * (q.jokerCost || 0)) * (q.special === "double" ? 2 : 1))} en jeu</span>${soundsWanted() ? `<button class="sndbtn" id="snd" aria-label="${sndOn ? "Couper le son des jokers" : "Activer le son des jokers"}">${sndOn ? "🔊" : "🔇"}</button>` : ""}<span class="timer" id="tm"></span></div>
    ${q.special ? `<div class="spline sp-${q.special}">${SPN[q.special].icon} ${SPN[q.special].title}${q.special === "speed" ? ` : +${ptsTxt(q.speedBonus)} au plus rapide` : q.special === "double" ? " : les points comptent double" : ""}</div>` : ""}
    <div class="card"><div class="qtext">${esc(q.text)}</div></div>
    ${q.special === "bet" && !answered ? betHTML(q) : ""}
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
  app.querySelectorAll("[data-bet]").forEach(b => b.onclick = () => bet(+b.dataset.bet, b));
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
    if (el && q.deadline) { const s = Math.max(0, Math.ceil((q.deadline - t) / 1000)); el.textContent = s + " s"; el.classList.toggle("low", s <= 5);
      if (s <= 5 && s > 0 && s !== lastBeep && V.q.mine == null) { lastBeep = s; try { navigator.vibrate && navigator.vibrate(45); } catch (e) { } if (sndOn && AC) tone(s === 1 ? 1760 : 1400, 0, .05, "square", .07); } }
    const ph = $("#ph"); if (ph && q.phoneUntil) { const s = Math.max(0, Math.ceil((q.phoneUntil - t) / 1000)); ph.textContent = s; if (!s) { stopCall(true); render(true); } }
  };
  upd(); tick = setInterval(upd, 250);
}
async function answer(i, btn) {
  if (V.q.mine != null) return;
  app.querySelectorAll("[data-a]").forEach(b => b.disabled = true); btn.classList.add("sel");
  stopCall(true);                                   // answering ends the phone call
  audioUnlock();                                    // the tap allows the "wrong answer" music at the reveal
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
const soundsWanted = () => V && V.settings && V.settings.jokerSounds !== false;   // sounds on the phones (jokers, wrong answer)
function audioUnlock(any) {
  if (!sndOn || (!any && !soundsWanted())) return;
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { }   // iPhone: play even with the silent switch
  try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) { }
  preloadFiles();
}
// the site's MP3s are decoded once, then played through the audio context (works later without a new tap, also on iPhone)
const BUF = {};
const sndUrl = n => `/sounds/${n}.mp3${V.settings.soundV && V.settings.soundV[n] ? "?v=" + V.settings.soundV[n] : ""}`;
function preloadFiles() {
  if (!AC || !V || !V.settings) return;
  for (const n of V.settings.jokerFiles || []) if (!BUF[n]) BUF[n] = fetch(sndUrl(n)).then(r => r.arrayBuffer()).then(b => new Promise((ok, ko) => AC.decodeAudioData(b, ok, ko))).catch(() => null);
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
  hangup() { noise(0, .06, .25, 900); for (let i = 0; i < 3; i++) tone(440, .35 + i * .5, .25, "sine", .13); },
  wrong() { [[392, 370, 0, .42], [370, 349, .48, .42], [349, 330, .96, .42], [330, 247, 1.44, 1.3]].forEach(([a, b, t, d]) => { tone(a, t, d, "sawtooth", .08, b); tone(a / 2, t, d, "triangle", .1, b / 2); }); }
};
const MP3 = { fifty: "joker-5050", public: "joker-public", phone: "joker-phone", wrong: "mauvaise-reponse" };
let mp3El = null, call = null;
// returns a handle {stop(), dur: Promise<seconds>} or null when the site has no file for it
function playFile(k, loop) {
  const n = MP3[k]; if (!(V.settings.jokerFiles || []).includes(n)) return null;
  if (AC) {
    preloadFiles(); let src = null, stopped = false;
    const dur = BUF[n].then(buf => { if (!buf || stopped) return 0; src = AC.createBufferSource(); src.buffer = buf; src.loop = !!loop; src.connect(AC.destination); src.start(); return buf.duration; });
    return { stop() { stopped = true; try { src && src.stop(); } catch (e) { } }, dur };
  }
  const a = new Audio(sndUrl(n)); a.loop = !!loop; a.play().catch(() => { });
  return { stop() { a.pause(); }, dur: new Promise(r => a.addEventListener("loadedmetadata", () => r(a.duration || 0), { once: true })) };
}
function jokerSound(k, qid) {
  if (!sndOn || !soundsWanted()) return;
  audioUnlock();
  if (k === "fifty") { if (!playFile("fifty")) JSND.fifty(); }
  if (k === "public") { mp3El = playFile("public");
    if (!mp3El) JSND.public();
    else mp3El.dur.then(d => { if (d && V.q && V.q.qid === qid) { voteAt[qid] = Date.now() + Math.min(13, Math.max(3, d - .9)) * 1000;   /* about the final hit of the music */ render(true); } });   // the result shows at the end of the music
  }
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
  c.timers.forEach(clearTimeout); if (c.audio) { c.audio.stop(); c.audio = null; }
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

/* ------------------------------------------------------- reactions (to the projected screen) */
const RX = ["👏", "😂", "😮", "❤️", "🔥", "🎉"];
function rxHTML() { return V && V.settings && V.settings.reactions !== false ? `<div class="rx" aria-label="Réagir sur l'écran">${RX.map(e => `<button data-rx="${e}" aria-label="Envoyer ${e}">${e}</button>`).join("")}</div>` : ""; }
function bindRx() {
  app.querySelectorAll("[data-rx]").forEach(b => b.onclick = async () => {
    audioUnlock(true);
    b.classList.remove("sent"); void b.offsetWidth; b.classList.add("sent");
    const f = document.createElement("span"); f.className = "rxfly"; f.textContent = b.dataset.rx; const r = b.getBoundingClientRect();
    f.style.left = r.left + r.width / 2 + "px"; f.style.top = r.top + "px"; document.body.appendChild(f); setTimeout(() => f.remove(), 1200);
    try { navigator.vibrate && navigator.vibrate(15); } catch (e) { }
    const res = await api("/api/react", { pid: ME.pid, token: ME.token, e: b.dataset.rx }).catch(() => ({}));
    if (res.slow) toast("Doucement 😄");
  });
}
function sparkles(host) {
  if (!host || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 14; i++) { const sp = document.createElement("span"); sp.className = "spark"; sp.textContent = ["✨", "⭐", "🌟", "🎉"][i % 4];
    const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 90;
    sp.style.left = "50%"; sp.style.top = "45%"; sp.style.setProperty("--sx", Math.cos(a) * d + "px"); sp.style.setProperty("--sy", Math.sin(a) * d - 30 + "px"); sp.style.animationDelay = i * 60 + "ms";
    host.appendChild(sp); setTimeout(() => sp.remove(), 2400); }
}

/* --------------------------------------------------------------------- clap meter */
let clapPending = 0, clapMine = 0, clapFlushT = null, lastShake = 0, motionOn = false;
function clapScreen() {
  const c = V.clap;
  if (!clapOn || !$("#clapBtn")) {
    clapOn = true; clapMine = 0; lastSig = ""; stopTick();
    app.innerHTML = `<div class="brand">Applaudimètre</div><div class="claplbl">${esc(c.label)}</div>
      <button class="clapbtn" id="clapBtn" aria-label="Applaudir">👏</button>
      <p class="center big" style="margin:8px 0 0"><span id="clapN">0</span> 👏</p>
      <p class="center dim" style="margin:4px 0 0">Tapez le plus vite possible… et secouez votre téléphone !</p>
      <p class="center" style="margin:10px 0 0"><span class="chip" id="clapT"></span></p>`;
    const btn = $("#clapBtn");
    btn.addEventListener("pointerdown", e => { e.preventDefault(); clap(1); btn.classList.remove("hit"); void btn.offsetWidth; btn.classList.add("hit"); startMotion(); });
  }
  const end = c.until - c.serverNow + Date.now();      // local time of the end
  clearInterval(tick); const upd = () => { const s = Math.max(0, Math.ceil((end - Date.now()) / 1000)); const t = $("#clapT"); if (t) t.textContent = s + " s"; if (!s) { clearInterval(tick); } };
  upd(); tick = setInterval(upd, 250);
}
function clap(n) {
  clapPending += n; clapMine += n; const el = $("#clapN"); if (el) el.textContent = clapMine;
  try { navigator.vibrate && navigator.vibrate(8); } catch (e) { }
  if (!clapFlushT) clapFlushT = setTimeout(async () => { clapFlushT = null; const k = clapPending; clapPending = 0; if (k) await api("/api/clap", { pid: ME.pid, token: ME.token, n: k }).catch(() => { }); }, 250);
}
async function startMotion() {
  if (motionOn) return; motionOn = true;
  try { if (typeof DeviceMotionEvent !== "undefined" && DeviceMotionEvent.requestPermission) { const r = await DeviceMotionEvent.requestPermission(); if (r !== "granted") return; } } catch (e) { return; }
  addEventListener("devicemotion", e => {
    if (!clapOn) return; const a = e.accelerationIncludingGravity || e.acceleration; if (!a) return;
    const g = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2), t = Date.now();
    if (Math.abs(g - 9.8) > 9 && t - lastShake > 140) { lastShake = t; clap(1); }
  });
}

/* ----------------------------------------------------------------- avatar builder */
const HS_NAMES = ["Longs", "Queue de cheval", "Carré", "Chignon", "Boucles longues", "Hérissés", "Raie sur le côté", "Bouclés", "Très courts", "Banane"];
const BUILD = [
  ["hs", "Coiffure", HS_NAMES],
  ["hair", "Couleur des cheveux", HAIR, true],
  ["skin", "Couleur de peau", SKIN, true],
  ["topKind", "Haut", ["Sweat à capuche", "Pull", "T-shirt"]],
  ["top", "Couleur du haut", TOP, true],
  ["logo", "Motif", ["⭐ Étoile", "🎮 Manette", "⚡ Éclair", "❤️ Cœur", "Rayures", "Aucun"]],
  ["bottom", "Pantalon / jupe", BOTTOM, true],
  ["skirt", "Bas", ["Pantalon", "Jupe"]],
  ["shoe", "Baskets", SHOE, true],
  ["pose", "Pose", ["👍 Pouce levé", "Bras le long du corps", "👋 Coucou"]],
  ["smile", "Sourire", ["Sourire", "Grand sourire", "Malicieux"]],
  ["glasses", "Lunettes", ["Sans", "Avec"]],
  ["freckles", "Taches de rousseur", ["Sans", "Avec"]],
  ["beard", "Barbe", ["Sans", "Avec"]]];
function builderHTML(av, name) {
  const o = av.o || {};
  return `<div class="bld"><div class="bprev">${avatarHTML(av, name, 200, "", "alive")}<button class="linkbtn" data-brnd type="button">🎲 Au hasard</button></div>
    <div class="bopts">${BUILD.map(([k, lbl, vals, col]) => `<div class="brow"><span class="lbl">${lbl}</span><div class="bvals">${vals.map((v, i) => col
      ? `<button type="button" class="sw ${o[k] === i ? "on" : ""}" data-bk="${k}" data-bv="${i}" style="background:${v}" aria-label="${lbl} ${i + 1}"></button>`
      : `<button type="button" class="bv ${o[k] === i ? "on" : ""}" data-bk="${k}" data-bv="${i}">${esc(v)}</button>`).join("")}</div></div>`).join("")}</div></div>`;
}
function bindBuilder(root, get, set, redraw) {
  root.querySelectorAll("[data-bk]").forEach(b => b.onclick = () => { const a = get(); const o = Object.assign({}, a.o || {}); o[b.dataset.bk] = +b.dataset.bv; set({ kind: "gen", seed: a.seed || rnd(1e6), o }); redraw(); });
  const r = root.querySelector("[data-brnd]"); if (r) r.onclick = () => { set({ kind: "gen", seed: rnd(1e6) }); redraw(); };
}
function editAvatar() {
  editing = true;
  let av = V.me.avatar && V.me.avatar.kind === "gen" ? JSON.parse(JSON.stringify(V.me.avatar)) : { kind: "gen", seed: rnd(1e6) };
  const draw = () => {
    app.innerHTML = `<div class="brand">Mon personnage</div><div class="card" id="bldCard">${builderHTML(av, V.me.name)}</div>
      <button class="btn" id="bOk">Enregistrer</button><button class="btn ghost" id="bNo" style="margin-top:10px">Annuler</button>`;
    bindBuilder($("#bldCard"), () => av, a => { av = a; }, () => { const y = scrollY; draw(); scrollTo(0, y); });
    $("#bOk").onclick = async () => { $("#bOk").disabled = true; const r = await api("/api/avatar", { pid: ME.pid, token: ME.token, avatar: av }).catch(() => ({})); editing = false; if (!r.ok) toast("Avatar non enregistré : réessayez."); render(true); };
    $("#bNo").onclick = () => { editing = false; render(true); };
  };
  draw();
}

/* ------------------------------------------------------------------ souvenir picture */
async function souvenir() {
  const b = $("#souv"); if (b) { b.disabled = true; b.textContent = "Préparation de la photo…"; }
  try {
    const d = await fetch("/api/souvenir").then(r => r.json());
    const c = await souvenirCanvas(d, ME.pid);
    const url = c.toDataURL("image/jpeg", .9);
    const ov = document.createElement("div"); ov.className = "souvov";
    ov.innerHTML = `<img src="${url}" alt="Photo souvenir de la partie"><p>Appui long sur l'image pour l'enregistrer, ou :</p><button class="btn" id="dl">Télécharger</button><button class="btn ghost" id="cl" style="margin-top:8px">Fermer</button>`;
    document.body.appendChild(ov);
    $("#dl", ov).onclick = () => downloadCanvas(c, "souvenir-quiz.png"); $("#cl", ov).onclick = () => ov.remove();
  } catch (e) { toast("Photo indisponible pour le moment."); }
  if (b) { b.disabled = false; b.textContent = "📸 Ma photo souvenir"; }
}

/* ---------------------------------------------------------------- special questions */
const SPN = { double: { icon: "×2", title: "Double points", txt: "Les points de cette question comptent double !" },
  speed: { icon: "⚡", title: "Bonus rapidité", txt: "Le plus rapide à trouver la bonne réponse gagne un bonus !" },
  bet: { icon: "🎲", title: "Quitte ou double", txt: "Avant de répondre, misez une partie de vos points : gagnée si vous avez bon, perdue sinon !" } };
function spBanner(q) { const x = q.special && SPN[q.special]; return x ? `<div class="spcard sp-${q.special}"><div class="spi">${x.icon}</div><div><b>Question spéciale : ${x.title}</b><br>${q.special === "speed" ? `Le plus rapide à trouver la bonne réponse gagne ${ptsTxt(q.speedBonus)} de plus !` : x.txt}</div></div>` : ""; }
function betHTML(q) {
  const base = q.stakeBase || 0;
  if (!base) return `<div class="card betcard"><span class="lbl">🎲 Quitte ou double</span><p style="margin:0">Vous n'avez pas encore de points à miser : répondez simplement !</p></div>`;
  return `<div class="card betcard"><span class="lbl">🎲 Quitte ou double : votre mise (vous avez ${ptsTxt(base)})</span>
    <div class="bets">${[[0, "Rien"], [25, "25 %"], [50, "50 %"], [100, "Tout !"]].map(([p, l]) => `<button class="betb ${q.betPct === p ? "on" : ""}" data-bet="${p}"><b>${l}</b><small>${Math.round(base * p / 100)} pt${Math.round(base * p / 100) > 1 ? "s" : ""}</small></button>`).join("")}</div>
    <p class="dim" style="margin:6px 0 0;font-size:13px">${q.betPct == null ? "Choisissez votre mise, puis répondez." : q.bet ? `Bonne réponse : +${ptsTxt(q.points + q.bet)} · mauvaise réponse : −${ptsTxt(q.bet)}` : "Sans mise : vous jouez seulement les points de la question."}</p></div>`;
}
async function bet(pct, btn) {
  app.querySelectorAll("[data-bet]").forEach(b => b.classList.toggle("on", b === btn));
  try { navigator.vibrate && navigator.vibrate(15); } catch (e) { }
  const r = await api("/api/bet", { pid: ME.pid, token: ME.token, qid: V.q.qid, pct }).catch(() => ({ ok: false, error: "Réseau indisponible : réessayez." }));
  if (!r.ok) toast(r.error || "Mise refusée.");
}
