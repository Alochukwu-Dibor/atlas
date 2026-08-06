# Commercial Manager Dashboard build audit

## What was inspected

- The completed Plan-module audit and the confirmed-plan reducer, persistence and selectors.
- Existing Commercial Manager routes, navigation, context controls, project workspace, review workspace and shared table, panel, badge, chart and state components.
- The shared Atlas fixture and reporting workflow state used by project and submission views.

## What was built

The `/commercial` route now answers “How is the portfolio performing, and what should the Commercial Manager focus on now?” using the confirmed plan as its baseline and the existing reporting/domain data as its actual-performance source.

Completed sections:

1. **Portfolio Health** — a project-health roll-up with a deterministic 0–100 score, overall status, On track/At risk/Critical breakdown and links into filtered Projects views.
2. **Current performance** — exactly four KPI cards: Production capacity, Cash-flow position, HSE and Legal.
3. **What Needs My Attention** — critical/underperforming projects and submissions requiring review, with direct project and review destinations.
4. **Today’s Priorities** — a stable, ranked list generated from project health, review state, plan variance, HSE/legal issues and the reporting deadline.
5. **Plan Delivery Trend** — a six-week approved-plan versus reported-actual line chart, including the current-week marker, legend and accessible data-table alternative.

The page also includes explicit no-confirmed-plan and limited-reporting states.

## Components and routes

- Added `CommercialDashboardPage` and reused `PageHeader`, `ContextControls`, `Panel`, `KpiCard`, `DataTable`, `StatusBadge`, `ChartWrapper` and Recharts primitives.
- `/commercial` now loads the new Dashboard page.
- Added `/projects/:projectId` so Dashboard project actions open the existing project workspace directly.
- Updated the Projects page so route parameters control its existing detail drawer and health query parameters control the existing filter.
- Preserved the Commercial Manager navigation at Dashboard, Plan, Projects and Reporting only.

## Calculation and priority logic

- Project health is calculated only for confirmed-plan project identifiers and uses the latest matching project reporting record.
- Status normalization is deterministic: delayed/critical = Critical; at-risk/needs-attention = At risk; otherwise On track. A confirmed project without matching reporting is treated as At risk and identified as limited data.
- Portfolio score weights are On track 100, At risk 65 and Critical 25. The fixture produces 73/100 from two On track, one At risk and one Critical project.
- Overall status is Critical when any confirmed project is critical, At risk when any is at risk, and On track otherwise.
- Priority candidates use fixed ranks: critical project, clarification/review, material production variance, HSE issue, legal issue, reporting deadline, then other underperforming projects. Ties are sorted by stable record identifier.

## Data-source changes

- Added planned-delivery percentages and a current-reporting-week marker to the existing `businessPlanDeliveryTrend` fixture. Existing actual delivery values remain unchanged.
- Added one shared Dashboard selector; no second project, KPI or submission dataset was created.
- Production, HSE and Legal comparisons use targets stored in the confirmed plan and actuals from the shared reporting/domain data. Cash flow uses the shared Finance reporting position because the confirmed plan has no cash-runway target.

## Drill-down destinations verified

- Portfolio Health “View projects” → `/projects`.
- Health breakdown → `/projects?health=on_track|at_risk|critical`.
- Critical/underperforming project → `/projects/:projectId` and the existing project workspace drawer.
- Submission requiring review → `/reviews/:reportId` and the existing full review page.
- Production, Cash-flow, HSE and Legal KPI cards → the relevant existing project workspace.
- Priorities → their associated project, review or Reporting destination.

## Verification

- `npm run format` — passed.
- `npm run lint` — passed with zero warnings.
- `npm run typecheck` — passed.
- `npm test -- --run` — passed: 10 files, 67 tests.
- `npm run build` — passed.
- `git diff --check` — passed.

Browser QA was performed at desktop size for:

- no confirmed plan and the Plan action;
- confirmed plan with reporting data;
- confirmed plan with the “No submissions received” limited-reporting scenario;
- Portfolio, project, submission-review and KPI drill-downs;
- chart labels, legend and current-week marker;
- table/card layout, visible overflow and route transitions.

Existing Commercial Manager navigation and the Project and Review workspaces continued to load without browser-visible route failures.

## Known limitations and earlier inconsistencies

- The confirmed plan does not currently define a cash-runway target, so Cash-flow position reports the validated current cash/runway and next material obligation without inventing an approved-plan variance.
- Existing project reporting uses `delayed` for the most severe project state while the Dashboard requirement uses `critical`; the selector normalizes it to Critical without mutating the underlying project record.
- A newly added confirmed-plan project with no matching reporting record is surfaced as At risk/limited data instead of being silently treated as healthy.
- The previous Business Overview dashboard implementation remains as an unused export in `ReportingPages.tsx`; it is no longer routed or included in the user experience. Its cycle-publication control belongs in the forthcoming Reporting work rather than this portfolio Dashboard.
- Browser QA covered the available desktop in-app browser. Responsive behavior is protected by existing and new CSS breakpoints and was inspected in code, but separate mobile, Safari and Edge browser sessions were not available in this environment.

## Remaining work

- **Projects:** refine baseline-versus-actual project measures and any remaining project interactions while retaining the shared project identifiers and route-driven workspace.
- **Reporting:** complete the reporting workflow, including the appropriate home for cycle consolidation/publication, while continuing to use the confirmed-plan baseline and existing review records.
