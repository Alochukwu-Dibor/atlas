import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import {
  DepartmentShell,
  ExecutiveShell,
  NotFound,
  RouteIndex,
  SidebarShell,
} from './components/Shells';
import { StateView, ToastProvider } from './components/Ui';

const dashboardPage = () => import('./pages/DashboardPages');
const reportingPage = () => import('./pages/ReportingPages');
const modulePage = () => import('./pages/ModulePages');
const CommercialDashboard = lazy(() =>
  reportingPage().then((module) => ({ default: module.CommercialDashboard })),
);
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
  dashboardPage().then((module) => ({ default: module.ExecutiveDashboard })),
);
const FinancePage = lazy(() => modulePage().then((module) => ({ default: module.FinancePage })));
const HsePage = lazy(() => modulePage().then((module) => ({ default: module.HsePage })));
const LegalPage = lazy(() => modulePage().then((module) => ({ default: module.LegalPage })));
const ProductionPage = lazy(() =>
  modulePage().then((module) => ({ default: module.ProductionPage })),
);

export function App() {
  return (
    <ToastProvider>
      <Suspense
        fallback={
          <StateView
            type="loading"
            title="Loading Atlas"
            message="Preparing the selected reporting workspace."
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
            <Route path="commercial/review/:id" element={<CommercialReviewPage />} />
            <Route path="production" element={<ProductionPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="hse" element={<HsePage />} />
            <Route path="legal" element={<LegalPage />} />
          </Route>
          <Route element={<ExecutiveShell />}>
            <Route path="executive" element={<ExecutiveDashboard />} />
          </Route>
          <Route path="no-access" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
