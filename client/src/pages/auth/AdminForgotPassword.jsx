import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import api from '../../services/api.js';
import { useOtpResend } from '../../hooks/useOtpResend.js';

export default function AdminForgotPassword() {
  const [step, setStep] = useState('FORM');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const resend = useOtpResend(30);

  async function request(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/admin/forgot-password/init', { email });
      toast.success('Reset code sent to the recovery email.');
      setStep('VERIFY');
      resend.start();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  }

  async function resendOtp() {
    if (resend.isCoolingDown) return;
    setResending(true);
    try {
      await api.post('/auth/admin/forgot-password/init', { email });
      resend.start();
      toast.success('New reset code sent.');
    } catch (err) { toast.error(err.response?.data?.message || 'Could not resend'); }
    finally { setResending(false); }
  }

  async function submit(e) {
    e.preventDefault();
    if (newPassword !== confirm) return toast.error('Passwords do not match');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await api.post('/auth/admin/forgot-password/verify', { email, code: code.trim(), newPassword });
      toast.success('Password reset! Please sign in.');
      navigate('/auth/admin/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  }

  if (step === 'FORM') {
    return (
      <AuthLayout title="Admin Forgot Password"
        subtitle="A recovery code will be sent to the registered recovery email."
        footer={<Link className="text-brand-600 font-medium" to="/auth/admin/login">← Back to login</Link>}>
        <form onSubmit={request} className="space-y-4">
          <Input label="Admin Email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="w-full" disabled={loading}>
            <Mail size={16} /> {loading ? 'Sending…' : 'Send Reset Code'}
          </Button>
          <p className="text-xs text-slate-500 text-center">
            Code is sent to <b>suryanaidu652@gmail.com</b>.
          </p>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" subtitle="Enter the code from the recovery email."
      footer={<button type="button" onClick={() => setStep('FORM')}
        className="text-brand-600 font-medium inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Change email</button>}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Verification Code" required value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric" maxLength={6}
          className="text-center tracking-[0.5em] text-lg" />

        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 flex items-start gap-2">
          <span>📩</span>
          <p><b>OTP not received?</b> Check the recovery inbox at <b>suryanaidu652@gmail.com</b> (and its Spam folder).</p>
        </div>

        <Input label="New Password" type="password" required minLength={8}
          value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <Input label="Confirm New Password" type="password" required minLength={8}
          value={confirm} onChange={(e) => setConfirm(e.target.value)} />

        <Button type="submit" className="w-full" disabled={loading}>
          <ShieldCheck size={16} /> {loading ? 'Resetting…' : 'Reset Password'}
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