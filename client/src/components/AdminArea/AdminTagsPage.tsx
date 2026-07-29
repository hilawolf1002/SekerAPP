import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import { getErrorMessage } from '../../Services/api';
import {
  getAdminTags,
  createAdminTag,
  deleteAdminTag,
  AudienceTag,
} from '../../Services/adminService';
import './AdminTagsPage.css';

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
    loadTags();
  }, [user, navigate]);

  async function loadTags() {
    try {
      setLoading(true);
      setTags(await getAdminTags());
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

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
      await loadTags();
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
      await loadTags();
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="admin-tags-shell">
      <header className="admin-tags-header">
        <Link to="/admin" className="admin-back-link">
          ← חזרה לדשבורד
        </Link>
        <h1>תגיות קהל</h1>
        <p>
          תגיות חופשיות להגדרת קהלים (עיר, גיל, תחום עניין וכו׳). אחר כך משייכים
          אותן למשתמשים ומפיצים סקרים לפי תגית.
        </p>
      </header>

      <form className="admin-tags-create" onSubmit={handleCreate}>
        <h2>תגית חדשה</h2>
        <div className="admin-tags-create-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='לדוגמה: "תל אביב", "גיל 25-34", "VIP"'
            maxLength={60}
            required
          />
          <button type="submit" disabled={creating}>
            {creating ? 'יוצר…' : 'הוספה'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="admin-tags-loading">טוען תגיות...</div>
      ) : tags.length === 0 ? (
        <div className="admin-tags-empty">עדיין אין תגיות — צרו את הראשונה למעלה</div>
      ) : (
        <section className="admin-tags-list">
          {tags.map((tag) => (
            <article key={tag.id} className="admin-tag-card">
              <div className="admin-tag-info">
                <strong>{tag.name}</strong>
                <span>
                  {tag.usersCount ?? 0} עונים · {tag.surveysCount ?? 0} סקרים
                </span>
              </div>
              <button
                type="button"
                className="admin-tag-delete"
                disabled={busyId === tag.id}
                onClick={() => handleDelete(tag)}
              >
                מחיקה
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
