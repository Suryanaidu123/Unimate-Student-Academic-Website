import { useEffect, useState } from 'react';
import { BookOpen, FlaskConical } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function StudentSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/auth/me').then((r) => {
      const year = r.data.data.profile?.year;
      // Exclude ACTIVITY type — activities live in the dedicated Activities section
      return api.get(`/subjects?year=${year}&limit=200&excludeActivities=true`);
    })
      .then((r) => setSubjects(r.data.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const theory = subjects.filter((s) => s.type === 'THEORY');
  const labs   = subjects.filter((s) => s.type === 'LAB');

  function SubjectSection({ icon: Icon, iconClass, title, list, variant }) {
    return (
      <Card
        title={
          <span className="flex items-center gap-2">
            <Icon size={18} className={iconClass} />
            {title} ({list.length})
          </span>
        }
      >
        {list.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">None yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map((s) => (
              <div key={s._id} className="border border-slate-200 rounded-xl p-3 bg-white hover:border-slate-300 transition">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-slate-400">{s.subjectCode}</p>
                    <h3 className="font-semibold mt-1 text-slate-900 leading-tight">{s.subjectName}</h3>
                    {s.type === 'THEORY' && (
                      <p className="text-xs text-slate-500 mt-1">{s.credits || 0} credits</p>
                    )}
                    {s.facultyId?.name && (
                      <p className="text-xs text-slate-500 mt-0.5">Faculty: {s.facultyId.name}</p>
                    )}
                  </div>
                  <Badge variant={variant} className="shrink-0">{s.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }

  if (loading) return <Card><p className="text-sm text-slate-500 py-6 text-center">Loading…</p></Card>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">My Subjects</h1>

      <SubjectSection
        icon={BookOpen}
        iconClass="text-brand-600"
        title="Subjects"
        list={theory}
        variant="brand"
      />
      <SubjectSection
        icon={FlaskConical}
        iconClass="text-amber-600"
        title="Labs"
        list={labs}
        variant="warning"
      />
    </div>
  );
}
