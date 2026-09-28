import { useEffect, useState } from 'react';
import { Users, UserCheck, BookOpen, Layers } from 'lucide-react';
import api from '../../services/api.js';
import StatCard from '../../components/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';

export default function AdminDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/dashboard/admin').then((r) => setD(r.data.data)); }, []);
  if (!d) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Students" value={d.totalStudents} color="brand" />
        <StatCard icon={UserCheck} label="Total Faculty" value={d.totalFaculty} color="green" />
        <StatCard icon={BookOpen} label="Total Subjects" value={d.totalSubjects} color="amber" />
        <StatCard icon={Layers} label="Sections" value={d.totalSections} color="blue" />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="2nd Year" value={d.secondYear} color="brand" />
        <StatCard label="3rd Year" value={d.thirdYear} color="green" />
        <StatCard label="4th Year" value={d.fourthYear} color="amber" />
      </div>
      <Card title="Recent Activity">
        <ul className="divide-y divide-slate-100 text-sm">
          {d.recentActivity.map((a) => (
            <li key={a._id} className="py-2 flex justify-between">
              <span>{a.description || a.action}</span>
              <span className="text-slate-400">{new Date(a.createdAt).toLocaleString()}</span>
            </li>
          ))}
          {d.recentActivity.length === 0 && <li className="py-2 text-slate-500">No activity yet.</li>}
        </ul>
      </Card>
    </div>
  );
}