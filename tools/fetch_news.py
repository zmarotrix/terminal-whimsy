"""Fetch WoW Forever news for The Wire.

Reads tools/feeds.json (the source list), pulls each feed with the standard library only, keeps items that
mention Forever (or every item, for sources that are Forever-only), merges them with the previous news.json,
and writes the newest items. A source that fails is logged and skipped; if every source fails, the old file
is left untouched so the site keeps its last good news.

  python tools/fetch_news.py --out data/news.json [--dry]
"""
import argparse, datetime as dt, email.utils, html, json, os, re, sys, time, urllib.request
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
UA = "TerminalWhimsyWire/1.0 (+https://github.com/zmarotrix/terminal-whimsy)"
KEEP = 220            # items kept in news.json
MAX_AGE_DAYS = 120    # older items drop off
SUMMARY = 260         # characters of summary kept

ATOM = "{http://www.w3.org/2005/Atom}"
MEDIA = "{http://search.yahoo.com/mrss/}"
YT = "{http://www.youtube.com/xml/schemas/2015}"


def get(url, accept="*/*"):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read()


def clean(s, n=SUMMARY):
    s = html.unescape(re.sub(r"<[^>]+>", " ", s or ""))
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= n else s[: n - 1].rsplit(" ", 1)[0] + "…"


