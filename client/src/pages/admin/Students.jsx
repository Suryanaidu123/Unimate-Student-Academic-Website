import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Filter, X } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';

const empty = { rollNumber: '', email: '', academicYear: 2 };

// Which semesters belong to which year
const YEAR_SEMESTERS = {
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
};

export default function AdminStudents() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');

  // filters
  const [filters, setFilters] = useState({ year: '', semester: '', section: '' });

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [editForm, setEditForm] = useState({ email: '', name: '', year: 2 });

  const [confirmRow, setConfirmRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    const params = new URLSearchParams({ limit: '500' });
    if (q) params.set('q', q);
    if (filters.year) params.set('year', filters.year);
    if (filters.semester) params.set('semester', filters.semester);
    if (filters.section) params.set('section', filters.section);

    api.get(`/students?${params.toString()}`)
      .then((r) => {
     const list = [...(r.data.data.items || [])];
list.sort((a, b) => {
  // 1. Year ascending
  if (a.year !== b.year) return a.year - b.year;
  // 2. Semester ascending
  const sa = a.currentSemester || a.semester || 0;
  const sb = b.currentSemester || b.semester || 0;
  if (sa !== sb) return sa - sb;
  // 3. Roll number natural order (alphanumeric, numeric-aware)
  return String(a.rollNumber || '').localeCompare(
    String(b.rollNumber || ''),
    undefined,
    { numeric: true, sensitivity: 'base' }
  );
});
        setItems(list);
      })
      .catch(() => toast.error('Failed to load students'));
  }
  useEffect(load, [q, filters.year, filters.semester, filters.section]);

  // When year changes, clear semester if it doesn't belong to that year
  useEffect(() => {
    if (!filters.year || !filters.semester) return;
    const year = Number(filters.year);
    const valid = YEAR_SEMESTERS[year] || [];
    if (!valid.includes(Number(filters.semester))) {
      setFilters((f) => ({ ...f, semester: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.year]);

  function resetFilters() {
    setFilters({ year: '', semester: '', section: '' });
    setQ('');
  }

  async function onCreate(e) {
    e.preventDefault();
    try {
      await api.post('/students', {
        rollNumber: form.rollNumber.trim(),
        email: form.email.trim(),
        academicYear: Number(form.academicYear),
      });
      toast.success('Student added successfully.');
      setOpenCreate(false);
      setForm(empty);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    }
  }

  function openEditModal(row) {
    setEditing(row);
    setEditForm({
      email: row.email || '',
      name: row.name || '',
      year: row.year || 2,
    });
    setOpenEdit(true);
  }

  async function onEdit(e) {
    e.preventDefault();
    if (!editing) return;
    try {
      await api.put(`/students/${editing._id}`, {
        email: editForm.email.trim(),
        name: editForm.name.trim(),
        year: Number(editForm.year),
      });
      toast.success('Student updated successfully.');
      setOpenEdit(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  }

  async function doDelete() {
    if (!confirmRow) return;
    setDeleting(true);
    try {
      await api.delete(`/students/${confirmRow._id}`);
      toast.success('Student deleted successfully.');
      setConfirmRow(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  async function toggleStatus(row) {
    try {
      await api.patch(`/students/${row._id}/status`, {
        status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      toast.success(row.status === 'ACTIVE' ? 'Student deactivated.' : 'Student activated.');
      load();
    } catch { toast.error('Failed to update status'); }
  }

  // Available semester options for the current year filter
  const semesterOptions = useMemo(() => {
    if (filters.year) {
      return YEAR_SEMESTERS[Number(filters.year)] || [];
    }
    return [3, 4, 5, 6, 7, 8];
  }, [filters.year]);

  const anyFilterActive = q || filters.year || filters.semester || filters.section;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-slate-500">
            {items.length} student{items.length === 1 ? '' : 's'}
            {anyFilterActive ? ' match the current filters' : ' total'}
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search roll / name / email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button onClick={() => setOpenCreate(true)}>+ Add Student</Button>
        </div>
      </div>

      {/* Filters */}
      <Card title="Filters">
        <div className="grid md:grid-cols-4 gap-3">
          <label className="block">
            <span className="label">Academic Year</span>
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
            <span className="label">Current Semester</span>
            <select
              className="input"
              value={filters.semester}
              onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
            >
              <option value="">All semesters</option>
              {semesterOptions.map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </label>

          <Input
            label="Section (A / B / C)"
            value={filters.section}
            onChange={(e) => setFilters({ ...filters, section: e.target.value })}
          />

          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={resetFilters}
              className="w-full"
              disabled={!anyFilterActive}
            >
              <X size={14} /> Reset filters
            </Button>
          </div>
        </div>

        {anyFilterActive && (
          <p className="text-xs text-slate-500 mt-3">
            <Filter size={12} className="inline mr-1" />
            {items.length} of {items.length} result{items.length === 1 ? '' : 's'} shown
          </p>
        )}
      </Card>

      {/* Table */}
      <Card>
        <Table
          empty={anyFilterActive ? 'No students match the current filters.' : 'No students found.'}
          columns={[
            { key: 'rollNumber', label: 'Roll No' },
            {
              key: 'name', label: 'Name',
              render: (r) => r.name || <span className="text-slate-400">Not registered yet</span>,
            },
            { key: 'email', label: 'Email' },
            { key: 'batch', label: 'Batch' },
            { key: 'year', label: 'Yr' },
            {
              key: 'currentSemester', label: 'Sem',
              render: (r) => r.currentSemester ?? r.semester ?? '—',
            },
            { key: 'section', label: 'Sec' },
            {
              key: 'status', label: 'Status',
              render: (r) => (
                <Badge
                  variant={
                    r.status === 'ACTIVE' ? 'success'
                      : r.status === 'GRADUATED' ? 'info'
                      : 'danger'
                  }
                >
                  {r.status}
                </Badge>
              ),
            },
            {
              key: 'actions', label: '', render: (r) => (
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
                    title="Toggle status"
                  >
                    {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => setConfirmRow(r)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete student"
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

      {/* Add Student */}
      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Add Student">
        <form onSubmit={onCreate} className="space-y-3">
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
            Student will fill in their name and password during registration.
          </p>
        </form>
      </Modal>

      {/* Edit Student */}
      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="Edit Student">
        {editing && (
          <form onSubmit={onEdit} className="space-y-3">
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded space-y-0.5">
              <p><b>Roll Number:</b> {editing.rollNumber}</p>
              <p><b>Current Semester:</b> {editing.currentSemester ?? editing.semester}</p>
              <p><b>Batch:</b> {editing.batch}</p>
            </div>

            <label className="block">
              <span className="label">Academic Year</span>
              <select
                className="input"
                value={editForm.year}
                onChange={(e) => setEditForm({ ...editForm, year: Number(e.target.value) })}
              >
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Changing the year auto-resets the semester to the first semester of that year.
              </p>
            </label>

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

      {/* Delete confirm */}
      <Modal open={!!confirmRow} onClose={() => setConfirmRow(null)} title="Delete student?">
        {confirmRow && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Delete <b>{confirmRow.name || confirmRow.rollNumber}</b> ({confirmRow.rollNumber})?
            </p>
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              This also removes their login account, marks records, and pending OTPs. This cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmRow(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={doDelete} disabled={deleting}>
                <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete Student'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}