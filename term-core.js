/* Terminal Whimsy: the hidden terminal. A small make-believe Linux box (whimsy@forever) with a quest inside.
   Press ` or click the green command line. Emacs users: C-a C-e C-k C-y M-b M-f M-d M-x all work, C-x C-c too.
   Other modules (term-emacs.js, term-adv.js) plug in through window.TWT. */
(() => {
"use strict";
const X = window.TWX, TD = window.TWTD;
if (!X || !TD) return;
const { D, $, esc, ICON, store, award, wisp, fx, burst, CL } = X;
const rnd = n => Math.random() * n | 0, pick = a => a[rnd(a.length)];
const DAY = 864e5;

/* ---------------- the machine's files ---------------- */
const KEY = new TextEncoder().encode("wisp-whimsy-forever");
const DATA = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(TD.fs), c => c.charCodeAt(0)).map((b, i) => b ^ KEY[i % KEY.length])));
const pwNorm = s => String(s || "").trim().toLowerCase();
const sha = async s => btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("whimsy:" + s)))));
// progress flags live in storage only, so the terminal and the secret pages never overwrite each other
const flags = new Proxy({}, { get: (_, k) => store.get("flags", {})[k] });
const flag = (k, v = true) => { const f = store.get("flags", {}); f[k] = v; store.set("flags", f); };

function mkfs(map) { return { map }; }
const LOCAL = mkfs(DATA.fs), BARROW = mkfs(DATA.barrow);
const S = { host: "forever", user: "whimsy", home: "/home/whimsy", cwd: "/home/whimsy", fs: LOCAL, env: {} };
const sessions = [];
const ENV = () => ({ USER: S.user, HOME: S.home, PWD: S.cwd, SHELL: "/bin/whimsh", EDITOR: "emacs", VISUAL: "emacs", PATH: "/usr/local/bin:/usr/bin:/bin:/usr/games", TERM: "xterm-256color", WISP: "awake", HOSTNAME: S.host, LANG: "en_US.UTF-8", RAID_NIGHT: "2026-12-09", ...S.env });

function norm(p) {
  const out = [];
  for (const part of p.split("/")) { if (!part || part === ".") continue; if (part === "..") out.pop(); else out.push(part); }
  return "/" + out.join("/");
}
function resolve(p) {
  if (!p) return S.cwd;
  if (p === "~" || p.startsWith("~/")) p = S.home + p.slice(1);
  else if (/^~[a-z]+/.test(p)) p = "/home/" + p.slice(1);
  return norm(p.startsWith("/") ? p : S.cwd + "/" + p);
}
const isDir = (p, fs = S.fs) => p === "/" || (p + "/") in fs.map;
const exists = (p, fs = S.fs) => isDir(p, fs) || p in fs.map;
const node = (p, fs = S.fs) => { const v = fs.map[p] ?? fs.map[p + "/"]; return v && typeof v === "object" ? v : { c: v }; };
function kids(dir, fs = S.fs) {
  const base = dir === "/" ? "/" : dir + "/", out = new Set();
  for (const k of Object.keys(fs.map)) if (k !== base && k.startsWith(base)) { const rest = k.slice(base.length); const n = rest.split("/")[0]; if (n) out.add(n + (rest.includes("/") ? "/" : "")); }
  return [...out].sort((a, b) => a.replace(/^\./, "").localeCompare(b.replace(/^\./, "")));
}
function canReach(p, fs = S.fs) {
  if (S.user === "root") return true;
  const parts = p.split("/").filter(Boolean);
  for (let k = 1; k < parts.length; k++) { const d = "/" + parts.slice(0, k).join("/"); if (isDir(d, fs) && !canRead(d, fs)) return false; }
  return true;
}
const canList = (d, fs = S.fs) => isDir(d, fs) && canReach(d, fs) && canRead(d, fs);
function canRead(p, fs = S.fs) {
  if (S.user === "root") return true;
  const n = node(p, fs);
  return !n.mode || n.owner === S.user || n.mode[7] === "r";    // the "others may read" bit
}
function readFile(p) {
  if (!canReach(p)) throw `${p}: Permission denied`;
  if (!exists(p)) throw `${p}: No such file or directory`;
  if (isDir(p)) throw `${p}: Is a directory`;
  if (!canRead(p)) throw `${p}: Permission denied`;
  if (p === "/dev/whimsy") { award("devwhimsy"); fx.shower(60); return "*sparkles*"; }
  if (p === "/dev/random" || p === "/dev/urandom") return Array.from({ length: 6 }, () => Array.from({ length: 40 }, () => String.fromCharCode(33 + rnd(90))).join("")).join("\n");
  if (p === "/home/sprinkles/ticket.txt" && !flags.ticket) { flag("ticket"); award("ticket"); setTimeout(() => wisp.talk("> ooh, a darkmoon ticket!", 3000), 300); }
  if (p === "/root/README.root" || p.startsWith("/home/leeroy/")) award("rootread");
  if (p === "/home/fizzlewick/postcard.b64") award("postcard");
  if (p === "/proc/wisp/status" && X.mind) return X.mind.status();
  const c = node(p).c;
  return c == null ? "" : String(c);
}

const LOG = (k, d) => window.TWLOG && window.TWLOG.push(k, d);

/* ---------------- console UI ---------------- */
const con = document.createElement("div");
con.className = "console"; con.hidden = true; con.setAttribute("role", "dialog"); con.setAttribute("aria-label", "Terminal");
con.innerHTML = `<div class="con-bar"><span class="con-title"></span><span class="con-hint">C-x C-c or Esc to close · help</span></div><div class="con-out" aria-live="polite"></div><div class="con-mode" hidden></div><label class="con-in"><span class="ps"></span><input id="conInput" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other" aria-label="Type a command"></label><div class="con-grip" role="separator" aria-orientation="horizontal" aria-label="Drag to resize the terminal" title="Drag to resize · double-click to maximise"></div>`;
document.body.append(con);
const out = $(".con-out", con), inp = $("#conInput"), psEl = $(".ps", con), modeLine = $(".con-mode", con), titleEl = $(".con-title", con);
if (flags.theme) con.classList.add("th-" + flags.theme);
// the terminal can be resized: drag its bottom edge, double-click it, or C-x 1 (big) / C-x 2 (half)
function setHeight(px, save = true) {
  const h = Math.round(Math.max(160, Math.min(innerHeight - 8, px)));
  con.style.height = h + "px"; if (save && innerHeight > 200) store.set("conHeight", h / innerHeight);
  requestAnimationFrame(() => { out.scrollTop = out.scrollHeight; });
}
{ const f = store.get("conHeight", null); if (f) setHeight(f * innerHeight, false); }
addEventListener("resize", () => { const f = store.get("conHeight", null); if (f) setHeight(f * innerHeight, false); });
const grip = con.querySelector(".con-grip");
let gripDrag = null;
grip.addEventListener("pointerdown", e => { e.preventDefault(); gripDrag = { y: e.clientY, h: con.getBoundingClientRect().height }; grip.setPointerCapture(e.pointerId); con.classList.add("resizing"); });
grip.addEventListener("pointermove", e => { if (gripDrag) setHeight(gripDrag.h + e.clientY - gripDrag.y); });
const endGrip = () => { if (!gripDrag) return; gripDrag = null; con.classList.remove("resizing"); award("resize"); inp.focus(); };
grip.addEventListener("pointerup", endGrip); grip.addEventListener("pointercancel", endGrip);
grip.addEventListener("dblclick", () => { const big = con.getBoundingClientRect().height > innerHeight * .8; setHeight(big ? innerHeight * .6 : innerHeight - 8); award("resize"); inp.focus(); });
const print = (x, cls = "") => {
  if (x == null || x === "") return null;
  const d = document.createElement("div"); d.className = "ln " + cls;
  if (typeof x === "object" && x.html != null) d.innerHTML = x.html; else d.textContent = String(x);
  out.append(d); out.scrollTop = out.scrollHeight; return d;
};
const html = h => ({ html: h });
let busy = null;   // a running animation: { stop() }
function animate(frames, ms, onDone) {
  const d = print(" ", "anim"); let i = 0;
  const t = setInterval(() => { if (i >= frames.length) { stop(); return; } d.textContent = frames[i++]; out.scrollTop = out.scrollHeight; }, ms);
  const stop = () => { clearInterval(t); busy = null; onDone && onDone(); };
  busy = { stop }; return d;
}
function stream(lines, ms, onDone) {
  let i = 0;
  const t = setInterval(() => { if (i >= lines.length) { stop(); return; } const l = lines[i++]; print(typeof l === "object" ? l : l, ""); }, ms);
  const stop = () => { clearInterval(t); busy = null; onDone && onDone(); };
  busy = { stop };
}

/* ---------------- modes: shell, password prompts, and whatever plugs in (emacs, vim, ed, doctor, adventure) ---------------- */
const modes = [];
const mode = () => modes[modes.length - 1];
function push(m) { modes.push(m); m.enter && m.enter(); refresh(); }
function pop() { const m = modes.pop(); m && m.leave && m.leave(); refresh(); }
function refresh() {
  const m = mode();
  psEl.textContent = m.prompt ? m.prompt() : "$";
  con.classList.toggle("secret", !!m.secret);
  inp.setAttribute("aria-label", m.secret ? "Password (hidden)" : "Type a command");
  const ml = m.modeline ? m.modeline() : "";
  modeLine.hidden = !ml; modeLine.textContent = ml;
  titleEl.textContent = m.title ? m.title() : `${S.user}@${S.host}: ${S.cwd.replace(S.home, "~")}`;
  con.dataset.mode = m.name;
}
function shPrompt() { return `${S.user}@${S.host}:${S.cwd === S.home ? "~" : S.cwd.startsWith(S.home + "/") ? "~" + S.cwd.slice(S.home.length) : S.cwd}${S.user === "root" ? "#" : "$"}`; }
const SHELL = { name: "shell", prompt: shPrompt, line: runLine };
function ask(promptText, secret, onAnswer, completer) {
  push({ name: "ask", secret, prompt: () => promptText, complete: completer, cg() { pop(); }, cc() { pop(); }, line(v) { pop(); onAnswer(v); } });   // C-g / C-c cancel, like the minibuffer
}

/* ---------------- open / close ---------------- */
let metaUntil = 0;
function openCon() {
  if (!con.hidden) { inp.focus(); return; }
  con.hidden = false; requestAnimationFrame(() => con.classList.add("on")); inp.focus(); X.hideTip();
  if (!modes.length) push(SHELL);
  if (!out.childElementCount) {
    print(`Last login: ${new Date(Date.now() - 36e5 * 7).toString().slice(0, 24)} from wisp`, "dim");
    print(DATA.motd);
    if (!flags.mailRead) print(html(`<span class="hl">You have new mail.</span> Type <b>mail</b> to read it.`));
    if (window.TWLOG && window.TWLOG.on) print(html(`<span class="dim">(This terminal keeps an anonymous log of what's typed here, never passwords, so the guild can fix things and add more. Type <b>privacy</b> to read more or switch it off.)</span>`));
  }
  award("term");
  if (!store.get("conMet", false)) { store.set("conMet", true); wisp.talk(D.WISP.term, 4000); }
}
function closeCon() { if (busy) busy.stop(); con.classList.remove("on"); setTimeout(() => { con.hidden = true; }, 200); inp.blur(); }
addEventListener("keydown", e => {
  const inField = e.target && e.target.closest && e.target.closest("input,textarea");
  if ((e.key === "`" || e.key === "~") && !inField && !e.ctrlKey && !e.altKey) { e.preventDefault(); con.hidden ? openCon() : closeCon(); }
});
const termLine = $(".hero .term");
if (termLine) termLine.addEventListener("click", e => { e.stopPropagation(); openCon(); });   // no hint, no glow: finding it is the point
con.addEventListener("click", e => { if (!e.target.closest("a,button") && !getSelection().toString()) inp.focus(); });

