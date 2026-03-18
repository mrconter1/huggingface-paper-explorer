"""
Trend analysis on paper titles in Turso DB.
Finds significant words and bigrams, tracks monthly frequency, shows growth.

Usage:
  python trends.py                    # Top 40 growing terms, last 3 months vs previous 3
  python trends.py --months 6         # Compare last 6 months vs previous 6
  python trends.py --top 60           # Show top 60 terms
  python trends.py --min-count 5      # Only terms appearing >= 5 times recently
"""

import re
import sys
import requests
from collections import defaultdict
from datetime import date, timedelta
from dotenv import dotenv_values

# ── Config ────────────────────────────────────────────────────────────────────

config = dotenv_values(".env.local")
DB_URL   = config.get("TURSO_DATABASE_URL", "").rstrip("/").replace("libsql://", "https://")
DB_TOKEN = config.get("TURSO_AUTH_TOKEN", "")

if not DB_URL or not DB_TOKEN:
    raise SystemExit("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local")

# ── Args ──────────────────────────────────────────────────────────────────────

args = sys.argv[1:]
WINDOW_MONTHS = int(args[args.index("--months") + 1]) if "--months" in args else 3
TOP_N         = int(args[args.index("--top") + 1])    if "--top"    in args else 40
MIN_COUNT     = int(args[args.index("--min-count") + 1]) if "--min-count" in args else 3

# ── Stopwords ─────────────────────────────────────────────────────────────────

STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "for", "in", "on", "to", "with",
    "from", "by", "at", "is", "are", "be", "as", "via", "its", "it", "we",
    "our", "your", "their", "this", "that", "these", "those", "into", "about",
    "using", "based", "toward", "towards", "without", "within", "across",
    "through", "between", "over", "under", "can", "not", "no", "new", "more",
    "beyond", "better", "efficient", "effective", "improved", "improving",
    "enhancing", "enhanced", "towards", "approach", "method", "framework",
    "system", "model", "models", "learning", "language", "large", "end",
    "do", "does", "how", "when", "what", "where", "which", "than", "then",
    "also", "both", "each", "all", "any", "few", "some", "only", "just",
    "up", "down", "out", "off", "high", "low", "deep", "pre", "post",
}

# ── Turso ─────────────────────────────────────────────────────────────────────

def query(sql, args=None):
    stmt = {"sql": sql}
    if args:
        stmt["args"] = [{"type": "text", "value": str(a)} for a in args]
    resp = requests.post(
        f"{DB_URL}/v2/pipeline",
        headers={"Authorization": f"Bearer {DB_TOKEN}", "Content-Type": "application/json"},
        json={"requests": [{"type": "execute", "stmt": stmt}, {"type": "close"}]},
        timeout=30
    )
    resp.raise_for_status()
    result = resp.json()["results"][0]["response"]["result"]
    cols = [c["name"] for c in result["cols"]]
    return [dict(zip(cols, [cell["value"] for cell in row])) for row in result["rows"]]

# ── Text processing ───────────────────────────────────────────────────────────

def tokenize(title):
    """Lowercase, remove punctuation, split into words."""
    title = title.lower()
    title = re.sub(r"[^a-z0-9\s\-]", " ", title)
    return [w.strip("-") for w in title.split() if len(w) > 1]

def extract_terms(title):
    """Return filtered unigrams and meaningful bigrams."""
    tokens = tokenize(title)
    terms = set()

    # Unigrams: skip stopwords, keep words ≥ 3 chars
    filtered = [t for t in tokens if t not in STOPWORDS and len(t) >= 3]
    terms.update(filtered)

    # Bigrams from all tokens (not just filtered), skip if both are stopwords
    for i in range(len(tokens) - 1):
        a, b = tokens[i], tokens[i + 1]
        if a not in STOPWORDS or b not in STOPWORDS:
            if len(a) >= 2 and len(b) >= 2:
                terms.add(f"{a} {b}")

    return terms

