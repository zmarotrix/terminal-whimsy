/* Terminal Whimsy: Forever briefing. Five rooms behind tabs; renders data.js (curated) + data/news.json (refreshed by a GitHub Action). */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const D = window.TW;
D.TIPS = D.TIPS || {};
const ICON = n => (window.TW_ICONS && TW_ICONS[n]) || ("img/icons/" + n + ".png");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem("tw." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("tw." + k, JSON.stringify(v)); } catch {} }
};
const NOW = new Date(), DAY = 864e5;
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmtDate = (d, o = { day: "numeric", month: "short", year: "numeric" }) => new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString(undefined, o);
const ago = t => {
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 90) return "just now";
  if (s < 3600) return Math.round(s / 60) + "m ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  if (s < 86400 * 14) return Math.round(s / 86400) + "d ago";
  return fmtDate(String(t).slice(0, 10));
};
const icon = (name, cls = "", tipText = "") => `<span class="ic ${cls}"${tipText ? ` data-tip="${esc(tipText)}"` : ""}><img src="${ICON(name)}" alt="" loading="lazy" decoding="async"></span>`;
const src = arr => (arr || []).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(" · ");
const CL = D.CLASSES, AREAS = D.AREAS;

/* ---------------- tooltip ---------------- */
const tip = $("#tip");
let tipOn = null;
function showTip(el, x, y) {
  const h = el.dataset.tiph ? (D.TIPS[el.dataset.tiph] || "") : `<div class="s">${esc(el.dataset.tip)}</div>`;
  if (!h) return;
  tip.innerHTML = h; tip.classList.add("on"); tipOn = el; moveTip(x, y);
}
function moveTip(x, y) {
  const r = tip.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  let L = x + 16, T = y + 16;
  if (L + r.width > W - 8) L = Math.max(8, x - r.width - 16);
  if (T + r.height > H - 8) T = Math.max(8, y - r.height - 16);
  tip.style.left = L + "px"; tip.style.top = T + "px";
}
const hideTip = () => { tip.classList.remove("on"); tipOn = null; };
document.addEventListener("pointerover", e => { const el = e.target.closest("[data-tip],[data-tiph]"); if (el && el !== tipOn && e.pointerType !== "touch") showTip(el, e.clientX, e.clientY); });
document.addEventListener("pointermove", e => { if (tipOn) moveTip(e.clientX, e.clientY); });
document.addEventListener("pointerout", e => { if (tipOn && !tipOn.contains(e.relatedTarget)) hideTip(); });

/* ---------------- sparkle layer ---------------- */
const COLS = ["124,242,154", "232,137,255", "124,200,255", "242,197,107"];
function star(cx, x, y, r, rot = 0) {
  cx.beginPath();
  for (let k = 0; k < 8; k++) { const a = rot + k * Math.PI / 4, rr = k % 2 ? r * .32 : r; cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  cx.closePath(); cx.fill();
}
const fx = (() => {
  const cv = document.createElement("canvas"); cv.className = "fx"; cv.setAttribute("aria-hidden", "true"); document.body.append(cv);
  const cx = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
  const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
  size(); addEventListener("resize", size);
  const P = []; let running = false;
  function loop() {
    cx.clearRect(0, 0, cv.width, cv.height);
    for (let k = P.length - 1; k >= 0; k--) {
      const q = P[k];
      q.x += q.vx; q.y += q.vy; q.vy += q.g; q.vx *= .985; q.life -= q.decay; q.rot += q.spin;
      if (q.life <= 0) { P.splice(k, 1); continue; }
      cx.globalAlpha = Math.min(1, q.life * 1.4); cx.fillStyle = `rgb(${q.c})`; cx.shadowColor = `rgb(${q.c})`; cx.shadowBlur = 10 * dpr;
      star(cx, q.x * dpr, q.y * dpr, q.r * dpr * (.6 + q.life * .4), q.rot);
    }
    cx.globalAlpha = 1;
    if (P.length) requestAnimationFrame(loop); else running = false;
  }
  const add = q => { P.push(q); if (!running) { running = true; requestAnimationFrame(loop); } };
  return {
    burst(x, y, n = 22, spread = 1) {
      if (REDUCE) return;
      for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, s = (1.5 + Math.random() * 4.5) * spread;
        add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, g: .09, r: 3 + Math.random() * 5, c: COLS[k % 4], life: 1, decay: .012 + Math.random() * .016, rot: Math.random() * 3, spin: (Math.random() - .5) * .2 }); }
    },
    shower(n = 160) {
      if (REDUCE) return;
      for (let k = 0; k < n; k++) add({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .8, vx: (Math.random() - .5) * 1.2, vy: 1.5 + Math.random() * 3, g: .02, r: 3 + Math.random() * 6, c: COLS[k % 4], life: 1, decay: .0045 + Math.random() * .004, rot: Math.random() * 3, spin: (Math.random() - .5) * .15 });
    },
    trail(x, y) {
      add({ x: x + (Math.random() - .5) * 8, y: y + (Math.random() - .5) * 8, vx: (Math.random() - .5) * .6, vy: .2 + Math.random() * .6, g: .01, r: 1.6 + Math.random() * 2.4, c: COLS[(Math.random() * 4) | 0], life: .8, decay: .03, rot: Math.random() * 3, spin: .05 });
    }
  };
})();
const burst = fx.burst;
if (!REDUCE && matchMedia("(pointer: fine)").matches) {
  let last = 0, lx = 0, ly = 0;
  addEventListener("pointermove", e => {
    const now = performance.now();
    if (now - last < 34 || Math.hypot(e.clientX - lx, e.clientY - ly) < 14) return;
    last = now; lx = e.clientX; ly = e.clientY; fx.trail(e.clientX, e.clientY);
  }, { passive: true });
}
// drifting motes over an image, shy of the cursor
function motes(cv, n) {
  if (!cv) return;
  const cx = cv.getContext("2d"), box = cv.parentElement, dpr = Math.min(2, devicePixelRatio || 1);
  let W = 1, H = 1, vis = false, mx = -1e4, my = -1e4;
  const size = () => { const r = box.getBoundingClientRect(); W = cv.width = Math.max(1, r.width * dpr); H = cv.height = Math.max(1, r.height * dpr); };
  size(); new ResizeObserver(size).observe(box);
  const P = Array.from({ length: n }, (_, k) => ({ x: Math.random(), y: Math.random(), r: .7 + Math.random() * 2.3, v: .00025 + Math.random() * .0011, c: COLS[k % 4], p: Math.random() * 6, s: Math.random() < .16, dx: 0, dy: 0 }));
  new IntersectionObserver(e => { vis = e[0].isIntersecting; }).observe(box);
  box.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); mx = (e.clientX - r.left) * dpr; my = (e.clientY - r.top) * dpr; });
  box.addEventListener("pointerleave", () => { mx = my = -1e4; });
  if (REDUCE) { P.forEach(q => { cx.fillStyle = `rgba(${q.c},.6)`; cx.beginPath(); cx.arc(q.x * W, q.y * H, q.r * dpr, 0, 7); cx.fill(); }); return; }
  (function frame(t) {
    if (vis) {
      cx.clearRect(0, 0, W, H);
      for (const q of P) {
        q.y -= q.v; q.x += Math.sin(t / 2400 + q.p) * .00035;
        if (q.y < -.04) { q.y = 1.04; q.x = Math.random(); }
        const px = q.x * W + q.dx, py = q.y * H + q.dy, d = Math.hypot(px - mx, py - my), R = 140 * dpr;
        if (d < R) { const f = (1 - d / R) * 3.2; q.dx += (px - mx) / (d || 1) * f; q.dy += (py - my) / (d || 1) * f; }
        q.dx *= .94; q.dy *= .94;
        const near = d < R ? 1 - d / R : 0, a = Math.min(1, .3 + .35 * Math.sin(t / 650 + q.p) + near * .6);
        cx.fillStyle = `rgba(${q.c},${a})`; cx.shadowColor = `rgba(${q.c},1)`; cx.shadowBlur = 12 * dpr;
        if (q.s) star(cx, px, py, (q.r * 2.6 + near * 3) * dpr, t / 1800 + q.p);
        else { cx.beginPath(); cx.arc(px, py, (q.r + near * 1.2) * dpr, 0, 7); cx.fill(); }
      }
    }
    requestAnimationFrame(frame);
  })(0);
}

