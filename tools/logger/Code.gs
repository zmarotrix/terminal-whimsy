/**
 * Terminal Whimsy log receiver. A Google Apps Script web app bound to a Google Sheet.
 * The site POSTs small batches of events (see log.js); each becomes a row in the "log" tab.
 * Setup: tools/logger/README.md
 */
const SHEET = "log";
const HEADER = ["received", "visitor", "visit", "site version", "page", "time", "kind", "mode", "input / id", "error", "extra", "browser"];
const MAX_ROWS_PER_POST = 50;

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const events = (data.events || []).slice(0, MAX_ROWS_PER_POST);
    if (!events.length) return ContentService.createTextOutput("empty");
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sh = book.getSheetByName(SHEET) || book.insertSheet(SHEET);
    if (sh.getLastRow() === 0) { sh.appendRow(HEADER); sh.setFrozenRows(1); }
    const clip = (v, n) => String(v == null ? "" : v).slice(0, n || 500);
    const rows = events.map(ev => {
      const extra = Object.keys(ev).filter(k => ["t", "kind", "mode", "line", "id", "err"].indexOf(k) < 0).map(k => k + "=" + clip(ev[k], 80)).join(" ");
      // a leading = + - @ would turn a cell into a formula: neutralise it
      const safe = v => /^[=+\-@]/.test(v) ? "'" + v : v;
      return [new Date(), clip(data.vid, 20), clip(data.sid, 12), clip(data.v, 12), clip(data.page, 30), clip(ev.t, 30), clip(ev.kind, 20),
              clip(ev.mode, 20), safe(clip(ev.line || ev.id)), safe(clip(ev.err)), safe(clip(extra, 300)), clip(data.ua, 160)];
    });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADER.length).setValues(rows);
    return ContentService.createTextOutput("ok");
  } catch (err) {
    return ContentService.createTextOutput("error: " + err);
  } finally {
    lock.releaseLock();
  }
}

// Visiting the URL in a browser shows this, so you can check the deployment works.
function doGet() {
  return ContentService.createTextOutput("Terminal Whimsy log receiver is running. (It only accepts POSTs from the site.)");
}
