import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Filter, X, Send, Trash2, MessageSquare, CheckCheck } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';

const KINDS = [
  { value: '', label: 'All Feedback' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'FACULTY', label: 'Faculty' },
];
const SEMESTERS = ['', '3', '4', '5', '6', '7', '8'];
const SECTIONS = ['', 'A', 'B', 'C', 'D'];

export default function AdminFeedback() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [filters, setFilters] = useState({
    kind: '', year: '', semester: '', section: '', status: '',
    q: '', page: 1, limit: 30,
  });

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v != null) params.set(k, v);
    });
    api.get(`/feedback?${params.toString()}`)
      .then((r) => {
        setItems(r.data.data.items || []);
        setTotal(r.data.data.total || 0);
      })
      .catch(() => toast.error('Failed to load feedback'))
      .finally(() => setLoading(false));
  }

  // On mount: mark all NEW as READ, then refresh
  useEffect(() => {
    let mounted = true;
    api.put('/feedback/mark-all-read')
      .then(() => {
        if (!mounted) return;
        // Notify sidebar to refresh its badge
        window.dispatchEvent(new Event('feedback-count-changed'));
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) load();
      });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(load, [filters.kind, filters.year, filters.semester, filters.section, filters.status, filters.page]);

  function openFeedback(f) {
    setSelected(f);
    setReplyText(f.adminReply || '');
  }

  async function sendReply() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.put(`/feedback/${selected._id}`, {
        adminReply: replyText.trim(),
        status: replyText.trim() ? 'RESOLVED' : selected.status,
      });
      toast.success('Reply saved');
      setSelected(null);
      setReplyText('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  }

  async function markAllRead() {
    try {
      await api.put('/feedback/mark-all-read');
      toast.success('All feedback marked as read');
      window.dispatchEvent(new Event('feedback-count-changed'));
      load();
    } catch {
      toast.error('Failed');
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    try {
      await api.delete(`/feedback/${confirmDelete._id}`);
      toast.success('Feedback deleted successfully.');
      setConfirmDelete(null);
      if (selected?._id === confirmDelete._id) setSelected(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  }

  function resetFilters() {
    setFilters({ kind: '', year: '', semester: '', section: '', status: '', q: '', page: 1, limit: 30 });
  }

  const anyFilter = filters.kind || filters.year || filters.semester || filters.section || filters.status || filters.q;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare size={22} /> Feedback
          </h1>
          <p className="text-sm text-slate-500">
            Feedback from students and faculty. Only admins can view this.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="brand">{total} total</Badge>
          <Button variant="secondary" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all as read
          </Button>
        </div>
      </div>

      <Card title="Filters">
        <div className="grid md:grid-cols-4 gap-3">
          <label className="block">
            <span className="label">Source</span>
            <select className="input" value={filters.kind}
              onChange={(e) => setFilters({ ...filters, kind: e.target.value, page: 1, year: '', semester: '', section: '' })}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </label>

          {filters.kind === 'STUDENT' && (
            <>
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
              <label className="block">
                <span className="label">Semester</span>
                <select className="input" value={filters.semester}
                  onChange={(e) => setFilters({ ...filters, semester: e.target.value, page: 1 })}>
                  <option value="">All semesters</option>
                  {SEMESTERS.filter(Boolean).map((s) => <option key={s} value={s}>Sem {s}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="label">Section</span>
                <select className="input" value={filters.section}
                  onChange={(e) => setFilters({ ...filters, section: e.target.value, page: 1 })}>
                  <option value="">All sections</option>
                  {SECTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </>
          )}

          <label className="block">
            <span className="label">Status</span>
            <select className="input" value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
              <option value="">All</option>
              <option value="NEW">New</option>
              <option value="READ">Read</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </label>
        </div>

        <div className="flex gap-2 mt-3">
          <Input placeholder="Search subject or message…"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          <Button variant="secondary" onClick={() => setFilters({ ...filters, page: 1 })}>
            <Filter size={14} />
          </Button>
          {anyFilter && (
            <Button variant="secondary" onClick={resetFilters}><X size={14} /></Button>
          )}
        </div>
      </Card>

      {loading ? (
        <Card><p className="text-sm text-slate-500 py-6 text-center">Loading feedback…</p></Card>
      ) : items.length === 0 ? (
        <Card><p className="text-sm text-slate-500 py-6 text-center">No feedback matches the filters.</p></Card>
      ) : (
        <div className="space-y-2">
          {items.map((f) => {
            const who = f.fromRole === 'STUDENT'
              ? `${f.studentId?.name || 'Unknown'} · ${f.studentId?.rollNumber || ''}`
              : `${f.facultyId?.name || 'Unknown'} · ${f.facultyId?.employeeId || ''}`;
            const cls = f.fromRole === 'STUDENT' && f.studentId
              ? `Yr ${f.studentId.year || f.year} · Sem ${f.studentId.currentSemester || f.semester} · ${f.studentId.section || f.section}`
              : '';
            return (
              <Card key={f._id}>
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{f.subject}</h3>
                      <Badge variant={f.fromRole === 'STUDENT' ? 'brand' : 'info'}>{f.fromRole}</Badge>
                      <Badge variant={f.status === 'RESOLVED' ? 'success' : f.status === 'READ' ? 'info' : 'warning'}>
                        {f.status}
                      </Badge>
                      {f.category && <Badge>{f.category}</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{who} {cls && `· ${cls}`}</p>
                    <p className="text-xs text-slate-400">{new Date(f.createdAt).toLocaleString()}</p>
                    <p className="text-sm text-slate-700 mt-2 line-clamp-2">{f.message}</p>
                    {f.adminReply && (
                      <p className="text-xs text-brand-700 mt-2">Replied: {f.adminReply.slice(0, 80)}…</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="secondary" onClick={() => openFeedback(f)}>View</Button>
                    <Button variant="danger" onClick={() => setConfirmDelete(f)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail + reply modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Feedback">
        {selected && (
          <div className="space-y-4">
            <div className="text-sm">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="font-semibold">{selected.subject}</h3>
                <Badge variant={selected.fromRole === 'STUDENT' ? 'brand' : 'info'}>{selected.fromRole}</Badge>
                {selected.category && <Badge>{selected.category}</Badge>}
              </div>
              <p className="text-xs text-slate-500">
                From: <b>{selected.studentId?.name || selected.facultyId?.name || 'Unknown'}</b>{' '}
                {selected.studentId && `· Roll ${selected.studentId.rollNumber}`}
                {selected.facultyId && `· Emp ${selected.facultyId.employeeId}`}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(selected.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-sm whitespace-pre-wrap">
              {selected.message}
            </div>

            <label className="block">
              <span className="label">Admin Reply</span>
              <textarea className="input" rows={4} value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply (optional)…" />
            </label>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelected(null)} disabled={saving}>Cancel</Button>
              <Button onClick={sendReply} disabled={saving}>
                <Send size={14} /> {saving ? 'Saving…' : 'Save Reply'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete feedback?">
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Delete <b>{confirmDelete.subject}</b>?
            </p>
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              This cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="danger" onClick={doDelete}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}