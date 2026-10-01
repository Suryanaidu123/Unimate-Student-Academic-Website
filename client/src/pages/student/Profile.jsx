import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import api from '../../services/api.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';

export default function Profile() {
  const [me, setMe] = useState(null);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then((r) => setMe(r.data.data));
  }, []);

  async function onChangePassword(e) {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirm) return toast.error('Passwords do not match');
    if (pwd.newPassword.length < 8) return toast.error('New password must be at least 8 characters');
    setSaving(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      toast.success('Password changed');
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  }

  if (!me) return <div>Loading…</div>;
  const p = me.profile || {};
  const rows = [
    ['Name', p.name], ['Roll Number', p.rollNumber], ['Email', p.email],
    ['Department', p.department], ['Course', p.course], ['Batch', p.batch],
    ['Academic Year', p.academicYear], ['Year', p.year], ['Semester', p.semester],
    ['Section', p.section],
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <Card title="Personal Information">
        <dl className="divide-y divide-slate-100">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 py-3 text-sm">
              <dt className="text-slate-500">{k}</dt>
              <dd className="col-span-2 font-medium">{v || '—'}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Change Password">
        <form onSubmit={onChangePassword} className="space-y-3 max-w-md">
          <Input label="Current Password" type="password" required
                 value={pwd.currentPassword}
                 onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} />
          <Input label="New Password" type="password" required minLength={8}
                 value={pwd.newPassword}
                 onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} />
          <Input label="Confirm New Password" type="password" required minLength={8}
                 value={pwd.confirm}
                 onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
          <Button type="submit" disabled={saving}>
            <KeyRound size={16} /> {saving ? 'Saving…' : 'Change Password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}