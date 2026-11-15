/* Terminal Whimsy: Forever briefing. Renders data.js (curated) + data/news.json (refreshed by a GitHub Action). */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const D = window.TW;
const ICON = n => (window.TW_ICONS && TW_ICONS[n]) || ("img/icons/" + n + ".png");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem("tw." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("tw." + k, JSON.stringify(v)); } catch {} }
};
const NOW = new Date();
const DAY = 864e5;
const fmtDate = d => new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const ago = t => {
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 90) return "just now";
  if (s < 3600) return Math.round(s / 60) + "m ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  if (s < 86400 * 14) return Math.round(s / 86400) + "d ago";
  return fmtDate(String(t).slice(0, 10));
};
const icon = (name, cls = "", tip = "") => `<span class="ic ${cls}"${tip ? ` data-tip="${esc(tip)}"` : ""}><img src="${ICON(name)}" alt="" loading="lazy" decoding="async"></span>`;

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
document.addEventListener("pointerover", e => { const el = e.target.closest("[data-tip],[data-tiph]"); if (el && el !== tipOn) showTip(el, e.clientX, e.clientY); });
document.addEventListener("pointermove", e => { if (tipOn) moveTip(e.clientX, e.clientY); });
document.addEventListener("pointerout", e => { if (tipOn && !tipOn.contains(e.relatedTarget)) { tip.classList.remove("on"); tipOn = null; } });

/* ---------------- achievements + xp ---------------- */
const ACH = D.ACH;
const got = store.get("ach", {});
const toasts = $(".toasts");
function award(id) {
  if (got[id] || !ACH[id]) return;
  got[id] = Date.now(); store.set("ach", got);
  const a = ACH[id];
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `<img src="${ICON(a.i)}" alt=""><div><div class="a">ACHIEVEMENT EARNED</div><div class="b">${esc(a.n)}</div><div class="c">${esc(a.d)}</div></div>`;
  toasts.append(t); setTimeout(() => t.remove(), 4300);
  setTimeout(() => { const r = t.getBoundingClientRect(); burst(r.left + 32, r.top + r.height / 2, 30); }, 250);
  xp();
}
function xp() {
  const n = Object.keys(ACH).length, k = Object.keys(got).filter(x => ACH[x]).length;
  $(".xpbar i").style.setProperty("--xp", (100 * k / n) + "%");
  $(".xp .v").textContent = `${k}/${n}`;
  $(".xp").dataset.tiph = "ach";
  D.TIPS.ach = `<div class="t y">Briefing achievements</div>` + Object.entries(ACH).map(([id, a]) =>
    `<div class="${got[id] ? "g" : "d"}">${got[id] ? "✓" : "○"} ${esc(a.n)}</div>`).join("");
}

/* ---------------- top bar: progress + scrollspy ---------------- */
const links = $$(".top nav a");
const secs = links.map(a => $(a.getAttribute("href"))).filter(Boolean);
function onScroll() {
  const h = document.documentElement;
  h.style.setProperty("--p", Math.min(1, scrollY / Math.max(1, h.scrollHeight - innerHeight)));
  let cur = null;
  for (const s of secs) if (s.getBoundingClientRect().top < innerHeight * .35) cur = s;
  links.forEach(a => a.classList.toggle("on", cur && a.getAttribute("href") === "#" + cur.id));
  if (scrollY + innerHeight > h.scrollHeight - 40) award("end");
}
addEventListener("scroll", onScroll, { passive: true });

/* ---------------- hero ---------------- */
function hero() {
  const line = $(".term .txt"), cmd = D.HERO_CMD;
  let i = 0;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) line.textContent = cmd;
  else (function step() { line.textContent = cmd.slice(0, ++i); if (i < cmd.length) setTimeout(step, 38 + Math.random() * 60); })();
  // countdowns
  const box = $(".count");
  box.innerHTML = D.COUNTDOWNS.map((c, k) => `<div class="cd" id="cd${k}"><img src="${ICON(c.i)}" alt=""><div><div class="n">–</div><div class="l"><b>${esc(c.label)}</b>${esc(c.sub)}</div></div></div>`).join("");
  function tickCd() {
    D.COUNTDOWNS.forEach((c, k) => {
      const el = $("#cd" + k), t = new Date(c.at).getTime(), d = t - Date.now();
      const n = $(".n", el);
      if (c.since) { n.textContent = Math.max(0, Math.floor(-d / DAY)) + "d"; el.classList.add("live"); return; }
      if (d <= 0) { n.textContent = "LIVE"; el.classList.add("live"); return; }
      const dd = Math.floor(d / DAY), hh = Math.floor(d % DAY / 36e5), mm = Math.floor(d % 36e5 / 6e4), ss = Math.floor(d % 6e4 / 1e3);
      n.textContent = dd > 0 ? `${dd}d ${String(hh).padStart(2, "0")}h ${String(mm).padStart(2, "0")}m` : `${hh}h ${String(mm).padStart(2, "0")}m ${String(ss).padStart(2, "0")}s`;
    });
  }
  tickCd(); setInterval(tickCd, 1000);
  motes($(".motes"), innerWidth < 600 ? 60 : 110, true);
  // tap the sky: it sparkles
  $(".hero").addEventListener("click", e => { if (!e.target.closest("a,button")) { burst(e.clientX, e.clientY, 26); poke("sky"); } });
}

