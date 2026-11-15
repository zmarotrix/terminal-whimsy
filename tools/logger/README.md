# The terminal's log

The site can keep an anonymous log of what people type in the hidden terminal, which commands it didn't understand,
errors (in the terminal and anywhere on the page), and which secrets people find. It lands in a Google Sheet you own.
Nothing is sent until `config.js` has a `logUrl`.

What's never logged: anything typed at a password prompt. Players see a one-line notice the first time they open the
terminal, can read the details with `privacy`, and can switch it off with `privacy off`. Browsers with Do Not Track on
are off by default.

## Set it up (about five minutes, free)

1. Create a new Google Sheet, for example "Terminal Whimsy log".
2. In the sheet: **Extensions > Apps Script**. Delete what's there, paste in `Code.gs` from this folder, and save.
3. **Deploy > New deployment**. Click the gear next to "Select type" and choose **Web app**.
   - Description: anything
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, approve the permissions it asks for (it only needs this one sheet), and copy the **Web app URL**.
   It ends in `/exec`.
5. Open that URL in a browser: it should say "Terminal Whimsy log receiver is running."
6. Put the URL in `config.js` as `logUrl`, run `python tools/stamp.py`, commit, and push.

Rows appear in the sheet's `log` tab within about 15 seconds of someone typing. Columns: when it arrived, a random
visitor id, the visit, the site version, which page, the event time, the kind of event, the terminal mode, what was
typed (or which achievement), any error, a few extra details, and the browser.

Kinds of event: `input` (a line typed), `notfound` (a command the shell didn't know), `cmderror` and `jserror`
(something broke), `elisperror`, `advunknown` (a verb the adventure didn't understand), `password` (a password prompt
was answered; never what was typed), and `found` (an achievement earned).

## Notes

- The URL is public in the site's code, so anyone could post junk to it. It's a guild site; if that ever happens,
  make a new deployment (new URL) and update `config.js`.
- To stop logging entirely, set `logUrl` back to `""`.
