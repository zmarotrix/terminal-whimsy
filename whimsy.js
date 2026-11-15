/* Terminal Whimsy: the extra whimsy. A hidden terminal, seven lost motes, practice loot rolls, and secrets.
   Uses the small API app.js exposes as window.TWX. Nothing here is needed to read the site. */
(() => {
"use strict";
const X = window.TWX;
if (!X) return;
const { D, $, $$, esc, ICON, store, award, wisp, fx, burst, CL } = X;
const rnd = n => Math.random() * n | 0;
const pick = a => a[rnd(a.length)];
const DAY = 864e5;

/* =================== the hidden terminal (` key, or click the green command line) =================== */
const con = document.createElement("div");
con.className = "console"; con.hidden = true; con.setAttribute("role", "dialog"); con.setAttribute("aria-label", "Terminal");
con.innerHTML = `<div class="con-out" aria-live="polite"></div><label class="con-in"><span class="ps">whimsy@forever:~$</span><input id="conInput" autocomplete="off" spellcheck="false" aria-label="Type a command"></label>`;
document.body.append(con);
const out = $(".con-out", con), inp = $("#conInput");
let hist = store.get("conHist", []), hi = hist.length, ran = store.get("conRan", 0);
const print = (html, cls = "") => { const d = document.createElement("div"); d.className = "ln " + cls; d.innerHTML = html; out.append(d); out.scrollTop = out.scrollHeight; };
function openCon() {
  if (!con.hidden) return;
  con.hidden = false; requestAnimationFrame(() => con.classList.add("on")); inp.focus(); X.hideTip();
  if (!out.childElementCount) { print(`<b>Terminal Whimsy</b> v1.60.1. Type <b>help</b> for commands. Some commands aren't listed.`, "dim"); }
  award("term");
  if (!store.get("conMet", false)) { store.set("conMet", true); wisp.talk(D.WISP.term, 4000); }
}
function closeCon() { con.classList.remove("on"); setTimeout(() => { con.hidden = true; }, 200); inp.blur(); }
addEventListener("keydown", e => {
  const inField = e.target && e.target.closest && e.target.closest("input,textarea");
  if ((e.key === "`" || e.key === "~") && !inField) { e.preventDefault(); con.hidden ? openCon() : closeCon(); }
  else if (e.key === "Escape" && !con.hidden) closeCon();
});
const termLine = $(".hero .term");
if (termLine) { termLine.classList.add("clicky"); termLine.setAttribute("data-tip", "Click to open the terminal (or press `)"); termLine.addEventListener("click", e => { e.stopPropagation(); openCon(); }); }
inp.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const line = inp.value.trim(); inp.value = "";
    if (!line) return;
    print(`<span class="ps">$</span> ${esc(line)}`, "cmd");
    hist.push(line); hist = hist.slice(-50); hi = hist.length; store.set("conHist", hist);
    run(line);
    ran++; store.set("conRan", ran); if (ran >= 10) award("poweruser");
  } else if (e.key === "ArrowUp") { e.preventDefault(); hi = Math.max(0, hi - 1); inp.value = hist[hi] || ""; }
  else if (e.key === "ArrowDown") { e.preventDefault(); hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ""; }
  else if (e.key === "Tab") { e.preventDefault(); const m = Object.keys(CMDS).filter(c => !CMDS[c].hidden && c.startsWith(inp.value)); if (m.length === 1) inp.value = m[0] + " "; else if (m.length) print(m.join("  "), "dim"); }
});

const ROOMS = { brief: "Briefing", changes: "Changes", gear: "Gear", said: "Blizzard said", wire: "The Wire", sources: "Sources" };
const FILES = {
  "readme.txt": () => `Terminal Whimsy's guide to WoW Forever.<br>Five rooms: ${Object.keys(ROOMS).slice(0, 5).join(", ")}. Type <b>go &lt;room&gt;</b>.<br>The news refreshes itself every three hours. The wisp does not refresh. The wisp is eternal.`,
  "raidplan.txt": () => `RAID PLAN, 9 DECEMBER<br>1. Show up.<br>2. Flasks. Food. Repaired gear.<br>3. Do not stand in the fire. (There will be fire.)<br>4. Kill the boss.<br>5. Argue about loot.<br>6. Repeat steps 3 to 5 twelve more times in Hyjal.`,
  "secrets.txt": () => `Permission denied. ...fine. Some hints:<br>· ${pick(["the crest doesn't like being clicked. a lot.", "old games had a code: up, up, down, down...", "some people just charge in. type their name.", "onyxia's babies come in large numbers. type that.", "seven motes are hidden on this site. one is in the footer.", "the terminal knows an old adventure game's magic word."])}`,
};
const until = (t) => { const d = new Date(t) - Date.now(); if (d <= 0) return null; return `${Math.floor(d / DAY)} days, ${Math.floor(d % DAY / 36e5)} hours`; };
function party() {
  fx.shower(); document.documentElement.classList.add("party"); setTimeout(() => document.documentElement.classList.remove("party"), 6000);
  award("secret"); wisp.talk(D.WISP.secret, 5000);
}
function dance() { document.body.classList.add("dance"); setTimeout(() => document.body.classList.remove("dance"), 3200); }
const classKey = s => Object.keys(CL).find(k => k === s || CL[k].n.toLowerCase() === s || k.startsWith(s));