/* ---------------- whimsy: motes, sparkle fx, the wisp ---------------- */
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const COLS = ["124,242,154", "232,137,255", "124,200,255", "242,197,107"];
function star(cx, x, y, r, rot = 0) {      // a four-point twinkle
  cx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = rot + k * Math.PI / 4, rr = k % 2 ? r * .32 : r;
    cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  cx.closePath(); cx.fill();
}
// drifting arcane motes over an image; the whole parent box, shy of the cursor when interactive
function motes(cv, n, interactive) {
  if (!cv) return;
  const cx = cv.getContext("2d"), box = cv.parentElement, dpr = Math.min(2, devicePixelRatio || 1);
  let W = 1, H = 1, vis = false, mx = -1e4, my = -1e4;
  const size = () => { const r = box.getBoundingClientRect(); W = cv.width = Math.max(1, r.width * dpr); H = cv.height = Math.max(1, r.height * dpr); };
  size(); new ResizeObserver(size).observe(box);
  const P = Array.from({ length: n }, (_, k) => ({ x: Math.random(), y: Math.random(), r: .7 + Math.random() * 2.3, v: .00025 + Math.random() * .0011,
    c: COLS[k % 4], p: Math.random() * 6, s: Math.random() < .16, dx: 0, dy: 0 }));
  new IntersectionObserver(e => { vis = e[0].isIntersecting; }).observe(box);
  if (interactive) {
    box.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); mx = (e.clientX - r.left) * dpr; my = (e.clientY - r.top) * dpr; });
    box.addEventListener("pointerleave", () => { mx = my = -1e4; });
  }
  if (REDUCE) { // one still frame
    P.forEach(q => { cx.fillStyle = `rgba(${q.c},.6)`; cx.beginPath(); cx.arc(q.x * W, q.y * H, q.r * dpr, 0, 7); cx.fill(); });
    return;
  }
  (function frame(t) {
    if (vis) {
      cx.clearRect(0, 0, W, H);
      for (const q of P) {
        q.y -= q.v; q.x += Math.sin(t / 2400 + q.p) * .00035;
        if (q.y < -.04) { q.y = 1.04; q.x = Math.random(); }
        let px = q.x * W + q.dx, py = q.y * H + q.dy;
        const d = Math.hypot(px - mx, py - my), R = 140 * dpr;
        if (d < R) { const f = (1 - d / R) * 3.2; q.dx += (px - mx) / (d || 1) * f; q.dy += (py - my) / (d || 1) * f; }
        q.dx *= .94; q.dy *= .94;
        const near = d < R ? 1 - d / R : 0;
        const a = Math.min(1, .3 + .35 * Math.sin(t / 650 + q.p) + near * .6);
        cx.fillStyle = `rgba(${q.c},${a})`; cx.shadowColor = `rgba(${q.c},1)`; cx.shadowBlur = 12 * dpr;
        if (q.s) star(cx, px, py, (q.r * 2.6 + near * 3) * dpr, t / 1800 + q.p);
        else { cx.beginPath(); cx.arc(px, py, (q.r + near * 1.2) * dpr, 0, 7); cx.fill(); }
      }
    }
    requestAnimationFrame(frame);
  })(0);
}
// page-wide sparkle layer: bursts, showers, and a faint cursor trail
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
    last = now; lx = e.clientX; ly = e.clientY;
    if (store.get("trail", true)) fx.trail(e.clientX, e.clientY);
  }, { passive: true });
}

