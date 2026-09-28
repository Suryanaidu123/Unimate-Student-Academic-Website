import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <GraduationCap /> UniMate
        </Link>
        <div>
          <h1 className="text-4xl font-bold leading-tight">One Platform.<br />Smarter Study.<br />Better Academic Life.</h1>
          <p className="mt-4 text-white/80 max-w-md">
            Purpose-built for B.Tech AI & ML students — from marks to notes, assignments to exams.
          </p>
        </div>
        <p className="text-white/60 text-sm">© {new Date().getFullYear()} UniMate</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-sm text-slate-600">{footer}</div>}
        </div>
      </div>
    </div>
  );
}