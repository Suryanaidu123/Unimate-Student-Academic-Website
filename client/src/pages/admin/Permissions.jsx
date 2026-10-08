/**
 * Admin — Faculty Permissions
 * Controls which faculty members can manage SGPA/CGPA activation.
 * Uses the same UX pattern as DocumentVisibility.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, ShieldOff, Users, TrendingUp } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function AdminPermissions() {
  const [faculties, setFaculties] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(null);

  useEffect(() => {
    api.get('/faculty?limit=200')
      .then((r) => setFaculties(r.data.data.items || []))
      .catch(() => toast.error('Failed to load faculty'))
      .finally(() => setLoading(false));
  }, []);

  function toggleSgpa(facultyId) {
    setFaculties((prev) => prev.map((f) =>
      String(f._id) === String(facultyId)
        ? { ...f, canManageSgpa: !f.canManageSgpa }
        : f
    ));
  }

  async function save(faculty) {
    setSaving(faculty._id);
    try {
      const r = await api.patch(`/faculty/${faculty._id}/permissions`, {
        canManageSgpa: !!faculty.canManageSgpa,
      });
      setFaculties((prev) => prev.map((f) =>
        String(f._id) === String(faculty._id) ? r.data.data : f
      ));
      toast.success(`Permissions updated for ${faculty.name || faculty.employeeId}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(null); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={22} className="text-brand-600" /> Faculty Permissions
        </h1>
        <p className="text-sm text-slate-500">
          Control which faculty members can manage SGPA &amp; CGPA semester activation.
          Faculty without this permission cannot activate or deactivate SGPA/CGPA entries.
        </p>
      </div>

      {/* SGPA/CGPA Management Permission */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-600" />
            SGPA &amp; CGPA Management
          </span>
        }
      >
        <p className="text-xs text-slate-500 mb-4">
          Faculty members with this permission can activate/deactivate SGPA and CGPA entry
          for students. The existing future-semester restrictions still apply regardless of permission.
        </p>

        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading faculty…</p>
        ) : faculties.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No faculty members found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {faculties.map((f) => {
              const allowed = !!f.canManageSgpa;
              const busy    = saving === f._id;
              return (
                <div key={f._id} className="py-3.5 flex flex-wrap items-center gap-4 first:pt-0">
                  {/* Faculty info */}
                  <div className="flex items-center gap-3 min-w-[200px] flex-1">
                    <div className="p-2 rounded-full bg-brand-50 text-brand-700 shrink-0">
                      <Users size={15} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {f.name || '(pending)'}
                      </p>
                      <p className="text-xs text-slate-500">{f.employeeId} · {f.designation}</p>
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleSgpa(f._id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                      allowed
                        ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
                        : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {allowed
                      ? <ShieldCheck size={13} className="text-green-600" />
                      : <ShieldOff  size={13} className="text-slate-400" />}
                    SGPA &amp; CGPA Activation
                  </button>

                  {/* Status */}
                  <div className="min-w-[80px]">
                    {allowed
                      ? <Badge variant="success">Permitted</Badge>
                      : <Badge variant="default">No Access</Badge>}
                  </div>

                  {/* Save */}
                  <Button variant="secondary" onClick={() => save(f)} disabled={busy}>
                    {busy ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
