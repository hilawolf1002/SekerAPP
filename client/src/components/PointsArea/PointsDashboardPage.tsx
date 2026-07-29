import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as pointsService from '../../Services/pointsService';
import * as surveyService from '../../Services/surveyService';
import { useToast } from '../../Context/ToastContext';
import { useGender } from '../../Utils/useGender';
import type { PointTransaction } from '../../Models/SurveyModel';
import type { PointsProgress } from '../../Services/pointsService';
import type { MyCompletedResponse } from '../../Services/surveyService';
import { PaginationBar } from '../LayoutArea/PaginationBar';
import { UserBottomNav } from '../LayoutArea/UserBottomNav';
import { UserLogoutButton } from '../LayoutArea/UserLogoutButton';
import '../SurveyArea/survey-shared.css';
import './PointsDashboardPage.css';

type TabId = 'points' | 'surveys';
const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatTransactionAmount(amount: number): string {
  const abs = Math.abs(amount).toLocaleString('he-IL');
  if (amount > 0) return `+${abs}`;
  if (amount < 0) return `−${abs}`;
  return '0';
}

function transactionIcon(type: PointTransaction['type']): string {
  switch (type) {
    case 'SURVEY_COMPLETION':
      return 'fa-clipboard-check';
    case 'JOIN_BONUS':
      return 'fa-gift';
    case 'REFERRAL_BONUS':
      return 'fa-user-friends';
    case 'GIFT_REDEMPTION':
      return 'fa-shopping-bag';
    default:
      return 'fa-coins';
  }
}

