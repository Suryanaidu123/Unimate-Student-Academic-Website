import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const STEP_FORM = 'FORM';
const STEP_OTP = 'OTP';

export default function StudentRegister() {
  const [step, setStep] = useState(STEP_FORM);
  const [info, setInfo] = useState({
    rollNumber: '',
    name: '',
    email: '',
    academicYear: 2,
  });
  const [otp, setOtp] = useState('');
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
      const r = await api.post('/auth/student/register/init', info);
      setSentTo(r.data.data.sentTo);
      setStep(STEP_OTP);
      toast.success('Verification code sent to your college email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start registration');
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndCreate(e) {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      const r = await api.post('/auth/student/register/verify', {
        rollNumber: info.rollNumber,
        code: otp.trim(),
        password,
      });
      loginAs(r.data.data);
      toast.success('Account created!');
      navigate('/student/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    try {
      const r = await api.post('/auth/student/register/init', info);
      setSentTo(r.data.data.sentTo);
      toast.success('New code sent.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend');
    } finally {
      setLoading(false);
    }
  }

  if (step === STEP_FORM) {
    return (
      <AuthLayout
        title="Student Registration"
        subtitle="Enter your details. Roll number, email and academic year must match college records."
        footer={
          <>
            Already registered?{' '}
            <Link className="text-brand-600 font-medium" to="/auth/student/login">
              Sign in
            </Link>
          </>
        }
      >
        <form onSubmit={requestOtp} className="space-y-4">
          <Input
            label="Roll Number"
            required
            value={info.rollNumber}
            onChange={(e) => setInfo({ ...info, rollNumber: e.target.value })}
            placeholder="e.g. 24K61A6101"
            autoFocus
          />

          <Input
            label="Full Name"
            required
            value={info.name}
            onChange={(e) => setInfo({ ...info, name: e.target.value })}
            placeholder="As per your college ID"
          />

          <Input
            label="College Email"
            type="email"
            required
            value={info.email}
            onChange={(e) => setInfo({ ...info, email: e.target.value })}
            placeholder="you@college.edu"
          />

          <label className="block">
            <span className="label">Academic Year</span>
            <select
              className="input"
              required
              value={info.academicYear}
              onChange={(e) => setInfo({ ...info, academicYear: Number(e.target.value) })}
            >
              <option value={2}>2nd Year</option>
              <option value={3}>3rd Year</option>
              <option value={4}>4th Year</option>
            </select>
          </label>

          <Button type="submit" className="w-full" disabled={loading}>
            <Mail size={16} /> {loading ? 'Sending…' : 'Send Verification Code'}
          </Button>

          <p className="text-xs text-slate-500">
            A 6-digit code will be sent to your <b>college email</b>. Make sure you can access it.
          </p>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={`Enter the 6-digit code sent to ${sentTo || 'your college email'}.`}
      footer={
        <button
          type="button"
          onClick={() => setStep(STEP_FORM)}
          className="text-brand-600 font-medium inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Change details
        </button>
      }
    >
      <form onSubmit={verifyAndCreate} className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
          <p><b>Roll:</b> {info.rollNumber}</p>
          <p><b>Name:</b> {info.name}</p>
          <p><b>Email:</b> {info.email}</p>
          <p>
            <b>Academic Year:</b>{' '}
            {info.academicYear === 2 ? '2nd Year' : info.academicYear === 3 ? '3rd Year' : '4th Year'}
          </p>
        </div>

        <Input
          label="Verification Code"
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          maxLength={6}
          placeholder="••••••"
          className="text-center tracking-[0.5em] text-lg"
        />
<div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 flex items-start gap-2">
  <span className="text-base leading-none">📩</span>
  <p>
    <b>OTP not received?</b> Please check your <b>Spam/Junk folder</b> once.
    Emails from a new sender sometimes land there.
  </p>
</div>
        <Input
          label="Choose a Password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <Input
          label="Confirm Password"
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        
        <Button type="submit" className="w-full" disabled={loading}>
          <ShieldCheck size={16} /> {loading ? 'Verifying…' : 'Create Account'}
        </Button>

        <button
          type="button"
          onClick={resendOtp}
          disabled={loading}
          className="text-xs text-brand-600 hover:underline w-full inline-flex items-center justify-center gap-1"
        >
          <RefreshCw size={12} /> Didn't get the code? Resend
        </button>
      </form>
    </AuthLayout>
  );
}