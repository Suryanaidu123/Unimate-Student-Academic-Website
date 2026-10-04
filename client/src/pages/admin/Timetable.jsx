import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, X, Settings, RotateCcw,
  BookOpen, FlaskConical, Star, ArrowUp, ArrowDown,
  LayoutGrid, Link2, Unlink,
} from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import TimetableGrid from '../../components/TimetableGrid.jsx';
import { getSubjectAlias } from '../../utils/subjectAlias.js';
import { useSemester, SEMESTER_KEYS } from '../../context/SemesterContext.jsx';

const ALL_DAYS = [
  { key: 'MON', label: 'Monday' },
  { key: 'TUE', label: 'Tuesday' },
  { key: 'WED', label: 'Wednesday' },
  { key: 'THU', label: 'Thursday' },
  { key: 'FRI', label: 'Friday' },
  { key: 'SAT', label: 'Saturday' },
];

const SECTIONS = ['A', 'B', 'C', 'D'];

const DEFAULT_PERIODS = [
  { startTime: '09:00', endTime: '09:55', kind: 'CLASS' },
  { startTime: '09:55', endTime: '10:50', kind: 'CLASS' },
  { startTime: '10:50', endTime: '11:00', kind: 'BREAK' },
  { startTime: '11:00', endTime: '11:55', kind: 'CLASS' },
  { startTime: '11:55', endTime: '12:50', kind: 'CLASS' },
  { startTime: '12:50', endTime: '13:45', kind: 'LUNCH' },
  { startTime: '13:45', endTime: '14:40', kind: 'CLASS' },
  { startTime: '14:40', endTime: '15:35', kind: 'CLASS' },
  { startTime: '15:35', endTime: '16:30', kind: 'CLASS' },
];

const KIND_OPTIONS = [
  { key: 'CLASS', label: 'Class (Subject / Lab / Activity)' },
  { key: 'BREAK', label: 'Break' },
  { key: 'LUNCH', label: 'Lunch Break' },
];

const cfgKey = (y, s, sec) => `unimate_tt_config_${y}_${s}_${sec}`;
const loadConfig = (y, s, sec) => {
  try { return JSON.parse(localStorage.getItem(cfgKey(y, s, sec)) || 'null'); }
  catch { return null; }
};
const saveConfig = (y, s, sec, cfg) =>
  localStorage.setItem(cfgKey(y, s, sec), JSON.stringify(cfg));

