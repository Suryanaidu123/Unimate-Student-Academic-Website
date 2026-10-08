/**
 * Student Documents page
 * - Upload Certificates, OD, Offer Letters, Other
 * - View upload history with download links
 * - Delete own documents
 */
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Upload, FileText, Trash2, Download, Loader2,
  FileBadge, FileCheck, FileSignature, File, Plus,
} from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';

const DOC_TYPES = [
  { value: 'CERTIFICATE',  label: 'Certificate',  icon: FileBadge,     color: 'brand'   },
  { value: 'OD',           label: 'OD Letter',    icon: FileCheck,     color: 'info'    },
  { value: 'OFFER_LETTER', label: 'Offer Letter', icon: FileSignature, color: 'success' },
  { value: 'OTHER',        label: 'Other',        icon: File,          color: 'default' },
];

function docMeta(type) {
  return DOC_TYPES.find((d) => d.value === type) || DOC_TYPES[3];
}

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_MB      = 10;

export default function StudentDocuments() {
  const [docs,     setDocs]     = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Upload form
  const [form,     setForm]     = useState({ docType: 'CERTIFICATE', title: '', description: '' });
  const [file,     setFile]     = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const fileRef = useRef(null);

  // Delete confirm
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  // Download busy
  const [downloading, setDownloading] = useState(null);

  function load() {
    setLoading(true);
    api.get('/student-docs/mine')
      .then((r) => setDocs(r.data.data || []))
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function pickFile(f) {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return toast.error('Only PDF, JPG, or PNG files are allowed.');
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      return toast.error(`File must be under ${MAX_MB} MB.`);
    }
    setFile(f);
  }

  async function onUpload(e) {
    e.preventDefault();
    if (!file)             return toast.error('Please select a file.');
    if (!form.title.trim()) return toast.error('Title is required.');

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file',        file);
      fd.append('docType',     form.docType);
      fd.append('title',       form.title.trim());
      fd.append('description', form.description.trim());

      await api.post('/student-docs', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded successfully.');
      setForm({ docType: 'CERTIFICATE', title: '', description: '' });
      setFile(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setSaving(false); }
  }

  async function download(doc) {
    setDownloading(doc._id);
    try {
      const r = await api.get(`/student-docs/${doc._id}/url`);
      window.open(r.data.data.url, '_blank');
    } catch { toast.error('Failed to get download link'); }
    finally { setDownloading(null); }
  }

  async function doDelete() {
    setDeleting(true);
    try {
      await api.delete(`/student-docs/${confirmDel._id}`);
      toast.success('Document deleted.');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText size={22} className="text-brand-600" /> My Documents
        </h1>
        <p className="text-sm text-slate-500">
          Upload your certificates, OD letters, offer letters and other documents.
          Allowed: PDF, JPG, PNG · Max {MAX_MB} MB.
        </p>
      </div>

      {/* ── Upload form ── */}
      <Card title={<span className="flex items-center gap-2"><Plus size={16} /> Upload Document</span>}>
        <form onSubmit={onUpload} className="space-y-4">
          {/* Doc type selector */}
          <div>
            <span className="label block mb-2">Document Type *</span>
            <div className="flex flex-wrap gap-2">
              {DOC_TYPES.map((t) => {
                const Icon = t.icon;
                const sel  = form.docType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, docType: t.value })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition ${
                      sel
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-brand-400'
                    }`}
                  >
                    <Icon size={14} /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <label className="block">
            <span className="label">Title *</span>
            <input
              className="input"
              placeholder="e.g. AWS Cloud Practitioner Certificate"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>

          {/* Description */}
          <label className="block">
            <span className="label">Description <span className="text-slate-400 font-normal">(optional)</span></span>
            <input
              className="input"
              placeholder="Any additional notes"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition ${
              dragOver ? 'border-brand-500 bg-brand-50' :
              file     ? 'border-green-400 bg-green-50' :
                         'border-slate-300 hover:border-brand-400'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
          >
            {file ? (
              <>
                <FileText size={28} className="text-green-600" />
                <p className="font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500">{fmtSize(file.size)} · click to change</p>
              </>
            ) : (
              <>
                <Upload size={28} className="text-slate-400" />
                <p className="text-slate-600 font-medium">Drop file here or click to browse</p>
                <p className="text-xs text-slate-400">PDF, JPG, PNG · max {MAX_MB} MB</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving || !file}>
              {saving
                ? <><Loader2 size={15} className="animate-spin" /> Uploading…</>
                : <><Upload size={15} /> Upload Document</>}
            </Button>
            {file && (
              <Button type="button" variant="secondary" onClick={() => setFile(null)}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* ── Upload history ── */}
      <Card title={`My Uploaded Documents (${docs.length})`}>
        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading…</p>
        ) : docs.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No documents uploaded yet.</p>
            <p className="text-sm text-slate-400 mt-1">Use the form above to upload your first document.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {docs.map((doc) => {
              const meta = docMeta(doc.docType);
              const Icon = meta.icon;
              return (
                <div key={doc._id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`p-2.5 rounded-lg shrink-0 ${
                    meta.color === 'brand'   ? 'bg-brand-50 text-brand-700' :
                    meta.color === 'info'    ? 'bg-sky-50 text-sky-700'     :
                    meta.color === 'success' ? 'bg-green-50 text-green-700' :
                                               'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{doc.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <Badge variant={meta.color}>{meta.label}</Badge>
                      <span className="text-xs text-slate-400">{doc.fileName}</span>
                      {doc.fileSize > 0 && (
                        <span className="text-xs text-slate-400">{fmtSize(doc.fileSize)}</span>
                      )}
                      <span className="text-xs text-slate-400">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {doc.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{doc.description}</p>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      onClick={() => download(doc)}
                      disabled={downloading === doc._id}
                    >
                      {downloading === doc._id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Download size={13} />}
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    <Button variant="danger" onClick={() => setConfirmDel(doc)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDel}
        title="Delete Document"
        message={`Delete "${confirmDel?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(null)}
        loading={deleting}
      />
    </div>
  );
}
