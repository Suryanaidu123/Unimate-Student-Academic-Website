import { useEffect, useState } from 'react';
import { BookOpen, ClipboardList, GraduationCap, Bell, FlaskConical } from 'lucide-react';
import api from '../../services/api.js';
import StatCard from '../../components/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ActivityMarquee from '../../components/ActivityMarquee.jsx';

export default function StudentDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/dashboard/student').then((r) => setD(r.data.data)); }, []);
  if (!d) return <div>Loading…</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Running announcement ticker */}
      <div className="overflow-hidden">
        <ActivityMarquee
          apiUrl="/activities/student/active"
          navigateTo="/student/activities"
          showEmpty={true}
        />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hi, {d.student.name} 👋</h1>
        <p className="text-sm text-slate-500">
          Roll {d.student.rollNumber} · Year {d.student.year} · Sem {d.student.semester} · AY {d.student.academicYear}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen}     label="Subjects"              value={d.subjects.length} color="brand" />
        <StatCard icon={FlaskConical} label="Labs"                  value={d.labs.length}     color="amber" />
        <StatCard icon={GraduationCap} label="Marks Records"        value={d.marks.length}    color="green" />
        <StatCard icon={Bell}         label="Unread Notifications"  value={d.unread}          color="red" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Upcoming Assignments">
          {d.assignments.length === 0 ? <p className="text-sm text-slate-500">No upcoming assignments.</p> :
            <ul className="space-y-3">
              {d.assignments.map((a) => (
                <li key={a._id} className="flex justify-between border-b border-slate-100 pb-2">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.subjectId?.subjectName}</p>
                  </div>
                  <Badge variant="warning">Due {new Date(a.dueDate).toLocaleDateString()}</Badge>
                </li>
              ))}
            </ul>
          }
        </Card>

        <Card title="Upcoming Exams">
          {d.exams.length === 0 ? <p className="text-sm text-slate-500">No upcoming exams.</p> :
            <ul className="space-y-3">
              {d.exams.map((e) => (
                <li key={e._id} className="flex justify-between border-b border-slate-100 pb-2">
                  <div>
                    <p className="font-medium">{e.examName}</p>
                    <p className="text-xs text-slate-500">{e.subjectId?.subjectName} · {e.startTime}–{e.endTime}</p>
                  </div>
                  <Badge variant="info">{new Date(e.date).toLocaleDateString()}</Badge>
                </li>
              ))}
            </ul>
          }
        </Card>
      </div>
    </div>
  );
}