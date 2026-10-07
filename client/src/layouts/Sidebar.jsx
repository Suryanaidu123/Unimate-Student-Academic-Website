import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, ClipboardList, GraduationCap, FileText,
  CalendarDays, Bell, User, Users, ScrollText, MessageSquare, X,
  History, Megaphone, BookMarked, TrendingUp, HeadphonesIcon,
} from 'lucide-react';
import { useBadges } from '../context/BadgeContext.jsx';
import api from '../services/api.js';

const ROUTE_BADGE = {
  '/student/exams': 'exams',
  '/student/materials': 'materials',
  '/student/assignments': 'assignments',
  '/student/marks': 'marks',
  '/student/notifications': 'notifications',
};

const links = {
  STUDENT: [
    { to: '/student/dashboard',      label: 'Dashboard',          icon: LayoutDashboard },

    // Academics
    { to: '/student/subjects',       label: 'Subjects',           icon: BookOpen },
    { to: '/student/exams',          label: 'Exams',              icon: CalendarDays },
    { to: '/student/marks',          label: 'Marks',              icon: GraduationCap },

    // Learning
    { to: '/student/materials',      label: 'Academic Materials', icon: FileText },
    { to: '/student/assignments',    label: 'Assignments',        icon: ClipboardList },
    { to: '/student/gate-resources', label: 'GATE Resources',     icon: BookMarked },

    // Activities & GPA
    { to: '/student/activities',     label: 'Activities',         icon: Megaphone },
    { to: '/student/sgpa-cgpa',      label: 'SGPA & CGPA',        icon: TrendingUp },

    // Communication
    { to: '/student/notifications',  label: 'Notifications',      icon: Bell },
    { to: '/student/contact-admin',  label: 'Contact Admin',      icon: MessageSquare },
    { to: '/student/feedback',       label: 'Feedback',           icon: MessageSquare },

    // Personal
    { to: '/student/profile',        label: 'Profile',            icon: User },
  ],

  FACULTY: [
    { to: '/faculty/dashboard',      label: 'Dashboard',          icon: LayoutDashboard },

    // Academics
    { to: '/faculty/subjects',       label: 'My Subjects',        icon: BookOpen },
    { to: '/faculty/exams',          label: 'Exams',              icon: CalendarDays },
    { to: '/faculty/marks',          label: 'Marks',              icon: GraduationCap },

    // Resources & Activities
    { to: '/faculty/materials',      label: 'Academic Materials', icon: FileText },
    { to: '/faculty/gate-resources', label: 'GATE Resources',     icon: BookMarked },
    { to: '/faculty/activities',     label: 'Activities',         icon: Megaphone },
    { to: '/faculty/sgpa-cgpa',      label: 'SGPA & CGPA',        icon: TrendingUp },

    // Communication
    { to: '/faculty/notifications',  label: 'Notifications',      icon: Bell },
    { to: '/faculty/feedback',       label: 'Feedback',           icon: MessageSquare },
  ],

  ADMIN: [
    { to: '/admin/dashboard',        label: 'Dashboard',          icon: LayoutDashboard },

    // User management
    { to: '/admin/students',         label: 'Students',           icon: Users },
    { to: '/admin/bulk-students',    label: 'Bulk Add Students',  icon: Users },
    { to: '/admin/faculty',          label: 'Faculty',            icon: User },

    // Academics
    { to: '/admin/semesters',        label: 'Semesters',          icon: GraduationCap },
    { to: '/admin/subjects',         label: 'Subjects & Labs',    icon: BookOpen },
    { to: '/admin/exams',            label: 'Exams',              icon: CalendarDays },
    { to: '/admin/marks',            label: 'Marks',              icon: GraduationCap },

    // Materials & Activities
    { to: '/admin/materials',        label: 'Academic Materials', icon: FileText },
    { to: '/admin/materials-history',label: 'Materials History',  icon: History },
    { to: '/admin/activities',       label: 'Activities',         icon: Megaphone },
    { to: '/admin/sgpa-cgpa',        label: 'SGPA & CGPA',        icon: TrendingUp },

    // Communication
    { to: '/admin/notifications',    label: 'Notifications',      icon: Bell },
    { to: '/admin/messages',         label: 'Student Support',    icon: HeadphonesIcon, badge: 'messages' },
    { to: '/admin/feedback',         label: 'Feedback',           icon: MessageSquare, badge: 'feedback' },

    // System
    { to: '/admin/audit-logs',       label: 'Audit Logs',         icon: ScrollText },
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
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);

  // Load unread feedback count for ADMIN role
  useEffect(() => {
  if (role !== 'ADMIN') return;

  const fetchCount = () => {
    api.get('/feedback/unread-count')
      .then((r) => setFeedbackCount(r.data.data.count || 0))
      .catch(() => {});
  };
  fetchCount();

  const onChange = () => fetchCount();
  window.addEventListener('feedback-count-changed', onChange);
  const t = setInterval(fetchCount, 30000);

  return () => {
    window.removeEventListener('feedback-count-changed', onChange);
    clearInterval(t);
  };
}, [role]);

  // Load unread contact messages count for ADMIN role
  useEffect(() => {
    if (role !== 'ADMIN') return;

    const fetchMsgCount = () => {
      api.get('/contact/unread-count')
        .then((r) => setMessagesCount(r.data.data.count || 0))
        .catch(() => {});
    };
    fetchMsgCount();
    const t = setInterval(fetchMsgCount, 20000);

    // Allow Messages page to reset the badge via a custom event
    const onRead = () => fetchMsgCount();
    window.addEventListener('messages-count-changed', onRead);

    return () => {
      clearInterval(t);
      window.removeEventListener('messages-count-changed', onRead);
    };
  }, [role]);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  const items = links[role] || [];

  const navContent = (
    <>
      <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 text-brand-700 font-bold text-xl">
            <GraduationCap /> UniMate
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {`${role.toLowerCase()} portal`}
          </p>
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
        {items.map(({ to, label, icon: Icon, badge }) => {
          const badgeKey = ROUTE_BADGE[to];
          const count = badgeKey
            ? (badges?.[badgeKey] || 0)
            : badge === 'feedback'
            ? feedbackCount
            : badge === 'messages'
            ? messagesCount
            : 0;

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
      <aside className="hidden md:flex md:flex-col md:w-64 h-screen shrink-0 bg-white border-r border-slate-200">
        {navContent}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={onClose}>
          <div className="absolute inset-0 bg-black/50" />
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
