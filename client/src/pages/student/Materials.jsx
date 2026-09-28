import { useEffect, useState } from 'react';
import { Download, FileText, ExternalLink, Inbox } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';

export default function StudentMaterials() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Read JWT once so we can append it to browser-native download links
  const token = localStorage.getItem('unimate_token');

  useEffect(() => {
    api.get('/materials')
      .then((r) => setItems(r.data.data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // Browser-opened tabs can't send Authorization headers, so pass token as query param
  const viewUrl = (id) =>
    `${import.meta.env.VITE_API_URL}/materials/${id}/download?token=${encodeURIComponent(token)}`;

  const dlUrl = (id) =>
    `${import.meta.env.VITE_API_URL}/materials/${id}/download?mode=download&token=${encodeURIComponent(token)}`;

  // Split theory vs lab for clarity
  const theory = items.filter((m) => (m.subjectId?.type || 'THEORY') !== 'LAB');
  const labs = items.filter((m) => m.subjectId?.type === 'LAB');

  const MaterialGrid = ({ list, title }) => (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-700">
        {title} ({list.length})
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((m) => (
          <Card key={m._id}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-brand-50 text-brand-700 shrink-0">
                <FileText size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <a
                  href={viewUrl(m._id)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-slate-900 hover:text-brand-600 truncate block"
                  title="View PDF"
                >
                  {m.title}
                </a>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {m.subjectId?.subjectCode} — {m.subjectId?.subjectName}
                </p>
                {m.description && (
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                    {m.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs">
                  <a
                    href={viewUrl(m._id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> View
                  </a>
                  <a
                    href={dlUrl(m._id)}
                    className="text-brand-600 hover:underline flex items-center gap-1"
                  >
                    <Download size={12} /> Download
                  </a>
                  <span className="text-slate-400 ml-auto">
                    {Math.round(m.fileSize / 1024)} KB
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {list.length === 0 && (
          <p className="text-sm text-slate-500 col-span-3 py-4">
            No {title.toLowerCase()} yet.
          </p>
        )}
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Academic Materials</h1>
        <p className="text-sm text-slate-500">
          PDF notes and materials shared by your faculty.
        </p>
      </div>

      {loading ? (
        <Card>
          <p className="text-sm text-slate-500 py-8 text-center">Loading…</p>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Inbox size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No materials yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Check back later — your faculty will upload PDFs here.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <MaterialGrid list={theory} title="Theory Materials" />
          <MaterialGrid list={labs} title="Lab Materials" />
        </>
      )}
    </div>
  );
}