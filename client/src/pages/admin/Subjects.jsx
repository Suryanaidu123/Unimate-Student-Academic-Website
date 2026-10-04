import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, BookOpen, FlaskConical, Star, Plus } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useSemester, SEMESTER_KEYS } from '../../context/SemesterContext.jsx';
import { getSubjectAlias } from '../../utils/subjectAlias.js';

const emptyTheory = {
  subjectName: '', subjectCode: '', type: 'THEORY', credits: 3,
  facultyId: '', description: '',
};
const emptyActivity = {
  subjectName: '', type: 'ACTIVITY', description: '',
};
const emptyLab = {
  subjectName: '', type: 'LAB', description: '',
};

export default function AdminSubjects() {
  const { year, semester, setKey } = useSemester();
  const activeKey = SEMESTER_KEYS.find((s) => s.year === year && s.semester === semester);

  const [items, setItems] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTheory);
  const [saving, setSaving] = useState(false);

  const [confirmRow, setConfirmRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    api.get(`/subjects?year=${year}&semester=${semester}&limit=300`)
      .then((r) => setItems(r.data.data.items || []))
      .catch(() => toast.error('Failed to load subjects'))
      .finally(() => setLoading(false));

    api.get('/faculty?limit=200')
      .then((r) => setFaculties(r.data.data.items || []))
      .catch(() => {});
  }
  useEffect(load, [year, semester]);

  // Split into three buckets
  const theory = useMemo(() => items.filter((s) => s.type === 'THEORY'), [items]);
  const labs = useMemo(() => items.filter((s) => s.type === 'LAB'), [items]);
  const activities = useMemo(() => items.filter((s) => s.type === 'ACTIVITY'), [items]);

  function openCreateTheory() {
    setEditing(null);
    setForm(emptyTheory);
    setOpen(true);
  }

  function openCreateLab() {
    setEditing(null);
    setForm(emptyLab);
    setOpen(true);
  }

  function openCreateActivity() {
    setEditing(null);
    setForm(emptyActivity);
    setOpen(true);
  }

  function openEdit(row) {
    setEditing(row._id);
    setForm({
      subjectName: row.subjectName,
      subjectCode: row.subjectCode,
      type: row.type || 'THEORY',
      credits: row.credits ?? 3,
      facultyId: row.facultyId?._id || row.facultyId || '',
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
        type: form.type,
        year: Number(year),
        semester: Number(semester),
      };

      if (form.type === 'THEORY') {
        payload.subjectCode = form.subjectCode.trim().toUpperCase();
        payload.credits = Number(form.credits || 0);
        if (form.facultyId) payload.facultyId = form.facultyId;
      }
      if (form.description !== undefined) {
        payload.description = form.description.trim ? form.description.trim() : form.description;
      }

      if (editing) {
        await api.put(`/subjects/${editing}`, payload);
        toast.success('Updated successfully.');
      } else {
        await api.post('/subjects', payload);
        toast.success('Created successfully.');
      }
      setOpen(false);
      setForm(emptyTheory);
      setEditing(null);
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

  const subjectIcon = (type) => {
    if (type === 'LAB') return <FlaskConical size={16} className="text-amber-600" />;
    if (type === 'ACTIVITY') return <Star size={16} className="text-purple-600" />;
    return <BookOpen size={16} className="text-brand-600" />;
  };

  // Reusable table renderer
  function ItemTable({ list, emptyText }) {
    return (
      <Table
        empty={emptyText}
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
          { key: 'credits', label: 'Credits',
            render: (r) => r.credits ?? '—' },
          { key: 'faculty', label: 'Faculty',
            render: (r) => r.facultyId?.name || <span className="text-slate-400">—</span> },
          {
            key: 'actions', label: '', render: (r) => (
              <div className="flex gap-3">
                <button onClick={() => openEdit(r)} className="text-brand-600 hover:text-brand-800">
                  <Pencil size={15} />
                </button>
                <button onClick={() => setConfirmRow(r)} className="text-red-500 hover:text-red-700">
                  <Trash2 size={15} />
                </button>
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
        <h1 className="text-2xl font-bold">Subjects, Labs &amp; Activities</h1>
        <p className="text-sm text-slate-500">
          {activeKey ? `${activeKey.label} · ${activeKey.fullLabel}` : 'Manage academic items'}
        </p>
      </div>

      {/* Semester switcher */}
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

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-50 text-brand-700">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Subjects</p>
              <p className="text-2xl font-bold">{theory.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <FlaskConical size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Labs</p>
              <p className="text-2xl font-bold">{labs.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <Star size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Activities (Other)</p>
              <p className="text-2xl font-bold">{activities.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Subjects */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <BookOpen size={18} className="text-brand-600" />
            Subjects ({theory.length})
          </span>
        }
        actions={
          <Button onClick={openCreateTheory}>
            <Plus size={14} /> Add Subject
          </Button>
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
        ) : (
          <ItemTable list={theory} emptyText="No theory subjects yet." />
        )}
      </Card>

      {/* Labs */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <FlaskConical size={18} className="text-amber-600" />
            Labs ({labs.length})
          </span>
        }
        actions={
          <Button onClick={openCreateLab}>
            <Plus size={14} /> Add Lab
          </Button>
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
        ) : (
          <ItemTable list={labs} emptyText="No labs yet." />
        )}
      </Card>

      {/* Activities — separate "Other" section */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Star size={18} className="text-purple-600" />
            Other — Activities ({activities.length})
          </span>
        }
        actions={
          <Button onClick={openCreateActivity}>
            <Plus size={14} /> Add Activity
          </Button>
        }
      >
        <p className="text-xs text-slate-500 mb-3">
          Activities like Skilling Practice, NPTEL, etc. These do <b>not</b> count as
          Subjects or Labs, but they can be placed in the timetable.
        </p>
        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
        ) : (
          <ItemTable list={activities} emptyText="No activities yet." />
        )}
      </Card>

      {/* Add / Edit modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          editing
            ? 'Edit Item'
            : form.type === 'LAB'
            ? `Add Lab — ${activeKey?.label}`
            : form.type === 'ACTIVITY'
            ? `Add Activity — ${activeKey?.label}`
            : `Add Subject — ${activeKey?.label}`
        }
      >
        <form onSubmit={onSubmit} className="space-y-3">
          {/* Type — locked for lab/activity creation from their section, editable otherwise */}
          {!editing && (
            <label className="block">
              <span className="label">Type</span>
              <select
                className="input"
                value={form.type}
                onChange={(e) => {
                  const t = e.target.value;
                  if (t === 'THEORY') setForm({ ...emptyTheory });
                  else if (t === 'LAB') setForm({ ...emptyLab });
                  else setForm({ ...emptyActivity });
                }}
              >
                <option value="THEORY">Subject (Theory)</option>
                <option value="LAB">Lab</option>
                <option value="ACTIVITY">Activity</option>
              </select>
            </label>
          )}

          <Input
            label="Name"
            required
            value={form.subjectName}
            onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
            placeholder={
              form.type === 'LAB'
                ? 'e.g. Deep Learning Lab (DL Lab)'
                : form.type === 'ACTIVITY'
                ? 'e.g. Skilling Practice (SP)'
                : 'e.g. Deep Learning (DL)'
            }
          />

          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
            Tip: put the short alias in parentheses — e.g. <b>Deep Learning (DL)</b>. Only{' '}
            <b>DL</b> will show inside the timetable cell.
          </p>

          {form.type === 'THEORY' && (
            <>
              <Input
                label="Subject Code"
                required
                value={form.subjectCode}
                onChange={(e) => setForm({ ...form, subjectCode: e.target.value })}
                placeholder="e.g. AIML301"
              />
              <Input
                label="Credits"
                type="number"
                step="0.5"
                min={0}
                max={6}
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
              />
              <label className="block">
                <span className="label">Faculty</span>
                <select
                  className="input"
                  value={form.facultyId}
                  onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
                >
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

          {(form.type === 'LAB' || form.type === 'ACTIVITY') && (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
              Code, credits and faculty are auto-managed for {form.type === 'LAB' ? 'labs' : 'activities'}.
              You can edit them later if needed.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
          </Button>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmRow} onClose={() => setConfirmRow(null)} title="Delete item?">
        {confirmRow && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Delete <b>{confirmRow.subjectName}</b>?
            </p>
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              This cannot be undone. If the item is used in marks, timetable, or materials,
              deletion is blocked.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmRow(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={doDelete} disabled={deleting}>
                <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}