/* ---------------- readline, the Emacs way ---------------- */
let hist = store.get("conHist", []), hi = hist.length, kill = store.get("killRing", ""), lastKill = false, cx = false;
const wordBack = (s, i) => { while (i > 0 && /\W/.test(s[i - 1])) i--; while (i > 0 && /\w/.test(s[i - 1])) i--; return i; };
const wordFwd = (s, i) => { while (i < s.length && /\W/.test(s[i])) i++; while (i < s.length && /\w/.test(s[i])) i++; return i; };
function setInput(v, caret = v.length) { inp.value = v; inp.setSelectionRange(caret, caret); }
inp.addEventListener("keydown", e => {
  const m = mode(), v = inp.value, a = inp.selectionStart, b = inp.selectionEnd;
  if (m.key && m.key(e) === true) { e.preventDefault(); return; }
  // the physical key, so Option on a Mac (which types ≈ for x) still works as Meta
  const k = e.code && /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : e.code && /^Digit\d$/.test(e.code) && (e.altKey || e.ctrlKey) ? e.code.slice(5) : e.key.toLowerCase();
  // C-x prefix (C-x C-c quits, C-x C-f finds a file, C-x C-e evaluates)
  if (cx) {
    cx = false;
    if (e.ctrlKey && k === "c") { e.preventDefault(); if (m.cxcc) m.cxcc(); else { award("homesick"); print(html(`<span class="dim">C-x C-c: this is a shell, not Emacs. Closing the terminal anyway, out of respect.</span>`)); setTimeout(closeCon, 500); } return; }
    if (e.ctrlKey && k === "f") { e.preventDefault(); ask("Find file: ~/", false, f => TWT.emacs ? TWT.emacs.findFile(resolve("~/" + f)) : print("emacs isn't loaded")); return; }
    if (e.ctrlKey && k === "e") { e.preventDefault(); if (m.evalLast) m.evalLast(v); return; }
    if (!e.ctrlKey && (k === "1" || k === "2" || k === "0")) { e.preventDefault(); setHeight(k === "1" ? innerHeight - 8 : k === "2" ? innerHeight / 2 : innerHeight * .6); award("resize"); print(k === "1" ? "delete-other-windows (the terminal takes the whole screen)" : k === "2" ? "split-window-below (half the screen)" : "delete-window (back to normal)", "dim"); return; }
    if (!e.ctrlKey && !e.altKey && e.key.length === 1) { print(`C-x ${e.key} is undefined`, "dim"); e.preventDefault(); return; }
  }
  if (e.key === "Escape") {
    e.preventDefault();
    if (Date.now() < metaUntil) { metaUntil = 0; closeCon(); return; }
    metaUntil = Date.now() + 650;
    setTimeout(() => { if (metaUntil && Date.now() >= metaUntil) { metaUntil = 0; if (mode().escape) mode().escape(); else closeCon(); } }, 700);
    return;
  }
  const meta = e.altKey || e.metaKey && k === "x" || (metaUntil && Date.now() < metaUntil && e.key.length === 1);
  if (meta && !e.ctrlKey) {
    metaUntil = 0;
    if (k === "x") { e.preventDefault(); award("mx"); ask("M-x ", false, c => runMx(c.trim()), mxComplete); return; }
    if (k === "b") { e.preventDefault(); const i = wordBack(v, a); inp.setSelectionRange(i, i); return; }
    if (k === "f") { e.preventDefault(); const i = wordFwd(v, a); inp.setSelectionRange(i, i); return; }
    if (k === "d") { e.preventDefault(); const i = wordFwd(v, a); kill = v.slice(a, i); setInput(v.slice(0, a) + v.slice(i), a); lastKill = true; return; }
    if (e.key === "Backspace") { e.preventDefault(); const i = wordBack(v, a); kill = v.slice(i, a); setInput(v.slice(0, i) + v.slice(a), i); lastKill = true; return; }
    if (k === "<") { e.preventDefault(); hi = 0; setInput(hist[0] || ""); return; }
    if (k === ">") { e.preventDefault(); hi = hist.length; setInput(""); return; }
    if (k === ".") { e.preventDefault(); const last = (hist[hist.length - 1] || "").split(/\s+/).pop(); setInput(v.slice(0, a) + last + v.slice(b), a + last.length); return; }
    if (k === ":") { e.preventDefault(); ask("Eval: ", false, x => TWT.emacs ? print(TWT.emacs.evalString(x)) : print("no lisp here")); return; }
  }
  if (e.ctrlKey && !e.altKey) {
    const eat = () => e.preventDefault();
    switch (k) {
      case "a": eat(); inp.setSelectionRange(0, 0); return;
      case "e": eat(); inp.setSelectionRange(v.length, v.length); return;
      case "b": eat(); inp.setSelectionRange(Math.max(0, a - 1), Math.max(0, a - 1)); return;
      case "f": eat(); inp.setSelectionRange(Math.min(v.length, a + 1), Math.min(v.length, a + 1)); return;
      case "k": eat(); kill = v.slice(a); setInput(v.slice(0, a), a); lastKill = true; store.set("killRing", kill); return;
      case "u": eat(); kill = v.slice(0, a); setInput(v.slice(a), 0); lastKill = true; return;
      case "y": eat(); setInput(v.slice(0, a) + kill + v.slice(b), a + kill.length); if (lastKill && kill) award("killring"); return;
      case "d": eat(); if (!v && m.name === "shell") { print("logout", "dim"); exitShell(); } else setInput(v.slice(0, a) + v.slice(a + 1), a); return;
      case "h": eat(); if (a > 0) setInput(v.slice(0, a - 1) + v.slice(a), a - 1); return;
      case "l": eat(); out.innerHTML = ""; return;
      case "g": eat(); print("Quit", "dim"); setInput(""); cx = false; award("cg"); if (m.cg) m.cg(); return;
      case "c": if (getSelection().toString()) return; eat(); if (busy) { busy.stop(); print("^C", "dim"); } else { print(`${psEl.textContent} ${v}^C`, "cmd"); setInput(""); if (m.cc) m.cc(); } return;
      case "p": eat(); hi = Math.max(0, hi - 1); setInput(hist[hi] || ""); return;
      case "n": eat(); hi = Math.min(hist.length, hi + 1); setInput(hist[hi] || ""); return;
      case "x": eat(); cx = true; print("C-x-", "dim"); return;
      case "r": eat(); ask("(reverse-i-search): ", false, q => { const h = [...hist].reverse().find(x => x.includes(q)); setInput(h || ""); if (!h) print(`failing reverse-i-search: ${q}`, "dim"); }); return;
      case "t": eat(); if (a > 0 && a < v.length) setInput(v.slice(0, a - 1) + v[a] + v[a - 1] + v.slice(a + 1), a + 1); return;
      case "s": eat(); return;
    }
  }
  lastKill = false;
  if (e.key === "Enter") {
    e.preventDefault();
    const line = inp.value; setInput("");
    if (!m.secret) print(html(`<span class="ps">${esc(psEl.textContent)}</span> ${esc(line)}`), "cmd");
    if (line.trim() && !m.secret && m.name !== "ask") { hist.push(line); hist = hist.slice(-200); hi = hist.length; store.set("conHist", hist); }
    if (busy && m.name === "shell") { busy.stop(); }
    if (m.secret) LOG("password", { mode: m.name });                   // never what was typed
    else if (line.trim()) LOG("input", { mode: m.name, host: S.host, cwd: S.cwd, line });
    m.line(line);
    return;
  }
  if (e.key === "ArrowUp" && !m.noHistory) { e.preventDefault(); hi = Math.max(0, hi - 1); setInput(hist[hi] || ""); }
  else if (e.key === "ArrowDown" && !m.noHistory) { e.preventDefault(); hi = Math.min(hist.length, hi + 1); setInput(hist[hi] || ""); }
  else if (e.key === "Tab") { e.preventDefault(); complete(); }
});
// M-x completion: the common prefix, then the candidates; 'e-b' finds eval-buffer (Emacs's partial-completion)
function mxComplete() {
  const names = window.TWT && window.TWT.mxNames ? window.TWT.mxNames() : [], v = inp.value.trim();
  let opts = names.filter(n => n.startsWith(v));
  if (!opts.length && v.includes("-")) { const re = new RegExp("^" + v.split("-").map(s => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + "[^-]*").join("-")); opts = names.filter(n => re.test(n)); }
  if (!opts.length) { print("[No match]", "dim"); return; }
  if (opts.length === 1) { setInput(opts[0]); return; }
  let pre = opts[0]; for (const o of opts) while (!o.startsWith(pre)) pre = pre.slice(0, -1);
  if (pre.length > v.length && opts.every(o => o.startsWith(v))) { setInput(pre); return; }
  print(`${opts.length} possible completions:\n` + opts.join("  "), "dim");
}
function complete() {
  if (mode().complete) return mode().complete();
  if (mode().name !== "shell") return;
  const v = inp.value, parts = v.split(/\s+/), last = parts[parts.length - 1];
  let opts;
  if (parts.length === 1) opts = Object.keys(CMDS).filter(c => !CMDS[c].hidden && c.startsWith(last));
  else {
    const base = last.includes("/") ? last.slice(0, last.lastIndexOf("/") + 1) : "", dir = resolve(base || ".");
    opts = canList(dir) ? kids(dir).filter(n => n.startsWith(last.slice(base.length)) && (!n.startsWith(".") || last.slice(base.length).startsWith("."))).map(n => base + n) : [];
  }
  if (opts.length === 1) { parts[parts.length - 1] = opts[0] + (opts[0].endsWith("/") ? "" : " "); setInput(parts.join(" ")); }
  else if (opts.length > 1) {
    let pre = opts[0]; for (const o of opts) while (!o.startsWith(pre)) pre = pre.slice(0, -1);
    if (pre.length > last.length) { parts[parts.length - 1] = pre; setInput(parts.join(" ")); } else print(opts.join("  "), "dim");
  }
}

const runMx = c => window.TWT && window.TWT.runMx ? window.TWT.runMx(c) : print("M-x: Emacs isn't loaded. (Grumbolt is furious.)", "err");

/* ---------------- parsing: quotes, $VARS, globs, pipes, ; and && ---------------- */
function tokenize(line) {
  const toks = []; let cur = "", q = null, any = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = null; else if (c === "\\" && q === '"' && i + 1 < line.length) cur += line[++i]; else cur += c; continue; }
    if (c === "'" || c === '"') { q = c; any = true; continue; }
    if (c === "\\" && i + 1 < line.length) { cur += line[++i]; any = true; continue; }
    if (c === " " || c === "\t") { if (cur || any) toks.push(cur); cur = ""; any = false; continue; }
    if (c === "|" && line[i + 1] === "|") { if (cur || any) toks.push(cur); toks.push({ op: "||" }); cur = ""; any = false; i++; continue; }
    if (c === "|" || c === ";") { if (cur || any) toks.push(cur); toks.push({ op: c }); cur = ""; any = false; continue; }
    if (c === "&" && line[i + 1] === "&") { if (cur || any) toks.push(cur); toks.push({ op: "&&" }); cur = ""; any = false; i++; continue; }
    if (c === ">") { if (cur || any) toks.push(cur); const app = line[i + 1] === ">"; toks.push({ op: app ? ">>" : ">" }); if (app) i++; cur = ""; any = false; continue; }
    if (c === "$" && !q) { const m = line.slice(i).match(/^\$(\{(\w+)\}|(\w+)|\?)/); if (m) { cur += m[1] === "?" ? String(lastStatus) : (ENV()[m[2] || m[3]] ?? ""); i += m[0].length - 1; any = true; continue; } }
    cur += c;
  }
  if (cur || any) toks.push(cur);
  return toks;
}
function glob(arg) {
  if (!/[*?]/.test(arg)) return [arg];
  const base = arg.includes("/") ? arg.slice(0, arg.lastIndexOf("/") + 1) : "", pat = arg.slice(base.length);
  const rx = new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
  const dir = resolve(base || ".");
  const hits = canList(dir) ? kids(dir).map(n => n.replace(/\/$/, "")).filter(n => rx.test(n) && (!n.startsWith(".") || pat.startsWith("."))).map(n => base + n) : [];
  return hits.length ? hits : [arg];
}
const unesc = h => { const t = document.createElement("textarea"); t.innerHTML = h.replace(/<[^>]+>/g, ""); return t.value; };
const textOf = r => r == null ? "" : typeof r === "object" ? (r.text != null ? r.text : r.html != null ? unesc(r.html) : "") : String(r);
let lastStatus = 0, lastLine = "", ran = store.get("conRan", 0);
async function runLine(line) {
  line = line.trim();
  if (!line) return;
  if (/^M-x\s+/i.test(line)) { award("mx"); runMx(line.replace(/^M-x\s+/i, "")); return; }   // people type it literally; let them
  if (line === "!!" || line.includes("!!")) { line = line.replace(/!!/g, lastLine); print(line, "dim"); if (line.startsWith("sudo ")) award("sudobang"); }
  lastLine = line;
  ran++; store.set("conRan", ran); if (ran >= 10) award("poweruser"); if (ran >= 100) award("terminalbound");
  const toks = tokenize(line);
  let seg = [], segs = [];
  for (const t of toks) { if (typeof t === "object" && (t.op === ";" || t.op === "&&" || t.op === "||")) { segs.push({ seg, op: t.op }); seg = []; } else seg.push(t); }
  segs.push({ seg, op: null });
  let prevOp = null;
  for (const { seg: s, op } of segs) {
    if (prevOp === "&&" && lastStatus !== 0) break;
    if (prevOp === "||" && lastStatus === 0) { prevOp = op; continue; }
    await runPipeline(s);
    prevOp = op;
  }
}
async function runPipeline(toks) {
  const stages = [[]]; let redirect = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (typeof t === "object" && t.op === "|") { stages.push([]); if (stages.length === 2) award("pipe"); continue; }
    if (typeof t === "object" && (t.op === ">" || t.op === ">>")) { redirect = toks[++i]; continue; }
    stages[stages.length - 1].push(t);
  }
  let input = null, result = null;
  for (const st of stages) {
    if (!st.length) continue;
    const [name, ...rawArgs] = st;
    const args = rawArgs.flatMap(a => typeof a === "string" ? glob(a) : []);
    result = await run1(name, args, input);
    input = textOf(result);
  }
  if (redirect) {
    if (redirect === "/dev/null") { award("devnull"); return; }
    print(`whimsh: ${redirect}: read-only file system (the wisp guards it)`, "err"); lastStatus = 1; return;
  }
  if (result != null && result !== "") print(result);
}
async function run1(name, args, stdin) {
  if (/^[A-Z_]+=/.test(name)) { const [k, ...v] = name.split("="); S.env[k] = v.join("="); return ""; }
  if (name.startsWith("./") || name.startsWith("/") && !CMDS[name]) return execFile(resolve(name), args);
  if (!CMDS[name] && !ALIASES[name] && canReach(resolve(name)) && exists(resolve(name))) {     // e.g. typing .emacs.d/init.el on its own
    lastStatus = 126;
    return isDir(resolve(name)) ? html(`<span class="err">whimsh: ${esc(name)}: Is a directory</span>`)
      : html(`<span class="err">whimsh: ${esc(name)}: that's a file, not a command.</span> <span class="dim">Read it with <b>cat ${esc(name)}</b>, or open it with <b>emacs ${esc(name)}</b>.</span>`);
  }
  if (S.host === "barrow-deeps" && /^(say|speak|shout|yell)$/.test(name)) return CMDS.answer.f(args);
  const alias = ALIASES[name];
  if (alias) { const [n, ...a] = alias.split(" "); return run1(n, [...a, ...args], stdin); }
  const c = CMDS[name] || CMDS[name.toLowerCase()];
  if (!c) { lastStatus = 127; return notFound(name); }
  if (c.pkg && !isInstalled(c.pkg)) { lastStatus = 127; LOG("notfound", { line: name }); return html(`<span class="err">Command '${esc(name)}' not found, but can be installed with:</span>\n\n  apt install ${esc(name)}\n`); }
  try { lastStatus = 0; const r = await c.f(args, stdin); return r; }
  catch (err) { lastStatus = 1; LOG("cmderror", { line: [name, ...args].join(" "), err: String(err && (err.stack || err.message) || err) }); return { html: `<span class="err">${esc(name)}: ${esc(err.message || err)}</span>`, text: "" }; }
}
function notFound(name) {
  const near = Object.keys(CMDS).filter(c => !CMDS[c].hidden && lev(c, name) <= 1 && c.length > 2);
  award("notfound"); LOG("notfound", { line: name });
  const extra = WINDOWS[name.toLowerCase()] ? ` (this isn't Windows, but okay: try ${WINDOWS[name.toLowerCase()]})` : near.length ? ` Did you mean: ${near.slice(0, 3).join(", ")}?` : "";
  return html(`<span class="err">${esc(name)}: command not found.</span>${esc(extra)}`);
}
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
const WINDOWS = { dir: "ls", cls: "clear", type: "cat", del: "rm (please don't)", copy: "cp", move: "mv", tasklist: "ps", taskkill: "kill", systeminfo: "uname -a", ver: "uname -r", tracert: "traceroute" };
function execFile(p, args) {
  if (!canReach(p)) return html(`<span class="err">whimsh: ${esc(p)}: Permission denied</span>`);
  if (!exists(p)) return html(`<span class="err">whimsh: ${esc(p)}: No such file or directory</span>`);
  const n = node(p);
  if (!/x/.test((n.mode || "-rw-r--r--").slice(1, 4)) && !chmodded.has(p)) return html(`<span class="err">whimsh: ${esc(p)}: Permission denied</span> <span class="dim">(it isn't executable. chmod +x?)</span>`);
  if (p.endsWith("/adventure")) return CMDS.adventure.f(args);
  if (p.endsWith("/fortune")) return CMDS.fortune.f(args);
  if (p.endsWith("/cowsay")) return CMDS.cowsay.f(args);
  if (p.endsWith("/summon.sh")) { award("summon"); X.whelps ? X.whelps() : null; return "Summoning... many whelps. Handle it."; }
  return "(it runs, sparkles briefly, and exits 0)";
}
const chmodded = new Set();

/* ---------------- the commands ---------------- */
const ALIASES = { ll: "ls -la", la: "ls -a", l: "ls", dir: "ls", cls: "clear", type: "cat", tracert: "traceroute", please: "sudo", "..": "cd ..", vi: "vim", nvim: "vim", toilet: "figlet", banner: "figlet", screenfetch: "neofetch", fastfetch: "neofetch", htop: "top", btop: "top", more: "less", logout: "exit", quit: "exit", cowthink: "cowsay", gpg: "base64", "apt-get": "apt", dnf: "apt", yum: "apt", zypper: "apt", tasklist: "ps", taskkill: "kill", sl: "sl" };
const MAN = {
  whimsy: `WHIMSY(7)                 WhimsyOS Manual                 WHIMSY(7)

NAME
     whimsy - the terminal behind the corner of your screen

DESCRIPTION
     A small machine with files, users, logs and a few doors. Explore it
     like any other box: ls -a, cd, cat, grep, man. Some things only
     happen if you look closely, and some only if you pipe one thing
     into another.

     There is a quest. It starts with your mail.

     Emacs users will find themselves at home: emacs, M-x, C-x C-c.
     Vim users will find themselves... somewhere.

SEE ALSO
     mail(1), seal(1), emacs(1), adventure(6), fortune(6), wisp(8)`,
  wisp: `WISPD(8)

NAME
     wispd - the whimsy daemon (pid 7)

DESCRIPTION
     Glows in the corner. Can be poked, dragged, hugged and /followed.
     Cannot be killed. Do not attempt to kill.

FILES
     /proc/wisp/status, /proc/wisp/memory, /var/log/wisp.log`,
  seal: `SEAL(1)

SYNOPSIS
     seal <word>      speak a seal you've found
     seals            show which of the seven you have
     unlock vault     open the vault, once you hold all seven`,
  ls: "LS(1)\n     ls [-a] [-l] [path]   list a directory. -a shows the shy files that start with a dot.",
  grep: "GREP(1)\n     grep [-i] [-n] [-v] [-c] [-r] pattern [file...]   find lines. Pipe into it: cat x | grep y",
  base64: "BASE64(1)\n     base64 [-d] [file]   encode, or with -d decode. Works on pipes.",
  xxd: "XXD(1)\n     xxd [file]          hex dump\n     xxd -r -p [file]    turn plain hex back into text",
  tr: "TR(1)\n     tr SET1 SET2   translate characters. The classic: tr 'A-Za-z' 'N-ZA-Mn-za-m' is rot13.",
  rot13: "ROT13(6)\n     rot13 [file]   rotate letters by 13. Fizzlewick's favourite cipher.",
  ssh: "SSH(1)\n     ssh [user@]host   connect to another machine. See /etc/hosts for what's out there.",
  emacs: "EMACS(1)\n     emacs [file]   the one true editor (Grumbolt, every day)\n     In emacs: type Lisp to evaluate it, M-x for commands, C-x C-c to quit.\n     Try M-x doctor. Try M-x butterfly. Try M-x eval-buffer on a .el file.",
  vim: "VIM(1)\n     vim   a modal editor. Getting in is easy.",
  mail: "MAIL(1)\n     mail [n]   read your mail.",
  adventure: "ADVENTURE(6)\n     adventure   a very small dungeon. Type 'help' inside it.",
  sudo: "SUDO(8)\n     sudo   run as root. You are not in the sudoers file. Nobody is, except Grumbolt.",
  su: "SU(1)\n     su   become root, if you know the password. Grumbolt does.",
  chmod: "CHMOD(1)\n     chmod +x file   make a file runnable, then run it with ./file",
  zcat: "ZCAT(1)\n     zcat file.gz   read a compressed file",
  kill: "KILL(1)\n     kill [-9] pid   stop a process. See ps or top for pids.",
  fortune: "FORTUNE(6)\n     fortune   a Darkmoon fortune. fortune -a for all of them, eventually.",
  cowsay: "COWSAY(6)\n     cowsay [-f tauren|murloc|wisp] text   a talking cow, or relative",
  man: "MAN(1)\n     man page   read a manual page. man whimsy is a good start. man -k word searches.",
};

