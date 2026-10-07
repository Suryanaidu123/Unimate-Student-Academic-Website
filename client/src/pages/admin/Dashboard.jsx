import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Users, UserCheck, BookOpen, Layers, Database, Cloud, Trash2, RefreshCw,
  Download, AlertTriangle, FlaskConical, Star,
} from 'lucide-react';
import api from '../../services/api.js';
import StatCard from '../../components/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';

const CLEANUP_OPTIONS = [
  { key: 'read_notifications', label: 'Delete Read Notifications', description: 'Removes all read notifications.' },
  { key: 'old_notifications', label: 'Delete Notifications Older Than 30 Days', description: 'Removes old notification records.' },
  { key: 'expired_otps', label: 'Delete Expired OTPs', description: 'Removes expired OTP requests.' },
  { key: 'old_audit_logs', label: 'Delete Audit Logs Older Than 90 Days', description: 'Removes old audit logs.' },
  { key: 'clear_lab_faculty', label: 'Clear Lab → Faculty Assignments', description: 'Removes any existing faculty assignments from Labs. Labs are not assigned to faculty.' },
  { key: 'fix_sgpa_index',   label: 'Fix SGPA Activation Index (one-time)',  description: 'Removes old compound-index activation docs. Run once after upgrading to semester-wise activation.' },
];

function StorageCard({ title, icon: Icon, storage, onRefresh, loading, extraFooter }) {
  return (
    <Card
      title={
        <span className="flex items-center justify-between gap-2 w-full">
          <span className="flex items-center gap-2">
            <Icon size={18} className="text-brand-600" />
            {title}
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 disabled:text-slate-400"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </span>
      }
    >
      {!storage ? (
        <p className="text-sm text-slate-500 py-4 text-center">
          {loading ? 'Loading…' : 'Unavailable.'}
        </p>
      ) : storage.configured === false ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
          {storage.message}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Used</p>
              <p className="text-lg font-semibold text-slate-900 mt-0.5">
                {storage.usedMB} <span className="text-sm font-normal text-slate-500">MB</span>
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Remaining</p>
              <p className="text-lg font-semibold text-slate-900 mt-0.5">
                {storage.remainingMB} <span className="text-sm font-normal text-slate-500">MB</span>
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Capacity</p>
              <p className="text-lg font-semibold text-slate-900 mt-0.5">
                {storage.capacityMB} <span className="text-sm font-normal text-slate-500">MB</span>
              </p>
            </div>
          </div>

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

          {extraFooter && <div>{extraFooter}</div>}
        </div>
      )}
    </Card>
  );
}

