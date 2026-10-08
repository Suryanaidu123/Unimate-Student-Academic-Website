/**
 * Admin — Student Documents
 * View all uploaded student documents with filters.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, Search, Download, Loader2, Filter } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

const DOC_TYPE_LABELS = {
  CERTIFICATE:  { label: 'Certificate',  color: 'brand'   },
  OD:           { label: 'OD Letter',    color: 'info'    },
  OFFER_LETTER: { label: 'Offer Letter', color: 'success' },
  OTHER:        { label: 'Other',        color: 'default' },
};

function fmtSize(b) {
  if (!b) return '';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminStudentDocuments() {
  const [docs,        setDocs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(null);

  // Filters
  const [q,       setQ]       = useState('');
  const [year,    setYear]    = useState('');
  const [docType, setDocType] = useState('');

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ limit: '200' });
    if (year)    params.set('year',    year);
    if (docType) params.set('docType', docType);
    api.get(`/student-docs?${params.toString()}`)
      .then((r) => setDocs(r.data.data.items || []))
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [year, docType]);

  const filtered = q
    ? docs.filter((d) => {
        const roll = (d.studentId?.rollNumber || '').toLowerCase();
        const name = (d.studentId?.name || '').toLowerCase();
        const title = (d.title || '').toLowerCase();
        const s = q.toLowerCase();
        return roll.includes(s) || name.includes(s) || title.includes(s);
      })
    : docs;

  async function download(doc) {
    setDownloading(doc._id);
    try {
      const r = await api.get(`/student-docs/${doc._id}/url`);
      window.open(r.data.data.url, '_blank');
    } catch { toast.error('Failed to get download link'); }
    finally { setDownloading(null); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText size={22} className="text-brand-600" /> Student Documents
        </h1>
        <p className="text-sm text-slate-500">
          View all documents uploaded by students — certificates, OD letters, offer letters.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <label className="block">
            <span className="label">Search</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9 w-full"
                placeholder="Student name, roll no, or title…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </label>
          <label className="block">
            <span className="label">Year</span>
            <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">All Years</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Document Type</span>
            <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="">All Types</option>
              {Object.entries(DOC_TYPE_LABELS).map(([v, m]) => (
                <option key={v} value={v}>{m.label}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {/* Document list */}
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No documents found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100 text-left">
                  <th className="pb-2.5 pr-4">Student</th>
                  <th className="pb-2.5 pr-4">Year</th>
                  <th className="pb-2.5 pr-4">Document</th>
                  <th className="pb-2.5 pr-4">Type</th>
                  <th className="pb-2.5 pr-4">Size</th>
                  <th className="pb-2.5 pr-4">Uploaded</th>
                  <th className="pb-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const meta = DOC_TYPE_LABELS[doc.docType] || DOC_TYPE_LABELS.OTHER;
                  return (
                    <tr key={doc._id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-slate-900 text-xs">
                          {doc.studentId?.name || '—'}
                        </p>
                        <p className="font-mono text-xs text-slate-500">
                          {doc.studentId?.rollNumber || '—'}
                        </p>
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="info">{doc.year} Year</Badge>
                      </td>
                      <td className="py-2.5 pr-4">
                        <p className="text-sm text-slate-800 font-medium truncate max-w-[160px]">
                          {doc.title}
                        </p>
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">
                          {doc.fileName}
                        </p>
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={meta.color}>{meta.label}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-400">
                        {fmtSize(doc.fileSize)}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-400">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