def iso(value):
    """Any feed date -> ISO 8601 UTC, or None."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return dt.datetime.fromtimestamp(value / (1000 if value > 1e11 else 1), dt.timezone.utc).isoformat().replace("+00:00", "Z")
    v = str(value).strip()
    try:
        d = email.utils.parsedate_to_datetime(v)
    except (TypeError, ValueError):
        try:
            d = dt.datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")


# ---------- parsers: each returns [{title, url, date, summary, who?}] ----------

def p_rss(raw, src):
    root = ET.fromstring(raw)
    out = []
    for it in root.iter("item"):
        title = re.sub(r"\s+[—–-]\s+World of Warcraft\s+[—–-]\s+Blizzard News$", "", clean(it.findtext("title"), 220))
        pub = it.find("source")                      # Google News: the publisher
        who = clean(it.findtext("{http://purl.org/dc/elements/1.1/}creator"), 60) or None
        summary = clean(it.findtext("description"))
        if pub is not None and pub.text:
            who = pub.text.strip()
            if title.endswith(" - " + who):
                title = title[: -len(who) - 3]
            summary = ""                             # Google's description only repeats the title
            if any(h in (pub.get("url") or "") for h in src.get("skipPublishers", [])):
                continue
        out.append(dict(title=title, url=(it.findtext("link") or "").strip(),
                        date=iso(it.findtext("pubDate") or it.findtext("{http://purl.org/dc/elements/1.1/}date")),
                        summary=summary, who=who, cats=[c.text or "" for c in it.findall("category")]))
    for e in root.iter(ATOM + "entry"):
        link = e.find(ATOM + "link[@rel='alternate']") or e.find(ATOM + "link")
        summ = e.findtext(ATOM + "summary") or e.findtext(ATOM + "content") or e.findtext(MEDIA + "group/" + MEDIA + "description")
        out.append(dict(title=clean(e.findtext(ATOM + "title"), 200), url=link.get("href") if link is not None else "",
                        date=iso(e.findtext(ATOM + "published") or e.findtext(ATOM + "updated")),
                        summary=clean(summ), who=clean(e.findtext(ATOM + "author/" + ATOM + "name"), 60) or None))
    return out


def p_reddit(raw, src):
    out = []
    for c in json.loads(raw)["data"]["children"]:
        d = c["data"]
        if d.get("stickied") and src.get("skipSticky"):
            continue
        out.append(dict(title=clean(d["title"], 200), url="https://www.reddit.com" + d["permalink"],
                        date=iso(d["created_utc"]), summary=clean(d.get("selftext")), who="u/" + d.get("author", ""),
                        score=d.get("score", 0), flair=d.get("link_flair_text")))
    return out


def p_bluesky(raw, src):
    out = []
    for f in json.loads(raw).get("feed", []):
        p = f["post"]
        if f.get("reason"):           # reposts of other accounts: skip
            continue
        rec = p["record"]
        rkey = p["uri"].rsplit("/", 1)[-1]
        text = rec.get("text", "")
        out.append(dict(title=clean(text, 140) or "(post)", url="https://bsky.app/profile/%s/post/%s" % (p["author"]["handle"], rkey),
                        date=iso(rec.get("createdAt")), summary=clean(text) if len(text) > 140 else "",
                        who="@" + p["author"]["handle"]))
    return out


def p_discourse(raw, src):
    """Discourse topic list (/c/..../l/latest.json, /latest.json) or posts list (groups/.../posts.json)."""
    j = json.loads(raw)
    base = src["base"].rstrip("/")
    out = []
    if isinstance(j, list) or "posts" in j or "latest_posts" in j:   # posts endpoints
        posts = j if isinstance(j, list) else j.get("posts") or j.get("latest_posts") or []
        cats, title_cats = set(src.get("cats", [])), set(src.get("catsIfTitle", []))
        for p in posts:
            cat = int(p.get("category_id") or 0)
            title = p.get("topic_title") or p.get("title") or ""
            if cats and cat not in cats and not (cat in title_cats and "forever" in title.lower()):
                continue
            slug, tid = p.get("slug") or p.get("topic_slug"), p.get("topic_id")
            if int(p.get("post_number") or 1) > 1:     # a blue reply inside a player thread
                title = "Blizzard replied in “%s”" % title
            out.append(dict(title=clean(title, 200), url="%s/t/%s/%s/%s" % (base, slug, tid, p.get("post_number", 1)),
                            date=iso(p.get("created_at")), summary=clean(p.get("excerpt") or p.get("raw") or p.get("cooked")),
                            who=(p.get("username") or p.get("name") or "") + (" (%s)" % p["user_title"] if p.get("user_title") else ""),
                            topic=tid))
        return out
    for t in j.get("topic_list", {}).get("topics", []):
        out.append(dict(title=clean(t["title"], 200), url="%s/t/%s/%s" % (base, t["slug"], t["id"]),
                        date=iso(t.get("created_at")), summary=clean(t.get("excerpt"))))
    return out


def p_blizzard(raw, src):
    """news.blizzard.com blog list JSON (shape found by tools/feeds.json 'paths')."""
    j = json.loads(raw)
    items = j
    for k in src.get("listPath", []):
        items = items[k]
    out = []
    for a in items:
        g = lambda path: _dig(a, path)
        url = g(src["fields"]["url"]) or ""
        if url.startswith("/"):
            url = "https://news.blizzard.com" + url
        out.append(dict(title=clean(g(src["fields"]["title"]), 200), url=url, date=iso(g(src["fields"]["date"])),
                        summary=clean(g(src["fields"].get("summary", "")))))
    return out


def _dig(o, path):
    for k in str(path).split("."):
        if not k:
            continue
        if isinstance(o, list):
            o = o[int(k)] if k.isdigit() and int(k) < len(o) else None
        elif isinstance(o, dict):
            o = o.get(k)
        else:
            return None
    return o


PARSERS = {"rss": p_rss, "atom": p_rss, "reddit": p_reddit, "bluesky": p_bluesky, "discourse": p_discourse, "blizzard": p_blizzard}


def matches(item, src):
    if src.get("category") and src["category"] not in item.get("cats", []):
        return False
    if src.get("linkContains") and src["linkContains"] not in item["url"]:
        return False
    if src.get("all"):
        return True
    text = (item["title"] + " " + (item.get("summary") or "")).lower()
    words = src.get("match") or ["wow forever", "wow: forever", "warcraft: forever", "warcraft forever", "#wowforever", "wowforever"]
    if not any(w in text for w in words):
        return False
    return not any(w in text for w in src.get("exclude", []))


def fetch_all(feeds):
    got, ok = [], 0
    for src in feeds:
        if src.get("off"):
            continue
        try:
            raw = get(src["url"].replace("{days}", "7"), "application/json" if src["type"] in ("reddit", "bluesky", "discourse", "blizzard") else "application/rss+xml, application/atom+xml, application/xml, text/xml")
            items = PARSERS[src["type"]](raw, src)
            ok += 1
        except Exception as e:  # one bad source never stops the rest
            print("  ! %-28s %s" % (src["name"], e), file=sys.stderr)
            continue
        kept, seen_topics = 0, set()
        items.sort(key=lambda i: i.get("date") or "")          # first post of a thread wins
        for it in items:
            if not it.get("url") or not it.get("title") or not it.get("date"):
                continue
            if src["type"] == "reddit" and it.get("score", 0) < src.get("minScore", 0):
                continue
            if not matches(it, src):
                continue
            it.update(source=src["name"], label=src["label"])
            if src.get("icon"):
                it["icon"] = src["icon"]
            if src["type"] == "discourse" and src.get("onePerTopic"):
                if it.get("topic") in seen_topics:
                    continue
                seen_topics.add(it.get("topic"))
            for k in ("score", "flair", "cats", "topic"):
                it.pop(k, None)
            if not it.get("who"):
                it.pop("who", None)
            if it.get("summary"):                    # Reddit's RSS footer
                it["summary"] = re.sub(r"\s*submitted by\s+/u/\S+.*$", "", it["summary"]).strip()
            if not it.get("summary"):
                it.pop("summary", None)
            got.append(it)
            kept += 1
        print("  %-30s %3d fetched, %3d kept" % (src["name"], len(items), kept))
        time.sleep(1)
    return got, ok


def norm_url(u):
    return re.sub(r"[?#].*$", "", u).rstrip("/").lower()


MONTHS = r"(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)"


def title_key(t):
    """Same story, different region or date style: 'X - November 14' == 'X -15 November'."""
    t = re.sub(MONTHS, " ", t.lower())
    t = re.sub(r"(wow|world of warcraft)\s*:?\s*forever", " ", t)
    return re.sub(r"[^a-z]+", "", t)[:70]


def merge(old, new, feeds):
    order = {f["name"]: k for k, f in enumerate(feeds)}
    caps = {f["name"]: f.get("cap", 60) for f in feeds}
    by, first = {}, {norm_url(i["url"]): i["date"] for i in old}
    for it in old + new:                       # new wins over old for the same URL...
        if it["source"] in order:
            k = norm_url(it["url"])
            if k in first:                     # ...but keeps the date we first saw (Google News re-dates stories)
                it = dict(it, date=min(first[k], it["date"]))
            by[k] = it
    # same headline from two places: keep the official one, then the source listed first, then the earliest
    seen, out, per = {}, [], {}
    rank = {"official": 0, "social": 1, "press": 2, "community": 3}
    for it in sorted(by.values(), key=lambda i: (rank.get(i["label"], 9), order[i["source"]], i["date"])):
        k = title_key(it["title"])
        if k in seen:
            continue
        seen[k] = 1
        out.append(it)
    cut = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=MAX_AGE_DAYS)).isoformat()
    out = [i for i in out if i["date"] >= cut[:19]]
    out.sort(key=lambda i: i["date"], reverse=True)
    capped = []
    for i in out:                              # newest N per source, so one noisy source can't drown the rest
        per[i["source"]] = per.get(i["source"], 0) + 1
        if per[i["source"]] <= caps[i["source"]]:
            capped.append(i)
    return capped[:KEEP]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(HERE, "..", "data", "news.json"))
    ap.add_argument("--feeds", default=os.path.join(HERE, "feeds.json"))
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    feeds = json.load(open(a.feeds, encoding="utf-8"))["feeds"]
    try:
        old = json.load(open(a.out, encoding="utf-8")).get("items", [])
    except (OSError, ValueError):
        old = []
    new, ok = fetch_all(feeds)
    if ok == 0:
        print("every source failed: keeping the old news file", file=sys.stderr)
        return 0
    items = merge(old, new, [f for f in feeds if not f.get("off")])
    doc = {"updated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
           "sources": [f["name"] for f in feeds if not f.get("off")], "items": items}
    print("%d items (%d new since last run) from %d/%d sources" % (len(items), len({norm_url(i["url"]) for i in items} - {norm_url(i["url"]) for i in old}), ok, len([f for f in feeds if not f.get("off")])))
    if not a.dry:
        if [i for i in items] == old:                 # nothing changed: don't churn the timestamp
            return 0
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        with open(a.out, "w", encoding="utf-8", newline="\n") as f:
            json.dump(doc, f, ensure_ascii=False, indent=1)
            f.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