/* ---------------- achievements (secret ones stay "???" until found; counts unlock titles) ---------------- */
// small page events the wisp's mind (wispmind.js) and the toybox listen for: tw:award, tw:wisp
const emit = (type, detail) => dispatchEvent(new CustomEvent("tw:" + type, { detail }));
const ACH = D.ACH, got = store.get("ach", {}), toasts = $(".toasts");
function award(id) {
  if (got[id] || !ACH[id]) return;
  got[id] = Date.now(); store.set("ach", got); emit("award", id);
  if (window.TWLOG) window.TWLOG.push("found", { id, n: Object.keys(got).length });
  const a = ACH[id], t = document.createElement("div");
  t.className = "toast" + (a.secret ? " secret" : "");
  t.innerHTML = `<img src="${ICON(a.i)}" alt=""><div><div class="a">${a.secret ? "SECRET FOUND" : "ACHIEVEMENT EARNED"}</div><div class="b">${esc(a.n)}</div><div class="c">${esc(a.d)}</div></div>`;
  toasts.append(t); setTimeout(() => t.remove(), 4300);
  setTimeout(() => { const r = t.getBoundingClientRect(); burst(r.left + 32, r.top + r.height / 2, a.secret ? 50 : 30); }, 250);
  const before = title();
  xp();
  if (title() !== before) setTimeout(() => wisp.talk(`> new title unlocked: ${who()}. wear it with pride.`, 4000), 1500);
  if (Object.keys(got).filter(x => ACH[x]).length >= 25) award("maxx");
}
const count = () => Object.keys(got).filter(x => ACH[x]).length;
const title = () => (D.TITLES || []).filter(([n]) => count() >= n).pop()?.[1] || "";
const who = () => `${store.get("name", "Adventurer")} ${title()}`;
function xp() {
  const ids = Object.keys(ACH), k = count();
  // secret achievements don't exist, as far as the list is concerned, until you earn one
  const shown = ids.filter(x => !ACH[x].secret || got[x]);
  $(".xpbar i").style.setProperty("--xp", (100 * k / ids.length) + "%");
  $(".xp .v").textContent = k;
  const next = (D.TITLES || []).find(([n]) => n > k);
  const cats = [...new Set(shown.map(x => ACH[x].cat || "Briefing"))];
  const li = x => `<li class="${got[x] ? "got" : ""}"><img src="${ICON(ACH[x].i)}" alt=""><div><b>${esc(ACH[x].n)}</b>${esc(ACH[x].d)}</div></li>`;
  $("#achs").innerHTML = `<h3>${esc(who())}</h3><p class="achsub">${k} achievement${k === 1 ? "" : "s"} · ${k * 10} points${next ? ` · ${next[0] - k} more for your next title` : ""}</p>` +
    cats.map(c => {
      const mine = shown.filter(x => (ACH[x].cat || "Briefing") === c).sort((a, b) => !!got[b] - !!got[a]);
      const secretish = ids.some(x => (ACH[x].cat || "Briefing") === c && ACH[x].secret), n = mine.filter(x => got[x]).length;
      return `<h4 class="achcat">${esc(c)} <span>${secretish ? `${n} found` : `${n}/${mine.length}`}</span></h4><ul>${mine.map(li).join("")}</ul>`;
    }).join("") + (shown.length < ids.length ? `<p class="achsub" style="margin-top:1rem">✦ Some achievements only appear once you find them.</p>` : "");
}
$(".xp").addEventListener("click", e => { e.stopPropagation(); $("#achs").hidden = !$("#achs").hidden; });
document.addEventListener("click", e => { if (!e.target.closest("#achs,.xp")) $("#achs").hidden = true; });

// a plain toast, for news that isn't an achievement
function notice(head, body, icon = "spell_holy_mindvision") {
  const t = document.createElement("div"); t.className = "toast";
  t.innerHTML = `<img src="${ICON(icon)}" alt=""><div><div class="a">${esc(head)}</div><div class="c">${esc(body)}</div></div>`;
  toasts.append(t); setTimeout(() => t.remove(), 4300);
}

