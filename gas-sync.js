// ===== HUGGINGFACE PAPERS → TURSO DAILY SYNC =====
// Google Apps Script
//
// HOW TO USE:
//   1. Go to https://script.google.com and create a new project
//   2. Paste this entire file
//   3. Go to Project Settings (gear icon) > Script Properties > Add:
//        TURSO_DATABASE_URL  →  your libsql://... or https://... URL
//        TURSO_AUTH_TOKEN    →  your auth token
//   4. To test manually: select "testSync" in the function dropdown and click Run
//   5. To run full 30-day sync manually: select "dailyPaperSync" and click Run
//   6. For automatic daily runs: Triggers (clock icon) > Add Trigger >
//        dailyPaperSync | Time-driven | Day timer | pick a time

const DAYS_BACK = 30;
const HF_BASE = 'https://huggingface.co/papers';

// ── Config ────────────────────────────────────────────────────────────────────

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  let url = props.getProperty('TURSO_DATABASE_URL') || '';
  const token = props.getProperty('TURSO_AUTH_TOKEN') || '';

  if (!url || !token) {
    throw new Error(
      'Missing Script Properties! Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN ' +
      'under Project Settings > Script Properties.'
    );
  }

  // Strip accidental "KEY=value" format if the property value includes the key name
  url = url.replace(/^[A-Z_]+=/, '');
  const token_clean = token.replace(/^[A-Z_]+=/, '');

  // Accept both libsql:// and https:// formats
  url = url.replace('libsql://', 'https://');
  console.log(`Config loaded. Turso URL: ${url.substring(0, 40)}...`);
  return { url, token: token_clean };
}

// ── Main entry ────────────────────────────────────────────────────────────────

function dailyPaperSync() {
  console.log('====================================================');
  console.log('=== HuggingFace Papers → Turso  |  DAILY SYNC   ===');
  console.log('====================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Days to sync: ${DAYS_BACK}`);

  const config = getConfig();
  const today = new Date();
  let totalPapers = 0;
  let errorDays = 0;
  let skippedDays = 0;

  for (let i = 0; i < DAYS_BACK; i++) {
    const target = new Date(today);
    target.setDate(today.getDate() - i);
    const dateStr = formatDate(target);

    console.log('----------------------------------------------------');
    console.log(`[${i + 1}/${DAYS_BACK}] Processing date: ${dateStr}`);

    try {
      const papers = fetchPapersForDate(dateStr);

      if (papers.length === 0) {
        console.log(`  → No papers found for ${dateStr} (weekend or holiday?)`);
        skippedDays++;
      } else {
        console.log(`  → Scraped ${papers.length} papers, sending to Turso...`);
        upsertPapers(papers, config);
        totalPapers += papers.length;
        console.log(`  ✓ Done: ${papers.length} papers upserted for ${dateStr}`);
      }
    } catch (e) {
      console.error(`  ✗ FAILED for ${dateStr}: ${e.message}`);
      errorDays++;
    }

    // Polite delay between HuggingFace page fetches
    if (i < DAYS_BACK - 1) {
      console.log(`  Waiting 2s before next date...`);
      Utilities.sleep(2000);
    }
  }

  console.log('====================================================');
  console.log(`=== SYNC COMPLETE`);
  console.log(`    Papers synced : ${totalPapers}`);
  console.log(`    Days skipped  : ${skippedDays} (no papers)`);
  console.log(`    Days failed   : ${errorDays}`);
  console.log('====================================================');
}

// ── Test function (run this first!) ──────────────────────────────────────────
// Fetches the last 3 days and prints what it found WITHOUT writing to the DB.
// Use this to verify scraping works before running the full sync.

function testSync() {
  console.log('====================================================');
  console.log('=== TEST MODE: last 3 days, NO database writes   ===');
  console.log('====================================================');

  const today = new Date();

  for (let i = 0; i < 3; i++) {
    const target = new Date(today);
    target.setDate(today.getDate() - i);
    const dateStr = formatDate(target);

    console.log('----------------------------------------------------');
    console.log(`Fetching: ${dateStr}`);

    try {
      const papers = fetchPapersForDate(dateStr);
      console.log(`Found ${papers.length} papers`);

      papers.forEach((p, idx) => {
        console.log(`  [${idx + 1}] ${p.title}`);
        console.log(`       arxiv_id    : ${p.arxiv_id}`);
        console.log(`       link        : ${p.link}`);
        console.log(`       upvotes     : ${p.upvotes}`);
        console.log(`       comments    : ${p.comments}`);
        console.log(`       submitted_by: ${p.submitted_by}`);
        console.log(`       image       : ${p.image ? p.image.substring(0, 60) + '...' : 'null'}`);
        console.log(`       row id      : ${p.id}`);
      });
    } catch (e) {
      console.error(`ERROR for ${dateStr}: ${e.message}`);
    }

    if (i < 2) {
      console.log('Waiting 2s...');
      Utilities.sleep(2000);
    }
  }

  console.log('====================================================');
  console.log('=== TEST DONE — nothing was written to the DB    ===');
  console.log('====================================================');
}

// Same as testSync but also writes to Turso — useful after testSync looks good

function testSyncWithWrite() {
  console.log('====================================================');
  console.log('=== TEST+WRITE MODE: last 3 days, WRITES TO DB  ===');
  console.log('====================================================');

  const config = getConfig();
  const today = new Date();

  for (let i = 0; i < 3; i++) {
    const target = new Date(today);
    target.setDate(today.getDate() - i);
    const dateStr = formatDate(target);

    console.log('----------------------------------------------------');
    console.log(`Fetching: ${dateStr}`);

    try {
      const papers = fetchPapersForDate(dateStr);
      console.log(`Found ${papers.length} papers`);

      if (papers.length > 0) {
        console.log(`Writing to Turso...`);
        upsertPapers(papers, config);
        console.log(`✓ Upserted ${papers.length} papers`);
      }
    } catch (e) {
      console.error(`ERROR for ${dateStr}: ${e.message}`);
    }

    if (i < 2) {
      console.log('Waiting 2s...');
      Utilities.sleep(2000);
    }
  }

  console.log('====================================================');
  console.log('=== TEST+WRITE DONE                              ===');
  console.log('====================================================');
}

// ── Scraping ──────────────────────────────────────────────────────────────────

function fetchPapersForDate(dateStr, attempt) {
  attempt = attempt || 0;
  const url = `${HF_BASE}?date=${dateStr}`;
  console.log(`  Fetching URL: ${url} (attempt ${attempt + 1})`);

  const response = UrlFetchApp.fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GoogleAppsScript)' },
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  console.log(`  HTTP status: ${status}`);

  if (status === 429 && attempt < 3) {
    const wait = (attempt + 1) * 30000;
    console.warn(`  Rate limited! Waiting ${wait / 1000}s before retry...`);
    Utilities.sleep(wait);
    return fetchPapersForDate(dateStr, attempt + 1);
  }

  if (status !== 200) {
    console.warn(`  Non-200 response for ${dateStr}, returning empty array`);
    return [];
  }

  const html = response.getContentText();
  console.log(`  HTML length: ${html.length} chars`);

  const papers = parsePapersFromHtml(html, dateStr);
  console.log(`  Parsed ${papers.length} papers from HTML`);
  return papers;
}

