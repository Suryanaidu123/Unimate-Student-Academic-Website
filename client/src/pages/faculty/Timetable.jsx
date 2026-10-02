import { useEffect, useState } from 'react';
import { Clock, BookOpen, FlaskConical, Star, RefreshCw } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';

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

const SEMESTER_LABEL = {
  3: { year: 2, label: '2nd Year · Sem 3' },
  4: { year: 2, label: '2nd Year · Sem 4' },
  5: { year: 3, label: '3rd Year · Sem 5' },
  6: { year: 3, label: '3rd Year · Sem 6' },
  7: { year: 4, label: '4th Year · Sem 7' },
  8: { year: 4, label: '4th Year · Sem 8' },
};

const subjectIcon = (type) => {
  if (type === 'LAB') return <FlaskConical size={14} className="text-amber-600" />;
  if (type === 'ACTIVITY') return <Star size={14} className="text-purple-600" />;
  return <BookOpen size={14} className="text-brand-600" />;
};

export default function FacultyTimetable() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const r = await api.get(`/timetable/my?_=${Date.now()}`);
      setSlots(r.data.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => { load(); }, []);

  // Group slots by semester
  const bySemester = {};
  slots.forEach((s) => {
    const key = s.semester || 0;
    bySemester[key] = bySemester[key] || [];
    bySemester[key].push(s);
  });

  // Sort semesters ascending
  const semesters = Object.keys(bySemester).map(Number).sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">My Timetable</h1>
        <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-slate-900">My Timetable</h1>
          <Button variant="secondary" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </Button>
        </div>
        <Card>
          <p className="text-sm text-slate-500 py-8 text-center">
            No timetable periods assigned to you yet.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Timetable</h1>
          <p className="text-sm text-slate-500">
            {slots.length} period{slots.length === 1 ? '' : 's'} across {semesters.length} semester{semesters.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button variant="secondary" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      {semesters.map((sem) => {
        const semSlots = bySemester[sem];
        const meta = SEMESTER_LABEL[sem] || { label: `Semester ${sem}` };

        // Group by day within this semester
        const byDay = {};
        DAYS.forEach((d) => { byDay[d.key] = []; });
        semSlots.forEach((s) => { if (byDay[s.day]) byDay[s.day].push(s); });
        Object.values(byDay).forEach((arr) =>
          arr.sort((a, b) => a.startTime.localeCompare(b.startTime))
        );

        const daysWithClasses = DAYS.filter((d) => byDay[d.key].length > 0);

        return (
          <Card key={sem}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{meta.label}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {semSlots.length} period{semSlots.length === 1 ? '' : 's'} per week
                </p>
              </div>
              <Badge variant="brand">Sem {sem}</Badge>
            </div>

            <div className="space-y-3">
              {daysWithClasses.map((d) => (
                <div key={d.key}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    {d.label}
                  </p>
                  <ul className="space-y-2">
                    {byDay[d.key].map((slot) => (
                      <li
                        key={slot._id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
                      >
                        <div className="shrink-0 pt-0.5">
                          {subjectIcon(slot.subjectId?.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-900">
                            {slot.subjectId?.subjectName || '—'}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} /> {to12h(slot.startTime)} – {to12h(slot.endTime)}
                            </span>
                            <span>Section {slot.section}</span>
                          </div>
                        </div>
                        {slot.subjectId?.type === 'LAB' && <Badge variant="warning">LAB</Badge>}
                        {slot.subjectId?.type === 'ACTIVITY' && <Badge variant="info">ACTIVITY</Badge>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}