import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

const EXAM_TYPES = ['INTERNAL', 'MID1', 'MID2', 'SEMESTER', 'LAB', 'VIVA', 'OTHER'];

const emptyForm = {
  examName: '',
  subjectId: '',
  examType: 'MID1',
  date: '',
  startTime: '09:00',
  endTime: '11:00',
  room: '',
  year: 2,
  semesterId: '',
  section: 'A',
  syllabus: '',
};

export default function AdminExams() {
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ year: '', section: '', examType: '' });

  async function loadAll() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.year) params.set('year', filters.year);
      if (filters.section) params.set('section', filters.section);
      if (filters.examType) params.set('examType', filters.examType);

      const [eRes, sRes] = await Promise.all([
        api.get(`/exams?${params.toString()}`),
        api.get('/subjects?limit=200'),
      ]);
      setItems(eRes.data.data || []);
      setSubjects(sRes.data.data.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [filters.year, filters.section, filters.examType]);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await api.post('/exams', { ...form, year: Number(form.year) });
      toast.success('Exam scheduled');
      setOpen(false);
      setForm(emptyForm);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule exam');
    }
  }

  async function removeExam(id) {
    if (!window.confirm('Delete this exam?')) return;
    try {
      await api.delete(`/exams/${id}`);
      toast.success('Exam deleted');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  }

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [items]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exams</h1>
          <p className="text-sm text-slate-500">
            Official exam schedule for AI & ML students.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadAll}>Refresh</Button>
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Schedule Exam
          </Button>
        </div>
      </div>

      <Card title="Filters">
        <div className="grid md:grid-cols-3 gap-3">
          <Input label="Year (2 / 3 / 4)" type="number" min={2} max={4}
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })} />
          <Input label="Section (A / B / C)"
            value={filters.section}
            onChange={(e) => setFilters({ ...filters, section: e.target.value })} />
          <label className="block">
            <span className="label">Exam Type</span>
            <select className="input" value={filters.examType}
              onChange={(e) => setFilters({ ...filters, examType: e.target.value })}>
              <option value="">All types</option>
              {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
      </Card>

      <Card title={`Scheduled Exams (${sorted.length})`}>
        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading exams…</p>
        ) : (
          <Table
            empty="No exams scheduled."
            columns={[
              { key: 'examName', label: 'Exam' },
              { key: 'subject', label: 'Subject',
                render: (r) => r.subjectId
                  ? `${r.subjectId.subjectCode} — ${r.subjectId.subjectName}`
                  : '—' },
              { key: 'examType', label: 'Type',
                render: (r) => <Badge>{r.examType}</Badge> },
              { key: 'date', label: 'Date',
                render: (r) => new Date(r.date).toLocaleDateString() },
              { key: 'time', label: 'Time',
                render: (r) => `${r.startTime}–${r.endTime}` },
              { key: 'room', label: 'Room' },
              { key: 'year', label: 'Yr' },
              { key: 'section', label: 'Sec' },
              { key: 'actions', label: '', render: (r) => (
                <button
                  className="text-red-500 hover:text-red-700"
                  onClick={() => removeExam(r._id)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              ) },
            ]}
            data={sorted}
          />
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Schedule Exam">
        <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
          <Input label="Exam Name" required className="col-span-2"
            value={form.examName}
            onChange={(e) => setForm({ ...form, examName: e.target.value })} />

          <label className="block col-span-2">
            <span className="label">Subject</span>
            <select className="input" required value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.subjectCode} — {s.subjectName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Exam Type</span>
            <select className="input" value={form.examType}
              onChange={(e) => setForm({ ...form, examType: e.target.value })}>
              {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <Input label="Date (YYYY-MM-DD)" type="date" required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />

          <Input label="Start Time (HH:MM)" required
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <Input label="End Time (HH:MM)" required
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })} />

          <Input label="Room" required
            value={form.room}
            onChange={(e) => setForm({ ...form, room: e.target.value })} />
          <Input label="Year" type="number" min={2} max={4} required
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })} />

          <Input label="Semester ID (Mongo _id)" required
            value={form.semesterId}
            onChange={(e) => setForm({ ...form, semesterId: e.target.value })} />
          <Input label="Section" required
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })} />

          <label className="block col-span-2">
            <span className="label">Syllabus (optional)</span>
            <textarea className="input" rows={3}
              value={form.syllabus}
              onChange={(e) => setForm({ ...form, syllabus: e.target.value })} />
          </label>

          <div className="col-span-2">
            <Button type="submit" className="w-full">Save Exam</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}