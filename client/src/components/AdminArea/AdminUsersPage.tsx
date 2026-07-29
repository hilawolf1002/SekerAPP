import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import { getErrorMessage } from '../../Services/api';
import {
  getAllUsers,
  setUserStatus,
  getAdminTags,
  setUserTags,
  UserListItem,
  AudienceTag,
} from '../../Services/adminService';
import { PaginationBar } from '../LayoutArea/PaginationBar';
import './AdminUsersPage.css';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<AudienceTag[]>([]);
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [draftTagIds, setDraftTagIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    setPage(1);
    loadUsers(1);
    loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, statusFilter]);

  async function loadTags() {
    try {
      setAllTags(await getAdminTags());
    } catch {
      /* non-blocking */
    }
  }

  async function loadUsers(nextPage = page) {
    try {
      setLoading(true);
      const data = await getAllUsers({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        page: nextPage,
        take: PAGE_SIZE,
      });
      setUsers(data.users);
      setTotal(data.total);
      setPage(nextPage);
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadUsers(1);
  }

  async function changeStatus(userId: string, status: string, label: string) {
    const reason =
      status === 'BLOCKED' || status === 'REJECTED'
        ? prompt(`סיבה ל${label} (אופציונלי):`) ?? undefined
        : undefined;
    if (
      (status === 'BLOCKED' || status === 'REJECTED') &&
      reason === undefined &&
      !confirm(`להמשיך ב${label} בלי סיבה?`)
    ) {
      return;
    }
    if (!confirm(`האם לבצע: ${label}?`)) return;

    try {
      setBusyId(userId);
      await setUserStatus(userId, status, reason || undefined);
      showToast(`הסטטוס עודכן ל-${label}`, 'success');
      await loadUsers(page);
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  function openTagEditor(u: UserListItem) {
    setEditingTagsFor(u.id);
    setDraftTagIds((u.tags || []).map((t) => t.id));
  }

  function toggleDraftTag(tagId: string) {
    setDraftTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function saveUserTags(userId: string) {
    try {
      setBusyId(userId);
      const tags = await setUserTags(userId, draftTagIds);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, tags } : u))
      );
      setEditingTagsFor(null);
      showToast('התגיות עודכנו', 'success');
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="admin-users-shell">
      <header className="admin-users-header">
        <Link to="/admin" className="admin-back-link">
          ← חזרה לדשבורד
        </Link>
        <h1>כל המשתמשים</h1>
        <p>
          סה"כ: {total}
          {allTags.length === 0 && (
            <>
              {' · '}
              <Link to="/admin/tags">צרו תגיות קהל</Link> כדי לשייך עונים
            </>
          )}
        </p>

        <form onSubmit={handleSearch} className="admin-search-bar">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי טלפון, שם או מייל..."
          />
          <button type="submit">חיפוש</button>
        </form>

        <div className="admin-filter-row">
          <label>
            <span>סינון לפי סטטוס:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">הכל</option>
              <option value="NEW">חדש</option>
              <option value="PENDING_APPROVAL">ממתין לאישור</option>
              <option value="APPROVED">מאושר</option>
              <option value="REJECTED">נדחה</option>
              <option value="BLOCKED">חסום</option>
            </select>
          </label>
        </div>
      </header>

      {loading ? (
        <div className="admin-users-loading">טוען משתמשים...</div>
      ) : users.length === 0 ? (
        <div className="admin-users-empty">לא נמצאו משתמשים</div>
      ) : (
        <section className="admin-users-list">
          {users.map((u) => (
            <article key={u.id} className="admin-user-card">
              <div className="admin-user-header">
                <div>
                  <strong>{u.name || 'ללא שם'}</strong>
                  <span className="admin-user-phone">{u.phone}</span>
                  {u.email && <span className="admin-user-email">{u.email}</span>}
                </div>
                <span
                  className={`admin-status-badge status-${u.status.toLowerCase()}`}
                >
                  {statusLabel(u.status)}
                </span>
              </div>
              <div className="admin-user-meta">
                <span>תפקיד: {u.role === 'ADMIN' ? 'מנהל' : 'משתמש'}</span>
                <span>
                  הצטרף: {new Date(u.createdAt).toLocaleDateString('he-IL')}
                </span>
              </div>

              <div className="admin-user-tags">
                {(u.tags || []).length === 0 ? (
                  <span className="admin-user-tags-empty">ללא תגיות</span>
                ) : (
                  (u.tags || []).map((t) => (
                    <span key={t.id} className="admin-user-tag-chip">
                      {t.name}
                    </span>
                  ))
                )}
                {allTags.length > 0 && (
                  <button
                    type="button"
                    className="admin-user-tags-edit"
                    disabled={busyId === u.id}
                    onClick={() =>
                      editingTagsFor === u.id
                        ? setEditingTagsFor(null)
                        : openTagEditor(u)
                    }
                  >
                    {editingTagsFor === u.id ? 'ביטול' : 'עריכת תגיות'}
                  </button>
                )}
              </div>

              {editingTagsFor === u.id && (
                <div className="admin-user-tags-editor">
                  {allTags.map((tag) => (
                    <label key={tag.id} className="admin-user-tag-option">
                      <input
                        type="checkbox"
                        checked={draftTagIds.includes(tag.id)}
                        onChange={() => toggleDraftTag(tag.id)}
                      />
                      <span>{tag.name}</span>
                    </label>
                  ))}
                  <button
                    type="button"
                    className="admin-user-tags-save"
                    disabled={busyId === u.id}
                    onClick={() => saveUserTags(u.id)}
                  >
                    שמירת תגיות
                  </button>
                </div>
              )}

              <div className="admin-user-actions">
                {u.status !== 'APPROVED' && (
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => changeStatus(u.id, 'APPROVED', 'אישור')}
                  >
                    אישור
                  </button>
                )}
                {u.status !== 'BLOCKED' && (
                  <button
                    type="button"
                    className="danger"
                    disabled={busyId === u.id}
                    onClick={() => changeStatus(u.id, 'BLOCKED', 'חסימה')}
                  >
                    חסימה
                  </button>
                )}
                {u.status === 'BLOCKED' && (
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => changeStatus(u.id, 'NEW', 'שחרור מחסימה')}
                  >
                    שחרור מחסימה
                  </button>
                )}
                {u.status !== 'REJECTED' && u.status !== 'BLOCKED' && (
                  <button
                    type="button"
                    className="warn"
                    disabled={busyId === u.id}
                    onClick={() => changeStatus(u.id, 'REJECTED', 'דחייה')}
                  >
                    דחייה
                  </button>
                )}
              </div>
            </article>
          ))}
          <PaginationBar
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            disabled={loading}
            onPageChange={(p) => loadUsers(p)}
          />
        </section>
      )}
    </main>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    NEW: 'חדש',
    PENDING_APPROVAL: 'ממתין',
    APPROVED: 'מאושר',
    REJECTED: 'נדחה',
    BLOCKED: 'חסום',
  };
  return labels[status] || status;
}
