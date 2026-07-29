import { NavLink, Outlet } from 'react-router-dom'
import './AppLayout.css'

function AppLayout() {
  return (
    <div className="app-shell">
      <div className="floating-orbs" aria-hidden="true">
        <div className="orb" />
        <div className="orb" />
        <div className="orb" />
      </div>

      <header className="header">
        <div className="header-inner">
          <NavLink to="/" className="logo">
            <img src="/logo.png" alt="SekerApp Logo" />
            <span>SekerApp</span>
          </NavLink>

          <nav className="nav-links">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
              דשבורד
            </NavLink>
            <NavLink to="/surveys" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              סקרים
            </NavLink>
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              התחברות
            </NavLink>
          </nav>

          <div className="header-actions">
            <button type="button" className="support-btn">
              <i className="fas fa-life-ring" aria-hidden="true" />
              תמיכה
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} SekerApp. כל הזכויות שמורות.</p>
      </footer>
    </div>
  )
}

export default AppLayout