// the wisp: a small guide in the corner that has something to say about each section
const wisp = (() => {
  const el = document.createElement("div");
  el.className = "wisp"; el.hidden = store.get("wispGone", false);
  el.innerHTML = `<div class="bubble" role="status" aria-live="polite"><span class="say"></span><button class="x" aria-label="Send the wisp away" data-tip="Send the wisp away">×</button></div>
    <button class="orb" aria-label="Poke the wisp"><span class="eye"></span><span class="eye"></span></button>`;
  document.body.append(el);
  const say = $(".say", el), bub = $(".bubble", el);
  let typing = 0, hideT = 0, pokes = 0, said = new Set();
  function talk(text, hold = 6500) {
    if (el.hidden) return;
    clearTimeout(typing); clearTimeout(hideT);
    bub.classList.add("on"); say.textContent = "";
    let i = 0;
    const step = () => { say.textContent = text.slice(0, ++i); if (i < text.length) typing = setTimeout(step, REDUCE ? 0 : 22); };
    step();
    hideT = setTimeout(() => bub.classList.remove("on"), hold + text.length * 22);
  }
  $(".orb", el).addEventListener("click", e => {
    const r = e.currentTarget.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 18);
    el.classList.remove("boing"); void el.offsetWidth; el.classList.add("boing");
    pokes++; if (pokes >= 5) award("wisp");
    const tips = D.WISP.poke;
    talk(pokes === 1 ? D.WISP.hello : tips[(pokes - 2 + tips.length) % tips.length]);
  });
  $(".x", el).addEventListener("click", () => { el.hidden = true; store.set("wispGone", true); });
  // a line for each section, the first time you reach it
  const lines = D.WISP.sections;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && lines[e.target.id] && !said.has(e.target.id)) { said.add(e.target.id); talk(lines[e.target.id]); }
  }), { rootMargin: "-40% 0px -50% 0px" });
  $$("section.ch").forEach(s => io.observe(s));
  setTimeout(() => { if (!said.size) talk(D.WISP.hello); }, 4500);
  return { talk, el };
})();
function poke(what) { if (what === "sky" && Math.random() < .25) wisp.talk(D.WISP.sky[(Math.random() * D.WISP.sky.length) | 0], 3000); }

// type "whimsy" anywhere (outside a text box) for a surprise
(() => {
  let buf = "";
  addEventListener("keydown", e => {
    if (e.target.closest("input,textarea") || e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-6);
    if (buf === "whimsy") { fx.shower(); document.documentElement.classList.add("party"); setTimeout(() => document.documentElement.classList.remove("party"), 6000); award("secret"); wisp.talk(D.WISP.secret, 5000); buf = ""; }
  });
})();

/* ---------------- must know ---------------- */
function must() {
  $("#mustList").innerHTML = D.MUST.map(m => `<li>${icon(m.i)}<div><h3>${esc(m.t)}</h3><p>${esc(m.d)}${m.ref ? ` <a href="#c-${m.ref}" class="mono" style="font-size:.8rem">details ↓</a>` : ""}</p></div></li>`).join("");
  const seen = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("seen"); seen.add(e.target); if (seen.size >= D.MUST.length) award("must"); }
  }), { threshold: .9 });
  $$("#mustList li").forEach(li => io.observe(li));
}

/* ---------------- roadmap ---------------- */
function road() {
  let nowSet = false;
  $("#roadRail").innerHTML = D.ROAD.map(r => {
    const t = r.date ? new Date(r.date + "T12:00:00") : null;
    let st = "";
    if (t && t <= NOW) st = "done"; else if (!nowSet) { st = "now"; nowSet = true; }
    return `<div class="stop ${st}"><span class="dot"></span><div class="when">${esc(r.when)}</div><h3>${esc(r.t)}</h3><p>${esc(r.d)}</p>${r.i ? `<div class="ics">${r.i.map(x => icon(x)).join("")}</div>` : ""}${r.src ? `<p class="mono" style="font-size:.72rem;margin-top:.4rem">${src(r.src)}</p>` : ""}</div>`;
  }).join("");
  const lastDone = $$("#roadRail .stop.done").pop();
  if (lastDone) requestAnimationFrame(() => { $("#roadRail").scrollLeft = Math.max(0, lastDone.offsetLeft - 40); });
}
const src = arr => (arr || []).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(" · ");

