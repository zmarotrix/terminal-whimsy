/* Terminal Whimsy: the Library, the guild's knowledge base. Guides sit on a shelf as books.
   A guide is the same Discord posts the guild pastes (data/src/kb/*.md, built into D.KB), so each part has a copy
   button. Tags after bold text colour it here ({q} quest, {n} friendly, {h} hostile, {i} item) and are stripped from
   the copy. Steps tick off as you play; ticks live in this browser (tw.kb.<id>). Needs app.js (window.TWX). */
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
const KIND = { q: "kq", n: "kn", h: "kh", i: "ki" };
const strip = s => s.replace(/\{[qnhi]\}/g, "");

/* =================== reading Discord markdown =================== */
// plain text: escape it, then dress up map coordinates, stack counts and arrows
const plain = s => esc(s)
  .replace(/\((\d{1,2}(?:\.\d+)?), (\d{1,2}(?:\.\d+)?)\)/g, '<span class="coord" data-tip="Map coordinates">$1, $2</span>')
  .replace(/\b(\d+)x (?=[A-Z])/g, '<span class="qty">$1×</span> ')
  .replace(/→/g, '<span class="arw">→</span>');
function tag(txt, bold, k) {
  if (k === "q") {      // quests read like a quest link in chat, and look themselves up on Wowhead
    const name = txt.replace(/:$/, "");
    return `<a class="kq" href="${WH}${encodeURIComponent(name)}" target="_blank" rel="noopener" data-tip="Quest. Opens a Wowhead search.">[${esc(name)}]</a>${txt.endsWith(":") ? ":" : ""}`;
  }
  if (k === "i") return `<span class="ki">[${esc(txt)}]</span>`;
  if (k) return `<b class="${KIND[k]}">${esc(txt)}</b>`;
  return bold ? `<b>${esc(txt)}</b>` : `<i>${esc(txt)}</i>`;
}
function inline(raw) {
  let out = "", at = 0;
  for (const m of String(raw || "").matchAll(/(\*\*|\*)(.+?)\1(?:\{([qnhi])\})?/g)) {
    out += plain(raw.slice(at, m.index)) + tag(m[2], m[1] === "**", m[3]);
    at = m.index + m[0].length;
  }
  return out + plain(raw.slice(at));
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
    let m = ln.match(/^\*\*(\d+)\.\s+(.+?)\*\*(?:\{([qnhi])\})?(.*)$/);
    if (m) { step = { t: "step", id: pi + "." + m[1], n: m[1], title: m[2], k: m[3], rest: m[4], body: [], label: strip(m[2]).replace(/:$/, "") }; P.blocks.push(step); continue; }
    m = ln.match(/^\*\*([^*]+)\*\*\s*$/);
    if (m) { step = null; P.blocks.push({ t: "grp", h: esc(m[1]) }); continue; }
    if (ln.startsWith("⚠️")) { const w = { t: "warn", raw: ln.replace(/^⚠️\s*/, "") }; if (step) { step.body.push(w); step.warn = w.raw; } else P.blocks.push(w); continue; }
    if (ln.startsWith("- ")) {
      if (step) step.body.push({ t: "li", h: inline(ln.slice(2)) });
      else P.blocks.push({ t: "step", id: pi + ".b" + (++nb), bullet: true, h: inline(ln.slice(2)), body: [], label: strip(ln.slice(2)).replace(/\*/g, "").slice(0, 70) });
      continue;
    }
    m = ln.match(/^\*([^*].*)\*$/);
    if (m) { P.blocks.push({ t: "goal", h: inline(m[1]) }); continue; }
    (step ? step.body : P.blocks).push({ t: "p", h: inline(ln) });
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
const tally = (g, t = ticks(g)) => { const a = allSteps(g); return { n: a.filter(s => t.has(s.id)).length, of: a.length }; };

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
    <span class="lid"><span class="foil"><span class="emb"><img src="${ICON(g.icon)}" alt=""></span><b>${esc(g.cover[0])}</b><small>${esc(g.cover[1] || "")}</small></span></span>
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
function body(items) {
  let h = "", ul = false;
  for (const b of items) {
    if (b.t === "li") { if (!ul) { h += "<ul>"; ul = true; } h += `<li>${b.h}</li>`; continue; }
    if (ul) { h += "</ul>"; ul = false; }
    if (b.t === "p") h += `<p>${b.h}</p>`;
    else if (b.t === "warn") { const m = b.raw.match(/^\*\*(.+?)\*\*\s*(.*)$/); h += `<div class="rw" role="note">${m ? `<b>${esc(m[1])}</b><span>${inline(m[2])}</span>` : `<span>${inline(b.raw)}</span>`}</div>`; }
  }
  return h + (ul ? "</ul>" : "");
}
function stepHTML(s, done) {
  const head = s.bullet ? `<p>${s.h}</p>` : `<p><span class="sn">${s.n}</span><b class="stt ${s.k ? KIND[s.k] : ""}">${plain(strip(s.title))}</b>${inline(s.rest)}</p>`;
  return `<div class="step${done ? " done" : ""}${s.warn ? " warned" : ""}" data-s="${esc(s.id)}"><button class="tick" type="button" role="checkbox" aria-checked="${done}" aria-label="${esc(s.label)}"></button><div class="sx">${head}${body(s.body)}</div></div>`;
}
function pageHTML(g, P, i, t) {
  const H = heading(P.head), st = stepsOf(P), d = st.filter(s => t.has(s.id)).length, chars = strip(g.posts[i]).length;
  const blocks = P.blocks.map(b => b.t === "step" ? stepHTML(b, t.has(b.id)) : b.t === "grp" ? `<h4 class="kgrp">${b.h}</h4>` : b.t === "sub" ? `<p class="sub">${b.h}</p>`
    : b.t === "goal" ? `<p class="goal">${b.h}</p>` : b.t === "warn" ? body([b]) : `<p>${b.h}</p>`).join("");
  return `<article class="page${st.length && d === st.length ? " done" : ""}" id="kbp-${i}" data-p="${i}">
  <header class="ph"><span class="seal" aria-hidden="true">${esc(H.n || "✦")}</span><div class="pt"><h3>${esc(H.name)}</h3>${H.small ? `<small>${esc(H.small)}</small>` : ""}</div>
    <span class="pp" aria-label="${d} of ${st.length} steps ticked">${d}/${st.length}</span>
    <button class="copy" type="button" data-tip="Copies this part as one Discord message (${chars.toLocaleString()} of 2,000 characters)">${COPY_ICON}<span>Copy for Discord</span></button></header>
  <div class="pb">${blocks}</div>
</article>`;
}
let cur = null, mode = null, spyObs = null;
function book(g) {
  const M = model(g), t = ticks(g);
  bannerBook(g, M[0].cover && M[0].cover.sub);
  bookEl.innerHTML = `<div class="kbbar">
  <a class="btn ghost kbback" href="#library">← Back to the shelf</a>
  <div class="kbprog" role="progressbar" aria-label="Steps ticked" aria-valuemin="0"><span class="bar"><i></i></span><b></b></div>
  <div class="row"><button class="btn ghost kbreset" type="button">Start a fresh run</button><button class="btn ghost kblink" type="button">Copy link</button></div>
</div>
<div class="kbintro">
  <p class="kblegend"><span class="kq">[Quest]</span><b class="kn">Friendly</b><b class="kh">Hostile</b><span class="ki">[Item]</span><span><span class="coord">38.5, 55.5</span> map spot</span></p>
  ${(g.unsure || []).length ? `<aside class="kbnotes"><span class="stamp">Unchecked</span><p>Things nobody has confirmed on Forever yet. Seen one in game? Tell an officer.</p><ul>${g.unsure.map(u => `<li>${esc(u)}</li>`).join("")}</ul></aside>` : ""}
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
  const t = ticks(g), { n, of } = tally(g, t), pr = $(".kbprog", bookEl);
  pr.style.setProperty("--p", (of ? n / of * 100 : 0) + "%"); pr.setAttribute("aria-valuemax", of); pr.setAttribute("aria-valuenow", n);
  $("b", pr).textContent = n === of ? `All ${of} steps done` : `${n} of ${of} steps`;
  pr.classList.toggle("full", n === of);
  model(g).forEach((P, i) => {
    const st = stepsOf(P), d = st.filter(s => t.has(s.id)).length, full = !!st.length && d === st.length;
    const pg = $(`#kbp-${i}`, bookEl), nv = $(`.kbnav [data-p="${i}"]`, bookEl);
    $(".ph .pp", pg).textContent = d + "/" + st.length; pg.classList.toggle("done", full);
    $(".pp", nv).textContent = full ? "✓" : d + "/" + st.length; nv.classList.toggle("done", full);
  });
  const rb = $(".kbreset", bookEl); rb.disabled = !n; if (!armed) rb.textContent = "Start a fresh run";
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
bookEl.addEventListener("click", e => {
  const el = e.target.closest(".tick, .copy, .kbnav [data-p], .kbreset, .kblink");
  if (!el || !cur) return;
  if (el.classList.contains("tick")) tick(el);
  else if (el.classList.contains("copy")) copyPart(el);
  else if (el.dataset.p != null) $(`#kbp-${el.dataset.p}`, bookEl).scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" });
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
