import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, ShieldCheck, ArrowLeft } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function FacultyRegister() {
  const [step, setStep] = useState('FORM');
const [info, setInfo] = useState({
  employeeId: '',
  name: '',
  email: '',
  designation: 'Assistant Professor',
});
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginAs } = useAuth();
  const navigate = useNavigate();

  async function requestOtp(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/auth/faculty/register/init', info);
      setSentTo(r.data.data.sentTo);
      setStep('OTP');
      toast.success('Verification code sent to your email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start registration');
    } finally { setLoading(false); }
  }

  async function verifyAndCreate(e) {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      const r = await api.post('/auth/faculty/register/verify', {
        employeeId: info.employeeId,
        code: code.trim(),
        password,
      });
      loginAs(r.data.data);
      toast.success('Faculty account created!');
      navigate('/faculty/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally { setLoading(false); }
  }

  if (step === 'FORM') {
    return (
      <AuthLayout
        title="Faculty Registration"
        subtitle="Your Employee ID must match the one added by the admin."
        footer={
          <>
            Already registered?{' '}
            <Link className="text-brand-600 font-medium" to="/auth/faculty/login">Sign in</Link>
          </>
        }
      >
        <form onSubmit={requestOtp} className="space-y-4">
          <Input label="Employee ID" required value={info.employeeId}
                 onChange={(e) => setInfo({ ...info, employeeId: e.target.value })}
                 placeholder="e.g. FAC001" />
          <Input label="Full Name" required value={info.name}
                 onChange={(e) => setInfo({ ...info, name: e.target.value })} />
          <Input label="Email" type="email" required value={info.email}
                 onChange={(e) => setInfo({ ...info, email: e.target.value })} />
       <label className="block">
  <span className="label">Designation</span>
  <select className="select input" required value={info.designation}
    onChange={(e) => setInfo({ ...info, designation: e.target.value })}>
    <option value="Professor">Professor</option>
    <option value="Associate Professor">Associate Professor</option>
    <option value="Assistant Professor">Assistant Professor</option>
  </select>
</label>
          <Button type="submit" className="w-full" disabled={loading}>
            <Mail size={16} /> {loading ? 'Sending…' : 'Send Verification Code'}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={`Enter the 6-digit code sent to ${sentTo}.`}
      footer={
        <button type="button" onClick={() => setStep('FORM')}
          className="text-brand-600 font-medium inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Change details
        </button>
      }
    >
      <form onSubmit={verifyAndCreate} className="space-y-4">
        <Input label="Verification Code" required value={code}
               onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
               inputMode="numeric" maxLength={6}
               className="text-center tracking-[0.5em] text-lg" />
               <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 flex items-start gap-2">
  <span className="text-base leading-none">📩</span>
  <p>
    <b>OTP not received?</b> Please check your <b>Spam/Junk folder</b> once.
    Emails from a new sender sometimes land there.
  </p>
</div>
        <Input label="Choose a Password" type="password" required minLength={8}
               value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input label="Confirm Password" type="password" required minLength={8}
               value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button type="submit" className="w-full" disabled={loading}>
          <ShieldCheck size={16} /> {loading ? 'Verifying…' : 'Create Faculty Account'}
        </Button>
      </form>
    </AuthLayout>
  );
}