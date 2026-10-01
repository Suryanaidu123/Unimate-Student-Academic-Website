import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, ExternalLink, Inbox, ChevronRight } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

const UNITS = [1, 2, 3, 4, 5];

export default function StudentMaterials() {
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');  // '' = all units

  const token = localStorage.getItem('unimate_token');

  useEffect(() => {
    Promise.all([
      api.get('/materials'),
      api.get('/subjects?limit=200'),
      api.get('/auth/me'),
    ])
      .then(([mRes, sRes, meRes]) => {
        setItems(mRes.data.data.items || []);
        setSubjects(sRes.data.data.items || []);
        setMe(meRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Subjects belonging to the student's own semester
  const mySubjects = useMemo(() => {
    const profile = me?.profile;
    if (!profile) return [];
    return subjects
      .filter((s) => s.year === profile.year && s.semester === profile.semester)
      .sort((a, b) => {
        const rank = (s) => (s.type === 'LAB' ? 1 : 0);
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
        return String(a.subjectCode).localeCompare(String(b.subjectCode));
      });
  }, [subjects, me]);

  // Materials filtered by selected subject + unit
  const filtered = useMemo(() => {
    return items.filter((m) => {
      const sid = m.subjectId?._id || m.subjectId;
      if (selectedSubjectId && sid !== selectedSubjectId) return false;
      if (selectedUnit && Number(m.unit) !== Number(selectedUnit)) return false;
      return true;
    });
  }, [items, selectedSubjectId, selectedUnit]);

  const viewUrl = (id) =>
    `${import.meta.env.VITE_API_URL}/materials/${id}/download?token=${encodeURIComponent(token)}`;

  const dlUrl = (id) =>
    `${import.meta.env.VITE_API_URL}/materials/${id}/download?mode=download&token=${encodeURIComponent(token)}`;

  // Group filtered materials by subject → unit
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((m) => {
      const sid = m.subjectId?._id || m.subjectId;
      if (!sid) return;
      map[sid] = map[sid] || {};
      map[sid][m.unit] = m;
    });
    return map;
  }, [filtered]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Academic Materials</h1>
        <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>
      </div>
    );
  }

  const profile = me?.profile;

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academic Materials</h1>
          {profile && (
            <p className="text-sm text-slate-500">
              {profile.year === 2 ? '2nd' : profile.year === 3 ? '3rd' : '4th'} Year ·
              Semester {profile.semester}
            </p>
          )}
        </div>
        <Card>
          <div className="text-center py-12">
            <Inbox size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No materials yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Check back later — your faculty will upload PDFs here.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Academic Materials</h1>
        {profile && (
          <p className="text-sm text-slate-500">
            {profile.year === 2 ? '2nd' : profile.year === 3 ? '3rd' : '4th'} Year ·
            Semester {profile.semester} · {profile.section}
          </p>
        )}
      </div>

      {/* Filters: Subject + Unit */}
      <Card title="Filters">
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Subject</span>
            <select
              className="input"
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedUnit('');
              }}
            >
              <option value="">All subjects</option>
              {mySubjects.map((s) => (
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
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
            >
              <option value="">All units</option>
              {UNITS.map((u) => <option key={u} value={u}>Unit {u}</option>)}
            </select>
          </label>
        </div>
      </Card>

      {/* Material cards */}
      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 py-8 text-center">
            No PDFs match the current filters.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {mySubjects
            .filter((s) => grouped[s._id])
            .map((subject) => (
              <Card key={subject._id}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-semibold text-slate-900">
                    {subject.subjectCode} — {subject.subjectName}
                  </h2>
                  <Badge variant={subject.type === 'LAB' ? 'warning' : 'brand'}>
                    {subject.type || 'THEORY'}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {UNITS.map((unit) => {
                    const m = grouped[subject._id]?.[unit];
                    if (!m) return null;
                    return (
                      <div key={unit} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-brand-50 text-brand-700 shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-brand-700">
                              Unit {unit}
                            </p>
                            <p className="font-medium text-slate-900 text-sm truncate" title={m.title}>
                              {m.title}
                            </p>
                            {m.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {m.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <a
                                href={viewUrl(m._id)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-600 hover:underline inline-flex items-center gap-1"
                              >
                                <ExternalLink size={11} /> View
                              </a>
                              <a
                                href={dlUrl(m._id)}
                                className="text-brand-600 hover:underline inline-flex items-center gap-1"
                              >
                                <Download size={11} /> Download
                              </a>
                              <span className="text-slate-400 ml-auto">
                                {Math.round(m.fileSize / 1024)} KB
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}