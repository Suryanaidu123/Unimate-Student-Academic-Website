/**
 * Admin + Faculty SGPA/CGPA page.
 * - Top: Activation toggles (per year)
 * - Bottom: Year-wise tracking table (submitted vs not submitted)
 */
import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  ToggleLeft, ToggleRight, Users, Download, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, TrendingUp,
} from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Table from '../../components/ui/Table.jsx';

const YEAR_LABELS = { 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

function exportTracking(data) {
  // Clean format: Roll No, Name, Year, SGPA, CGPA, Status only
  const rows = data.rows.map((r) => ({
    'Roll No': r.rollNumber,
    'Name':    r.name,
    'Year':    `${r.year} Year`,
    'SGPA':    r.sgpa != null ? r.sgpa : '—',
    'CGPA':    r.cgpa != null ? r.cgpa : '—',
    'Status':  r.submitted ? 'Submitted' : 'Not Submitted',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Year ${data.year}`);
  XLSX.writeFile(wb, `sgpa_cgpa_year${data.year}.xlsx`);
  toast.success('Excel exported.');
}

export default function AdminSgpaCgpa() {
  const [activations, setActivations] = useState([]);
  const [loadingAct,  setLoadingAct]  = useState(true);
  const [toggling, setToggling]       = useState(null); // `${year}-sgpa` or `${year}-cgpa`

  const [trackingYear, setTrackingYear] = useState(3);
  const [tracking,     setTracking]     = useState(null);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [expanded, setExpanded]         = useState(false);

  // Load activations
  useEffect(() => {
    api.get('/sgpa-cgpa/activations')
      .then((r) => setActivations(r.data.data || []))
      .catch(() => toast.error('Failed to load activations'))
      .finally(() => setLoadingAct(false));
  }, []);

  // Load tracking whenever year changes
  useEffect(() => {
    setLoadingTrack(true);
    setTracking(null);
    api.get(`/sgpa-cgpa/tracking/${trackingYear}`)
      .then((r) => setTracking(r.data.data))
      .catch(() => toast.error('Failed to load tracking'))
      .finally(() => setLoadingTrack(false));
  }, [trackingYear]);

  async function toggle(year, field) {
    const key = `${year}-${field}`;
    const row = activations.find((a) => a.year === year);
    const newVal = !(row?.[field === 'sgpa' ? 'sgpaActive' : 'cgpaActive'] ?? false);
    setToggling(key);
    try {
      const payload = {
        sgpaActive: field === 'sgpa' ? newVal : (row?.sgpaActive ?? false),
        cgpaActive: field === 'cgpa' ? newVal : (row?.cgpaActive ?? false),
      };
      const r = await api.put(`/sgpa-cgpa/activations/${year}`, payload);
      setActivations((prev) =>
        prev.map((a) => a.year === year ? r.data.data : a)
      );
      toast.success(`Year ${year} ${field.toUpperCase()} ${newVal ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setToggling(null); }
  }

  const notSubmittedRows = useMemo(
    () => (tracking?.rows || []).filter((r) => !r.submitted),
    [tracking]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp size={22} className="text-brand-600" /> SGPA &amp; CGPA
        </h1>
        <p className="text-sm text-slate-500">
          Activate entry windows and track student submissions year-wise.
        </p>
      </div>

      {/* ── Activation panel ── */}
      <Card title="Activation Settings">
        {loadingAct ? (
          <p className="text-sm text-slate-500 py-4 text-center">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[380px]">
              <thead>
                <tr className="text-xs text-slate-500 text-left border-b border-slate-100">
                  <th className="pb-2 pr-4">Year</th>
                  <th className="pb-2 pr-6">SGPA Entry</th>
                  <th className="pb-2">CGPA Entry</th>
                </tr>
              </thead>
              <tbody>
                {activations.map((a) => {
                  const sgpaKey = `${a.year}-sgpa`;
                  const cgpaKey = `${a.year}-cgpa`;
                  return (
                    <tr key={a.year} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4 font-semibold text-slate-800">
                        {YEAR_LABELS[a.year]}
                      </td>
                      <td className="py-3 pr-6">
                        <button
                          onClick={() => toggle(a.year, 'sgpa')}
                          disabled={toggling === sgpaKey}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                            a.sgpaActive
                              ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
                              : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {a.sgpaActive
                            ? <ToggleRight size={16} className="text-green-600" />
                            : <ToggleLeft  size={16} className="text-slate-400" />}
                          {a.sgpaActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => toggle(a.year, 'cgpa')}
                          disabled={toggling === cgpaKey}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                            a.cgpaActive
                              ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
                              : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {a.cgpaActive
                            ? <ToggleRight size={16} className="text-green-600" />
                            : <ToggleLeft  size={16} className="text-slate-400" />}
                          {a.cgpaActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Tracking panel ── */}
      <Card
        title={
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2">
              <Users size={16} /> Submission Tracking
            </span>
            {/* Year selector */}
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
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-slate-800">{tracking.total}</p>
                <p className="text-xs text-slate-500 mt-0.5">Total Students</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{tracking.submitted}</p>
                <p className="text-xs text-slate-500 mt-0.5">Submitted</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{tracking.notSubmitted}</p>
                <p className="text-xs text-slate-500 mt-0.5">Not Submitted</p>
              </div>
            </div>

            {/* Export */}
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => exportTracking(tracking)}>
                <Download size={14} /> Export to Excel
              </Button>
            </div>

            {/* Full table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[420px] overflow-y-auto">
              <table className="min-w-[580px] w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-xs text-slate-500 text-left">
                    <th className="px-3 py-2.5">Roll No</th>
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5 text-right">SGPA</th>
                    <th className="px-3 py-2.5 text-right">CGPA</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tracking.rows.map((r) => (
                    <tr key={String(r.studentId)}
                      className={`border-t border-slate-100 ${!r.submitted ? 'bg-red-50/40' : ''}`}>
                      <td className="px-3 py-2 font-mono text-xs">{r.rollNumber}</td>
                      <td className="px-3 py-2 text-xs">{r.name}</td>
                      <td className="px-3 py-2 text-right text-xs font-medium">
                        {r.sgpa != null ? r.sgpa.toFixed(2) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-medium">
                        {r.cgpa != null ? r.cgpa.toFixed(2) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {r.submitted
                          ? <Badge variant="success"><CheckCircle2 size={11} className="mr-1 inline" />Submitted</Badge>
                          : <Badge variant="danger"><XCircle    size={11} className="mr-1 inline" />Not Submitted</Badge>}
                      </td>
                      {/* Admin actions: clear CGPA or delete full submission */}
                      {r.submitted && (
                        <td className="px-3 py-2">
                          <div className="flex gap-1.5">
                            {r.cgpa != null && (
                              <button
                                title="Clear only this student's CGPA (keeps SGPA)"
                                onClick={() => {
                                  if (window.confirm(`Clear CGPA for ${r.name} (${r.rollNumber})? SGPA will be kept.`)) {
                                    api.patch(`/sgpa-cgpa/submission/${r.studentId}/clear-cgpa`)
                                      .then(() => { toast.success('CGPA cleared.'); setTracking(null); setLoadingTrack(true); api.get(`/sgpa-cgpa/tracking/${trackingYear}`).then((res) => setTracking(res.data.data)).finally(() => setLoadingTrack(false)); })
                                      .catch((e) => toast.error(e.response?.data?.message || 'Failed'));
                                  }
                                }}
                                className="text-[11px] px-2 py-0.5 rounded border border-amber-400 text-amber-700 hover:bg-amber-50 transition whitespace-nowrap"
                              >
                                Clear CGPA
                              </button>
                            )}
                            <button
                              title="Delete entire submission record for this student"
                              onClick={() => {
                                if (window.confirm(`Delete entire SGPA/CGPA record for ${r.name} (${r.rollNumber})? This cannot be undone.`)) {
                                  api.delete(`/sgpa-cgpa/submission/${r.studentId}`)
                                    .then(() => { toast.success('Record deleted.'); setTracking(null); setLoadingTrack(true); api.get(`/sgpa-cgpa/tracking/${trackingYear}`).then((res) => setTracking(res.data.data)).finally(() => setLoadingTrack(false)); })
                                    .catch((e) => toast.error(e.response?.data?.message || 'Failed'));
                                }
                              }}
                              className="text-[11px] px-2 py-0.5 rounded border border-red-400 text-red-700 hover:bg-red-50 transition whitespace-nowrap"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                      {!r.submitted && <td className="px-3 py-2" />}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Collapsible "Not submitted" list */}
            {notSubmittedRows.length > 0 && (
              <div>
                <button onClick={() => setExpanded((p) => !p)}
                  className="flex items-center gap-1.5 text-xs text-red-600 font-medium hover:text-red-800 transition">
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {notSubmittedRows.length} student{notSubmittedRows.length > 1 ? 's' : ''} have not submitted
                </button>
                {expanded && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {notSubmittedRows.map((r) => (
                      <span key={String(r.studentId)}
                        className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-2.5 py-1">
                        {r.rollNumber} — {r.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
