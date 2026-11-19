"""Look up the items the Library's guides mention, so the site can show their real icons.

Reads data/src/kb/*.md for item names: text tagged {i} (or {i:Name}), and "**Requires:** 4x Name, 10x Name" lists.
For each name not already in data/src/kb_items.json it asks Wowhead's Forever item search for the item's id, icon and
quality, and downloads the icon into img/icons/. Then run tools/build_data.py.
  python tools/kb_items.py            (only new names)
  python tools/kb_items.py --all      (look everything up again)
"""
import io, json, os, re, sys, time, urllib.parse, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "data", "src", "kb_items.json")
UA = {"User-Agent": "Mozilla/5.0 (Terminal Whimsy guild site; item icons)"}
SEARCH = "https://www.wowhead.com/forever/search/suggestions-template?q="
ICON = "https://wow.zamimg.com/images/wow/icons/large/%s.jpg"


def names_in(text):
    found = []
    for m in re.finditer(r"(\*\*|\*)(.+?)\1(?:\{([qnhiat])\})?", text):     # one bold/italic span at a time
        if m.group(3) == "i":
            found.append(re.sub(r"^\d+\.\s+", "", m.group(2)).rstrip(":"))
    found += re.findall(r"\{i:([^}]+)\}", text)
    for m in re.finditer(r"\*\*Requires:\*\*\s*(.+)", text):
        for part in m.group(1).split(", "):
            r = re.match(r"(\d+)x (.+?)(?: \(.*\))?$", part.strip())
            if r:
                found.append(r.group(2))
    return found


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
        return r.read()


def lookup(name):
    tries = [name]
    if name.endswith("s"):
        tries.append(name[:-1])                   # "Relic Coffer Keys" -> "Relic Coffer Key"
    for q in tries:
        res = json.loads(get(SEARCH + urllib.parse.quote(q.lower())))["results"]
        items = [r for r in res if r.get("type") == 3 and r.get("icon")]
        hit = next((r for r in items if r["name"].lower() == q.lower()), None) \
            or next((r for r in items if r["name"].lower().endswith(" " + q.lower())), None)   # "Lost Information"
        time.sleep(.4)
        if hit:
            return {"id": hit["id"], "name": hit["name"], "icon": hit["icon"], "q": hit.get("quality", 1)}
    return None


def main():
    db = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    items = db.get("items", {})
    names = []
    for f in sorted(os.listdir(os.path.join(ROOT, "data", "src", "kb"))):
        if f.endswith(".md"):
            for n in names_in(open(os.path.join(ROOT, "data", "src", "kb", f), encoding="utf-8").read()):
                if n not in names:
                    names.append(n)
    redo = "--all" in sys.argv
    for n in names:
        if n in items and not redo:
            continue
        hit = lookup(n)
        if not hit:
            print("NOT FOUND:", n)
            continue
        items[n] = hit
        print("%-40s %6d  q%d  %s" % (n, hit["id"], hit["q"], hit["icon"]))
    for n, it in items.items():
        p = os.path.join(ROOT, "img", "icons", it["icon"] + ".png")
        if not os.path.exists(p):
            Image.open(io.BytesIO(get(ICON % it["icon"]))).convert("RGB").save(p)
            print("icon", it["icon"])
            time.sleep(.2)
    unused = [n for n in items if n not in names]
    for n in unused:
        del items[n]
    db = {"_about": "Items the Library's guides mention, as Wowhead's Forever item search has them (id, icon, quality). "
                    "Written by tools/kb_items.py; keyed by the name as the guide spells it.", "items": items}
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(db, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    print("%d items, %d dropped" % (len(items), len(unused)))


if __name__ == "__main__":
    main()
