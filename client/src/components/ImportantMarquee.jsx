/**
 * ImportantMarquee — continuously scrolling banner for IMPORTANT_ANNOUNCEMENT activities.
 * Only renders when there is at least one active important activity targeting the student.
 */
import { useEffect, useState, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import api from '../services/api.js';

export default function ImportantMarquee() {
  const [items, setItems] = useState([]);
  const [idx, setIdx]     = useState(0);
  const intervalRef       = useRef(null);

  useEffect(() => {
    api.get('/activities/student/important')
      .then((r) => setItems(r.data.data || []))
      .catch(() => {});
  }, []);

  // Cycle through items every 6 seconds
  useEffect(() => {
    if (items.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setIdx((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(intervalRef.current);
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[idx];

  return (
    <div className="bg-red-600 text-white rounded-xl overflow-hidden">
      <div className="flex items-stretch">
        {/* Fixed label */}
        <div className="shrink-0 flex items-center gap-2 bg-red-800 px-3 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
          <AlertTriangle size={14} className="shrink-0" />
          <span className="hidden sm:inline">Important</span>
        </div>

        {/* Scrolling text */}
        <div className="flex-1 overflow-hidden flex items-center py-2.5 px-3">
          <div
            key={idx}
            className="whitespace-nowrap text-sm font-medium animate-marquee"
          >
            {current.title}
            {current.description && (
              <span className="text-red-200 ml-3">— {current.description}</span>
            )}
          </div>
        </div>

        {/* Counter if multiple */}
        {items.length > 1 && (
          <div className="shrink-0 flex items-center gap-1.5 px-3 text-xs text-red-200">
            {items.map((_, i) => (
              <span
                key={i}
                className={`inline-block w-1.5 h-1.5 rounded-full transition-all ${
                  i === idx ? 'bg-white scale-125' : 'bg-red-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
