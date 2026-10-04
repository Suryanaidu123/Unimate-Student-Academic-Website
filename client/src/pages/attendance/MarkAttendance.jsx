import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Save, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';

const YEAR_SEMESTERS = { 2: [3, 4], 3: [5, 6], 4: [7, 8] };
const SECTIONS = ['A', 'B', 'C', 'D'];
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function MarkAttendance() {
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [students, setStudents] = useState([]);
  const [present, setPresent] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const dayKey = DAYS[(new Date(date).getDay() + 6) % 7];

  // Load timetable slots for the chosen class+date
  useEffect(() => {
    if (!year || !semester || !section || !date) {
      setSlots([]); setSelectedSlot(''); return;
    }
    setLoading(true);
    api.get(`/timetable?year=${year}&semester=${semester}&section=${section}`)
      .then((r) => {
        const list = (r.data.data || []).filter((s) => s.day === dayKey && s.subjectId);
        setSlots(list);
        setSelectedSlot(list[0] ? `${list[0].startTime}|${list[0].endTime}` : '');
      })
      .catch(() => toast.error('Failed to load timetable'))
      .finally(() => setLoading(false));
  }, [year, semester, section, date, dayKey]);

  // Load students for the class
  useEffect(() => {
    if (!year || !section) { setStudents([]); return; }
    api.get(`/lookup/students?year=${year}&section=${section}`)
      .then((r) => {
        const list = [...(r.data.data || [])];
        list.sort((a, b) =>
          String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true })
        );
        setStudents(list);
        setPresent({});
      })
      .catch(() => {});
  }, [year, section]);

  // Bulk select helpers
  function markAll(status) {
    if (status === 'PRESENT') {
      setPresent(Object.fromEntries(students.map((s) => [s._id, true])));
    } else {
      setPresent({});
    }
  }

  // Toggle a single student
  function toggle(id) {
    setPresent((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const presentCount = useMemo(
    () => Object.values(present).filter(Boolean).length,
    [present]
  );
  const absentCount = students.length - presentCount;

  async function onSubmit(e) {
    e.preventDefault();
    if (!selectedSlot) return toast.error('Select a period');
    const [periodStart, periodEnd] = selectedSlot.split('|');
    const slot = slots.find((s) => s.startTime === periodStart);
    if (!slot) return toast.error('Invalid slot');

    const presentIds = students.filter((s) => present[s._id]).map((s) => s._id);

    setSaving(true);
    try {
      const r = await api.post('/attendance/conduct', {
        year: Number(year),
        semester: Number(semester),
        section,
        subjectId: slot.subjectId?._id || slot.subjectId,
        date,
        periodStart,
        periodEnd,
        periodsCount: 1,
        presentStudentIds: presentIds,
      });
      toast.success(
        `Saved. ${r.data.data.present} present, ${r.data.data.absent} absent.`
      );
      setPresent({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Mark Attendance</h1>
        <p className="text-sm text-slate-500">
          Pick the class and period, mark present students, then save once for the entire class.
        </p>
      </div>

      <Card title="1. Select Class & Period">
        <div className="grid md:grid-cols-4 gap-3">
          <label className="block">
            <span className="label">Year</span>
            <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Select</option>
              {[2, 3, 4].map((y) => <option key={y} value={y}>{y} Year</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Semester</span>
            <select className="input" value={semester} onChange={(e) => setSemester(e.target.value)} disabled={!year}>
              <option value="">Select</option>
              {year && YEAR_SEMESTERS[Number(year)]?.map((s) => (
                <option key={s} value={s}>Sem {s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Section</span>
            <select className="input" value={section} onChange={(e) => setSection(e.target.value)} disabled={!semester}>
              <option value="">Select</option>
              {SECTIONS.map((s) => <option key={s} value={s}>Section {s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Date</span>
            <input type="date" className="input" value={date}
              onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        {loading && <p className="text-sm text-slate-500 mt-3">Loading timetable…</p>}

        {!loading && year && semester && section && slots.length === 0 && (
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 flex items-start gap-2">
            <Clock size={14} className="mt-0.5 shrink-0" />
            <p>No timetable slots for <b>{dayKey}</b>. Set up the timetable in Admin → Timetable first.</p>
          </div>
        )}

        {slots.length > 0 && (
          <label className="block mt-3">
            <span className="label">Period</span>
            <select className="input" value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}>
              {slots.map((s) => (
                <option key={s._id} value={`${s.startTime}|${s.endTime}`}>
                  {s.startTime}–{s.endTime} · {s.subjectId?.subjectName || ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </Card>

      {students.length > 0 && (
        <Card title={`2. Students (${students.length})`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1 text-green-700">
                <CheckCircle size={14} /> {presentCount} present
              </span>
              <span className="inline-flex items-center gap-1 text-red-700">
                <XCircle size={14} /> {absentCount} absent
              </span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => markAll('PRESENT')}>
                Mark All Present
              </Button>
              <Button type="button" variant="secondary" onClick={() => markAll('ABSENT')}>
                Mark All Absent
              </Button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg max-h-[55vh] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white z-10 border-b border-slate-200">
                <tr className="text-left text-slate-500">
                  <th className="py-2 px-3 w-8">#</th>
                  <th className="py-2 px-3">Roll No</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3 w-24 text-center">Present</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-400 text-xs">{i + 1}</td>
                    <td className="py-2 px-3 font-mono text-xs">{s.rollNumber}</td>
                    <td className="py-2 px-3">{s.name || '—'}</td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!present[s._id]}
                        onChange={() => toggle(s._id)}
                        className="w-5 h-5 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <Button onClick={onSubmit} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving…' : `Save Attendance (${presentCount}/${students.length})`}
            </Button>
            <span className="text-xs text-slate-500">
              One save creates the session, increments Held for all, and increments Attended for present students.
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}