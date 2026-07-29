import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import { getErrorMessage } from '../../Services/api';
import {
  getAdminGifts,
  createAdminGift,
  updateAdminGift,
  addAdminGiftCoupons,
  GiftOptionAdmin,
} from '../../Services/adminService';
import { AdminTopBar } from './AdminTopBar';
import { AdminEmptyState, AdminSkeleton } from './AdminUiShared';
import './AdminUiShared.css';
import './AdminGiftsPage.css';

export function AdminGiftsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [gifts, setGifts] = useState<GiftOptionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState(100);
  const [couponText, setCouponText] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    loadGifts();
  }, [user, navigate]);

  async function loadGifts() {
    try {
      setLoading(true);
      setGifts(await getAdminGifts());
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await createAdminGift({
        storeName: storeName.trim(),
        title: title.trim(),
        description: description.trim() || null,
        pointsCost,
        isActive: true,
      });
      setStoreName('');
      setTitle('');
      setDescription('');
      showToast('המתנה נוספה', 'success');
      await loadGifts();
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  }

  async function toggleActive(gift: GiftOptionAdmin) {
    try {
      await updateAdminGift(gift.id, { isActive: !gift.isActive });
      await loadGifts();
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  }

  async function handleAddCoupons(giftId: string) {
    const raw = couponText[giftId] || '';
    const codes = raw
      .split(/[\n,;]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (codes.length === 0) {
      showToast('יש להזין לפחות קוד אחד');
      return;
    }
    try {
      const result = await addAdminGiftCoupons(giftId, codes);
      showToast(
        `נוספו ${result.created} קודים${result.skipped ? `, דולגו ${result.skipped} כפולים` : ''}`,
        'success'
      );
      setCouponText((prev) => ({ ...prev, [giftId]: '' }));
      await loadGifts();
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  }

  return (
    <main className="admin-shell admin-gifts-shell">
      <AdminTopBar title="מתנות וקופונים" subtitle="חנויות ומלאי קודים" />

      <div className="admin-page-body">
      <form className="admin-gifts-create" onSubmit={handleCreate}>
        <h2>הוספת מתנה חדשה</h2>
        <input
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="שם החנות / החברה"
          required
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="כותרת המתנה (למשל שובר לקנייה)"
          required
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="תיאור קצר (אופציונלי)"
        />
        <input
          type="number"
          min={1}
          value={pointsCost}
          onChange={(e) => setPointsCost(Number(e.target.value))}
          placeholder="עלות בנקודות"
          required
        />
        <p className="admin-gifts-hint">
          מומלץ שעלות המתנה תהיה שווה ליעד הפדיון (בהגדרות), או נמוכה ממנו —
          אחרת המשתמש יגיע ליעד אבל לא יוכל לבחור מתנה.
        </p>
        <button type="submit">הוספת מתנה</button>
      </form>

      {loading ? (
        <AdminSkeleton rows={3} />
      ) : (
        <section className="admin-gifts-list">
          {gifts.length === 0 ? (
            <AdminEmptyState
              title="עדיין אין מתנות"
              description="הוסיפי חנות וקופונים למעלה."
              icon="fa-store"
            />
          ) : (
            gifts.map((gift) => (
              <article key={gift.id} className="admin-gift-card">
                <div className="admin-gift-top">
                  <div>
                    <strong>{gift.storeName}</strong>
                    <span>{gift.title}</span>
                    {gift.description && <p>{gift.description}</p>}
                  </div>
                  <span className={gift.isActive ? 'on' : 'off'}>
                    {gift.isActive ? 'פעיל' : 'כבוי'}
                  </span>
                </div>
                <div className="admin-gift-meta">
                  <span>{gift.pointsCost} נק׳</span>
                  <span>{gift.availableCoupons} קופונים זמינים</span>
                </div>
                <button
                  type="button"
                  className="admin-gift-toggle"
                  onClick={() => toggleActive(gift)}
                >
                  {gift.isActive ? 'השבתה' : 'הפעלה'}
                </button>
                <textarea
                  placeholder="הדביקי קודי קופון (שורה לכל קוד, או מופרדים בפסיק)"
                  value={couponText[gift.id] || ''}
                  onChange={(e) =>
                    setCouponText((prev) => ({
                      ...prev,
                      [gift.id]: e.target.value,
                    }))
                  }
                />
                <button type="button" onClick={() => handleAddCoupons(gift.id)}>
                  הוספת קופונים למלאי
                </button>
              </article>
            ))
          )}
        </section>
      )}
      </div>
    </main>
  );
}
