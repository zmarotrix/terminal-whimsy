/* Terminal Whimsy: the Library, the guild's knowledge base. Guides sit on a shelf as books.
   A guide is the same Discord posts the guild pastes (data/src/kb/*.md, built into D.KB), so each part has a copy
   button. Tags after bold text mark it here in WoW's own language, and are stripped from the copy: {a} a quest you pick
   up (gold !), {t} one you hand in (gold ?), {q} a quest mentioned, {n} friendly (green), {h} hostile (red, skull),
   {i} item ([link]). Each step shows its ! ? and skulls up front. Steps tick off as you play; ticks live in this
   browser (tw.kb.<id>). Needs app.js (window.TWX). */
(() => {
"use strict";
const X = window.TWX, sec = document.getElementById("library");
if (!X || !sec) return;
const { D, $, $$, esc, ICON, store, award, notice, fx, REDUCE } = X;
const KB = D.KB || [];
const L = ((D.WISP && D.WISP.mind) || {}).kb || {};
const pick = a => Array.isArray(a) ? a[Math.random() * a.length | 0] : a;
// through the wisp's mind it won't talk over itself; gap 0 means say it now if it isn't mid-sentence
const say = (t, gap = 90e3, hold = 3800) => t && (X.mind ? X.mind.say(t, { gap, hold }) : X.wisp.talk(t, hold));
const banner = $(".banner", sec), art = $(".art", banner), credit = $(".credit", banner), candle = $(".candle", banner);
const shelfEl = $("#kbShelf"), bookEl = $("#kbBook");
const WH = "https://www.wowhead.com/forever/search?q=";
const day = d => new Date(d + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
const KIND = { q: "kq", a: "kq", t: "kq", n: "kn", h: "kh", i: "ki" };
// {i:Name} tags an item written as plain text; the Discord copy keeps just the name
const strip = s => s.replace(/\{i:([^}]+)\}/g, "$1").replace(/\{[qnhiat]\}/g, "");
const KBI = D.KBI || {}, KBP = D.KBP || {};          // items (icon, quality, id) and where NPCs stand (zone, x, y)
const WHI = "https://www.wowhead.com/forever/item=";
const itemIcon = it => it ? `<img class="ii" src="${ICON(it.icon)}" alt="" loading="lazy">` : "";
const pinOf = raw => /\{a\}/.test(raw || "") ? "!" : /\{t\}/.test(raw || "") ? "?" : "";
// a map button for an NPC we can place: opens their zone map with a pin on them
const locBtn = (npc, pin = "") => {
  const P = KBP[npc];
  return P ? `<button class="loc" type="button" data-npc="${esc(npc)}" data-pin="${esc(pin)}" data-tip="Show ${esc(npc)} on the ${esc(P.zoneName)} map"><img src="${ICON("inv_misc_map_01")}" alt="">${esc(P.zoneName)}</button>` : "";
};
// WoW's marks: the gold ! and ? over a quest giver's head, a raid-target skull, and a few icons
const SKULL = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.3C4.3 1.3 1.8 3.9 1.8 7.1c0 1.9.9 3.4 2.3 4.2v1.8c0 .8.6 1.5 1.4 1.5h5c.8 0 1.4-.7 1.4-1.5v-1.8c1.4-.8 2.3-2.3 2.3-4.2 0-3.2-2.5-5.8-6.2-5.8z" fill="#f2f2f2" stroke="#000" stroke-width=".9"/><circle cx="5.6" cy="7.5" r="1.7" fill="#111"/><circle cx="10.4" cy="7.5" r="1.7" fill="#111"/><path d="M7.3 9.8h1.4L8 11.1z" fill="#111"/><path d="M6.4 12.3v2.2M8 12.3v2.2M9.6 12.3v2.2" stroke="#111" stroke-width=".8"/></svg>`;
const MARK = {
  a: `<span class="qm qa" data-tip="Pick up a quest">!</span>`,
  t: `<span class="qm qt" data-tip="Hand in a quest">?</span>`,
  h: `<span class="qm qk" data-tip="Kill">${SKULL}</span>`,
  bag: `<span class="qm qi" data-tip="Bring these with you"><img src="${ICON("inv_misc_bag_08")}" alt=""></span>`,
  ghost: `<span class="qm qi" data-tip="Die on purpose"><img src="${ICON("spell_holy_resurrection")}" alt=""></span>`,
  door: `<span class="qm qi" data-tip="Dungeon entrance"><img src="${ICON("spell_arcane_portaldalaran")}" alt=""></span>`,
  hearth: `<span class="qm qi" data-tip="Hearthstone"><img src="${ICON("inv_misc_rune_01")}" alt=""></span>`,
};
// what a step asks of you, in the order it says it: ! ? and skulls from its tags, plus a few plain-word steps
function marks(s) {
  const out = [], add = k => !out.includes(k) && out.push(k), title = strip(s.title || "");
  if (/\*\*Requires:\*\*/.test(s.raw)) add("bag");
  if (/^(Enter|Leave)\b/.test(title)) add("door");
  if (/\*\*die\*\*/.test(s.raw)) add("ghost");
  for (const m of s.raw.matchAll(/\{([ath])\}/g)) add(m[1]);
  if (/^Hearth\b/.test(title)) add("hearth");
  return out.slice(0, 3).map(k => MARK[k]).join("");
}

/* =================== reading Discord markdown =================== */
// plain text: escape it, then dress up map coordinates, stack counts and arrows
// coordinates right after an NPC we can place become a map button for them
const plain = (s, npc, pin) => esc(s)
  .replace(/\s?\((\d{1,2}(?:\.\d+)?), (\d{1,2}(?:\.\d+)?)\)/g, (all, x, y) => npc && KBP[npc] ? " " + locBtn(npc, pin) : ` <span class="coord" data-tip="Map coordinates">${x}, ${y}</span>`)
  .replace(/\b(\d+)x (?=[A-Z])/g, '<span class="qty">$1×</span> ')
  .replace(/→/g, '<span class="arw">→</span>');
function itemHTML(txt) {
  const it = KBI[txt];
  return it ? `<a class="ki q${it.q}" href="${WHI}${it.id}" target="_blank" rel="noopener" data-tip="Item. Opens Wowhead.">${itemIcon(it)}[${esc(txt)}]</a>` : `<span class="ki">[${esc(txt)}]</span>`;
}
/* ---- quests: level, required level and rewards, from Wowhead's Forever pages (data/src/kb_quests.json) ---- */
const KBQ = D.KBQ || { parts: {}, rewards: {} };
const QPARTS = {};                                    // quest name -> its parts (some quests come in several)
for (const [id, p] of Object.entries(KBQ.parts)) (QPARTS[p.name] = QPARTS[p.name] || []).push({ id: +id, ...p });
// the quest a tag means: "3. The Love Potion (anyone) — needs…" -> "The Love Potion"
const qname = t => strip(t).replace(/^\d+\.\s+/, "").replace(/:$/, "").split(/ \(| —/)[0].trim();
const qreq = n => QPARTS[n] ? Math.min(...QPARTS[n].map(p => p.req || 99)) : null;
// XP for a quest (all its parts), or null while any part's XP is still unknown
// (parts you do one or the other of, like the two molt quests for A Taste of Flame, count once)
const ALT = new Set(KB.flatMap(g => (g.altParts || []).flatMap(a => a.slice(1))));
const qxp = n => QPARTS[n] && QPARTS[n].every(p => p.xp != null) ? QPARTS[n].filter(p => !ALT.has(p.id)).reduce((a, p) => a + p.xp, 0) : null;
const kxp = x => x >= 1000 ? (x / 1000).toFixed(x >= 10000 ? 1 : 2).replace(/\.?0+$/, "") + "k" : String(x);
const money = c => { const g = Math.floor(c / 1e4), s = Math.floor(c / 100) % 100, k = c % 100; return [g && `<span class="mg">${g}g</span>`, s && `<span class="ms">${s}s</span>`, k && `<span class="mc">${k}c</span>`].filter(Boolean).join(" "); };
const QTIP = {};                                      // tooltip keys already built
function questTip(n) {
  const P = QPARTS[n]; if (!P) return "";
  const k = "kbq:" + n;
  if (!QTIP[k]) {
    const lv = [...new Set(P.map(p => p.level))].sort((a, b) => a - b), rq = Math.min(...P.map(p => p.req));
    const rep = {};
    P.forEach(p => (p.rep || []).forEach(r => { const m = r.match(/^(\d+) reputation with (.+)$/); if (m) rep[m[2]] = (rep[m[2]] || 0) + +m[1]; }));
    const it = id => { const R = KBQ.rewards[id] || {}; return `<div class="kqi q${R.q || 1}">${R.icon ? `<img src="${ICON(R.icon)}" alt="">` : ""}<span><b>${esc(R.name || "")}</b>${(R.lines || []).length ? `<small>${esc(R.lines.slice(0, 3).join(" · ").replace(/ · · /g, " · ").replace(/\s·\s*$/, ""))}</small>` : ""}</span></div>`; };
    const choice = P.flatMap(p => p.choice || []), items = P.flatMap(p => p.items || []);
    const PD = P.filter(p => !ALT.has(p.id)), xp = qxp(n), gold = PD.reduce((a, p) => a + (p.money || 0), 0), cap = PD.reduce((a, p) => a + (p.moneyAtCap || 0), 0);
    D.TIPS[k] = `<div class="kqt"><div class="kqh"><b>${esc(n)}</b><span>Level ${lv.length > 1 ? lv[0] + "–" + lv[lv.length - 1] : lv[0]}</span></div>`
      + `<div class="kqr">Requires level ${rq}${PD.length > 1 ? ` · ${PD.length} parts` : ""}</div>`
      + (xp != null || gold || cap ? `<div class="kqx">${xp ? `<span class="xpv">${xp.toLocaleString()} XP</span>` : ""}${gold ? `<span>${money(gold)}</span>` : ""}${cap ? `<span class="dim">at 60: ${money(cap)}</span>` : ""}</div>` : "")
      + (choice.length ? `<div class="kqs">Choose one reward:</div>${choice.map(c => it(c.id)).join("")}` : "")
      + (items.length ? `<div class="kqs">You get:</div>${items.map(c => it(c.id)).join("")}` : "")
      + (Object.keys(rep).length ? `<div class="kqp">${Object.entries(rep).map(([f, v]) => `+${v} reputation with ${esc(f)}`).join("<br>")}</div>` : "")
      + (!choice.length && !items.length && !Object.keys(rep).length ? `<div class="kqp dim">No item rewards.</div>` : "")
      + (xp == null ? `<div class="kqp dim">XP not read yet.</div>` : "") + `</div>`;
    QTIP[k] = 1;
  }
  return k;
}
function tag(txt, bold, k) {
  if (k === "q" || k === "a" || k === "t") {   // quests read like an NPC's quest list: ! to pick up, ? to hand in
    const name = txt.replace(/:$/, ""), g = k === "a" ? `<i class="g">!</i>` : k === "t" ? `<i class="g">?</i>` : "";
    const what = k === "a" ? "Quest to pick up" : k === "t" ? "Quest to hand in" : "Quest", tk = questTip(qname(name)), rq = k === "a" ? qreq(qname(name)) : null;
    const xp = k === "t" ? qxp(qname(name)) : null;       // handing in pays out: show what
    return `<a class="kq" href="${WH}${encodeURIComponent(name)}" target="_blank" rel="noopener" ${tk ? `data-tiph="${esc(tk)}"` : `data-tip="${what}. Opens a Wowhead search."`}>${g}[${esc(name)}]</a>${rq ? `<span class="qlv" aria-label="needs level ${rq}">${rq}+</span>` : ""}${xp ? `<span class="qxp" aria-label="${xp.toLocaleString()} experience">+${kxp(xp)} XP</span>` : ""}${txt.endsWith(":") ? ":" : ""}`;
  }
  if (k === "i") return itemHTML(txt);
  if (k === "h") return `<b class="kh"><i class="sk">${SKULL}</i>${esc(txt)}</b>`;
  if (k) return `<b class="${KIND[k]}">${esc(txt)}</b>`;
  return bold ? `<b>${esc(txt)}</b>` : `<i>${esc(txt)}</i>`;
}
// npc: who the line is about so far, so "(84.6, 68.8)" after them becomes their map
function inline(raw, npc = null) {
  raw = String(raw || "");
  const pin = pinOf(raw);
  let out = "", at = 0;
  for (const m of raw.matchAll(/(\*\*|\*)(.+?)\1(?:\{([qnhiat])\})?|\{i:([^}]+)\}/g)) {
    out += plain(raw.slice(at, m.index), npc, pin) + (m[4] ? itemHTML(m[4]) : tag(m[2], m[1] === "**", m[3]));
    if (m[3] === "n") npc = m[2].replace(/:$/, "");
    at = m.index + m[0].length;
  }
  return out + plain(raw.slice(at), npc, pin);
}
// one post -> heading + blocks. A numbered bold line is a step (its bullets are details); a bullet outside a
// numbered step is a step of its own; a line that's all bold is a group heading.
function parse(raw, pi) {
  const P = { head: "", cover: null, blocks: [] };
  let step = null, nb = 0;
  for (const ln of raw.split("\n")) {
    if (!ln.trim()) continue;
    if (ln.startsWith("# ")) { P.cover = { title: ln.slice(2), sub: "" }; continue; }
    if (ln.startsWith("## ")) { P.head = ln.slice(3); continue; }
    if (ln.startsWith("-# ")) { if (P.cover && !P.head) P.cover.sub = ln.slice(3); else P.blocks.push({ t: "sub", h: inline(ln.slice(3)) }); continue; }
    let m = ln.match(/^\*\*(\d+)\.\s+(.+?)\*\*(?:\{([qnhiat])\})?(.*)$/);
    if (m) { step = { t: "step", id: pi + "." + m[1], n: m[1], title: m[2], k: m[3], rest: m[4], body: [], raw: ln, label: strip(m[2]).replace(/[:.]$/, "") }; P.blocks.push(step); continue; }
    m = ln.match(/^\*\*([^*]+)\*\*\s*$/);
    if (m) { step = null; P.blocks.push({ t: "grp", h: esc(m[1]) }); continue; }
    if (ln.startsWith("⚠️")) { const w = { t: "warn", raw: ln.replace(/^⚠️\s*/, "") }; if (step) { step.body.push(w); step.warn = w.raw; step.raw += "\n" + ln; } else P.blocks.push(w); continue; }
    if (ln.startsWith("- ")) {
      if (step) { step.body.push({ t: "li", raw: ln.slice(2) }); step.raw += "\n" + ln; }
      else P.blocks.push({ t: "step", id: pi + ".b" + (++nb), bullet: true, h: inline(ln.slice(2)), body: [], raw: ln, label: strip(ln.slice(2)).replace(/\*/g, "").slice(0, 70) });
      continue;
    }
    m = ln.match(/^\*([^*].*)\*$/);
    if (m) { P.blocks.push({ t: "goal", h: inline(m[1]) }); continue; }
    if (step) { step.body.push({ t: "p", h: inline(ln), raw: ln }); step.raw += "\n" + ln; }
    else P.blocks.push({ t: "p", h: inline(ln), raw: ln });
  }
  return P;
}
// "Phase 6: Dungeon Run 2 (part 1): front half + Jail Break!" -> seal 6, "Dungeon Run 2", "Part 1 · front half + Jail Break!"
function heading(h) {
  const m = h.match(/^Phase (\d+):\s*(.*)$/), n = m ? m[1] : "", rest = m ? m[2] : h;
  const p = rest.match(/^(.*?)\s*\(([^)]*)\)(?::\s*(.*))?$/);
  if (!p) return { n, name: rest, small: "", nav: rest };
  const part = /^part\b/i.test(p[2]);
  return { n, name: p[1], small: (part ? p[2].replace(/^p/, "P") : p[2]) + (p[3] ? " · " + p[3] : ""), nav: p[1] + (part ? ", " + p[2] : "") };
}
const model = g => g._m || (g._m = g.posts.map(parse));
const stepsOf = (P) => P.blocks.filter(b => b.t === "step");
const allSteps = g => model(g).flatMap(stepsOf);
const key = g => "kb." + g.id;
const ticks = g => new Set(store.get(key(g), []));

/* ---- quest chains: skip one and every step and line that's only about it greys out ---- */
function chainMaps(g) {
  if (g._c) return g._c;
  const q = {}, it = {};
  (g.chains || []).forEach(c => { (c.quests || []).forEach(n => q[n] = c.id); (c.items || []).forEach(n => it[n] = c.id); });
  return (g._c = { q, it, by: Object.fromEntries((g.chains || []).map(c => [c.id, c])), core: new Set(g.core || []) });
}
// which chains a line is about: its quests, its items, and the mats on a "Requires" line
function chainsOf(g, raw) {
  const C = chainMaps(g), out = new Set(), add = c => c && out.add(c);
  for (const m of String(raw || "").matchAll(/(\*\*|\*)(.+?)\1(?:\{([qnhiat])\})?|\{i:([^}]+)\}/g)) {
    if (m[4]) add(C.it[m[4]]);
    else if (m[3] && "qat".includes(m[3])) add(C.q[qname(m[2])]);
    else if (m[3] === "i") add(C.it[qname(m[2])]);
  }
  for (const m of String(raw || "").matchAll(/\b\d+x ([^,(\n]+?)(?= \(|,|$)/gm)) add(C.it[m[1].trim()]);
  return out;
}
const stepChains = (g, s) => s._ch || (s._ch = chainsOf(g, s.raw));
const runKey = g => "kb." + g.id + ".run";
// chains switched off: what you chose, else the guide's default (The Challenge starts off)
function skipSet(g) {
  const o = store.get(runKey(g), {});
  return new Set((g.chains || []).filter(c => o[c.id] !== undefined ? !o[c.id] : !!c.off).map(c => c.id));
}
const stepSkipped = (g, s, skip) => { const ch = stepChains(g, s); return !chainMaps(g).core.has(s.id) && ch.size > 0 && [...ch].every(c => skip.has(c)); };
const tally = (g, t = ticks(g), skip = skipSet(g)) => { const a = allSteps(g).filter(s => !stepSkipped(g, s, skip)); return { n: a.filter(s => t.has(s.id)).length, of: a.length }; };

/* =================== the banner: a bookshelf, or the open book's cover =================== */
function shelfArt() {
  let seed = 7;
  const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const cols = ["#7a2216", "#1f3b5c", "#2f4a2a", "#5b3a1e", "#4a2a5e", "#7a5a1e", "#20434a", "#5e2433", "#3b2f4f"];
  let s = `<svg viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
<linearGradient id="kbw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1a10"/><stop offset="1" stop-color="#120a06"/></linearGradient>
<radialGradient id="kbg" cx=".84" cy=".22" r=".42"><stop offset="0" stop-color="#ffb862" stop-opacity=".32"/><stop offset="1" stop-color="#ffb862" stop-opacity="0"/></radialGradient></defs>
<rect width="1200" height="320" fill="url(#kbw)"/>`;
  for (let x = 0; x < 1200; x += 96) s += `<rect x="${x}" width="2" height="320" fill="#000" opacity=".28"/>`;
  for (const y of [126, 252]) {
    let x = 14;
    while (x < 1186) {
      if (rnd() < .07) { x += 26 + rnd() * 50; continue; }            // a gap someone borrowed
      const w = 13 + rnd() * 21, h = 62 + rnd() * 46, c = cols[rnd() * cols.length | 0], tilt = rnd() < .07 && x > 40;
      const g = `<rect x="${x.toFixed(1)}" y="${(y - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${c}"/>`
        + `<rect x="${x.toFixed(1)}" y="${(y - h + 9).toFixed(1)}" width="${w.toFixed(1)}" height="2.4" fill="#e7c27a" opacity=".55"/>`
        + `<rect x="${x.toFixed(1)}" y="${(y - 15).toFixed(1)}" width="${w.toFixed(1)}" height="2.4" fill="#e7c27a" opacity=".45"/>`
        + `<rect x="${(x + w * .25).toFixed(1)}" y="${(y - h * .62).toFixed(1)}" width="${(w * .5).toFixed(1)}" height="${(h * .22).toFixed(1)}" fill="#000" opacity=".22"/>`
        + `<rect x="${x.toFixed(1)}" y="${(y - h).toFixed(1)}" width="2.5" height="${h.toFixed(1)}" fill="#fff" opacity=".07"/>`;
      s += tilt ? `<g transform="rotate(-9 ${x} ${y})">${g}</g>` : g;
      x += w + 1.4 + (tilt ? 8 : 0);
    }
    s += `<rect x="0" y="${y}" width="1200" height="13" fill="#5a3820"/><rect x="0" y="${y}" width="1200" height="2" fill="#8a5c34"/><rect x="0" y="${y + 13}" width="1200" height="10" fill="#000" opacity=".35"/>`;
  }
  // a cobweb in the top corner and the candle's glow
  s += `<g stroke="#cfd6e6" stroke-width="1" fill="none" opacity=".35"><path d="M0 0 L120 70 M0 0 L80 110 M0 0 L130 22 M0 0 L30 125"/><path d="M28 16 Q30 30 22 42 Q34 40 48 46 Q50 30 60 34 Q44 24 28 16Z M56 32 Q60 56 44 84 Q66 78 92 86 Q92 60 104 60 Q78 46 56 32Z"/></g>`;
  return s + `<rect width="1200" height="320" fill="url(#kbg)"/></svg>`;
}
art.innerHTML = shelfArt();
const embers = document.createElement("div");
embers.className = "embers"; embers.setAttribute("aria-hidden", "true");
embers.innerHTML = Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 61) % 100}%;--s:${2 + i % 3}px;--d:${5 + (i * 7) % 6}s;--dl:${-((i * 1.37) % 7).toFixed(2)}s;--dx:${(i * 37) % 60 - 30}px"></i>`).join("");
banner.append(embers);

