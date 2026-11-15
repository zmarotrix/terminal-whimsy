/* Terminal Whimsy: the secret pages. The Wisp's Vault (encrypted with the seven seals), the Darkmoon Faire
   (fishing and Sayge), fictional patch notes, the credits, the graveyard, and the Twisting Nether (404).
   Also: a note for anyone reading the browser console. */
(() => {
"use strict";
const X = window.TWX;
if (!X) return;
const { D, $, $$, esc, ICON, store, award, wisp, fx, burst } = X;
const T = () => window.TWT;
const flags = () => store.get("flags", {});
const setFlag = (k, v = true) => { const f = flags(); f[k] = v; store.set("flags", f); };
const rnd = n => Math.random() * n | 0, pick = a => a[rnd(a.length)];
const main = $("main");
function section(id, inner) {
  const s = document.createElement("section");
  s.className = "room secret"; s.id = id; s.dataset.room = id; s.hidden = true; s.innerHTML = inner;
  main.append(s); return s;
}
const banner = (img, title, sub, credit) => `<div class="banner" style="--img:url(img/${img})"><div class="art"></div><div class="cap"><span class="eyebrow">✦ SECRET PAGE</span><h2>${title}</h2><p>${sub}</p></div><span class="credit">${credit} · © Blizzard</span></div>`;

/* =================== the Wisp's Vault =================== */
const vault = section("vault", banner("gilneas.jpg", "The Wisp's Vault", "Sealed with seven words. You found them all.", "WoW Forever loading screen") + `<div class="wrap"><div id="vaultBody" class="vaultbody"><p class="muted">Turning the seven seals...</p></div></div>`);
async function showVault() {
  award("vaultseen");
  let h = X.vaultHTML;
  if (!h) { const w = store.get("sealWords", null); if (!w || !X.decryptVault) { $("#vaultBody").innerHTML = `<p class="muted">The vault is sealed. Open the terminal (press \`) and find the seven seals.</p>`; return; } try { h = X.vaultHTML = await X.decryptVault(w); } catch { $("#vaultBody").innerHTML = `<p class="muted">The seals don't fit. Speak them again in the terminal.</p>`; return; } }
  const first = store.get("vaultDate", null) || new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }); store.set("vaultDate", first);
  $("#vaultBody").innerHTML = h.replace(/{{name}}/g, esc(store.get("name", "Adventurer"))).replace(/{{title}}/g, esc(X.title())).replace(/{{date}}/g, esc(first));
  const f = flags(); if (!f.vaultParty) { setFlag("vaultParty"); fx.shower(200); setTimeout(() => wisp.talk("> you're in my vault. i remember everything now. thank you. truly.", 6000), 800); }
}
X.addRoom("vault", { open: () => store.get("vault", false), locked: "nether", tab: "Vault", icon: "inv_misc_key_03", onShow: showVault });

