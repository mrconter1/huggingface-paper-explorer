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
DELAY_SECONDS  = 4.0       # pause between each page fetch
HF_BASE        = "https://huggingface.co/papers"

# ── Turso HTTP helpers ────────────────────────────────────────────────────────

def turso_execute(sql, args=None, retries=5):
    stmt = {"sql": sql}
    if args:
        stmt["args"] = [{"type": "text", "value": str(a)} if a is not None else {"type": "null"} for a in args]
    payload = {"requests": [{"type": "execute", "stmt": stmt}, {"type": "close"}]}
    for attempt in range(retries):
        try:
            resp = requests.post(
                f"{DB_URL}/v2/pipeline",
                headers={"Authorization": f"Bearer {DB_TOKEN}", "Content-Type": "application/json"},
                json=payload,
                timeout=15
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            wait = (attempt + 1) * 10
            print(f"  ⚠ Turso error (attempt {attempt + 1}/{retries}), retrying in {wait}s: {e}")
            time.sleep(wait)
    raise RuntimeError(f"Turso unreachable after {retries} attempts")

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
            raw_image = img_el["src"] if img_el else None
            image = ("https://huggingface.co" + raw_image) if raw_image and raw_image.startswith("/") else raw_image
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

def make_arg(a):
    return {"type": "null"} if a is None else {"type": "text", "value": str(a)}

def insert_papers(papers):
    if not papers:
        return 0
    try:
        sql = """INSERT OR IGNORE INTO papers
                 (id, arxiv_id, title, link, image, upvotes, comments, submitted_by, date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"""
        requests_payload = [
            {"type": "execute", "stmt": {
                "sql": sql,
                "args": [make_arg(v) for v in [
                    p["id"], p["arxiv_id"], p["title"], p["link"],
                    p["image"], p["upvotes"], p["comments"], p["submitted_by"], p["date"]
                ]]
            }}
            for p in papers
        ]
        requests_payload.append({"type": "close"})
        resp = requests.post(
            f"{DB_URL}/v2/pipeline",
            headers={"Authorization": f"Bearer {DB_TOKEN}", "Content-Type": "application/json"},
            json={"requests": requests_payload},
            timeout=30
        )
        resp.raise_for_status()
        return len(papers)
    except Exception as e:
        print(f"    DB batch error: {e}")
        return 0

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    import sys
    args = sys.argv[1:]
    clean = "--clean" in args

    # --from YYYY-MM-DD  → start from this date going backwards
    start_from = date.today()
    if "--from" in args:
        idx = args.index("--from")
        try:
            start_from = date.fromisoformat(args[idx + 1])
        except (IndexError, ValueError):
            raise SystemExit("Usage: python backfill.py [--from YYYY-MM-DD] [--clean]")

    create_schema()

    if clean:
        confirm = input("⚠ This will DELETE all rows in the papers table. Type 'yes' to confirm: ")
        if confirm.strip().lower() != "yes":
            print("Aborted.")
            return
        turso_execute("DELETE FROM papers")
        print("All rows deleted. Starting fresh.\n")

    today = start_from
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

        try:
            papers = fetch_papers_for_date(target)
            n = insert_papers(papers)
            total_inserted += n
            print(f"[{i+1:4}/{total_days}] {target}  {n} papers inserted")
        except Exception as e:
            print(f"[{i+1:4}/{total_days}] {target}  ✗ failed: {e} — will retry on next run")

        time.sleep(DELAY_SECONDS)

    print(f"\nDone. {total_inserted} rows inserted, {skipped} days skipped (already had data).")

if __name__ == "__main__":
    main()
