import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOtpResend } from '../../hooks/useOtpResend.js';

export default function AttendanceRegister() {
  const [step, setStep] = useState('FORM');
  const [info, setInfo] = useState({ employeeId: '', name: '', email: '' });
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { loginAs } = useAuth();
  const navigate = useNavigate();
  const resend = useOtpResend(30);

  async function requestOtp(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/auth/staff/register/init', info);
      setSentTo(r.data.data.sentTo);
      setStep('OTP');
      resend.start();
      toast.success('Verification code sent to your email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start registration');
    } finally { setLoading(false); }
  }

  async function resendOtp() {
    if (resend.isCoolingDown) return;
    setResending(true);
    try {
      const r = await api.post('/auth/staff/register/init', info);
      setSentTo(r.data.data.sentTo);
      resend.start();
      toast.success('New verification code sent.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend');
    } finally { setResending(false); }
  }

  async function verifyAndCreate(e) {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      const r = await api.post('/auth/staff/register/verify', {
        employeeId: info.employeeId,
        code: code.trim(),
        password,
      });
      loginAs(r.data.data);
      toast.success('Account created!');
      navigate('/attendance/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally { setLoading(false); }
  }

  if (step === 'FORM') {
    return (
      <AuthLayout
        title="COP Registration"
        subtitle="Your Employee ID must match the one added by the admin."
        footer={
          <>
            Already registered?{' '}
            <Link className="text-brand-600 font-medium" to="/auth/attendance/login">Sign in</Link>
          </>
        }
      >
        <form onSubmit={requestOtp} className="space-y-4">
          <Input label="Employee ID" required value={info.employeeId}
            onChange={(e) => setInfo({ ...info, employeeId: e.target.value })}
            placeholder="e.g. ATT001" />
          <Input label="Full Name" required value={info.name}
            onChange={(e) => setInfo({ ...info, name: e.target.value })} />
          <Input label="Email" type="email" required value={info.email}
            onChange={(e) => setInfo({ ...info, email: e.target.value })} />
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
          <span>📩</span>
          <p><b>OTP not received?</b> Please check your <b>Spam/Junk folder</b> once.</p>
        </div>

        <Input label="Choose a Password" type="password" required minLength={8}
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input label="Confirm Password" type="password" required minLength={8}
          value={confirm} onChange={(e) => setConfirm(e.target.value)} />

        <Button type="submit" className="w-full" disabled={loading}>
          <ShieldCheck size={16} /> {loading ? 'Verifying…' : 'Create Account'}
        </Button>

        <button type="button" onClick={resendOtp}
          disabled={resend.isCoolingDown || resending}
          className="text-xs text-brand-600 hover:underline w-full inline-flex items-center justify-center gap-1 disabled:text-slate-400 disabled:no-underline">
          <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
          {resend.isCoolingDown ? `Resend OTP in ${resend.cooldown}s` : resending ? 'Resending…' : 'Resend OTP'}
        </button>
      </form>
    </AuthLayout>
  );
}