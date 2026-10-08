/**
 * Admin — Bulk Add Students
 * Upload an Excel / CSV file → preview & validate → save to DB.
 *
 * Expected columns (case-insensitive): Roll No, Email
 * Optional:  Name, Year, Semester  (auto-detected or set via selector)
 */
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  Upload, CheckCircle2, XCircle, Save,
  FileSpreadsheet, AlertTriangle, Trash2, ChevronRight, Loader2,
} from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

const YEAR_SEMS = { 2: [3, 4], 3: [5, 6], 4: [7, 8] };

// ── column alias matching ─────────────────────────────────────────────────────
const ROLL_ALIASES  = ['roll no', 'rollno', 'roll number', 'rollnumber', 'roll', 'reg no', 'regno', 'registration'];
const EMAIL_ALIASES = ['email', 'email id', 'email address', 'mail'];
const NAME_ALIASES  = ['name', 'student name', 'full name', 'fullname'];

function normalise(s) { return String(s ?? '').toLowerCase().trim(); }

function detectCol(headers, aliases) {
  for (const [i, h] of headers.entries()) {
    if (aliases.includes(normalise(h))) return i;
  }
  return -1;
}

// ── validation helpers ────────────────────────────────────────────────────────
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
// Allow any non-empty string for roll number (college uses custom formats)
function isValidRoll(r)  { return typeof r === 'string' && r.trim().length >= 4; }

function parseSheet(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
}

