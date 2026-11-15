"""Add ?v=<content hash> to every local script and stylesheet in index.html, so browsers fetch new versions
after an update instead of a cached copy.   python tools/stamp.py"""
import hashlib, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, "index.html")
s = open(p, encoding="utf-8").read()


def stamp(m):
    attr, path = m.group(1), m.group(2)
    f = os.path.join(ROOT, path)
    if not os.path.exists(f):
        return m.group(0)
    h = hashlib.sha1(open(f, "rb").read()).hexdigest()[:8]
    return '%s="%s?v=%s"' % (attr, path, h)


s2 = re.sub(r'(src|href)="([\w./-]+\.(?:js|css))(?:\?v=\w+)?"', stamp, s)
open(p, "w", encoding="utf-8", newline="\n").write(s2)
print("stamped", len(re.findall(r"\?v=", s2)), "files")
