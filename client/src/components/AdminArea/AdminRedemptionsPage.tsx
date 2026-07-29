import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import { getErrorMessage } from '../../Services/api';
import {
  getAdminRedemptions,
  getRedemptionIdDocument,
  fulfillRedemption,
  rejectRedemption,
  type AdminRedemptionRequest,
} from '../../Services/adminService';
import { PaginationBar } from '../LayoutArea/PaginationBar';
import './AdminRedemptionsPage.css';

const PAGE_SIZE = 20;

export function AdminRedemptionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [redemptions, setRedemptions] = useState<AdminRedemptionRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    id: string;
    imageData: string;
  } | null>(null);

  async function load(nextPage = page) {
    const data = await getAdminRedemptions(nextPage, PAGE_SIZE);
    setRedemptions(data.redemptions);
    setTotal(data.total);
    setPage(nextPage);
  }

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    (async () => {
      try {
        await load(1);
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, showToast]);

  const pending = useMemo(
    () => redemptions.filter((r) => r.status === 'PENDING'),
    [redemptions]
  );
  const history = useMemo(
    () => redemptions.filter((r) => r.status !== 'PENDING'),
    [redemptions]
  );

  async function openDocument(id: string) {
    try {
      const document = await getRedemptionIdDocument(id);
      if (!document.hasDocument || !document.imageData) {
        showToast('אין צילום תעודה לבקשה זו');
        return;
      }
      setPreview({ id, imageData: document.imageData });
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  }

  async function handleFulfill(id: string) {
    if (
      !confirm(
        'לאשר שהקופון נשלח ידנית למייל המשתמש? הצילום יימחק מהארכיון.'
      )
    ) {
      return;
    }
    setActingId(id);
    try {
      await fulfillRedemption(id);
      showToast('הפנייה סומנה כמטופלת', 'success');
      setPreview(null);
      await load();
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id: string) {
    const note = prompt('סיבת דחייה (אופציונלי):') ?? undefined;
    setActingId(id);
    try {
      await rejectRedemption(id, note || undefined);
      showToast('הבקשה נדחתה', 'success');
      setPreview(null);
      await load();
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <main className="admin-redemptions-shell">
        <div className="admin-redemptions-loading">טוען נתוני פדיון...</div>
      </main>
    );
  }

  return (
    <main className="admin-redemptions-shell">
      <header className="admin-redemptions-header">
        <Link to="/admin" className="admin-back-link">
          ← חזרה לדשבורד
        </Link>
        <h1>פדיון נקודות</h1>
        <p>
          ממתינות לטיפול: {pending.length} · טופלו: {history.length}
        </p>
      </header>

      <section className="admin-redemptions-list">
        <div className="admin-redemptions-note">
          <strong>איך זה עובד?</strong>
          <span>
            העונה מגיש פנייה עם מייל + צילום ת.ז. אתה מקבל התראה במייל,
            שולח קופון ידנית לכתובת שסיפק, ואז מסמן כאן &quot;מטופל&quot;.
            הצילום נמחק אוטומטית אחרי הטיפול.
          </span>
        </div>

        <h2>ממתינות לטיפול</h2>
        {pending.length === 0 ? (
          <div className="admin-empty-state compact">
            <strong>אין בקשות פתוחות</strong>
          </div>
        ) : (
          pending.map((item) => (
            <article key={item.id} className="admin-redemption-card">
              <div className="admin-redemption-header">
                <div>
                  <strong>{item.user.name || 'ללא שם'}</strong>
                  <span className="admin-redemption-phone">{item.user.phone}</span>
                </div>
                <div className="admin-redemption-points">
                  <span className="admin-points-number">{item.pointsSpent}</span>
                  <span className="admin-points-label">נקודות</span>
                </div>
              </div>
              <p>
                מייל לשליחת קופון:{' '}
                <a href={`mailto:${item.email || ''}`}>{item.email || '—'}</a>
              </p>
              <p>
                הוגש: {new Date(item.createdAt).toLocaleString('he-IL')}
              </p>
              <div className="admin-redemption-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => openDocument(item.id)}
                  disabled={!item.idDocumentKey}
                >
                  צפייה בת.ז.
                </button>
                <button
                  type="button"
                  className="admin-btn-approve"
                  disabled={actingId === item.id}
                  onClick={() => handleFulfill(item.id)}
                >
                  {actingId === item.id ? '...' : 'מטופל (נשלח קופון)'}
                </button>
                <button
                  type="button"
                  className="admin-btn-reject"
                  disabled={actingId === item.id}
                  onClick={() => handleReject(item.id)}
                >
                  דחייה
                </button>
              </div>
            </article>
          ))
        )}

        <h2>היסטוריה</h2>
        {history.length === 0 ? (
          <div className="admin-empty-state compact">
            <strong>עדיין אין היסטוריית פדיונות</strong>
          </div>
        ) : (
          history.map((item) => (
            <article key={item.id} className="admin-redemption-card">
              <strong>
                {item.user.name || item.user.phone} · {item.pointsSpent} נק׳
              </strong>
              <span>מייל: {item.email || '—'}</span>
              <span>
                {new Date(item.createdAt).toLocaleString('he-IL')} · {item.status}
              </span>
              {item.adminNote && <span>הערה: {item.adminNote}</span>}
            </article>
          ))
        )}

        <PaginationBar
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          disabled={loading}
          onPageChange={(p) => {
            setLoading(true);
            load(p)
              .catch((error) => showToast(getErrorMessage(error)))
              .finally(() => setLoading(false));
          }}
        />
      </section>

      {preview && (
        <div
          className="admin-id-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
        >
          <div
            className="admin-id-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <strong>צילום תעודת זהות</strong>
              <button type="button" onClick={() => setPreview(null)}>
                סגור
              </button>
            </header>
            <img src={preview.imageData} alt="תעודת זהות" />
            <div className="admin-redemption-actions">
              <button
                type="button"
                className="admin-btn-approve"
                onClick={() => handleFulfill(preview.id)}
              >
                מטופל (נשלח קופון)
              </button>
              <button
                type="button"
                className="admin-btn-reject"
                onClick={() => handleReject(preview.id)}
              >
                דחייה
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
