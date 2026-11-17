/* Terminal Whimsy: the wisp's mind. Runs on every page, for everyone.
   Three needs that drift (fed, fun, rest), a trust in you that builds over days, a small memory of what you did,
   and every few seconds a choice about what to do next: nap, nibble the banner motes, look at something,
   show off, keep you company. It comments on what you do on the site, but rarely.
   The toybox (toybox.js, unlocked in the terminal) plugs into it through X.mind: its toys become things
   the wisp can choose to play with. Stops when the tab is hidden; with reduced motion it never flies about. */
(() => {
"use strict";
const X = window.TWX;
if (!X || X.mind) return;
const { D, $, $$, store, award, wisp, fx, burst, REDUCE, notice } = X;
const L = (D.WISP && D.WISP.mind) || {};
const rnd = n => Math.random() * n | 0, pick = a => Array.isArray(a) ? a[rnd(a.length)] : a || "";
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const fill = (s, o = {}) => String(s || "").replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");
const now = () => Date.now();
const orb = $(".orb", wisp.el), bub = $(".bubble", wisp.el), eyes = $$(".eye", wisp.el);

/* ---------------- coins: one purse for the whole site (the faire gnome's copper, the toybox) ---------------- */
const split = c => { c = Math.max(0, Math.floor(c || 0)); return [[Math.floor(c / 1e4), "g"], [Math.floor(c / 100) % 100, "s"], [c % 100, "c"]].filter(([n]) => n); };
X.coinsText = c => split(c).map(([n, u]) => n + u).join(" ") || "0c";
X.coins = c => `<span class="coins">${(split(c).length ? split(c) : [[0, "c"]]).map(([n, u]) => `<b class="c${u}">${n}</b>`).join("")}</span>`;

/* ---------------- state: needs, trust, memory ---------------- */
const M = Object.assign({ fed: 70, fun: 60, rest: 85, trust: 30, seen: 0, visits: 0, mem: {} }, store.get("mind", {}));
M.mem = M.mem || {};
let saveT = 0;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => store.set("mind", M), 1200); };
const flush = () => { M.seen = now(); store.set("mind", M); };
addEventListener("pagehide", flush);
// time away: it gets a bit peckish and bored, never miserable, and it sleeps while you're gone
const away = M.seen ? now() - M.seen : 0, awayH = away / 36e5;
if (awayH > 0) {
  M.fed = Math.min(M.fed, Math.max(40, M.fed - awayH * 5));
  M.fun = Math.min(M.fun, Math.max(40, M.fun - awayH * 6));
  M.rest = clamp(M.rest + awayH * 12);
  if (M.trust < 30) M.trust = Math.min(30, M.trust + awayH * .5);     // it forgives, slowly, back to neutral
}
if (away > 30 * 6e4 || !M.seen) M.visits++;
flush();

const STAND = [[95, "Exalted"], [80, "Revered"], [60, "Honored"], [40, "Friendly"], [20, "Neutral"], [10, "Unfriendly"], [0, "Hostile"]];
// whether it flies about on its own (the footer switch, the terminal's wisp stay / wisp roam)
const roams = () => !REDUCE && store.get("wispRoam", true) !== false;
// how it feels about you shows on its face: half-shut eyes when Unfriendly, turned half away when Hostile
function sour() { wisp.el.classList.toggle("grumpy", M.trust < 20 && M.trust >= 10); wisp.el.classList.toggle("sulk", M.trust < 10); }
const standing = (t = M.trust) => STAND.find(([n]) => t >= n)[1];
function mood() {
  if (wisp.el.classList.contains("sleep")) return "asleep";
  if (M.trust < 10) return "sulking";
  if (M.trust < 20) return "wary";
  if (M.fed < 30) return "peckish";
  if (M.rest < 25) return "sleepy";
  if (M.fun < 30) return "bored";
  if (M.fun > 70 && M.trust > 55) return "delighted";
  return "content";
}
// change how it feels. Trust moving into a new standing gets a WoW-style reputation note
function feel(d = {}) {
  const before = standing();
  for (const k of ["fed", "fun", "rest", "trust"]) if (d[k]) M[k] = clamp(M[k] + d[k]);
  const after = standing();
  if (after !== before) {
    const up = STAND.findIndex(s => s[1] === after) < STAND.findIndex(s => s[1] === before);
    notice("Reputation", `Your reputation with the wisp has ${up ? "risen" : "dropped"} to ${after}.`, up ? "achievement_reputation_01" : "spell_shadow_twilight");
    if (up && after === "Friendly") award("friendly");
    if (after === "Hostile") award("hostile");
    if (after === "Exalted") award("exalted");
    setTimeout(() => say(fill(pick(up ? L.standup : L.standdown), { s: after.toLowerCase() }), { gap: 0, hold: 3500 }), 1600);
    X.emit("standing", { from: before, to: after });
  }
  sour(); save(); fire("change");
}
const remember = (k, n = 1) => { M.mem[k] = (M.mem[k] || 0) + n; save(); return M.mem[k]; };
const recall = k => M.mem[k] || 0;

