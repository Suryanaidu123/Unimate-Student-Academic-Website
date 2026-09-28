import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Send } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

const empty = { title: '', content: '', subjectId: '', tags: '', status: 'DRAFT' };

export default function AdminNotes() {
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  function load() {
    api.get('/notes?limit=200').then((r) => setItems(r.data.data.items || []));
    api.get('/subjects?limit=200').then((r) => setSubjects(r.data.data.items || []));
  }
  useEffect(load, []);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        content: form.content,
        subjectId: form.subjectId,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      await api.post('/notes', payload);
      toast.success('Note created');
      setOpen(false);
      setForm(empty);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create note');
    }
  }

  async function publish(id) {
    try { await api.post(`/notes/${id}/publish`); toast.success('Published'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to publish'); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this note?')) return;
    try { await api.delete(`/notes/${id}`); toast.success('Deleted'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notes</h1>
          <p className="text-sm text-slate-500">Create notes per subject, then publish them to students.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus size={16} /> Add Note</Button>
      </div>

      <Card>
        <Table
          empty="No notes yet."
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'subject', label: 'Subject', render: (r) => r.subjectId?.subjectName || '—' },
            { key: 'status', label: 'Status',
              render: (r) => <Badge variant={r.status === 'PUBLISHED' ? 'success' : 'warning'}>{r.status}</Badge> },
            { key: 'createdAt', label: 'Created',
              render: (r) => new Date(r.createdAt).toLocaleDateString() },
            {
              key: 'actions', label: '', render: (r) => (
                <div className="flex gap-2">
                  {r.status === 'DRAFT' && (
                    <Button variant="secondary" onClick={() => publish(r._id)} title="Publish">
                      <Send size={14} />
                    </Button>
                  )}
                  <button onClick={() => remove(r._id)} className="text-red-500 hover:text-red-700" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
          data={items}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Note">
        <form onSubmit={onSubmit} className="space-y-3">
          <Input label="Title" required value={form.title}
                 onChange={(e) => setForm({ ...form, title: e.target.value })} />

          <label className="block">
            <span className="label">Subject</span>
            <select className="input" required value={form.subjectId}
                    onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>{s.subjectCode} — {s.subjectName}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Content</span>
            <textarea className="input" rows={6} required value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </label>

          <Input label="Tags (comma separated)" value={form.tags}
                 onChange={(e) => setForm({ ...form, tags: e.target.value })} />

          <Button type="submit" className="w-full">Create Note</Button>
        </form>
      </Modal>
    </div>
  );
}