const CMDS = {};
const cmd = (names, f, o = {}) => { for (const n of [].concat(names)) CMDS[n] = { f, ...o }; };

// ----- help -----
cmd("help", () => html(`<b>Files</b>    ls cd pwd cat less head tail grep find tree file wc sort uniq rev tr base64 xxd rot13 zcat
<b>System</b>   whoami id who finger uname uptime date cal df du lsblk free top ps kill systemctl journalctl dmesg neofetch
<b>Network</b>  ifconfig ip ping traceroute nslookup dig curl ssh netstat
<b>Editors</b>  emacs (M-x works anywhere: Alt+x)   vim   nano   ed
<b>Fun</b>      fortune cowsay figlet lolcat sl cmatrix calc xeyes hack
<b>Guild</b>    mail raid wire hotfix change said class loot motes seals go /dance /roll /hug /who /played
<b>Keys</b>     C-a C-e C-b C-f C-k C-y C-u C-l C-g C-p C-n C-r M-b M-f M-d M-x C-x C-c, Tab, Up/Down
<span class="dim">man whimsy for the manual. Not every command is listed. Not every file is visible.</span>`));
cmd("man", a => {
  if (a[0] === "-k") { const w = (a[1] || "").toLowerCase(); return Object.keys(MAN).filter(k => MAN[k].toLowerCase().includes(w)).map(k => `${k} (1)`).join("\n") || `${w}: nothing appropriate.`; }
  const p = a[0]; if (!p) return "What manual page do you want?\nFor example, try 'man whimsy'.";
  if (p === "whimsy") award("rtfm");
  return MAN[p] || (CMDS[p] ? `${p.toUpperCase()}(1)\n     ${p}: there's no manual. Just try it.` : `No manual entry for ${p}`);
});

// ----- files -----
cmd("pwd", () => S.cwd);
cmd("cd", a => {
  const t = a[0] === "-" ? (S.oldpwd || S.cwd) : resolve(a[0] || "~");
  if (!canReach(t)) throw `${a[0]}: Permission denied`;
  if (!exists(t)) throw `${a[0]}: No such file or directory`;
  if (!isDir(t)) throw `${a[0]}: Not a directory`;
  if (!canRead(t)) { if (t === "/home/leeroy") return html(`<span class="err">cd: /home/leeroy: Permission denied</span> <span class="dim">(Leeroy is AFK. Chicken.)</span>`); throw `${a[0]}: Permission denied`; }
  S.oldpwd = S.cwd; S.cwd = t; refresh();
  const seen = new Set(store.get("dirs", [])); seen.add(S.host + t); store.set("dirs", [...seen]); if (seen.size >= 12) award("spelunker");
  return "";
});
cmd("ls", a => {
  const opt = a.filter(x => x.startsWith("-")).join(""), all = opt.includes("a"), long = opt.includes("l"), targets = a.filter(x => !x.startsWith("-"));
  if (all) award("dotfiles");
  const one = t => {
    const p = resolve(t);
    if (!canReach(p)) throw `cannot access '${t}': Permission denied`;
    if (!exists(p)) throw `cannot access '${t}': No such file or directory`;
    if (!isDir(p)) return long ? lsLong(p, t) : t;
    if (!canRead(p)) throw `cannot open directory '${t}': Permission denied`;
    let names = kids(p); if (!all) names = names.filter(n => !n.startsWith(".")); else names = [".", "..", ...names];
    if (long) return `total ${names.length * 4}\n` + names.map(n => lsLong(n === "." ? p : n === ".." ? norm(p + "/..") : p + "/" + n.replace(/\/$/, ""), n)).join("\n");
    return html(names.map(n => n.endsWith("/") || n === "." || n === ".." ? `<span class="dir">${esc(n.replace(/\/$/, ""))}</span>` : /x/.test((node(p + "/" + n).mode || "").slice(1, 4)) ? `<span class="exe">${esc(n)}</span>` : esc(n)).join("  "));
  };
  const ts = targets.length ? targets : ["."];
  if (ts.length === 1) return one(ts[0]);
  return html(ts.map(t => `${esc(t)}:\n${(r => typeof r === "object" ? r.html : esc(r))(one(t))}`).join("\n\n"));
});
function lsLong(p, label) {
  const n = node(p), d = isDir(p);
  const mode = n.mode || (d ? "drwxr-xr-x" : "-rw-r--r--"), owner = n.owner || (p.startsWith("/home/") ? p.split("/")[2] || "root" : p.startsWith("/proc/wisp") ? "wisp" : "root");
  const size = d ? 4096 : String(n.c ?? "").length;
  return `${mode} 1 ${owner.padEnd(10)} ${owner.padEnd(10)} ${String(size).padStart(6)} Nov 14 23:58 ${label.replace(/\/$/, "")}`;
}
const catLike = (a, stdin, name) => {
  const files = a.filter(x => !x.startsWith("-"));
  if (!files.length) { if (stdin != null) return stdin; throw "missing file operand"; }
  return files.map(f => readFile(resolve(f))).join("\n");
};
cmd("cat", (a, i) => {
  const r = catLike(a, i, "cat");
  if (a.some(f => resolve(f).startsWith("/var/log/raid.log")) && r.split("\n").length > 60) return r.split("\n").slice(0, 25).join("\n") + `\n... (${r.split("\n").length - 25} more lines. It's a long raid. Try grep, head, tail or less.)`;
  if (a.includes("-n")) return r.split("\n").map((l, k) => `${String(k + 1).padStart(6)}  ${l}`).join("\n");
  return r;
});
cmd(["less", "most"], (a, i) => catLike(a, i, "less"));
cmd("head", (a, i) => { const n = +((a.find(x => /^-n?\d+$/.test(x)) || "-10").replace(/\D/g, "")) || 10, f = a.filter(x => !/^-/.test(x) && !/^\d+$/.test(x)); return (f.length ? f.map(x => readFile(resolve(x))).join("\n") : i || "").split("\n").slice(0, n).join("\n"); });
cmd("tail", (a, i) => { const n = +((a.find(x => /^-n?\d+$/.test(x)) || "-10").replace(/\D/g, "")) || 10, f = a.filter(x => !/^-/.test(x) && !/^\d+$/.test(x)); const L = (f.length ? f.map(x => readFile(resolve(x))).join("\n") : i || "").split("\n"); return L.slice(-n).join("\n"); });
cmd(["grep", "egrep", "rg", "ag"], (a, i) => {
  award("grep");
  // context options: -A n, -B n, -C n (also -A3)
  let after = 0, before = 0; a = a.slice();
  for (let k = 0; k < a.length; k++) { const m = a[k].match(/^-([ABC])(\d*)$/); if (m) { const n = +(m[2] || a[k + 1] || 0); if (!m[2]) a.splice(k + 1, 1); a.splice(k, 1); k--; if (m[1] !== "B") after = n; if (m[1] !== "A") before = n; } }
  const opts = a.filter(x => /^-[a-zA-Z]+$/.test(x)).join(""), rest = a.filter(x => !/^-[a-zA-Z]+$/.test(x));
  const pat = rest.shift(); if (pat == null) throw "usage: grep [-invcr] pattern [file...]";
  let rx; try { rx = new RegExp(pat, opts.includes("i") ? "i" : ""); } catch { rx = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), opts.includes("i") ? "i" : ""); }
  const files = rest.length ? rest.flatMap(f => { const p = resolve(f); return isDir(p) && opts.includes("r") ? walk(p).filter(x => !isDir(x)) : [p]; }) : null;
  const sources = files ? files.map(p => { try { return [p, readFile(p)]; } catch (e) { return [p, null]; } }) : [[null, i || ""]];
  const hits = [];
  for (const [p, txt] of sources) {
    if (txt == null) continue;
    const L = txt.split("\n"), keep = new Set();
    L.forEach((l, k) => { if (rx.test(l) !== opts.includes("v")) for (let j = Math.max(0, k - before); j <= Math.min(L.length - 1, k + after); j++) keep.add(j); });
    let prev = -2;
    [...keep].sort((x, y) => x - y).forEach(k => { if ((before || after) && prev >= 0 && k > prev + 1) hits.push("--"); hits.push((files && files.length > 1 ? p + ":" : "") + (opts.includes("n") ? (k + 1) + ":" : "") + L[k]); prev = k; });
  }
  if (opts.includes("c")) return String(hits.length);
  if (!hits.length) { lastStatus = 1; return ""; }
  if (hits.some(h => /seal of the wisp/i.test(h))) award("grepseal");
  return html(hits.map(h => esc(h).replace(new RegExp(esc(pat).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), m => `<span class="hl">${m}</span>`)).join("\n"));
});
function walk(dir) { const out = []; for (const k of Object.keys(S.fs.map)) { const p = k.replace(/\/$/, ""); if (p.startsWith(dir === "/" ? "/" : dir + "/") && canReach(p) && canRead(p)) out.push(p); } return out.sort(); }
cmd("find", a => {
  const start = resolve(a[0] && !a[0].startsWith("-") ? a[0] : "."), ni = a.indexOf("-name"), pat = ni >= 0 ? a[ni + 1] : null;
  const rx = pat ? new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$") : null;
  const res = [start, ...walk(start)].filter(p => !rx || rx.test(p.split("/").pop()));
  return res.map(p => p.replace(S.cwd === "/" ? "" : S.cwd, ".")).join("\n");
});
cmd("tree", a => {
  const root = resolve(a.find(x => !x.startsWith("-")) || "."), all = a.includes("-a"); let nd = 0, nf = 0;
  if (isDir(root) && !canList(root) || !canReach(root)) return `${a.find(x => !x.startsWith("-")) || "."} [error opening dir]\n\n0 directories, 0 files`;
  const lines = [a.find(x => !x.startsWith("-")) || "."];
  const rec = (p, pre) => { if (!canReach(p) || !canRead(p)) return; const ks = kids(p).filter(n => all || !n.startsWith(".")); ks.forEach((n, k) => { const last = k === ks.length - 1, full = p.replace(/\/$/, "") + "/" + n.replace(/\/$/, ""); lines.push(pre + (last ? "└── " : "├── ") + n.replace(/\/$/, "")); if (n.endsWith("/")) { nd++; rec(full, pre + (last ? "    " : "│   ")); } else nf++; }); };
  rec(root, ""); lines.push(`\n${nd} directories, ${nf} files`); return lines.join("\n");
});
cmd("file", a => a.map(f => { const p = resolve(f); if (!canReach(p) || exists(p) && !isDir(p) && !canRead(p)) return `${f}: cannot open (Permission denied)`; if (!exists(p)) return `${f}: cannot open`; if (isDir(p)) return `${f}: directory`; const c = node(p).c || ""; return `${f}: ${f.endsWith(".gz") ? "gzip compressed data, was \"PATCHNOTES\"" : f.endsWith(".b64") ? "ASCII text (base64, probably)" : f.endsWith(".el") ? "Lisp/Scheme program, ASCII text" : f.endsWith(".org") ? "Org-mode document, the finest of formats" : /^#!/.test(c) ? "a whimsh script, ASCII text executable" : /^[0-9a-f ]+\n?$/.test(c) ? "ASCII text (looks like hex)" : p === "/dev/whimsy" ? "character special (pure whimsy)" : "ASCII text"}`; }).join("\n"));
cmd("wc", (a, i) => { const t = a.filter(x => !x.startsWith("-")).length ? a.filter(x => !x.startsWith("-")).map(f => readFile(resolve(f))).join("\n") : i || ""; const l = t ? t.split("\n").length : 0, w = t.split(/\s+/).filter(Boolean).length, c = t.length; return a.includes("-l") ? String(l) : a.includes("-w") ? String(w) : a.includes("-c") ? String(c) : `${String(l).padStart(7)} ${String(w).padStart(7)} ${String(c).padStart(7)}`; });
cmd("sort", (a, i) => { const t = a.filter(x => !x.startsWith("-")).length ? catLike(a, i) : i || ""; let L = t.split("\n").sort((x, y) => a.includes("-n") ? parseFloat(x) - parseFloat(y) : x.localeCompare(y)); if (a.includes("-r")) L.reverse(); if (a.includes("-u")) L = [...new Set(L)]; return L.join("\n"); });
cmd("uniq", (a, i) => { const L = (i || "").split("\n"), outL = []; let c = 0; L.forEach((l, k) => { c++; if (l !== L[k + 1]) { outL.push(a.includes("-c") ? `${String(c).padStart(7)} ${l}` : l); c = 0; } }); return outL.join("\n"); });
cmd("rev", (a, i) => (a.length ? catLike(a, i) : i || "").split("\n").map(l => [...l].reverse().join("")).join("\n"));
const rot13 = s => s.replace(/[a-z]/gi, c => { const b = c <= "Z" ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + 13) % 26 + b); });
cmd(["rot13", "caesar"], (a, i) => { const r = rot13(a.length ? catLike(a, i) : i || ""); if (/second seal/i.test(r)) award("unrot"); return r; });
function trSet(s) { let out = ""; for (let k = 0; k < s.length; k++) { if (s[k + 1] === "-" && s[k + 2]) { for (let c = s.charCodeAt(k); c <= s.charCodeAt(k + 2); c++) out += String.fromCharCode(c); k += 2; } else out += s[k]; } return out; }
cmd("tr", (a, i) => {
  const opts = a.filter(x => /^-[a-z]+$/.test(x)), [s1, s2] = a.filter(x => !/^-[a-z]+$/.test(x)), t = i || "";
  if (!s1) throw "missing operand";
  const A = trSet(s1), B = s2 != null ? trSet(s2) : "";
  if (opts.includes("-d")) return [...t].filter(c => !A.includes(c)).join("");
  const r = [...t].map(c => { const k = A.indexOf(c); return k < 0 ? c : B[Math.min(k, B.length - 1)] ?? c; }).join("");
  if (/second seal/i.test(r)) award("unrot");
  return r;
});
cmd("base64", (a, i) => {
  const d = a.includes("-d") || a.includes("--decode") || a.includes("-D"), f = a.filter(x => !x.startsWith("-")), t = f.length ? f.map(x => readFile(resolve(x))).join("\n") : i || "";
  if (!d) return btoa(unescape(encodeURIComponent(t))).replace(/(.{76})/g, "$1\n");
  try { const r = decodeURIComponent(escape(atob(t.replace(/\s+/g, "")))); award("b64"); return r; } catch { throw "invalid input"; }
});
cmd("xxd", (a, i) => {
  const f = a.filter(x => !x.startsWith("-")), t = f.length ? f.map(x => readFile(resolve(x))).join("\n") : i || "";
  if (a.includes("-r")) { const hexs = t.replace(/[^0-9a-f]/gi, ""); const r = hexs.match(/../g)?.map(h => String.fromCharCode(parseInt(h, 16))).join("") || ""; if (r.trim() === "starlight") award("hexread"); return r; }
  const bytes = [...new TextEncoder().encode(t)], rows = [];
  if (a.some(x => /^-(p|ps|plain|postscript)$/.test(x))) return (bytes.map(b => b.toString(16).padStart(2, "0")).join("").match(/.{1,60}/g) || [""]).join("\n");   // -p: plain hex, 30 bytes a line
  for (let k = 0; k < bytes.length; k += 16) { const ch = bytes.slice(k, k + 16); rows.push(`${k.toString(16).padStart(8, "0")}: ${ch.map(b => b.toString(16).padStart(2, "0")).join(" ").padEnd(48)} ${ch.map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : ".").join("")}`); }
  return rows.join("\n");
});
cmd("strings", (a, i) => catLike(a, i));
cmd(["zcat", "gunzip", "gzip"], a => {
  const p = resolve(a.filter(x => !x.startsWith("-"))[0] || "");
  if (!canReach(p)) throw `${a[0] || ""}: Permission denied`;
  if (!exists(p)) throw `${a[0] || ""}: No such file or directory`;
  if (p.endsWith("PATCHNOTES.gz")) { flag("patchnotes"); award("patchnotes"); X.secretTabs(); setTimeout(() => { location.hash = "patchnotes"; }, 900); return "Decompressing... it's not a file. It's a whole page. Opening it."; }
  throw "not in gzip format";
});
cmd(["touch", "mkdir", "rmdir", "mv", "cp", "ln", "nano", "pico", "edit", "notepad"], (a, _, n) => html(`<span class="err">read-only file system.</span> <span class="dim">(the wisp guards it. also, grumbolt would like a word about your editor.)</span>`));
cmd("rm", a => {
  const s = a.join(" ");
  if (/-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r|--no-preserve-root/.test(s)) {
    award("nicetry"); wisp.el.classList.add("dizzy"); setTimeout(() => wisp.el.classList.remove("dizzy"), 3000);
    wisp.talk("> AAAA. NO. we don't do that here.", 3000);
    document.body.classList.add("shake"); setTimeout(() => document.body.classList.remove("shake"), 600);
    if (flags.nicetry) { flag("ghost"); TWT.die && setTimeout(() => TWT.die("You deleted everything. Including yourself."), 900); return html(`<span class="err">You did it again. Everything goes dark.</span>`); }
    flag("nicetry"); return html(`<span class="err">Deleting everything... just kidding. Nice try.</span> <span class="dim">(Do it again and see what happens.)</span>`);
  }
  return html(`<span class="err">rm: read-only file system.</span>`);
});
cmd("chmod", a => {
  const f = a.filter(x => !/^[+-]|^\d+$/.test(x))[0], m = a.find(x => /^[+-]|^\d+$/.test(x));
  const p = resolve(f || ""); if (!canReach(p)) throw `cannot access '${f}': Permission denied`; if (!exists(p)) throw `cannot access '${f}': No such file or directory`;
  if (m && /x|7|5/.test(m)) { chmodded.add(p); award("chmod"); }
  return "";
});
cmd("chown", () => html(`<span class="err">chown: changing ownership: Operation not permitted</span> <span class="dim">(everything here belongs to the wisp anyway)</span>`));

