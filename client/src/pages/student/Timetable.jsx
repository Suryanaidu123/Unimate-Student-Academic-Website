import { useEffect, useMemo, useState } from 'react';
import { Clock, User, BookOpen, RefreshCw, FlaskConical, Star } from 'lucide-react';
import api from '../../services/api.js';
import { useBadges } from '../../context/BadgeContext.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';

const DAYS = [
  { key: 'MON', label: 'Monday', short: 'Mon' },
  { key: 'TUE', label: 'Tuesday', short: 'Tue' },
  { key: 'WED', label: 'Wednesday', short: 'Wed' },
  { key: 'THU', label: 'Thursday', short: 'Thu' },
  { key: 'FRI', label: 'Friday', short: 'Fri' },
  { key: 'SAT', label: 'Saturday', short: 'Sat' },
];

const DAYS_ROW_1 = DAYS.slice(0, 3);
const DAYS_ROW_2 = DAYS.slice(3, 6);

function to12h(t) {
  if (!t) return '';
  const [hh, mm] = String(t).split(':').map(Number);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`;
}

const subjectIcon = (type) => {
  if (type === 'LAB') return <FlaskConical size={12} className="text-amber-600" />;
  if (type === 'ACTIVITY') return <Star size={12} className="text-purple-600" />;
  return <BookOpen size={12} className="text-brand-600" />;
};

export default function StudentTimetable() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDay, setActiveDay] = useState('MON');
  const [me, setMe] = useState(null);

  async function fetchAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [t, m] = await Promise.all([
        api.get(`/timetable/my?_=${Date.now()}`),
        api.get('/auth/me'),
      ]);
      setSlots(t.data.data || []);
      setMe(m.data.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

const { markRead } = useBadges();
useEffect(() => { markRead('timetable'); }, [markRead]);
  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    function onFocus() { fetchAll(true); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const byDay = useMemo(() => {
    const map = Object.fromEntries(DAYS.map((d) => [d.key, []]));
    slots.forEach((s) => { if (map[s.day]) map[s.day].push(s); });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [slots]);

  const daysWithClasses = DAYS.filter((d) => byDay[d.key].length > 0);
  const todayKey = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date().getDay()];

  useEffect(() => {
    if (daysWithClasses.length === 0) return;
    if (daysWithClasses.some((d) => d.key === todayKey)) setActiveDay(todayKey);
    else setActiveDay(daysWithClasses[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.length]);

  const activeDayLabel = DAYS.find((d) => d.key === activeDay)?.label || activeDay;
  const activeSlots = byDay[activeDay] || [];

  function DayButton({ day }) {
    const count = byDay[day.key].length;
    const has = count > 0;
    const isActive = activeDay === day.key;
    const isToday = day.key === todayKey;
    return (
      <button
        type="button"
        onClick={() => setActiveDay(day.key)}
        disabled={!has}
        className={`relative flex flex-col items-center justify-center rounded-lg border px-3 py-3 transition text-sm font-medium ${
          isActive ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
            : has ? 'bg-white text-slate-700 border-slate-300 hover:border-brand-400'
            : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
        }`}
      >
        <span className="text-xs uppercase tracking-wide opacity-75">{day.short}</span>
        <span className="mt-0.5">{day.label}</span>
        {has && (
          <span className={`mt-1 text-[10px] rounded-full px-2 py-0.5 ${
            isActive ? 'bg-white/25 text-white' : 'bg-brand-100 text-brand-700'
          }`}>
            {count} {count === 1 ? 'period' : 'periods'}
          </span>
        )}
        {isToday && (
          <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
            isActive ? 'bg-white' : 'bg-brand-500'
          }`} />
        )}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Weekly Timetable</h1>
        <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>
      </div>
    );
  }

  const profile = me?.profile;

  const header = (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Weekly Timetable</h1>
        {profile && (
          <p className="text-sm text-slate-500">
            {profile.year === 2 ? '2nd' : profile.year === 3 ? '3rd' : '4th'} Year ·
            Semester {profile.semester} · Section {profile.section}
          </p>
        )}
      </div>
      <Button variant="secondary" onClick={() => fetchAll(true)} disabled={refreshing}>
        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
      </Button>
    </div>
  );

  if (slots.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <Card>
          <p className="text-sm text-slate-500 py-8 text-center">
            No timetable published for your semester yet.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      <Card>
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {DAYS_ROW_1.map((d) => <DayButton key={d.key} day={d} />)}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DAYS_ROW_2.map((d) => <DayButton key={d.key} day={d} />)}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">{activeDayLabel}</h2>
          <Badge variant="brand">
            {activeSlots.filter((s) => s.periodType !== 'BREAK' && s.periodType !== 'LUNCH').length} classes
          </Badge>
        </div>

        {activeSlots.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            No classes scheduled for {activeDayLabel}.
          </p>
        ) : (
          <ul className="space-y-2">
            {activeSlots.map((slot) => {
              const isBreak = slot.periodType === 'BREAK';
              const isLunch = slot.periodType === 'LUNCH';

              if (isBreak || isLunch) {
                return (
                  <li key={slot._id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isLunch ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'
                    }`}>
                    <div className={`shrink-0 w-1 rounded-full self-stretch ${
                      isLunch ? 'bg-orange-500' : 'bg-slate-400'
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${isLunch ? 'text-orange-800' : 'text-slate-700'}`}>
                        {isLunch ? 'Lunch Break' : 'Break'}
                      </p>
                      <p className={`text-xs ${isLunch ? 'text-orange-600' : 'text-slate-500'}`}>
                        {to12h(slot.startTime)} – {to12h(slot.endTime)}
                      </p>
                    </div>
                    <Badge variant={isLunch ? 'warning' : 'default'}>
                      {isLunch ? 'LUNCH' : 'BREAK'}
                    </Badge>
                  </li>
                );
              }

              return (
                <li key={slot._id}
  className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition">
  <div className="flex-1 min-w-0">
    <div className="text-sm font-semibold text-slate-900">
      {slot.subjectId?.subjectName || '—'}
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-600">
      <span className="inline-flex items-center gap-1">
        <Clock size={12} /> {to12h(slot.startTime)} – {to12h(slot.endTime)}
      </span>
      {slot.facultyId?.name && (
        <span className="inline-flex items-center gap-1">
          <User size={12} /> {slot.facultyId.name}
        </span>
      )}
    </div>
  </div>
  {slot.subjectId?.type === 'LAB' && <Badge variant="warning">LAB</Badge>}
  {slot.subjectId?.type === 'ACTIVITY' && <Badge variant="info">ACTIVITY</Badge>}
</li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}