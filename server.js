"use strict";
/*
 * Qui veut gagner des applaudissements ? — version en ligne
 * Serveur Node.js sans aucune dépendance (rien à installer avec npm).
 *  - "/"       : page joueur (téléphone)
 *  - "/admin"  : page animateur (projetée), protégée par la variable d'environnement ADMIN_PASSWORD
 * Les réglages (questions, illustrations, sons) restent dans le navigateur de l'animateur.
 * Le serveur ne garde que la partie en cours, en mémoire.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const QRCode = require("./lib/qrcode");
const QRErrorCorrectLevel = require("./lib/qrcode/QRErrorCorrectLevel");

const PORT = +process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const PUBLIC = path.join(__dirname, "public");
const MAX_PLAYERS = 300;

/* ------------------------------------------------------------------ utils */
const now = () => Date.now();
const rid = (n = 9) => crypto.randomBytes(n).toString("base64url");
function rnd(n) { return n > 0 ? crypto.randomInt(n) : 0; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const isAdmin = key => !ADMIN_PASSWORD || safeEq(key || "", ADMIN_PASSWORD);
const clean = (s, max) => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);

/* ------------------------------------------------------------- game state */
let G = freshState();
function freshState() {
  return {
    gameId: rid(6),
    players: new Map(),            // pid -> {pid, token, name, avatar, joinedAt, jokersUsed:{fifty,public,phone}}
    settings: { jokers: { fifty: true, public: true, phone: false }, jokerScope: "game", phoneSec: 30, autoClose: true, tieSpeed: true, jokerSounds: true, streakBonus: false, reactions: true, title: "", subtitle: "" },
    clap: null,                    // clap meter: {label, until, total, hits: [[time, n]…]}
    phase: "lobby",                // lobby | intro | question | closed | revealed | results | credits
    cur: null,                     // current question (with the correct answer, never sent to players before reveal)
    results: {},                   // qid -> {label, correct, at, rows: {pid -> {choice, ok, points, ms, jokers}}}
    order: [],                     // qids in the order they were played
    banned: [],                    // players excluded by the host: [{name, avatar, at}]
    show: { screen: "home" },      // what the projected screen shows (phones follow it)
  };
}
function scores() {
  const tot = {}, history = [];
  for (const p of G.players.values()) tot[p.pid] = { points: 0, good: 0, ms: 0, streak: 0, best: 0, bonus: 0 };
  for (const qid of G.order) {
    const r = G.results[qid]; if (!r) continue;
    for (const [pid, t] of Object.entries(tot)) {
      const row = r.rows[pid];
      if (row && row.ok) {
        t.points += row.points; t.good++; t.ms += row.ms || 0; t.streak++; t.best = Math.max(t.best, t.streak);
        if (G.settings.streakBonus && t.streak % 3 === 0) { t.points++; t.bonus++; }    // 🔥 3 good answers in a row
      } else { if (row) t.points += row.points; t.streak = 0; }
    }
    history.push({ qid, pts: Object.fromEntries(Object.entries(tot).map(([pid, t]) => [pid, t.points])) });
  }
  // ranking: most points first; equal points are split by the total time taken on correct answers (fastest first)
  const sp = G.settings.tieSpeed !== false, key = e => sp ? e.points + "|" + e.ms : String(e.points);
  const list = Object.entries(tot).map(([pid, t]) => ({ pid, ...t })).sort((a, b) => b.points - a.points || (sp ? a.ms - b.ms : 0));
  let rank = 0, last = null;
  list.forEach((e, i) => { const k = key(e); if (k !== last) { rank = i + 1; last = k; } e.rank = rank; });
  for (const e of list) e.tied = list.filter(x => x.points === e.points).length - 1;   // other players with the same points
  return { list, byPid: Object.fromEntries(list.map(e => [e.pid, e])), history };
}
/* End-of-game titles and the evening's highlights */
function awards(sc) {
  const P = [...G.players.values()], qs = G.order.map(id => [id, G.results[id]]).filter(([, r]) => r);
  if (!qs.length || !P.length) return { byPid: {}, list: [], moments: [] };
  const st = Object.fromEntries(P.map(p => [p.pid, { n: 0, good: 0, ms: 0, jk: 0, fifty: 0, pub: 0, phone: 0 }]));
  for (const [, r] of qs) for (const [pid, row] of Object.entries(r.rows)) {
    const s = st[pid]; if (!s) continue; s.n++; const j = row.jokers || {};
    if (row.ok) { s.good++; s.ms += row.ms || 0; }
    for (const k of ["fifty", "public", "phone"]) if (j[k]) { s.jk++; s[k === "public" ? "pub" : k]++; }
  }
  const name = pid => (G.players.get(pid) || {}).name || "";
  // each title goes to the best player; when possible to someone who has no title yet (more winners in the room)
  const got = new Set();
  const best = (f, ok) => { const c = []; for (const p of P) { const x = f(p.pid, st[p.pid]); if (x == null || (ok && !ok(p.pid, st[p.pid]))) continue; c.push([p.pid, x]); }
    if (!c.length) return null; c.sort((a, b) => b[1] - a[1]); const top = c[0][1], fresh = c.find(e => !got.has(e[0]) && (e[1] >= top * .6 || e[1] === top));
    const r = fresh || c[0]; got.add(r[0]); return r; };
  const T = [];
  const add = (key, icon, title, txt, r) => { if (r) T.push({ key, icon, title, pid: r[0], name: name(r[0]), txt: txt(r[1], r[0]) }); };
  add("fast", "⚡", "L'éclair", v => `${(-v / 1000).toFixed(1).replace(".", ",")} s en moyenne par bonne réponse`, best((pid, s) => s.good ? -s.ms / s.good : null, (pid, s) => s.good >= Math.min(2, qs.length)));
  add("brave", "🦁", "Sans filet", v => `${v} bonne${v > 1 ? "s" : ""} réponse${v > 1 ? "s" : ""} sans aucun joker`, best((pid, s) => s.jk === 0 && s.good ? s.good : null));
  add("fifty", "✂️", "Le roi du 50:50", v => `${v} joker${v > 1 ? "s" : ""} 50:50 utilisé${v > 1 ? "s" : ""}`, best((pid, s) => s.fifty || null));
  add("crowd", "👥", "L'ami du public", v => `${v} vote${v > 1 ? "s" : ""} du public demandé${v > 1 ? "s" : ""}`, best((pid, s) => s.pub || null));
  add("phone", "📞", "Pendu au téléphone", v => `${v} appel${v > 1 ? "s" : ""} à un ami`, best((pid, s) => s.phone || null));
  add("streak", "🔥", "En feu", v => `${v} bonnes réponses d'affilée`, best(pid => (sc.byPid[pid] || {}).best >= 3 ? sc.byPid[pid].best : null));
  if (sc.history.length >= 3) {                     // the biggest climb between the middle and the end of the game
    const rankAt = pts => { const l = Object.entries(pts).sort((a, b) => b[1] - a[1]); const r = {}; l.forEach(([pid], i) => r[pid] = i + 1); return r; };
    const a = rankAt(sc.history[Math.floor((sc.history.length - 1) / 2)].pts), z = rankAt(sc.history[sc.history.length - 1].pts);
    add("climb", "📈", "La remontée", v => `+${v} place${v > 1 ? "s" : ""} en deuxième partie de jeu`, best(pid => a[pid] && z[pid] && a[pid] - z[pid] >= 2 ? a[pid] - z[pid] : null));
  }
  add("loyal", "🎯", "Fidèle au poste", v => `a répondu aux ${v} questions`, P.length > 1 ? best((pid, s) => s.n === qs.length && s.n >= 3 ? s.n : null) : null);
  const byPid = {}; T.forEach(t => (byPid[t.pid] = byPid[t.pid] || []).push(t));
  // highlights
  const M = [], L = "ABCD";
  const st2 = qs.map(([id, r]) => { const rows = Object.values(r.rows), n = rows.length, ok = rows.filter(x => x.ok).length;
    const d = [0, 1, 2, 3].map(i => rows.filter(x => x.choice === i).length); return { id, r, n, ok, d }; }).filter(x => x.n);
  if (st2.length) {
    const hard = st2.slice().sort((a, b) => a.ok / a.n - b.ok / b.n)[0];
    M.push({ icon: "🧠", title: "La question la plus ratée", txt: `${hard.r.label} : ${Math.round(hard.ok / hard.n * 100)} % de bonnes réponses`, sub: hard.r.text });
    const split = st2.slice().sort((a, b) => Math.max(...a.d) / a.n - Math.max(...b.d) / b.n)[0];
    if (split.n >= 3) M.push({ icon: "⚖️", title: "La salle la plus divisée", txt: `${split.r.label} : ${split.d.map((v, i) => v ? `${L[i]} ${Math.round(v / split.n * 100)} %` : "").filter(Boolean).join(" · ")}`, sub: split.r.text });
    const easy = st2.slice().sort((a, b) => b.ok / b.n - a.ok / a.n)[0];
    if (easy !== hard) M.push({ icon: "🎉", title: "La question la mieux réussie", txt: `${easy.r.label} : ${Math.round(easy.ok / easy.n * 100)} % de bonnes réponses`, sub: easy.r.text });
  }
  let fast = null; for (const [, r] of qs) for (const [pid, row] of Object.entries(r.rows)) if (row.ok && G.players.has(pid) && (!fast || row.ms < fast.ms)) fast = { pid, ms: row.ms, r };
  if (fast) M.push({ icon: "⚡", title: "La réponse la plus rapide", txt: `${name(fast.pid)} en ${(fast.ms / 1000).toFixed(1).replace(".", ",")} s`, sub: fast.r.label, pid: fast.pid });
  return { byPid, list: T, moments: M };
}

