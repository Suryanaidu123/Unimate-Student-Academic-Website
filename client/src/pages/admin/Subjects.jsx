import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useSemester, SEMESTER_KEYS } from '../../context/SemesterContext.jsx';

const empty = {
  subjectName: '',
  subjectCode: '',
  type: 'THEORY',
  credits: 3,
  facultyId: '',
  description: '',
};

export default function AdminSubjects() {
  const { year, semester, setKey } = useSemester();
  const activeKey = SEMESTER_KEYS.find((s) => s.year === year && s.semester === semester);

  const [items, setItems] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  const [confirmRow, setConfirmRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    const params = new URLSearchParams({
      year: String(year),
      semester: String(semester),
      limit: '200',
    });

    if (typeFilter === 'THEORY' || typeFilter === 'LAB' || typeFilter === 'ACTIVITY') {
      params.set('type', typeFilter);
    }

    api.get(`/subjects?${params.toString()}`)
      .then((r) => {
        let list = r.data.data.items || [];
        // Default (no specific type filter): hide activities
        if (!typeFilter) {
          list = list.filter((s) => s.type !== 'ACTIVITY');
        }
        setItems(list);
      })
      .catch(() => toast.error('Failed to load subjects'));

    api.get('/faculty?limit=200')
      .then((r) => setFaculties(r.data.data.items || []))
      .catch(() => {});
  }
  useEffect(load, [year, semester, typeFilter]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
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
        subjectCode: form.subjectCode.trim().toUpperCase(),
        type: form.type,
        credits: Number(form.credits || 0),
        year: Number(year),
        semester: Number(semester),
        facultyId: form.facultyId || null,
        description: form.description.trim(),
      };
      if (editing) {
        await api.put(`/subjects/${editing}`, payload);
        toast.success('Updated successfully.');
      } else {
        await api.post('/subjects', payload);
        toast.success('Created successfully.');
      }
      setOpen(false);
      setForm(empty);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!confirmRow) return;
    setDeleting(true);
    try {
      await api.delete(`/subjects/${confirmRow._id}`);
      toast.success('Subject deleted successfully.');
      setConfirmRow(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Subjects &amp; Labs</h1>
          <p className="text-sm text-slate-500">
            {activeKey ? `${activeKey.label} · ${activeKey.fullLabel}` : 'Managing subjects'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Activities (Skilling Practice, NPTEL, etc.) are managed separately in the Timetable section.
            Use the Type filter above to view them.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="input !w-44"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Subjects &amp; Labs</option>
            <option value="THEORY">Theory only</option>
            <option value="LAB">Labs only</option>
            <option value="ACTIVITY">Activities only</option>
          </select>
          <Button onClick={openCreate}>+ Add Subject</Button>
        </div>
      </div>

      <Card title="Semester">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SEMESTER_KEYS.map((s) => {
            const isActive = s.year === year && s.semester === semester;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setKey(s.key)}
                className={`text-left rounded-lg border px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-brand-400'
                }`}
              >
                <p className="font-semibold">{s.label}</p>
                <p className={`text-xs mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                  {s.semester}th Sem
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title={`${activeKey?.label || ''} — ${items.length} item${items.length === 1 ? '' : 's'}`}>
        <Table
          empty={`Nothing found for ${activeKey?.label || 'this semester'}.`}
          columns={[
            { key: 'subjectCode', label: 'Code' },
            { key: 'subjectName', label: 'Name' },
            {
              key: 'type', label: 'Type',
              render: (r) => {
                const v = r.type === 'LAB' ? 'warning' : r.type === 'ACTIVITY' ? 'info' : 'brand';
                return <Badge variant={v}>{r.type || 'THEORY'}</Badge>;
              },
            },
            { key: 'year', label: 'Yr' },
            { key: 'semester', label: 'Sem' },
            { key: 'credits', label: 'Credits' },
            { key: 'faculty', label: 'Faculty', render: (r) => r.facultyId?.name || '—' },
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
          data={items}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)}
        title={editing ? 'Edit' : `Add — ${activeKey?.label || ''}`}>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input label="Name" required value={form.subjectName}
            onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
            placeholder="e.g. Machine Learning / Skilling Practice" />

          <Input label="Code" required value={form.subjectCode}
            onChange={(e) => setForm({ ...form, subjectCode: e.target.value })}
            placeholder="e.g. AIML501 / SKILL5" />

          <label className="block">
            <span className="label">Type</span>
            <select className="input" required value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="THEORY">Theory Subject</option>
              <option value="LAB">Lab</option>
              <option value="ACTIVITY">Activity (Skilling / NPTEL / Other)</option>
            </select>
          </label>

          <Input label="Credits" type="number" step="0.5" min={0} max={6}
            value={form.credits}
            onChange={(e) => setForm({ ...form, credits: e.target.value })} />

          <label className="block">
            <span className="label">Faculty (optional)</span>
            <select className="input" value={form.facultyId}
              onChange={(e) => setForm({ ...form, facultyId: e.target.value })}>
              <option value="">— None —</option>
              {faculties.map((f) => (
                <option key={f._id} value={f._id}>{f.employeeId} — {f.name || '(pending)'}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Description (optional)</span>
            <textarea className="input" rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>

          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
            Saving to: <b>{activeKey?.label}</b> · {activeKey?.fullLabel}
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
          </Button>
        </form>
      </Modal>

      <Modal open={!!confirmRow} onClose={() => setConfirmRow(null)} title="Delete?">
        {confirmRow && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Delete <b>{confirmRow.subjectCode} — {confirmRow.subjectName}</b>?
            </p>
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              This cannot be undone. If the subject is used in marks, timetable, or materials, deletion is blocked.
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