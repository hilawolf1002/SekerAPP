import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import { getErrorMessage } from '../../Services/api';
import { loginAdmin } from '../../Services/adminService';
import './AdminLoginPage.css';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!password.trim()) {
      showToast('יש להזין סיסמה');
      return;
    }

    setLoading(true);
    try {
      await loginAdmin(password);
      await refreshUser();
      showToast('התחברת בהצלחה למערכת הניהול', 'success');
      navigate('/admin');
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-shell">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <div className="admin-login-brand">
          <img src="/logo.png" alt="" />
          <span>SekerApp</span>
        </div>
        <h1>התחברות למערכת הניהול</h1>
        <p className="admin-login-subtitle">
          כניסה למנהלים בלבד - הזן סיסמת מנהל להמשך
        </p>

        <label>
          <span>סיסמת מנהל</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="הזן סיסמה"
            autoFocus
            disabled={loading}
          />
        </label>

        <button type="submit" disabled={loading} className="admin-login-submit">
          {loading ? 'מתחבר...' : 'כניסה למערכת'}
        </button>
      </form>
    </main>
  );
}
