import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, ClipboardList, GraduationCap, FileText,
  Calendar, Bell, User, Users, Settings, ScrollText, CalendarDays, Layers,  MessageSquare
} from 'lucide-react';

const links = {
  STUDENT: [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/subjects', label: 'Subjects', icon: BookOpen },
    { to: '/student/marks', label: 'Marks', icon: GraduationCap },
    { to: '/student/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/student/notes', label: 'Notes', icon: FileText },
    { to: '/student/timetable', label: 'Timetable', icon: Calendar },
    { to: '/student/contact-admin', label: 'Contact Admin', icon: MessageSquare },
    { to: '/student/materials', label: 'Academic Materials', icon: FileText },
    { to: '/student/exams', label: 'Exams', icon: GraduationCap },
    { to: '/student/notifications', label: 'Notifications', icon: Bell },
    { to: '/student/profile', label: 'Profile', icon: User },
  ],
  FACULTY: [
    { to: '/faculty/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/faculty/subjects', label: 'Subjects', icon: BookOpen },
    { to: '/faculty/materials', label: 'Academic Materials', icon: FileText },
    { to: '/faculty/marks', label: 'Marks', icon: GraduationCap },
    { to: '/faculty/notifications', label: 'Notifications', icon: Bell },
  ],
  ADMIN: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/messages', label: 'Student Messages', icon: MessageSquare },
    { to: '/admin/faculty', label: 'Faculty', icon: User },
    { to: '/admin/materials', label: 'Academic Materials', icon: FileText },
    { to: '/admin/subjects', label: 'Subjects & Labs', icon: BookOpen },
    { to: '/admin/notes', label: 'Notes', icon: FileText },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell },
    { to: '/admin/bulk-students', label: 'Bulk Add Students', icon: Users }, 
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  ],
};

export default function Sidebar({ role }) {
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-slate-200">
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center gap-2 text-brand-700 font-bold text-xl">
          <GraduationCap /> UniMate
        </div>
        <p className="text-xs text-slate-500 mt-1 capitalize">{role.toLowerCase()} portal</p>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links[role].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}