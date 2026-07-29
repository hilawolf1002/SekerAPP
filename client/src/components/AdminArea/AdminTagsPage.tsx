import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import { getErrorMessage } from '../../Services/api';
import {
  getAdminTags,
  createAdminTag,
  deleteAdminTag,
  resyncDemographicTags,
  AudienceTag,
} from '../../Services/adminService';
import { AdminTopBar } from './AdminTopBar';
import { AdminEmptyState, AdminSkeleton } from './AdminUiShared';
import './AdminUiShared.css';
import './AdminTagsPage.css';

const TAG_PRESETS = [
  'תל אביב',
  'ירושלים',
  'גיל 18-24',
  'גיל 25-34',
  'גיל 35-44',
  'סטודנטים',
  'נשים',
  'גברים',
  'VIP',
];

export function AdminTagsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tags, setTags] = useState<AudienceTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    (async () => {
      try {
        setLoading(true);
        // סנכרון שקט לעונים ישנים — רישום חדש כבר מתויג אוטומטית
        await resyncDemographicTags().catch(() => undefined);
        setTags(await getAdminTags());
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate, showToast]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      showToast('שם התגית קצר מדי');
      return;
    }
    try {
      setCreating(true);
      await createAdminTag(trimmed);
      setName('');
      showToast('התגית נוצרה', 'success');
      setTags(await getAdminTags());
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(tag: AudienceTag) {
    if (
      !confirm(
        `למחוק את התגית "${tag.name}"?\nהשיוך יוסר מכל העונים שסומנו בה.`
      )
    ) {
      return;
    }
    try {
      setBusyId(tag.id);
      await deleteAdminTag(tag.id);
      showToast('התגית נמחקה', 'success');
      setTags(await getAdminTags());
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="admin-shell admin-tags-shell">
      <AdminTopBar title="תגיות קהל" subtitle="למי יופץ הסקר ב-SMS" />

      <div className="admin-page-body">
        <div className="admin-tags-info">
          <strong>איך זה עובד?</strong>
          <p>
            כשעונה נרשם — הוא משויך אוטומטית לפי עיר, גיל, מגדר, תעסוקה והשכלה.
            כאן רואים את הקהלים ויוצרים תגיות ידניות (למשל VIP). המספר ליד כל
            תגית = כמה עונים מאושרים יקבלו SMS אם תבחרי אותה בהפצה.
          </p>
        </div>

        <form className="admin-tags-create" onSubmit={handleCreate}>
          <h2>הוספת תגית</h2>
          <p className="admin-tags-presets-label">בחירה מהירה:</p>
          <div className="admin-tags-presets">
            {TAG_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="admin-tags-preset-btn"
                disabled={creating || tags.some((t) => t.name === preset)}
                onClick={() => setName(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="admin-tags-create-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='שם תגית, למשל "VIP"'
              maxLength={60}
              required
            />
            <button type="submit" disabled={creating}>
              {creating ? '…' : 'הוספה'}
            </button>
          </div>
        </form>

        <h2 className="admin-tags-list-title">הקהלים שלך</h2>
        {loading ? (
          <AdminSkeleton rows={3} />
        ) : tags.length === 0 ? (
          <AdminEmptyState
            title="עדיין אין תגיות"
            description="הוסיפי תגית למעלה — או המתיני שעונים יירשמו."
            icon="fa-tags"
          />
        ) : (
          <section className="admin-tags-list">
            {tags.map((tag) => (
              <article key={tag.id} className="admin-tag-card">
                <div className="admin-tag-info">
                  <strong>{tag.name}</strong>
                  <span>{tag.usersCount ?? 0} עונים מאושרים</span>
                </div>
                <button
                  type="button"
                  className="admin-tag-delete"
                  disabled={busyId === tag.id}
                  onClick={() => handleDelete(tag)}
                  aria-label={`מחיקת ${tag.name}`}
                >
                  מחיקה
                </button>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
