import { Link } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useGender } from '../../Utils/useGender';
import { UserBottomNav } from '../LayoutArea/UserBottomNav';
import { UserLogoutButton } from '../LayoutArea/UserLogoutButton';
import './HomePage.css';

/** דף בית אחרי התחברות */
export function HomePage() {
  const { user } = useAuth();
  const g = useGender();
  const status = user?.status;
  const isAdmin = user?.role === 'ADMIN';
  const isApproved = status === 'APPROVED' || isAdmin;
  const needsJoin = status === 'NEW' || status === 'REJECTED';
  const isPending = status === 'PENDING_APPROVAL';

  return (
    <section className="home-simple has-user-bottom-nav">
      <div className="home-card">
        <div className="home-card-accent" aria-hidden="true" />
        <div className="home-card-body">
          <div className="home-card-top">
            <div className="home-brand">
              <img src="/logo.png" alt="" />
              <span>SekerApp</span>
            </div>
            <UserLogoutButton />
          </div>
          <h1>
            {g('היי', 'היי')}
            {user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="home-lead">
            {isApproved
              ? g(
                  'יש הזמנות לסקרים? עני וצברי נקודות.',
                  'יש הזמנות לסקרים? ענה וצבור נקודות.'
                )
              : isPending
                ? g(
                    'הבקשה בבדיקה — ברגע שיאשרו נשלח SMS.',
                    'הבקשה בבדיקה — ברגע שיאשרו נשלח SMS.'
                  )
                : g(
                    'הצטרפי לפאנל העונים כדי להרוויח על תשובות.',
                    'הצטרף לפאנל העונים כדי להרוויח על תשובות.'
                  )}
          </p>

          <div className="home-actions">
            {needsJoin && (
              <Link to="/join" className="home-primary-link">
                <i className="fas fa-user-plus" aria-hidden="true" />
                {g('להצטרפות לפאנל', 'להצטרפות לפאנל')}
              </Link>
            )}

            {isPending && (
              <Link to="/join" className="home-primary-link home-primary-muted">
                <i className="fas fa-hourglass-half" aria-hidden="true" />
                לפרטי הבקשה
              </Link>
            )}

            {isApproved && (
              <Link to="/invitations" className="home-primary-link">
                <i className="fas fa-paper-plane" aria-hidden="true" />
                {g('לענות על סקרים', 'לענות על סקרים')}
              </Link>
            )}

            {isApproved && (
              <Link to="/points" className="home-secondary-link">
                <i className="fas fa-coins" aria-hidden="true" />
                הנקודות שלי
              </Link>
            )}

            {isAdmin && (
              <>
                <p className="home-actions-label home-actions-label-secondary">
                  ניהול
                </p>
                <div className="home-secondary-row">
                  <Link to="/admin" className="home-compact-link">
                    <i className="fas fa-tachometer-alt" aria-hidden="true" />
                    דשבורד
                  </Link>
                  <Link to="/surveys/create" className="home-compact-link">
                    <i className="fas fa-plus" aria-hidden="true" />
                    סקר חדש
                  </Link>
                </div>
              </>
            )}

            {!isAdmin && (
              <p className="home-hint-muted">
                ניווט מהיר גם בתפריט התחתון
              </p>
            )}
          </div>
        </div>
      </div>
      <UserBottomNav />
    </section>
  );
}
