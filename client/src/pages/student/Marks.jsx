import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import { useBadges } from '../../context/BadgeContext.jsx';
import Card from '../../components/ui/Card.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function StudentMarks() {
  const [rows, setRows] = useState([]);
  const { markRead } = useBadges();
useEffect(() => { markRead('marks'); }, [markRead]);
  useEffect(() => { api.get('/marks/my').then((r) => setRows(r.data.data)); }, []);

  const columns = [
    { key: 'subject', label: 'Subject', render: (r) => `${r.subjectId?.subjectCode} — ${r.subjectId?.subjectName}` },
    { key: 'mid1', label: 'Mid-1', render: (r) => `${r.mid1.total}/30` },
    { key: 'mid2', label: 'Mid-2', render: (r) => `${r.mid2.total}/30` },
    { key: 'internal', label: 'Internal', render: (r) => <span className="font-semibold">{r.internalMarks}/30</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'PUBLISHED' ? 'success' : 'warning'}>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Marks</h1>
      <Card>
        <Table columns={columns} data={rows} empty="No published marks yet." />
      </Card>
      <p className="text-xs text-slate-500">
        Internal = max(Mid-1, Mid-2). Written marks are halved (÷2), then added to online + assignment.
      </p>
    </div>
  );
}