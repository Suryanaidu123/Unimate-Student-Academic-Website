import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Download, Trash2, FileText, ExternalLink } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

const empty = { title: '', description: '', subjectId: '', file: null };

export default function AdminMaterials() {
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Read JWT once so browser-opened tabs can authorize the download
  const token = localStorage.getItem('unimate_token');

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/materials?limit=200'),
      api.get('/subjects?limit=200'),
    ])
      .then(([mRes, sRes]) => {
        setItems(mRes.data.data.items || []);
        setSubjects(sRes.data.data.items || []);
      })
      .catch(() => toast.error('Failed to load materials'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.file) return toast.error('Pick a PDF file');
    if (!form.subjectId) return toast.error('Pick a subject');

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('subjectId', form.subjectId);
      fd.append('file', form.file);

      await api.post('/materials', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Uploaded');
      setOpen(false);
      setForm(empty);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this material? This cannot be undone.')) return;
    try {
      await api.delete(`/materials/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  }

  // Browser-native links: token goes in query string
  const viewUrl = (id) =>
    `${import.meta.env.VITE_API_URL}/materials/${id}/download?token=${encodeURIComponent(token)}`;

  const downloadUrl = (id) =>
    `${import.meta.env.VITE_API_URL}/materials/${id}/download?mode=download&token=${encodeURIComponent(token)}`;

  // Sort: Theory first, Lab last; alphabetical within each group
  const sorted = [...items].sort((a, b) => {
    const rank = (m) => (m.subjectId?.type === 'LAB' ? 1 : 0);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return String(a.subjectId?.subjectCode || '').localeCompare(
      String(b.subjectId?.subjectCode || '')
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academic Materials</h1>
          <p className="text-sm text-slate-500">
            Upload PDFs per subject. Students of that year can view and download.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Upload PDF
        </Button>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading…</p>
        ) : (
          <Table
            empty="No materials yet. Click 'Upload PDF' to add the first one."
            columns={[
              {
                key: 'title',
                label: 'Title',
                render: (r) => (
                  <a
                    href={viewUrl(r._id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 hover:underline flex items-center gap-2"
                    title="Open PDF in new tab"
                  >
                    <FileText size={14} /> {r.title}
                  </a>
                ),
              },
              {
                key: 'subject',
                label: 'Subject',
                render: (r) => (
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs">
                      {r.subjectId?.subjectCode || '—'}
                    </span>
                    <Badge variant={r.subjectId?.type === 'LAB' ? 'warning' : 'brand'}>
                      {r.subjectId?.type || 'THEORY'}
                    </Badge>
                  </span>
                ),
              },
              { key: 'year', label: 'Year' },
              {
                key: 'size',
                label: 'Size',
                render: (r) => `${Math.round(r.fileSize / 1024)} KB`,
              },
              {
                key: 'uploaded',
                label: 'Uploaded',
                render: (r) => new Date(r.createdAt).toLocaleDateString(),
              },
              {
                key: 'actions',
                label: '',
                render: (r) => (
                  <div className="flex gap-3 items-center">
                    <a
                      href={viewUrl(r._id)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-500 hover:text-brand-600"
                      title="View in browser"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <a
                      href={downloadUrl(r._id)}
                      className="text-brand-600 hover:text-brand-800"
                      title="Download"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      onClick={() => remove(r._id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ),
              },
            ]}
            data={sorted}
          />
        )}
      </Card>

      {/* Upload modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Upload Academic Material">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Unit 1 — Introduction to ML"
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
          </label>

          <label className="block">
            <span className="label">Description (optional)</span>
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does this PDF cover?"
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
    </div>
  );
}