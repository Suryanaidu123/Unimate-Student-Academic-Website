import { Coffee, Utensils, X } from 'lucide-react';
import { getSubjectAlias } from '../utils/subjectAlias.js';

const ALL_DAYS = [
  { key: 'MON', label: 'Monday' },
  { key: 'TUE', label: 'Tuesday' },
  { key: 'WED', label: 'Wednesday' },
  { key: 'THU', label: 'Thursday' },
  { key: 'FRI', label: 'Friday' },
  { key: 'SAT', label: 'Saturday' },
];

function to12h(t) {
  if (!t) return '';
  const [hh, mm] = String(t).split(':').map(Number);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`;
}

export default function TimetableGrid({
  periods = [],
  days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  slots = [],
  mode = 'student',
  onCellClick,
  onClearDay,
  highlightToday = true,
}) {
  const todayKey = ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date().getDay()];
  const normalized = periods.map((p) => ({ ...p, kind: p.kind || 'CLASS' }));
  const dayLabel = (k) => ALL_DAYS.find((d) => d.key === k)?.label || k;

  // Index slots by day + startTime
  const byDay = {};
  slots.forEach((s) => {
    byDay[s.day] = byDay[s.day] || {};
    byDay[s.day][s.startTime] = s;
  });

  // For each day, compute which indices are hidden by a spanning slot
  const skip = {}; // `${day}::${idx}` → true
  Object.entries(byDay).forEach(([day, map]) => {
    Object.values(map).forEach((slot) => {
      const idxs = slot.periodIndices?.length ? slot.periodIndices : [];
      idxs.slice(1).forEach((i) => { skip[`${day}::${i}`] = true; });
    });
  });

  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-slate-300 bg-slate-100 px-2 py-2 text-left font-semibold text-slate-700 whitespace-nowrap w-24 align-middle">
              Day
            </th>
            {normalized.map((p, idx) => {
              const isBreak = p.kind === 'BREAK';
              const isLunch = p.kind === 'LUNCH';
              return (
                <th
                  key={`h-${idx}`}
                  className={`border border-slate-300 px-1 py-1.5 text-center font-semibold whitespace-nowrap ${
                    isLunch ? 'bg-orange-100 text-orange-800'
                      : isBreak ? 'bg-slate-200 text-slate-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <div>{isLunch ? 'Lunch' : isBreak ? 'Break' : `Period ${idx + 1}`}</div>
                  <div className="text-[10px] font-normal mt-0.5">
                    {to12h(p.startTime)} – {to12h(p.endTime)}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {days.map((dayKey) => {
            const isToday = highlightToday && dayKey === todayKey;
            const map = byDay[dayKey] || {};

            return (
              <tr key={dayKey} className={isToday ? 'bg-brand-50/40' : ''}>
                <td className={`border border-slate-300 bg-slate-50 px-2 py-2 font-semibold text-slate-700 whitespace-nowrap ${
                  isToday ? 'text-brand-700' : ''
                }`}>
                  <div className="flex items-center justify-between gap-1">
                    <span>
                      {dayLabel(dayKey)}
                      {isToday && <span className="ml-1 text-[10px] text-brand-600">•</span>}
                    </span>
                    {onClearDay && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onClearDay(dayKey); }}
                        className="text-red-400 hover:text-red-600 ml-1"
                        title="Clear this day"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </td>

                {normalized.map((p, idx) => {
                  // Skip cells covered by a spanning slot
                  if (skip[`${dayKey}::${idx}`]) return null;

                  const isBreak = p.kind === 'BREAK';
                  const isLunch = p.kind === 'LUNCH';
                  const slot = map[p.startTime];

                  // Compute colspan from the slot's periodIndices
                  const colSpan = slot?.periodIndices?.length > 1 ? slot.periodIndices.length : 1;

                  if (isBreak || isLunch) {
                    return (
                      <td
                        key={`b-${dayKey}-${idx}`}
                        className={`border border-slate-300 text-center align-middle ${
                          isLunch ? 'bg-orange-50' : 'bg-slate-100'
                        }`}
                      >
                        <div className={`flex flex-col items-center justify-center gap-0.5 py-3 ${
                          isLunch ? 'text-orange-700' : 'text-slate-500'
                        }`}>
                          {isLunch ? <Utensils size={12} /> : <Coffee size={12} />}
                          <span className="font-semibold text-[10px] leading-tight">
                            {isLunch ? 'Lunch' : 'Break'}
                          </span>
                        </div>
                      </td>
                    );
                  }

                  const clickable = !!onCellClick;
                  return (
                    <td
                      key={`c-${dayKey}-${idx}`}
                      colSpan={colSpan}
                      className={`border border-slate-300 p-1.5 align-middle min-w-[80px] ${
                        clickable ? 'cursor-pointer hover:bg-brand-50/60' : ''
                      }`}
                      onClick={clickable ? () => onCellClick(dayKey, p, slot) : undefined}
                    >
                      {slot ? (
                        <div className="flex items-center justify-center min-h-[48px]">
                          <p className="font-bold text-slate-900 text-sm text-center leading-tight">
                            {getSubjectAlias(slot.subjectId)}
                          </p>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-300 text-center py-3">
                          {clickable ? '+ add' : '—'}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}