'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDownIcon } from 'lucide-react';

const TimeFrameSelector = ({ timeFrame, setTimeFrame }) => (
  <div className="relative inline-block">
    <select 
      value={timeFrame} 
      onChange={(e) => setTimeFrame(e.target.value)}
      className="appearance-none bg-gray-800 text-white border border-gray-700 rounded-full px-6 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold cursor-pointer"
    >
      <option value="today">Top Today</option>
      <option value="week">Top This Week</option>
      <option value="month">Top This Month</option>
    </select>
    <ChevronDownIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
  </div>
);

const PaperRow = ({ title, image, upvotes, link, comments, submittedBy }) => (
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
      </div>
    </div>
  </div>
);

export default function PaperDashboard({ initialPapers }) {
  const [timeFrame, setTimeFrame] = useState('today');
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
  }, [timeFrame]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">HuggingFace Paper Explorer</h1>
          <p className="text-xl text-gray-400">Discover top AI research papers from the HuggingFace community</p>
        </div>
        <div className="flex justify-center mb-8">
          <TimeFrameSelector timeFrame={timeFrame} setTimeFrame={setTimeFrame} />
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : papers.length > 0 ? (
          papers.map((paper, index) => (
            <PaperRow key={index} {...paper} />
          ))
        ) : (
          <p className="text-center text-gray-400 text-xl">No papers found for the selected time frame.</p>
        )}
      </div>
    </div>
  );
}