# Terminal Whimsy · Forever Briefing

A guild guide to World of Warcraft: Forever: everything Blizzard has said, every change from Classic that matters to a raid, the new Tier 1 gear, and The Wire, a news feed that refreshes itself.

## How it fits together

- `index.html`, `site.css`, `app.js`: the page. Static, no build step for the browser.
- `data.js`: everything except the news. Built by `python tools/build_data.py` from:
  - `data/src/official.json`: Blizzard's statements (articles, blue posts, hotfixes, interviews)
  - `data/src/changes.json`: changes from Classic, with confidence and sources
  - `data/src/gear.json`: tier sets, crafted pieces and other items
  - `tools/curated.py`: the hand-written parts (must-know list, roadmap, class notes, fixes)
- `icons.js`: every icon the page uses, inlined. Built by the same script from `img/icons/`.
- `data/news.json`: The Wire. `tools/fetch_news.py` reads the sources in `tools/feeds.json`, keeps Forever stories, and merges them with the last run.
- `.github/workflows/site.yml`: every 3 hours, fetches news, commits `data/news.json` if it changed, and deploys to GitHub Pages.

## Updating

- New Blizzard statement or change: add it to the JSON in `data/src/`, run `python tools/build_data.py`, commit.
- New news source: add it to `tools/feeds.json` and run `python tools/fetch_news.py --dry` to check it.

Game art and icons come from the WoW Forever client and are © Blizzard Entertainment. Not affiliated with Blizzard.
