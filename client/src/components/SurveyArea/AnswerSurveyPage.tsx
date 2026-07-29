import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import { useGender } from '../../Utils/useGender';
import * as surveyService from '../../Services/surveyService';
import type { Survey, SurveyQuestion } from '../../Models/SurveyModel';
import './survey-shared.css';
import './AnswerSurveyPage.css';

type Phase = 'loading' | 'intro' | 'questions' | 'done' | 'error';

/** בחירה: מזהה אפשרות / מזהים | פתוח: מחרוזת */
type AnswerValue = number | number[] | string;

function formatTimeLeft(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function timerClass(ms: number): string {
  if (ms <= 60_000) return 'danger';
  if (ms <= 180_000) return 'warning';
  return '';
}

function getQuestionType(q: SurveyQuestion): 'choice' | 'open_text' {
  return q.type ?? 'choice';
}

function emptyAnswersForSurvey(survey: Survey): AnswerValue[] {
  return survey.questions.map((q) =>
    getQuestionType(q) === 'open_text' ? '' : q.allowMultiple ? [] : 0
  );
}

function hasAnswer(value: AnswerValue, q: SurveyQuestion): boolean {
  if (getQuestionType(q) === 'open_text') {
    return typeof value === 'string' && value.trim().length > 0;
  }
  if (q.allowMultiple) {
    return Array.isArray(value) && value.length > 0;
  }
  return typeof value === 'number' && value > 0;
}

function toServerAnswer(value: AnswerValue, q: SurveyQuestion): string | string[] {
  if (getQuestionType(q) === 'open_text') {
    return typeof value === 'string' ? value.trim() : '';
  }

  const options = q.answers ?? [];
  const idToText = (id: number) => options.find((o) => o.id === id)?.text ?? '';

  if (q.allowMultiple) {
    const ids = Array.isArray(value) ? value : [];
    return ids.map(idToText).filter(Boolean);
  }

  const id = typeof value === 'number' ? value : 0;
  return idToText(id);
}

/** מענה לסקר – שאלה אחת במסך, טיימר, מותאם למובייל */
export function AnswerSurveyPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const g = useGender();

  const [phase, setPhase] = useState<Phase>('loading');
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);

  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerValue[]>([]);
  const [doneMessage, setDoneMessage] = useState('');
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [resumeInfo, setResumeInfo] = useState('');

  const loadSurvey = useCallback(async () => {
    if (!id) return;
    setError('');
    setResumeInfo('');
    try {
      const data = await surveyService.getSurvey(id);
      if (!data.questions?.length) {
        setError('לסקר זה אין שאלות');
        setPhase('error');
        return;
      }
      setSurvey(data);
      setAnswers(emptyAnswersForSurvey(data));
      setPhase('intro');
    } catch (err) {
      const msg = surveyService.getErrorMessage(err);
      setError(msg);
      showToast(msg, 'error');
      setPhase('error');
    }
  }, [id, showToast]);

  useEffect(() => {
    loadSurvey();
  }, [loadSurvey]);

  useEffect(() => {
    if (!expiresAt || phase !== 'questions') return;

    const tick = () => {
      const left = expiresAt.getTime() - Date.now();
      setTimeLeftMs(left);
      if (left <= 0) {
        const msg = 'פג הזמן למענה. ניתן לנסות שוב אם הסקר עדיין פתוח.';
        setError(msg);
        showToast(msg, 'error');
        setPhase('error');
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt, phase, showToast]);

  const handleStart = async () => {
    if (!id || !user || !survey) return;
    if (survey.status !== 'ACTIVE') return;

    setStarting(true);
    setError('');
    try {
      const result = await surveyService.startSurvey(id);
      setExpiresAt(new Date(result.expiresAt));
      setTimeLeftMs(new Date(result.expiresAt).getTime() - Date.now());
      setAnswers(emptyAnswersForSurvey(survey));
      setQuestionIndex(0);
      setResumeInfo(
        result.resumed ? 'יש לך מענה פתוח – הטיימר ממשיך מאותה נקודה.' : ''
      );
      setPhase('questions');
    } catch (err) {
      const msg = surveyService.getErrorMessage(err);
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setStarting(false);
    }
  };

  const currentQuestion: SurveyQuestion | undefined = survey?.questions[questionIndex];
  const progress = survey
    ? ((questionIndex + 1) / survey.questions.length) * 100
    : 0;

  const isOptionSelected = (qIndex: number, optionId: number): boolean => {
    const value = answers[qIndex];
    if (Array.isArray(value)) return value.includes(optionId);
    return value === optionId;
  };

  const toggleAnswer = (qIndex: number, optionId: number, allowMultiple: boolean) => {
    setAnswers((prev) => {
      const next = [...prev];
      if (allowMultiple) {
        const current = Array.isArray(next[qIndex])
          ? [...(next[qIndex] as number[])]
          : [];
        const idx = current.indexOf(optionId);
        if (idx >= 0) current.splice(idx, 1);
        else current.push(optionId);
        next[qIndex] = current;
      } else {
        next[qIndex] = optionId;
      }
      return next;
    });
  };

  const canProceed =
    currentQuestion && survey
      ? hasAnswer(answers[questionIndex], currentQuestion)
      : false;

  const validateAllAnswers = (): string | null => {
    if (!survey) return null;
    for (let i = 0; i < survey.questions.length; i++) {
      if (!hasAnswer(answers[i], survey.questions[i])) {
        return g(`יש לענות על שאלה ${i + 1}`, `יש לענות על שאלה ${i + 1}`);
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!id || !survey) return;

    const validationError = validateAllAnswers();
    if (validationError) {
      setError(validationError);
      showToast(validationError, 'error');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = answers.map((a, i) => toServerAnswer(a, survey.questions[i]));
      const result = await surveyService.completeSurvey(id, payload);
      setPointsAwarded(result.pointsAwarded);
      setDoneMessage(
        result.thankYouMessage ||
          g('תודה רבה על השתתפותך בסקר!', 'תודה רבה על השתתפותך בסקר!')
      );
      setPhase('done');
      if (result.pointsAwarded > 0) {
        showToast(`קיבלת ${result.pointsAwarded} נקודות`, 'success');
      }
    } catch (err) {
      const msg = surveyService.getErrorMessage(err);
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!survey) return;
    if (!canProceed) {
      showToast(
        g('יש לבחור תשובה לפני המשך', 'יש לבחור תשובה לפני המשך'),
        'error'
      );
      return;
    }
    if (questionIndex < survey.questions.length - 1) {
      setQuestionIndex((i) => i + 1);
      return;
    }
    handleSubmit();
  };

  if (authLoading || phase === 'loading') {
    return (
      <section className="survey-page">
        <div className="survey-empty" role="status">
          {g('טוענת סקר...', 'טוען סקר...')}
        </div>
      </section>
    );
  }

  if (phase === 'error') {
    return (
      <section className="survey-page">
        <header className="survey-topbar">
          <Link to="/home" className="survey-back-btn" aria-label="חזרה">
            <i className="fas fa-arrow-right" aria-hidden="true" />
          </Link>
          <h1>סקר</h1>
        </header>
        <div className="survey-content">
          <div className="survey-alert survey-alert-error" role="alert">
            {error || 'לא ניתן לטעון את הסקר'}
          </div>
          <button
            type="button"
            className="survey-btn survey-btn-secondary"
            onClick={loadSurvey}
          >
            {g('נסי שוב', 'נסה שוב')}
          </button>
        </div>
      </section>
    );
  }

  if (phase === 'done') {
    return (
      <section className="survey-page answer-done">
        <div className="survey-content">
          <div className="survey-card answer-done-card">
            <div className="answer-done-icon" aria-hidden="true">
              <i className="fas fa-check-circle" />
            </div>
            <h1>סיימת!</h1>
            <p>{doneMessage}</p>
            {pointsAwarded > 0 && (
              <div className="survey-reward-pill answer-done-points">
                <i className="fas fa-coins" aria-hidden="true" />
                קיבלת {pointsAwarded} נקודות
              </div>
            )}
            <div className="survey-fab-row">
              {pointsAwarded > 0 && (
                <Link to="/points" className="survey-btn survey-btn-primary">
                  צפייה בנקודות
                </Link>
              )}
              <Link
                to="/home"
                className={`survey-btn ${
                  pointsAwarded > 0 ? 'survey-btn-secondary' : 'survey-btn-primary'
                }`}
              >
                חזרה לדף הבית
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (phase === 'intro' && survey) {
    const isOwner =
      user?.role === 'ADMIN' ||
      (Boolean(user?.id) && user?.id === survey.creatorId);
    const isDraftPreview = survey.status === 'DRAFT';
    const isClosed = survey.status === 'CLOSED';
    const isSyntheticAdmin = user?.id === 'admin';
    const canAnswer = survey.status === 'ACTIVE' && !isSyntheticAdmin;

    return (
      <section
        className="survey-page"
        style={
          survey.backgroundColor
            ? { backgroundColor: survey.backgroundColor }
            : undefined
        }
      >
        <header className="survey-topbar">
          <Link
            to={user ? '/home' : '/login'}
            className="survey-back-btn"
            aria-label="חזרה"
          >
            <i className="fas fa-arrow-right" aria-hidden="true" />
          </Link>
          <h1>{survey.title}</h1>
        </header>

        <div className="survey-content">
          <div className="survey-card answer-intro-card">
            {survey.imageUrl && (
              <div className="answer-survey-image">
                <img src={survey.imageUrl} alt="" />
              </div>
            )}
            <h2 className="answer-intro-title">{survey.title}</h2>
            {survey.description && (
              <p className="answer-intro-desc">{survey.description}</p>
            )}

            {isDraftPreview && (
              <div className="survey-alert survey-alert-info">
                {isOwner
                  ? g(
                      'תצוגה מקדימה – הסקר בטיוטה. פרסמי אותו כדי לאפשר מענה.',
                      'תצוגה מקדימה – הסקר בטיוטה. פרסם אותו כדי לאפשר מענה.'
                    )
                  : 'הסקר עדיין לא פורסם.'}
              </div>
            )}

            {isClosed && (
              <div className="survey-alert survey-alert-error">
                הסקר סגור ואינו מקבל מענים חדשים.
              </div>
            )}

            <div className="answer-intro-meta">
              <span>
                <i className="fas fa-list" aria-hidden="true" />{' '}
                {survey.questions.length} שאלות
              </span>
              <span>
                <i className="fas fa-clock" aria-hidden="true" />{' '}
                {survey.timeLimitMinutes} דקות
              </span>
            </div>

            {survey.isRewarded && survey.rewardPoints > 0 && (
              <div className="survey-reward-pill">
                <i className="fas fa-coins" aria-hidden="true" />
                {survey.rewardPoints} נקודות למענה
              </div>
            )}

            <p className="survey-hint">
              {g(
                'לאחר לחיצה על "התחלה" יופעל טיימר. עני על כל השאלות לפני שהזמן נגמר.',
                'לאחר לחיצה על "התחלה" יופעל טיימר. ענה על כל השאלות לפני שהזמן נגמר.'
              )}
            </p>

            {!user ? (
              <>
                <div className="survey-alert survey-alert-info">
                  כדי לענות על הסקר יש להתחבר עם מספר הנייד שלך.
                </div>
                {survey.status === 'ACTIVE' && (
                  <Link
                    to="/login"
                    state={{ from: `/surveys/${id}` }}
                    className="survey-btn survey-btn-primary"
                  >
                    התחברות והמשך
                  </Link>
                )}
              </>
            ) : isSyntheticAdmin && survey.status === 'ACTIVE' ? (
              <>
                <div className="survey-alert survey-alert-info">
                  מחוברים כמנהל מערכת. כדי לענות על הסקר יש להתחבר עם מספר טלפון
                  של עונה מאושר.
                </div>
                <Link to="/surveys" className="survey-btn survey-btn-secondary">
                  חזרה לניהול הסקרים
                </Link>
                <Link
                  to={`/surveys/${id}/stats`}
                  className="survey-btn survey-btn-primary"
                  style={{ marginTop: 8 }}
                >
                  סטטיסטיקות
                </Link>
              </>
            ) : canAnswer ? (
              <>
                {error && (
                  <div className="survey-alert survey-alert-error" role="alert">
                    {error}
                  </div>
                )}
                <button
                  type="button"
                  className="survey-btn survey-btn-primary"
                  disabled={starting}
                  onClick={handleStart}
                >
                  {starting ? g('מתחילה...', 'מתחיל...') : 'התחלה'}
                </button>
              </>
            ) : isOwner && isDraftPreview ? (
              <Link to="/surveys" className="survey-btn survey-btn-secondary">
                חזרה לניהול הסקרים
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (phase === 'questions' && survey && currentQuestion) {
    const isLast = questionIndex === survey.questions.length - 1;
    const options = currentQuestion.answers ?? [];

    return (
      <section
        className="survey-page answer-questions-page"
        style={
          survey.backgroundColor
            ? { backgroundColor: survey.backgroundColor }
            : undefined
        }
      >
        <header className="survey-topbar">
          <button
            type="button"
            className="survey-back-btn"
            aria-label="שאלה קודמת"
            disabled={questionIndex === 0}
            onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
          >
            <i className="fas fa-arrow-right" aria-hidden="true" />
          </button>
          <h1>
            שאלה {questionIndex + 1} מתוך {survey.questions.length}
          </h1>
          {expiresAt && (
            <div className={`survey-timer ${timerClass(timeLeftMs)}`}>
              <i className="fas fa-hourglass-half" aria-hidden="true" />
              {formatTimeLeft(timeLeftMs)}
            </div>
          )}
        </header>

        <div className="survey-progress" aria-hidden="true">
          <div className="survey-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="survey-content">
          {resumeInfo && (
            <div className="survey-alert survey-alert-info" role="status">
              {resumeInfo}
            </div>
          )}
          {error && (
            <div className="survey-alert survey-alert-error" role="alert">
              {error}
            </div>
          )}

          <div className="survey-card">
            <h2 className="survey-question-title">{currentQuestion.questionText}</h2>

            {getQuestionType(currentQuestion) === 'open_text' ? (
              <>
                <p className="survey-question-meta">
                  {g('כתבי את תשובתך בשדה למטה', 'כתוב את תשובתך בשדה למטה')}
                </p>
                <textarea
                  className="survey-textarea survey-open-answer"
                  value={
                    typeof answers[questionIndex] === 'string'
                      ? (answers[questionIndex] as string)
                      : ''
                  }
                  maxLength={currentQuestion.maxLength ?? 500}
                  rows={5}
                  placeholder="התשובה שלך..."
                  onChange={(e) => {
                    const value = e.target.value;
                    setAnswers((prev) => {
                      const next = [...prev];
                      next[questionIndex] = value;
                      return next;
                    });
                  }}
                />
                <p className="survey-char-count">
                  {typeof answers[questionIndex] === 'string'
                    ? (answers[questionIndex] as string).length
                    : 0}{' '}
                  / {currentQuestion.maxLength ?? 500} תווים
                </p>
              </>
            ) : (
              <>
                <p className="survey-question-meta">
                  {currentQuestion.allowMultiple
                    ? 'ניתן לבחור יותר מתשובה אחת'
                    : g('בחרי תשובה אחת', 'בחר תשובה אחת')}
                </p>

                <div className="survey-answer-list">
                  {options.map((option) => {
                    const selected = isOptionSelected(questionIndex, option.id);
                    return (
                      <button
                        key={`q${currentQuestion.id}-opt${option.id}`}
                        type="button"
                        className={`survey-answer-option ${selected ? 'is-selected' : ''}`}
                        data-multiple={
                          currentQuestion.allowMultiple ? 'true' : 'false'
                        }
                        aria-pressed={selected}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleAnswer(
                            questionIndex,
                            option.id,
                            Boolean(currentQuestion.allowMultiple)
                          );
                        }}
                      >
                        <span className="survey-answer-indicator" aria-hidden="true">
                          {selected ? '✓' : ''}
                        </span>
                        <span className="survey-answer-text">{option.text}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="survey-sticky-footer">
          <button
            type="button"
            className="survey-btn survey-btn-secondary"
            disabled={questionIndex === 0}
            onClick={() => setQuestionIndex((i) => i - 1)}
          >
            הקודם
          </button>
          <button
            type="button"
            className="survey-btn survey-btn-primary"
            disabled={!canProceed || submitting}
            onClick={handleNext}
          >
            {submitting
              ? g('שולחת...', 'שולח...')
              : isLast
                ? 'שליחה'
                : 'הבא'}
          </button>
        </footer>
      </section>
    );
  }

  return null;
}
