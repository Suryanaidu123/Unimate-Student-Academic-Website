/**
 * Admin — Blocked Accounts
 * Lists all students currently blocked from Contact Admin.
 * Admin can unblock them here.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldOff, ShieldCheck, UserX } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';

export default function AdminBlockedAccounts() {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [confirmUnblock, setConfirmUnblock] = useState(null);
  const [unblocking,     setUnblocking]     = useState(false);

  function load() {
    setLoading(true);
    api.get('/students?contactBlocked=true&limit=200')
      .then((r) => setStudents(r.data.data.items || []))
      .catch(() => toast.error('Failed to load blocked accounts'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function doUnblock() {
    setUnblocking(true);
    try {
      await api.post(`/contact/unblock/${confirmUnblock._id}`);
      toast.success(`${confirmUnblock.name || confirmUnblock.rollNumber} unblocked.`);
      setConfirmUnblock(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unblock');
    } finally { setUnblocking(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldOff size={22} className="text-red-600" /> Blocked Accounts
        </h1>
        <p className="text-sm text-slate-500">
          Students blocked from sending Contact Admin messages. Click Unblock to restore access.
        </p>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading…</p>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <UserX size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No blocked accounts.</p>
            <p className="text-sm text-slate-400 mt-1">All students currently have contact access.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100 text-left">
                  <th className="pb-2.5 pr-4">Student</th>
                  <th className="pb-2.5 pr-4">Roll No</th>
                  <th className="pb-2.5 pr-4">Year</th>
                  <th className="pb-2.5 pr-4">Email</th>
                  <th className="pb-2.5 pr-4">Blocked On</th>
                  <th className="pb-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-slate-900">{s.name || '—'}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-600">{s.rollNumber}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="info">{s.year} Year</Badge>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500 max-w-[180px] truncate">{s.email}</td>
                    <td className="py-3 pr-4 text-xs text-slate-400">
                      {s.contactBlockedAt
                        ? new Date(s.contactBlockedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
                        : '—'}
                    </td>
                    <td className="py-3">
                      <Button
                        variant="secondary"
                        onClick={() => setConfirmUnblock(s)}
                      >
                        <ShieldCheck size={13} /> Unblock
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmUnblock}
        title="Unblock Student"
        message={
          confirmUnblock
            ? `Unblock ${confirmUnblock.name || confirmUnblock.rollNumber}? They will be able to send Contact Admin messages again.`
            : ''
        }
        confirmLabel="Unblock"
        onConfirm={doUnblock}
        onCancel={() => setConfirmUnblock(null)}
        loading={unblocking}
      />
    </div>
  );
}
