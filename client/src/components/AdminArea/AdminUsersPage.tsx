import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import { getErrorMessage } from '../../Services/api';
import {
  getAllUsers,
  setUserStatus,
  blockUser,
  getAdminTags,
  createAdminTag,
  setUserTags,
  UserListItem,
  AudienceTag,
} from '../../Services/adminService';
import { PaginationBar } from '../LayoutArea/PaginationBar';
import { AudienceTagPicker } from './AudienceTagPicker';
import { AdminTopBar } from './AdminTopBar';
import { AdminEmptyState, AdminSkeleton } from './AdminUiShared';
import './AdminUiShared.css';
import './AdminUsersPage.css';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const listRef = useRef<HTMLElement>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<AudienceTag[]>([]);
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [draftTagIds, setDraftTagIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    setPage(1);
    setExpandedId(null);
    loadUsers(1, appliedSearch);
    loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, statusFilter]);

  useEffect(() => {
    if (!expandedId) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target || !listRef.current) return;
      const card = listRef.current.querySelector(
        `[data-user-id="${expandedId}"]`
      );
      if (card && !card.contains(target)) {
        setExpandedId(null);
        setEditingTagsFor(null);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [expandedId]);

  async function loadTags() {
    try {
      setAllTags(await getAdminTags());
    } catch {
      /* non-blocking */
    }
  }

  async function loadUsers(nextPage = page, query = appliedSearch) {
    try {
      setLoading(true);
      const data = await getAllUsers({
        search: query.trim() || undefined,
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

  function handleSearchInputChange(value: string) {
    setSearchInput(value);
    if (!value.trim()) {
      setAppliedSearch('');
      loadUsers(1, '');
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = searchInput.trim();
    setAppliedSearch(query);
    setExpandedId(null);
    loadUsers(1, query);
  }

  function clearSearch() {
    setSearchInput('');
    setAppliedSearch('');
    setExpandedId(null);
    loadUsers(1, '');
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => {
      if (prev === id) {
        setEditingTagsFor(null);
        return null;
      }
      setEditingTagsFor(null);
      return id;
    });
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

  async function handleBlock(userId: string) {
    const reason = prompt('סיבה לחסימה (אופציונלי):') ?? undefined;
    if (reason === undefined) return;
    if (!reason.trim() && !confirm('להמשיך בחסימה בלי סיבה?')) return;
    if (!confirm('האם לחסום משתמש זה?')) return;

    try {
      setBusyId(userId);
      await blockUser(userId, reason.trim() || undefined);
      showToast('המשתמש נחסם', 'success');
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

  async function handleQuickCreateTag(name: string) {
    const tag = await createAdminTag(name);
    setAllTags((prev) => {
      if (prev.some((t) => t.id === tag.id)) return prev;
      return [...prev, tag].sort((a, b) => a.name.localeCompare(b.name, 'he'));
    });
    setDraftTagIds((prev) =>
      prev.includes(tag.id) ? prev : [...prev, tag.id]
    );
    showToast(`התגית "${tag.name}" נוצרה`, 'success');
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
      await loadTags();
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  const subtitle = useMemo(() => {
    const parts = [`${total} משתמשים`];
    if (appliedSearch) parts.push(`«${appliedSearch}»`);
    return parts.join(' · ');
  }, [total, appliedSearch]);

  return (
    <main className="admin-shell admin-users-shell">
      <AdminTopBar title="משתמשים" subtitle={subtitle} />

      <div className="admin-page-body">
        <form onSubmit={handleSearch} className="admin-search-bar">
          <div className="admin-search-input-wrap">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              placeholder="טלפון, שם או מייל"
              enterKeyHint="search"
            />
            {searchInput && (
              <button
                type="button"
                className="admin-search-clear"
                onClick={clearSearch}
                aria-label="ניקוי חיפוש"
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="admin-search-submit" aria-label="חיפוש">
            <i className="fas fa-search" aria-hidden="true" />
            <span>חיפוש</span>
          </button>
        </form>

        <div className="admin-filter-row">
          <label className="admin-filter-status">
            <span>סטטוס</span>
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

        <p className="admin-users-hint">
          לחצי על שם לפתיחת פרטים. לחיצה מחוץ לכרטיס סוגרת.
        </p>

        {loading ? (
          <AdminSkeleton rows={4} />
        ) : users.length === 0 ? (
          <AdminEmptyState
            title={
              appliedSearch
                ? `לא נמצאו תוצאות עבור "${appliedSearch}"`
                : 'לא נמצאו משתמשים'
            }
            description={
              appliedSearch
                ? 'נסי חיפוש אחר או הציגי את כל המשתמשים.'
                : undefined
            }
            icon="fa-users"
          />
        ) : (
          <section ref={listRef} className="admin-users-list">
            {users.map((u) => {
              const open = expandedId === u.id;
              const tagNames = (u.tags || []).map((t) => t.name).join(', ');
              return (
                <article
                  key={u.id}
                  data-user-id={u.id}
                  className={`admin-user-card${open ? ' expanded' : ''}`}
                >
                  <button
                    type="button"
                    className="admin-user-summary"
                    onClick={() => toggleExpand(u.id)}
                    aria-expanded={open}
                  >
                    <div className="admin-user-summary-text">
                      <strong className="admin-user-name-link">
                        {u.name || 'ללא שם'}
                      </strong>
                      <span>
                        {u.phone}
                        {tagNames ? ` · ${tagNames}` : ''}
                      </span>
                    </div>
                    <span
                      className={`admin-status-badge status-${u.status.toLowerCase()}`}
                    >
                      {statusLabel(u.status)}
                    </span>
                    <i
                      className={`fas fa-chevron-${open ? 'up' : 'down'}`}
                      aria-hidden="true"
                    />
                  </button>

                  {open && (
                    <div className="admin-user-details">
                      <div className="admin-user-meta">
                        {u.email && <span>מייל: {u.email}</span>}
                        <span>
                          תפקיד: {u.role === 'ADMIN' ? 'מנהל' : 'משתמש'}
                        </span>
                        <span>
                          הצטרף:{' '}
                          {new Date(u.createdAt).toLocaleDateString('he-IL')}
                        </span>
                        {u.status === 'NEW' && (
                          <span className="admin-user-hint-line">
                            טרם הגיש בקשת הצטרפות
                          </span>
                        )}
                        {u.status === 'PENDING_APPROVAL' && (
                          <Link
                            to="/admin/pending"
                            className="admin-user-pending-link"
                          >
                            פרטים מלאים בממתינים לאישור
                          </Link>
                        )}
                      </div>

                      <div className="admin-user-tags">
                        {(u.tags || []).length === 0 ? (
                          <span className="admin-user-tags-empty">
                            ללא תגיות
                          </span>
                        ) : (
                          (u.tags || []).map((t) => (
                            <span key={t.id} className="admin-user-tag-chip">
                              {t.name}
                            </span>
                          ))
                        )}
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
                      </div>

                      {editingTagsFor === u.id && (
                        <div className="admin-user-tags-editor">
                          <AudienceTagPicker
                            tags={allTags}
                            selectedIds={draftTagIds}
                            onToggle={toggleDraftTag}
                            onCreateTag={handleQuickCreateTag}
                            disabled={busyId === u.id}
                          />
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
                        {u.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              type="button"
                              disabled={busyId === u.id}
                              onClick={() =>
                                changeStatus(u.id, 'APPROVED', 'אישור')
                              }
                            >
                              אישור
                            </button>
                            <button
                              type="button"
                              className="warn"
                              disabled={busyId === u.id}
                              onClick={() =>
                                changeStatus(u.id, 'REJECTED', 'דחייה')
                              }
                            >
                              דחייה
                            </button>
                          </>
                        )}
                        {u.status === 'APPROVED' && (
                          <button
                            type="button"
                            className="warn"
                            disabled={busyId === u.id}
                            onClick={() =>
                              changeStatus(
                                u.id,
                                'REJECTED',
                                'איפוס להרשמה מחדש'
                              )
                            }
                          >
                            איפוס
                          </button>
                        )}
                        {u.status !== 'BLOCKED' && u.role !== 'ADMIN' && (
                          <button
                            type="button"
                            className="danger"
                            disabled={busyId === u.id}
                            onClick={() => handleBlock(u.id)}
                          >
                            חסימה
                          </button>
                        )}
                        {u.status === 'BLOCKED' && (
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() =>
                              changeStatus(u.id, 'NEW', 'שחרור מחסימה')
                            }
                          >
                            שחרור
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
            <PaginationBar
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              disabled={loading}
              onPageChange={(p) => {
                setExpandedId(null);
                loadUsers(p);
              }}
            />
          </section>
        )}
      </div>
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
