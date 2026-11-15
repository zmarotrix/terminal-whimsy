/* Terminal Whimsy: an anonymous log of what people try in the hidden terminal, plus page errors, so the guild can
   see what players attempt, where they get stuck, and what breaks.
   - Never logs what's typed at a password prompt.
   - A random visitor id (no names, no accounts). Players can switch it off with: privacy off
   - Respects the browser's Do Not Track setting.
   - Sends nothing until config.js has a logUrl (see tools/logger/README.md). */
(() => {
"use strict";
const CFG = window.TWCFG || {};
const KEY = "tw.";
const get = (k, d) => { try { const v = localStorage.getItem(KEY + k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const set = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch {} };
const dnt = navigator.doNotTrack === "1" || window.doNotTrack === "1";
const enabled = () => !!CFG.logUrl && get("logOptOut", dnt) !== true;
let vid = get("vid", null);
if (!vid) { vid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); set("vid", vid); }
const sid = Math.random().toString(36).slice(2, 8);           // this visit
const ver = ((document.querySelector('script[src*="term-core"]') || {}).src || "").split("v=")[1] || "dev";
let queue = get("logQueue", []), timer = 0, sentThisVisit = 0;
const MAX_PER_VISIT = 400;                                     // a runaway loop shouldn't fill the sheet

function push(kind, data = {}) {
  if (!enabled() || sentThisVisit >= MAX_PER_VISIT) return;
  sentThisVisit++;
  const ev = { t: new Date().toISOString(), kind };
  for (const [k, v] of Object.entries(data)) ev[k] = typeof v === "string" ? v.slice(0, 500) : v;
  queue.push(ev); if (queue.length > 200) queue = queue.slice(-200);
  set("logQueue", queue);
  clearTimeout(timer);
  timer = setTimeout(flush, queue.length >= 15 ? 500 : 15000);
}
function flush(beacon) {
  if (!enabled() || !queue.length) return;
  const batch = queue.splice(0, 50);
  set("logQueue", queue);
  const body = JSON.stringify({ vid, sid, v: ver, page: location.hash || "#brief", ua: navigator.userAgent.slice(0, 160), events: batch });
  try {
    if (beacon && navigator.sendBeacon) { navigator.sendBeacon(CFG.logUrl, new Blob([body], { type: "text/plain" })); return; }
    fetch(CFG.logUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body, keepalive: true })
      .catch(() => { queue = batch.concat(queue).slice(-200); set("logQueue", queue); });   // try again next time
  } catch {}
  if (queue.length) timer = setTimeout(flush, 2000);
}
addEventListener("pagehide", () => flush(true));
addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(true); });
// page errors anywhere on the site (no player input in these)
addEventListener("error", e => push("jserror", { err: `${e.message} @ ${(e.filename || "").split("/").pop()}:${e.lineno}:${e.colno}` }));
addEventListener("unhandledrejection", e => push("jserror", { err: "unhandled: " + String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 400) }));
if (queue.length) setTimeout(flush, 3000);

window.TWLOG = {
  push, flush,
  get on() { return enabled(); },
  get configured() { return !!CFG.logUrl; },
  optOut(off) { set("logOptOut", !!off); if (off) { queue = []; set("logQueue", []); } },
  get vid() { return vid; },
};
})();
