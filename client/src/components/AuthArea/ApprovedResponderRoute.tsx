import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

type Props = {
  children: React.ReactNode;
};

/**
 * מגן על מסכי פאנל העונים (נקודות, הזמנות) – דורש סטטוס APPROVED.
 */
export function ApprovedResponderRoute({ children }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        טוען...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role === 'ADMIN' && user.id === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (user.status === 'BLOCKED') {
    return <Navigate to="/login" replace />;
  }

  if (user.status === 'APPROVED' || user.role === 'ADMIN') {
    return <>{children}</>;
  }

  if (user.status === 'NEW' || user.status === 'REJECTED') {
    return <Navigate to="/join" replace />;
  }

  return <Navigate to="/home" replace />;
}
