'use client';

import React, { useState, useEffect } from 'react';

const TimeFrameSelector = ({ timeFrame, setTimeFrame }) => (
  <div className="relative inline-block">
    <select 
      value={timeFrame} 
      onChange={(e) => {
        setTimeFrame(e.target.value);
        localStorage.setItem('selectedTimeFrame', e.target.value);
      }}
      className="appearance-none bg-gray-800 text-white border border-gray-700 rounded-full px-6 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold cursor-pointer"
    >
      <option value="today">Top Today</option>
      <option value="three_days">Top Last 3 Days</option>
      <option value="week">Top This Week</option>
      <option value="month">Top This Month</option>
    </select>
    <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  </div>
);

const PaperRow = ({ title, image, upvotes, link, comments, submittedBy }) => {
  const arxivId = link.split('/').pop();
  const arxivPdfLink = `https://arxiv.org/pdf/${arxivId}`;

  return (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6 transition-all duration-300 hover:shadow-xl">
      <div className="md:flex">
        <div className="md:flex-shrink-0">
          <img className="h-56 w-full object-cover md:w-56" src={image} alt={title} />
        </div>
        <div className="p-8 w-full">
          <div className="flex justify-between items-start mb-4">
            <div>
              <a href={link} className="block text-xl leading-tight font-semibold text-white hover:underline mb-2">{title}</a>
              <div className="text-sm text-gray-400">Submitted by {submittedBy}</div>
            </div>
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
          <div className="flex space-x-4">
            <a
              href={link}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center transition-colors duration-300"
            >
              <span>View on HuggingFace</span>
            </a>
            <a
              href={arxivPdfLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded inline-flex items-center transition-colors duration-300"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>arXiv PDF</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PaperDashboard({ initialPapers, initialTimeFrame }) {
  const [timeFrame, setTimeFrame] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedTimeFrame') || initialTimeFrame;
    }
    return initialTimeFrame;
  });
  const [papers, setPapers] = useState(initialPapers);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPapers = async () => {
      setLoading(true);
      const response = await fetch(`/api/papers?timeFrame=${timeFrame}`);
      const newPapers = await response.json();
      setPapers(newPapers);
      setLoading(false);
    };

    fetchPapers();

    // Update the document title
    const timeFrameText = {
      today: 'Today',
      three_days: 'Last 3 Days',
      week: 'This Week',
      month: 'This Month'
    };
    document.title = `HuggingFace Papers - Top ${timeFrameText[timeFrame]}`;
  }, [timeFrame]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">HuggingFace Paper Explorer</h1>
          <p className="text-xl text-gray-400 mb-4">Discover top AI research papers from the HuggingFace community</p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
            <a
              href="https://github.com/mrconter1/huggingface-paper-explorer"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center justify-center transition-colors duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              View on GitHub
            </a>
            <a
              href="https://huggingface.co/papers"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded inline-flex items-center justify-center transition-colors duration-300"
            >
              Original HuggingFace Papers
            </a>
          </div>
          <p className="text-sm text-gray-400">All paper data and content belong to their respective owners and the HuggingFace community.</p>
        </div>
        <div className="flex justify-center mb-8">
          <TimeFrameSelector timeFrame={timeFrame} setTimeFrame={setTimeFrame} />
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : papers.length > 0 ? (
          <>
            <p className="text-center text-gray-400 mb-8">Showing {papers.length} unique papers</p>
            {papers.map((paper, index) => (
              <PaperRow key={index} {...paper} />
            ))}
          </>
        ) : (
          <p className="text-center text-gray-400 text-xl">No papers found for the selected time frame.</p>
        )}
      </div>
    </div>
  );
}