import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import { getErrorMessage } from '../../Services/api';
import {
  getPendingResponders,
  getIdDocumentPreview,
  approveResponder,
  rejectResponder,
  PendingResponder,
  IdDocumentPreview,
} from '../../Services/adminService';
import { AdminTopBar } from './AdminTopBar';
import { AdminEmptyState, AdminSkeleton } from './AdminUiShared';
import './AdminUiShared.css';
import './AdminPendingApprovalsPage.css';

export function AdminPendingApprovalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [responders, setResponders] = useState<PendingResponder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [idDocument, setIdDocument] = useState<IdDocumentPreview | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    loadPending();
  }, [user, navigate]);

  async function loadPending() {
    try {
      setLoading(true);
      const data = await getPendingResponders();
      setResponders(data);
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function viewIdDocument(userId: string) {
    try {
      const doc = await getIdDocumentPreview(userId);
      setIdDocument(doc);
      setSelectedId(userId);
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  }

  function closePreview() {
    setIdDocument(null);
    setSelectedId(null);
  }

  async function handleApprove(userId: string) {
    if (!confirm('האם לאשר עונה זה? לאחר האישור תישלח הודעת SMS.')) return;

    try {
      setActionLoading(true);
      await approveResponder(userId);
      showToast('העונה אושר בהצלחה ונשלחה אליו הודעה', 'success');
      closePreview();
      await loadPending();
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(userId: string) {
    const reason = prompt('האם לדחות עונה זה? (אופציונלי: הזן סיבה)');
    if (reason === null) return; // ביטול

    try {
      setActionLoading(true);
      await rejectResponder(userId, {
        sendSms: true,
        reason: reason.trim() || undefined,
      });
      showToast('העונה נדחה והודעה נשלחה אליו', 'success');
      closePreview();
      await loadPending();
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="admin-shell admin-pending-shell">
        <AdminTopBar
          title="אישור עונים"
          subtitle="בקשות ממתינות"
        />
        <div className="admin-page-body">
          <AdminSkeleton rows={3} />
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell admin-pending-shell">
      <AdminTopBar
        title="אישור עונים"
        subtitle={`סה״כ ממתינים: ${responders.length}`}
      />

      <div className="admin-page-body">
      {responders.length === 0 ? (
        <AdminEmptyState
          title="אין עונים ממתינים לאישור"
          description="בקשות חדשות יופיעו כאן אוטומטית."
          icon="fa-user-check"
        />
      ) : (
        <section className="admin-pending-list">
          {responders.map((responder) => (
            <article key={responder.id} className="admin-responder-card">
              <div className="admin-responder-header">
                <div>
                  <strong>{responder.name || 'ללא שם'}</strong>
                  <span className="admin-responder-phone">{responder.phone}</span>
                </div>
                <span className="admin-pending-badge">ממתין</span>
              </div>

              <div className="admin-responder-details">
                <div className="admin-detail-row">
                  <span className="admin-detail-label">תאריך לידה</span>
                  <span>{responder.demographics.dateOfBirth || 'לא מצוין'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">עיר</span>
                  <span>{responder.demographics.city || 'לא מצוין'}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">מצב תעסוקתי</span>
                  <span>{employmentLabel(responder.demographics.employmentStatus)}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">השכלה</span>
                  <span>{educationLabel(responder.demographics.education)}</span>
                </div>
                <div className="admin-detail-row">
                  <span className="admin-detail-label">תאריך הגשה</span>
                  <span>
                    {responder.submittedAt
                      ? new Date(responder.submittedAt).toLocaleDateString('he-IL')
                      : 'לא ידוע'}
                  </span>
                </div>
              </div>

              <div className="admin-responder-actions">
                {responder.hasIdDocument && (
                  <button
                    onClick={() => viewIdDocument(responder.id)}
                    className="admin-btn-view"
                  >
                    צפייה בת.ז.
                  </button>
                )}
                <button
                  onClick={() => handleApprove(responder.id)}
                  className="admin-btn-approve"
                  disabled={actionLoading}
                >
                  אישור
                </button>
                <button
                  onClick={() => handleReject(responder.id)}
                  className="admin-btn-reject"
                  disabled={actionLoading}
                >
                  דחייה
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      </div>

      {idDocument && (
        <div className="admin-modal-overlay" onClick={closePreview}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={closePreview} className="admin-modal-close">
              ✕
            </button>
            <h2>תעודת זהות - {idDocument.userName || 'ללא שם'}</h2>
            <p className="admin-modal-note">
              אנא וודא שהפרטים תואמים לפני אישור. התמונה נמחקת לאחר החלטה.
            </p>
            <div className="admin-id-preview">
              <img src={idDocument.dataUrl} alt="תעודת זהות" />
            </div>
            <div className="admin-modal-actions">
              <button
                onClick={() => selectedId && handleApprove(selectedId)}
                className="admin-btn-approve"
                disabled={actionLoading}
              >
                {actionLoading ? 'מאשר...' : 'אישור עונה'}
              </button>
              <button
                onClick={() => selectedId && handleReject(selectedId)}
                className="admin-btn-reject"
                disabled={actionLoading}
              >
                {actionLoading ? 'דוחה...' : 'דחייה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function employmentLabel(status: string | null): string {
  const labels: Record<string, string> = {
    employee: 'שכיר/ה',
    self_employed: 'עצמאי/ת',
    student: 'סטודנט/ית',
    not_working: 'לא עובד/ת',
    retired: 'גמלאי/ת',
    other: 'אחר',
  };
  return labels[status || ''] || 'לא מצוין';
}

function educationLabel(education: string | null): string {
  const labels: Record<string, string> = {
    high_school: 'תיכונית',
    professional: 'מקצועית',
    academic: 'אקדמית',
    student: 'בלימודים',
    other: 'אחר',
  };
  return labels[education || ''] || 'לא מצוין';
}
