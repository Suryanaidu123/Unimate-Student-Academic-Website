import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Send, Trash2, MessageSquare, ShieldOff, ShieldCheck } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function AdminMessages() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [q, setQ] = useState('');

  function load() {
    api.get(`/contact?q=${encodeURIComponent(q)}&limit=100`)
      .then((r) => setItems(r.data.data.items || []))
      .catch(() => {});
  }
  useEffect(load, [q]);

  async function openMessage(m) {
    try {
      const r = await api.get(`/contact/${m._id}`);
      setSelected(r.data.data);
      setReply('');
    } catch {
      toast.error('Failed to load message');
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/contact/${selected._id}/reply`, { body: reply.trim() });
      toast.success('Reply sent');
      setReply('');
      const r = await api.get(`/contact/${selected._id}`);
      setSelected(r.data.data);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reply');
    } finally { setSending(false); }
  }

  async function removeMessage(id) {
    if (!window.confirm('Delete this message and its replies?')) return;
    try {
      await api.delete(`/contact/${id}`);
      toast.success('Deleted');
      if (selected?._id === id) setSelected(null);
      load();
    } catch { toast.error('Failed'); }
  }

  async function toggleBlock(student, blocked) {
    const confirmMsg = blocked
      ? `Block ${student.rollNumber} from contacting admin?`
      : `Unblock ${student.rollNumber}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const url = blocked
        ? `/contact/block/${student._id}`
        : `/contact/unblock/${student._id}`;
      await api.post(url);
      toast.success(blocked ? 'Student blocked' : 'Student unblocked');

      // Refresh both the list and the selected message
      await load();
      if (selected) {
        const r = await api.get(`/contact/${selected._id}`);
        setSelected(r.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare size={22} /> Student Messages
          </h1>
          <p className="text-sm text-slate-500">
            View, reply to, and manage student messages. Block abusive senders to stop new messages.
          </p>
        </div>
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Left — list */}
        <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto">
          {items.length === 0 && (
            <Card><p className="text-sm text-slate-500 py-6 text-center">No messages.</p></Card>
          )}
          {items.map((m) => {
            const s = m.studentId;
            const blocked = s?.contactBlocked;
            return (
              <button
                key={m._id}
                onClick={() => openMessage(m)}
                className={`w-full text-left card p-3 hover:bg-slate-50 transition ${
                  selected?._id === m._id ? 'border-brand-500 border-2' : ''
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{m.subject}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {s?.rollNumber} — {s?.name || 'Not registered'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={
                      m.status === 'REPLIED' ? 'success' :
                      m.status === 'CLOSED' ? 'default' : 'warning'
                    }>{m.status}</Badge>
                    {blocked && (
                      <Badge variant="danger">Blocked</Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right — detail */}
        <div className="lg:col-span-3">
          {!selected ? (
            <Card>
              <p className="text-sm text-slate-500 py-12 text-center">
                Select a message to view and reply.
              </p>
            </Card>
          ) : (
            <Card>
              <div className="flex justify-between items-start gap-3 mb-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold">{selected.subject}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    <b>{selected.studentId?.name || 'Not registered'}</b> ·{' '}
                    {selected.studentId?.rollNumber} · {selected.studentId?.email}
                  </p>
                  <p className="text-xs text-slate-400">
                    Year {selected.studentId?.year} · Batch {selected.studentId?.batch}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selected.studentId?.contactBlocked ? (
                    <Button
                      variant="secondary"
                      onClick={() => toggleBlock(selected.studentId, false)}
                    >
                      <ShieldCheck size={14} /> Unblock
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      onClick={() => toggleBlock(selected.studentId, true)}
                    >
                      <ShieldOff size={14} /> Block
                    </Button>
                  )}
                  <button
                    onClick={() => removeMessage(selected._id)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete message"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Blocked banner */}
              {selected.studentId?.contactBlocked && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-3">
                  <b>This student is blocked.</b> They cannot send new messages until unblocked.
                  {selected.studentId?.contactBlockedAt && (
                    <> Blocked on {new Date(selected.studentId.contactBlockedAt).toLocaleString()}.</>
                  )}
                </div>
              )}

              <div className="bg-slate-50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                {selected.body}
              </div>

              {selected.replies?.length > 0 && (
                <div className="mt-4 space-y-3">
                  {selected.replies.map((r) => (
                    <div
                      key={r._id}
                      className={`p-3 rounded-lg text-sm ${
                        r.from === 'ADMIN'
                          ? 'bg-brand-50 border-l-4 border-brand-500'
                          : 'bg-slate-50'
                      }`}
                    >
                      <p className="text-xs text-slate-500 mb-1">
                        <b>{r.from === 'ADMIN' ? 'Admin (you)' : 'Student'}</b> ·{' '}
                        {new Date(r.createdAt).toLocaleString()}
                      </p>
                      <p className="whitespace-pre-wrap">{r.body}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={sendReply} className="mt-4 space-y-2">
                <label className="block">
                  <span className="label">Reply</span>
                  <textarea
                    className="input"
                    rows={3}
                    required
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write your reply…"
                  />
                </label>
                <Button type="submit" disabled={sending}>
                  <Send size={14} /> {sending ? 'Sending…' : 'Send Reply'}
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}