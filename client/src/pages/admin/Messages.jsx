import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Send, Trash2, ShieldOff, ShieldCheck, ArrowLeft,
  Search, Inbox, Clock, Headphones, CheckCheck, Circle,
} from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';

function relTime(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
}

const STATUS_META = {
  OPEN:    { label: 'Pending', variant: 'warning' },
  REPLIED: { label: 'Replied', variant: 'success' },
  CLOSED:  { label: 'Closed',  variant: 'default' },
};

export default function AdminMessages() {
  const [items,      setItems]      = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [reply,      setReply]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [q,          setQ]          = useState('');
  const [mobileView, setMobileView] = useState('list');
  const [confirmDelete, setConfirmDelete] = useState(null); // message id
  const [confirmBlock,  setConfirmBlock]  = useState(null); // { student, currentlyBlocked }
  const [saving,        setSaving]        = useState(false);

  // ── load list ──────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    api.get(`/contact?q=${encodeURIComponent(q)}&limit=200`)
      .then((r) => setItems(r.data.data.items || []))
      .catch(() => {});
  }, [q]);

  useEffect(() => { load(); }, [load]);

  // Reset sidebar badge when this page mounts
  useEffect(() => {
    window.dispatchEvent(new Event('messages-count-changed'));
  }, []);

  // ── open a message (mark as read) ─────────────────────────────────────────
  async function openMessage(m) {
    try {
      // Mark read on the server
      if (!m.isRead) {
        await api.put(`/contact/${m._id}/mark-read`);
        setItems((prev) => prev.map((x) => x._id === m._id ? { ...x, isRead: true } : x));
        window.dispatchEvent(new Event('messages-count-changed'));
      }
      const r = await api.get(`/contact/${m._id}`);
      setSelected({ ...r.data.data, isRead: true });
      setReply('');
      setMobileView('detail');
    } catch { toast.error('Failed to load message'); }
  }

  // ── mark all read ─────────────────────────────────────────────────────────
  async function markAllRead() {
    await api.put('/contact/mark-all-read').catch(() => {});
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    window.dispatchEvent(new Event('messages-count-changed'));
    toast.success('All marked as read');
  }

  // ── reply ─────────────────────────────────────────────────────────────────
  async function sendReply(e) {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/contact/${selected._id}/reply`, { body: reply.trim() });
      toast.success('Reply sent');
      setReply('');
      const r = await api.get(`/contact/${selected._id}`);
      setSelected({ ...r.data.data, isRead: true });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reply');
    } finally { setSending(false); }
  }

  // ── delete ────────────────────────────────────────────────────────────────
  async function removeMessage(id) {
    setConfirmDelete(id);
  }

  async function doRemoveMessage() {
    setSaving(true);
    try {
      await api.delete(`/contact/${confirmDelete}`);
      toast.success('Deleted');
      setSelected(null);
      setMobileView('list');
      load();
      window.dispatchEvent(new Event('messages-count-changed'));
    } catch { toast.error('Failed'); }
    finally { setConfirmDelete(null); setSaving(false); }
  }

  // ── block / unblock ───────────────────────────────────────────────────────
  async function toggleBlock(student, currentlyBlocked) {
    setConfirmBlock({ student, currentlyBlocked });
  }

  async function doToggleBlock() {
    if (!confirmBlock) return;
    setSaving(true);
    const { student, currentlyBlocked } = confirmBlock;
    try {
      await api.post(`/contact/${currentlyBlocked ? 'unblock' : 'block'}/${student._id}`);
      toast.success(currentlyBlocked ? 'Student unblocked.' : 'Student blocked.');
      load();
      if (selected) {
        const r = await api.get(`/contact/${selected._id}`);
        setSelected({ ...r.data.data, isRead: true });
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setConfirmBlock(null); setSaving(false); }
  }

  const unreadCount = items.filter((m) => !m.isRead).length;

  // ── sub-components ────────────────────────────────────────────────────────

  const ListPanel = (
    <div className="flex flex-col h-full gap-3">
      {/* Search + mark-all */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Search messages…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={markAllRead} title="Mark all as read">
            <CheckCheck size={14} />
            <span className="hidden sm:inline">Mark all read</span>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Inbox size={13} /> {items.length} total</span>
        {unreadCount > 0 && (
          <span className="flex items-center gap-1 text-red-600 font-semibold">
            <Circle size={8} className="fill-red-500 text-red-500" /> {unreadCount} unread
          </span>
        )}
      </div>

      {/* List */}
      <div className="space-y-1.5 overflow-y-auto flex-1">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <Inbox size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No student messages yet.</p>
          </div>
        ) : items.map((m) => {
          const s      = m.studentId;
          const meta   = STATUS_META[m.status] || STATUS_META.OPEN;
          const active = selected?._id === m._id;
          const unread = !m.isRead;

          return (
            <button
              key={m._id}
              onClick={() => openMessage(m)}
              className={`w-full text-left rounded-xl border px-3 py-2.5 transition
                ${active   ? 'border-brand-400 bg-brand-50/50' :
                  unread  ? 'border-red-200 bg-red-50/30 hover:border-red-300' :
                            'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {unread && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                    <p className={`text-sm truncate ${unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {m.subject}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {s?.rollNumber} · {s?.name || '—'} · Year {s?.year}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{relTime(m.createdAt)}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  {s?.contactBlocked && <Badge variant="danger">Blocked</Badge>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const DetailPanel = !selected ? (
    <div className="hidden lg:flex items-center justify-center min-h-[400px]
                    border border-dashed border-slate-200 rounded-xl">
      <div className="text-center text-slate-400 px-4">
        <Headphones size={32} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">Select a message to view</p>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      {/* Back (mobile) */}
      <button
        onClick={() => { setMobileView('list'); setSelected(null); }}
        className="lg:hidden flex items-center gap-1.5 text-sm text-brand-600 font-medium"
      >
        <ArrowLeft size={15} /> Back to messages
      </button>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 break-words">{selected.subject}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-semibold">{selected.studentId?.name || '—'}</span>
              {' · '}{selected.studentId?.rollNumber}
              {' · '}{selected.studentId?.email}
              {' · '}Year {selected.studentId?.year}
            </p>
            <p className="text-xs text-slate-400">Batch {selected.studentId?.batch || '—'}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selected.studentId?.contactBlocked ? (
              <Button variant="secondary" onClick={() => toggleBlock(selected.studentId, true)}>
                <ShieldCheck size={14} /> Unblock
              </Button>
            ) : (
              <Button variant="danger" onClick={() => toggleBlock(selected.studentId, false)}>
                <ShieldOff size={14} /> Block
              </Button>
            )}
            <button
              onClick={() => removeMessage(selected._id)}
              title="Delete message"
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Blocked warning */}
        {selected.studentId?.contactBlocked && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            <ShieldOff size={14} className="mt-0.5 shrink-0" />
            <span>
              <b>Student is blocked</b> — cannot send new messages.
              {selected.studentId?.contactBlockedAt && (
                <span className="text-red-500 ml-1">
                  (blocked {relTime(selected.studentId.contactBlockedAt)})
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Thread */}
      <div className="flex flex-col gap-2">
        {/* Original message */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-slate-400 mb-2">
            Student · {relTime(selected.createdAt)}
          </p>
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{selected.body}</p>
        </div>

        {/* Replies */}
        {(selected.replies || []).map((r) => (
          <div
            key={r._id}
            className={`rounded-xl px-4 py-3 text-sm ${
              r.from === 'ADMIN'
                ? 'bg-brand-50 border border-brand-200 ml-4 sm:ml-8'
                : 'bg-slate-50 border border-slate-200'
            }`}
          >
            <p className={`text-xs font-semibold mb-1.5 ${r.from === 'ADMIN' ? 'text-brand-700' : 'text-slate-500'}`}>
              {r.from === 'ADMIN' ? '🔵 Admin (you)' : '🟢 Student'} · {relTime(r.createdAt)}
            </p>
            <p className="whitespace-pre-wrap text-slate-800">{r.body}</p>
          </div>
        ))}
      </div>

      {/* Reply form */}
      <form onSubmit={sendReply} className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-2">
        <label className="block">
          <span className="label">Reply to student</span>
          <textarea
            className="input min-h-[80px] resize-y"
            required
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply…"
          />
        </label>
        <Button type="submit" disabled={sending}>
          <Send size={14} /> {sending ? 'Sending…' : 'Send Reply'}
        </Button>
      </form>
    </div>
  );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Headphones size={22} className="text-brand-600" /> Student Support
        </h1>
        <p className="text-sm text-slate-500">
          Messages sent by students through Contact Admin. Reply, block, or manage from here.
        </p>
      </div>

      {/* Desktop: side-by-side */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-4 min-h-[600px]">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-3 flex flex-col">
          {ListPanel}
        </div>
        <div className="lg:col-span-3">{DetailPanel}</div>
      </div>

      {/* Mobile: single panel */}
      <div className="lg:hidden">
        {mobileView === 'list'
          ? <div className="bg-white border border-slate-200 rounded-xl p-3">{ListPanel}</div>
          : <div>{DetailPanel}</div>}
      </div>

      {/* ── Confirm dialogs ── */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Message"
        message="Delete this message and all its replies? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={doRemoveMessage}
        onCancel={() => setConfirmDelete(null)}
        loading={saving}
      />
      <ConfirmDialog
        open={!!confirmBlock}
        title={confirmBlock?.currentlyBlocked ? 'Unblock Student' : 'Block Student'}
        message={
          confirmBlock?.currentlyBlocked
            ? `Unblock ${confirmBlock.student.rollNumber}? They will be able to send messages again.`
            : `Block ${confirmBlock?.student.rollNumber}? They will not be able to send new messages.`
        }
        confirmLabel={confirmBlock?.currentlyBlocked ? 'Unblock' : 'Block'}
        onConfirm={doToggleBlock}
        onCancel={() => setConfirmBlock(null)}
        loading={saving}
      />
    </div>
  );
}
