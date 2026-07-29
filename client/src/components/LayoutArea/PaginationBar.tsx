import './PaginationBar.css';

type PaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  /** מחלקת CSS נוספת למעטפת */
  className?: string;
};

/** סרגל דפדוף RTL – קודם / הבא + מספר עמוד */
export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
  className = '',
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      className={`pagination-bar ${className}`.trim()}
      aria-label="דפדוף ברשימה"
    >
      <button
        type="button"
        className="pagination-btn"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="עמוד קודם"
      >
        הקודם
      </button>
      <span className="pagination-meta" aria-live="polite">
        {from}–{to} מתוך {total}
        <span className="pagination-page">
          {' '}
          · עמוד {page}/{totalPages}
        </span>
      </span>
      <button
        type="button"
        className="pagination-btn"
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="עמוד הבא"
      >
        הבא
      </button>
    </nav>
  );
}
