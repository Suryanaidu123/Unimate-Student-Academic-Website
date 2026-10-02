import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Users, UserCheck, BookOpen, Layers, Database, Trash2, RefreshCw,
} from 'lucide-react';
import api from '../../services/api.js';
import StatCard from '../../components/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';

const CLEANUP_OPTIONS = [
  {
    key: 'read_notifications',
    label: 'Delete Read Notifications',
    description: 'Removes all notifications that students or faculty have already read.',
  },
  {
    key: 'old_notifications',
    label: 'Delete Notifications Older Than 30 Days',
    description: 'Removes old notification records to free up space.',
  },
  {
    key: 'expired_otps',
    label: 'Delete Expired OTPs',
    description: 'Removes expired OTP requests from the database.',
  },
  {
    key: 'old_audit_logs',
    label: 'Delete Audit Logs Older Than 90 Days',
    description: 'Removes historical audit log entries.',
  },
];

export default function AdminDashboard() {
  const [d, setD] = useState(null);
  const [storage, setStorage] = useState(null);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [cleaning, setCleaning] = useState(false);

  // Load main dashboard numbers
  useEffect(() => {
    api.get('/dashboard/admin')
      .then((r) => setD(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'));
  }, []);

  // Load storage stats
  async function loadStorage() {
    setLoadingStorage(true);
    try {
      const r = await api.get('/admin/storage/stats');
      setStorage(r.data.data);
    } catch (err) {
      console.error('Storage fetch failed:', err);
      toast.error('Failed to load storage info');
    } finally {
      setLoadingStorage(false);
    }
  }

  useEffect(() => {
    loadStorage();
  }, []);

  async function doCleanup(target) {
    setCleaning(true);
    try {
      const r = await api.post('/admin/cleanup', { target });
      toast.success(r.data.message);
      setConfirm(null);
      // Refresh storage numbers so the admin sees the effect immediately
      await loadStorage();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clean up');
    } finally {
      setCleaning(false);
    }
  }

  if (!d) {
    return (
      <div className="p-6 text-center text-sm text-slate-500">Loading dashboard…</div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Users} label="Total Students" value={d.totalStudents} color="brand" />
        <StatCard icon={UserCheck} label="Total Faculty" value={d.totalFaculty} color="green" />
        <StatCard icon={BookOpen} label="Total Subjects" value={d.totalSubjects} color="amber" />
        <StatCard icon={Layers} label="Sections" value={d.totalSections} color="blue" />
      </div>

      {/* Year breakdown */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="2nd Year" value={d.secondYear} color="brand" />
        <StatCard label="3rd Year" value={d.thirdYear} color="green" />
        <StatCard label="4th Year" value={d.fourthYear} color="amber" />
      </div>

      {/* MongoDB Storage */}
      <Card
        title={
          <span className="flex items-center justify-between gap-2 w-full">
            <span className="flex items-center gap-2">
              <Database size={18} className="text-brand-600" />
              MongoDB Storage
            </span>
            <button
              onClick={loadStorage}
              disabled={loadingStorage}
              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 disabled:text-slate-400"
              title="Refresh storage stats"
            >
              <RefreshCw size={12} className={loadingStorage ? 'animate-spin' : ''} />
              Refresh
            </button>
          </span>
        }
      >
        {!storage ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            {loadingStorage ? 'Loading storage info…' : 'Storage info unavailable.'}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Numbers row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Used</p>
                <p className="text-lg sm:text-xl font-semibold text-slate-900 mt-0.5">
                  {storage.usedMB} <span className="text-sm font-normal text-slate-500">MB</span>
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Remaining</p>
                <p className="text-lg sm:text-xl font-semibold text-slate-900 mt-0.5">
                  {storage.remainingMB} <span className="text-sm font-normal text-slate-500">MB</span>
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Capacity</p>
                <p className="text-lg sm:text-xl font-semibold text-slate-900 mt-0.5">
                  {storage.capacityMB} <span className="text-sm font-normal text-slate-500">MB</span>
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Usage</span>
                <span>{storage.usagePercent}%</span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    storage.usagePercent > 80
                      ? 'bg-red-500'
                      : storage.usagePercent > 60
                      ? 'bg-amber-500'
                      : 'bg-brand-600'
                  }`}
                  style={{ width: `${Math.max(storage.usagePercent, 0.5)}%` }}
                />
              </div>
            </div>

            {/* Extra detail if we got it from atlasSize */}
            {(storage.objects != null || storage.collections != null) && (
              <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-slate-100">
                {storage.collections != null && (
                  <span><b>{storage.collections}</b> collections</span>
                )}
                {storage.objects != null && (
                  <span><b>{storage.objects}</b> documents</span>
                )}
                {storage.indexSizeBytes != null && (
                  <span>Indexes: <b>{(storage.indexSizeBytes / (1024 * 1024)).toFixed(2)} MB</b></span>
                )}
              </div>
            )}

            <p className="text-[11px] text-slate-400 italic">
              Source: Atlas cluster metrics. Values refresh on page load or via the Refresh button.
            </p>
          </div>
        )}
      </Card>

      {/* Database Cleanup */}
      <Card title="Database Cleanup">
        <p className="text-xs text-slate-500 mb-3">
          Remove stale records to free up MongoDB storage. These actions are permanent — student,
          faculty, subject, marks, and material records are not affected.
        </p>
        <div className="grid md:grid-cols-2 gap-2">
          {CLEANUP_OPTIONS.map((opt) => (
            <div key={opt.key} className="border border-slate-200 rounded-lg p-3">
              <p className="font-medium text-sm text-slate-800">{opt.label}</p>
              <p className="text-xs text-slate-500 mt-1 mb-3">{opt.description}</p>
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
            <li key={a._id} className="py-2 flex flex-wrap justify-between gap-2">
              <span className="text-slate-700">{a.description || a.action}</span>
              <span className="text-slate-400 text-xs">
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
          {d.recentActivity.length === 0 && (
            <li className="py-2 text-slate-500">No activity yet.</li>
          )}
        </ul>
      </Card>

      {/* Cleanup confirmation modal */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Confirm cleanup?">
        {confirm && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              You are about to <b>{confirm.label.toLowerCase()}</b>.
            </p>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3">
              This action cannot be undone. Student, faculty, subject, marks, and academic records
              are not affected.
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirm(null)}
                disabled={cleaning}
              >
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