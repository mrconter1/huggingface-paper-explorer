import React from 'react';
import axios from 'axios';
import { load } from 'cheerio';

const CustomCard = ({ children, className = '' }) => (
  <div className={`bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
    {children}
  </div>
);

const PaperCard = ({ title, image, upvotes }) => (
  <CustomCard className="transition-all duration-300 hover:shadow-lg hover:scale-105">
    <div className="relative h-48 overflow-hidden">
      <img src={image} alt={title} className="w-full h-full object-cover" />
      <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-75 rounded-full px-2 py-1 text-sm flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        {upvotes}
      </div>
    </div>
    <div className="p-4">
      <h3 className="text-lg font-semibold text-white line-clamp-2">{title}</h3>
    </div>
  </CustomCard>
);

async function getPapers() {
  const url = 'https://huggingface.co/papers?date=2024-10-10';
  try {
    const { data: html } = await axios.get(url);
    const $ = load(html);
    const papers = [];

    $('.grid .relative').each((index, element) => {
      const title = $(element).find('h3 a').text().trim();
      const image = $(element).find('img').attr('src');
      const upvotes = $(element).find('.leading-none').text().trim();
      papers.push({ title, image, upvotes });
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {papers.length > 0 ? (
          papers.map((paper, index) => (
            <PaperCard key={index} {...paper} />
          ))
        ) : (
          <p className="col-span-full text-center text-gray-400">No papers found.</p>
        )}
      </div>
    </div>
  );
}