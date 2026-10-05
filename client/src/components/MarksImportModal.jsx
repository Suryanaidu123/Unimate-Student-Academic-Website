/**
 * MarksImportModal
 *
 * Step 1 — Upload:   faculty picks a file (.xlsx / .xls / .csv)
 * Step 2 — Preview:  server parses the file and returns matched rows
 * Step 3 — Confirm:  faculty clicks "Confirm & Save"; calls POST /marks/bulk
 *
 * Props:
 *   open       {boolean}
 *   onClose    {() => void}
 *   subjectId  {string}
 *   year       {string|number}
 *   section    {string}
 *   midKey     {"mid1"|"mid2"}
 *   onSaved    {() => void}  — called after successful bulk save so parent can reload
 */
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle,
  AlertTriangle, ChevronRight, Loader2, X,
} from 'lucide-react';
import api from '../services/api.js';
import Button from './ui/Button.jsx';
import Badge from './ui/Badge.jsx';

const STEP = { UPLOAD: 'UPLOAD', PREVIEW: 'PREVIEW', SAVING: 'SAVING' };

const STATUS_META = {
  MATCHED: { label: 'Matched',  variant: 'success', icon: CheckCircle2 },
  ERROR:   { label: 'Error',    variant: 'danger',  icon: XCircle },
};

function computeMid(written, online, assignment) {
  const w = Number(written  ?? 0);
  const o = Number(online   ?? 0);
  const a = Number(assignment ?? 0);
  return +(Math.ceil(w / 2) + o + a).toFixed(2);
}

