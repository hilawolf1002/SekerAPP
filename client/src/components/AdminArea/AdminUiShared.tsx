import './AdminUiShared.css';

type AdminEmptyProps = {
  title: string;
  description?: string;
  icon?: string;
};

/** מצב ריק אחיד לאדמין */
export function AdminEmptyState({
  title,
  description,
  icon = 'fa-inbox',
}: AdminEmptyProps) {
  return (
    <div className="admin-empty-state">
      <div className="admin-empty-icon" aria-hidden="true">
        <i className={`fas ${icon}`} />
      </div>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

type AdminSkeletonProps = {
  rows?: number;
};

/** שלד טעינה קצר לרשימות אדמין */
export function AdminSkeleton({ rows = 3 }: AdminSkeletonProps) {
  return (
    <div className="admin-skeleton" aria-busy="true" aria-label="טוען">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="admin-skeleton-card">
          <div className="admin-skeleton-line w40" />
          <div className="admin-skeleton-line w70" />
          <div className="admin-skeleton-line w55" />
        </div>
      ))}
    </div>
  );
}
