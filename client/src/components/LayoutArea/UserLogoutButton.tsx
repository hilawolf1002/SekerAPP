import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import './UserLogoutButton.css';

type Props = {
  className?: string;
  showLabel?: boolean;
};

/** יציאה זמינה מכל מסך משתמש – אייקון עדין בכותרת */
export function UserLogoutButton({ className = '', showLabel = false }: Props) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <button
      type="button"
      className={`user-logout-btn ${className}`.trim()}
      onClick={() => void handleLogout()}
      aria-label="יציאה מהמערכת"
      title="יציאה"
    >
      <i className="fas fa-sign-out-alt" aria-hidden="true" />
      {showLabel && <span>יציאה</span>}
    </button>
  );
}