export default function MarksImportModal({
  open, onClose, subjectId, year, section, midKey, onSaved,
}) {
  const fileInputRef = useRef(null);
  const [step, setStep]         = useState(STEP.UPLOAD);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile]         = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]   = useState(null); // server response
  const [saving, setSaving]     = useState(false);

  if (!open) return null;

  // ── helpers ──────────────────────────────────────────────────────────────

  function reset() {
    setStep(STEP.UPLOAD);
    setFile(null);
    setPreview(null);
    setUploading(false);
    setSaving(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function pickFile(f) {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Only .xlsx, .xls, or .csv files are accepted.');
      return;
    }
    setFile(f);
  }

  function onInputChange(e) { pickFile(e.target.files?.[0]); }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  // ── Step 1 → Step 2: upload & parse ──────────────────────────────────────

  async function uploadForPreview() {
    if (!file) return toast.error('Please select a file first.');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('subjectId', subjectId);
      fd.append('year', String(year));
      fd.append('section', section);
      fd.append('midKey', midKey);

      const r = await api.post('/marks/import-preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(r.data.data);
      setStep(STEP.PREVIEW);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse file');
    } finally {
      setUploading(false);
    }
  }

  // ── Step 2 → Save: confirm bulk upsert ───────────────────────────────────

  async function confirmSave() {
    const matchedRows = preview.rows.filter((r) => r.status === 'MATCHED');
    if (matchedRows.length === 0) {
      return toast.error('No matched rows to save.');
    }

    const rows = matchedRows.map((r) => ({
      studentId: r.studentId,
      [midKey]: {
        written:    Number(r.written),
        online:     Number(r.online),
        assignment: Number(r.assignment),
      },
    }));

    setSaving(true);
    try {
      const r = await api.post('/marks/bulk', { subjectId, rows });
      const { saved, errors } = r.data.data;
      if (errors?.length > 0) {
        toast.error(`Saved ${saved}. ${errors.length} failed — check console.`);
        console.warn('Bulk save errors:', errors);
      } else {
        toast.success(`${saved} student mark(s) saved successfully.`);
      }
      handleClose();
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const midLabel = midKey === 'mid1' ? 'Mid-1' : 'Mid-2';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Import {midLabel} Marks from File
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Year {year} · Section {section} · {midLabel}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-medium shrink-0">
          <span className={step === STEP.UPLOAD ? 'text-brand-700' : 'text-slate-400'}>
            1. Upload File
          </span>
          <ChevronRight size={14} className="text-slate-300" />
          <span className={step === STEP.PREVIEW ? 'text-brand-700' : 'text-slate-400'}>
            2. Review Preview
          </span>
          <ChevronRight size={14} className="text-slate-300" />
          <span className={saving ? 'text-brand-700' : 'text-slate-400'}>
            3. Confirm & Save
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1: Upload ── */}
          {step === STEP.UPLOAD && (
            <div className="p-6 space-y-5">

              {/* Format guide */}
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-800 space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <FileSpreadsheet size={16} /> Expected file format
                </p>
                <p>Your file should contain a header row with these columns (names are flexible):</p>
                <div className="overflow-x-auto mt-2">
                  <table className="text-xs border-collapse w-full max-w-lg">
                    <thead>
                      <tr className="bg-brand-100">
                        {['Roll No', 'Written (0–30)', 'Online (0–10)', 'Assignment (0–5)'].map((h) => (
                          <th key={h} className="border border-brand-200 px-3 py-1.5 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['24K61A6101', '25', '8', '4'],
                        ['24K61A6102', '27', '9', '5'],
                        ['24K61A6103', '22', '7', '4'],
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
                <p className="text-xs text-brand-700 mt-1">
                  Column headers are matched flexibly. "Roll Number", "Reg No", "Reg Number" all work for Roll No.
                  Extra columns are ignored.
                </p>
              </div>

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition ${
                  dragOver
                    ? 'border-brand-500 bg-brand-50'
                    : file
                    ? 'border-green-400 bg-green-50'
                    : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                {file ? (
                  <>
                    <CheckCircle2 size={32} className="text-green-500" />
                    <p className="font-medium text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB — click to change</p>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-slate-400" />
                    <p className="text-slate-600 font-medium">Drop file here or click to browse</p>
                    <p className="text-xs text-slate-400">.xlsx, .xls, or .csv · max 10 MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={onInputChange}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button onClick={uploadForPreview} disabled={!file || uploading}>
                  {uploading
                    ? <><Loader2 size={15} className="animate-spin" /> Parsing…</>
                    : <><Upload size={15} /> Upload & Preview</>}
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Preview ── */}
          {step === STEP.PREVIEW && preview && (
            <div className="p-6 space-y-4">

              {/* Summary bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Rows in file',  value: preview.totalInFile, color: 'slate' },
                  { label: 'Matched',        value: preview.matched,     color: 'green' },
                  { label: 'Errors / skipped', value: preview.unmatched, color: preview.unmatched > 0 ? 'red' : 'slate' },
                  { label: 'Will be saved',  value: preview.matched,     color: 'brand' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`rounded-xl border p-3 text-center ${
                    color === 'green' ? 'border-green-200 bg-green-50' :
                    color === 'red'   ? 'border-red-200 bg-red-50' :
                    color === 'brand' ? 'border-brand-200 bg-brand-50' :
                                        'border-slate-200 bg-slate-50'
                  }`}>
                    <p className={`text-2xl font-bold ${
                      color === 'green' ? 'text-green-700' :
                      color === 'red'   ? 'text-red-700' :
                      color === 'brand' ? 'text-brand-700' :
                                          'text-slate-700'
                    }`}>{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Error notice */}
              {preview.unmatched > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <p>
                    {preview.unmatched} row(s) have errors and will be skipped.
                    Review the Error column below. Only matched rows will be saved.
                  </p>
                </div>
              )}

              {preview.matched === 0 && (
                <div className="flex items-start gap-2 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">
                  <XCircle size={14} className="mt-0.5 shrink-0" />
                  <p>No rows matched. Please check the file format and the selected Year / Section, then re-upload.</p>
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-[700px] w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-xs text-slate-500 text-left">
                      <th className="px-3 py-2.5 w-8">#</th>
                      <th className="px-3 py-2.5">Roll No</th>
                      <th className="px-3 py-2.5">Name</th>
                      <th className="px-3 py-2.5 text-right">Written</th>
                      <th className="px-3 py-2.5 text-right">Online</th>
                      <th className="px-3 py-2.5 text-right">Assignment</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => {
                      const meta = STATUS_META[row.status] || STATUS_META.ERROR;
                      const Icon = meta.icon;
                      const isError = row.status === 'ERROR';
                      const total = isError ? '—' : computeMid(row.written, row.online, row.assignment);
                      return (
                        <tr
                          key={i}
                          className={`border-b border-slate-100 last:border-0 ${isError ? 'bg-red-50/60' : ''}`}
                        >
                          <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.rollNumber}</td>
                          <td className="px-3 py-2 text-xs">{row.name || <span className="text-slate-400 italic">Not found</span>}</td>
                          <td className="px-3 py-2 text-right text-xs">{row.written ?? '—'}</td>
                          <td className="px-3 py-2 text-right text-xs">{row.online ?? '—'}</td>
                          <td className="px-3 py-2 text-right text-xs">{row.assignment ?? '—'}</td>
                          <td className="px-3 py-2 text-right text-xs font-medium">{total}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col gap-0.5">
                              <Badge variant={meta.variant}>
                                <Icon size={11} className="mr-1 inline" />
                                {meta.label}
                              </Badge>
                              {row.errors?.map((e, ei) => (
                                <p key={ei} className="text-[11px] text-red-600 leading-tight">{e}</p>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button variant="secondary" onClick={() => { setStep(STEP.UPLOAD); setPreview(null); }}>
                  ← Re-upload
                </Button>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {preview.matched} of {preview.totalInFile} rows will be saved
                  </span>
                  <Button
                    onClick={confirmSave}
                    disabled={preview.matched === 0 || saving}
                  >
                    {saving
                      ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                      : <>
                          <CheckCircle2 size={15} />
                          Confirm &amp; Save {preview.matched} Mark{preview.matched !== 1 ? 's' : ''}
                        </>}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