/* ---------------- the wisp: pokeable, draggable, gets dizzy, sleeps at night, can turn gold ---------------- */
const pick = a => a[Math.floor(Math.random() * a.length)];
const wisp = (() => {
  const el = document.createElement("div");
  el.className = "wisp"; el.hidden = store.get("wispGone", false);
  el.innerHTML = `<div class="bubble" role="status" aria-live="polite"><span class="say"></span><button class="x" aria-label="Send the wisp away" data-tip="Send the wisp away (type wisp to call it back)">×</button></div>
    <button class="orb" aria-label="Poke the wisp, or drag it somewhere"><span class="eye"></span><span class="eye"></span></button>`;
  document.body.append(el);
  const say = $(".say", el), bub = $(".bubble", el), orb = $(".orb", el);
  let typing = 0, hideT = 0, pokes = 0, recent = [];
  if (store.get("wispGold", false)) el.classList.add("gold");
  // the wisp's box is exactly the orb; the bubble hangs off it, on whichever side has room
  const osize = () => orb.getBoundingClientRect().width || 54;
  function place(p) {
    if (!p || p.x == null) return;
    const s = osize(), x = Math.max(4, Math.min(innerWidth - s - 4, p.x * innerWidth)), y = Math.max(4, Math.min(innerHeight - s - 4, p.y * innerHeight));
    el.style.left = x + "px"; el.style.top = y + "px"; el.style.right = el.style.bottom = "auto";
    el.classList.toggle("left", x + s / 2 < innerWidth / 2);
    el.classList.toggle("low", y < 170);
  }
  place(store.get("wispPos", null));
  addEventListener("resize", () => place(store.get("wispPos", null)));
  function talk(text, hold = 6000) {
    if (el.hidden || !text) return;
    clearTimeout(typing); clearTimeout(hideT);
    bub.classList.add("on"); say.textContent = "";
    let i = 0;
    const step = () => { say.textContent = text.slice(0, ++i); if (i < text.length) typing = setTimeout(step, REDUCE ? 0 : 22); };
    step();
    hideT = setTimeout(() => bub.classList.remove("on"), hold + text.length * 22);
  }
  function poke() {
    if (api.onPoke && api.onPoke()) return;        // the toybox's ice block and sheep take pokes their own way
    emit("wisp", { type: "poke" });
    if (el.classList.contains("sleep")) { el.classList.remove("sleep"); talk("> mm? oh, hello. i was resting my eyes."); return; }
    const r = orb.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 18);
    el.classList.remove("boing"); void el.offsetWidth; el.classList.add("boing");
    const now = Date.now(); recent = recent.filter(t => now - t < 4000); recent.push(now);
    if (recent.length >= 8 && !el.classList.contains("dizzy")) {
      el.classList.add("dizzy"); talk(D.WISP.dizzy, 2500); award("dizzy"); recent = [];
      setTimeout(() => el.classList.remove("dizzy"), 3500); return;
    }
    pokes++; if (pokes >= 5) award("wisp");
    const tips = D.WISP.poke;
    talk(pokes === 1 ? D.WISP.hello : tips[(pokes - 2 + tips.length) % tips.length]);
  }
  // drag: a press that moves more than a few pixels carries the wisp; a still press is a poke
  let drag = null;
  orb.addEventListener("pointerdown", e => {
    const r = el.getBoundingClientRect();
    // remember where on the orb you grabbed it, so the orb stays exactly under the pointer
    drag = { sx: e.clientX, sy: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, moved: false, trail: [] };
    orb.setPointerCapture(e.pointerId);
    emit("wisp", { type: "grab" });
  });
  orb.addEventListener("pointermove", e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 7) return;
    drag.moved = true; el.classList.add("held"); hideTip();
    // shaking: count quick reversals of direction (either axis) while held
    const ax = Math.abs(e.clientX - (drag.lx ?? e.clientX)) >= Math.abs(e.clientY - (drag.ly ?? e.clientY)) ? "x" : "y";
    const d = ax === "x" ? e.clientX - (drag.lx ?? e.clientX) : e.clientY - (drag.ly ?? e.clientY), now = Date.now();
    if (Math.abs(d) > 5) { const sg = Math.sign(d); if (drag.sg && sg !== drag.sg) (drag.flips = drag.flips || []).push(now); drag.sg = sg; }
    drag.lx = e.clientX; drag.ly = e.clientY;
    drag.flips = (drag.flips || []).filter(t => now - t < 900);
    if (drag.flips.length >= 5) { drag.flips = []; shaken(); }
    drag.p = { x: (e.clientX - drag.ox) / innerWidth, y: (e.clientY - drag.oy) / innerHeight };
    place(drag.p);
    drag.trail.push([performance.now(), e.clientX, e.clientY]); if (drag.trail.length > 6) drag.trail.shift();   // for throwing
  });
  orb.addEventListener("pointercancel", () => { drag = null; el.classList.remove("held"); });
  // shaken, not stirred
  let shakes = 0, lastShake = 0, dizzyT = 0;
  const SHAKE_LINES = ["> WHOA. WHOA. WHOA.", "> i am not a snow globe!", "> everything is spinning and also sparkly", "> please. i have a delicate arcane constitution.", "> put me DOWN. the room is a blender.", "> i can see the Twisting Nether from here"];
  function shaken() {
    const now = Date.now(); if (now - lastShake < 700) return; lastShake = now;
    shakes++;
    el.classList.add("dizzy", "shook");
    const r = orb.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 14 + Math.min(40, shakes * 6), .9);
    award("shaken"); emit("wisp", { type: "shake" });
    if (shakes === 3) { award("shaken3"); talk("> FINE. here. take some sparkles. now please stop.", 3000); fx.shower(60); }
    else talk(SHAKE_LINES[(shakes - 1) % SHAKE_LINES.length], 1800);
    clearTimeout(dizzyT);
    dizzyT = setTimeout(() => { el.classList.remove("dizzy", "shook"); if (!drag) talk(pick(["> ...okay. i'm okay. the floor is where i left it.", "> i'll be seeing two of you for a while.", "> never do that again. (do it again.)"]), 2500); }, 2600);
  }
  orb.addEventListener("pointerup", e => {
    if (!drag) return;
    const d = drag; drag = null; el.classList.remove("held");
    if (!d.moved) { poke(); return; }
    // dropped onto something that wants it (the faire pond, say)?
    if (api.onDrop) { orb.style.pointerEvents = "none"; const under = document.elementFromPoint(e.clientX, e.clientY); orb.style.pointerEvents = ""; if (api.onDrop(under, e.clientX, e.clientY)) return; }
    // let go while moving fast: thrown, if the toybox is out (velocity in px per ms over the last few moves)
    const tr = d.trail.filter(s => performance.now() - s[0] < 120), a = tr[0], b = tr[tr.length - 1];
    if (api.onFling && a && b && b[0] > a[0]) { const r = el.getBoundingClientRect(); if (api.onFling((b[1] - a[1]) / (b[0] - a[0]), (b[2] - a[2]) / (b[0] - a[0]), r.left, r.top)) return; }
    emit("wisp", { type: "drop" });
    store.set("wispPos", d.p); award("wrangler");
    el.classList.remove("boing"); void el.offsetWidth; el.classList.add("boing");
    talk(["> wheee!", "> ooh, nice view from here.", "> put me down gently next time.", "> i live here now."][Math.random() * 4 | 0], 2500);
  });
  orb.addEventListener("click", e => e.preventDefault());
  orb.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); poke(); } });
  $(".x", el).addEventListener("click", () => { el.hidden = true; store.set("wispGone", true); hideTip(); });
  const api = {
    talk, poke, el,
    sleep() { el.classList.add("sleep"); },
    gold(on = true) { el.classList.toggle("gold", on); store.set("wispGold", on); },
    show() { el.hidden = false; store.set("wispGone", false); },
    // bring the wisp back from wherever it went, whatever went wrong. Not out of the pond, though: that takes a fishing pole
    call() {
      if (store.get("wispInPond", null)) return false;
      store.set("wispGone", false); el.hidden = false;
      el.classList.remove("sleep", "dizzy", "shook", "sink", "held"); this.home();
      el.classList.remove("boing"); void el.offsetWidth; el.classList.add("boing");
      setTimeout(() => talk("> you called? i'm here!", 3000), 150);
      return true;
    },
    home() { store.set("wispPos", null); el.style.left = el.style.top = el.style.right = el.style.bottom = ""; el.classList.remove("left", "low"); },
    moveTo(x, y) { place({ x: x / innerWidth, y: y / innerHeight }); },       // for /follow and friends
    restore() { const p = store.get("wispPos", null); if (p && p.x != null) place(p); else this.home(); },
  };
  return api;
})();

// the footer's rescue button: works whatever happened to him, except the pond
const callBtn = $("#callWisp");
if (callBtn) callBtn.addEventListener("click", () => { if (!wisp.call()) notice("Blub", "The wisp is at the bottom of the faire pond. Fish it out."); });

