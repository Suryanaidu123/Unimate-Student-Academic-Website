import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Settings } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';

const ALL_DAYS = [
  { key: 'MON', label: 'Monday' },
  { key: 'TUE', label: 'Tuesday' },
  { key: 'WED', label: 'Wednesday' },
  { key: 'THU', label: 'Thursday' },
  { key: 'FRI', label: 'Friday' },
  { key: 'SAT', label: 'Saturday' },
];

const SECTIONS = ['A', 'B', 'C', 'D'];

// localStorage key per year+section
const cfgKey = (year, section) => `unimate_tt_config_${year}_${section}`;

function loadConfig(year, section) {
  try {
    const raw = localStorage.getItem(cfgKey(year, section));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveConfig(year, section, cfg) {
  localStorage.setItem(cfgKey(year, section), JSON.stringify(cfg));
}

export default function AdminTimetable() {
  const [year, setYear] = useState(2);
  const [section, setSection] = useState('A');

  // config = { days: ['MON', ...], periods: [{startTime, endTime}, ...] }
  const [config, setConfig] = useState(null);
  const [showSetup, setShowSetup] = useState(false);

  // Draft state inside the setup modal
  const [draftDays, setDraftDays] = useState(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
  const [draftPeriods, setDraftPeriods] = useState([]);
  const [newPeriod, setNewPeriod] = useState({ startTime: '09:00', endTime: '10:00' });

  // Grid data
  const [slots, setSlots] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cell modal
  const [cellOpen, setCellOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [cellTarget, setCellTarget] = useState(null);
  const [cellForm, setCellForm] = useState({ subjectId: '', facultyId: '', room: '' });
  const [saving, setSaving] = useState(false);

  // ----------------------------------------------------------------
  // When year/section changes, load existing config
  // ----------------------------------------------------------------
  useEffect(() => {
    const cfg = loadConfig(year, section);
    setConfig(cfg);
    if (!cfg) {
      setShowSetup(true);
      // seed draft with a sensible default so admin can just click Generate
      setDraftDays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
      setDraftPeriods([
        { startTime: '09:00', endTime: '10:00' },
        { startTime: '10:00', endTime: '11:00' },
        { startTime: '11:15', endTime: '12:15' },
        { startTime: '12:15', endTime: '13:15' },
      ]);
    }
  }, [year, section]);

  // ----------------------------------------------------------------
  // Load data whenever config is set (i.e. grid is visible)
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get(`/timetable?year=${year}&section=${section}`),
      api.get(`/subjects?year=${year}&limit=200`),
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
  }, [config, year, section]);

  // ----------------------------------------------------------------
  // Setup modal actions
  // ----------------------------------------------------------------
  function openSetup() {
    const existing = config || {
      days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
      periods: [
        { startTime: '09:00', endTime: '10:00' },
        { startTime: '10:00', endTime: '11:00' },
        { startTime: '11:15', endTime: '12:15' },
        { startTime: '12:15', endTime: '13:15' },
      ],
    };
    setDraftDays(existing.days);
    setDraftPeriods(existing.periods);
    setShowSetup(true);
  }

  function toggleDraftDay(key) {
    setDraftDays((prev) =>
      prev.includes(key)
        ? prev.filter((d) => d !== key)
        : [...ALL_DAYS.map((d) => d.key).filter((k) => prev.includes(k) || k === key)]
    );
  }

  function addDraftPeriod() {
    const { startTime, endTime } = newPeriod;
    if (!startTime || !endTime) return;
    if (startTime >= endTime) return toast.error('End time must be after start');
    if (draftPeriods.some((p) => p.startTime === startTime)) return toast.error('Start time already exists');
    const next = [...draftPeriods, { startTime, endTime }].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    setDraftPeriods(next);
    setNewPeriod({ startTime: endTime, endTime: '' });
  }

  function removeDraftPeriod(startTime) {
    setDraftPeriods(draftPeriods.filter((p) => p.startTime !== startTime));
  }

  function applyConfig() {
    if (draftDays.length === 0) return toast.error('Pick at least one day');
    if (draftPeriods.length === 0) return toast.error('Add at least one time period');

    // Keep days in Mon→Sat order
    const orderedDays = ALL_DAYS.map((d) => d.key).filter((k) => draftDays.includes(k));
    const cfg = { days: orderedDays, periods: draftPeriods };
    saveConfig(year, section, cfg);
    setConfig(cfg);
    setShowSetup(false);
    toast.success('Timetable layout saved');
  }

  function resetConfig() {
    if (!window.confirm('Reset layout for this year + section? Cells will not be deleted.')) return;
    localStorage.removeItem(cfgKey(year, section));
    setConfig(null);
  }

  // ----------------------------------------------------------------
  // Cell handling
  // ----------------------------------------------------------------
  function findSlot(day, startTime) {
    return slots.find((s) => s.day === day && s.startTime === startTime);
  }

  function openCell(day, period) {
    const existing = findSlot(day, period.startTime);
    setCellTarget({ day, ...period });
    if (existing) {
      setEditingSlot(existing);
      setCellForm({
        subjectId: existing.subjectId?._id || existing.subjectId,
        facultyId: existing.facultyId?._id || existing.facultyId,
        room: existing.room,
      });
    } else {
      setEditingSlot(null);
      setCellForm({ subjectId: '', facultyId: '', room: '' });
    }
    setCellOpen(true);
  }

  async function saveCell(e) {
    e.preventDefault();
    if (!cellForm.subjectId || !cellForm.facultyId || !cellForm.room) {
      return toast.error('All fields are required');
    }
    setSaving(true);
    try {
      const payload = {
        subjectId: cellForm.subjectId,
        facultyId: cellForm.facultyId,
        room: cellForm.room,
        year: Number(year),
        section,
        day: cellTarget.day,
        startTime: cellTarget.startTime,
        endTime: cellTarget.endTime,
      };
      if (editingSlot) {
        await api.put(`/timetable/${editingSlot._id}`, payload);
        toast.success('Slot updated');
      } else {
        await api.post('/timetable', payload);
        toast.success('Slot added');
      }
      setCellOpen(false);
      // reload slots only
      const tRes = await api.get(`/timetable?year=${year}&section=${section}`);
      setSlots(tRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCell() {
    if (!editingSlot) return;
    if (!window.confirm('Delete this slot?')) return;
    try {
      await api.delete(`/timetable/${editingSlot._id}`);
      toast.success('Slot removed');
      setCellOpen(false);
      const tRes = await api.get(`/timetable?year=${year}&section=${section}`);
      setSlots(tRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  }

  const dayLabel = (key) => ALL_DAYS.find((d) => d.key === key)?.label || key;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timetable</h1>
          <p className="text-sm text-slate-500">
            Configure days and time slots for each year + section, then fill in subjects.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openSetup}>
            <Settings size={16} /> Configure Layout
          </Button>
          {config && (
            <Button variant="danger" onClick={resetConfig}>Reset</Button>
          )}
        </div>
      </div>

      {/* Year + Section picker */}
      <Card>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Year</span>
            <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              <option value={2}>2nd Year</option>
              <option value={3}>3rd Year</option>
              <option value={4}>4th Year</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Section</span>
            <select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
              {SECTIONS.map((s) => <option key={s} value={s}>Section {s}</option>)}
            </select>
          </label>
        </div>
      </Card>

      {/* If no config → show CTA */}
      {!config && (
        <Card>
          <div className="text-center py-10">
            <p className="text-slate-600 mb-4">
              No layout configured yet for <b>Year {year} · Section {section}</b>.
            </p>
            <Button onClick={openSetup}>
              <Settings size={16} /> Configure Timetable Layout
            </Button>
          </div>
        </Card>
      )}

      {/* Grid (only when config exists) */}
      {config && (
        <Card>
          {loading ? (
            <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 w-32">
                      Day
                    </th>
                    {config.periods.map((p) => (
                      <th
                        key={p.startTime}
                        className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 min-w-[160px]"
                      >
                        {p.startTime}–{p.endTime}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {config.days.map((dayKey) => (
                    <tr key={dayKey}>
                      <td className="border border-slate-200 px-3 py-2 bg-slate-50 font-medium text-slate-700">
                        {dayLabel(dayKey)}
                      </td>
                      {config.periods.map((p) => {
                        const slot = findSlot(dayKey, p.startTime);
                        return (
                          <td
                            key={p.startTime}
                            className="border border-slate-200 p-1 align-top cursor-pointer hover:bg-brand-50/40"
                            onClick={() => openCell(dayKey, p)}
                          >
                            {slot ? (
                              <div className="p-2">
                                <p className="font-semibold text-brand-700 text-xs">
                                  {slot.subjectId?.subjectCode}
                                </p>
                                <p className="text-xs text-slate-600 truncate">
                                  {slot.subjectId?.subjectName}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {slot.facultyId?.name || 'Faculty'}
                                </p>
                                <p className="text-xs text-slate-400">Room {slot.room}</p>
                              </div>
                            ) : (
                              <div className="p-2 text-xs text-slate-300 text-center">+ add</div>
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

      {/* ---- Setup modal ---- */}
      <Modal
        open={showSetup}
        onClose={() => setShowSetup(false)}
        title={`Layout for Year ${year} · Section ${section}`}
      >
        <div className="space-y-4">
          {/* Days */}
          <div>
            <p className="label">Days (rows)</p>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((d) => {
                const selected = draftDays.includes(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleDraftDay(d.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      selected
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Periods */}
          <div>
            <p className="label">Time periods (columns)</p>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
              {draftPeriods.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">
                  No periods yet — add one below.
                </p>
              )}
              {draftPeriods.map((p) => (
                <div key={p.startTime} className="flex items-center justify-between bg-slate-50 rounded px-3 py-1.5 text-sm">
                  <span>{p.startTime}–{p.endTime}</span>
                  <button
                    type="button"
                    onClick={() => removeDraftPeriod(p.startTime)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add period inline */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Input
                label="Start"
                placeholder="09:00"
                value={newPeriod.startTime}
                onChange={(e) => setNewPeriod({ ...newPeriod, startTime: e.target.value })}
              />
              <Input
                label="End"
                placeholder="10:00"
                value={newPeriod.endTime}
                onChange={(e) => setNewPeriod({ ...newPeriod, endTime: e.target.value })}
              />
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

      {/* ---- Cell editor modal ---- */}
      <Modal
        open={cellOpen}
        onClose={() => setCellOpen(false)}
        title={editingSlot ? 'Edit Slot' : 'Add Slot'}
      >
        {cellTarget && (
          <form onSubmit={saveCell} className="space-y-3">
            <div className="text-xs text-slate-500">
              <Badge variant="brand">{dayLabel(cellTarget.day)}</Badge>
              &nbsp; {cellTarget.startTime}–{cellTarget.endTime} &nbsp;·&nbsp;
              Year {year} · Section {section}
            </div>

            <label className="block">
              <span className="label">Subject</span>
              <select className="input" required value={cellForm.subjectId}
                onChange={(e) => setCellForm({ ...cellForm, subjectId: e.target.value })}>
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    [{s.type}] {s.subjectCode} — {s.subjectName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label">Faculty</span>
              <select className="input" required value={cellForm.facultyId}
                onChange={(e) => setCellForm({ ...cellForm, facultyId: e.target.value })}>
                <option value="">Select faculty</option>
                {faculties.map((f) => (
                  <option key={f._id} value={f._id}>{f.employeeId} — {f.name}</option>
                ))}
              </select>
            </label>

            <Input label="Room" required value={cellForm.room}
              onChange={(e) => setCellForm({ ...cellForm, room: e.target.value })} />

            <div className="flex justify-between gap-2 pt-2">
              {editingSlot ? (
                <Button type="button" variant="danger" onClick={deleteCell}>
                  <Trash2 size={14} /> Delete
                </Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setCellOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingSlot ? 'Save Changes' : 'Add Slot'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}