/* ---------------- talking: rarely, and never over something else it's saying ---------------- */
let lastAny = 0, lastSay = 0;
new MutationObserver(() => { if (bub.classList.contains("on")) lastAny = now(); }).observe(bub, { attributes: true, attributeFilter: ["class"] });
function say(text, { gap = 120e3, hold = 4000 } = {}) {
  if (!text || wisp.el.hidden) return false;
  if (gap && (bub.classList.contains("on") || now() - lastAny < 8000 || now() - lastSay < gap)) return false;
  lastSay = now(); wisp.talk(text, hold); return true;
}
const faceT = {};
function face(cls, ms = 2200) {
  if (wisp.el.classList.contains("dizzy") || wisp.el.classList.contains("sleep")) return;
  wisp.el.classList.add(cls); clearTimeout(faceT[cls]); faceT[cls] = setTimeout(() => wisp.el.classList.remove(cls), ms);
}

/* ---------------- you: what you're doing, and where the pointer is ---------------- */
let lastAct = now(), lastScroll = 0, px = -1, py = -1, actFun = 0;
const active = () => { const t = now(); if (t - actFun > 1000) { actFun = t; M.fun = clamp(M.fun + .05); } lastAct = t; if (napping) wake(); };
addEventListener("pointermove", e => { px = e.clientX; py = e.clientY; active(); look(); }, { passive: true });
addEventListener("keydown", active);
addEventListener("pointerdown", active, { passive: true });
let sdist = 0, swin = 0, sy = scrollY;
const ON_PAGE = new Set(["inspect", "graze", "company"]);       // activities about something on the page (toys stay put when it scrolls)
// what it was looking at moved (you scrolled, or changed rooms): it stops and flies home, rather than jumping there
const leave = () => { if (act && ON_PAGE.has(act.name)) { stop(false); begin("home", async () => {}); } };
addEventListener("scroll", () => {
  const t = now(); if (t - swin > 2000) { swin = t; sdist = 0; }
  sdist += Math.abs(scrollY - sy); sy = scrollY; lastScroll = t; active();
  leave();
  if (sdist > innerHeight * 5 && !M.mem._scrollSaid) { M.mem._scrollSaid = 1; say(pick(L.scroll), { gap: 60e3 }); }
}, { passive: true });
const idleFor = () => now() - lastAct;

// the eyes follow the pointer when it's close (and look away when it's wary of you)
let lookRaf = 0, eyeLock = false;
function look() {
  if (lookRaf || eyeLock) return;
  lookRaf = requestAnimationFrame(() => {
    lookRaf = 0;
    if (wisp.el.hidden || px < 0) return;
    const r = orb.getBoundingClientRect(), dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1;
    const k = d > 420 ? 0 : (M.trust < 20 ? -3 : 3);
    eyes.forEach(e => e.style.translate = k ? `${dx / d * k}px ${dy / d * k}px` : "");
    if (M.trust < 20 && d < 80 && !act && roams() && now() - (M.mem._dodge || 0) > 8000) dodge(dx, dy);
  });
}
function lookAt(x, y) {
  const r = orb.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1;
  eyes.forEach(e => e.style.translate = `${dx / d * 3}px ${dy / d * 3}px`);
}