/* ---------------- class spotlight ---------------- */
const CL = D.CLASSES;
let myClass = store.get("class", null);
function classPicker(el, onPick, cur) {
  el.innerHTML = Object.entries(CL).map(([k, c]) => `<button class="cls" style="--cc:${c.c}" aria-pressed="${cur === k}" data-k="${k}" data-tip="${esc(c.n)}"><img src="${ICON(c.i)}" alt="${esc(c.n)}"></button>`).join("");
  el.addEventListener("click", e => { const b = e.target.closest(".cls"); if (b) onPick(b.dataset.k); });
}
function spotlight() {
  const box = $("#spotBody");
  const draw = () => {
    $$("#spotPick .cls").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === myClass));
    if (!myClass) { box.innerHTML = `<p class="muted">Pick your class above. We'll pull every change that touches it, and remember your pick next time.</p>`; return; }
    const c = CL[myClass];
    const list = D.CHANGES.filter(x => x.class === myClass || (x.classes || []).includes(myClass));
    const raid = D.CHANGES.filter(x => !x.class && (x.severity === "major") ).slice(0, 4);
    box.style.setProperty("--cc", c.c);
    box.innerHTML = `<div class="who"><img src="${ICON(c.i)}" alt=""><div><h3>${esc(c.n)}</h3><p class="muted">${list.length} change${list.length === 1 ? "" : "s"} listed for your class</p></div></div>
      ${c.note ? `<p style="margin-top:1rem">${esc(c.note)}</p>` : ""}
      <ul style="margin-top:1rem;padding-left:1.1rem;display:flex;flex-direction:column;gap:.45rem">${list.map(x => `<li><a href="#c-${x.id}">${esc(x.title)}</a> <span class="badge sev-${x.severity}">${x.severity}</span></li>`).join("") || `<li class="muted">No class-specific changes reported yet. The raid-wide changes below still apply to you.</li>`}</ul>
      <p class="eyebrow" style="margin-top:1.2rem">Raid-wide, for everyone</p>
      <ul style="margin-top:.5rem;padding-left:1.1rem;display:flex;flex-direction:column;gap:.35rem">${raid.map(x => `<li><a href="#c-${x.id}">${esc(x.title)}</a></li>`).join("")}</ul>`;
  };
  classPicker($("#spotPick"), k => { myClass = k; store.set("class", k); draw(); award("class"); state.cls = k; renderChanges(); syncClassFilter(); }, myClass);
  draw();
}

