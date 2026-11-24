#!/usr/bin/env python3
"""Fetch citation counts for every paper in Article.csv and write assets/data/citations.json.

Sources, per paper (the highest count wins):
  - Google Scholar, read through SerpApi's "google_scholar_author" engine
    (only when the SERPAPI_KEY environment variable is set: Scholar has no API
    and blocks direct scraping). Its profile totals and h-index are kept too.
  - OpenAlex and Semantic Scholar, free public APIs, matched by title
    (or by DOI, if Article.csv ever gets a "DOI" column).

Run locally with `SERPAPI_KEY=... python3 scripts/update_citations.py`, or let the
nightly GitHub Action (.github/workflows/citations.yml) do it.
"""
import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "Article.csv"
OUT_PATH = ROOT / "assets" / "data" / "citations.json"
UA = "academic-homepage-citations/1.0"
MIN_SIMILARITY = 0.9

# Google Scholar profile: https://scholar.google.com/citations?user=<SCHOLAR_ID>
SCHOLAR_ID = "XNgzY0IAAAAJ"


def norm(text):
    """Title key shared with academic-loader.js (normalizeTitle): keep the two in sync."""
    return re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()


def match_key(text):
    """Looser key for cross-source matching: also ignores '&' / 'and'."""
    return re.sub(r"\s+", " ", re.sub(r"\band\b", " ", norm((text or "").replace("&", " and ")))).strip()


def similar(a, b):
    return SequenceMatcher(None, match_key(a), match_key(b)).ratio()


def redact(url):
    """Never print the SerpApi key in logs (GitHub Action logs are public on public repos)."""
    return re.sub(r"api_key=[^&]+", "api_key=***", url)


