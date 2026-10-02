import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, ClipboardList, GraduationCap, FileText,
  Calendar, CalendarDays, Bell, User, Users, ScrollText, MessageSquare, X,
} from 'lucide-react';
import { useBadges } from '../context/BadgeContext.jsx';

const ROUTE_BADGE = {
  '/student/exams': 'exams',
  '/student/materials': 'materials',
  '/student/assignments': 'assignments',
  '/student/timetable': 'timetable',
  '/student/marks': 'marks',
  '/student/notifications': 'notifications',
};

const links = {
  STUDENT: [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/subjects', label: 'Subjects', icon: BookOpen },
    { to: '/student/marks', label: 'Marks', icon: GraduationCap },
    { to: '/student/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/student/notes', label: 'Notes', icon: FileText },
    { to: '/student/timetable', label: 'Timetable', icon: Calendar },
    { to: '/student/exams', label: 'Exams', icon: CalendarDays },
    { to: '/student/materials', label: 'Academic Materials', icon: FileText },
    { to: '/student/notifications', label: 'Notifications', icon: Bell },
    { to: '/student/contact-admin', label: 'Contact Admin', icon: MessageSquare },
    { to: '/student/profile', label: 'Profile', icon: User },
  ],
  FACULTY: [
    { to: '/faculty/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/faculty/subjects', label: 'Subjects', icon: BookOpen },
    { to: '/faculty/marks', label: 'Marks', icon: GraduationCap },
    { to: '/faculty/timetable', label: 'Timetable', icon: Calendar },
    { to: '/faculty/exams', label: 'Exams', icon: CalendarDays },
    { to: '/faculty/materials', label: 'Academic Materials', icon: FileText },
    { to: '/faculty/notifications', label: 'Notifications', icon: Bell },
  ],
  ADMIN: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/bulk-students', label: 'Bulk Add Students', icon: Users },
    { to: '/admin/faculty', label: 'Faculty', icon: User },
    { to: '/admin/semesters', label: 'Semesters', icon: GraduationCap },
    { to: '/admin/subjects', label: 'Subjects & Labs', icon: BookOpen },
    { to: '/admin/marks', label: 'Marks', icon: GraduationCap },
    { to: '/admin/timetable', label: 'Timetable', icon: Calendar },
    { to: '/admin/exams', label: 'Exams', icon: CalendarDays },
    { to: '/admin/materials', label: 'Academic Materials', icon: FileText },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell },
    { to: '/admin/messages', label: 'Student Messages', icon: MessageSquare },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  ],
};

function Badge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="ml-auto bg-red-500 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function Sidebar({ role, open = false, onClose }) {
  const { badges } = useBadges();

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  const items = links[role] || [];

  // Shared navigation content used by both desktop and mobile
  const navContent = (
    <>
      <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 text-brand-700 font-bold text-xl">
            <GraduationCap /> UniMate
          </div>
          <p className="text-xs text-slate-500 mt-1 capitalize">{role.toLowerCase()} portal</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2 -mr-2 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map(({ to, label, icon: Icon }) => {
          const badgeKey = ROUTE_BADGE[to];
          const count = badgeKey ? (badges?.[badgeKey] || 0) : 0;
          return (
            <NavLink
              key={to}
              to={to}
              onClick={() => onClose && onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              <Badge count={count} />
            </NavLink>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — visible only on md and above */}
      <aside className="hidden md:flex md:flex-col md:w-64 h-screen shrink-0 bg-white border-r border-slate-200">
        {navContent}
      </aside>

      {/* Mobile drawer — visible only when open and only on mobile */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={onClose}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />
          {/* Drawer panel */}
          <aside
            className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}