/* ---------------- rooms (tabs) ---------------- */
const ROOMS = ["brief", "changes", "gear", "said", "wire", "sources"];
const SECRET = {};      // id -> { open(): bool, locked: room to show instead, tab: label, onShow() }
function secretTabs() {
  $$(".tabs .secret-tab").forEach(a => a.remove());
  for (const [id, r] of Object.entries(SECRET)) {
    if (!r.tab || !r.open()) continue;
    const a = document.createElement("a");
    a.href = "#" + id; a.dataset.room = id; a.className = "secret-tab" + (room === id ? " on" : "");
    a.innerHTML = `<img src="${ICON(r.icon || "inv_misc_gem_diamond_01")}" alt="">${esc(r.tab)}`;
    $(".tabs").append(a);
  }
}
const visited = new Set(store.get("rooms", []));
let room = null;
function go(hash, scroll = true) {
  let id = (hash || "").replace(/^#/, ""), item = null;
  if (id.startsWith("c-")) { item = id; id = "changes"; }
  if (!ROOMS.includes(id) && !SECRET[id]) id = id && SECRET.nether ? "nether" : "brief";
  if (SECRET[id] && !SECRET[id].open()) id = SECRET[id].locked || "nether";
  if (id !== room) {
    $$(".room").forEach(s => s.hidden = s.id !== id);
    $$(".tabs a").forEach(a => a.classList.toggle("on", a.dataset.room === id));
    room = id;
    secretTabs();
    if (SECRET[id] && SECRET[id].onShow) SECRET[id].onShow();
    if (scroll && !item) scrollTo({ top: 0, behavior: "instant" });
    if (!visited.has(id)) { visited.add(id); store.set("rooms", [...visited]); setTimeout(() => wisp.talk(D.WISP.sections[id]), 600); }
    if (["brief", "changes", "gear", "said", "wire"].every(r => visited.has(r))) award("end");
    hideTip();
  }
  if (item) openChange(item);
}
addEventListener("hashchange", () => go(location.hash));

/* ---------------- briefing ---------------- */
function hero() {
  const line = $(".term .txt"), cmd = D.HERO_CMD;
  let i = 0;
  if (REDUCE) line.textContent = cmd;
  else (function step() { line.textContent = cmd.slice(0, ++i); if (i < cmd.length) setTimeout(step, 38 + Math.random() * 60); })();
  $(".count").innerHTML = D.COUNTDOWNS.map((c, k) => `<div class="cd" id="cd${k}"><img src="${ICON(c.i)}" alt=""><div><div class="n">–</div><div class="l"><b>${esc(c.label)}</b>${esc(c.sub)}</div></div></div>`).join("");
  function tickCd() {
    D.COUNTDOWNS.forEach((c, k) => {
      const el = $("#cd" + k), d = new Date(c.at).getTime() - Date.now(), n = $(".n", el);
      if (c.since) { n.textContent = Math.max(0, Math.floor(-d / DAY)) + " days"; el.classList.add("live"); return; }
      if (d <= 0) { n.textContent = "Now"; el.classList.add("live"); return; }
      const dd = Math.floor(d / DAY), hh = Math.floor(d % DAY / 36e5), mm = Math.floor(d % 36e5 / 6e4);
      n.textContent = dd > 0 ? `${dd}d ${String(hh).padStart(2, "0")}h` : `${hh}h ${String(mm).padStart(2, "0")}m`;
    });
  }
  tickCd(); setInterval(tickCd, 30000);
  motes($(".hero .motes"), innerWidth < 600 ? 50 : 90);
  $(".hero").addEventListener("click", e => { if (!e.target.closest("a,button,.hero-in")) burst(e.clientX, e.clientY, 26); });
  // the 60-second version
  $("#mustList").innerHTML = D.MUST.map(m => `<li><a href="#c-${m.ref}">${icon(m.i)}<div><h3>${esc(m.t)}</h3><p>${esc(m.d)}</p></div></a></li>`).join("");
  $("#mustList").addEventListener("click", () => { const n = store.get("mustClicks", 0) + 1; store.set("mustClicks", n); if (n >= 3) award("must"); });
  // roadmap
  let nowSet = false;
  $("#roadTldr").textContent = D.ROAD_TLDR;
  $("#roadRail").innerHTML = D.ROAD.map(r => {
    const t = r.date ? new Date(r.date + "T12:00:00") : null;
    let st = "";
    if (t && t <= NOW) st = "done"; else if (!nowSet) { st = "now"; nowSet = true; }
    return `<div class="stop ${st}" role="listitem"><span class="dot"></span><div class="when">${esc(r.when)}</div><h3>${esc(r.t)}</h3><p>${esc(r.d)}</p></div>`;
  }).join("");
  const lastDone = $$("#roadRail .stop.done").pop();
  if (lastDone) requestAnimationFrame(() => { $("#roadRail").scrollLeft = Math.max(0, lastDone.offsetLeft - 220); });
  // door counts
  $('[data-count="changes"]').textContent = D.CHANGES.length;
  $('[data-count="gear"]').textContent = D.TIER.length + " sets";
  $('[data-count="said"]').textContent = D.SAID.length;
}

/* ---------------- changes ---------------- */
let myClass = store.get("class", null);
const cstate = { cls: myClass, area: "all", big: false, q: "" };
function classButtons(el, cur, withEveryone, onPick) {
  el.innerHTML = (withEveryone ? `<button class="everyone" data-k="" aria-pressed="${!cur}">Everyone</button>` : "") +
    Object.entries(CL).map(([k, c]) => `<button class="cls" style="--cc:${c.c}" aria-pressed="${cur === k}" data-k="${k}" data-tip="${esc(c.n)}"><img src="${ICON(c.i)}" alt="${esc(c.n)}"></button>`).join("");
  el.addEventListener("click", e => {
    const b = e.target.closest("[data-k]"); if (!b) return;
    onPick(b.dataset.k || null);
    $$("[data-k]", el).forEach(x => x.setAttribute("aria-pressed", (x.dataset.k || null) === (b.dataset.k || null)));
  });
}
const SEVR = { major: 0, notable: 1, minor: 2 };
const CONF = { official: "Blizzard said", datamined: "In the files", community: "Players report", rumour: "Rumour" };
const SEVN = { major: "Big deal", notable: "Worth knowing", minor: "Small" };
function changes() {
  classButtons($("#clsFilter"), cstate.cls, true, k => {
    cstate.cls = k; if (k) { myClass = k; store.set("class", k); award("class"); }
    drawChanges();
  });
  const counts = {}; D.CHANGES.forEach(c => counts[c.area] = (counts[c.area] || 0) + 1);
  $("#areaChips").innerHTML = `<button class="chip" data-a="all" aria-pressed="true">Everything</button>` +
    Object.entries(AREAS).filter(([k]) => counts[k]).map(([k, a]) => `<button class="chip" data-a="${k}" aria-pressed="false"><img src="${ICON(a.i)}" alt="">${esc(a.n)} <span class="n">${counts[k]}</span></button>`).join("");
  $("#areaChips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; cstate.area = b.dataset.a; $$("#areaChips .chip").forEach(x => x.setAttribute("aria-pressed", x === b)); drawChanges(); });
  $("#bigOnly").addEventListener("click", e => { cstate.big = !cstate.big; e.currentTarget.setAttribute("aria-pressed", cstate.big); drawChanges(); });
  $("#chgSearch").addEventListener("input", e => { cstate.q = e.target.value.trim().toLowerCase(); drawChanges(); });
  $("#chgMode").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b) setMode(b.dataset.m); });
  $("#ledger").addEventListener("click", e => { if (e.target.closest("[data-goto-hot]")) { setMode("hot"); $("#chgMode").scrollIntoView({ behavior: REDUCE ? "auto" : "smooth" }); } });
  $("#hotChips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; hstate.area = b.dataset.a; hstate.days = 4; $$("#hotChips .chip").forEach(x => x.setAttribute("aria-pressed", x === b)); drawHot(); });
  $("#hotSearch").addEventListener("input", e => { hstate.q = e.target.value.trim().toLowerCase(); hstate.days = 4; drawHot(); });
  $("#hotMore").addEventListener("click", () => { hstate.days += 4; drawHot(); });
  $("#ledger").addEventListener("toggle", e => {
    if (!e.target.open) return;
    const r = store.get("read", {}); r[e.target.dataset.id] = 1; store.set("read", r);
    const n = Object.keys(r).length;
    if (n >= 1) award("first"); if (n >= 10) award("ten");
    if (D.CHANGES.filter(c => c.severity === "major").every(c => r[c.id])) award("majors");
  }, true);
  drawChanges();
}
function changeRow(c) {
  const a = AREAS[c.area] || {}, ic = c.class ? CL[c.class].i : (c.i || a.i);
  return `<details class="chg" id="c-${c.id}" data-id="${c.id}"><summary>${icon(ic)}<h4>${esc(c.title)}</h4>
    <span class="tags"><span class="dot ${c.severity}" data-tip="${SEVN[c.severity]}"></span><span class="stk ${c.confidence}">${CONF[c.confidence] || c.confidence}</span><span class="chev" aria-hidden="true">›</span></span></summary>
    <div class="body"><div class="cmp">${c.classic ? `<div class="was"><b>Classic</b>${esc(c.classic)}</div>` : ""}<div class="now"><b>Forever</b>${esc(c.forever)}</div></div>
    <div class="why"><span class="mini-wisp happy" aria-hidden="true"></span><div><b>WHY YOUR RAID CARES</b>${esc(c.impact)}${c.more ? " " + esc(c.more) : ""}</div></div>
    <p class="srcline">${a.n ? esc(a.n) + " · " : ""}${c.class ? esc(CL[c.class].n) + " · " : ""}Sources: ${src(c.sources)}</p></div></details>`;
}
function drawChanges() {
  const note = $("#clsNote");
  if (cstate.cls) { const c = CL[cstate.cls]; note.hidden = false; note.style.setProperty("--cc", c.c); note.innerHTML = `<b style="color:${c.c}">${esc(c.n)}:</b> ${esc(c.note)} Raid-wide changes still show below.`; }
  else note.hidden = true;
  if (mode === "hot") { drawHot(); return; }
  const L = D.CHANGES.filter(c =>
    (cstate.area === "all" || c.area === cstate.area) &&
    (!cstate.big || c.severity === "major") &&
    (!cstate.cls || !c.class || c.class === cstate.cls) &&
    (!cstate.cls || c.class === cstate.cls || !(c.classes || []).length || c.classes.includes(cstate.cls)) &&
    (!cstate.q || (c.title + " " + c.classic + " " + c.forever + " " + c.impact).toLowerCase().includes(cstate.q)))
    .sort((a, b) => (b.class === cstate.cls && !!cstate.cls) - (a.class === cstate.cls && !!cstate.cls) || SEVR[a.severity] - SEVR[b.severity]);
  // a picked class also gets its latest hotfix lines, straight under its own changes
  const hf = cstate.cls && !cstate.q && cstate.area === "all" ? HOT.filter(l => l.classes.includes(cstate.cls)).slice(0, 6) : [];
  const hfHtml = hf.length ? `<div class="grp"><h3><img src="${ICON("inv_misc_wrench_01")}" alt="">Latest hotfixes for ${esc(CL[cstate.cls].n)}s <span class="n">${HOT.filter(l => l.classes.includes(cstate.cls)).length}</span></h3><div class="hlines">${hf.map(l => hotLine(l, true)).join("")}</div><button class="btn more-btn" data-goto-hot>See every hotfix for ${esc(CL[cstate.cls].n)}s</button></div>` : "";
  if (!L.length) { $("#ledger").innerHTML = hfHtml + `<div class="empty">> no changes match. try clearing a filter.</div>`; return; }
  const groups = {};
  L.forEach(c => (groups[c.area] = groups[c.area] || []).push(c));
  const order = Object.keys(AREAS).filter(k => groups[k]);
  if (cstate.cls && L.some(c => c.class === cstate.cls)) {
    const mine = L.filter(c => c.class === cstate.cls), rest = L.filter(c => c.class !== cstate.cls);
    const rg = {}; rest.forEach(c => (rg[c.area] = rg[c.area] || []).push(c));
    $("#ledger").innerHTML = grp(CL[cstate.cls].i, "Just for " + CL[cstate.cls].n + "s", mine) + hfHtml + Object.keys(AREAS).filter(k => rg[k]).map(k => grp(AREAS[k].i, AREAS[k].n, rg[k])).join("");
  } else {
    $("#ledger").innerHTML = hfHtml + order.map(k => grp(AREAS[k].i, AREAS[k].n, groups[k])).join("");
  }
}

