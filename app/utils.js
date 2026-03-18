import axios from 'axios';
import { load } from 'cheerio';

const BATCH_SIZE = 2;
const BATCH_DELAY_MS = 1000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getDateRange(timeFrame, offset) {
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
      // ISO week: Monday–Sunday
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
    default: {
      startDate = new Date(today);
      endDate = new Date(today);
    }
  }

  if (endDate > today) endDate = new Date(today);
  return { startDate, endDate };
}

export { getDateRange };

export async function getPapers(timeFrame, offset = 0) {
  const baseUrl = 'https://huggingface.co/papers';
  const { startDate, endDate } = getDateRange(timeFrame, offset);

  const dates = [];
  const cursor = new Date(endDate);
  while (cursor >= startDate) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }

  const urls = dates.map(d => `${baseUrl}?date=${d.toISOString().split('T')[0]}`);

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
    const uniqueDailyPapers = dailyPapers.filter(paper => {
      if (seenPapers.has(paper.title)) return false;
      seenPapers.add(paper.title);
      return true;
    });
    papers = [...papers, ...uniqueDailyPapers];
  }

  if (timeFrame !== 'today') {
    papers.sort((a, b) => b.upvotes - a.upvotes);
  }

  return papers;
}

async function fetchPapersForDate(url, attempt = 0) {
  try {
    const { data: html } = await axios.get(url);
    const $ = load(html);
    const papers = [];

    $('.relative.flex.flex-col').each((index, element) => {
      const $element = $(element);
      const title = $element.find('h3 a').text().trim();
      const image = $element.find('img').attr('src');
      const upvotes = parseInt($element.find('.shadow-alternate input[type="checkbox"] + svg + div').text().trim(), 10);
      const link = $element.find('h3 a').attr('href');
      const comments = $element.find('a[href$="#community"]').text().trim();
      const submittedBy = $element.find('.pointer-events-none').text().replace('Submitted by', '').trim();

      if (title && image && !isNaN(upvotes) && link && comments) {
        papers.push({
          title,
          image,
          upvotes,
          link: 'https://huggingface.co' + link,
          comments,
          submittedBy
        });
      }
    });

    return papers;
  } catch (error) {
    if (error.response?.status === 429 && attempt < 3) {
      const waitMs = (attempt + 1) * 4000; // 4s, 8s, 12s
      console.warn(`Rate limited, retrying ${url} in ${waitMs / 1000}s (attempt ${attempt + 1})`);
      await sleep(waitMs);
      return fetchPapersForDate(url, attempt + 1);
    }
    console.error(`Error fetching papers for ${url}:`, error.message);
    return [];
  }
}
