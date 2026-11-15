"""Turn Wire items into stories: tag each item by topic and class, then group items about the same event.

Grouping is plain text similarity (TF-IDF cosine over title and summary words), done greedily in time order,
with guards so it stays conservative:
  * items must be within WINDOW hours of the story's newest item;
  * two items from the same non-community source never join (one site doesn't post one event twice);
  * if both titles name a date ("November 13") and the dates differ, they're different events (weekly hotfix posts).
The lead of a story is Blizzard's own item if there is one, else the earliest from the most official label.
"""
import hashlib, json, math, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
WINDOW = 60 * 3600          # seconds
THRESHOLD = 0.26
RANK = {"official": 0, "social": 1, "press": 2, "community": 3}
MONTHS = "january february march april may june july august september october november december".split()
MON3 = {m[:3]: i + 1 for i, m in enumerate(MONTHS)}
STOP = set("""a an the and or but if of to in on at by for with from into over under about as is are was were be been being it its this
that these those there here what which who whom whose why how when where all any both each few more most other some such no nor not only own
same so than too very can will just should now new also get gets got has have had do does did up out off again further then once i you he she
we they me him her us them my your our their his hers ours theirs yours wow forever world warcraft blizzard game games player players update
updates change changes changed week day today going go one two first last after before still really like via vs com www https http amp""".split())
SYN = {"experience": "xp", "exp": "xp", "hotfixes": "hotfix", "hotfixed": "hotfix", "dungeons": "dungeon", "raids": "raid",
       "nerfed": "nerf", "nerfs": "nerf", "buffed": "buff", "buffs": "buff", "trivial": "grey", "gray": "grey"}


def load_taxonomy():
    t = json.load(open(os.path.join(HERE, "taxonomy.json"), encoding="utf-8"))
    comp = lambda words: re.compile(r"(?<![a-z0-9])(?:%s)(?![a-z0-9])" % "|".join(re.escape(w) for w in sorted(words, key=len, reverse=True)))
    return {"classes": {k: comp(v) for k, v in t["classes"].items()}, "topics": {k: comp(v) for k, v in t["topics"].items()}}


def tag(text, tax):
    s = text.lower()
    return ([k for k, rx in tax["topics"].items() if rx.search(s)], [k for k, rx in tax["classes"].items() if rx.search(s)])


def date_keys(title):
    """'November 13' / '13 November' / 'Nov 13th' -> {'11-13'}"""
    t = title.lower()
    out = set()
    for m in re.finditer(r"\b([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b", t):
        if m.group(1) in MON3:
            out.add("%02d-%02d" % (MON3[m.group(1)], int(m.group(2))))
    for m in re.finditer(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*\b", t):
        if m.group(2) in MON3:
            out.add("%02d-%02d" % (MON3[m.group(2)], int(m.group(1))))
    return out


def words(text):
    out = []
    for w in re.findall(r"[a-z0-9']+", text.lower()):
        w = w.strip("'")
        if w.endswith("'s"):
            w = w[:-2]
        if not w or w in STOP or w in MONTHS or w[:3] in MON3 and len(w) <= 4:
            continue
        if w.isdigit() and (int(w) <= 31 or 1990 <= int(w) <= 2100):
            continue
        w = SYN.get(w, w)
        if len(w) > 4 and w.endswith("s") and not w.endswith("ss"):
            w = w[:-1]
        if len(w) < 2:
            continue
        out.append(w)
    return out


def vec(item, idf):
    c = Counter(words(item["title"]) * 2 + words(item.get("summary", ""))[:40])
    v = {w: n * idf.get(w, 1.0) for w, n in c.items()}
    norm = math.sqrt(sum(x * x for x in v.values())) or 1.0
    return {w: x / norm for w, x in v.items()}


def cos(a, b):
    if len(a) > len(b):
        a, b = b, a
    return sum(x * b.get(w, 0.0) for w, x in a.items())


def ts(d):
    from datetime import datetime
    return datetime.fromisoformat(d.replace("Z", "+00:00")).timestamp()


def build(items, tax=None):
    """items: Wire items (newest first). Returns stories, newest activity first."""
    tax = tax or load_taxonomy()
    for it in items:
        # players' posts ramble: tag them by title only
        text = it["title"] if it["label"] == "community" else it["title"] + " " + it.get("summary", "")
        it["tags"], it["classes"] = tag(text, tax)
    df = Counter()
    docs = [set(words(i["title"] + " " + i.get("summary", ""))) for i in items]
    for d in docs:
        df.update(d)
    n = max(1, len(items))
    idf = {w: math.log((n + 1) / (c + .5)) for w, c in df.items()}
    stories = []
    for it in sorted(items, key=lambda i: i["date"]):
        v, t, dk = vec(it, idf), ts(it["date"]), date_keys(it["title"])
        best, score = None, THRESHOLD
        for s in stories:
            if t - s["_last"] > WINDOW:
                continue
            if it["label"] != "community" and it["source"] in s["_sources"]:
                continue
            if dk and s["_dates"] and not (dk & s["_dates"]):
                continue
            c = cos(v, s["_vec"])
            if c > score:
                best, score = s, c
        if best is None:
            stories.append({"_members": [it], "_vec": dict(v), "_last": t, "_sources": {it["source"]}, "_dates": set(dk)})
            continue
        best["_members"].append(it)
        for w, x in v.items():
            best["_vec"][w] = best["_vec"].get(w, 0) + x
        norm = math.sqrt(sum(x * x for x in best["_vec"].values())) or 1
        best["_vec"] = {w: x / norm for w, x in best["_vec"].items()}
        best["_last"] = max(best["_last"], t)
        best["_sources"].add(it["source"])
        best["_dates"] |= dk
    out = []
    for s in stories:
        m = s["_members"]
        lead = sorted(m, key=lambda i: (RANK.get(i["label"], 9), i["date"]))[0]
        others = sorted((i for i in m if i is not lead), key=lambda i: (RANK.get(i["label"], 9), i["date"]))
        tags = sorted({t for i in m for t in i["tags"]}, key=lambda t: -sum(t in i["tags"] for i in m))
        classes = sorted({c for i in m for c in i["classes"]}, key=lambda c: -sum(c in i["classes"] for i in m))
        story = {k: lead[k] for k in ("title", "url", "date", "label", "source") if k in lead}
        for k in ("summary", "who", "icon"):
            if lead.get(k):
                story[k] = lead[k]
        story.update(id=hashlib.sha1(lead["url"].encode()).hexdigest()[:10], first=min(i["date"] for i in m),
                     last=max(i["date"] for i in m), tags=tags[:4], classes=classes[:3], n=len(m),
                     official=any(i["label"] == "official" for i in m),
                     also=[{k: i[k] for k in ("title", "url", "source", "label", "date")} for i in others])
        out.append(story)
    out.sort(key=lambda s: s["last"], reverse=True)
    return out


if __name__ == "__main__":   # print the grouping for a news.json, to tune by eye
    import sys
    doc = json.load(open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "data", "news.json"), encoding="utf-8"))
    st = build(doc["items"])
    print("%d items -> %d stories" % (len(doc["items"]), len(st)))
    for s in st:
        if s["n"] > 1:
            print("\n[%d] %s  (%s)  tags=%s classes=%s" % (s["n"], s["title"][:90], s["source"], s["tags"], s["classes"]))
            for a in s["also"]:
                print("      - %-22s %s" % (a["source"][:22], a["title"][:80]))
