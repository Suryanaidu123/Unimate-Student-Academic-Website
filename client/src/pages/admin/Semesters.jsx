import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight, ArrowLeft, Users, GraduationCap, Settings, ChevronLeft,
} from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useSemester, SEMESTER_KEYS } from '../../context/SemesterContext.jsx';

// Which year each semester belongs to + which semesters are 1st / 2nd of that year
const YEAR_SEMS = {
  2: { label: '2nd Year', first: 3, second: 4, cards: ['2-1', '2-2'] },
  3: { label: '3rd Year', first: 5, second: 6, cards: ['3-1', '3-2'] },
  4: { label: '4th Year', first: 7, second: 8, cards: ['4-1', '4-2'] },
};

export default function AdminSemesters() {
  const { year: activeYear, semester: activeSemester, setKey } = useSemester();

  const [view, setView] = useState('YEARS');     // 'YEARS' | 'SEMESTERS'
  const [selectedYear, setSelectedYear] = useState(null);

  const [status, setStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // confirm modal: { year, direction: 'INC' | 'DEC' }
  const [confirm, setConfirm] = useState(null);

  function load() {
    setLoading(true);
    api.get('/admin/semesters/status')
      .then((r) => setStatus(r.data.data || []))
      .catch(() => toast.error('Failed to load semester status'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function countForSem(year, semester) {
    const row = status.find((s) => s.year === year);
    if (!row) return 0;
    return semester === row.semesters.first ? row.counts.sem1 : row.counts.sem2;
  }

  function totalForYear(year) {
    const row = status.find((s) => s.year === year);
    return row ? row.counts.total : 0;
  }

  async function doMove() {
    if (!confirm) return;
    setBusy(true);
    try {
      const direction = confirm.direction === 'INC' ? 'increment' : 'decrement';
      const r = await api.post('/admin/semesters/move', {
        year: confirm.year,
        direction,
      });
      toast.success(r.data.message || 'Students moved');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  // ================================================================
  // View 1: Years overview
  // ================================================================
  if (view === 'YEARS') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap size={22} /> Semesters
          </h1>
          <p className="text-sm text-slate-500">
            Each year has two semesters. Pick a year to manage its semesters.
          </p>
        </div>

        {loading ? (
          <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {[2, 3, 4].map((y) => {
              const meta = YEAR_SEMS[y];
              const activeKey = SEMESTER_KEYS.find(
                (s) => s.year === activeYear && s.semester === activeSemester
              );
              const thisYearIsActive = activeYear === y;
              return (
                <button
                  key={y}
                  onClick={() => { setSelectedYear(y); setView('SEMESTERS'); }}
                  className={`text-left rounded-xl border p-5 transition ${
                    thisYearIsActive
                      ? 'bg-brand-50 border-brand-400 ring-2 ring-brand-200'
                      : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{meta.label}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Semester {meta.first} · Semester {meta.second}
                      </p>
                    </div>
                    <Badge variant="brand">
                      <Users size={12} className="inline mr-1" />
                      {totalForYear(y)}
                    </Badge>
                  </div>

                  {thisYearIsActive && activeKey && (
                    <p className="text-xs text-brand-700 mt-3">
                      Currently viewing: <b>{activeKey.label}</b>
                    </p>
                  )}

                  <div className="flex items-center gap-1 mt-4 text-sm text-brand-600 font-medium">
                    Open semesters <ArrowRight size={14} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ================================================================
  // View 2: Two semesters of the selected year
  // ================================================================
  const meta = YEAR_SEMS[selectedYear];
  const row = status.find((s) => s.year === selectedYear);
  const inFirst = row?.counts.sem1 || 0;
  const inSecond = row?.counts.sem2 || 0;
  const total = row?.counts.total || 0;

  const incLabel = inFirst > 0
    ? `Promote Sem ${meta.first} → Sem ${meta.second}`
    : selectedYear === 4
    ? `Graduate Sem ${meta.second}`
    : `Promote Sem ${meta.second} → Sem ${2 * (selectedYear + 1) - 1}`;

  const decLabel = selectedYear === 2
    ? inSecond > 0
      ? `Move Back Sem ${meta.second} → Sem ${meta.first}`
      : 'Move Back (n/a)'
    : inFirst > 0
    ? `Move Back Sem ${meta.first} → Sem ${meta.first - 1}`
    : `Move Back Sem ${meta.second} → Sem ${meta.first}`;

  const decDisabled = selectedYear === 2 && inFirst === total;

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => { setView('YEARS'); setSelectedYear(null); }}
          className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
          <ChevronLeft size={16} /> Back to years
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{meta.label} — Semesters</h1>
          <p className="text-sm text-slate-500">
            {total} active students · Semester {meta.first} has {inFirst}, Semester {meta.second} has {inSecond}.
          </p>
        </div>
      </div>

      {/* Two semester cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {meta.cards.map((cardKey) => {
          const s = SEMESTER_KEYS.find((x) => x.key === cardKey);
          if (!s) return null;
          const isActive = s.year === activeYear && s.semester === activeSemester;
          const count = countForSem(s.year, s.semester);

          return (
            <div
              key={s.key}
              className={`rounded-xl border p-5 transition ${
                isActive
                  ? 'bg-brand-50 border-brand-400 ring-2 ring-brand-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {s.semester}th Semester
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">{s.fullLabel}</p>
                </div>
                {isActive && <Badge variant="success">Active</Badge>}
              </div>

              <div className="flex items-center gap-2 mt-4 text-sm text-slate-600">
                <Users size={16} />
                <span><b>{count}</b> student{count === 1 ? '' : 's'}</span>
              </div>

              <Button
                className="w-full mt-4"
                variant={isActive ? 'primary' : 'secondary'}
                onClick={() => {
                  setKey(s.key);
                  toast.success(`${s.label} is now the active context`);
                }}
                disabled={isActive}
              >
                <Settings size={14} />
                {isActive ? 'Currently Active' : 'Configure this semester'}
              </Button>

              <p className="text-xs text-slate-500 mt-2">
                Configuring subjects, faculty, timetable, marks for this semester.
              </p>
            </div>
          );
        })}
      </div>

      {/* Promote / Move Back panel */}
      <Card title="Promote / Move Back">
        <p className="text-sm text-slate-600 mb-4">
          <b>Promote</b> moves all students from one semester to the next.
          <b> Move Back</b> reverses an accidental promotion.
          Student records are not changed — only their semester marker moves.
        </p>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 p-4 bg-white">
            <p className="text-xs text-slate-500 mb-1">Next</p>
            <p className="font-semibold mb-3">{incLabel}</p>
            <Button
              className="w-full"
              onClick={() => setConfirm({ year: selectedYear, direction: 'INC' })}
              disabled={total === 0}
            >
              <ArrowRight size={14} /> Promote
            </Button>
            {inFirst > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                {inFirst} student(s) in Semester {meta.first} will move to Semester {meta.second}.
              </p>
            )}
            {inFirst === 0 && inSecond > 0 && selectedYear < 4 && (
              <p className="text-xs text-slate-500 mt-2">
                {inSecond} student(s) in Semester {meta.second} will move to{' '}
                Semester {2 * (selectedYear + 1) - 1} ({selectedYear + 1}th Year).
              </p>
            )}
            {inFirst === 0 && inSecond > 0 && selectedYear === 4 && (
              <p className="text-xs text-slate-500 mt-2">
                {inSecond} student(s) will be marked Graduated.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-4 bg-white">
            <p className="text-xs text-slate-500 mb-1">Previous</p>
            <p className="font-semibold mb-3">{decLabel}</p>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => setConfirm({ year: selectedYear, direction: 'DEC' })}
              disabled={decDisabled || total === 0}
            >
              <ArrowLeft size={14} /> Move Back
            </Button>
            {inSecond > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                {inSecond} student(s) in Semester {meta.second} will move back to Semester {meta.first}.
              </p>
            )}
            {inSecond === 0 && inFirst > 0 && selectedYear > 2 && (
              <p className="text-xs text-slate-500 mt-2">
                {inFirst} student(s) in Semester {meta.first} will move back to{' '}
                Semester {meta.first - 1} ({selectedYear - 1}th Year).
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Confirm modal */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.direction === 'INC' ? 'Promote students?' : 'Move students back?'}
      >
        {confirm && row && (
          <div className="space-y-4 text-sm text-slate-700">
            {confirm.direction === 'INC' ? (
              inFirst > 0 ? (
                <p>
                  <b>{inFirst}</b> student(s) in <b>Semester {meta.first}</b> (
                  {meta.label} · 1st Semester) will move to <b>Semester {meta.second}</b> (
                  {meta.label} · 2nd Semester).
                </p>
              ) : selectedYear === 4 ? (
                <p>
                  <b>{inSecond}</b> student(s) in <b>Semester 8</b> will be marked{' '}
                  <b>Graduated</b>.
                </p>
              ) : (
                <p>
                  <b>{inSecond}</b> student(s) in <b>Semester {meta.second}</b> will move
                  to <b>Semester {2 * (selectedYear + 1) - 1}</b> ({selectedYear + 1}th Year · 1st Semester).
                </p>
              )
            ) : (
              inSecond > 0 ? (
                <p>
                  <b>{inSecond}</b> student(s) in <b>Semester {meta.second}</b> will move
                  back to <b>Semester {meta.first}</b>.
                </p>
              ) : selectedYear > 2 ? (
                <p>
                  <b>{inFirst}</b> student(s) in <b>Semester {meta.first}</b> will move
                  back to <b>Semester {meta.first - 1}</b> ({selectedYear - 1}th Year · 2nd Semester).
                </p>
              ) : (
                <p>Cannot move students back from Semester 3 — it is the first semester.</p>
              )
            )}

            <p className="text-xs text-slate-500">
              Student personal details stay the same. Subjects, faculty, timetable and marks
              will load from the destination semester's configuration automatically.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirm(null)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={doMove} disabled={busy}>
                {busy ? 'Moving…' : 'Confirm'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}