import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import { useBadges } from '../../context/BadgeContext.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function StudentAssignments() {
  const [items, setItems] = useState([]);
  const { markRead } = useBadges();
useEffect(() => { markRead('assignments'); }, [markRead]);
  useEffect(() => { api.get('/assignments').then((r) => setItems(r.data.data.items)); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Assignments</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((a) => (
          <Card key={a._id}>
            <div className="flex justify-between">
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-xs text-slate-500">{a.subjectId?.subjectName}</p>
              </div>
              <Badge variant={a.priority === 'HIGH' ? 'danger' : a.priority === 'MEDIUM' ? 'warning' : 'info'}>
                {a.priority}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mt-2">{a.description}</p>
            <div className="flex justify-between mt-3 text-xs text-slate-500">
              <span>Due: {new Date(a.dueDate).toLocaleString()}</span>
              <span>Max: {a.maximumMarks}</span>
            </div>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500">No assignments.</p>}
      </div>
    </div>
  );
}