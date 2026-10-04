import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function AttendanceSessions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/attendance/sessions?limit=200')
      .then((r) => setItems(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Attendance Sessions</h1>
      <Card>
        {loading ? <p className="text-sm text-slate-500 py-6 text-center">Loading…</p> : (
          <Table
            empty="No sessions recorded yet."
            columns={[
              { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
              { key: 'day', label: 'Day' },
              { key: 'period', label: 'Period', render: (r) => `${r.periodStart}–${r.periodEnd}` },
              { key: 'subject', label: 'Subject', render: (r) => r.subjectId?.subjectCode || '—' },
              { key: 'class', label: 'Class', render: (r) => `${r.year}-${r.semester} ${r.section}` },
              { key: 'marked', label: 'Marked By', render: (r) => r.markedBy?.email || '—' },
              { key: 'locked', label: 'Status', render: (r) => <Badge variant={r.locked ? 'success' : 'warning'}>{r.locked ? 'Locked' : 'Open'}</Badge> },
            ]}
            data={items}
          />
        )}
      </Card>
    </div>
  );
}