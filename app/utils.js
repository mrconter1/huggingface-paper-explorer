import axios from 'axios';
import { load } from 'cheerio';

export async function getPapers(timeFrame) {
  const baseUrl = 'https://huggingface.co/papers';
  const today = new Date();
  let papers = [];
  let daysToFetch = 1;

  switch (timeFrame) {
    case 'today':
      daysToFetch = 1;
      break;
    case 'three_days':
      daysToFetch = 3;
      break;
    case 'week':
      daysToFetch = 7;
      break;
    case 'month':
      daysToFetch = 30;
      break;
    default:
      daysToFetch = 1;
  }

  const seenPapers = new Set();

  for (let i = 0; i < daysToFetch; i++) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const url = `${baseUrl}?date=${date.toISOString().split('T')[0]}`;
    const dailyPapers = await fetchPapersForDate(url);
    
    // Filter out duplicates
    const uniqueDailyPapers = dailyPapers.filter(paper => {
      if (seenPapers.has(paper.title)) {
        return false;
      }
      seenPapers.add(paper.title);
      return true;
    });

    papers = [...papers, ...uniqueDailyPapers];
  }

  // Sort papers by upvotes for three_days, week, and month views
  if (timeFrame !== 'today') {
    papers.sort((a, b) => b.upvotes - a.upvotes);
  }

  return papers;
}

async function fetchPapersForDate(url) {
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
    console.error(`Error fetching papers for ${url}:`, error);
    return [];
  }
}