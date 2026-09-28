import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-8 text-center">Loading…</div>;
  if (!user) return <Navigate to="/" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}