/* ---------------- change explorer ---------------- */
const state = { area: "all", cls: myClass && store.get("filterMine", false) ? myClass : null, conf: "all", q: "", shown: 18 };
const AREAS = D.AREAS;
function changes() {
  const counts = {};
  D.CHANGES.forEach(c => counts[c.area] = (counts[c.area] || 0) + 1);
  $("#areaChips").innerHTML = `<button class="chip" data-a="all" aria-pressed="true">All <span class="n">${D.CHANGES.length}</span></button>` +
    Object.entries(AREAS).filter(([k]) => counts[k]).map(([k, a]) => `<button class="chip" data-a="${k}" aria-pressed="false"><img src="${ICON(a.i)}" alt="" style="width:16px;height:16px;border-radius:3px">${esc(a.n)} <span class="n">${counts[k]}</span></button>`).join("");
  $("#areaChips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; state.area = b.dataset.a; state.shown = 18; $$("#areaChips .chip").forEach(x => x.setAttribute("aria-pressed", x === b)); renderChanges(); });
  classPicker($("#clsFilter"), k => { state.cls = state.cls === k ? null : k; state.shown = 18; syncClassFilter(); renderChanges(); }, state.cls);
  $("#confChips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; state.conf = b.dataset.c; $$("#confChips .chip").forEach(x => x.setAttribute("aria-pressed", x === b)); renderChanges(); });
  $("#chgSearch").addEventListener("input", e => { state.q = e.target.value.trim().toLowerCase(); state.shown = 18; renderChanges(); });
  $("#chgMore").addEventListener("click", () => { state.shown += 30; renderChanges(); });
  $("#ledger").addEventListener("toggle", e => {
    if (!e.target.open) return;
    const r = store.get("read", {}); r[e.target.dataset.id] = 1; store.set("read", r);
    const n = Object.keys(r).length;
    if (n >= 1) award("first"); if (n >= 10) award("ten");
    const majors = D.CHANGES.filter(c => c.severity === "major");
    if (majors.every(c => r[c.id])) award("majors");
  }, true);
  renderChanges();
}
function syncClassFilter() { $$("#clsFilter .cls").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === state.cls)); }
const SEVR = { major: 0, notable: 1, minor: 2 };
function renderChanges() {
  const read = store.get("read", {});
  let L = D.CHANGES.filter(c =>
    (state.area === "all" || c.area === state.area) &&
    (!state.cls || c.class === state.cls || (c.classes || []).includes(state.cls)) &&
    (state.conf === "all" || c.confidence === state.conf) &&
    (!state.q || (c.title + " " + c.classic + " " + c.forever + " " + c.impact + " " + (c.class || "")).toLowerCase().includes(state.q)));
  L.sort((a, b) => SEVR[a.severity] - SEVR[b.severity]);
  const total = L.length;
  $("#chgCount").textContent = `${total} of ${D.CHANGES.length} changes`;
  L = L.slice(0, state.shown);
  $("#ledger").innerHTML = L.map(c => {
    const a = AREAS[c.area] || {}, ic = c.class ? CL[c.class].i : (c.i || a.i || "inv_misc_questionmark");
    return `<details class="chg" id="c-${c.id}" data-id="${c.id}"><summary>${icon(ic)}<div><h3>${esc(c.title)}${read[c.id] ? "" : ""}</h3>
      <div class="diff">${c.classic ? `<span class="tg was-t">Classic</span><span class="was">${esc(c.classic)}</span>` : ""}<span class="tg now-t">Forever</span><span class="now">${esc(c.forever)}</span></div></div>
      <div class="tags"><span class="badge sev-${c.severity}">${c.severity}</span><span class="badge cf-${c.confidence}">${c.confidence}</span></div></summary>
      <div class="body"><div class="impact"><b>WHY YOUR RAID CARES</b>${esc(c.impact)}</div>
      ${c.more ? `<p>${esc(c.more)}</p>` : ""}
      <p class="mono" style="font-size:.78rem;color:var(--muted)">${a.n ? esc(a.n) + " · " : ""}${c.class ? esc(CL[c.class].n) + " · " : ""}Sources: ${src(c.sources)}</p></div></details>`;
  }).join("") || `<div class="empty">> no changes match. try clearing a filter.</div>`;
  $("#chgMore").hidden = total <= state.shown;
  if (location.hash.startsWith("#c-")) { const el = $(location.hash); if (el && !el.open) { el.open = true; } }
}
addEventListener("hashchange", () => {
  if (!location.hash.startsWith("#c-")) return;
  let el = $(location.hash);
  if (!el) { state.area = "all"; state.cls = null; state.conf = "all"; state.q = ""; state.shown = 999; $("#chgSearch").value = ""; $$("#areaChips .chip").forEach(x => x.setAttribute("aria-pressed", x.dataset.a === "all")); syncClassFilter(); renderChanges(); el = $(location.hash); }
  if (el) { el.open = true; el.scrollIntoView({ behavior: "smooth", block: "center" }); }
});

