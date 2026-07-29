import { lazy, Suspense, ComponentType } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from '../AuthArea/PrivateRoute';
import { ApprovedResponderRoute } from '../AuthArea/ApprovedResponderRoute';
import { AdminRoute } from '../AdminArea/AdminRoute';
import { LandingPage } from '../HomeArea/LandingPage';
import { LoginPage } from '../AuthArea/LoginPage';

/** טעינה עצלה – דפי כניסה נשארים מיידיים */
const HomePage = lazy(() =>
  import('../HomeArea/HomePage').then((m) => ({ default: m.HomePage }))
);
const KycRegistrationPage = lazy(() =>
  import('../KycArea/KycRegistrationPage').then((m) => ({
    default: m.KycRegistrationPage,
  }))
);
const SurveysListPage = lazy(() =>
  import('../SurveyArea/SurveysListPage').then((m) => ({
    default: m.SurveysListPage,
  }))
);
const CreateSurveyPage = lazy(() =>
  import('../SurveyArea/CreateSurveyPage').then((m) => ({
    default: m.CreateSurveyPage,
  }))
);
const AnswerSurveyPage = lazy(() =>
  import('../SurveyArea/AnswerSurveyPage').then((m) => ({
    default: m.AnswerSurveyPage,
  }))
);
const SurveyStatsPage = lazy(() =>
  import('../SurveyArea/SurveyStatsPage').then((m) => ({
    default: m.SurveyStatsPage,
  }))
);
const InvitationsPage = lazy(() =>
  import('../SurveyArea/InvitationsPage').then((m) => ({
    default: m.InvitationsPage,
  }))
);
const PointsDashboardPage = lazy(() =>
  import('../PointsArea/PointsDashboardPage').then((m) => ({
    default: m.PointsDashboardPage,
  }))
);
const AdminLoginPage = lazy(() =>
  import('../AdminArea/AdminLoginPage').then((m) => ({
    default: m.AdminLoginPage,
  }))
);
const AdminDashboardPage = lazy(() =>
  import('../AdminArea/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  }))
);
const AdminPendingApprovalsPage = lazy(() =>
  import('../AdminArea/AdminPendingApprovalsPage').then((m) => ({
    default: m.AdminPendingApprovalsPage,
  }))
);
const AdminUsersPage = lazy(() =>
  import('../AdminArea/AdminUsersPage').then((m) => ({
    default: m.AdminUsersPage,
  }))
);
const AdminRedemptionsPage = lazy(() =>
  import('../AdminArea/AdminRedemptionsPage').then((m) => ({
    default: m.AdminRedemptionsPage,
  }))
);
const AdminSettingsPage = lazy(() =>
  import('../AdminArea/AdminSettingsPage').then((m) => ({
    default: m.AdminSettingsPage,
  }))
);
/* מתנות וקופונים — מושבת זמנית (פדיון ידני במייל)
const AdminGiftsPage = lazy(() =>
  import('../AdminArea/AdminGiftsPage').then((m) => ({
    default: m.AdminGiftsPage,
  }))
);
*/
const AdminTagsPage = lazy(() =>
  import('../AdminArea/AdminTagsPage').then((m) => ({
    default: m.AdminTagsPage,
  }))
);

function RouteFallback() {
  return (
    <div
      className="route-lazy-fallback"
      role="status"
      aria-live="polite"
      style={{
        direction: 'rtl',
        display: 'grid',
        placeItems: 'center',
        minHeight: '40vh',
        color: '#64748b',
        fontWeight: 600,
      }}
    >
      טוען מסך…
    </div>
  );
}

function Lazy({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function withPrivate(Page: ComponentType) {
  return (
    <Lazy>
      <PrivateRoute>
        <Page />
      </PrivateRoute>
    </Lazy>
  );
}

function withAdmin(Page: ComponentType) {
  return (
    <Lazy>
      <AdminRoute>
        <Page />
      </AdminRoute>
    </Lazy>
  );
}

function withApproved(Page: ComponentType) {
  return (
    <Lazy>
      <PrivateRoute>
        <ApprovedResponderRoute>
          <Page />
        </ApprovedResponderRoute>
      </PrivateRoute>
    </Lazy>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/home" element={withPrivate(HomePage)} />
      <Route path="/join" element={withPrivate(KycRegistrationPage)} />
      <Route path="/surveys" element={withPrivate(SurveysListPage)} />
      <Route path="/surveys/create" element={withPrivate(CreateSurveyPage)} />
      <Route path="/invitations" element={withApproved(InvitationsPage)} />
      <Route path="/points" element={withApproved(PointsDashboardPage)} />
      <Route path="/surveys/:id/stats" element={withPrivate(SurveyStatsPage)} />
      <Route
        path="/surveys/:id"
        element={
          <Lazy>
            <AnswerSurveyPage />
          </Lazy>
        }
      />

      <Route
        path="/admin/login"
        element={
          <Lazy>
            <AdminLoginPage />
          </Lazy>
        }
      />
      <Route path="/admin" element={withAdmin(AdminDashboardPage)} />
      <Route path="/admin/pending" element={withAdmin(AdminPendingApprovalsPage)} />
      <Route path="/admin/users" element={withAdmin(AdminUsersPage)} />
      <Route path="/admin/redemptions" element={withAdmin(AdminRedemptionsPage)} />
      <Route path="/admin/settings" element={withAdmin(AdminSettingsPage)} />
      {/* <Route path="/admin/gifts" element={withAdmin(AdminGiftsPage)} /> */}
      <Route path="/admin/tags" element={withAdmin(AdminTagsPage)} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
