import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import './UserBottomNav.css';

/** סרגל ניווט תחתון – מסכים ראשיים למשתמש מאושר */
export function UserBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isPanelMember =
    user.status === 'APPROVED' || user.role === 'ADMIN';
  const needsJoin =
    user.status === 'NEW' || user.status === 'REJECTED';

  const items = [
    { to: '/home', label: 'בית', icon: 'fa-home', show: true },
    {
      to: '/invitations',
      label: 'הזמנות',
      icon: 'fa-paper-plane',
      show: isPanelMember,
    },
    {
      to: '/points',
      label: 'נקודות',
      icon: 'fa-coins',
      show: isPanelMember,
    },
    {
      to: '/join',
      label: 'הצטרפות',
      icon: 'fa-user-plus',
      show: needsJoin,
    },
  ].filter((item) => item.show);

  const onMainScreen = items.some((item) => item.to === location.pathname);
  if (!onMainScreen) return null;

  return (
    <nav className="user-bottom-nav" aria-label="ניווט ראשי">
      {items.map((item) => {
        const active = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={active ? 'active' : ''}
            aria-current={active ? 'page' : undefined}
          >
            <i className={`fas ${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