/* ---------------- moving about ---------------- */
const box = () => wisp.el.getBoundingClientRect();
const osz = () => orb.getBoundingClientRect().width || 54;
const lift = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--toylift")) || 0;
function homeXY() {
  const p = store.get("wispPos", null), s = osz();
  if (p && p.x != null) return [Math.max(4, Math.min(innerWidth - s - 4, p.x * innerWidth)), Math.max(4, Math.min(innerHeight - s - 4, p.y * innerHeight))];
  return [innerWidth - s - 16, innerHeight - s - 16 - lift()];
}
let flying = null;
function fly(tx, ty, ms) {
  return new Promise(res => {
    const r = box(), x0 = r.left, y0 = r.top, d = Math.hypot(tx - x0, ty - y0);
    if (REDUCE || d < 2) { wisp.moveTo(tx, ty); res(true); return; }
    ms = ms || Math.max(420, Math.min(1500, d * 2.4));
    const t0 = performance.now(), arc = Math.min(60, d * .22);
    let raf = 0, done = false;
    const step = t => {
      if (done) return;
      const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      wisp.moveTo(x0 + (tx - x0) * e, y0 + (ty - y0) * e - Math.sin(Math.PI * k) * arc);
      if (k < 1) raf = requestAnimationFrame(step); else { done = true; flying = null; res(true); }
    };
    raf = requestAnimationFrame(step);
    flying = { stop() { if (done) return; done = true; cancelAnimationFrame(raf); flying = null; res(false); } };
  });
}
// an activity: a little async script that can be interrupted (you grab it, the tab hides, a toy goes off)
let act = null, holds = 0;
function begin(name, fn, o = {}) {
  if (act) return false;
  const me = act = { name, dead: false, timers: [], cleanup: o.cleanup || null };
  const c = {
    me,
    alive: () => !me.dead,
    wait: ms => new Promise(r => me.timers.push(setTimeout(() => r(!me.dead), ms))),
    fly: (x, y, ms) => me.dead ? Promise.resolve(false) : fly(x, y, ms),
  };
  Promise.resolve().then(() => fn(c)).catch(err => console.warn("wisp:", err)).then(async () => {
    if (act !== me) return;
    if (me.cleanup) { try { me.cleanup(); } catch {} me.cleanup = null; }
    if (o.home !== false && !me.dead) { const [x, y] = homeXY(); await fly(x, y); }
    if (act === me) { act = null; eyes.forEach(e => e.style.translate = ""); eyeLock = false; if (!me.dead) wisp.restore(); }
  });
  return true;
}
function stop(snapHome) {
  if (flying) flying.stop();
  if (!act) { if (snapHome) wisp.restore(); return; }
  const a = act; act = null; a.dead = true; a.timers.forEach(clearTimeout);
  if (a.cleanup) { try { a.cleanup(); } catch {} }
  eyeLock = false;
  if (snapHome) wisp.restore();
}
function dodge(dx, dy) {
  M.mem._dodge = now();
  const r = box(), d = Math.hypot(dx, dy) || 1;
  begin("dodge", async c => { await c.fly(r.left - dx / d * 90, r.top - dy / d * 60, 380); say(pick(L.wary), { gap: 60e3 }); await c.wait(1600); });
}

/* ---------------- choosing what to do ---------------- */
const OPTS = [];          // functions (M) -> { name, score, run, home } or null. The toybox adds its own.
const cools = {};
const cool = (k, ms) => now() - (cools[k] || 0) > ms;
const used = k => { cools[k] = now(); };
const consoleOpen = () => !!$(".console.on");
const canAct = () => !document.hidden && !wisp.el.hidden && !wisp.el.classList.contains("held") && !holds && !consoleOpen();
const roomEl = () => $(".room:not([hidden])");
const quiet = () => now() - lastScroll > 2500;
let napping = false;

