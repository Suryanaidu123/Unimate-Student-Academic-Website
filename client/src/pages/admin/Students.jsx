import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';

const empty = { rollNumber: '', email: '', academicYear: 2 };

export default function AdminStudents() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  function load() {
    api.get(`/students?q=${encodeURIComponent(q)}&limit=200`)
      .then((r) => {
        const list = [...(r.data.data.items || [])];
        list.sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true });
        });
        setItems(list);
      });
  }
  useEffect(load, [q]);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/students', {
        rollNumber: form.rollNumber.trim(),
        email: form.email.trim(),
        academicYear: Number(form.academicYear),
      });
      toast.success('Student added');
      setOpen(false);
      setForm(empty);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  }

  async function toggleStatus(row) {
    try {
      await api.patch(`/students/${row._id}/status`, {
        status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      load();
    } catch { toast.error('Failed'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex gap-2">
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={() => setOpen(true)}>+ Add Student</Button>
        </div>
      </div>

      <Card>
        <Table
          columns={[
            { key: 'rollNumber', label: 'Roll No' },
            { key: 'name', label: 'Name', render: (r) => r.name || <span className="text-slate-400">Not registered yet</span> },
            { key: 'email', label: 'Email' },
            { key: 'batch', label: 'Batch' },
            { key: 'year', label: 'Yr' },
            { key: 'semester', label: 'Sem' },
            { key: 'section', label: 'Sec' },
            { key: 'status', label: 'Status',
              render: (r) => (
                <Badge variant={r.status === 'ACTIVE' ? 'success' : 'danger'}>
                  {r.status}
                </Badge>
              ) },
            { key: 'actions', label: '', render: (r) => (
              <Button variant="secondary" onClick={() => toggleStatus(r)}>
                {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </Button>
            ) },
          ]}
          data={items}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Student">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            label="Roll Number"
            required
            value={form.rollNumber}
            onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
            placeholder="e.g. 24K61A6101"
          />

          <Input
            label="College Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="student@college.edu"
          />

          <label className="block">
            <span className="label">Academic Year</span>
            <select
              className="input"
              required
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: Number(e.target.value) })}
            >
              <option value={2}>2nd Year (Batch 2025-2029)</option>
              <option value={3}>3rd Year (Batch 2024-2028)</option>
              <option value={4}>4th Year (Batch 2023-2027)</option>
            </select>
          </label>

          <Button type="submit" className="w-full">Add Student</Button>

          <p className="text-xs text-slate-500">
            Name and batch are auto-filled. The student will enter their full name during registration.
          </p>
        </form>
      </Modal>
    </div>
  );
}