function bannerShelf() {
  banner.classList.remove("reading"); banner.style.removeProperty("--img");
  $(".cap", banner).innerHTML = `<h2>The Library</h2><p>The guild's knowledge base. Guides we've written, checked against Forever.</p>`;
  credit.hidden = true; candle.hidden = false;
}
function bannerBook(g, sub) {
  banner.classList.add("reading"); banner.style.setProperty("--img", `url(${g.art})`);
  $(".cap", banner).innerHTML = `<p class="kick">${esc(g.kicker)}</p><h2>${esc(g.title)}</h2>${sub ? `<p>${inline(sub)}</p>` : ""}`
    + `<span class="due" role="img" aria-label="Checked against Forever on ${esc(day(g.checked))}">Checked<br>for Forever<b>${esc(day(g.checked))}</b></span>`;
  credit.textContent = g.credit || ""; credit.hidden = !g.credit; candle.hidden = true;
}

/* =================== the shelf =================== */
const GHOSTS = [
  "Written a guide? Post it in Discord and we'll put it on the shelf.",
  "Reserved for a Scholomance guide. Scholomance is complicated.",
  "Empty. Mind the dust.",
];
function shelf() {
  const books = KB.map((g, i) => {
    const { n, of } = tally(g), fresh = X.isNew(g);
    return `<div class="kslot">
  <div class="stand"><a class="book" href="#kb-${esc(g.id)}" style="--leather:${esc(g.leather || "#5b3a1e")}" aria-label="Open ${esc(g.title)}">
    <span class="pages" aria-hidden="true"></span>
    <span class="leaf" aria-hidden="true"><span class="plate"><small>Ex libris</small><b>Terminal Whimsy</b><span class="pl-t">${esc(g.title)}</span></span></span>
    <span class="lid"><span class="face front"><span class="foil"><span class="emb"><img src="${ICON(g.icon)}" alt=""></span><b>${esc(g.cover[0])}</b><small>${esc(g.cover[1] || "")}</small></span></span><span class="face back" aria-hidden="true"></span></span>
    ${n ? `<span class="ribbon" style="--p:${n / of}" data-tip="${n} of ${of} steps ticked"></span>` : ""}
    ${fresh ? `<span class="newseal" aria-label="New">NEW</span>` : ""}
  </a></div>
  <a class="ccard" href="#kb-${esc(g.id)}">
    <span class="cc-top"><span>${esc(g.call || "")}</span><span>No. ${i + 1}</span></span>
    <b>${esc(g.title)}</b>
    <span>${esc(g.kicker)}</span>
    <span class="cc-blurb">${esc(g.blurb)}</span>
    <span class="cc-foot">${of} steps · ${g.posts.length} parts · checked ${esc(day(g.checked))}</span>
    ${n ? `<span class="cc-due">${n === of ? "Finished. Well read." : `Your place: ${n} of ${of} ticked`}</span>` : ""}
  </a>
</div>`;
  });
  const ghosts = GHOSTS.map((t, i) => `<div class="kslot">
  <div class="stand"><button class="book ghost" type="button" aria-label="An empty space on the shelf"><span class="web" aria-hidden="true"></span><span>Your guide here</span></button>${i === 2 ? `<button class="dustbunny" type="button" aria-label="A dust bunny"><i></i></button>` : ""}</div>
  <div class="ccard blank"><span class="cc-top"><span>Reserved</span><span>No. ${KB.length + i + 1}</span></span><span class="cc-blurb">${esc(t)}</span></div>
</div>`);
  shelfEl.innerHTML = `<div class="rhead"><span class="mini-wisp happy" aria-hidden="true"></span><div><h2>On the shelf</h2><p>Open a book and tick off steps as you play. Your ticks stay in this browser.</p></div></div>
<div class="shelf">${books.join("")}${ghosts.join("")}</div>`;
}

