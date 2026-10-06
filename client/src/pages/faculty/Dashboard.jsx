import { useEffect, useState } from 'react';
import { BookOpen, Users, ClipboardList, Bell } from 'lucide-react';
import api from '../../services/api.js';
import StatCard from '../../components/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ActivityMarquee from '../../components/ActivityMarquee.jsx';

const TYPES_WITH_OPTIONS = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SURVEY'];

export default function FacultyDashboard() {
  const [d, setD]                 = useState(null);
  const [resultMap, setResultMap] = useState({});

  useEffect(() => {
    api.get('/dashboard/faculty').then((r) => setD(r.data.data));
  }, []);

  // Build resultMap from /activities/faculty/active — server returns full responses + options
  useEffect(() => {
    api.get('/activities/faculty/active')
      .then((r) => {
        const data = r.data.data || [];
        const map = {};
        data.forEach((a) => {
          if (!TYPES_WITH_OPTIONS.includes(a.type)) return;
          const counts = {};
          (a.options || []).forEach((o) => { counts[o.label || o] = 0; });
          (a.responses || []).forEach((resp) => {
            (resp.choices || []).forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
          });
          if (Object.keys(counts).length > 0) {
            map[String(a._id)] = Object.entries(counts)
              .map(([k, v]) => `${k}: ${v}`).join(' | ');
          }
        });
        setResultMap(map);
      })
      .catch(() => {});
  }, []);

  if (!d) return <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>;

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Running announcement ticker — hidden when no active faculty announcements */}
      <ActivityMarquee
        apiUrl="/activities/faculty/active"
        navigateTo="/faculty/activities"
        resultMap={resultMap}
        tickerLabel="Announcement Results"
        showEmpty={false}
      />

      <div>
        <h1 className="text-2xl font-bold">Welcome, {d.faculty.name}</h1>
        <p className="text-sm text-slate-500">
          Employee ID: {d.faculty.employeeId} · {d.faculty.designation}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen}     label="Assigned Subjects" value={d.subjects.length}  color="brand" />
        <StatCard icon={Users}        label="My Students"       value={d.studentCount}     color="green" />
        <StatCard icon={ClipboardList} label="Assignments"      value={d.assignments.length} color="amber" />
        <StatCard icon={Bell}         label="Unread"            value={d.unread}            color="red" />
      </div>

      <Card title="Assigned Subjects">
        {d.subjects.length === 0 ? (
          <p className="text-sm text-slate-500">
            No subjects assigned yet — ask admin to assign you.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {d.subjects.map((s) => (
              <li key={s._id} className="py-2 flex justify-between items-center">
                <div>
                  <span className="font-medium">{s.subjectCode}</span>
                  <span className="text-slate-500"> — {s.subjectName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant={s.type === 'LAB' ? 'warning' : 'brand'}>
                    {s.type || 'THEORY'}
                  </Badge>
                  <span className="text-slate-500">Year {s.year}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Assigned Academic Years">
        {(d.years || []).length === 0 ? (
          <p className="text-sm text-slate-500">No academic years assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {d.years.map((y) => (
              <Badge key={y} variant="info">Year {y}</Badge>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