def get_json(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as err:
            if err.code == 404:
                return None
            if err.code == 429 and attempt < retries - 1:
                time.sleep(5 * (attempt + 1))
                continue
            print(f"  ! HTTP {err.code} for {redact(url)}", file=sys.stderr)
            return None
        except Exception as err:  # network hiccup
            if attempt < retries - 1:
                time.sleep(3)
                continue
            print(f"  ! {type(err).__name__} for {redact(url)}", file=sys.stderr)
            return None


# --------------------------------------------------------------------------- Google Scholar
def google_scholar():
    """Return the Scholar profile (totals + per-paper counts) via SerpApi, or None."""
    key = os.environ.get("SERPAPI_KEY", "").strip()
    if not key:
        print("SERPAPI_KEY not set: skipping Google Scholar.")
        return None

    articles, start, profile = [], 0, None
    while True:
        params = {"engine": "google_scholar_author", "author_id": SCHOLAR_ID, "hl": "en",
                  "num": 100, "start": start, "api_key": key}
        data = get_json("https://serpapi.com/search.json?" + urllib.parse.urlencode(params))
        if not data or data.get("error"):
            print(f"  ! SerpApi: {(data or {}).get('error', 'no response')}", file=sys.stderr)
            return None
        profile = profile or data
        page = data.get("articles") or []
        articles += page
        if len(page) < 100:
            break
        start += 100

    # SerpApi answers "Success" with an empty body for a wrong/unknown profile id
    if not profile.get("author") and not articles:
        print(f"  ! SerpApi: no Google Scholar profile found for id {SCHOLAR_ID}", file=sys.stderr)
        return None

    stats = {}
    for row in (profile.get("cited_by") or {}).get("table", []):
        for name, values in row.items():  # {"citations": {"all": 123, "since_2021": 120}}
            stats[name] = (values or {}).get("all")

    papers = []
    for art in articles:
        cited = (art.get("cited_by") or {}).get("value")
        papers.append({"title": art.get("title"), "citations": cited if isinstance(cited, int) else 0,
                       "year": art.get("year")})
    return {
        "user_id": SCHOLAR_ID,
        "total_citations": stats.get("citations"),
        "h_index": stats.get("h_index"),
        "i10_index": stats.get("i10_index"),
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "papers": papers,
    }


def scholar_count(title, scholar):
    if not scholar:
        return None
    best, best_score = None, 0.0
    for paper in scholar["papers"]:
        score = similar(title, paper["title"])
        if score > best_score:
            best, best_score = paper, score
    return best["citations"] if best and best_score >= MIN_SIMILARITY else None


# --------------------------------------------------------------------------- OpenAlex / Semantic Scholar
def openalex(title, doi):
    if doi:
        work = get_json("https://api.openalex.org/works/doi:" + urllib.parse.quote(doi))
        return (work or {}).get("cited_by_count"), (work or {}).get("doi")
    q = urllib.parse.quote(re.sub(r"[,:]", " ", title))
    data = get_json(f"https://api.openalex.org/works?filter=title.search:{q}&per-page=5")
    best = None
    for work in (data or {}).get("results", []):
        score = similar(title, work.get("display_name") or work.get("title"))
        if score >= MIN_SIMILARITY and (best is None or work.get("cited_by_count", 0) > best.get("cited_by_count", 0)):
            best = work
    return (best.get("cited_by_count"), best.get("doi")) if best else (None, None)


def semantic_scholar(title, doi):
    fields = "title,citationCount,externalIds"
    if doi:
        paper = get_json(f"https://api.semanticscholar.org/graph/v1/paper/DOI:{urllib.parse.quote(doi)}?fields={fields}")
        return (paper or {}).get("citationCount")
    q = urllib.parse.quote(title)
    paper = get_json(f"https://api.semanticscholar.org/graph/v1/paper/search/match?query={q}&fields={fields}")
    hits = (paper or {}).get("data") or []
    if hits and similar(title, hits[0].get("title")) >= MIN_SIMILARITY:
        return hits[0].get("citationCount")
    return None


# --------------------------------------------------------------------------- main
def main():
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as fh:
        rows = [r for r in csv.DictReader(fh) if (r.get("Paper Name") or "").strip()]

    previous_doc = json.loads(OUT_PATH.read_text(encoding="utf-8")) if OUT_PATH.exists() else {}
    previous = previous_doc.get("papers", {})

    # If SerpApi fails tonight, keep last night's Scholar data instead of dropping it.
    scholar = google_scholar() or previous_doc.get("scholar")
    if scholar and not scholar.get("papers"):
        scholar = None

    papers = {}
    for i, row in enumerate(rows):
        title = row["Paper Name"].strip()
        doi = (row.get("DOI") or "").strip().removeprefix("https://doi.org/") or None
        oa_count, oa_doi = openalex(title, doi)
        time.sleep(1)
        s2_count = semantic_scholar(title, doi)
        if i < len(rows) - 1:
            time.sleep(3)  # Semantic Scholar's keyless limit is shared and strict
        gs_count = scholar_count(title, scholar)

        key = norm(title)
        prev = previous.get(key, {})
        # A source that failed tonight (rate limit, outage) keeps its last known count,
        # so the total doesn't drop and bounce back between nights.
        if oa_count is None:
            oa_count = prev.get("openalex")
        if s2_count is None:
            s2_count = prev.get("semantic_scholar")
        counts = [c for c in (gs_count, oa_count, s2_count) if isinstance(c, int)]
        if counts:
            papers[key] = {"title": title, "citations": max(counts), "google_scholar": gs_count,
                           "openalex": oa_count, "semantic_scholar": s2_count,
                           "doi": oa_doi or prev.get("doi")}
        print(f"{papers.get(key, {}).get('citations', '-'):>4}  GS={gs_count} OA={oa_count} S2={s2_count}  {title[:60]}")

    total = sum(p["citations"] for p in papers.values())
    out = {"updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "total": total, "papers": papers}
    if scholar:
        out["scholar"] = scholar
    OUT_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    scholar_total = (scholar or {}).get("total_citations")
    print(f"\n{len(papers)}/{len(rows)} papers matched, {total} citations"
          f"{f', Google Scholar profile total {scholar_total}' if scholar_total else ''} -> {OUT_PATH.name}")


if __name__ == "__main__":
    main()