/* =================== an open book =================== */
const COPY_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 11V3a1 1 0 0 1 1-1h7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
/* ---- a step's details: what kind of line it is decides how it looks ---- */
const BUBBLE = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2C4.1 2 1.2 4.3 1.2 7.1c0 1.6 1 3 2.5 3.9l-.6 2.6 3-1.7c.6.1 1.2.2 1.9.2 3.9 0 6.8-2.3 6.8-5S11.9 2 8 2z" fill="#f4f1e6" stroke="#2a2010" stroke-width=".9"/><circle cx="5.2" cy="7.1" r=".9" fill="#2a2010"/><circle cx="8" cy="7.1" r=".9" fill="#2a2010"/><circle cx="10.8" cy="7.1" r=".9" fill="#2a2010"/></svg>`;
const WAYS = /^\*\*((?:Fast|Long|Short|Slow|Quick|Easy|Hard) way):\*\*\s*(.*)$/i;
const WAY_ICON = { fast: "ability_rogue_sprint", quick: "ability_rogue_sprint", short: "ability_rogue_sprint", long: "inv_misc_map_01", slow: "inv_misc_map_01" };
function liKind(raw) {
  if (/^\*\*Requires:\*\*/.test(raw)) return "bring";
  if (WAYS.test(raw)) return "way";
  if (/^\*Optional:\*/.test(raw)) return "opt";
  if (/^\*\*[^*]+\*\*\{[nh]\}/.test(raw)) return "who";
  return "tip";
}
// "**Ragnar Thunderbrew**{n} (46.8, 52.5), Thunderbrew Distillery: **Hurley Blackbreath**{a}"
//   -> who: Ragnar, kind n, where "Thunderbrew Distillery", then what you do there
function whoParts(raw) {
  const m = raw.match(/^\*\*([^*]+?)\*\*\{([nh])\}(.*)$/);
  let name = m[1], where = "", rest = m[3];
  if (name.endsWith(":")) name = name.slice(0, -1);
  else {
    const r = rest.match(/^\s*(?:\(([^)]*)\))?(?:,\s*([^:]+?))?:\s*(.*)$/);
    if (r) {
      if (r[1] && !/^\d{1,2}(\.\d+)?, \d{1,2}(\.\d+)?$/.test(r[1])) where = r[1];
      if (r[2]) where = where ? where + ", " + r[2] : r[2];
      rest = r[3];
    }
  }
  return { name, k: m[2], where, rest: rest.trim() };
}
// a little zoomed-in piece of the zone map, centred on the NPC, with WoW's ! or ? on them
function mapThumb(npc, pin) {
  const P = KBP[npc]; if (!P) return "";
  const Z = 2.6, fx = P.x / 100, fy = P.y / 100, ox = Math.min(Math.max(fx - .5 / Z, 0), 1 - 1 / Z), oy = Math.min(Math.max(fy - .5 / Z, 0), 1 - 1 / Z);
  return `<button class="wmap" type="button" data-npc="${esc(npc)}" data-pin="${esc(pin)}" aria-label="Show ${esc(npc)} on the ${esc(P.zoneName)} map" style="background-image:url(img/maps/${P.zone}.jpg);background-size:${Z * 100}% ${Z * 100}%;background-position:${(ox / (1 - 1 / Z) * 100).toFixed(1)}% ${(oy / (1 - 1 / Z) * 100).toFixed(1)}%">`
    + `<i class="pin${pin ? "" : " dot"}" style="left:${((fx - ox) * Z * 100).toFixed(1)}%;top:${((fy - oy) * Z * 100).toFixed(1)}%">${pin}</i><span class="wz">${esc(P.zoneName)}</span></button>`;
}
// data-ch: the quest chains a line belongs to, so skipping a chain can grey it out
let G = null;
const chAttr = raw => { const c = G ? [...chainsOf(G, raw)] : []; return c.length ? ` data-ch="${c.join(" ")}"` : ""; };
function whoHTML(raw) {
  const w = whoParts(raw), pin = pinOf(raw), thumb = w.k === "n" ? mapThumb(w.name, pin) : "";
  return `<div class="who k-${w.k}${thumb ? " has-map" : ""}"${chAttr(raw)}>${thumb}<div class="wb">
    <p class="wh"><span class="wi">${w.k === "h" ? SKULL : BUBBLE}</span><b class="${KIND[w.k]}">${esc(w.name)}</b></p>
    ${w.where ? `<p class="ww">${inline(w.where)}</p>` : ""}<p class="wt">${inline(cap1(w.rest), w.name)}</p></div></div>`;
}
function bringHTML(raw) {
  const list = raw.replace(/^\*\*Requires:\*\*\s*/, "").split(", ").map(p => p.trim().match(/^(\d+)x (.+?)(?: \((.*)\))?$/)).filter(Boolean);
  return `<div class="bring"${chAttr(raw)}><p class="bh"><img src="${ICON("inv_misc_bag_08")}" alt="">Bring these</p><div class="bgrid">${list.map(([, n, name, note]) => {
    const it = KBI[name], tagName = it ? "a" : "span";
    return `<${tagName} class="islot q${it ? it.q : 1}"${it ? ` href="${WHI}${it.id}" target="_blank" rel="noopener"` : ""}><span class="ib">${it ? `<img src="${ICON(it.icon)}" alt="" loading="lazy">` : ""}</span><span class="in"><b>${esc(name)}</b>${note ? `<small>${esc(note)}</small>` : ""}</span><span class="ix">×${n}</span></${tagName}>`;
  }).join("")}</div></div>`;
}
function wayHTML(raw) {
  const m = raw.match(WAYS), kind = m[1].split(" ")[0].toLowerCase();
  return `<div class="way"${chAttr(raw)}><p class="wyh"><img src="${ICON(WAY_ICON[kind] || "inv_misc_map_01")}" alt="">${esc(m[1])}</p><p>${inline(cap1(m[2]))}</p></div>`;
}
function details(items) {
  let h = "", i = 0;
  while (i < items.length) {
    const b = items[i];
    if (b.t === "p") { h += `<p class="sd"${chAttr(b.raw)}>${b.h}</p>`; i++; continue; }
    if (b.t === "warn") { const m = b.raw.match(/^\*\*(.+?)\*\*\s*(.*)$/); h += `<div class="rw" role="note">${m ? `<b>${esc(m[1])}</b><span>${inline(m[2])}</span>` : `<span>${inline(b.raw)}</span>`}</div>`; i++; continue; }
    const k = liKind(b.raw), run = [];
    while (i < items.length && items[i].t === "li" && liKind(items[i].raw) === k) run.push(items[i++].raw);
    if (k === "bring") h += run.map(bringHTML).join("");
    else if (k === "way") h += `<div class="ways">${run.map(wayHTML).join(`<span class="or" aria-hidden="true">or</span>`)}</div>`;
    else if (k === "who") h += `<div class="whos">${run.map(whoHTML).join("")}</div>`;
    else if (k === "opt") h += run.map(r => `<p class="opt"${chAttr(r)}><span class="optag">Optional</span>${inline(r.replace(/^\*Optional:\*\s*/, ""))}</p>`).join("");
    else h += `<ul class="tips">${run.map(r => `<li${chAttr(r)}>${inline(r)}</li>`).join("")}</ul>`;
  }
  return h;
}
const body = details;
// a numbered step reads as a title line (marks, title, where), then what to do underneath:
// "**3. Marshal Windsor** (his cell): turn in…" -> Marshal Windsor · his cell / Turn in…
const cap1 = s => s.replace(/^(\**)([a-z])/, (_, a, b) => a + b.toUpperCase());
function headHTML(s) {
  const mk = marks(s), mks = mk ? `<span class="marks">${mk}</span>` : "";
  if (s.bullet) {
    // "**Lothos Riftwaker:**{n} *Attunement to the Core*{t}" -> Lothos (with a map button) / Hand in…
    const r = s.raw.replace(/^- /, ""), m = r.match(/^\*\*([^*]+?):\*\*(?:\{([nh])\})?\s*(.*)$/);
    if (!m) return `<p class="sh">${mks}${s.h}</p>`;
    return `<p class="sh">${mks}<b class="stt ${m[2] ? KIND[m[2]] : ""}">${esc(m[1])}</b>${m[2] === "n" ? locBtn(m[1], pinOf(r)) : ""}</p><p class="sd">${inline(cap1(m[3]), m[2] === "n" ? m[1] : null)}</p>`;
  }
  const title = strip(s.title), rest = s.rest || "";
  let where = "", desc = "", tail = "", m;
  if ((m = rest.match(/^\s*—\s*(.+)$/))) where = m[1];
  else if ((m = rest.match(/^\s*\(([^)]*)\)\s*(?::\s*(.*))?$/))) { where = m[1]; desc = m[2] || ""; }
  else if (/[:.]$/.test(title) || !rest.trim()) desc = rest.trim();
  else tail = rest;                                             // "**5. Keep** any…": one line, as written
  const npc = s.k === "n" ? title.replace(/[:.]$/, "") : null, it = s.k === "i" ? KBI[title.replace(/[:.]$/, "")] : null;
  const tk = s.k && "qat".includes(s.k) ? questTip(qname(title)) : "";
  const tt = `${itemIcon(it)}<b class="stt ${s.k ? KIND[s.k] : ""}"${tk ? ` data-tiph="${esc(tk)}"` : ""}>${plain(tail ? title : title.replace(/[:.]$/, ""))}</b>${tail ? inline(tail) : ""}`;
  return `<p class="sh">${mks}${tt}${where ? `<span class="where">${inline(where, npc)}</span>` : ""}</p>${desc ? `<p class="sd">${inline(cap1(desc), npc)}</p>` : ""}`;
}
// the first step that's only about a chain carries the guide's word on it ("very skippable"), and its Skip button
let firstNote = new Set();
function stepHTML(s, done, notes) {
  const un = notes.filter(u => u.at.includes(s.id)).map(u => `<p class="unsure"><b>Not confirmed on Forever</b>${esc(u.text)}</p>`).join("");
  const C = chainMaps(G), ch = [...stepChains(G, s)], one = ch.length === 1 && !C.core.has(s.id) ? C.by[ch[0]] : null;
  let note = "";
  if (one && one.note && !firstNote.has(one.id)) { firstNote.add(one.id); note = `<p class="cnote">${one.tag ? `<span class="ctag">${esc(one.tag)}</span>` : ""}${esc(one.note)}</p>`; }
  const tips = (G.tips || []).filter(t => t.at === s.id).map(t => `<p class="tipnote"><img src="${ICON("inv_misc_note_01")}" alt=""><span><b>Tip</b>${esc(t.text)}</span></p>`).join("");
  const skip = one ? `<button class="skipb" type="button" data-chain="${esc(one.id)}" data-tip="Skip ${esc(one.name)}. Its other steps grey out too."><span>Skip</span></button>` : "";
  return `<div class="step${done ? " done" : ""}${s.warn ? " warned" : ""}${skip ? " can-skip" : ""}" data-s="${esc(s.id)}"${ch.length ? ` data-ch="${ch.join(" ")}"` : ""}><button class="tick" type="button" role="checkbox" aria-checked="${done}" aria-label="${esc(s.label)}">${s.n ? `<span class="tn">${s.n}</span>` : ""}</button><div class="sx">${headHTML(s)}${note}${body(s.body)}${tips}${un}</div>${skip}<span class="skiptag" aria-hidden="true">Skipped</span></div>`;
}
function pageHTML(g, P, i, t) {
  const H = heading(P.head), st = stepsOf(P), d = st.filter(s => t.has(s.id)).length, chars = strip(g.posts[i]).length;
  const notes = (g.unsure || []).filter(u => u && Array.isArray(u.at));
  const blocks = P.blocks.map(b => b.t === "step" ? stepHTML(b, t.has(b.id), notes) : b.t === "grp" ? `<h4 class="kgrp">${b.h}</h4>` : b.t === "sub" ? `<p class="sub">${b.h}</p>`
    : b.t === "goal" ? `<p class="goal">${b.h}</p>` : b.t === "warn" ? body([b]) : `<p${chAttr(b.raw)}>${b.h}</p>`).join("");
  const ptips = (G.tips || []).filter(x => x.at === "p" + i).map(x => `<p class="tipnote"><img src="${ICON("inv_misc_note_01")}" alt=""><span><b>Tip</b>${esc(x.text)}</span></p>`).join("");
  return `<article class="page${st.length && d === st.length ? " done" : ""}" id="kbp-${i}" data-p="${i}">
  <header class="ph"><button class="fold" type="button" aria-expanded="true" aria-controls="kbpb-${i}" aria-label="Fold ${esc(H.name)}${H.small ? ", " + esc(H.small) : ""}"><span class="seal" aria-hidden="true">${esc(H.n || "✦")}</span><span class="pt"><h3>${esc(H.name)}</h3>${H.small ? `<small>${esc(H.small)}</small>` : ""}</span><span class="chev" aria-hidden="true"></span></button>
    <span class="pp" aria-label="${d} of ${st.length} steps ticked">${d}/${st.length}</span>
    <button class="copy" type="button" data-tip="Copies this part as one Discord message (${chars.toLocaleString()} of 2,000 characters)">${COPY_ICON}<span>Copy for Discord</span></button></header>
  <div class="pb" id="kbpb-${i}">${ptips}${blocks}</div>
</article>`;
}
let cur = null, mode = null, spyObs = null;
// "When to start": each quest chain at the level you can pick it up, and a switch to skip it
function planner(g) {
  const C = chainMaps(g), rows = {};
  (g.chains || []).forEach(c => { const lv = qreq(c.quests[0]) || 0; (rows[lv] = rows[lv] || []).push(c); });
  const lvls = Object.keys(rows).map(Number).sort((a, b) => a - b);
  const cxp = {};
  (g.chains || []).forEach(c => {
    const qs = c.quests.filter(n => QPARTS[n]), lv = qs.flatMap(n => QPARTS[n].map(p => p.level));
    const xs = qs.filter(n => !(c.optional || []).includes(n)).map(qxp); cxp[c.id] = xs.length && xs.every(x => x != null) ? xs.reduce((a, b) => a + b, 0) : null;
    D.TIPS["kbc:" + c.id] = `<div class="kqt"><div class="kqh"><b>${esc(c.name)}</b>${lv.length ? `<span>Level ${Math.min(...lv)}–${Math.max(...lv)}</span>` : ""}</div>`
      + `<div class="kqr">Pick up at level ${qreq(c.quests[0]) || "?"}</div>${cxp[c.id] ? `<div class="kqx"><span class="xpv">${cxp[c.id].toLocaleString()} XP in all</span></div>` : ""}${c.note ? `<div class="kqp">${esc(c.note)}</div>` : ""}`
      + `<div class="kqs">Quests</div><div class="kql">${c.quests.map(n => esc(n) + (qxp(n) ? ` <span class="dim">${kxp(qxp(n))} XP</span>` : "")).join("<br>")}</div><div class="kqp dim">Click to skip it, or to bring it back.</div></div>`;
  });
  return `<section class="kbrun" aria-labelledby="kbrunh">
  <div class="rh"><h3 id="kbrunh">When to start, and what to skip</h3><p>Quest chains by the level you can pick them up. Untick one to skip it, and its steps grey out all through the guide.</p></div>
  <div class="ladder">${lvls.map(lv => `<div class="rung"><span class="lvl" aria-label="Level ${lv}"><small>Level</small>${lv}</span><div class="chains">${rows[lv].map(c => `<button class="chain" type="button" data-chain="${esc(c.id)}" aria-pressed="true" data-tiph="kbc:${esc(c.id)}"><span class="cbox" aria-hidden="true"></span><span class="cn">${esc(c.name)}</span>${cxp[c.id] ? `<span class="cxp">${kxp(cxp[c.id])} XP</span>` : ""}${c.tag ? `<span class="ctag">${esc(c.tag)}</span>` : ""}</button>`).join("")}</div></div>`).join("")}</div>
  ${(g.before || []).length ? `<div class="before"><p class="lbl">Before you go</p><ul>${g.before.map(b => `<li>${esc(b)}</li>`).join("")}</ul></div>` : ""}
</section>`;
}
const foldKey = g => "kb." + g.id + ".fold";
function book(g) {
  const M = model(g), t = ticks(g);
  G = g; firstNote = new Set();
  bannerBook(g, M[0].cover && M[0].cover.sub);
  bookEl.innerHTML = `<div class="kbbar">
  <a class="btn ghost kbback" href="#library">← Back to the shelf</a>
  <div class="kbprog" role="progressbar" aria-label="Steps ticked" aria-valuemin="0"><span class="bar"><i></i></span><b></b></div>
  <div class="row"><button class="btn ghost kbfoldall" type="button">Fold all parts</button><button class="btn kbnext" type="button"><span class="qm qw" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M2.5 1.8 14 8 2.5 14.2 5.4 8z" fill="#ffd200" stroke="#3b2600" stroke-width="1.1" stroke-linejoin="round"/></svg></span><span><b>Next step</b><small></small></span></button><button class="btn ghost kbreset" type="button">Start a fresh run</button><button class="btn ghost kblink" type="button">Copy link</button></div>
</div>
<div class="kbintro">
  <div class="kbkey" role="list" aria-label="How to read this guide">
    <span role="listitem">${MARK.a}Pick up a quest</span>
    <span role="listitem">${MARK.t}Hand in a quest</span>
    <span role="listitem">${MARK.h}Kill</span>
    <span role="listitem"><b class="kn">Green</b> friendly NPC</span>
    <span role="listitem"><b class="kh">Red</b> enemy</span>
    <span role="listitem"><span class="ki">[Item]</span> loot or use</span>
    <span role="listitem"><span class="loc" aria-hidden="true"><img src="${ICON("inv_misc_map_01")}" alt="">Zone</span> opens their map</span>
  </div>
  ${planner(g)}
  ${(g.unsure || []).length ? `<details class="kbnotes"><summary><span class="stamp">Unchecked</span>${g.unsure.length} things nobody has confirmed on Forever yet<small>The ones about a step are on that step too. Seen one in game? Tell an officer.</small></summary><ul>${g.unsure.map(u => `<li>${esc(u.text || u)}</li>`).join("")}</ul></details>` : ""}
</div>
<div class="kbbook">
  <nav class="kbnav" aria-label="Parts of the guide"><p class="lbl">Quest log</p>${M.map((P, i) => { const H = heading(P.head); return `<button type="button" data-p="${i}"><span class="seal sm" aria-hidden="true">${esc(H.n || "✦")}</span><span class="nt">${esc(H.nav)}</span><span class="pp"></span></button>`; }).join("")}</nav>
  <div class="kbpages">${M.map((P, i) => pageHTML(g, P, i, t)).join("")}</div>
</div>
${(g.sources || []).length ? `<details class="more"><summary><span>Where this came from</span><small>${g.sources.length} sources: the fan guides and Blizzard posts we checked it against.</small></summary><ul class="kbsrc">${g.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`).join("")}</ul></details>` : ""}`;
  refresh(g);
  spy();
}
// counts, the progress bar and the DONE stamps, without redrawing the book
function refresh(g) {
  const t = ticks(g), skip = skipSet(g), { n, of } = tally(g, t, skip), pr = $(".kbprog", bookEl);
  pr.style.setProperty("--p", (of ? n / of * 100 : 0) + "%"); pr.setAttribute("aria-valuemax", of); pr.setAttribute("aria-valuenow", n);
  const nskip = allSteps(g).length - of;
  $("b", pr).textContent = (n === of ? `All ${of} steps done` : `${n} of ${of} steps`) + (nskip ? ` · ${nskip} skipped` : "");
  pr.classList.toggle("full", n === of);
  // skipped chains: whole steps grey out when they're only about skipped chains, single lines when theirs are
  const SB = Object.fromEntries(allSteps(g).map(s => [s.id, s]));
  $$("[data-ch]", bookEl).forEach(el => {
    const off = el.dataset.ch.split(" ").every(c => skip.has(c));
    if (el.classList.contains("step")) {
      const sk = stepSkipped(g, SB[el.dataset.s], skip);
      el.classList.toggle("skipped", sk); $(".tick", el).disabled = sk;
      const b = $(".skipb", el); if (b) { $("span", b).textContent = sk ? "Bring back" : "Skip"; b.setAttribute("aria-pressed", sk); }
    } else el.classList.toggle("off", off);
  });
  $$(".kbrun .chain", bookEl).forEach(b => { const on = !skip.has(b.dataset.chain); b.setAttribute("aria-pressed", on); b.classList.toggle("on", on); });
  model(g).forEach((P, i) => {
    const st = stepsOf(P).filter(s => !stepSkipped(g, s, skip)), d = st.filter(s => t.has(s.id)).length, full = !!st.length && d === st.length, all = !st.length && stepsOf(P).length;
    const pg = $(`#kbp-${i}`, bookEl), nv = $(`.kbnav [data-p="${i}"]`, bookEl);
    $(".ph .pp", pg).textContent = all ? "skipped" : d + "/" + st.length; pg.classList.toggle("done", full); pg.classList.toggle("allskip", !!all);
    $(".pp", nv).textContent = all ? "–" : full ? "✓" : d + "/" + st.length; nv.classList.toggle("done", full || !!all);
  });
  const rb = $(".kbreset", bookEl); rb.disabled = !n; if (!armed) rb.textContent = "Start a fresh run";
  // folded parts
  const fold = new Set(store.get(foldKey(g), []));
  $$(".page", bookEl).forEach(pg => { const f = fold.has(+pg.dataset.p); pg.classList.toggle("folded", f); $(".fold", pg).setAttribute("aria-expanded", !f); });
  $(".kbfoldall", bookEl).textContent = fold.size >= model(g).length ? "Open all parts" : "Fold all parts";
  // the first step you haven't ticked (or skipped) glows, like a tracked quest, and the Next step button takes you there
  const steps = $$(".step", bookEl), nx = steps.find(s => !s.classList.contains("done") && !s.classList.contains("skipped"));
  steps.forEach(s => s.classList.toggle("next", s === nx));
  const nb = $(".kbnext", bookEl); nb.hidden = !nx;
  if (nx) {
    const H = heading(model(g)[+nx.closest(".page").dataset.p].head);
    $("small", nb).textContent = (H.n ? "Phase " + H.n + " · " : "") + $(".tick", nx).getAttribute("aria-label");
  }
}
// the quest log follows you down the page
function spy() {
  if (spyObs) spyObs.disconnect();
  if (!("IntersectionObserver" in window)) return;
  spyObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    $$(".kbnav [data-p]", bookEl).forEach(b => b.classList.toggle("on", b.dataset.p === e.target.dataset.p));
  }), { rootMargin: "-30% 0px -60% 0px" });
  $$(".page", bookEl).forEach(p => spyObs.observe(p));
}

