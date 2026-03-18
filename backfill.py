"""
HuggingFace Papers backfill script.
Scrapes papers from huggingface.co/papers going back N days and stores in Turso.

Usage:
  pip install requests beautifulsoup4 python-dotenv
  python backfill.py

It is safe to re-run — already-inserted rows are skipped (INSERT OR IGNORE).
Progress is printed so you can Ctrl+C and resume later.
"""

import os
import time
import json
import hashlib
import requests
from datetime import date, timedelta
from bs4 import BeautifulSoup
from dotenv import dotenv_values

# ── Config ────────────────────────────────────────────────────────────────────

config = dotenv_values(".env.local")
DB_URL   = config.get("TURSO_DATABASE_URL", "").rstrip("/").replace("libsql://", "https://")
DB_TOKEN = config.get("TURSO_AUTH_TOKEN", "")

if not DB_URL or not DB_TOKEN:
    raise SystemExit("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local")

DAYS_BACK      = 365 * 3   # how far to go back
DELAY_SECONDS  = 2.5       # pause between each page fetch
HF_BASE        = "https://huggingface.co/papers"

# ── Turso HTTP helpers ────────────────────────────────────────────────────────

def turso_execute(sql, args=None):
    stmt = {"sql": sql}
    if args:
        stmt["args"] = [{"type": "text", "value": str(a)} if a is not None else {"type": "null"} for a in args]
    payload = {"requests": [{"type": "execute", "stmt": stmt}, {"type": "close"}]}
    resp = requests.post(
        f"{DB_URL}/v2/pipeline",
        headers={"Authorization": f"Bearer {DB_TOKEN}", "Content-Type": "application/json"},
        json=payload,
        timeout=15
    )
    resp.raise_for_status()
    return resp.json()

def turso_query(sql, args=None):
    result = turso_execute(sql, args)
    rows_data = result["results"][0]["response"]["result"]["rows"]
    cols = [c["name"] for c in result["results"][0]["response"]["result"]["cols"]]
    return [dict(zip(cols, [cell["value"] for cell in row])) for row in rows_data]

# ── Schema ────────────────────────────────────────────────────────────────────

def create_schema():
    turso_execute("""
        CREATE TABLE IF NOT EXISTS papers (
            id           TEXT PRIMARY KEY,
            arxiv_id     TEXT NOT NULL,
            title        TEXT NOT NULL,
            link         TEXT NOT NULL,
            image        TEXT,
            upvotes      INTEGER DEFAULT 0,
            comments     TEXT,
            submitted_by TEXT,
            date         TEXT NOT NULL
        )
    """)
    turso_execute("CREATE INDEX IF NOT EXISTS idx_papers_date ON papers(date)")
    print("Schema ready.")

# ── Scraping ──────────────────────────────────────────────────────────────────

def fetch_papers_for_date(target_date: date):
    url = f"{HF_BASE}?date={target_date.isoformat()}"
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code == 429:
            print(f"  ⚠ Rate limited — waiting 30s before retrying {target_date}")
            time.sleep(30)
            return fetch_papers_for_date(target_date)
        if resp.status_code != 200:
            print(f"  ✗ HTTP {resp.status_code} for {target_date}")
            return []
        soup = BeautifulSoup(resp.text, "html.parser")
        papers = []
        for card in soup.select(".relative.flex.flex-col"):
            title_el = card.select_one("h3 a")
            img_el   = card.select_one("img")
            link_el  = card.select_one("h3 a")
            comm_el  = card.select_one('a[href$="#community"]')
            sub_el   = card.select_one(".pointer-events-none")
            upvote_els = card.select('.shadow-alternate input[type="checkbox"] + svg + div')

            if not (title_el and link_el and upvote_els):
                continue

            title    = title_el.get_text(strip=True)
            link     = "https://huggingface.co" + link_el["href"]
            arxiv_id = link.split("/")[-1]
            image    = img_el["src"] if img_el else None
            comments = comm_el.get_text(strip=True) if comm_el else "0"
            submitted_by = sub_el.get_text(strip=True).replace("Submitted by", "").strip() if sub_el else ""

            try:
                upvotes = int(upvote_els[0].get_text(strip=True))
            except (ValueError, IndexError):
                upvotes = 0

            # Unique ID = arxiv_id + date (same paper can trend on multiple days)
            row_id = f"{arxiv_id}_{target_date.isoformat()}"

            papers.append({
                "id": row_id,
                "arxiv_id": arxiv_id,
                "title": title,
                "link": link,
                "image": image,
                "upvotes": upvotes,
                "comments": comments,
                "submitted_by": submitted_by,
                "date": target_date.isoformat(),
            })
        return papers
    except Exception as e:
        print(f"  ✗ Error fetching {target_date}: {e}")
        return []

def insert_papers(papers):
    inserted = 0
    for p in papers:
        try:
            turso_execute(
                """INSERT OR IGNORE INTO papers
                   (id, arxiv_id, title, link, image, upvotes, comments, submitted_by, date)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [p["id"], p["arxiv_id"], p["title"], p["link"],
                 p["image"], str(p["upvotes"]), p["comments"], p["submitted_by"], p["date"]]
            )
            inserted += 1
        except Exception as e:
            print(f"    DB error for {p['id']}: {e}")
    return inserted

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    create_schema()

    today = date.today()
    total_days = DAYS_BACK
    skipped = 0
    total_inserted = 0

    print(f"\nBackfilling {total_days} days ({today - timedelta(days=total_days)} → {today})\n")

    for i in range(total_days):
        target = today - timedelta(days=i)

        # Check if we already have data for this date
        existing = turso_query("SELECT COUNT(*) as n FROM papers WHERE date = ?", [target.isoformat()])
        if existing and int(existing[0]["n"]) > 0:
            print(f"[{i+1:4}/{total_days}] {target}  already have {existing[0]['n']} papers — skipping")
            skipped += 1
            continue

        papers = fetch_papers_for_date(target)
        n = insert_papers(papers)
        total_inserted += n
        print(f"[{i+1:4}/{total_days}] {target}  {n} papers inserted")

        time.sleep(DELAY_SECONDS)

    print(f"\nDone. {total_inserted} rows inserted, {skipped} days skipped (already had data).")

if __name__ == "__main__":
    main()
