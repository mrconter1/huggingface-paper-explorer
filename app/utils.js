import axios from 'axios';
import { load } from 'cheerio';
import { db } from './db';

const BATCH_SIZE = 2;
const BATCH_DELAY_MS = 1000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function getDateRange(timeFrame, offset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDate, endDate;

  switch (timeFrame) {
    case 'today': {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - offset);
      endDate = new Date(startDate);
      break;
    }
    case 'three_days': {
      endDate = new Date(today);
      endDate.setDate(today.getDate() - offset * 3);
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 2);
      break;
    }
    case 'week': {
      const dayOfWeek = (today.getDay() + 6) % 7;
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(today.getDate() - dayOfWeek);
      startDate = new Date(startOfThisWeek);
      startDate.setDate(startOfThisWeek.getDate() - offset * 7);
      endDate = offset === 0 ? new Date(today) : new Date(startDate);
      if (offset > 0) endDate.setDate(startDate.getDate() + 6);
      break;
    }
    case 'month': {
      const rawMonth = today.getMonth() - offset;
      const targetYear = today.getFullYear() + Math.floor(rawMonth / 12);
      const targetMonth = ((rawMonth % 12) + 12) % 12;
      startDate = new Date(targetYear, targetMonth, 1);
      endDate = offset === 0
        ? new Date(today)
        : new Date(targetYear, targetMonth + 1, 0);
      break;
    }
    case 'year': {
      const targetYear = today.getFullYear() - offset;
      startDate = new Date(targetYear, 0, 1);
      endDate = offset === 0 ? new Date(today) : new Date(targetYear, 11, 31);
      break;
    }
    default: {
      startDate = new Date(today);
      endDate = new Date(today);
    }
  }

  if (endDate > today) endDate = new Date(today);
  return { startDate, endDate };
}

const fmt = (d) => d.toISOString().split('T')[0];

const LIMITS = { today: 50, three_days: 75, week: 100, month: 100, year: 150, all: 200 };

const mapRows = (rows) => rows.map(row => ({
  title: row.title, link: row.link, image: row.image,
  upvotes: row.upvotes, comments: row.comments, submittedBy: row.submitted_by,
}));

export async function getPapers(timeFrame, offset = 0) {
  const limit = LIMITS[timeFrame] ?? 100;

  // "all" queries the entire DB with no date filter
  if (timeFrame === 'all') {
    try {
      const result = await db.execute({
        sql: `SELECT arxiv_id, title, link, image, MAX(upvotes) as upvotes, comments, submitted_by
              FROM papers GROUP BY arxiv_id ORDER BY upvotes DESC LIMIT ?`,
        args: [limit],
      });
      if (result.rows.length > 0) return mapRows(result.rows);
    } catch (err) {
      console.warn('Turso query failed for all:', err.message);
    }
    return [];
  }

  const { startDate, endDate } = getDateRange(timeFrame, offset);
  const start = fmt(startDate);
  const end = fmt(endDate);

  // Try Turso first
  try {
    const result = await db.execute({
      sql: `SELECT arxiv_id, title, link, image, MAX(upvotes) as upvotes, comments, submitted_by
            FROM papers
            WHERE date BETWEEN ? AND ?
            GROUP BY arxiv_id
            ORDER BY upvotes DESC
            LIMIT ?`,
      args: [start, end, limit],
    });

    if (result.rows.length > 0) return mapRows(result.rows);
  } catch (err) {
    console.warn('Turso query failed, falling back to scrape:', err.message);
  }

  // Fall back to scraping if DB has no data for this range
  console.log(`No DB data for ${start}–${end}, scraping HuggingFace...`);
  const scraped = await scrape(timeFrame, startDate, endDate);
  return scraped.slice(0, limit);
}

async function scrape(timeFrame, startDate, endDate) {
  const baseUrl = 'https://huggingface.co/papers';
  const dates = [];
  const cursor = new Date(endDate);
  while (cursor >= startDate) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }

  const urls = dates.map(d => `${baseUrl}?date=${fmt(d)}`);
  const allResults = [];

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    if (i > 0) await sleep(BATCH_DELAY_MS);
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(url => fetchPapersForDate(url)));
    allResults.push(...batchResults);
  }

  const seenPapers = new Set();
  let papers = [];
  for (const dailyPapers of allResults) {
    const unique = dailyPapers.filter(p => {
      if (seenPapers.has(p.title)) return false;
      seenPapers.add(p.title);
      return true;
    });
    papers = [...papers, ...unique];
  }

  if (timeFrame !== 'today') papers.sort((a, b) => b.upvotes - a.upvotes);
  return papers;
}

async function fetchPapersForDate(url, attempt = 0) {
  try {
    const { data: html } = await axios.get(url);
    const $ = load(html);
    const papers = [];

    $('.relative.flex.flex-col').each((_, element) => {
      const $el = $(element);
      const title = $el.find('h3 a').text().trim();
      const image = $el.find('img').attr('src');
      const upvotes = parseInt($el.find('.shadow-alternate input[type="checkbox"] + svg + div').text().trim(), 10);
      const link = $el.find('h3 a').attr('href');
      const comments = $el.find('a[href$="#community"]').text().trim();
      const submittedBy = $el.find('.pointer-events-none').text().replace('Submitted by', '').trim();

      if (title && image && !isNaN(upvotes) && link && comments) {
        const fullImage = image?.startsWith('/') ? 'https://huggingface.co' + image : image;
        papers.push({ title, image: fullImage, upvotes, link: 'https://huggingface.co' + link, comments, submittedBy });
      }
    });

    return papers;
  } catch (error) {
    if (error.response?.status === 429 && attempt < 3) {
      const waitMs = (attempt + 1) * 4000;
      console.warn(`Rate limited, retrying ${url} in ${waitMs / 1000}s (attempt ${attempt + 1})`);
      await sleep(waitMs);
      return fetchPapersForDate(url, attempt + 1);
    }
    console.error(`Error fetching papers for ${url}:`, error.message);
    return [];
  }
}
