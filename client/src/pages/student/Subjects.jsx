import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function StudentSubjects() {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    api.get('/auth/me').then((r) => {
      const year = r.data.data.profile?.year;
      return api.get(`/subjects?year=${year}&limit=100`);
    }).then((r) => setSubjects(r.data.data.items));
  }, []);

  // Guarantee theory-first ordering on the client as a safety net
  const ordered = [...subjects].sort((a, b) => {
    const rank = (s) => (s.type === 'LAB' ? 1 : 0);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return String(a.subjectCode).localeCompare(String(b.subjectCode));
  });

  const theory = ordered.filter((s) => s.type !== 'LAB');
  const labs = ordered.filter((s) => s.type === 'LAB');

  const Section = ({ title, list, variant }) => (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-700">{title} ({list.length})</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((s) => (
          <Card key={s._id}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono text-slate-500">{s.subjectCode}</p>
                <h3 className="font-semibold mt-1">{s.subjectName}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {s.credits} credits · Year {s.year}
                </p>
                {s.facultyId && (
                  <p className="text-xs text-slate-500 mt-1">
                    Faculty: {s.facultyId.name}
                  </p>
                )}
              </div>
              <Badge variant={variant}>{s.type || 'THEORY'}</Badge>
            </div>
          </Card>
        ))}
        {list.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Subjects</h1>
      <Section title="Theory Subjects" list={theory} variant="brand" />
      <Section title="Labs" list={labs} variant="warning" />
    </div>
  );
}