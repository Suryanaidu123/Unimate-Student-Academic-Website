import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Megaphone, Star, HelpCircle, BarChart2,
  CheckCircle2, Loader2, AlertCircle,
} from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

const TYPE_META = {
  ANNOUNCEMENT:           { label: 'Announcement',           icon: Megaphone,    color: 'info',    hasResponse: false },
  IMPORTANT_ANNOUNCEMENT: { label: 'Important',              icon: Star,         color: 'danger',  hasResponse: false },
  SINGLE_CHOICE:          { label: 'Poll — Single Choice',   icon: CheckCircle2, color: 'brand',   hasResponse: true  },
  MULTIPLE_CHOICE:        { label: 'Poll — Multiple Choice', icon: CheckCircle2, color: 'brand',   hasResponse: true  },
  QUESTION:               { label: 'Question',               icon: HelpCircle,   color: 'warning', hasResponse: true  },
  SURVEY:                 { label: 'Survey',                 icon: BarChart2,    color: 'success', hasResponse: true  },
  OTHER:                  { label: 'Other',                  icon: Megaphone,    color: 'default', hasResponse: false },
};

function fmt(dt) {
  return new Date(dt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function StudentActivities() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  // per-activity draft choices: { [activityId]: string[] }
  const [drafts, setDrafts]   = useState({});
  // per-activity text answers
  const [textDrafts, setTextDrafts] = useState({});
  const [submitting, setSubmitting] = useState(null);

  function load() {
    setLoading(true);
    api.get('/activities/student/mine')
      .then((r) => setItems(r.data.data || []))
      .catch(() => toast.error('Failed to load activities'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  // ── toggle choice for multi-select ────────────────────────────────────────
  function toggleChoice(actId, label, isMulti) {
    setDrafts((prev) => {
      const cur = prev[actId] || [];
      if (isMulti) {
        const next = cur.includes(label) ? cur.filter((c) => c !== label) : [...cur, label];
        return { ...prev, [actId]: next };
      }
      return { ...prev, [actId]: [label] };
    });
  }

  // ── submit response ────────────────────────────────────────────────────────
  async function submit(actId, type) {
    const choices    = drafts[actId]    || [];
    const textAnswer = textDrafts[actId] || '';

    if (type === 'SINGLE_CHOICE' && choices.length !== 1) {
      return toast.error('Please select one option.');
    }
    if (type === 'MULTIPLE_CHOICE' && choices.length === 0) {
      return toast.error('Please select at least one option.');
    }
    if ((type === 'QUESTION' || type === 'SURVEY') && !textAnswer.trim() && choices.length === 0) {
      return toast.error('Please provide a response.');
    }

    setSubmitting(actId);
    try {
      await api.post(`/activities/${actId}/respond`, { choices, textAnswer });
      toast.success('Response submitted!');
      // Mark as responded locally
      setItems((prev) =>
        prev.map((a) => a._id === actId ? { ...a, hasResponded: true } : a)
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setSubmitting(null); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activities</h1>
        <p className="text-sm text-slate-500">
          Announcements, polls and surveys from your department.
        </p>
      </div>

      {loading ? (
        <Card><p className="text-sm text-slate-500 py-8 text-center">Loading…</p></Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Megaphone size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No active activities right now.</p>
            <p className="text-sm text-slate-400 mt-1">Check back later.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((a) => {
            const meta     = TYPE_META[a.type] || TYPE_META.OTHER;
            const Icon     = meta.icon;
            const isMulti  = a.type === 'MULTIPLE_CHOICE';
            const selected = drafts[a._id] || [];
            const hasOpts  = Array.isArray(a.options) && a.options.length > 0;
            const needsText = a.type === 'QUESTION' || (a.type === 'SURVEY' && !hasOpts);

            return (
              <Card key={a._id} className={
                a.type === 'IMPORTANT_ANNOUNCEMENT'
                  ? 'border-l-4 border-l-red-500'
                  : ''
              }>
                {/* Header */}
                <div className="flex flex-wrap items-start gap-2 mb-3">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    a.type === 'IMPORTANT_ANNOUNCEMENT' ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-700'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <Badge variant={meta.color}>{meta.label}</Badge>
                      {a.hasResponded && <Badge variant="success">✓ Responded</Badge>}
                    </div>
                    <h3 className="font-semibold text-slate-900">{a.title}</h3>
                    {a.description && (
                      <p className="text-sm text-slate-600 mt-1">{a.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Active until {fmt(a.endDate)}
                    </p>
                  </div>
                </div>

                {/* Response area */}
                {meta.hasResponse && !a.hasResponded && (
                  <div className="mt-3 space-y-3">
                    {/* Choice options */}
                    {hasOpts && (
                      <div className="space-y-2">
                        {a.options.map((opt) => {
                          const lbl      = opt.label || opt;
                          const isChosen = selected.includes(lbl);
                          return (
                            <button
                              type="button"
                              key={lbl}
                              onClick={() => toggleChoice(a._id, lbl, isMulti)}
                              className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition font-medium ${
                                isChosen
                                  ? 'bg-brand-600 text-white border-brand-600'
                                  : 'bg-white text-slate-700 border-slate-300 hover:border-brand-400'
                              }`}
                            >
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border mr-2 text-xs ${
                                isChosen ? 'bg-white/20 border-white' : 'border-slate-400'
                              }`}>
                                {isMulti ? (isChosen ? '✓' : '') : (isChosen ? '●' : '')}
                              </span>
                              {lbl}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Text answer */}
                    {needsText && (
                      <textarea
                        className="input w-full min-h-[80px] resize-y"
                        placeholder="Type your response…"
                        value={textDrafts[a._id] || ''}
                        onChange={(e) => setTextDrafts((prev) => ({ ...prev, [a._id]: e.target.value }))}
                      />
                    )}

                    <div className="flex justify-end">
                      <Button
                        onClick={() => submit(a._id, a.type)}
                        disabled={submitting === a._id}
                      >
                        {submitting === a._id
                          ? <><Loader2 size={14} className="animate-spin" /> Submitting…</>
                          : 'Submit Response'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Already responded */}
                {meta.hasResponse && a.hasResponded && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle2 size={15} className="shrink-0" />
                    Your response has been recorded.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
