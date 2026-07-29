import { Link } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useGender } from '../../Utils/useGender';
import './HomePage.css';

/** דף בית אחרי התחברות */
export function HomePage() {
  const { user, logout } = useAuth();
  const g = useGender();

  return (
    <section className="home-simple">
      <div className="home-card">
        <div className="home-brand">
          <img src="/logo.png" alt="" />
          <span>SekerApp</span>
        </div>
        <h1>
          {g('היי', 'היי')}
          {user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="home-lead">
          {g(
            'ברוכה הבאה! מכאן אפשר ליצור סקרים חינמיים ולענות על סקרים.',
            'ברוך הבא! מכאן אפשר ליצור סקרים חינמיים ולענות על סקרים.'
          )}
        </p>

        {(user?.status === 'NEW' || user?.status === 'REJECTED') && (
          <div className="home-kyc-banner">
            <div>
              <strong>רוצים להרוויח נקודות מענייה על סקרים?</strong>
              <span>
                הצטרפות לפאנל העונים – מילוי פרופיל קצר ואישור ידני.
              </span>
            </div>
            <Link to="/join">להצטרפות לפאנל</Link>
          </div>
        )}

        {user?.status === 'PENDING_APPROVAL' && (
          <div className="home-kyc-banner pending">
            <div>
              <strong>הבקשה שלך בבדיקה</strong>
              <span>לאחר אישור ידני תישלח אליך הודעת SMS.</span>
            </div>
            <Link to="/join">לפרטים</Link>
          </div>
        )}

        <ul className="home-meta">
          <li>
            <span>טלפון</span>
            <strong>{user?.phone}</strong>
          </li>
          <li>
            <span>סטטוס</span>
            <strong>{statusLabel(user?.status, g)}</strong>
          </li>
        </ul>

        <div className="home-actions">
          {(user?.status === 'APPROVED' || user?.role === 'ADMIN') && (
            <Link to="/invitations" className="home-primary-link">
              <i className="fas fa-paper-plane" aria-hidden="true" />
              הזמנות לסקרים
            </Link>
          )}
          <Link
            to="/points"
            className={
              user?.status === 'APPROVED' || user?.role === 'ADMIN'
                ? 'home-secondary-link'
                : 'home-primary-link'
            }
          >
            <i className="fas fa-coins" aria-hidden="true" />
            הנקודות שלי
          </Link>
          <Link to="/surveys" className="home-secondary-link">
            <i className="fas fa-clipboard-list" aria-hidden="true" />
            הסקרים שלי
          </Link>
          <Link to="/surveys/create" className="home-secondary-link">
            <i className="fas fa-plus" aria-hidden="true" />
            סקר חדש
          </Link>
        </div>

        <button type="button" className="home-logout" onClick={() => logout()}>
          התנתקות
        </button>
      </div>
    </section>
  );
}

function statusLabel(
  status: string | undefined,
  g: (female: string, male: string) => string
) {
  switch (status) {
    case 'APPROVED':
      return g('עונה מאושרת', 'עונה מאושר');
    case 'PENDING_APPROVAL':
      return g('ממתינה לאישור', 'ממתין לאישור');
    case 'BLOCKED':
      return g('חסומה', 'חסום');
    case 'REJECTED':
      return g('נדחתה', 'נדחה');
    default:
      return g('משתמשת חדשה', 'משתמש חדש');
  }
}