/* Audience vote: the harder the question (1 to 4), the more divided the room; at level 4 a wrong answer may win */
function publicVote(correct, difficulty, gone) {
  const lvl = difficulty || 2, R = (a, b) => a + rnd(10000) / 10000 * (b - a);
  const live = [0, 1, 2, 3].filter(i => !gone.includes(i)), wrong = live.filter(i => i !== correct);
  const share = [0, 0, 0, 0];
  let c = { 1: R(66, 82), 2: R(46, 60), 3: R(34, 46), 4: R(28, 38) }[lvl];
  if (!wrong.length) c = 100;
  if (wrong.length === 1) c = Math.min(92, c + (lvl <= 2 ? 12 : 6));
  share[correct] = c; let rest = 100 - c;
  if (wrong.length) {
    const trap = wrong[rnd(wrong.length)];
    let t = lvl === 4 ? (rnd(100) < 48 ? c + R(4, 14) : c - R(2, 8)) : lvl === 3 ? c - R(5, 14) : rest * R(.4, .6);
    t = Math.max(3, Math.min(rest, t)); share[trap] = t; rest -= t;
    const others = wrong.filter(i => i !== trap);
    if (!others.length) share[trap] += rest;
    else { const w = others.map(() => R(.5, 1.5)), sw = w.reduce((a, b) => a + b, 0); others.forEach((i, k) => share[i] = rest * w[k] / sw); }
  }
  const fl = share.map(Math.floor); const diff = 100 - fl.reduce((a, b) => a + b, 0);
  const order = share.map((v, i) => [v - fl[i], i]).filter(([, i]) => live.includes(i)).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < diff; k++) fl[order[k % order.length][1]]++;
  return fl;
}

