import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingState } from './ui.jsx';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, ready } = useAuth();
  const location = useLocation();
  if (!ready && !isAuthenticated) return <LoadingState label="Securing your session…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export function GuestRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}
