import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, AlertCircle, Upload, Trash2, BookOpen } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import MarksImportModal from '../../components/MarksImportModal.jsx';

const YEAR_SEMESTERS = { 2: [3, 4], 3: [5, 6], 4: [7, 8] };
const SECTIONS = ['A', 'B', 'C', 'D'];

function computeMid(written, online, assignment) {
  const w = Number(written || 0), o = Number(online || 0), a = Number(assignment || 0);
  return { writtenConverted: Math.ceil(w / 2), total: Math.ceil(w / 2) + o + a };
}
function computeInternal(m1, m2) { return Math.max(m1 || 0, m2 || 0); }

export default function FacultyMarks() {
  const [year, setYear]         = useState('');
  const [semester, setSemester] = useState('');
  const [section, setSection]   = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examType, setExamType] = useState('MID1');

  const [subjects, setSubjects]   = useState([]);
  const [students, setStudents]   = useState([]);
  const [marksMap, setMarksMap]   = useState({});
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [records, setRecords]     = useState([]);

  // Import modal state
  const [importOpen, setImportOpen] = useState(false);

  // Draft string values for marks inputs — lets user clear "0" while typing.
  // Key: `${studentId}.${midKey}.${field}`, value: string
  const [draftValues, setDraftValues] = useState({});

  // Delete / unpublish confirmation state
  const [confirmDelete,    setConfirmDelete]    = useState(null); // marks record
  const [confirmUnpublish, setConfirmUnpublish] = useState(null); // marks record
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [actionLoading,    setActionLoading]    = useState(false);

  // ── reset cascades ────────────────────────────────────────────────────────
  useEffect(() => {
    setSemester(''); setSection(''); setSubjectId(''); setStudents([]); setMarksMap({});
  }, [year]);
  useEffect(() => {
    setSection(''); setSubjectId(''); setStudents([]); setMarksMap({});
  }, [semester]);

  // ── load subjects ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!year || !semester) { setSubjects([]); return; }
    api.get(`/subjects?year=${year}&semester=${semester}&limit=200`)
      .then((r) => setSubjects(r.data.data.items || []))
      .catch(() => {});
  }, [year, semester]);

  // ── load students + existing marks ───────────────────────────────────────
  useEffect(() => {
    if (!subjectId || !section) { setStudents([]); setMarksMap({}); return; }
    setLoading(true);
    Promise.all([
      api.get(`/lookup/students?year=${year}&section=${section}`),
      api.get(`/marks?subjectId=${subjectId}&section=${section}`),
    ])
      .then(([sRes, mRes]) => {
        const list = [...(sRes.data.data || [])];
        list.sort((a, b) =>
          String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true })
        );
        setStudents(list);

        const map = {};
        list.forEach((s) => {
          const existing = (mRes.data.data?.items || []).find(
            (m) => String(m.studentId?._id || m.studentId) === String(s._id)
          );
          map[s._id] = {
            mid1:   existing?.mid1   || { written: 0, online: 0, assignment: 0, total: 0 },
            mid2:   existing?.mid2   || { written: 0, online: 0, assignment: 0, total: 0 },
            status: existing?.status || 'DRAFT',
            _id:    existing?._id,
          };
        });
        setMarksMap(map);
        setDraftValues({}); // clear any stale drafts from the previous class
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, [subjectId, section, year]);

  // ── records list (bottom table) ───────────────────────────────────────────
  function loadRecords() {
    if (!subjectId) { setRecords([]); return; }
    const params = new URLSearchParams({ subjectId });
    if (section) params.set('section', section);
    api.get(`/marks?${params.toString()}`)
      .then((r) => setRecords(r.data.data.items || []))
      .catch(() => {});
  }
  useEffect(loadRecords, [subjectId, section]);

  // ── inline cell update ────────────────────────────────────────────────────
  // While the user is typing we store a raw string draft so they can clear
  // the "0" or type freely.  On blur we parse, clamp, and commit to marksMap.
  const FIELD_MAX = { written: 30, online: 10, assignment: 5 };

  function draftKey(studentId, midKey, field) {
    return `${studentId}.${midKey}.${field}`;
  }

  function handleDraftChange(studentId, midKey, field, rawValue) {
    // Allow empty string and plain digits (including leading zeros the user
    // may type transitionally); just store whatever they typed.
    setDraftValues((prev) => ({ ...prev, [draftKey(studentId, midKey, field)]: rawValue }));
  }

  function handleDraftCommit(studentId, midKeyLocal, field, rawValue) {
    // Parse the raw string; treat empty / non-numeric as 0.
    let n = rawValue === '' ? 0 : Number(rawValue);
    if (!Number.isFinite(n) || n < 0) n = 0;
    const max = FIELD_MAX[field] ?? 99;
    if (n > max) n = max;

    // Remove the draft entry so the input reverts to the committed value.
    setDraftValues((prev) => {
      const next = { ...prev };
      delete next[draftKey(studentId, midKeyLocal, field)];
      return next;
    });

    // Commit to marksMap.
    setMarksMap((prev) => {
      const current = prev[studentId] || {
        mid1: { written: 0, online: 0, assignment: 0, total: 0 },
        mid2: { written: 0, online: 0, assignment: 0, total: 0 },
        status: 'DRAFT',
      };
      const mid = { ...current[midKeyLocal], [field]: n };
      const computed = computeMid(mid.written, mid.online, mid.assignment);
      mid.writtenConverted = computed.writtenConverted;
      mid.total            = computed.total;
      return { ...prev, [studentId]: { ...current, [midKeyLocal]: mid } };
    });
  }

  // ── save all (manual entry) ───────────────────────────────────────────────
  async function saveAll() {
    if (!subjectId) return toast.error('Select a subject first');
    if (students.length === 0) return toast.error('No students to save');

    // Only include rows where the faculty actually entered marks (at least one
    // non-zero value in the current mid) OR the student already has a saved
    // record (so we update it rather than silently skip).
    const rows = students
      .filter((s) => {
        const mid = marksMap[s._id]?.[midKey];
        const hasExisting = !!marksMap[s._id]?._id;
        const hasInput = mid && (
          Number(mid.written) > 0 ||
          Number(mid.online)  > 0 ||
          Number(mid.assignment) > 0
        );
        return hasInput || hasExisting;
      })
      .map((s) => ({
        studentId: s._id,
        mid1: marksMap[s._id]?.mid1,
        mid2: marksMap[s._id]?.mid2,
      }));

    if (rows.length === 0) return toast.error('No marks entered yet. Enter marks for at least one student before saving.');

    setSaving(true);
    try {
      const r = await api.post('/marks/bulk', { subjectId, rows });
      const { saved, errors } = r.data.data;
      if (errors.length > 0) toast.error(`Saved ${saved}. ${errors.length} failed.`);
      else toast.success(`Saved ${saved} record(s) successfully.`);
      loadRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  // ── publish one ───────────────────────────────────────────────────────────
  async function publishOne(id) {
    try {
      await api.post(`/marks/${id}/publish`);
      toast.success('Published');
      loadRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  }

  // ── delete one ────────────────────────────────────────────────────────────
  async function deleteOne(record) {
    setActionLoading(true);
    try {
      await api.delete(`/marks/${record._id}`);
      toast.success('Marks removed successfully.');
      setConfirmDelete(null);
      loadRecords();
      // Also clear from marksMap so manual table resets
      const studentId = record.studentId?._id || record.studentId;
      if (studentId) {
        setMarksMap((prev) => {
          const updated = { ...prev };
          delete updated[studentId];
          return updated;
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove marks');
    } finally { setActionLoading(false); }
  }

  // ── delete all records for current subject + section + mid ──────────────
  async function deleteAll() {
    setActionLoading(true);
    try {
      // Filter records table to only those matching the current midKey
      // (records that have non-zero data for this mid).
      const targets = records.filter((r) => {
        const mid = r[midKey];
        return mid && (mid.written > 0 || mid.online > 0 || mid.assignment > 0 || mid.total > 0);
      });
      if (targets.length === 0) {
        toast.error('No saved marks found for this selection.');
        setConfirmDeleteAll(false);
        setActionLoading(false);
        return;
      }
      await Promise.all(targets.map((r) => api.delete(`/marks/${r._id}`)));
      toast.success(`Removed ${targets.length} marks record(s).`);
      setConfirmDeleteAll(false);
      loadRecords();
      // Reset marksMap for affected students
      setMarksMap((prev) => {
        const next = { ...prev };
        targets.forEach((r) => {
          const sid = String(r.studentId?._id || r.studentId);
          delete next[sid];
        });
        return next;
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete all marks');
    } finally { setActionLoading(false); }
  }
  async function unpublishOne(record) {
    setActionLoading(true);
    try {
      await api.post(`/marks/${record._id}/unpublish`);
      toast.success('Marks unpublished — status set back to Draft.');
      setConfirmUnpublish(null);
      loadRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unpublish');
    } finally { setActionLoading(false); }
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const noSubjectsAssigned = year && semester && subjects.length === 0;
  const midKey = examType === 'MID1' ? 'mid1' : 'mid2';
  const canImport = !!(subjectId && section && students.length > 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Enter Internal Marks</h1>
        <p className="text-sm text-slate-500">
          Only subjects assigned to you appear here. Enter marks manually or upload an Excel / PDF file.
        </p>
      </div>

      {/* ── 1. Class selector ── */}
      <Card title="1. Select Class">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="block">
            <span className="label">Year</span>
            <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Select</option>
              {[2, 3, 4].map((y) => <option key={y} value={y}>{y} Year</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Semester</span>
            <select className="input" value={semester} onChange={(e) => setSemester(e.target.value)} disabled={!year}>
              <option value="">Select</option>
              {year && YEAR_SEMESTERS[Number(year)]?.map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Section</span>
            <select className="input" value={section} onChange={(e) => setSection(e.target.value)} disabled={!semester}>
              <option value="">Select</option>
              {SECTIONS.map((s) => <option key={s} value={s}>Section {s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Subject</span>
            <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!semester}>
              <option value="">Select</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  [{s.type}] {s.subjectCode} — {s.subjectName}
                </option>
              ))}
            </select>
          </label>
        </div>

        {noSubjectsAssigned && (
          <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <p>
              You are not assigned to any subject in{' '}
              {year === '2' ? '2nd' : year === '3' ? '3rd' : '4th'} Year · Semester {semester}.
              Marks entry is not available for subjects you don't teach.
            </p>
          </div>
        )}
      </Card>

      {/* ── 2. Mid selector + entry-mode toggle ── */}
      {subjectId && section && students.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Entering:</span>

            {/* Mid toggle */}
            <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
              <button
                onClick={() => setExamType('MID1')}
                className={`px-4 py-1.5 text-sm font-medium transition ${
                  examType === 'MID1'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Mid-1
              </button>
              <button
                onClick={() => setExamType('MID2')}
                className={`px-4 py-1.5 text-sm font-medium transition border-l border-slate-300 ${
                  examType === 'MID2'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Mid-2
              </button>
            </div>

            <span className="text-xs text-slate-500">
              {students.length} student{students.length === 1 ? '' : 's'}
            </span>

            {/* Upload button */}
            <div className="ml-auto">
              <Button
                variant="secondary"
                onClick={() => setImportOpen(true)}
                disabled={!canImport}
                title={canImport ? 'Import marks from Excel or CSV' : 'Select a subject and section first'}
              >
                <Upload size={15} /> Upload Excel / CSV
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── 3. Manual bulk-entry table ── */}
      {subjectId && section && (
        <Card title={`2. Manual Entry — ${students.length} student${students.length === 1 ? '' : 's'}`}>
          {loading ? (
            <p className="text-sm text-slate-500 py-6 text-center">Loading students…</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No students found for this year + section.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3 w-8">#</th>
                      <th className="py-2 pr-3">Roll No</th>
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3 w-24">
                        Written<br /><span className="text-xs font-normal">(0–30)</span>
                      </th>
                      <th className="py-2 pr-3 w-24">
                        Online<br /><span className="text-xs font-normal">(0–10)</span>
                      </th>
                      <th className="py-2 pr-3 w-24">
                        Assignment<br /><span className="text-xs font-normal">(0–5)</span>
                      </th>
                      <th className="py-2 pr-3 w-20">Total</th>
                      <th className="py-2 pr-3 w-20">Internal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, idx) => {
                      const m = marksMap[student._id] || {};
                      const otherKey = midKey === 'mid1' ? 'mid2' : 'mid1';
                      const mid   = m[midKey]   || { written: 0, online: 0, assignment: 0, total: 0 };
                      const other = m[otherKey] || { total: 0 };
                      const internal = computeInternal(mid.total, other.total);
                      return (
                        <tr key={student._id} className="border-b border-slate-100">
                          <td className="py-2 pr-3 text-slate-400 text-xs">{idx + 1}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{student.rollNumber}</td>
                          <td className="py-2 pr-3 text-xs">{student.name || '—'}</td>
                          <td className="py-2 pr-3">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              min="0" max="30"
                              value={draftValues[draftKey(student._id, midKey, 'written')] ?? (mid.written ?? 0)}
                              onChange={(e) => handleDraftChange(student._id, midKey, 'written', e.target.value)}
                              onBlur={(e) => handleDraftCommit(student._id, midKey, 'written', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              className="input !py-1 !px-2 !text-sm w-20"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              min="0" max="10"
                              value={draftValues[draftKey(student._id, midKey, 'online')] ?? (mid.online ?? 0)}
                              onChange={(e) => handleDraftChange(student._id, midKey, 'online', e.target.value)}
                              onBlur={(e) => handleDraftCommit(student._id, midKey, 'online', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              className="input !py-1 !px-2 !text-sm w-20"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              min="0" max="5"
                              value={draftValues[draftKey(student._id, midKey, 'assignment')] ?? (mid.assignment ?? 0)}
                              onChange={(e) => handleDraftChange(student._id, midKey, 'assignment', e.target.value)}
                              onBlur={(e) => handleDraftCommit(student._id, midKey, 'assignment', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              className="input !py-1 !px-2 !text-sm w-20"
                            />
                          </td>
                          <td className="py-2 pr-3 text-xs font-medium text-slate-700">
                            {mid.total ?? 0}/30
                          </td>
                          <td className="py-2 pr-3 text-xs font-semibold text-brand-700">
                            {internal ?? 0}/30
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={saveAll} disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving…' : 'Save All Marks'}
                </Button>
                <span className="text-xs text-slate-500">
                  Internal = max(Mid-1, Mid-2). Written ÷ 2 + Online + Assignment.
                </span>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ── 4. Records table ── */}
      {subjectId && records.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">
              Marks Records ({records.length})
            </h3>
            <Button
              variant="danger"
              onClick={() => setConfirmDeleteAll(true)}
              title="Delete all saved marks for the current subject and section"
            >
              <Trash2 size={13} /> Delete All
            </Button>
          </div>
          <Table
            empty="No records."
            columns={[
              { key: 'roll',     label: 'Roll',     render: (r) => r.studentId?.rollNumber || '—' },
              { key: 'name',     label: 'Name',     render: (r) => r.studentId?.name || '—' },
              { key: 'mid1',     label: 'Mid-1',    render: (r) => `${r.mid1?.total ?? 0}/30` },
              { key: 'mid2',     label: 'Mid-2',    render: (r) => `${r.mid2?.total ?? 0}/30` },
              {
                key: 'internal', label: 'Internal',
                render: (r) => <strong>{r.internalMarks ?? 0}/30</strong>,
              },
              {
                key: 'status',   label: 'Status',
                render: (r) => (
                  <Badge
                    variant={
                      r.status === 'PUBLISHED' ? 'success' :
                      r.status === 'LOCKED'    ? 'danger'  : 'warning'
                    }
                  >
                    {r.status}
                  </Badge>
                ),
              },
              {
                key: 'action', label: '',
                render: (r) => (
                  <div className="flex items-center gap-2 justify-end">
                    {r.status === 'DRAFT' && (
                      <Button variant="secondary" onClick={() => publishOne(r._id)}>
                        <BookOpen size={13} /> Publish
                      </Button>
                    )}
                    {r.status === 'PUBLISHED' && (
                      <Button
                        variant="secondary"
                        onClick={() => setConfirmUnpublish(r)}
                        title="Unpublish — set back to Draft"
                      >
                        <BookOpen size={13} /> Unpublish
                      </Button>
                    )}
                    {r.status !== 'LOCKED' && (
                      <Button
                        variant="danger"
                        onClick={() => setConfirmDelete(r)}
                        title="Remove this marks record"
                      >
                        <Trash2 size={13} /> Remove
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            data={records}
          />
        </Card>
      )}

      {/* ── Confirm delete ── */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Remove Marks"
        message={
          confirmDelete
            ? `Are you sure you want to remove the marks for ${confirmDelete.studentId?.name || 'this student'} (${confirmDelete.studentId?.rollNumber || ''})?`
            : ''
        }
        confirmLabel="Remove Marks"
        confirmVariant="danger"
        onConfirm={() => deleteOne(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
        loading={actionLoading}
      />

      {/* ── Confirm unpublish ── */}
      <ConfirmDialog
        open={!!confirmUnpublish}
        title="Unpublish Marks"
        message={
          confirmUnpublish
            ? `Unpublish marks for ${confirmUnpublish.studentId?.name || 'this student'} (${confirmUnpublish.studentId?.rollNumber || ''})? The status will be set back to Draft and the student will no longer see these marks.`
            : ''
        }
        confirmLabel="Unpublish"
        confirmVariant="danger"
        onConfirm={() => unpublishOne(confirmUnpublish)}
        onCancel={() => setConfirmUnpublish(null)}
        loading={actionLoading}
      />

      {/* ── Confirm delete all ── */}
      <ConfirmDialog
        open={confirmDeleteAll}
        title="Delete All Marks"
        message={`This will permanently remove all ${records.length} marks record(s) for the current subject and section. This cannot be undone.`}
        confirmLabel="Delete All"
        confirmVariant="danger"
        onConfirm={deleteAll}
        onCancel={() => setConfirmDeleteAll(false)}
        loading={actionLoading}
      />

      {/* ── Import modal ── */}
      <MarksImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        subjectId={subjectId}
        year={year}
        section={section}
        midKey={midKey}
        onSaved={() => {
          loadRecords();
          // Reload marksMap so the manual table reflects imported values
          if (subjectId && section) {
            Promise.all([
              api.get(`/lookup/students?year=${year}&section=${section}`),
              api.get(`/marks?subjectId=${subjectId}&section=${section}`),
            ]).then(([sRes, mRes]) => {
              const list = [...(sRes.data.data || [])];
              list.sort((a, b) =>
                String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true })
              );
              setStudents(list);
              const map = {};
              list.forEach((s) => {
                const existing = (mRes.data.data?.items || []).find(
                  (m) => String(m.studentId?._id || m.studentId) === String(s._id)
                );
                map[s._id] = {
                  mid1:   existing?.mid1   || { written: 0, online: 0, assignment: 0, total: 0 },
                  mid2:   existing?.mid2   || { written: 0, online: 0, assignment: 0, total: 0 },
                  status: existing?.status || 'DRAFT',
                  _id:    existing?._id,
                };
              });
              setMarksMap(map);
            }).catch(() => {});
          }
        }}
      />
    </div>
  );
}
