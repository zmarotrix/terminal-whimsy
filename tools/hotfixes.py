"""Split Blizzard's WoW: Forever hotfix posts into one line per change.

Blizzard keeps a running forum thread ("WoW: Forever Hotfixes - <date>") where a community manager adds one post per
hotfix day. Each post is structured HTML:  <p><strong>November 13, 2026</strong></p>, then <p><strong>Classes</strong></p>
and nested <ul><li><strong>Druid</strong><ul><li><strong>Restoration</strong><ul><li>change</li>...
This reads the thread(s) as JSON from the forum, walks that structure, and keeps every leaf <li> as one change with its
path (["Classes", "Druid", "Restoration"]), date, developer notes and the classes it touches.

A post's lines are replaced whole on every run, so Blizzard's edits to a post are picked up.
"""
import hashlib, json, os, re, sys, urllib.request
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from stories import load_taxonomy, tag  # noqa: E402

BASE = "https://us.forums.blizzard.com/en/wow"
UA = "TerminalWhimsyWire/1.0 (+https://github.com/zmarotrix/terminal-whimsy)"
SEED_TOPICS = [2403040]                 # the launch hotfix thread
FOREVER_CATS = {346, 347, 348, 349, 352}
CLASSES = ["warrior", "paladin", "hunter", "rogue", "priest", "shaman", "mage", "warlock", "druid"]
DATE_RX = re.compile(r"^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},\s+\d{4}$", re.I)


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read())


# ---------- HTML -> a small tree ----------
class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = {"tag": "root", "kids": [], "text": ""}
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        if tag in ("p", "ul", "ol", "li", "strong", "em", "b", "i", "br"):
            if tag == "br":
                self.stack[-1]["kids"].append({"tag": "#text", "text": " "})
                return
            node = {"tag": tag, "kids": []}
            self.stack[-1]["kids"].append(node)
            self.stack.append(node)

    def handle_endtag(self, tag):
        for k in range(len(self.stack) - 1, 0, -1):
            if self.stack[k]["tag"] == tag:
                del self.stack[k:]
                break

    def handle_data(self, data):
        self.stack[-1]["kids"].append({"tag": "#text", "text": data})


def text(n, skip_lists=True):
    if n["tag"] == "#text":
        return n["text"]
    if skip_lists and n["tag"] in ("ul", "ol"):
        return ""
    return "".join(text(k, skip_lists) for k in n.get("kids", []))


def clean(s):
    return re.sub(r"\s+", " ", s).strip()


def is_heading(li):
    """an <li> whose own text is just a <strong> label, followed by a nested list"""
    own = [k for k in li["kids"] if not (k["tag"] == "#text" and not k["text"].strip()) and k["tag"] not in ("ul", "ol")]
    return len(own) == 1 and own[0]["tag"] in ("strong", "b") and any(k["tag"] in ("ul", "ol") for k in li["kids"])


def is_note(s):
    return s.lower().startswith(("developers", "developer's", "developer note", "dev note"))


def walk_list(ul, path, out, date):
    last = None
    for li in (k for k in ul["kids"] if k["tag"] == "li"):
        own = clean(text(li))
        subs = [k for k in li["kids"] if k["tag"] in ("ul", "ol")]
        if is_heading(li):
            for s in subs:
                walk_list(s, path + [own], out, date)
            last = None
            continue
        if own and is_note(own):
            if last is not None:
                last["note"] = (last.get("note", "") + " " + own).strip()
            continue
        if own:
            last = {"path": path, "text": own, "date": date}
            out.append(last)
        for s in subs:   # a change with notes or sub-points under it
            for sub in (k for k in s["kids"] if k["tag"] == "li"):
                st = clean(text(sub, skip_lists=False))
                if not st:
                    continue
                if is_note(st) and last is not None:
                    last["note"] = (last.get("note", "") + " " + st).strip()
                elif last is not None:
                    last.setdefault("subs", []).append(st)
                else:
                    out.append({"path": path, "text": st, "date": date})


def parse_post(html, fallback_date):
    t = Tree(); t.feed(html)
    out, date, section = [], fallback_date, []
    for n in t.root["kids"]:
        if n["tag"] == "p":
            s = clean(text(n))
            if DATE_RX.match(s):
                date = s
            elif s and len(s) < 60 and all(k["tag"] in ("strong", "b") or (k["tag"] == "#text" and not k["text"].strip()) for k in n["kids"]):
                section = [s]
            elif s:   # a plain paragraph: an intro or a lone change
                if not s.lower().startswith(("here you will find", "here you'll find")):
                    out.append({"path": section, "text": s, "date": date, "intro": not section})
        elif n["tag"] in ("ul", "ol"):
            walk_list(n, section, out, date)
    return out


