"""Where the Library guides' NPCs stand, so the site can show a map with a pin instead of bare coordinates.

Reads the friendly NPCs ({n}) in data/src/kb/*.md, finds their spawns in NorgannonDB (the suite's game database),
names the zone, and downloads each zone's map into img/maps/.
NPCs NorgannonDB doesn't have can be placed by hand in kb.json "places". Then run tools/build_data.py.
  python tools/kb_places.py [path to NorgannonDB]
"""
import io, json, os, re, sys, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
NDB = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "..", "pfQuest", "pfQuest-Forever", "addons", "NorgannonDB")
OUT = os.path.join(ROOT, "data", "src", "kb_places.json")
MAP = "https://wow.zamimg.com/images/wow/classic/maps/enus/original/%d.jpg"
UA = {"User-Agent": "Mozilla/5.0 (Terminal Whimsy guild site; zone maps)"}


def npc_names():
    names = []
    for f in sorted(os.listdir(os.path.join(ROOT, "data", "src", "kb"))):
        if not f.endswith(".md"):
            continue
        for m in re.finditer(r"(\*\*|\*)(.+?)\1(?:\{([qnhiat])\})?", open(os.path.join(ROOT, "data", "src", "kb", f), encoding="utf-8").read()):
            if m.group(3) == "n":
                n = re.sub(r"^\d+\.\s+", "", m.group(2)).rstrip(":")
                if n not in names:
                    names.append(n)
    return names


def zones():
    s = open(os.path.join(NDB, "data", "world.lua"), encoding="utf-8").read()
    line = s[s.index("NorgannonDB.zones ="):]
    line = line[:line.index("\n")]
    Z = {}
    for m in re.finditer(r"\[(\d+)\]=\{((?:[^{}]|\{[^{}]*\})*)\}", line):
        body = m.group(2)
        nm = re.search(r'name="([^"]*)"', body)
        if not nm:
            continue
        z = {"name": nm.group(1)}
        p = re.search(r"parent=(\d+)", body)
        c = re.search(r"center=\{([-\d.]+),([-\d.]+)\}", body)
        e = re.search(r"extent=\{([-\d.]+),([-\d.]+)\}", body)
        if p:
            z["parent"] = int(p.group(1))
        if c and e:
            z["box"] = (float(c.group(1)), float(c.group(2)), abs(float(e.group(1))), abs(float(e.group(2))))
        Z[int(m.group(1))] = z
    return Z


def spawns(name):
    s = open(os.path.join(NDB, "data", "npcs.lua"), encoding="utf-8").read()
    m = re.search(r'R\((\d+),"' + re.escape(name) + r'",\[\[(.*?)\]\]\)', s)         or re.search(r'R\((\d+),"' + re.escape(name) + r' [^"]*",\[\[(.*?)\]\]\)', s)     # "King Magni" -> "King Magni Bronzebeard"
    if not m:
        return None, []
    sp = re.search(r"spawns=\{((?:\[\d+\]=\{(?:\{[^{}]*\},?)*\},?)*)\}", m.group(2))
    out = []
    for z in re.finditer(r"\[(\d+)\]=\{((?:\{[^{}]*\},?)*)\}", sp.group(1) if sp else ""):
        for p in re.finditer(r"\{([-\d.]+),([-\d.]+)", z.group(2)):
            out.append((int(z.group(1)), float(p.group(1)), float(p.group(2))))
    return int(m.group(1)), out


def main():
    Z = zones()
    hand = json.load(open(os.path.join(ROOT, "data", "src", "kb.json"), encoding="utf-8")).get("places", {})
    places = {}
    skip = json.load(open(os.path.join(ROOT, "data", "src", "kb.json"), encoding="utf-8")).get("noMap", {}).get("npcs", [])
    for n in npc_names():
        if n in skip:
            continue
        if n in hand:
            zone, x, y, npc = hand[n]["zone"], hand[n]["x"], hand[n]["y"], None
        else:
            npc, sp = spawns(n)
            # outdoors only: a zone with a world map (instances like BRD have their own floors, the text covers those)
            sp = [p for p in sp if p[0] in Z and "parent" not in Z[p[0]] and p[1] > 0]
            if not sp:
                print("no outdoor spawn:", n)
                continue
            zone, x, y = sp[0]
        # (no subzone names: NorgannonDB's subzone boxes overlap, and the guide's own words already say where)
        places[n] = {"zone": zone, "zoneName": Z[zone]["name"], "x": x, "y": y}
        if npc:
            places[n]["npc"] = npc
        print("%-28s %-20s %5.1f %5.1f" % (n, Z[zone]["name"], x, y))
    os.makedirs(os.path.join(ROOT, "img", "maps"), exist_ok=True)
    for zone in sorted({p["zone"] for p in places.values()}):
        f = os.path.join(ROOT, "img", "maps", "%d.jpg" % zone)
        if not os.path.exists(f):
            with urllib.request.urlopen(urllib.request.Request(MAP % zone, headers=UA), timeout=30) as r:
                im = Image.open(io.BytesIO(r.read())).convert("RGB")
            im.thumbnail((720, 720), Image.LANCZOS)
            im.save(f, "JPEG", quality=80, optimize=True, progressive=True)
            print("map", zone, im.size, os.path.getsize(f) // 1024, "KB")
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        json.dump({"_about": "Where the Library guides' friendly NPCs stand: NorgannonDB spawns (or kb.json places), "
                             "zone and subzone names from NorgannonDB. Written by tools/kb_places.py.", "places": places},
                  fh, ensure_ascii=False, indent=1, sort_keys=True)
        fh.write("\n")
    print(len(places), "places")


if __name__ == "__main__":
    main()
