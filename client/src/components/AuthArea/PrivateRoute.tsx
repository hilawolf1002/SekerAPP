import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

type Props = {
  children: React.ReactNode;
};

/** מגן על מסכים שדורשים התחברות */
export function PrivateRoute({ children }: Props) {
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

  // אדמין סינתטי – מפנים לדשבורד אדמין ממסכי משתמש (לא מסקרי ניהול)
  if (user.role === 'ADMIN' && user.id === 'admin') {
    const path = location.pathname;
    const isSurveyManage =
      path === '/surveys' ||
      path.startsWith('/surveys/create') ||
      path.includes('/stats');
    if (!isSurveyManage && (path === '/home' || path === '/points' || path === '/join')) {
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{children}</>;
}
