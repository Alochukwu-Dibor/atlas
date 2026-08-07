import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  ExecutiveShell,
  ManagerShell,
  NotFound,
  RouteIndex,
  SidebarShell,
} from './components/Shells';
import { StateView, ToastProvider } from './components/Ui';

const executivePage = () => import('./pages/ExecutivePages');
const reportingPage = () => import('./pages/ReportingPages');
const architecturePage = () => import('./pages/ArchitecturePages');
const PlanPage = lazy(() => import('./pages/PlanPage'));
const CommercialDashboard = lazy(() => import('./pages/CommercialDashboardPage'));
const CommercialProjectsPage = lazy(() => import('./pages/CommercialProjectsPage'));
const CommercialReportingPage = lazy(() => import('./pages/CommercialReportingPage'));
const managerUpdatesPage = () => import('./pages/ManagerUpdatesPage');
const ManagerWeeklyUpdatesPage = lazy(() =>
  managerUpdatesPage().then((module) => ({ default: module.ManagerWeeklyUpdatesPage })),
);
const ManagerSubmissionsPage = lazy(() =>
  managerUpdatesPage().then((module) => ({ default: module.ManagerSubmissionsPage })),
);
const ManagerSubmissionDetailPage = lazy(() =>
  managerUpdatesPage().then((module) => ({ default: module.ManagerSubmissionDetailPage })),
);
const ExecutiveUpdatesPage = lazy(() =>
  managerUpdatesPage().then((module) => ({ default: module.ExecutiveUpdatesPage })),
);
const CommercialReviewPage = lazy(() =>
  reportingPage().then((module) => ({ default: module.CommercialReviewPage })),
);
const ExecutiveDashboard = lazy(() =>
  executivePage().then((module) => ({ default: module.ExecutiveDashboard })),
);
const CfoViewPage = lazy(() =>
  architecturePage().then((module) => ({ default: module.CfoViewPage })),
);

export function App() {
  return (
    <ToastProvider>
      <Suspense
        fallback={
          <StateView
            type="loading"
            title="Loading Atlas"
            message="Preparing the selected Atlas workspace."
          />
        }
      >
        <Routes>
          <Route index element={<RouteIndex />} />
          <Route element={<ManagerShell />}>
            <Route path="manager/weekly-updates" element={<ManagerWeeklyUpdatesPage />} />
            <Route path="manager/submissions" element={<ManagerSubmissionsPage />} />
            <Route path="manager/submissions/:id" element={<ManagerSubmissionDetailPage />} />
          </Route>
          <Route path="department" element={<Navigate to="/manager/submissions" replace />} />
          <Route
            path="department/reports/new"
            element={<Navigate to="/manager/weekly-updates" replace />}
          />
          <Route
            path="department/reports/:id"
            element={<Navigate to="/manager/submissions" replace />}
          />
          <Route element={<SidebarShell />}>
            <Route path="commercial" element={<CommercialDashboard />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="projects" element={<CommercialProjectsPage />} />
            <Route path="projects/:projectId" element={<CommercialProjectsPage />} />
            <Route path="reviews" element={<CommercialReportingPage />} />
            <Route path="reviews/my-submissions" element={<ManagerSubmissionsPage />} />
            <Route path="reviews/weekly-update" element={<ManagerWeeklyUpdatesPage />} />
            <Route path="reviews/weekly-updates/:id" element={<ManagerSubmissionDetailPage />} />
            <Route path="reviews/:id" element={<CommercialReviewPage />} />
          </Route>
          <Route element={<ExecutiveShell />}>
            <Route path="executive" element={<ExecutiveDashboard />} />
            <Route path="executive/cfo" element={<CfoViewPage />} />
            <Route path="executive/view-updates" element={<ExecutiveUpdatesPage />} />
            <Route path="executive/view-updates/:id" element={<ManagerSubmissionDetailPage />} />
            <Route path="executive/weekly-updates/:id" element={<ManagerSubmissionDetailPage />} />
          </Route>
          <Route path="no-access" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
