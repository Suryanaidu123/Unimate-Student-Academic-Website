import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../../layouts/AuthLayout.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function FacultyLogin() {
  const [form, setForm] = useState({ employeeId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { loginAs } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/auth/faculty/login', form);
      loginAs(r.data.data);
      toast.success('Welcome!');
      navigate('/faculty/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <AuthLayout title="Faculty Login" subtitle="Use your official Employee ID."
      footer={
  <>
    New faculty?{' '}
    <Link className="text-brand-600 font-medium" to="/auth/faculty/register">
      Create account
    </Link>
    {' · '}
    <Link className="text-brand-600 font-medium" to="/">Home</Link>
  </>
}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Employee ID" required value={form.employeeId}
               onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
        <Input label="Password" type="password" required value={form.password}
               onChange={(e) => setForm({ ...form, password: e.target.value })} />
               <div className="text-right">
  <Link to="/auth/faculty/forgot-password" className="text-xs text-brand-600 hover:underline">
    Forgot Password?
  </Link>
</div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </AuthLayout>
  );
}