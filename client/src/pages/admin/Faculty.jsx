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

export default function AdminFaculty() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [busy, setBusy] = useState(false);

  // delete confirmation
  const [confirmRow, setConfirmRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    api.get('/faculty?limit=200').then((r) => setItems(r.data.data.items));
  }
  useEffect(load, []);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/faculty', { employeeId: employeeId.trim() });
      toast.success('Employee ID added. Faculty can now register.');
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
      await api.delete(`/faculty/${confirmRow._id}`);
      toast.success('Faculty deleted');
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
        <Button onClick={() => setOpen(true)}>+ Add Employee ID</Button>
      </div>

      <Card>
        <Table
          empty="No faculty."
          columns={[
            { key: 'employeeId', label: 'Emp ID' },
            { key: 'name', label: 'Name',
              render: (r) => r.name || <span className="text-slate-400">Not registered yet</span> },
            { key: 'email', label: 'Email',
              render: (r) => (r.email && !r.email.endsWith('@pending.local'))
                ? r.email
                : <span className="text-slate-400">Pending registration</span> },
            { key: 'designation', label: 'Designation' },
            { key: 'status', label: 'Status',
              render: (r) => <Badge variant={r.status === 'ACTIVE' ? 'success' : 'danger'}>{r.status}</Badge> },
            { key: 'actions', label: '', render: (r) => (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => toggleStatus(r)}>
                  {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </Button>
                <button onClick={() => setConfirmRow(r)}
                        className="text-red-500 hover:text-red-700" title="Delete faculty">
                  <Trash2 size={16} />
                </button>
              </div>
            ) },
          ]}
          data={items}
        />
      </Card>

      {/* Add faculty stub */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add Faculty Employee ID">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            label="Employee ID"
            required
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="e.g. FAC001"
            autoFocus
          />
          <p className="text-xs text-slate-500">
            Only the Employee ID is entered here. The faculty member will fill in their
            Name, Email, and Designation during registration.
          </p>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Adding…' : 'Add Employee ID'}
          </Button>
        </form>
      </Modal>

      {/* Delete confirm — custom, no browser alert */}
      <Modal
        open={!!confirmRow}
        onClose={() => setConfirmRow(null)}
        title="Delete faculty?"
      >
        {confirmRow && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Delete <b>{confirmRow.name || confirmRow.employeeId}</b> ({confirmRow.employeeId})?
              This also removes their login account. This cannot be undone.
            </p>
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