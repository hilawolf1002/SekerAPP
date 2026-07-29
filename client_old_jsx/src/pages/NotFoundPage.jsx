import { Link } from 'react-router-dom'
import './NotFoundPage.css'

function NotFoundPage() {
  return (
    <section className="not-found-page">
      <h1>404</h1>
      <p>העמוד שחיפשת לא נמצא.</p>
      <Link to="/">חזרה לדף הראשי</Link>
    </section>
  )
}

export default NotFoundPage