/* ---------------- hotfix log (data/hotfixes.json, split from Blizzard's hotfix posts) ---------------- */
let HOT = [], mode = "diff";
const hstate = { area: "all", q: "", days: 4 };
const hotLine = (l, withDate) => `<div class="hline"><div class="ht">${withDate ? `<span class="hd">${esc(fmtDate(l.date, { day: "numeric", month: "short" }))}</span>` : ""}${l.path.length > 1 ? `<span class="hp">${esc(l.path.slice(1).join(" › "))}</span>` : ""}${esc(l.text)}</div>${l.subs ? `<ul class="hs">${l.subs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${l.note ? `<p class="hn">${esc(l.note)}</p>` : ""}</div>`;
function setMode(m) {
  mode = m;
  if (m === "hot") award("hotread");
  $$("#chgMode [data-m]").forEach(b => b.setAttribute("aria-selected", b.dataset.m === m));
  $("#diffTools").hidden = $("#ledger").hidden = m === "hot";
  $("#hotlog").hidden = m !== "hot";
  drawChanges();
}
function hotfixLog(lines) {
  HOT = lines || [];
  $("#hotCount").textContent = HOT.length;
  if (!HOT.length) { $("#hotList").innerHTML = `<div class="empty">> the hotfix log hasn't loaded yet.</div>`; return; }
  const counts = {}; HOT.forEach(l => counts[l.area] = (counts[l.area] || 0) + 1);
  $("#hotChips").innerHTML = `<button class="chip" data-a="all" aria-pressed="true">Everything <span class="n">${HOT.length}</span></button>` +
    Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<button class="chip" data-a="${esc(k)}" aria-pressed="false">${esc(k)} <span class="n">${n}</span></button>`).join("");
  drawChanges();
}
function drawHot() {
  const q = hstate.q, cls = cstate.cls;
  const L = HOT.filter(l => (hstate.area === "all" || l.area === hstate.area) && (!cls || !l.classes.length || l.classes.includes(cls)) &&
    (!q || (l.path.join(" ") + " " + l.text + " " + (l.note || "")).toLowerCase().includes(q)));
  const days = [...new Set(L.map(l => l.date))];
  let html = "";
  for (const d of days.slice(0, hstate.days)) {
    const dayLines = L.filter(l => l.date === d), byPath = new Map();
    dayLines.forEach(l => { const k = l.path.slice(0, 2).join(" › ") || "General"; if (!byPath.has(k)) byPath.set(k, []); byPath.get(k).push(l); });
    html += `<div class="hday"><div class="month">${esc(fmtDate(d, { weekday: "long", day: "numeric", month: "long" }))} <a class="hsrc" href="${esc(dayLines[0].url)}" target="_blank" rel="noopener">Blizzard's post ↗</a></div>` +
      [...byPath].map(([k, ls]) => `<div class="hgrp"><h4>${esc(k)} <span class="n">${ls.length}</span></h4>${ls.map(l => hotLine({ ...l, path: l.path.length > 2 ? ["", ...l.path.slice(2)] : [] })).join("")}</div>`).join("") + `</div>`;
  }
  $("#hotList").innerHTML = html || `<div class="empty">> no hotfixes match. try clearing a filter.</div>`;
  $("#hotMore").hidden = days.length <= hstate.days;
}
const grp = (i, name, list) => `<div class="grp"><h3><img src="${ICON(i)}" alt="">${esc(name)} <span class="n">${list.length}</span></h3>${list.map(changeRow).join("")}</div>`;
function openChange(id) {
  if (mode !== "diff") setMode("diff");
  let el = document.getElementById(id);
  if (!el) {
    cstate.area = "all"; cstate.big = false; cstate.q = ""; cstate.cls = null; $("#chgSearch").value = "";
    $("#bigOnly").setAttribute("aria-pressed", "false");
    $$("#areaChips .chip").forEach(x => x.setAttribute("aria-pressed", x.dataset.a === "all"));
    $$("#clsFilter [data-k]").forEach(x => x.setAttribute("aria-pressed", !x.dataset.k));
    drawChanges(); el = document.getElementById(id);
  }
  if (el) { el.open = true; requestAnimationFrame(() => el.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "center" })); }
}

