import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Lock, Unlock, Send } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useSemester, SEMESTER_KEYS } from '../../context/SemesterContext.jsx';

export default function AdminMarks() {
  const { year, semester, setKey } = useSemester();
  const activeKey = SEMESTER_KEYS.find((s) => s.year === year && s.semester === semester);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [filters, setFilters] = useState({
    subjectId: '',
    status: '',
    section: '',
  });

  // Reset subject selection when semester changes
  useEffect(() => {
    setFilters((f) => ({ ...f, subjectId: '' }));
  }, [year, semester]);

  // Load subjects for the current semester
  useEffect(() => {
    let cancelled = false;
    setLoadingSubjects(true);
    const params = new URLSearchParams({
      year: String(year),
      semester: String(semester),
      limit: '200',
    });

    api.get(`/subjects?${params.toString()}`)
      .then((r) => {
        if (cancelled) return;
        setSubjects(r.data.data.items || []);
      })
      .catch(() => toast.error('Failed to load subjects'))
      .finally(() => !cancelled && setLoadingSubjects(false));
    return () => { cancelled = true; };
  }, [year, semester]);

  function loadMarks() {
    setLoading(true);
    const params = new URLSearchParams({
      year: String(year),
      semester: String(semester),
    });
    if (filters.subjectId) params.set('subjectId', filters.subjectId);
    if (filters.status) params.set('status', filters.status);
    if (filters.section) params.set('section', filters.section);

    api.get(`/marks?${params.toString()}`)
      .then((r) => setItems(r.data.data.items || []))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load marks'))
      .finally(() => setLoading(false));
  }
  useEffect(loadMarks, [year, semester, filters.subjectId, filters.status, filters.section]);

  async function lockRow(id) {
    try { await api.post(`/marks/${id}/lock`); toast.success('Marks locked'); loadMarks(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }
  async function unlockRow(id) {
    try { await api.post(`/marks/${id}/unlock`); toast.success('Marks unlocked'); loadMarks(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }
  async function publishRow(id) {
    try { await api.post(`/marks/${id}/publish`); toast.success('Marks published'); loadMarks(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  const statusVariant = (s) =>
    s === 'PUBLISHED' ? 'success' : s === 'LOCKED' ? 'danger' : 'warning';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marks Management</h1>
          <p className="text-sm text-slate-500">
            {activeKey
              ? `Managing marks for ${activeKey.label} · ${activeKey.fullLabel}`
              : 'Managing marks'}
          </p>
        </div>
        <Button variant="secondary" onClick={loadMarks}>Refresh</Button>
      </div>

      {/* Semester switcher */}
      <Card title="Semester">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SEMESTER_KEYS.map((s) => {
            const isActive = s.year === year && s.semester === semester;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setKey(s.key)}
                className={`text-left rounded-lg border px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-brand-400'
                }`}
              >
                <p className="font-semibold">{s.label}</p>
                <p className={`text-xs mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                  {s.semester}th Sem
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Filters */}
      <Card title="Filters">
        <div className="grid md:grid-cols-3 gap-3">
          <label className="block">
            <span className="label">
              Subject
              <span className="text-xs text-slate-400 font-normal ml-1">
                ({subjects.length} in {activeKey?.label})
              </span>
            </span>
            <select
              className="input"
              value={filters.subjectId}
              onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
              disabled={loadingSubjects}
            >
              <option value="">
                {loadingSubjects ? 'Loading…' : 'All subjects'}
              </option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  [{s.type || 'THEORY'}] {s.subjectCode} — {s.subjectName}
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

      {/* Records table */}
      <Card title={`Marks Records — ${activeKey?.label || ''} (${items.length})`}>
        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading marks…</p>
        ) : (
          <Table
            empty={`No marks records for ${activeKey?.label || 'this semester'} match the filters.`}
            columns={[
              {
                key: 'student', label: 'Student',
                render: (r) => r.studentId
                  ? `${r.studentId.rollNumber} — ${r.studentId.name || '—'}`
                  : '—',
              },
              {
                key: 'sem', label: 'Sem',
                render: (r) => r.studentId?.currentSemester || '—',
              },
              {
                key: 'section', label: 'Sec',
                render: (r) => r.studentId?.section || '—',
              },
              {
                key: 'subject', label: 'Subject',
                render: (r) => r.subjectId?.subjectCode || '—',
              },
              { key: 'mid1', label: 'Mid-1', render: (r) => `${r.mid1?.total ?? 0}/30` },
              { key: 'mid2', label: 'Mid-2', render: (r) => `${r.mid2?.total ?? 0}/30` },
              {
                key: 'internal', label: 'Internal',
                render: (r) => <span className="font-semibold text-slate-900">{r.internalMarks ?? 0}/30</span>,
              },
              {
                key: 'status', label: 'Status',
                render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
              },
              {
                key: 'actions', label: 'Actions', render: (r) => (
                  <div className="flex gap-2">
                    {r.status === 'DRAFT' && (
                      <Button variant="secondary" onClick={() => publishRow(r._id)} title="Publish">
                        <Send size={14} />
                      </Button>
                    )}
                    {r.status === 'PUBLISHED' && (
                      <Button variant="danger" onClick={() => lockRow(r._id)} title="Lock">
                        <Lock size={14} />
                      </Button>
                    )}
                    {r.status === 'LOCKED' && (
                      <Button variant="secondary" onClick={() => unlockRow(r._id)} title="Unlock">
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
        <strong>Rules:</strong> Internal marks = max(Mid-1 total, Mid-2 total).
        Written marks are halved (÷2) before adding online + assignment.
        Only students currently in <b>{activeKey?.label}</b> appear here.
      </div>
    </div>
  );
}