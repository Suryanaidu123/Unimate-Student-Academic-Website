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

const empty = { rollNumber: '', email: '', academicYear: 2 };

export default function AdminStudents() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(null); // student object
  const [form, setForm] = useState(empty);
  const [editForm, setEditForm] = useState({ email: '', name: '' });

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

  async function onCreate(e) {
    e.preventDefault();
    try {
      await api.post('/students', {
        rollNumber: form.rollNumber.trim(),
        email: form.email.trim(),
        academicYear: Number(form.academicYear),
      });
      toast.success('Student added');
      setOpenCreate(false);
      setForm(empty);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  }

  function openEditModal(row) {
    setEditing(row);
    setEditForm({ email: row.email || '', name: row.name || '' });
    setOpenEdit(true);
  }

  async function onEdit(e) {
    e.preventDefault();
    if (!editing) return;
    try {
      await api.put(`/students/${editing._id}`, {
        email: editForm.email.trim(),
        name: editForm.name.trim(),
      });
      toast.success('Student updated');
      setOpenEdit(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  }

  async function onDelete(row) {
    if (!window.confirm(
      `Delete student ${row.rollNumber}${row.name ? ' (' + row.name + ')' : ''}?\n\n` +
      `This will also delete their login account, marks, and pending OTPs. This cannot be undone.`
    )) return;
    try {
      await api.delete(`/students/${row._id}`);
      toast.success('Student deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
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
          <Button onClick={() => setOpenCreate(true)}>+ Add Student</Button>
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
              <div className="flex gap-3 items-center">
                <button
                  onClick={() => openEditModal(r)}
                  className="text-brand-600 hover:text-brand-800"
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => toggleStatus(r)}
                  className="text-xs text-slate-600 hover:text-slate-800 whitespace-nowrap"
                >
                  {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => onDelete(r)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete student"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ) },
          ]}
          data={items}
        />
      </Card>

      {/* Add student */}
      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Add Student">
        <form onSubmit={onCreate} className="space-y-3">
          <Input label="Roll Number" required value={form.rollNumber}
            onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} />
          <Input label="College Email" type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label className="block">
            <span className="label">Academic Year</span>
            <select className="input" required value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: Number(e.target.value) })}>
              <option value={2}>2nd Year (Batch 2025-2029)</option>
              <option value={3}>3rd Year (Batch 2024-2028)</option>
              <option value={4}>4th Year (Batch 2023-2027)</option>
            </select>
          </label>
          <Button type="submit" className="w-full">Add Student</Button>
        </form>
      </Modal>

      {/* Edit student */}
      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="Edit Student">
        {editing && (
          <form onSubmit={onEdit} className="space-y-3">
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded">
              <p><b>Roll Number:</b> {editing.rollNumber}</p>
              <p><b>Year:</b> {editing.year}</p>
              <p><b>Batch:</b> {editing.batch}</p>
            </div>
            <Input
              label="College Email"
              type="email"
              required
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
            <Input
              label="Name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Leave empty if not registered yet"
            />
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}