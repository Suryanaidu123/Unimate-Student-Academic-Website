import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

const YEAR_SEMESTERS = { 2: [3, 4], 3: [5, 6], 4: [7, 8] };

export default function YearSummary() {
  const [year, setYear] = useState('3');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!year) return;
    setLoading(true);
    const params = new URLSearchParams({ year });
    if (semester) params.set('semester', semester);
    if (section) params.set('section', section);

    api.get(`/attendance/year-summary?${params.toString()}`)
      .then((r) => setItems(r.data.data || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [year, semester, section]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users size={22} /> Year-wise Attendance
        </h1>
        <p className="text-sm text-slate-500">
          Held / Attended totals for each student in a selected year.
        </p>
      </div>

      <Card title="Filters">
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="label">Year</span>
            <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
              {[2, 3, 4].map((y) => <option key={y} value={y}>{y} Year</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Semester</span>
            <select className="input" value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">All</option>
              {year && YEAR_SEMESTERS[Number(year)]?.map((s) => (
                <option key={s} value={s}>Sem {s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Section</span>
            <select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">All</option>
              {['A', 'B', 'C', 'D'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
      </Card>

      <Card title={`Students (${items.length})`}>
        {loading ? <p className="text-sm text-slate-500 py-6 text-center">Loading…</p> : (
          <Table
            empty="No students match the filters."
            columns={[
              { key: 'rollNumber', label: 'Roll No' },
              { key: 'name', label: 'Name' },
              { key: 'section', label: 'Sec' },
              { key: 'semester', label: 'Sem' },
              { key: 'held', label: 'Held' },
              { key: 'attended', label: 'Attended' },
              {
                key: 'percentage', label: '%',
                render: (r) => (
                  <span className={`font-semibold ${r.belowThreshold ? 'text-red-600' : 'text-green-600'}`}>
                    {r.percentage}%
                  </span>
                ),
              },
              {
                key: 'status', label: 'Status',
                render: (r) => (
                  <Badge variant={r.belowThreshold ? 'danger' : 'success'}>
                    {r.belowThreshold ? 'Below 75%' : 'Good'}
                  </Badge>
                ),
              },
            ]}
            data={items}
          />
        )}
      </Card>
    </div>
  );
}