/* ----------------------------------------------------- views sent to screens */
// Pictures are not repeated in every update: the views carry a cacheable address instead (/api/av/<pid>?v=…)
function viewAvatar(p) {
  const a = p.avatar;
  if (a && a.kind === "img" && typeof a.src === "string" && a.src.startsWith("data:")) {
    if (!p.avV || p.avSrc !== a.src) { p.avSrc = a.src; p.avV = crypto.createHash("sha1").update(a.src).digest("hex").slice(0, 10); }
    return { kind: "img", src: `/api/av/${p.pid}?v=${p.avV}` };
  }
  return a;
}
function publicPlayer(p) { return { pid: p.pid, name: p.name, avatar: viewAvatar(p) }; }
function adminView() {
  const sc = scores();
  const cur = G.cur && {
    qid: G.cur.qid, label: G.cur.label, text: G.cur.text, answers: G.cur.answers, points: G.cur.points,
    deadline: G.cur.deadline, openedAt: G.cur.openedAt, phase: G.phase,
    answered: Object.keys(G.cur.answers_by).length,
    dist: [0, 1, 2, 3].map(i => Object.values(G.cur.answers_by).filter(a => a.choice === i).length),
    answeredIds: Object.entries(G.cur.answers_by).filter(([, a]) => a.choice != null).map(([pid]) => pid),
    picks: ["closed", "revealed"].includes(G.phase) ? Object.fromEntries(Object.entries(G.cur.answers_by).filter(([, a]) => a.choice != null).map(([pid, a]) => [pid, a.choice])) : null,
    jokers: Object.values(G.cur.answers_by).concat(Object.values(G.cur.jokerOnly)).reduce((a, x) => { for (const k of ["fifty", "public", "phone"]) if (x.jokers && x.jokers[k]) a[k]++; return a; }, { fifty: 0, public: 0, phone: 0 }),
  };
  return {
    gameId: G.gameId, phase: G.phase, show: G.show, settings: G.settings, cur,
    players: [...G.players.values()].map(p => ({ ...publicPlayer(p), online: online(p.pid), score: sc.byPid[p.pid] })),
    results: G.results, order: G.order, ranking: sc.list, banned: G.banned.map(x => ({ name: x.name, avatar: x.avatar })),
    history: sc.history, awards: awards(sc), clap: clapView(true),
  };
}
function playerView(pid, sc, aw) {
  const p = G.players.get(pid); if (!p) return { gone: true, gameId: G.gameId };
  sc = sc || scores(); const me = sc.byPid[pid] || { points: 0, rank: sc.list.length, good: 0, ms: 0, tied: 0 };
  const v = { gameId: G.gameId, me: { ...publicPlayer(p), points: me.points, rank: me.rank, good: me.good, of: sc.list.length, ms: me.ms, tied: me.tied, streak: me.streak || 0 },
    phase: G.phase, screen: G.show.screen, hold: !!G.show.hold, clap: clapView(false),
    trophies: ["results", "credits"].includes(G.phase) && !G.show.hold ? ((aw || awards(sc)).byPid[pid] || []) : [], settings: { jokers: G.settings.jokers, phoneSec: G.settings.phoneSec, jokerScope: G.settings.jokerScope, tieSpeed: G.settings.tieSpeed !== false, jokerSounds: G.settings.jokerSounds !== false, jokerFiles: PHONE_SOUNDS.filter(n => snd()[n]), soundV: sndVersions(), reactions: G.settings.reactions !== false, title: G.settings.title } };
  if (G.cur && ["intro", "question", "closed", "revealed"].includes(G.phase)) {
    const a = G.cur.answers_by[pid] || G.cur.jokerOnly[pid] || null;
    const usedHere = (a && a.jokers) || {};
    const avail = {};
    for (const k of ["fifty", "public", "phone"]) avail[k] = !!G.settings.jokers[k] && !usedHere[k] && (G.settings.jokerScope !== "game" || !p.jokersUsed[k]);
    v.q = { qid: G.cur.qid, label: G.cur.label, n: G.cur.n, points: G.cur.points, jokerCost: G.cur.jokerCost,
      deadline: G.cur.deadline, serverNow: now(),
      text: G.phase === "intro" ? null : G.cur.text, answers: G.phase === "intro" ? null : G.cur.answers,
      mine: a && a.choice != null ? a.choice : null, gone: (a && a.gone) || [], vote: (a && a.vote) || null,
      used: usedHere, avail, phoneUntil: (a && a.phoneUntil) || null };
    if (G.phase === "revealed") {
      const r = G.results[G.cur.qid]; const row = r && r.rows[pid];
      v.q.correct = G.cur.correct; v.q.note = G.cur.note || ""; v.q.result = row ? { ok: row.ok, points: row.points, ms: row.ms } : null;
    }
  }
  return v;
}

