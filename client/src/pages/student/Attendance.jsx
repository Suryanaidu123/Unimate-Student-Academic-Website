import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardCheck, AlertTriangle } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function StudentAttendance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/attendance/my')
      .then((r) => setData(r.data.data))
      .catch(() => toast.error('Failed to load attendance'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>;
  if (!data) return null;

  const { overall, subjects, recent } = data;
  const red = overall.belowThreshold;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ClipboardCheck size={22} /> Attendance
      </h1>

      {/* Overall */}
      <Card title="Overall Attendance">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-slate-500">Held</p>
            <p className="text-2xl font-bold">{overall.held}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-slate-500">Attended</p>
            <p className="text-2xl font-bold">{overall.attended}</p>
          </div>
          <div className={`rounded-lg border p-3 ${red ? 'bg-red-50 border-red-200' : ''}`}>
            <p className="text-xs text-slate-500">Percentage</p>
            <p className={`text-2xl font-bold ${red ? 'text-red-600' : 'text-green-600'}`}>
              {overall.percentage}%
            </p>
          </div>
        </div>
        {red && (
          <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <p>Your attendance is below 75%. Please attend classes regularly.</p>
          </div>
        )}
      </Card>

      {/* Per subject */}
      <Card title="Subject-wise">
        {subjects.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No attendance records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2">Subject</th>
                  <th className="py-2">Held</th>
                  <th className="py-2">Attended</th>
                  <th className="py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.subjectId} className="border-b border-slate-100">
                    <td className="py-2">
                      {s.subjectCode} — {s.subjectName}
                    </td>
                    <td className="py-2">{s.held}</td>
                    <td className="py-2">{s.attended}</td>
                    <td className={`py-2 font-semibold ${s.belowThreshold ? 'text-red-600' : 'text-green-600'}`}>
                      {s.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent */}
      <Card title="Recent Sessions">
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No recent records.</p>
        ) : (
          <ul className="space-y-2">
            {recent.slice(0, 10).map((r) => (
              <li key={r._id} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100 last:border-b-0">
                <div>
                  <p className="font-medium">{r.subjectId?.subjectCode}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(r.date).toLocaleDateString()} · {r.periodsCount} period(s)
                  </p>
                </div>
                <Badge variant={r.status === 'PRESENT' ? 'success' : 'danger'}>
                  {r.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}