/* =================== ticking, copying, starting over =================== */
function floaty(r, txt) {
  if (REDUCE) return;
  const f = document.createElement("span");
  f.className = "kbfloat"; f.textContent = txt; f.style.left = (r.right + 8) + "px"; f.style.top = (r.top - 2) + "px";
  document.body.append(f); setTimeout(() => f.remove(), 1300);
}
function tick(tk) {
  const g = cur, row = tk.closest(".step"), id = row.dataset.s, t = ticks(g), on = !t.has(id);
  if (on) t.add(id); else t.delete(id);
  store.set(key(g), [...t]);
  row.classList.toggle("done", on); tk.setAttribute("aria-checked", on);
  refresh(g);
  if (!on) return;
  const r = tk.getBoundingClientRect(), { n, of } = tally(g, t), pg = row.closest(".page");
  fx.burst(r.left + r.width / 2, r.top + r.height / 2, 10, .55);
  floaty(r, n + " / " + of);
  const moira = row.classList.contains("warned") && /moira/i.test(row.textContent);
  if (moira) award("moira");
  if (n === of) {
    award("kbdone"); fx.shower(120);
    notice("Guide complete", `Every step of ${g.title} ticked. Go hand in some quests.`, "inv_misc_book_11");
    say(pick(L.done), 0, 4500);
  } else if (moira) say(pick(L.moira), 0, 4200);
  else if (pg.classList.contains("done")) say(pick(L.part), 15e3, 3200);
  else say(pick(L.tick), 90e3, 2400);
}
async function copyText(s) {
  try { await navigator.clipboard.writeText(s); return true; } catch {}
  const ta = document.createElement("textarea");
  ta.value = s; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.append(ta); ta.select();
  let ok = false; try { ok = document.execCommand("copy"); } catch {}
  ta.remove(); return ok;
}
async function copyPart(btn) {
  const i = +btn.closest(".page").dataset.p, ok = await copyText(strip(cur.posts[i]));
  if (!ok) { notice("Couldn't copy", "Your browser said no. Select the text and copy it by hand.", "inv_misc_note_06"); return; }
  const lab = $("span", btn);
  btn.classList.add("ok"); lab.textContent = "Copied";
  setTimeout(() => { btn.classList.remove("ok"); lab.textContent = "Copy for Discord"; }, 1800);
  notice("Copied for Discord", `Part ${i + 1} of ${cur.posts.length}. Paste it as its own message.`, "inv_misc_horn_01");
  award("kbcopy"); say(pick(L.copy), 120e3, 4000);
}
let armed = 0, armT = 0;
function reset(btn) {
  const { n } = tally(cur);
  if (!armed) {
    armed = 1; btn.textContent = `Clear ${n} ${n === 1 ? "tick" : "ticks"}? Click again`; btn.classList.add("arm");
    clearTimeout(armT); armT = setTimeout(() => { armed = 0; btn.classList.remove("arm"); btn.textContent = "Start a fresh run"; }, 4000);
    return;
  }
  armed = 0; clearTimeout(armT); btn.classList.remove("arm");
  store.set(key(cur), []);
  $$(".step.done", bookEl).forEach(s => { s.classList.remove("done"); $(".tick", s).setAttribute("aria-checked", "false"); });
  refresh(cur); say(pick(L.reset), 0, 3000);
}
// skip a quest chain, or bring it back
function toggleChain(g, id) {
  const o = store.get(runKey(g), {}), skipped = skipSet(g).has(id);
  o[id] = skipped; store.set(runKey(g), o);
  refresh(g);
}
// fold or open parts (by index)
function setFold(g, list, folded) {
  const s = new Set(store.get(foldKey(g), []));
  list.forEach(i => folded ? s.add(i) : s.delete(i));
  store.set(foldKey(g), [...s]); refresh(g);
}
/* ---- the zone map, opened from a map button or a thumbnail: the whole zone, with the NPC's ! or ? on it ---- */
const mapBox = document.createElement("div");
mapBox.className = "kbmap"; mapBox.hidden = true; mapBox.setAttribute("role", "dialog"); mapBox.setAttribute("aria-modal", "true");
document.body.append(mapBox);
let mapFrom = null;
function openMap(npc, pin, from) {
  const P = KBP[npc]; if (!P) return;
  mapFrom = from;
  mapBox.setAttribute("aria-label", `${npc} on the ${P.zoneName} map`);
  mapBox.innerHTML = `<div class="mbox"><div class="mimg"><img src="img/maps/${P.zone}.jpg" alt="Map of ${esc(P.zoneName)}"><i class="pin${pin ? "" : " dot"}" style="left:${P.x}%;top:${P.y}%">${esc(pin)}</i><span class="mtag${P.x > 75 ? " r" : P.x < 25 ? " l" : ""}" style="left:${P.x}%;top:${P.y}%">${esc(npc)}</span></div>
    <p class="mcap"><span><b class="kn">${esc(npc)}</b> · ${esc(P.zoneName)}</span><span class="mxy">${P.x.toFixed(1)}, ${P.y.toFixed(1)}</span><button class="btn mx" type="button">Close</button></p></div>`;
  mapBox.hidden = false; $(".mx", mapBox).focus();
}
function closeMap() { if (mapBox.hidden) return; mapBox.hidden = true; mapBox.innerHTML = ""; if (mapFrom) mapFrom.focus(); }
mapBox.addEventListener("click", e => { if (e.target === mapBox || e.target.closest(".mx")) closeMap(); });
addEventListener("keydown", e => { if (e.key === "Escape") closeMap(); });
addEventListener("hashchange", closeMap);

