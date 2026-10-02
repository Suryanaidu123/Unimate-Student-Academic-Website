import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, UserCheck, BookOpen, Layers, Database, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import StatCard from '../../components/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';

const CLEANUP_OPTIONS = [
  { key: 'read_notifications', label: 'Delete Read Notifications', description: 'Removes all notifications marked as read.' },
  { key: 'old_notifications', label: 'Delete Notifications Older Than 30 Days', description: 'Removes old notification records.' },
  { key: 'expired_otps', label: 'Delete Expired OTPs', description: 'Removes expired OTP requests.' },
  { key: 'old_audit_logs', label: 'Delete Audit Logs Older Than 90 Days', description: 'Removes old audit log entries.' },
];

export default function AdminDashboard() {
  const [d, setD] = useState(null);
  const [storage, setStorage] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [cleaning, setCleaning] = useState(false);

  function loadStorage() {
    api.get('/admin/storage/stats').then((r) => setStorage(r.data.data)).catch(() => {});
  }

  useEffect(() => {
    api.get('/dashboard/admin').then((r) => setD(r.data.data));
    loadStorage();
  }, []);

  async function doCleanup(target) {
    setCleaning(true);
    try {
      const r = await api.post('/admin/cleanup', { target });
      toast.success(r.data.message);
      setConfirm(null);
      loadStorage();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setCleaning(false);
    }
  }

  if (!d) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Students" value={d.totalStudents} color="brand" />
        <StatCard icon={UserCheck} label="Total Faculty" value={d.totalFaculty} color="green" />
        <StatCard icon={BookOpen} label="Total Subjects" value={d.totalSubjects} color="amber" />
        <StatCard icon={Layers} label="Sections" value={d.totalSections} color="blue" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="2nd Year" value={d.secondYear} color="brand" />
        <StatCard label="3rd Year" value={d.thirdYear} color="green" />
        <StatCard label="4th Year" value={d.fourthYear} color="amber" />
      </div>

      {/* MongoDB Storage */}
      {storage && (
        <Card title="MongoDB Storage">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Database size={16} className="text-brand-600" />
              <span className="text-slate-700">
                <b>{storage.usedMB} MB</b> used of <b>{storage.capacityMB} MB</b> capacity
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Remaining: {storage.remainingMB} MB</span>
              <span>{storage.usagePercent}% used</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  storage.usagePercent > 80
                    ? 'bg-red-500'
                    : storage.usagePercent > 60
                    ? 'bg-amber-500'
                    : 'bg-brand-600'
                }`}
                style={{ width: `${Math.max(storage.usagePercent, 1)}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Database Cleanup */}
      <Card title="Database Cleanup">
        <p className="text-xs text-slate-500 mb-3">
          Remove unnecessary data to free up MongoDB storage. These actions are permanent.
        </p>
        <div className="grid md:grid-cols-2 gap-2">
          {CLEANUP_OPTIONS.map((opt) => (
            <div key={opt.key} className="border border-slate-200 rounded-lg p-3">
              <p className="font-medium text-sm text-slate-800">{opt.label}</p>
              <p className="text-xs text-slate-500 mt-1 mb-2">{opt.description}</p>
              <Button variant="secondary" onClick={() => setConfirm(opt)}>
                <Trash2 size={14} /> Clean
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card title="Recent Activity">
        <ul className="divide-y divide-slate-100 text-sm">
          {d.recentActivity.map((a) => (
            <li key={a._id} className="py-2 flex justify-between">
              <span>{a.description || a.action}</span>
              <span className="text-slate-400">{new Date(a.createdAt).toLocaleString()}</span>
            </li>
          ))}
          {d.recentActivity.length === 0 && (
            <li className="py-2 text-slate-500">No activity yet.</li>
          )}
        </ul>
      </Card>

      {/* Cleanup confirmation */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Confirm cleanup?">
        {confirm && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              You are about to <b>{confirm.label.toLowerCase()}</b>.
            </p>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3">
              This action cannot be undone. Student, faculty, subject and academic records are not affected.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirm(null)} disabled={cleaning}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => doCleanup(confirm.key)} disabled={cleaning}>
                <Trash2 size={14} /> {cleaning ? 'Cleaning…' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}