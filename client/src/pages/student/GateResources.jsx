import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BookMarked, FileText, Download } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function StudentGateResources() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    api.get('/gate-resources/student')
      .then((r) => setItems(r.data.data.items || []))
      .catch(() => toast.error('Failed to load resources'))
      .finally(() => setLoading(false));
  }, []);

  async function download(item) {
    setDownloading(item._id);
    try {
      const r = await api.get(`/gate-resources/${item._id}/download`);
      window.open(r.data.data.url, '_blank');
    } catch { toast.error('Failed to get download link'); }
    finally { setDownloading(null); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookMarked size={22} className="text-brand-600" /> GATE Resources
        </h1>
        <p className="text-sm text-slate-500">Study materials uploaded by faculty for GATE preparation.</p>
      </div>

      {loading ? (
        <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <BookMarked size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No resources available yet.</p>
            <p className="text-sm text-slate-400 mt-1">Check back later.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item._id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 hover:border-brand-300 transition">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-brand-50 text-brand-700 rounded-lg shrink-0">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 leading-tight">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-3">{item.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
                    {item.fileSize > 0 && <span>{fmtSize(item.fileSize)}</span>}
                    <span>{fmtDate(item.createdAt)}</span>
                    {item.facultyId?.name && <span>by {item.facultyId.name}</span>}
                  </div>
                </div>
              </div>
              {item.fileKey && (
                <Button
                  variant="secondary"
                  className="w-full justify-center"
                  onClick={() => download(item)}
                  disabled={downloading === item._id}
                >
                  <Download size={14} />
                  {downloading === item._id ? 'Getting link…' : 'Download'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
