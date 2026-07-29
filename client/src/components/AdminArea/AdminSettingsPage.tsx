import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import { getErrorMessage } from '../../Services/api';
import {
  getAdminSettings,
  updateAdminSettings,
  GlobalSettings,
} from '../../Services/adminService';
import './AdminSettingsPage.css';

export function AdminSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    (async () => {
      try {
        const settings = await getAdminSettings();
        setForm({
          ...settings,
          youthReferralBonus: settings.youthReferralBonus ?? 0,
          youthMaxAge: settings.youthMaxAge ?? 22,
        });
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate, showToast]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const saved = await updateAdminSettings({
        redemptionGoal: Number(form.redemptionGoal),
        signupBonus: Number(form.signupBonus),
        referralBonus: Number(form.referralBonus),
        youthReferralBonus: Number(form.youthReferralBonus),
        youthMaxAge: Number(form.youthMaxAge),
        defaultTimeLimitMinutes: Number(form.defaultTimeLimitMinutes),
        defaultMaxResponses: form.defaultMaxResponses
          ? Number(form.defaultMaxResponses)
          : null,
      });
      setForm(saved);
      showToast('ההגדרות נשמרו בהצלחה', 'success');
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <main className="admin-settings-shell">
        <div className="admin-settings-loading">טוען הגדרות...</div>
      </main>
    );
  }

  return (
    <main className="admin-settings-shell">
      <header className="admin-settings-header">
        <Link to="/admin" className="admin-back-link">
          ← חזרה לדשבורד
        </Link>
        <h1>הגדרות מערכת</h1>
        <p>כאן קובעים את כללי הפדיון והבונוסים לכל המערכת.</p>
      </header>

      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <label>
          <strong>יעד פדיון נקודות</strong>
          <span>מכמה נקודות העונה יכול להתחיל לפדות מתנה</span>
          <input
            type="number"
            min={1}
            value={form.redemptionGoal}
            onChange={(e) =>
              setForm({ ...form, redemptionGoal: Number(e.target.value) })
            }
          />
        </label>

        <label>
          <strong>בונוס הצטרפות</strong>
          <span>נקודות שניתנות לעונה חדש בעת אישור (0 = ללא)</span>
          <input
            type="number"
            min={0}
            value={form.signupBonus}
            onChange={(e) =>
              setForm({ ...form, signupBonus: Number(e.target.value) })
            }
          />
        </label>

        <label>
          <strong>בונוס חבר מביא חבר</strong>
          <span>נקודות למפנה כשהחבר מאושר (כל גיל). 0 = ללא</span>
          <input
            type="number"
            min={0}
            value={form.referralBonus}
            onChange={(e) =>
              setForm({ ...form, referralBonus: Number(e.target.value) })
            }
          />
        </label>

        <label>
          <strong>בונוס נוסף – חבר צעיר</strong>
          <span>
            נקודות נוספות למפנה כשהחבר שהביא הוא בגיל 18 עד הגיל המקסימלי
            למטה. מתווסף לבונוס הרגיל.
          </span>
          <input
            type="number"
            min={0}
            value={form.youthReferralBonus}
            onChange={(e) =>
              setForm({ ...form, youthReferralBonus: Number(e.target.value) })
            }
          />
        </label>

        <label>
          <strong>גיל מקסימלי לבונוס צעירים</strong>
          <span>למשל 22 = בונוס צעיר לגילאי 18–22 (כולל)</span>
          <input
            type="number"
            min={18}
            max={35}
            value={form.youthMaxAge}
            onChange={(e) =>
              setForm({ ...form, youthMaxAge: Number(e.target.value) })
            }
          />
        </label>

        <label>
          <strong>זמן מענה ברירת מחדל (דקות)</strong>
          <input
            type="number"
            min={1}
            max={120}
            value={form.defaultTimeLimitMinutes}
            onChange={(e) =>
              setForm({
                ...form,
                defaultTimeLimitMinutes: Number(e.target.value),
              })
            }
          />
        </label>

        <label>
          <strong>מכסת מענים ברירת מחדל</strong>
          <span>השאירי ריק ללא הגבלה</span>
          <input
            type="number"
            min={1}
            value={form.defaultMaxResponses ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                defaultMaxResponses: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
            placeholder="ללא הגבלה"
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? 'שומר...' : 'שמירת הגדרות'}
        </button>
      </form>
    </main>
  );
}