/* ------------------------------------------------------------ server-sent events */
const clients = new Set();   // {res, role, pid}
function online(pid) { for (const c of clients) if (c.role === "player" && c.pid === pid) return true; return false; }
function send(c, data) { try { c.res.write(`data: ${JSON.stringify(data)}\n\n`); } catch (e) { /* closed */ } }
let pushTimer = null;
function pushAll() {                  // coalesce bursts (many answers in the same instant)
  if (pushTimer) return;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const av = { type: "state", state: adminView() }, sc = scores(), aw = ["results", "credits"].includes(G.phase) ? av.state.awards : null;
    for (const c of clients) send(c, c.role === "admin" ? av : { type: "state", state: playerView(c.pid, sc, aw) });
  }, 60);
}
setInterval(() => { for (const c of clients) { try { c.res.write(": ping\n\n"); } catch (e) { } } }, 20000);

/* -------------------------------------------------------------- game actions */
function closeQuestion() {
  if (G.phase !== "question") return;
  G.phase = "closed"; clearTimeout(G.cur.timer); G.cur.closedAt = now(); pushAll();
}
function maybeAutoClose() {
  if (G.phase !== "question" || !G.settings.autoClose) return;
  const ids = [...G.players.keys()].filter(online);
  if (ids.length && ids.every(id => G.cur.answers_by[id] && G.cur.answers_by[id].choice != null)) closeQuestion();
}
// time taken to answer, from the opening of the question to the tap; the phone call (joker) is not counted
function answerMs(a) {
  let ms = a.at - G.cur.openedAt;
  if (a.phoneAt) ms -= Math.max(0, Math.min(a.at, a.phoneUntil || a.at) - a.phoneAt);
  return Math.max(0, ms);
}
function reveal() {
  if (!G.cur || !["question", "closed"].includes(G.phase)) return;
  clearTimeout(G.cur.timer);
  const rows = {};
  for (const [pid, a] of Object.entries(G.cur.answers_by)) {
    if (a.choice == null) continue;
    const nj = ["fifty", "public", "phone"].filter(k => a.jokers && a.jokers[k]).length;
    const ok = a.choice === G.cur.correct;
    rows[pid] = { choice: a.choice, ok, points: ok ? Math.max(0, G.cur.points - nj * G.cur.jokerCost) : 0, ms: answerMs(a), jokers: a.jokers || {} };
  }
  G.results[G.cur.qid] = { label: G.cur.label, correct: G.cur.correct, at: now(), rows, answers: G.cur.answers, text: G.cur.text };
  if (!G.order.includes(G.cur.qid)) G.order.push(G.cur.qid);
  G.phase = "revealed"; pushAll();
}

