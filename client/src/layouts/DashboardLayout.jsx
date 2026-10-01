import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Bell, LogOut } from 'lucide-react';
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

  function handleLogout() {
    logout();
    navigate('/');
  }

  const notifBase =
    role === 'STUDENT'
      ? '/student/notifications'
      : role === 'FACULTY'
      ? '/faculty/notifications'
      : '/admin/notifications';

  const activeSem = SEMESTER_KEYS.find((s) => s.year === year && s.semester === semester);

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar role={role} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm text-slate-500 truncate">
              Welcome, <span className="font-medium text-slate-800">{user?.email}</span>
            </span>
            {activeSem && (role === 'ADMIN' || role === 'FACULTY') && (
              <Badge variant="brand">{activeSem.label} · {activeSem.fullLabel}</Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={notifBase}
              className="relative p-2 rounded-lg hover:bg-slate-100"
              title="Notifications"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}