import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Send, Bell, Inbox } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';

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

export default function FacultyNotifications() {
  const [tab, setTab] = useState('SEND'); // 'SEND' | 'INBOX'
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  const [inbox, setInbox] = useState([]);
  const { refreshUnread } = useNotifications();

  function loadInbox() {
    api.get('/notifications?limit=50')
      .then((r) => setInbox(r.data.data.items || []))
      .catch(() => {});
  }
  useEffect(() => {
    if (tab === 'INBOX') loadInbox();
  }, [tab]);

  async function onSend(e) {
    e.preventDefault();
    setSending(true);
    try {
      const payload = { title: form.title.trim(), message: form.message.trim(), type: form.type };
      if (form.target === 'ALL_STUDENTS') payload.recipientType = 'ALL_STUDENTS';
      else { payload.recipientType = 'YEAR'; payload.year = Number(form.target); }

      const r = await api.post('/notifications', payload);
      const count = r.data.data?.count || 0;
      toast.success(`Sent to ${count} student${count === 1 ? '' : 's'}`);
      setForm(empty);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  async function markRead(id) {
    await api.put(`/notifications/${id}/read`);
    loadInbox();
    refreshUnread();
  }

  async function markAll() {
    await api.put('/notifications/read-all');
    loadInbox();
    refreshUnread();
  }

  async function remove(id) {
    if (!window.confirm('Delete this notification?')) return;
    await api.delete(`/notifications/${id}`);
    loadInbox();
    refreshUnread();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>

      {/* Tabs */}
      <Card>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('SEND')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === 'SEND' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Send size={14} className="inline mr-1" /> Send
          </button>
          <button
            onClick={() => setTab('INBOX')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === 'INBOX' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Inbox size={14} className="inline mr-1" /> Inbox
          </button>
        </div>
      </Card>

      {tab === 'SEND' && (
        <Card title="Compose Notification">
          <form onSubmit={onSend} className="space-y-3">
            <Input label="Title" required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <label className="block">
              <span className="label">Message</span>
              <textarea className="input" rows={4} required value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </label>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Type</span>
                <select className="input" value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="label">Notification For</span>
                <select className="input" value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}>
                  {TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
            </div>
            <Button type="submit" disabled={sending}>
              <Send size={16} /> {sending ? 'Sending…' : 'Send Notification'}
            </Button>
          </form>
        </Card>
      )}

      {tab === 'INBOX' && (
        <Card
          title="Inbox"
          actions={<Button variant="secondary" onClick={markAll}>Mark all read</Button>}
        >
          {inbox.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No notifications.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {inbox.map((n) => (
                <li key={n._id} className={`py-3 ${n.isRead ? 'opacity-70' : ''}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{n.title}</p>
                        {!n.isRead && <Badge variant="brand">New</Badge>}
                        <Badge>{String(n.type).replaceAll('_', ' ')}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!n.isRead && (
                        <Button variant="secondary" onClick={() => markRead(n._id)}>Read</Button>
                      )}
                      <Button variant="danger" onClick={() => remove(n._id)}>Delete</Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}