export function PointsDashboardPage() {
  const { showToast } = useToast();
  const g = useGender();
  const [tab, setTab] = useState<TabId>('points');
  const [balance, setBalance] = useState(0);
  const [progress, setProgress] = useState<PointsProgress | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [completedSurveys, setCompletedSurveys] = useState<MyCompletedResponse[]>(
    []
  );
  const [surveysTotal, setSurveysTotal] = useState(0);
  const [surveysPage, setSurveysPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [surveysLoading, setSurveysLoading] = useState(false);
  const [surveysLoaded, setSurveysLoaded] = useState(false);
  const [error, setError] = useState('');

  const [showRedeemForm, setShowRedeemForm] = useState(false);
  const [email, setEmail] = useState('');
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState('');

  async function loadPoints(nextPage = txPage) {
    const data = await pointsService.getMyPoints(nextPage, PAGE_SIZE);
    setBalance(data.balance);
    setTransactions(data.transactions);
    setTxTotal(data.total);
    setTxPage(nextPage);
    setProgress(data.progress);
    if (data.progress.hasPendingRedemption) {
      setSubmittedMessage('pending');
      setShowRedeemForm(false);
    }
  }

  async function loadCompletedSurveys(nextPage = 1) {
    setSurveysLoading(true);
    try {
      const data = await surveyService.getMyCompletedResponses(
        nextPage,
        PAGE_SIZE
      );
      setCompletedSurveys(data.items);
      setSurveysTotal(data.total);
      setSurveysPage(nextPage);
      setSurveysLoaded(true);
    } catch (err) {
      showToast(surveyService.getErrorMessage(err), 'error');
    } finally {
      setSurveysLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await loadPoints(1);
      } catch (err) {
        const msg = pointsService.getErrorMessage(err);
        setError(msg);
        showToast(msg, 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  useEffect(() => {
    if (tab === 'surveys' && !surveysLoaded && !surveysLoading) {
      void loadCompletedSurveys(1);
    }
  }, [tab, surveysLoaded, surveysLoading]);

  function chooseDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast('נשמח לצילום מסוג JPG, PNG או WEBP', 'error');
      event.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('הקובץ גדול מדי — עד 8MB', 'error');
      event.target.value = '';
      return;
    }
    setIdDocument(file);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast('נשמח לכתובת מייל תקינה', 'error');
      return;
    }
    if (!idDocument) {
      showToast('חסר צילום תעודת זהות לאימות', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await pointsService.submitRedemptionRequest(
        email.trim(),
        idDocument
      );
      setSubmittedMessage('submitted');
      setShowRedeemForm(false);
      setEmail('');
      setIdDocument(null);
      showToast('הבקשה נשלחה', 'success');
      await loadPoints();
    } catch (err) {
      showToast(pointsService.getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="survey-page points-page has-user-bottom-nav">
      <header className="survey-topbar survey-topbar-nav-only">
        <span className="survey-topbar-spacer" aria-hidden="true" />
        <h1>הנקודות שלי</h1>
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
            טוען...
          </div>
        ) : (
          <>
            <div className="points-balance-card">
              <div className="points-balance-icon" aria-hidden="true">
                <i className="fas fa-coins" />
              </div>
              <p className="points-balance-label">נקודות זמינות עכשיו</p>
              <p className="points-balance-value">
                {balance.toLocaleString('he-IL')}
              </p>
            </div>

            <div className="points-tabs" role="tablist" aria-label="ניווט אזור אישי">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'points'}
                className={tab === 'points' ? 'active' : ''}
                onClick={() => setTab('points')}
              >
                נקודות
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'surveys'}
                className={tab === 'surveys' ? 'active' : ''}
                onClick={() => setTab('surveys')}
              >
                סקרים שקיבלתי עליהם נקודות
              </button>
            </div>

            {tab === 'points' && (
              <>
                {progress && (
                  <div className="points-progress-card">
                    <div className="points-progress-head">
                      <strong>התקדמות לפדיון הבא</strong>
                    </div>
                    <div className="points-progress-bar" aria-hidden="true">
                      <div
                        className="points-progress-fill"
                        style={{ width: `${progress.progressPercent}%` }}
                      />
                    </div>
                    {!progress.canRedeem ? (
                      <p className="points-progress-hint">
                        חסרות לך עוד{' '}
                        <strong>
                          {progress.pointsNeeded.toLocaleString('he-IL')}
                        </strong>{' '}
                        נקודות כדי לבקש קופון
                      </p>
                    ) : !progress.hasPendingRedemption && !submittedMessage ? (
                      <div className="points-redeem-banner" role="status">
                        <strong>אפשר לבקש קופון</strong>
                        <span>
                          בפדיון ינוכו{' '}
                          {progress.redemptionPointsCost.toLocaleString('he-IL')}{' '}
                          נקודות
                          {progress.balanceAfterRedemption != null &&
                          progress.balanceAfterRedemption > 0
                            ? ` — יישארו לך ${progress.balanceAfterRedemption.toLocaleString('he-IL')} נקודות`
                            : ''}
                          .
                        </span>
                        <button
                          type="button"
                          className="points-redeem-cta"
                          onClick={() => setShowRedeemForm(true)}
                        >
                          לפדיון
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {submittedMessage && (
                  <div className="points-coupon-result" role="status">
                    <strong>
                      {submittedMessage === 'pending'
                        ? 'בקשת פדיון בטיפול'
                        : 'הפנייה התקבלה'}
                    </strong>
                    <span>
                      {submittedMessage === 'pending'
                        ? 'הקופון יישלח למייל בקרוב.'
                        : 'הבקשה נשלחה — נעדכן כשתאושר.'}
                    </span>
                    <details className="points-status-details">
                      <summary>מה קורה עכשיו?</summary>
                      <p>
                        המנהל יאשר את הבקשה, ישלח קופון למייל שסיפקת, ואז
                        ינוכו הנקודות מהיתרה. צילום ת.ז. נמחק אחרי האישור.
                      </p>
                    </details>
                  </div>
                )}

                {showRedeemForm && (
                  <form
                    className="points-redeem-form survey-card"
                    onSubmit={handleSubmit}
                  >
                    <h2 className="points-history-title">בקשת פדיון</h2>
                    <ol className="points-redeem-steps" aria-label="שלבי הפדיון">
                      <li className={email.trim() ? 'done' : 'current'}>
                        <span>1</span> מייל
                      </li>
                      <li
                        className={
                          idDocument ? 'done' : email.trim() ? 'current' : ''
                        }
                      >
                        <span>2</span> ת.ז.
                      </li>
                      <li className={email.trim() && idDocument ? 'current' : ''}>
                        <span>3</span> שליחה
                      </li>
                    </ol>
                    <p className="survey-hint">
                      הקופון יישלח למייל. צילום ת.ז. לאימות בלבד
                      {progress
                        ? ` · ינוכו ${progress.redemptionPointsCost.toLocaleString('he-IL')} נקודות`
                        : ''}
                      .
                    </p>

                    <label className="points-form-label">
                      מייל לקבלת הקופון
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        autoComplete="email"
                        required
                      />
                    </label>

                    <label
                      className={`points-upload ${idDocument ? 'selected' : ''}`}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        onChange={chooseDocument}
                      />
                      <strong>
                        {idDocument
                          ? 'הצילום מוכן לשליחה'
                          : 'צילום או העלאת תעודת זהות'}
                      </strong>
                      <small>
                        {idDocument
                          ? `${idDocument.name} · ${(
                              idDocument.size /
                              1024 /
                              1024
                            ).toFixed(1)}MB`
                          : 'JPG, PNG או WEBP · עד 8MB'}
                      </small>
                    </label>

                    <div className="points-form-actions">
                      <button
                        type="button"
                        className="points-form-cancel"
                        onClick={() => {
                          setShowRedeemForm(false);
                          setIdDocument(null);
                        }}
                        disabled={submitting}
                      >
                        ביטול
                      </button>
                      <button
                        type="submit"
                        className="points-form-submit"
                        disabled={submitting}
                      >
                        {submitting ? 'שולחים…' : 'שליחת בקשה'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="points-history-card survey-card">
                  <h2 className="points-history-title">תנועות נקודות</h2>

                  {transactions.length === 0 ? (
                    <div className="points-empty">
                      <i className="fas fa-receipt" aria-hidden="true" />
                      <p>
                        {g(
                          'עדיין אין תנועות.',
                          'עדיין אין תנועות.'
                        )}
                      </p>
                      <p className="survey-hint">
                        {g(
                          'עני על סקרים מתוגמלים כדי לצבור נקודות.',
                          'ענה על סקרים מתוגמלים כדי לצבור נקודות.'
                        )}
                      </p>
                    </div>
                  ) : (
                    <>
                    <ul className="points-list">
                      {transactions.map((tx) => (
                        <li key={tx.id} className="points-list-item">
                          <div
                            className={`points-list-icon ${
                              tx.amount >= 0 ? 'positive' : 'negative'
                            }`}
                            aria-hidden="true"
                          >
                            <i className={`fas ${transactionIcon(tx.type)}`} />
                          </div>
                          <div className="points-list-body">
                            <strong>{tx.typeLabel}</strong>
                            {tx.note && (
                              <span className="points-list-note">{tx.note}</span>
                            )}
                            <time
                              className="points-list-date"
                              dateTime={tx.createdAt}
                            >
                              {formatDate(tx.createdAt)}
                            </time>
                          </div>
                          <span
                            className={`points-list-amount ${
                              tx.amount >= 0 ? 'positive' : 'negative'
                            }`}
                          >
                            {formatTransactionAmount(tx.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <PaginationBar
                      page={txPage}
                      pageSize={PAGE_SIZE}
                      total={txTotal}
                      onPageChange={(p) => {
                        void loadPoints(p).catch((err) =>
                          showToast(pointsService.getErrorMessage(err), 'error')
                        );
                      }}
                    />
                    </>
                  )}
                </div>
              </>
            )}

            {tab === 'surveys' && (
              <div className="points-history-card survey-card">
                <h2 className="points-history-title">סקרים שקיבלתי עליהם נקודות</h2>
                {surveysLoading ? (
                  <div className="survey-empty" role="status">
                    טוען סקרים...
                  </div>
                ) : completedSurveys.length === 0 ? (
                  <div className="points-empty">
                    <i className="fas fa-clipboard-list" aria-hidden="true" />
                    <p>עדיין לא ענית על סקרים</p>
                    <p className="survey-hint">
                      כשתענה/י — הם יופיעו כאן עם הנקודות שקיבלת.
                    </p>
                    <Link to="/invitations" className="points-surveys-link">
                      להזמנות
                    </Link>
                  </div>
                ) : (
                  <>
                    <ul className="points-surveys-list">
                      {completedSurveys.map((item) => (
                        <li key={item.responseId} className="points-survey-item">
                          <div className="points-survey-body">
                            <strong>{item.title}</strong>
                            {item.completedAt && (
                              <time dateTime={item.completedAt}>
                                {formatDate(item.completedAt)}
                              </time>
                            )}
                          </div>
                          <span
                            className={`points-survey-points ${
                              item.pointsEarned > 0 ? 'earned' : 'none'
                            }`}
                          >
                            {item.pointsEarned > 0
                              ? `+${item.pointsEarned}`
                              : 'ללא נקודות'}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <PaginationBar
                      page={surveysPage}
                      pageSize={PAGE_SIZE}
                      total={surveysTotal}
                      disabled={surveysLoading}
                      onPageChange={(p) => void loadCompletedSurveys(p)}
                    />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <UserBottomNav />
    </section>
  );
}