function normalizeTime(str) {
  if (!str) return '';
  const parts = String(str).trim().split(':');
  if (parts.length !== 2) return String(str).trim();
  return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`;
}
function toMinutes(str) {
  const s = normalizeTime(str);
  const [h, m] = s.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}
function isValidTime(str) {
  const s = normalizeTime(str);
  return /^\d{2}:\d{2}$/.test(s) && toMinutes(s) >= 0;
}
function to12h(t) {
  if (!t) return '';
  const [hh, mm] = normalizeTime(t).split(':').map(Number);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`;
}
function addMinutes(t, delta) {
  const s = normalizeTime(t);
  const [h, m] = s.split(':').map(Number);
  const total = h * 60 + m + delta;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function AdminTimetable() {
  const { year, semester, setKey } = useSemester();
  const activeKey = SEMESTER_KEYS.find((s) => s.year === year && s.semester === semester);

  const [section, setSection] = useState('A');
  const [config, setConfig] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [draftDays, setDraftDays] = useState(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
  const [draftPeriods, setDraftPeriods] = useState([]);

  const [slots, setSlots] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(false);

  // cell editor
  const [cellOpen, setCellOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [cellTarget, setCellTarget] = useState(null);
  const [cellForm, setCellForm] = useState({
    subjectId: '',
    extraPeriods: [], // indices of additional periods this slot should cover
  });
  const [saving, setSaving] = useState(false);

  // add subject
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    subjectName: '', subjectCode: '', type: 'THEORY',
    credits: 3, facultyId: '', description: '',
  });
  const [savingSubject, setSavingSubject] = useState(false);

  useEffect(() => {
    const cfg = loadConfig(year, semester, section);
    setConfig(cfg);
    if (!cfg) {
      setShowSetup(true);
      setDraftDays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
      setDraftPeriods(DEFAULT_PERIODS.map((p) => ({ ...p })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, semester, section]);

  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get(`/timetable?year=${year}&semester=${semester}&section=${section}`),
      api.get(`/subjects?year=${year}&semester=${semester}&limit=200`),
      api.get('/faculty?limit=200'),
    ])
      .then(([tRes, sRes, fRes]) => {
        if (cancelled) return;
        setSlots(tRes.data.data || []);
        setSubjects(sRes.data.data.items || []);
        setFaculties(fRes.data.data.items || []);
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [config, year, semester, section]);

  function reloadSlots() {
    return api
      .get(`/timetable?year=${year}&semester=${semester}&section=${section}`)
      .then((r) => setSlots(r.data.data || []));
  }

  function reloadSubjects() {
    api.get(`/subjects?year=${year}&semester=${semester}&limit=200`)
      .then((r) => setSubjects(r.data.data.items || []))
      .catch(() => {});
  }

  // ---------------- SETUP MODAL ----------------

  function openSetup() {
    const existing = config || { days: ALL_DAYS.map((d) => d.key), periods: DEFAULT_PERIODS };
    setDraftDays(existing.days);
    setDraftPeriods(existing.periods.map((p) => ({ ...p })));
    setShowSetup(true);
  }

  function toggleDraftDay(key) {
    setDraftDays((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]));
  }

  // --- AUTO-FILL NEXT START = PREVIOUS END ---
  function updateDraftPeriod(idx, field, value) {
    setDraftPeriods((prev) => {
      const next = [...prev];
      const current = { ...next[idx] };
      current[field] = value;

      // Normalize on blur
      if (field === 'startTime') current.startTime = normalizeTime(current.startTime);
      if (field === 'endTime') current.endTime = normalizeTime(current.endTime);

      next[idx] = current;

      // When END is edited, cascade to the next row's START if it wasn't overridden
      if (field === 'endTime' && current.endTime) {
        const prevEnd = normalizeTime(prev[idx].endTime || '');
        const nextRow = next[idx + 1];
        if (nextRow) {
          const nextStart = normalizeTime(nextRow.startTime || '');
          // Auto-fill only if the next start is empty OR it was inheriting (equals previous end)
          if (!nextStart || nextStart === prevEnd) {
            next[idx + 1] = { ...nextRow, startTime: current.endTime };
          }
        }
      }
      return next;
    });
  }

  function addDraftPeriod() {
    setDraftPeriods((prev) => {
      const last = prev[prev.length - 1];
      const start = last?.endTime ? normalizeTime(last.endTime) : '09:00';
      const end = addMinutes(start, 55);
      return [...prev, { startTime: start, endTime: end, kind: 'CLASS' }];
    });
  }

  function removeDraftPeriod(idx) {
    setDraftPeriods((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveDraftPeriod(idx, dir) {
    setDraftPeriods((prev) => {
      const next = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= next.length) return prev;
      [next[idx], next[t]] = [next[t], next[idx]];
      return next;
    });
  }

  function loadDefaults() {
    setDraftPeriods(DEFAULT_PERIODS.map((p) => ({ ...p })));
    setDraftDays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
    toast.success('Default layout loaded');
  }

  function applyConfig() {
    if (draftDays.length === 0) return toast.error('Pick at least one day');
    if (draftPeriods.length === 0) return toast.error('Add at least one period');

    for (let i = 0; i < draftPeriods.length; i++) {
      const p = draftPeriods[i];
      const s = normalizeTime(p.startTime);
      const e = normalizeTime(p.endTime);
      if (!isValidTime(s) || !isValidTime(e)) return toast.error(`Period ${i + 1}: invalid time`);
      if (toMinutes(e) <= toMinutes(s)) return toast.error(`Period ${i + 1}: end must be after start`);
    }

    const orderedDays = ALL_DAYS.map((d) => d.key).filter((k) => draftDays.includes(k));
    const finalPeriods = draftPeriods.map((p) => ({
      startTime: normalizeTime(p.startTime),
      endTime: normalizeTime(p.endTime),
      kind: p.kind || 'CLASS',
    }));

    const cfg = { days: orderedDays, periods: finalPeriods };
    saveConfig(year, semester, section, cfg);
    setConfig(cfg);
    setShowSetup(false);
    toast.success('Layout saved');
  }

  async function performReset() {
    setResetting(true);
    try {
      await api.post('/timetable/reset', { year: Number(year), semester: Number(semester), section });
      localStorage.removeItem(cfgKey(year, semester, section));
      setConfig(null);
      setSlots([]);
      setShowReset(false);
      toast.success('Timetable reset');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setResetting(false); }
  }

  // ---------------- CELL EDITOR ----------------

  function findSlot(day, startTime) {
    return slots.find((s) => s.day === day && s.startTime === startTime);
  }

  async function openCell(dayKey, period) {
    if (period.kind === 'BREAK' || period.kind === 'LUNCH') return;

    const idx = config.periods.findIndex((p) => p.startTime === period.startTime);
    const existing = findSlot(dayKey, period.startTime);

    setCellTarget({ day: dayKey, periodIndex: idx, startTime: period.startTime, endTime: period.endTime });

    if (existing) {
      setEditingSlot(existing);
      const others = (existing.periodIndices || [idx]).filter((i) => i !== idx);
      setCellForm({
        subjectId: existing.subjectId?._id || existing.subjectId || '',
        extraPeriods: others,
      });
    } else {
      setEditingSlot(null);
      setCellForm({ subjectId: '', extraPeriods: [] });
    }
    setCellOpen(true);
  }

  // Toggle an additional period in the current cell's span
  function toggleExtraPeriod(idx) {
    if (idx === cellTarget.periodIndex) return; // can't toggle self
    setCellForm((prev) => ({
      ...prev,
      extraPeriods: prev.extraPeriods.includes(idx)
        ? prev.extraPeriods.filter((i) => i !== idx)
        : [...prev.extraPeriods, idx].sort((a, b) => a - b),
    }));
  }

  async function saveCell(e) {
    e.preventDefault();
    if (!cellForm.subjectId) return toast.error('Please select a subject');

    const indices = [cellTarget.periodIndex, ...cellForm.extraPeriods]
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a - b);

    const firstIdx = indices[0];
    const lastIdx = indices[indices.length - 1];
    const startTime = config.periods[firstIdx].startTime;
    const endTime = config.periods[lastIdx].endTime;

    setSaving(true);
    try {
      // Delete any existing slots for these indices on this day
      const daySlots = slots.filter((s) => s.day === cellTarget.day);
      const toDelete = daySlots.filter((s) =>
        (s.periodIndices || []).some((i) => indices.includes(i)) ||
        (s.periodIndices || []).length === 0 &&
          indices.includes(config.periods.findIndex((p) => p.startTime === s.startTime))
      );
      for (const s of toDelete) await api.delete(`/timetable/${s._id}`);

      // Create one slot covering all indices
      await api.post('/timetable', {
        subjectId: cellForm.subjectId,
        year: Number(year),
        semester: Number(semester),
        section: cellTarget.day === undefined ? section : section,
        day: cellTarget.day,
        startTime,
        endTime,
        periodType: 'CLASS',
        isBreak: false,
        periodIndices: indices,
        span: indices.length,
      });

      toast.success(indices.length > 1 ? `Slot saved (Periods ${indices.map((i) => i + 1).join('+')})` : 'Slot saved');
      setCellOpen(false);
      await reloadSlots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  async function splitSlot() {
    if (!editingSlot) return;
    // Split a combined slot into individual single-period slots, one per index
    const indices = editingSlot.periodIndices || [];
    if (indices.length <= 1) return toast.error('This slot is not combined');

    try {
      const subjectId = editingSlot.subjectId?._id || editingSlot.subjectId;
      await api.delete(`/timetable/${editingSlot._id}`);

      for (const idx of indices) {
        const p = config.periods[idx];
        if (!p || p.kind !== 'CLASS') continue;
        await api.post('/timetable', {
          subjectId,
          year: Number(year),
          semester: Number(semester),
          section,
          day: editingSlot.day,
          startTime: p.startTime,
          endTime: p.endTime,
          periodType: 'CLASS',
          isBreak: false,
          periodIndices: [idx],
          span: 1,
        });
      }

      toast.success('Slot split into individual periods');
      setCellOpen(false);
      await reloadSlots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to split');
    }
  }

  async function deleteCell() {
    if (!editingSlot) return;
    try {
      await api.delete(`/timetable/${editingSlot._id}`);
      toast.success('Slot removed');
      setCellOpen(false);
      await reloadSlots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  }

  async function clearDay(dayKey) {
    const daySlots = slots.filter((s) => s.day === dayKey);
    if (daySlots.length === 0) return;
    if (!window.confirm(`Clear all ${daySlots.length} slot(s) on ${dayKey}?`)) return;
    try {
      await Promise.all(daySlots.map((s) => api.delete(`/timetable/${s._id}`)));
      toast.success(`${dayKey} cleared`);
      await reloadSlots();
    } catch {
      toast.error('Failed to clear day');
    }
  }

  // ---------------- ADD SUBJECT ----------------

  function openAddSubject() {
    setSubjectForm({
      subjectName: '', subjectCode: '', type: 'THEORY',
      credits: 3, facultyId: '', description: '',
    });
    setAddSubjectOpen(true);
  }

  async function submitAddSubject(e) {
    e.preventDefault();
    setSavingSubject(true);
    try {
      const payload = {
        subjectName: subjectForm.subjectName.trim(),
        type: subjectForm.type,
        year: Number(year),
        semester: Number(semester),
      };
      if (subjectForm.type === 'THEORY') {
        payload.subjectCode = subjectForm.subjectCode.trim().toUpperCase();
        payload.credits = Number(subjectForm.credits || 0);
        if (subjectForm.facultyId) payload.facultyId = subjectForm.facultyId;
      }
      await api.post('/subjects', payload);
      toast.success(`${subjectForm.type === 'ACTIVITY' ? 'Activity' : subjectForm.type === 'LAB' ? 'Lab' : 'Subject'} added`);
      setAddSubjectOpen(false);
      reloadSubjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add');
    } finally { setSavingSubject(false); }
  }

  // ---------------- RENDER ----------------

  const selectedSubject = subjects.find((s) => s._id === cellForm.subjectId);

  const subjectIcon = (type) => {
    if (type === 'LAB') return <FlaskConical size={11} className="text-amber-600" />;
    if (type === 'ACTIVITY') return <Star size={11} className="text-purple-600" />;
    return <BookOpen size={11} className="text-brand-600" />;
  };

  // Determine which periods the modal can offer for combining
  const availableExtraPeriods = (() => {
    if (!cellTarget || !config) return [];
    const selfIdx = cellTarget.periodIndex;
    const list = [];
    for (let i = 0; i < config.periods.length; i++) {
      if (i === selfIdx) continue;
      if (config.periods[i].kind !== 'CLASS') continue;
      // Allow any CLASS period on the same day — user decides what to combine
      list.push(i);
    }
    return list;
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timetable</h1>
          <p className="text-sm text-slate-500">
            {activeKey ? `${activeKey.label} · ${activeKey.fullLabel} · Section ${section}` : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={openAddSubject}>
            <Plus size={16} /> Add Subject / Lab / Activity
          </Button>
          <Button variant="secondary" onClick={openSetup}>
            <Settings size={16} /> Configure Layout
          </Button>
          {config && (
            <Button variant="danger" onClick={() => setShowReset(true)}>
              <RotateCcw size={16} /> Reset
            </Button>
          )}
        </div>
      </div>

      <Card title="Semester">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SEMESTER_KEYS.map((s) => {
            const isActive = s.year === year && s.semester === semester;
            return (
              <button key={s.key} type="button" onClick={() => setKey(s.key)}
                className={`text-left rounded-lg border px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-brand-400'
                }`}>
                <p className="font-semibold">{s.label}</p>
                <p className={`text-xs mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                  {s.semester}th Sem
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <label className="block md:w-64">
          <span className="label">Section</span>
          <select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
            {SECTIONS.map((s) => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </label>
      </Card>

      {subjects.length > 0 && (
        <Card>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                <BookOpen size={16} className="text-brand-600" />
                Subjects ({subjects.filter((s) => s.type === 'THEORY').length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {subjects.filter((s) => s.type === 'THEORY').map((s) => (
                  <span key={s._id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                    <span className="font-semibold">{getSubjectAlias(s)}</span>
                    <span className="text-slate-500">{s.subjectName}</span>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                <FlaskConical size={16} className="text-amber-600" />
                Labs ({subjects.filter((s) => s.type === 'LAB').length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {subjects.filter((s) => s.type === 'LAB').map((s) => (
                  <span key={s._id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                    <span className="font-semibold">{getSubjectAlias(s)}</span>
                    <span className="text-slate-500">{s.subjectName}</span>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Star size={16} className="text-purple-600" />
                Other — Activities ({subjects.filter((s) => s.type === 'ACTIVITY').length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {subjects.filter((s) => s.type === 'ACTIVITY').map((s) => (
                  <span key={s._id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                    <span className="font-semibold">{getSubjectAlias(s)}</span>
                    <span className="text-slate-500">{s.subjectName}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {!config && (
        <Card>
          <div className="text-center py-10">
            <Settings size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 mb-4">No layout configured yet for {activeKey?.label} · Section {section}.</p>
            <Button onClick={openSetup}>
              <Settings size={16} /> Configure Timetable Layout
            </Button>
          </div>
        </Card>
      )}

      {config && (
        <Card>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <LayoutGrid size={18} className="text-brand-600" />
              <h3 className="font-semibold text-slate-900">Timetable Preview</h3>
            </div>
            <p className="text-xs text-slate-500">
              Click any class cell to assign. Combine consecutive periods inside the dialog.
            </p>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
          ) : (
            <TimetableGrid
              periods={config.periods}
              days={config.days}
              slots={slots}
              mode="admin"
              onCellClick={(day, period) => openCell(day, period)}
              onClearDay={clearDay}
            />
          )}
        </Card>
      )}

      {/* ------------- SETUP MODAL ------------- */}
      <Modal open={showSetup} onClose={() => setShowSetup(false)}
        title={`Layout for ${activeKey?.label} · Section ${section}`}>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div>
            <p className="label">Working days (rows)</p>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((d) => {
                const selected = draftDays.includes(d.key);
                return (
                  <button key={d.key} type="button" onClick={() => toggleDraftDay(d.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      selected
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
                    }`}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="label mb-0">Periods (columns, in order)</p>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={loadDefaults} className="text-brand-600 hover:underline">
                  load defaults
                </button>
                {draftPeriods.length > 0 && (
                  <button type="button" onClick={() => setDraftPeriods([])} className="text-red-500 hover:underline">
                    clear
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {draftPeriods.map((p, idx) => {
                const isBreak = p.kind === 'BREAK';
                const isLunch = p.kind === 'LUNCH';
                return (
                  <div key={idx}
                    className={`rounded-lg border p-2 ${
                      isLunch ? 'bg-orange-50 border-orange-200'
                        : isBreak ? 'bg-slate-100 border-slate-200'
                        : 'bg-white border-slate-200'
                    }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        isLunch ? 'bg-orange-200 text-orange-800'
                          : isBreak ? 'bg-slate-200 text-slate-700'
                          : 'bg-brand-100 text-brand-700'
                      }`}>#{idx + 1}</span>

                      <input
                        type="text"
                        className="input !py-1 !px-2 !text-xs w-20"
                        value={p.startTime}
                        placeholder="09:00"
                        onChange={(e) => updateDraftPeriod(idx, 'startTime', e.target.value)}
                        onBlur={() => updateDraftPeriod(idx, 'startTime', normalizeTime(p.startTime))}
                      />
                      <span className="text-xs text-slate-400">→</span>
                      <input
                        type="text"
                        className="input !py-1 !px-2 !text-xs w-20"
                        value={p.endTime}
                        placeholder="09:55"
                        onChange={(e) => updateDraftPeriod(idx, 'endTime', e.target.value)}
                        onBlur={() => updateDraftPeriod(idx, 'endTime', normalizeTime(p.endTime))}
                      />

                      <select
                        className="input !py-1 !px-2 !text-xs flex-1 min-w-[140px]"
                        value={p.kind || 'CLASS'}
                        onChange={(e) => updateDraftPeriod(idx, 'kind', e.target.value)}
                      >
                        {KIND_OPTIONS.map((k) => (
                          <option key={k.key} value={k.key}>{k.label}</option>
                        ))}
                      </select>

                      <button type="button" onClick={() => moveDraftPeriod(idx, -1)} disabled={idx === 0}
                        className="p-1 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                        title="Move left"><ArrowUp size={14} className="-rotate-90" /></button>
                      <button type="button" onClick={() => moveDraftPeriod(idx, 1)} disabled={idx === draftPeriods.length - 1}
                        className="p-1 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                        title="Move right"><ArrowDown size={14} className="-rotate-90" /></button>
                      <button type="button" onClick={() => removeDraftPeriod(idx)}
                        className="p-1 rounded text-red-500 hover:bg-red-50"
                        title="Remove"><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button type="button" variant="secondary" onClick={addDraftPeriod} className="w-full mt-2">
              <Plus size={14} /> Add Period
            </Button>

            <p className="text-xs text-slate-500 mt-2">
              Tip: after typing an End time, the next row's Start auto-fills with it.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setShowSetup(false)}>Cancel</Button>
            <Button onClick={applyConfig}>Save Layout</Button>
          </div>
        </div>
      </Modal>

      {/* ------------- RESET MODAL ------------- */}
      <Modal open={showReset} onClose={() => setShowReset(false)} title="Reset timetable?">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Deletes all timetable slots for <b>{activeKey?.label} · Section {section}</b> and clears the layout.
          </p>
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
            This cannot be undone.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowReset(false)} disabled={resetting}>Cancel</Button>
            <Button variant="danger" onClick={performReset} disabled={resetting}>
              <RotateCcw size={14} /> {resetting ? 'Resetting…' : 'Reset'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ------------- CELL EDITOR MODAL ------------- */}
      <Modal open={cellOpen} onClose={() => setCellOpen(false)}
        title={editingSlot ? 'Edit Slot' : 'Add Slot'}>
        {cellTarget && (
          <form onSubmit={saveCell} className="space-y-4">
            <div className="text-xs text-slate-500">
              <Badge variant="brand">
                {ALL_DAYS.find((d) => d.key === cellTarget.day)?.label || cellTarget.day}
              </Badge>
              &nbsp; {to12h(cellTarget.startTime)} – {to12h(cellTarget.endTime)} &nbsp;·&nbsp;
              {activeKey?.label} · Section {section}
            </div>

            <label className="block">
              <span className="label">Subject / Lab / Activity</span>
              <select className="input" required value={cellForm.subjectId}
                onChange={(e) => setCellForm({ ...cellForm, subjectId: e.target.value })}>
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    [{s.type}] {getSubjectAlias(s)} — {s.subjectName}
                  </option>
                ))}
              </select>
            </label>

            {/* Combine with other periods on THIS day */}
            <div>
              <p className="label">Combine with additional periods (this day only)</p>
              <p className="text-xs text-slate-500 mb-2">
                Tick consecutive periods to merge them. This affects only{' '}
                <b>{ALL_DAYS.find((d) => d.key === cellTarget.day)?.label}</b> — other days stay untouched.
              </p>
              <div className="flex flex-wrap gap-2">
                {availableExtraPeriods.map((i) => {
                  const p = config.periods[i];
                  const checked = cellForm.extraPeriods.includes(i);
                  return (
                    <label key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs cursor-pointer ${
                      checked ? 'bg-brand-50 border-brand-300 text-brand-800' : 'bg-white border-slate-300 text-slate-700'
                    }`}>
                      <input
                        type="checkbox"
                        className="w-3 h-3"
                        checked={checked}
                        onChange={() => toggleExtraPeriod(i)}
                      />
                      Period {i + 1} ({to12h(p.startTime)}–{to12h(p.endTime)})
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1">
              <p className="text-slate-500">Will be saved as:</p>
              <p>
                <b>Periods</b>{' '}
                {[cellTarget.periodIndex, ...cellForm.extraPeriods]
                  .sort((a, b) => a - b)
                  .map((i) => i + 1)
                  .join(' + ')}
              </p>
              <p className="text-slate-500">
                Faculty:{' '}
                <b>
                  {selectedSubject?.facultyId?.name
                    ? `${selectedSubject.facultyId.name}`
                    : selectedSubject
                    ? 'Not assigned'
                    : '—'}
                </b>
              </p>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <div className="flex gap-2">
                {editingSlot && (
                  <Button type="button" variant="danger" onClick={deleteCell}>
                    <Trash2 size={14} /> Delete
                  </Button>
                )}
                {editingSlot && (editingSlot.periodIndices?.length || 0) > 1 && (
                  <Button type="button" variant="secondary" onClick={splitSlot}>
                    <Unlink size={14} /> Split
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setCellOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingSlot ? 'Save Changes' : 'Add Slot'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* ------------- ADD SUBJECT MODAL ------------- */}
      <Modal open={addSubjectOpen} onClose={() => setAddSubjectOpen(false)}
        title={`Add Subject / Lab / Activity for ${activeKey?.label}`}>
        <form onSubmit={submitAddSubject} className="space-y-3">
          <label className="block">
            <span className="label">Type</span>
            <select className="input" required value={subjectForm.type}
              onChange={(e) => setSubjectForm({ ...subjectForm, type: e.target.value })}>
              <option value="THEORY">Subject (Theory)</option>
              <option value="LAB">Lab</option>
              <option value="ACTIVITY">Activity</option>
            </select>
          </label>

          <Input label="Name" required value={subjectForm.subjectName}
            onChange={(e) => setSubjectForm({ ...subjectForm, subjectName: e.target.value })}
            placeholder={
              subjectForm.type === 'LAB' ? 'e.g. Deep Learning Lab (DLL)'
                : subjectForm.type === 'ACTIVITY' ? 'e.g. Skilling Practice (SP)'
                : 'e.g. Deep Learning (DL)'
            }
            autoFocus />

          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
            Put the alias in parentheses — <b>Deep Learning (DL)</b>. Only <b>DL</b> shows in the grid.
          </p>

          {subjectForm.type === 'THEORY' && (
            <>
              <Input label="Code" required value={subjectForm.subjectCode}
                onChange={(e) => setSubjectForm({ ...subjectForm, subjectCode: e.target.value })}
                placeholder="e.g. AIML301" />
              <Input label="Credits" type="number" step="0.5" min={0} max={6}
                value={subjectForm.credits}
                onChange={(e) => setSubjectForm({ ...subjectForm, credits: e.target.value })} />
              <label className="block">
                <span className="label">Faculty</span>
                <select className="input" value={subjectForm.facultyId}
                  onChange={(e) => setSubjectForm({ ...subjectForm, facultyId: e.target.value })}>
                  <option value="">— None —</option>
                  {faculties.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.employeeId} — {f.name || '(pending)'}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <Button type="submit" className="w-full" disabled={savingSubject}>
            {savingSubject ? 'Saving…' : 'Add'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}