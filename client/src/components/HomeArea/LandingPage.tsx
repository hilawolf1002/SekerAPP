import { Navigate } from 'react-router-dom';

/** דף נחיתה זמני – מפנה להתחברות */
export function LandingPage() {
  return <Navigate to="/login" replace />;
}
