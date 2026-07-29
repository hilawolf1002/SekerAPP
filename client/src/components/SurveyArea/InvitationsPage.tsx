import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as surveyService from '../../Services/surveyService';
import type { SurveyInvitationItem } from '../../Services/surveyService';
import { useToast } from '../../Context/ToastContext';
import { useAuth } from '../../Context/AuthContext';
import { useGender } from '../../Utils/useGender';
import { PaginationBar } from '../LayoutArea/PaginationBar';
import { UserBottomNav } from '../LayoutArea/UserBottomNav';
import { UserLogoutButton } from '../LayoutArea/UserLogoutButton';
import './survey-shared.css';
import './InvitationsPage.css';

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** מסך הזמנות פעילות לעונה מאושר – מותאם מובייל */
export function InvitationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const g = useGender();
  const [invitations, setInvitations] = useState<SurveyInvitationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (nextPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await surveyService.getMyInvitations(nextPage, PAGE_SIZE);
      setInvitations(data.items);
      setTotal(data.total);
      setPage(nextPage);
    } catch (err) {
      const msg = surveyService.getErrorMessage(err);
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.status !== 'APPROVED' && user.role !== 'ADMIN') {
      navigate('/home', { replace: true });
      return;
    }
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  return (
    <section className="survey-page invitations-page has-user-bottom-nav">
      <header className="survey-topbar survey-topbar-nav-only">
        <span className="survey-topbar-spacer" aria-hidden="true" />
        <h1>הזמנות לסקרים</h1>
        <UserLogoutButton />
      </header>

      <div className="survey-content">
        {error && (
          <div className="survey-alert survey-alert-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="survey-empty" role="status">
            טוען הזמנות...
          </div>
        ) : invitations.length === 0 ? (
          <div className="invitations-empty survey-card">
            <div className="invitations-empty-icon" aria-hidden="true">
              <i className="fas fa-inbox" />
            </div>
            <h2>אין הזמנות כרגע</h2>
            <p>
              {g(
                'כשישלחו אליך סקר — הוא יופיע כאן.',
                'כשישלחו אליך סקר — הוא יופיע כאן.'
              )}
            </p>
            <Link to="/home" className="invitations-home-link">
              לדף הבית
            </Link>
          </div>
        ) : (
          <>
          <ul className="invitations-list">
            {invitations.map((item) => (
              <li key={item.invitationId}>
                <Link
                  to={`/surveys/${item.survey.id}`}
                  className="invitation-card invitation-card-link"
                >
                {item.survey.imageUrl && (
                  <img
                    className="invitation-thumb"
                    src={item.survey.imageUrl}
                    alt=""
                  />
                )}
                <div className="invitation-body">
                  <h2>{item.survey.title}</h2>
                  {item.survey.description && (
                    <p className="invitation-desc">{item.survey.description}</p>
                  )}
                  <div className="invitation-meta">
                    {item.survey.isRewarded && item.survey.rewardPoints > 0 && (
                      <span className="invitation-chip reward">
                        <i className="fas fa-coins" aria-hidden="true" />
                        {item.survey.rewardPoints} נקודות
                      </span>
                    )}
                    <span className="invitation-chip">
                      <i className="fas fa-clock" aria-hidden="true" />
                      {item.survey.timeLimitMinutes} דק׳ למענה
                    </span>
                    {item.expiresAt && (
                      <span className="invitation-chip muted">
                        נסגר {formatDate(item.expiresAt)}
                      </span>
                    )}
                    <span className="invitation-chip muted">
                      נשלח {formatDate(item.sentAt)}
                    </span>
                  </div>
                  <span className="invitation-cta">
                    {g('לענות עכשיו', 'לענות עכשיו')}
                  </span>
                </div>
                </Link>
              </li>
            ))}
          </ul>
          <PaginationBar
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            disabled={loading}
            onPageChange={(p) => load(p)}
          />
          </>
        )}
      </div>
      <UserBottomNav />
    </section>
  );
}
