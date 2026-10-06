import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, BookOpen, FlaskConical, Plus, AlertTriangle } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { useSemester, SEMESTER_KEYS } from '../../context/SemesterContext.jsx';
import { getSubjectAlias } from '../../utils/subjectAlias.js';

const emptyTheory = {
  subjectName: '', subjectCode: '', type: 'THEORY', credits: 3,
  facultyId: '', description: '',
};
const emptyLab = {
  subjectName: '', type: 'LAB', description: '',
};

export default function AdminSubjects() {
  const { year, semester, setKey } = useSemester();
  const activeKey = SEMESTER_KEYS.find((s) => s.year === year && s.semester === semester);

  const [items, setItems]       = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [open, setOpen]         = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(emptyTheory);
  const [saving, setSaving]     = useState(false);

  const [confirmRow, setConfirmRow]         = useState(null);
  const [deleting, setDeleting]             = useState(false);
  const [confirmCleanup, setConfirmCleanup] = useState(false);
  const [cleaning, setCleaning]             = useState(false);

  function load() {
    setLoading(true);
    // Exclude ACTIVITY type — activities are managed in the dedicated Activities section
    api.get(`/subjects?year=${year}&semester=${semester}&limit=300&excludeActivities=true`)
      .then((r) => setItems(r.data.data.items || []))
      .catch(() => toast.error('Failed to load subjects'))
      .finally(() => setLoading(false));

    api.get('/faculty?limit=200')
      .then((r) => setFaculties(r.data.data.items || []))
      .catch(() => {});
  }
  useEffect(load, [year, semester]);

  const theory = useMemo(() => items.filter((s) => s.type === 'THEORY'), [items]);
  const labs   = useMemo(() => items.filter((s) => s.type === 'LAB'),    [items]);

  function openCreateTheory() { setEditing(null); setForm(emptyTheory); setOpen(true); }
  function openCreateLab()    { setEditing(null); setForm(emptyLab);    setOpen(true); }

  function openEdit(row) {
    setEditing(row._id);
    setForm({
      subjectName: row.subjectName,
      subjectCode: row.subjectCode || '',
      type:        row.type || 'THEORY',
      credits:     row.credits ?? 3,
      facultyId:   row.type === 'LAB' ? '' : (row.facultyId?._id || row.facultyId || ''),
      description: row.description || '',
    });
    setOpen(true);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        subjectName: form.subjectName.trim(),
        type:        form.type,
        year:        Number(year),
        semester:    Number(semester),
      };
      if (form.type === 'THEORY') {
        payload.subjectCode = form.subjectCode.trim().toUpperCase();
        payload.credits     = Number(form.credits || 0);
        payload.facultyId   = form.facultyId || null;
      }
      if (form.description !== undefined) {
        payload.description = String(form.description).trim();
      }
      if (editing) {
        await api.put(`/subjects/${editing}`, payload);
        toast.success('Updated successfully.');
      } else {
        await api.post('/subjects', payload);
        toast.success('Created successfully.');
      }
      setOpen(false); setForm(emptyTheory); setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  async function doDelete() {
    if (!confirmRow) return;
    setDeleting(true);
    try {
      await api.delete(`/subjects/${confirmRow._id}`);
      toast.success('Deleted successfully.');
      setConfirmRow(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally { setDeleting(false); }
  }

  async function doCleanup() {
    setCleaning(true);
    try {
      const r = await api.delete('/subjects/cleanup/activities');
      toast.success(r.data.message || 'Old activity subjects removed.');
      setConfirmCleanup(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clean up');
    } finally { setCleaning(false); }
  }

  function TheoryTable({ list }) {
    return (
      <Table
        empty="No theory subjects yet."
        columns={[
          { key: 'subjectCode', label: 'Code' },
          {
            key: 'subjectName', label: 'Name',
            render: (r) => (
              <div>
                <p className="font-medium text-slate-800">{r.subjectName}</p>
                <p className="text-xs text-slate-500">Alias: <b>{getSubjectAlias(r)}</b></p>
              </div>
            ),
          },
          { key: 'credits', label: 'Credits', render: (r) => r.credits ?? '—' },
          {
            key: 'faculty', label: 'Faculty',
            render: (r) => r.facultyId?.name || <span className="text-slate-400 italic">None</span>,
          },
          {
            key: 'actions', label: '', render: (r) => (
              <div className="flex gap-3">
                <button onClick={() => openEdit(r)} className="text-brand-600 hover:text-brand-800"><Pencil size={15} /></button>
                <button onClick={() => setConfirmRow(r)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
              </div>
            ),
          },
        ]}
        data={list}
      />
    );
  }

  function LabTable({ list }) {
    return (
      <Table
        empty="No labs yet."
        columns={[
          { key: 'subjectCode', label: 'Code' },
          {
            key: 'subjectName', label: 'Name',
            render: (r) => (
              <div>
                <p className="font-medium text-slate-800">{r.subjectName}</p>
                <p className="text-xs text-slate-500">Alias: <b>{getSubjectAlias(r)}</b></p>
              </div>
            ),
          },
          {
            key: 'actions', label: '', render: (r) => (
              <div className="flex gap-3">
                <button onClick={() => openEdit(r)} className="text-brand-600 hover:text-brand-800"><Pencil size={15} /></button>
                <button onClick={() => setConfirmRow(r)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
              </div>
            ),
          },
        ]}
        data={list}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Subjects &amp; Labs</h1>
        <p className="text-sm text-slate-500">
          {activeKey ? `${activeKey.label} · ${activeKey.fullLabel}` : 'Manage subjects and labs'}
        </p>
      </div>

      {/* One-time cleanup banner for old ACTIVITY-type subject records */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <div className="flex items-start gap-2 text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p className="text-sm">
            <b>Legacy cleanup:</b> Old &ldquo;Other Activities&rdquo; records may still exist in the database from before the dedicated Activities section was created.
            Click the button to remove them permanently.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setConfirmCleanup(true)}>
          <Trash2 size={14} /> Remove Old Activities
        </Button>
      </div>      {/* Semester switcher */}
      <Card title="Semester">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SEMESTER_KEYS.map((s) => {
            const isActive = s.year === year && s.semester === semester;
            return (
              <button key={s.key} type="button" onClick={() => setKey(s.key)}
                className={`text-left rounded-xl border px-3 py-2 text-sm transition ${
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

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-50 text-brand-700"><BookOpen size={20} /></div>
            <div>
              <p className="text-xs text-slate-500">Subjects</p>
              <p className="text-2xl font-bold">{theory.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700"><FlaskConical size={20} /></div>
            <div>
              <p className="text-xs text-slate-500">Labs</p>
              <p className="text-2xl font-bold">{labs.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Subjects */}
      <Card
        title={<span className="flex items-center gap-2"><BookOpen size={18} className="text-brand-600" /> Subjects ({theory.length})</span>}
        actions={<Button onClick={openCreateTheory}><Plus size={14} /> Add Subject</Button>}
      >
        {loading
          ? <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
          : <TheoryTable list={theory} />}
      </Card>

      {/* Labs */}
      <Card
        title={<span className="flex items-center gap-2"><FlaskConical size={18} className="text-amber-600" /> Labs ({labs.length})</span>}
        actions={<Button onClick={openCreateLab}><Plus size={14} /> Add Lab</Button>}
      >
        {loading
          ? <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
          : <LabTable list={labs} />}
      </Card>

      {/* Add / Edit modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Item' : form.type === 'LAB' ? `Add Lab — ${activeKey?.label}` : `Add Subject — ${activeKey?.label}`}
      >
        <form onSubmit={onSubmit} className="space-y-3">
          {!editing && (
            <label className="block">
              <span className="label">Type</span>
              <select className="input" value={form.type}
                onChange={(e) => {
                  const t = e.target.value;
                  setForm(t === 'LAB' ? { ...emptyLab } : { ...emptyTheory });
                }}>
                <option value="THEORY">Subject (Theory)</option>
                <option value="LAB">Lab</option>
              </select>
            </label>
          )}

          <Input
            label="Name" required
            value={form.subjectName}
            onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
            placeholder={form.type === 'LAB' ? 'e.g. Deep Learning Lab (DL Lab)' : 'e.g. Deep Learning (DL)'}
          />
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
            Tip: put the short alias in parentheses — e.g. <b>Deep Learning (DL)</b>.
          </p>

          {form.type === 'THEORY' && (
            <>
              <Input
                label="Subject Code" required
                value={form.subjectCode}
                onChange={(e) => setForm({ ...form, subjectCode: e.target.value })}
                placeholder="e.g. AIML301"
              />
              <Input
                label="Credits" type="number" step="0.5" min={0} max={6}
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
              />
              <label className="block">
                <span className="label">Faculty</span>
                <select className="input" value={form.facultyId}
                  onChange={(e) => setForm({ ...form, facultyId: e.target.value })}>
                  <option value="">— None —</option>
                  {faculties.map((f) => (
                    <option key={f._id} value={f._id}>{f.employeeId} — {f.name || '(pending)'}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {form.type === 'LAB' && (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
              Code and credits are auto-managed for labs. You can edit them later if needed.
              Labs are not assigned to faculty.
            </p>
          )}

          <label className="block">
            <span className="label">Description</span>
            <textarea
              className="input min-h-[60px] resize-y"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
            />
          </label>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
          </Button>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmRow} onClose={() => setConfirmRow(null)} title="Delete item?">
        {confirmRow && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">Delete <b>{confirmRow.subjectName}</b>?</p>
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              This cannot be undone. If the item is used in marks or materials, deletion is blocked.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmRow(null)} disabled={deleting}>Cancel</Button>
              <Button variant="danger" onClick={doDelete} disabled={deleting}>
                <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmCleanup}
        title="Remove All Legacy Activity Subjects"
        message="This will permanently delete all subjects of type ACTIVITY from the database. This only affects legacy records — it does NOT affect the dedicated Activities section. This cannot be undone."
        confirmLabel={cleaning ? 'Removing…' : 'Remove All'}
        onConfirm={doCleanup}
        onCancel={() => setConfirmCleanup(false)}
        loading={cleaning}
      />
    </div>
  );
}