/* ---------------- gear ---------------- */
const PROF_ICON = { Blacksmithing: "trade_blacksmithing", Leatherworking: "trade_leatherworking", Tailoring: "trade_tailoring" };
function gear() {
  const T = D.TIER, worn = store.get("worn", {});
  let cls = myClass || "warrior";
  classButtons($("#gearPick"), cls, false, k => { cls = k; drawSets(); });
  function drawSets() {
    $("#tierSets").style.setProperty("--cc", CL[cls].c);
    $("#tierSets").innerHTML = T.filter(s => s.cls === cls).map(s => {
      const key = s.name, on = worn[key] || {}, n = Object.values(on).filter(Boolean).length, hasRaid = s.slots.some(x => x.raid);
      const slots = s.slots.map((x, k) => {
        const tid = "t" + T.indexOf(s) + "_" + k, p = x.raid || x.craft;
        D.TIPS[tid] = p ? `<div class="t q-epic-t">${esc(x.raid ? x.raid.name : x.craft.name)}</div><div class="s">${x.slot}</div>${x.raid ? `<div class="s">Item level 65 · Binds when picked up</div>${x.raid.armor ? `<div class="s">${x.raid.armor} Armor</div>` : ""}<div class="d">Other stats hidden until it first drops on a realm.</div>` : ""}${x.craft ? `<div class="g" style="margin-top:.4rem">Craftable: ${esc(x.craft.name)}, item level 61${x.craft.prof ? ` (${x.craft.prof})` : ""}</div>` : `<div class="d" style="margin-top:.3rem">Raid drop only.</div>`}<div class="d" style="margin-top:.3rem">Click to ${on[x.slot] ? "take off" : "try on"}.</div>` : `<div class="t">${x.slot}</div><div class="d">Not published yet.</div>`;
        return `<button class="slot${on[x.slot] ? " on" : ""}${p ? "" : " none"}" data-set="${esc(key)}" data-slot="${x.slot}" data-tiph="${tid}" ${p ? "" : "disabled"}><span class="ic q-epic"><img src="${ICON(x.i)}" alt=""></span>${x.craft ? `<span class="craft"><img src="${ICON(PROF_ICON[x.craft.prof] || "trade_blacksmithing")}" alt="craftable"></span>` : ""}<span class="sl">${x.slot}</span></button>`;
      }).join("");
      const bon = s.bonus.length ? s.bonus.map(b => `<li class="${n >= b.n ? "lit" : ""}"><span class="pc">(${b.n})</span> Set: ${esc(b.t)}${b.stale ? ` <span class="stk rumour" data-tip="${esc(b.stale)} was removed from the game on 3 Nov, so this bonus will likely change.">outdated</span>` : ""}</li>`).join("")
        : `<li>Set bonuses for this set haven't been published.</li>`;
      return `<div class="tset"><div class="th"><div><h4>${esc(s.name.replace(/\s*\([^)]*\)/, ""))}</h4><div class="meta">${s.role ? esc(s.role) + " · " : ""}${hasRaid ? "Hyjal Summit / Barrow Deeps · item level 65" : "only the crafted pieces are published so far"}</div></div><div class="cnt"><b>${n}</b>/6</div></div>
        <div class="slots">${slots}</div><ul class="bon">${bon}</ul>${s.url ? `<a class="src-l" href="${esc(s.url)}" target="_blank" rel="noopener">source ↗</a>` : ""}</div>`;
    }).join("");
  }
  $("#tierSets").addEventListener("click", e => {
    const b = e.target.closest(".slot"); if (!b || b.disabled) return;
    const k = b.dataset.set; worn[k] = worn[k] || {}; worn[k][b.dataset.slot] = !worn[k][b.dataset.slot]; store.set("worn", worn);
    const card = b.closest(".tset"), before = $$(".bon li.lit", card).length, idx = $$(".tset", $("#tierSets")).indexOf(card);
    drawSets(); award("gear"); hideTip();
    const after = $$(".tset", $("#tierSets"))[idx];
    if (!after) return;
    const sl = after.querySelector(`.slot[data-slot="${b.dataset.slot}"]`);
    if (sl && sl.classList.contains("on")) { const r = sl.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2 - 8, 10, .6); }
    if ($$(".bon li.lit", after).length > before) { const li = $$(".bon li.lit", after).pop(); li.classList.add("pop"); const r = li.getBoundingClientRect(); burst(r.left + 40, r.top + r.height / 2, 16); }
    if ($$(".slot.on", after).length === 6) { const r = after.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 60, 70, 1.6); wisp.talk(D.WISP.fullset, 4000); }
  });
  drawSets();
  // other items, tucked away
  const I = D.ITEMS, groups = [...new Set(I.map(g => g.grp))];
  let gp = groups[0];
  $("#gearChips").innerHTML = groups.map((p, k) => `<button class="chip" data-p="${esc(p)}" aria-pressed="${k === 0}">${esc(p)} <span class="n">${I.filter(g => g.grp === p).length}</span></button>`).join("");
  const draw = () => {
    $("#gearList").innerHTML = I.filter(g => g.grp === gp).map(g => {
      const id = "g" + I.indexOf(g);
      D.TIPS[id] = `<div class="t q-${g.q}-t">${esc(g.name)}</div>${g.slot ? `<div class="s">${esc(g.slot)}</div>` : ""}${g.stats ? `<div class="g">${esc(g.stats)}</div>` : ""}${g.notes ? `<div class="y" style="margin-top:.35rem">${esc(g.notes)}</div>` : ""}${g.source ? `<div class="d" style="margin-top:.35rem">${esc(g.source)}</div>` : ""}`;
      return `<div class="item" data-tiph="${id}">${icon(g.i, "q-" + g.q)}<div><div class="nm q-${g.q}-t">${esc(g.name)}</div>${g.stats ? `<div class="st">${esc(g.stats)}</div>` : ""}<div class="meta">${[g.slot, g.source].filter(Boolean).map(esc).join(" · ")}</div></div></div>`;
    }).join("");
  };
  $("#gearChips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; gp = b.dataset.p; $$("#gearChips .chip").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); });
  draw();
}

