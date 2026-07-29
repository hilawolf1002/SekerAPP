import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { AdminTopBar } from './AdminTopBar';
import { AdminEmptyState, AdminSkeleton } from './AdminUiShared';
import './AdminUiShared.css';
import './AdminRedemptionsPage.css';

const PAGE_SIZE = 20;

function formatStatus(status: string): string {
  switch (status) {
    case 'FULFILLED':
      return 'טופל — קופון נשלח';
    case 'REJECTED':
      return 'נדחה';
    case 'PENDING':
      return 'ממתין לטיפול';
    default:
      return status;
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminRedemptionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [redemptions, setRedemptions] = useState<AdminRedemptionRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    id: string;
    imageData: string;
  } | null>(null);
  const listRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    if (!expandedId) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target || !listRef.current) return;
      const card = listRef.current.querySelector(
        `[data-redemption-id="${expandedId}"]`
      );
      if (card && !card.contains(target)) {
        setExpandedId(null);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [expandedId]);

  const pending = useMemo(
    () => redemptions.filter((r) => r.status === 'PENDING'),
    [redemptions]
  );
  const history = useMemo(
    () => redemptions.filter((r) => r.status !== 'PENDING'),
    [redemptions]
  );

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

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
      showToast('הפנייה סומנה כמטופלת והנקודות נוכו', 'success');
      setPreview(null);
      setExpandedId(null);
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
      setExpandedId(null);
      await load();
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setActingId(null);
    }
  }

  function renderDetails(item: AdminRedemptionRequest, isPending: boolean) {
    return (
      <div className="admin-redemption-details">
        <dl className="admin-redemption-meta">
          <div>
            <dt>טלפון</dt>
            <dd>{item.user.phone}</dd>
          </div>
          <div>
            <dt>מייל לשליחת קופון</dt>
            <dd>
              {item.email ? (
                <a href={`mailto:${item.email}`}>{item.email}</a>
              ) : (
                'לא צוין'
              )}
            </dd>
          </div>
          <div>
            <dt>נקודות</dt>
            <dd>{item.pointsSpent}</dd>
          </div>
          <div>
            <dt>הוגש</dt>
            <dd>{formatDateTime(item.createdAt)}</dd>
          </div>
          {!isPending && item.updatedAt && (
            <div>
              <dt>{item.status === 'REJECTED' ? 'נדחה ב־' : 'טופל ב־'}</dt>
              <dd>{formatDateTime(item.updatedAt)}</dd>
            </div>
          )}
        </dl>
        {item.adminNote && (
          <p className="admin-redemption-note">הערת מנהל: {item.adminNote}</p>
        )}
        {isPending && (
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
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="admin-shell admin-redemptions-shell">
        <AdminTopBar title="פדיון נקודות" />
        <div className="admin-page-body">
          <AdminSkeleton rows={3} />
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell admin-redemptions-shell">
      <AdminTopBar
        title="פדיון נקודות"
        subtitle={`ממתינות: ${pending.length} · בהיסטוריה: ${history.length}`}
      />

      <section
        className="admin-page-body admin-redemptions-list"
        ref={listRef}
      >
        <div className="admin-redemptions-note">
          <strong>איך זה עובד?</strong>
          <span>
            לחצי על שם העונה לפתיחת הפרטים. שלחי קופון למייל, ואז סמני
            &quot;מטופל&quot;. לחיצה מחוץ לכרטיס סוגרת את הפרטים.
          </span>
        </div>

        <h2>ממתינות לטיפול</h2>
        {pending.length === 0 ? (
          <AdminEmptyState
            title="אין בקשות פתוחות"
            description="כשמישהו יגיש פדיון — זה יופיע כאן."
            icon="fa-gift"
          />
        ) : (
          pending.map((item) => {
            const open = expandedId === item.id;
            return (
              <article
                key={item.id}
                data-redemption-id={item.id}
                className={`admin-redemption-card${open ? ' expanded' : ''}`}
              >
                <button
                  type="button"
                  className="admin-redemption-summary"
                  onClick={() => toggleExpand(item.id)}
                  aria-expanded={open}
                >
                  <div className="admin-redemption-summary-text">
                    <strong className="admin-redemption-name-link">
                      {item.user.name || 'ללא שם'}
                    </strong>
                    <span>{item.pointsSpent} נק׳ · לחצי לפרטים</span>
                  </div>
                  <i
                    className={`fas fa-chevron-${open ? 'up' : 'down'}`}
                    aria-hidden="true"
                  />
                </button>
                {open && renderDetails(item, true)}
              </article>
            );
          })
        )}

        <h2>היסטוריה</h2>
        {history.length === 0 ? (
          <AdminEmptyState
            title="עדיין אין היסטוריית פדיונות"
            icon="fa-history"
          />
        ) : (
          history.map((item) => {
            const open = expandedId === item.id;
            return (
              <article
                key={item.id}
                data-redemption-id={item.id}
                className={`admin-redemption-card admin-redemption-history status-${item.status.toLowerCase()}${open ? ' expanded' : ''}`}
              >
                <button
                  type="button"
                  className="admin-redemption-summary"
                  onClick={() => toggleExpand(item.id)}
                  aria-expanded={open}
                >
                  <div className="admin-redemption-summary-text">
                    <strong className="admin-redemption-name-link">
                      {item.user.name || 'ללא שם'}
                    </strong>
                    <span>
                      {item.pointsSpent} נק׳ · {formatStatus(item.status)}
                    </span>
                  </div>
                  <span
                    className={`admin-redemption-status-badge status-${item.status.toLowerCase()}`}
                  >
                    {formatStatus(item.status)}
                  </span>
                </button>
                {open && renderDetails(item, false)}
              </article>
            );
          })
        )}

        <PaginationBar
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          disabled={loading}
          onPageChange={(p) => {
            setLoading(true);
            setExpandedId(null);
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
