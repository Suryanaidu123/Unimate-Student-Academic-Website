import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Send, MessageSquare } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Badge from '../../components/ui/Badge.jsx';

const CATEGORIES = [
  'General',
  'Academics',
  'Faculty',
  'Timetable',
  'Facilities',
  'Examination',
  'Suggestions',
  'Complaint',
];

export default function FeedbackPage() {
  const [form, setForm] = useState({ category: 'General', subject: '', message: '' });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    api.get('/feedback/mine')
      .then((r) => setItems(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      return toast.error('Please fill in both subject and message');
    }
    setSubmitting(true);
    try {
      await api.post('/feedback', {
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      toast.success('Feedback sent to admin.');
      setForm({ category: 'General', subject: '', message: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare size={22} /> Feedback
        </h1>
        <p className="text-sm text-slate-500">
          Send private feedback or suggestions to the administration. Only admins can see these.
        </p>
      </div>

      <Card title="New Feedback">
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="label">Category</span>
            <select className="input" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <Input label="Subject" required value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="e.g. Issue with lab equipment" />

          <label className="block">
            <span className="label">Message</span>
            <textarea className="input" rows={5} required value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe your feedback in detail..." />
          </label>

          <Button type="submit" disabled={submitting}>
            <Send size={16} /> {submitting ? 'Sending…' : 'Submit Feedback'}
          </Button>
        </form>
      </Card>

      <Card title={`My Feedback (${items.length})`}>
        {loading ? (
          <p className="text-sm text-slate-500 py-4">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">You haven't submitted any feedback yet.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((f) => (
              <li key={f._id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium">{f.subject}</p>
                    <p className="text-xs text-slate-500">
                      {f.category} · {new Date(f.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={
                    f.status === 'RESOLVED' ? 'success'
                      : f.status === 'READ' ? 'info'
                      : 'warning'
                  }>{f.status}</Badge>
                </div>
                <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{f.message}</p>
                {f.adminReply && (
                  <div className="mt-3 border-l-4 border-brand-500 pl-3 bg-brand-50 rounded py-2">
                    <p className="text-xs text-slate-500 mb-1">
                      <b>Admin reply</b> · {new Date(f.repliedAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{f.adminReply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}