// ── main component ────────────────────────────────────────────────────────────
export default function BulkStudents() {
  const fileRef = useRef(null);

  // File selection
  const [fileName,  setFileName]  = useState('');
  const [dragOver,  setDragOver]  = useState(false);

  // Defaults for the batch
  const [year,     setYear]     = useState('3');
  const [semester, setSemester] = useState('5');

  // Preview rows: { rollNumber, email, name, _status, _errors[] }
  const [rows,     setRows]     = useState([]);
  const [parsed,   setParsed]   = useState(false);

  // Saving
  const [saving,   setSaving]   = useState(false);
  const [result,   setResult]   = useState(null); // { saved, errors[] }

  // ── parse file ──────────────────────────────────────────────────────────────
  function processFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      return toast.error('Only Excel (.xlsx, .xls) or CSV files are accepted.');
    }
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' });
        const raw  = parseSheet(wb);
        if (raw.length < 2) return toast.error('File is empty or has no data rows.');

        const headers = raw[0].map(String);
        const rollIdx  = detectCol(headers, ROLL_ALIASES);
        const emailIdx = detectCol(headers, EMAIL_ALIASES);
        const nameIdx  = detectCol(headers, NAME_ALIASES);

        if (rollIdx  < 0) return toast.error('Could not find a "Roll No" column. Check column headers.');
        if (emailIdx < 0) return toast.error('Could not find an "Email" column. Check column headers.');

        const seen = { rolls: new Set(), emails: new Set() };

        const parsed = raw.slice(1).map((row) => {
          const roll  = String(row[rollIdx]  || '').trim().toUpperCase();
          const email = String(row[emailIdx] || '').trim().toLowerCase();
          const name  = nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '';

          const errors = [];
          if (!roll)              errors.push('Roll No is empty');
          else if (!isValidRoll(roll)) errors.push('Invalid Roll No format');

          if (!email)             errors.push('Email is empty');
          else if (!isValidEmail(email)) errors.push('Invalid email format');

          if (seen.rolls.has(roll))   errors.push('Duplicate Roll No in file');
          if (seen.emails.has(email)) errors.push('Duplicate email in file');

          if (roll)  seen.rolls.add(roll);
          if (email) seen.emails.add(email);

          return {
            rollNumber: roll,
            email,
            name,
            _status: errors.length ? 'ERROR' : 'OK',
            _errors: errors,
          };
        }).filter((r) => r.rollNumber || r.email); // drop completely empty rows

        setRows(parsed);
        setParsed(true);
      } catch {
        toast.error('Failed to parse file. Make sure it is a valid Excel or CSV.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  }

  // ── save valid rows ─────────────────────────────────────────────────────────
  async function onSave() {
    const valid = rows.filter((r) => r._status === 'OK');
    if (valid.length === 0) return toast.error('No valid rows to save.');

    setSaving(true);
    try {
      const payload = {
        year:     Number(year),
        semester: Number(semester),
        students: valid.map((r) => ({
          rollNumber: r.rollNumber,
          email:      r.email,
          name:       r.name || undefined,
        })),
      };
      const res = await api.post('/admin/bulk-students/import', payload);
      const d   = res.data.data;
      setResult(d);
      toast.success(`Saved ${d.saved} student(s).`);
      if (d.errors?.length) {
        toast.error(`${d.errors.length} row(s) skipped — see details below.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally { setSaving(false); }
  }

  function reset() {
    setRows([]); setParsed(false); setFileName('');
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  const validCount   = rows.filter((r) => r._status === 'OK').length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Upload size={22} className="text-brand-600" /> Bulk Add Students
        </h1>
        <p className="text-sm text-slate-500">
          Upload an Excel or CSV file containing Roll No and Email columns.
          Review the preview, then click Save to import.
        </p>
      </div>

      {/* Step 1 — Config + upload */}
      {!parsed && (
        <Card title="1. Set Academic Year">
          <div className="grid grid-cols-2 gap-4 mb-5">
            <label className="block">
              <span className="label">Academic Year</span>
              <select className="input" value={year}
                onChange={(e) => { setYear(e.target.value); setSemester(String(YEAR_SEMS[Number(e.target.value)]?.[0] ?? 3)); }}>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Current Semester</span>
              <select className="input" value={semester} onChange={(e) => setSemester(e.target.value)}>
                {(YEAR_SEMS[Number(year)] || []).map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Format guide */}
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-4 text-sm text-brand-800 space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <FileSpreadsheet size={16} /> Expected file format
            </p>
            <p>Your Excel / CSV must have at least these columns (header names are flexible):</p>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse mt-2">
                <thead>
                  <tr className="bg-brand-100">
                    {['Roll No', 'Email', 'Name (optional)'].map((h) => (
                      <th key={h} className="border border-brand-200 px-3 py-1.5 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['24K61A6101', 'student1@college.com', 'Student One'],
                    ['24K61A6102', 'student2@college.com', 'Student Two'],
                  ].map((row) => (
                    <tr key={row[0]} className="bg-white">
                      {row.map((cell, i) => (
                        <td key={i} className="border border-brand-200 px-3 py-1">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition ${
              dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <FileSpreadsheet size={32} className="text-slate-400" />
            <p className="text-slate-600 font-medium">Drop Excel / CSV here or click to browse</p>
            <p className="text-xs text-slate-400">.xlsx, .xls, .csv</p>
            <input ref={fileRef} type="file" className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => processFile(e.target.files?.[0])} />
          </div>
        </Card>
      )}

      {/* Step 2 — Preview */}
      {parsed && (
        <>
          <Card>
            {/* Summary bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center">
                  <p className="text-2xl font-bold text-slate-800">{rows.length}</p>
                  <p className="text-xs text-slate-500">Total rows</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-center">
                  <p className="text-2xl font-bold text-green-700">{validCount}</p>
                  <p className="text-xs text-slate-500">Valid</p>
                </div>
                {invalidCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-center">
                    <p className="text-2xl font-bold text-red-600">{invalidCount}</p>
                    <p className="text-xs text-slate-500">Errors (skipped)</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={reset}>
                  <Trash2 size={14} /> Re-upload
                </Button>
                <Button onClick={onSave} disabled={saving || validCount === 0}>
                  {saving
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : <><Save size={14} /> Save {validCount} Student{validCount !== 1 ? 's' : ''}</>}
                </Button>
              </div>
            </div>

            {invalidCount > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Rows with errors are highlighted and will NOT be saved. Fix the file and re-upload to include them.
              </div>
            )}

            {/* Preview table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[480px] overflow-y-auto">
              <table className="min-w-[500px] w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-xs text-slate-500 text-left">
                    <th className="px-3 py-2.5 w-8">#</th>
                    <th className="px-3 py-2.5">Roll No</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={`border-t border-slate-100 ${r._status === 'ERROR' ? 'bg-red-50/60' : ''}`}>
                      <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.rollNumber || <span className="text-slate-400">—</span>}</td>
                      <td className="px-3 py-2 text-xs">{r.email || <span className="text-slate-400">—</span>}</td>
                      <td className="px-3 py-2 text-xs">{r.name || <span className="text-slate-400">—</span>}</td>
                      <td className="px-3 py-2">
                        {r._status === 'OK' ? (
                          <Badge variant="success">
                            <CheckCircle2 size={11} className="mr-1 inline" /> Valid
                          </Badge>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="danger">
                              <XCircle size={11} className="mr-1 inline" /> Error
                            </Badge>
                            {r._errors.map((e, ei) => (
                              <p key={ei} className="text-[11px] text-red-600">{e}</p>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Step 3 — Result */}
      {result && (
        <Card>
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">
                Import complete — {result.saved} student{result.saved !== 1 ? 's' : ''} saved.
              </p>
              {result.errors?.length > 0 && (
                <>
                  <p className="text-sm text-red-600">{result.errors.length} row(s) failed on the server:</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-500 ml-2">• {e.rollNumber}: {e.message}</p>
                  ))}
                </>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
