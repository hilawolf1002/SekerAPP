import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import { getErrorMessage } from '../../Services/api';
import {
  getAdminStats,
  getAdminRedemptions,
  AdminStats,
} from '../../Services/adminService';
import { AdminTopBar } from './AdminTopBar';
import { AdminSkeleton } from './AdminUiShared';
import './AdminUiShared.css';
import './AdminDashboardPage.css';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingRedemptions, setPendingRedemptions] = useState(0);
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
      const [data, redemptions] = await Promise.all([
        getAdminStats(),
        getAdminRedemptions(1, 50).catch(() => ({
          redemptions: [] as { status: string }[],
          total: 0,
        })),
      ]);
      setStats(data);
      setPendingRedemptions(
        redemptions.redemptions.filter((r) => r.status === 'PENDING').length
      );
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="admin-shell admin-dashboard-shell">
        <AdminTopBar title="דשבורד" showBack={false} />
        <div className="admin-page-body">
          <AdminSkeleton rows={4} />
        </div>
      </main>
    );
  }

  const pendingUsers = stats?.users.pendingApprovals ?? 0;
  const hasTasks = pendingUsers > 0 || pendingRedemptions > 0;

  return (
    <main className="admin-shell admin-dashboard-shell">
      <AdminTopBar title="דשבורד" subtitle="ניהול המערכת" showBack={false} />

      <section className="admin-page-body admin-dashboard-content">
        <div className="admin-dashboard-intro">
          <h2>שלום</h2>
          <p>סקירה קצרה של המערכת, ומשם לכל מה שצריך.</p>
        </div>

        <section className="admin-tasks" aria-label="משימות לטיפול">
          <h3 className="admin-section-title">דורש טיפול</h3>
          {!hasTasks ? (
            <div className="admin-tasks-clear">
              <i className="fas fa-check-circle" aria-hidden="true" />
              <span>אין משימות ממתינות — הכל מעודכן</span>
            </div>
          ) : (
            <div className="admin-tasks-grid">
              {pendingUsers > 0 && (
                <Link to="/admin/pending" className="admin-task-card urgent">
                  <span className="admin-task-icon" aria-hidden="true">
                    <i className="fas fa-user-clock" />
                  </span>
                  <div>
                    <strong>עונים לאישור</strong>
                    <span>{pendingUsers} ממתינים</span>
                  </div>
                  <span className="admin-task-count">{pendingUsers}</span>
                </Link>
              )}
              {pendingRedemptions > 0 && (
                <Link to="/admin/redemptions" className="admin-task-card urgent">
                  <span className="admin-task-icon" aria-hidden="true">
                    <i className="fas fa-gift" />
                  </span>
                  <div>
                    <strong>פדיון נקודות</strong>
                    <span>{pendingRedemptions} בקשות פתוחות</span>
                  </div>
                  <span className="admin-task-count">{pendingRedemptions}</span>
                </Link>
              )}
            </div>
          )}
        </section>

        {stats && (
          <section aria-label="סטטיסטיקות">
            <h3 className="admin-section-title">סקירה מהירה</h3>
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <span className="admin-stat-icon" aria-hidden="true">
                  <i className="fas fa-users" />
                </span>
                <div className="admin-stat-info">
                  <strong>{stats.users.total}</strong>
                  <span>משתמשים</span>
                </div>
              </div>
              <div className="admin-stat-card highlight">
                <span className="admin-stat-icon" aria-hidden="true">
                  <i className="fas fa-hourglass-half" />
                </span>
                <div className="admin-stat-info">
                  <strong>{stats.users.pendingApprovals}</strong>
                  <span>ממתינים</span>
                </div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-icon accent" aria-hidden="true">
                  <i className="fas fa-user-check" />
                </span>
                <div className="admin-stat-info">
                  <strong>{stats.users.approvedResponders}</strong>
                  <span>מאושרים</span>
                </div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-icon" aria-hidden="true">
                  <i className="fas fa-clipboard-list" />
                </span>
                <div className="admin-stat-info">
                  <strong>{stats.surveys.total}</strong>
                  <span>סקרים</span>
                </div>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-icon" aria-hidden="true">
                  <i className="fas fa-reply-all" />
                </span>
                <div className="admin-stat-info">
                  <strong>{stats.surveys.totalResponses}</strong>
                  <span>תשובות</span>
                </div>
              </div>
              <div className="admin-stat-card points">
                <span className="admin-stat-icon" aria-hidden="true">
                  <i className="fas fa-coins" />
                </span>
                <div className="admin-stat-info">
                  <strong>{stats.points.totalAwarded}</strong>
                  <span>נקודות</span>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="admin-actions">
          <h3 className="admin-section-title">פעולות</h3>
          <div className="admin-action-grid">
            <Link to="/admin/pending" className="admin-action-card primary">
              <span className="admin-action-icon" aria-hidden="true">
                <i className="fas fa-user-clock" />
              </span>
              <div>
                <strong>אישור עונים</strong>
                <span>בקשות הצטרפות</span>
              </div>
              {pendingUsers > 0 && (
                <span className="admin-badge">{pendingUsers}</span>
              )}
            </Link>

            <Link to="/admin/users" className="admin-action-card">
              <span className="admin-action-icon" aria-hidden="true">
                <i className="fas fa-users" />
              </span>
              <div>
                <strong>משתמשים</strong>
                <span>חיפוש ותגיות</span>
              </div>
            </Link>

            <Link to="/admin/tags" className="admin-action-card">
              <span className="admin-action-icon" aria-hidden="true">
                <i className="fas fa-tags" />
              </span>
              <div>
                <strong>תגיות</strong>
                <span>קהלים להפצה</span>
              </div>
            </Link>

            <Link to="/admin/redemptions" className="admin-action-card">
              <span className="admin-action-icon" aria-hidden="true">
                <i className="fas fa-gift" />
              </span>
              <div>
                <strong>פדיון</strong>
                <span>בקשות וקופונים</span>
              </div>
              {pendingRedemptions > 0 && (
                <span className="admin-badge">{pendingRedemptions}</span>
              )}
            </Link>

            {/* מתנות וקופונים — מושבת זמנית; פדיון ידני דרך מייל
            <Link to="/admin/gifts" className="admin-action-card">
              <span className="admin-action-icon" aria-hidden="true">
                <i className="fas fa-store" />
              </span>
              <div>
                <strong>מתנות</strong>
                <span>חנויות ומלאי</span>
              </div>
            </Link>
            */}

            <Link to="/admin/settings" className="admin-action-card">
              <span className="admin-action-icon" aria-hidden="true">
                <i className="fas fa-sliders-h" />
              </span>
              <div>
                <strong>הגדרות</strong>
                <span>יעד ובונוסים</span>
              </div>
            </Link>

            <Link to="/surveys" className="admin-action-card">
              <span className="admin-action-icon" aria-hidden="true">
                <i className="fas fa-chart-bar" />
              </span>
              <div>
                <strong>סקרים</strong>
                <span>רשימה וסטטיסטיקות</span>
              </div>
            </Link>

            <Link to="/surveys/create" className="admin-action-card">
              <span className="admin-action-icon" aria-hidden="true">
                <i className="fas fa-plus" />
              </span>
              <div>
                <strong>סקר מתוגמל</strong>
                <span>יצירה והפצה</span>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
