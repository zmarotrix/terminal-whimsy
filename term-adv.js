/* Terminal Whimsy: "adventure" (also M-x dunnet). A very small dungeon with a hungry murloc, a fortune teller,
   a door that wants a name, a dark barrow that eats people, and the fourth seal at the top of Hyjal. */
(() => {
"use strict";
const T = window.TWT, X = window.TWX;
if (!T || !X) return;
const { print, html, esc, award } = T;
const { store, wisp, fx } = X;

const ROOMS = {
  inn: { name: "Lion's Pride Inn, Goldshire", desc: s => `A warm inn. A bard is singing, badly, about a paladin named Leeroy. Behind the bar, an innkeeper polishes the same mug she has been polishing since launch. A fire crackles in the hearth.${s.items.inn.length ? " On the bar: " + s.items.inn.map(a).join(", ") + "." : ""} The door leads out (south).`, exits: { south: "road", out: "road" } },
  road: { name: "Elwynn crossroads", desc: s => `A signpost points west (the Barrow Deeps), north (Hyjal), and east (the Darkmoon Faire). The inn is back north-ish; call it 'in'.${s.f.murlocFed ? " The murloc is napping, full and happy." : " A murloc sits by the stream, sulking. It looks hungry."}`, exits: { west: "gate", north: "path", east: "faire", in: "inn" } },
  faire: { name: "Darkmoon Faire grounds", desc: s => `Tents, music, and the smell of fried things. A gnome vendor sells fishing poles${s.f.pole ? " (you already have one)" : " for one coin"}. Sayge's tent is here (in). A pond glimmers to the east. The road is west.`, exits: { west: "road", in: "tent", east: "pond" } },
  tent: { name: "Sayge's tent", desc: () => "Incense, velvet, and a fortune teller with very knowing eyebrows. Sayge watches you. (Try: talk to sayge.) The way out is out.", exits: { out: "faire", west: "faire" } },
  pond: { name: "The faire pond", desc: s => `A calm pond. Things move beneath the surface.${s.f.pole ? " Your pole twitches with anticipation. (Try: fish.)" : " You'd need a fishing pole."} The faire is west.`, exits: { west: "faire" } },
  gate: { name: "The Barrow Deeps gate", desc: s => s.f.doorOpen ? "The great stone door stands open. Darkness waits beyond (west). The crossroads is east." : "A great stone door, carved with a warrior charging in, arms wide. Words are cut into the stone: SPEAK THE NAME OF THE ONE WHO CHARGED. The crossroads is east.", exits: { east: "road", west: "hall" } },
  hall: { name: "The Barrow hall", dark: true, desc: s => `A long hall of old bones.${s.f.chestOpen ? " The chest stands open." : " A heavy, locked chest sits against the wall."} The gate is back east.`, exits: { east: "gate" } },
  path: { name: "The roots of Hyjal", desc: s => s.f.dug ? "You've dug a way through the roots. The path climbs north to the summit. The crossroads is south." : "The path north is choked with enormous, ancient roots. You'd need something to dig with. The crossroads is south.", exits: { south: "road", north: "summit" } },
};
const ITEMS = {
  candle: "a stubby candle", coin: "a copper coin", pole: "a fishing pole", fish: "a slippery fish", boot: "an old boot", key: "a rusty key",
  shovel: "a silver shovel", note: "a crumpled note", ticket: "a Darkmoon ticket",
};
const a = k => ITEMS[k] || k;
const fresh = () => ({ room: "inn", inv: [], items: { inn: ["candle", "coin"] }, f: {}, moves: 0, dark: 0 });
let s = store.get("adv", null) || fresh();
const save = () => store.set("adv", s);
const has = k => s.inv.includes(k);
const say = t => print(t, "adv");
function look() {
  const r = ROOMS[s.room];
  if (r.dark && !s.f.lit) { say(`${r.name}\nIt is pitch black. You are likely to be eaten by a whelp.`); return; }
  say(`${r.name}\n${r.desc(s)}`);
}
const DIR = { n: "north", s: "south", e: "east", w: "west", u: "up", d: "down", north: "north", south: "south", east: "east", west: "west", in: "in", inside: "in", enter: "in", out: "out", outside: "out", leave: "out", up: "up", down: "down" };
// returns true if you arrived somewhere (quiet: don't describe it; used when walking a route)
function move(d, quiet) {
  const r = ROOMS[s.room];
  if (r.dark && !s.f.lit && d !== "east") { die("You stumble deeper into the dark. Something small, scaly and numerous finds you first. You have been eaten by a whelp."); return false; }
  const to = r.exits[d];
  if (!to) { say(`You can't go that way. From here: ${Object.keys(r.exits).join(", ")}.`); return false; }
  if (s.room === "gate" && to === "hall" && !s.f.doorOpen) { say("The stone door doesn't move. It wants a name spoken aloud."); return false; }
  if (s.room === "path" && to === "summit" && !s.f.dug) { say("The roots are too thick. You'd need to dig."); return false; }
  s.room = to; s.moves++; save();
  if (to === "summit") { win(); return false; }
  if (!quiet) look();
  return true;
}
// places by name: 'go faire', 'go to the inn', or just 'pond'
const PLACES = { inn: ["inn", "tavern", "goldshire", "lion", "lions", "pride", "bar", "hearth"], road: ["road", "crossroads", "crossroad", "signpost", "sign", "elwynn", "stream"],
  faire: ["faire", "fair", "darkmoon", "carnival", "fairground", "fairgrounds", "grounds"], tent: ["tent", "sayge"], pond: ["pond", "lake", "water"],
  gate: ["gate", "barrow", "barrows", "deeps", "door"], hall: ["hall", "chest", "bones"], path: ["path", "roots", "hyjal", "mountain"], summit: ["summit", "top", "peak"] };
const placeOf = ws => { for (const x of ws) for (const r in PLACES) if (PLACES[r].includes(x)) return r; return null; };
function route(from, to) {
  const q = [[from, []]], seen = new Set([from]);
  while (q.length) { const [r, p] = q.shift(); if (r === to) return p; for (const [d, n] of Object.entries((ROOMS[r] || {}).exits || {})) if (!seen.has(n)) { seen.add(n); q.push([n, [...p, d]]); } }
  return null;
}
function goTo(r) {
  if (r === s.room) return say(`You're already here: ${ROOMS[r].name}.`);
  const p = route(s.room, r); if (!p) return say("You can't see a way there from here.");
  if (p.length > 1) say(`You head ${p.join(", then ")}.`);
  for (let k = 0; k < p.length; k++) if (!move(p[k], k < p.length - 1)) return;
}
// your bag: what you've found in here, plus anything you fished out of the real faire pond
const BAGW = ["bag", "bags", "backpack", "pack", "pockets", "pocket", "satchel", "inventory", "inv", "items", "belongings", "knapsack", "rucksack", "pouch", "purse"];
const BAGV = ["look", "l", "open", "search", "check", "examine", "x", "inspect", "empty", "rummage", "show", "list", "view", "see", "read", "i"];
const FAIRE = /\b(bottle|message|shell|clam|seashell|pinchy|crab|plushie|plush|pearls?|lustrous|iridescent|golden|snapper|longjaw|smallfish|catfish|trout|eel|salmon)\b/;
const ITEMV = ["open", "use", "read", "uncork", "squeeze", "wish", "sell", "toss", "admire", "unroll", "pry"];
function inventory() {
  say(s.inv.length ? "You are carrying: " + s.inv.map(a).join(", ") + (s.f.lit ? " (the candle is lit)" : "") + "." : "You are empty-handed. Mostly pockets.");
  const b = X.bag ? X.bag.list() : [];
  if (!b.length) return;
  const tryW = b.some(([n]) => /Bottle/.test(n)) ? "open bottle" : b.some(([n]) => /Shell/.test(n)) ? "open shell" : null;
  print(html(`From the faire pond, in your real bag: ${b.map(([n, c]) => X.bag.tag(n) + (c > 1 ? " x" + c : "")).join(", ")}.\n<span class="dim">Those work in here too${tryW ? `: try <b>${tryW}</b>` : ""}. Outside the game, <b>bag</b> shows them.</span>`), "adv");
}
function die(msg) {
  say(msg + "\n\n    ****  You have died  ****");
  award("advdeath");
  s = fresh(); save();
  setTimeout(() => { T.pop(); T.die && T.die("Eaten by a whelp, in the dark, in a text adventure."); }, 1400);
}
function win() {
  print(T.DATA.advEnd, "adv hl");
  award("advwin"); fx.shower(120);
  wisp.talk("> you found my lantern memory! speak it: seal lantern", 4000);
  s = fresh(); s.f.won = true; save();
  T.pop();
}
// who's in each room, and the names players call them
const PEOPLE = { inn: ["bard", "innkeeper"], road: ["murloc"], faire: ["gnome"], tent: ["sayge"] };
const ALIAS = { bartender: "innkeeper", barkeep: "innkeeper", barkeeper: "innkeeper", barmaid: "innkeeper", barman: "innkeeper", keeper: "innkeeper", inkeeper: "innkeeper", host: "innkeeper", hostess: "innkeeper",
  minstrel: "bard", singer: "bard", musician: "bard", vendor: "gnome", merchant: "gnome", shopkeeper: "gnome", teller: "sayge", fortune: "sayge", fortuneteller: "sayge", mystic: "sayge", mrgl: "murloc", fishman: "murloc" };
const INNKEEPER = [
  "The innkeeper doesn't look up from her mug. 'Welcome to the Lion's Pride. That coin on the bar? Some adventurer left it. Take it. I'm not your mum.'",
  "'Make yourself at home,' says the innkeeper. 'The hearth's warm. Good for drying socks. And lighting things, if you're the lighting-things type.'",
  "'That bard,' sighs the innkeeper, 'has been singing about Leeroy since launch. The chorus is just the name, shouted. Doors in the barrow probably know it by heart.'",
  "The innkeeper leans in. 'Murloc at the crossroads looked hungry this morning. Fish, I'd guess. Murlocs always want fish.'",
];
const SOCIAL = {
  romance: { innkeeper: "You lean on the bar and attempt romance. The innkeeper sets down the mug, looks at you for a long, long moment, and says: 'Rested XP is the only thing I give out for free, love.'", bard: "You gaze at the bard meaningfully. He takes this as a request and plays 'Leeroy' again, louder.", murloc: "You attempt romance with the murloc. It says 'Mrgl?' with the confusion of a creature who only wanted a fish.", gnome: "The gnome hands you a coupon for 10% off fishing poles. It's the most romantic thing she owns.", sayge: "Sayge already knew you'd try that. He's flattered. The answer is still no." },
  kiss: { innkeeper: "The innkeeper turns her cheek just in time and you kiss a freshly polished mug. It's very clean.", bard: "The bard blushes and changes key mid-song. It's an improvement.", murloc: "You kiss the murloc. It is damp. You are now also damp.", gnome: "The gnome dodges with engineering-grade reflexes.", sayge: "Sayge saw that coming. Literally." },
  hug: { innkeeper: "The innkeeper allows a brief hug, then hands you a rag. 'Since you're back here anyway.'", bard: "The bard hugs you back without missing a note. Professional.", murloc: "Mrgl! The murloc hugs you back. Slime is a love language.", gnome: "You hug the gnome. Something in her pocket ticks ominously.", sayge: "Sayge pats your back. 'There, there. You'll find the door's word.'" },
  hit: "Violence is not the answer here. (You're also level one, in a text adventure, armed with a candle.)",
  dance: "You dance. The bard speeds up to keep tempo. Somewhere, a gnome claps.",
  wave: "You wave. They wave back. Lovely, all round.",
  pet: { murloc: "You pet the murloc. It purrs, which you didn't know murlocs could do.", default: "They look at you as if you've just tried to pet them. Which you have." },
};
const VERBS = { romance: "romance", flirt: "romance", woo: "romance", seduce: "romance", court: "romance", wink: "romance", love: "romance", marry: "romance", propose: "romance", compliment: "romance",
  kiss: "kiss", smooch: "kiss", hug: "hug", cuddle: "hug", embrace: "hug", hit: "hit", attack: "hit", kill: "hit", punch: "hit", fight: "hit", slap: "hit", stab: "hit",
  dance: "dance", wave: "wave", greet: "wave", hello: "wave", pet: "pet", tickle: "pet", poke: "pet" };
const nm = p => p === "sayge" ? "Sayge" : "the " + p, Nm = p => p === "sayge" ? "Sayge" : "The " + p;
function who(words) {
  for (const w of words) { const n = ALIAS[w] || w; if (["bard", "innkeeper", "murloc", "gnome", "sayge"].includes(n)) return n; }
  return null;
}
function social(v, words) {
  const kind = VERBS[v], here = PEOPLE[s.room] || [], target = who(words) || (here.length === 1 && !words.length ? here[0] : null);
  if (words.length && !target) return say(here.length ? `There's no ${words.join(" ")} here. Here you see: ${here.map(nm).join(" and ")}.` : "There's nobody here to do that with. Just you, and the scenery.");
  if (target && !here.includes(target)) return say(`${Nm(target)} isn't here. ${here.length ? "Here you see: " + here.map(nm).join(" and ") + "." : "There's nobody here."}`);
  if (!target) return say(here.length ? `${v[0].toUpperCase() + v.slice(1)} whom? Here you see: ${here.map(nm).join(" and ")}.` : "There's nobody here.");
  if (kind === "romance" || kind === "kiss") award("romance");
  const r = SOCIAL[kind];
  return say(typeof r === "string" ? r : r[target] || r.default || `You ${v} ${nm(target)}. They seem unsure how to respond.`);
}
const SAYGE = [
  "Sayge peers at you. 'The door in the barrow listens only for one name. The name of the one who charged in without a plan, while his friends were still doing maths.'",
  "Sayge shuffles his cards. 'The murloc at the crossroads? Hungry. Murlocs are always hungry. Feed it something from the pond.'",
  "Sayge sighs. 'The dark eats those without light. Even a small candle, lit at a warm hearth, will do.'",
  "Sayge smiles. 'And the roots of Hyjal yield to silver. What's buried in the barrow does not stay buried.'",
];
function act(line) {
  if (/^\s*(seal|seals|unlock)/i.test(line)) { T.runLine(line); return; }   // the shell's quest commands work in here too
  const w = line.toLowerCase().replace(/[^a-z' ]/g, " ").replace(/\b(the|a|an|at|to|with|on|into|from)\b/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!w.length) return;
  const [v, ...rest] = w; let obj = rest.join(" ");
  // 'i', 'look in bag', 'open backpack', 'search pockets'
  if ((BAGW.includes(v) && !rest.length) || (BAGV.includes(v) && rest.some(x => BAGW.includes(x)))) return inventory();
  // things fished out of the real faire pond: 'open bottle', 'read message', 'use pinchy'
  if (X.bag && rest.length && ITEMV.includes(v) && FAIRE.test(obj)) { const n = X.bag.find(obj); if (n) return print(html(X.bag.term(n)), "adv"); }
  if (DIR[v]) return move(DIR[v]);
  if (["go", "walk", "run", "head", "travel", "visit", "return", "goto"].includes(v)) {
    if (DIR[rest[0]]) return move(DIR[rest[0]]);
    const pl = placeOf(rest); if (pl) return goTo(pl);
    return say(`${rest.length ? `You don't know the way to "${obj}".` : "Go where?"} From here: ${Object.keys(ROOMS[s.room].exits).join(", ")}.${rest.length ? " Or name a place: inn, crossroads, faire, tent, pond, gate, hyjal." : ""}`);
  }
  if (VERBS[v]) return social(v, rest);
  const here = s.items[s.room] || (s.items[s.room] = []), r = ROOMS[s.room], dark = r.dark && !s.f.lit;
  switch (v) {
    case "look": case "l": if (rest[0] && rest[0] !== "around") return examine(obj); return look();
    case "search": case "check": case "rummage": case "explore": return rest.length ? examine(obj) : look();
    case "examine": case "x": case "inspect": case "read": return examine(obj);
    case "i": case "inv": case "inventory": return inventory();
    case "take": case "get": case "grab": case "pick": {
      const it = rest.find(x => ITEMS[x] || x === "all");
      if (dark) return say("You fumble in the dark and find nothing but more dark.");
      if (it === "all") { if (!here.length) return say("There's nothing here to take."); s.inv.push(...here); say("Taken: " + here.map(a).join(", ") + "."); here.length = 0; return save(); }
      if (!it || !here.includes(it)) return say(it === "fire" ? "You try to pick up the fire. The bard stops singing to watch." : "You don't see that here.");
      here.splice(here.indexOf(it), 1); s.inv.push(it); save(); return say("Taken.");
    }
    case "drop": { const it = rest.find(x => has(x)); if (!it) return say("You don't have that."); s.inv.splice(s.inv.indexOf(it), 1); here.push(it); if (it === "candle") s.f.lit = false; save(); return say("Dropped."); }
    case "light": case "burn": case "ignite":
      if (!has("candle")) return say("You have nothing to light.");
      if (s.f.lit) return say("The candle is already lit. It's doing its best.");
      if (s.room !== "inn") return say("You need a flame. The inn's hearth would do.");
      s.f.lit = true; save(); award("advlight"); return say("You light the candle from the hearth. It gives a brave little glow.");
    case "talk": case "ask": case "speak": case "chat": {
      const t = who(rest) || ((PEOPLE[s.room] || []).length === 1 && !rest.length ? PEOPLE[s.room][0] : null);
      if (t === "innkeeper" && s.room === "inn") { const k = s.f.inn || 0; s.f.inn = k + 1; save(); return say(INNKEEPER[k % INNKEEPER.length]); }
      if (t && !(PEOPLE[s.room] || []).includes(t)) return say(`${Nm(t)} isn't here. ${(PEOPLE[s.room] || []).length ? "Here you see: " + PEOPLE[s.room].map(nm).join(" and ") + "." : "There's nobody here to talk to."}`);
      if (t) obj = t;
      if (/sayge/.test(obj) && s.room === "tent") { const k = s.f.sayge || 0; say(SAYGE[k % SAYGE.length]); if (!s.f.ticketGiven) { s.f.ticketGiven = true; s.inv.push("ticket"); say("Sayge presses a Darkmoon ticket into your hand. 'You'll want the real faire, too.' (In the terminal, outside this game: faire)"); T.flag("ticket"); award("ticket"); } s.f.sayge = k + 1; save(); return; }
      if (/bard/.test(obj) && s.room === "inn") return say("The bard stops mid-verse. 'Leeroy? Oh, he charged into a dragon's lair. Never had a plan. Great name, though. Doors love a good name.'");
      if (/murloc/.test(obj) && s.room === "road") return say(s.f.murlocFed ? "The murloc opens one eye. 'Mrgl.' It goes back to sleep." : "The murloc says 'Mrglglgl!' and points at its belly, then at the faire pond.");
      if (/gnome|vendor/.test(obj) && s.room === "faire") return say("The gnome says: 'Fishing pole! One coin! Satisfaction approximately guaranteed!'");
      return say((PEOPLE[s.room] || []).length ? `Talk to whom? Here you see: ${PEOPLE[s.room].map(nm).join(" and ")}.` : "Nobody here answers. The silence is very attentive.");
    }
    case "say": case "answer": case "shout": case "yell":
      if (s.room === "gate" && /leeroy/.test(obj)) { if (s.f.doorOpen) return say("The door is already open. It remembers you fondly."); s.f.doorOpen = true; save(); award("advdoor"); return say("You shout 'LEEROY!'. Somewhere, a chicken is dropped. The great stone door grinds open to the west."); }
      if (/xyzzy/.test(obj)) return say("A hollow voice says 'Wrong game.'");
      return say(`You say "${obj}". ${s.room === "gate" ? "The door does not budge. It wants a particular name." : "Nothing happens."}`);
    case "buy": case "purchase":
      if (s.room !== "faire") return say("There's nothing for sale here.");
      if (has("pole")) return say("You already have a pole. The gnome tries to sell you a second one anyway.");
      if (!has("coin")) return say("The gnome wants one coin. You check your pockets: no coin. (There was one on the inn's bar.)");
      s.inv.splice(s.inv.indexOf("coin"), 1); s.inv.push("pole"); s.f.pole = true; save(); return say("You hand over the coin. The gnome hands over a fishing pole and a speech about bait.");
    case "fish": case "cast":
      if (!has("pole")) return say("You need a fishing pole.");
      if (s.room !== "pond") return say("There's no water here worth fishing.");
      s.f.casts = (s.f.casts || 0) + 1; save();
      if (s.f.casts === 1) { s.inv.push("boot"); save(); award("boot"); return say("You cast... and reel in an old boot. It's a classic for a reason."); }
      if (!has("fish") && !s.f.murlocFed) { s.inv.push("fish"); save(); return say("You cast... a slippery fish! It wriggles indignantly."); }
      return say(["You catch nothing but a sense of peace.", "A fish looks at your hook and declines.", "You reel in a soggy copy of the patch notes."][s.f.casts % 3]);
    case "give": case "feed": case "offer": {
      if (s.room !== "road" || s.f.murlocFed) return say("There's nobody here who wants that.");
      if (has("fish")) { s.inv.splice(s.inv.indexOf("fish"), 1); s.inv.push("key"); s.f.murlocFed = true; save(); award("murloc"); return say("The murloc snatches the fish. 'MRGLGLGLGL!' Overjoyed, it coughs up a rusty key and hands it to you. It's a little damp."); }
      if (has("boot")) return say("The murloc looks at the boot. Then at you. Then back at the boot. It is deeply offended.");
      return say("The murloc wants food. Fish, specifically. It's very specific.");
    }
    case "open": case "unlock":
      if (dark) return say("You can't see anything to open.");
      if (s.room === "hall" && /chest/.test(obj || "chest")) { if (s.f.chestOpen) return say("It's already open."); if (!has("key")) return say("The chest is locked. There's a rusty keyhole."); s.f.chestOpen = true; (s.items.hall = s.items.hall || []).push("shovel", "note"); save(); return say("The rusty key turns with a groan. Inside: a silver shovel and a crumpled note."); }
      if (s.room === "gate") return say("There's no handle. It wants a name.");
      return say(`There's nothing here to open.${s.inv.length || (X.bag && X.bag.list().length) ? " (To see what you're carrying: i.)" : ""}`);
    case "dig": case "shovel":
      if (!has("shovel")) return say("You dig with your hands for a bit. It's undignified.");
      if (s.room !== "path") return say("You dig a small, pointless hole. You fill it back in, out of politeness.");
      if (s.f.dug) return say("You've already dug through.");
      s.f.dug = true; save(); return say("The silver shovel bites into the ancient roots, and they part like curtains. A path climbs north to the summit.");
    case "use": {
      if (/pole/.test(obj)) return act("fish"); if (/shovel/.test(obj)) return act("dig"); if (/key/.test(obj)) return act("open chest"); if (/candle/.test(obj)) return act("light candle"); if (/fish/.test(obj)) return act("give fish");
      return say("You can't think how to use that here.");
    }
    case "help": case "h": case "?": return say("Commands: look, n/s/e/w/in/out, go <place>, take X, drop X, inventory (i), examine X, talk to X, say X, give X, buy X, light X, fish, open X, dig, use X, score, quit.\n(Stuck? The people here like to talk.)");
    case "score": return say(`You have made ${s.moves} moves. Whimsy points: ${[s.f.lit, s.f.pole, s.f.murlocFed, s.f.doorOpen, s.f.chestOpen, s.f.dug].filter(Boolean).length} of 7.`);
    case "hint": return say(["Light first. The hearth at the inn is warm.", "The murloc is hungry; the pond has food; the gnome has poles; the inn had a coin.", "Sayge knows the door's word. So does the bard.", "The barrow's chest holds something for digging."][Math.min(3, [s.f.lit, s.f.murlocFed, s.f.doorOpen, s.f.chestOpen].filter(Boolean).length)]);
    case "quit": case "q": case "exit": save(); T.pop(); return print("You leave the dungeon. Your progress is saved. Type adventure to return.", "dim");
    case "restart": s = fresh(); save(); return look();
    case "xyzzy": case "plugh": return say("A hollow voice says 'Wrong game.'");
    case "sleep": return say("You nap on the spot. When you wake, nothing has changed, except you're well rested.");
    case "dance": return say("You dance. Nobody here judges you. Except Sayge. Sayge always judges.");
    case "eat": return has("fish") ? say("You consider eating the fish. The murloc, somewhere, senses this and weeps.") : say("You have nothing edible.");
    default: if (!rest.length && placeOf([v])) return goTo(placeOf([v]));
      window.TWLOG && window.TWLOG.push("advunknown", { line, room: s.room }); return say(["I don't know how to do that.", "That doesn't seem to work here.", `You can't "${v}" here.`][s.moves % 3]);
  }
}
function examine(obj) {
  obj = (obj || "").replace(/^(in|inside|under|behind|around)\s+/, "");
  if (!obj) return look();
  if (X.bag && FAIRE.test(obj)) { const n = X.bag.find(obj); if (n) return print(html(X.bag.describe(n)), "adv"); }
  if (/note/.test(obj) && has("note")) return say("The note reads: 'The roots of Hyjal block the way. Dig where the path is choked. -- a dwarf who should have brought a flask'");
  if (/ticket/.test(obj) && has("ticket")) return say("A Darkmoon ticket. ADMIT ONE. (Type 'faire' in the terminal, outside this game.)");
  if (/candle/.test(obj) && has("candle")) return say(s.f.lit ? "A brave little flame." : "A stubby candle. Unlit. The inn's hearth would light it.");
  if (/boot/.test(obj) && has("boot")) return say("An old boot. Size: tauren.");
  if (/door/.test(obj) && s.room === "gate") return say("A warrior charging in, arms wide, mouth open mid-shout. You can almost hear his name.");
  if (/chest/.test(obj) && s.room === "hall" && s.f.lit) return say(s.f.chestOpen ? "An open chest." : "Iron-bound, with a rusty keyhole.");
  if (/sign/.test(obj) && s.room === "road") return say("WEST: Barrow Deeps (opens 9 Dec, but this is a game).  NORTH: Hyjal.  EAST: Darkmoon Faire.");
  if (/fire|hearth/.test(obj) && s.room === "inn") return say("A good, warm fire. Perfect for lighting things.");
  return say("You see nothing special.");
}
const MODE = { name: "adventure", noHistory: false, prompt: () => ">", title: () => "adventure", modeline: () => `-UUU:**--F1  *adventure*       ${ROOMS[s.room] ? ROOMS[s.room].name : ""}`, line: act, cxcc() { save(); T.pop(); } };
function start(dunnet) {
  award("adv");
  if (T.mode().name !== "adventure") T.push(MODE);
  print(dunnet ? "Dead end? No. A warm inn. This dungeon is a little kinder than the one you know." : "WHIMSY ADVENTURE, version 1.12 (Forever edition). Type 'help' if lost, 'quit' to leave.", "dim");
  look();
}
T.adventure = { start };
T.cmd(["adventure", "advent", "play", "colossal", "zork", "dunnet"], a => { if (a[0] === "new" || a[0] === "restart") { s = fresh(); save(); } start(false); return ""; });
})();