bookEl.addEventListener("click", e => {
  const lc = e.target.closest(".loc, .wmap");
  if (lc) { openMap(lc.dataset.npc, lc.dataset.pin, lc); return; }
  const el = e.target.closest(".tick, .copy, .kbnav [data-p], .kbreset, .kblink, .kbnext, .skipb, .chain, .fold, .kbfoldall");
  if (!el || !cur) return;
  if (el.classList.contains("tick")) tick(el);
  else if (el.classList.contains("skipb") || el.classList.contains("chain")) toggleChain(cur, el.dataset.chain);
  else if (el.classList.contains("fold")) { const i = +el.closest(".page").dataset.p; setFold(cur, [i], el.getAttribute("aria-expanded") === "true"); }
  else if (el.classList.contains("kbfoldall")) { const all = model(cur).map((_, i) => i), open = new Set(store.get(foldKey(cur), [])).size < all.length; setFold(cur, all, open); }
  else if (el.classList.contains("kbnext")) { const nx = $(".step.next", bookEl); if (nx) { setFold(cur, [+nx.closest(".page").dataset.p], false); nx.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "center" }); } }
  else if (el.classList.contains("copy")) copyPart(el);
  else if (el.dataset.p != null) { setFold(cur, [+el.dataset.p], false); $(`#kbp-${el.dataset.p}`, bookEl).scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" }); }
  else if (el.classList.contains("kbreset")) reset(el);
  else {
    const url = location.origin + location.pathname + "#kb-" + cur.id;
    copyText(url).then(ok => notice(ok ? "Link copied" : "Here's the link", ok ? "It opens straight to this guide." : url, "inv_letter_15"));
  }
});