# ---------- fetch ----------
def discover_topics():
    """hotfix threads Blizzard staff posted in, in the Forever forums"""
    found = set()
    try:
        for p in get_json(BASE + "/groups/blizzard-tracker/posts.json").get("posts", []):
            if int(p.get("category_id") or 0) in FOREVER_CATS and re.search(r"\bhotfix", p.get("topic_title", ""), re.I):
                found.add(int(p["topic_id"]))
    except Exception as e:
        print("  ! hotfix discovery: %s" % e, file=sys.stderr)
    return found


def fetch_topic(tid):
    t = get_json("%s/t/%d.json" % (BASE, tid))
    posts = t["post_stream"]["posts"]
    have = {p["id"] for p in posts}
    rest = [i for i in t["post_stream"]["stream"] if i not in have]
    for k in range(0, len(rest), 20):
        q = "&".join("post_ids[]=%d" % i for i in rest[k:k + 20])
        posts += get_json("%s/t/%d/posts.json?%s" % (BASE, tid, q))["post_stream"]["posts"]
    return t, posts


def to_iso_day(s, fallback):
    from datetime import datetime
    try:
        return datetime.strptime(s, "%B %d, %Y").strftime("%Y-%m-%d")
    except (TypeError, ValueError):
        return fallback[:10]


def run(path_out):
    try:
        doc = json.load(open(path_out, encoding="utf-8"))
    except (OSError, ValueError):
        doc = {"topics": SEED_TOPICS, "lines": []}
    topics = sorted(set(doc.get("topics", [])) | set(SEED_TOPICS) | discover_topics())
    tax = load_taxonomy()
    lines_by_post = {}
    for l in doc.get("lines", []):
        lines_by_post.setdefault(l["post"], []).append(l)
    ok = 0
    for tid in topics:
        try:
            t, posts = fetch_topic(tid)
        except Exception as e:
            print("  ! hotfix topic %d: %s" % (tid, e), file=sys.stderr)
            continue
        ok += 1
        for p in posts:
            if not p.get("staff") or not p.get("cooked"):
                continue
            key = "%d/%d" % (tid, p["post_number"])
            new = []
            for k, e in enumerate(parse_post(p["cooked"], None)):
                if e.get("intro"):
                    continue
                day = to_iso_day(e["date"], p["created_at"])
                path = e["path"]
                if path and path[0].lower() in CLASSES:      # a post headed just "Shaman"
                    path = ["Classes"] + path
                low = [x.lower() for x in path]
                classes = [c for c in CLASSES if c in low] or tag(e["text"], tax)[1]
                line = {"id": hashlib.sha1((key + e["text"]).encode()).hexdigest()[:12], "post": key, "date": day,
                        "posted": p["created_at"], "path": path, "text": e["text"],
                        "url": "%s/t/%s/%d/%d" % (BASE, t.get("slug", "-"), tid, p["post_number"]),
                        "classes": classes, "area": path[0] if path else "General", "who": p.get("username")}
                for f in ("note", "subs"):
                    if e.get(f):
                        line[f] = e[f]
                new.append(line)
            if new:
                lines_by_post[key] = new
        print("  hotfix thread %-8d %3d posts" % (tid, len(posts)))
    if ok == 0:
        print("  ! every hotfix thread failed: keeping the old hotfix log", file=sys.stderr)
        return False
    # the thread's first post is edited to repeat every day's changes: keep each line once, from its own day's post
    best = {}
    for l in (l for v in lines_by_post.values() for l in v):
        k = (l["date"], l["text"])
        if k not in best or int(l["post"].split("/")[1]) > int(best[k]["post"].split("/")[1]):
            best[k] = l
    lines = sorted(best.values(), key=lambda l: (l["date"], l["posted"]), reverse=True)
    out = {"topics": topics, "lines": lines}
    old = json.dumps(doc, sort_keys=True)
    if json.dumps(out, sort_keys=True) != old:
        with open(path_out, "w", encoding="utf-8", newline="\n") as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
            f.write("\n")
    print("  hotfix log: %d changes over %d days" % (len(lines), len({l['date'] for l in lines})))
    return True


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "data", "hotfixes.json"))
