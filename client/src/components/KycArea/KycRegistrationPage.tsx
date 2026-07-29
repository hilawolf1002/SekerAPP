import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import { getErrorMessage } from '../../Services/api';
import {
  applyForKyc,
  type KycFormData,
} from '../../Services/kycService';
import './KycRegistrationPage.css';

const initialForm: KycFormData = {
  fullName: '',
  dateOfBirth: '',
  gender: 'prefer_not_to_say',
  city: '',
  employmentStatus: 'employee',
  education: 'high_school',
  consent: false,
  arrivedViaFriend: false,
  referrerPhone: '',
};

function dateYearsAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
}

export function KycRegistrationPage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<KycFormData>(() => ({
    ...initialForm,
    fullName: user?.name || '',
  }));
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(
    user?.status === 'PENDING_APPROVAL'
  );

  const maxBirthDate = useMemo(() => dateYearsAgo(18), []);
  const minBirthDate = useMemo(() => dateYearsAgo(120), []);

  if (completed || user?.status === 'PENDING_APPROVAL') {
    return <PendingApproval />;
  }

  if (user?.status === 'APPROVED') {
    return (
      <main className="kyc-shell">
        <section className="kyc-status-card">
          <div className="kyc-status-icon approved" aria-hidden="true">✓</div>
          <p className="kyc-eyebrow">החשבון שלך פעיל</p>
          <h1>כבר אושרת לפאנל העונים</h1>
          <p>הפרופיל שלך מאומת ואין צורך למלא שוב את השאלון.</p>
          <Link to="/home" className="kyc-primary-action">חזרה לדף הבית</Link>
        </section>
      </main>
    );
  }

  const update =
    <K extends keyof KycFormData>(key: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value =
        event.target instanceof HTMLInputElement &&
        event.target.type === 'checkbox'
          ? event.target.checked
          : event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
    };

  function moveToNextStep() {
    if (step === 1) {
      if (form.fullName.trim().length < 2 || !form.dateOfBirth || !form.city.trim()) {
        showToast('יש למלא שם מלא, תאריך לידה ועיר מגורים');
        return;
      }
      if (form.dateOfBirth > maxBirthDate) {
        showToast('ההצטרפות לפאנל מיועדת לבני ובנות 18 ומעלה');
        return;
      }
    }
    setStep(2);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.consent) {
      showToast('יש לאשר שהפרטים שמסרת נכונים');
      return;
    }
    if (form.arrivedViaFriend) {
      const phone = form.referrerPhone.replace(/[\s\-()]/g, '');
      if (!/^05\d{8}$/.test(phone) && !/^9725\d{8}$/.test(phone) && !/^\+9725\d{8}$/.test(phone)) {
        showToast('יש להזין מספר נייד תקין של החבר שהזמין אותך');
        return;
      }
    }

    setSubmitting(true);
    try {
      await applyForKyc(form);
      await refreshUser();
      setCompleted(true);
      showToast('הבקשה נשלחה בהצלחה', 'success');
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="kyc-shell">
      <section className="kyc-card">
        <header className="kyc-header">
          <Link to="/home" className="kyc-back-link" aria-label="חזרה לדף הבית">
            <span aria-hidden="true">→</span>
            חזרה
          </Link>
          <div className="kyc-brand">
            <img src="/logo.png" alt="" />
            <span>SekerApp</span>
          </div>
          <p className="kyc-eyebrow">הצטרפות לפאנל העונים המתוגמל</p>
          <h1>כמה פרטים, ומתחילים להרוויח</h1>
          <p>
            הפרטים עוזרים לנו להתאים לך סקרים בתשלום ולהעניק לך נקודות.
            התהליך קצר – בלי העלאת מסמכים בשלב זה.
          </p>
        </header>

        {user?.status === 'REJECTED' && (
          <div className="kyc-rejected-note" role="status">
            אפשר לעדכן את הפרטים ולהגיש בקשה חדשה לבדיקה.
          </div>
        )}

        <ol className="kyc-progress" aria-label={`שלב ${step} מתוך 2`}>
          {[1, 2].map((number) => (
            <li
              key={number}
              className={number === step ? 'active' : number < step ? 'done' : ''}
            >
              <span>{number < step ? '✓' : number}</span>
              <small>{number === 1 ? 'פרטים' : 'פרופיל'}</small>
            </li>
          ))}
        </ol>

        <form onSubmit={submit}>
          {step === 1 && (
            <fieldset className="kyc-step">
              <legend>נתחיל בפרטים הבסיסיים</legend>
              <p className="kyc-step-hint">כל השדות בשלב זה הם חובה.</p>
              <label>
                שם מלא
                <input
                  value={form.fullName}
                  onChange={update('fullName')}
                  autoComplete="name"
                  maxLength={100}
                  placeholder="שם פרטי ומשפחה"
                />
              </label>
              <div className="kyc-field-grid">
                <label>
                  תאריך לידה
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={update('dateOfBirth')}
                    min={minBirthDate}
                    max={maxBirthDate}
                  />
                  <small>ההצטרפות מגיל 18 בלבד</small>
                </label>
                <label>
                  עיר מגורים
                  <input
                    value={form.city}
                    onChange={update('city')}
                    autoComplete="address-level2"
                    maxLength={80}
                    placeholder="לדוגמה: ירושלים"
                  />
                </label>
              </div>
              <label>
                מגדר
                <select value={form.gender} onChange={update('gender')}>
                  <option value="female">אישה</option>
                  <option value="male">גבר</option>
                  <option value="other">אחר</option>
                  <option value="prefer_not_to_say">מעדיפ/ה לא לציין</option>
                </select>
              </label>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset className="kyc-step">
              <legend>קצת על הרקע שלך</legend>
              <p className="kyc-step-hint">
                המידע משמש להתאמת סקרים בלבד ולא משפיע על עצם האישור.
              </p>
              <label>
                מצב תעסוקתי
                <select
                  value={form.employmentStatus}
                  onChange={update('employmentStatus')}
                >
                  <option value="employee">שכיר/ה</option>
                  <option value="self_employed">עצמאי/ת</option>
                  <option value="student">סטודנט/ית</option>
                  <option value="not_working">לא עובד/ת כרגע</option>
                  <option value="retired">גמלאי/ת</option>
                  <option value="other">אחר</option>
                </select>
              </label>
              <label>
                רמת השכלה
                <select value={form.education} onChange={update('education')}>
                  <option value="high_school">תיכונית</option>
                  <option value="professional">מקצועית / תעודה</option>
                  <option value="academic">אקדמית</option>
                  <option value="student">בלימודים כרגע</option>
                  <option value="other">אחר</option>
                </select>
              </label>

              <div className="kyc-referral-box">
                <label className="kyc-consent">
                  <input
                    type="checkbox"
                    checked={form.arrivedViaFriend}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        arrivedViaFriend: e.target.checked,
                        referrerPhone: e.target.checked
                          ? current.referrerPhone
                          : '',
                      }))
                    }
                  />
                  <span>הגעתי דרך חבר</span>
                </label>
                {form.arrivedViaFriend && (
                  <label className="kyc-referral-phone">
                    מספר הטלפון של החבר
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={form.referrerPhone}
                      onChange={update('referrerPhone')}
                      placeholder="0501234567"
                      maxLength={15}
                    />
                    <small>
                      אם החבר רשום במערכת, הוא יקבל בונוס נקודות כשהחשבון שלך
                      יאושר.
                    </small>
                  </label>
                )}
              </div>

              <div className="kyc-privacy-note">
                <span aria-hidden="true">◎</span>
                <div>
                  <strong>למה אנחנו שואלים?</strong>
                  <p>כדי לשלוח אליך רק סקרים שמתאימים לפרופיל שלך.</p>
                </div>
              </div>
              <label className="kyc-consent">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={update('consent')}
                />
                <span>
                  אני מאשר/ת שהפרטים שמסרתי נכונים ושאני בן/בת 18 ומעלה.
                </span>
              </label>
            </fieldset>
          )}

          <div className="kyc-navigation">
            {step > 1 && (
              <button
                type="button"
                className="kyc-secondary-action"
                onClick={() => setStep(1)}
              >
                הקודם
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                className="kyc-primary-action"
                onClick={moveToNextStep}
              >
                ממשיכים
              </button>
            ) : (
              <button
                type="submit"
                className="kyc-primary-action"
                disabled={submitting}
              >
                {submitting ? 'שולחים לבדיקה…' : 'שליחת הבקשה'}
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}

function PendingApproval() {
  return (
    <main className="kyc-shell">
      <section className="kyc-status-card">
        <div className="kyc-status-icon pending" aria-hidden="true">⌛</div>
        <p className="kyc-eyebrow">הבקשה התקבלה</p>
        <h1>הפרטים שלך ממתינים לבדיקה</h1>
        <p>
          מנהל המערכת יעבור על הבקשה באופן ידני. ברגע שהחשבון יאושר,
          תישלח אליך הודעת SMS למספר שאיתו נרשמת.
        </p>
        <div className="kyc-next-box">
          <strong>מה קורה עכשיו?</strong>
          <span>אין צורך לשלוח שוב. נעדכן אותך לאחר סיום הבדיקה.</span>
        </div>
        <Link to="/home" className="kyc-primary-action">חזרה לדף הבית</Link>
      </section>
    </main>
  );
}
