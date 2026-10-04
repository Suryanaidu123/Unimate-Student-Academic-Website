import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Download, Filter, X, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';

const ACTIONS = [
  { value: '', label: 'All actions' },
  { value: 'view', label: 'Viewed' },
  { value: 'download', label: 'Downloaded' },
];
const ROLES = [
  { value: '', label: 'Everyone' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'FACULTY', label: 'Faculty' },
];

export default function AdminMaterialsHistory() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    action: '', year: '', role: '', q: '', page: 1, limit: 50,
  });

  // delete confirmations
  const [confirmRow, setConfirmRow] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v != null) params.set(k, v);
    });
    api.get(`/admin/storage/activity?${params.toString()}`)
      .then((r) => {
        setItems(r.data.data.items || []);
        setTotal(r.data.data.total || 0);
      })
      .catch(() => toast.error('Failed to load activity'))
      .finally(() => setLoading(false));
  }
  useEffect(load, [filters.action, filters.year, filters.role, filters.page]);

  function onSearchSubmit(e) {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 1 }));
    load();
  }

  function resetFilters() {
    setFilters({ action: '', year: '', role: '', q: '', page: 1, limit: 50 });
  }

  async function doDeleteOne() {
    if (!confirmRow) return;
    setBusy(true);
    try {
      await api.delete(`/admin/storage/activity/${confirmRow._id}`);
      toast.success('History record deleted');
      setConfirmRow(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally { setBusy(false); }
  }

  async function doDeleteAll() {
    setBusy(true);
    try {
      const r = await api.delete('/admin/storage/activity');
      toast.success(r.data.message || 'All history cleared');
      setConfirmAll(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear');
    } finally { setBusy(false); }
  }

  const anyFilter = filters.action || filters.year || filters.role || filters.q;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Materials Activity History</h1>
          <p className="text-sm text-slate-500">
            Every view and download of academic materials across the institution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="brand">{total} event{total === 1 ? '' : 's'}</Badge>
          <Button
            variant="danger"
            onClick={() => setConfirmAll(true)}
            disabled={total === 0}
          >
            <Trash2 size={14} /> Delete All History
          </Button>
        </div>
      </div>

      <Card title="Filters">
        <form onSubmit={onSearchSubmit}>
          <div className="grid md:grid-cols-4 gap-3">
            <label className="block">
              <span className="label">Action</span>
              <select className="input" value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}>
                {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Role</span>
              <select className="input" value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Year</span>
              <select className="input" value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value, page: 1 })}>
                <option value="">All years</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <Input label="Search" placeholder="Name, roll no, material…"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
              <Button type="submit" variant="secondary"><Filter size={14} /></Button>
              {anyFilter && (
                <Button type="button" variant="secondary" onClick={resetFilters}>
                  <X size={14} />
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>

      <Card>
        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading activity…</p>
        ) : (
          <>
            <Table
              empty="No activity matches the filters."
              columns={[
                {
                  key: 'action', label: 'Action',
                  render: (r) => (
                    <Badge variant={r.action === 'Downloaded' ? 'brand' : 'default'}>
                      {r.action === 'Downloaded' ? <Download size={11} className="inline mr-1" /> : <Eye size={11} className="inline mr-1" />}
                      {r.action}
                    </Badge>
                  ),
                },
                {
                  key: 'actor', label: 'User',
                  render: (r) => (
                    <div>
                      <p className="font-medium text-slate-800">{r.actor.name}</p>
                      <p className="text-xs text-slate-500">
                        {r.actor.rollNumber || r.actor.employeeId || r.actor.role}
                      </p>
                    </div>
                  ),
                },
                { key: 'role', label: 'Role', render: (r) => <Badge>{r.actor.role}</Badge> },
                {
                  key: 'class', label: 'Class',
                  render: (r) => r.actor.year
                    ? `Yr ${r.actor.year} · Sem ${r.actor.semester} · ${r.actor.section}`
                    : '—',
                },
                {
                  key: 'material', label: 'Material',
                  render: (r) => r.material
                    ? <span className="text-slate-700">{r.material.title}</span>
                    : <span className="text-slate-400">Deleted</span>,
                },
                {
                  key: 'size', label: 'Size',
                  render: (r) => `${Math.round((r.bytes || 0) / 1024)} KB`,
                },
                {
                  key: 'date', label: 'When',
                  render: (r) => new Date(r.createdAt).toLocaleString(),
                },
                {
                  key: 'actions', label: '',
                  render: (r) => (
                    <button
                      onClick={() => setConfirmRow(r)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  ),
                },
              ]}
              data={items}
            />

            {total > filters.limit && (
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-slate-500">
                  Page {filters.page} of {Math.ceil(total / filters.limit)}
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={filters.page <= 1}
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>
                    Previous
                  </Button>
                  <Button variant="secondary" disabled={filters.page * filters.limit >= total}
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Delete single row */}
      <Modal open={!!confirmRow} onClose={() => setConfirmRow(null)} title="Delete history record?">
        {confirmRow && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Delete <b>{confirmRow.action}</b> record for{' '}
              <b>{confirmRow.actor.name}</b>?
            </p>
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              This cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmRow(null)} disabled={busy}>Cancel</Button>
              <Button variant="danger" onClick={doDeleteOne} disabled={busy}>
                <Trash2 size={14} /> {busy ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete all */}
      <Modal open={confirmAll} onClose={() => setConfirmAll(false)} title="Delete ALL materials history?">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            This will permanently remove all <b>{total}</b> history records. The actual files and
            materials are <b>not</b> affected.
          </p>
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
            This action cannot be undone.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmAll(false)} disabled={busy}>Cancel</Button>
            <Button variant="danger" onClick={doDeleteAll} disabled={busy}>
              <Trash2 size={14} /> {busy ? 'Clearing…' : 'Delete All'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}