function adminAction(b) {
  const a = b.action;
  if (a === "hello") { if (b.settings) applySettings(b.settings); return { ok: true }; }
  if (a === "settings") { applySettings(b.settings || {}); pushAll(); return { ok: true }; }
  if (a === "clap") {                       // clap meter: the phones become applause buttons for a few seconds
    const sec = Math.max(5, Math.min(30, +b.sec || 10));
    G.clap = { label: clean(b.label, 60) || "Applaudissez !", until: now() + sec * 1000, total: 0, hits: [], best: 0 };
    clearInterval(clapT); clapT = setInterval(() => { pushAll(); if (!G.clap || now() > G.clap.until + 400) clearInterval(clapT); }, 300);
    pushAll(); return { ok: true };
  }
  if (a === "clapStop") { if (G.clap) G.clap.until = Math.min(G.clap.until, now()); pushAll(); return { ok: true }; }
  if (a === "show") {                       // projected screen changed (home, hub, results, credits)
    G.show = { screen: clean(b.screen, 20) || "hub", hold: !!b.hold };
    if (G.cur) clearTimeout(G.cur.timer);
    G.cur = null; G.phase = ["results", "credits"].includes(G.show.screen) ? G.show.screen : "lobby";
    pushAll(); return { ok: true };
  }
  if (a === "intro" || a === "open") {
    const q = b.q || {};
    if (a === "intro" || !G.cur || G.cur.qid !== q.id) {
      const answers = [0, 1, 2, 3].map(i => clean((q.answers || [])[i], 300));
      G.cur = { qid: clean(q.id, 40), label: clean(q.label, 120), n: +q.n || 0, text: clean(q.text, 1000), answers,
        correct: Math.max(0, Math.min(3, +q.correct || 0)), points: Math.max(0, +q.points || 0), jokerCost: Math.max(0, +q.jokerCost || 0),
        difficulty: Math.max(1, Math.min(4, +q.difficulty || 2)), note: clean(q.note, 1500), answers_by: {}, jokerOnly: {}, openedAt: null, deadline: null, timer: null };
    }
    G.show = { screen: "question" };
    if (a === "intro") { G.phase = "intro"; pushAll(); return { ok: true }; }
    G.phase = "question"; G.cur.openedAt = now();
    const t = Math.max(0, +b.timer || 0);
    G.cur.deadline = t ? G.cur.openedAt + t * 1000 : null;
    if (t) G.cur.timer = setTimeout(closeQuestion, t * 1000 + 400);
    pushAll(); return { ok: true };
  }
  if (a === "close") { closeQuestion(); return { ok: true }; }
  if (a === "reveal") { reveal(); return { ok: true }; }
  if (a === "cancel") { if (G.cur) clearTimeout(G.cur.timer); G.cur = null; G.phase = "lobby"; G.show = { screen: "hub" }; pushAll(); return { ok: true }; }
  if (a === "adjust") {                     // manual correction of one player's points on one question
    const r = G.results[b.qid]; if (!r || !r.rows[b.pid]) return { ok: false };
    r.rows[b.pid].points = Math.max(0, r.rows[b.pid].points + (+b.delta || 0)); pushAll(); return { ok: true };
  }
  if (a === "removeResult") { delete G.results[b.qid]; G.order = G.order.filter(x => x !== b.qid); pushAll(); return { ok: true }; }
  if (a === "resetScores") {
    if (G.cur) clearTimeout(G.cur.timer);
    G.results = {}; G.order = []; G.cur = null; G.phase = "lobby"; G.show = { screen: "hub" };
    for (const p of G.players.values()) p.jokersUsed = {};
    pushAll(); return { ok: true };
  }
  if (a === "kick") {                       // exclude a player: removed from the game and cannot come back under that name
    const p = G.players.get(b.pid); if (!p) return { ok: false };
    G.players.delete(b.pid);
    if (b.ban !== false && !G.banned.some(x => x.name.toLowerCase() === p.name.toLowerCase())) G.banned.push({ name: p.name, avatar: p.avatar, at: now() });
    for (const c of clients) if (c.pid === b.pid) send(c, { type: "kicked", banned: b.ban !== false, gameId: G.gameId });
    for (const r of Object.values(G.results)) delete r.rows[b.pid];
    pushAll(); return { ok: true };
  }
  if (a === "unban") { G.banned = G.banned.filter(x => x.name.toLowerCase() !== String(b.name || "").toLowerCase()); pushAll(); return { ok: true }; }
  if (a === "avatar") {                     // the host picks the avatar of a player
    const p = G.players.get(b.pid); const av = cleanAvatar(b.avatar, true); if (!p || !av) return { ok: false };
    p.avatar = av; pushAll(); return { ok: true };
  }
  if (a === "clearPlayers") {
    for (const c of clients) if (c.role === "player") send(c, { type: "kicked" });
    const s = G.settings; G = freshState(); G.settings = s; pushAll(); return { ok: true };
  }
  if (a === "restore") {                    // the server restarted: the projected PC sends back its last copy of the game
    const s = b.snapshot; if (!s || !Array.isArray(s.players)) return { ok: false };
    if (G.players.size || G.order.length) return { ok: false, reason: "busy" };
    G.gameId = clean(s.gameId, 20) || G.gameId;
    for (const p of s.players.slice(0, MAX_PLAYERS)) if (p && p.pid && p.token) G.players.set(p.pid, { pid: p.pid, token: p.token, name: clean(p.name, 24), avatar: p.avatar, joinedAt: p.joinedAt || now(), jokersUsed: p.jokersUsed || {} });
    G.results = s.results || {}; G.order = Array.isArray(s.order) ? s.order : []; G.banned = Array.isArray(s.banned) ? s.banned : []; G.show = { screen: "hub" }; G.phase = "lobby";
    pushAll(); return { ok: true };
  }
  if (a === "snapshot") {                   // full copy (with player tokens) kept by the projected PC
    return { ok: true, snapshot: { gameId: G.gameId, players: [...G.players.values()], results: G.results, order: G.order, banned: G.banned } };
  }
  return { ok: false, error: "action inconnue" };
}
function applySettings(s) {
  const j = s.jokers || {};
  G.settings.jokers = { fifty: !!j.fifty, public: !!j.public, phone: !!j.phone };
  G.settings.jokerScope = s.jokerScope === "question" ? "question" : "game";
  G.settings.phoneSec = Math.max(5, Math.min(180, +s.phoneSec || 30));
  G.settings.autoClose = s.autoClose !== false;
  G.settings.tieSpeed = s.tieSpeed !== false;
  G.settings.jokerSounds = s.jokerSounds !== false;
  G.settings.streakBonus = !!s.streakBonus;
  G.settings.reactions = s.reactions !== false;
  G.settings.title = clean(s.title, 80); G.settings.subtitle = clean(s.subtitle, 80);
}

