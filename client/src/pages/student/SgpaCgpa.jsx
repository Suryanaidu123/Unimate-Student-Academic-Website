/**
 * Student SGPA/CGPA page.
 *
 * Sections:
 *  1. SGPA table — one row per completed semester, showing status + inline entry
 *  2. CGPA entry — shown when activated
 *  3. Failed Subjects — per-semester failed subject entry
 */
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  TrendingUp, CheckCircle2, Loader2, AlertCircle,
  AlertTriangle, Plus, Trash2, Lock,
} from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

// ── constants ─────────────────────────────────────────────────────────────────
const SEM_LABELS = {
  1:'1-1', 2:'1-2', 3:'2-1', 4:'2-2', 5:'3-1', 6:'3-2', 7:'4-1', 8:'4-2',
};

// ── helpers ───────────────────────────────────────────────────────────────────
function semLabel(sem) { return SEM_LABELS[sem] || String(sem); }

/** Find an existing semesterEntry from the record for a given semester number */
function getEntry(record, semester) {
  return (record?.semesterEntries || []).find((e) => e.semester === semester) || null;
}

/** Determine the edit status for a semester entry */
function entryStatus(entry) {
  if (!entry || entry.editCount === 0) return 'pending';     // never submitted
  if (entry.clearedByAdmin)            return 'cleared';     // admin reset
  if (entry.editCount === 1)           return 'submitted';   // submitted, 1 edit left
  if (entry.editCount >= 2)            return 'locked';      // no more edits
  return 'pending';
}

