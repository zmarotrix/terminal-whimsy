"""Open, update or close one GitHub issue about broken Wire sources, from data/health.json.

A source counts as broken when it has failed 3 runs in a row (9 hours), or has answered but given nothing for 2+ days.
Runs in the GitHub Action with the gh CLI (GH_TOKEN set). Without GITHUB_ACTIONS it only prints what it would do.
"""
import datetime as dt, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LABEL = "wire-health"
TITLE = "The Wire: a news source stopped working"


def problems(h, today):
    out = []
    for name, e in sorted(h.items()):
        days = lambda d: (today - dt.date.fromisoformat(d)).days if d else 999
        if e.get("fails", 0) >= 3:
            out.append((name, "failing for %d runs in a row: %s" % (e["fails"], e.get("error") or "unknown error")))
        elif days(e.get("lastItems")) >= 2:
            out.append((name, "answers, but has given no stories since %s" % (e.get("lastItems") or "it was added")))
    return out


def gh(*args):
    return subprocess.run(["gh", *args], capture_output=True, text=True, check=False)


def main():
    h = json.load(open(os.path.join(HERE, "..", "data", "health.json"), encoding="utf-8"))
    probs = problems(h, dt.datetime.now(dt.timezone.utc).date())
    body = ("These Wire sources need a look. The rest of the news keeps updating meanwhile.\n\n| Source | Problem |\n|---|---|\n" +
            "\n".join("| %s | %s |" % p for p in probs) +
            "\n\nSources live in `tools/feeds.json`. Test one locally with `python tools/fetch_news.py --dry`. "
            "This issue closes itself once every source works again.")
    if not os.environ.get("GITHUB_ACTIONS"):
        print("problems:" if probs else "all sources healthy", *("\n  %s: %s" % p for p in probs))
        return 0
    gh("label", "create", LABEL, "--color", "f2c56b", "--description", "A Wire news source is broken", "--force")
    found = gh("issue", "list", "--label", LABEL, "--state", "open", "--json", "number", "--jq", ".[0].number").stdout.strip()
    if probs and found:
        gh("issue", "edit", found, "--body", body)
        print("updated issue #%s" % found)
    elif probs:
        r = gh("issue", "create", "--title", TITLE, "--label", LABEL, "--body", body)
        print(r.stdout.strip() or r.stderr.strip())
    elif found:
        gh("issue", "close", found, "--comment", "Every source is working again.")
        print("closed issue #%s" % found)
    else:
        print("all sources healthy")
    return 0


if __name__ == "__main__":
    sys.exit(main())
