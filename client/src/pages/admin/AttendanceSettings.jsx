import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Snowflake, Play, CheckCircle, Clock } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';

export default function AdminAttendanceSettings() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [freezeModal, setFreezeModal] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/attendance/freeze-status');
      setStatus(r.data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
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
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  }

  async function doResume() {
    setBusy(true);
    try {
      await api.post('/attendance/resume', { reason: 'College resumed' });
      toast.success('Attendance resumed');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  }

  const w = status?.window;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Attendance Settings</h1>
        <p className="text-sm text-slate-500">
          Freeze attendance during holidays or semester breaks. Existing records remain untouched.
        </p>
      </div>

      <Card title="Current Status">
        {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {status?.frozen ? (
                <>
                  <Snowflake className="text-blue-600" size={22} />
                  <Badge variant="info">Frozen</Badge>
                  <span className="text-sm text-slate-600">
                    New attendance cannot be recorded.
                    {status.reason && <> Reason: <b>{status.reason}</b></>}
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

            {w && (
              <div className={`flex items-center gap-2 text-sm ${w.ok ? 'text-green-700' : 'text-amber-700'}`}>
                <Clock size={16} />
                {w.ok ? 'Attendance window is OPEN (9:00 AM – 4:30 PM, Mon–Sat).' : `CLOSED — ${w.reason}`}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {status?.frozen ? (
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

      <Modal open={freezeModal} onClose={() => setFreezeModal(false)} title="Freeze Attendance">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Freezing pauses attendance recording across the entire institution.
            Existing records remain unchanged.
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