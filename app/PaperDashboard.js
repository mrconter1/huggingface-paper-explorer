'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

const TIME_FRAMES = [
  { value: 'today', label: 'Today' },
  { value: 'three_days', label: '3 Days' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All' },
];

const NAV_OPTIONS = [
  ...TIME_FRAMES,
  { value: 'trends', label: 'Trends', divider: true },
];

const SkeletonCard = () => (
  <div className="bg-slate-800/50 rounded-2xl overflow-hidden mb-4 border border-slate-700/30 animate-pulse">
    <div className="flex">
      <div className="w-10 sm:w-14 flex-shrink-0 flex items-center justify-center border-r border-slate-700/40">
        <div className="h-6 w-5 bg-slate-700 rounded" />
      </div>
      <div className="w-24 h-24 sm:w-44 sm:h-44 bg-slate-700/60 flex-shrink-0" />
      <div className="p-3 sm:p-5 flex-1 space-y-3">
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
  const resolvedSrc = src?.startsWith('/') ? `https://huggingface.co${src}` : src;

  if (errored || !resolvedSrc) {
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
      src={resolvedSrc}
      alt={alt}
      onError={() => setErrored(true)}
    />
  );
};

const fmtDate = (d) => {
  if (!d) return null;
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const PaperRow = ({ title, image, upvotes, link, comments, submittedBy, date, index }) => {
  const arxivId = link.split('/').pop();
  const arxivPdfLink = `https://arxiv.org/pdf/${arxivId}`;

  return (
    <div className="group bg-slate-800/50 hover:bg-slate-800/80 rounded-2xl overflow-hidden mb-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-slate-900/60 border border-slate-700/40">
      <div className="flex">
        <div className="w-10 sm:w-14 flex-shrink-0 flex items-center justify-center font-bold text-base sm:text-lg border-r border-slate-700/40 text-slate-600">
          {index + 1}
        </div>
        <div className="flex-shrink-0 w-24 h-24 sm:w-44 sm:h-44 overflow-hidden rounded-xl m-2">
          <ImageWithFallback src={image} alt={title} />
        </div>
        <div className="p-3 sm:p-5 flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex justify-between items-start gap-2 sm:gap-4 mb-2">
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
            <p className="text-slate-600 text-xs hidden sm:block">
              {fmtDate(date) && <span className="text-slate-500 mr-2">{fmtDate(date)}</span>}
              Submitted by <span className="text-slate-400">{submittedBy}</span>
            </p>
            <p className="text-slate-500 text-xs sm:hidden">
              {fmtDate(date)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
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

const getPeriodLabel = (timeFrame, offset) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (timeFrame === 'today') {
    if (offset === 0) return 'Today';
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    return fmt(d);
  }

  if (timeFrame === 'three_days') {
    const end = new Date(today);
    end.setDate(today.getDate() - offset * 3);
    const start = new Date(end);
    start.setDate(end.getDate() - 2);
    if (offset === 0) return `Last 3 Days`;
    return `${fmt(start)} – ${fmt(end)}`;
  }

  if (timeFrame === 'week') {
    const dayOfWeek = (today.getDay() + 6) % 7;
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - dayOfWeek);
    const start = new Date(startOfThisWeek);
    start.setDate(startOfThisWeek.getDate() - offset * 7);
    const end = offset === 0 ? new Date(today) : new Date(start);
    if (offset > 0) end.setDate(start.getDate() + 6);
    if (offset === 0) return `This Week`;
    return `${fmt(start)} – ${fmt(end)}`;
  }

  if (timeFrame === 'month') {
    const rawMonth = today.getMonth() - offset;
    const targetYear = today.getFullYear() + Math.floor(rawMonth / 12);
    const targetMonth = ((rawMonth % 12) + 12) % 12;
    const d = new Date(targetYear, targetMonth, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  if (timeFrame === 'year') {
    const y = today.getFullYear() - offset;
    return offset === 0 ? `${y}` : `${y}`;
  }

  if (timeFrame === 'all') return 'All Time';
};

// ── Trends ────────────────────────────────────────────────────────────────────

// Catmull-Rom → cubic bezier, alpha controls tension (0.15 = very slight smoothing)
const smoothPath = (pts, alpha = 0.18) => {
  if (pts.length < 2) return '';
  if (pts.length === 2)
    return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} L${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)}`;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) * alpha;
    const cp1y = p1[1] + (p2[1] - p0[1]) * alpha;
    const cp2x = p2[0] - (p3[0] - p1[0]) * alpha;
    const cp2y = p2[1] - (p3[1] - p1[1]) * alpha;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};

const TERM_COLORS = [
  '#f59e0b', '#60a5fa', '#34d399', '#f472b6', '#a78bfa',
  '#fb923c', '#2dd4bf', '#facc15', '#f87171', '#4ade80',
];

const CombinedChart = ({ terms, displayMonths, monthlyTotals, hoveredTerm, setHoveredTerm, showMonths, setShowMonths }) => {
  const top15 = terms.slice(0, 10);
  const fmtMonth = (m) => {
    const [y, mo] = m.split('-');
    return new Date(+y, +mo - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const pct = (count, month) => (count / Math.max(monthlyTotals[month] || 1, 1)) * 100;

  const VW = 800, VH = 220;
  const PAD = { top: 12, right: 12, bottom: 32, left: 42 };
  const chartW = VW - PAD.left - PAD.right;
  const chartH = VH - PAD.top - PAD.bottom;

  const allValues = top15.flatMap(t => displayMonths.map(m => pct(t.months[m] || 0, m)));
  const maxVal = Math.max(...allValues, 1);

  const xPos = (i) => PAD.left + (i / Math.max(displayMonths.length - 1, 1)) * chartW;
  const yPos = (v) => PAD.top + chartH - (v / maxVal) * chartH;

  const makePath = (term) =>
    smoothPath(displayMonths.map((m, i) => [xPos(i), yPos(pct(term.months[m] || 0, m))]));

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ val: (f * maxVal).toFixed(1), y: yPos(f * maxVal) }));
  const xLabels = displayMonths.map((m, i) => ({ m, i })).filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 8)) === 0 || i === displayMonths.length - 1);

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700/30 p-4 mb-6">
      <div className="flex justify-end mb-1">
        <div className="flex gap-0.5 bg-slate-900/60 p-0.5 rounded-full border border-slate-700/40">
          {[6, 12, 24].map(n => (
            <button key={n} onClick={() => setShowMonths(n)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-200 ${
                showMonths === n ? 'bg-slate-600 text-white' : 'text-slate-600 hover:text-slate-300'
              }`}>
              {n}mo
            </button>
          ))}
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} className="overflow-visible">
        {yTicks.map((t) => (
          <g key={t.val}>
            <line x1={PAD.left} x2={VW - PAD.right} y1={t.y} y2={t.y} stroke="#1e293b" strokeWidth="1" />
            <text x={PAD.left - 5} y={t.y + 3.5} textAnchor="end" fill="#334155" fontSize="9">{t.val}%</text>
          </g>
        ))}
        {xLabels.map(({ m, i }) => (
          <text key={m} x={xPos(i)} y={VH - 6} textAnchor="middle" fill="#334155" fontSize="9">{fmtMonth(m)}</text>
        ))}
        {top15.map((term, ti) => {
          const isHovered = hoveredTerm === term.term;
          const isDimmed = hoveredTerm && !isHovered;
          return (
            <path
              key={term.term}
              d={makePath(term)}
              fill="none"
              stroke={TERM_COLORS[ti]}
              strokeWidth={isHovered ? 2.5 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={isDimmed ? 0.12 : isHovered ? 1 : 0.75}
              style={{ transition: 'opacity 0.15s, stroke-width 0.15s' }}
            />
          );
        })}
        {hoveredTerm && top15.map((term, ti) => {
          if (term.term !== hoveredTerm) return null;
          return displayMonths.map((m, i) => {
            const v = pct(term.months[m] || 0, m);
            if (v === 0) return null;
            return <circle key={m} cx={xPos(i)} cy={yPos(v)} r="2" fill={TERM_COLORS[ti]} opacity="0.9" />;
          });
        })}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 px-1">
        {top15.map((term, i) => {
          const isHovered = hoveredTerm === term.term;
          return (
            <button
              key={term.term}
              onMouseEnter={() => setHoveredTerm(term.term)}
              onMouseLeave={() => setHoveredTerm(null)}
              className="flex items-center gap-1.5 transition-opacity duration-150"
              style={{ opacity: hoveredTerm && !isHovered ? 0.35 : 1 }}
            >
              <div className="w-4 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: TERM_COLORS[i] }} />
              <span className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors">{term.term}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-600 mt-3 px-1">% of distinct papers per month containing that term</p>
    </div>
  );
};

const Sparkline = ({ values, color = '#f59e0b' }) => {
  const W = 180, H = 38;
  if (!values || values.length < 2) return <div style={{ width: W, height: H }} />;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (W - 4) + 2;
    const y = H - 4 - ((v - min) / range) * (H - 10) + 2;
    return [x, y];
  });
  const path = smoothPath(pts);
  const fill = smoothPath(pts)
    + ` L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
  return (
    <svg width={W} height={H} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
};

const TrendsView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('total'); // 'total' | 'growth'
  const [showMonths, setShowMonths] = useState(24);
  const [hoveredTerm, setHoveredTerm] = useState(null);

  const loadTrends = useCallback(() => {
    setLoading(true);
    setData(null);
    fetch('/api/trends')
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadTrends(); }, [loadTrends]);

  if (loading) return (
    <div className="mt-2">
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/30 p-6 mb-6 h-64 flex flex-col items-center justify-center gap-4">
        <svg className="w-7 h-7 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-500 text-xs tracking-wide">Analysing paper titles…</p>
        <div className="w-48 h-1 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-amber-500/60 rounded-full animate-[shimmer_1.4s_ease-in-out_infinite]" style={{ width: '40%', animation: 'pulse 1.4s ease-in-out infinite' }} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30 animate-pulse h-28" />
        ))}
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center gap-3 mt-12 text-slate-500">
      <p className="text-sm">Failed to connect to database.</p>
      <button onClick={loadTrends} className="px-4 py-1.5 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 hover:border-slate-500 hover:text-white transition-all duration-200">
        Retry
      </button>
    </div>
  );

  const { terms, allMonths, monthlyTotals } = data;
  const displayMonths = allMonths.slice(-showMonths);

  const pct = (count, month) => (count / Math.max(monthlyTotals[month] || 1, 1)) * 100;

  const calcGrowth = (term) => {
    const half = Math.floor(displayMonths.length / 2);
    const prev = displayMonths.slice(0, half);
    const recent = displayMonths.slice(half);
    const prevPct = prev.reduce((s, m) => s + pct(term.months[m] || 0, m), 0) / Math.max(prev.length, 1);
    const recentPct = recent.reduce((s, m) => s + pct(term.months[m] || 0, m), 0) / Math.max(recent.length, 1);
    if (prevPct === 0) return recentPct > 0 ? Infinity : 0;
    return ((recentPct - prevPct) / prevPct) * 100;
  };

  const sorted = [...terms].sort((a, b) => {
    if (sortBy === 'growth') return calcGrowth(b) - calcGrowth(a);
    return b.total - a.total;
  });

  const fmtMonth = (m) => {
    const [y, mo] = m.split('-');
    return new Date(+y, +mo - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="mt-2">
      <CombinedChart
        terms={terms}
        displayMonths={displayMonths}
        monthlyTotals={monthlyTotals}
        hoveredTerm={hoveredTerm}
        setHoveredTerm={setHoveredTerm}
        showMonths={showMonths}
        setShowMonths={setShowMonths}
      />
      <div className="flex items-center mb-5">
        <div className="flex gap-1.5 bg-slate-800/60 p-1 rounded-full border border-slate-700/50">
          {[['total', 'All Time'], ['growth', 'Trending']].map(([v, l]) => (
            <button key={v} onClick={() => setSortBy(v)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                sortBy === v ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.slice(0, 40).map((item) => {
          const values = displayMonths.map(m => pct(item.months[m] || 0, m));
          const growth = calcGrowth(item);
          const isNew = growth === Infinity;
          const growthStr = isNew ? 'new' : growth > 0 ? `+${Math.round(growth)}%` : `${Math.round(growth)}%`;
          const growthColor = growth > 20 ? '#f59e0b' : growth > 0 ? '#6ee7b7' : '#94a3b8';
          const recentAvgPct = displayMonths.slice(-3).reduce((s, m) => s + pct(item.months[m] || 0, m), 0) / 3;
          const termIdx = terms.slice(0, 10).findIndex(t => t.term === item.term);
          const lineColor = termIdx >= 0 ? TERM_COLORS[termIdx] : growthColor;
          const isHighlighted = hoveredTerm === item.term;

          return (
            <div
              key={item.term}
              onMouseEnter={() => setHoveredTerm(item.term)}
              onMouseLeave={() => setHoveredTerm(null)}
              className="bg-slate-800/50 hover:bg-slate-800/80 rounded-xl p-4 border border-slate-700/30 transition-all duration-200 cursor-default"
              style={{ borderColor: isHighlighted ? lineColor + '60' : undefined }}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-white text-sm font-semibold leading-tight max-w-[55%]">{item.term}</span>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-slate-500 text-xs">{item.total} papers</span>
                  <span className="text-xs font-semibold" style={{ color: growthColor }}>{growthStr}</span>
                </div>
              </div>
              <div className="mt-1">
                <Sparkline values={values} color={lineColor} />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-600">
                <span>{fmtMonth(displayMonths[0])}</span>
                <span className="text-slate-500">{recentAvgPct.toFixed(1)}% avg last 3mo</span>
                <span>{fmtMonth(displayMonths[displayMonths.length - 1])}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Papers ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export default function PaperDashboard({ initialPapers, initialTotal, initialTimeFrame }) {
  const [activeTab, setActiveTab] = useState('papers');
  const [timeFrame, setTimeFrame] = useState(initialTimeFrame);
  const [offset, setOffset] = useState(0);
  const [papers, setPapers] = useState(initialPapers);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const saved = localStorage.getItem('selectedTimeFrame');
    if (saved && saved !== initialTimeFrame) setTimeFrame(saved);
  }, []);

  const handleSetTimeFrame = (tf) => {
    setTimeFrame(tf);
    setOffset(0);
    setPage(1);
    localStorage.setItem('selectedTimeFrame', tf);
  };

  const fetchPapers = async (tf, off, pg, signal) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/papers?timeFrame=${tf}&offset=${off}&page=${pg}`,
        { signal }
      );
      const { papers: newPapers, total: newTotal } = await response.json();
      setPapers(newPapers);
      setTotal(newTotal);
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  // Fetch when timeFrame or offset changes (reset to page 1)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const controller = new AbortController();
    setPage(1);
    fetchPapers(timeFrame, offset, 1, controller.signal);
    document.title = `HuggingFace Papers – ${getPeriodLabel(timeFrame, offset)}`;
    return () => controller.abort();
  }, [timeFrame, offset]);

  // Fetch when page changes
  useEffect(() => {
    if (page === 1) return; // page=1 is handled by the above effect or SSR
    const controller = new AbortController();
    fetchPapers(timeFrame, offset, page, controller.signal);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => controller.abort();
  }, [page]);

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(251,191,36,0.06),transparent)] pointer-events-none" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2 bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500 bg-clip-text text-transparent tracking-tight">
            HF Paper Explorer
          </h1>
          <p className="text-slate-400 text-sm mb-4">Top AI research papers from the HuggingFace community</p>
          <div className="flex justify-center items-center gap-2 text-xs text-slate-600">
            <a
              href="https://github.com/mrconter1/huggingface-paper-explorer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-slate-300 transition-colors duration-200"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              GitHub
            </a>
            <span>·</span>
            <a
              href="https://huggingface.co/papers"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors duration-200"
            >
              HuggingFace Papers
            </a>
            <span>·</span>
            <span>Data © HuggingFace community</span>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <div className="flex flex-wrap justify-center items-center gap-1 bg-slate-800/60 p-1.5 rounded-2xl border border-slate-700/50 max-w-sm sm:max-w-none sm:rounded-full">
            {NAV_OPTIONS.map(({ value, label, divider }) => (
              <React.Fragment key={value}>
                {divider && <span className="hidden sm:block w-px h-5 bg-slate-700/80 mx-0.5 flex-shrink-0" />}
                <button
                  onClick={() => {
                    if (value === 'trends') { setActiveTab('trends'); }
                    else { setActiveTab('papers'); handleSetTimeFrame(value); }
                  }}
                  className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    (value === 'trends' ? activeTab === 'trends' : activeTab === 'papers' && timeFrame === value)
                      ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                  }`}>
                  {label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {activeTab === 'trends' ? <TrendsView /> : (
        <>
        <div className="flex flex-col items-center gap-2 mb-6">
          {timeFrame !== 'all' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setOffset(o => o + 1); setPage(1); }}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-sm text-slate-300 font-medium min-w-[160px] text-center">
                {getPeriodLabel(timeFrame, offset)}
              </span>
              <button
                onClick={() => { setOffset(o => Math.max(0, o - 1)); setPage(1); }}
                disabled={offset === 0}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:border-slate-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : papers.length > 0 ? (() => {
          const totalPages = Math.ceil(total / PAGE_SIZE);
          const globalStart = (page - 1) * PAGE_SIZE;
          return (
            <>
              <p className="text-center text-slate-600 text-xs mb-5">
                {total} papers · page {page} of {totalPages}
              </p>
              {papers.map((paper, index) => (
                <PaperRow key={index} {...paper} index={globalStart + index} />
              ))}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-8">
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 1}
                    className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-sm text-slate-400 min-w-[80px] text-center">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page === totalPages}
                    className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              )}
            </>
          );
        })() : (
          <p className="text-center text-slate-400 text-lg">No papers found for the selected time frame.</p>
        )}
        </>
        )}
      </div>
    </div>
  );
}
