/**
 * Admin Activities page — create, list, view responses, export to Excel.
 * Faculty page imports this same component via a thin wrapper.
 */
import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Pencil, Eye, Download,
  Megaphone, Star, HelpCircle, BarChart2, FileText, CheckSquare, X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Table from '../../components/ui/Table.jsx';

// ── constants ─────────────────────────────────────────────────────────────────

export const ACTIVITY_TYPES = [
  { value: 'ANNOUNCEMENT',           label: 'Announcement',            icon: Megaphone,    color: 'info' },
  { value: 'IMPORTANT_ANNOUNCEMENT', label: 'Important Announcement',  icon: Star,         color: 'danger' },
  { value: 'SINGLE_CHOICE',          label: 'Single Choice Poll',      icon: CheckSquare,  color: 'brand' },
  { value: 'MULTIPLE_CHOICE',        label: 'Multiple Choice Poll',    icon: CheckSquare,  color: 'brand' },
  { value: 'QUESTION',               label: 'Question',                icon: HelpCircle,   color: 'warning' },
  { value: 'SURVEY',                 label: 'Survey',                  icon: BarChart2,    color: 'success' },
  { value: 'OTHER',                  label: 'Other',                   icon: FileText,     color: 'default' },
];

const TARGET_YEAR_OPTIONS = [
  { value: '0', label: 'All Years' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];

const TYPES_WITH_OPTIONS = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SURVEY'];

function typeLabel(t) {
  return ACTIVITY_TYPES.find((a) => a.value === t)?.label || t;
}
function typeColor(t) {
  return ACTIVITY_TYPES.find((a) => a.value === t)?.color || 'default';
}

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function isLive(a) {
  const now = Date.now();
  return a.status === 'ACTIVE' && new Date(a.startDate) <= now && new Date(a.endDate) >= now;
}

function isEnded(a) {
  return new Date(a.endDate) < Date.now();
}

// ── empty form ────────────────────────────────────────────────────────────────

function emptyForm() {
  const now = new Date();
  const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const toLocal = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    title: '',
    description: '',
    type: 'ANNOUNCEMENT',
    targetYears: ['0'],
    options: ['Yes', 'No'],
    startDate: toLocal(now),
    endDate: toLocal(later),
  };
}

// ── export helper ─────────────────────────────────────────────────────────────
// Task 6: only Roll No, Name, Year, Response + option totals at bottom