def month_key(date_str):
    """YYYY-MM-DD → YYYY-MM"""
    return date_str[:7]

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Fetching papers from DB...")
    rows = query("SELECT title, date FROM papers WHERE title IS NOT NULL AND date IS NOT NULL")
    print(f"  {len(rows)} paper-day rows loaded.\n")

    # Count distinct papers per month (dedupe by title within month)
    # term → {YYYY-MM: count}
    term_months = defaultdict(lambda: defaultdict(int))
    seen_in_month = defaultdict(set)  # month → set of titles seen (dedup)

    for row in rows:
        title = row["title"]
        month = month_key(row["date"])
        if title in seen_in_month[month]:
            continue
        seen_in_month[month].add(title)
        for term in extract_terms(title):
            term_months[term][month] += 1

    # Define recent window vs comparison window
    today = date.today()
    recent_end   = today.replace(day=1)  # start of current month
    recent_start = (recent_end - timedelta(days=WINDOW_MONTHS * 31)).replace(day=1)
    prev_end     = recent_start
    prev_start   = (prev_end - timedelta(days=WINDOW_MONTHS * 31)).replace(day=1)

    def months_in_range(start, end):
        result = []
        cur = start
        while cur < end:
            result.append(cur.strftime("%Y-%m"))
            # advance one month
            if cur.month == 12:
                cur = cur.replace(year=cur.year + 1, month=1)
            else:
                cur = cur.replace(month=cur.month + 1)
        return result

    recent_months = months_in_range(recent_start, recent_end)
    prev_months   = months_in_range(prev_start, prev_end)

    results = []
    for term, monthly in term_months.items():
        recent_count = sum(monthly.get(m, 0) for m in recent_months)
        prev_count   = sum(monthly.get(m, 0) for m in prev_months)

        if recent_count < MIN_COUNT:
            continue

        if prev_count == 0:
            growth = float("inf")
            growth_str = "  NEW"
        else:
            growth = (recent_count - prev_count) / prev_count * 100
            growth_str = f"{growth:+.0f}%"

        results.append((term, recent_count, prev_count, growth, growth_str))

    # Sort by growth descending, then by recent count
    results.sort(key=lambda x: (x[3] if x[3] != float("inf") else 9999, x[1]), reverse=True)
    top = results[:TOP_N]

    # ── Output ────────────────────────────────────────────────────────────────

    print(f"Trend analysis: {recent_start.strftime('%b %Y')} – {recent_end.strftime('%b %Y')}")
    print(f"vs previous:    {prev_start.strftime('%b %Y')} – {prev_end.strftime('%b %Y')}")
    print(f"Window: {WINDOW_MONTHS} months each\n")

    w = max(len(r[0]) for r in top) + 2
    header = f"{'Term':<{w}}  {'Recent':>7}  {'Prev':>7}  {'Growth':>8}"
    print(header)
    print("─" * len(header))

    for term, recent, prev, growth, growth_str in top:
        bar = "█" * min(int(recent / 2), 30)
        print(f"{term:<{w}}  {recent:>7}  {prev:>7}  {growth_str:>8}  {bar}")

    print(f"\nShowing top {len(top)} terms (min {MIN_COUNT} occurrences in recent window)")

    # Also show most common terms overall regardless of growth
    print("\n── Most common terms (all time) ──────────────────────────────")
    all_time = [(t, sum(m.values())) for t, m in term_months.items()]
    all_time.sort(key=lambda x: x[1], reverse=True)
    for term, count in all_time[:20]:
        bar = "█" * min(int(count / 10), 40)
        print(f"{term:<{w}}  {count:>6}  {bar}")

    # Per-month breakdown for top 20 all-time terms
    print("\n── Per-month counts (top 20 terms, last 18 months) ───────────")
    all_months_sorted = sorted({m for months in term_months.values() for m in months.keys()})
    display_months = all_months_sorted[-18:]

    top20_terms = [t for t, _ in all_time[:20]]
    label_w = max(len(t) for t in top20_terms) + 1
    col_w = 5  # each month column width

    # Header row
    month_headers = "  ".join(m[5:] for m in display_months)  # show MM only
    year_headers = "        ".join(
        m[:4] if i == 0 or display_months[i][:4] != display_months[i - 1][:4] else "    "
        for i, m in enumerate(display_months)
    )
    print(f"\n{'':<{label_w}}  {year_headers}")
    print(f"{'Term':<{label_w}}  {month_headers}")
    print("─" * (label_w + 2 + len(month_headers)))

    for term in top20_terms:
        monthly = term_months[term]
        counts = [monthly.get(m, 0) for m in display_months]
        row = "  ".join(f"{c:>{col_w - 2}}" if c else "   ·" for c in counts)
        print(f"{term:<{label_w}}  {row}")

if __name__ == "__main__":
    main()
