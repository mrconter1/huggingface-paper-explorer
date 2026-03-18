'use client';

import React, { useState, useEffect } from 'react';

const TIME_FRAMES = [
  { value: 'today', label: 'Today' },
  { value: 'three_days', label: '3 Days' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

const TimeFrameSelector = ({ timeFrame, setTimeFrame }) => (
  <div className="flex gap-1.5 bg-slate-800/60 p-1.5 rounded-full border border-slate-700/50">
    {TIME_FRAMES.map(({ value, label }) => (
      <button
        key={value}
        onClick={() => {
          setTimeFrame(value);
          localStorage.setItem('selectedTimeFrame', value);
        }}
        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
          timeFrame === value
            ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/25'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

const SkeletonCard = () => (
  <div className="bg-slate-800/50 rounded-2xl overflow-hidden mb-4 border border-slate-700/30 animate-pulse">
    <div className="flex">
      <div className="w-14 flex-shrink-0 flex items-center justify-center border-r border-slate-700/40">
        <div className="h-6 w-5 bg-slate-700 rounded" />
      </div>
      <div className="w-44 h-44 bg-slate-700/60 flex-shrink-0" />
      <div className="p-5 flex-1 space-y-3">
        <div className="h-4 bg-slate-700 rounded-full w-3/4" />
        <div className="h-4 bg-slate-700 rounded-full w-1/2" />
        <div className="h-3 bg-slate-700/60 rounded-full w-1/4 mt-1" />
        <div className="flex gap-2.5 mt-4">
          <div className="h-8 bg-slate-700 rounded-full w-32" />
          <div className="h-8 bg-slate-700 rounded-full w-24" />
        </div>
      </div>
    </div>
  </div>
);

const ImageWithFallback = ({ src, alt }) => {
  const [errored, setErrored] = useState(false);

  if (errored || !src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-700/40">
        <svg className="w-10 h-10 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.25 48.25 0 01-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      </div>
    );
  }

  return (
    <img
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 will-change-transform"
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
    />
  );
};

const PaperRow = ({ title, image, upvotes, link, comments, submittedBy, index }) => {
  const arxivId = link.split('/').pop();
  const arxivPdfLink = `https://arxiv.org/pdf/${arxivId}`;

  return (
    <div className="group bg-slate-800/50 hover:bg-slate-800/80 rounded-2xl overflow-hidden mb-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-slate-900/60 border border-slate-700/40">
      <div className="flex">
        <div className="w-14 flex-shrink-0 flex items-center justify-center font-bold text-lg border-r border-slate-700/40 text-slate-600">
          {index + 1}
        </div>
        <div className="flex-shrink-0 w-44 h-44 overflow-hidden rounded-xl m-2">
          <ImageWithFallback src={image} alt={title} />
        </div>
        <div className="p-5 flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex justify-between items-start gap-4 mb-2">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white font-semibold text-sm leading-snug hover:text-amber-400 transition-colors duration-200 line-clamp-2"
              >
                {title}
              </a>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-full px-2.5 py-1 text-xs font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  {upvotes}
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-xs">
                  <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {comments}
                </div>
              </div>
            </div>
            <p className="text-slate-600 text-xs">
              Submitted by <span className="text-slate-400">{submittedBy}</span>
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-xs py-1.5 px-4 rounded-full inline-flex items-center transition-colors duration-200"
            >
              HuggingFace
            </a>
            <a
              href={arxivPdfLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-700/80 hover:bg-slate-600 text-slate-300 font-semibold text-xs py-1.5 px-4 rounded-full inline-flex items-center gap-1.5 transition-colors duration-200 border border-slate-600/60"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              arXiv PDF
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

    const timeFrameText = {
      today: 'Today',
      three_days: 'Last 3 Days',
      week: 'This Week',
      month: 'This Month',
    };
    document.title = `HuggingFace Papers - Top ${timeFrameText[timeFrame]}`;
  }, [timeFrame]);

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(251,191,36,0.06),transparent)] pointer-events-none" />
      <div className="relative max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500 bg-clip-text text-transparent tracking-tight">
            HF Paper Explorer
          </h1>
          <p className="text-slate-400 mb-6 text-sm">Top AI research papers from the HuggingFace community</p>
          <div className="flex justify-center gap-2.5 mb-5">
            <a
              href="https://github.com/mrconter1/huggingface-paper-explorer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-400 hover:text-white text-xs border border-slate-700/80 hover:border-slate-500 rounded-full px-4 py-1.5 transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              GitHub
            </a>
            <a
              href="https://huggingface.co/papers"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-400 hover:text-white text-xs border border-slate-700/80 hover:border-slate-500 rounded-full px-4 py-1.5 transition-all duration-200"
            >
              HuggingFace Papers
            </a>
          </div>
          <p className="text-xs text-slate-500">All paper data belongs to their respective owners and the HuggingFace community.</p>
        </div>

        <div className="flex justify-center mb-8">
          <TimeFrameSelector timeFrame={timeFrame} setTimeFrame={setTimeFrame} />
        </div>

        {loading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : papers.length > 0 ? (
          <>
            <p className="text-center text-slate-600 text-xs mb-5">{papers.length} papers</p>
            {papers.map((paper, index) => (
              <PaperRow key={index} {...paper} index={index} />
            ))}
          </>
        ) : (
          <p className="text-center text-slate-400 text-lg">No papers found for the selected time frame.</p>
        )}
      </div>
    </div>
  );
}