/* ---------------- blizzard said ---------------- */
const KIND = { "article": "Article", "blue-post": "Blue post", "blue-reply": "Blue reply", "patch-notes": "Patch notes", "hotfix": "Hotfix", "interview": "Interview", "social": "Social", "faq": "FAQ" };
let SAIDALL = D.SAID.slice(), saidRedraw = () => {};
function said() {
  const T = D.TOPICS;
  let tp = "all", q = "", shown = 25;
  const chips = () => {
    const counts = {}; SAIDALL.forEach(s => counts[s.topic] = (counts[s.topic] || 0) + 1);
    $("#saidChips").innerHTML = `<button class="chip" data-t="all" aria-pressed="${tp === "all"}">Everything <span class="n">${SAIDALL.length}</span></button>` + Object.entries(T).filter(([k]) => counts[k]).map(([k, t]) => `<button class="chip" data-t="${k}" aria-pressed="${tp === k}"><img src="${ICON(t.i)}" alt="">${esc(t.n)} <span class="n">${counts[k]}</span></button>`).join("");
  };
  const draw = () => {
    const L = SAIDALL.filter(s => (tp === "all" || s.topic === tp) && (!q || (s.title + " " + (s.summary || "")).toLowerCase().includes(q)));
    let html = "", month = "";
    for (const s of L.slice(0, shown)) {
      const m = fmtDate(s.date, { month: "long", year: "numeric" });
      if (m !== month) { month = m; html += `<div class="month">${esc(m)}</div>`; }
      const t = T[s.topic] || T.other;
      html += `<details class="stm"><summary><span class="d">${esc(fmtDate(s.date, { day: "numeric", month: "short" }))}</span>${icon(t.i, "", t.n)}<h4>${esc(s.title)}${s.auto ? ` <span class="stk community" data-tip="Picked up automatically from Blizzard's own news and forum posts. Not checked by hand yet.">new</span>` : ""}</h4><span class="kind">${esc(KIND[s.kind] || s.kind)}</span></summary>
        <div class="body">${s.summary ? `<p>${esc(s.summary)}</p>` : ""}<p class="srcline">${s.who ? esc(s.who) + " · " : ""}<a href="${esc(s.url)}" target="_blank" rel="noopener">Read it on ${esc(host(s.url))} ↗</a>${s.via ? ` · <a href="${esc(s.via)}" target="_blank" rel="noopener">reported via ↗</a>` : ""}</p></div></details>`;
    }
    $("#saidList").innerHTML = html || `<div class="empty">> nothing on that yet.</div>`;
    $("#saidMore").hidden = L.length <= shown;
  };
  saidRedraw = () => { chips(); draw(); $('[data-count="said"]').textContent = SAIDALL.length; };
  $("#saidChips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; tp = b.dataset.t; shown = 25; $$("#saidChips .chip").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); });
  $("#saidSearch").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); draw(); });
  $("#saidMore").addEventListener("click", () => { shown += 30; draw(); award("archive"); });
  chips(); draw();
}
// Blizzard's own posts on The Wire that the hand-written archive doesn't have yet
const TAG2TOPIC = { hotfix: "hotfix", raids: "raids", leveling: "leveling", classes: "classes", items: "gear", pvp: "pvp", economy: "economy", professions: "professions", realms: "realms", ui: "ui-addons", story: "lore", business: "business" };
const postKey = u => { let m = u.match(/\/t\/[^/]+\/(\d+)/); if (m) return "t" + m[1]; m = u.match(/\/article\/(\d+)/); if (m) return "a" + m[1]; m = u.match(/blue-tracker\/topic\/\w+\/(\d+)/); if (m) return "t" + m[1]; return u.replace(/[?#].*$/, ""); };
const titleKey = t => t.toLowerCase().replace(/blizzard replied in/g, "").replace(/(january|february|march|april|may|june|july|august|september|october|november|december)/g, "").replace(/[^a-z]+/g, "");
function addAutoSaid(items) {
  const keys = new Set(SAIDALL.map(s => postKey(s.url))), titles = new Set(SAIDALL.map(s => titleKey(s.title)));
  const add = [];
  for (const i of items) {
    if (i.label !== "official" || i.source === "Wowhead Blue Tracker") continue;
    const k = postKey(i.url), tk = titleKey(i.title);
    if (keys.has(k) || titles.has(tk)) continue;
    keys.add(k); titles.add(tk);
    const reply = /^Blizzard replied in/.test(i.title);
    add.push({ date: i.date.slice(0, 10), title: i.title, summary: i.summary || "", url: i.url, who: i.who, auto: true,
      kind: i.source === "Blizzard News" ? "article" : reply ? "blue-reply" : "blue-post",
      topic: TAG2TOPIC[(i.tags || []).find(t => TAG2TOPIC[t])] || "other" });
  }
  if (!add.length) return;
  SAIDALL = SAIDALL.concat(add).sort((a, b) => (b.date > a.date) - (b.date < a.date));
  saidRedraw();
}
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

/* ---------------- the wire: stories, each grouping every post about one event ---------------- */
const LABELS = { official: { n: "Blizzard", i: "inv_letter_15" }, social: { n: "Blizzard social", i: "inv_misc_horn_01" }, press: { n: "Press & guides", i: "inv_misc_book_09" }, community: { n: "Players", i: "inv_shirt_guildtabard_01" } };
const TOPIC_NAMES = { hotfix: "Hotfixes", raids: "Raids", leveling: "Leveling & dungeons", classes: "Classes", items: "Items & loot", pvp: "PvP", economy: "Economy", professions: "Professions", realms: "Realms & servers", ui: "UI & add-ons", story: "Story & media", business: "Editions & store" };
async function loadJSON(path) {
  for (let k = 0; k < 3; k++) {
    try { const r = await fetch(path + "?v=" + Math.floor(Date.now() / 6e5), { cache: "no-cache" }); if (r.ok) return await r.json(); } catch {}
    await new Promise(z => setTimeout(z, 600 * (k + 1)));
  }
  return null;
}
function alsoLine(also) {
  const by = {};
  also.forEach(a => by[a.source] = (by[a.source] || 0) + 1);
  return Object.entries(by).map(([s, n]) => s.startsWith("r/") ? `${n} Reddit thread${n > 1 ? "s" : ""}` : n > 1 ? `${s} (${n})` : s).join(", ");
}
const storyRow = (s, lastVisit) => {
  const l = LABELS[s.label] || LABELS.press, isNew = lastVisit && new Date(s.last).getTime() > lastVisit;
  if (s.summary) D.TIPS["s" + s.id] = `<div class="t">${esc(s.title)}</div><div class="d" style="margin-top:.3rem">${esc(s.summary)}</div>`;
  const tags = (s.tags || []).slice(0, 2).map(t => `<span class="tg">${esc(TOPIC_NAMES[t] || t)}</span>`).join("") +
    (s.classes || []).map(c => CL[c] ? `<img class="tc" src="${ICON(CL[c].i)}" alt="${esc(CL[c].n)}" data-tip="${esc(CL[c].n)}">` : "").join("");
  const also = s.also && s.also.length ? `<details class="also"><summary>+${s.also.length} more: ${esc(alsoLine(s.also))}</summary><ul>${s.also.map(a => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener"><span class="lb-${a.label}">${esc(a.source)}</span> · ${esc(a.title)}</a> <span class="t">${ago(a.date)}</span></li>`).join("")}</ul></details>` : "";
  return `<div class="story${s.official ? " official" : ""}${isNew ? " new" : ""}"><a class="post ${s.official ? "official" : s.label}${isNew ? " new" : ""}" href="${esc(s.url)}" target="_blank" rel="noopener"${s.summary ? ` data-tiph="s${s.id}"` : ""}>${icon(s.icon || l.i)}<div><div class="h">${esc(s.title)}</div><div class="m"><span class="lb-${s.label}">${esc(l.n)}</span> · ${esc(s.source)}${tags ? ` <span class="tags">${tags}</span>` : ""}</div></div><div class="t"${s.last !== s.date ? ` data-tip="First posted ${esc(ago(s.date))}"` : ""}>${ago(s.last)}</div></a>${also}</div>`;
};
function health(h) {
  if (!h) { $("#srcHealth").hidden = true; return; }
  const today = new Date().toISOString().slice(0, 10), days = d => d ? Math.round((new Date(today) - new Date(d)) / DAY) : 999;
  $("#healthList").innerHTML = Object.entries(h).sort().map(([n, e]) => {
    const bad = e.fails >= 3 || days(e.lastItems) >= 2, warn = !bad && (e.fails > 0 || days(e.lastItems) >= 1);
    const say = e.fails ? `failing (${e.fails} run${e.fails > 1 ? "s" : ""} in a row)` : days(e.lastItems) === 0 ? "working today" : e.lastItems ? `no new posts since ${fmtDate(e.lastItems, { day: "numeric", month: "short" })}` : "no posts yet";
    return `<li><span class="dot ${bad ? "major" : warn ? "notable" : "ok"}"></span><b>${esc(n)}</b><span>${esc(say)}</span></li>`;
  }).join("");
}
async function wire() {
  const [NEWS, HOTF, HEALTH] = await Promise.all([loadJSON("data/news.json"), loadJSON("data/hotfixes.json"), loadJSON("data/health.json")]);
  hotfixLog(HOTF && HOTF.lines);
  health(HEALTH);
  const box = $("#wireList");
  if (!NEWS || !NEWS.items || !NEWS.items.length) { box.innerHTML = `<div class="empty">> the wire is quiet. couldn't load news right now; try again in a minute.</div>`; $("#freshList").innerHTML = box.innerHTML; return; }
  addAutoSaid(NEWS.items);
  // older news files have no stories yet: show each item as its own story
  const stories = (NEWS.stories || NEWS.items.map(i => ({ ...i, id: i.url.length + "" + i.title.length, last: i.date, n: 1, also: [], official: i.label === "official" })))
    .slice().sort((a, b) => new Date(b.last) - new Date(a.last));
  if (window.TWX) window.TWX.newsTop = n => stories.slice(0, n);
  const lastVisit = store.get("lastVisit", 0);
  store.set("lastVisit", Date.now());
  const f = $(".fresh");
  $(".ft", f).textContent = `Refreshed ${ago(NEWS.updated)} · ${NEWS.items.length} posts grouped into ${stories.length} stories · ${new Set(NEWS.items.map(i => i.source)).size} sources`;
  if (Date.now() - new Date(NEWS.updated) > 12 * 36e5) f.classList.add("stale");
  const fresh = stories.filter(s => lastVisit && new Date(s.last) > lastVisit).length;
  $('[data-count="wire"]').textContent = fresh ? fresh + " new" : stories.length;
  $("#freshList").innerHTML = stories.filter(s => s.official).slice(0, 5).map(s => storyRow(s, lastVisit)).join("");
  // filters: who said it, what it's about, and your class
  const lab = s => s.official ? "official" : s.label, c = {};
  stories.forEach(s => c[lab(s)] = (c[lab(s)] || 0) + 1);
  $("#wireChips").innerHTML = `<button class="chip" data-l="all" aria-pressed="true">All <span class="n">${stories.length}</span></button>` + Object.entries(LABELS).filter(([k]) => c[k]).map(([k, l]) => `<button class="chip lb-${k}" data-l="${k}" aria-pressed="false"><img src="${ICON(l.i)}" alt="">${l.n} <span class="n">${c[k]}</span></button>`).join("");
  const tc = {}; stories.forEach(s => (s.tags || []).forEach(t => tc[t] = (tc[t] || 0) + 1));
  const mine = () => myClass && CL[myClass] ? `<button class="chip" data-t="mine" aria-pressed="false"><img src="${ICON(CL[myClass].i)}" alt="">${esc(CL[myClass].n)} news <span class="n">${stories.filter(s => (s.classes || []).includes(myClass)).length}</span></button>` : "";
  const topicChips = () => { $("#wireTopics").innerHTML = mine() + Object.entries(TOPIC_NAMES).filter(([k]) => tc[k]).map(([k, n]) => `<button class="chip" data-t="${k}" aria-pressed="false">${esc(n)} <span class="n">${tc[k]}</span></button>`).join(""); };
  topicChips();
  let lb = "all", tp = null, shown = 30;
  const draw = () => {
    const L = stories.filter(s => (lb === "all" || lab(s) === lb) && (!tp || (tp === "mine" ? (s.classes || []).includes(myClass) : (s.tags || []).includes(tp))));
    let html = "", day = "";
    for (const s of L.slice(0, shown)) {
      const d = new Date(s.last), dk = d.toDateString();
      if (dk !== day) { day = dk; const diff = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / DAY); html += `<div class="day">${diff === 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</div>`; }
      html += storyRow(s, lastVisit);
    }
    box.innerHTML = html || `<div class="empty">> nothing matches. try another filter.</div>`;
    $("#wireMore").hidden = L.length <= shown;
  };
  $("#wireChips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; lb = b.dataset.l; shown = 30; $$("#wireChips .chip").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); });
  $("#wireTopics").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; tp = tp === b.dataset.t ? null : b.dataset.t; shown = 30; $$("#wireTopics .chip").forEach(x => x.setAttribute("aria-pressed", x.dataset.t === tp)); draw(); });
  $("#wireMore").addEventListener("click", () => { shown += 30; draw(); });
  document.addEventListener("click", e => { if (e.target.closest(".post,.also a")) award("wire"); });
  addEventListener("hashchange", () => { if (location.hash === "#wire") { topicChips(); if (tp) $$("#wireTopics .chip").forEach(x => x.setAttribute("aria-pressed", x.dataset.t === tp)); } });
  draw();
}

