import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Settings, RotateCcw, BookOpen, FlaskConical, Star } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
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
  { startTime: '09:00', endTime: '09:50', kind: 'CLASS' },
  { startTime: '09:50', endTime: '10:40', kind: 'CLASS' },
  { startTime: '10:40', endTime: '10:50', kind: 'BREAK' },
  { startTime: '10:50', endTime: '11:40', kind: 'CLASS' },
  { startTime: '11:40', endTime: '12:30', kind: 'CLASS' },
  { startTime: '12:30', endTime: '13:30', kind: 'LUNCH' },
  { startTime: '13:30', endTime: '14:20', kind: 'CLASS' },
  { startTime: '14:20', endTime: '15:10', kind: 'CLASS' },
  { startTime: '15:10', endTime: '16:00', kind: 'CLASS' },
];

const KIND_OPTIONS = [
  { key: 'CLASS', label: 'Subject / Lab / Activity' },
  { key: 'BREAK', label: 'Break' },
  { key: 'LUNCH', label: 'Lunch Break' },
];

const cfgKey = (year, semester, section) => `unimate_tt_config_${year}_${semester}_${section}`;

function loadConfig(y, sem, sec) {
  try { return JSON.parse(localStorage.getItem(cfgKey(y, sem, sec)) || 'null'); }
  catch { return null; }
}
function saveConfig(y, sem, sec, cfg) {
  localStorage.setItem(cfgKey(y, sem, sec), JSON.stringify(cfg));
}
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
  const [newPeriod, setNewPeriod] = useState({ startTime: '09:00', endTime: '09:50', kind: 'CLASS' });
  const [slots, setSlots] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cellOpen, setCellOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [cellTarget, setCellTarget] = useState(null);
  const [cellForm, setCellForm] = useState({ subjectId: '' });
  const [saving, setSaving] = useState(false);
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    subjectName: '', subjectCode: '', type: 'THEORY', credits: 3, facultyId: '', description: '',
  });
  const [savingSubject, setSavingSubject] = useState(false);
  const [faculties, setFaculties] = useState([]);

  useEffect(() => {
    const cfg = loadConfig(year, semester, section);
    setConfig(cfg);
    if (!cfg) {
      setShowSetup(true);
      setDraftDays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
      setDraftPeriods(DEFAULT_PERIODS);
      setNewPeriod({ startTime: '16:00', endTime: '16:50', kind: 'CLASS' });
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

  function reloadSubjectsAndFaculties() {
    api.get(`/subjects?year=${year}&semester=${semester}&limit=200`)
      .then((r) => setSubjects(r.data.data.items || []))
      .catch(() => {});
  }

  function openSetup() {
    const existing = config || { days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], periods: DEFAULT_PERIODS };
    setDraftDays(existing.days);
    setDraftPeriods(existing.periods);
    setShowSetup(true);
  }
  function toggleDraftDay(key) {
    setDraftDays((prev) => prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]);
  }
  function addDraftPeriod() {
    const start = normalizeTime(newPeriod.startTime);
    const end = normalizeTime(newPeriod.endTime);
    const kind = newPeriod.kind || 'CLASS';
    if (!start || !end) return toast.error('Enter both start and end time');
    if (!isValidTime(start) || !isValidTime(end)) return toast.error('Use HH:MM format');
    if (toMinutes(end) <= toMinutes(start)) return toast.error('End time must be after start');
    if (draftPeriods.some((p) => normalizeTime(p.startTime) === start)) {
      return toast.error(`A period starting at ${to12h(start)} already exists`);
    }
    const next = [...draftPeriods, { startTime: start, endTime: end, kind }]
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    setDraftPeriods(next);
    setNewPeriod({ startTime: end, endTime: '', kind: 'CLASS' });
  }
  function removeDraftPeriod(startTime) {
    setDraftPeriods(draftPeriods.filter((p) => p.startTime !== startTime));
  }
  function changeDraftKind(startTime, kind) {
    setDraftPeriods((prev) => prev.map((p) => p.startTime === startTime ? { ...p, kind } : p));
  }
  function applyConfig() {
    if (draftDays.length === 0) return toast.error('Pick at least one day');
    if (draftPeriods.length === 0) return toast.error('Add at least one time period');
    const orderedDays = ALL_DAYS.map((d) => d.key).filter((k) => draftDays.includes(k));
    const sortedPeriods = [...draftPeriods]
      .map((p) => ({ startTime: normalizeTime(p.startTime), endTime: normalizeTime(p.endTime), kind: p.kind || 'CLASS' }))
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    const cfg = { days: orderedDays, periods: sortedPeriods };
    saveConfig(year, semester, section, cfg);
    setConfig(cfg);
    setShowSetup(false);
    toast.success('Timetable layout saved');
  }
  async function performReset() {
    setResetting(true);
    try {
      await api.post('/timetable/reset', {
        year: Number(year), semester: Number(semester), section,
      });
      localStorage.removeItem(cfgKey(year, semester, section));
      setConfig(null);
      setSlots([]);
      setShowReset(false);
      toast.success('Timetable reset successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset');
    } finally { setResetting(false); }
  }
  function findSlot(day, startTime) {
    return slots.find((s) => s.day === day && s.startTime === startTime);
  }

  async function openCell(day, period) {
    const existing = findSlot(day, period.startTime);
    setCellTarget({ day, ...period });

    if (period.kind === 'BREAK' || period.kind === 'LUNCH') {
      try {
        if (existing) await api.delete(`/timetable/${existing._id}`);
        await api.post('/timetable', {
          year: Number(year), semester: Number(semester), section,
          day, startTime: period.startTime, endTime: period.endTime,
          periodType: period.kind, isBreak: true,
        });
        toast.success(`${period.kind === 'LUNCH' ? 'Lunch Break' : 'Break'} marked`);
        await reloadSlots();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed');
      }
      return;
    }

    if (existing) {
      setEditingSlot(existing);
      setCellForm({ subjectId: existing.subjectId?._id || existing.subjectId || '' });
    } else {
      setEditingSlot(null);
      setCellForm({ subjectId: '' });
    }
    setCellOpen(true);
  }
  async function reloadSlots() {
    const tRes = await api.get(`/timetable?year=${year}&semester=${semester}&section=${section}`);
    setSlots(tRes.data.data || []);
  }
  async function saveCell(e) {
    e.preventDefault();
    if (!cellForm.subjectId) return toast.error('Please select a subject');
    setSaving(true);
    try {
      const payload = {
        subjectId: cellForm.subjectId,
        year: Number(year), semester: Number(semester), section,
        day: cellTarget.day,
        startTime: cellTarget.startTime,
        endTime: cellTarget.endTime,
        periodType: 'CLASS',
        isBreak: false,
      };
      if (editingSlot) {
        await api.put(`/timetable/${editingSlot._id}`, payload);
        toast.success('Slot updated');
      } else {
        await api.post('/timetable', payload);
        toast.success('Slot added');
      }
      setCellOpen(false);
      await reloadSlots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
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
  function openAddSubject() {
    setSubjectForm({ subjectName: '', subjectCode: '', type: 'THEORY', credits: 3, facultyId: '', description: '' });
    setAddSubjectOpen(true);
  }
  async function submitAddSubject(e) {
    e.preventDefault();
    setSavingSubject(true);
    try {
      const payload = {
        subjectName: subjectForm.subjectName.trim(),
        subjectCode: subjectForm.subjectCode.trim().toUpperCase(),
        type: subjectForm.type,
        credits: Number(subjectForm.credits || 0),
        year: Number(year), semester: Number(semester),
        facultyId: subjectForm.facultyId || undefined,
        description: subjectForm.description.trim(),
      };
      if (!payload.facultyId) delete payload.facultyId;
      await api.post('/subjects', payload);
      toast.success(`${subjectForm.type === 'ACTIVITY' ? 'Activity' : subjectForm.type === 'LAB' ? 'Lab' : 'Subject'} added`);
      setAddSubjectOpen(false);
      reloadSubjectsAndFaculties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add');
    } finally { setSavingSubject(false); }
  }
  const dayLabel = (key) => ALL_DAYS.find((d) => d.key === key)?.label || key;

  const subjectIcon = (type) => {
    if (type === 'LAB') return <FlaskConical size={11} className="text-amber-600" />;
    if (type === 'ACTIVITY') return <Star size={11} className="text-purple-600" />;
    return <BookOpen size={11} className="text-brand-600" />;
  };

  // Selected subject derived faculty (for the modal)
  const selectedSubject = subjects.find((s) => s._id === cellForm.subjectId);

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
            <Plus size={16} /> Add Subject / Activity
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
                  isActive ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-brand-400'
                }`}>
                <p className="font-semibold">{s.label}</p>
                <p className={`text-xs mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-500'}`}>{s.semester}th Sem</p>
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
        <Card title={`Subjects, Labs & Activities in ${activeKey?.label} (${subjects.length})`}>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span key={s._id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                {subjectIcon(s.type)}
                <span className="font-medium">{s.subjectName}</span>
                <span className="text-slate-400">({s.subjectCode})</span>
                {s.facultyId?.name && (
                  <span className="text-slate-500">· {s.facultyId.name}</span>
                )}
                {!s.facultyId && (
                  <span className="text-red-500 font-medium">· Faculty not assigned</span>
                )}
              </span>
            ))}
          </div>
        </Card>
      )}

      {!config && (
        <Card>
          <div className="text-center py-10">
            <p className="text-slate-600 mb-4">
              No layout configured yet for {activeKey?.label} · Section {section}.
            </p>
            <Button onClick={openSetup}>
              <Settings size={16} /> Configure Timetable Layout
            </Button>
          </div>
        </Card>
      )}

      {config && (
        <Card>
          {loading ? (
            <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="min-w-[900px] sm:min-w-[1100px] border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-semibold text-slate-700 w-24">
                      Day
                    </th>
                    {config.periods.map((p) => {
                      const kind = p.kind || 'CLASS';
                      const isBreak = kind === 'BREAK';
                      const isLunch = kind === 'LUNCH';
                      return (
                        <th key={p.startTime}
                          className={`border border-slate-200 px-2 py-1 text-left font-semibold whitespace-nowrap ${
                            isLunch ? 'bg-orange-50 text-orange-700'
                              : isBreak ? 'bg-slate-100 text-slate-600'
                              : 'bg-slate-50 text-slate-700'
                          }`}>
                          <div>{to12h(p.startTime)}–{to12h(p.endTime)}</div>
                          {(isBreak || isLunch) && (
                            <div className="text-[10px] font-normal mt-0.5">
                              {isLunch ? 'Lunch Break' : 'Break'}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {config.days.map((dayKey) => (
                    <tr key={dayKey}>
                      <td className="border border-slate-200 px-2 py-1 bg-slate-50 font-medium text-slate-700 whitespace-nowrap">
                        {dayLabel(dayKey)}
                      </td>
                      {config.periods.map((p) => {
                        const kind = p.kind || 'CLASS';
                        const slot = findSlot(dayKey, p.startTime);
                        if (kind === 'BREAK' || kind === 'LUNCH') {
                          const isLunch = kind === 'LUNCH';
                          return (
                            <td key={p.startTime}
                              className={`border border-slate-200 p-1 align-middle text-center ${
                                isLunch ? 'bg-orange-50' : 'bg-slate-50'
                              }`}>
                              <div className={`text-[10px] font-medium ${isLunch ? 'text-orange-700' : 'text-slate-500'}`}>
                                {isLunch ? 'Lunch Break' : 'Break'}
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td key={p.startTime}
                            className="border border-slate-200 p-1 align-top cursor-pointer hover:bg-brand-50/40"
                            onClick={() => openCell(dayKey, p)}>
                            {slot ? (
                              <div className="px-1 py-0.5 leading-tight">
                                <div className="flex items-center gap-1">
                                  {subjectIcon(slot.subjectId?.type)}
                                  <p className="font-semibold text-slate-900 text-[11px] truncate" title={slot.subjectId?.subjectName}>
                                    {slot.subjectId?.subjectName || '—'}
                                  </p>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {slot.facultyId?.name || '—'}
                                </p>
                              </div>
                            ) : (
                              <div className="py-1 text-[10px] text-slate-300 text-center">+ add</div>
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
      )}

      <Modal open={showSetup} onClose={() => setShowSetup(false)}
        title={`Layout for ${activeKey?.label} · Section ${section}`}>
        <div className="space-y-4">
          <div>
            <p className="label">Days (rows)</p>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((d) => {
                const selected = draftDays.includes(d.key);
                return (
                  <button key={d.key} type="button" onClick={() => toggleDraftDay(d.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      selected ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'}`}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="label mb-0">Time periods (columns)</p>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => setDraftPeriods(DEFAULT_PERIODS)} className="text-brand-600 hover:underline">
                  load defaults
                </button>
                {draftPeriods.length > 0 && (
                  <button type="button" onClick={() => setDraftPeriods([])} className="text-red-500 hover:underline">
                    clear
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2">
              {draftPeriods.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">No periods yet — add one below.</p>
              )}
              {draftPeriods.map((p) => {
                const isBreak = p.kind === 'BREAK';
                const isLunch = p.kind === 'LUNCH';
                return (
                  <div key={p.startTime}
                    className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm ${
                      isLunch ? 'bg-orange-50' : isBreak ? 'bg-slate-100' : 'bg-slate-50'
                    }`}>
                    <span className="flex-1">{to12h(p.startTime)} – {to12h(p.endTime)}</span>
                    <select className="text-xs border border-slate-300 rounded px-1 py-0.5 bg-white"
                      value={p.kind || 'CLASS'}
                      onChange={(e) => changeDraftKind(p.startTime, e.target.value)}>
                      {KIND_OPTIONS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                    </select>
                    <button type="button" onClick={() => removeDraftPeriod(p.startTime)}
                      className="text-red-500 hover:text-red-700"><X size={14} /></button>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <Input label="Start" placeholder="09:00" value={newPeriod.startTime}
                onChange={(e) => setNewPeriod({ ...newPeriod, startTime: e.target.value })}
                onBlur={() => setNewPeriod({ ...newPeriod, startTime: normalizeTime(newPeriod.startTime) })} />
              <Input label="End" placeholder="09:50" value={newPeriod.endTime}
                onChange={(e) => setNewPeriod({ ...newPeriod, endTime: e.target.value })}
                onBlur={() => setNewPeriod({ ...newPeriod, endTime: normalizeTime(newPeriod.endTime) })} />
              <label className="block">
                <span className="label">Kind</span>
                <select className="input" value={newPeriod.kind}
                  onChange={(e) => setNewPeriod({ ...newPeriod, kind: e.target.value })}>
                  {KIND_OPTIONS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                </select>
              </label>
              <div className="flex items-end">
                <Button type="button" variant="secondary" onClick={addDraftPeriod} className="w-full">
                  <Plus size={14} /> Add
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setShowSetup(false)}>Cancel</Button>
            <Button onClick={applyConfig}>Generate Timetable</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showReset} onClose={() => setShowReset(false)} title="Reset timetable?">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            This deletes all timetable slots for <b>{activeKey?.label} · Section {section}</b>.
          </p>
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
            This cannot be undone. Other semesters are not affected.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowReset(false)} disabled={resetting}>Cancel</Button>
            <Button variant="danger" onClick={performReset} disabled={resetting}>
              <RotateCcw size={14} /> {resetting ? 'Resetting…' : 'Reset Timetable'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={cellOpen} onClose={() => setCellOpen(false)}
        title={editingSlot ? 'Edit Slot' : 'Add Slot'}>
        {cellTarget && (
          <form onSubmit={saveCell} className="space-y-3">
            <div className="text-xs text-slate-500">
              <Badge variant="brand">{dayLabel(cellTarget.day)}</Badge>
              &nbsp; {to12h(cellTarget.startTime)} – {to12h(cellTarget.endTime)} &nbsp;·&nbsp;
              {activeKey?.label} · Section {section}
            </div>

            <label className="block">
              <span className="label">Subject / Lab / Activity</span>
              <select className="input" required value={cellForm.subjectId}
                onChange={(e) => setCellForm({ subjectId: e.target.value })}>
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    [{s.type}] {s.subjectName} — {s.subjectCode}
                    {s.facultyId?.name ? ` · ${s.facultyId.name}` : ' · Faculty not assigned'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Faculty is auto-matched from the subject's assignment.
              </p>
            </label>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs">
              <p className="text-slate-500">Auto-matched Faculty:</p>
              <p className="font-semibold text-slate-800 mt-0.5">
                {selectedSubject?.facultyId?.name
                  ? `${selectedSubject.facultyId.name} (${selectedSubject.facultyId.employeeId || '—'})`
                  : selectedSubject
                  ? 'Faculty not assigned — cannot save'
                  : '—'}
              </p>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              {editingSlot ? (
                <Button type="button" variant="danger" onClick={deleteCell}>
                  <Trash2 size={14} /> Delete
                </Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setCellOpen(false)}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={saving || (selectedSubject && !selectedSubject.facultyId)}
                >
                  {saving ? 'Saving…' : editingSlot ? 'Save Changes' : 'Add Slot'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={addSubjectOpen} onClose={() => setAddSubjectOpen(false)}
        title={`Add Subject / Lab / Activity for ${activeKey?.label}`}>
        <form onSubmit={submitAddSubject} className="space-y-3">
          <Input label="Name" required value={subjectForm.subjectName}
            onChange={(e) => setSubjectForm({ ...subjectForm, subjectName: e.target.value })}
            placeholder="e.g. Skilling Practice / NPTEL / Machine Learning" />
          <Input label="Code" required value={subjectForm.subjectCode}
            onChange={(e) => setSubjectForm({ ...subjectForm, subjectCode: e.target.value })}
            placeholder="e.g. AIML501 / SKILL5 / NPTEL5" />
          <label className="block">
            <span className="label">Type</span>
            <select className="input" required value={subjectForm.type}
              onChange={(e) => setSubjectForm({ ...subjectForm, type: e.target.value })}>
              <option value="THEORY">Theory Subject</option>
              <option value="LAB">Lab</option>
              <option value="ACTIVITY">Activity (Skilling / NPTEL / Other)</option>
            </select>
          </label>
          <Input label="Credits" type="number" step="0.5" min={0} max={6}
            value={subjectForm.credits}
            onChange={(e) => setSubjectForm({ ...subjectForm, credits: e.target.value })} />
          <label className="block">
            <span className="label">Faculty (recommended — required for timetable)</span>
            <select className="input" value={subjectForm.facultyId}
              onChange={(e) => setSubjectForm({ ...subjectForm, facultyId: e.target.value })}>
              <option value="">— None —</option>
              {faculties.map((f) => (
                <option key={f._id} value={f._id}>{f.employeeId} — {f.name || '(pending)'}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Description (optional)</span>
            <textarea className="input" rows={2} value={subjectForm.description}
              onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })} />
          </label>
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
            Will be added to: <b>{activeKey?.label}</b> · {activeKey?.fullLabel}
          </div>
          <Button type="submit" className="w-full" disabled={savingSubject}>
            {savingSubject ? 'Saving…' : 'Add'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}