function parsePapersFromHtml(html, dateStr) {
  const papers = [];

  // Split the page into card sections — each paper card starts with this class combo
  const segments = html.split(/(?=class="[^"]*\brelative\b[^"]*\bflex\b[^"]*\bflex-col\b)/);
  console.log(`  HTML split into ${segments.length} segments, scanning for paper cards...`);

  const seen = new Set();
  let cardsWithLink = 0;
  let cardsSkippedDupe = 0;
  let cardsSkippedNoTitle = 0;

  // segments[0] is everything before the first card (doctype, head, scripts) — skip it
  for (let si = 1; si < segments.length; si++) {
    const segment = segments[si];
    // Every valid paper card has a /papers/ARXIV_ID link inside an h3
    const linkMatch = segment.match(/<h3[^>]*>[\s\S]*?href="(\/papers\/([^"/?#\s]+))"/);
    if (!linkMatch) continue;
    cardsWithLink++;

    const arxivId = linkMatch[2];

    if (seen.has(arxivId)) {
      cardsSkippedDupe++;
      continue;
    }
    seen.add(arxivId);

    const link = 'https://huggingface.co' + linkMatch[1];

    // Title text
    const titleMatch = segment.match(/<h3[^>]*>[\s\S]*?href="\/papers\/[^"]*"[^>]*>([^<]+)<\/a>/);
    if (!titleMatch) {
      cardsSkippedNoTitle++;
      continue;
    }
    const title = decodeHtmlEntities(titleMatch[1].trim());

    // Image — prefer cdn-thumbnails URLs
    const imgMatch =
      segment.match(/src="(https?:\/\/[^"]*(?:cdn-thumbnails|thumbnail)[^"]*)"/i) ||
      segment.match(/<img[^>]+src="([^"]+)"/);
    let image = imgMatch ? imgMatch[1] : null;
    if (image && image.startsWith('/')) image = 'https://huggingface.co' + image;

    // Upvotes — the number inside the vote button area (shadow-alternate div)
    const upvoteMatch = segment.match(/shadow-alternate[\s\S]{0,800}?<div[^>]*>\s*(\d+)\s*<\/div>/);
    const upvotes = upvoteMatch ? parseInt(upvoteMatch[1], 10) : 0;

    // Comments count
    const commentsMatch = segment.match(/href="[^"]*#community[^"]*"[^>]*>\s*([^<]*?)\s*<\/a>/);
    const comments = commentsMatch ? commentsMatch[1].trim() : '0';

    // Submitted by username
    const submittedByMatch = segment.match(/Submitted\s+by[\s\S]{0,200}?href="[^"]*"[^>]*>([^<]+)<\/a>/i);
    const submittedBy = submittedByMatch ? submittedByMatch[1].trim() : '';

    papers.push({
      id: `${arxivId}_${dateStr}`,
      arxiv_id: arxivId,
      title,
      link,
      image,
      upvotes: isNaN(upvotes) ? 0 : upvotes,
      comments,
      submitted_by: submittedBy,
      date: dateStr
    });
  }

  console.log(`  Card stats → with paper link: ${cardsWithLink}, dupes skipped: ${cardsSkippedDupe}, no title: ${cardsSkippedNoTitle}`);
  return papers;
}