// ----- who and what -----
cmd("whoami", () => S.user === "whimsy" ? X.store.get("name", "whimsy") : S.user);
cmd("id", () => S.user === "root" ? "uid=0(root) gid=0(root) groups=0(root),27(emacs-users)" : `uid=1000(whimsy) gid=1000(whimsy) groups=1000(whimsy),100(raiders),27(emacs-users),999(wisp-friends)`);
cmd("groups", () => "whimsy raiders emacs-users wisp-friends");
cmd("hostname", () => S.host);
cmd(["who", "w", "users", "/who"], () => `USER        TTY     IDLE   WHAT
grumbolt    pts/0   0:00   emacs --daemon
fizzlewick  pts/1   0:12   ./goblin-jumper-cables
saltshaker  pts/2   0:01   emacs -f org-agenda
sprinkles   pts/3   0:00   watch -n1 'is-it-raid-night'
leeroy      pts/4   9:59   (afk: chicken)
${(X.store.get("name", "whimsy")).padEnd(12)}pts/7   0:00   whimsh`);
cmd("last", () => "grumbolt  pts/0  wisp  Sun Nov 15 01:12   still logged in\nleeroy    pts/4  ???   Sat Nov 14 20:00 - 20:00  (00:00)  charged\nreboot    system boot  Tue Nov  4 15:00");
cmd("finger", a => { const u = (a[0] || "whimsy").replace(/@.*/, ""); const p = `/home/${u}/.plan`; if (!exists(`/home/${u}`)) return `finger: ${u}: no such user.`; award("finger"); let plan; try { plan = readFile(p); } catch { plan = "No Plan."; } return `Login: ${u.padEnd(20)} Name: ${u[0].toUpperCase() + u.slice(1)}\nDirectory: /home/${u}  Shell: ${u === "grumbolt" ? "/usr/bin/emacs" : "/bin/whimsh"}\nPlan:\n${plan}`; });
cmd("uname", a => a.includes("-a") ? "Linux forever 6.9.0-whimsy #1 SMP PREEMPT_DYNAMIC Tue Nov 4 15:00:00 PST 2026 x86_64 WhimsyOS GNU/Linux" : a.includes("-r") ? "6.9.0-whimsy" : "Linux");
cmd("uptime", () => { const d = Math.floor((Date.now() - new Date("2026-11-04T23:00:00Z")) / DAY); return ` ${new Date().toTimeString().slice(0, 8)} up ${d} days (since Forever launched),  6 users,  load average: 0.07, 0.07, 0.07 (it's always 0.07. the wisp likes 7s)`; });
cmd("date", a => a.includes("-u") ? new Date().toUTCString() : new Date().toString());
cmd("cal", a => {
  award("cal");
  const now = new Date(), y = +(a[1] || (a[0] && a[0].length === 4 ? a[0] : null) || now.getFullYear()), mo = a[0] && a[0].length <= 2 ? +a[0] - 1 : now.getMonth();
  const first = new Date(y, mo, 1), days = new Date(y, mo + 1, 0).getDate(), name = first.toLocaleString("en", { month: "long" });
  let s = `     ${name} ${y}\nSu Mo Tu We Th Fr Sa\n` + "   ".repeat(first.getDay());
  const cells = [];
  for (let d = 1; d <= days; d++) {
    const raid = y === 2026 && mo === 11 && d === 9, today = y === now.getFullYear() && mo === now.getMonth() && d === now.getDate();
    cells.push(raid ? `<span class="hl" title="RAID NIGHT">${String(d).padStart(2)}</span>` : today ? `<span class="inv">${String(d).padStart(2)}</span>` : String(d).padStart(2));
  }
  let col = first.getDay(), body = esc(s);
  cells.forEach(c => { body += c + (++col % 7 === 0 ? "\n" : " "); });
  if (y === 2026 && mo === 11) body += `\n\n<span class="hl">9</span> = raid night. Barrow Deeps, Hyjal Summit, Onyxia.`; else if (y === 2026 && mo === 10) body += `\n\ntry: cal 12 2026`;
  return html(body);
});
cmd("df", a => (a.includes("-h") ? `Filesystem      Size  Used Avail Use% Mounted on
/dev/wisp0      7.0G  4.2G  2.8G  60% /
/dev/motes      7     ${String(store.get("motes", []).length).padEnd(4)}  ${String(7 - store.get("motes", []).length).padEnd(4)}  ${String(Math.round(store.get("motes", []).length / 7 * 100)).padStart(3)}% /motes
tmpfs           1.0G  7.0K  1.0G   1% /tmp
/dev/vault      7 seals ${String(sealsFound().length).padEnd(4)}  -    sealed /vault
nethervoid      ∞     ∞     ∞      ?% /dev/null` : `Filesystem     1K-blocks    Used Available Use% Mounted on
/dev/wisp0       7340032 4404019   2936013  60% /
/dev/motes             7       ${store.get("motes", []).length}         ${7 - store.get("motes", []).length}   ?% /motes
/dev/vault             7       ${sealsFound().length}         -   ?% /vault`));
cmd("du", () => "4.2G\t/home/grumbolt/.emacs.d   (mostly packages)\n12K\t/home/whimsy\n7.0K\t/proc/wisp\n404\t/dev/null");
cmd("lsblk", () => `NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
wisp0       259:0    0     7G  0 disk
├─wisp0p1   259:1    0   512M  0 part /boot/hearthstone
└─wisp0p2   259:2    0   6.5G  0 part /
motes         7:0    1      7  1 rom  /motes
vault       253:7    0  7 seals 1 crypt (sealed)
murloc0       7:1    0  mrgl  0 loop /snap/murloc`);
cmd("free", a => `               total        used        free      shared  buff/cache   available
Mem:           7.0Gi       4.2Gi       1.1Gi       128Mi       1.7Gi       2.6Gi   (used by: nostalgia)
Swap:          2.0Gi         0B       2.0Gi
Wisp:          7 frags  ${7 - sealsFound().length} lost   ${sealsFound().length} found`);
cmd(["lscpu", "nproc"], (a, i, n) => "Architecture:   x86_64\nModel name:     Arcane Crystal @ 7 motes\nCPU(s):         7\nFlags:          fpu whimsy sse2 sparkle no_salvation\nBogoMIPS:       4242.42");
cmd("lspci", () => "00:00.0 Host bridge: Ley Line Interconnect\n00:02.0 VGA compatible controller: Arcane Crystal Graphics (rev 1.12)\n00:1f.3 Audio device: Murloc Audio Controller (mrglglgl)\n01:00.0 Ethernet controller: Gnomish Netweaver 9000 (may explode)");
cmd("lsusb", () => "Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub\nBus 001 Device 007: ID 7777:0001 Hearthstone Inc. Hearthstone (10 min cooldown)\nBus 001 Device 042: ID 0e1a:c5c5 Emacs Corp. Space Cadet Keyboard (vintage)");
cmd("sensors", () => "arcane-crystal-0\nAdapter: Ley line\ncore:     +42.0°C  (high = +70.0°C)\nmolten:   +1200.0°C (it's Molten Core, what did you expect)\nwisp:     +37.0°C  (cozy)");
cmd("mount", () => "/dev/wisp0 on / type whimsyfs (rw,whimsy)\n/dev/motes on /motes type sparklefs (ro)\n/dev/vault on /vault type crypt (sealed, 7 seals)\nproc on /proc type proc (rw)");
const PROCS = () => [
  [1, "root", "/sbin/init"], [7, "wisp", "wispd --sparkle"], [42, "grumbolt", "emacs --daemon"], [101, "root", "fetch_news (cron)"],
  [404, "root", "nether-gc"], [1337, "fizzlewick", "./goblin-jumper-cables"], [2026, "saltshaker", "emacs -f org-agenda"],
  ...(flags.goldbotDead ? [] : [[4242, "goldbot", "/usr/bin/goldbot --spam-trade-chat"]]), [9001, "leeroy", "charge --no-plan"]];
cmd(["ps", "pgrep"], a => "  PID USER       COMMAND\n" + PROCS().map(([p, u, c]) => `${String(p).padStart(5)} ${u.padEnd(10)} ${c}`).join("\n"));
cmd("top", () => {
  const L = PROCS().map(([p, u, c], k) => `${String(p).padStart(5)} ${u.padEnd(10)} ${String([0.1, 7, 21.3, 1.2, 0, 13.7, 4.4, 66.6, 99.9][k] ?? 1).padStart(5)} ${String([0.1, 0.7, 41, 1, 0, 2, 3, 9, 1][k] ?? 1).padStart(5)}  ${c}`);
  return `top - ${new Date().toTimeString().slice(0, 8)} up ${Math.floor((Date.now() - new Date("2026-11-04T23:00:00Z")) / DAY)} days,  6 users,  load average: 0.07, 0.07, 0.07
Tasks: ${PROCS().length} total,   1 running, ${PROCS().length - 2} sleeping,   1 charging
%Cpu(s):  7.0 us,  0.7 sy,  0.0 ni, 92.3 id   MiB Mem:  7168 total   (emacs is using most of it)

  PID USER        %CPU  %MEM  COMMAND
${L.join("\n")}

(press nothing; this is a snapshot. the wisp doesn't do ncurses.)`;
});
cmd(["kill", "pkill", "killall"], a => {
  const id = a.filter(x => !x.startsWith("-"))[0] || "";
  const pid = /^\d+$/.test(id) ? +id : (PROCS().find(([, , c]) => c.includes(id)) || [])[0];
  if (pid == null) throw `${id}: no such process`;
  if (pid === 4242) { if (flags.goldbotDead) throw "(4242) - No such process"; flag("goldbotDead"); award("banned"); setTimeout(() => wisp.talk("> the goldbot is gone. trade chat is 4% quieter. thank you.", 3500), 300); return "goldbot (4242) terminated. Trade chat is 4% quieter. A distant 'WTS gold cheap' fades away."; }
  if (pid === 7) { X.emit && X.emit("wisp", { type: "kill" }); wisp.el.classList.add("dizzy"); setTimeout(() => wisp.el.classList.remove("dizzy"), 2500); wisp.talk("> hey! i'm a daemon. of WHIMSY. you can't kill whimsy.", 3000); award("killwisp"); throw "(7) - Operation not permitted: wispd is immortal"; }
  if (pid === 9001) return "leeroy ignores all signals. He's already charging.";
  if (pid === 42) return "emacs --daemon cannot be killed, only paused for tea. (Grumbolt has been notified.)";
  if (pid === 1) throw "(1) - init refuses. It's turtles all the way down.";
  return `(${pid}) terminated. It respawns in 2 hours. (Hotfix of Nov 13, probably.)`;
});
cmd("systemctl", a => {
  const u = a.find(x => !["status", "start", "stop", "restart", "list-units", "enable", "disable"].includes(x)) || "";
  if (a[0] === "list-units" || !a.length) return "UNIT                 LOAD   ACTIVE SUB     DESCRIPTION\nwispd.service        loaded active running The whimsy daemon\nemacs.service        loaded active running GNU Emacs (Grumbolt's)\nfetch-news.timer     loaded active waiting The Wire, every 3 hours\nraid-night.timer     loaded active waiting Fires 2026-12-09\ngoldbot.service      loaded failed failed  please no";
  if (/wisp/.test(u)) { if (a[0] === "stop") throw "Failed to stop wispd.service: Access denied. (it's immortal)"; if (a[0] === "restart") { wisp.el.classList.add("sleep"); setTimeout(() => { wisp.el.classList.remove("sleep"); wisp.talk("> i'm back! did you miss me?", 2500); }, 1500); return "Restarting wispd.service..."; } return `● wispd.service - The whimsy daemon
     Loaded: loaded (/etc/systemd/system/wispd.service; enabled)
     Active: active (glowing) since Tue 2026-11-04 15:00:00 PST
   Main PID: 7 (wispd)
     Memory: ${sealsFound().length} of 7 fragments recovered
     Status: "${sealsFound().length === 7 ? "whole again. thank you." : "looking for seven seals. see ~/notes.org"}"`; }
  if (/emacs/.test(u)) return "● emacs.service - GNU Emacs\n     Active: active (running) since the dawn of time\n     Memory: 4.2G (packages)";
  return `Unit ${u}.service could not be found.`;
});
cmd("journalctl", a => readFile("/var/log/wisp.log"));
cmd("dmesg", () => `[    0.000000] Linux version 6.9.0-whimsy (grumbolt@forever)
[    0.000007] Command line: BOOT_IMAGE=/boot/hearthstone root=/dev/wisp0 quiet sparkle
[    0.042000] ley0: link up, 1000 Mbps (arcane)
[    0.133700] murloc0: mrglglgl
[    1.120000] salvation: module not found, continuing without it
[    1.121000] threat: tanks buffed to compensate
[    2.000000] wispd[7]: memory sealed (7 seals). see /var/log/wisp.log
[    9.990000] leeroy[9001]: segfault at 0 ip charge sp no_plan`);
cmd("neofetch", () => {
  award("neofetch");
  const m = store.get("motes", []).length, s = sealsFound().length;
  const art = [
    `<span class="g">        ▄▄▄▄▄▄▄▄▄▄▄▄▄        </span>`,
    `<span class="g">    ▄▄██▀▀▀▀▀▀▀▀▀▀▀▀▀██▄▄    </span>`,
    `<span class="g">   ██                   ██   </span>`,
    `<span class="g">   ██ </span><span class="t">  ▀▄▄              </span><span class="g">██   </span>`,
    `<span class="g">   ██ </span><span class="t">     ▀▀▄▄          </span><span class="g">██   </span>`,
    `<span class="g">   ██ </span><span class="t">     ▄▄▀▀          </span><span class="g">██   </span>`,
    `<span class="g">   ██ </span><span class="t">  ▄▀▀    ▄▄▄▄▄▄   </span><span class="g">██   </span>`,
    `<span class="g">    ██                 ██    </span>`,
    `<span class="g">     ▀██▄           ▄██▀     </span>`,
    `<span class="g">        ▀▀██▄▄▄▄▄██▀▀        </span>`,
    `<span class="g">             ▀▀▀             </span>`];
  const info = [
    `<span class="t">${esc(X.store.get("name", "whimsy"))}</span>@<span class="t">forever</span>`, `--------------------`,
    `<b>OS</b>: WhimsyOS 1.60.1 (Forever) x86_64`, `<b>Host</b>: Azeroth (Eastern Kingdoms)`, `<b>Kernel</b>: 6.9.0-whimsy`,
    `<b>Uptime</b>: ${Math.floor((Date.now() - new Date("2026-11-04T23:00:00Z")) / DAY)} days since launch`, `<b>Packages</b>: 98 changes, ${X.hot.length} hotfixes`,
    `<b>Shell</b>: whimsh 7.0`, `<b>Editor</b>: emacs (obviously)`, `<b>Raid</b>: ${Math.max(0, Math.ceil((new Date("2026-12-09T08:00:00Z") - Date.now()) / DAY))} days to Barrow Deeps`,
    `<b>Title</b>: ${esc(X.title())}`, `<b>Motes</b>: ${m}/7   <b>Seals</b>: ${s}/7`,
    `<span class="sw">███</span><span class="sw2">███</span><span class="sw3">███</span><span class="sw4">███</span><span class="sw5">███</span>`];
  return html(art.map((l, k) => l + "  " + (info[k] || "")).join("\n") + (info.length > art.length ? "\n" + " ".repeat(31) + info.slice(art.length).join("\n" + " ".repeat(31)) : ""));
});
cmd(["reboot", "/reload", "/rl"], () => { award("reboot"); const L = ["Stopping wispd... refused.", "Stopping emacs --daemon... refused.", "Rebooting anyway.", "", "[  OK  ] Started Hearthstone bootloader.", "[  OK  ] Mounted /motes.", "[  OK  ] Started wispd (it never stopped).", "[ WARN ] salvation.service not found", "[  OK  ] Reached target Whimsy.", "", "Reloading the page..."]; stream(L, 140, () => setTimeout(() => location.reload(), 500)); return ""; });
cmd(["shutdown", "poweroff", "halt", "init"], () => { wisp.talk("> no. i like it here.", 2500); return "shutdown: the wisp refuses."; });
cmd("crontab", () => readFile("/etc/crontab"));

