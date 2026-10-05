import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Send, Bell } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

const TYPES = [
  { value: 'IMPORTANT_ANNOUNCEMENT', label: 'Important Announcement' },
  { value: 'ACADEMIC_ALERT',         label: 'Academic Alert' },
  { value: 'EXAM_SCHEDULED',         label: 'Exam Scheduled' },
  { value: 'EXAM_APPROACHING',       label: 'Exam Approaching' },
  { value: 'NEW_NOTES_PUBLISHED',    label: 'New Notes Published' },
  { value: 'SYSTEM_ALERT',           label: 'System Alert' },
];

const TARGETS = [
  { value: 'ALL_STUDENTS', label: 'All Students' },
  { value: '2',            label: '2nd Year Students' },
  { value: '3',            label: '3rd Year Students' },
  { value: '4',            label: '4th Year Students' },
];

const empty = {
  title: '',
  message: '',
  type: 'IMPORTANT_ANNOUNCEMENT',
  target: 'ALL_STUDENTS',
};

export default function AdminNotifications() {
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  const [recent, setRecent] = useState([]);

  function loadRecent() {
    api.get('/notifications?limit=20')
      .then((r) => setRecent(r.data.data.items || []))
      .catch(() => {});
  }
  useEffect(loadRecent, []);

  async function onSend(e) {
    e.preventDefault();
    setSending(true);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
      };

      if (form.target === 'ALL_STUDENTS') {
        payload.recipientType = 'ALL_STUDENTS';
      } else {
        payload.recipientType = 'YEAR';
        payload.year = Number(form.target);
      }

      const r = await api.post('/notifications', payload);
      const count = r.data.data?.count || 0;
      toast.success(`Sent to ${count} student${count === 1 ? '' : 's'}`);
      setForm(empty);
      loadRecent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bell size={22} /> Send Notification
        </h1>
        <p className="text-sm text-slate-500">
          Send announcements to all students or target a specific year.
        </p>
      </div>

      <Card title="Compose">
        <form onSubmit={onSend} className="space-y-3">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Mid-2 exam schedule released"
          />

          <label className="block">
            <span className="label">Message</span>
            <textarea
              className="input"
              rows={4}
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Type the notification body..."
            />
          </label>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Type</span>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label">Notification For</span>
              <select
                className="input"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
              >
                {TARGETS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          </div>

          <Button type="submit" disabled={sending}>
            <Send size={16} /> {sending ? 'Sending…' : 'Send Notification'}
          </Button>
        </form>
      </Card>

      <Card title="Recently Sent">
        <Table
          empty="No notifications sent yet."
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'type', label: 'Type',
              render: (r) => <Badge>{String(r.type).replaceAll('_', ' ')}</Badge> },
            { key: 'year', label: 'Target',
              render: (r) => r.year ? `Year ${r.year}` : 'All' },
            { key: 'createdAt', label: 'Sent',
              render: (r) => new Date(r.createdAt).toLocaleString() },
          ]}
          data={recent}
        />
      </Card>
    </div>
  );
}