function playerAuth(b) {
  const p = G.players.get(b.pid);
  return p && safeEq(p.token, b.token || "") ? p : null;
}
function playerAction(path, b) {
  if (path === "join") {
    const back = b.pid && playerAuth(b);
    if (back) return { ok: true, pid: back.pid, token: back.token, gameId: G.gameId };
    const name = clean(b.name, 24);
    if (!name) return { ok: false, error: "Indiquez votre prénom." };
    if (G.banned.some(x => x.name.toLowerCase() === name.toLowerCase())) return { ok: false, banned: true, error: "L'animateur vous a retiré de cette partie." };
    if ([...G.players.values()].some(p => p.name.toLowerCase() === name.toLowerCase()))
      return { ok: false, error: "Ce nom est déjà pris : ajoutez l'initiale de votre nom (ex. : « Marie D. »)." };
    if (G.players.size >= MAX_PLAYERS) return { ok: false, error: "La partie est complète." };
    const av = cleanAvatar(b.avatar, true) || { kind: "gen", seed: rnd(1e6) };   // a player may send his own picture
    const p = { pid: rid(8), token: rid(18), name, avatar: av, joinedAt: now(), jokersUsed: {} };
    G.players.set(p.pid, p); pushAll();
    return { ok: true, pid: p.pid, token: p.token, gameId: G.gameId };
  }
  const p = playerAuth(b);
  if (!p) return { ok: false, error: "unknown", gone: true };
  if (path === "clap") {
    const c = G.clap; if (!c || now() > c.until) return { ok: false };
    const n = Math.max(0, Math.min(40, Math.round(+b.n) || 0)); if (!n) return { ok: true };
    c.total += n; c.hits.push([now(), n]); pushAll(); return { ok: true };
  }
  if (path === "avatar") {                  // the player changes his character
    const av = cleanAvatar(b.avatar, true); if (!av) return { ok: false };
    p.avatar = av; pushAll(); return { ok: true };
  }
  if (path === "react") {
    if (G.settings.reactions === false) return { ok: false };
    const e = String(b.e || ""); if (!REACTIONS.includes(e)) return { ok: false };
    const t = now(); p.reactAt = (p.reactAt || []).filter(x => t - x < 2000); if (p.reactAt.length >= 6) return { ok: false, slow: true };
    p.reactAt.push(t);
    for (const c of clients) if (c.role === "admin") send(c, { type: "react", e, pid: p.pid, name: p.name, avatar: viewAvatar(p) });
    return { ok: true };
  }
  if (!G.cur || b.qid !== G.cur.qid) return { ok: false, error: "Cette question n'est plus en cours." };
  if (path === "answer") {
    if (G.phase !== "question") return { ok: false, error: "Les réponses sont closes." };
    if (G.cur.deadline && now() > G.cur.deadline + 600) return { ok: false, error: "Temps écoulé !" };
    const prev = G.cur.answers_by[p.pid] || G.cur.jokerOnly[p.pid];
    if (prev && prev.choice != null) return { ok: false, error: "Vous avez déjà répondu." };
    const choice = +b.choice; if (![0, 1, 2, 3].includes(choice)) return { ok: false };
    if (prev && prev.gone && prev.gone.includes(choice)) return { ok: false };
    G.cur.answers_by[p.pid] = Object.assign(prev || { jokers: {} }, { choice, at: now() });
    delete G.cur.jokerOnly[p.pid];
    pushAll(); maybeAutoClose(); return { ok: true };
  }
  if (path === "joker") {
    if (G.phase !== "question") return { ok: false, error: "Les réponses sont closes." };
    const k = b.kind; if (!["fifty", "public", "phone"].includes(k) || !G.settings.jokers[k]) return { ok: false };
    let a = G.cur.answers_by[p.pid] || G.cur.jokerOnly[p.pid];
    if (a && a.choice != null) return { ok: false, error: "Vous avez déjà répondu." };
    if (!a) { a = { jokers: {} }; G.cur.jokerOnly[p.pid] = a; }
    if (a.jokers[k] || (G.settings.jokerScope === "game" && p.jokersUsed[k])) return { ok: false, error: "Joker déjà utilisé." };
    a.jokers[k] = true; p.jokersUsed[k] = true;
    if (k === "fifty") a.gone = shuffle([0, 1, 2, 3].filter(i => i !== G.cur.correct && !(a.gone || []).includes(i))).slice(0, 2);
    if (k === "public") a.vote = publicVote(G.cur.correct, G.cur.difficulty, a.gone || []);
    if (k === "phone") { a.phoneAt = now(); a.phoneUntil = a.phoneAt + G.settings.phoneSec * 1000; }
    pushAll(); return { ok: true };
  }
  return { ok: false };
}

