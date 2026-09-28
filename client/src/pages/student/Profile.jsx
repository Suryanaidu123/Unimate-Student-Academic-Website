import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';

export default function Profile() {
  const [me, setMe] = useState(null);
  useEffect(() => { api.get('/auth/me').then((r) => setMe(r.data.data)); }, []);
  if (!me) return <div>Loading…</div>;
  const p = me.profile || {};
  const rows = [
    ['Name', p.name], ['Roll Number', p.rollNumber], ['Email', p.email],
    ['Department', p.department], ['Course', p.course], ['Batch', p.batch],
    ['Academic Year', p.academicYear], ['Year', p.year], ['Semester', p.semester],
    ['Section', p.section],
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <Card>
        <dl className="divide-y divide-slate-100">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 py-3 text-sm">
              <dt className="text-slate-500">{k}</dt>
              <dd className="col-span-2 font-medium">{v || '—'}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}