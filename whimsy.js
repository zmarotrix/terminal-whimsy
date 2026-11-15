/* Terminal Whimsy: the extra whimsy. Seven lost motes, practice loot rolls, typed secrets, and page effects.
   The terminal itself lives in term-core.js, term-emacs.js and term-adv.js.
   Uses the small API app.js exposes as window.TWX. Nothing here is needed to read the site. */
(() => {
"use strict";
const X = window.TWX;
if (!X) return;
const { D, $, $$, esc, ICON, store, award, wisp, fx, burst, CL } = X;
const rnd = n => Math.random() * n | 0;
const pick = a => a[rnd(a.length)];
const DAY = 864e5;

/* =================== page effects the terminal can call =================== */
function party() {
  fx.shower(); document.documentElement.classList.add("party"); setTimeout(() => document.documentElement.classList.remove("party"), 6000);
  award("secret"); wisp.talk(D.WISP.secret, 5000);
}
function dance() { document.body.classList.add("dance"); setTimeout(() => document.body.classList.remove("dance"), 3200); }
// matrix rain over the page, in sparkles and runes
function matrix() {
  if (X.REDUCE) return;
  const cv = document.createElement("canvas"); cv.className = "matrix"; document.body.append(cv);
  const cx = cv.getContext("2d"), W = cv.width = innerWidth, H = cv.height = innerHeight, fs = 16, cols = Math.ceil(W / fs), drops = Array(cols).fill(0).map(() => rnd(H / fs));
  const glyphs = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ01✦>_";
  const t = setInterval(() => {
    cx.fillStyle = "rgba(10,12,19,.12)"; cx.fillRect(0, 0, W, H); cx.font = fs + "px monospace";
    drops.forEach((y, k) => { cx.fillStyle = Math.random() < .03 ? "#f2c56b" : "#7cf29a"; cx.fillText(pick([...glyphs]), k * fs, y * fs); drops[k] = y * fs > H && Math.random() > .97 ? 0 : y + 1; });
  }, 50);
  const stop = () => { clearInterval(t); cv.remove(); removeEventListener("keydown", stop); removeEventListener("pointerdown", stop); };
  setTimeout(stop, 9000); setTimeout(() => { addEventListener("keydown", stop, { once: true }); addEventListener("pointerdown", stop, { once: true }); }, 400);
}
// the wisp's eyes follow the cursor (xeyes)
function eyes() {
  const els = $$(".wisp .eye");
  const mv = e => { const r = wisp.el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1; els.forEach(el => el.style.transform = `translate(${dx / d * 3}px, ${dy / d * 3}px)`); };
  addEventListener("pointermove", mv);
  setTimeout(() => { removeEventListener("pointermove", mv); els.forEach(el => el.style.transform = ""); }, 20000);
}
// the wisp follows the cursor for a while (oneko, /follow)
function follow() {
  let tx = innerWidth / 2, ty = innerHeight / 2, x = tx, y = ty, raf;
  const mv = e => { tx = e.clientX + 18; ty = e.clientY + 18; };
  addEventListener("pointermove", mv);
  const loop = () => { x += (tx - x) * .08; y += (ty - y) * .08; wisp.moveTo(x, y); raf = requestAnimationFrame(loop); };
  loop();
  setTimeout(() => { cancelAnimationFrame(raf); removeEventListener("pointermove", mv); wisp.restore(); wisp.talk("> phew. that was fun. back to my corner.", 2500); }, 15000);
}

/* =================== seven lost motes =================== */
const found = () => store.get("motes", []);
const SPOTS = {
  "brief-road": () => $("#roadRail") && $("#roadRail").nextElementSibling,
  "brief-footer": () => $("footer .wrap p:last-child"),
  "changes-legend": () => $("#changes .legend"),
  "gear-secret": () => $$("#gear .facts3 > div")[2],
  "said-banner": () => $("#said .banner .cap p"),
  "wire-health": () => $("#srcHealth summary small"),
  "sources-head": () => $("#sources .rhead p"),
};
function hideMotes() {
  const have = new Set(found());
  for (const id of D.MOTES || []) {
    if (have.has(id) || !SPOTS[id]) continue;
    const host = SPOTS[id]();
    if (!host) continue;
    const b = document.createElement("button");
    b.className = "mote"; b.type = "button"; b.dataset.mote = id; b.setAttribute("aria-label", "A lost mote. Click to collect it."); b.textContent = "✦";
    host.append(b);
  }
}
document.addEventListener("click", e => {
  const m = e.target.closest(".mote"); if (!m) return;
  e.preventDefault(); e.stopPropagation();
  const have = found(); if (!have.includes(m.dataset.mote)) have.push(m.dataset.mote); store.set("motes", have);
  const r = m.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 34, 1.1);
  m.classList.add("got"); setTimeout(() => m.remove(), 400);
  award("mote1");
  if (have.length >= 7) { award("motes"); wisp.gold(true); award("golden"); wisp.talk(D.WISP.motes, 5000); fx.shower(80); }
  else wisp.talk(D.WISP.mote.replace("{n}", have.length), 3500);
}, true);

/* =================== practice loot roll (Gear room + terminal) =================== */
const RAIDERS = ["Bubblehearth", "Tankerbell", "Critsy", "Lootlord", "Moonbeamz", "Healsbarry", "Shieldon", "Frostbyte", "Dotsworth", "Sneakers", "Totemic", "Pewpewlaser", "Sprinkles", "Grumbolt", "Fizzlewick", "Wobbletoes", "Saltshaker", "Mendalot", "Stabigail"];
function lootRoll(text) {
  const cls = ($("#gearPick [aria-pressed=true]") || {}).dataset?.k || X.myClass || "warrior";
  const sets = D.TIER.filter(s => s.cls === cls && s.slots.some(x => x.raid));
  if (!sets.length) return text ? "No tier pieces published for that class yet." : null;
  const set = pick(sets), slot = pick(set.slots.filter(x => x.raid));
  const you = 1 + rnd(100), rivals = RAIDERS.slice().sort(() => Math.random() - .5).slice(0, 2 + rnd(4)).map(n => ({ n, r: 1 + rnd(100) }));
  const all = [{ n: store.get("name", "You"), r: you, me: true }, ...rivals].sort((a, b) => b.r - a.r);
  const won = all[0].me;
  if (you === 100) award("nat100");
  if (won) { award("lootwin"); store.set("lootLoss", 0); }
  else { const l = store.get("lootLoss", 0) + 1; store.set("lootLoss", l); if (l >= 5) award("lootloss"); }
  setTimeout(() => wisp.talk(won ? D.WISP.lootwin : D.WISP.lootloss, 2500), 400);
  if (won) setTimeout(() => { const el = $("#lootOut .ic") || wisp.el; const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 40, 1.2); }, 150);
  const item = `<span class="q-epic-t">[${esc(slot.raid.name)}]</span>`;
  const rows = all.map(p => `${p.me ? "<b>" : ""}${esc(p.n)} rolls ${p.r} (Need)${p.me ? "</b>" : ""}`).join("<br>");
  if (text) return `Loot: ${item}<br>${rows}<br>${won ? `<span class="win">You won ${item}!</span>` : `<span class="err">${esc(all[0].n)} won ${item}.</span>`}`;
  return { set, slot, all, won, item, cls };
}
function lootPanel() {
  const host = $("#gear .pick"); if (!host) return;
  const p = document.createElement("div");
  p.className = "panel loot";
  p.innerHTML = `<div class="lh"><div><p class="lbl">Practice loot roll</p><p class="muted">A random Tier 1 piece for the class above drops. You and a few raiders roll Need.</p></div><button class="btn" id="lootBtn"><img src="${ICON("inv_misc_dice_02")}" alt="">Roll Need</button></div><div id="lootOut" class="lootout" aria-live="polite"></div>`;
  host.after(p);
  $("#lootBtn").addEventListener("click", () => {
    const r = lootRoll(false); if (!r) { $("#lootOut").innerHTML = `<p class="muted">No tier pieces published for that class yet.</p>`; return; }
    $("#lootOut").innerHTML = `<div class="drop"><span class="ic q-epic"><img src="${ICON(r.slot.i)}" alt=""></span><div><div class="q-epic-t nm">${esc(r.slot.raid.name)}</div><div class="muted">${esc(r.slot.slot)} · ${esc(r.set.name.replace(/\s*\([^)]*\)/, ""))}</div></div></div>
      <ol class="rolls">${r.all.map((x, k) => `<li class="${x.me ? "me" : ""}${k === 0 ? " top" : ""}" style="animation-delay:${k * 90}ms"><span>${esc(x.n)}</span><b>${x.r}</b></li>`).join("")}</ol>
      <p class="${r.won ? "win" : "err"}">${r.won ? "You won it! Loot council is drafting a strongly worded note." : `${esc(r.all[0].n)} won it.`} ${r.all.find(x => x.me).r === 100 ? "A natural 100!" : ""}</p>`;
  });
}

