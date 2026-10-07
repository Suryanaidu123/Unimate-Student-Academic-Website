import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, BarChart3, Bell, ShieldCheck, Users } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  function handleAdminSecret() {
    const key = '__adminClicks';
    window[key] = (window[key] || 0) + 1;
    clearTimeout(window.__adminTimer);
    if (window[key] >= 3) {
      window[key] = 0;
      navigate('/auth/admin/login');
      return;
    }
    window.__adminTimer = setTimeout(() => { window[key] = 0; }, 800);
  }

  const features = [
    { icon: BookOpen,     title: 'Subjects & Notes',    text: 'Browse subjects and access notes published by faculty.' },
    { icon: BarChart3,    title: 'Marks & Analytics',   text: 'Mid-1, Mid-2 and internal marks calculated the right way.' },
    { icon: Bell,         title: 'Smart Notifications', text: 'Never miss assignments, exams or announcements.' },
    { icon: ShieldCheck,  title: 'Role-Based Access',   text: 'Students, faculty and admins see exactly what they should.' },
    { icon: Users,        title: 'AI & ML Focused',     text: 'Built only for B.Tech AI & ML — 2nd, 3rd and 4th year.' },
    { icon: GraduationCap,title: 'Faculty Tools',       text: 'Faculty can manage notes, assignments and internal marks.' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Header ── */}
      <header className="w-full border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16 gap-3">
          <div className="flex items-center gap-2 text-brand-700 font-bold text-lg sm:text-xl">
            <GraduationCap size={24} /> UniMate
          </div>
          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-2">
            <Link className="btn-secondary text-sm" to="/auth/faculty/login">Faculty Login</Link>
            <Link className="btn-primary  text-sm" to="/auth/student/login">Student Login</Link>
          </nav>
          {/* Mobile — single compact button */}
          <Link className="sm:hidden btn-primary text-sm px-4 py-2" to="/auth/student/login">
            Sign In
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20 text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          One Platform.{' '}
          <span className="text-brand-600">Smarter Study.</span>
          <br className="hidden sm:block" />
          {' '}Better Academic Life.
        </h1>
        <p className="mt-4 sm:mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto px-2">
          UniMate is the academic management platform built specifically for B.Tech
          Artificial Intelligence &amp; Machine Learning students.
        </p>

        {/* ── CTA buttons ── */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3 px-4">
          <Link
            className="btn-primary w-full sm:w-auto text-center text-base px-6 py-3"
            to="/auth/student/register"
          >
            Create Student Account
          </Link>
          <Link
            className="btn-secondary w-full sm:w-auto text-center text-base px-6 py-3"
            to="/auth/student/login"
          >
            Student Sign In
          </Link>
        </div>

        {/* Faculty link — smaller, beneath CTA */}
        <p className="mt-4 text-sm text-slate-500">
          Are you faculty?{' '}
          <Link className="text-brand-600 font-medium hover:underline" to="/auth/faculty/login">
            Faculty Login
          </Link>
          {' '}·{' '}
          <Link className="text-slate-500 hover:text-brand-600" to="/auth/faculty/register">
            Register
          </Link>
        </p>
      </section>

      {/* ── Feature grid ── */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 pb-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-5 sm:p-6">
            <div className="p-2.5 rounded-lg bg-brand-50 text-brand-700 inline-flex mb-3">
              <Icon size={20} />
            </div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1">{text}</p>
          </div>
        ))}
      </section>

      {/* ── Footer ── */}
      <footer className="text-center text-sm text-slate-400 py-6 border-t border-slate-100 px-4">
        <span
          onClick={handleAdminSecret}
          className="cursor-default select-none"
          title=""
        >
          © {new Date().getFullYear()} UniMate
        </span>
        {' '}— B.Tech AI &amp; ML Academic Portal
      </footer>
    </div>
  );
}
