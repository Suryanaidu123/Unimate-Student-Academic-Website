import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ClipboardCheck, Snowflake, Play, CheckCircle, Users, Clock } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';

export default function AttendanceDashboard() {
  const [frozen, setFrozen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [freezeModal, setFreezeModal] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/attendance/freeze-status');
      setFrozen(r.data.data);
    } catch {
      toast.error('Failed to load status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function doFreeze() {
    setBusy(true);
    try {
      await api.post('/attendance/freeze', { reason });
      toast.success('Attendance frozen');
      setFreezeModal(false);
      setReason('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  }

  async function doResume() {
    setBusy(true);
    try {
      await api.post('/attendance/resume', { reason: 'Classes resumed' });
      toast.success('Attendance resumed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  }

  const windowInfo = frozen?.window;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">COP Dashboard</h1>
        <p className="text-sm text-slate-500">
          Class Operations Person — record attendance and manage the freeze state.
        </p>
      </div>

      {/* Time window banner */}
      {windowInfo && (
        <Card>
          <div className={`flex items-center gap-2 text-sm ${windowInfo.ok ? 'text-green-700' : 'text-amber-700'}`}>
            <Clock size={16} />
            {windowInfo.ok
              ? 'Attendance window is OPEN (9:00 AM – 4:30 PM, Mon–Sat).'
              : `Attendance window is CLOSED — ${windowInfo.reason}`}
          </div>
        </Card>
      )}

      <Card title="Attendance Status">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {frozen?.frozen ? (
                <>
                  <Snowflake className="text-blue-600" size={22} />
                  <Badge variant="info">Frozen</Badge>
                  <span className="text-sm text-slate-600">
                    Attendance recording is paused.
                    {frozen.reason && <> Reason: <b>{frozen.reason}</b></>}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="text-green-600" size={22} />
                  <Badge variant="success">Active</Badge>
                  <span className="text-sm text-slate-600">Attendance recording is active.</span>
                </>
              )}
            </div>

            <div className="flex gap-2">
              {frozen?.frozen ? (
                <Button onClick={doResume} disabled={busy}>
                  <Play size={14} /> {busy ? 'Resuming…' : 'Resume Attendance'}
                </Button>
              ) : (
                <Button variant="danger" onClick={() => setFreezeModal(true)} disabled={busy}>
                  <Snowflake size={14} /> Freeze Attendance
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card title="Actions">
        <div className="grid md:grid-cols-3 gap-3">
          <Link to="/attendance/mark" className="block">
            <div className="border border-slate-200 rounded-lg p-4 hover:border-brand-400 transition h-full">
              <ClipboardCheck className="text-brand-600 mb-2" size={22} />
              <h3 className="font-semibold">Mark Attendance</h3>
              <p className="text-xs text-slate-500 mt-1">
                Record attendance for the entire class using the timetable.
              </p>
            </div>
          </Link>
          <Link to="/attendance/summary" className="block">
            <div className="border border-slate-200 rounded-lg p-4 hover:border-brand-400 transition h-full">
              <Users className="text-amber-600 mb-2" size={22} />
              <h3 className="font-semibold">Year-wise Summary</h3>
              <p className="text-xs text-slate-500 mt-1">
                See held / attended totals for every student in a year.
              </p>
            </div>
          </Link>
          <Link to="/attendance/sessions" className="block">
            <div className="border border-slate-200 rounded-lg p-4 hover:border-brand-400 transition h-full">
              <ClipboardCheck className="text-green-600 mb-2" size={22} />
              <h3 className="font-semibold">Sessions</h3>
              <p className="text-xs text-slate-500 mt-1">
                Browse previously recorded sessions.
              </p>
            </div>
          </Link>
        </div>
      </Card>

      <Modal open={freezeModal} onClose={() => setFreezeModal(false)} title="Freeze Attendance">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Freezing pauses new attendance recording. Existing records remain unchanged.
          </p>
          <label className="block">
            <span className="label">Reason (e.g. Vacation, Holiday)</span>
            <input type="text" className="input" value={reason}
              onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFreezeModal(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={doFreeze} disabled={busy}>
              <Snowflake size={14} /> {busy ? 'Freezing…' : 'Freeze'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}