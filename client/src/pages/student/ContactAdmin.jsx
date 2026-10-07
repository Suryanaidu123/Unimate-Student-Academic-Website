import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Send, MessageSquare, ShieldOff, ChevronDown, ChevronUp, Inbox, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Badge from '../../components/ui/Badge.jsx';

function relTime(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)  return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
}

const STATUS_META = {
  OPEN:    { label: 'Pending',  variant: 'warning' },
  REPLIED: { label: 'Replied',  variant: 'success' },
  CLOSED:  { label: 'Closed',   variant: 'default' },
};

export default function StudentContactAdmin() {
  const [form, setForm]       = useState({ subject: '', body: '' });
  const [messages, setMessages] = useState([]);
  const [blocked, setBlocked] = useState(false);
  const [blockedAt, setBlockedAt] = useState(null);
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState({}); // { msgId: bool }

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
    if (!form.subject.trim() || !form.body.trim()) return;
    setSending(true);
    try {
      await api.post('/contact', { subject: form.subject.trim(), body: form.body.trim() });
      toast.success('Message sent to admin.');
      setForm({ subject: '', body: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally { setSending(false); }
  }

  function toggleExpand(id) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  }

  async function deleteMsg(id) {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;
    try {
      await api.delete(`/contact/mine/${id}`);
      toast.success('Message deleted.');
      setExpanded((p) => { const n = { ...p }; delete n[id]; return n; });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  }

  const unreadCount = messages.filter((m) => m.status === 'OPEN').length;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare size={22} className="text-brand-600" /> Contact Admin
        </h1>
        <p className="text-sm text-slate-500">
          Send a private message to the admin. Only you and the admin can see this.
        </p>
      </div>

      {/* Blocked banner */}
      {blocked && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldOff size={20} className="text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-700">
              You are currently blocked from contacting the admin.
            </p>
            {blockedAt && (
              <p className="text-xs text-red-500 mt-1">Blocked on {new Date(blockedAt).toLocaleString()}</p>
            )}
            <p className="text-xs text-red-500 mt-1">
              If you believe this is a mistake, contact the college office directly.
            </p>
          </div>
        </div>
      )}

      {/* Composer */}
      <Card title="New Message">
        <form onSubmit={onSend} className="space-y-3">
          <Input
            label="Subject *"
            required
            disabled={blocked}
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="e.g. Issue with my marks"
          />
          <label className="block">
            <span className="label">Message *</span>
            <textarea
              className="input min-h-[100px] resize-y"
              required
              disabled={blocked}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder={blocked ? 'Sending is disabled while you are blocked.' : 'Describe your question or issue in detail…'}
            />
          </label>
          <Button type="submit" disabled={sending || blocked} className="w-full sm:w-auto">
            <Send size={15} />
            {sending ? 'Sending…' : blocked ? 'Blocked — Cannot Send' : 'Send to Admin'}
          </Button>
        </form>
      </Card>

      {/* Message history */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Inbox size={16} />
            My Messages
            {messages.length > 0 && (
              <span className="ml-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-full px-2 py-0.5">
                {messages.length}
              </span>
            )}
            {unreadCount > 0 && (
              <Badge variant="warning">{unreadCount} pending</Badge>
            )}
          </span>
        }
      >
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No messages yet. Send your first message above.</p>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => {
              const meta = STATUS_META[m.status] || STATUS_META.OPEN;
              const open = expanded[m._id];
              const hasReplies = m.replies?.length > 0;

              return (
                <div key={m._id}
                  className={`border rounded-xl overflow-hidden transition-all ${
                    m.status === 'REPLIED'
                      ? 'border-green-200 bg-green-50/30'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Summary row */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(m._id)}
                    className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-slate-50/50 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        {hasReplies && (
                          <span className="text-xs text-brand-600 font-medium">
                            {m.replies.length} repl{m.replies.length === 1 ? 'y' : 'ies'}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900 text-sm truncate">{m.subject}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{relTime(m.createdAt)}</p>
                    </div>
                    {open ? <ChevronUp size={16} className="text-slate-400 shrink-0 mt-1" />
                          : <ChevronDown size={16} className="text-slate-400 shrink-0 mt-1" />}
                  </button>

                  {/* Expanded detail */}
                  {open && (
                    <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                      {/* Original message */}
                      <div className="mt-3 bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 whitespace-pre-wrap">
                        {m.body}
                      </div>

                      {/* Replies */}
                      {hasReplies && (
                        <div className="space-y-2">
                          {m.replies.map((r) => (
                            <div key={r._id}
                              className={`rounded-lg p-3 text-sm ${
                                r.from === 'ADMIN'
                                  ? 'bg-brand-50 border border-brand-200'
                                  : 'bg-slate-50 border border-slate-200'
                              }`}
                            >
                              <p className="text-xs font-semibold mb-1 ${r.from === 'ADMIN' ? 'text-brand-700' : 'text-slate-600'}">
                                {r.from === 'ADMIN' ? '🔵 Admin Reply' : '🟢 You'} · {relTime(r.createdAt)}
                              </p>
                              <p className="whitespace-pre-wrap text-slate-800">{r.body}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Delete own message */}
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => deleteMsg(m._id)}
                          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition"
                          title="Delete this message"
                        >
                          <Trash2 size={13} /> Delete message
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
