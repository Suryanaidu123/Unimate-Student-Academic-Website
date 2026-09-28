import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';

const empty = {
  title: '', message: '', type: 'IMPORTANT_ANNOUNCEMENT', recipientType: 'ALL_STUDENTS',
  year: '', semester: '', section: '', batch: '',
};

export default function AdminNotifications() {
  const [form, setForm] = useState(empty);
  const [recent, setRecent] = useState([]);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      const filter = {};
      if (form.year) filter.year = Number(form.year);
      if (form.semester) filter.semester = Number(form.semester);
      if (form.section) filter.section = form.section;
      if (form.batch) filter.batch = form.batch;
      await api.post('/notifications', { ...form, filter });
      toast.success('Notification sent');
      setForm(empty);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Send Notification</h1>
      <Card title="Compose">
        <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-3">
          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Message" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <Input label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <Input label="Recipient Type" value={form.recipientType} onChange={(e) => setForm({ ...form, recipientType: e.target.value })} />
          <Input label="Year (optional)" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          <Input label="Section (optional)" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
          <div className="md:col-span-2"><Button type="submit">Send</Button></div>
        </form>
      </Card>
    </div>
  );
}