/* ---------------- sources ---------------- */
function sources() {
  const all = new Map(), add = s => s && s.url && !all.has(s.url) && all.set(s.url, s.name);
  D.CHANGES.forEach(c => (c.sources || []).forEach(add));
  D.ROAD.forEach(r => (r.src || []).forEach(add));
  D.SAID.forEach(s => add({ url: s.url, name: s.title }));
  D.TIER.forEach(s => s.url && add({ url: s.url, name: s.name + " (tier set)" }));
  D.ITEMS.forEach(g => g.url && add({ url: g.url, name: g.name }));
  $("#srcList").innerHTML = [...all].sort((a, b) => host(a[0]).localeCompare(host(b[0]))).map(([u, n]) => `<li><span class="h">${esc(host(u))}</span><br><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a></li>`).join("");
  $("#srcCount").textContent = all.size;
}

/* ---------------- type "whimsy" anywhere for a surprise ---------------- */
(() => {
  let buf = "";
  addEventListener("keydown", e => {
    if ((e.target.closest && e.target.closest("input,textarea")) || !e.key || e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-6);
    if (buf === "whimsy") { fx.shower(); document.documentElement.classList.add("party"); setTimeout(() => document.documentElement.classList.remove("party"), 6000); award("secret"); wisp.talk(D.WISP.secret, 5000); buf = ""; }
  });
})();

/* ---------------- what whimsy.js needs ---------------- */
window.TWX = { notice, D, $, $$, esc, ICON, icon, store, award, got, wisp, fx, burst, go, CL, hideTip, who, title, xp, REDUCE, star, emit,
  addRoom(id, r) { SECRET[id] = r; secretTabs(); }, secretTabs, get room() { return room; },
  setClass(k) { myClass = k; store.set("class", k); award("class"); }, get myClass() { return myClass; }, get hot() { return HOT; } };

/* ---------------- init ---------------- */
$$("img[src^='img/icons/']").forEach(i => { const k = i.getAttribute("src").slice(10, -4); if (window.TW_ICONS && TW_ICONS[k]) i.src = TW_ICONS[k]; });
$$(".banner").forEach(b => { const c = document.createElement("canvas"); c.className = "motes"; c.setAttribute("aria-hidden", "true"); b.querySelector(".art").after(c); motes(c, innerWidth < 600 ? 22 : 40); });
hero(); changes(); gear(); said(); sources(); xp();
document.addEventListener("DOMContentLoaded", () => go(location.hash, false));
wire();
setTimeout(() => { award("hello"); if (!store.get("wispMet", false)) { store.set("wispMet", true); wisp.talk(D.WISP.hello); } }, 2500);
})();
