import './SurveysPage.css'

function SurveysPage() {
  return (
    <section className="surveys-page">
      <div className="page-header">
        <div>
          <p className="page-badge">מרכז הניהול</p>
          <h1>סקרים וקמפיינים</h1>
          <p className="page-subtitle">
            ריכזנו עבורך את כל הסקרים, רשימות הנמענים והקמפיינים הפעילים. כאן אפשר לעקוב, לערוך ולהפעיל את הכל
            בצורה מהירה.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="gradient-btn">
            <i className="fas fa-plus" aria-hidden="true" />
            סקר חדש
          </button>
          <button type="button" className="outline-btn">
            <i className="fas fa-file-import" aria-hidden="true" />
            ייבוא רשימת נמענים
          </button>
        </div>
      </div>

      <div className="surveys-content">
        <div className="surveys-card">
          <header>
            <h2>סקירה כללית</h2>
            <p>נתוני פעילות אחרונה: סקרים פעילים, רשימות מופעלות ויחס מענה.</p>
          </header>
          <div className="stats-grid">
            <div className="stats-tile">
              <span className="tile-label">סקרים פעילים</span>
              <span className="tile-value">18</span>
              <span className="tile-trend up">
                <i className="fas fa-arrow-up" aria-hidden="true" />
                9% ↑
              </span>
            </div>
            <div className="stats-tile">
              <span className="tile-label">סקרים בארכיון</span>
              <span className="tile-value">32</span>
              <span className="tile-trend">
                <i className="fas fa-clock" aria-hidden="true" />
                ממתינים לאוטומציה
              </span>
            </div>
            <div className="stats-tile">
              <span className="tile-label">ממוצע תגובה</span>
              <span className="tile-value">63%</span>
              <span className="tile-trend up">
                <i className="fas fa-arrow-up" aria-hidden="true" />
                +4 נקודות
              </span>
            </div>
          </div>
        </div>

        <div className="surveys-card placeholder">
          <header>
            <h2>טבלת סקרים</h2>
            <p>בשלב הבא תוצג כאן טבלה חכמה עם אפשרויות סינון, חיפוש ופעולות מהירות.</p>
          </header>
          <div className="table-placeholder">
            <i className="fas fa-table" aria-hidden="true" />
            <p>אנחנו מכינים עבורך ממשק דינמי להצגת רשימת הסקרים מתוך ה־API.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SurveysPage
