"""Quest facts for the Library's guides: level, required level and rewards, for the quest tooltips and the run planner.

The quest facts were read by hand from Wowhead's Forever quest pages (they block scripts), saved as a snapshot JSON
keyed by quest id: {id: {name, level, req, side, choice: [{id, name, q}], items: [...], rep: [...]}}.
This tool adds what each reward item is (icon, quality, a short stat line) from Wowhead's Forever item tooltips,
downloads the icons, and writes data/src/kb_quests.json.
  python tools/kb_quests.py path/to/snapshot.json
  python tools/kb_quests.py --scaling path/to/scaling.json   (add XP and gold: {id: setupScalingRewards data})
  python tools/kb_quests.py            (refresh the reward items for the quests already in kb_quests.json)
"""
import html, io, json, os, re, sys, time, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "data", "src", "kb_quests.json")
UA = {"User-Agent": "Mozilla/5.0 (Terminal Whimsy guild site; reward tooltips)"}
TIP = "https://nether.wowhead.com/forever/tooltip/item/%d"
ICON = "https://wow.zamimg.com/images/wow/icons/large/%s.jpg"
SKIP = re.compile(r"^(Item Level|Binds|Unique|Durability|Requires|Sell Price|Classes|Max Stack|<)", re.I)


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
        return r.read()


def summary(tip, name):
    t = re.sub(r"<br\s*/?>|<table[^>]*>|</tr>|</table>|</div>", "\n", tip)
    t = re.sub(r"</td>\s*<th[^>]*>", " · ", t)
    t = html.unescape(re.sub(r"<[^>]+>", "", t))
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in t.split("\n")]
    lines = [ln for ln in lines if ln and ln != name and not SKIP.match(ln)]
    out = []
    for ln in lines:
        if ln.startswith("Equip:") or ln.startswith("Use:") or ln.startswith("Chance on hit:"):
            ln = ln if len(ln) <= 90 else ln[:87].rstrip() + "..."
        out.append(ln)
    return out[:6]


def round_xp(x):
    """WoW rounds quest XP for display; Wowhead's Forever pages show the same numbers (11,520 -> 11,500)."""
    x = int(x)
    return 5 * ((x + 2) // 5) if x <= 100 else 10 * ((x + 5) // 10) if x <= 500 else 25 * ((x + 12) // 25) if x <= 1000 else 50 * ((x + 25) // 50)


def scaling(parts, path):
    """Wowhead's Forever quest pages carry setupScalingRewards({xp: {multiplier, levels}, coin: {...}}): Classic's XP
    and gold at the quest's level, and Forever's multiplier on top. Keyed by quest id, as read from those pages."""
    for qid, s in json.load(open(path, encoding="utf-8")).items():
        p = parts.get(qid)
        if not p or "xp" not in s:
            if p is not None and s.get("none"):
                p["xp"] = 0
            continue
        lv = str(s["minLevel"])
        base, mult = s["xp"]["levels"].get(lv, 0), s["xp"]["multiplier"]
        p["xp"] = round_xp(base * mult)
        p["xpMult"] = mult
        c = s["coin"]
        p["money"] = int(round(c["levels"].get(lv, 0) * c["multiplier"]))
        if c.get("rewardAtCap"):
            p["moneyAtCap"] = c["rewardAtCap"]


def main():
    db = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {"parts": {}, "rewards": {}}
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--scaling" in sys.argv:
        scaling(db["parts"], args[0])
        args = []
    if args:
        db["parts"] = json.load(open(args[0], encoding="utf-8"))
    rewards = db.get("rewards", {})
    for q in db["parts"].values():
        for it in q.get("choice", []) + q.get("items", []):
            k = str(it["id"])
            if k in rewards:
                continue
            d = json.loads(get(TIP % it["id"]))
            rewards[k] = {"name": d["name"], "q": d.get("quality", it.get("q", 1)), "icon": d.get("icon"), "lines": summary(d.get("tooltip", ""), d["name"])}
            print("%-34s q%d %-26s %s" % (d["name"], rewards[k]["q"], rewards[k]["icon"], " | ".join(rewards[k]["lines"][:3])))
            time.sleep(.5)
    for r in rewards.values():
        p = os.path.join(ROOT, "img", "icons", "%s.png" % r["icon"])
        if r["icon"] and not os.path.exists(p):
            Image.open(io.BytesIO(get(ICON % r["icon"]))).convert("RGB").save(p)
            time.sleep(.2)
    db = {"_about": "Quest facts for the Library's guides. parts: Wowhead's Forever quest pages, read by hand on 19 Nov 2026 "
                    "(level, required level, reward choices, reputation), keyed by quest id; xp and money (copper) come from the "
                    "same pages' scaling data (Classic's value times Forever's multiplier, rounded the way WoW shows it). rewards: "
                    "Wowhead's Forever item tooltips. Written by tools/kb_quests.py.",
          "parts": db["parts"], "rewards": rewards}
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(db, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    print(len(db["parts"]), "quest parts,", len(rewards), "reward items")


if __name__ == "__main__":
    main()
