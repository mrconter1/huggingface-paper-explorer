import { NextResponse } from 'next/server';
import { db } from '../../db';

export const revalidate = 3600; // Cache for 1 hour

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'in', 'on', 'to', 'with',
  'from', 'by', 'at', 'is', 'are', 'be', 'as', 'via', 'its', 'it', 'we',
  'our', 'your', 'their', 'this', 'that', 'these', 'those', 'into', 'about',
  'using', 'based', 'toward', 'towards', 'without', 'within', 'across',
  'through', 'between', 'over', 'under', 'can', 'not', 'no', 'new', 'more',
  'beyond', 'better', 'efficient', 'effective', 'improved', 'improving',
  'enhancing', 'enhanced', 'approach', 'method', 'framework', 'system',
  'model', 'models', 'learning', 'language', 'large', 'end', 'do', 'does',
  'how', 'when', 'what', 'where', 'which', 'than', 'then', 'also', 'both',
  'each', 'all', 'any', 'few', 'some', 'only', 'just', 'up', 'down', 'out',
  'off', 'high', 'low', 'deep', 'pre', 'post', 'via', 'per',
]);

function tokenize(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^-+|-+$/g, ''))
    .filter(w => w.length > 1);
}

function extractTerms(title) {
  const tokens = tokenize(title);
  const terms = new Set();
  const filtered = tokens.filter(t => !STOPWORDS.has(t) && t.length >= 3);
  for (const t of filtered) terms.add(t);
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i], b = tokens[i + 1];
    if ((!STOPWORDS.has(a) || !STOPWORDS.has(b)) && a.length >= 2 && b.length >= 2) {
      terms.add(`${a} ${b}`);
    }
  }
  return terms;
}

export async function GET() {
  const result = await db.execute(
    `SELECT title, substr(date, 1, 7) as month FROM papers WHERE title IS NOT NULL AND date IS NOT NULL ORDER BY date`
  );

  const termMonths = {};
  const monthlyTotals = {};
  const seenInMonth = new Set();

  for (const row of result.rows) {
    const title = row.title;
    const month = row.month;
    if (!title || !month) continue;

    const key = `${month}::${title}`;
    if (seenInMonth.has(key)) continue;
    seenInMonth.add(key);

    monthlyTotals[month] = (monthlyTotals[month] || 0) + 1;

    for (const term of extractTerms(title)) {
      if (!termMonths[term]) termMonths[term] = {};
      termMonths[term][month] = (termMonths[term][month] || 0) + 1;
    }
  }

  const allMonths = [...new Set(
    Object.values(termMonths).flatMap(m => Object.keys(m))
  )].sort();

  const terms = Object.entries(termMonths)
    .map(([term, months]) => ({
      term,
      total: Object.values(months).reduce((a, b) => a + b, 0),
      months,
    }))
    .filter(t => t.total >= 10)
    .sort((a, b) => b.total - a.total)
    .slice(0, 60);

  return NextResponse.json({ terms, allMonths, monthlyTotals });
}