/* =================== the Darkmoon Faire =================== */
const FISH = [
  { n: "Old Boot", i: "inv_boots_09", q: "poor", w: 14, junk: true },
  { n: "Waterlogged Patch Notes", i: "inv_scroll_05", q: "poor", w: 8, junk: true, note: "Smudged. You can make out 'Salvation: removed'." },
  { n: "Rusty Ring", i: "inv_jewelry_ring_01", q: "poor", w: 6, junk: true },
  { n: "Raw Brilliant Smallfish", i: "fish_smallfish", q: "common", w: 22 },
  { n: "Raw Longjaw Mud Snapper", i: "fish_longjaw", q: "common", w: 18 },
  { n: "Raw Bristle Whisker Catfish", i: "fish_catfish", q: "common", w: 14, skill: 50 },
  { n: "Raw Mithril Head Trout", i: "fish_trout", q: "common", w: 10, skill: 100 },
  { n: "Stonescale Eel", i: "fish_stonescale", q: "uncommon", w: 6, skill: 150 },
  { n: "Raw Whitescale Salmon", i: "fish_salmon", q: "common", w: 8, skill: 200 },
  { n: "Darkmoon Shell", i: "inv_misc_shell_02", q: "uncommon", w: 4, note: "It's shut tight. Open it from your bag." },
  { n: "Message in a Bottle", i: "fish_bottle", q: "uncommon", w: 3, bottle: true, note: "It's corked. Open it from your bag." },
  { n: "Mr. Pinchy", i: "ability_hunter_pet_crab", q: "rare", w: 1.2, skill: 75, pinchy: true, note: "A magical crab! He's in your bag, and he grants wishes. Three of them. Then he pinches." },
  { n: "Murloc Plushie", i: "inv_misc_head_murloc_01", q: "epic", w: 0.5, skill: 150, note: "Mrglglgl. (Soft.)" },
  { n: "Sea Turtle", i: "ability_hunter_pet_turtle", q: "epic", w: 0.25, skill: 225, note: "You can't keep it. You let it go. It waves a flipper.", release: true },
];
// what the bottles say. Opening them collects them; they're hints, mostly.
const LETTERS = [
  ["The raid log remembers what burns. grep is your friend.", "someone who stood in the fire, on purpose"],
  ["Fizzlewick encodes things twice. Undo base64 first.", "a gnome who has met Fizzlewick"],
  ["Grumbolt's Emacs knows the third. M-x eval-buffer.", "a friend with very tired pinky fingers"],
  ["The barrow door's riddle is about something you drink before a pull.", "a thirsty warrior"],
  ["The sixth seal is in Blizzard's hotfix notes. Search respawn.", "a raider, waiting on a respawn"],
  ["xxd -r -p /proc/wisp/memory", "nobody. (The handwriting glows a little.)"],
  ["Sayge at the in-game faire, and the one in the terminal adventure, both know the door's word.", "a fortune teller's cousin"],
];
const WHISPERS = [
  "You hold the shell to your ear. You hear the sea, and very faintly, a raid leader saying 'one more pull'.",
  "You pry it open. Inside: sand, and a very small hermit crab who would like you to leave.",
  "You hold it to your ear. A tiny voice says 'mrgl'. You decide not to ask.",
  "Empty. Even the shell seems disappointed.",
  "You hear the sea, then a whisper: 'the wisp remembers in hex.'",
];
const PEARLS = [
  { n: "Small Lustrous Pearl", i: "pearl_small", q: "uncommon", w: 30, pearl: true },
  { n: "Iridescent Pearl", i: "pearl_iridescent", q: "uncommon", w: 14, pearl: true },
  { n: "Black Pearl", i: "pearl_black", q: "uncommon", w: 7, pearl: true },
  { n: "Golden Pearl", i: "pearl_golden", q: "rare", w: 3, pearl: true, golden: true },
];
const BYN = Object.fromEntries([...FISH, ...PEARLS].map(x => [x.n, x]));
const kind = it => it.bottle ? "bottle" : it.n === "Darkmoon Shell" ? "shell" : it.pinchy ? "pinchy" : it.pearl ? "pearl" : it.junk ? "junk" : it.n === "Murloc Plushie" ? "plush" : "fish";
const FLAVOR = { "Old Boot": "Size: tauren.", "Waterlogged Patch Notes": "Smudged. You can make out 'Salvation: removed'.", "Rusty Ring": "+1 Rust.", "Darkmoon Shell": "Something rattles inside. Or someone.", "Message in a Bottle": "Corked tight. Somebody had something to say.", "Mr. Pinchy": "A magical crab. Grants three wishes. Pinches.", "Murloc Plushie": "Mrglglgl. (Soft.)", "Small Lustrous Pearl": "Small, lustrous, and very pleased with itself.", "Iridescent Pearl": "It changes colour when you're not looking.", "Black Pearl": "Dark as a raid night with no healers.", "Golden Pearl": "Sayge would call it priceless. Sayge says that about everything." };
const SELL = { "Old Boot": 1, "Rusty Ring": 3, "Waterlogged Patch Notes": 1 };
const USE = { bottle: "Use: Uncork it and read the message.", shell: "Use: Open it. Pearls have been known to hide in these.", plush: "Use: Squeeze.", fish: "Use: Toss it back into the pond." };
const tag = it => `<span class="q-${it.q}-t">[${esc(it.n)}]</span>`;
function tipFor(n, c) {
  const it = BYN[n], k = kind(it), use = k === "pinchy" ? `Use: Make a wish. (${3 - (fstate().wish || 0)} left)` : USE[k];
  return `<div class="t q-${it.q}-t">${esc(n)}</div>${k === "pearl" ? `<div class="s">Trade Goods</div>` : k === "fish" ? `<div class="s">Cooking</div>` : ""}${use ? `<div class="g">${esc(use)}</div>` : ""}${FLAVOR[n] ? `<div class="y">"${esc(FLAVOR[n])}"</div>` : ""}${k === "junk" ? `<div class="s">Sell Price: ${SELL[n] || 1}c</div>` : ""}<div class="d">${k === "junk" ? "Click to sell it to the gnome." : k === "pearl" ? "Click to admire it." : "Click to use it."}${c > 1 ? ` You have ${c}.` : ""}</div>`;
}
const darkmoon = section("darkmoon", banner("isle.jpg", "The Darkmoon Faire", "Fishing, fortunes, and absolutely no goblins operating the rides.", "WoW Forever loading screen") + `<div class="wrap">
  <div class="rhead"><span class="mini-wisp happy" aria-hidden="true"></span><div><h2>The faire pond</h2><p>Cast, wait for the splash, then click the bobber fast. Your fishing skill goes up with every catch.</p></div></div>
  <div class="fishing">
    <div class="pond" id="pond" aria-label="The faire pond"><div class="ripple r1"></div><div class="ripple r2"></div><div class="ripple r3"></div><button class="bobber" id="bobber" hidden aria-label="Bobber: click when it splashes"></button><p class="pondmsg" id="pondMsg">The water is calm. Cast your line.</p></div>
    <div class="fishside">
      <button class="btn" id="castBtn"><img src="${ICON("inv_fishingpole_02")}" alt="">Cast</button>
      <div class="skill"><span>Fishing</span><div class="skillbar"><i id="skillBar"></i></div><b id="skillNum">1/300</b></div>
      <p class="muted" id="fishStats"></p>
      <div class="bagbox"><div class="baghead"><img src="${ICON("inv_misc_bag_10")}" alt=""><b>Your bag</b><span class="purse" id="purse"></span></div><div class="bag" id="bag"></div><p class="muted baghint" id="bagHint"></p><button class="chip" id="lettersBtn" hidden></button></div>
    </div>
  </div>
  <div class="bagout" id="bagOut" hidden></div>
  <div class="wave" aria-hidden="true"></div>
  <div class="rhead"><span class="mini-wisp wow" aria-hidden="true"></span><div><h2>Sayge's tent</h2><p>Answer three questions honestly. Sayge will know if you don't.</p></div></div>
  <div class="sayge" id="sayge"></div>
</div>`);
let fishing = null;
const fstate = () => {
  const f = store.get("fish", { skill: 1, caught: 0, log: [], misses: 0 });
  // older saves only kept a log of catches; their bag is whatever that log holds
  if (!f.bag) { f.bag = {}; for (const n of f.log || []) if (BYN[n] && !BYN[n].release) f.bag[n] = (f.bag[n] || 0) + 1; }
  f.notes = f.notes || []; f.copper = f.copper || 0; return f;
};
const bagAdd = (f, n, k = 1) => { f.bag[n] = (f.bag[n] || 0) + k; };
const bagTake = (f, n) => { if (!(--f.bag[n] > 0)) delete f.bag[n]; };
function drawFishSide() {
  const f = fstate();
  $("#skillBar").style.width = (f.skill / 300 * 100) + "%"; $("#skillNum").textContent = `${f.skill}/300`;
  $("#fishStats").textContent = `${f.caught} caught · ${f.misses} got away`;
  const ents = Object.entries(f.bag), slots = Math.max(16, Math.ceil(ents.length / 4) * 4), TIPS = D.TIPS || (D.TIPS = {});
  $("#bag").innerHTML = Array.from({ length: slots }, (_, k) => {
    const e = ents[k]; if (!e) return `<span class="slot"></span>`;
    const [n, c] = e, it = BYN[n]; TIPS["bag:" + n] = tipFor(n, c);
    return `<button class="slot ic q-${it.q}" data-use="${esc(n)}" data-tiph="bag:${esc(n)}" aria-label="${esc(n)}${c > 1 ? ", " + c : ""}"><img src="${ICON(it.i)}" alt="">${c > 1 ? `<b>${c}</b>` : ""}</button>`;
  }).join("");
  $("#purse").innerHTML = f.copper ? `${f.copper}<i class="cu" title="copper"></i>` : "";
  $("#bagHint").textContent = ents.length ? "Click an item to use it." : "Empty. Go catch something.";
  const lb = $("#lettersBtn"); lb.hidden = !f.notes.length; lb.textContent = `Letters from the pond: ${f.notes.length} of ${LETTERS.length}`;
}
function cast() {
  if (fishing) return;
  const pond = $("#pond"), b = $("#bobber"), msg = $("#pondMsg");
  const x = 15 + Math.random() * 70, y = 25 + Math.random() * 50;
  b.style.left = x + "%"; b.style.top = y + "%"; b.hidden = false; b.className = "bobber"; msg.textContent = "Waiting for a bite...";
  const bite = wispDown() ? 1000 + Math.random() * 1600 : 1800 + Math.random() * 6000;
  fishing = { biting: false, t: setTimeout(() => {
    fishing.biting = true; b.classList.add("bite"); msg.textContent = wispDown() ? "SPLASH! Something glowing is on the line!" : "SPLASH!";
    const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 10, .5);
    fishing.t2 = setTimeout(() => { if (fishing && fishing.biting) { const f = fstate(); f.misses++; store.set("fish", f); msg.textContent = "It got away. Fish are like that."; end(); if (f.misses >= 5) award("fishmiss"); drawFishSide(); } }, 1300);
  }, bite) };
  $("#castBtn").disabled = true;
}
function end() { if (!fishing) return; clearTimeout(fishing.t); clearTimeout(fishing.t2); fishing = null; $("#bobber").hidden = true; $("#castBtn").disabled = false; }
function reel() {
  if (!fishing) return;
  const msg = $("#pondMsg");
  if (!fishing.biting) { msg.textContent = "You reeled in too soon. The fish laugh at you."; end(); return; }
  if (wispDown()) {     // the next catch after dropping the wisp in is always the wisp
    const f = fstate(); f.caught++; store.set("fish", f); store.set("wispInPond", null);
    const b = $("#bobber").getBoundingClientRect(); burst(b.left + b.width / 2, b.top + b.height / 2, 70, 1.1);
    msg.innerHTML = `You caught <span class="q-legendary-t">[The Wisp]</span>! Soggy, glowing, and absolutely delighted.`;
    award("wispfished"); end(); drawFishSide(); drawWispGlow();
    setTimeout(() => { const w = wisp.el; w.hidden = false; w.classList.remove("boing"); void w.offsetWidth; w.classList.add("boing"); wisp.talk(pick(["> blub. BLUB. i saw a fish wearing a hat down there.", "> i'm fine. i'm FINE. i have pond in my eyes.", "> there's a whole guild of murlocs down there. they have loot council too.", "> never do that again. (it was quite nice actually.)"]), 4000); }, 500);
    return;
  }
  const f = fstate(), pool = FISH.filter(x => !x.skill || f.skill >= x.skill), tot = pool.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * tot, it = pool[0]; for (const x of pool) { r -= x.w; if (r <= 0) { it = x; break; } }
  f.caught++; f.log.push(it.n); f.log = f.log.slice(-50); if (!it.release) bagAdd(f, it.n); if (!it.junk && f.skill < 300) f.skill = Math.min(300, f.skill + (f.skill < 75 ? 3 : f.skill < 150 ? 2 : 1)); store.set("fish", f);
  const b = $("#bobber").getBoundingClientRect(); burst(b.left + b.width / 2, b.top + b.height / 2, it.q === "epic" || it.q === "rare" ? 60 : 24, 1);
  msg.innerHTML = `You caught <span class="q-${it.q}-t">[${esc(it.n)}]</span>!${it.note ? " " + esc(it.note) : ""}`;
  award("fish1"); if (it.pinchy) award("pinchy"); if (it.q === "epic") award("fishepic"); if (it.n === "Old Boot") award("fishboot"); if (f.caught >= 25) award("fish25"); if (f.skill >= 150) award("angler");
  end(); drawFishSide();
}
$("#castBtn").addEventListener("click", cast);
$("#bobber").addEventListener("click", e => { e.stopPropagation(); reel(); });
$("#pond").addEventListener("click", () => { if (fishing && !fishing.biting) { $("#pondMsg").textContent = "You splash the water. The fish are unimpressed."; } });

