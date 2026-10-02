import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, ExternalLink, Inbox, BookOpen, FlaskConical } from 'lucide-react';
import api from '../../services/api.js';
import { useBadges } from '../../context/BadgeContext.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

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

function sectionsFor(type) {
  return type === 'LAB' ? LAB_SECTIONS : THEORY_SECTIONS;
}

export default function StudentMaterials() {
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const token = localStorage.getItem('unimate_token');
const { markRead } = useBadges();
useEffect(() => { markRead('materials'); }, [markRead]);
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

  const profile = me?.profile;

  const mySubjects = useMemo(() => {
    if (!profile) return [];
    return subjects
      .filter((s) => s.year === profile.year && s.semester === profile.semester)
      .sort((a, b) => {
        const rank = (s) => (s.type === 'LAB' ? 1 : 0);
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
        return String(a.subjectCode).localeCompare(String(b.subjectCode));
      });
  }, [subjects, profile]);

  const materialsBySubjectSection = useMemo(() => {
    const map = {};
    items.forEach((m) => {
      const sid = m.subjectId?._id || m.subjectId;
      if (!sid) return;
      map[sid] = map[sid] || {};
      map[sid][m.section] = m;
    });
    return map;
  }, [items]);

  const viewUrl = (id) =>
    `${import.meta.env.VITE_API_URL}/materials/${id}/download?token=${encodeURIComponent(token)}`;

  const dlUrl = (id) =>
    `${import.meta.env.VITE_API_URL}/materials/${id}/download?mode=download&token=${encodeURIComponent(token)}`;

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Academic Materials</h1>
        <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>
      </div>
    );
  }

  if (mySubjects.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Academic Materials</h1>
        {profile && (
          <p className="text-sm text-slate-500">
            {profile.year === 2 ? '2nd' : profile.year === 3 ? '3rd' : '4th'} Year ·
            Semester {profile.semester}
          </p>
        )}
        <Card>
          <div className="text-center py-12">
            <Inbox size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No subjects configured</p>
            <p className="text-sm text-slate-400 mt-1">
              Your semester's subjects haven't been set up yet.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const filteredSubjects = selectedSubjectId
    ? mySubjects.filter((s) => s._id === selectedSubjectId)
    : mySubjects;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Academic Materials</h1>
        {profile && (
          <p className="text-sm text-slate-500">
            {profile.year === 2 ? '2nd' : profile.year === 3 ? '3rd' : '4th'} Year ·
            Semester {profile.semester} · Section {profile.section}
          </p>
        )}
      </div>

      {/* Filters */}
      <Card title="Filters">
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Subject</span>
            <select className="input" value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedSection('');
              }}>
              <option value="">All subjects</option>
              {mySubjects.map((s) => (
                <option key={s._id} value={s._id}>
                  [{s.type || 'THEORY'}] {s.subjectCode} — {s.subjectName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Unit / Section</span>
            <select className="input" value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}>
              <option value="">All sections</option>
              {THEORY_SECTIONS.concat(LAB_SECTIONS).map((sec) => (
                <option key={sec.key} value={sec.key}>{sec.label}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {/* Subjects + section grid */}
      {filteredSubjects.map((subject) => {
        const isLab = subject.type === 'LAB';
        const sections = sectionsFor(subject.type);
        const sectionMaterials = materialsBySubjectSection[subject._id] || {};

        const visibleSections = selectedSection
          ? sections.filter((s) => s.key === selectedSection)
          : sections;

        if (visibleSections.length === 0) return null;

        return (
          <Card key={subject._id}>
            <div className="flex items-center gap-2 mb-3">
              {isLab ? <FlaskConical size={18} className="text-amber-600" /> : <BookOpen size={18} className="text-brand-600" />}
              <h2 className="font-semibold text-slate-900">
                {subject.subjectCode} — {subject.subjectName}
              </h2>
              <Badge variant={isLab ? 'warning' : 'brand'}>{subject.type || 'THEORY'}</Badge>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 ${isLab ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-3`}>
              {visibleSections.map((sec) => {
                const m = sectionMaterials[sec.key];
                return (
                  <div
                    key={sec.key}
                    className={`rounded-lg border p-3 ${
                      m ? 'bg-white border-slate-200 hover:bg-slate-50 transition' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        m ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-700">{sec.label}</p>

                        {m ? (
                          <>
                            <p className="font-medium text-slate-900 text-sm truncate" title={m.title}>
                              {m.title}
                            </p>
                            {m.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{m.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <a href={viewUrl(m._id)} target="_blank" rel="noreferrer"
                                 className="text-brand-600 hover:underline inline-flex items-center gap-1">
                                <ExternalLink size={11} /> View
                              </a>
                              <a href={dlUrl(m._id)}
                                 className="text-brand-600 hover:underline inline-flex items-center gap-1">
                                <Download size={11} /> Download
                              </a>
                              <span className="text-slate-400 ml-auto">
                                {Math.round(m.fileSize / 1024)} KB
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-slate-400 italic mt-1">
                            Material not available
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}