// nap: you've gone quiet, or it's worn out
OPTS.push(M => {
  if (wisp.el.classList.contains("sleep") || wisp.el.classList.contains("dizzy")) return null;
  const s = (idleFor() > 75e3 ? 220 : 0) + (M.rest < 20 ? 30 : 0);
  return s ? { name: "nap", score: s, home: false, run: async c => {
    napping = true; wisp.el.classList.add("sleep"); c.me.cleanup = () => { napping = false; wisp.el.classList.remove("sleep"); };
    if (remember("naps") === 3) award("nap");
    while (await c.wait(1000)) { M.rest = clamp(M.rest + .5); if (!wisp.el.classList.contains("sleep")) break; }
  } } : null;
});
function wake() {
  if (!napping || !act || act.name !== "nap") return;
  stop(false); fire("change");
  if (Math.random() < .35) say(pick(L.wake), { gap: 180e3, hold: 3000 });
}
// graze: nibble the motes drifting over the banner at the top of the page
OPTS.push(M => {
  if (!roams() || M.fed > 55 || !cool("graze", 100e3) || !quiet()) return null;
  const b = roomEl() && $(":scope > .hero, :scope > .banner", roomEl()), r = b && b.getBoundingClientRect();
  if (!r || r.bottom < 160 || r.top > innerHeight - 160) return null;
  return { name: "graze", score: 60 - M.fed, run: async c => {
    used("graze"); say(pick(L.hungry), { gap: 240e3, hold: 2500 });
    const top = Math.max(r.top, 70), bot = Math.min(r.bottom, innerHeight - 90);
    for (let k = 0; k < 3; k++) {
      if (!await c.fly(r.left + r.width * (.2 + Math.random() * .6), top + (bot - top) * Math.random())) return;
      wisp.el.classList.add("nom");
      for (let j = 0; j < 3; j++) { const o = box(); burst(o.left + o.width / 2, o.top + 8, 4, .35); if (!await c.wait(450)) { wisp.el.classList.remove("nom"); return; } }
      wisp.el.classList.remove("nom"); feel({ fed: 9 });
    }
    award("graze"); say(pick(L.nom), { gap: 300e3, hold: 2500 });
  } };
});
// inspect: float over to something on screen and have a look
OPTS.push(M => {
  if (!roams() || M.trust < 20 || !cool("inspect", 75e3) || idleFor() > 60e3 || !quiet() || !roomEl()) return null;
  return { name: "inspect", score: 14 + (M.fun < 50 ? 10 : 0), run: async c => {
    used("inspect");
    const s = osz(), list = $$("h2, h3, .ic, .cd, .door, .post, .slot.on", roomEl()).filter(el => { const r = el.getBoundingClientRect(); return r.width > 14 && r.top > 80 && r.bottom < innerHeight - 110 && r.left > 0 && r.right < innerWidth; });
    if (!list.length) return;
    const el = pick(list), r = el.getBoundingClientRect();
    const x = r.right + s + 12 < innerWidth ? r.right + 8 : Math.max(4, r.left - s - 8), y = Math.max(70, r.top + r.height / 2 - s / 2 - 10);
    if (!await c.fly(x, y)) return;
    eyeLock = true; lookAt(r.left + r.width / 2, r.top + r.height / 2);
    if (Math.random() < .4) { const id = roomEl().id; say(pick((L.room || {})[id] || L.inspect), { gap: 150e3, hold: 3200 }); }
    await c.wait(2400 + rnd(1600)); eyeLock = false;
  } };
});
// show off: a loop-the-loop when it's having a good time
OPTS.push(M => (REDUCE || M.fun < 65 || M.rest < 40 || !cool("trick", 110e3)) ? null : { name: "trick", score: 10, home: false, run: async c => {
  used("trick"); wisp.el.classList.add("trick"); const o = box(); burst(o.left + o.width / 2, o.top + o.height / 2, 10, .6);
  await c.wait(1100); wisp.el.classList.remove("trick");
} });
// keep you company: when it trusts you and you've stopped to read
OPTS.push(M => (!roams() || M.trust < 60 || px < 0 || !cool("company", 300e3) || idleFor() < 8e3 || idleFor() > 40e3 || !quiet()) ? null : { name: "company", score: 9, run: async c => {
  used("company"); const s = osz();
  if (!await c.fly(Math.min(innerWidth - s - 8, px + 34), Math.min(innerHeight - s - 8 - lift(), py + 20))) return;
  say(pick(L.company), { gap: 600e3, hold: 3000 }); await c.wait(5000);
} });
// bored: says so, now and then
OPTS.push(M => M.fun > 25 || !cool("bored", 300e3) ? null : { name: "bored", score: 12, home: false, run: async () => { used("bored"); say(pick(L.bored), { gap: 120e3 }); } });

OPTS.push(M => (M.trust >= 10 || !cool("sulk", 90e3)) ? null : { name: "sulk", score: 60, run: async c => {
  used("sulk"); say(pick(L.sulk), { gap: 60e3, hold: 2500 });
  if (roams()) { const s = osz(), [x0] = homeXY(); await c.fly(x0 > innerWidth / 2 ? 16 : innerWidth - s - 16, innerHeight - s - 16 - lift()); }
  await c.wait(20000);
} });

