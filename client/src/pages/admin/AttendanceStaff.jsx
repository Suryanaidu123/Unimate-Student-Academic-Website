import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function AdminAttendanceStaff() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    api.get('/admin/staff').then((r) => setItems(r.data.data || []));
  }
  useEffect(load, []);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/admin/staff', { employeeId: employeeId.trim() });
      toast.success('Employee ID added. Staff can now register.');
      setOpen(false);
      setEmployeeId('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  }

  async function doDelete() {
    if (!confirmRow) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/staff/${confirmRow._id}`);
      toast.success('Staff deleted successfully.');
      setConfirmRow(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance Staff</h1>
          <p className="text-sm text-slate-500">
            Add Employee IDs here. Each staff member then registers at
            <code className="ml-1 text-xs bg-slate-100 px-1 rounded">/auth/attendance/register</code>.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Add Employee ID
        </Button>
      </div>

      <Card>
        <Table
          empty="No attendance staff yet."
          columns={[
            { key: 'employeeId', label: 'Emp ID' },
            {
              key: 'name', label: 'Name',
              render: (r) => r.name || <span className="text-slate-400">Not registered yet</span>,
            },
            {
              key: 'email', label: 'Email',
              render: (r) => r.email || <span className="text-slate-400">—</span>,
            },
            {
              key: 'status', label: 'Status',
              render: (r) => (
                <Badge variant={r.status === 'ACTIVE' ? 'success' : 'danger'}>
                  {r.status}
                </Badge>
              ),
            },
            {
              key: 'actions', label: '', render: (r) => (
                <button
                  onClick={() => setConfirmRow(r)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              ),
            },
          ]}
          data={items}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Attendance Staff">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            label="Employee ID"
            required
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="e.g. ATT001"
            autoFocus
          />
          <p className="text-xs text-slate-500">
            Only the Employee ID is entered here. The staff member will fill their Name, Email,
            and Password during registration.
          </p>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Adding…' : 'Add Employee ID'}
          </Button>
        </form>
      </Modal>

      <Modal open={!!confirmRow} onClose={() => setConfirmRow(null)} title="Delete staff?">
        {confirmRow && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Delete <b>{confirmRow.employeeId}</b>?
            </p>
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              This also removes their login account. This cannot be undone.
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