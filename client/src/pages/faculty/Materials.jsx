import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Download, Trash2, FileText, ExternalLink,
  BookOpen, FlaskConical, Star, ChevronLeft,
} from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { SEMESTER_KEYS } from '../../context/SemesterContext.jsx';

const THEORY_SECTIONS = [
  { key: 'UNIT_1', label: 'Unit 1' },
  { key: 'UNIT_2', label: 'Unit 2' },
  { key: 'UNIT_3', label: 'Unit 3' },
  { key: 'UNIT_4', label: 'Unit 4' },
  { key: 'UNIT_5', label: 'Unit 5' },
  { key: 'COMPLETE', label: 'Complete Material' },
];
const LAB_SECTIONS = [
  { key: 'EXP_1', label: 'Experiment 1' },
  { key: 'EXP_2', label: 'Experiment 2' },
];
function sectionsFor(type) { return type === 'LAB' ? LAB_SECTIONS : THEORY_SECTIONS; }

function semesterMeta(year, semester) {
  const found = SEMESTER_KEYS.find((s) => s.year === year && s.semester === semester);
  return found || { label: `${year}-?`, fullLabel: `Year ${year} · Semester ${semester}` };
}

export default function FacultyMaterials() {
  const [view, setView] = useState('SEMESTERS'); // 'SEMESTERS' | 'SUBJECTS'
  const [selectedSem, setSelectedSem] = useState(null); // { year, semester }

  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // upload modal
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', subjectId: '', section: 'UNIT_1', file: null });
  const [uploading, setUploading] = useState(false);

  // delete confirm
  const [confirmRow, setConfirmRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const token = localStorage.getItem('unimate_token');

  // Load assigned semesters on mount
  function loadSemesters() {
    setLoading(true);
    api.get('/materials/faculty/semesters')
      .then((r) => setSemesters(r.data.data || []))
      .catch(() => toast.error('Failed to load your assigned semesters'))
      .finally(() => setLoading(false));
  }
  useEffect(loadSemesters, []);

  // Load subjects + materials when semester is picked
  async function loadSubjectsAndMaterials(year, semester) {
    setLoadingSubjects(true);
    try {
      const [sRes, mRes] = await Promise.all([
        api.get(`/materials/faculty/subjects?year=${year}&semester=${semester}`),
        api.get(`/materials?year=${year}&semester=${semester}&limit=200`),
      ]);
      setSubjects(sRes.data.data || []);
      setMaterials(mRes.data.data.items || []);
    } catch {
      toast.error('Failed to load subjects');
    } finally {
      setLoadingSubjects(false);
    }
  }

  function openSemester(row) {
    setSelectedSem({ year: row.year, semester: row.semester });
    setView('SUBJECTS');
    loadSubjectsAndMaterials(row.year, row.semester);
  }

  function backToSemesters() {
    setView('SEMESTERS');
    setSelectedSem(null);
    setSubjects([]);
    setMaterials([]);
    loadSemesters();
  }

  function openUpload(subjectId, section) {
    const subject = subjects.find((s) => s._id === subjectId);
    const label = sectionsFor(subject?.type).find((x) => x.key === section)?.label || '';
    setForm({ title: label, description: '', subjectId, section, file: null });
    setOpen(true);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.file) return toast.error('Please choose a PDF file');
    if (!form.subjectId) return toast.error('Please choose a subject');

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('subjectId', form.subjectId);
      fd.append('section', form.section);
      fd.append('file', form.file);

      await api.post('/materials', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`${form.title} uploaded successfully.`);
      setOpen(false);
      setForm({ title: '', description: '', subjectId: '', section: 'UNIT_1', file: null });
      if (selectedSem) loadSubjectsAndMaterials(selectedSem.year, selectedSem.semester);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  }

  async function doDelete() {
    if (!confirmRow) return;
    setDeleting(true);
    try {
      await api.delete(`/materials/${confirmRow._id}`);
      toast.success('PDF deleted successfully.');
      setConfirmRow(null);
      if (selectedSem) loadSubjectsAndMaterials(selectedSem.year, selectedSem.semester);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally { setDeleting(false); }
  }

  const viewUrl = (id) => `${import.meta.env.VITE_API_URL}/materials/${id}/download?token=${encodeURIComponent(token)}`;
  const downloadUrl = (id) => `${import.meta.env.VITE_API_URL}/materials/${id}/download?mode=download&token=${encodeURIComponent(token)}`;

  const subjectIcon = (type) => {
    if (type === 'LAB') return <FlaskConical size={18} className="text-amber-600" />;
    if (type === 'ACTIVITY') return <Star size={18} className="text-purple-600" />;
    return <BookOpen size={18} className="text-brand-600" />;
  };

  // Materials grouped: subjectId → section → material
  const bySubjectSection = {};
  materials.forEach((m) => {
    const sid = m.subjectId?._id || m.subjectId;
    if (!sid) return;
    bySubjectSection[sid] = bySubjectSection[sid] || {};
    bySubjectSection[sid][m.section] = m;
  });

  // ---------- View: SEMESTERS ----------
  if (view === 'SEMESTERS') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academic Materials</h1>
          <p className="text-sm text-slate-500">
            Pick a semester where you teach to manage its materials.
          </p>
        </div>

        {loading ? (
          <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>
        ) : semesters.length === 0 ? (
          <Card>
            <div className="text-center py-10">
              <BookOpen size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">No subjects assigned to you yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Ask the admin to assign you to subjects before uploading materials.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {semesters.map((s) => {
              const meta = semesterMeta(s.year, s.semester);
              return (
                <button
                  key={`${s.year}-${s.semester}`}
                  onClick={() => openSemester(s)}
                  className="text-left rounded-xl border bg-white border-slate-200 hover:border-brand-400 hover:shadow-sm transition p-4"
                >
                  <p className="text-xs text-slate-500">{meta.label}</p>
                  <h3 className="font-semibold text-slate-900 mt-0.5">{meta.fullLabel}</h3>
                  <p className="text-sm text-slate-600 mt-2">
                    {s.subjectCount} subject{s.subjectCount === 1 ? '' : 's'}
                  </p>
                  <div className="mt-2 text-xs text-brand-600 font-medium">Open →</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---------- View: SUBJECTS ----------
  const meta = selectedSem ? semesterMeta(selectedSem.year, selectedSem.semester) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={backToSemesters}
          className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
          <ChevronLeft size={16} /> Back to semesters
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{meta?.fullLabel}</h1>
          <p className="text-sm text-slate-500">
            Upload materials for the subjects you teach in this semester.
          </p>
        </div>
      </div>

      {loadingSubjects ? (
        <Card><p className="text-sm text-slate-500 py-8 text-center">Loading subjects…</p></Card>
      ) : subjects.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 py-8 text-center">
            You don't teach any subject in this semester.
          </p>
        </Card>
      ) : (
        subjects.map((subject) => {
          const isLab = subject.type === 'LAB';
          const sections = sectionsFor(subject.type);
          const sectionMaterials = bySubjectSection[subject._id] || {};

          return (
            <Card key={subject._id}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  {subjectIcon(subject.type)}
                  <h3 className="font-semibold text-slate-900">
                    {subject.subjectCode} — {subject.subjectName}
                  </h3>
                  <Badge variant={isLab ? 'warning' : subject.type === 'ACTIVITY' ? 'info' : 'brand'}>
                    {subject.type || 'THEORY'}
                  </Badge>
                </div>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 ${isLab ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-2`}>
                {sections.map((sec) => {
                  const material = sectionMaterials[sec.key];
                  return (
                    <div
                      key={sec.key}
                      className={`rounded-lg border p-3 ${material ? 'bg-brand-50 border-brand-300' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-sm">{sec.label}</p>
                        {material && <FileText size={14} className="text-brand-600" />}
                      </div>
                      {material ? (
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-600 truncate" title={material.title}>{material.title}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <a href={viewUrl(material._id)} target="_blank" rel="noreferrer"
                              className="text-brand-600 hover:underline inline-flex items-center gap-1">
                              <ExternalLink size={11} /> View
                            </a>
                            <a href={downloadUrl(material._id)}
                              className="text-brand-600 hover:underline inline-flex items-center gap-1">
                              <Download size={11} />
                            </a>
                            <button onClick={() => setConfirmRow(material)}
                              className="text-red-500 hover:text-red-700 ml-auto">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => openUpload(subject._id, sec.key)}
                          className="w-full text-xs text-brand-600 hover:text-brand-800 font-medium py-1 border border-dashed border-brand-300 rounded">
                          + Upload
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`Upload PDF — ${form.title || ''}`}>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="label">Subject</span>
            <select className="input" required value={form.subjectId}
              onChange={(e) => {
                const sub = subjects.find((s) => s._id === e.target.value);
                const first = sectionsFor(sub?.type)[0];
                setForm({ ...form, subjectId: e.target.value, section: first.key, title: first.label });
              }}>
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  [{s.type || 'THEORY'}] {s.subjectCode} — {s.subjectName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Section</span>
            <select className="input" required value={form.section}
              onChange={(e) => {
                const sub = subjects.find((s) => s._id === form.subjectId);
                const label = sectionsFor(sub?.type).find((x) => x.key === e.target.value)?.label || '';
                setForm({ ...form, section: e.target.value, title: label });
              }}>
              {sectionsFor(subjects.find((s) => s._id === form.subjectId)?.type).map((sec) => (
                <option key={sec.key} value={sec.key}>{sec.label}</option>
              ))}
            </select>
          </label>
          <Input label="Title" required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <label className="block">
            <span className="label">Description (optional)</span>
            <textarea className="input" rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">PDF File (max 40 MB)</span>
            <input type="file" accept="application/pdf,.pdf" className="input"
              onChange={(e) => setForm({ ...form, file: e.target.files[0] })} />
            {form.file && (
              <p className="text-xs text-slate-500 mt-1">
                {form.file.name} · {Math.round(form.file.size / 1024)} KB
              </p>
            )}
          </label>
          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </form>
      </Modal>

      <Modal open={!!confirmRow} onClose={() => setConfirmRow(null)} title="Delete PDF?">
        {confirmRow && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">Delete <b>{confirmRow.title}</b>?</p>
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              The file will be permanently removed. This cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmRow(null)} disabled={deleting}>Cancel</Button>
              <Button variant="danger" onClick={doDelete} disabled={deleting}>
                <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete PDF'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}