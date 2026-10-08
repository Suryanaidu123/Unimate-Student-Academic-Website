/**
 * Admin — Faculty Document Visibility
 * Grant/revoke which academic years a faculty member can view student documents for.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Users } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

const YEARS = [2, 3, 4];
const YEAR_LABELS = { 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

export default function AdminDocumentVisibility() {
  const [faculties, setFaculties] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(null); // facultyId being saved

  useEffect(() => {
    api.get('/faculty?limit=200')
      .then((r) => setFaculties(r.data.data.items || []))
      .catch(() => toast.error('Failed to load faculty'))
      .finally(() => setLoading(false));
  }, []);

  function toggleYear(facultyId, year) {
    setFaculties((prev) => prev.map((f) => {
      if (String(f._id) !== String(facultyId)) return f;
      const current = f.documentVisibilityYears || [];
      const updated  = current.includes(year)
        ? current.filter((y) => y !== year)
        : [...current, year];
      return { ...f, documentVisibilityYears: updated };
    }));
  }

  async function save(faculty) {
    setSaving(faculty._id);
    try {
      await api.put(`/student-docs/visibility/${faculty._id}`, {
        years: faculty.documentVisibilityYears || [],
      });
      toast.success(`Visibility updated for ${faculty.name || faculty.employeeId}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(null); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Eye size={22} className="text-brand-600" /> Document Visibility
        </h1>
        <p className="text-sm text-slate-500">
          Control which academic years each faculty member can view student documents for.
        </p>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading faculty…</p>
        ) : faculties.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No faculty members found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {faculties.map((f) => {
              const granted = f.documentVisibilityYears || [];
              const busy    = saving === f._id;
              return (
                <div key={f._id} className="py-4 flex flex-wrap items-center gap-4 first:pt-0">
                  {/* Faculty info */}
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <div className="p-2 rounded-full bg-brand-50 text-brand-700">
                      <Users size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {f.name || '(pending)'}
                      </p>
                      <p className="text-xs text-slate-500">{f.employeeId}</p>
                    </div>
                  </div>

                  {/* Year toggles */}
                  <div className="flex flex-wrap gap-2 flex-1">
                    {YEARS.map((y) => {
                      const on = granted.includes(y);
                      return (
                        <button
                          key={y}
                          type="button"
                          onClick={() => toggleYear(f._id, y)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                            on
                              ? 'bg-green-100 border-green-300 text-green-800'
                              : 'bg-slate-100 border-slate-300 text-slate-500'
                          }`}
                        >
                          {on ? <Eye size={12} /> : <EyeOff size={12} />}
                          {YEAR_LABELS[y]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Current access summary */}
                  <div className="flex flex-wrap gap-1 min-w-[120px]">
                    {granted.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No access</span>
                    ) : (
                      granted.sort().map((y) => (
                        <Badge key={y} variant="success">{YEAR_LABELS[y]}</Badge>
                      ))
                    )}
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
