import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import * as authService from '../../Services/authService';
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
    setSubmitting(true);
    try {
      const result = await authService.requestOtp(phone.trim());

      if (result.bypassLogin && result.user) {
        setUser(result.user);
        navigate(redirectTo, { replace: true });
        return;
      }

      setInfo(result.message);
      if (result.devCode) setDevCode(result.devCode);
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
        <Link to="/" className="back-home" aria-label="חזרה לדף הבית">
          <i className="fas fa-arrow-right" aria-hidden="true" />
        </Link>

        <div className="login-header">
          <div className="logo">
            <img src="/logo.png" alt="" />
            <span>SekerApp</span>
          </div>
          <h1 className="header-title">ברוך שובך!</h1>
          <p className="header-subtitle">
            התחבר לחשבון שלך עם קוד חד-פעמי לנייד
          </p>
        </div>

        {step === 'phone' ? (
          <form className="login-form" onSubmit={handleRequestOtp} noValidate>
            <p className="form-hint">
              הזינו מספר נייד ישראלי. נשלח אליכם קוד ב-SMS להתחברות.
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
              {submitting ? 'שולח...' : 'שלחו לי קוד'}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleVerifyOtp} noValidate>
            <p className="form-hint">
              נשלח קוד ל־<strong>{phone}</strong>. הזינו אותו כאן (תוקף כ־5 דקות).
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="code">
                קוד אימות
              </label>
              <div className="input-icon">
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="form-input form-input-code"
                  placeholder="6 ספרות"
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
              {submitting ? 'מאמת...' : 'התחברות'}
            </button>

            <button type="button" className="link-button change-phone" onClick={goBackToPhone}>
              שינוי מספר / שליחה מחדש
            </button>
          </form>
        )}

        <div className="register-link">
          כניסה מאובטחת · בלי סיסמה לזכור
        </div>
      </div>
    </section>
  );
}