const CMDS = {
  help: { d: "list commands", f: () => Object.entries(CMDS).filter(([, c]) => !c.hidden).map(([k, c]) => `<b>${k}</b>${c.u ? " " + esc(c.u) : ""} <span class="dim">· ${esc(c.d)}</span>`).join("<br>") + `<br><span class="dim">Up/Down for history, Tab to complete, Esc to close. Some commands are secret.</span>` },
  clear: { d: "clear the screen", f: () => { out.innerHTML = ""; return ""; } },
  exit: { d: "close the terminal", f: () => { closeCon(); return ""; } },
  whoami: { d: "who you are here", f: () => `${esc(X.who())}<br><span class="dim">${Object.keys(X.got).filter(k => D.ACH[k]).length} achievements · class: ${X.myClass ? CL[X.myClass].n : "not picked"} · motes: ${found().length}/7</span>` },
  name: { u: "<your name>", d: "set the name your title shows with", f: a => {
    const n = a.join(" ").replace(/[^\p{L}\p{N} '\-]/gu, "").trim().slice(0, 24);
    if (!n) return `usage: name &lt;your name&gt;`;
    store.set("name", n); award("named"); X.xp(); return `Hello, ${esc(X.who())}.`; } },
  class: { u: "<class>", d: "pick your class", f: a => { const k = classKey((a[0] || "").toLowerCase()); if (!k) return `classes: ${Object.keys(CL).join(", ")}`; X.setClass(k); return `Class set to <span style="color:${CL[k].c}">${CL[k].n}</span>. The Changes room now shows your changes first.`; } },
  go: { u: "<room>", d: "go to a room", f: a => { const r = Object.keys(ROOMS).find(k => k.startsWith((a[0] || "").toLowerCase().replace(/^#/, ""))); if (!r) return `rooms: ${Object.keys(ROOMS).join(", ")}`; location.hash = r; closeCon(); return ""; } },
  ls: { d: "look around", f: () => Object.keys(ROOMS).map(r => `<span class="dir">${r}/</span>`).join("  ") + "  " + Object.keys(FILES).join("  ") },
  cat: { u: "<file>", d: "read a file", f: a => FILES[a[0]] ? FILES[a[0]]() : `cat: ${esc(a[0] || "")}: no such file. try <b>ls</b>.` },
  raid: { d: "time until raids open", f: () => { const u = until("2026-12-09T08:00:00Z"); return u ? `Raids open in <b>${u}</b>. Barrow Deeps, Hyjal Summit, Onyxia's Lair.` : `Raids are open. Why are you in a terminal? Go raid.`; } },
  uptime: { d: "how long Forever has been live", f: () => `Forever has been live for ${Math.floor((Date.now() - new Date("2026-11-04T23:00:00Z")) / DAY)} days.` },
  roll: { u: "[max]", d: "roll the dice", f: a => { const m = Math.max(2, Math.min(1e6, parseInt(a[0]) || 100)), r = 1 + rnd(m); if (m === 100 && r === 100) award("nat100"); return `${esc(X.store.get("name", "You"))} rolls <b>${r}</b> (1-${m})${r === m ? " ✦" : ""}`; } },
  loot: { d: "practice a loot roll for your class", f: () => lootRoll(true) },
  fortune: { d: "draw a Darkmoon fortune", f: () => { award("fortune"); return `<span class="fortune">✦ ${esc(pick(D.FORTUNES))}</span>`; } },
  hotfix: { u: "[class]", d: "a random hotfix line", f: a => {
    const k = a[0] ? classKey(a[0].toLowerCase()) : X.myClass, L = X.hot.filter(l => !k || l.classes.includes(k));
    if (!L.length) return "No hotfixes loaded yet."; const l = pick(L);
    return `<span class="dim">${esc(l.date)} · ${esc(l.path.join(" › "))}</span><br>${esc(l.text)}`; } },
  change: { d: "a random big change from Classic", f: () => { const c = pick(D.CHANGES.filter(c => c.severity === "major")); return `<a href="#c-${c.id}">${esc(c.title)}</a>`; } },
  motes: { d: "how many lost motes you've found", f: () => { const n = found().length; return n === 7 ? "All seven found. The wisp is grateful. And golden." : `${n} of 7 lost motes found. ${pick(["One hides near the bottom of the briefing.", "Look closely at small print.", "The source list is a good hiding place.", "One likes the Gear room's secrets."])}`; } },
  wisp: { u: "[poke|home|show|gold|green]", d: "talk to the wisp", f: a => {
    const c = a[0] || "poke";
    if (c === "show") { wisp.show(); return "The wisp is back."; }
    if (c === "home") { wisp.home(); return "The wisp floats back to its corner."; }
    if (c === "gold") { if (found().length < 7) return "The wisp isn't ready. It wants its seven motes back."; wisp.gold(true); return "Shiny."; }
    if (c === "green") { wisp.gold(false); return "Back to classic green."; }
    wisp.poke(); return ""; } },
  achievements: { d: "your achievement count", f: () => { X.xp(); $("#achs").hidden = false; return `${Object.keys(X.got).filter(k => D.ACH[k]).length} of ${Object.keys(D.ACH).length}. Opened your list.`; } },
  date: { d: "the date", f: () => new Date().toString() },
  dance: { d: "/dance", f: () => { dance(); return "You dance. The icons dance with you."; } },
  hug: { d: "/hug the wisp", f: () => { const r = wisp.el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 20, 30, .8); wisp.talk("> aww. hug received. hug returned.", 2500); return "You hug the wisp. It is warm and slightly sparkly."; } },
  ping: { hidden: true, f: () => "pong" },
  hello: { hidden: true, f: () => `Hello, ${esc(X.who())}.` },
  hi: { hidden: true, f: () => `Hi! Type <b>help</b> if you're lost.` },
  sudo: { hidden: true, f: a => {
    const rest = a.join(" ").toLowerCase();
    if (rest === "whimsy") { party(); return "Permission granted. ✦"; }
    if (rest === "make me a sandwich") return "Okay.";
    if (rest.startsWith("rm")) return CMDS.rm.f(a.slice(1));
    return `${esc(store.get("name", "you"))} is not in the sudoers file. This incident will be reported to the wisp.`; } },
  rm: { hidden: true, f: a => {
    if (!a.join(" ").includes("-rf") && !a.join(" ").includes("-fr")) return "rm: missing operand. (please don't.)";
    award("nicetry"); wisp.el.classList.add("dizzy"); setTimeout(() => wisp.el.classList.remove("dizzy"), 3000);
    wisp.talk("> AAAA. NO. we don't do that here.", 3000);
    document.body.classList.add("shake"); setTimeout(() => document.body.classList.remove("shake"), 600);
    return `<span class="err">Deleting everything... just kidding. Nice try.</span>`; } },
  make: { hidden: true, f: a => a.join(" ").toLowerCase() === "me a sandwich" ? "What? Make it yourself." : "make: *** No rule to make that. Stop." },
  xyzzy: { hidden: true, f: () => { award("xyzzy"); return "Nothing happens."; } },
  plugh: { hidden: true, f: () => "A hollow voice says 'Fool.'" },
  leeroy: { hidden: true, f: () => { leeroy(); return ""; } },
  whelps: { hidden: true, f: () => { whelps(); return "MANY WHELPS."; } },
  konami: { hidden: true, f: () => "You know the code. Type it on the page, not in here." },
  git: { hidden: true, f: a => a[0] === "push" ? "Everything up-to-date. (The wisp handles deploys.)" : "git: that's for the officers." },
};
CMDS["/dance"] = { hidden: true, f: CMDS.dance.f }; CMDS["/hug"] = { hidden: true, f: CMDS.hug.f }; CMDS["/roll"] = { hidden: true, f: CMDS.roll.f };
CMDS.cd = { hidden: true, f: CMDS.go.f }; CMDS.quit = CMDS.close = { hidden: true, f: CMDS.exit.f }; CMDS["?"] = { hidden: true, f: CMDS.help.f };
function run(line) {
  const [cmd, ...args] = line.split(/\s+/), c = CMDS[cmd.toLowerCase()];
  if (!c) { print(`${esc(cmd)}: command not found. Type <b>help</b>.`, "err"); return; }
  const r = c.f(args);
  if (r) print(r);
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
hideMotes();
lootPanel();
timeSecrets();
})();
