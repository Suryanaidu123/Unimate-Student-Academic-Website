import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Wand2, Save, Users } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Badge from '../../components/ui/Badge.jsx';

const YEARS = [2, 3, 4];

export default function BulkStudents() {
  const [series, setSeries] = useState([]);
  const [selectedYear, setSelectedYear] = useState(3);
  const [preview, setPreview] = useState(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load the list of series (non-async wrapper)
  useEffect(() => {
    let cancelled = false;
    async function fetchSeries() {
      try {
        const r = await api.get('/admin/bulk-students/series');
        if (!cancelled) setSeries(r.data.data || []);
      } catch {
        if (!cancelled) toast.error('Failed to load series');
      }
    }
    fetchSeries();
    return () => { cancelled = true; };
  }, []);

  const current = useMemo(
    () => series.find((s) => s.year === Number(selectedYear)) || null,
    [series, selectedYear]
  );

  // Load preview when year changes
  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setRows([]);
    if (!current) return () => { cancelled = true; };

    async function fetchPreview() {
      try {
        const r = await api.get(`/admin/bulk-students/preview/${selectedYear}`);
        if (cancelled) return;
        setPreview(r.data.data);
        setRows(
          (r.data.data.rolls || []).map((roll) => ({
            rollNumber: roll,
            firstName: '',
            surname: '',
          }))
        );
      } catch (e) {
        if (!cancelled) {
          toast.error(e.response?.data?.message || 'Preview failed');
        }
      }
    }
    fetchPreview();
    return () => { cancelled = true; };
  }, [selectedYear, current]);

  // ------- Series editing -------
  function addRange() {
    setSeries((prev) => prev.map((s) =>
      s.year === selectedYear
        ? { ...s, ranges: [...(s.ranges || []), { start: '', end: '' }] }
        : s
    ));
  }
  function removeRange(idx) {
    setSeries((prev) => prev.map((s) =>
      s.year === selectedYear
        ? { ...s, ranges: s.ranges.filter((_, i) => i !== idx) }
        : s
    ));
  }
  function updateRange(idx, field, value) {
    setSeries((prev) => prev.map((s) => {
      if (s.year !== selectedYear) return s;
      const ranges = [...s.ranges];
      ranges[idx] = { ...ranges[idx], [field]: value };
      return { ...s, ranges };
    }));
  }

  function addSingle() {
    setSeries((prev) => prev.map((s) =>
      s.year === selectedYear ? { ...s, singles: [...(s.singles || []), ''] } : s
    ));
  }
  function updateSingle(idx, value) {
    setSeries((prev) => prev.map((s) => {
      if (s.year !== selectedYear) return s;
      const singles = [...(s.singles || [])];
      singles[idx] = value;
      return { ...s, singles };
    }));
  }
  function removeSingle(idx) {
    setSeries((prev) => prev.map((s) =>
      s.year === selectedYear
        ? { ...s, singles: s.singles.filter((_, i) => i !== idx) }
        : s
    ));
  }

  async function saveSeries() {
    if (!current) return;
    setBusy(true);
    try {
      const payload = {
        ranges: (current.ranges || []).filter((r) => r.start && r.end),
        singles: (current.singles || []).filter(Boolean),
      };
      await api.put(`/admin/bulk-students/series/${selectedYear}`, payload);
      toast.success('Series saved');
      // refetch series + preview
      const r = await api.get('/admin/bulk-students/series');
      setSeries(r.data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally { setBusy(false); }
  }

  function updateRow(idx, field, value) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  async function generate() {
    const filled = rows.filter((r) => r.firstName && r.surname);
    if (filled.length === 0) {
      return toast.error('Fill in at least one student name');
    }
    setGenerating(true);
    try {
      const r = await api.post('/admin/bulk-students/generate', {
        year: selectedYear,
        rows: filled,
      });
      const s = r.data.data.summary;
      toast.success(`Created ${s.created}, skipped ${s.skipped}, errors ${s.errors.length}`);
      if (s.errors.length) console.warn('Errors:', s.errors);

      // Reload preview to reflect what remains
      const p = await api.get(`/admin/bulk-students/preview/${selectedYear}`);
      setPreview(p.data.data);
      setRows(
        (p.data.data.rolls || []).map((roll) => ({
          rollNumber: roll,
          firstName: '',
          surname: '',
        }))
      );
    } catch (e) {
      toast.error(e.response?.data?.message || 'Generate failed');
    } finally { setGenerating(false); }
  }

  function previewEmail(row) {
    if (!current || !row.firstName || !row.surname) return '—';
    const clean = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${clean(row.firstName)}.${clean(row.surname)}${current.emailSuffix}`;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users size={22} /> Bulk Generate Students
        </h1>
        <p className="text-sm text-slate-500">
          Configure roll-number series per year, then auto-generate student records with college emails.
        </p>
      </div>

      {/* Year picker */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <label className="block">
            <span className="label">Academic Year</span>
            <select
              className="input"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y} Year</option>
              ))}
            </select>
          </label>
          {current && (
            <div className="text-sm text-slate-600 pt-5 space-y-0.5">
              <p><b>Email suffix:</b> {current.emailSuffix}</p>
              <p><b>Batch:</b> {current.batch}</p>
              <p><b>Admission year:</b> {current.admissionYear}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Series config */}
      {current && (
        <Card title="Roll-Number Series Configuration">
          <div className="space-y-4">
            <div>
              <p className="label">Ranges (start → end)</p>
              {(current.ranges || []).length === 0 && (
                <p className="text-xs text-slate-400">No ranges yet.</p>
              )}
              {(current.ranges || []).map((r, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 mb-2">
                  <Input
                    placeholder="24K61A6101"
                    value={r.start}
                    onChange={(e) => updateRange(idx, 'start', e.target.value)}
                  />
                  <Input
                    placeholder="24K61A6164"
                    value={r.end}
                    onChange={(e) => updateRange(idx, 'end', e.target.value)}
                  />
                  <Button variant="danger" onClick={() => removeRange(idx)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              <Button variant="secondary" onClick={addRange}>
                <Plus size={14} /> Add range
              </Button>
            </div>

            <div>
              <p className="label">Individual roll numbers</p>
              {(current.singles || []).length === 0 && (
                <p className="text-xs text-slate-400">No singles yet.</p>
              )}
              {(current.singles || []).map((s, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_auto] gap-2 mb-2">
                  <Input
                    placeholder="24K65A6102"
                    value={s}
                    onChange={(e) => updateSingle(idx, e.target.value)}
                  />
                  <Button variant="danger" onClick={() => removeSingle(idx)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              <Button variant="secondary" onClick={addSingle}>
                <Plus size={14} /> Add roll number
              </Button>
            </div>

            <Button onClick={saveSeries} disabled={busy}>
              <Save size={14} /> {busy ? 'Saving…' : 'Save Series'}
            </Button>
          </div>
        </Card>
      )}

      {/* Preview count */}
      {preview && (
        <Card title="Preview">
          <p className="text-sm text-slate-600">
            Series expands to <b>{preview.count}</b> roll number(s).
            Fill in names below to generate students.
          </p>
        </Card>
      )}

      {/* Rows editor */}
      {rows.length > 0 && (
        <Card title="Students to generate">
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Roll Number</th>
                  <th className="py-2 pr-3">First Name</th>
                  <th className="py-2 pr-3">Surname</th>
                  <th className="py-2 pr-3">Generated Email</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.rollNumber} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{row.rollNumber}</td>
                    <td className="py-2 pr-3">
                      <input
                        className="input !py-1"
                        placeholder="Surya"
                        value={row.firstName}
                        onChange={(e) => updateRow(idx, 'firstName', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        className="input !py-1"
                        placeholder="Kavala"
                        value={row.surname}
                        onChange={(e) => updateRow(idx, 'surname', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-3 text-xs text-slate-500">
                      {previewEmail(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={generate} disabled={generating}>
              <Wand2 size={14} /> {generating ? 'Generating…' : 'Generate Students'}
            </Button>
            <span className="text-xs text-slate-500">
              {rows.filter((r) => r.firstName && r.surname).length} / {rows.length} rows ready
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}