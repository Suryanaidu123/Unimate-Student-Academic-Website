import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Table from '../../components/ui/Table.jsx';

export default function AdminAuditLogs() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    // Uses admin dashboard's recentActivity (last 10) as a light version
    api.get('/dashboard/admin').then((r) => setItems(r.data.data.recentActivity || []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <Card>
        <Table
          columns={[
            { key: 'action', label: 'Action' },
            { key: 'entityType', label: 'Entity' },
            { key: 'description', label: 'Description' },
            { key: 'actor', label: 'Actor', render: (r) => r.actorUserId?.email || '—' },
            { key: 'createdAt', label: 'When', render: (r) => new Date(r.createdAt).toLocaleString() },
          ]}
          data={items}
        />
      </Card>
    </div>
  );
}