function exportToExcel(activity) {
  const responses = activity.responses || [];
  if (responses.length === 0) { toast.error('No responses to export.'); return; }

  // Data rows
  const dataRows = responses.map((r) => ({
    'Roll No':  r.studentId?.rollNumber || '—',
    'Name':     r.studentId?.name       || '—',
    'Year':     r.studentId?.year != null ? `${r.studentId.year} Year` : '—',
    'Response': r.choices?.length > 0 ? r.choices.join(', ') : (r.textAnswer || '—'),
  }));

  // Option totals (for choice-based activities)
  const TYPES_W = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SURVEY'];
  const totals = {};
  if (TYPES_W.includes(activity.type)) {
    (activity.options || []).forEach((o) => { totals[o.label || o] = 0; });
    responses.forEach((r) => {
      (r.choices || []).forEach((c) => {
        totals[c] = (totals[c] || 0) + 1;
      });
    });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dataRows);

  // Append blank row + totals section
  if (Object.keys(totals).length > 0) {
    const startRow = dataRows.length + 3; // 1-indexed header + data + blank
    XLSX.utils.sheet_add_aoa(ws, [['Total Responses']], { origin: { r: dataRows.length + 1, c: 0 } });
    XLSX.utils.sheet_add_aoa(ws, [['Option', 'Count']], { origin: { r: dataRows.length + 2, c: 0 } });
    Object.entries(totals).forEach(([opt, cnt], i) => {
      XLSX.utils.sheet_add_aoa(ws, [[opt, cnt]], { origin: { r: dataRows.length + 3 + i, c: 0 } });
    });
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Responses');
  XLSX.writeFile(wb, `activity_${activity.title.replace(/\s+/g, '_')}.xlsx`);
  toast.success('Excel exported.');
}

// ── main component ────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [open, setOpen]           = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [viewActivity, setViewActivity] = useState(null);  // full doc with responses
  const [viewLoading, setViewLoading]   = useState(false);

  function load() {
    setLoading(true);
    api.get('/activities?limit=100')
      .then((r) => setItems(r.data.data.items || []))
      .catch(() => toast.error('Failed to load activities'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  // ── open create ────────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  // ── open edit ──────────────────────────────────────────────────────────────
  function openEdit(row) {
    setEditing(row._id);
    const pad = (n) => String(n).padStart(2, '0');
    const toLocal = (d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    };
    setForm({
      title:       row.title,
      description: row.description || '',
      type:        row.type,
      targetYears: row.targetYears?.map(String) || ['0'],
      options:     row.options?.map((o) => o.label || o) || ['Yes', 'No'],
      startDate:   toLocal(row.startDate),
      endDate:     toLocal(row.endDate),
    });
    setOpen(true);
  }

  // ── view responses ─────────────────────────────────────────────────────────
  async function openView(row) {
    setViewLoading(true);
    setViewActivity({ ...row, responses: [] });
    try {
      const r = await api.get(`/activities/${row._id}`);
      setViewActivity(r.data.data);
    } catch {
      toast.error('Failed to load responses');
    } finally {
      setViewLoading(false);
    }
  }

  // ── save ───────────────────────────────────────────────────────────────────
  async function onSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required.');
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      return toast.error('End date must be after start date.');
    }
    if (TYPES_WITH_OPTIONS.includes(form.type)) {
      const opts = form.options.filter((o) => o.trim());
      if (opts.length < 2) return toast.error('At least 2 options are required.');
    }

    const payload = {
      title:       form.title.trim(),
      description: form.description.trim(),
      type:        form.type,
      targetYears: form.targetYears.map(Number),
      startDate:   new Date(form.startDate).toISOString(),
      endDate:     new Date(form.endDate).toISOString(),
      options:     TYPES_WITH_OPTIONS.includes(form.type)
        ? form.options.filter((o) => o.trim()).map((o) => ({ label: o.trim() }))
        : [],
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/activities/${editing}`, payload);
        toast.success('Activity updated.');
      } else {
        await api.post('/activities', payload);
        toast.success('Activity created.');
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  // ── delete ─────────────────────────────────────────────────────────────────
  async function doDelete() {
    setDeleting(true);
    try {
      await api.delete(`/activities/${confirmDel._id}`);
      toast.success('Deleted.');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setDeleting(false); }
  }

  // ── option helpers ─────────────────────────────────────────────────────────
  function setOption(i, val) {
    const opts = [...form.options];
    opts[i] = val;
    setForm({ ...form, options: opts });
  }
  function addOption() {
    setForm({ ...form, options: [...form.options, ''] });
  }
  function removeOption(i) {
    const opts = form.options.filter((_, idx) => idx !== i);
    setForm({ ...form, options: opts });
  }

  // ── target year helper ─────────────────────────────────────────────────────
  function toggleYear(v) {
    setForm((prev) => {
      if (v === '0') return { ...prev, targetYears: ['0'] };
      const without0 = prev.targetYears.filter((y) => y !== '0');
      if (without0.includes(v)) {
        const next = without0.filter((y) => y !== v);
        return { ...prev, targetYears: next.length ? next : ['0'] };
      }
      return { ...prev, targetYears: [...without0, v] };
    });
  }

  // ── response summary (for view modal) ────────────────────────────────────
  const responseSummary = useMemo(() => {
    if (!viewActivity) return {};
    const responses = viewActivity.responses || [];
    const summary = {};
    if (TYPES_WITH_OPTIONS.includes(viewActivity.type)) {
      (viewActivity.options || []).forEach((o) => { summary[o.label] = 0; });
      responses.forEach((r) => {
        (r.choices || []).forEach((c) => {
          if (summary[c] !== undefined) summary[c]++;
          else summary[c] = 1;
        });
      });
    }
    return summary;
  }, [viewActivity]);

  // ── result text per activity (for marquee + inline display) ───────────────
  // Format: "Yes: 90 | No: 23"
  function buildResultText(activity) {
    if (!TYPES_WITH_OPTIONS.includes(activity.type)) return null;
    if (!activity.responses?.length) return null;
    const counts = {};
    (activity.options || []).forEach((o) => { counts[o.label || o] = 0; });
    activity.responses.forEach((r) => {
      (r.choices || []).forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
    });
    return Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' | ');
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activities</h1>
          <p className="text-sm text-slate-500">
            Announcements, polls, questions and surveys for students.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={15} /> New Activity
        </Button>
      </div>

      {/* Activity list */}
      <Card>
        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No activities yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((a) => {
              const live = isLive(a);
              return (
                <div key={a._id}
                  className={`border rounded-xl p-4 transition ${
                    live ? 'border-brand-200 bg-brand-50/30' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {live && <Badge variant="success">● Live</Badge>}
                        {!live && isEnded(a) && <Badge variant="default">Ended</Badge>}
                        <Badge variant={typeColor(a.type)}>{typeLabel(a.type)}</Badge>
                        {(a.targetYears || []).includes(0)
                          ? <Badge variant="default">All Years</Badge>
                          : (a.targetYears || []).map((y) => (
                              <Badge key={y} variant="info">{y} Year</Badge>
                            ))}
                      </div>
                      <h3 className="font-semibold text-slate-900 truncate">{a.title}</h3>
                      {a.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {fmt(a.startDate)} → {fmt(a.endDate)}
                      </p>
                      {/* Inline result summary for polls/surveys */}
                      {TYPES_WITH_OPTIONS.includes(a.type) && (a.responseCount ?? 0) > 0 && (() => {
                        const rt = buildResultText({ ...a, responses: undefined, options: a.options });
                        // responseCount is available but full responses aren't in list — show count only
                        return (
                          <p className="text-xs text-brand-700 font-medium mt-1">
                            {a.responseCount} response{a.responseCount !== 1 ? 's' : ''}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Button variant="secondary" onClick={() => openView(a)}>
                        <Eye size={13} /> View
                      </Button>
                      <Button variant="secondary" onClick={() => openEdit(a)}>
                        <Pencil size={13} /> Edit
                      </Button>
                      <Button variant="danger" onClick={() => setConfirmDel(a)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Create / Edit modal ── */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Activity' : 'Create Activity'}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Blood Donation Registration"
            required
          />
          <label className="block">
            <span className="label">Description</span>
            <textarea
              className="input min-h-[72px] resize-y"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional details…"
            />
          </label>

          {/* Type */}
          <label className="block">
            <span className="label">Activity Type *</span>
            <select className="input" value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          {/* Target years */}
          <div>
            <span className="label block mb-1">Target Year(s) *</span>
            <div className="flex flex-wrap gap-2">
              {TARGET_YEAR_OPTIONS.map((opt) => {
                const selected = form.targetYears.includes(opt.value);
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => toggleYear(opt.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                      selected
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-brand-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options (for poll/survey types) */}
          {TYPES_WITH_OPTIONS.includes(form.type) && (
            <div>
              <span className="label block mb-1">Options * (min 2)</span>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="input flex-1"
                      value={opt}
                      onChange={(e) => setOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                    />
                    {form.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(i)}
                        className="p-2 text-red-500 hover:text-red-700">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addOption}
                  className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                  + Add option
                </button>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Start Date & Time *</span>
              <input type="datetime-local" className="input"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required />
            </label>
            <label className="block">
              <span className="label">End Date & Time *</span>
              <input type="datetime-local" className="input"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Activity'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── View Responses modal ── */}
      {viewActivity && (
        <Modal
          open={!!viewActivity}
          onClose={() => setViewActivity(null)}
          title={viewActivity.title}
        >
          {viewLoading ? (
            <p className="text-sm text-slate-500 py-8 text-center">Loading responses…</p>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex flex-wrap gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-center min-w-[90px]">
                  <p className="text-2xl font-bold text-slate-800">
                    {(viewActivity.responses || []).length}
                  </p>
                  <p className="text-xs text-slate-500">Total Responses</p>
                </div>
                {Object.entries(responseSummary).map(([label, count]) => {
                  const total = (viewActivity.responses || []).length;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={label} className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-2 text-center min-w-[90px]">
                      <p className="text-xl font-bold text-brand-700">{count}</p>
                      <p className="text-xs text-slate-600 font-medium">{label}</p>
                      <p className="text-xs text-slate-400">{pct}%</p>
                    </div>
                  );
                })}
              </div>

              {/* Export button */}
              {(viewActivity.responses || []).length > 0 && (
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={() => exportToExcel(viewActivity)}>
                    <Download size={14} /> Export to Excel
                  </Button>
                </div>
              )}

              {/* Response table — Roll No | Name | Year | Response only */}
              {(viewActivity.responses || []).length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[380px] overflow-y-auto">
                  <table className="min-w-[400px] w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-xs text-slate-500 text-left">
                        <th className="px-3 py-2.5">Roll No</th>
                        <th className="px-3 py-2.5">Name</th>
                        <th className="px-3 py-2.5">Year</th>
                        <th className="px-3 py-2.5">Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewActivity.responses || []).map((r, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-mono text-xs">{r.studentId?.rollNumber || '—'}</td>
                          <td className="px-3 py-2 text-xs">{r.studentId?.name || '—'}</td>
                          <td className="px-3 py-2 text-xs">
                            {r.studentId?.year ? `${r.studentId.year} Year` : '—'}
                          </td>
                          <td className="px-3 py-2 text-xs font-medium">
                            {r.choices?.length > 0 ? r.choices.join(', ') : r.textAnswer || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-6">No responses yet.</p>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={!!confirmDel}
        title="Delete Activity"
        message={`Delete "${confirmDel?.title}"? All responses will also be removed. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(null)}
        loading={deleting}
      />
    </div>
  );
}
