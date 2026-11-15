/* Terminal Whimsy: Emacs. A tiny Emacs Lisp (enough for *scratch* and Grumbolt's init.el), M-x commands,
   the psychotherapist, butterflies, zone, snake, life, hanoi, magit, org-agenda... and a vim you can't leave. */
(() => {
"use strict";
const T = window.TWT, X = window.TWX;
if (!T || !X) return;
const { print, html, esc, push, pop, ask, animate, stream, award } = T;
const { store, wisp, burst, fx } = X;
const rnd = n => Math.random() * n | 0, pick = a => a[rnd(a.length)];

/* =================== a small Emacs Lisp =================== */
class Sym { constructor(n) { this.n = n; } toString() { return this.n; } }
const SYMS = new Map(), sym = n => SYMS.get(n) || (SYMS.set(n, new Sym(n)), SYMS.get(n));
const NIL = null, T_ = sym("t");
const isNil = v => v === null || v === undefined || (Array.isArray(v) && v.length === 0);
const truthy = v => !isNil(v);
class LispError { constructor(m) { this.m = m; } }
const err = m => { throw new LispError(m); };

function read(src) {
  let i = 0; const forms = [];
  const ws = () => { for (;;) { while (i < src.length && /\s/.test(src[i])) i++; if (src[i] === ";") { while (i < src.length && src[i] !== "\n") i++; continue; } break; } };
  function one() {
    ws(); if (i >= src.length) err("End of file during parsing");
    const c = src[i];
    if (c === "(") { i++; const l = []; for (;;) { ws(); if (i >= src.length) err("End of file during parsing"); if (src[i] === ")") { i++; return l; } if (src[i] === "." && /\s/.test(src[i + 1] || "")) { i++; const tail = one(); ws(); i++; return Array.isArray(tail) ? l.concat(tail) : l.concat([tail]); } l.push(one()); } }
    if (c === ")") { i++; err("Invalid read syntax: \")\""); }
    if (c === "'") { i++; return [sym("quote"), one()]; }
    if (c === "`") { i++; return [sym("quote"), one()]; }
    if (c === "#" && src[i + 1] === "'") { i += 2; return [sym("function"), one()]; }
    if (c === "\"") { i++; let s = ""; while (i < src.length && src[i] !== "\"") { if (src[i] === "\\") { i++; s += ({ n: "\n", t: "\t" })[src[i]] ?? src[i]; } else s += src[i]; i++; } i++; return s; }
    if (c === "?") { i++; if (src[i] === "\\") { i++; const e = src[i++]; return ({ n: 10, t: 9, s: 32 })[e] ?? e.charCodeAt(0); } return src[i++].charCodeAt(0); }
    let tok = ""; while (i < src.length && !/[\s()";']/.test(src[i])) tok += src[i++];
    if (/^[+-]?\d+$/.test(tok)) return parseInt(tok, 10);
    if (/^[+-]?(\d+\.\d*|\.\d+)(e[+-]?\d+)?$/.test(tok)) return parseFloat(tok);
    if (tok === "nil") return NIL;
    return sym(tok);
  }
  for (;;) { ws(); if (i >= src.length) break; forms.push(one()); }
  return forms;
}
function balanced(src) { let d = 0, s = false; for (let i = 0; i < src.length; i++) { const c = src[i]; if (s) { if (c === "\\") i++; else if (c === "\"") s = false; continue; } if (c === "\"") s = true; else if (c === ";") { while (i < src.length && src[i] !== "\n") i++; } else if (c === "(") d++; else if (c === ")") d--; } return d <= 0 && !s; }

const G = new Map(), FN = new Map();
class Env { constructor(vars, up) { this.v = vars; this.up = up; } find(s) { let e = this; while (e) { if (e.v.has(s)) return e; e = e.up; } return null; } }
const lookup = (s, env) => { if (s === T_) return T_; if (s.n.startsWith(":")) return s; const e = env && env.find(s); if (e) return e.v.get(s); if (G.has(s)) return G.get(s); err(`Symbol’s value as variable is void: ${s.n}`); };
function setVar(s, v, env) { const e = env && env.find(s); if (e) e.v.set(s, v); else G.set(s, v); return v; }
class Lambda { constructor(params, body, env, name) { this.params = params; this.body = body; this.env = env; this.name = name; } }
function fnOf(f, env) {
  if (f instanceof Sym) { if (FN.has(f)) return FN.get(f); err(`Symbol’s function definition is void: ${f.n}`); }
  if (typeof f === "function" || f instanceof Lambda) return f;
  if (Array.isArray(f) && f[0] === sym("lambda")) return new Lambda(f[1] || [], f.slice(2), env);
  err(`Invalid function: ${pr(f)}`);
}
function call(f, args) {
  if (typeof f === "function") return f(...args);
  const vars = new Map(); let opt = false, rest = false;
  const ps = f.params || [];
  for (let k = 0, a = 0; k < ps.length; k++) {
    const p = ps[k];
    if (p === sym("&optional")) { opt = true; continue; } if (p === sym("&rest")) { rest = true; continue; }
    if (rest) { vars.set(p, args.slice(a)); a = args.length; continue; }
    if (a >= args.length && !opt) err(`Wrong number of arguments: ${f.name || "lambda"}, ${args.length}`);
    vars.set(p, a < args.length ? args[a] : NIL); a++;
  }
  const env = new Env(vars, f.env); let r = NIL;
  for (const b of f.body) r = ev(b, env);
  return r;
}
let steps = 0;
function ev(x, env) {
  if (++steps > 200000) err("Lisp nesting exceeds ‘max-lisp-eval-depth’ (the wisp got dizzy)");
  if (x instanceof Sym) return lookup(x, env);
  if (!Array.isArray(x) || !x.length) return x;
  const [h, ...a] = x;
  if (h instanceof Sym) switch (h.n) {
    case "quote": return a[0];
    case "function": return a[0] instanceof Sym ? fnOf(a[0], env) : fnOf(a[0], env);
    case "lambda": return new Lambda(a[0] || [], a.slice(1), env);
    case "if": return truthy(ev(a[0], env)) ? ev(a[1], env) : progn(a.slice(2), env);
    case "when": return truthy(ev(a[0], env)) ? progn(a.slice(1), env) : NIL;
    case "unless": return truthy(ev(a[0], env)) ? NIL : progn(a.slice(1), env);
    case "cond": for (const cl of a) { const t = ev(cl[0], env); if (truthy(t)) return cl.length > 1 ? progn(cl.slice(1), env) : t; } return NIL;
    case "and": { let r = T_; for (const f of a) { r = ev(f, env); if (!truthy(r)) return NIL; } return r; }
    case "or": for (const f of a) { const r = ev(f, env); if (truthy(r)) return r; } return NIL;
    case "progn": case "save-excursion": case "save-restriction": case "with-temp-buffer": case "ignore-errors": return progn(a, env);
    case "prog1": { const r = ev(a[0], env); progn(a.slice(1), env); return r; }
    case "setq": case "setq-default": case "setf": { let r = NIL; for (let k = 0; k < a.length; k += 2) r = setVar(a[k], ev(a[k + 1], env), env); return r; }
    case "let": case "let*": { const vars = new Map(), e2 = new Env(vars, env); for (const b of a[0] || []) { if (b instanceof Sym) vars.set(b, NIL); else vars.set(b[0], ev(b[1], h.n === "let*" ? e2 : env)); } return progn(a.slice(1), e2); }
    case "defun": case "defmacro": case "defsubst": { const body = a.slice(2).filter((f, k) => !(k === 0 && typeof f === "string" && a.length > 3)).filter(f => !(Array.isArray(f) && f[0] === sym("interactive"))); FN.set(a[0], new Lambda(a[1] || [], body, env, a[0].n)); award("defun"); return a[0]; }
    case "defvar": case "defconst": case "defcustom": if (h.n !== "defvar" || !G.has(a[0])) G.set(a[0], a.length > 1 ? ev(a[1], env) : NIL); return a[0];
    case "while": { let n = 0; while (truthy(ev(a[0], env))) { progn(a.slice(1), env); if (++n > 10000) err("while: too many iterations (the wisp intervened)"); } return NIL; }
    case "dolist": { const [v, l, res] = a[0], vars = new Map(), e2 = new Env(vars, env); for (const it of seq(ev(l, env))) { vars.set(v, it); progn(a.slice(1), e2); } return res ? ev(res, e2) : NIL; }
    case "dotimes": { const [v, n, res] = a[0], vars = new Map(), e2 = new Env(vars, env), N = ev(n, env); for (let k = 0; k < Math.min(N, 10000); k++) { vars.set(v, k); progn(a.slice(1), e2); } return res ? ev(res, e2) : NIL; }
    case "interactive": case "declare": return NIL;
    case "condition-case": try { return ev(a[1], env); } catch (e) { const h2 = a.slice(2)[0]; return h2 ? progn(h2.slice(1), env) : NIL; }
    case "provide": case "require": return a[0] ? ev(a[0], env) : NIL;
  }
  const f = fnOf(h, env), args = a.map(y => ev(y, env));
  return call(f, args);
}
const progn = (forms, env) => { let r = NIL; for (const f of forms) r = ev(f, env); return r; };
const seq = v => isNil(v) ? [] : Array.isArray(v) ? v : typeof v === "string" ? [...v].map(c => c.codePointAt(0)) : err(`Wrong type argument: sequencep, ${pr(v)}`);
const num = v => typeof v === "number" ? v : err(`Wrong type argument: number-or-marker-p, ${pr(v)}`);
const str = v => typeof v === "string" ? v : err(`Wrong type argument: stringp, ${pr(v)}`);
function pr(v, princ) {
  if (isNil(v)) return "nil";
  if (v === T_) return "t";
  if (typeof v === "string") return princ ? v : JSON.stringify(v);
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v).includes(".") ? String(v) : v + ".0";
  if (v instanceof Sym) return v.n;
  if (v instanceof Lambda) return v.name ? `#<subr ${v.name}>` : "#[(closure) lambda]";
  if (typeof v === "function") return `#<subr ${v.lispName || "builtin"}>`;
  if (Array.isArray(v)) { if (v[0] === sym("quote") && v.length === 2) return "'" + pr(v[1], princ); return "(" + v.map(y => pr(y, princ)).join(" ") + ")"; }
  return String(v);
}
let messages = [];
const def = (n, f) => { f.lispName = n; FN.set(sym(n), f); };
const toStr = x => typeof x === "string" ? x : Array.isArray(x) || isNil(x) ? seq(x).map(c => String.fromCodePoint(num(c))).join("") : err(`Wrong type argument: sequencep, ${pr(x)}`);
def("+", (...a) => a.reduce((s, v) => s + num(v), 0)); def("*", (...a) => a.reduce((s, v) => s * num(v), 1));
def("-", (...a) => a.length === 1 ? -num(a[0]) : a.slice(1).reduce((s, v) => s - num(v), num(a[0])));
def("/", (...a) => a.slice(1).reduce((s, v) => { if (num(v) === 0) err("Arithmetic error"); const r = s / v; return Number.isInteger(s) && Number.isInteger(v) ? Math.trunc(r) : r; }, num(a[0])));
def("%", (a, b) => num(a) % num(b)); def("mod", (a, b) => ((num(a) % num(b)) + b) % b);
def("1+", a => num(a) + 1); def("1-", a => num(a) - 1);
const cmp = op => (...a) => { for (let k = 0; k < a.length - 1; k++) if (!op(num(a[k]), num(a[k + 1]))) return NIL; return T_; };
def("=", cmp((x, y) => x === y)); def("<", cmp((x, y) => x < y)); def(">", cmp((x, y) => x > y)); def("<=", cmp((x, y) => x <= y)); def(">=", cmp((x, y) => x >= y)); def("/=", (a, b) => num(a) !== num(b) ? T_ : NIL);
def("max", (...a) => Math.max(...a.map(num))); def("min", (...a) => Math.min(...a.map(num))); def("abs", a => Math.abs(num(a)));
def("expt", (a, b) => num(a) ** num(b)); def("sqrt", a => Math.sqrt(num(a))); def("floor", a => Math.floor(num(a))); def("ceiling", a => Math.ceil(num(a))); def("round", a => Math.round(num(a))); def("truncate", a => Math.trunc(num(a)));
def("random", n => typeof n === "number" ? rnd(n) : rnd(1e6));
def("number-to-string", a => String(num(a))); def("string-to-number", a => Number(str(a)) || 0);
const pred = f => (...a) => f(...a) ? T_ : NIL;
def("numberp", pred(a => typeof a === "number")); def("integerp", pred(a => Number.isInteger(a))); def("stringp", pred(a => typeof a === "string")); def("symbolp", pred(a => a instanceof Sym || isNil(a))); def("listp", pred(a => isNil(a) || Array.isArray(a))); def("consp", pred(a => Array.isArray(a) && a.length > 0)); def("null", pred(isNil)); def("not", pred(isNil)); def("functionp", pred(a => typeof a === "function" || a instanceof Lambda)); def("zerop", pred(a => num(a) === 0));
def("eq", pred((a, b) => a === b || (isNil(a) && isNil(b)))); def("eql", pred((a, b) => a === b || (isNil(a) && isNil(b)))); def("equal", pred((a, b) => pr(a) === pr(b)));
def("car", l => isNil(l) ? NIL : Array.isArray(l) ? l[0] ?? NIL : err(`Wrong type argument: listp, ${pr(l)}`)); def("cdr", l => isNil(l) ? NIL : Array.isArray(l) ? (l.length > 1 ? l.slice(1) : NIL) : err(`Wrong type argument: listp, ${pr(l)}`));
def("cadr", l => seq(l)[1] ?? NIL); def("cddr", l => seq(l).slice(2)); def("caar", l => seq(seq(l)[0])[0] ?? NIL);
def("cons", (a, b) => [a, ...(isNil(b) ? [] : Array.isArray(b) ? b : [sym("."), b])]); def("list", (...a) => a.length ? a : NIL);
def("length", l => typeof l === "string" ? [...l].length : seq(l).length); def("nth", (n, l) => seq(l)[num(n)] ?? NIL); def("nthcdr", (n, l) => seq(l).slice(num(n)));
def("last", l => seq(l).slice(-1)); def("append", (...a) => { const r = a.flatMap(seq); return r.length ? r : NIL; });
def("reverse", l => typeof l === "string" ? [...l].reverse().join("") : seq(l).slice().reverse()); def("nreverse", l => seq(l).slice().reverse());
def("member", (x, l) => { const s = seq(l), k = s.findIndex(y => pr(y) === pr(x)); return k < 0 ? NIL : s.slice(k); }); def("memq", (x, l) => { const s = seq(l), k = s.indexOf(x); return k < 0 ? NIL : s.slice(k); });
def("assoc", (k, l) => seq(l).find(p => Array.isArray(p) && pr(p[0]) === pr(k)) ?? NIL); def("assq", (k, l) => seq(l).find(p => Array.isArray(p) && p[0] === k) ?? NIL);
def("alist-get", (k, l) => { const p = seq(l).find(p => Array.isArray(p) && pr(p[0]) === pr(k)); return p ? (p[1] === sym(".") ? p[2] : p.length === 2 ? p[1] : p.slice(1)) : NIL; });
def("remove", (x, l) => seq(l).filter(y => pr(y) !== pr(x))); def("delete", (x, l) => seq(l).filter(y => pr(y) !== pr(x)));
def("sort", (l, p) => seq(l).slice().sort((a, b) => truthy(call(fnOf(p), [a, b])) ? -1 : truthy(call(fnOf(p), [b, a])) ? 1 : 0));
def("mapcar", (f, l) => { const r = seq(l).map(x => call(fnOf(f), [x])); return r.length ? r : NIL; }); def("mapc", (f, l) => { seq(l).forEach(x => call(fnOf(f), [x])); return l; });
def("mapconcat", (f, l, sep) => seq(l).map(x => { const v = call(fnOf(f), [x]); return typeof v === "string" ? v : pr(v, true); }).join(sep ?? ""));
def("seq-filter", (f, l) => seq(l).filter(x => truthy(call(fnOf(f), [x])))); def("seq-reduce", (f, l, init) => seq(l).reduce((acc, x) => call(fnOf(f), [acc, x]), init));
def("seq-take", (l, n) => seq(l).slice(0, n)); def("number-sequence", (a, b) => Array.from({ length: Math.max(0, (b ?? a) - a + 1) }, (_, k) => a + k));
def("apply", (f, ...a) => call(fnOf(f), [...a.slice(0, -1), ...seq(a[a.length - 1])])); def("funcall", (f, ...a) => call(fnOf(f), a)); def("identity", a => a); def("ignore", () => NIL);
def("concat", (...a) => a.map(toStr).join("")); def("substring", (s, a, b) => [...str(s)].slice(a, b == null || isNil(b) ? undefined : b).join(""));
def("string-to-char", s => str(s).codePointAt(0) || 0); def("char-to-string", c => String.fromCodePoint(num(c))); def("string-to-list", s => seq(str(s))); def("string", (...c) => c.map(x => String.fromCodePoint(x)).join(""));
def("upcase", s => typeof s === "number" ? String.fromCodePoint(s).toUpperCase().codePointAt(0) : str(s).toUpperCase()); def("downcase", s => typeof s === "number" ? String.fromCodePoint(s).toLowerCase().codePointAt(0) : str(s).toLowerCase()); def("capitalize", s => str(s).replace(/\b\w/g, c => c.toUpperCase()));
def("string=", pred((a, b) => toStr(a) === toStr(b))); def("string-equal", pred((a, b) => toStr(a) === toStr(b))); def("string<", pred((a, b) => toStr(a) < toStr(b)));
def("string-prefix-p", pred((p, s) => str(s).startsWith(str(p)))); def("string-suffix-p", pred((p, s) => str(s).endsWith(str(p)))); def("string-match-p", (r, s) => { const k = str(s).search(new RegExp(str(r))); return k < 0 ? NIL : k; });
def("split-string", (s, sep) => str(s).split(sep ? new RegExp(str(sep)) : /\s+/).filter(Boolean)); def("string-join", (l, sep) => seq(l).map(toStr).join(sep ?? "")); def("string-trim", s => str(s).trim());
def("make-string", (n, c) => String.fromCodePoint(c).repeat(n)); def("symbol-name", s => s instanceof Sym ? s.n : isNil(s) ? "nil" : err("Wrong type argument: symbolp")); def("intern", s => sym(str(s)));
def("boundp", pred(s => G.has(s))); def("fboundp", pred(s => FN.has(s)));
function format(f, ...a) { let k = 0; return str(f).replace(/%([-0-9.]*)([sSdcxXf%])/g, (m, w, c) => { if (c === "%") return "%"; const v = a[k++]; return c === "s" ? pr(v, true) : c === "S" ? pr(v) : c === "d" ? String(Math.trunc(num(v))) : c === "c" ? String.fromCodePoint(num(v)) : c === "x" ? num(v).toString(16) : c === "X" ? num(v).toString(16).toUpperCase() : num(v).toFixed(w.includes(".") ? +w.split(".")[1] : 6); }); }
def("format", format); def("format-message", format);
def("message", (f, ...a) => { const s = isNil(f) ? "" : format(f, ...a); messages.push(s); return s; });
def("princ", a => { messages.push(pr(a, true)); return a; }); def("prin1", a => { messages.push(pr(a)); return a; }); def("print", a => { messages.push(pr(a)); return a; });
def("insert", (...a) => { messages.push(a.map(x => typeof x === "number" ? String.fromCodePoint(x) : pr(x, true)).join("")); return NIL; });
def("error", (f, ...a) => err(format(f, ...a))); def("user-error", (f, ...a) => err(format(f, ...a))); def("signal", (s, d) => err(`${pr(s)} ${pr(d)}`));
def("emacs-version", () => "GNU Emacs 30.1 (build 7, x86_64-whimsy-linux-gnu) of 2026-11-04"); def("emacs-uptime", () => `${Math.floor((Date.now() - new Date("2026-11-04T23:00:00Z")) / 864e5)} days`);
def("current-time-string", () => new Date().toString().slice(0, 24)); def("buffer-name", () => cur.buf); def("point", () => 1); def("user-full-name", () => store.get("name", "whimsy")); def("user-login-name", () => "whimsy"); def("system-name", () => "forever");
def("yes-or-no-p", () => T_); def("y-or-n-p", () => T_); def("beep", () => { wisp.el.classList.add("dizzy"); setTimeout(() => wisp.el.classList.remove("dizzy"), 800); return NIL; }); def("ding", () => FN.get(sym("beep"))());
def("load", f => { const p = T.resolve(str(f)); try { evalSource(T.readFile(p)); return T_; } catch (e) { err(`Cannot open load file: No such file or directory, ${str(f)}`); } });
def("kill-emacs", () => { setTimeout(exitEmacs, 50); return NIL; }); def("save-buffers-kill-emacs", () => FN.get(sym("kill-emacs"))()); def("save-buffers-kill-terminal", () => FN.get(sym("kill-emacs"))());
def("doctor", () => { setTimeout(doctor, 50); return NIL; }); def("dunnet", () => { setTimeout(() => T.adventure && T.adventure.start(true), 50); return NIL; });
def("whimsy-seal", w => { T.runLine("seal " + str(w)); return T_; }); def("whimsy-poke", () => { wisp.poke(); return T_; });
def("whimsy-sparkle", (n) => { const r = wisp.el.getBoundingClientRect(); burst(r.left + 20, r.top + 20, typeof n === "number" ? Math.min(n, 200) : 30); return T_; });
def("whimsy-mode", () => { mx("whimsy-mode"); return T_; });
G.set(sym("emacs-version"), "30.1"); G.set(sym("user-full-name"), store.get("name", "whimsy")); G.set(sym("fill-column"), 70); G.set(sym("whimsy-mode"), NIL); G.set(sym("most-positive-fixnum"), 2305843009213693951);
G.set(sym("inhibit-startup-message"), NIL); G.set(sym("ring-bell-function"), NIL); G.set(sym("make-backup-files"), T_); def("fset", (s, f) => { FN.set(s, fnOf(f)); return f; });
def("global-set-key", () => NIL); def("kbd", s => s); def("define-key", () => NIL); def("add-hook", () => NIL); def("use-package", () => NIL); def("package-initialize", () => NIL);

function charRepr(n) { if (n >= 32 && n < 127) return "?" + (n === 92 ? "\\\\" : String.fromCharCode(n)); if (n >= 1 && n <= 26) return "?\\C-" + String.fromCharCode(96 + n); if (n === 0) return "?\\C-@"; if (n === 127) return "?\\C-?"; if (n > 127 && n < 0x110000) return "?" + String.fromCodePoint(n); return null; }
function ielmShow(v) { if (Number.isInteger(v) && Math.abs(v) < 2 ** 53) { const c = v >= 0 ? charRepr(v) : null; return `${v} (#o${v.toString(8)}, #x${v.toString(16)}${c ? ", " + c : ""})`; } return pr(v); }
function evalSource(src) { let r = NIL; for (const f of read(src)) { steps = 0; r = ev(f, null); } return r; }
let evalCount = store.get("elispCount", 0);
function evalString(src, ielm = true) {
  messages = [];
  try {
    const r = evalSource(src);
    evalCount++; store.set("elispCount", evalCount); if (evalCount >= 10) award("ielm10");
    if (typeof r === "string" && r === "willow") award("willow");
    return (messages.length ? messages.join("\n") + "\n" : "") + (ielm ? ielmShow(r) : pr(r));
  } catch (e) {
    if (e instanceof LispError) { award("elisperror"); return (messages.length ? messages.join("\n") + "\n" : "") + `*** Eval error ***  ${e.m}`; }
    throw e;
  }
}

/* =================== Emacs mode =================== */
const cur = { buf: "*scratch*", file: null, major: "Lisp Interaction", text: null, pending: "" };
const EMACS = {
  name: "emacs",
  prompt: () => cur.pending ? "  " : "ELISP>",
  title: () => `GNU Emacs: ${cur.buf}`,
  modeline: () => `-UUU:**--F1  ${cur.buf.padEnd(18)} All L${cur.pending ? cur.pending.split("\n").length + 1 : 1}    (${cur.major}${cur.major === "Lisp Interaction" ? " ElDoc" : ""})  ✦ whimsy`,
  line(l) {
    const src = cur.pending ? cur.pending + "\n" + l : l;
    if (!src.trim()) return;
    if (!cur.pending && /^M-x\s+/i.test(src.trim())) { award("mx"); mx(src.trim().replace(/^M-x\s+/i, "")); return; }
    if (!cur.pending && /^C-x C-c$/i.test(src.trim())) { exitEmacs(); return; }
    if (!cur.pending && /^(exit|quit|ls|cd|help|q|:q!?)$/.test(src.trim())) { print(`You're in Emacs. C-x C-c (or (kill-emacs)) takes you back to the shell. M-x for commands.`, "dim"); return; }
    if (!balanced(src)) { cur.pending = src; T.refresh(); return; }
    cur.pending = ""; T.refresh();
    const r = evalString(src);
    print(r, r.startsWith("*** Eval error") ? "err" : "elisp");
  },
  evalLast(v) { if (v.trim()) print(evalString(v, false), "elisp"); },
  cxcc() { exitEmacs(); },
  cg() { cur.pending = ""; T.refresh(); },
  key(e) {
    if (e.ctrlKey && e.key.toLowerCase() === "h") { helpPrefix = true; print("C-h- (t: tutorial, f: describe-function, k: describe-key, ?: help)", "dim"); return true; }
    if (helpPrefix) { helpPrefix = false; const k = e.key; if (k === "t") mx("help-with-tutorial"); else if (k === "f") ask("Describe function: ", false, f => mx("describe-function " + f)); else if (k === "k") print("Describe key: every key here is bound to whimsy.", "dim"); else print("C-h t for the tutorial. C-x C-c to quit. M-x for everything else.", "dim"); return true; }
    return false;
  },
};
let helpPrefix = false;
function startEmacs(file) {
  award("emacs");
  if (T.mode().name !== "emacs") T.push(EMACS);
  if (file) return findFile(file);
  cur.buf = "*scratch*"; cur.file = null; cur.major = "Lisp Interaction";
  print(html(`<span class="emacs-splash">GNU Emacs 30.1 (WhimsyOS build)
Copyright (C) 2026 Free Software Foundation, Inc. and one wisp.
<span class="dim">;; This buffer is for text that is not saved, and for Lisp evaluation.
;; Type a form and press RET to evaluate it, ielm-style.  C-x C-c to quit.
;; M-x (Alt+x) runs commands: try doctor, butterfly, zone, snake, magit-status, org-agenda.</span></span>`));
  T.refresh();
}
function findFile(p) {
  if (T.mode().name !== "emacs") { award("emacs"); T.push(EMACS); }
  let text;
  try { text = T.readFile(p); } catch (e) { print(`${String(e)}`, "err"); return; }
  cur.file = p; cur.buf = p.split("/").pop(); cur.text = text;
  cur.major = p.endsWith(".el") ? "Emacs-Lisp" : p.endsWith(".org") ? "Org" : p.endsWith(".b64") ? "Fundamental" : "Text";
  print(html(`<div class="ebuf">${text.split("\n").map((l, k) => `<span class="lnum">${String(k + 1).padStart(3)}</span> ${cur.major === "Emacs-Lisp" ? lispColor(l) : cur.major === "Org" ? orgColor(l) : esc(l)}`).join("\n")}</div><span class="dim">${esc(cur.buf)} is open. ${cur.major === "Emacs-Lisp" ? "M-x eval-buffer evaluates it. " : ""}C-x C-c quits.</span>`));
  T.refresh();
}
// colour one raw line of Lisp: find the comment outside strings, then escape each part before wrapping it
function lispColor(l) {
  let inStr = false, cut = -1;
  for (let i = 0; i < l.length; i++) { const c = l[i]; if (c === "\\") { i++; continue; } if (c === '"') inStr = !inStr; else if (c === ";" && !inStr) { cut = i; break; } }
  const code = cut < 0 ? l : l.slice(0, cut), comment = cut < 0 ? "" : l.slice(cut);
  const parts = code.split(/("(?:[^"\\]|\\.)*")/);
  const coloured = parts.map((part, k) => k % 2 ? `<span class="st">${esc(part)}</span>` : esc(part).replace(/(\(def(?:un|var|const|custom|macro)) ([\w-]+)/, '$1 <span class="fn">$2</span>')).join("");
  return coloured + (comment ? `<span class="cm">${esc(comment)}</span>` : "");
}
const orgColor = l => /^\*+/.test(l) ? `<span class="fn">${esc(l).replace(/\b(TODO)\b/, '<span class="todo">TODO</span>').replace(/\b(DONE)\b/, '<span class="done">DONE</span>')}</span>` : /^#\+/.test(l) ? `<span class="cm">${esc(l)}</span>` : esc(l);
function exitEmacs() { while (T.mode().name !== "shell" && T.mode().name !== "ask") T.pop(); if (T.mode().name === "ask") T.pop(); award("cleanexit"); print("Process emacs finished. (Grumbolt sheds a single tear.)", "dim"); }

/* =================== M-x =================== */
const MX = {
  "doctor": () => doctor(),
  "dunnet": () => { print("This isn't quite the dunnet you remember. It's... whimsier.", "dim"); T.adventure && T.adventure.start(true); },
  "butterfly": () => ask("Do you really want to unleash the powers of the butterfly? (yes or no) ", false, a => {
    if (!/^y(es)?$/i.test(a.trim())) { print("Your fingers are not ready.", "dim"); return; }
    const B = ["   \\   /\n    \\ /\n  ( o o )\n    / \\", "   \\ | /\n    \\|/\n  ( o o )\n    /|\\", "    \\ /\n   --*--\n  ( o o )\n    / \\"];
    const frames = []; for (let k = 0; k < 18; k++) frames.push(B[k % 3] + "\n\n" + "Amazing physics going on" + ".".repeat(k % 4));
    animate(frames, 160, () => { print("Successfully flipped one bit!", "hl"); award("butterfly"); wisp.talk("> real programmers use butterflies. (xkcd 378)", 3500); });
  }),
  "zone": () => { award("zone"); zone(); print("The page is zoning out. Press any key to bring it back.", "dim"); },
  "snake": () => snake(),
  "tetris": () => print("tetris: the blocks are on a weekly raid lockout. Try M-x snake.", "dim"),
  "pong": () => print("pong: the other paddle is AFK. Try M-x snake.", "dim"),
  "gomoku": () => print("gomoku: the wisp always wins. It's best not to.", "dim"),
  "life": () => life(),
  "hanoi": () => hanoi(),
  "version": () => print(FN.get(sym("emacs-version"))()), "emacs-version": () => print(FN.get(sym("emacs-version"))()),
  "emacs-uptime": () => print(FN.get(sym("emacs-uptime"))()),
  "eval-buffer": () => { if (!cur.file || !cur.file.endsWith(".el")) { print("eval-buffer: nothing to evaluate here. Open a .el file first (emacs ~/.emacs.d/init.el, or C-x C-f).", "dim"); return; } try { messages = []; evalSource(cur.text); print(`${messages.length ? messages.join("\n") + "\n" : ""}Evaluated ${cur.buf}. Its functions are defined now.`, "elisp"); award("evalbuffer"); } catch (e) { print(`*** Eval error ***  ${e.m || e}`, "err"); } },
  "find-file": a => a ? findFile(T.resolve(a)) : ask("Find file: ~/", false, f => findFile(T.resolve("~/" + f))),
  "ielm": () => startEmacs(), "emacs": () => startEmacs(), "scratch-buffer": () => startEmacs(),
  "eshell": () => { exitEmacs(); print("You're already in a shell. It's shells all the way down.", "dim"); }, "shell": () => MX.eshell(), "term": () => MX.eshell(), "ansi-term": () => MX.eshell(), "vterm": () => MX.eshell(),
  "kill-emacs": () => exitEmacs(), "save-buffers-kill-terminal": () => exitEmacs(), "save-buffers-kill-emacs": () => exitEmacs(),
  "org-agenda": () => { award("orgagenda"); const s = T.sealsFound().length, d = Math.max(0, Math.ceil((new Date("2026-12-09T08:00:00Z") - Date.now()) / 864e5)); print(html(`<span class="fn">Week-agenda (W47):</span>
${esc(new Date().toDateString())}
  notes:      <span class="todo">TODO</span> Find my seven seals [${s}/7]
  saltshaker: <span class="todo">TODO</span> Read Blizzard's hotfix notes before raid
  grumbolt:   <span class="todo">TODO</span> Remove vim from the box           :forever:
  sprinkles:  <span class="todo">TODO</span> Ask if it's raid night           (x15)
Wed  9 December 2026
  raid:       Scheduled:  <span class="hl">RAID NIGHT</span> Barrow Deeps, Hyjal Summit, Onyxia  (in ${d} d.)
  grumbolt:   Deadline:   Repair. Flasks. Food. No excuses.`)); },
  "calendar": () => T.runLine("cal 12 2026"),
  "phases-of-moon": () => phases(), "lunar-phases": () => phases(),
  "list-packages": () => print(`  Package         Version  Status      Description
  magit           4.1      installed   it's magit. obviously
  org             9.7      built-in    life, organised
  whimsy-mode     ∞        available   a minor mode for major whimsy
  wisp-mode       7.0      dependency  required by whimsy-mode
  doctor          1.0      built-in    talk to someone
  evil-mode       1.15     <span>forbidden</span>   Grumbolt: "over my dead body"
  vim-mode        -        not found   ...`),
  "package-install": a => { const p = (a || "").trim(); if (/evil|vim/.test(p)) return MX["evil-mode"](); if (/whimsy/.test(p)) { print("Package ‘whimsy-mode’ installed. Try M-x whimsy-mode."); return; } print(p ? `Package ‘${p}’ is unavailable (the box is offline). magit is already installed, though.` : "Install package: (try whimsy-mode)"); },
  "whimsy-mode": () => { const on = !store.get("whimsyMode", false); store.set("whimsyMode", on); award("whimsymode"); if (on) { fx.shower(90); wisp.talk("> whimsy-mode enabled. it was always enabled. now it's MORE enabled.", 3500); } print(`Whimsy mode ${on ? "enabled" : "disabled (but only on paper)"} in current buffer`); },
  "evil-mode": () => { award("evil"); wisp.talk("> ...", 1500); print("evil-mode: Grumbolt has disabled this command. Repent, and use C-n like a civilised person.", "err"); },
  "magit-status": () => { award("magit"); print(html(`<span class="fn">Head:</span>     main Whimsymaxxing: hidden terminal, seven lost motes
<span class="fn">Merge:</span>    origin/forever

<span class="fn">Unstaged changes (1)</span>
modified   wisp.el   (+7 seals, -0 vim)

<span class="fn">Recent commits</span>
7777777 hide the seals. I'll definitely remember where.
4242424 remove vim. again.
1121121 fix: jumper cables (attempt 47)
<span class="dim">s to stage, c c to commit, P p to push. (this is a museum piece; none of those work)</span>`)); },
  "magit": () => MX["magit-status"](),
  "dired": () => T.runLine("ls -la ~"),
  "describe-function": a => { const f = (a || "").trim(); const D = { "whimsy--third-seal": "whimsy--third-seal is a Lisp function in ‘init.el’.\n\n(whimsy--third-seal)\n\nReturn the third seal. Shifted by one, because I'm clever.\n\n(Defined only after you evaluate Grumbolt's init.el.)", car: "car is a built-in function.\n\nReturn the first element of a list. Grumbolt's favourite.", "doctor": "doctor is an interactive function.\n\nSwitch to a psychotherapist. They're very good. Very patient.", "butterfly": "butterfly is an interactive function.\n\nUse butterflies to flip the desired bit on the drive platter." }; print(D[f] || (FN.has(sym(f)) ? `${f} is a function. It does what it says, mostly.` : `[No match] ${f}`)); },
  "help-with-tutorial": () => { award("tutorial"); print(`Emacs tutorial.  See end for copying conditions.\n\nEmacs commands generally involve the CONTROL key or the META key.\n  C-x C-c   quit (you'll want this one)\n  C-a C-e   start and end of line\n  C-k C-y   kill and yank\n  M-x       anything else\n\nThat's the tutorial. The rest you learn by doing, or by asking Grumbolt at 3am.`); },
  "animate-birthday-present": () => { const name = store.get("name", "raider"); const msg = `Happy raid night, ${name}!`; const frames = []; for (let k = 0; k <= msg.length; k++) frames.push(" ".repeat(Math.max(0, 20 - k)) + msg.slice(0, k) + "\n" + " ".repeat(20) + "✦".repeat(k % 4)); animate(frames, 70, () => { award("birthday"); fx.shower(40); }); },
  "execute-extended-command": () => print("You're already in M-x. M-x within M-x. Very meta. (Alt-x, actually.)", "dim"),
  "doom/reload": () => print("Doom? This is vanilla Emacs. Grumbolt is very proud of you for asking, though.", "dim"),
  "spacemacs/home": () => print("Spacemacs? Evil bindings? In THIS guild?", "err"),
  "whimsy-unlock-vault": () => T.runLine("unlock vault"), "whimsy-seals": () => T.runLine("seals"),
  "whimsy-seal": () => ask("Speak the seal: ", false, w => T.runLine("seal " + w)),
  "keyboard-quit": () => print("Quit", "dim"),
  "undo": () => print("Undo! (there was nothing to undo. the wisp undid itself anyway.)", "dim"),
  "vi-mode": () => MX["evil-mode"](), "viper-mode": () => MX["evil-mode"](),
};
function mx(c) {
  const [name, ...rest] = c.split(/\s+/);
  if (!name) return;
  const f = MX[name] || MX[name.replace(/^whimsy\//, "")];
  if (f) return f(rest.join(" "));
  if (FN.has(sym(name))) { print(evalString(`(${name})`, false), "elisp"); return; }
  const near = Object.keys(MX).filter(k => k.startsWith(name.slice(0, 3)));
  print(`[No match]${near.length ? "  Did you mean: " + near.slice(0, 4).join(", ") : ""}`, "dim");
}
T.runMx = mx;

/* =================== M-x doctor =================== */
const REFLECT = { i: "you", me: "you", my: "your", am: "are", "i'm": "you're", you: "I", your: "my", mine: "yours", myself: "yourself", was: "were" };
const reflect = s => s.toLowerCase().replace(/[.!?]+$/, "").split(/\s+/).map(w => REFLECT[w] || w).join(" ");
const RULES = [
  [/\b(hello|hi|hey|greetings)\b/i, ["Hello. Please, describe your problems. Each time you're finished talking, press RET.", "How do you do? What brings you to see me today?"]],
  [/\bi feel (.+)/i, ["Why do you feel {1}?", "How long have you felt {1}?", "Do you often feel {1} after a raid?"]],
  [/\bi(?: am|'m) (.+)/i, ["Did you come to me because you are {1}?", "How do you feel about being {1}?", "Has being {1} affected your parse?"]],
  [/\bbecause (.+)/i, ["Is that the real reason?", "What other reasons might there be?", "Does {1} explain anything else?"]],
  [/\bmy (mother|father|mom|dad|raid ?leader|gm|guild ?master|guild)\b/i, ["Tell me more about your {1}.", "How do you get along with your {1}?"]],
  [/\bvim\b/i, ["I see. And how long have you been using vim? It's all right. You're safe here.", "Vim. Mm-hm. And do you feel you can... leave it, whenever you want?"]],
  [/\bemacs\b/i, ["Emacs is a wonderful place to be. I live here, after all.", "Emacs is less an editor than a way of life. How is your life?"]],
  [/\b(wipe|wiped|wiping|wipes)\b/i, ["How many wipes does it take before you feel something?", "Do you blame the healers?", "Wipes are just the raid's way of saying 'again'."]],
  [/\b(loot|drop|roll|council)\b/i, ["Do you feel the loot council treats you fairly?", "What would that item mean to you, really?"]],
  [/\bfire\b/i, ["Why do you keep standing in it?", "Is the fire warm? Is that the problem?"]],
  [/\bwhelps?\b/i, ["Many whelps? Handle it. ...I'm sorry. That was unprofessional. Please, go on."]],
  [/\bsalvation\b/i, ["It's gone. Have you accepted that it's gone?", "Grief comes in stages. Threat meters are one of them."]],
  [/\b(seal|seals|vault)\b/i, ["The seals. I sense you are blocked. When you are blocked, try reading something you skipped. Mail. Logs. Notes.", "Seven seals. Seven feelings. Which one is hardest for you?"]],
  [/\bwisp\b/i, ["The wisp speaks very highly of you.", "And how does the wisp make you feel?"]],
  [/\b(sad|depressed|tired|anxious|stressed|lonely)\b/i, ["I'm sorry to hear you're {1}. Have you tried a flask? They persist through death now.", "Being {1} before raid night is very common. Do you have a healer you can talk to?"]],
  [/\bgold|goldbot\b/i, ["Have you considered that the goldbot is also a process? kill -9 might be a form of closure."]],
  [/\?\s*$/, ["Why do you ask?", "What do you think?", "Is that the question you really want answered?"]],
  [/^\s*yes\b/i, ["You seem quite sure.", "I see."]],
  [/^\s*no\b/i, ["Why not?", "Are you saying no just to be negative?"]],
];
const DEFAULT = ["Please go on.", "Tell me more.", "How does that make you feel?", "Is it because of the raid that you say that?", "I see. And what does that tell you?", "Earlier you mentioned {mem}. Shall we return to that?"];
function doctor() {
  let n = 0, mem = "your raid";
  T.push({
    name: "doctor", noHistory: true, prompt: () => ">", title: () => "*doctor*", modeline: () => "-UUU:**--F1  *doctor*          All L1    (Doctor)",
    enter() { print("I am the psychotherapist. Please, describe your problems. Each time you are finished talking, press RET. (Say bye to leave.)", "elisp"); },
    line(l) {
      if (/^\s*(bye|goodbye|quit|exit)\b/i.test(l)) { print("Goodbye. My secretary will send you a bill. (Your bill is one sparkle.)", "elisp"); T.pop(); return; }
      if (!l.trim()) { print("Please say something. Even 'mrglgl' is fine.", "elisp"); return; }
      n++; if (n >= 5) award("therapy");
      const m = l.match(/\bmy ([a-z ]{3,30})/i); if (m) mem = "your " + m[1].trim();
      let reply = null;
      for (const [rx, rs] of RULES) { const mm = l.match(rx); if (mm) { reply = pick(rs).replace("{1}", reflect(mm[1] || "")); break; } }
      if (!reply) reply = pick(DEFAULT).replace("{mem}", mem);
      if (/\bseal|vault/i.test(l)) { const missing = [0, 1, 2, 3, 4, 5, 6].filter(k => !T.sealsFound().includes(k)); if (missing.length) reply += ` (A small voice from the corner adds: "seal ${["I", "II", "III", "IV", "V", "VI", "VII"][missing[0]]}... check ~/notes.org.")`; }
      setTimeout(() => { if (T.mode().name === "doctor") print(reply, "elisp"); }, 250 + rnd(400));
    },
    cxcc() { T.pop(); },
  });
}

/* =================== toys: zone, snake, life, hanoi, phases =================== */
function zone() {
  const nodes = [], tw = document.createTreeWalker($main(), NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeValue.trim().length > 3 && n.parentElement && n.parentElement.offsetParent !== null && !n.parentElement.closest(".console,script,style") ? 1 : 2 });
  while (tw.nextNode() && nodes.length < 400) nodes.push([tw.currentNode, tw.currentNode.nodeValue]);
  const chars = "✦*.~-_=+<>/\\|░▒▓";
  let t = 0;
  const iv = setInterval(() => { t++; for (let k = 0; k < 30; k++) { const [n] = pick(nodes) || []; if (!n) break; const s = n.nodeValue.split(""); const i = rnd(s.length); if (s[i] !== " ") s[i] = pick(chars); n.nodeValue = s.join(""); } if (t > 120) stop(); }, 80);
  const stop = () => { clearInterval(iv); nodes.forEach(([n, v]) => n.nodeValue = v); removeEventListener("keydown", stop); removeEventListener("pointerdown", stop); };
  setTimeout(() => { addEventListener("keydown", stop, { once: true }); addEventListener("pointerdown", stop, { once: true }); }, 300);
}
const $main = () => document.querySelector("main");
function snake() {
  const W = 24, H = 12; let s = [[5, 6], [4, 6], [3, 6]], dir = [1, 0], food = [12, 6], score = 0, dead = false;
  const screen = print(" ", "anim snake");
  const draw = () => { const g = Array.from({ length: H }, () => Array(W).fill(" ")); g[food[1]][food[0]] = "✦"; s.forEach(([x, y], k) => { g[y][x] = k ? "o" : "@"; }); screen.textContent = "┌" + "─".repeat(W) + "┐\n" + g.map(r => "│" + r.join("") + "│").join("\n") + "\n└" + "─".repeat(W) + `┘\n Score: ${score}   (arrows or WASD, q quits. eat the motes ✦)`; T.out.scrollTop = T.out.scrollHeight; };
  const place = () => { do { food = [rnd(W), rnd(H)]; } while (s.some(([x, y]) => x === food[0] && y === food[1])); };
  const tick = setInterval(() => {
    if (dead) return;
    const h = [(s[0][0] + dir[0] + W) % W, (s[0][1] + dir[1] + H) % H];
    if (s.some(([x, y]) => x === h[0] && y === h[1])) { dead = true; end(); return; }
    s.unshift(h);
    if (h[0] === food[0] && h[1] === food[1]) { score++; place(); if (score === 1) award("snake"); if (score >= 10) award("snake10"); } else s.pop();
    draw();
  }, 140);
  const end = () => { clearInterval(tick); T.pop(); print(`Game over. Score: ${score}. ${score >= 10 ? "The wisp is impressed." : "The motes escaped."}`, "dim"); const hs = store.get("snakeHi", 0); if (score > hs) store.set("snakeHi", score); };
  T.push({ name: "snake", noHistory: true, prompt: () => "snake>", title: () => "*Snake*", modeline: () => "-UUU:%%--F1  *Snake*           All      (Snake)", line() {}, key(e) { const k = e.key.toLowerCase(); const D = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }; if (D[k] && !(D[k][0] === -dir[0] && D[k][1] === -dir[1])) { dir = D[k]; return true; } if (k === "q" || (e.ctrlKey && k === "g")) { dead = true; end(); return true; } return true; }, escape() { dead = true; end(); } });
  draw();
}
function life() {
  const W = 34, H = 14; let g = Array.from({ length: H }, () => Array(W).fill(0));
  [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]].forEach(([x, y]) => g[y + 1][x + 1] = 1);                     // a glider
  [[0, 0], [1, 0], [2, 0]].forEach(([x, y]) => g[y + 6][x + 20] = 1);                                    // a blinker
  [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]].forEach(([x, y]) => g[y + 8][x + 8] = 1);                     // an R-pentomino
  const frames = [];
  for (let t = 0; t < 60; t++) {
    frames.push(g.map(r => r.map(c => c ? "✦" : "·").join("")).join("\n") + `\n generation ${t}`);
    g = g.map((r, y) => r.map((c, x) => { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) n += g[(y + dy + H) % H][(x + dx + W) % W]; return n === 3 || (c && n === 2) ? 1 : 0; }));
  }
  animate(frames, 110, () => award("life"));
}
function hanoi() {
  const pegs = [[3, 2, 1], [], []], frames = [];
  const show = () => { const rows = []; for (let lvl = 3; lvl >= 0; lvl--) rows.push(pegs.map(p => { const d = p[lvl]; return d ? ("=".repeat(d * 2 + 1)).padStart(d * 2 + 1 + (3 - d)).padEnd(9) : "    |    "; }).join("  ")); rows.push("=".repeat(31)); frames.push(rows.join("\n")); };
  const mv = (n, a, b, c) => { if (!n) return; mv(n - 1, a, c, b); pegs[c].push(pegs[a].pop()); show(); mv(n - 1, b, a, c); };
  show(); mv(3, 0, 1, 2);
  animate(frames, 420, () => { award("hanoi"); print("Towers of Hanoi: solved in 7 moves. (the wisp's favourite number)", "dim"); });
}
function phases() {
  award("moon");
  const ref = Date.UTC(2000, 0, 6, 18, 14), syn = 29.530588853 * 864e5, names = ["New Moon", "First Quarter Moon", "Full Moon", "Last Quarter Moon"];
  const start = new Date(), outL = [];
  let k = Math.floor((start - ref) / syn * 4);
  for (let i = 0; i < 8; i++, k++) { const t = new Date(ref + k * syn / 4); outL.push(`${t.toDateString()}  ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}  ${names[((k % 4) + 4) % 4]}${t.getMonth() === 11 && Math.abs(t.getDate() - 9) <= 2 ? "   <- near raid night. the whelps are restless" : ""}`); }
  print(outL.join("\n"));
}

/* =================== vim, the trap =================== */
function vim(file) {
  award("vimtrap");
  let insert = false, tries = 0, buf = [];
  const screen = print(" ", "anim vimscreen");
  const draw = () => { screen.textContent = (buf.length ? buf.join("\n") + "\n" : "") + "~\n".repeat(Math.max(1, 8 - buf.length)) + (buf.length ? "" : "~              VIM - Vi IMproved\n~              version 9.1 (whimsy)\n~      type  :q<Enter>              to exit\n~\n"); };
  draw();
  T.push({
    name: "vim", noHistory: true, prompt: () => insert ? "" : ":", title: () => `${file || "[No Name]"} - VIM`, modeline: () => insert ? "-- INSERT --" : `"${file || "[No Name]"}" [readonly]`,
    line(l) {
      if (insert) { buf.push(l); draw(); return; }
      const c = l.trim().replace(/^:/, "");
      if (["q!", "qa!", "wq!", "x!", "qall!", "cq"].includes(c)) { T.pop(); award("vimexit"); wisp.talk("> you escaped vim! grumbolt will be thrilled. (he won't. he'll ask why you were in it.)", 3500); print("You have escaped vim. Few do.", "hl"); return; }
      tries++;
      const msg = c === "q" ? "E37: No write since last change (add ! to override)" : c === "wq" || c === "x" || c === "w" ? "E45: 'readonly' option is set (add ! to override)" : c === "help" ? "E149: Sorry, no help for whimsy. (Psst: the ! means you mean it.)" : /emacs/.test(c) ? "E492: Not an editor command: emacs. (you wish)" : c === "i" || c === "a" ? (insert = true, T.refresh(), "") : /^zz$/i.test(c) ? "E37: No write since last change" : `E492: Not an editor command: ${c}`;
      if (msg) print(msg, "err");
      if (tries === 4) wisp.talk("> try :q! ... the ! means you mean it.", 3500);
      if (tries === 8) wisp.talk("> :q! (colon, q, exclamation mark, enter). i believe in you.", 4000);
    },
    key(e) {
      if (e.key === "Escape") { if (insert) { insert = false; T.refresh(); } else print("(you're already in normal mode. or are you.)", "dim"); return true; }
      if (e.ctrlKey && e.key.toLowerCase() === "c") { print("Type  :qa!  and press <Enter> to abandon all changes and exit Vim", "dim"); return true; }
      if (e.ctrlKey && e.key.toLowerCase() === "z") { print("You can't suspend your way out of this.", "dim"); return true; }
      if (e.ctrlKey && e.key.toLowerCase() === "x") { print("C-x? This is vim. Emacs chords don't work here. That's rather the problem.", "dim"); return true; }
      return false;
    },
    escape() {},
  });
}
function ed() {
  award("ed");
  let quitTries = 0;
  T.push({ name: "ed", noHistory: true, prompt: () => "", title: () => "ed", line(l) { const c = l.trim(); if (c === "Q" || (c === "q" && ++quitTries > 1)) { T.pop(); print("(ed is the standard text editor.)", "dim"); return; } print("?", ""); if (c === "h") print("Unknown command (and you'll never know which)", "dim"); }, cxcc() { T.pop(); } });
}

/* =================== hook into the shell =================== */
T.cmd(["emacs", "emacsclient", "xemacs", "remacs"], a => { const f = a.filter(x => !x.startsWith("-"))[0]; if (a.includes("--version") || a.includes("-version")) return FN.get(sym("emacs-version"))(); if (a.includes("--daemon")) return "Starting Emacs daemon. (Grumbolt's is already running. Two daemons. Chaos.)"; startEmacs(f ? T.resolve(f) : null); return ""; });
T.cmd(["vim", "vi", "nvim", "vimtutor", "gvim"], a => { vim(a[0]); return ""; });
T.cmd("ed", () => { ed(); return ""; });
T.cmd(["nano", "pico"], () => "nano? In this economy? (Grumbolt uninstalled it. Try emacs, or don't try vim.)");
T.cmd(["ielm", "elisp", "lisp"], () => { startEmacs(); return ""; });
T.cmd("eval", a => evalString(a.join(" "), false), { hidden: true });
T.emacs = { evalString: s => evalString(s, false), findFile, start: startEmacs, mx };
})();