/* ---------------- gear ---------------- */
const PROF_ICON = { Blacksmithing: "trade_blacksmithing", Leatherworking: "trade_leatherworking", Tailoring: "trade_tailoring" };
function gear() {
  const T = D.TIER;
  let cls = myClass || "warrior";
  const worn = store.get("worn", {});
  const pickEl = $("#gearPick");
  classPicker(pickEl, k => { cls = k; drawSets(); }, cls);
  function drawSets() {
    $$("#gearPick .cls").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === cls));
    const c = CL[cls];
    $("#tierSets").style.setProperty("--cc", c.c);
    $("#tierSets").innerHTML = T.filter(s => s.cls === cls).map((s, si) => {
      const key = s.name, on = worn[key] || {};
      const n = Object.values(on).filter(Boolean).length;
      const hasRaid = s.slots.some(x => x.raid);
      const slots = s.slots.map((x, k) => {
        const tid = "t" + T.indexOf(s) + "_" + k;
        const p = x.raid || x.craft;
        D.TIPS[tid] = p ? `<div class="t q-epic-t">${esc(x.raid ? x.raid.name : x.craft.name)}</div><div class="s">${x.slot}</div>${x.raid ? `<div class="s">Item level 65 · Binds when picked up</div>${x.raid.armor ? `<div class="s">${x.raid.armor} Armor</div>` : ""}<div class="d">Other stats hidden until it first drops on a realm.</div>` : ""}<div class="y" style="margin-top:.3rem">${esc(s.name)} (${n}/6)</div>${x.craft ? `<div class="g" style="margin-top:.4rem">Craftable: ${esc(x.craft.name)}, item level 61${x.craft.armor ? `, ${x.craft.armor} armor` : ""}${x.craft.prof ? ` (${x.craft.prof})` : ""}</div>` : `<div class="d" style="margin-top:.3rem">Raid drop only.</div>`}<div class="d" style="margin-top:.3rem">Click to ${on[x.slot] ? "take off" : "try on"}.</div>` : `<div class="t">${x.slot}</div><div class="d">Not published yet.</div>`;
        return `<button class="slot${on[x.slot] ? " on" : ""}${p ? "" : " none"}" data-set="${esc(key)}" data-slot="${x.slot}" data-tiph="${tid}" ${p ? "" : "disabled"}>
          <span class="ic q-epic"><img src="${ICON(x.i)}" alt=""></span>${x.craft ? `<span class="craft" title="Craftable"><img src="${ICON(PROF_ICON[x.craft.prof] || "trade_blacksmithing")}" alt="craftable"></span>` : ""}<span class="sl">${x.slot}</span></button>`;
      }).join("");
      const bon = s.bonus.length ? s.bonus.map(b => `<li class="${n >= b.n ? "lit" : ""}"><span class="pc">(${b.n})</span> Set: ${esc(b.t)}${b.stale ? ` <span class="badge sev-notable" data-tip="${esc(b.stale)} was removed from the game on 3 Nov, so this bonus will likely change.">outdated</span>` : ""}</li>`).join("")
        : `<li class="muted">Set bonuses for this set haven't been published.</li>`;
      return `<div class="tset rv"><div class="th"><div><h4 class="q-epic-t">${esc(s.name.replace(/\s*\([^)]*\)/, ""))}</h4><div class="meta mono">${s.role ? esc(s.role) + " · " : ""}${hasRaid ? "Hyjal Summit / Barrow Deeps · item level 65" : "Only the crafted pieces are published so far"}</div></div><div class="cnt"><b>${n}</b>/6</div></div>
        <div class="slots">${slots}</div><ul class="bon">${bon}</ul>${s.url ? `<a class="mono src-l" href="${esc(s.url)}" target="_blank" rel="noopener">source ↗</a>` : ""}</div>`;
    }).join("");
  }
  $("#tierSets").addEventListener("click", e => {
    const b = e.target.closest(".slot"); if (!b || b.disabled) return;
    const k = b.dataset.set; worn[k] = worn[k] || {}; worn[k][b.dataset.slot] = !worn[k][b.dataset.slot]; store.set("worn", worn);
    const before = $$(".bon li.lit", b.closest(".tset")).length;
    drawSets(); award("gear");
    if (tipOn) { tip.classList.remove("on"); tipOn = null; }
    const after = [...$$("#tierSets .tset")].find(t => t.querySelector(`[data-set="${CSS.escape(k)}"]`));
    if (after && $$(".bon li.lit", after).length > before) {
      const li = $$(".bon li.lit", after).pop(); li.classList.add("pop");
      const r = li.getBoundingClientRect(); burst(r.left + 40, r.top + r.height / 2, 16);
    }
    const sl = after && after.querySelector(`.slot[data-slot="${b.dataset.slot}"]`);
    if (sl && sl.classList.contains("on")) { const r = sl.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2 - 8, 10, .6); }
    if (after && $$(".slot.on", after).length === 6) {
      const r = after.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 60, 70, 1.6);
      wisp.talk(D.WISP.fullset, 4000);
    }
  });
  drawSets();
  // other items
  const I = D.ITEMS, box = $("#gearList");
  const groups = [...new Set(I.map(g => g.grp))];
  $("#gearChips").innerHTML = `<button class="chip" data-p="all" aria-pressed="true">All <span class="n">${I.length}</span></button>` + groups.map(p => `<button class="chip" data-p="${esc(p)}" aria-pressed="false">${esc(p)} <span class="n">${I.filter(g => g.grp === p).length}</span></button>`).join("");
  let gp = "all";
  const draw = () => {
    box.innerHTML = I.filter(g => gp === "all" || g.grp === gp).map(g => {
      const id = "g" + I.indexOf(g);
      D.TIPS[id] = `<div class="t q-${g.q}-t">${esc(g.name)}</div>${g.slot ? `<div class="s">${esc(g.slot)}</div>` : ""}${g.stats ? `<div class="g">${esc(g.stats)}</div>` : ""}${g.notes ? `<div class="y" style="margin-top:.35rem">${esc(g.notes)}</div>` : ""}${g.source ? `<div class="d" style="margin-top:.35rem">${esc(g.source)}</div>` : ""}`;
      return `<div class="item" data-tiph="${id}">${icon(g.i, "q-" + g.q)}<div><div class="nm q-${g.q}-t">${esc(g.name)}</div><div class="meta">${[g.grp, g.slot, g.source].filter(Boolean).map(esc).join(" · ")}</div>${g.stats ? `<div class="st">${esc(g.stats)}</div>` : ""}${g.notes ? `<div class="nt">${esc(g.notes)}</div>` : ""}${g.url ? `<a class="mono" style="font-size:.74rem" href="${esc(g.url)}" target="_blank" rel="noopener">source ↗</a>` : ""}</div></div>`;
    }).join("");
  };
  $("#gearChips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; gp = b.dataset.p; $$("#gearChips .chip").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); });
  draw();
}

