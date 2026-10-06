/**
 * ActivityMarquee — Clean, visible announcement ticker.
 *
 * Layout:
 *   [📢 NEW ANNOUNCEMENT]  Blood Donation Poll  |  scrolling detail text…
 *
 * Visibility: white card + red left accent border + subtle shadow.
 * Animation: center-out, 9s, unchanged.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import api from '../services/api.js';

const ITEM_DURATION = 9000;

export default function ActivityMarquee({
  apiUrl,
  navigateTo  = '/student/activities',
  resultMap   = {},
  tickerLabel = 'New Announcement',
  showEmpty   = false,   // true = show "No announcements" msg; false = render nothing
}) {
  const [items, setItems]     = useState([]);
  const [idx, setIdx]         = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const timerRef              = useRef(null);
  const navigate              = useNavigate();

  useEffect(() => {
    api.get(apiUrl)
      .then((r) => {
        const data = r.data.data || [];
        data.sort((a, b) =>
          (a.type === 'IMPORTANT_ANNOUNCEMENT' ? 0 : 1) -
          (b.type === 'IMPORTANT_ANNOUNCEMENT' ? 0 : 1)
        );
        setItems(data);
        setIdx(0);
        setAnimKey((k) => k + 1);
      })
      .catch(() => {});
  }, [apiUrl]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (items.length === 0) return;
    timerRef.current = setTimeout(() => {
      setIdx((p) => (p + 1) % items.length);
      setAnimKey((k) => k + 1);
    }, ITEM_DURATION);
    return () => clearTimeout(timerRef.current);
  }, [animKey, items.length]);

  if (items.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className="flex items-center gap-3 rounded-xl bg-white shadow-md px-4 py-3.5"
           style={{ borderLeft: '5px solid #dc2626' }}>
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-300" />
        </span>
        <Megaphone size={16} className="text-slate-400 shrink-0" aria-hidden="true" />
        <span className="text-slate-400 text-sm font-medium">
          No announcements have been announced.
        </span>
      </div>
    );
  }

  const current       = items[idx];
  const resultText    = resultMap[String(current._id)];
  const scrollingText = resultText || current.description || current.title;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(navigateTo)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(navigateTo)}
      title="Click to view all activities"
      className="cursor-pointer select-none w-full group"
    >
      {/*
        White card, red 4px left border accent, shadow to lift off page.
        Compact height — not a big block.
      */}
      <div
        className="flex items-center rounded-xl bg-white shadow-md
                   overflow-hidden transition-shadow duration-200
                   group-hover:shadow-lg"
        style={{ borderLeft: '5px solid #dc2626' }}
      >
        {/* ── 1. Red label section ── */}
        <div className="shrink-0 flex items-center gap-2.5 px-4 py-3.5 border-r border-slate-100">
          {/* Pulsing red dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
          </span>

          <Megaphone size={18} className="text-red-600 shrink-0" aria-hidden="true" />

          <span className="text-red-600 font-extrabold uppercase whitespace-nowrap
                           text-[13px] tracking-widest hidden sm:inline">
            Announcement
          </span>
          <span className="text-red-600 font-extrabold uppercase whitespace-nowrap
                           text-[12px] tracking-widest sm:hidden">
            New
          </span>
        </div>

        {/* ── 2. Scrolling content — "NEW ANNOUNCEMENT — Title — detail" ── */}
        <div className="flex-1 relative overflow-hidden px-4 py-3.5"
             style={{ minHeight: '50px' }}>
          <span
            key={animKey}
            className="absolute inset-y-0 flex items-center whitespace-nowrap"
            style={{
              animation: `ticker-center-out ${ITEM_DURATION}ms linear forwards`,
            }}
          >
            {/* label in red — "NEW ANNOUNCEMENT" or "ANNOUNCEMENT RESULTS" */}
            <span className="text-red-600 font-extrabold text-[13px] uppercase tracking-wider mr-2">
              {tickerLabel}
            </span>
            {/* em-dash separator */}
            <span className="text-slate-400 mr-2 text-[14px]">—</span>
            {/* Announcement title in dark */}
            <span className="text-slate-900 font-semibold text-[14px] mr-3">
              {current.title}
            </span>
            {/* Scrolling content (description/result) if different from title */}
            {scrollingText !== current.title && (
              <>
                <span className="text-slate-300 mr-3 text-[14px]">|</span>
                <span className="text-slate-600 font-medium text-[14px]">
                  {scrollingText}
                </span>
              </>
            )}
          </span>
        </div>

        {/* ── 4. Dot pager ── */}
        {items.length > 1 && (
          <div
            className="shrink-0 flex items-center gap-2 pr-4"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIdx(i);
                  setAnimKey((k) => k + 1);
                }}
                aria-label={`Activity ${i + 1}`}
                className={`rounded-full transition-all duration-200 focus:outline-none ${
                  i === idx
                    ? 'w-5 h-2.5 bg-red-600'
                    : 'w-2.5 h-2.5 bg-slate-300 hover:bg-red-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
