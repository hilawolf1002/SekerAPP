import { useState } from 'react'
import './LoginPage.css'

function LoginPage() {
  const [formState, setFormState] = useState({
    email: '',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    // TODO: integrate with real auth service
    setTimeout(() => {
      setIsSubmitting(false)
      alert('פונקציית ההתחברות תתווסף בשלב הבא.')
    }, 600)
  }

  return (
    <section className="login-page">
      <div className="login-container">
        <button type="button" className="back-home" onClick={() => window.history.back()}>
          <i className="fas fa-arrow-right" aria-hidden="true" />
        </button>

        <div className="login-header">
          <div className="logo">
            <img src="/logo.png" alt="SekerApp Logo" />
            <span>SekerApp</span>
          </div>
          <h1 className="header-title">ברוך שובך!</h1>
          <p className="header-subtitle">התחבר לחשבון שלך והמשך ליצור סקרים מדויקים ומודרנים</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              דואר אלקטרוני
            </label>
            <div className="input-icon">
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={formState.email}
                onChange={handleChange}
                required
              />
              <i className="fas fa-envelope" aria-hidden="true" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              סיסמה
            </label>
            <div className="input-icon">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={formState.password}
                onChange={handleChange}
                required
              />
              <i className="fas fa-lock" aria-hidden="true" />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" className="checkbox" />
              זכור אותי
            </label>
            <button type="button" className="link-button">
              שכחתי סיסמה
            </button>
          </div>

          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            <span className="btn-text">{isSubmitting ? 'מתחבר...' : 'התחבר לחשבון'}</span>
          </button>
        </form>

        <div className="divider">
          <span>או התחבר באמצעות</span>
        </div>

        <div className="social-login">
          <a href="/auth/google" className="social-btn google">
            <i className="fab fa-google" aria-hidden="true" />
            Google
          </a>
        </div>

        <div className="register-link">
          אין לך חשבון? <a href="/register.html">הירשם עכשיו</a>
        </div>
      </div>
    </section>
  )
}

export default LoginPage
