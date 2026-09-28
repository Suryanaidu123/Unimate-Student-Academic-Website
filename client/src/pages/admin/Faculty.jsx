import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';

const empty = {
  employeeId: '',
  name: '',
  email: '',
  designation: 'Assistant Professor',
  initialPassword: 'Faculty@123',
};

export default function AdminFaculty() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/faculty?limit=200').then((r) => setItems(r.data.data.items));
  }
  useEffect(load, []);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/faculty', form);
      toast.success('Faculty created');
      setOpen(false);
      setForm(empty);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  }

  async function removeFaculty(row) {
    if (!window.confirm(
      `Delete faculty ${row.employeeId} (${row.name})?\nThis also deletes their login account.`
    )) return;
    try {
      await api.delete(`/faculty/${row._id}`);
      toast.success('Faculty deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  }

  async function toggleStatus(row) {
    try {
      await api.patch(`/faculty/${row._id}/status`, {
        status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      load();
    } catch { toast.error('Failed'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Faculty</h1>
        <Button onClick={() => setOpen(true)}>+ Add Faculty</Button>
      </div>

      <Card>
        <Table
          empty="No faculty."
          columns={[
            { key: 'employeeId', label: 'Emp ID' },
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'designation', label: 'Designation' },
            { key: 'status', label: 'Status',
              render: (r) => (
                <Badge variant={r.status === 'ACTIVE' ? 'success' : 'danger'}>
                  {r.status}
                </Badge>
              ) },
            { key: 'actions', label: '', render: (r) => (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => toggleStatus(r)}>
                  {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </Button>
                <button
                  onClick={() => removeFaculty(r)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete faculty"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) },
          ]}
          data={items}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Faculty">
        <form onSubmit={onSubmit} className="space-y-3">
          {Object.keys(empty).map((k) => (
            <Input
              key={k}
              label={k.replace(/([A-Z])/g, ' $1')}
              required
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          ))}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Creating…' : 'Create'}
          </Button>
          <p className="text-xs text-slate-500">
            Faculty will log in with their <b>Employee ID</b> and password shown in the field above.
          </p>
        </form>
      </Modal>
    </div>
  );
}