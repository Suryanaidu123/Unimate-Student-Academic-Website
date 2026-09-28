import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Send, MessageSquare, ShieldOff } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function StudentContactAdmin() {
  const [form, setForm] = useState({ subject: '', body: '' });
  const [messages, setMessages] = useState([]);
  const [blocked, setBlocked] = useState(false);
  const [blockedAt, setBlockedAt] = useState(null);
  const [sending, setSending] = useState(false);

  function load() {
    api.get('/contact/mine')
      .then((r) => {
        const d = r.data.data || {};
        setMessages(d.messages || []);
        setBlocked(!!d.blocked);
        setBlockedAt(d.blockedAt || null);
      })
      .catch(() => {});
  }
  useEffect(load, []);

  async function onSend(e) {
    e.preventDefault();
    if (blocked) return toast.error('You are currently blocked from contacting the admin.');
    setSending(true);
    try {
      await api.post('/contact', {
        subject: form.subject.trim(),
        body: form.body.trim(),
      });
      toast.success('Message sent to admin');
      setForm({ subject: '', body: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally { setSending(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare size={22} /> Contact Admin
        </h1>
        <p className="text-sm text-slate-500">
          Send a private message to the admin. Only you and the admin can see this conversation.
        </p>
      </div>

      {/* Blocked banner */}
      {blocked && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-start gap-3">
          <ShieldOff size={20} className="mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">You are currently blocked from contacting the admin.</p>
            {blockedAt && (
              <p className="text-xs mt-1">
                Blocked on {new Date(blockedAt).toLocaleString()}.
              </p>
            )}
            <p className="text-xs mt-1">
              If you believe this is a mistake, please contact the college office directly.
            </p>
          </div>
        </div>
      )}

      {/* Composer */}
      <Card title="New Message">
        <form onSubmit={onSend} className="space-y-3">
          <Input
            label="Subject"
            required
            disabled={blocked}
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="e.g. Issue with my marks"
          />
          <label className="block">
            <span className="label">Message</span>
            <textarea
              className="input"
              rows={5}
              required
              disabled={blocked}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder={blocked
                ? 'Sending is disabled while you are blocked.'
                : 'Describe your question or issue...'}
            />
          </label>
          <Button type="submit" disabled={sending || blocked}>
            <Send size={16} /> {sending ? 'Sending…' : blocked ? 'Blocked' : 'Send to Admin'}
          </Button>
        </form>
      </Card>

      {/* History */}
      <Card title={`My Messages (${messages.length})`}>
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No messages yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m._id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-semibold">{m.subject}</p>
                    <p className="text-xs text-slate-500">
                      Sent {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={
                    m.status === 'REPLIED' ? 'success' :
                    m.status === 'CLOSED'  ? 'default' : 'warning'
                  }>{m.status}</Badge>
                </div>

                <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{m.body}</p>

                {m.replies?.length > 0 && (
                  <div className="mt-3 space-y-2 border-l-2 border-brand-500 pl-3">
                    {m.replies.map((r) => (
                      <div key={r._id} className="text-sm">
                        <p className="text-xs text-slate-500 mb-1">
                          <b>{r.from === 'ADMIN' ? 'Admin' : 'You'}</b> ·{' '}
                          {new Date(r.createdAt).toLocaleString()}
                        </p>
                        <p className="whitespace-pre-wrap">{r.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}