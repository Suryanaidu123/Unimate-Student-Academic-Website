import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, ShieldCheck, ArrowLeft } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import api from '../../services/api.js';

export default function StudentForgotPassword() {
  const [step, setStep] = useState('FORM');
  const [info, setInfo] = useState({ rollNumber: '', email: '' });
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function requestCode(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/student/forgot-password/init', info);
      toast.success('Reset code sent to your college email.');
      setStep('VERIFY');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send reset code');
    } finally { setLoading(false); }
  }

  async function submitReset(e) {
    e.preventDefault();
    if (newPassword !== confirm) return toast.error('Passwords do not match');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await api.post('/auth/student/forgot-password/verify', {
        rollNumber: info.rollNumber,
        code: code.trim(),
        newPassword,
      });
      toast.success('Password reset! Please sign in.');
      navigate('/auth/student/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally { setLoading(false); }
  }

  if (step === 'FORM') {
    return (
      <AuthLayout
        title="Forgot Password"
        subtitle="Enter your Roll Number and College Email to receive a reset code."
        footer={
          <Link className="text-brand-600 font-medium" to="/auth/student/login">
            ← Back to login
          </Link>
        }
      >
        <form onSubmit={requestCode} className="space-y-4">
          <Input label="Roll Number" required value={info.rollNumber}
                 onChange={(e) => setInfo({ ...info, rollNumber: e.target.value })} />
          <Input label="College Email" type="email" required value={info.email}
                 onChange={(e) => setInfo({ ...info, email: e.target.value })} />
          <Button type="submit" className="w-full" disabled={loading}>
            <Mail size={16} /> {loading ? 'Sending…' : 'Send Reset Code'}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter the 6-digit code from your email and choose a new password."
      footer={
        <button type="button" onClick={() => setStep('FORM')}
          className="text-brand-600 font-medium inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Change details
        </button>
      }
    >
      <form onSubmit={submitReset} className="space-y-4">
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
        <Input label="New Password" type="password" required minLength={8}
               value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <Input label="Confirm New Password" type="password" required minLength={8}
               value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button type="submit" className="w-full" disabled={loading}>
          <ShieldCheck size={16} /> {loading ? 'Resetting…' : 'Reset Password'}
        </Button>
      </form>
    </AuthLayout>
  );
}