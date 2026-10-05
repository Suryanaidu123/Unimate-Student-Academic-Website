import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, BarChart3, Bell, ShieldCheck, Users } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  // Triple-click on "© YEAR UniMate" → Admin login
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
    { icon: BookOpen, title: 'Subjects & Notes', text: 'Browse subjects and access notes published by faculty.' },
    { icon: BarChart3, title: 'Marks & Analytics', text: 'Mid-1, Mid-2 and internal marks calculated the right way.' },
    { icon: Bell, title: 'Smart Notifications', text: 'Never miss assignments, exams or announcements.' },
    { icon: ShieldCheck, title: 'Role-Based Access', text: 'Students, faculty, staff and admins see exactly what they should.' },
    { icon: Users, title: 'AI & ML Focused', text: 'Built only for B.Tech AI & ML — 2nd, 3rd and 4th year.' },
    { icon: GraduationCap, title: 'Faculty Tools', text: 'Faculty can manage notes, assignments and internal marks.' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-2 text-brand-700 font-bold text-xl">
          <GraduationCap /> UniMate
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <Link className="btn-secondary text-sm" to="/auth/faculty/login">Faculty Login</Link>
          <Link className="btn-primary text-sm" to="/auth/student/login">Student Login</Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-5 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
          One Platform. <span className="text-brand-600">Smarter Study.</span>
          <br />
          <span
            className="cursor-default select-none"
            title=""
          >
            Better Academic Life.
          </span>
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          UniMate is the academic management platform built specifically for B.Tech Artificial
          Intelligence & Machine Learning students.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="btn-primary" to="/auth/student/register">Create Student Account</Link>
          <Link className="btn-secondary" to="/auth/student/login">Student Sign In</Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-20 grid md:grid-cols-3 gap-4">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-6">
            <div className="p-3 rounded-lg bg-brand-50 text-brand-700 inline-flex mb-4"><Icon size={20} /></div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1">{text}</p>
          </div>
        ))}
      </section>

      <footer className="text-center text-sm text-slate-500 py-8 border-t border-slate-200">
        <span
          onClick={handleAdminSecret}
          className="cursor-default select-none"
          title=""
        >
          © {new Date().getFullYear()} UniMate
        </span>
        {' '}— B.Tech AI & ML Academic Portal
      </footer>
    </div>
  );
}