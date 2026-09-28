import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';

export default function StudentNotes() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/notes').then((r) => setItems(r.data.data.items)); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notes</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((n) => (
          <Card key={n._id} title={n.title} subtitle={n.subjectId?.subjectName}>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.content}</p>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500">No notes published yet.</p>}
      </div>
    </div>
  );
}