// Avatars: generated character, emoji or initials; photos only when chosen by the host
// optional MP3s for the jokers on the phones (otherwise the phones synthesize the sounds)
// optional music files for the projected screen (otherwise a synthesized sound)
/* Music files of public/sounds, found whatever the case of their name (Question.MP3, suspense.mP3…).
   Each one gets a version (date of the file) so that a replaced file is never played from an old browser cache. */
const SOUNDS_DIR = path.join(__dirname, "public", "sounds");
function soundIndex() {
  const idx = {};
  try { for (const f of fs.readdirSync(SOUNDS_DIR)) { const m = /^(.+)\.mp3$/i.exec(f); if (!m) continue; const st = fs.statSync(path.join(SOUNDS_DIR, f)); if (st.isFile() && st.size > 0) idx[m[1].toLowerCase()] = { file: f, v: Math.round(st.mtimeMs).toString(36) + st.size.toString(36) }; } } catch (e) { }
  return idx;
}
let SND = soundIndex(), sndAt = Date.now();
const snd = () => { if (Date.now() - sndAt > 5000) { SND = soundIndex(); sndAt = Date.now(); } return SND; };
const sndVersions = () => Object.fromEntries(Object.entries(snd()).map(([n, x]) => [n, x.v]));
const PHONE_SOUNDS = ["joker-5050", "joker-public", "joker-phone", "mauvaise-reponse"];
const AV_MAX = 180000;   // characters of an avatar picture (data URL); the admin and the phones resize pictures below this
const REACTIONS = ["👏", "😂", "😮", "❤️", "🔥", "🎉"];
let clapT = null;
function clapView(admin) {
  const c = G.clap; if (!c) return null;
  const t = now(), on = t < c.until;
  c.hits = c.hits.filter(h => t - h[0] < 1500);
  const rate = c.hits.reduce((a, h) => a + h[1], 0) / 1.5;          // claps per second, over the last 1.5 s
  if (on) c.best = Math.max(c.best, rate);
  return admin ? { on, label: c.label, until: c.until, total: c.total, rate: Math.round(rate * 10) / 10, best: Math.round(c.best * 10) / 10, players: G.players.size, serverNow: t }
    : { on, label: c.label, until: c.until, serverNow: t };
}
const AV_OPTS = { hs: 10, skin: 7, hair: 10, top: 12, topKind: 3, bottom: 7, shoe: 8, pose: 3, glasses: 2, freckles: 2, beard: 2, skirt: 2, smile: 3, logo: 6 };
function cleanAvatar(a, allowImg) {
  if (!a || typeof a !== "object") return null;
  if (a.kind === "emoji") return { kind: "emoji", v: clean(a.v, 16) };
  if (a.kind === "ini") return { kind: "ini", color: /^#[0-9a-f]{6}$/i.test(a.color) ? a.color : "#3c49d6" };
  if (a.kind === "img" && allowImg && typeof a.src === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a.src) && a.src.length <= AV_MAX) return { kind: "img", src: a.src };
  if (a.kind === "gen") {
    const g = { kind: "gen", seed: Math.abs(Math.round(+a.seed) || 1) % 1e7 };
    if (a.o && typeof a.o === "object") { const o = {}; for (const [k, n] of Object.entries(AV_OPTS)) if (Number.isInteger(a.o[k]) && a.o[k] >= 0 && a.o[k] < n) o[k] = a.o[k]; if (Object.keys(o).length) g.o = o; }
    return g;
  }
  return null;
}
/* ------------------------------------------------------------------ QR code */
function qrSVG(text) {
  const qr = new QRCode(-1, QRErrorCorrectLevel.M); qr.addData(text); qr.make();
  const n = qr.getModuleCount(), q = 2; let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#0a0c62"/></svg>`;
}

