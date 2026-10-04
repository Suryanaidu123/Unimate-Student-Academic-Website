import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, BookOpen } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import TimetableGrid from '../../components/TimetableGrid.jsx';

const DAYS_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const SEMESTER_LABEL = {
  3: '2nd Year · Sem 3',
  4: '2nd Year · Sem 4',
  5: '3rd Year · Sem 5',
  6: '3rd Year · Sem 6',
  7: '4th Year · Sem 7',
  8: '4th Year · Sem 8',
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

  // Group by semester (and by section within a semester)
  const bySemester = useMemo(() => {
    const map = {};
    slots.forEach((s) => {
      const key = s.semester || 0;
      map[key] = map[key] || [];
      map[key].push(s);
    });
    return map;
  }, [slots]);

  const semesters = Object.keys(bySemester).map(Number).sort((a, b) => a - b);

  // For a given semester, build ordered periods + days present
  function buildGrid(semSlots) {
    const periodMap = new Map();
    semSlots.forEach((s) => {
      const key = `${s.startTime}|${s.endTime}`;
      if (!periodMap.has(key)) {
        periodMap.set(key, {
          startTime: s.startTime,
          endTime: s.endTime,
          kind: s.periodType || 'CLASS',
        });
      } else if (s.periodType && s.periodType !== 'CLASS') {
        periodMap.set(key, { ...periodMap.get(key), kind: s.periodType });
      }
    });
    const periods = [...periodMap.values()].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    const days = DAYS_ORDER.filter((d) => semSlots.some((s) => s.day === d));
    return { periods, days };
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">My Timetable</h1>
        <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>
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

      {semesters.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 py-8 text-center">
            No timetable periods assigned to you yet.
          </p>
        </Card>
      ) : (
        semesters.map((sem) => {
          const semSlots = bySemester[sem];
          const { periods, days } = buildGrid(semSlots);
          const meta = SEMESTER_LABEL[sem] || `Semester ${sem}`;

          // Group sections in this semester
          const sections = [...new Set(semSlots.map((s) => s.section))].sort();

          return (
            <Card key={sem}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-brand-600" />
                  <h2 className="text-lg font-semibold text-slate-900">{meta}</h2>
                  <Badge variant="brand">Sem {sem}</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {semSlots.length} period{semSlots.length === 1 ? '' : 's'} ·
                  Section{sections.length > 1 ? 's' : ''} {sections.join(', ')}
                </p>
              </div>

              <TimetableGrid
                periods={periods}
                days={days}
                slots={semSlots}
                mode="faculty"
                highlightToday={false}
              />
            </Card>
          );
        })
      )}
    </div>
  );
}