let timer = 0, lastTick = now();
const subs = {};
const on = (k, f) => (subs[k] = subs[k] || []).push(f);
const fire = (k, d) => (subs[k] || []).forEach(f => { try { f(d); } catch (e) { console.warn(e); } });
function tick() {
  const t = now(), m = Math.min(1, (t - lastTick) / 6e4); lastTick = t;     // minutes since the last tick (capped)
  M.fed = clamp(M.fed - .35 * m); M.fun = clamp(M.fun - .5 * m); if (!napping) M.rest = clamp(M.rest - .25 * m);
  save(); fire("change");
}
function think() {
  timer = 0; tick();
  if (canAct() && !act) {
    const opts = [];
    for (const f of OPTS) { try { const o = f(M); if (o && o.score > 0) opts.push(o); } catch (e) { console.warn(e); } }
    let r = Math.random() * opts.reduce((s, o) => s + o.score, 40);
    for (const o of opts) { r -= o.score; if (r <= 0) { begin(o.name, o.run, o); break; } }
  }
  schedule(3000 + rnd(3000));
}
function schedule(ms) { clearTimeout(timer); if (!document.hidden) timer = setTimeout(think, ms); }
const nudge = (ms = 300) => schedule(ms);     // something just happened (a toy landed): think soon

/* ---------------- what you do on the site ---------------- */
let hiddenAt = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hiddenAt = now(); clearTimeout(timer); timer = 0; stop(true); flush(); return; }
  const gone = now() - hiddenAt; lastAct = lastTick = now();
  if (hiddenAt && gone > 20 * 6e4) setTimeout(() => say(pick(L.back), { gap: 30e3, hold: 3000 }), 900);
  schedule(2000);
});
addEventListener("hashchange", leave);
addEventListener("tw:award", () => { feel({ fun: 3 }); face("happy", 2500); });
addEventListener("tw:wisp", e => {
  const t = e.detail && e.detail.type;
  if (t === "grab") { stop(false); return; }
  if (t === "poke") { if (act && act.name !== "nap") { stop(false); setTimeout(goHomeIfIdle, 2500); } const n = remember("_pokes"); feel({ fun: 2, trust: n % 3 === 0 && recall("_pokeTrust") < 4 ? (remember("_pokeTrust"), 1) : 0 }); return; }
  if (t === "drop") feel({ fun: 2 });
  if (t === "shake") feel({ trust: -1, fun: 3, rest: -3 });
  if (t === "dunk") { remember("dunks"); feel({ trust: -3, fun: 5 }); }
  if (t === "fished") feel({ trust: 4, fun: 5 });
  if (t === "hug") { feel({ trust: 3, fun: 3 }); face("happy", 2500); }
  if (t === "kill") feel({ trust: -2 });
});
M.mem._pokes = 0; M.mem._pokeTrust = 0; M.mem._scrollSaid = 0;        // pokes only build a little trust per visit
function goHomeIfIdle() { if (!act && canAct()) begin("home", async () => {}); }
// picking a class
let lastCls = null;
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("#clsFilter [data-k], #gearPick [data-k]");
  if (b && b.dataset.k && b.dataset.k !== lastCls) { lastCls = b.dataset.k; say(pick(M.trust < 10 ? L.sulk : (L.cls || {})[b.dataset.k]), { gap: 25e3, hold: 3500 }); }
  const a = e.target.closest && e.target.closest("a[target=_blank]");
  if (a && Math.random() < .3) say(pick(L.away), { gap: 180e3, hold: 2500 });
});
// searching: help when nothing turns up
let searchT = 0;
document.addEventListener("input", e => {
  if (!e.target.matches || !e.target.matches("input.search")) return;
  clearTimeout(searchT);
  searchT = setTimeout(() => {
    const q = e.target.value.trim(); if (q.length < 3) return;
    const empty = roomEl() && $$(".empty", roomEl()).some(el => el.offsetParent);
    if (M.trust < 10) return;
    if (empty) say(fill(pick(L.search_none), { q: q.slice(0, 24) }), { gap: 30e3, hold: 4000 });
    else if (Math.random() < .15) say(fill(pick(L.search), { q: q.slice(0, 24) }), { gap: 240e3, hold: 3000 });
  }, 1600);
});
let copied = false;
document.addEventListener("copy", e => { if (copied || (e.target.closest && e.target.closest(".console"))) return; copied = true; say(pick(L.copy), { gap: 30e3, hold: 3500 }); });

