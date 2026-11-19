"""Build data.js (everything the page shows except The Wire) and icons.js (every icon it uses, inlined).

Inputs: data/src/changes.json, gear.json, official.json (research), kb.json + kb/*.md (the Library's guides,
        with kb_items.json from tools/kb_items.py and kb_places.json from tools/kb_places.py)
        + tools/curated.py (hand-written parts).
  python tools/build_data.py
"""
import base64, io, json, os, re, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import curated as C  # noqa: E402

load = lambda n: json.load(open(os.path.join(ROOT, "data", "src", n), encoding="utf-8"))
used = set()


def use(i):
    used.add(i)
    return i


def slug(s, taken):
    b = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:48].strip("-")
    k, n = b, 2
    while k in taken:
        k, n = "%s-%d" % (b, n), n + 1
    taken.add(k)
    return k


# ---------- changes ----------
changes, ids = [], set()
for idx, c in enumerate(load("changes.json")):
    c = dict(c)
    fix = C.CHANGE_FIXES.get(idx, {})
    for k, v in fix.items():
        if k == "add_sources":
            c["sources"] = v + c.get("sources", [])
        elif k == "link":
            c["sources"] = [v] + c.get("sources", [])
        else:
            c[k] = v
    c["id"] = slug(c["title"], ids)
    t = c["title"].lower()
    ic = next((i for w, i in C.CHANGE_ICONS if w in t), None)
    c["i"] = use(ic or (C.CLASSES[c["class"]]["i"] if c.get("class") else C.AREAS[c["area"]]["i"]))
    # a class-less change that names a class in its title still shows under that class
    if not c.get("class"):
        c["classes"] = [k for k, v in C.CLASSES.items() if re.search(r"\b%s" % v["n"].lower(), t)]
    changes.append(c)
change_ids = [c["id"] for c in changes]

# ---------- official statements ----------
said = []
for s in load("official.json"):
    s = dict(s)
    if s["topic"] == "other" or s["topic"] not in C.TOPICS:
        t = s["title"].lower()
        s["topic"] = next((tp for words, tp in C.RETOPIC if any(w in t for w in words)), "other")
    said.append(s)
said.sort(key=lambda s: s["date"], reverse=True)

# ---------- gear: tier sets + other items ----------
def set_class(name):
    n = name.lower()
    return next((c for w, c in C.SET_CLASS if w in n), None)


sets, items = {}, []
for g in load("gear.json"):
    notes = g.get("notes") or ""
    m = re.match(r"(.+?) set( crafted version)?\.", notes)
    if m and (g["source"].startswith("Raid") or g["source"].startswith("Crafted")):
        name, crafted = m.group(1).strip(), bool(m.group(2))
        cls = set_class(name)
        s = sets.setdefault(name, {"name": name, "cls": cls, "raid": {}, "craft": {}, "bonus": [], "url": g.get("url")})
        role = re.search(r"\(([^)]+)\)", name)
        s["role"] = role.group(1) if role else None
        armor = re.search(r"Armor (\d+)", g.get("stats") or "")
        piece = {"name": re.sub(r"\s*\(\d+\)$", "", g["name"]), "armor": int(armor.group(1)) if armor else None}
        if crafted:
            prof = re.search(r"Crafted: (\w+)", g["source"])
            piece["prof"] = prof.group(1) if prof else None
            s["craft"][g["slot"]] = piece
        else:
            s["raid"][g["slot"]] = piece
            bon = re.search(r"Bonuses (.+)$", notes)
            if bon and not s["bonus"]:
                for part in re.split(r";\s*(?=\d:)", bon.group(1).rstrip(".")):
                    k, _, txt = part.partition(":")
                    txt = txt.strip()
                    stale = next((a for a in C.REMOVED_ABILITIES if a in txt), None)
                    s["bonus"].append({"n": int(k), "t": re.sub(r"\s*\((Lava Burst|Berserk|Tiger's Fury)[^)]*\)", "", txt), "stale": stale})
        if g.get("url") and not s.get("url"):
            s["url"] = g["url"]
        continue
    n = g["name"].lower()
    if g["source"].startswith("Dungeons"):
        icon, grp, q = C.DUNGEON_SET_ICON, "Dungeon sets", "rare"
    else:
        icon, grp, q = next(((i, gr, qq) for w, i, gr, qq in C.ITEM_ICONS if w in n), ("inv_misc_questionmark", "Changed items", "uncommon"))
    items.append({"name": re.sub(r"\s*\(\d+\)$", "", g["name"]), "slot": None if g.get("slot") == "unspecified" else g.get("slot"),
                  "source": None if g.get("source") == "unspecified" else g.get("source"), "stats": g.get("stats"),
                  "notes": g.get("notes"), "url": g.get("url"), "i": use(icon), "grp": grp, "q": q})

tier = []
for s in sets.values():
    cls = s["cls"]
    icons = C.SLOT_ICONS[C.ARMOR[cls]]
    s["slots"] = [{"slot": sl, "i": use(icons[k]), "raid": s["raid"].get(sl) or s["raid"].get(sl + "s"),
                   "craft": s["craft"].get(sl)} for k, sl in enumerate(C.SLOTS)]
    del s["raid"], s["craft"]
    tier.append(s)
order = list(C.CLASSES)
tier.sort(key=lambda s: (order.index(s["cls"]), s["name"]))