/* ---------------- what blizzard said ---------------- */
function said() {
  const S = D.SAID, T = D.TOPICS;
  const counts = {}; S.forEach(s => counts[s.topic] = (counts[s.topic] || 0) + 1);
  $("#saidChips").innerHTML = `<button class="chip" data-t="all" aria-pressed="true">Everything <span class="n">${S.length}</span></button>` + Object.entries(T).filter(([k]) => counts[k]).map(([k, t]) => `<button class="chip" data-t="${k}" aria-pressed="false"><img src="${ICON(t.i)}" alt="" style="width:16px;height:16px;border-radius:3px">${esc(t.n)} <span class="n">${counts[k]}</span></button>`).join("");
  let tp = "all", q = "", shown = 14;
  const draw = () => {
    const L = S.filter(s => (tp === "all" || s.topic === tp) && (!q || (s.title + " " + s.summary).toLowerCase().includes(q)));
    $("#saidList").innerHTML = L.slice(0, shown).map(s => `<div class="st-row"><div class="d">${esc(fmtDate(s.date))}</div>${icon((T[s.topic] || T.other).i, "", (T[s.topic] || T.other).n)}<div><h3><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></h3><p>${esc(s.summary)}</p><div class="k"><span class="badge cf-official">${esc(KIND[s.kind] || s.kind)}</span>${s.who ? `<span class="badge" style="color:var(--muted)">${esc(s.who)}</span>` : ""}${s.via ? `<a class="badge" style="color:var(--muted);text-decoration:none" href="${esc(s.via)}" target="_blank" rel="noopener">reported via ↗</a>` : ""}</div></div></div>`).join("") || `<div class="empty">> nothing on that yet.</div>`;
    $("#saidMore").hidden = L.length <= shown;
  };
  $("#saidChips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; tp = b.dataset.t; shown = 14; $$("#saidChips .chip").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); });
  $("#saidSearch").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); draw(); });
  $("#saidMore").addEventListener("click", () => { shown += 20; draw(); award("archive"); });
  draw();
}
const KIND = { "article": "Blizzard article", "blue-post": "Blue post", "patch-notes": "Patch notes", "hotfix": "Hotfix", "interview": "Interview", "social": "Social post", "faq": "FAQ" };

