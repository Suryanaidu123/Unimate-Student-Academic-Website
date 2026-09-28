import { useEffect, useState } from 'react';
import { BookOpen, Users, ClipboardList, Bell } from 'lucide-react';
import api from '../../services/api.js';
import StatCard from '../../components/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function FacultyDashboard() {
  const [d, setD] = useState(null);

  useEffect(() => {
    api.get('/dashboard/faculty').then((r) => setD(r.data.data));
  }, []);

  if (!d) return <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {d.faculty.name}</h1>
        <p className="text-sm text-slate-500">
          Employee ID: {d.faculty.employeeId} · {d.faculty.designation}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Assigned Subjects"
          value={d.subjects.length}
          color="brand"
        />
        <StatCard
          icon={Users}
          label="My Students"
          value={d.studentCount}
          color="green"
        />
        <StatCard
          icon={ClipboardList}
          label="Assignments"
          value={d.assignments.length}
          color="amber"
        />
        <StatCard
          icon={Bell}
          label="Unread"
          value={d.unread}
          color="red"
        />
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