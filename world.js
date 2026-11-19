/* Terminal Whimsy: the living world.
   The sky over the banners follows your clock, critters wander along the bottom of them, quest marks on the
   tabs show what's new since your last visit, and the wisp tells you what you missed.
   Needs app.js (window.TWX); talks through the wisp's mind (wispmind.js) when that's loaded. */
(() => {
"use strict";
const X = window.TWX;
if (!X) return;
const { D, $, store, award, REDUCE } = X;
const W = (D.WISP && D.WISP.mind) || {};     // its own lines (tools/curated.py, WISP["mind"])
const pick = a => Array.isArray(a) ? a[Math.random() * a.length | 0] : a;
const fill = (s, o = {}) => String(s || "").replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");
const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
// through the mind it won't talk over itself; without it, straight to the bubble
const say = (t, o = {}) => X.mind ? X.mind.say(t, o) : (X.wisp.talk(t, o.hold || 4000), true);
const html = document.documentElement;

/* =================== the sky: dawn, day, dusk and night, from your own clock =================== */
function sky() {
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
  const s = h >= 5 && h < 7.5 ? "dawn" : h < 17.5 && h >= 7.5 ? "day" : h >= 17.5 && h < 20.5 ? "dusk" : "night";
  if (html.dataset.sky !== s) html.dataset.sky = s;
  if (s === "dawn") setTimeout(() => award("dawn"), 4000);
}
sky(); setInterval(sky, 5 * 6e4);
// Feast of Winter Veil, 15 Dec to 2 Jan: snow on the banners
const md = (d => (d.getMonth() + 1) * 100 + d.getDate())(new Date());
if (md >= 1215 || md <= 102) html.classList.add("veil");

/* =================== quest marks: what's new since you last opened each room =================== */
const seen = store.get("roomSeen", {});
const base = k => Math.max(seen[k] || 0, X.visit.since);
let stories = null, had = null;
const ROOMS = {
  said: { list: () => X.said, tip: n => plural(n, "new post", "new posts") + " from Blizzard since your last visit" },
  changes: { list: () => X.hot, tip: n => plural(n, "new hotfix", "new hotfixes") + " since your last visit" },
  wire: { list: () => stories || [], tip: n => plural(n, "new headline", "new headlines") + " since your last visit" },
  library: { list: () => X.kb || [], tip: n => plural(n, "new guide", "new guides") + " on the shelf" },
};
function mark(el, n, tip) {
  let m = $(".qmark", el);
  if (n > 0) {
    if (!m) { m = document.createElement("span"); m.className = "qmark"; m.textContent = "!"; m.setAttribute("aria-hidden", "true"); el.append(m); }
    m.dataset.tip = tip;
  } else if (m) m.remove();
}
function marks() {
  if (!stories || X.visit.since <= 0) return;
  const now = new Set();
  for (const [r, R] of Object.entries(ROOMS)) {
    const n = X.room === r ? 0 : R.list().filter(x => X.when(x) > base(r)).length;
    const a = $(`.tabs a[data-room="${r}"]`);
    if (a) mark(a, n, R.tip(n));
    if (n) now.add(r);
  }
  // the Hotfix log switch inside Changes gets its own mark until you look at it
  const hb = $('#chgMode [data-m="hot"]');
  if (hb) { const n = X.hot.filter(x => X.when(x) > base("hotlog")).length; mark(hb, hb.getAttribute("aria-selected") === "true" ? 0 : n, ROOMS.changes.tip(n)); }
  if (!had) had = new Set([...now]);
  else if (had.size >= 2 && !now.size) award("caughtup");
}
function saw(k) { seen[k] = Date.now(); store.set("roomSeen", seen); }
addEventListener("tw:room", e => { if (ROOMS[e.detail]) saw(e.detail); marks(); });
document.addEventListener("click", e => { if (e.target.closest('#chgMode [data-m="hot"]')) { saw("hotlog"); setTimeout(marks, 0); } });

/* =================== the wisp's "while you were out" =================== */
// the news can arrive before this script runs (a fast, cached load), so take it either way
if (X.news) setTimeout(() => news(X.news.stories), 0);
else addEventListener("tw:news", e => news(e.detail && e.detail.stories), { once: true });
function news(list) {
  stories = list || [];
  marks();
  if (!X.visit.fresh || X.visit.since <= 0) return;
  const said = X.said.filter(X.isNew).length, hot = X.hot.filter(X.isNew).length, wire = stories.filter(X.isNew).length;
  const A = W.missed || {}, o = { said: plural(said, "post", "posts"), hot: plural(hot, "hotfix", "hotfixes"), wire };
  const line = said && hot ? A.both : said ? A.said : hot ? A.hot : wire >= 5 ? A.wire : null;
  if (!line) return;
  let tries = 0;
  // it waits its turn: the night-time yawn or a toast line can hold the bubble for a while
  (function tell() { if (!say(fill(pick(line), o), { gap: 1, hold: 6000 }) && ++tries < 12) setTimeout(tell, 5000); })();
}

/* =================== critters along the bottom of the banners =================== */
// Drawn here, facing right. Each one walks in from an edge, potters about and leaves. Click one to /love it.
const SVG = {
  rabbit: `<svg viewBox="0 0 40 30"><ellipse cx="12" cy="27.4" rx="5" ry="1.8" fill="#7d5c42"/><ellipse cx="17" cy="21" rx="11" ry="7.5" fill="#a98463"/><circle cx="6.5" cy="18.5" r="3.2" fill="#f3efe6"/><ellipse cx="25.6" cy="7" rx="1.9" ry="5.4" fill="#b8936f" transform="rotate(-14 25.6 7)"/><ellipse cx="25.6" cy="7.3" rx=".8" ry="3.6" fill="#e9b7a8" transform="rotate(-14 25.6 7.3)"/><ellipse cx="29.4" cy="7" rx="1.9" ry="5.4" fill="#a98463" transform="rotate(12 29.4 7)"/><circle cx="28" cy="15" r="5.6" fill="#b8936f"/><circle cx="30.6" cy="13.8" r="1.15" fill="#0a0c13"/><circle cx="33.4" cy="16.4" r=".9" fill="#e48a8a"/><ellipse cx="23" cy="27.6" rx="3.6" ry="1.5" fill="#8f6d50"/></svg>`,
  squirrel: `<svg viewBox="0 0 40 30"><path d="M13 24C3 24 1 12 5.5 6.5 9.5 2 16.5 4.5 13.6 10 11 14.5 13.5 18.5 16 21z" fill="#9b6b43"/><path d="M8 9.5c1.5-2.6 4.5-3 5.3-1" stroke="#c4925f" stroke-width="1.2" fill="none" stroke-linecap="round"/><ellipse cx="20.5" cy="22" rx="8" ry="5.4" fill="#8a5a36"/><ellipse cx="22.5" cy="23.4" rx="4.2" ry="2.6" fill="#c9a27a"/><path d="M25.6 13.5l1.3-4 2.2 3.6z" fill="#8a5a36"/><circle cx="28.4" cy="17" r="4.5" fill="#8a5a36"/><circle cx="30.2" cy="15.8" r="1" fill="#0a0c13"/><circle cx="32.8" cy="18" r=".8" fill="#2a1a10"/><ellipse cx="26" cy="27.4" rx="2.6" ry="1.3" fill="#6f4628"/><ellipse cx="16" cy="27.6" rx="3.6" ry="1.5" fill="#6f4628"/></svg>`,
  toad: `<svg viewBox="0 0 40 30"><ellipse cx="9.5" cy="27" rx="5.2" ry="2" fill="#4d6a28"/><ellipse cx="20" cy="22" rx="13" ry="7" fill="#5f7d34"/><ellipse cx="21" cy="24.6" rx="9.5" ry="3.6" fill="#9db06a"/><circle cx="17" cy="15.6" r="3" fill="#56722f"/><circle cx="25" cy="15" r="3.4" fill="#5f7d34"/><circle cx="26" cy="14.6" r="1.7" fill="#f2c56b"/><circle cx="26.4" cy="14.6" r=".8" fill="#0a0c13"/><path d="M27.5 21.2q3.8 1.2 6.2-1" stroke="#3b4f1f" stroke-width="1" fill="none" stroke-linecap="round"/><circle cx="13.5" cy="20" r="1.2" fill="#4d6a28"/><circle cx="18.5" cy="18.8" r="1" fill="#4d6a28"/><ellipse cx="29.5" cy="27.6" rx="3" ry="1.4" fill="#4d6a28"/></svg>`,
  rat: `<svg viewBox="0 0 40 30"><path d="M10.5 24C5 25.5 2 22 1.2 16.5" stroke="#c99a9a" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="18" cy="22" rx="9" ry="5.6" fill="#76727f"/><path d="M23.5 17.6Q33 18.6 35.6 23 30.6 25.2 23.5 24z" fill="#76727f"/><circle cx="24.6" cy="16.6" r="3.1" fill="#8a8694"/><circle cx="24.6" cy="16.6" r="1.6" fill="#d9a5a5"/><circle cx="29.6" cy="20" r=".9" fill="#0a0c13"/><circle cx="35.4" cy="22.8" r=".9" fill="#e8a0a0"/><ellipse cx="23.5" cy="27.4" rx="2" ry="1.1" fill="#5d5a66"/><ellipse cx="13" cy="27.4" rx="2.5" ry="1.2" fill="#5d5a66"/></svg>`,
  murloc: `<svg viewBox="0 0 40 42"><path d="M13.5 12L11.5 3.5l5 5L19 1l2.4 7.4 4.8-5L24.8 12z" fill="#d0583e"/><ellipse cx="18.5" cy="31" rx="7.2" ry="8" fill="#3f9a6b"/><ellipse cx="18.5" cy="32" rx="4.4" ry="5.4" fill="#a9d6a0"/><path d="M25 27l6.5-4.5" stroke="#3f9a6b" stroke-width="3.2" stroke-linecap="round"/><path d="M12.4 29l-4.4 4.4" stroke="#3f9a6b" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="20" cy="17" rx="9.4" ry="7.2" fill="#3f9a6b"/><path d="M19 20.5q6 4.2 11-1.6-5.2 2-11 1.6z" fill="#7a1f1f"/><circle cx="23.4" cy="14.6" r="2.3" fill="#f2e36b"/><circle cx="24" cy="14.6" r="1" fill="#0a0c13"/><ellipse cx="14.6" cy="39.6" rx="3.6" ry="1.8" fill="#2f7a52"/><ellipse cx="22.4" cy="39.6" rx="3.6" ry="1.8" fill="#2f7a52"/></svg>`,
};
const KINDS = {
  rabbit: { w: 30, v: 70, gait: "hop", n: 30 },
  squirrel: { w: 30, v: 100, gait: "scurry", n: 25 },
  toad: { w: 28, v: 34, gait: "hop", n: 20 },
  rat: { w: 30, v: 90, gait: "scurry", n: 17 },
  murloc: { w: 26, v: 62, gait: "waddle", n: 6 },
};
const COMMON = ["rabbit", "squirrel", "toad", "rat"];
function whichKind() { let r = Math.random() * Object.values(KINDS).reduce((a, k) => a + k.n, 0); for (const [k, v] of Object.entries(KINDS)) if ((r -= v.n) < 0) return k; return "rabbit"; }
function emote(text, x, y, cls = "") {
  const e = document.createElement("div");
  e.className = "emote " + cls; e.textContent = text; e.style.top = y + "px";
  document.body.append(e);
  const hw = e.offsetWidth / 2 + 8;      // keep it on screen when the critter is near an edge
  e.style.left = Math.max(hw, Math.min(innerWidth - hw, x)) + "px";
  setTimeout(() => e.remove(), 2300);
}
function hearts(x, y) {
  for (let i = 0; i < 6; i++) {
    const h = document.createElement("i");
    h.className = "heart"; h.textContent = "♥";
    h.style.left = x + (Math.random() - .5) * 18 + "px"; h.style.top = y + "px";
    h.style.setProperty("--hx", (Math.random() - .5) * 40 + "px"); h.style.animationDelay = i * 70 + "ms";
    document.body.append(h); setTimeout(() => h.remove(), 1700);
  }
}

let cur = null, timer = 0, metThisVisit = false;
const hostEl = () => { const sec = X.room && document.getElementById(X.room); return sec && !sec.hidden ? $(".hero, .banner", sec) : null; };
function plan(ms) { clearTimeout(timer); timer = setTimeout(spawn, ms); }
function spawn() {
  plan(50e3 + Math.random() * 100e3);
  if (cur || REDUCE || document.hidden) return;
  const host = hostEl(); if (!host) return;
  const hr = host.getBoundingClientRect();
  if (hr.bottom < 60 || hr.top > innerHeight - 60) return;     // its banner is scrolled away
  cur = critter(host, whichKind());
}
function critter(host, kind) {
  const K = KINDS[kind], el = document.createElement("button");
  el.type = "button"; el.className = `critter ${K.gait}`; el.style.setProperty("--cw", K.w + "px");
  el.setAttribute("aria-label", `A ${kind}. Give it some love.`);
  el.innerHTML = `<span class="g">${SVG[kind]}</span>`;
  host.append(el);
  let dir = Math.random() < .5 ? 1 : -1, x = dir > 0 ? -K.w : host.clientWidth + K.w, v = K.v;
  let state = "walk", until = performance.now() + 900 + Math.random() * 1800, last = performance.now(), dead = false, loved = false;
  el.classList.toggle("left", dir < 0); el.classList.add("walk");
  if (kind === "murloc") setTimeout(() => { const r = el.getBoundingClientRect(); if (r.width) emote("Mrglglglgl!", r.left + r.width / 2, r.top - 12, "murloc"); }, 900);
  if (!metThisVisit && Math.random() < .5) { metThisVisit = true; setTimeout(() => say(fill(pick(kind === "murloc" ? W.murloc : W.critter), { k: kind }), { gap: 60e3, hold: 3500 }), 1500); }
  el.addEventListener("click", () => {
    if (loved || dead) return;
    loved = true;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2;
    hearts(cx, r.top); emote(`You love the ${kind}.`, cx, r.top - 16);
    el.classList.remove("walk"); el.classList.add("loved");
    state = "pause"; until = performance.now() + 1300;
    const L = store.get("critterLove", {}); L[kind] = (L[kind] || 0) + 1; store.set("critterLove", L);
    award("critter");
    if (kind === "murloc") award("bannermurloc");
    if (COMMON.every(k => L[k])) award("critters");
    if (X.mind) X.mind.feel({ fun: 2 });
    setTimeout(() => { el.classList.remove("loved"); v = K.v * 2.4; }, 1000);     // then off it goes, happy
  });
  function gone() { if (dead) return; dead = true; el.remove(); if (cur && cur.el === el) cur = null; }
  (function step(t) {
    if (dead) return;
    if (!el.isConnected || host.closest(".room").hidden) return gone();
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    if (t > until) {
      if (state === "walk" && !loved) { state = "pause"; until = t + 500 + Math.random() * 1800; el.classList.remove("walk"); }
      else { if (!loved && Math.random() < .18) { dir = -dir; el.classList.toggle("left", dir < 0); } state = "walk"; until = t + (loved ? 1e9 : 700 + Math.random() * 2200); el.classList.add("walk"); }
    }
    if (state === "walk") x += dir * v * dt;
    el.style.transform = `translateX(${x}px)`;
    if (x < -K.w * 2 || x > host.clientWidth + K.w * 2) return gone();
    requestAnimationFrame(step);
  })(last);
  return { el, gone };
}
addEventListener("tw:room", () => {
  if (cur) cur.gone();
  if (REDUCE) return;
  // a fair chance of company soon after you walk in; otherwise someone wanders by later
  plan(Math.random() < .45 ? 2500 + Math.random() * 6000 : 40e3 + Math.random() * 60e3);
});
document.addEventListener("visibilitychange", () => { if (document.hidden && cur) cur.gone(); });

/* =================== the tab dozes off when you leave it =================== */
const T0 = document.title;
let doze = 0;
document.addEventListener("visibilitychange", () => {
  clearTimeout(doze);
  if (document.hidden) doze = setTimeout(() => { document.title = "zzz · " + T0; }, 60e3);
  else document.title = T0;
});

X.world = { spawn: (k = whichKind()) => { const h = hostEl(); if (h && !cur) cur = critter(h, KINDS[k] ? k : "rabbit"); return !!cur; }, marks };
})();
