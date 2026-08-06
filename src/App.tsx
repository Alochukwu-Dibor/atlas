import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  DepartmentShell,
  ExecutiveShell,
  NotFound,
  RouteIndex,
  SidebarShell,
} from './components/Shells';
import { StateView, ToastProvider } from './components/Ui';

const executivePage = () => import('./pages/ExecutivePages');
const reportingPage = () => import('./pages/ReportingPages');
const modulePage = () => import('./pages/ModulePages');
const architecturePage = () => import('./pages/ArchitecturePages');
const PlanPage = lazy(() => import('./pages/PlanPage'));
const CommercialDashboard = lazy(() => import('./pages/CommercialDashboardPage'));
const CommercialProjectsPage = lazy(() => import('./pages/CommercialProjectsPage'));
const CommercialReportingPage = lazy(() => import('./pages/CommercialReportingPage'));
const CommercialReviewPage = lazy(() =>
  reportingPage().then((module) => ({ default: module.CommercialReviewPage })),
);
const CreateReportPage = lazy(() =>
  reportingPage().then((module) => ({ default: module.CreateReportPage })),
);
const DepartmentDashboard = lazy(() =>
  reportingPage().then((module) => ({ default: module.DepartmentDashboard })),
);
const DepartmentReportReview = lazy(() =>
  reportingPage().then((module) => ({ default: module.DepartmentReportReview })),
);
const ExecutiveDashboard = lazy(() =>
  executivePage().then((module) => ({ default: module.ExecutiveDashboard })),
);
const FinancePage = lazy(() => modulePage().then((module) => ({ default: module.FinancePage })));
const HsePage = lazy(() => modulePage().then((module) => ({ default: module.HsePage })));
const LegalPage = lazy(() => modulePage().then((module) => ({ default: module.LegalPage })));
const ProductionPage = lazy(() =>
  modulePage().then((module) => ({ default: module.ProductionPage })),
);
const ExecutionPage = lazy(() =>
  architecturePage().then((module) => ({ default: module.ExecutionPage })),
);
const DecisionsPage = lazy(() =>
  architecturePage().then((module) => ({ default: module.DecisionsPage })),
);
const OutputsPage = lazy(() =>
  architecturePage().then((module) => ({ default: module.OutputsPage })),
);
const KpiLibraryPage = lazy(() =>
  architecturePage().then((module) => ({ default: module.KpiLibraryPage })),
);
const ReportingTemplatesPage = lazy(() =>
  architecturePage().then((module) => ({ default: module.ReportingTemplatesPage })),
);
const UsersRolesPage = lazy(() =>
  architecturePage().then((module) => ({ default: module.UsersRolesPage })),
);
const SettingsPage = lazy(() =>
  architecturePage().then((module) => ({ default: module.SettingsPage })),
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
          <Route element={<DepartmentShell />}>
            <Route path="department" element={<DepartmentDashboard />} />
            <Route path="department/reports/new" element={<CreateReportPage />} />
            <Route path="department/reports/:id" element={<DepartmentReportReview />} />
          </Route>
          <Route element={<SidebarShell />}>
            <Route path="commercial" element={<CommercialDashboard />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="commercial/review/:id" element={<CommercialReviewPage />} />
            <Route path="execution" element={<ExecutionPage />} />
            <Route path="projects" element={<CommercialProjectsPage />} />
            <Route path="projects/:projectId" element={<CommercialProjectsPage />} />
            <Route path="reviews" element={<CommercialReportingPage />} />
            <Route path="reviews/:id" element={<CommercialReviewPage />} />
            <Route path="decisions" element={<DecisionsPage />} />
            <Route path="outputs" element={<OutputsPage />} />
            <Route path="kpi-library" element={<KpiLibraryPage />} />
            <Route path="reporting-templates" element={<ReportingTemplatesPage />} />
            <Route path="users-roles" element={<UsersRolesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="recommendations" element={<Navigate to="/decisions" replace />} />
            <Route path="production" element={<ProductionPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="hse" element={<HsePage />} />
            <Route path="legal" element={<LegalPage />} />
          </Route>
          <Route element={<ExecutiveShell />}>
            <Route path="executive" element={<ExecutiveDashboard />} />
            <Route path="executive/cfo" element={<CfoViewPage />} />
            <Route path="executive/decisions" element={<DecisionsPage />} />
            <Route path="executive/outputs" element={<OutputsPage />} />
          </Route>
          <Route path="no-access" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
