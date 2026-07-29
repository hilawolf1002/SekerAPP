import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import * as authService from '../../Services/authService';
import { formatPhoneValidationError, normalizeIsraeliPhone } from '../../Utils/phoneValidation';
import './LoginPage.css';

type Step = 'phone' | 'code';

/**
 * מסך התחברות OTP – מותאם למובייל, עיצוב לפי הגרסה הישנה של SekerApp.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, setUser } = useAuth();
  const { showToast } = useToast();

  const redirectTo =
    (location.state as { from?: string } | null)?.from || '/home';

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const dest =
        user.role === 'ADMIN' && user.id === 'admin' && redirectTo === '/home'
          ? '/admin'
          : redirectTo;
      navigate(dest, { replace: true });
    }
  }, [loading, user, navigate, redirectTo]);

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setInfo('');

    const phoneError = formatPhoneValidationError(phone);
    if (phoneError) {
      setError(phoneError);
      showToast(phoneError, 'error');
      return;
    }

    const normalizedPhone = normalizeIsraeliPhone(phone.trim());
    setSubmitting(true);
    try {
      const result = await authService.requestOtp(normalizedPhone);

      if (result.bypassLogin && result.user) {
        setUser(result.user);
        navigate(redirectTo, { replace: true });
        return;
      }

      setInfo(result.message);
      if (result.devCode) setDevCode(result.devCode);
      setPhone(normalizedPhone);
      setStep('code');
      setCode('');
    } catch (err) {
      const msg = authService.getErrorMessage(err);
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(code.trim())) {
      const msg = 'קוד האימות חייב להכיל 6 ספרות';
      setError(msg);
      showToast(msg, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await authService.verifyOtp(phone.trim(), code.trim());
      setUser(result.user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = authService.getErrorMessage(err);
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToPhone = () => {
    setStep('phone');
    setCode('');
    setDevCode(null);
    setError('');
    setInfo('');
  };

  if (loading) {
    return (
      <div className="auth-loading" role="status">
        טוען...
      </div>
    );
  }

  return (
    <section className="login-page" aria-label="התחברות">
      <div className="floating-orbs" aria-hidden="true">
        <div className="orb" />
        <div className="orb" />
        <div className="orb" />
      </div>

      <div className="login-container">
        <div className="login-header">
          <div className="logo">
            <img src="/logo.png" alt="" />
            <span>SekerApp</span>
          </div>
          <h1 className="header-title">היי, טוב שבאת</h1>
          <p className="header-subtitle">
            כניסה עם קוד לנייד — בלי סיסמה לזכור
          </p>
        </div>

        {step === 'phone' ? (
          <form className="login-form" onSubmit={handleRequestOtp} noValidate>
            <p className="form-hint">
              הזינו מספר נייד ישראלי ונשלח אליכם קוד ב-SMS.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                מספר נייד
              </label>
              <div className="input-icon">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className="form-input"
                  placeholder="0501234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoFocus
                />
                <i className="fas fa-mobile-alt" aria-hidden="true" />
              </div>
            </div>

            {error && (
              <div className="form-alert form-alert-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'שולחים…' : 'שליחת קוד'}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleVerifyOtp} noValidate>
            <p className="form-hint">
              הקוד נשלח ל־<strong>{phone}</strong>. תוקף כ־5 דקות.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="code">
                קוד אימות (6 ספרות)
              </label>
              <div className="input-icon">
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="form-input form-input-code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  autoFocus
                />
                <i className="fas fa-key" aria-hidden="true" />
              </div>
            </div>

            {devCode && (
              <div className="form-alert form-alert-dev" role="status">
                מצב פיתוח – הקוד הוא: <strong>{devCode}</strong>
              </div>
            )}

            {info && !devCode && (
              <div className="form-alert form-alert-info" role="status">
                {info}
              </div>
            )}

            {error && (
              <div className="form-alert form-alert-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={submitting || code.length !== 6}
            >
              {submitting ? 'מאמתים…' : 'כניסה'}
            </button>

            <button type="button" className="link-button change-phone" onClick={goBackToPhone}>
              מספר אחר / שליחה מחדש
            </button>
          </form>
        )}

        <div className="register-link">
          מאובטח · בלי סיסמה
        </div>
      </div>
    </section>
  );
}
