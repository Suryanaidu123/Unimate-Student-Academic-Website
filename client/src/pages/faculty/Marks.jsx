import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

const YEARS = [2, 3, 4];
const SECTIONS = ['A', 'B', 'C', 'D'];

// Ascending sort by roll number, numeric-aware (handles A6101 < A6102 < A6164)
const sortByRoll = (a, b) =>
  String(a?.rollNumber || '').localeCompare(
    String(b?.rollNumber || ''),
    undefined,
    { numeric: true }
  );

export default function FacultyMarks() {
  // ---- Cascading selection ----
  const [year, setYear] = useState('');
  const [type, setType] = useState('THEORY');
  const [section, setSection] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [studentId, setStudentId] = useState('');

  // ---- Lookup lists ----
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // ---- Marks form ----
  const [form, setForm] = useState({ m1w: 0, m1o: 0, m1a: 0, m2w: 0, m2o: 0, m2a: 0 });
  const [submitting, setSubmitting] = useState(false);

  // ---- Existing records ----
  const [marks, setMarks] = useState([]);

  // -------------------------------------------------------------
  // Load students when Year + Section are set — ascending by roll
  // -------------------------------------------------------------
  useEffect(() => {
    if (!year || !section) {
      setStudents([]);
      setStudentId('');
      return;
    }
    setLoadingLookups(true);
    api.get(`/lookup/students?year=${year}&section=${section}`)
      .then((r) => {
        const list = [...(r.data.data || [])].sort(sortByRoll);
        setStudents(list);
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoadingLookups(false));
  }, [year, section]);

  // -------------------------------------------------------------
  // Load subjects when Year (+ Type) is set — theory-first order
  // -------------------------------------------------------------
  useEffect(() => {
    if (!year) {
      setSubjects([]);
      setSubjectId('');
      return;
    }
    const params = new URLSearchParams({ year });
    if (type) params.set('type', type);

    api.get(`/lookup/subjects?${params.toString()}`)
      .then((r) => {
        const list = [...(r.data.data || [])];
        // Safety sort: THEORY first, then LAB, then alphabetical
        list.sort((a, b) => {
          const rank = (s) => (s.type === 'LAB' ? 1 : 0);
          if (rank(a) !== rank(b)) return rank(a) - rank(b);
          return String(a.subjectCode).localeCompare(String(b.subjectCode));
        });
        setSubjects(list);
        // Clear stale subject if it's not in the new list
        if (subjectId && !list.some((s) => s._id === subjectId)) {
          setSubjectId('');
        }
      })
      .catch(() => toast.error('Failed to load subjects'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, type]);

  // -------------------------------------------------------------
  // Load existing marks for the selected subject — sorted by roll
  // -------------------------------------------------------------
  function loadMarks() {
    const params = new URLSearchParams();
    if (subjectId) params.set('subjectId', subjectId);
    api.get(`/marks?${params.toString()}`)
      .then((r) => {
        const list = [...(r.data.data.items || [])];
        list.sort((a, b) => sortByRoll(a.studentId, b.studentId));
        setMarks(list);
      })
      .catch(() => {});
  }
  useEffect(loadMarks, [subjectId]);

  // -------------------------------------------------------------
  // Save marks
  // -------------------------------------------------------------
  async function onSubmit(e) {
    e.preventDefault();
    if (!subjectId || !studentId) {
      return toast.error('Select subject and student first');
    }
    setSubmitting(true);
    try {
      await api.post('/marks', {
        studentId,
        subjectId,
        mid1: {
          written: Number(form.m1w),
          online: Number(form.m1o),
          assignment: Number(form.m1a),
        },
        mid2: {
          written: Number(form.m2w),
          online: Number(form.m2o),
          assignment: Number(form.m2a),
        },
      });
      toast.success('Marks saved');
      setForm({ m1w: 0, m1o: 0, m1a: 0, m2w: 0, m2o: 0, m2a: 0 });
      loadMarks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------
  // Publish a draft
  // -------------------------------------------------------------
  async function publish(id) {
    try {
      await api.post(`/marks/${id}/publish`);
      toast.success('Published');
      loadMarks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish');
    }
  }

  // -------------------------------------------------------------
  // Delete marks (blocked if LOCKED)
  // -------------------------------------------------------------
  async function removeMarks(id, status) {
    if (status === 'LOCKED') {
      return toast.error('Locked marks cannot be deleted. Contact admin.');
    }
    if (!window.confirm('Delete these marks? This cannot be undone.')) return;
    try {
      await api.delete(`/marks/${id}`);
      toast.success('Marks deleted');
      loadMarks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  }

  const isLab = type === 'LAB';
  const selectedSubject = subjects.find((s) => s._id === subjectId);
  const selectedStudent = students.find((s) => s._id === studentId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Enter Internal Marks</h1>
        <p className="text-sm text-slate-500">
          You can only enter marks for subjects you're assigned to.
        </p>
      </div>

      {/* ---------- STEP 1: Cascade selectors ---------- */}
      <Card title="1. Select Student & Subject">
        <div className="grid md:grid-cols-5 gap-3">
          <label className="block">
            <span className="label">Year</span>
            <select
              className="input"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">Select</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y} Year</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Type</span>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="THEORY">Theory</option>
              <option value="LAB">Lab</option>
            </select>
          </label>

          <label className="block">
            <span className="label">Section</span>
            <select
              className="input"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              <option value="">Select</option>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>Section {s}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Subject</span>
            <select
              className="input"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={!year}
            >
              <option value="">
                {!year
                  ? 'Pick year first'
                  : subjects.length === 0
                  ? `No ${type.toLowerCase()} subjects`
                  : 'Select subject'}
              </option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  [{s.type || 'THEORY'}] {s.subjectCode} — {s.subjectName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Student (roll no)</span>
            <select
              className="input"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={!year || !section || loadingLookups}
            >
              <option value="">
                {loadingLookups
                  ? 'Loading…'
                  : !year || !section
                  ? 'Pick year & section'
                  : students.length === 0
                  ? 'No students'
                  : 'Select student'}
              </option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.rollNumber} — {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Helpful hints */}
        {year && type && subjects.length === 0 && (
          <p className="text-xs text-amber-600 mt-3">
            You aren't assigned to any <b>{type.toLowerCase()}</b> subjects for Year {year}.
            Ask admin to assign you.
          </p>
        )}
        {year && section && students.length === 0 && !loadingLookups && (
          <p className="text-xs text-amber-600 mt-3">
            No students found for Year {year}, Section {section}.
            Add them in Admin → Students first.
          </p>
        )}
        {selectedSubject && selectedStudent && (
          <p className="text-xs text-brand-700 mt-3">
            Entering marks for <b>{selectedStudent.rollNumber}</b> ({selectedStudent.name})
            in <b>{selectedSubject.subjectCode}</b> — {selectedSubject.subjectName}
          </p>
        )}
      </Card>

      {/* ---------- STEP 2: Marks entry ---------- */}
      <Card title={`2. Enter ${isLab ? 'Lab' : 'Theory'} Marks`}>
        <form onSubmit={onSubmit} className="grid md:grid-cols-3 gap-3">
          <Input
            type="number" min={0} max={30}
            label={isLab ? 'Mid-1 Record (0–30)' : 'Mid-1 Written (0–30)'}
            value={form.m1w}
            onChange={(e) => setForm({ ...form, m1w: e.target.value })}
          />
          <Input
            type="number" min={0} max={10}
            label={isLab ? 'Mid-1 Viva (0–10)' : 'Mid-1 Online (0–10)'}
            value={form.m1o}
            onChange={(e) => setForm({ ...form, m1o: e.target.value })}
          />
          <Input
            type="number" min={0} max={5}
            label={isLab ? 'Mid-1 Observation (0–5)' : 'Mid-1 Assignment (0–5)'}
            value={form.m1a}
            onChange={(e) => setForm({ ...form, m1a: e.target.value })}
          />

          <Input
            type="number" min={0} max={30}
            label={isLab ? 'Mid-2 Record (0–30)' : 'Mid-2 Written (0–30)'}
            value={form.m2w}
            onChange={(e) => setForm({ ...form, m2w: e.target.value })}
          />
          <Input
            type="number" min={0} max={10}
            label={isLab ? 'Mid-2 Viva (0–10)' : 'Mid-2 Online (0–10)'}
            value={form.m2o}
            onChange={(e) => setForm({ ...form, m2o: e.target.value })}
          />
          <Input
            type="number" min={0} max={5}
            label={isLab ? 'Mid-2 Observation (0–5)' : 'Mid-2 Assignment (0–5)'}
            value={form.m2a}
            onChange={(e) => setForm({ ...form, m2a: e.target.value })}
          />

          <div className="md:col-span-3">
            <Button
              type="submit"
              disabled={submitting || !studentId || !subjectId}
            >
              {submitting ? 'Saving…' : 'Save Marks'}
            </Button>
          </div>
        </form>
        <p className="text-xs text-slate-500 mt-2">
          Internal = max(Mid-1 total, Mid-2 total), where each total = (written ÷ 2) + online + assignment.
          Calculation is identical for Theory and Lab.
        </p>
      </Card>

      {/* ---------- STEP 3: Existing records ---------- */}
      <Card title={`Marks Records${subjectId ? '' : ' — pick a subject to filter'}`}>
        <Table
          empty="No marks records."
          columns={[
            {
              key: 'student', label: 'Roll No',
              render: (r) => (
                <span className="font-mono text-xs">
                  {r.studentId?.rollNumber || '—'}
                </span>
              ),
            },
            {
              key: 'name', label: 'Name',
              render: (r) => r.studentId?.name || '—',
            },
            {
              key: 'section', label: 'Sec',
              render: (r) => r.studentId?.section || '—',
            },
            {
              key: 'subject', label: 'Subject',
              render: (r) => (
                <span className="flex items-center gap-2">
                  {r.subjectId?.subjectCode}
                  <Badge variant={r.subjectId?.type === 'LAB' ? 'warning' : 'brand'}>
                    {r.subjectId?.type || 'THEORY'}
                  </Badge>
                </span>
              ),
            },
            {
              key: 'mid1', label: 'Mid-1',
              render: (r) => `${r.mid1?.total ?? 0}/30`,
            },
            {
              key: 'mid2', label: 'Mid-2',
              render: (r) => `${r.mid2?.total ?? 0}/30`,
            },
            {
              key: 'internal', label: 'Internal',
              render: (r) => <strong>{r.internalMarks ?? 0}/30</strong>,
            },
            {
              key: 'status', label: 'Status',
              render: (r) => (
                <Badge
                  variant={
                    r.status === 'PUBLISHED'
                      ? 'success'
                      : r.status === 'LOCKED'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {r.status}
                </Badge>
              ),
            },
            {
              key: 'action', label: '', render: (r) => (
                <div className="flex gap-2 items-center">
                  {r.status === 'DRAFT' && (
                    <Button variant="secondary" onClick={() => publish(r._id)}>
                      Publish
                    </Button>
                  )}
                  <button
                    onClick={() => removeMarks(r._id, r.status)}
                    className={
                      r.status === 'LOCKED'
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-red-500 hover:text-red-700'
                    }
                    title={r.status === 'LOCKED' ? 'Locked — contact admin' : 'Delete marks'}
                    disabled={r.status === 'LOCKED'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
          data={marks}
        />
      </Card>
    </div>
  );
}