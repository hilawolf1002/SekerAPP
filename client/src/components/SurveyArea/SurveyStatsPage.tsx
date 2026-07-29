import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as surveyService from '../../Services/surveyService';
import type { SurveyStats } from '../../Models/SurveyModel';
import './survey-shared.css';

/** סטטיסטיקות סקר ליוצר */
export function SurveyStatsPage() {
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await surveyService.getSurveyStats(id);
        setStats(data);
      } catch (err) {
        setError(surveyService.getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const copyLink = async () => {
    if (!id) return;
    const url = `${window.location.origin}/surveys/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('לא הצלחנו להעתיק את הקישור');
    }
  };

  return (
    <section className="survey-page">
      <header className="survey-topbar">
        <Link to="/surveys" className="survey-back-btn" aria-label="חזרה לרשימה">
          <i className="fas fa-arrow-right" aria-hidden="true" />
        </Link>
        <h1>סטטיסטיקות</h1>
      </header>

      <div className="survey-content">
        {loading ? (
          <div className="survey-empty" role="status">
            טוען...
          </div>
        ) : error ? (
          <div className="survey-alert survey-alert-error" role="alert">
            {error}
          </div>
        ) : stats ? (
          <>
            <div className="survey-card">
              <h2 className="survey-list-item-title">{stats.title}</h2>
              <p className="survey-hint">
                סטטוס:{' '}
                {stats.status === 'ACTIVE'
                  ? 'פעיל'
                  : stats.status === 'CLOSED'
                    ? 'סגור'
                    : 'טיוטה'}
                {stats.maxResponses != null && ` · מכסה ${stats.maxResponses}`}
              </p>

              <div className="survey-stats-grid">
                <div className="survey-stat-tile">
                  <strong>{stats.completed}</strong>
                  <span>השלימו</span>
                </div>
                <div className="survey-stat-tile">
                  <strong>{stats.started}</strong>
                  <span>באמצע</span>
                </div>
                <div className="survey-stat-tile">
                  <strong>{stats.expired}</strong>
                  <span>פג זמן</span>
                </div>
                <div className="survey-stat-tile">
                  <strong>
                    {stats.maxResponses != null
                      ? `${stats.completed}/${stats.maxResponses}`
                      : stats.completed}
                  </strong>
                  <span>מענים</span>
                </div>
              </div>
            </div>

            <div className="survey-fab-row">
              <button type="button" className="survey-btn survey-btn-primary" onClick={copyLink}>
                {copied ? 'הקישור הועתק!' : 'העתקת קישור לסקר'}
              </button>
              {stats.status === 'ACTIVE' && (
                <Link to={`/surveys/${id}`} className="survey-btn survey-btn-secondary">
                  תצוגת מענה
                </Link>
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
