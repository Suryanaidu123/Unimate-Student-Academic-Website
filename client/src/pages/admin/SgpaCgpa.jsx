/**
 * Admin + Faculty SGPA/CGPA page.
 *
 * Sections:
 *  1. Activation — per semester toggle (+ CGPA per year)
 *  2. Top Performers — highest SGPA per semester + highest CGPA
 *  3. Tracking — year-wise student table with per-semester SGPA, CGPA,
 *               failed subjects, status, admin clear actions
 *  4. Excel export — Roll No, Name, Year, sem-wise SGPA cols, CGPA, Failed Subjects
 */
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  TrendingUp, Users, Download, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, ToggleLeft, ToggleRight, Trophy, AlertTriangle,
} from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

// ── constants ─────────────────────────────────────────────────────────────────
const YEAR_LABELS = { 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

// All possible semesters a student can have (1-1 through 4-2)
const ALL_SEMS = [1, 2, 3, 4, 5, 6, 7, 8];
const SEM_LABELS = { 1:'1-1', 2:'1-2', 3:'2-1', 4:'2-2', 5:'3-1', 6:'3-2', 7:'4-1', 8:'4-2' };

// Semesters relevant to each year
const YEAR_SEMS = { 2: [3, 4], 3: [5, 6], 4: [7, 8] };

// ── Excel export ──────────────────────────────────────────────────────────────
function exportTracking(tracking) {
  const rows = tracking.rows.map((r) => {
    const semByNum = {};
    (r.semDetails || []).forEach((d) => { semByNum[d.semester] = d.sgpa; });

    const entry = {
      'Roll No': r.rollNumber,
      'Name':    r.name,
      'Year':    `${r.year} Year`,
    };

    // Only include semesters up to the student's currentSemester
    for (let s = 1; s <= (r.currentSemester || 8); s++) {
      entry[`${SEM_LABELS[s]} SGPA`] = semByNum[s] ?? '—';
    }

    entry['CGPA'] = r.cgpa != null ? r.cgpa : '—';
    entry['Failed Subjects'] = (r.failedSubjects || [])
      .map((f) => `${SEM_LABELS[f.semester] || f.semester}: ${f.subjectName}`)
      .join('; ') || '—';

    return entry;
  });

  if (!rows.length) { toast.error('No data to export.'); return; }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Year ${tracking.year}`);
  XLSX.writeFile(wb, `sgpa_cgpa_year${tracking.year}.xlsx`);
  toast.success('Excel exported.');
}

// ── helper ────────────────────────────────────────────────────────────────────
function reloadTracking(year, setTracking, setLoadingTrack) {
  setLoadingTrack(true);
  setTracking(null);
  api.get(`/sgpa-cgpa/tracking/${year}`)
    .then((r) => setTracking(r.data.data))
    .catch(() => toast.error('Failed to load tracking'))
    .finally(() => setLoadingTrack(false));
}

// ── main component ────────────────────────────────────────────────────────────
export default function AdminSgpaCgpa() {
  const [activations,   setActivations]   = useState([]);
  const [loadingAct,    setLoadingAct]     = useState(true);
  const [toggling,      setToggling]       = useState(null);

  const [trackingYear,  setTrackingYear]   = useState(3);
  const [tracking,      setTracking]       = useState(null);
  const [loadingTrack,  setLoadingTrack]   = useState(false);
  const [expandedRows,  setExpandedRows]   = useState({}); // { studentId: bool }

  // Load activations
  useEffect(() => {
    api.get('/sgpa-cgpa/activations')
      .then((r) => setActivations(r.data.data || []))
      .catch(() => toast.error('Failed to load activations'))
      .finally(() => setLoadingAct(false));
  }, []);

  // Load tracking when year changes
  useEffect(() => {
    reloadTracking(trackingYear, setTracking, setLoadingTrack);
  }, [trackingYear]);

  // ── Toggle semester SGPA activation ─────────────────────────────────────────
  async function toggleSem(year, semester, currentVal) {
    const key = `${year}-${semester}`;
    setToggling(key);
    try {
      await api.put(`/sgpa-cgpa/activations/semester/${year}/${semester}`, {
        sgpaActive: !currentVal,
      });
      // Refresh activations
      const r = await api.get('/sgpa-cgpa/activations');
      setActivations(r.data.data || []);
      toast.success(`${YEAR_LABELS[year]} ${SEM_LABELS[semester]} SGPA ${!currentVal ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setToggling(null); }
  }

  // ── Toggle year-level CGPA activation ────────────────────────────────────────
  async function toggleCgpa(year, currentVal) {
    const key = `cgpa-${year}`;
    setToggling(key);
    try {
      await api.put(`/sgpa-cgpa/activations/cgpa/${year}`, { cgpaActive: !currentVal });
      const r = await api.get('/sgpa-cgpa/activations');
      setActivations(r.data.data || []);
      toast.success(`${YEAR_LABELS[year]} CGPA ${!currentVal ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setToggling(null); }
  }

  // ── Admin clear actions ───────────────────────────────────────────────────────
  async function clearSem(studentId, semester, name) {
    if (!window.confirm(`Clear ${SEM_LABELS[semester]} SGPA for ${name}? They can re-submit.`)) return;
    try {
      await api.patch(`/sgpa-cgpa/admin/${studentId}/clear-sem/${semester}`);
      toast.success(`${SEM_LABELS[semester]} SGPA cleared.`);
      reloadTracking(trackingYear, setTracking, setLoadingTrack);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  async function clearCgpa(studentId, name) {
    if (!window.confirm(`Clear CGPA for ${name}? They can re-submit.`)) return;
    try {
      await api.patch(`/sgpa-cgpa/admin/${studentId}/clear-cgpa`);
      toast.success('CGPA cleared.');
      reloadTracking(trackingYear, setTracking, setLoadingTrack);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  async function deleteRecord(studentId, name) {
    if (!window.confirm(`Delete ALL SGPA/CGPA data for ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/sgpa-cgpa/admin/${studentId}`);
      toast.success('Record deleted.');
      reloadTracking(trackingYear, setTracking, setLoadingTrack);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  function toggleRow(sid) {
    setExpandedRows((p) => ({ ...p, [sid]: !p[sid] }));
  }

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp size={22} className="text-brand-600" /> SGPA &amp; CGPA
        </h1>
        <p className="text-sm text-slate-500">
          Activate semester-wise SGPA/CGPA entry and track student submissions.
        </p>
      </div>

      {/* ── 1. Activation panel ── */}
      <Card title="Activation Settings">
        {loadingAct ? (
          <p className="text-sm text-slate-500 py-4 text-center">Loading…</p>
        ) : (
          <div className="space-y-6">
            {activations.map((yearData) => (
              <div key={yearData.year}>
                <h3 className="text-sm font-bold text-slate-700 mb-3">
                  {YEAR_LABELS[yearData.year]}
                </h3>

                {/* Semester SGPA toggles */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {(yearData.semesters || []).map((s) => {
                    const key    = `${yearData.year}-${s.semester}`;
                    const busy   = toggling === key;
                    const future = s.isFuture;
                    return (
                      <button
                        key={s.semester}
                        onClick={() => !future && toggleSem(yearData.year, s.semester, s.sgpaActive)}
                        disabled={busy || future}
                        title={future
                          ? `Cannot activate — students are not yet in semester ${s.label}`
                          : undefined}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                          future
                            ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                            : s.sgpaActive
                            ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
                            : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {future
                          ? <span className="text-slate-300">—</span>
                          : s.sgpaActive
                          ? <ToggleRight size={14} className="text-green-600" />
                          : <ToggleLeft  size={14} className="text-slate-400" />}
                        {s.label} SGPA
                        {future && <span className="text-[10px] text-slate-300 ml-1">(future)</span>}
                      </button>
                    );
                  })}
                </div>

                {/* CGPA toggle */}
                <button
                  onClick={() => toggleCgpa(yearData.year, yearData.cgpaActive)}
                  disabled={toggling === `cgpa-${yearData.year}`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    yearData.cgpaActive
                      ? 'bg-brand-100 border-brand-300 text-brand-800 hover:bg-brand-200'
                      : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {yearData.cgpaActive
                    ? <ToggleRight size={14} className="text-brand-600" />
                    : <ToggleLeft  size={14} className="text-slate-400" />}
                  CGPA Entry
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── 2. Top Performers ── */}
      {tracking && (
        <Card title={<span className="flex items-center gap-2"><Trophy size={16} className="text-amber-500" /> Top Performers — {YEAR_LABELS[trackingYear]}</span>}>
          <div className="space-y-4">
            {/* Top CGPA */}
            {tracking.topCgpa && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <Trophy size={20} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 font-medium">Highest CGPA</p>
                  <p className="font-bold text-slate-900">
                    {tracking.topCgpa.cgpa.toFixed(2)}
                    <span className="text-sm font-normal text-slate-600 ml-2">
                      — {tracking.topCgpa.name} ({tracking.topCgpa.rollNumber})
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Top SGPA per semester */}
            {Object.keys(tracking.topBySem).length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-100">
                      <th className="text-left pb-2 pr-4">Semester</th>
                      <th className="text-left pb-2 pr-4">Highest SGPA</th>
                      <th className="text-left pb-2">Student</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(tracking.topBySem)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([sem, info]) => (
                        <tr key={sem} className="border-b border-slate-50">
                          <td className="py-1.5 pr-4 font-semibold text-brand-700">
                            {info.label}
                          </td>
                          <td className="py-1.5 pr-4 font-bold text-slate-800">
                            {info.sgpa.toFixed(2)}
                          </td>
                          <td className="py-1.5 text-xs text-slate-600">
                            {info.name} ({info.rollNumber})
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── 3. Tracking ── */}
      <Card
        title={
          <div className="flex flex-wrap items-center gap-3 w-full">
            <span className="flex items-center gap-2">
              <Users size={16} /> Submission Tracking
            </span>
            <div className="flex gap-1 ml-auto">
              {[2, 3, 4].map((y) => (
                <button key={y} onClick={() => setTrackingYear(y)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                    trackingYear === y
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-brand-400'
                  }`}>
                  {y} Yr
                </button>
              ))}
            </div>
          </div>
        }
      >
        {loadingTrack ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
        ) : tracking ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-slate-800">{tracking.total}</p>
                <p className="text-xs text-slate-500 mt-0.5">Total</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{tracking.submitted}</p>
                <p className="text-xs text-slate-500 mt-0.5">Partially/Fully Submitted</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{tracking.notSubmitted}</p>
                <p className="text-xs text-slate-500 mt-0.5">Not Started</p>
              </div>
            </div>

            {/* Export */}
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => exportTracking(tracking)}>
                <Download size={14} /> Export to Excel
              </Button>
            </div>

            {/* Table */}
            <div className="space-y-2">
              {tracking.rows.map((r) => {
                const expanded = expandedRows[String(r.studentId)];
                return (
                  <div key={String(r.studentId)}
                    className="border border-slate-200 rounded-xl overflow-hidden">

                    {/* Row header */}
                    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-slate-50
                                    cursor-pointer hover:bg-slate-100 transition"
                      onClick={() => toggleRow(String(r.studentId))}>

                      <span className="font-mono text-xs text-slate-500 w-28 shrink-0">
                        {r.rollNumber}
                      </span>
                      <span className="font-semibold text-sm text-slate-800 flex-1 min-w-0 truncate">
                        {r.name}
                      </span>

                      {/* Sem submitted count */}
                      <span className="text-xs text-slate-500">
                        {r.submittedCount}/{r.totalSems} sems
                      </span>

                      {/* CGPA badge */}
                      {r.cgpa != null
                        ? <Badge variant="success">CGPA {r.cgpa.toFixed(2)}</Badge>
                        : <Badge variant="default">No CGPA</Badge>}

                      {r.submittedCount > 0
                        ? <Badge variant="success"><CheckCircle2 size={10} className="mr-1 inline"/>Submitted</Badge>
                        : <Badge variant="danger"><XCircle size={10} className="mr-1 inline"/>Not Started</Badge>}

                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>

                    {/* Expanded detail */}
                    {expanded && (
                      <div className="px-4 py-3 space-y-3 border-t border-slate-100">

                        {/* Per-semester SGPA */}
                        <div className="overflow-x-auto">
                          <table className="min-w-[540px] w-full text-xs">
                            <thead>
                              <tr className="text-slate-400 text-left border-b border-slate-100">
                                <th className="pb-1.5 pr-3">Semester</th>
                                <th className="pb-1.5 pr-3 text-right">SGPA</th>
                                <th className="pb-1.5 pr-3">Status</th>
                                <th className="pb-1.5">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(r.semDetails || []).map((d) => (
                                <tr key={d.semester} className="border-b border-slate-50">
                                  <td className="py-1.5 pr-3 font-semibold text-brand-700">
                                    {d.label}
                                  </td>
                                  <td className="py-1.5 pr-3 text-right font-medium text-slate-800">
                                    {d.sgpa != null ? d.sgpa.toFixed(2) : <span className="text-slate-300">—</span>}
                                  </td>
                                  <td className="py-1.5 pr-3">
                                    {d.submitted
                                      ? d.editCount >= 2
                                        ? <span className="text-slate-500">Locked</span>
                                        : <span className="text-green-600">Submitted</span>
                                      : <span className="text-red-400">Pending</span>}
                                    {d.clearedByAdmin && (
                                      <span className="ml-1 text-amber-600">(Cleared)</span>
                                    )}
                                  </td>
                                  <td className="py-1.5">
                                    {d.submitted && (
                                      <button
                                        onClick={() => clearSem(r.studentId, d.semester, r.name)}
                                        className="text-[11px] px-2 py-0.5 rounded border border-amber-400
                                                   text-amber-700 hover:bg-amber-50 transition whitespace-nowrap"
                                      >
                                        Clear
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* CGPA row */}
                        <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                          <span className="font-semibold text-slate-700">CGPA:</span>
                          <span className="font-bold text-slate-900">
                            {r.cgpa != null ? r.cgpa.toFixed(2) : '—'}
                          </span>
                          {r.cgpa != null && (
                            <button
                              onClick={() => clearCgpa(r.studentId, r.name)}
                              className="px-2 py-0.5 rounded border border-amber-400
                                         text-amber-700 hover:bg-amber-50 transition"
                            >
                              Clear CGPA
                            </button>
                          )}
                          <button
                            onClick={() => deleteRecord(r.studentId, r.name)}
                            className="ml-auto px-2 py-0.5 rounded border border-red-400
                                       text-red-700 hover:bg-red-50 transition"
                          >
                            Delete All
                          </button>
                        </div>

                        {/* Failed subjects */}
                        {(r.failedSubjects || []).length > 0 && (
                          <div className="text-xs">
                            <span className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                              <AlertTriangle size={12} className="text-amber-500" />
                              Failed Subjects:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {r.failedSubjects.map((f, i) => (
                                <span key={i}
                                  className="bg-red-50 border border-red-200 text-red-700
                                             rounded px-2 py-0.5">
                                  {SEM_LABELS[f.semester] || f.semester}: {f.subjectName}
                                  {f.subjectCode ? ` (${f.subjectCode})` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
