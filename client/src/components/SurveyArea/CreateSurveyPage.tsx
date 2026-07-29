import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as surveyService from '../../Services/surveyService';
import { getAdminTags, AudienceTag } from '../../Services/adminService';
import { useToast } from '../../Context/ToastContext';
import { useAuth } from '../../Context/AuthContext';
import { useGender } from '../../Utils/useGender';
import type { QuestionType } from '../../Models/SurveyModel';
import './survey-shared.css';
import './CreateSurveyPage.css';

type QuestionDraft = {
  questionText: string;
  type: QuestionType;
  allowMultiple: boolean;
  answers: string[];
  maxLength: number;
};

const emptyQuestion = (): QuestionDraft => ({
  questionText: '',
  type: 'choice',
  allowMultiple: false,
  answers: ['', ''],
  maxLength: 500,
});

/** יצירת סקר – טופס מובייל עם בונה שאלות */
export function CreateSurveyPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const g = useGender();
  const canCreateRewarded = user?.role === 'ADMIN';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [isRewarded, setIsRewarded] = useState(false);
  const [rewardPoints, setRewardPoints] = useState(10);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(10);
  const [maxResponses, setMaxResponses] = useState('');
  const [thankYouMessage, setThankYouMessage] = useState('תודה על השתתפותך!');
  const [publish, setPublish] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /** אחרי יצירה מוצלחת – מסך הצלחה + הפצה (אדמין) */
  const [createdSurvey, setCreatedSurvey] = useState<{
    id: string;
    title: string;
    status: string;
  } | null>(null);
  const [invitePhones, setInvitePhones] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [inviteMode, setInviteMode] = useState<'phones' | 'tags'>('phones');
  const [audienceTags, setAudienceTags] = useState<AudienceTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (!createdSurvey || user?.role !== 'ADMIN') return;
    getAdminTags()
      .then(setAudienceTags)
      .catch(() => setAudienceTags([]));
  }, [createdSurvey, user?.role]);

  const updateQuestion = (index: number, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

  const updateAnswer = (qIndex: number, aIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const answers = [...q.answers];
        answers[aIndex] = value;
        return { ...q, answers };
      })
    );
  };

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const addAnswer = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, answers: [...q.answers, ''] } : q
      )
    );
  };

  const removeAnswer = (qIndex: number, aIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex || q.answers.length <= 2) return q;
        return { ...q, answers: q.answers.filter((_, j) => j !== aIndex) };
      })
    );
  };

  const isBlankQuestionDraft = (q: QuestionDraft): boolean => {
    if (q.questionText.trim()) return false;
    if (q.type === 'open_text') return true;
    return q.answers.every((a) => !a.trim());
  };

  const getFilledQuestions = (): QuestionDraft[] =>
    questions.filter((q) => !isBlankQuestionDraft(q));

  const validate = (filledQuestions: QuestionDraft[]): string | null => {
    if (title.trim().length < 2) return 'יש להזין כותרת לסקר';
    if (filledQuestions.length === 0) {
      return 'נדרשת לפחות שאלה אחת תקינה';
    }
    for (let i = 0; i < filledQuestions.length; i++) {
      const q = filledQuestions[i];
      if (!q.questionText.trim()) return `יש להזין טקסט לשאלה ${i + 1}`;
      if (q.type === 'choice') {
        const filled = q.answers.map((a) => a.trim()).filter(Boolean);
        if (filled.length < 2) return `לשאלה ${i + 1} נדרשות לפחות 2 תשובות`;
      }
    }
    if (isRewarded && !canCreateRewarded) {
      return 'יצירת סקר מתוגמל שמורה למנהלי המערכת';
    }
    if (isRewarded && rewardPoints < 1) return 'יש להגדיר נקודות לסקר מתוגמל';
    if (timeLimitMinutes < 1 || timeLimitMinutes > 120) {
      return 'זמן מענה חייב להיות בין 1 ל-120 דקות';
    }
    if (
      maxResponses &&
      (Number(maxResponses) < 1 || !Number.isFinite(Number(maxResponses)))
    ) {
      return 'מכסת מענים חייבת להיות מספר חיובי';
    }
    if (backgroundColor && !/^#[0-9A-Fa-f]{6}$/.test(backgroundColor)) {
      return 'צבע רקע חייב להיות בפורמט #RRGGBB';
    }
    return null;
  };

  const handleImagePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast('יש לבחור תמונה מסוג JPG, PNG או WEBP', 'error');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('גודל התמונה יכול להיות עד 5MB', 'error');
      event.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      const url = await surveyService.uploadSurveyImage(file);
      setImageUrl(url);
      setImageName(file.name);
      showToast('התמונה הועלתה', 'success');
    } catch (err) {
      showToast(surveyService.getErrorMessage(err), 'error');
      event.target.value = '';
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const filledQuestions = getFilledQuestions();
    const validationError = validate(filledQuestions);
    if (validationError) {
      setError(validationError);
      showToast(validationError, 'error');
      return;
    }

    // מסירים טיוטות ריקות מהמסך כדי שהרשימה תשקף את מה שנשמר
    if (filledQuestions.length !== questions.length) {
      setQuestions(filledQuestions);
    }

    setError('');
    setSubmitting(true);
    try {
      const survey = await surveyService.createSurvey({
        title: title.trim(),
        description: description.trim() || null,
        questions: filledQuestions.map((q) => {
          if (q.type === 'open_text') {
            return {
              questionText: q.questionText.trim(),
              type: 'open_text' as const,
              maxLength: q.maxLength,
            };
          }
          return {
            questionText: q.questionText.trim(),
            type: 'choice' as const,
            allowMultiple: q.allowMultiple,
            answers: q.answers.map((a) => a.trim()).filter(Boolean),
          };
        }),
        isRewarded: canCreateRewarded ? isRewarded : false,
        rewardPoints: canCreateRewarded && isRewarded ? rewardPoints : 0,
        timeLimitMinutes,
        maxResponses: maxResponses ? Number(maxResponses) : null,
        thankYouMessage: thankYouMessage.trim() || null,
        imageUrl,
        backgroundColor: backgroundColor || null,
        publish,
      });
      showToast(
        publish ? 'הסקר נוצר ופורסם' : 'הסקר נשמר כטיוטה',
        'success'
      );

      // אדמין + סקר פעיל → מסך הפצה; אחרת מעבר לסטטיסטיקות
      if (canCreateRewarded && publish) {
        setCreatedSurvey({
          id: survey.id,
          title: survey.title,
          status: survey.status,
        });
      } else {
        navigate(`/surveys/${survey.id}/stats`, { replace: true });
      }
    } catch (err) {
      const msg = surveyService.getErrorMessage(err);
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendInvites = async () => {
    if (!createdSurvey) return;

    setInviting(true);
    setInviteResult(null);
    try {
      let result: surveyService.InviteResult;
      if (inviteMode === 'tags') {
        if (selectedTagIds.length === 0) {
          showToast('יש לבחור לפחות תגית אחת', 'error');
          setInviting(false);
          return;
        }
        result = await surveyService.sendInvitations(createdSurvey.id, {
          mode: 'tags',
          tagIds: selectedTagIds,
        });
      } else {
        const phones = invitePhones
          .split(/[\n,;]+/)
          .map((p) => p.trim())
          .filter(Boolean);
        if (phones.length === 0) {
          showToast('יש להזין לפחות מספר טלפון אחד', 'error');
          setInviting(false);
          return;
        }
        result = await surveyService.sendInvitations(createdSurvey.id, {
          mode: 'phones',
          phones,
        });
      }

      const msg =
        `נשלחו ${result.sent} הזמנות` +
        (result.skipped ? `, דולגו ${result.skipped}` : '') +
        (result.failed ? `, נכשלו ${result.failed}` : '');
      setInviteResult(msg);
      showToast(msg, 'success');
      if (inviteMode === 'phones') setInvitePhones('');
    } catch (err) {
      showToast(surveyService.getErrorMessage(err), 'error');
    } finally {
      setInviting(false);
    }
  };

  if (createdSurvey) {
    return (
      <section className="survey-page">
        <header className="survey-topbar">
          <Link to="/admin" className="survey-back-btn" aria-label="חזרה">
            <i className="fas fa-arrow-right" aria-hidden="true" />
          </Link>
          <h1>הסקר מוכן</h1>
        </header>

        <div className="survey-content">
          <div className="survey-card create-success-card">
            <div className="create-success-icon" aria-hidden="true">✓</div>
            <h2>הסקר פורסם בהצלחה</h2>
            <p className="create-success-title">{createdSurvey.title}</p>
            <Link
              to={`/surveys/${createdSurvey.id}/stats`}
              className="create-success-link"
            >
              לצפייה בסטטיסטיקות
            </Link>
          </div>

          <div className="survey-card create-distribute-card">
            <h2 className="create-distribute-title">הפצה ב-SMS</h2>
            <p className="survey-hint">
              שלחו הזמנות לפי מספרי טלפון או לפי תגיות קהל. עונים מאושרים במערכת
              גם יראו את הסקר במסך ההזמנות.
            </p>

            <div className="create-invite-mode" role="tablist" aria-label="מצב הפצה">
              <button
                type="button"
                role="tab"
                aria-selected={inviteMode === 'phones'}
                className={
                  inviteMode === 'phones'
                    ? 'create-invite-mode-btn active'
                    : 'create-invite-mode-btn'
                }
                onClick={() => setInviteMode('phones')}
              >
                לפי טלפונים
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inviteMode === 'tags'}
                className={
                  inviteMode === 'tags'
                    ? 'create-invite-mode-btn active'
                    : 'create-invite-mode-btn'
                }
                onClick={() => setInviteMode('tags')}
              >
                לפי תגיות
              </button>
            </div>

            {inviteMode === 'phones' ? (
              <>
                <label className="survey-label" htmlFor="invite-phones">
                  רשימת טלפונים
                </label>
                <textarea
                  id="invite-phones"
                  className="survey-textarea create-phones-input"
                  value={invitePhones}
                  onChange={(e) => setInvitePhones(e.target.value)}
                  placeholder={'0501234567\n0529876543\n0541112233'}
                  rows={6}
                  inputMode="tel"
                  autoComplete="off"
                />
              </>
            ) : audienceTags.length === 0 ? (
              <p className="create-distribute-note">
                אין תגיות עדיין.{' '}
                <Link to="/admin/tags">צרו תגיות באדמין</Link> ושייכו אותן
                למשתמשים.
              </p>
            ) : (
              <div className="create-tags-picker">
                <span className="survey-label">בחרו תגיות קהל</span>
                <div className="create-tags-list">
                  {audienceTags.map((tag) => {
                    const checked = selectedTagIds.includes(tag.id);
                    return (
                      <label key={tag.id} className="create-tag-option">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedTagIds((prev) =>
                              checked
                                ? prev.filter((id) => id !== tag.id)
                                : [...prev, tag.id]
                            )
                          }
                        />
                        <span>
                          {tag.name}
                          {typeof tag.usersCount === 'number'
                            ? ` (${tag.usersCount})`
                            : ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {inviteResult && (
              <div className="create-invite-result" role="status">
                {inviteResult}
              </div>
            )}

            <button
              type="button"
              className="survey-btn survey-btn-primary"
              onClick={handleSendInvites}
              disabled={
                inviting ||
                (inviteMode === 'tags' && audienceTags.length === 0)
              }
              style={{ width: '100%', minHeight: 48 }}
            >
              {inviting ? 'שולח הזמנות…' : 'שליחת הזמנות'}
            </button>

            <button
              type="button"
              className="survey-btn survey-btn-ghost"
              onClick={() =>
                navigate(`/surveys/${createdSurvey.id}/stats`, { replace: true })
              }
              style={{ width: '100%', minHeight: 44 }}
            >
              דילוג / סיום
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="survey-page">
      <header className="survey-topbar">
        <Link
          to={canCreateRewarded ? '/admin' : '/surveys'}
          className="survey-back-btn"
          aria-label="חזרה"
        >
          <i className="fas fa-arrow-right" aria-hidden="true" />
        </Link>
        <h1>סקר חדש</h1>
      </header>

      <form className="survey-content" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="survey-alert survey-alert-error" role="alert">
            {error}
          </div>
        )}

        <div className="survey-card">
          <div className="survey-field">
            <label className="survey-label" htmlFor="title">
              כותרת הסקר *
            </label>
            <input
              id="title"
              className="survey-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="למשל: סקר שביעות רצון"
              required
            />
          </div>

          <div className="survey-field">
            <label className="survey-label" htmlFor="description">
              תיאור (אופציונלי)
            </label>
            <textarea
              id="description"
              className="survey-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="הסבר קצר על מטרת הסקר"
            />
          </div>
        </div>

        <div className="survey-card">
          <h2 className="survey-section-title">שאלות</h2>
          <p className="survey-hint">
            {g(
              'בחרי סוג שאלה: בחירה או תשובה חופשית.',
              'בחר סוג שאלה: בחירה או תשובה חופשית.'
            )}
          </p>

          {questions.map((q, qIndex) => (
            <div key={qIndex} className="survey-question-block">
              <div className="survey-question-block-header">
                <strong>
                  שאלה {qIndex + 1}
                </strong>
                {questions.length > 1 && (
                  <button
                    type="button"
                    className="survey-icon-btn danger"
                    onClick={() => removeQuestion(qIndex)}
                    aria-label={`מחיקת שאלה ${qIndex + 1}`}
                  >
                    <i className="fas fa-trash" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="survey-field">
                <label className="survey-label">טקסט השאלה</label>
                <input
                  className="survey-input"
                  value={q.questionText}
                  onChange={(e) =>
                    updateQuestion(qIndex, { questionText: e.target.value })
                  }
                  placeholder="מה השאלה שלך?"
                />
              </div>

              <div className="survey-field">
                <span className="survey-label">סוג שאלה</span>
                <div className="survey-toggle-row">
                  <button
                    type="button"
                    className={`survey-toggle-option ${q.type === 'choice' ? 'selected' : ''}`}
                    onClick={() => updateQuestion(qIndex, { type: 'choice' })}
                  >
                    <i className="fas fa-list-ul" aria-hidden="true" /> בחירה
                  </button>
                  <button
                    type="button"
                    className={`survey-toggle-option ${q.type === 'open_text' ? 'selected' : ''}`}
                    onClick={() => updateQuestion(qIndex, { type: 'open_text' })}
                  >
                    <i className="fas fa-pen" aria-hidden="true" /> תשובה חופשית
                  </button>
                </div>
                <p className="survey-hint">
                  {q.type === 'choice'
                    ? 'המשיב בוחר מתוך האפשרויות שהגדרת'
                    : 'המשיב כותב תשובה בטקסט חופשי'}
                </p>
              </div>

              {q.type === 'choice' && (
                <>
                  <div className="survey-field">
                    <span className="survey-label">סוג בחירה</span>
                    <div className="survey-toggle-row">
                      <button
                        type="button"
                        className={`survey-toggle-option ${!q.allowMultiple ? 'selected' : ''}`}
                        onClick={() =>
                          updateQuestion(qIndex, { allowMultiple: false })
                        }
                      >
                        בחירה אחת
                      </button>
                      <button
                        type="button"
                        className={`survey-toggle-option ${q.allowMultiple ? 'selected' : ''}`}
                        onClick={() =>
                          updateQuestion(qIndex, { allowMultiple: true })
                        }
                      >
                        בחירה מרובה
                      </button>
                    </div>
                  </div>

                  <div className="survey-field">
                    <span className="survey-label">תשובות</span>
                    {q.answers.map((answer, aIndex) => (
                      <div key={aIndex} className="survey-answer-row">
                        <input
                          className="survey-input"
                          value={answer}
                          onChange={(e) =>
                            updateAnswer(qIndex, aIndex, e.target.value)
                          }
                          placeholder={`תשובה ${aIndex + 1}`}
                        />
                        {q.answers.length > 2 && (
                          <button
                            type="button"
                            className="survey-icon-btn danger"
                            onClick={() => removeAnswer(qIndex, aIndex)}
                            aria-label="מחיקת תשובה"
                          >
                            <i className="fas fa-times" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="survey-btn survey-btn-ghost"
                      onClick={() => addAnswer(qIndex)}
                    >
                      <i className="fas fa-plus" aria-hidden="true" /> הוספת תשובה
                    </button>
                  </div>
                </>
              )}

              {q.type === 'open_text' && (
                <div className="survey-field">
                  <label className="survey-label" htmlFor={`maxLen-${qIndex}`}>
                    מקסימום תווים לתשובה
                  </label>
                  <input
                    id={`maxLen-${qIndex}`}
                    type="number"
                    min={10}
                    max={2000}
                    className="survey-input"
                    value={q.maxLength}
                    onChange={(e) =>
                      updateQuestion(qIndex, {
                        maxLength: Number(e.target.value),
                      })
                    }
                  />
                  <p className="survey-hint">ברירת מחדל: 500 תווים</p>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            className="survey-btn survey-btn-secondary"
            onClick={addQuestion}
          >
            <i className="fas fa-plus" aria-hidden="true" /> הוספת שאלה
          </button>
        </div>

        <div className="survey-card">
          <h2 className="survey-section-title">הגדרות</h2>

          {canCreateRewarded ? (
            <>
              <div className="survey-field">
                <span className="survey-label">סוג סקר</span>
                <div className="survey-toggle-row">
                  <button
                    type="button"
                    className={`survey-toggle-option ${!isRewarded ? 'selected' : ''}`}
                    onClick={() => setIsRewarded(false)}
                  >
                    רגיל
                  </button>
                  <button
                    type="button"
                    className={`survey-toggle-option ${isRewarded ? 'selected' : ''}`}
                    onClick={() => setIsRewarded(true)}
                  >
                    מתוגמל
                  </button>
                </div>
                <p className="survey-hint">
                  סקר מתוגמל מעניק נקודות לעונים מאושרים. רק מנהל יכול ליצור סוג זה.
                </p>
              </div>

              {isRewarded && (
                <div className="survey-field">
                  <label className="survey-label" htmlFor="rewardPoints">
                    נקודות למענה
                  </label>
                  <input
                    id="rewardPoints"
                    type="number"
                    min={1}
                    max={100000}
                    className="survey-input"
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(Number(e.target.value))}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="survey-field">
              <span className="survey-label">סוג סקר</span>
              <p className="survey-hint">
                זהו סקר רגיל ללא נקודות. סקרים מתוגמלים נוצרים על ידי מנהל המערכת בלבד.
              </p>
            </div>
          )}

          <div className="survey-field">
            <label className="survey-label" htmlFor="timeLimit">
              זמן מענה (דקות)
            </label>
            <input
              id="timeLimit"
              type="number"
              min={1}
              max={120}
              className="survey-input"
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
            />
            <p className="survey-hint">
              ברירת מחדל: 10 דקות. הטיימר מתחיל בלחיצה על "התחלה".
            </p>
          </div>

          <div className="survey-field">
            <label className="survey-label" htmlFor="maxResponses">
              מכסת מענים (ריק = ללא הגבלה)
            </label>
            <input
              id="maxResponses"
              type="number"
              min={1}
              className="survey-input"
              value={maxResponses}
              onChange={(e) => setMaxResponses(e.target.value)}
              placeholder="למשל 100"
            />
          </div>

          <div className="survey-field">
            <label className="survey-label" htmlFor="thankYou">
              הודעת תודה
            </label>
            <input
              id="thankYou"
              className="survey-input"
              value={thankYouMessage}
              onChange={(e) => setThankYouMessage(e.target.value)}
            />
          </div>

          <div className="survey-field">
            <label className="survey-label" htmlFor="surveyImage">
              תמונה לסקר (אופציונלי)
            </label>
            <input
              id="surveyImage"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="survey-input"
              onChange={handleImagePick}
              disabled={uploadingImage || submitting}
            />
            <p className="survey-hint">
              JPG / PNG / WEBP · עד 5MB. התמונה נשמרת בשרת ומוצגת למענים.
            </p>
            {uploadingImage && <p className="survey-hint">מעלה תמונה…</p>}
            {imageUrl && (
              <div className="survey-image-preview">
                <img src={imageUrl} alt="תצוגה מקדימה של תמונת הסקר" />
                <button
                  type="button"
                  className="survey-btn survey-btn-secondary"
                  onClick={() => {
                    setImageUrl(null);
                    setImageName('');
                  }}
                >
                  הסרת תמונה
                  {imageName ? ` (${imageName})` : ''}
                </button>
              </div>
            )}
          </div>

          <div className="survey-field">
            <label className="survey-label" htmlFor="backgroundColor">
              צבע רקע (אופציונלי)
            </label>
            <div className="survey-color-row">
              <input
                id="backgroundColor"
                type="color"
                value={backgroundColor || '#f8fafc'}
                onChange={(e) => setBackgroundColor(e.target.value)}
                aria-label="בחירת צבע רקע"
              />
              <input
                className="survey-input"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="#f8fafc"
                maxLength={7}
              />
              {backgroundColor && (
                <button
                  type="button"
                  className="survey-btn survey-btn-secondary"
                  onClick={() => setBackgroundColor('')}
                >
                  איפוס
                </button>
              )}
            </div>
          </div>

          <div className="survey-field">
            <label className="survey-label">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                style={{ marginLeft: '0.5rem' }}
              />
              פרסום מיידי (פתוח למענה)
            </label>
            <p className="survey-hint">
              אם לא מסומן – הסקר נשמר כטיוטה ולא ניתן לענות עליו.
            </p>
          </div>
        </div>

        <div className="survey-fab-row">
          <button
            type="submit"
            className="survey-btn survey-btn-primary"
            disabled={submitting}
          >
            {submitting
              ? g('שומרת...', 'שומר...')
              : publish
                ? 'יצירה ופרסום'
                : 'שמירה כטיוטה'}
          </button>
        </div>
      </form>
    </section>
  );
}