// ----- network -----
cmd(["ifconfig", "ip"], a => {
  if (a[0] === "route" || a[0] === "r") return "default via 10.0.7.1 dev ley0 proto whimsy\n10.0.7.0/24 dev ley0 scope link (the raid instances)\n127.0.0.0/8 dev lo (the wisp)";
  award("ifconfig");
  return `lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0   (the wisp lives here)
ley0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST,ARCANE>  mtu 1500
        inet 10.0.7.7  netmask 255.255.255.0  broadcast 10.0.7.255
        ether 77:77:77:wi:sp:00  txqueuelen 1000  (Ley line)
        RX packets 4242  bytes 1337 (sparkles)
        TX packets 7     bytes 7 (whispers)
murloc0: flags=4099<UP,MRGL>  mtu mrgl
        inet6 fe80::mrgl:mrgl  (mrglglgl)`;
});
cmd("ipconfig", () => { award("ifconfig"); return `This isn't Windows. But since you asked so nicely:

Windows IP Configuration

Ethernet adapter Ley Line:
   Connection-specific DNS Suffix  . : forever
   IPv4 Address. . . . . . . . . . . : 10.0.7.7
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 10.0.7.1 (Stormwind Gate)

Murloc adapter mrgl0:
   Media State . . . . . . . . . . . : Mrglglgl`; });
