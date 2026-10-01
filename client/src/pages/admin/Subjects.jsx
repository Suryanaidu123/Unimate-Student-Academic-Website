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

  function load() {
    const params = new URLSearchParams({
      year: String(year),
      semester: String(semester),
      limit: '200',
    });
    if (typeFilter) params.set('type', typeFilter);

    api.get(`/subjects?${params.toString()}`)
      .then((r) => setItems(r.data.data.items || []))
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
      credits: row.credits,
      facultyId: row.facultyId?._id || row.facultyId || '',
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
        credits: Number(form.credits),
        year: Number(year),
        semester: Number(semester),
        facultyId: form.facultyId || null,
      };
      if (editing) {
        await api.put(`/subjects/${editing}`, payload);
        toast.success('Subject updated');
      } else {
        await api.post('/subjects', payload);
        toast.success('Subject created');
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

  async function removeSubject(row) {
    if (!window.confirm(`Delete subject "${row.subjectCode} — ${row.subjectName}"?`)) return;
    try {
      await api.delete(`/subjects/${row._id}`);
      toast.success('Subject deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Subjects &amp; Labs</h1>
          <p className="text-sm text-slate-500">
            {activeKey
              ? `Managing ${activeKey.label} · ${activeKey.fullLabel}`
              : 'Managing subjects'}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="input !w-40"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            <option value="THEORY">Theory</option>
            <option value="LAB">Lab</option>
          </select>
          <Button onClick={openCreate}>+ Add Subject</Button>
        </div>
      </div>

      {/* Semester switcher — always visible, lets admin jump between all 6 */}
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
        <p className="text-xs text-slate-500 mt-3">
          Click any semester above to switch. Every semester has its own subjects, faculty
          assignments, timetable, marks, and materials.
        </p>
      </Card>

      {/* Subjects table */}
      <Card title={`${activeKey?.label || ''} Subjects (${items.length})`}>
        <Table
          empty={`No subjects configured for ${activeKey?.label || 'this semester'} yet.`}
          columns={[
            { key: 'subjectCode', label: 'Code' },
            { key: 'subjectName', label: 'Name' },
            {
              key: 'type',
              label: 'Type',
              render: (r) => (
                <Badge variant={r.type === 'LAB' ? 'warning' : 'brand'}>
                  {r.type || 'THEORY'}
                </Badge>
              ),
            },
            { key: 'year', label: 'Yr' },
            { key: 'semester', label: 'Sem' },
            { key: 'credits', label: 'Credits' },
            {
              key: 'faculty',
              label: 'Faculty',
              render: (r) => r.facultyId?.name || '—',
            },
            {
              key: 'actions',
              label: '',
              render: (r) => (
                <div className="flex gap-3">
                  <button
                    onClick={() => openEdit(r)}
                    className="text-brand-600 hover:text-brand-800"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => removeSubject(r)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ),
            },
          ]}
          data={items}
        />
      </Card>

      {/* Add / Edit modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          editing
            ? `Edit Subject — ${activeKey?.label || ''}`
            : `Add Subject / Lab — ${activeKey?.label || ''}`
        }
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            label="Subject Name"
            required
            value={form.subjectName}
            onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
            placeholder="e.g. Machine Learning"
          />

          <Input
            label="Subject Code"
            required
            value={form.subjectCode}
            onChange={(e) => setForm({ ...form, subjectCode: e.target.value })}
            placeholder="e.g. AIML501"
          />

          <label className="block">
            <span className="label">Type</span>
            <select
              className="input"
              required
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="THEORY">Theory</option>
              <option value="LAB">Lab</option>
            </select>
          </label>

          <Input
            label="Credits (e.g. 1.5, 2, 3, 4.5)"
            type="number"
            step="0.5"
            min={0.5}
            max={6}
            required
            value={form.credits}
            onChange={(e) => setForm({ ...form, credits: e.target.value })}
          />

          <label className="block">
            <span className="label">Assigned Faculty (optional)</span>
            <select
              className="input"
              value={form.facultyId}
              onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
            >
              <option value="">— None —</option>
              {faculties.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.employeeId} — {f.name || '(not registered)'}
                </option>
              ))}
            </select>
          </label>

          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
            Saving to: <b>{activeKey?.label}</b> · {activeKey?.fullLabel}
            <br />
            Year {year} · Semester {semester}
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Subject'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}