/* --------------------------------------------------------------- http server */
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".mp3": "audio/mpeg", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
function serveFile(res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Page introuvable"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Content-Length": st.size,
      "Cache-Control": cache ? "public, max-age=86400" : "no-cache", "X-Content-Type-Options": "nosniff" });
    fs.createReadStream(file).pipe(res);
  });
}
function serveSound(req, res, file, versioned) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end(); }
    const etag = `"${st.size.toString(36)}-${Math.round(st.mtimeMs).toString(36)}"`;
    const h = { "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes", "ETag": etag, "Last-Modified": st.mtime.toUTCString(),
      "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "no-cache", "X-Content-Type-Options": "nosniff" };
    if (req.headers["if-none-match"] === etag) { res.writeHead(304, h); return res.end(); }
    const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (r && (r[1] || r[2])) {
      let a = r[1] ? +r[1] : st.size - +r[2], b = r[1] && r[2] ? +r[2] : st.size - 1; b = Math.min(b, st.size - 1);
      if (a > b || a < 0) { res.writeHead(416, { "Content-Range": `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { ...h, "Content-Range": `bytes ${a}-${b}/${st.size}`, "Content-Length": b - a + 1 });
      return fs.createReadStream(file, { start: a, end: b }).pipe(res);
    }
    res.writeHead(200, { ...h, "Content-Length": st.size });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}
function json(res, code, obj) { const s = JSON.stringify(obj); res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(s); }
function readBody(req, max = 200000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > max) { reject(new Error("too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  try {
    if (req.method === "GET" && (p === "/" || p === "/jouer")) return serveFile(res, path.join(PUBLIC, "player.html"));
    if (req.method === "GET" && p === "/admin") return serveFile(res, path.join(PUBLIC, "admin.html"));
    if (req.method === "GET" && p === "/api/game") return json(res, 200, { gameId: G.gameId, sounds: Object.keys(snd()), soundV: sndVersions() });
    if (req.method === "GET" && p === "/healthz") return json(res, 200, { ok: true, players: G.players.size });
    if (req.method === "GET" && p.startsWith("/api/av/")) {
      const pl = G.players.get(p.slice(8)), a = pl && pl.avatar;
      const m = a && a.kind === "img" && /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(a.src || "");
      if (!m) { res.writeHead(404); return res.end(); }
      const buf = Buffer.from(m[2], "base64");
      res.writeHead(200, { "Content-Type": m[1], "Content-Length": buf.length, "Cache-Control": "public, max-age=31536000, immutable" });
      return res.end(buf);
    }
    if (req.method === "GET" && p === "/api/souvenir") {       // the picture of the evening, drawn by each phone
      const sc = scores();
      return json(res, 200, { title: G.settings.title, subtitle: G.settings.subtitle, players: sc.list.map(e => { const pl = G.players.get(e.pid); return pl && { pid: e.pid, name: pl.name, avatar: viewAvatar(pl), points: e.points, rank: e.rank }; }).filter(Boolean) });
    }
    if (req.method === "GET" && p === "/api/qr.svg") {
      const t = (url.searchParams.get("t") || "").slice(0, 300);
      res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" }); return res.end(qrSVG(t || "https://example.com"));
    }
    if (req.method === "GET" && p === "/api/stream") {
      const role = url.searchParams.get("role");
      let c;
      if (role === "admin") {
        if (!isAdmin(url.searchParams.get("key"))) return json(res, 401, { ok: false });
        c = { res, role: "admin" };
      } else {
        const pid = url.searchParams.get("pid"), pl = G.players.get(pid);
        if (!pl || !safeEq(pl.token, url.searchParams.get("token") || "")) { res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }); res.write(`data: ${JSON.stringify({ type: "unknown" })}\n\n`); return res.end(); }
        c = { res, role: "player", pid };
      }
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" });
      res.write("retry: 2000\n\n");
      clients.add(c);
      send(c, { type: "state", state: c.role === "admin" ? adminView() : playerView(c.pid) });
      if (c.role === "player") pushAll();          // the projected screen sees the player come online
      req.on("close", () => { clients.delete(c); if (c.role === "player") pushAll(); });
      return;
    }
    if (req.method === "POST" && p === "/api/admin") {
      const b = await readBody(req, 12e6);   // a restore carries every player, pictures included
      if (!isAdmin(b.key)) return json(res, 401, { ok: false, error: "Mot de passe incorrect." });
      return json(res, 200, adminAction(b));
    }
    if (req.method === "POST" && p === "/api/admin/check") {
      const b = await readBody(req, 2000);
      return json(res, 200, { ok: isAdmin(b.key), protected: !!ADMIN_PASSWORD });
    }
    if (req.method === "POST" && ["/api/join", "/api/answer", "/api/joker", "/api/clap", "/api/react", "/api/avatar"].includes(p)) {
      const b = await readBody(req, p === "/api/join" || p === "/api/avatar" ? AV_MAX + 4000 : 5000);
      return json(res, 200, playerAction(p.slice(5), b));
    }
    if (req.method === "GET") {
      const f = path.normalize(path.join(PUBLIC, decodeURIComponent(p)));
      if (!f.startsWith(PUBLIC + path.sep)) return json(res, 403, { ok: false });
      if (p.startsWith("/sounds/")) {                // music: name case ignored, partial requests (seek, loop) supported
        const m = /^\/sounds\/([^/]+?)(\.mp3)?$/i.exec(decodeURIComponent(p)), x = m && snd()[m[1].toLowerCase()];
        return x ? serveSound(req, res, path.join(SOUNDS_DIR, x.file), url.searchParams.has("v")) : serveFile(res, f);
      }
      return serveFile(res, f);
    }
    json(res, 404, { ok: false });
  } catch (e) {
    json(res, 400, { ok: false, error: "Requête invalide." });
  }
});
server.keepAliveTimeout = 65000;
server.listen(PORT, () => {
  console.log(`Quiz en ligne prêt sur le port ${PORT}`);
  if (!ADMIN_PASSWORD) console.log("ATTENTION : la variable ADMIN_PASSWORD n'est pas définie, la page /admin n'est pas protégée.");
});
