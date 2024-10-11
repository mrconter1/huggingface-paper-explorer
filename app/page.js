import React from 'react';
import axios from 'axios';
import { load } from 'cheerio';

const PaperRow = ({ title, image, upvotes, link, comments }) => (
  <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6 transition-all duration-300 hover:shadow-xl">
    <div className="md:flex">
      <div className="md:flex-shrink-0">
        <img className="h-56 w-full object-cover md:w-56" src={image} alt={title} />
      </div>
      <div className="p-8 w-full">
        <div className="flex justify-between items-start mb-4">
          <a href={link} className="block text-xl leading-tight font-semibold text-white hover:underline">{title}</a>
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-gray-700 rounded-full px-3 py-1 text-sm font-semibold text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              {upvotes}
            </div>
            <div className="flex items-center text-gray-400">
              <svg className="h-5 w-5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              {comments}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

async function getPapers() {
  const url = 'https://huggingface.co/papers?date=2024-10-10';
  try {
    const { data: html } = await axios.get(url);
    const $ = load(html);
    const papers = [];

    $('.relative.flex.flex-col').each((index, element) => {
      const $element = $(element);
      const title = $element.find('h3 a').text().trim();
      const image = $element.find('img').attr('src');
      const upvotes = $element.find('.leading-none').text().trim();
      const link = $element.find('h3 a').attr('href');
      const comments = $element.find('a[href$="#community"]').text().trim();

      // Only add the paper if it has all required fields
      if (title && image && upvotes && link && comments) {
        papers.push({
          title,
          image,
          upvotes,
          link: 'https://huggingface.co' + link,
          comments
        });
      }
    });

    return papers;
  } catch (error) {
    console.error('Error fetching papers:', error);
    return [];
  }
}

export default async function Home() {
  const papers = await getPapers();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Hugging Face Papers</h1>
      <div className="max-w-4xl mx-auto">
        {papers.length > 0 ? (
          papers.map((paper, index) => (
            <PaperRow key={index} {...paper} />
          ))
        ) : (
          <p className="text-center text-gray-400">No papers found.</p>
        )}
      </div>
    </div>
  );
}