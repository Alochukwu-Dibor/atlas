# Executive Dashboards Build Audit

## Outcome

The CEO and CFO retain separate dashboards and share the existing **View Updates** workspace. Executive navigation remains exactly **Dashboard** and **View Updates**. No Executive approval flow, recommendation module, notification system or additional navigation module was added.

Both dashboards now consume one selector that combines the confirmed approved-plan baseline, current reporting-period KPI and budget records, canonical financial series, current project risks and canonical submitted Manager/Commercial Manager updates. Missing current-period values render as **Unavailable** rather than falling back to another cycle.

## CEO dashboard

- Four KPI cards only: Production Performance, Cash Flow, HSE Performance, and Legal & Regulatory Position.
- Every metric includes a current value or unavailable state, semantic status, plan comparison/variance and reporting-period label.
- Planned vs Actual Production uses the confirmed current production target, canonical actuals and a combined line/bar chart for planned production, actual production and variance.
- The chart includes a time axis, two labelled bopd axes, legend, tooltips, reporting-period summary and accessible data-table alternative.
- Strategic Risks contains only Risk and Impact columns, is severity ordered, and links to the originating submitted update when one exists; otherwise it links to the confirmed project where applicable.
- Insights are deterministic consequences of the production gap, validated liquidity forecast and current strategic-risk concentration. They do not duplicate KPI values or create a recommendation workflow.
- Strategic Risks and Insights render side by side on desktop and use the shared responsive two-column rule to stack below 900 px.

## CFO dashboard

- Four KPI cards only: Cash Position, Approved vs Committed, Cost Recovery, and Revenue Impacting Production Variance.
- Cash Flow Forecast displays Forecast Inflows, Forecast Outflows and Net Cash Position with time axis, USD axis, legend, tooltips, zero reference, period summary and accessible data table.
- OpEx and CapEx reuse one calculation and presentation model for Approved, Committed, Actual, Remaining and Forecast variance.
- OpEx and CapEx render side by side on desktop and stack below 900 px.
- Financial Risks contains Risk, Impact, Exposure and Mitigation, uses consistent compact USD formatting, and supports source navigation where a submitted update or project is available.
- Obsolete CFO dashboard sections for receivables, obligations, approval decisions and historical variance are not rendered by the active route.

## Shared data and derivations

- `plan.confirmedPlan` is the only approved-plan baseline accepted by the selector.
- Current KPI actuals come from canonical KPI target records whose `reportingPeriodId` matches the active Atlas cycle.
- Approved spend comes from the confirmed plan; committed, actual and forecast spend come from current-period canonical budget lines.
- Production trend uses the canonical approved historical series and replaces the current point with the confirmed target and current-period actual.
- Risks come from canonical execution risks for the current cycle. Update links are resolved from canonical submitted records using stable project and reporting-period identifiers.
- Drafts are never used as Executive sources.
- Deterministic selectors provide explicit unavailable metrics when the baseline or matching current-period actual is absent.
- Switching to CEO or CFO now retains the Atlas default open/current reporting period rather than reverting to the prior published cycle.

## Components and routes

### Reused

- `KpiCard`, `Panel`, `DataTable`, `StatusBadge`, `StateView`, `Button` and `PageHeader`.
- `ChartWrapper` including its accessible table alternative.
- Existing Recharts dependency and Atlas chart colours.
- Existing project and Executive View Updates detail routes.

### Created or changed

- `src/data/executiveDashboard.ts` provides the shared CEO/CFO view model and derivations.
- `src/pages/ExecutivePages.tsx` now owns both active Executive dashboards.
- `/executive/cfo` now lazy-loads the active CFO dashboard from the shared Executive page bundle.
- Shared dashboard CSS adds an explicit two-column grid, compact insight/spend layouts and responsive stacking without changing Atlas tokens.

## Cross-module links verified

- CEO Production Performance opens the confirmed Compressor Station B project workspace.
- A strategic compressor risk with a matching W31 submitted update opens that full Executive update detail route.
- **View submitted updates** opens the shared Executive View Updates list for both CEO and CFO.
- Project pages opened by Executives retain only Dashboard and View Updates navigation.

## Verification

Automated coverage verifies:

- The exact four CEO and four CFO metric definitions.
- Current confirmed production plan, actual and variance consistency.
- Shared OpEx/CapEx and cash-flow calculations.
- Source-link resolution from risk to canonical submitted update.
- Unavailable states for a reporting cycle without matching actual records.
- CEO and CFO route content and exact two-link navigation.
- KPI drill-down into the confirmed project workspace.
- Existing Manager, Commercial Manager, plan, project, reporting, submission and comment flows.

Browser QA verified the complete CEO and CFO page structures at a 1,280 px desktop viewport, W31 default context, chart legends/axes/units, the 600 px/600 px Strategic Risks and Insights grid, the 600 px/600 px OpEx and CapEx grid, zero horizontal page overflow, project drill-down, submitted-update risk drill-down, View Updates navigation, and intact Commercial/Manager shells.

Responsive CSS was audited at the existing 900 px and 620 px breakpoints: the shared two-column dashboard grids stack to one column, Executive insight actions stack on narrow screens, and OpEx/CapEx definition grids collapse without changing reading order.

## Commands and results

| Command                | Result                      |
| ---------------------- | --------------------------- |
| `npm run format:check` | Passed.                     |
| `npm run lint`         | Passed with zero warnings.  |
| `npm run typecheck`    | Passed.                     |
| `npm test`             | Passed: 14 files, 98 tests. |
| `npm run build`        | Passed.                     |
| `git diff --check`     | Passed.                     |

## Known limitations

- Role switching, persistence and update discussions remain browser-local prototype simulations.
- The current fixture provides monthly cash-flow inflow/outflow/net series; it does not model a live treasury feed.
- A previously confirmed local plan may omit Finance targets. In that valid prototype state, Cash Position, Cash Flow or Cost Recovery cards display **Unavailable** until a plan containing those targets is confirmed.
- Browser QA was performed in the available in-app Chromium surface. Safari and Edge were not available for direct visual inspection.

## Remaining Executive work

No requirement from this phase remains unimplemented. Production backend integration, live treasury forecasts, server-side approvals and multi-user persistence remain outside the approved prototype scope.
