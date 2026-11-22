#!/usr/bin/env python3
"""Regenerate data/projects.json from the GitHub REST API.

Keeps the static fallback used by the site's "other" section in sync with the
actual set of repositories owned by 23skdu.
"""
import json
import urllib.request
from pathlib import Path

USER = "23skdu"
OUT = Path(__file__).resolve().parent.parent / "data" / "projects.json"
EXCLUDE = {"23skdu", "23skdu.github.io"}


def fetch_repos():
    repos = []
    seen = set()
    for page in range(1, 6):
        url = f"https://api.github.com/users/{USER}/repos?per_page=100&page={page}&sort=pushed"
        req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json"})
        with urllib.request.urlopen(req) as resp:
            data = json.load(resp)
        if not isinstance(data, list) or not data:
            break
        for r in data:
            if r["id"] in seen:
                continue
            seen.add(r["id"])
            repos.append(r)
    return repos


def main():
    repos = fetch_repos()
    filtered = [
        r for r in repos
        if not r.get("fork") and r["name"] not in EXCLUDE
    ]
    filtered.sort(key=lambda r: r.get("pushed_at") or "", reverse=True)

    out = []
    for r in filtered:
        out.append({
            "name": r["name"],
            "description": r.get("description") or "",
            "language": r.get("language") or "Other",
            "stars": r.get("stargazers_count") or 0,
            "forks": r.get("forks_count") or 0,
            "topics": r.get("topics") or [],
            "pushed_at": r.get("pushed_at"),
            "updated_at": r.get("updated_at"),
            "created_at": r.get("created_at"),
            "html_url": r.get("html_url"),
            "homepage": r.get("homepage") or "",
            "size": r.get("size") or 0,
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w") as f:
        json.dump(out, f, indent=2)
        f.write("\n")
    print(f"Wrote {len(out)} repos to {OUT}")


if __name__ == "__main__":
    main()