/* =================== the shelf's residents: the candle, the dust bunny, the empty spaces =================== */
let snuffed = false;
candle.addEventListener("click", () => {
  if (snuffed) return;
  snuffed = true;
  candle.classList.remove("wispy"); candle.classList.add("out"); banner.classList.add("snuffed");
  say(pick(L.snuff), 0, 2200);
  setTimeout(() => {
    candle.classList.remove("out"); candle.classList.add("wispy"); banner.classList.remove("snuffed"); snuffed = false;
    const r = candle.getBoundingClientRect(); fx.burst(r.left + r.width / 2, r.top + 8, 14, .5);
    award("candle"); say(pick(L.relight), 0, 3400);
  }, 2600);
});
function sneeze(db) {
  db.classList.remove("achoo"); void db.offsetWidth; db.classList.add("achoo");
  const r = db.getBoundingClientRect();
  if (!REDUCE) for (let k = 0; k < 9; k++) {
    const p = document.createElement("i");
    p.className = "dust"; p.style.left = (r.left + r.width / 2) + "px"; p.style.top = (r.top + r.height / 2) + "px";
    p.style.setProperty("--dx", (Math.random() * 90 - 45).toFixed(0) + "px"); p.style.setProperty("--dy", (-20 - Math.random() * 50).toFixed(0) + "px");
    document.body.append(p); setTimeout(() => p.remove(), 1000);
  }
  award("dustbunny"); say(pick(L.dust), 20e3, 3000);
}
shelfEl.addEventListener("click", e => {
  const db = e.target.closest(".dustbunny");
  if (db) { sneeze(db); return; }
  const gh = e.target.closest(".book.ghost");
  if (gh) { gh.classList.remove("wob"); void gh.offsetWidth; gh.classList.add("wob"); say(pick(L.ghost), 30e3, 3000); return; }
  const ln = e.target.closest("a.book, a.ccard");
  if (!ln || REDUCE || e.metaKey || e.ctrlKey || e.shiftKey) return;
  // the cover swings open before the page turns
  e.preventDefault();
  const bk = $("a.book", ln.closest(".kslot"));
  bk.classList.add("opening");
  setTimeout(() => { location.hash = ln.getAttribute("href").slice(1); bk.classList.remove("opening"); }, 560);
});

/* =================== which view: #library is the shelf, #kb-<id> opens a book =================== */
function route() {
  if (X.room !== "library") return;
  const h = decodeURIComponent(location.hash.slice(1)), g = h.startsWith("kb-") && KB.find(x => x.id === h.slice(3));
  if (g) {
    if (mode === "book" && cur === g) return;
    const from = mode; mode = "book"; cur = g; armed = 0;
    shelfEl.hidden = true; bookEl.hidden = false; book(g);
    if (from) scrollTo({ top: 0, behavior: "instant" });
    award("kbopen"); setTimeout(() => say(pick(L.open), 60e3, 3800), 900);
  } else {
    if (mode === "shelf") return;
    const from = mode; mode = "shelf"; cur = null;
    if (spyObs) spyObs.disconnect();
    bannerShelf(); shelf(); shelfEl.hidden = false; bookEl.hidden = true;
    if (from) scrollTo({ top: 0, behavior: "instant" });
  }
}
addEventListener("tw:room", e => { if (e.detail === "library") route(); else mode = null; });
addEventListener("hashchange", route);
const door = $('[data-count="library"]');
if (door) door.textContent = KB.length + (KB.length === 1 ? " guide" : " guides");
})();
