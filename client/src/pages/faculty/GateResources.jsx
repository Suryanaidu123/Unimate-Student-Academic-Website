import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, Trash2, Pencil, FileText, Loader2, Plus, BookMarked } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function FacultyGateResources() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState({ title: '', description: '' });
  const [file, setFile]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const fileRef = useRef(null);

  function load() {
    setLoading(true);
    api.get('/gate-resources')
      .then((r) => setItems(r.data.data.items || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm({ title: '', description: '' });
    setFile(null);
    setOpen(true);
  }
  function openEdit(row) {
    setEditing(row._id);
    setForm({ title: row.title, description: row.description || '' });
    setFile(null);
    setOpen(true);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required.');
    if (!editing && !file)  return toast.error('Please select a PDF file to upload.');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/gate-resources/${editing}`, form);
        toast.success('Updated.');
      } else {
        const fd = new FormData();
        fd.append('title', form.title.trim());
        fd.append('description', form.description.trim());
        fd.append('file', file);
        await api.post('/gate-resources', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Resource uploaded.');
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  }

  async function doDelete() {
    setDeleting(true);
    try {
      await api.delete(`/gate-resources/${confirmDel._id}`);
      toast.success('Deleted.');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setDeleting(false); }
  }

  async function download(row) {
    try {
      const r = await api.get(`/gate-resources/${row._id}/download`);
      window.open(r.data.data.url, '_blank');
    } catch { toast.error('Failed to get download link'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookMarked size={22} className="text-brand-600" /> GATE Resources
          </h1>
          <p className="text-sm text-slate-500">Upload study materials for GATE preparation.</p>
        </div>
        <Button onClick={openCreate}><Plus size={15} /> Upload Resource</Button>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <BookMarked size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No resources uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((r) => (
              <div key={r._id} className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{r.title}</p>
                    {r.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant={r.status === 'PUBLISHED' ? 'success' : 'warning'}>
                        {r.status}
                      </Badge>
                      {r.fileSize > 0 && (
                        <span className="text-xs text-slate-400">{fmtSize(r.fileSize)}</span>
                      )}
                      <span className="text-xs text-slate-400">{fmtDate(r.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {r.fileKey && (
                    <Button variant="secondary" onClick={() => download(r)}>
                      <Upload size={13} className="rotate-180" /> Download
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => openEdit(r)}>
                    <Pencil size={13} />
                  </Button>
                  <Button variant="danger" onClick={() => setConfirmDel(r)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Upload / Edit modal */}
      <Modal open={open} onClose={() => setOpen(false)}
        title={editing ? 'Edit Resource' : 'Upload GATE Resource'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Title *" required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. GATE 2025 Previous Year Papers" />
          <label className="block">
            <span className="label">Description</span>
            <textarea className="input min-h-[72px] resize-y"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description…" />
          </label>
          {!editing && (
            <div>
              <span className="label block mb-1">File (PDF, max 40 MB) *</span>
              {file ? (
                <div className="flex items-center gap-2 border border-green-300 bg-green-50 rounded-lg px-3 py-2">
                  <FileText size={16} className="text-green-600 shrink-0" />
                  <span className="text-sm text-green-800 flex-1 truncate">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)}
                    className="text-slate-400 hover:text-red-500">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-xl py-6 text-center text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600 transition">
                  Click to select a PDF file
                </button>
              )}
              <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : editing ? 'Save Changes' : 'Upload'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete Resource"
        message={`Delete "${confirmDel?.title}"? The file will also be removed from storage.`}
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(null)}
        loading={deleting}
      />
    </div>
  );
}
