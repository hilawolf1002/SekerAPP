import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import { getErrorMessage } from '../../Services/api';
import { getAdminStats, AdminStats } from '../../Services/adminService';
import './AdminDashboardPage.css';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    
    loadStats();
  }, [user, navigate]);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await getAdminStats();
      setStats(data);
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  if (loading) {
    return (
      <main className="admin-dashboard-shell">
        <div className="admin-loading">טוען נתונים...</div>
      </main>
    );
  }

  return (
    <main className="admin-dashboard-shell">
      <header className="admin-dashboard-header">
        <div className="admin-brand">
          <img src="/logo.png" alt="" />
          <div>
            <strong>SekerApp</strong>
            <span>מערכת ניהול</span>
          </div>
        </div>
        <button onClick={handleLogout} className="admin-logout-btn">
          התנתקות
        </button>
      </header>

      <section className="admin-dashboard-content">
        <h1>שלום, מנהל המערכת</h1>
        <p className="admin-dashboard-subtitle">
          מכאן תוכל לנהל את כל המשתמשים, לאשר עונים ולצפות בפעילות המערכת.
        </p>

        {stats && (
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-icon">👥</span>
              <div className="admin-stat-info">
                <strong>{stats.users.total}</strong>
                <span>סה"כ משתמשים</span>
              </div>
            </div>

            <div className="admin-stat-card highlight">
              <span className="admin-stat-icon">⏳</span>
              <div className="admin-stat-info">
                <strong>{stats.users.pendingApprovals}</strong>
                <span>ממתינים לאישור</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <span className="admin-stat-icon">✓</span>
              <div className="admin-stat-info">
                <strong>{stats.users.approvedResponders}</strong>
                <span>עונים מאושרים</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <span className="admin-stat-icon">📋</span>
              <div className="admin-stat-info">
                <strong>{stats.surveys.total}</strong>
                <span>סה"כ סקרים</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <span className="admin-stat-icon">📝</span>
              <div className="admin-stat-info">
                <strong>{stats.surveys.totalResponses}</strong>
                <span>תשובות שהתקבלו</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <span className="admin-stat-icon">⭐</span>
              <div className="admin-stat-info">
                <strong>{stats.points.totalAwarded}</strong>
                <span>נקודות שחולקו</span>
              </div>
            </div>
          </div>
        )}

        <div className="admin-actions">
          <h2>פעולות ראשיות</h2>
          <div className="admin-action-grid">
            <Link to="/admin/pending" className="admin-action-card primary">
              <span className="admin-action-icon">⏳</span>
              <div>
                <strong>עונים הממתינים לאישור</strong>
                <span>צפייה בבקשות חדשות, אישור או דחייה</span>
              </div>
              {stats && stats.users.pendingApprovals > 0 && (
                <span className="admin-badge">{stats.users.pendingApprovals}</span>
              )}
            </Link>

            <Link to="/admin/users" className="admin-action-card">
              <span className="admin-action-icon">👥</span>
              <div>
                <strong>כל המשתמשים</strong>
                <span>צפייה, חיפוש וניהול משתמשים במערכת</span>
              </div>
            </Link>

            <Link to="/admin/tags" className="admin-action-card">
              <span className="admin-action-icon">🏷️</span>
              <div>
                <strong>תגיות קהל</strong>
                <span>יצירת קהלים להפצת סקרים ב-SMS</span>
              </div>
            </Link>

            <Link to="/admin/redemptions" className="admin-action-card">
              <span className="admin-action-icon">🎁</span>
              <div>
                <strong>פדיון נקודות</strong>
                <span>מי זכאי, היסטוריית פדיונות וקופונים שנמסרו</span>
              </div>
            </Link>

            <Link to="/admin/gifts" className="admin-action-card">
              <span className="admin-action-icon">🏪</span>
              <div>
                <strong>מתנות וקופונים</strong>
                <span>הוספת חנויות ומלאי קודי קופון לפדיון</span>
              </div>
            </Link>

            <Link to="/admin/settings" className="admin-action-card">
              <span className="admin-action-icon">⚙️</span>
              <div>
                <strong>הגדרות מערכת</strong>
                <span>יעד פדיון, בונוסים והגדרות ברירת מחדל</span>
              </div>
            </Link>

            <Link to="/surveys" className="admin-action-card">
              <span className="admin-action-icon">📊</span>
              <div>
                <strong>ניהול סקרים</strong>
                <span>רשימה, סטטיסטיקות, פרסום וסגירה של סקרים</span>
              </div>
            </Link>

            <Link to="/surveys/create" className="admin-action-card">
              <span className="admin-action-icon">📋</span>
              <div>
                <strong>יצירת סקר מתוגמל</strong>
                <span>רק מנהל יכול ליצור סקר עם נקודות</span>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
