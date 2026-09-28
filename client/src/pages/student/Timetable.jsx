import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';

const DAYS = ['MON','TUE','WED','THU','FRI','SAT'];

export default function StudentTimetable() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/timetable/my').then((r) => setItems(r.data.data)); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Weekly Timetable</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {DAYS.map((day) => (
          <Card key={day} title={day} className="!p-4">
            <ul className="space-y-2">
              {items.filter((i) => i.day === day).map((s) => (
                <li key={s._id} className="text-xs border-l-2 border-brand-500 pl-2">
                  <p className="font-semibold">{s.subjectId?.subjectCode}</p>
                  <p className="text-slate-500">{s.startTime}–{s.endTime}</p>
                  <p className="text-slate-400">Room {s.room}</p>
                </li>
              ))}
              {items.filter((i) => i.day === day).length === 0 && <li className="text-xs text-slate-400">—</li>}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}