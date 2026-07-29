import { Navigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * מגן על נתיבים שדורשים הרשאת אדמין
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        color: '#64748b'
      }}>
        טוען...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
