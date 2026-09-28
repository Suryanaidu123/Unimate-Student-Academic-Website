import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function FacultySubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // /lookup/subjects returns exactly the subjects assigned to this faculty,
    // across all years. It's the source of truth for "my subjects".
    api.get('/lookup/subjects')
      .then((r) => {
        const list = [...(r.data.data || [])];
        // Group: THEORY first, then LAB; alphabetically inside each group
        list.sort((a, b) => {
          const rank = (s) => (s.type === 'LAB' ? 1 : 0);
          if (rank(a) !== rank(b)) return rank(a) - rank(b);
          return String(a.subjectCode).localeCompare(String(b.subjectCode));
        });
        setSubjects(list);
      })
      .catch(() => setSubjects([]))
      .finally(() => setLoading(false));
  }, []);

  const theory = subjects.filter((s) => s.type !== 'LAB');
  const labs = subjects.filter((s) => s.type === 'LAB');

  const Section = ({ title, list, variant }) => (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-700">
        {title} ({list.length})
      </h2>
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
              </div>
              <Badge variant={variant}>{s.type || 'THEORY'}</Badge>
            </div>
          </Card>
        ))}
        {list.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
      </div>
    </div>
  );

  if (loading) return <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Subjects</h1>
        <p className="text-sm text-slate-500">
          Only subjects assigned to you by the admin are listed here.
        </p>
      </div>
      <Section title="Theory Subjects" list={theory} variant="brand" />
      <Section title="Labs" list={labs} variant="warning" />
    </div>
  );
}