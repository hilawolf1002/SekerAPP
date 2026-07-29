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
      setSubmittedMessage(
        'קיימת בקשת פדיון פתוחה. תוך 48 שעות תקבל/י קופון למייל שסיפקת.'
      );
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
      showToast('יש לבחור צילום מסוג JPG, PNG או WEBP', 'error');
      event.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('גודל הצילום יכול להיות עד 8MB', 'error');
      event.target.value = '';
      return;
    }
    setIdDocument(file);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast('יש להזין כתובת מייל תקינה', 'error');
      return;
    }
    if (!idDocument) {
      showToast('יש להעלות צילום תעודת זהות לצורך אימות', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await pointsService.submitRedemptionRequest(
        email.trim(),
        idDocument
      );
      setSubmittedMessage(result.message);
      setShowRedeemForm(false);
      setEmail('');
      setIdDocument(null);
      showToast('הפנייה נשלחה בהצלחה', 'success');
      await loadPoints();
    } catch (err) {
      showToast(pointsService.getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="survey-page points-page">
      <header className="survey-topbar">
        <Link to="/home" className="survey-back-btn" aria-label="חזרה לדף הבית">
          <i className="fas fa-arrow-right" aria-hidden="true" />
        </Link>
        <h1>האזור האישי</h1>
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
              <p className="points-balance-label">יתרה נוכחית</p>
              <p className="points-balance-value">
                {balance.toLocaleString('he-IL')}
              </p>
              <p className="points-balance-hint">
                נקודות מסקרים מתוגמלים ומבונוסים
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
                סקרים שעניתי
              </button>
            </div>

            {tab === 'points' && (
              <>
                {progress && (
                  <div className="points-progress-card">
                    <div className="points-progress-head">
                      <strong>התקדמות לפדיון</strong>
                      <span>
                        {progress.progressPercent}% מיעד {progress.redemptionGoal}
                      </span>
                    </div>
                    <div className="points-progress-bar" aria-hidden="true">
                      <div
                        className="points-progress-fill"
                        style={{ width: `${progress.progressPercent}%` }}
                      />
                    </div>
                    {!progress.canRedeem ? (
                      <p className="points-progress-hint">
                        עוד {progress.pointsNeeded} נקודות עד שתוכל/י לפדות
                      </p>
                    ) : !progress.hasPendingRedemption && !submittedMessage ? (
                      <div className="points-redeem-banner" role="status">
                        <strong>הגעת ליעד הפדיון!</strong>
                        <span>
                          אם את/ה מעוניין/ת לפדות את הנקודות שצברת – לחץ/י כאן.
                        </span>
                        <button
                          type="button"
                          className="points-redeem-cta"
                          onClick={() => setShowRedeemForm(true)}
                        >
                          לפדיון הנקודות
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {submittedMessage && (
                  <div className="points-coupon-result" role="status">
                    <strong>הפנייה התקבלה</strong>
                    <span>{submittedMessage}</span>
                  </div>
                )}

                {showRedeemForm && (
                  <form
                    className="points-redeem-form survey-card"
                    onSubmit={handleSubmit}
                  >
                    <h2 className="points-history-title">בקשת פדיון</h2>
                    <p className="survey-hint">
                      מלא/י כתובת מייל והעלה/י צילום תעודת זהות לאימות אחרון.
                      לאחר אישור המנהל יישלח אליך קופון למייל תוך 48 שעות.
                    </p>
                    <p className="points-privacy-line">
                      מיד אחרי שתאושר על ידי מנהל המערכת – התמונה תימחק מהארכיון.
                    </p>

                    <label className="points-form-label">
                      כתובת מייל לקבלת הקופון
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
                        {submitting ? 'שולח…' : 'שליחת הפנייה'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="points-history-card survey-card">
                  <h2 className="points-history-title">היסטוריית נקודות</h2>

                  {transactions.length === 0 ? (
                    <div className="points-empty">
                      <i className="fas fa-receipt" aria-hidden="true" />
                      <p>
                        {g(
                          'עדיין אין תנועות נקודות.',
                          'עדיין אין תנועות נקודות.'
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
                            {tx.amount >= 0 ? '+' : ''}
                            {tx.amount}
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
                <h2 className="points-history-title">סקרים שעניתי</h2>
                {surveysLoading ? (
                  <div className="survey-empty" role="status">
                    טוען סקרים...
                  </div>
                ) : completedSurveys.length === 0 ? (
                  <div className="points-empty">
                    <i className="fas fa-clipboard-list" aria-hidden="true" />
                    <p>טרם ענית על סקרים</p>
                    <p className="survey-hint">
                      כשתענה/י על סקרים – הם יופיעו כאן עם הנקודות שקיבלת.
                    </p>
                    <Link to="/invitations" className="points-surveys-link">
                      להזמנות פעילות
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
    </section>
  );
}