/* =================== typed secrets, Konami, time and crest =================== */
function leeroy() {
  const el = document.createElement("div"); el.className = "sprite leeroy";
  el.innerHTML = `<img src="${ICON("ability_warrior_charge")}" alt=""><b>LEEEEROOOY</b>`;
  document.body.append(el); setTimeout(() => el.remove(), 2600);
  award("leeroy"); setTimeout(() => wisp.talk(D.WISP.leeroy, 3000), 2200);
}
function whelps() {
  for (let k = 0; k < 18; k++) {
    const w = document.createElement("img"); w.className = "sprite whelp"; w.src = ICON("inv_misc_head_dragon_black"); w.alt = "";
    w.style.top = (8 + Math.random() * 80) + "vh"; w.style.animationDelay = (k * 0.12) + "s"; w.style.animationDuration = (2.2 + Math.random() * 1.4) + "s";
    document.body.append(w); setTimeout(() => w.remove(), 4500);
  }
  award("whelps"); wisp.talk(D.WISP.whelps, 3000);
}
let typed = "";
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let kseq = [];
addEventListener("keydown", e => {
  kseq = [...kseq, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-10);
  if (kseq.join() === KONAMI.join()) {
    document.documentElement.classList.add("crt"); setTimeout(() => document.documentElement.classList.remove("crt"), 12000);
    award("konami"); wisp.talk(D.WISP.konami, 4000); kseq = [];
  }
  if (e.target.closest && e.target.closest("input,textarea") || !e.key || e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-16);
  if (typed.endsWith("leeroy")) { leeroy(); typed = ""; }
  else if (typed.endsWith("many whelps")) { whelps(); typed = ""; }
});
// the crest dislikes being clicked repeatedly
let crestClicks = [];
const brand = $(".brand");
brand.addEventListener("click", () => {
  const now = Date.now(); crestClicks = crestClicks.filter(t => now - t < 3500); crestClicks.push(now);
  if (crestClicks.length >= 7) {
    crestClicks = []; brand.classList.remove("spin"); void brand.offsetWidth; brand.classList.add("spin");
    const r = $(".crest", brand).getBoundingClientRect(); burst(r.left + 14, r.top + 14, 40);
    award("crest"); wisp.talk(D.WISP.crest, 3000);
  }
});
function timeSecrets() {
  const now = new Date(), h = now.getHours();
  if (h >= 0 && h < 4) { award("nightowl"); wisp.sleep(); setTimeout(() => wisp.talk(D.WISP.sleepy, 4000), 3500); }
  if (now.getFullYear() === 2026 && now.getMonth() === 11 && now.getDate() === 9) { award("raidnight"); setTimeout(() => { fx.shower(120); wisp.talk(D.WISP.raidnight, 6000); }, 1200); }
}

/* =================== go =================== */
Object.assign(X, { party, dance, matrix, eyes, follow, leeroy, whelps, lootRoll });
hideMotes();
lootPanel();
timeSecrets();
})();
