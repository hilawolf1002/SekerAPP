import './HomePage.css'

function HomePage() {
  return (
    <section className="home-page">
      <div className="hero-card">
        <div className="hero-text">
          <p className="hero-badge">מערכת הסקרים המתקדמת בישראל</p>
          <h1>ברוך הבא ל־SekerApp</h1>
          <p className="hero-subtitle">
            צור סקרים מעוצבים, שלח קמפיינים חכמים בנייד, ונהל תוצאות בזמן אמת עם ממשק מודרני, בטוח ונוח לשימוש.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-action">
              <i className="fas fa-plus" aria-hidden="true" />
              יצירת סקר חדש
            </button>
            <button type="button" className="ghost-action">
              <i className="fas fa-chart-line" aria-hidden="true" />
              צפייה בדשבורד
            </button>
          </div>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <span className="stat-label">סקרים פעילים</span>
            <span className="stat-value">18</span>
            <span className="stat-trend up">
              <i className="fas fa-arrow-up" aria-hidden="true" />
              12% השבוע
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">קמפייני SMS</span>
            <span className="stat-value">6</span>
            <span className="stat-trend">
              <i className="fas fa-clock" aria-hidden="true" />
              2 בתכנון
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">משתתפים חדשים</span>
            <span className="stat-value">1,245</span>
            <span className="stat-trend up">
              <i className="fas fa-arrow-up" aria-hidden="true" />
              +145 ב־24 שעות
            </span>
          </div>
        </div>
      </div>

      <div className="home-grid">
        <article className="home-card">
          <div className="card-icon gradient-info">
            <i className="fas fa-mobile-alt" aria-hidden="true" />
          </div>
          <h2>קמפיינים חכמים</h2>
          <p>נהל רשימות נמענים, הגדר תזמונים ושלח הודעות SMS מותאמות אישית בלחיצה אחת.</p>
          <button type="button" className="card-link">
            מעבר לניהול קמפיינים
            <i className="fas fa-chevron-left" aria-hidden="true" />
          </button>
        </article>

        <article className="home-card">
          <div className="card-icon gradient-success">
            <i className="fas fa-chart-pie" aria-hidden="true" />
          </div>
          <h2>אנליטיקה בזמן אמת</h2>
          <p>קבל תמונת מצב מלאה על תשובות, מגמות ותובנות כדי להוביל החלטות מבוססות נתונים.</p>
          <button type="button" className="card-link">
            פתיחת דוחות מתקדמים
            <i className="fas fa-chevron-left" aria-hidden="true" />
          </button>
        </article>

        <article className="home-card">
          <div className="card-icon gradient-warning">
            <i className="fas fa-shield-alt" aria-hidden="true" />
          </div>
          <h2>אבטחה וציות</h2>
          <p>המערכת עומדת בסטנדרטים מובילים של פרטיות, כולל תמיכה בהצפנה, הרשאות ותיעוד.</p>
          <button type="button" className="card-link">
            למד עוד על אבטחה
            <i className="fas fa-chevron-left" aria-hidden="true" />
          </button>
        </article>
      </div>
    </section>
  )
}

export default HomePage


