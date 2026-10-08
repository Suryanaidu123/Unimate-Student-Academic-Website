/**
 * Faculty — Student Documents
 * Visible only for years Admin has granted visibility.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, Download, Loader2, ShieldOff } from 'lucide-react';
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

export default function FacultyStudentDocuments() {
  const [docs,        setDocs]        = useState([]);
  const [allowedYears, setAllowedYears] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [noAccess,    setNoAccess]    = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [yearFilter,  setYearFilter]  = useState('');
  const [docType,     setDocType]     = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (yearFilter) params.set('year',    yearFilter);
    if (docType)    params.set('docType', docType);

    api.get(`/student-docs/faculty/list?${params.toString()}`)
      .then((r) => {
        setDocs(r.data.data.items || []);
        setAllowedYears(r.data.data.allowedYears || []);
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          setNoAccess(true);
        } else {
          toast.error('Failed to load documents');
        }
      })
      .finally(() => setLoading(false));
  }, [yearFilter, docType]);

  async function download(doc) {
    setDownloading(doc._id);
    try {
      const r = await api.get(`/student-docs/${doc._id}/url`);
      window.open(r.data.data.url, '_blank');
    } catch { toast.error('Failed to get download link'); }
    finally { setDownloading(null); }
  }

  if (loading) return <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>;

  if (noAccess) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText size={22} className="text-brand-600" /> Student Documents
          </h1>
        </div>
        <Card>
          <div className="flex items-start gap-4 py-4">
            <div className="p-3 bg-slate-100 rounded-xl shrink-0">
              <ShieldOff size={24} className="text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Access not granted</p>
              <p className="text-sm text-slate-500 mt-1">
                You have not been granted document visibility for any academic year.
                Contact Admin to request access.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText size={22} className="text-brand-600" /> Student Documents
        </h1>
        <p className="text-sm text-slate-500">
          Documents from students in{' '}
          {allowedYears.sort().map((y) => `${y} Year`).join(', ')}.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Year</span>
            <select className="input" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="">All Allowed Years</option>
              {allowedYears.sort().map((y) => (
                <option key={y} value={y}>{y} Year</option>
              ))}
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
        {docs.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No documents found.</p>
            <p className="text-sm text-slate-400 mt-1">Students haven't uploaded any documents yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100 text-left">
                  <th className="pb-2.5 pr-4">Student</th>
                  <th className="pb-2.5 pr-4">Year</th>
                  <th className="pb-2.5 pr-4">Document</th>
                  <th className="pb-2.5 pr-4">Type</th>
                  <th className="pb-2.5 pr-4">Uploaded</th>
                  <th className="pb-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => {
                  const meta = DOC_TYPE_LABELS[doc.docType] || DOC_TYPE_LABELS.OTHER;
                  return (
                    <tr key={doc._id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-slate-900 text-xs">{doc.studentId?.name || '—'}</p>
                        <p className="font-mono text-xs text-slate-500">{doc.studentId?.rollNumber}</p>
                      </td>
                      <td className="py-2.5 pr-4"><Badge variant="info">{doc.year} Year</Badge></td>
                      <td className="py-2.5 pr-4">
                        <p className="text-sm font-medium text-slate-800 truncate max-w-[160px]">{doc.title}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{doc.fileName}</p>
                      </td>
                      <td className="py-2.5 pr-4"><Badge variant={meta.color}>{meta.label}</Badge></td>
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