# ---------- icons used by curated parts ----------
for d in (C.CLASSES, C.AREAS, C.TOPICS, C.ACH):
    for v in d.values():
        use(v["i"])
for m in C.MUST:
    use(m["i"])
for r in C.ROAD:
    for i in r.get("i", []):
        use(i)
for c in C.COUNTDOWNS:
    use(c["i"])
for i in ["inv_letter_15", "inv_misc_horn_01", "inv_misc_book_09", "inv_shirt_guildtabard_01", "inv_scroll_03",
          "inv_misc_food_15", "inv_misc_spyglass_03", "inv_misc_book_07", "spell_holy_heal", "inv_misc_questionmark",
          "trade_blacksmithing", "trade_leatherworking", "trade_tailoring", "inv_misc_gift_01", "spell_nature_starfall", "ability_warrior_charge", "inv_misc_head_dragon_black", "inv_misc_gem_diamond_01", "inv_misc_dice_02", "inv_misc_ticket_tarot_lunacy", "inv_misc_ticket_tarot_madness", "inv_misc_ticket_tarot_furies"]:
    use(i)
for i in getattr(C, "EXTRA_ICONS", []):
    use(i)
for t in getattr(C, "TOYS", []):
    use(t["i"])
for f in json.load(open(os.path.join(HERE, "feeds.json"), encoding="utf-8"))["feeds"]:
    if f.get("icon"):
        use(f["icon"])

# ---------- the Library: guides as books (data/src/kb.json + the Discord posts they're written as) ----------
KB = []
for g in load("kb.json")["guides"]:
    g = {k: v for k, v in g.items() if not k.startswith("_")}
    txt = open(os.path.join(ROOT, "data", "src", g.pop("file")), encoding="utf-8").read().replace("\r\n", "\n")
    g["posts"] = [p.strip("\n") for p in txt.split("<<<POST>>>") if p.strip()]
    for p in g["posts"]:                    # Discord's limit is per message; tags don't count, they're stripped
        n = len(re.sub(r"\{[qnhiat]\}", "", re.sub(r"\{i:([^}]+)\}", r"", p)))
        if n > 2000:
            sys.exit("kb %s: a post is %d characters, over Discord's 2,000" % (g["id"], n))
    use(g["icon"])
    KB.append(g)
KBI = load("kb_items.json")["items"] if os.path.exists(os.path.join(ROOT, "data", "src", "kb_items.json")) else {}
KBP = load("kb_places.json")["places"] if os.path.exists(os.path.join(ROOT, "data", "src", "kb_places.json")) else {}
for it in KBI.values():
    use(it["icon"])
for i in ["inv_misc_book_07", "inv_misc_horn_01", "inv_misc_book_11", "inv_crown_01", "spell_fire_fire", "spell_nature_sleep",
          "ability_rogue_sprint", "inv_misc_map_01",
          "inv_misc_rune_01", "inv_misc_bag_08", "spell_arcane_portaldalaran", "spell_holy_resurrection"]:   # + step marks
    use(i)

MUST = []
for m in C.MUST:
    m = dict(m)
    m["ref"] = change_ids[m["ref"]] if m.get("ref") is not None else None
    MUST.append(m)

doc = {
    "HERO_CMD": C.HERO_CMD, "LEDE": C.LEDE, "COUNTDOWNS": C.COUNTDOWNS, "CLASSES": C.CLASSES, "AREAS": C.AREAS,
    "TOPICS": C.TOPICS, "ACH": C.ACH, "MUST": MUST, "ROAD": C.ROAD, "ROAD_TLDR": C.ROAD_TLDR,
    "WISP": C.WISP, "TOYS": getattr(C, "TOYS", []), "TOYSHOP": getattr(C, "TOYSHOP", {}), "TITLES": C.TITLES, "FORTUNES": C.FORTUNES, "MOTES": C.MOTES, "CHANGES": changes, "SAID": said, "TIER": tier, "ITEMS": items, "KB": KB, "KBI": KBI, "KBP": KBP, "TIPS": {},
}
with open(os.path.join(ROOT, "data.js"), "w", encoding="utf-8", newline="\n") as f:
    f.write("/* Built by tools/build_data.py from data/src/*.json + tools/curated.py. Don't edit by hand. */\n")
    f.write("window.TW=" + json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + ";\n")

# ---------- icons.js ----------
missing, out = [], {}
for i in sorted(used):
    p = os.path.join(ROOT, "img", "icons", i + ".png")
    if not os.path.exists(p):
        missing.append(i)
        continue
    buf = io.BytesIO()                     # WebP is a third the size of PNG at the same look
    Image.open(p).convert("RGBA").resize((56, 56), Image.LANCZOS).save(buf, "WEBP", quality=88, method=6)
    out[i] = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
with open(os.path.join(ROOT, "icons.js"), "w", encoding="utf-8", newline="\n") as f:
    f.write("/* Icons from the WoW Forever client (c) Blizzard Entertainment, inlined so they load in one request. */\n")
    f.write("window.TW_ICONS=" + json.dumps(out, separators=(",", ":")) + ";\n")
print("changes %d, statements %d, tier sets %d, items %d, icons %d" % (len(changes), len(said), len(tier), len(items), len(out)))
if missing:
    print("MISSING icons:", " ".join(missing))
