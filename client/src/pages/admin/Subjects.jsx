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

const empty = {
  subjectName: '',
  subjectCode: '',
  type: 'THEORY',
  credits: 3,
  year: 2,
  facultyId: '',
};

export default function AdminSubjects() {
  const [items, setItems] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // holds subject._id when editing
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ year: '', type: '' });

  function load() {
    const params = new URLSearchParams();
    if (filters.year) params.set('year', filters.year);
    if (filters.type) params.set('type', filters.type);
    params.set('limit', 200);
    api.get(`/subjects?${params.toString()}`).then((r) => setItems(r.data.data.items));
    api.get('/faculty?limit=200').then((r) => setFaculties(r.data.data.items || []));
  }
  useEffect(load, [filters.year, filters.type]);

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
      year: row.year,
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
        year: Number(form.year),
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
    } finally { setSaving(false); }
  }

  async function removeSubject(row) {
    if (!window.confirm(
      `Delete subject "${row.subjectCode} — ${row.subjectName}"?\nThis cannot be undone.`
    )) return;
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subjects &amp; Labs</h1>
        <Button onClick={openCreate}>+ Add Subject / Lab</Button>
      </div>

      <Card title="Filters">
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Year</span>
            <select
              className="input"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            >
              <option value="">All years</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Type</span>
            <select
              className="input"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All types</option>
              <option value="THEORY">Theory</option>
              <option value="LAB">Lab</option>
            </select>
          </label>
        </div>
      </Card>

      <Card>
        <Table
          empty="No subjects."
          columns={[
            { key: 'subjectCode', label: 'Code' },
            { key: 'subjectName', label: 'Name' },
            { key: 'type', label: 'Type',
              render: (r) => (
                <Badge variant={r.type === 'LAB' ? 'warning' : 'brand'}>
                  {r.type || 'THEORY'}
                </Badge>
              ) },
            { key: 'year', label: 'Year' },
            { key: 'credits', label: 'Credits',
              render: (r) => <span>{r.credits}</span> },
            { key: 'faculty', label: 'Faculty',
              render: (r) => r.facultyId?.name || '—' },
            { key: 'actions', label: '', render: (r) => (
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
            ) },
          ]}
          data={items}
        />
      </Card>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); setForm(empty); }}
        title={editing ? 'Edit Subject / Lab' : 'Add Subject / Lab'}
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            label="Name" required value={form.subjectName}
            onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
          />
          <Input
            label="Code" required value={form.subjectCode}
            onChange={(e) => setForm({ ...form, subjectCode: e.target.value })}
            placeholder="e.g. AIML301 / AIML301L"
          />

          <label className="block">
            <span className="label">Type</span>
            <select
              className="input" required value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="THEORY">Theory</option>
              <option value="LAB">Lab</option>
            </select>
          </label>

          <Input
            label="Credits (e.g. 1.5, 2, 3, 4.5)"
            type="number" step="0.5" min={0.5} max={6} required
            value={form.credits}
            onChange={(e) => setForm({ ...form, credits: e.target.value })}
          />

          <label className="block">
            <span className="label">Year</span>
            <select
              className="input" value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            >
              <option value={2}>2nd Year</option>
              <option value={3}>3rd Year</option>
              <option value={4}>4th Year</option>
            </select>
          </label>

          <label className="block">
            <span className="label">Assigned Faculty (optional)</span>
            <select
              className="input" value={form.facultyId}
              onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
            >
              <option value="">— None —</option>
              {faculties.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.employeeId} — {f.name}
                </option>
              ))}
            </select>
          </label>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}