// ── Turso ─────────────────────────────────────────────────────────────────────

function upsertPapers(papers, config) {
  console.log(`  Building Turso pipeline for ${papers.length} papers...`);

  // INSERT … ON CONFLICT(id) DO UPDATE  →  new papers are inserted,
  // existing papers (same arxiv_id + date) get their upvote/comment counts refreshed
  const sql = [
    'INSERT INTO papers (id, arxiv_id, title, link, image, upvotes, comments, submitted_by, date)',
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    'ON CONFLICT(id) DO UPDATE SET',
    '  upvotes = excluded.upvotes,',
    '  comments = excluded.comments'
  ].join(' ');

  const requests = papers.map(p => ({
    type: 'execute',
    stmt: {
      sql,
      args: [
        makeArg(p.id),
        makeArg(p.arxiv_id),
        makeArg(p.title),
        makeArg(p.link),
        makeArg(p.image),
        makeArg(p.upvotes),
        makeArg(p.comments),
        makeArg(p.submitted_by),
        makeArg(p.date)
      ]
    }
  }));
  requests.push({ type: 'close' });

  const endpoint = `${config.url}/v2/pipeline`;
  console.log(`  POST → ${endpoint.substring(0, 50)}...`);

  const response = UrlFetchApp.fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({ requests }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  console.log(`  Turso response status: ${status}`);

  if (status !== 200) {
    const body = response.getContentText().substring(0, 400);
    console.error(`  Turso error body: ${body}`);
    throw new Error(`Turso returned HTTP ${status}`);
  }

  // Log a summary from the response results
  const results = JSON.parse(response.getContentText()).results;
  const okCount = results.filter(r => r.type === 'ok').length;
  const errCount = results.filter(r => r.type === 'error').length;
  console.log(`  Turso pipeline results: ${okCount} ok, ${errCount} errors (+ 1 close)`);

  if (errCount > 0) {
    const firstError = results.find(r => r.type === 'error');
    console.error(`  First Turso error: ${JSON.stringify(firstError)}`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeArg(value) {
  if (value === null || value === undefined) return { type: 'null' };
  return { type: 'text', value: String(value) };
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Prints the raw HTML card segment for a specific arxiv ID so you can inspect
// the actual markup and fix regex patterns. Run this from the function dropdown.
function debugCardHtml() {
  const TARGET_ARXIV_ID = '2603.19216'; // change this to whatever ID you want to inspect
  const DATE = formatDate(new Date()); // today

  const url = `${HF_BASE}?date=${DATE}`;
  console.log(`Fetching ${url}...`);
  const response = UrlFetchApp.fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GoogleAppsScript)' },
    muteHttpExceptions: true
  });

  const html = response.getContentText();
  const segments = html.split(/(?=class="[^"]*\brelative\b[^"]*\bflex\b[^"]*\bflex-col\b)/);
  console.log(`Total segments: ${segments.length}`);

  for (const segment of segments) {
    if (segment.indexOf(`/papers/${TARGET_ARXIV_ID}`) === -1) continue;

    console.log(`\n=== RAW CARD HTML FOR ${TARGET_ARXIV_ID} (first 3000 chars) ===\n`);
    console.log(segment.substring(0, 3000));
    console.log(`\n=== END (segment total length: ${segment.length}) ===`);
    return;
  }

  console.log(`Could not find a segment containing /papers/${TARGET_ARXIV_ID}`);
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
