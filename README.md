# Terminal Whimsy · Forever Briefing

A guild guide to World of Warcraft: Forever: everything Blizzard has said, every change from Classic that matters to a raid, the new Tier 1 gear, and The Wire, a news feed that refreshes itself.

> **⚠ Looking for the terminal's secrets?**
>
> None of the secrets are in this repository.
>
> ...is what the wisp would say, if the wisp could lie. It can't. The seal words, the passwords and the Vault's key are all in here somewhere. Reading them won't break anything. It will only spoil the hunt for you.
>
> If you want the real thing, close this tab, open the site, and press <kbd>`</kbd>. Start with your mail.

## How it fits together

- `index.html`, `site.css`, `app.js`: the page. Static, no build step for the browser.
- `world.js`: the living world. The sky over the banners follows the visitor's clock, critters wander the banners, a `!` on a tab means something new since your last visit, and the wisp says what you missed. `404.html` is the lost page.
- `data.js`: everything except the news. Built by `python tools/build_data.py` from:
  - `data/src/official.json`: Blizzard's statements (articles, blue posts, hotfixes, interviews)
  - `data/src/changes.json`: changes from Classic, with confidence and sources
  - `data/src/gear.json`: tier sets, crafted pieces and other items
  - `tools/curated.py`: the hand-written parts (must-know list, roadmap, class notes, fixes)
  - `data/src/kb.json` + `data/src/kb/*.md`: the Library's guides (see below)
- `library.js`: the Library, the guild's knowledge base. Each guide is a book on the shelf; opening it shows the steps with tick boxes (saved in the visitor's browser) and a "Copy for Discord" button per part.
- `icons.js`: every icon the page uses, inlined. Built by the same script from `img/icons/`.
- `data/news.json`: The Wire. `tools/fetch_news.py` reads the sources in `tools/feeds.json`, keeps Forever stories, and merges them with the last run.
- `data/hotfixes.json`: the hotfix log. `tools/hotfixes.py` reads Blizzard's hotfix thread on the forums and splits every post into one line per change, with its section, class and developer notes.
- `data/health.json`: when each source last worked. `tools/health_issue.py` opens a GitHub issue (label `wire-health`) when a source fails 3 runs in a row or gives nothing for 2 days, and closes it when they all work again.
- Stories: `tools/stories.py` tags every post by topic and class (word lists in `tools/taxonomy.json`) and groups posts about the same event, headed by Blizzard's own post when there is one.
- `.github/workflows/site.yml`: hourly (GitHub skips some runs), and on every push, runs all of the above, commits `data/` if it changed, and deploys to GitHub Pages.

## Updating

- New Blizzard statement or change: add it to the JSON in `data/src/`, run `python tools/build_data.py`, commit.
- New news source: add it to `tools/feeds.json` and run `python tools/fetch_news.py --dry` to check it.
- New or updated guide: a guide is written as Discord posts, one per part, separated by a line that says `<<<POST>>>`, in `data/src/kb/<name>.md`. Add its details (title, cover, art, sources, the things nobody has confirmed yet) to `data/src/kb.json`, then run `python tools/build_data.py`. The build stops if a part is over Discord's 2,000 characters.
  - Optional tags right after bold or italic text mark it on the site in WoW's own language: `{a}` a quest you pick up (gold !), `{t}` a quest you hand in (gold ?), `{q}` a quest that's only mentioned, `{n}` friendly NPC (green), `{h}` hostile (red, with a raid skull), `{i}` item (`[link]`). For example `accept **Abandoned Hope**{a}`. Each step shows its ! ? and skulls up front. The copy button strips the tags, so the Discord text stays clean.
  - `{i:Name}` marks an item written as plain text (the copy keeps just the name), and `**Requires:** 4x Name, 10x Name` lines become a bag of item slots.
  - Item icons, quality and links: run `python tools/kb_items.py` after adding items. It looks each one up on Wowhead's Forever item search, saves `data/src/kb_items.json` and downloads the icons.
  - NPC maps: run `python tools/kb_places.py` after adding friendly NPCs (`{n}`). It reads their spawns from NorgannonDB (the suite's game database, at `../pfQuest/pfQuest-Forever/addons/NorgannonDB` by default), saves `data/src/kb_places.json` and downloads the zone maps into `img/maps/`. Coordinates after an NPC turn into a map button, and NPC lines get a map card. `kb.json` `places` pins NPCs NorgannonDB doesn't have; `noMap` leaves some out.
  - Quest facts (level, required level, rewards, reputation) come from Wowhead's Forever quest pages, which block scripts, so they're read in a browser and saved as a snapshot; `python tools/kb_quests.py snapshot.json` adds the reward items' icons and stats and writes `data/src/kb_quests.json`. Quest names get a hover card from it, and quests you pick up show their required level.
  - `kb.json` `chains` group a guide's quests (and their items) so readers can skip one: every step and line that's only about a skipped chain greys out and drops out of the step count. `off: true` starts a chain skipped, `tag` and `note` show where the chain first comes up, and the first quest's required level puts it on the "When to start" ladder. `core` lists steps that stay even when their chains are skipped. `tips` add a note to a step (`"at": "4.6"`) or a part (`"at": "p6"`), and `before` is the "Before you go" list.
  - In `kb.json`, an `unsure` note can carry `"at": ["2.5"]` (part, counting from 0, then step number) to show it on that step as well as in the list at the top.
  - A numbered bold line (`**3. Marshal Windsor** ...`) is a step with a tick box, and the bullets under it are its details. A bullet that isn't under a numbered line is a step of its own. A line starting with ⚠️ becomes a raid warning.
  - Tick boxes are saved per step, by part and step number. Renumbering a part's steps resets those ticks for people mid-run, so avoid it once a guide is in use.

## The terminal (spoilers below)

Press ` on the site, or click the green command line on the Briefing page. It's a make-believe Linux box,
whimsy@forever, with a quest called the Seven Seals, an Emacs with a small Lisp, a text adventure, and secret pages.

- `term-core.js`: the shell (files, pipes, ~150 commands, Emacs-style line editing, WoW slash commands, the quest).
- `term-emacs.js`: Emacs: a small Emacs Lisp, `M-x` commands (doctor, butterfly, zone, snake, life, hanoi, magit-status,
  org-agenda...), plus the vim and ed traps.
- `term-adv.js`: the little text adventure (`adventure`, or `M-x dunnet`).
- `secret.js`: secret pages (the Wisp's Vault, Darkmoon Faire, fictional patch notes, credits, graveyard, the Nether 404).
- `term-data.js`: built by `node tools/term/build.mjs` from `tools/term/fs.mjs` (the machine's files) and
  `tools/term/vault.html`. The files are lightly scrambled; the Vault is AES-GCM encrypted with the seven seal words,
  and the seals are checked by hash, so View Source doesn't give the answers away.
- After changing any script or style, run `python tools/stamp.py` so browsers fetch the new version.
- `log.js` + `config.js`: an anonymous log of what people type in the terminal (never passwords), unknown commands,
  errors and secrets found, sent to a Google Sheet. Off until `config.js` has a `logUrl`; setup in `tools/logger/README.md`.
  Players see a notice in the terminal and can turn it off with `privacy off`.

Game art and icons come from the WoW Forever client and are © Blizzard Entertainment. Not affiliated with Blizzard.