/* ---- the bag: everything you've caught, and what each thing does ---- */
function findItem(q) {      // a player's words -> the name of something in the bag
  const f = fstate(), t = String(q || "").toLowerCase().replace(/[^a-z' .]/g, " ").replace(/\s+/g, " ").trim(), ws = t.split(" "), own = Object.keys(f.bag);
  if (!t) return null;
  const hit = own.find(x => x.toLowerCase() === t) || own.find(x => t.length > 3 && x.toLowerCase().includes(t));
  if (hit) return hit;
  for (const w of ws) { const m = WORDS[w]; if (m && f.bag[m]) return m; }
  if (ws.some(w => /^pearls?$/.test(w))) return own.find(x => BYN[x].pearl) || null;
  if (ws.some(w => /^fish(es)?$/.test(w))) return own.find(x => kind(BYN[x]) === "fish") || null;
  return null;
}
const WORDS = { bottle: "Message in a Bottle", message: "Message in a Bottle", shell: "Darkmoon Shell", clam: "Darkmoon Shell", seashell: "Darkmoon Shell", pinchy: "Mr. Pinchy", crab: "Mr. Pinchy", plushie: "Murloc Plushie", plush: "Murloc Plushie", toy: "Murloc Plushie", boot: "Old Boot", ring: "Rusty Ring", patch: "Waterlogged Patch Notes", smallfish: "Raw Brilliant Smallfish", snapper: "Raw Longjaw Mud Snapper", longjaw: "Raw Longjaw Mud Snapper", catfish: "Raw Bristle Whisker Catfish", trout: "Raw Mithril Head Trout", eel: "Stonescale Eel", salmon: "Raw Whitescale Salmon", lustrous: "Small Lustrous Pearl", iridescent: "Iridescent Pearl", black: "Black Pearl", golden: "Golden Pearl" };
const letterHTML = i => `<div class="letter"><p>${esc(LETTERS[i][0])}</p><p class="from">— ${esc(LETTERS[i][1])}</p></div>`;
function showOut(h, letter) {
  const el = $("#bagOut"); el.hidden = false;
  el.innerHTML = `<p class="bagmsg">${h}</p>${letter != null ? letterHTML(letter) : ""}`;
  if (X.room === "darkmoon") el.scrollIntoView({ block: "nearest", behavior: X.REDUCE ? "auto" : "smooth" });
}
function useItem(n) {
  const f = fstate(), it = BYN[n];
  if (!it || !f.bag[n]) return { html: "You don't have that." };
  const k = kind(it); let h, letter = null;
  if (k === "bottle") {
    bagTake(f, n);
    const unread = LETTERS.map((_, i) => i).filter(i => !f.notes.includes(i)), again = !unread.length;
    letter = again ? rnd(LETTERS.length) : pick(unread); if (!again) f.notes.push(letter);
    h = `You uncork the bottle and shake out a note.${again ? " (You've read this one. The pond repeats itself.)" : ""}`;
    award("bottle"); if (f.notes.length >= LETTERS.length) award("bottles");
  } else if (k === "shell") {
    bagTake(f, n);
    if (Math.random() < .5) h = esc(pick(WHISPERS));
    else {
      let x = Math.random() * PEARLS.reduce((s, p) => s + p.w, 0), p = PEARLS[0];
      for (const q of PEARLS) { x -= q.w; if (x <= 0) { p = q; break; } }
      bagAdd(f, p.n); if (p.golden) award("pearl");
      h = `You pry the shell open. Inside: ${tag(p)}!`;
    }
  } else if (k === "pinchy") {
    f.wish = (f.wish || 0) + 1;
    if (f.wish === 1) { h = "You wish for sparkles. Mr. Pinchy clicks his claws. Granted."; setTimeout(() => fx.shower(90), 100); }
    else if (f.wish === 2) { f.skill = Math.min(300, f.skill + 10); h = "You wish to be better at fishing. Mr. Pinchy clicks his claws. Your Fishing goes up by 10."; }
    else { bagTake(f, n); f.wish = 0; award("wishes"); h = "You wish for Mr. Pinchy to stay forever. He thinks about it, pinches you affectionately, and scuttles back into the pond. That was the third wish."; }
  } else if (k === "plush") {
    h = esc(pick(["You squeeze the plushie. 'Mrglglgl!'", "Squeak. Mrgl. Squeak.", "It's very soft. The wisp looks a little jealous."]));
    if (Math.random() < .5) wisp.talk("> mrgl? ...MRGL!", 1800);
  } else if (k === "pearl") {
    h = esc(pick([`You hold the ${n} up to the light. It's lovely, and it knows it.`, `You admire the ${n}. It admires you back.`, `The ${n} gleams. Somewhere, a jeweller senses it.`]));
  } else if (k === "junk") {
    bagTake(f, n); const c = SELL[n] || 1; f.copper += c;
    h = `The gnome buys your ${tag(it)} for ${c} copper. ${esc(pick(["'A fine specimen!' she lies.", "'I know a guy,' she says.", "'Collectors love these,' she says, to nobody in particular."]))}`;
  } else {
    bagTake(f, n);
    h = `You toss the ${tag(it)} back. It swims off ${esc(pick(["without a word of thanks.", "with a flick of its tail.", "to tell its friends about you.", "looking slightly offended."]))}`;
  }
  store.set("fish", f);
  X.hideTip && X.hideTip(); drawFishSide(); showOut(h, letter);
  return { html: h, letter };
}
$("#bag").addEventListener("click", e => { const b = e.target.closest("[data-use]"); if (b) useItem(b.dataset.use); });
$("#lettersBtn").addEventListener("click", () => {
  const f = fstate(), el = $("#bagOut"); el.hidden = false;
  el.innerHTML = `<p class="bagmsg">Letters you've fished out of the pond, ${f.notes.length} of ${LETTERS.length}:</p>` + f.notes.map(letterHTML).join("");
});
const describe = n => { const it = BYN[n], c = fstate().bag[n] || 0, k = kind(it), use = k === "pinchy" ? "Use: Make a wish." : USE[k]; return `${tag(it)}${c > 1 ? " x" + c : ""}${FLAVOR[n] ? ` <span class="dim">"${esc(FLAVOR[n])}"</span>` : ""}${use ? `\n<span class="q-uncommon-t">${esc(use)}</span>` : ""}`; };
// for the terminal (and the adventure): use something, get the result as terminal markup
function termUse(n) {
  const r = useItem(n);
  return r.html + (r.letter != null ? `\n\n    <span class="hl">${esc(LETTERS[r.letter][0])}</span>\n        <span class="dim">— ${esc(LETTERS[r.letter][1])}</span>` : "");
}
X.bag = { find: findItem, use: useItem, term: termUse, describe, list: () => Object.entries(fstate().bag), tag: n => tag(BYN[n]) };

/* ---- the wisp, dropped in the pond, sinks; the next thing you catch is the wisp ---- */
const wispDown = () => !!store.get("wispInPond", null) && wisp.el.hidden;
function drawWispGlow() {
  const p = store.get("wispInPond", null), g = $("#wispGlow"); if (g) g.remove();
  if (p) $("#pond").insertAdjacentHTML("beforeend", `<div class="wispglow" id="wispGlow" style="left:${p.x}%;top:${p.y}%" aria-hidden="true"></div>`);
}
wisp.onDrop = (under, x, y) => {
  if (X.room !== "darkmoon" || !under || !under.closest || !under.closest("#pond")) return false;
  const r = $("#pond").getBoundingClientRect();
  store.set("wispInPond", { x: Math.round((x - r.left) / r.width * 100), y: Math.round((y - r.top) / r.height * 100) });
  wisp.el.classList.add("sink"); burst(x, y, 30, .8); X.hideTip && X.hideTip();
  setTimeout(() => { wisp.el.hidden = true; wisp.el.classList.remove("sink"); wisp.home(); drawWispGlow(); }, 650);
  if (!fishing) $("#pondMsg").textContent = "Blub. The wisp sinks out of sight. A few glowing bubbles rise. Better fish it out.";
  award("wispdunk"); return true;
};
// still down there from last time? Keep it there, unless the pond's been locked away since
if (store.get("wispInPond", null)) { if (flags().darkmoon || flags().ticket) wisp.el.hidden = true; else store.set("wispInPond", null); }
const SAYGE_Q = [
  { q: "A goldbot whispers you, offering cheap gold. Do you:", a: ["Report it, then kill -9 it", "Ignore it, with dignity", "Ask exactly how cheap"] },
  { q: "Your healer is standing in the fire. Again. Do you:", a: ["Tell them, kindly", "Stand in it with them, for solidarity", "Record a clip for the guild Discord"] },
  { q: "The loot council gives your item to someone else. Do you:", a: ["Congratulate them, sincerely", "/roll anyway, out of habit", "Write a 3,000-word forum post"] },
];
const FORTUNES = [
  ["Sayge's Dark Fortune of Whimsy", "+10% sparkles for the rest of the day."],
  ["Sayge's Dark Fortune of Patience", "+7 to waiting for raid night."],
  ["Sayge's Dark Fortune of Loot", "Your next roll is a 100. (Sayge is not responsible for your next roll.)"],
  ["Sayge's Dark Fortune of Threat", "Tanks fear you. In a respectful way. Watch your meter."],
  ["Sayge's Dark Fortune of Chaos", "You will charge in. You will have chicken."],
  ["Sayge's Dark Fortune of Wisdom", "Read the hotfix notes. They were written for you."],
];
function sayge() {
  const box = $("#sayge"); let step = 0, picks = [];
  const draw = () => {
    if (step < 3) { const Q = SAYGE_Q[step]; box.innerHTML = `<div class="sq"><img src="${ICON("inv_misc_ticket_tarot_madness")}" alt=""><div><p class="eyebrow">QUESTION ${step + 1} OF 3</p><p class="qq">${esc(Q.q)}</p><div class="sa">${Q.a.map((a, k) => `<button class="chip" data-k="${k}">${esc(a)}</button>`).join("")}</div></div></div>`; return; }
    const k = (picks[0] * 9 + picks[1] * 3 + picks[2]) % FORTUNES.length, [n, d] = FORTUNES[k];
    store.set("sayge", { n, d, at: Date.now() }); award("sayge");
    box.innerHTML = `<div class="fortune-card"><img src="${ICON("inv_misc_ticket_tarot_lunacy")}" alt=""><div><p class="eyebrow">SAYGE SAYS</p><p class="fn">${esc(n)}</p><p>${esc(d)}</p><button class="chip" id="saygeAgain">Ask again</button></div></div>`;
    $("#saygeAgain").onclick = () => { step = 0; picks = []; draw(); };
    const r = box.getBoundingClientRect(); burst(r.left + 60, r.top + 40, 30);
  };
  box.onclick = e => { const b = e.target.closest("[data-k]"); if (!b) return; picks.push(+b.dataset.k); step++; draw(); };
  draw();
}
X.addRoom("darkmoon", { open: () => !!(flags().darkmoon || flags().ticket), locked: "nether", tab: "Darkmoon Faire", icon: "inv_misc_ticket_darkmoon_01", onShow() { award("faireseen"); drawFishSide(); drawWispGlow(); if (wispDown() && !fishing) $("#pondMsg").textContent = "Glowing bubbles rise from the deep. The wisp is still down there. Better fish it out."; if (!$("#sayge").childElementCount) sayge(); } });

/* =================== fictional patch notes =================== */
section("patchnotes", banner("excavation.jpg", "Patch 0.0.0-whimsy", "Fictional patch notes the wisp wrote and then compressed out of embarrassment.", "Excavation Site") + `<div class="wrap patch">
  <p class="callout"><b>Not real.</b> Nothing on this page is from Blizzard. It's the wisp's fan fiction.</p>
  <h3>General</h3><ul>
    <li>Raid night now arrives one day sooner for every time Sprinkles asks if it's raid night. (Currently: raid night was in 2019.)</li>
    <li>The Auction House now politely declines to sell you things you'll regret.</li>
    <li>Salvation: still gone. We are as sad as you are.</li></ul>
  <h3>Classes</h3><ul>
    <li><b>Warrior:</b> Battle Shout now also shouts encouragement. "You can do it!" (+0 attack power, +100 morale)</li>
    <li><b>Paladin:</b> Bubble Hearth is now classified as a "strategic relocation".</li>
    <li><b>Hunter:</b> Pets no longer judge you for feeding them conjured bread.</li>
    <li><b>Mage:</b> Polymorph can now target the goldbot. It becomes a sheep. The sheep also sells gold.</li>
    <li><b>Shaman:</b> Totems now come with tiny name tags so you can tell them apart.</li>
    <li><b>Warlock:</b> Life Tap now asks "are you sure?" every third use. You are always sure.</li>
    <li><b>Druid:</b> Moonkin form now has an optional dance. It is mandatory.</li>
    <li><b>Rogue:</b> Stealth now also hides you from guild officers asking about attendance.</li>
    <li><b>Priest:</b> Fear Ward now also wards against fear of raid night.</li></ul>
  <h3>Raids</h3><ul>
    <li><b>Onyxia:</b> "Many whelps" has been reduced to "several whelps". Handle them.</li>
    <li><b>Barrow Deeps:</b> The ghostly dwarf at the door has been given a better riddle. He refuses to use it.</li>
    <li><b>Hyjal Summit:</b> The World Tree now hums along if you /sing.</li></ul>
  <h3>Bug fixes</h3><ul>
    <li>Fixed an issue where Healsbarry found the fire "warm and comfortable". He now finds it "warm".</li>
    <li>Leeroy: removed the "plan" stat, which was never used.</li>
    <li>Fixed an issue where the wisp jumped when dragged past the middle of the screen. (This one is real. Thanks, guild.)</li>
    <li>Murlocs: "Mrglglgl" now correctly translates to "hello, friend, do you have fish".</li></ul>
</div>`);
X.addRoom("patchnotes", { open: () => !!flags().patchnotes, locked: "nether", tab: "Patch 0.0.0", icon: "inv_scroll_08" });

/* =================== the credits =================== */
section("credits", `<div class="crawl-wrap"><div class="crawl" id="crawl"></div></div><div class="wrap" style="text-align:center;padding-top:1rem"><button class="btn" id="crawlAgain">Roll them again</button></div>`);
function credits() {
  const name = esc(store.get("name", "You"));
  $("#crawl").innerHTML = `<p class="ep">Episode VII</p><h2>A NEW WHIMSY</h2>
<p>It is a period of raid preparation. Rebel raiders, striking from a hidden guild hall, have won their first victory against the evil Goldbot.</p>
<p>During the battle, a lone raider, ${name}, found the seven seals and opened the Wisp's Vault, restoring the memories of a very small, very green light.</p>
<p>Pursued by Grumbolt's opinions about text editors, ${name} races home aboard the Deeprun Tram, custodian of the stolen root password, to restore whimsy to the galaxy...</p>
<div class="roll"><h3>STARRING</h3><p>${name} <i>as the Hero</i></p><p>The Wisp <i>as itself</i></p><p>Grumbolt <i>as the Emacs Evangelist</i></p><p>Fizzlewick <i>as the Engineer (explosions by Fizzlewick)</i></p><p>Saltshaker <i>as the Loot Council</i></p><p>Sprinkles <i>as the One Who Asks If It's Raid Night</i></p><p>Healsbarry <i>as the Man in the Fire</i></p><p>Leeroy <i>as himself (AFK)</i></p>
<h3>SPECIAL THANKS</h3><p>Onyxia, for the whelps</p><p>The murloc at the crossroads, for the key</p><p>Sayge, for the eyebrows</p><p>Everyone in Terminal Whimsy</p>
<h3>NO GOLDBOTS WERE HARMED</h3><p>(one was, actually. pid 4242.)</p><p class="fin">✦ fin ✦</p></div>`;
  const c = $("#crawl"); c.classList.remove("go"); void c.offsetWidth; c.classList.add("go");
  award("creditsseen");
}
$("#crawlAgain").addEventListener("click", credits);
X.addRoom("credits", { open: () => !!flags().credits, locked: "nether", tab: "Credits", icon: "spell_arcane_starfire", onShow: credits });

/* =================== the graveyard (when you die) =================== */
section("graveyard", banner("lordaeron.jpg", "You have died", "Your spirit stands beside the Spirit Healer. Everything looks a little grey.", "Ruins of Lordaeron") + `<div class="wrap">
  <div class="healer"><img src="${ICON("spell_holy_resurrection")}" alt=""><div><p class="eyebrow">SPIRIT HEALER</p><p id="deathMsg" class="dm"></p>
    <div class="row" style="margin-top:1rem"><button class="btn" id="resNow">Accept resurrection (resurrection sickness)</button><button class="btn" id="runBack">Run back to your corpse</button></div></div></div>
  <div id="corpseRun" class="corpserun" hidden><p class="muted" id="crHint"></p><div class="crgrid" id="crGrid"></div><div class="row crpad"><button class="chip" data-d="up">North</button><button class="chip" data-d="left">West</button><button class="chip" data-d="right">East</button><button class="chip" data-d="down">South</button></div><p class="muted">Arrow keys work too.</p></div>
</div>`);
const ghost = on => { document.documentElement.classList.toggle("ghost", on); setFlag("ghost", on); X.secretTabs(); };
if (flags().ghost) document.documentElement.classList.add("ghost");
function die(msg) {
  ghost(true); award("died");
  $("#deathMsg").textContent = msg || "You have died.";
  if (T()) T().close();
  setTimeout(() => { location.hash = "graveyard"; wisp.talk("> oh no. you're a ghost.", 3000); }, 300);
}
function resurrect(clean) {
  ghost(false);
  if (!clean) { document.documentElement.classList.add("ressick"); setTimeout(() => document.documentElement.classList.remove("ressick"), 60000); award("spirit"); wisp.talk("> resurrection sickness. everything's a bit wobbly for a minute.", 3500); }
  else { award("corpserun"); fx.shower(80); wisp.talk("> you made it back! no sickness for you.", 3000); }
  $("#corpseRun").hidden = true;
  setTimeout(() => { location.hash = "brief"; }, 600);
}
$("#resNow").addEventListener("click", () => resurrect(false));
let run = null;
$("#runBack").addEventListener("click", () => {
  const W = 11, H = 7; run = { x: 0, y: 3, cx: 6 + rnd(5), cy: rnd(H), W, H };
  $("#corpseRun").hidden = false; drawRun();
});
function drawRun() {
  const { x, y, cx, cy, W, H } = run;
  let g = ""; for (let r = 0; r < H; r++) { for (let c = 0; c < W; c++) g += c === x && r === y ? `<span class="me">👻</span>` : c === 0 && r === 3 ? `<span>⛪</span>` : `<span>·</span>`; }
  $("#crGrid").innerHTML = g; $("#crGrid").style.gridTemplateColumns = `repeat(${W}, 1fr)`;
  const dx = cx - x, dy = cy - y, d = Math.abs(dx) + Math.abs(dy);
  $("#crHint").textContent = d === 0 ? "You found your corpse!" : `Your corpse is ${dy < 0 ? "north" : dy > 0 ? "south" : ""}${dx && dy ? "-" : ""}${dx > 0 ? "east" : dx < 0 ? "west" : ""}, about ${d * 10} yards away. ${d <= 2 ? "It's very close. You can feel it." : ""}`;
  if (d === 0) { $("#crGrid").insertAdjacentHTML("afterend", ""); setTimeout(() => resurrect(true), 600); run = null; }
}
const step = d => { if (!run) return; if (d === "up") run.y = Math.max(0, run.y - 1); if (d === "down") run.y = Math.min(run.H - 1, run.y + 1); if (d === "left") run.x = Math.max(0, run.x - 1); if (d === "right") run.x = Math.min(run.W - 1, run.x + 1); drawRun(); };
$("#corpseRun").addEventListener("click", e => { const b = e.target.closest("[data-d]"); if (b) step(b.dataset.d); });
addEventListener("keydown", e => { if (!run || X.room !== "graveyard" || (e.target.closest && e.target.closest("input"))) return; const m = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[e.key]; if (m) { e.preventDefault(); step(m); } });
X.addRoom("graveyard", { open: () => !!flags().ghost, locked: "brief", tab: "Graveyard", icon: "spell_holy_resurrection", onShow() { if (!$("#deathMsg").textContent) $("#deathMsg").textContent = "You died. It happens to the best of us. Especially Healsbarry."; } });

/* =================== the Twisting Nether (404) =================== */
section("nether", `<div class="nether"><div class="nether-sky"></div><div class="wrap"><p class="eyebrow">404 · PAGE NOT FOUND</p><h2>You have fallen into the Twisting Nether</h2><p class="lede">This page doesn't exist. Or it did, and the Legion ate it. Either way, you're floating in the void with a very small light for company.</p><div class="row" style="margin-top:1.4rem"><a class="btn" href="#brief"><img src="${ICON("spell_arcane_portaldalaran")}" alt="">Hearthstone home</a></div><p class="muted" style="margin-top:2rem">Some pages here are real, but sealed. The way to them is hidden somewhere on this site.</p></div></div>`);
X.addRoom("nether", { open: () => true, onShow() { award("nether"); } });

/* =================== things for the terminal and the curious =================== */
const TW = T(); if (TW) TW.die = die;
if (TW) {
  const how = n => ({ bottle: "open bottle", shell: "open shell", pinchy: "wish", plush: "squeeze" })[kind(BYN[n])];
  TW.cmd(["bag", "bags", "inventory", "inv", "backpack", "/bag"], () => {
    const f = fstate(), ents = Object.entries(f.bag);
    if (!ents.length) return f.caught ? "Your bag is empty. Everything's been opened, sold or tossed back." : "Your bags are empty.";
    return TW.html(`<b>Your bag</b> <span class="dim">(from the faire pond)</span>\n` + ents.map(([n, c]) => `  ${tag(BYN[n])}${c > 1 ? " x" + c : ""}${how(n) ? `   <span class="dim">${how(n)}</span>` : ""}`).join("\n")
      + (f.copper ? `\n  <span class="dim">Purse: ${f.copper} copper</span>` : "") + (f.notes.length ? `\n  <span class="dim">Letters read: ${f.notes.length} of ${LETTERS.length} (letters shows them)</span>` : "")
      + `\n<span class="dim">Anything here: use &lt;name&gt;.</span>`);
  }, { hidden: true });
  for (const [v, d] of [["use", ""], ["uncork", "bottle"], ["squeeze", "plushie"], ["wish", "pinchy"], ["sell", ""], ["toss", ""], ["admire", "pearl"]])
    TW.cmd(v, a => { const q = a.join(" ") || d, n = findItem(q); return n ? TW.html(termUse(n)) : q ? `You don't have that. (bag shows what you've got.)` : `${v[0].toUpperCase() + v.slice(1)} what? (bag shows what you've got.)`; }, { hidden: true });
  TW.cmd("letters", () => { const f = fstate(); return f.notes.length ? TW.html(f.notes.map(i => `  <span class="hl">${esc(LETTERS[i][0])}</span>\n      <span class="dim">— ${esc(LETTERS[i][1])}</span>`).join("\n\n")) : "No letters yet."; }, { hidden: true });
}
window.whimsy = {
  hint() {
    award("inspector");
    const f = store.get("seals", []), h = ["The raid log remembers what burns. grep.", "Fizzlewick's postcard: base64 -d, then rot13.", "Grumbolt's init.el, in emacs, then M-x eval-buffer.", "The adventure. Talk to everyone.", "Grumbolt's .bash_history, then ssh.", "Changes -> Hotfix log -> search 'respawn'.", "xxd -r -p /proc/wisp/memory"];
    const k = [0, 1, 2, 3, 4, 5, 6].find(i => !f.includes(i));
    return k == null ? "All seven seals found. Open the terminal and type: unlock vault. (Then try su.)" : `Seal ${["I", "II", "III", "IV", "V", "VI", "VII"][k]}: ${h[k]}`;
  },
  help() { return "whimsy.hint() gives the next hint, once you've found the way in. The way in is a key most people never press."; },
  toString() { return "✦ the wisp is watching your console. hello. try whimsy.hint()"; },
};
console.log("%c✦ Terminal Whimsy %c\nHello, inspector. The wisp sees you.\nThere is more to this page than the page. The green line at the top of the briefing is not just decoration.\nOnce you're in and stuck, try %cwhimsy.hint()%c here.", "font:700 16px Cinzel,serif;color:#f2c56b", "color:#a8aec2", "color:#7cf29a;font-family:monospace", "color:#a8aec2");
})();