export default function AdminDashboard() {
  const [d, setD] = useState(null);
  const [mongo, setMongo] = useState(null);
  const [b2, setB2] = useState(null);
  const [downloads, setDownloads] = useState(null);
  const [loadingMongo, setLoadingMongo] = useState(false);
  const [loadingB2, setLoadingB2] = useState(false);
  const [loadingDownloads, setLoadingDownloads] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [cleaning, setCleaning] = useState(false);

  async function loadMongo() {
    setLoadingMongo(true);
    try {
      const r = await api.get('/admin/storage/stats');
      setMongo(r.data.data);
    } catch {
      toast.error('Failed to load MongoDB storage');
    } finally { setLoadingMongo(false); }
  }

  async function loadB2() {
    setLoadingB2(true);
    try {
      const r = await api.get('/admin/storage/b2-stats');
      setB2(r.data.data);
    } catch {
      toast.error('Failed to load B2 storage');
    } finally { setLoadingB2(false); }
  }

  async function loadDownloads() {
    setLoadingDownloads(true);
    try {
      const r = await api.get('/admin/storage/download-stats');
      setDownloads(r.data.data);
    } catch {
      toast.error('Failed to load download stats');
    } finally { setLoadingDownloads(false); }
  }

  useEffect(() => {
    api.get('/dashboard/admin').then((r) => setD(r.data.data));
    loadMongo();
    loadB2();
    loadDownloads();
  }, []);

  async function doCleanup(target) {
    setCleaning(true);
    try {
      const r = await api.post('/admin/cleanup', { target });
      toast.success(r.data.message);
      setConfirm(null);
      await loadMongo();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setCleaning(false); }
  }

  if (!d) return <div className="p-6 text-center text-sm text-slate-500">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>

      {/* Top stat cards — 5 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard icon={Users} label="Total Students" value={d.totalStudents} color="brand" />
        <StatCard icon={UserCheck} label="Total Faculty" value={d.totalFaculty} color="green" />
        <StatCard icon={BookOpen} label="Subjects" value={d.totalSubjects} color="amber" />
        <StatCard icon={FlaskConical} label="Labs" value={d.totalLabs || 0} color="blue" />
        <StatCard icon={Star} label="Activities" value={d.totalActivities || 0} color="purple" />
      </div>

      {/* Year breakdown + sections */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="2nd Year" value={d.secondYear} color="brand" />
        <StatCard label="3rd Year" value={d.thirdYear} color="green" />
        <StatCard label="4th Year" value={d.fourthYear} color="amber" />
        <StatCard icon={Layers} label="Sections" value={d.totalSections} color="blue" />
      </div>

      {/* Storage cards */}
      <div className="grid lg:grid-cols-2 gap-4">
        <StorageCard
          title="MongoDB Storage"
          icon={Database}
          storage={mongo}
          loading={loadingMongo}
          onRefresh={loadMongo}
          extraFooter={
            mongo && (mongo.collections != null || mongo.objects != null) ? (
              <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-slate-100">
                {mongo.collections != null && <span><b>{mongo.collections}</b> collections</span>}
                {mongo.objects != null && <span><b>{mongo.objects}</b> documents</span>}
                {mongo.indexSizeBytes != null && (
                  <span>Indexes: <b>{(mongo.indexSizeBytes / (1024 * 1024)).toFixed(2)} MB</b></span>
                )}
              </div>
            ) : null
          }
        />

        <StorageCard
          title="Backblaze B2 Storage"
          icon={Cloud}
          storage={b2}
          loading={loadingB2}
          onRefresh={() => { loadB2(); loadDownloads(); }}
          extraFooter={
            <>
              {b2?.buckets?.length > 0 && (
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 space-y-1">
                  <p><b>{b2.fileCount}</b> files</p>
                  {b2.buckets.map((b) => (
                    <div key={b.name} className="flex justify-between">
                      <span className="truncate">📁 {b.name}</span>
                      <span>{(b.totalBytes / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  ))}
                </div>
              )}

              {downloads?.today && (
                <div
                  className={`mt-3 pt-3 border-t border-slate-100 rounded-lg p-3 ${
                    downloads.today.warning
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {downloads.today.warning ? (
                      <AlertTriangle size={16} className="text-red-600" />
                    ) : (
                      <Download size={16} className="text-slate-500" />
                    )}
                    <p className={`text-sm font-medium ${
                      downloads.today.warning ? 'text-red-700' : 'text-slate-700'
                    }`}>
                      Today's Download Size: {downloads.today.mb} MB
                    </p>
                  </div>
                  <p className={`text-xs mt-1 ${
                    downloads.today.warning ? 'text-red-600' : 'text-slate-500'
                  }`}>
                    {downloads.today.count} download{downloads.today.count === 1 ? '' : 's'} today
                    {downloads.today.warning
                      ? ` — exceeds the ${downloads.today.warningThresholdMB} MB warning threshold.`
                      : ` — below the ${downloads.today.warningThresholdMB} MB warning threshold.`}
                  </p>
                </div>
              )}
            </>
          }
        />
      </div>

      {/* Database Cleanup */}
      <Card title="Database Cleanup">
        <p className="text-xs text-slate-500 mb-3">
          Remove stale records to free MongoDB space. Does not affect Backblaze B2.
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
              <span className="text-slate-400 text-xs">{new Date(a.createdAt).toLocaleString()}</span>
            </li>
          ))}
          {d.recentActivity.length === 0 && <li className="py-2 text-slate-500">No activity yet.</li>}
        </ul>
      </Card>

      {/* Cleanup confirm modal */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Confirm cleanup?">
        {confirm && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">You are about to <b>{confirm.label.toLowerCase()}</b>.</p>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3">
              This action cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirm(null)} disabled={cleaning}>Cancel</Button>
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