import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function StudentExams() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/exams').then((r) => setItems(r.data.data)); }, []);

  const columns = [
    { key: 'examName', label: 'Exam' },
    { key: 'subject', label: 'Subject', render: (r) => r.subjectId?.subjectName },
    { key: 'type', label: 'Type', render: (r) => <Badge>{r.examType}</Badge> },
    { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
    { key: 'time', label: 'Time', render: (r) => `${r.startTime}–${r.endTime}` },
    { key: 'room', label: 'Room' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Exams</h1>
      <Card><Table columns={columns} data={items} /></Card>
    </div>
  );
}