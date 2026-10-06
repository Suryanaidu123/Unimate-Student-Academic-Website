import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { TrendingUp, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function StudentSgpaCgpa() {
  const [activation, setActivation] = useState({ sgpaActive: false, cgpaActive: false });
  const [submission,  setSubmission]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [sgpa, setSgpa] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/sgpa-cgpa/my-activation'),
      api.get('/sgpa-cgpa/my'),
    ])
      .then(([actRes, myRes]) => {
        setActivation(actRes.data.data || { sgpaActive: false, cgpaActive: false });
        setSubmission(myRes.data.data || null);
        if (myRes.data.data) {
          setSgpa(myRes.data.data.sgpa != null ? String(myRes.data.data.sgpa) : '');
          setCgpa(myRes.data.data.cgpa != null ? String(myRes.data.data.cgpa) : '');
        }
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const sgpaAllowed = activation.sgpaActive;
  const cgpaAllowed = activation.cgpaActive;
  const anyActive   = sgpaAllowed || cgpaAllowed;

  async function handleSubmit(e) {
    e.preventDefault();
    if (sgpaAllowed && sgpa !== '' && (isNaN(Number(sgpa)) || Number(sgpa) < 0 || Number(sgpa) > 10)) {
      return toast.error('SGPA must be between 0.00 and 10.00');
    }
    if (cgpaAllowed && cgpa !== '' && (isNaN(Number(cgpa)) || Number(cgpa) < 0 || Number(cgpa) > 10)) {
      return toast.error('CGPA must be between 0.00 and 10.00');
    }
    setSaving(true);
    try {
      const payload = {};
      if (sgpaAllowed && sgpa !== '') payload.sgpa = Number(sgpa);
      if (cgpaAllowed && cgpa !== '') payload.cgpa = Number(cgpa);
      const r = await api.post('/sgpa-cgpa/submit', payload);
      setSubmission(r.data.data);
      toast.success('Submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setSaving(false); }
  }

  if (loading) {
    return <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>;
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp size={22} className="text-brand-600" /> SGPA &amp; CGPA
        </h1>
        <p className="text-sm text-slate-500">Submit your current semester SGPA and CGPA.</p>
      </div>

      {/* Current submission status */}
      {submission && (
        <Card>
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">You have already submitted</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Last updated {new Date(submission.updatedAt || submission.submittedAt).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-3 mt-3">
                {submission.sgpa != null && (
                  <div className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-2 text-center">
                    <p className="text-2xl font-bold text-brand-700">{submission.sgpa.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">SGPA</p>
                  </div>
                )}
                {submission.cgpa != null && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-center">
                    <p className="text-2xl font-bold text-green-700">{submission.cgpa.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">CGPA</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Entry form */}
      {!anyActive ? (
        <Card>
          <div className="flex items-center gap-3 text-amber-700">
            <AlertCircle size={20} className="shrink-0" />
            <div>
              <p className="font-medium">Entry not active</p>
              <p className="text-sm text-slate-500 mt-0.5">
                SGPA/CGPA entry is not currently open for your year. Please check back later.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card title={submission ? 'Update Your Submission' : 'Enter Your SGPA / CGPA'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {sgpaAllowed && (
              <label className="block">
                <span className="label flex items-center gap-2">
                  SGPA <Badge variant="success">Entry Open</Badge>
                </span>
                <input
                  type="number"
                  step="0.01" min="0" max="10"
                  className="input"
                  placeholder="e.g. 8.75"
                  value={sgpa}
                  onChange={(e) => setSgpa(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">Enter your Semester Grade Point Average (0 – 10)</p>
              </label>
            )}
            {cgpaAllowed && (
              <label className="block">
                <span className="label flex items-center gap-2">
                  CGPA <Badge variant="success">Entry Open</Badge>
                </span>
                <input
                  type="number"
                  step="0.01" min="0" max="10"
                  className="input"
                  placeholder="e.g. 8.42"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">Enter your Cumulative Grade Point Average (0 – 10)</p>
              </label>
            )}
            <Button type="submit" disabled={saving} className="w-full justify-center">
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Submitting…</>
                : submission ? 'Update Submission' : 'Submit'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
