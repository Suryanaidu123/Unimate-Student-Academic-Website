import { useEffect, useState } from 'react';
import { Calendar, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBadges } from '../../context/BadgeContext.jsx';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

function to12h(t) {
  if (!t) return '';
  const [hh, mm] = String(t).split(':').map(Number);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`;
}

export default function StudentExams() {
  const [items, setItems] = useState([]);
  const [examNotifications, setExamNotifications] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
const { markRead } = useBadges();
useEffect(() => { markRead('exams'); }, [markRead]);
  useEffect(() => {
    Promise.all([
      api.get('/exams'),
      api.get('/auth/me'),
      api.get('/notifications/exam-notifications'),
    ])
      .then(([eRes, mRes, nRes]) => {
        setItems(eRes.data.data || []);
        setMe(mRes.data.data);
        setExamNotifications(nRes.data.data?.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const profile = me?.profile;

  const columns = [
    { key: 'examName', label: 'Exam' },
    { key: 'subject', label: 'Subject', render: (r) => r.subjectId?.subjectName || '—' },
    { key: 'examType', label: 'Type', render: (r) => <Badge>{r.examType}</Badge> },
    { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'time', label: 'Time', render: (r) => `${to12h(r.startTime)} – ${to12h(r.endTime)}` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar size={22} /> Exams
          </h1>
          {profile && (
            <p className="text-sm text-slate-500">
              {profile.year === 2 ? '2nd' : profile.year === 3 ? '3rd' : '4th'} Year ·
              Semester {profile.semester}
            </p>
          )}
        </div>
        <Link to="/student/notifications" className="text-sm text-brand-600 hover:underline">
          View all notifications →
        </Link>
      </div>

      {/* Exam notification banners */}
      {examNotifications.length > 0 && (
        <div className="space-y-2">
          {examNotifications.slice(0, 3).map((n) => (
            <div key={n._id} className="bg-brand-50 border-l-4 border-brand-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-brand-600 text-white rounded-lg shrink-0">
                  <Bell size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{n.title}</p>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 py-8 text-center">
            No exams scheduled for your semester yet.
          </p>
        </Card>
      ) : (
        <Card><Table columns={columns} data={items} /></Card>
      )}
    </div>
  );
}