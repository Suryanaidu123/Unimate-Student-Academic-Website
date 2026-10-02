import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Calendar } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useSemester, SEMESTER_KEYS } from '../../context/SemesterContext.jsx';

const EXAM_TYPES = ['INTERNAL', 'MID1', 'MID2', 'SEMESTER', 'LAB', 'VIVA', 'OTHER'];

const emptyForm = {
  examName: '',
  subjectId: '',
  examType: 'MID1',
  date: '',
  startTime: '09:00',
  endTime: '11:00',
  syllabus: '',
};

function to12h(t) {
  if (!t) return '';
  const [hh, mm] = String(t).split(':').map(Number);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`;
}

export default function AdminExams() {
  const { year, semester, setKey } = useSemester();
  const activeKey = SEMESTER_KEYS.find((s) => s.year === year && s.semester === semester);

  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [examTypeFilter, setExamTypeFilter] = useState('');

  // delete confirm
  const [confirmRow, setConfirmRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({
      year: String(year),
      semester: String(semester),
    });
    if (examTypeFilter) params.set('examType', examTypeFilter);

    Promise.all([
      api.get(`/exams?${params.toString()}`),
      api.get(`/subjects?year=${year}&semester=${semester}&limit=200`),
    ])
      .then(([eRes, sRes]) => {
        setItems(eRes.data.data || []);
        setSubjects(sRes.data.data.items || []);
      })
      .catch(() => toast.error('Failed to load exams'))
      .finally(() => setLoading(false));
  }
  useEffect(load, [year, semester, examTypeFilter]);

  function openCreate() {
    setForm({ ...emptyForm, subjectId: subjects[0]?._id || '' });
    setOpen(true);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.subjectId) return toast.error('Please select a subject');
    setSaving(true);
    try {
      await api.post('/exams', {
        examName: form.examName.trim(),
        subjectId: form.subjectId,
        examType: form.examType,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        syllabus: form.syllabus.trim(),
      });
      toast.success('Exam scheduled successfully.');
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule exam');
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!confirmRow) return;
    setDeleting(true);
    try {
      await api.delete(`/exams/${confirmRow._id}`);
      toast.success('Exam deleted successfully.');
      setConfirmRow(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [items]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exams</h1>
          <p className="text-sm text-slate-500">
            {activeKey
              ? `Managing exams for ${activeKey.label} · ${activeKey.fullLabel}`
              : 'Managing exams'}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="input !w-40"
            value={examTypeFilter}
            onChange={(e) => setExamTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button onClick={openCreate}>
            <Plus size={16} /> Schedule Exam
          </Button>
        </div>
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

      {/* Exams table */}
      <Card title={`Scheduled Exams — ${activeKey?.label || ''} (${sorted.length})`}>
        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading exams…</p>
        ) : (
          <Table
            empty={`No exams scheduled for ${activeKey?.label || 'this semester'}.`}
            columns={[
              { key: 'examName', label: 'Exam' },
              {
                key: 'subject', label: 'Subject',
                render: (r) => r.subjectId
                  ? `${r.subjectId.subjectCode} — ${r.subjectId.subjectName}`
                  : '—',
              },
              {
                key: 'examType', label: 'Type',
                render: (r) => <Badge>{r.examType}</Badge>,
              },
              {
                key: 'date', label: 'Date',
                render: (r) => new Date(r.date).toLocaleDateString(),
              },
              {
                key: 'time', label: 'Time',
                render: (r) => `${to12h(r.startTime)} – ${to12h(r.endTime)}`,
              },
              {
                key: 'actions', label: '', render: (r) => (
                  <button
                    onClick={() => setConfirmRow(r)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete exam"
                  >
                    <Trash2 size={14} />
                  </button>
                ),
              },
            ]}
            data={sorted}
          />
        )}
      </Card>

      {/* Schedule modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Schedule Exam — ${activeKey?.label || ''}`}
      >
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            label="Exam Name"
            required
            value={form.examName}
            onChange={(e) => setForm({ ...form, examName: e.target.value })}
            placeholder="e.g. Mid-1 Exam"
          />

          <label className="block">
            <span className="label">Subject</span>
            <select
              className="input"
              required
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  [{s.type || 'THEORY'}] {s.subjectCode} — {s.subjectName}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Only subjects from <b>{activeKey?.label}</b> are shown.
            </p>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Exam Type</span>
              <select
                className="input"
                value={form.examType}
                onChange={(e) => setForm({ ...form, examType: e.target.value })}
              >
                {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <Input
              label="Date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time (HH:MM)"
              required
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              placeholder="09:00"
            />
            <Input
              label="End Time (HH:MM)"
              required
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              placeholder="11:00"
            />
          </div>

          <label className="block">
            <span className="label">Syllabus (optional)</span>
            <textarea
              className="input"
              rows={3}
              value={form.syllabus}
              onChange={(e) => setForm({ ...form, syllabus: e.target.value })}
            />
          </label>

          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
            Saving to: <b>{activeKey?.label}</b> · {activeKey?.fullLabel}
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : 'Save Exam'}
          </Button>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!confirmRow}
        onClose={() => setConfirmRow(null)}
        title="Delete exam?"
      >
        {confirmRow && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Delete <b>{confirmRow.examName}</b>?
            </p>
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              This action cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmRow(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={doDelete} disabled={deleting}>
                <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete Exam'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}