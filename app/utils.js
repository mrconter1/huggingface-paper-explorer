import axios from 'axios';
import { load } from 'cheerio';

export async function getPapers(timeFrame) {
  const baseUrl = 'https://huggingface.co/papers';
  const today = new Date();
  let url;

  if (timeFrame === 'today') {
    url = `${baseUrl}?date=${today.toISOString().split('T')[0]}`;
  } else if (timeFrame === 'week') {
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    url = `${baseUrl}?date=${weekAgo.toISOString().split('T')[0]}`;
  } else {
    url = baseUrl;
  }

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

    if (timeFrame === 'week') {
      papers.sort((a, b) => b.upvotes - a.upvotes);
    }

    return papers;
  } catch (error) {
    console.error('Error fetching papers:', error);
    return [];
  }
}