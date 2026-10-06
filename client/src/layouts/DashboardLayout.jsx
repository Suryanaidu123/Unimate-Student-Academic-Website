import { useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Bell, LogOut, Menu, User } from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { useSemester, SEMESTER_KEYS } from '../context/SemesterContext.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const { unread } = useNotifications();
  const { year, semester } = useSemester();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  const notifBase =
    role === 'STUDENT'  ? '/student/notifications'  :
    role === 'FACULTY'  ? '/faculty/notifications'  :
                          '/admin/notifications';

  const activeSem = SEMESTER_KEYS.find((s) => s.year === year && s.semester === semester);

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      <Sidebar role={role} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 sm:h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 gap-2">

          {/* Left — hamburger + welcome */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 shrink-0"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <span className="text-xs sm:text-sm text-slate-500 truncate">
              <span className="hidden sm:inline">Welcome, </span>
              <span className="font-medium text-slate-800">
                {user?.profile?.name || user?.email}
              </span>
            </span>

            {activeSem && (role === 'ADMIN' || role === 'FACULTY') && (
              <Badge variant="brand" className="hidden md:inline-flex">
                {activeSem.label}
              </Badge>
            )}
          </div>

          {/* Right — notification bell + profile (student) + logout */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">

            {/* Bell */}
            <Link
              to={notifBase}
              className="relative p-2.5 rounded-lg hover:bg-slate-100"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-semibold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>

            {/* Profile icon — students only */}
            {role === 'STUDENT' && (
              <Link
                to="/student/profile"
                className="p-2.5 rounded-lg hover:bg-slate-100 transition text-slate-600 hover:text-brand-700"
                title="My Profile"
                aria-label="My Profile"
              >
                <User size={18} />
              </Link>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm px-2.5 sm:px-3 py-2 rounded-lg hover:bg-slate-100 min-h-[40px] touch-manipulation"
              aria-label="Logout"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