// ── main component ────────────────────────────────────────────────────────────
export default function StudentSgpaCgpa() {
  const [activation, setActivation] = useState(null);   // from /my-activation
  const [record,     setRecord]     = useState(null);   // from /my
  const [loading,    setLoading]    = useState(true);

  // Per-semester input values (controlled inputs while typing)
  const [sgpaInputs,  setSgpaInputs]  = useState({}); // { [semester]: string }
  const [saving,      setSaving]      = useState(null); // semester number being saved
  const [cgpaInput,   setCgpaInput]   = useState('');
  const [savingCgpa,  setSavingCgpa]  = useState(false);

  // Failed subjects state
  const [failedSem,     setFailedSem]     = useState('');  // selected semester for adding
  const [failedName,    setFailedName]    = useState('');
  const [failedCode,    setFailedCode]    = useState('');
  const [savingFailed,  setSavingFailed]  = useState(false);

  // ── load ────────────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/sgpa-cgpa/my-activation'),
      api.get('/sgpa-cgpa/my'),
    ])
      .then(([actRes, myRes]) => {
        const act = actRes.data.data || null;
        const rec = myRes.data.data  || null;
        setActivation(act);
        setRecord(rec);

        // Pre-fill inputs from existing record
        const inputs = {};
        (act?.semesters || []).forEach((s) => {
          const e = getEntry(rec, s.semester);
          if (e?.sgpa != null) inputs[s.semester] = String(e.sgpa);
        });
        setSgpaInputs(inputs);
        if (rec?.cgpa != null) setCgpaInput(String(rec.cgpa));
      })
      .catch(() => toast.error('Failed to load SGPA/CGPA data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── submit one semester SGPA ─────────────────────────────────────────────────
  async function submitSemester(semester) {
    const val = sgpaInputs[semester];
    if (val === undefined || val === '') return toast.error('Enter a value first.');
    const n = Number(val);
    if (isNaN(n) || n < 0 || n > 10) return toast.error('SGPA must be 0 – 10.');

    setSaving(semester);
    try {
      const r = await api.post('/sgpa-cgpa/submit-sgpa', { semester, sgpa: n });
      setRecord(r.data.data);
      toast.success(`${semLabel(semester)} SGPA saved.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(null); }
  }

  // ── submit CGPA ──────────────────────────────────────────────────────────────
  async function submitCgpa() {
    const n = Number(cgpaInput);
    if (isNaN(n) || n < 0 || n > 10) return toast.error('CGPA must be 0 – 10.');
    setSavingCgpa(true);
    try {
      const r = await api.post('/sgpa-cgpa/submit-cgpa', { cgpa: n });
      setRecord(r.data.data);
      toast.success('CGPA saved.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSavingCgpa(false); }
  }

  // ── add a failed subject ─────────────────────────────────────────────────────
  async function addFailedSubject() {
    if (!failedSem)  return toast.error('Select a semester.');
    if (!failedName.trim()) return toast.error('Enter subject name.');

    // Build the updated list for that semester
    const existingForSem = (record?.failedSubjects || [])
      .filter((f) => f.semester === Number(failedSem));
    const newSubjects = [
      ...existingForSem,
      { subjectName: failedName.trim(), subjectCode: failedCode.trim() },
    ];

    setSavingFailed(true);
    try {
      const r = await api.post('/sgpa-cgpa/submit-failed', {
        semester: Number(failedSem),
        subjects: newSubjects,
      });
      setRecord(r.data.data);
      setFailedName('');
      setFailedCode('');
      toast.success('Failed subject added.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSavingFailed(false); }
  }

  // ── remove a failed subject ─────────────────────────────────────────────────
  async function removeFailedSubject(semester, idx) {
    const remaining = (record?.failedSubjects || [])
      .filter((f) => f.semester === semester)
      .filter((_, i) => i !== idx);

    try {
      const r = await api.post('/sgpa-cgpa/submit-failed', {
        semester,
        subjects: remaining,
      });
      setRecord(r.data.data);
      toast.success('Removed.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  }

  // ── render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp size={22} className="text-brand-600" /> SGPA &amp; CGPA
        </h1>
        <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>
      </div>
    );
  }

  const semesters      = activation?.semesters || [];
  const cgpaActive     = activation?.cgpaActive ?? false;
  const anyActive      = semesters.some((s) => s.sgpaActive) || cgpaActive;
  const allFailedSubs  = record?.failedSubjects || [];

  // Semesters available for failed-subjects selection (all completed sems)
  const completedSems  = semesters.map((s) => s.semester);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp size={22} className="text-brand-600" /> SGPA &amp; CGPA
        </h1>
        <p className="text-sm text-slate-500">
          Enter your semester-wise SGPA, CGPA, and any failed subjects.
        </p>
      </div>

      {/* Nothing active notice */}
      {!anyActive && (
        <Card>
          <div className="flex items-center gap-3 text-amber-700 py-2">
            <AlertCircle size={20} className="shrink-0" />
            <div>
              <p className="font-medium">No entry windows are currently open.</p>
              <p className="text-sm text-slate-500 mt-0.5">
                Faculty/Admin must activate SGPA or CGPA entry for your year. Check back later.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── SGPA table ── */}
      {semesters.length > 0 && (
        <Card title="Semester-wise SGPA">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left pb-2 pr-3 w-16">Sem</th>
                  <th className="text-left pb-2 pr-3">Entry</th>
                  <th className="text-left pb-2 pr-3 w-32">Status</th>
                  <th className="text-left pb-2 w-28">Action</th>
                </tr>
              </thead>
              <tbody>
                {semesters.map((s) => {
                  const entry   = getEntry(record, s.semester);
                  const status  = entryStatus(entry);
                  const isActive = s.sgpaActive;
                  const canEdit  =
                    isActive &&
                    (status === 'pending' || status === 'submitted' || status === 'cleared');
                  const isSaving = saving === s.semester;

                  return (
                    <tr key={s.semester}
                      className="border-b border-slate-50 last:border-0">

                      {/* Sem label */}
                      <td className="py-2.5 pr-3">
                        <span className="font-bold text-brand-700">{s.label}</span>
                        {!isActive && (
                          <span className="ml-1 text-[10px] text-slate-400 block">Inactive</span>
                        )}
                      </td>

                      {/* Input */}
                      <td className="py-2.5 pr-3">
                        {canEdit ? (
                          <input
                            type="number"
                            step="0.01" min="0" max="10"
                            className="input !py-1.5 !text-sm w-28"
                            placeholder="0.00 – 10.00"
                            value={sgpaInputs[s.semester] ?? (entry?.sgpa != null ? String(entry.sgpa) : '')}
                            onChange={(e) =>
                              setSgpaInputs((prev) => ({ ...prev, [s.semester]: e.target.value }))
                            }
                          />
                        ) : status === 'locked' ? (
                          <span className="font-semibold text-slate-800">
                            {entry?.sgpa?.toFixed(2) ?? '—'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            {isActive ? 'Enter value above' : 'Not yet open'}
                          </span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="py-2.5 pr-3">
                        {status === 'locked'    && (
                          <Badge variant="default">
                            <Lock size={10} className="mr-1 inline" />Locked
                          </Badge>
                        )}
                        {status === 'submitted' && (
                          <Badge variant="success">
                            <CheckCircle2 size={10} className="mr-1 inline" />Submitted
                          </Badge>
                        )}
                        {status === 'cleared'   && (
                          <Badge variant="warning">Cleared — Re-enter</Badge>
                        )}
                        {status === 'pending'   && isActive && (
                          <Badge variant="info">Active</Badge>
                        )}
                        {status === 'pending'   && !isActive && (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </td>

                      {/* Save button */}
                      <td className="py-2.5">
                        {canEdit && (
                          <Button
                            onClick={() => submitSemester(s.semester)}
                            disabled={isSaving}
                            variant="primary"
                          >
                            {isSaving
                              ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                              : status === 'submitted' ? 'Update' : 'Save'}
                          </Button>
                        )}
                        {status === 'locked' && (
                          <span className="text-xs text-slate-400">
                            Contact admin to edit
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Edit-limit notice */}
          <p className="text-xs text-slate-400 mt-3">
            You may submit each semester SGPA once and edit it one additional time.
            After that, contact Faculty/Admin for any corrections.
          </p>
        </Card>
      )}

      {/* ── CGPA ── */}
      {cgpaActive && (
        <Card title="CGPA">
          <div className="space-y-3 max-w-sm">
            {record?.cgpa != null && (
              <div className="flex items-center gap-3">
                <div className="bg-brand-50 border border-brand-200 rounded-xl px-5 py-2 text-center">
                  <p className="text-2xl font-bold text-brand-700">{record.cgpa.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">Current CGPA</p>
                </div>
                {record.cgpaEditCount >= 2 && (
                  <Badge variant="default">
                    <Lock size={10} className="mr-1 inline" />Locked
                  </Badge>
                )}
              </div>
            )}

            {(record?.cgpaEditCount ?? 0) < 2 || record?.cgpaClearedByAdmin ? (
              <>
                <label className="block">
                  <span className="label flex items-center gap-2">
                    {record?.cgpa != null ? 'Update CGPA' : 'Enter CGPA'}
                    <Badge variant="success">Entry Open</Badge>
                  </span>
                  <input
                    type="number"
                    step="0.01" min="0" max="10"
                    className="input"
                    placeholder="e.g. 8.42"
                    value={cgpaInput}
                    onChange={(e) => setCgpaInput(e.target.value)}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Cumulative Grade Point Average across all completed semesters (0 – 10)
                  </p>
                </label>
                <Button onClick={submitCgpa} disabled={savingCgpa}>
                  {savingCgpa
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : record?.cgpa != null ? 'Update CGPA' : 'Submit CGPA'}
                </Button>
              </>
            ) : (
              <p className="text-xs text-slate-500">
                CGPA is locked. Contact Faculty/Admin to make corrections.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* ── Failed Subjects ── */}
      {completedSems.length > 0 && (
        <Card title={
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Failed Subjects
          </span>
        }>
          <p className="text-xs text-slate-500 mb-4">
            Record subjects you have failed in any semester. This is for academic tracking only.
          </p>

          {/* Existing failed subjects grouped by semester */}
          {completedSems.map((sem) => {
            const forSem = allFailedSubs.filter((f) => f.semester === sem);
            if (forSem.length === 0) return null;
            return (
              <div key={sem} className="mb-3">
                <p className="text-xs font-semibold text-slate-600 mb-1">
                  {semLabel(sem)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {forSem.map((f, idx) => (
                    <span key={idx}
                      className="flex items-center gap-1.5 bg-red-50 border border-red-200
                                 text-red-700 text-xs rounded-lg px-2.5 py-1">
                      {f.subjectName}
                      {f.subjectCode && <span className="text-red-400">({f.subjectCode})</span>}
                      <button
                        onClick={() => removeFailedSubject(sem, idx)}
                        className="hover:text-red-900 ml-0.5"
                        title="Remove"
                      >
                        <Trash2 size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Add new failed subject */}
          <div className="border border-dashed border-slate-300 rounded-xl p-4 space-y-3 mt-2">
            <p className="text-xs font-semibold text-slate-600">Add Failed Subject</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                className="input"
                value={failedSem}
                onChange={(e) => setFailedSem(e.target.value)}
              >
                <option value="">Select Semester</option>
                {completedSems.map((sem) => (
                  <option key={sem} value={sem}>{semLabel(sem)}</option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Subject Name *"
                value={failedName}
                onChange={(e) => setFailedName(e.target.value)}
              />
              <input
                className="input"
                placeholder="Subject Code (optional)"
                value={failedCode}
                onChange={(e) => setFailedCode(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              onClick={addFailedSubject}
              disabled={savingFailed}
            >
              {savingFailed
                ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                : <><Plus size={13} /> Add Failed Subject</>}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