/* ---------------- the wire ---------------- */
const LABELS = { official: { n: "Blizzard", i: "inv_letter_15" }, social: { n: "Blizzard social", i: "inv_misc_horn_01" }, press: { n: "Press & guides", i: "inv_misc_book_09" }, community: { n: "Community", i: "inv_shirt_guildtabard_01" } };
let NEWS = null;
async function loadNews() {
  for (let k = 0; k < 3; k++) {
    try {
      const r = await fetch("data/news.json?v=" + Math.floor(Date.now() / 6e5), { cache: "no-cache" });
      if (r.ok) return await r.json();
    } catch {}
    await new Promise(z => setTimeout(z, 600 * (k + 1)));
  }
  return window.TW_NEWS || null;
}
async function wire() {
  NEWS = await loadNews();
  const box = $("#wireList");
  if (!NEWS || !NEWS.items || !NEWS.items.length) { box.innerHTML = `<div class="empty">> the wire is quiet. couldn't load news right now; try again in a minute.</div>`; return; }
  const items = NEWS.items.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastVisit = store.get("lastVisit", 0);
  store.set("lastVisit", Date.now());
  const upd = new Date(NEWS.updated);
  const f = $(".fresh");
  f.innerHTML = `<span class="led"></span>Refreshed ${ago(NEWS.updated)} · ${items.length} stories from ${new Set(items.map(i => i.source)).size} sources`;
  if (Date.now() - upd > 12 * 36e5) f.classList.add("stale");
  // label chips
  const c = {}; items.forEach(i => c[i.label] = (c[i.label] || 0) + 1);
  $("#wireChips").innerHTML = `<button class="chip" data-l="all" aria-pressed="true">All <span class="n">${items.length}</span></button>` + Object.entries(LABELS).filter(([k]) => c[k]).map(([k, l]) => `<button class="chip lb-${k}" data-l="${k}" aria-pressed="false"><img src="${ICON(l.i)}" alt="" style="width:16px;height:16px;border-radius:3px">${l.n} <span class="n">${c[k]}</span></button>`).join("");
  let lb = "all", shown = 30;
  const draw = () => {
    const L = items.filter(i => lb === "all" || i.label === lb);
    let html = "", day = "";
    for (const i of L.slice(0, shown)) {
      const d = new Date(i.date), dk = d.toDateString();
      if (dk !== day) { day = dk; const diff = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / DAY); html += `<div class="day">${diff === 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</div>`; }
      const l = LABELS[i.label] || LABELS.press;
      const isNew = lastVisit && d.getTime() > lastVisit;
      html += `<a class="post ${i.label}${isNew ? " new" : ""}" href="${esc(i.url)}" target="_blank" rel="noopener">${icon(i.icon || l.i)}<div><div class="h">${esc(i.title)}</div>${i.summary ? `<div class="x">${esc(i.summary)}</div>` : ""}<div class="src"><span class="lb-${i.label}">${esc(l.n)}</span> · ${esc(i.source)}${i.who ? " · " + esc(i.who) : ""}</div></div><div class="t">${ago(i.date)}</div></a>`;
    }
    box.innerHTML = html || `<div class="empty">> nothing from this source yet.</div>`;
    $("#wireMore").hidden = L.length <= shown;
  };
  $("#wireChips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; lb = b.dataset.l; shown = 30; $$("#wireChips .chip").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); });
  $("#wireMore").addEventListener("click", () => { shown += 30; draw(); });
  box.addEventListener("click", e => { if (e.target.closest(".post")) award("wire"); });
  draw();
  // ticker
  const top = items.slice(0, 12);
  const one = top.map(i => `<a href="${esc(i.url)}" target="_blank" rel="noopener"><img src="${ICON(i.icon || (LABELS[i.label] || LABELS.press).i)}" alt="">${esc(i.title)} <span class="src">${esc(i.source)} · ${ago(i.date)}</span></a>`).join("");
  $(".ticker .rail").innerHTML = one + one.replace(/<a /g, '<a tabindex="-1" aria-hidden="true" ');
}

/* ---------------- sources ---------------- */
function sources() {
  const all = new Map();
  const add = s => s && s.url && !all.has(s.url) && all.set(s.url, s.name);
  D.CHANGES.forEach(c => (c.sources || []).forEach(add));
  D.ROAD.forEach(r => (r.src || []).forEach(add));
  D.SAID.forEach(s => add({ url: s.url, name: s.title }));
  D.TIER.forEach(s => s.url && add({ url: s.url, name: s.name + " (tier set)" }));
  D.ITEMS.forEach(g => g.url && add({ url: g.url, name: g.name }));
  (D.EXTRA_SOURCES || []).forEach(add);
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  $("#srcList").innerHTML = [...all].sort((a, b) => host(a[0]).localeCompare(host(b[0]))).map(([u, n]) => `<li><span class="mono" style="font-size:.74rem;color:var(--dim)">${esc(host(u))}</span><br><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a></li>`).join("");
  $("#srcCount").textContent = all.size;
}

/* ---------------- init ---------------- */
$$("img[src^='img/icons/']").forEach(i => { const k = i.getAttribute("src").slice(10, -4); if (window.TW_ICONS && TW_ICONS[k]) i.src = TW_ICONS[k]; });
D.TIPS = D.TIPS || {};
$("#lede").textContent = D.LEDE;
$$(".banner").forEach(b => { const c = document.createElement("canvas"); c.className = "motes"; c.setAttribute("aria-hidden", "true"); b.querySelector(".art").after(c); motes(c, innerWidth < 600 ? 22 : 40, true); });
$("#roadTldr").textContent = D.ROAD_TLDR;
hero(); must(); road(); spotlight(); changes(); gear(); said(); sources(); xp(); onScroll();
wire();
setTimeout(() => award("hello"), 2500);
})();
