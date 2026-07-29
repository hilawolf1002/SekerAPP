import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as surveyService from '../../Services/surveyService';
import { useToast } from '../../Context/ToastContext';
import { useAuth } from '../../Context/AuthContext';
import { useGender } from '../../Utils/useGender';
import type { SurveyListItem, SurveyStatus } from '../../Models/SurveyModel';
import { PaginationBar } from '../LayoutArea/PaginationBar';
import './survey-shared.css';
import './SurveysListPage.css';

const PAGE_SIZE = 10;

function statusBadge(status: SurveyStatus) {
  switch (status) {
    case 'ACTIVE':
      return <span className="survey-badge survey-badge-active">פעיל</span>;
    case 'CLOSED':
      return <span className="survey-badge survey-badge-closed">סגור</span>;
    default:
      return <span className="survey-badge survey-badge-draft">טיוטה</span>;
  }
}

/** רשימת הסקרים שלי – מותאם למובייל */
export function SurveysListPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const g = useGender();
  const isAdmin = user?.role === 'ADMIN';
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async (nextPage = page) => {
    setError('');
    setLoading(true);
    try {
      const data = await surveyService.listMySurveys(nextPage, PAGE_SIZE);
      setSurveys(data.items);
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
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusToggle = async (survey: SurveyListItem) => {
    const next: SurveyStatus = survey.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    setActionId(survey.id);
    try {
      await surveyService.updateSurveyStatus(survey.id, next);
      await load(page);
      showToast(next === 'ACTIVE' ? 'הסקר פורסם' : 'הסקר נסגר', 'success');
    } catch (err) {
      const msg = surveyService.getErrorMessage(err);
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setActionId(null);
    }
  };

  const statusActionLabel = (status: SurveyStatus) => {
    if (status === 'ACTIVE') return 'סגירה';
    if (status === 'DRAFT') return 'פרסום';
    return 'פתיחה מחדש';
  };

  const copyLink = async (id: string, status: SurveyStatus) => {
    if (status !== 'ACTIVE') {
      const msg = g(
        'ניתן להעתיק קישור רק לסקר פעיל. פרסמי את הסקר קודם.',
        'ניתן להעתיק קישור רק לסקר פעיל. פרסם את הסקר קודם.'
      );
      setError(msg);
      showToast(msg, 'error');
      return;
    }
    const url = `${window.location.origin}/surveys/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      showToast('הקישור הועתק', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const msg = 'לא הצלחנו להעתיק את הקישור';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  return (
    <section className="survey-page surveys-list-page">
      <header className="survey-topbar">
        <Link
          to={isAdmin ? '/admin' : '/home'}
          className="survey-back-btn"
          aria-label="חזרה"
        >
          <i className="fas fa-arrow-right" aria-hidden="true" />
        </Link>
        <h1>{isAdmin ? 'ניהול סקרים' : 'הסקרים שלי'}</h1>
        <Link
          to="/surveys/create"
          className="survey-back-btn surveys-add-btn"
          aria-label="סקר חדש"
        >
          <i className="fas fa-plus" aria-hidden="true" />
        </Link>
      </header>

      <div className="survey-content">
        {error && (
          <div className="survey-alert survey-alert-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="survey-empty" role="status">
            {g('טוענת סקרים...', 'טוען סקרים...')}
          </div>
        ) : surveys.length === 0 ? (
          <div className="survey-card survey-empty">
            <i className="fas fa-clipboard-list" aria-hidden="true" />
            <p>
              {g(
                'עדיין אין סקרים. צרי סקר ראשון בלחיצה על +',
                'עדיין אין סקרים. צור סקר ראשון בלחיצה על +'
              )}
            </p>
            <div className="survey-fab-row">
              <Link to="/surveys/create" className="survey-btn survey-btn-primary">
                <i className="fas fa-plus" aria-hidden="true" />
                סקר חדש
              </Link>
            </div>
          </div>
        ) : (
          <>
            <Link
              to="/surveys/create"
              className="survey-btn survey-btn-primary surveys-new-top"
            >
              <i className="fas fa-plus" aria-hidden="true" />
              סקר חדש
            </Link>

            {surveys.map((survey) => (
              <article key={survey.id} className="survey-card surveys-list-card">
                <div className="surveys-list-card-top">
                  {statusBadge(survey.status)}
                  {survey.isRewarded && survey.rewardPoints > 0 && (
                    <span className="survey-reward-pill">
                      <i className="fas fa-coins" aria-hidden="true" />
                      {survey.rewardPoints} נק׳
                    </span>
                  )}
                </div>

                <h2 className="survey-list-item-title">{survey.title}</h2>
                {survey.description && (
                  <p className="survey-list-item-desc">{survey.description}</p>
                )}

                <div className="survey-list-meta">
                  <span>
                    <i className="fas fa-check-circle" aria-hidden="true" />{' '}
                    {survey.completedResponses ?? 0} מענים
                  </span>
                  <span>
                    <i className="fas fa-clock" aria-hidden="true" />{' '}
                    {survey.timeLimitMinutes} דק׳
                  </span>
                  {survey.maxResponses != null && (
                    <span>
                      <i className="fas fa-users" aria-hidden="true" /> מכסה{' '}
                      {survey.maxResponses}
                    </span>
                  )}
                </div>

                <div className="survey-actions-row">
                  <Link
                    to={`/surveys/${survey.id}/stats`}
                    className="survey-btn survey-btn-ghost"
                  >
                    סטטיסטיקות
                  </Link>
                  <button
                    type="button"
                    className="survey-btn survey-btn-ghost"
                    onClick={() => copyLink(survey.id, survey.status)}
                  >
                    {copiedId === survey.id ? 'הועתק!' : 'העתקת קישור'}
                  </button>
                  {survey.status === 'ACTIVE' && (
                    <Link
                      to={`/surveys/${survey.id}`}
                      className="survey-btn survey-btn-ghost"
                    >
                      תצוגה
                    </Link>
                  )}
                  {survey.status === 'DRAFT' && (
                    <Link
                      to={`/surveys/${survey.id}`}
                      className="survey-btn survey-btn-ghost"
                    >
                      תצוגה מקדימה
                    </Link>
                  )}
                  <button
                    type="button"
                    className="survey-btn survey-btn-ghost"
                    disabled={actionId === survey.id}
                    onClick={() => handleStatusToggle(survey)}
                  >
                    {actionId === survey.id
                      ? g('מעדכנת...', 'מעדכן...')
                      : statusActionLabel(survey.status)}
                  </button>
                </div>
              </article>
            ))}

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
    </section>
  );
}