/* ---------------- the toybox: loaded only once it's unlocked, and only while it's on ---------------- */
function setRoam(on) {
  store.set("wispRoam", !!on); if (!on) stop(true); drawRoam(); fire("change");
  say(pick(on ? L.roam : L.stay), { gap: 0, hold: 2500 });
}
function drawRoam() {
  const b = $("#roamToggle"); if (!b) return;
  const on = store.get("wispRoam", true) !== false;
  b.setAttribute("aria-pressed", on); b.lastElementChild.textContent = on ? "Let it roam: on" : "Let it roam: off";
}
if ($("#roamToggle")) $("#roamToggle").addEventListener("click", () => setRoam(store.get("wispRoam", true) === false));
drawRoam(); sour();
const toy = () => store.get("toy", null);
function loadToybox() {
  if (X.toybox) { X.toybox.enable(); return; }
  if ($("#toyboxScript")) return;
  const s = document.createElement("script"); s.id = "toyboxScript";
  s.src = ($("#toyboxJs") && $("#toyboxJs").dataset.src) || "toybox.js";
  document.body.append(s);
}
function setToybox(on) {
  const t = toy(); if (!t || !t.unlocked) return false;
  t.on = !!on; store.set("toy", t);
  if (on) loadToybox(); else if (X.toybox) X.toybox.disable();
  drawToggle(); return true;
}
function unlockToybox() {
  const t = toy() || {};
  if (t.unlocked) return false;
  store.set("toy", { ...t, unlocked: now(), on: true });
  loadToybox(); drawToggle(); return true;
}
// the footer switch, there once it's unlocked
function drawToggle() {
  const row = $("#toyRow"), b = $("#toyToggle"), t = toy();
  if (!row || !b) return;
  row.hidden = !(t && t.unlocked);
  const isOn = !!(t && t.on !== false);
  b.setAttribute("aria-pressed", isOn); b.lastElementChild.textContent = isOn ? "Toybox: on" : "Toybox: off";
}
if ($("#toyToggle")) $("#toyToggle").addEventListener("click", () => { const t = toy(); setToybox(!(t && t.on !== false)); });
drawToggle();
if (toy() && toy().unlocked && toy().on !== false) loadToybox();
// back after a long while: say what's new on the wire, if anything
if (awayH > 8 && M.visits > 1) setTimeout(() => {
  const n = parseInt(($('[data-count="wire"]') || {}).textContent, 10), isNew = /new/.test(($('[data-count="wire"]') || {}).textContent || "");
  say(isNew && n ? fill(pick(L.backnews), { n }) : pick(L.back), { gap: 30e3, hold: 4000 });
}, 6500);

// for the terminal: /proc/wisp/status
const bar = v => "█".repeat(Math.round(v / 10)) + "░".repeat(10 - Math.round(v / 10));
function status() {
  const seals = (store.get("seals", []) || []).length;
  return `Name:    wispd
State:   ${wisp.el.hidden ? "S (out of sight)" : wisp.el.classList.contains("sleep") ? "S (sleeping)" : act ? `R (${act.name})` : "S (watching you)"}
Pid:     7
Mood:    ${mood()}
Fed:     ${bar(M.fed)} ${Math.round(M.fed)}%
Fun:     ${bar(M.fun)} ${Math.round(M.fun)}%
Rest:    ${bar(M.rest)} ${Math.round(M.rest)}%
Trust:   ${standing()} (${Math.round(M.trust)}/100)
Memory:  ${seals >= 7 ? "all 7 fragments restored" : `${7 - seals} of 7 fragments unreachable`}
Sparkle: 100%`;
}

X.mind = { M, say, feel, face, mood, standing, remember, recall, fly, begin, stop, nudge, homeXY, osz, lookAt, idleFor, setRoam, get roams() { return roams(); }, lift,
  pointer: () => [px, py], get act() { return act; }, get napping() { return napping; }, hold(v) { holds = Math.max(0, holds + (v ? 1 : -1)); if (v) stop(false); },
  addOption: f => { OPTS.push(f); return f; }, removeOption: f => { const i = OPTS.indexOf(f); if (i >= 0) OPTS.splice(i, 1); }, cool, used, on, fire,
  lines: L, fill, pick, status, unlockToybox, setToybox, drawToggle, get toyOn() { const t = toy(); return !!(t && t.unlocked && t.on !== false); } };
// when the night sleep or the oneko follow is on, leave it be
const _follow = X.follow;
if (_follow) X.follow = (...a) => { X.mind.hold(true); setTimeout(() => X.mind.hold(false), 15500); return _follow(...a); };
schedule(5000);
})();
