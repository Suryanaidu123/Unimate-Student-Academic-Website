import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Lock, Unlock, Send } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function AdminMarks() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [filters, setFilters] = useState({
    subjectId: '',
    status: '',
    section: '',
  });

  // subjects list for filter dropdown (all subjects, admin can see)
  const [subjects, setSubjects] = useState([]);

  function loadSubjects() {
    api.get('/subjects?limit=200')
      .then((r) => setSubjects(r.data.data.items || []))
      .catch(() => {});
  }

  function loadMarks() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.subjectId) params.set('subjectId', filters.subjectId);
    if (filters.status) params.set('status', filters.status);

    api.get(`/marks?${params.toString()}`)
      .then((r) => {
        const list = r.data.data.items || [];
        const filtered = filters.section
          ? list.filter((m) => m.studentId?.section === filters.section)
          : list;
        setItems(filtered);
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load marks'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSubjects(); }, []);
  useEffect(loadMarks, [filters.subjectId, filters.status, filters.section]);

  async function lockRow(id) {
    try {
      await api.post(`/marks/${id}/lock`);
      toast.success('Marks locked');
      loadMarks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to lock');
    }
  }

  async function unlockRow(id) {
    try {
      await api.post(`/marks/${id}/unlock`);
      toast.success('Marks unlocked');
      loadMarks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlock');
    }
  }

  async function publishRow(id) {
    try {
      await api.post(`/marks/${id}/publish`);
      toast.success('Marks published');
      loadMarks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish');
    }
  }

  const statusVariant = (s) =>
    s === 'PUBLISHED' ? 'success' : s === 'LOCKED' ? 'danger' : 'warning';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marks Management</h1>
          <p className="text-sm text-slate-500">
            Review, publish, lock or unlock internal marks across all subjects.
          </p>
        </div>
        <Button variant="secondary" onClick={loadMarks}>Refresh</Button>
      </div>

      <Card title="Filters">
        <div className="grid md:grid-cols-3 gap-3">
          <label className="block">
            <span className="label">Subject</span>
            <select
              className="input"
              value={filters.subjectId}
              onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
            >
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.subjectCode} — {s.subjectName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Status</span>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="LOCKED">Locked</option>
            </select>
          </label>

          <Input
            label="Section (A / B / C)"
            value={filters.section}
            onChange={(e) => setFilters({ ...filters, section: e.target.value })}
          />
        </div>
      </Card>

      <Card title={`Marks Records (${items.length})`}>
        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading marks…</p>
        ) : (
          <Table
            empty="No marks records match the current filters."
            columns={[
              {
                key: 'student',
                label: 'Student',
                render: (r) =>
                  r.studentId
                    ? `${r.studentId.rollNumber} — ${r.studentId.name}`
                    : '—',
              },
              {
                key: 'section',
                label: 'Sec',
                render: (r) => r.studentId?.section || '—',
              },
              {
                key: 'subject',
                label: 'Subject',
                render: (r) =>
                  r.subjectId
                    ? `${r.subjectId.subjectCode}`
                    : '—',
              },
              {
                key: 'mid1',
                label: 'Mid-1',
                render: (r) => `${r.mid1?.total ?? 0}/30`,
              },
              {
                key: 'mid2',
                label: 'Mid-2',
                render: (r) => `${r.mid2?.total ?? 0}/30`,
              },
              {
                key: 'internal',
                label: 'Internal',
                render: (r) => (
                  <span className="font-semibold text-slate-900">
                    {r.internalMarks ?? 0}/30
                  </span>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (r) => (
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                ),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (r) => (
                  <div className="flex gap-2">
                    {r.status === 'DRAFT' && (
                      <Button
                        variant="secondary"
                        onClick={() => publishRow(r._id)}
                        title="Publish"
                      >
                        <Send size={14} />
                      </Button>
                    )}
                    {r.status === 'PUBLISHED' && (
                      <Button
                        variant="danger"
                        onClick={() => lockRow(r._id)}
                        title="Lock"
                      >
                        <Lock size={14} />
                      </Button>
                    )}
                    {r.status === 'LOCKED' && (
                      <Button
                        variant="secondary"
                        onClick={() => unlockRow(r._id)}
                        title="Unlock"
                      >
                        <Unlock size={14} />
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            data={items}
          />
        )}
      </Card>

      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
        <strong>Rules:</strong> Internal marks = max(Mid-1 total, Mid-2 total). Written marks are
        halved (÷2) before adding online + assignment. Locked marks can only be edited after
        an admin unlocks them. Every publish/lock/unlock action creates an audit log entry.
      </div>
    </div>
  );
}