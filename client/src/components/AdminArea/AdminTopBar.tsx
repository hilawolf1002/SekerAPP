import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import './AdminTopBar.css';

type AdminTopBarProps = {
  title: string;
  subtitle?: string;
  /** אם true – מציג כפתור חזרה לדשבורד (מסכים פנימיים) */
  showBack?: boolean;
};

/** כותרת עליונה אחידה לכל מסכי האדמין */
export function AdminTopBar({
  title,
  subtitle,
  showBack = true,
}: AdminTopBarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-inner">
        <div className="admin-topbar-start">
          {showBack ? (
            <Link
              to="/admin"
              className="admin-topbar-back"
              aria-label="חזרה לדשבורד"
            >
              <i className="fas fa-arrow-right" aria-hidden="true" />
              <span>דשבורד</span>
            </Link>
          ) : (
            <div className="admin-topbar-brand">
              <img src="/logo.png" alt="" />
              <div>
                <strong>SekerApp</strong>
                <span>מערכת ניהול</span>
              </div>
            </div>
          )}
        </div>

        <div className="admin-topbar-center">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        <div className="admin-topbar-end">
          <button
            type="button"
            className="admin-topbar-logout"
            onClick={handleLogout}
          >
            התנתקות
          </button>
        </div>
      </div>
    </header>
  );
}
