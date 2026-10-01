import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';

const DAYS = [
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

export default function FacultyTimetable() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/timetable/my')
      .then((r) => setSlots(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const periods = [...new Set(slots.map((s) => `${s.startTime}|${s.endTime}`))]
    .map((p) => {
      const [startTime, endTime] = p.split('|');
      return { startTime, endTime };
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const findSlot = (day, startTime) =>
    slots.find((s) => s.day === day && s.startTime === startTime);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Timetable</h1>
        <p className="text-sm text-slate-500">Weekly schedule of your classes.</p>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
        ) : periods.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            No timetable slots assigned to you yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="border border-slate-200 bg-slate-50 px-1 py-1 text-left font-semibold text-slate-700 w-20">
                    Day
                  </th>
                  {periods.map((p) => (
                    <th key={p.startTime}
                      className="border border-slate-200 bg-slate-50 px-1 py-1 text-left font-semibold text-slate-700 whitespace-nowrap">
                      {to12h(p.startTime)}–{to12h(p.endTime)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((d) => (
                  <tr key={d.key}>
                    <td className="border border-slate-200 px-1 py-1 bg-slate-50 font-medium text-slate-700">
                      {d.label}
                    </td>
                    {periods.map((p) => {
                      const slot = findSlot(d.key, p.startTime);
                      return (
                        <td key={p.startTime} className="border border-slate-200 p-0.5 align-top">
                          {slot ? (
                            <div className="px-1 py-0.5 leading-tight">
                              <p className="font-semibold text-brand-700 text-[10px] truncate">
                                {slot.subjectId?.subjectCode}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Yr {slot.year} · Sec {slot.section}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300 px-1">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}