const HOSTS = { "barrow.deeps": "10.0.7.10", "hyjal.summit": "10.0.7.20", "onyxia.lair": "10.0.7.40", "darkmoon.faire": "10.0.7.99", localhost: "127.0.0.1", forever: "127.0.0.1", wisp: "127.0.0.1", "goldbot.trade-chat": "192.0.2.7", "news.blizzard.com": "151.101.7.7", "github.com": "140.82.112.3" };
const hostOf = h => (h || "").replace(/^.*@/, "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
cmd("ping", a => {
  const h = hostOf(a.find(x => !x.startsWith("-") && !/^\d+$/.test(x))); if (!h) throw "usage: ping host";
  const ip = HOSTS[h]; if (!ip) throw `${h}: Name or service not known`;
  award("ping");
  const n = +(a[a.indexOf("-c") + 1]) || 4, base = h.includes("hyjal") ? 0 : h.includes("onyxia") ? 666 : h.includes("barrow") ? 33 : h === "localhost" || h === "wisp" ? 0.07 : 42;
  if (h.includes("hyjal")) { stream([`PING ${h} (${ip}) 56(84) bytes of data.`, "Request timeout (Hyjal Summit opens 9 Dec)", "Request timeout", `--- ${h} ping statistics ---`, "4 packets transmitted, 0 received, 100% packet loss (raid not open)"], 300); return ""; }
  const L = [`PING ${h} (${ip}) 56(84) bytes of data.`];
  for (let k = 0; k < n; k++) L.push(`64 bytes from ${ip}: icmp_seq=${k + 1} ttl=64 time=${(base + Math.random() * base * 0.2).toFixed(2)} ms${h.includes("onyxia") && k === 1 ? " (MANY WHELPS)" : ""}`);
  L.push(`--- ${h} ping statistics ---`, `${n} packets transmitted, ${n} received, 0% packet loss`);
  stream(L, 260); return "";
});
cmd(["traceroute", "tracepath", "mtr"], a => {
  const h = hostOf(a.find(x => !x.startsWith("-"))) || "hyjal.summit";
  award("traceroute");
  stream([`traceroute to ${h} (${HOSTS[h] || "10.0.7.77"}), 30 hops max`, " 1  forever (127.0.0.1)  0.07 ms", " 2  goldshire-inn.elwynn (10.0.1.1)  3.1 ms   (the bard is singing)", " 3  stormwind-gate.elwynn (10.0.1.2)  7.4 ms", " 4  deeprun-tram.stormwind (10.0.2.1)  95.3 ms   (the tram is slow)", " 5  great-forge.ironforge (10.0.3.1)  101.2 ms", " 6  thandol-span.wetlands (10.0.4.1)  * * *   (the bridge is out)", " 7  menethil-harbor.wetlands (10.0.4.2)  140.0 ms", " 8  boat-to-theramore (10.0.5.1)  240000.0 ms  (waited for the boat)", ` 9  ${h} (${HOSTS[h] || "10.0.7.77"})  242.4 ms`], 220);
  return "";
});
cmd(["nslookup", "dig", "host"], a => { const h = hostOf(a.find(x => !x.startsWith("-") && !x.startsWith("+"))); const ip = HOSTS[h]; if (!ip) return `** server can't find ${h}: NXDOMAIN`; return `Server:   127.0.0.53 (the wisp)\nName:     ${h}\nAddress:  ${ip}`; });
cmd("whois", a => { const h = hostOf(a[0]); return h.includes("onyxia") ? "Registrant: Onyxia (Black Dragonflight)\nOrganization: Wyrmrest Holdings (definitely not a front)\nAbuse contact: many.whelps@onyxia.lair" : h.includes("goldbot") ? "Registrant: REDACTED\nCountry: the trade district\nStatus: clientHold (please kill -9 4242)" : `Registrant: Terminal Whimsy (${h || "forever"})\nAdmin: the wisp`; });
cmd(["netstat", "ss"], () => "Proto Local Address        State    Program\ntcp   0.0.0.0:22           LISTEN   sshd\ntcp   0.0.0.0:80           LISTEN   the website\ntcp   0.0.0.0:3724         LISTEN   wow (Forever)\ntcp   127.0.0.1:7777       LISTEN   wispd\ntcp   10.0.7.7:4242        TIME_WAIT goldbot (spamming)");
cmd("nmap", a => { const h = hostOf(a.find(x => !x.startsWith("-"))) || "localhost"; award("nmap"); return h.includes("barrow") ? `Nmap scan report for ${h} (10.0.7.10)\nPORT   STATE SERVICE\n22/tcp open  ssh   (someone has been here. G.?)\n\nNmap done: 1 IP address (1 host up)` : `Nmap scan report for ${h}\nPORT     STATE SERVICE\n22/tcp   open  ssh\n80/tcp   open  http\n3724/tcp open  blizzard\n7777/tcp open  wispd`; });
const CURL = {
  wire: () => { const s = X.newsTop ? X.newsTop(5) : []; return s.length ? s.map(x => `* ${x.title}  (${x.source})`).join("\n") : "The Wire hasn't loaded yet."; },
  "news.blizzard.com": () => { const s = X.newsTop ? X.newsTop(20).filter(x => x.label === "official") : []; return s.length ? `<!-- latest from Blizzard -->\n${s[0].title}\n${s[0].url}` : "<html>(Blizzard's site is very JavaScript-y. Try `wire`.)</html>"; },
  "wttr.in": () => `Weather report: Azeroth\n\n   \\   /     Elwynn Forest: Sunny, 21°C\n    .-.      Hyjal: Fel storm, 13°C (raid opens 9 Dec)\n ― (   ) ―   Dun Morogh: Snow, -7°C\n    \`-'      Booty Bay: Sharks, 30°C\n   /   \\     Molten Core: 1200°C, feels like 1200°C`,
  localhost: () => "<h1>It works!</h1>\n(this is the guild site. you're already on it.)",
  "parrot.live": () => "The parrot is on a raid lockout. Try again on 9 December.",
  "ifconfig.me": () => "10.0.7.7",
  "cheat.sh": () => "cheat.sh says: the cheat code is up up down down left right left right b a. Type it on the page.",
  "robots.txt": () => "User-agent: *\nDisallow: /vault\nDisallow: /root\n# Hello, curious human. The vault isn't a URL. It's seven words.",
};
cmd(["curl", "wget", "http", "lynx", "w3m"], a => {
  const u = a.find(x => !x.startsWith("-")); if (!u) throw "try 'curl wttr.in' or 'curl wire'";
  const h = hostOf(u), key = Object.keys(CURL).find(k => h === k || h.endsWith(k) || u.endsWith(k));
  award("curl");
  if (u.includes("418") || h.includes("coffee") || h.includes("teapot")) return "HTTP/1.1 418 I'm a teapot\nThe wisp cannot brew coffee. It is, however, short and stout.";
  if (key) return CURL[key]();
  return `curl: (6) Could not resolve host: ${h}\n(the wisp keeps this box offline. try: curl wire, curl wttr.in, curl news.blizzard.com)`;
});
cmd(["telnet", "nc", "netcat"], a => { const h = hostOf(a[0]); if (h.includes("towel")) return "A long time ago in a galaxy far, far away... wrong franchise. Try 'adventure'."; return `Trying ${HOSTS[h] || h}...\nConnected to ${h || "nothing"}.\nEscape character is '^]'.\nMrglglgl?\nConnection closed by foreign murloc.`; });
cmd("wisp", a => {
  const v = (a[0] || "").toLowerCase();
  if (X.mind && /^(stay|sit|still|corner|off)$/.test(v)) { X.mind.setRoam(false); return "The wisp will stay where it is. It still talks and naps. (wisp roam lets it fly about again.)"; }
  if (X.mind && /^(roam|go|free|wander|on)$/.test(v)) { X.mind.setRoam(true); return "The wisp is free to fly about again."; }
  if (X.mind && /^(status|mood|how)$/.test(v)) return readFile("/proc/wisp/status");
  if (!wisp.call()) throw "can't reach the wisp. It's at the bottom of the faire pond. (Fish it out: the next catch is the wisp.)";
  return "You call the wisp. It comes back to its corner.";
}, { hidden: true });
cmd(["ftp", "sftp", "scp", "rsync"], () => "No. We don't move files here. We admire them.");

// ssh: the way to seal V
cmd("ssh", a => {
  const target = a.find(x => !x.startsWith("-")); if (!target) throw "usage: ssh [user@]host";
  const h = hostOf(target), user = target.includes("@") ? target.split("@")[0] : S.user;
  if (!HOSTS[h]) throw `Could not resolve hostname ${h}: Name or service not known`;
  if (h === "hyjal.summit") throw "connect to host hyjal.summit port 22: Connection timed out (opens 9 Dec)";
  if (h === "onyxia.lair") throw "connect to host onyxia.lair port 22: Connection refused (she's on a weekly lockout now)";
  if (h === "goldbot.trade-chat") throw "Connection reset by peer. (it was trying to sell you gold)";
  if (h === "darkmoon.faire") return flags.ticket ? (CMDS.faire.f([])) : "Permission denied (ticket required).";
  if (["localhost", "forever", "wisp"].includes(h)) return "You're already here. The wisp waves.";
  if (h === "news.blizzard.com" || h === "github.com") throw `${h}: Permission denied (publickey). Nice try.`;
  print(`The authenticity of host '${h} (${HOSTS[h]})' can't be established.\nED25519 key fingerprint is SHA256:w1sp/7777/sparkle.\nWarning: Permanently added '${h}' to the list of known hosts.`, "dim");
  ask(`${user === "whimsy" ? "grumbolt" : user}@${h}'s password: `, true, async pw => {
    if (pwNorm(pw) === "hunter2") print("hunter2? All I see is *******.", "dim");
    if (await sha(pwNorm(pw)) !== TD.ssh) { print("Permission denied, please try again.", "err"); return; }
    award("ssh");
    sessions.push({ ...S }); Object.assign(S, { host: "barrow-deeps", user: "grumbolt", home: "/", cwd: "/", fs: BARROW, env: {} });
    print(html(`<span class="dim">Welcome to the Barrow Deeps (WhimsyOS, ring 7)\nLast login: never, legitimately.</span>\n` + esc(readFile("/welcome.txt"))));
    refresh(); setTimeout(() => wisp.talk("> ooh, the barrow deeps. it's cold down here.", 3000), 300);
  });
  return "";
});
function exitShell() {
  if (sessions.length) { const prev = sessions.pop(); Object.assign(S, prev); print(`Connection to remote host closed.`, "dim"); refresh(); return; }
  closeCon();
}
cmd(["exit", "logout"], () => { exitShell(); return ""; });
cmd("answer", a => {
  if (S.host !== "barrow-deeps") return "Nobody asked you a question. (Yet.)";
  const w = a.join(" ").toLowerCase().replace(/[^a-z ]/g, "").trim().replace(/s$/, "");
  return sha(w).then(h => {
    if (h === TD.seals[4]) { award("door"); setTimeout(() => wisp.talk("> the door opened!", 2500), 300); return html(`The door grinds open, slowly, like a raid leader getting out of bed.\nCarved on the inside, in letters as tall as a tauren:\n\n                        <span class="hl">${esc(w.toUpperCase())}</span>\n\nThe fifth seal.`); }
    return "The door does not budge. Somewhere in the dark, a dwarf ghost snickers.";
  });
});

// su / sudo / passwd
const SU_USERS = ["root", "grumbolt", "fizzlewick", "saltshaker", "sprinkles", "leeroy", "wisp", "whimsy"];
let suFails = 0;
function suFail(who) {
  suFails++;
  print("su: Authentication failure", "err");
  LOG("sufail", { who, n: suFails });
  if (suFails === 1) { wisp.talk("> nope. grumbolt would never use a password that obvious. probably.", 2500); return; }
  // one nudge, once: impossible accounts say so, and root's points (vaguely) at the seals
  if (suFails === 2 && who !== "leeroy") print(who === "root" ? "(Root's password can't be guessed. It's kept somewhere sealed.)" : `(${who[0].toUpperCase() + who.slice(1)}'s password can't be found here.)`, "dim");
}
function charge() {
  award("leeroysu");
  print("Password accepted. Starting leeroy's login shell, /bin/charge...", "dim");
  setTimeout(() => { print(html(`leeroy@forever:~$ <span class="hl">LEEEEEEROOOOOOY JEEEEENKINS!</span>`)); X.leeroy && X.leeroy(); }, 500);
  setTimeout(() => { print("/bin/charge: ran into a room full of whelps without a plan. Exit status 1 (wipe).", "err"); print("You're whimsy again. At least you have chicken.", "dim"); }, 1800);
}
cmd("su", a => {
  const who = (a.filter(x => !/^-/.test(x))[0] || "root").toLowerCase();
  if (!SU_USERS.includes(who)) {
    const near = SU_USERS.find(u => lev(u, who) <= 2);
    return html(`<span class="err">su: user ${esc(who)} does not exist or the user entry does not contain all the required fields</span>${near ? `\n<span class="dim">Did you mean ${near}?</span>` : ""}`);
  }
  if (who === "root" && S.user === "root") return "You're already root. Power has gone to your head.";
  if (who === S.user) return `You're already ${who}. (You contain multitudes.)`;
  if (who === "wisp") { setTimeout(() => wisp.talk("> i don't log in. i simply am.", 2500), 200); return "This account is currently not available."; }
  if (S.user === "root") { if (who === "leeroy") { charge(); return ""; } return who === "whimsy" ? "Type exit to go back to being whimsy." : `Root has no need to be ${who}. (Root has every need to be root.)`; }
  ask("Password: ", true, async pw => {
    if (who === "leeroy") return pwNorm(pw) === "chicken" ? charge() : suFail(who);
    if (who !== "root" || await sha(pwNorm(pw)) !== TD.root) return suFail(who);
    sessions.push({ ...S }); Object.assign(S, { user: "root", home: "/root", cwd: "/root" });
    award("root"); print("You are root. Everything glows slightly more ominously.", "hl"); refresh();
  });
  return "";
});
cmd("sudo", (a, i) => {
  const rest = a.join(" ").toLowerCase();
  if (rest === "whimsy") { X.party && X.party(); return "Permission granted. ✦"; }
  if (rest === "make me a sandwich") { award("sandwich"); return "Okay."; }
  if (/^rm\b/.test(rest)) return CMDS.rm.f(a.slice(1));
  if (S.user !== "root" && (/^(apt|apt-get|dnf|yum|pacman)$/.test(a[0] || "") && a.slice(1).some(x => pkgOf(x) || /\.deb$/.test(x)) || a[0] === "dpkg")) { print("(no sudo needed here. the wisp runs this repo, and it trusts you.)", "dim"); return run1(a[0], a.slice(1), i); }
  if (S.user === "root") return run1(a[0], a.slice(1), i);
  ask(`[sudo] password for ${S.user}: `, true, () => { print(`${S.user} is not in the sudoers file. This incident will be reported.`, "err"); award("reported"); setTimeout(() => wisp.talk("> reported. to me. i'm the authorities. i'm disappointed but not surprised.", 3500), 300); });
  return "";
});
cmd("passwd", () => "Password changes are handled by Grumbolt. In person. With a lecture about Emacs.");
cmd("credits", () => {
  if (S.user !== "root") throw "permission denied (root only. the credits are on the root of everything)";
  flag("credits"); award("credits"); X.secretTabs(); setTimeout(() => { location.hash = "credits"; }, 600); return "Rolling credits...";
});

// ----- packages and programming jokes -----
/* ---------------- packages: the few things the wisp lets you install ---------------- */
const PKGS = {
  "clipboard-whimsy": { v: "7.7", kb: 42, desc: "pbcopy, pbpaste, xclip, xsel and wl-clipboard, for the whimsy box", cmds: ["pbpaste", "pbcopy", "xclip", "xsel", "wl-copy", "wl-paste"], names: ["pbpaste", "pbcopy", "xclip", "xsel", "wl-clipboard", "wl-copy", "wl-paste", "clipboard", "clipboard-whimsy"] },
  "espeak-whimsy": { v: "1.52", kb: 128, desc: "a speech synthesizer. The terminal talks out loud.", cmds: ["espeak", "espeak-ng", "say", "spd-say"], names: ["espeak", "espeak-ng", "say", "spd-say", "festival", "speech-dispatcher", "espeak-whimsy"] },
  "murloc-tools": { v: "1.0-mrgl", kb: 36, desc: "mrgl: translates anything into Murloc. Everything depends on it.", cmds: ["mrgl"], names: ["murloc-tools", "mrgl", "murloc"] },
};
const pkgOf = n => Object.keys(PKGS).find(p => PKGS[p].names.includes(String(n).toLowerCase()));
const installed = () => store.get("pkgs", []);
const isInstalled = p => installed().includes(p);
function aptInstall(names, yes) {
  const want = [], notes = [], unknown = names.filter(n => !pkgOf(n));
  if (unknown.length) return `Reading package lists... Done\nBuilding dependency tree... Done\nE: Unable to locate package ${unknown[0]}`;
  for (const n of names) { const p = pkgOf(n); if (p !== n.toLowerCase()) notes.push(`Note, selecting '${p}' instead of '${n}'`); if (!want.includes(p)) want.push(p); }
  if (!want.includes("murloc-tools")) want.push("murloc-tools");          // a dependency of everything, as promised
  const fresh = want.filter(p => !isInstalled(p)), head = `Reading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done${notes.length ? "\n" + notes.join("\n") : ""}`;
  if (!fresh.length) return `${head}\n${want.map(p => `${p} is already the newest version (${PKGS[p].v}).`).join("\n")}\n0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.`;
  const kb = fresh.reduce((s, p) => s + PKGS[p].kb, 0);
  print(`${head}\nThe following NEW packages will be installed:\n  ${fresh.join(" ")}\n0 upgraded, ${fresh.length} newly installed, 0 to remove and 0 not upgraded.\nNeed to get ${kb}.0 kB of archives.\nAfter this operation, ${kb * 7} kB of additional disk space will be used.`);
  const go = () => {
    const L = fresh.map((p, k) => `Get:${k + 1} https://deb.whimsy.forever stable/main ${p} all ${PKGS[p].v} [${PKGS[p].kb}.0 kB]`);
    L.push(`Fetched ${kb}.0 kB in 0s (7,777 kB/s)`);
    for (const p of fresh) L.push(`Selecting previously unselected package ${p}.`, "(Reading database ... 1337 files and directories currently installed.)", `Preparing to unpack .../${p}_${PKGS[p].v}_all.deb ...`, `Unpacking ${p} (${PKGS[p].v}) ...`);
    for (const p of fresh) L.push(`Setting up ${p} (${PKGS[p].v}) ...`);
    L.push("Processing triggers for wispd (7.7.7) ...");
    stream(L, 90, () => {
      store.set("pkgs", [...new Set([...installed(), ...fresh])]); award("aptinstall");
      print(html(`<span class="dim">New commands: ${fresh.flatMap(p => PKGS[p].cmds).join(", ")}</span>`));
      wisp.talk("> the wisp said yes. this once.", 2500);
    });
  };
  if (yes) { go(); return ""; }
  ask("Do you want to continue? [Y/n] ", false, ans => { if (/^\s*n/i.test(ans)) { print("Abort."); return; } go(); });
  return "";
}
function pkgCmd(mgr, a) {
  const sub = a.join(" ");
  if (/moo/.test(sub)) { award("moo"); return `                 (__)
                 (oo)
           /------\\/
          / |    ||
         *  /\\---/\\
            ~~   ~~
...."Have you mooed today?"... (it's a tauren, actually)`; }
  const words = a.filter(x => !x.startsWith("-")), dashS = a.some(x => /^-S/.test(x)), verb = dashS ? "install" : (words[0] || "").toLowerCase(), names = dashS ? words : words.slice(1);
  const yes = mgr !== "apt" || a.some(x => /^(-y|--yes|--assume-yes)$/.test(x));
  if (["install", "add", "reinstall", "get", "i"].includes(verb)) {
    const deb = names.find(n => /\.deb$/i.test(n));
    if (deb && mgr === "apt") return installDeb(deb);
    if (names.some(n => /toybox/i.test(n)) && !names.some(n => pkgOf(n))) return `Reading package lists... Done\nBuilding dependency tree... Done\nE: Unable to locate package ${names.find(n => /toybox/i.test(n))}\n(It isn't in the wisp's repo. Whoever built it should still have the .deb file.)`;
    if (names.length && names.some(n => pkgOf(n))) { if (mgr !== "apt") print(`(${mgr} isn't on this box. It's a Debian kind of place. Using apt.)`, "dim"); return aptInstall(names, yes); }
    if (/(^|\s)whimsy(\s|$)/.test(sub)) return "whimsy is already the newest version (∞).\n0 upgraded, 0 newly installed, 0 to remove, 1 wisp delighted.";
    if (/emacs/.test(sub)) return "emacs is already installed. Grumbolt made sure. Twice.";
    if (/vim/.test(sub)) return "E: Unable to locate package vim\n(Grumbolt has blocked it at the firewall.)";
    return `Reading package lists... Done\nBuilding dependency tree... Done\nThe following packages will be installed:\n  ${names.join(" ") || "nothing"} murloc-tools\nDo you want to continue? [Y/n] the wisp said no.\n(The wisp's repo only carries a few packages. apt search shows what's there.)`;
  }
  if (mgr === "apt") {
    if (verb === "update") return "Hit:1 https://deb.whimsy.forever stable InRelease\nHit:2 https://deb.whimsy.forever murloc InRelease\nReading package lists... Done\nAll packages are up to date. (Except the wisp's memories. Those are sealed.)";
    if (verb === "search") {
      const q = names.join(" ").toLowerCase(), hits = Object.entries(PKGS).filter(([p, d]) => !q || p.includes(q) || d.names.some(n => n.includes(q)) || d.desc.toLowerCase().includes(q));
      return "Sorting... Done\nFull Text Search... Done\n" + hits.map(([p, d]) => `${p}/stable ${d.v} all${isInstalled(p) ? " [installed]" : ""}\n  ${d.desc}`).join("\n\n");
    }
    if (verb === "list") {
      const mine = installed().map(p => `${p}/stable,now ${PKGS[p].v} all [installed]`);
      if (a.includes("--installed")) return ["Listing... Done", "emacs/stable,now 29.4 all [installed]", "whimsy/stable,now ∞ all [installed]", "wispd/stable,now 7.7.7 all [installed]", ...mine].join("\n");
      return "Listing... Done\n" + Object.entries(PKGS).map(([p, d]) => `${p}/stable ${d.v} all${isInstalled(p) ? " [installed]" : ""}`).join("\n");
    }
    if (["remove", "purge", "uninstall"].includes(verb)) {
      if (!names.length) return "E: No packages found";
      if (names.some(n => /emacs/.test(n))) return "E: emacs is held by Grumbolt. Removing it would void the warranty, and the friendship.";
      if (names.some(n => /^(wispd?|whimsy)$/.test(n))) return "E: whimsy is an essential package. You can't remove whimsy. Believe us, we've tried.";
      const ps = [...new Set(names.map(pkgOf).filter(Boolean))];
      if (ps.includes("murloc-tools")) return "E: murloc-tools is essential. Everything depends on it. (Mrgl.)";
      const have = ps.filter(isInstalled);
      if (!have.length) return `Package '${names[0]}' is not installed, so not removed`;
      store.set("pkgs", installed().filter(p => !have.includes(p)));
      return `Reading package lists... Done\nThe following packages will be REMOVED:\n  ${have.join(" ")}\n${have.map(p => `Removing ${p} (${PKGS[p].v}) ...`).join("\n")}\nProcessing triggers for wispd (7.7.7) ...`;
    }
  }
  if (/(^|\s)whimsy(\s|$)/.test(sub)) return "whimsy is already the newest version (∞).\n0 upgraded, 0 newly installed, 0 to remove, 1 wisp delighted.";
  if (/emacs/.test(sub)) return "emacs is already installed. Grumbolt made sure. Twice.";
  return "Usage: apt install <whimsy>";
}
/* ---- the wisp's toybox: Fizzlewick built it as a .deb and left it in his home ---- */
const DEB = "/home/fizzlewick/wisp-toybox_1.0_all.deb";
const toyState = () => store.get("toy", null);
const toyIn = () => !!(toyState() && toyState().unlocked);
function installDeb(f) {
  const p = resolve(f);
  if (!canReach(p) || !exists(p)) return html(`<span class="err">dpkg: error: cannot access archive '${esc(f)}': No such file or directory</span>${/wisp-toybox/i.test(f) ? ` <span class="dim">(it isn't in this folder. try where you found it.)</span>` : ""}`);
  if (isDir(p)) return html(`<span class="err">dpkg-deb: error: '${esc(f)}' is a directory</span>`);
  if (p !== DEB) return html(`<span class="err">dpkg-deb: error: '${esc(f)}' is not a Debian format archive</span>`);
  if (toyIn()) return "wisp-toybox (1.0) is already installed. (toybox shows how it's going.)";
  stream(["Selecting previously unselected package wisp-toybox.", "(Reading database ... 1337 files and directories currently installed.)", "Preparing to unpack .../wisp-toybox_1.0_all.deb ...", "Unpacking wisp-toybox (1.0) ...",
    "Setting up wisp-toybox (1.0) ...", "Processing triggers for wispd (7.7.7) ...", "wispd[7]: new toys detected. checking them for bombs. found one. keeping it."], 260, () => {
    if (X.mind) X.mind.unlockToybox();
    award("toybox"); flag("toybox");
    print(html(`<span class="hl">A toy bar has appeared at the bottom of the page.</span> <span class="dim">(toybox off puts it away. The footer has a switch too.)</span>`));
  });
  return "";
}
cmd("dpkg", a => {
  const op = (a[0] || "").toLowerCase(), rest = a.slice(1).filter(x => !x.startsWith("-"));
  if (op === "-i" || op === "--install") return rest[0] ? installDeb(rest[0]) : "dpkg: error: --install needs at least one package archive file argument";
  if (op === "-l" || op === "--list") return ["Desired=Install/Remove  Status=Inst  Name           Version   Description", "ii  emacs          29.4      the editor (Grumbolt's)", "ii  whimsy         ∞         essential", "ii  wispd          7.7.7     the whimsy daemon", ...installed().map(q => `ii  ${q.padEnd(15)}${PKGS[q].v.padEnd(10)}${PKGS[q].desc.slice(0, 40)}`), ...(toyIn() ? ["ii  wisp-toybox    1.0       toys for the wisp (by Fizzlewick)"] : [])].join("\n");
  if (["-r", "--remove", "-p", "-P", "--purge"].includes(op)) return /toybox/.test(rest.join(" ")) && toyIn() ? "dpkg: the wisp is holding on to wisp-toybox with both motes. (toybox off puts the toys away instead.)" : `dpkg: warning: ignoring request to remove ${rest[0] || "nothing"}, which isn't installed`;
  if (op === "-c" || op === "--contents" || op === "-I" || op === "--info") return rest[0] && resolve(rest[0]) === DEB ? "Package: wisp-toybox\nVersion: 1.0\nMaintainer: Fizzlewick <boom@forever>\nDepends: wispd (>= 7.7.7), murloc-tools\nDescription: toys for the wisp\n A bar of toys, a purse, and a shop. Mostly safe. Some explosions." : "dpkg-deb: error: that isn't a package archive";
  // a .deb with no action (dpkg file.deb, dpkg install file.deb): real dpkg refuses; this one assumes -i
  const deb = a.find(x => /\.deb$/i.test(x));
  if (deb) { print("(dpkg needs -i to install a .deb. taking that as a yes.)", "dim"); return installDeb(deb); }
  return "usage: dpkg -i <file.deb>   install a package from a file\n       dpkg -l              list what's installed";
});
cmd("toybox", a => {
  if (!toyIn()) return notFound("toybox");
  const v = (a[0] || "").toLowerCase(), T = X.toybox;
  if (v === "off") { X.mind.setToybox(false); return "The toys are put away. Your coins and toys are kept. (toybox on brings them back.)"; }
  if (v === "on") { X.mind.setToybox(true); return "The toy bar is back at the bottom of the page."; }
  if (v === "shop" || v === "wares") { if (!X.mind.toyOn) return "The toys are put away. toybox on first."; T && T.shop(); return "Fizzlewick's Wares are open, at the bottom of the page."; }
  const st = T ? T.status() : null, on = X.mind.toyOn;
  return html(`<b>wisp-toybox 1.0</b>  <span class="dim">(by Fizzlewick)</span>\n  Status:     ${on ? "on" : "off"}   <span class="dim">(toybox ${on ? "off" : "on"} to switch)</span>\n  Purse:      ${esc(X.coinsText(store.get("purse", 0)))}\n  Reputation: ${esc(X.mind.standing())} with the wisp\n  Mood:       ${esc(X.mind.mood())}` + (st ? `\n  Toys:       ${esc(st.toys.join(", "))}\n  Loves:      ${esc(st.likes || "??? (watch how it reacts)")}\n  Can't stand: ${esc(st.dislikes || "???")}` : "") + `\n<span class="dim">toybox shop opens Fizzlewick's Wares. cat /proc/wisp/status for the details.</span>`);
}, { hidden: true });
for (const m of ["apt", "pacman", "brew", "pip", "pip3", "npm", "yarn", "cargo", "gem", "snap", "flatpak", "emerge", "nix", "guix"]) cmd(m, a => pkgCmd(m, a));

/* ---- clipboard-whimsy: copies made on this page feed it, and the real clipboard when the browser allows ---- */
// What you copy on this page is used directly, with no permission needed. Once you've been to another window
// (where you may have copied something else), it asks the browser's clipboard instead, which may ask you first.
let clip = "", clipFresh = false;
const onCopy = e => { const t = e.target, s = t && /^(INPUT|TEXTAREA)$/.test(t.tagName) && t.selectionStart != null ? t.value.slice(t.selectionStart, t.selectionEnd) : String(getSelection() || ""); if (s) { clip = s; clipFresh = true; } };
document.addEventListener("copy", onCopy); document.addEventListener("cut", onCopy);
addEventListener("blur", () => { clipFresh = false; });
async function paste() {
  let t = clipFresh ? clip : "";
  if (!t && navigator.clipboard && navigator.clipboard.readText) {
    const hint = setTimeout(() => print("(your browser is asking whether this page may read the clipboard)", "dim"), 700);
    try { t = await Promise.race([navigator.clipboard.readText(), new Promise((_, no) => setTimeout(() => no(new Error("timed out")), 20000))]); }
    catch { /* not allowed, or no answer: fall back to what was copied here */ }
    finally { clearTimeout(hint); }
  }
  t = t || clip; award("pbpaste");
  if (!t) throw "the clipboard is empty. (Select some text, copy it, then try again.)";
  return t;
}
function copyIn(t) { clip = t; clipFresh = true; try { navigator.clipboard && navigator.clipboard.writeText(t).catch(() => {}); } catch { /* the page copy still works */ } return ""; }
const CLIP = { hidden: true, pkg: "clipboard-whimsy" };
cmd(["pbpaste", "wl-paste"], () => paste(), CLIP);
cmd(["pbcopy", "wl-copy"], (a, i) => copyIn(i || a.join(" ")), CLIP);
cmd("xclip", (a, i) => a.some(x => /^(-o|-out|--output)$/.test(x)) ? paste() : copyIn(i || ""), CLIP);
cmd("xsel", (a, i) => a.some(x => /^(-o|--output)$/.test(x)) || (!i && !a.some(x => /^(-i|--input)$/.test(x))) ? paste() : copyIn(i || ""), CLIP);

/* ---- espeak-whimsy: the terminal talks ---- */
cmd(["espeak", "espeak-ng", "say", "spd-say"], (a, i) => {
  const t = (a.filter(x => !x.startsWith("-")).join(" ") || i || "").trim().slice(0, 400) || "Hello. I am the wisp's voice.";
  award("espeak");
  if (!("speechSynthesis" in window)) return `(no audio device. The wisp mouths the words: "${t}")`;
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.pitch = 1.6; u.rate = 1.05; speechSynthesis.speak(u);
  return "";
}, { hidden: true, pkg: "espeak-whimsy" });

/* ---- murloc-tools: mrgl ---- */
const MRGL = ["mrgl", "mrrgl", "mrglgl", "mrglglgl", "grrl", "mmrgl", "rwlrwl", "mrgle", "glrgl", "urgl"];
cmd("mrgl", (a, i) => {
  const t = a.join(" ") || i || "";
  award("mrgl");
  if (!t.trim()) return "Mrglglglgl! (usage: mrgl TEXT, or pipe into it: fortune | mrgl)";
  return t.replace(/[A-Za-z']+/g, w => {
    let h = 0; for (const c of w.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    let m = w.length > 11 ? "aaaaughibbrgubugbugrguburgle" : MRGL[h % MRGL.length];
    if (w.length > 6 && w.length <= 11) m += "gl".repeat((w.length - 6) >> 1);
    return w.length > 1 && w === w.toUpperCase() ? m.toUpperCase() : /[A-Z]/.test(w[0]) ? m[0].toUpperCase() + m.slice(1) : m;
  });
}, { hidden: true, pkg: "murloc-tools" });
cmd("make", a => { const t = a.join(" "); if (t === "love") { award("makelove"); return "make: *** No rule to make target 'love'. Not war?"; } if (t === "me a sandwich") return "What? Make it yourself."; if (t === "war") return "make: *** War never changes. Wrong franchise."; return `make: *** No rule to make target '${t || "all"}'. Stop.`; });
cmd(["gcc", "cc", "clang", "rustc", "go", "javac"], () => "Compiling... error: expected whimsy, found seriousness. 1 error generated.");
cmd(["python", "python3", "node", "ruby", "perl", "irb", "ghci", "racket"], () => "That REPL is closed for maintenance. The guild has a perfectly good Lisp REPL: emacs (or M-x ielm).");
cmd("lua", a => "Lua 5.1 (the WoW one). Try: /run print(\"hello\")");
cmd(["docker", "podman", "kubectl", "k8s"], () => "It works on my realm.");
cmd("git", a => {
  if (a[0] === "log") { award("gitlog"); return `commit 7777777 (HEAD -> main, origin/forever)
Author: the wisp <wisp@forever>
Date:   Sat Nov 14 23:58:00 2026

    hide the seals. I'll definitely remember where.

commit 4242424
Author: Grumbolt <grumbolt@forever>

    remove vim. again.

commit 1121121
Author: Fizzlewick <fizzlewick@forever>

    fix: jumper cables (attempt 47)`; }
  if (a[0] === "blame") return "Everything: Grumbolt (2026-11-12) // the vim removal\nThe rest: the wisp";
  if (a[0] === "push") return "Everything up-to-date. (The wisp handles deploys. Every three hours.)";
  if (a[0] === "status") return "On branch forever\nYour branch is ahead of 'origin/classic' by 98 changes.\nnothing to commit, working tree whimsical";
  return "git: try git log, git status, git blame";
});
cmd(["code", "subl", "atom", "notepad++", "idea"], () => "A graphical editor? In THIS guild? Grumbolt has been notified.");

// ----- fun -----
cmd("fortune", a => { award("fortune"); const n = store.get("fortunes", 0) + 1; store.set("fortunes", n); if (n >= 7) award("fortune7"); return a.includes("-a") ? D.FORTUNES.join("\n%\n") : pick(D.FORTUNES); });
const COWS = {
  cow: "        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||",
  tauren: "        \\    /\\_____/\\\n         \\  (  o   o  )   ~ moo, but noble\n            /   (__)   \\\n           |  |  ''  |  |\n            \\_|======|_/\n              ||    ||",
  murloc: "        \\    _______\n         \\  / o   o \\\n           ( ~~~~~~~ )  mrglglgl\n            \\_^^^^^_/\n            /|     |\\",
  wisp: "        \\      .  *  .\n         \\   *  (o o)  *\n               .  \\_/  .\n                *  ~  *",
  gnome: "        \\     /\\\n         \\   /__\\\n            (o_o)  < tinkering intensifies\n            /|_|\\\n             / \\",
};
cmd(["cowsay", "cowthink"], (a, i) => {
  award("cowsay");
  const fi = a.indexOf("-f"), kind = fi >= 0 ? a[fi + 1] : "cow", words = (fi >= 0 ? a.filter((x, k) => k !== fi && k !== fi + 1) : a).join(" ") || i || "moo";
  const art = COWS[kind] || COWS.cow; const t = words.replace(/\s+/g, " ").trim(), w = Math.min(40, t.length);
  const lines = t.match(new RegExp(`.{1,${w}}(\\s|$)`, "g")) || [t];
  const box = lines.length === 1 ? `< ${lines[0].trim()} >` : lines.map((l, k) => `${k === 0 ? "/" : k === lines.length - 1 ? "\\" : "|"} ${l.trim().padEnd(w)} ${k === 0 ? "\\" : k === lines.length - 1 ? "/" : "|"}`).join("\n");
  return ` ${"_".repeat(w + 2)}\n${box}\n ${"-".repeat(w + 2)}\n${art}`;
});
const FONT = { A: ["  #  ", " # # ", "#####", "#   #", "#   #"], B: ["#### ", "#   #", "#### ", "#   #", "#### "], C: [" ####", "#    ", "#    ", "#    ", " ####"], D: ["#### ", "#   #", "#   #", "#   #", "#### "], E: ["#####", "#    ", "#### ", "#    ", "#####"], F: ["#####", "#    ", "#### ", "#    ", "#    "], G: [" ####", "#    ", "#  ##", "#   #", " ####"], H: ["#   #", "#   #", "#####", "#   #", "#   #"], I: ["#####", "  #  ", "  #  ", "  #  ", "#####"], J: ["  ###", "    #", "    #", "#   #", " ### "], K: ["#   #", "#  # ", "###  ", "#  # ", "#   #"], L: ["#    ", "#    ", "#    ", "#    ", "#####"], M: ["#   #", "## ##", "# # #", "#   #", "#   #"], N: ["#   #", "##  #", "# # #", "#  ##", "#   #"], O: [" ### ", "#   #", "#   #", "#   #", " ### "], P: ["#### ", "#   #", "#### ", "#    ", "#    "], Q: [" ### ", "#   #", "# # #", "#  # ", " ## #"], R: ["#### ", "#   #", "#### ", "#  # ", "#   #"], S: [" ####", "#    ", " ### ", "    #", "#### "], T: ["#####", "  #  ", "  #  ", "  #  ", "  #  "], U: ["#   #", "#   #", "#   #", "#   #", " ### "], V: ["#   #", "#   #", "#   #", " # # ", "  #  "], W: ["#   #", "#   #", "# # #", "## ##", "#   #"], X: ["#   #", " # # ", "  #  ", " # # ", "#   #"], Y: ["#   #", " # # ", "  #  ", "  #  ", "  #  "], Z: ["#####", "   # ", "  #  ", " #   ", "#####"], " ": ["   ", "   ", "   ", "   ", "   "], "!": ["#", "#", "#", " ", "#"], "?": ["### ", "   #", " ## ", "    ", " #  "], "0": [" ### ", "#  ##", "# # #", "##  #", " ### "], "1": [" # ", "## ", " # ", " # ", "###"], "2": ["### ", "   #", " ## ", "#   ", "####"], "3": ["### ", "   #", " ## ", "   #", "### "], "4": ["#  #", "#  #", "####", "   #", "   #"], "5": ["####", "#   ", "### ", "   #", "### "], "6": [" ## ", "#   ", "### ", "#  #", " ## "], "7": ["####", "   #", "  # ", " #  ", " #  "], "8": [" ## ", "#  #", " ## ", "#  #", " ## "], "9": [" ## ", "#  #", " ###", "   #", " ## "], "-": ["    ", "    ", "####", "    ", "    "], ".": [" ", " ", " ", " ", "#"], "'": ["#", "#", " ", " ", " "] };
cmd("figlet", (a, i) => { const t = (a.join(" ") || i || "whimsy").toUpperCase().slice(0, 14); award("figlet"); return [0, 1, 2, 3, 4].map(r => [...t].map(c => (FONT[c] || FONT["?"])[r]).join(" ").replace(/#/g, "█")).join("\n"); });
cmd("lolcat", (a, i) => { award("lolcat"); const t = a.length ? catLike(a, i) : i || "taste the rainbow"; let k = 0; return html(t.split("\n").map((l, r) => [...l].map(c => `<span style="color:hsl(${(k++ * 7 + r * 20) % 360} 90% 70%)">${esc(c)}</span>`).join("")).join("\n")); });
cmd("sl", () => {
  award("sl");
  const G = ["      __       _     ", "   __/  \\_____/ \\    ", "  < (o)   GRYPHON )==", "   \\__/\\_______/\\__/ ", "      ''      ''     "];
  const W = 46, frames = [];
  for (let x = W; x > -24; x -= 2) frames.push(G.map(l => (" ".repeat(Math.max(0, x)) + l).slice(Math.max(0, -x), Math.max(0, -x) + W)).join("\n") + "\n  (flight path: Stormwind -> Ironforge. you meant 'ls'.)");
  animate(frames, 70); return "";
});
cmd("cmatrix", () => { award("cmatrix"); X.matrix && X.matrix(); return "Wake up, raider... (press any key, or wait)"; });
cmd(["calc", "bc", "expr", "qalc"], (a, i) => { const e = (a.join(" ") || i || "").replace(/\^/g, "**"); if (!/^[\d\s+\-*/%().]+$/.test(e)) throw "only numbers and + - * / % ^ ( ) please"; try { return String(Function(`"use strict";return(${e})`)()); } catch { throw "syntax error"; } });
cmd("factor", a => { let n = Math.abs(parseInt(a[0])), f = [], d = 2; if (!n) throw "usage: factor N"; const o = n; while (n > 1 && d * d <= n) { while (n % d === 0) { f.push(d); n /= d; } d++; } if (n > 1) f.push(n); return `${o}: ${f.join(" ")}${o === 7 ? "  (the wisp's favourite)" : ""}`; });
cmd("seq", a => { const [x, y] = a.length > 1 ? [+a[0], +a[1]] : [1, +a[0] || 10]; return Array.from({ length: Math.min(200, Math.max(0, y - x + 1)) }, (_, k) => x + k).join("\n"); });
cmd("shuf", (a, i) => (i || a.join("\n")).split("\n").sort(() => Math.random() - .5).join("\n"));
cmd("yes", a => Array(16).fill(a.join(" ") || "y").join("\n") + "\nyes: interrupted by the wisp (it got bored)");
cmd("echo", (a, i) => { const t = a.join(" "); if (/^seal\b/i.test(t)) return t; if (/^hello,? world!?$/i.test(t)) award("helloworld"); return t; });
cmd("printf", a => a.join(" ").replace(/\\n/g, "\n"));
cmd(["env", "printenv"], () => Object.entries(ENV()).map(([k, v]) => `${k}=${v}`).join("\n"));
cmd("export", a => { for (const kv of a) { const [k, ...v] = kv.split("="); if (k) S.env[k] = v.join("="); } if (S.env.EDITOR && S.env.EDITOR !== "emacs") { const e = S.env.EDITOR; S.env.EDITOR = "emacs"; return `EDITOR=${e}? Grumbolt has reverted that to emacs. (/home/whimsy/.profile line 1)`; } return ""; });
cmd("alias", () => Object.entries(ALIASES).slice(0, 14).map(([k, v]) => `alias ${k}='${v}'`).join("\n"));
cmd("history", a => { if (a[0] === "-c") return "history: cleared. (Grumbolt tried that too. It didn't work for him either.)"; return hist.slice(-40).map((h, k) => `${String(hist.length - Math.min(40, hist.length) + k + 1).padStart(5)}  ${h}`).join("\n"); });
cmd(["which", "type", "whereis", "command"], a => a.map(n => CMDS[n] && !(CMDS[n].pkg && !isInstalled(CMDS[n].pkg)) ? `/usr/bin/${n}` : ALIASES[n] ? `${n}: aliased to ${ALIASES[n]}` : `${n} not found`).join("\n"));
cmd("clear", () => { out.innerHTML = ""; return ""; });
cmd(["resize", "fullscreen", "maximize", "maximise"], a => { const n = parseInt(a[0]); setHeight(n ? innerHeight * Math.min(100, n) / 100 : innerHeight - 8); award("resize"); return ""; }, { hidden: true });
cmd("sleep", a => "zzz... (the wisp also sleeps, but only between midnight and 4 a.m.)");
cmd(["true", ":"], () => ""); cmd("false", () => { lastStatus = 1; return ""; });
cmd("xeyes", () => { award("xeyes"); X.eyes && X.eyes(); return "Two eyes are watching your cursor now. (the wisp's, for 20 seconds)"; });
cmd(["oneko", "/follow"], () => { award("follow"); X.follow && X.follow(); return "The wisp follows your cursor for a bit."; });
cmd("hack", () => { award("hack"); const L = ["Initializing hack.exe...", "Bypassing ICE... (it's Frost Nova, it breaks on damage)", "Enhancing image... ENHANCE...", "Accessing mainframe at 10.0.7.7...", "Downloading more RAM... 7 motes acquired", "Decrypting vault... needs seven seals. Hollywood can't help you.", "ACCESS DENIED. But you looked really cool doing it."]; stream(L, 280); return ""; });
cmd(["coffee", "tea"], () => "HTTP/1.1 418 I'm a teapot. The wisp is short and stout.");
cmd("xyzzy", () => { award("xyzzy"); return "Nothing happens."; }, { hidden: true });
cmd("plugh", () => "A hollow voice says 'Fool.'", { hidden: true });
cmd(["hello", "hi", "hey"], () => `Hello, ${X.who()}.`, { hidden: true });
cmd("ping-wisp", () => "pong ✦", { hidden: true });
cmd("42", () => "The answer is 42. The question was 'how many times will Healsbarry stand in the fire tonight'.", { hidden: true });
cmd("leeroy", () => { X.leeroy && X.leeroy(); return ""; }, { hidden: true });
cmd(["whelps", "many"], a => { X.whelps && X.whelps(); return "MANY WHELPS. HANDLE IT."; }, { hidden: true });
cmd("konami", () => "You know the code. Type it on the page, not in here. (Arrows, then b, a.)", { hidden: true });
cmd("whimsy", () => { X.party && X.party(); return "✦ ✦ ✦"; }, { hidden: true });
cmd("sudoku", () => "There's no sudoku. There's sudo. And you're not in the sudoers file.", { hidden: true });
cmd("exit()", () => "This isn't Python. Try exit, or C-x C-c if you're feeling Emacsy.", { hidden: true });
cmd([":q", ":q!", ":wq", ":x", "ZZ"], () => { award("vimreflex"); return "You're not in vim. Your fingers just did that on their own, didn't they."; }, { hidden: true });

// ----- the guild, and the quest -----
cmd("mail", a => {
  const M = DATA.mail; flag("mailRead");
  if (!a.length) return html(`Mail version 8.1.2 (whimsy).  Type "mail N" to read message N.\n` + M.map((m, k) => `${k === 0 && !flags.mail1 ? "<span class='hl'>N</span>" : " "} ${k + 1} ${esc(m.from.padEnd(18))} ${esc(m.date)}  ${esc(m.subj)}`).join("\n"));
  const m = M[+a[0] - 1]; if (!m) throw "no such message"; if (a[0] === "1") { flag("mail1"); award("mail"); }
  return `From: ${m.from}\nDate: ${m.date}\nSubject: ${m.subj}\n\n${m.body}`;
});
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
function sealsFound() { return store.get("seals", []); }
cmd("seals", () => { const f = sealsFound(); return html(ROMAN.map((r, k) => `  ${r.padEnd(4)} ${f.includes(k) ? `<span class="hl">sealed word found</span>` : `<span class="dim">. . . . .</span>`}`).join("\n") + `\n\n${f.length}/7 found.${f.length === 7 ? " Type <b>unlock vault</b>." : " Hints are in ~/notes.org."}`); });
cmd("seal", a => {
  const w = a.join(" ").toLowerCase().replace(/[^a-z ]/g, "").replace(/^the /, "").replace(/ city$/, "").trim();
  if (!w) return CMDS.seals.f([]);
  return sha(w).then(h => {
    const k = TD.seals.indexOf(h);
    if (k < 0) { wisp.talk("> hmm. that word has no power here. keep looking.", 2500); return "That word has no power here."; }
    const f = sealsFound();
    if (f.includes(k)) return `Seal ${ROMAN[k]} is already yours.`;
    f.push(k); store.set("seals", f); award("seal" + (k + 1)); if (f.length >= 3) award("seals3");
    const r = wisp.el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 40, 1.2);
    wisp.talk(f.length === 7 ? "> ALL SEVEN. i can feel the vault humming. type: unlock vault" : `> seal ${ROMAN[k]}! i remember a little more now. ${f.length} of 7.`, 4000);
    return html(`<span class="hl">SEAL ${ROMAN[k]} RECOVERED: ${esc(w.toUpperCase())}</span>\n${f.length}/7 seals.${f.length === 7 ? " The vault is humming. Type <b>unlock vault</b>." : ""}`);
  });
});
async function decryptVault(words) {
  const enc = new TextEncoder(), V = TD.vault, b = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const base = await crypto.subtle.importKey("raw", enc.encode(words.join(" ")), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b(V.salt), iterations: V.iters, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b(V.iv) }, key, b(V.ct)));
}
cmd(["unlock", "vault", "open-vault"], a => {
  if (a[0] && a[0] !== "vault") return `unlock: what? (try: unlock vault)`;
  const f = sealsFound();
  if (f.length < 7) return `The vault door has seven keyholes. ${f.length} glow. ${7 - f.length} ${7 - f.length === 1 ? "is" : "are"} dark. (see: seals)`;
  const words = store.get("sealWords", null);
  if (!words || !words.every(Boolean)) return "The seals glow, but the vault wants them spoken in order. Speak each again with: seal <word>";
  print("The seven seals turn, one by one: " + words.map(w => w.toUpperCase()).join(" · "), "hl");
  return decryptVault(words).then(h => { store.set("vault", true); X.vaultHTML = h; award("vault"); X.secretTabs(); fx.shower(160); setTimeout(() => { location.hash = "vault"; }, 900); return html(`<span class="hl">The vault opens.</span> Taking you there...`); })
    .catch(() => "The door shudders but stays shut. (The words are right, but something's off. Try speaking the seals again.)");
});
X.decryptVault = decryptVault;
// keep the actual words (in order) once each seal is spoken, so the vault can be opened again later
const _seal = CMDS.seal.f;
CMDS.seal.f = a => { const w = a.join(" ").toLowerCase().replace(/[^a-z ]/g, "").replace(/^the /, "").replace(/ city$/, "").trim(); return Promise.resolve(_seal(a)).then(r => { sha(w).then(h => { const k = TD.seals.indexOf(h); if (k >= 0) { const ws = store.get("sealWords", null) || Array(7).fill(null); ws[k] = w; store.set("sealWords", ws); } }); return r; }); };
cmd(["quest", "journal", "notes"], () => readFile("/home/whimsy/notes.org"));
cmd("motes", () => { const n = store.get("motes", []).length; return n === 7 ? "All seven motes found. The wisp is golden." : `${n} of 7 lost motes found on the site. ${pick(["One hides at the very bottom of the briefing.", "Small print hides things.", "The source list is a good hiding place.", "One likes the Gear room's secrets.", "Check how the sources are doing."])}`; });
cmd("raid", () => { const d = new Date("2026-12-09T08:00:00Z") - Date.now(); return d > 0 ? `Raids open in ${Math.floor(d / DAY)} days, ${Math.floor(d % DAY / 36e5)} hours. Barrow Deeps (10), Hyjal Summit (20), Onyxia (40).` : "Raids are open. Why are you in a terminal? Go raid."; });
cmd("wire", () => CURL.wire());
cmd("hotfix", a => { const k = a[0] ? Object.keys(CL).find(c => c.startsWith(a[0].toLowerCase())) : X.myClass, L = X.hot.filter(l => !k || l.classes.includes(k)); if (!L.length) return "No hotfixes loaded yet."; const l = pick(L); return `${l.date} · ${l.path.join(" › ")}\n${l.text}`; });
cmd("change", () => { const c = pick(D.CHANGES.filter(c => c.severity === "major")); return html(`<a href="#c-${c.id}">${esc(c.title)}</a>\n${esc(c.forever)}`); });
cmd("said", () => { const s = D.SAID[0]; return `${s.date}: ${s.title}\n${s.summary}`; });
cmd("class", a => { const k = Object.keys(CL).find(c => c.startsWith((a[0] || "").toLowerCase())); if (!a[0] || !k) return `classes: ${Object.keys(CL).join(", ")}`; X.setClass(k); return `Class set to ${CL[k].n}.`; });
cmd("loot", () => { const r = X.lootRoll ? X.lootRoll(true) : null; return r ? html(r.replace(/<br>/g, "\n")) : "No loot today."; });
cmd(["look", "examine"], () => html(`You look around. You're in a terminal on the guild's box. <span class="dim">(Somewhere on this machine there's a game with much more to look at.)</span>`), { hidden: true });
cmd(["go", "open", "xdg-open"], a => {
  const t = (a[0] || "").toLowerCase().replace(/^#/, "");
  const known = ["brief", "changes", "gear", "said", "wire", "sources", "vault", "darkmoon", "patchnotes", "credits", "graveyard", "nether"];
  const r = known.find(k => k.startsWith(t));
  const bi = !r && X.bag && a.length ? X.bag.find(a.join(" ")) : null;     // open bottle, open shell
  if (bi) return html(X.bag.term(bi));
  if (!t || !r) return `places: brief, changes, gear, said, wire, sources (and some you'll have to earn)`;
  location.hash = r; setTimeout(closeCon, 200); return "";
});
cmd("faire", () => { if (!flags.ticket) return "A gnome at the gate asks for your ticket. You don't have one."; flag("darkmoon"); award("faire"); X.secretTabs(); setTimeout(() => { location.hash = "darkmoon"; closeCon(); }, 700); return "The gnome punches your ticket. The Darkmoon Faire opens before you..."; });
const THEMES = { green: () => true, amber: () => store.get("vault", false), ice: () => store.get("vault", false), fel: () => store.get("vault", false), gold: () => store.get("motes", []).length >= 7, paper: () => Object.keys(X.got).length >= 30 };
cmd("theme", a => {
  if (!a[0]) return "themes: " + Object.entries(THEMES).map(([k, ok]) => ok() ? k : `${k} (locked)`).join(", ");
  const t = a[0]; if (!THEMES[t]) throw `no theme '${t}'`; if (!THEMES[t]()) return "That theme is locked. Keep exploring.";
  Object.keys(THEMES).forEach(k => con.classList.remove("th-" + k)); con.classList.add("th-" + t); flag("theme", t); award("themed"); return `Theme: ${t}.`;
});
cmd("privacy", a => {
  const T = window.TWLOG;
  if (!T || !T.configured) return "Nothing typed here is logged or sent anywhere right now.";
  if (a[0] === "off") { T.optOut(true); return "Logging is off for this browser. Nothing more will be sent."; }
  if (a[0] === "on") { T.optOut(false); return "Logging is back on. Thank you, it helps."; }
  return `What's logged: the commands you type here, which ones the terminal didn't understand, errors, and the secrets you find.
What's never logged: anything typed at a password prompt.
Who you are: a random id (${T.vid}), no name or account. The logs go to a spreadsheet only the guild officers can read.
Status: ${T.on ? "on" : "off"}.  Type  privacy off  to stop, or  privacy on  to start again.`;
});
cmd("achievements", () => { X.xp(); $("#achs").hidden = false; return `${Object.keys(X.got).filter(k => D.ACH[k]).length} found so far. Opened your list.`; });
cmd("name", a => { const n = a.join(" ").replace(/[^\p{L}\p{N} '\-]/gu, "").trim().slice(0, 24); if (!n) return "usage: name <your name>"; store.set("name", n); award("named"); X.xp(); return `Hello, ${X.who()}.`; });
cmd("roll", a => { const m = Math.max(2, Math.min(1e6, parseInt(a[0]) || 100)), r = 1 + rnd(m); if (m === 100 && r === 100) award("nat100"); return `${X.store.get("name", "You")} rolls ${r} (1-${m})`; });

// ----- WoW slash commands -----
const EMOTE = { dance: "You dance. The icons dance with you.", cheer: "You cheer! The wisp sparkles.", wave: "You wave. The wisp waves back (with its whole body).", sit: "You sit down. Your health regenerates. Slowly.", flex: "You flex. Impressive. Most impressive.", cry: "You cry. The wisp hands you a tiny sparkly tissue.", lol: "You laugh out loud. Grumbolt glares.", love: "You love the wisp. The wisp turns slightly pink.", kiss: "You blow a kiss to the wisp. It blushes so hard it turns gold for a second.", pet: "You pet the wisp. It purrs. Wisps can purr.", beg: "You beg. The wisp gives you 1 copper.", oom: "You're out of mana! (You were always out of mana.)", train: "Choo choo! (Gnome trains are faster, if more explosive.)", chicken: "You flap your arms and cluck. Leeroy, somewhere, approves.", sleep: "You fall asleep. The wisp tucks you in.", joke: pick(["Why did the murloc cross the road? Mrglglgl.", "How many raiders does it take to change a lightbulb? Nine. One to do it, eight to argue about loot.", "A warrior, a priest and a mage walk into a bar. The warrior pulls it."]), afk: "You are now AFK: whimsy break.", camp: "You will be logged out in 20 seconds. Just kidding. The wisp won't let you go.", cast: "You begin casting... interrupted by the wisp poking you.", target: "You target the wisp. It looks very small and very pleased.", inv: "You invite the wisp to your group. It accepts instantly.", random: "", g: "", "1": "[1. Trade] goldbot: WTS gold cheap!!! (kill -9 4242)", played: "", s: "", say: "", y: "", yell: "" };
for (const k of Object.keys(EMOTE)) cmd("/" + k, a => {
  award("slash");
  if (k === "dance") { X.dance && X.dance(); }
  if (k === "hug" || k === "pet" || k === "kiss" || k === "love") { const r = wisp.el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 20, 30, .8); X.emit && X.emit("wisp", { type: "hug" }); }
  if (k === "kiss") { wisp.el.classList.add("blush"); setTimeout(() => wisp.el.classList.remove("blush"), 1500); }
  if (k === "sleep") { wisp.sleep(); }
  if (k === "chicken") { award("chicken"); }
  if (k === "random") return CMDS.roll.f(a);
  if (k === "played") { const first = store.get("firstSeen", Date.now()); store.set("firstSeen", first); const ms = Date.now() - first; return `Total time played: ${Math.floor(ms / DAY)} days, ${Math.floor(ms % DAY / 36e5)} hours, ${Math.floor(ms % 36e5 / 6e4)} minutes\nTime played this level: also that`; }
  if (k === "g") return html(`<span style="color:#40ff40">[Guild] [${esc(X.store.get("name", "You"))}]: ${esc(a.join(" ") || "...")}</span>\n<span style="color:#40ff40">[Guild] [Grumbolt]: use emacs</span>`);
  if (k === "s" || k === "say") return `[${X.store.get("name", "You")}] says: ${a.join(" ")}`;
  if (k === "y" || k === "yell") return `[${X.store.get("name", "You")}] yells: ${a.join(" ").toUpperCase()}!`;
  return EMOTE[k];
}, { hidden: true });
cmd("/hug", () => { const r = wisp.el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 20, 30, .8); X.emit && X.emit("wisp", { type: "hug" }); wisp.talk("> aww. hug received. hug returned.", 2500); award("slash"); return "You hug the wisp. It is warm and slightly sparkly."; }, { hidden: true });
cmd("/roll", a => CMDS.roll.f(a), { hidden: true });
cmd(["/run", "/script"], a => { const m = a.join(" ").match(/print\((["'])(.*)\1\)/); return m ? m[2] : "/run: the wisp only understands print(\"...\") in Lua."; }, { hidden: true });
cmd(["/help", "/?"], () => "WoW commands: /dance /cheer /wave /hug /pet /kiss /flex /cry /lol /sit /sleep /train /chicken /joke /roll /random /played /who /g /s /y /1 /afk /camp /reload /run /follow", { hidden: true });
cmd("/console", () => "This IS the console.", { hidden: true });

/* ---------------- the API other modules use ---------------- */
window.TWT = { print, html, esc, push, pop, mode, refresh, ask, animate, stream, CMDS, cmd, S, readFile, resolve, exists, isDir, kids, flags, flag, sha, open: openCon, close: closeCon, DATA, sealsFound, award, runLine, exitShell, textOf, con, inp, out };
X.openTerminal = openCon;
})();
