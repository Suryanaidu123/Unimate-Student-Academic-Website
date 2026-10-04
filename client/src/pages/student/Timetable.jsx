import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Calendar, LayoutGrid } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import TimetableGrid from '../../components/TimetableGrid.jsx';
import { useBadges } from '../../context/BadgeContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';

const DAYS = [
  { key: 'MON', label: 'Monday', short: 'Mon' },
  { key: 'TUE', label: 'Tuesday', short: 'Tue' },
  { key: 'WED', label: 'Wednesday', short: 'Wed' },
  { key: 'THU', label: 'Thursday', short: 'Thu' },
  { key: 'FRI', label: 'Friday', short: 'Fri' },
  { key: 'SAT', label: 'Saturday', short: 'Sat' },
];

export default function StudentTimetable() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState(null);

  const [view, setView] = useState('FULL');
  const [activeDay, setActiveDay] = useState('MON');

  const { markRead } = useBadges();
  const { refreshUnread } = useNotifications();

  // Mark timetable + notification sections as read on mount
  useEffect(() => {
    markRead('timetable');
    // Also mark TIMETABLE_UPDATED notifications as read
    api.put('/notifications/mark-type-read', { type: 'TIMETABLE_UPDATED' })
      .then(() => refreshUnread())
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    const onFocus = () => fetchAll(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const periods = useMemo(() => {
    const map = new Map();
    slots.forEach((s) => {
      const key = `${s.startTime}|${s.endTime}`;
      if (!map.has(key)) {
        map.set(key, {
          startTime: s.startTime,
          endTime: s.endTime,
          kind: s.periodType || 'CLASS',
        });
      } else if (s.periodType && s.periodType !== 'CLASS') {
        map.set(key, { ...map.get(key), kind: s.periodType });
      }
    });
    return [...map.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [slots]);

  const todayKey = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date().getDay()];

  const daysWithClasses = useMemo(
    () => DAYS.filter((d) => slots.some((s) => s.day === d.key)),
    [slots]
  );

  useEffect(() => {
    if (daysWithClasses.some((d) => d.key === todayKey)) setActiveDay(todayKey);
    else if (daysWithClasses.length > 0) setActiveDay(daysWithClasses[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.length]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Weekly Timetable</h1>
        <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>
      </div>
    );
  }

  const profile = me?.profile;

  if (slots.length === 0 || periods.length === 0) {
    return (
      <div className="space-y-4">
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

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setView('FULL')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
              view === 'FULL'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-slate-700 border-slate-300 hover:border-brand-400'
            }`}
          >
            <LayoutGrid size={14} /> Complete Timetable
          </button>
          <button
            onClick={() => setView('DAY')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
              view === 'DAY'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-slate-700 border-slate-300 hover:border-brand-400'
            }`}
          >
            <Calendar size={14} /> Day-wise
          </button>

          {view === 'DAY' && (
            <div className="ml-auto flex flex-wrap gap-1">
              {DAYS.map((d) => {
                const has = slots.some((s) => s.day === d.key);
                const isActive = activeDay === d.key;
                return (
                  <button
                    key={d.key}
                    disabled={!has}
                    onClick={() => setActiveDay(d.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      isActive
                        ? 'bg-brand-600 text-white border-brand-600'
                        : has
                        ? 'bg-white text-slate-700 border-slate-300 hover:border-brand-400'
                        : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Card>
        {view === 'FULL' ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Complete Weekly Schedule</h2>
              <Badge variant="brand">{periods.length} periods</Badge>
            </div>
            <TimetableGrid
              periods={periods}
              days={DAYS.map((d) => d.key)}
              slots={slots}
              mode="student"
              highlightToday
            />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {DAYS.find((d) => d.key === activeDay)?.label}
                {activeDay === todayKey && (
                  <span className="ml-2 text-xs text-brand-600 font-normal">• Today</span>
                )}
              </h2>
              <Badge variant="brand">
                {slots.filter((s) => s.day === activeDay).length} periods
              </Badge>
            </div>
            <TimetableGrid
              periods={periods}
              days={[activeDay]}
              slots={slots.filter((s) => s.day === activeDay)}
              mode="student"
              highlightToday={false}
            />
          </>
        )}
      </Card>
    </div>
  );
}