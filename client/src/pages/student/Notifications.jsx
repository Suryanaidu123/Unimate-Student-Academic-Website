import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, Check, CheckCheck, Trash2, Inbox } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
const TYPE_VARIANTS = {
  IMPORTANT_ANNOUNCEMENT: 'danger',
  ASSIGNMENT_CREATED: 'brand',
  ASSIGNMENT_DUE_SOON: 'warning',
  ASSIGNMENT_OVERDUE: 'danger',
  MARKS_PUBLISHED: 'success',
  EXAM_SCHEDULED: 'info',
  EXAM_APPROACHING: 'warning',
  TIMETABLE_UPDATED: 'info',
  NEW_NOTES_PUBLISHED: 'brand',
  ACADEMIC_ALERT: 'warning',
  SYSTEM_ALERT: 'default',
};

function relativeTime(dateStr) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString();
}

export default function StudentNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [confirmId, setConfirmId] = useState(null); // 'ALL' | 'UNREAD'
  const { refreshUnread } = useNotifications();

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === 'UNREAD') params.set('unreadOnly', 'true');
    api.get(`/notifications?${params.toString()}`)
      .then((r) => setItems(r.data.data.items || []))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [filter]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.isRead).length,
    [items]
  );

  async function markRead(id) {
    setBusyId(id);
    try {
      await api.put(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      await refreshUnread();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as read');
    } finally {
      setBusyId(null);
    }
  }

  async function markAll() {
    if (unreadCount === 0) return toast.error('No unread notifications');
    setBusyId('all');
    try {
      await api.put('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await refreshUnread();
      toast.success('All marked as read');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark all read');
    } finally {
      setBusyId(null);
    }
  }

 async function remove(id) {
  setBusyId(id);
  try {
    await api.delete(`/notifications/${id}`);
    setItems((prev) => prev.filter((n) => n._id !== id));
    await refreshUnread();
    toast.success('Deleted');
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to delete');
  } finally {
    setBusyId(null);
  }
}

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell size={22} /> Notifications
          </h1>
          <p className="text-sm text-slate-500">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.`
              : 'You are all caught up.'}
          </p>
        </div>
        <Button variant="secondary" onClick={markAll} disabled={busyId === 'all'}>
          <CheckCheck size={16} /> Mark all as read
        </Button>
      </div>

      {/* Filter tabs */}
      <Card>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === 'ALL'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('UNREAD')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === 'UNREAD'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <Card>
          <p className="text-sm text-slate-500 py-8 text-center">Loading…</p>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Inbox size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No notifications</p>
            <p className="text-sm text-slate-400 mt-1">
              {filter === 'UNREAD'
                ? 'You have no unread notifications.'
                : 'Nothing here yet — check back later.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card
              key={n._id}
              className={`transition ${
                n.isRead ? 'opacity-75' : 'border-l-4 border-l-brand-500'
              }`}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{n.title}</h3>
                    {!n.isRead && <Badge variant="brand">New</Badge>}
                    {n.type && (
                      <Badge variant={TYPE_VARIANTS[n.type] || 'default'}>
                        {String(n.type).replaceAll('_', ' ')}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {n.message}
                  </p>

                  <p className="text-xs text-slate-400 mt-2">
                    {relativeTime(n.createdAt)} ·{' '}
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  {!n.isRead && (
                    <Button
                      variant="secondary"
                      onClick={() => markRead(n._id)}
                      disabled={busyId === n._id}
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </Button>
                  )}
                 <Button
                        variant="danger"
                        onClick={() => setConfirmId(n._id)}
                        disabled={busyId === n._id}
                        title="Delete"
                             >
                <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
           )}

      <ConfirmDialog
        open={!!confirmId}
        title="Delete notification?"
        message="This notification will be permanently removed."
        confirmText="Delete"
        variant="danger"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          const id = confirmId;
          setConfirmId(null);
          remove(id);
        }}
      />
    </div>
  );
}