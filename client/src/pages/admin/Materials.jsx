import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Download, Trash2, FileText, ExternalLink, BookOpen } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useSemester, SEMESTER_KEYS } from '../../context/SemesterContext.jsx';

const UNITS = [1, 2, 3, 4, 5];

export default function AdminMaterials() {
  const { year, semester, setKey } = useSemester();
  const activeKey = SEMESTER_KEYS.find((s) => s.year === year && s.semester === semester);

  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // upload modal state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', subjectId: '', unit: 1, file: null,
  });
  const [uploading, setUploading] = useState(false);

  // delete confirmation
  const [confirmRow, setConfirmRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const token = localStorage.getItem('unimate_token');

  function load() {
    setLoading(true);
    Promise.all([
      api.get(`/materials?year=${year}&semester=${semester}&limit=200`),
      api.get(`/subjects?year=${year}&semester=${semester}&limit=200`),
    ])
      .then(([mRes, sRes]) => {
        setItems(mRes.data.data.items || []);
        setSubjects(sRes.data.data.items || []);
      })
      .catch(() => toast.error('Failed to load materials'))
      .finally(() => setLoading(false));
  }
  useEffect(load, [year, semester]);

  function openUpload(subjectId, unit) {
    setForm({
      title: `Unit ${unit}`,
      description: '',
      subjectId,
      unit,
      file: null,
    });
    setOpen(true);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.file) return toast.error('Please choose a PDF file');
    if (!form.subjectId) return toast.error('Please choose a subject');

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title || `Unit ${form.unit}`);
      fd.append('description', form.description);
      fd.append('subjectId', form.subjectId);
      fd.append('unit', String(form.unit));
      fd.append('file', form.file);

      await api.post('/materials', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Unit ${form.unit} PDF uploaded successfully.`);
      setOpen(false);
      setForm({ title: '', description: '', subjectId: '', unit: 1, file: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function doDelete() {
    if (!confirmRow) return;
    setDeleting(true);
    try {
      await api.delete(`/materials/${confirmRow._id}`);
      toast.success('PDF deleted successfully.');
      setConfirmRow(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  const viewUrl = (id) =>
    `${import.meta.env.VITE_API_URL}/materials/${id}/download?token=${encodeURIComponent(token)}`;

  const downloadUrl = (id) =>
    `${import.meta.env.VITE_API_URL}/materials/${id}/download?mode=download&token=${encodeURIComponent(token)}`;

  // Group materials by subject → unit for quick lookup
  const materialsBySubjectUnit = {};
  items.forEach((m) => {
    const sid = m.subjectId?._id || m.subjectId;
    if (!sid) return;
    materialsBySubjectUnit[sid] = materialsBySubjectUnit[sid] || {};
    materialsBySubjectUnit[sid][m.unit] = m;
  });

  // Sort: theory first, then labs
  const sortedSubjects = [...subjects].sort((a, b) => {
    const rank = (s) => (s.type === 'LAB' ? 1 : 0);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return String(a.subjectCode).localeCompare(String(b.subjectCode));
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academic Materials</h1>
          <p className="text-sm text-slate-500">
            {activeKey
              ? `Managing PDFs for ${activeKey.label} · ${activeKey.fullLabel}`
              : 'Upload PDFs per subject and unit.'}
          </p>
        </div>
        <Button onClick={() => {
          if (sortedSubjects.length === 0) return toast.error('Add subjects for this semester first');
          openUpload(sortedSubjects[0]._id, 1);
        }}>
          <Plus size={16} /> Upload PDF
        </Button>
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

      {/* Subjects + Units grid */}
      {loading ? (
        <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>
      ) : sortedSubjects.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <BookOpen size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No subjects in {activeKey?.label}</p>
            <p className="text-sm text-slate-400 mt-1">
              Add subjects for this semester in the Subjects section first.
            </p>
          </div>
        </Card>
      ) : (
        sortedSubjects.map((subject) => (
          <Card key={subject._id}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {subject.subjectCode} — {subject.subjectName}
                  </h3>
                  <Badge variant={subject.type === 'LAB' ? 'warning' : 'brand'}>
                    {subject.type || 'THEORY'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {subject.credits} credits
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              {UNITS.map((unit) => {
                const material = materialsBySubjectUnit[subject._id]?.[unit];
                return (
                  <div
                    key={unit}
                    className={`rounded-lg border p-3 ${
                      material
                        ? 'bg-brand-50 border-brand-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-sm">Unit {unit}</p>
                      {material && <FileText size={14} className="text-brand-600" />}
                    </div>

                    {material ? (
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-600 truncate" title={material.title}>
                          {material.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <a
                            href={viewUrl(material._id)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-600 hover:underline inline-flex items-center gap-1"
                            title="View"
                          >
                            <ExternalLink size={11} /> View
                          </a>
                          <a
                            href={downloadUrl(material._id)}
                            className="text-brand-600 hover:underline inline-flex items-center gap-1"
                            title="Download"
                          >
                            <Download size={11} />
                          </a>
                          <button
                            onClick={() => setConfirmRow(material)}
                            className="text-red-500 hover:text-red-700 ml-auto"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => openUpload(subject._id, unit)}
                        className="w-full text-xs text-brand-600 hover:text-brand-800 font-medium py-1 border border-dashed border-brand-300 rounded"
                      >
                        + Upload
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}

      {/* Upload modal */}
      <Modal open={open} onClose={() => setOpen(false)}
        title={`Upload PDF — Unit ${form.unit}`}>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="label">Subject</span>
            <select
              className="input"
              required
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
            >
              <option value="">Select subject</option>
              {sortedSubjects.map((s) => (
                <option key={s._id} value={s._id}>
                  [{s.type || 'THEORY'}] {s.subjectCode} — {s.subjectName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Unit</span>
            <select
              className="input"
              required
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: Number(e.target.value) })}
            >
              {UNITS.map((u) => <option key={u} value={u}>Unit {u}</option>)}
            </select>
          </label>

          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={`Unit ${form.unit}`}
          />

          <label className="block">
            <span className="label">Description (optional)</span>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="label">PDF File (max 20 MB)</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="input"
              onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
            />
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

      {/* Delete confirmation */}
      <Modal open={!!confirmRow} onClose={() => setConfirmRow(null)} title="Delete PDF?">
        {confirmRow && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Delete <b>{confirmRow.title}</b>?
            </p>
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              The file will be permanently removed. This cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmRow(null)} disabled={deleting}>
                Cancel
              </Button>
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