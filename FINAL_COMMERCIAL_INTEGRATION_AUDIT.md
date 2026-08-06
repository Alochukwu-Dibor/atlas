# Final Commercial Manager Integration and Quality Audit

## Outcome

The complete Commercial Manager walkthrough is integrated around one confirmed-plan baseline and the existing reporting workflow. The approved experience contains only Dashboard, Plan, Projects, and Reporting. Reporting contains only Submissions and Reports.

A confirmed Plan now includes a destructive, confirmation-protected **Reset Atlas** action. It clears the confirmed plan and local prototype workflow changes, returns the user to `/plan`, and requires a new approved-plan upload before Dashboard, Projects, or Reporting data is available.

## Final module and route map

| Module    | Route         | Detail routes                                                                                                 |
| --------- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| Dashboard | `/commercial` | Attention actions link to canonical project or submission routes.                                             |
| Plan      | `/plan`       | Upload, extraction, grouped review, confirmation, confirmed baseline, and reset are stages on the same route. |
| Projects  | `/projects`   | `/projects/:projectId`, with `view` and optional `measure` query parameters for contextual detail.            |
| Reporting | `/reviews`    | `/reviews/:id`; Reporting has exactly the Submissions and Reports tabs.                                       |

Superseded Commercial routes and their lazy route imports were removed from the Commercial route tree. Shared Executive routes (`/executive`, `/executive/cfo`, `/executive/decisions`, `/executive/outputs`) and Contributor routes (`/department`, `/department/reports/new`, `/department/reports/:id`) remain available and tested.

## End-to-end flows verified

1. Reset a previously confirmed Atlas walkthrough from Plan and return to an empty approved-plan upload state.
2. Select the synthetic approved-plan fixture and start deterministic extraction.
3. Review extracted projects, project budgets, timelines, department KPIs, targets, and milestones.
4. Revise an extracted project field during the session.
5. Add and remove a custom field.
6. Review validation and confirmation totals, acknowledge the tracking-baseline warning, and confirm the plan.
7. Open Dashboard and verify the confirmed four-project baseline populates Portfolio Health, KPI comparisons, attention items, priorities, and the delivery trend.
8. Open project and submission attention items at their dedicated full-page routes.
9. Open a project row, inspect approved-baseline adherence, and inspect the linked chronological Activity log.
10. Open a Needs Review submission, add a retained review comment, and return clearly to Reporting.
11. Send a deterministic follow-up reminder and verify its disabled duplicate-prevention state.
12. Generate and switch between Performance Report, Executive Summary, and Project Progress Report previews.
13. Refresh direct project and review URLs and verify useful unknown-project and unknown-submission states.

Contributor-to-review state transitions remain covered by the workflow reducer integration tests, including submission, clarification, resubmission, rejection, and approval.

## Components created, reused, changed, or removed

### Reused

- Existing Atlas shell, top navigation, PageHeader, Panel, Button, Modal, StateView, DetailTabs, DataTable, StatusBadge, KpiCard, chart wrapper, form controls, toast, and progress patterns.
- Existing plan, workflow, executive, and recommendation reducers and browser-local prototype persistence.
- Existing Dashboard, Projects, Reporting, and review selectors and routes.

### Changed

- `PlanPage`: added the confirmed-state Reset Atlas action, explicit warning, reset feedback, and return to the upload step.
- `App`: reduced the Commercial route tree to the four approved modules and their approved detail routes while preserving Executive and Contributor routing.
- Dashboard CSS: restored the missing four-column KPI strip rule at desktop width using the existing Atlas grid behavior.
- Route and integration tests: added reset coverage, obsolete-route coverage, and an Executive Decisions/Outputs preservation check.

### Removed

- Obsolete Commercial route registrations for Execution, Decisions, Outputs, KPI Library, Reporting Templates, Users and Roles, Settings, Recommendations, Production, Finance, HSE, Legal, and the old `/commercial/review/:id` alias.
- Their unused lazy route imports from the application entry point.

Shared page implementations required by Executive or existing isolated module tests were not deleted.

## Canonical data and derivation logic

- `plan.confirmedPlan` is the canonical approved tracking baseline. It owns stable project IDs, names, approved budgets, timelines, KPI links, targets, milestones, custom fields, plan identity, business unit, planning period, source file, and confirmation audit identity.
- Project IDs are shared unchanged across the Plan, Dashboard, Projects, Reporting, and workflow records.
- Dashboard project health and Projects health use the same normalization: delayed/critical → Critical; at-risk/needs-attention → At risk; otherwise On track.
- Portfolio Health uses project-health weights of 100, 65, and 25 for On track, At risk, and Critical. The confirmed fixture produces 73/100 from two On track, one At risk, and one Critical project.
- Project progress comes from the latest shared project record; the Projects selector is asserted equal to Dashboard project status and progress.
- KPI, target, and milestone adherence compare shared actuals/statuses with values stored in the confirmed baseline. Approved values are not overwritten by actuals or forecasts.
- Reporting completeness derives from eight expected departments and workflow reports for the shared current cycle. The canonical fixture produces 1 of 8 received, 13% complete, and one Needs Review record.
- Report previews call the Dashboard, Projects, project-workspace, and Reporting selectors. Tests assert that Portfolio Health, project totals, and project progress equal their source screens.
- Today’s Priorities uses deterministic rank and stable-ID ordering; repeated selector calls produce identical priority order.

## Data consistency results

- Confirmed projects: 4 across Plan, Dashboard, Projects, and Project Progress Report.
- Total approved budget: USD 185m in Plan and downstream baseline selectors.
- Portfolio Health: 73/100; 2 On track, 1 At risk, 1 Critical.
- Production: 96,800 bopd actual against 120,000 bopd confirmed plan.
- Ughelli Export Line Integrity Programme: Critical and 54% progress on Dashboard and Projects.
- Reporting: 1/8 received, 13% complete, one HSE submission requiring review.
- Current reporting period: Weekly Execution Update · 27 Jul–2 Aug 2026 across Dashboard, Reporting, review, and generated previews.

No visible obsolete fixture values were found contradicting these current Commercial screens.

## Issues discovered and fixed

1. **No clean walkthrough reset:** a confirmed prototype had no deliberate path back to an empty first-run state. Added Reset Atlas to confirmed Plan with a destructive confirmation modal, complete local-state reset, toast feedback, and redirect to upload.
2. **Desktop KPI-card alignment:** the Dashboard used `kpi-strip--4` without a four-column base rule, causing four top-level KPIs to stack vertically. Added the missing rule using the existing grid tokens and retained two-column/one-column breakpoints.
3. **Superseded Commercial routes remained directly addressable:** removed obsolete Commercial registrations and unused entry-point imports. Unknown legacy paths now receive the shared Page not found state.
4. **Preservation risk for shared Executive pages:** added route-level coverage confirming Executive Decisions and Outputs still load after Commercial route cleanup.

## Tests and commands

Final verification on the integration state:

- `npm run format` — passed.
- `npm run format:check` — passed; all files match Prettier style.
- `npm run lint` — passed with zero warnings.
- `npm run typecheck` — passed in TypeScript strict mode.
- `npm test -- --run` — passed: **12 test files, 75 tests**.
- `npm run build` — passed; Vite production bundle generated successfully.
- `git diff --check` — passed before commit.

Focused coverage includes:

- Plan validation, extraction totals, custom fields, confirmation persistence, and full reset.
- Project health/progress derivation and Dashboard/Projects equality.
- Deterministic Today’s Priorities ordering.
- Submission completeness and reminder state.
- All three report-generation selectors and source-screen equality.
- Full-page project and submission route resolution, direct detail loading, and invalid IDs.
- Executive and Contributor route preservation and permissions.

## Visual inspection

The available desktop in-app Chromium browser was used against a clean development server to inspect:

- Plan empty upload, selected-file, extraction, grouped review, confirmation summary, confirmed state, reset warning, and post-reset upload state.
- Dashboard populated and no-plan states, Portfolio Health, corrected KPI alignment, attention table, priorities, and chart.
- Projects list, search, full-page Overview, adherence, Activity log, direct URL, Back to Projects, and invalid project state.
- Reporting Submissions, Reports, completeness progress, review table, follow-up rows, generation loading, and all report previews.
- Full-page submission review, comment history, evidence control, Back to Reporting, direct URL, and invalid submission state.
- Removed legacy Commercial route fallback.

No visible clipping, horizontal overflow, broken link, route error, or development-server error remained at the inspected desktop viewport.

## Accessibility and responsiveness

- Navigation, tabs, progress indicators, tables, forms, dialogs, review controls, and report-type choices expose semantic roles and accessible labels.
- Project and review details remain full pages; dialogs are limited to confirmation or contextual actions.
- Status is represented by text as well as color.
- Buttons preserve visible hierarchy, disabled states, focus-visible styling, and minimum target sizing from the existing design system.
- Charts retain legends, meaningful labels, and accessible tabular equivalents.
- Existing 1100px, 900px, and 680px breakpoints preserve content order and reduce the Dashboard KPI grid from four to two to one column.
- Browser testing was limited to the available Chromium surface; Safari and Edge were not available for direct visual inspection.

## Remaining prototype limitations

- Plan extraction, persistence, reminders, report generation, and exports are deterministic local simulations, not production integrations.
- Reset affects this browser’s local prototype state only; it does not represent server-side deletion.
- Some departments intentionally show **Unassigned contributor** because the canonical fixture has no assigned user.
- Separate Safari, Edge, multi-device persistence, and backend integration were not available or within the approved prototype scope.
- A full WCAG conformance audit was not performed; the requested basic accessibility checks passed.

## Unimplemented requirements

No requested Commercial Manager functional requirement remains knowingly unimplemented. Production OCR, live notification delivery, durable backend persistence, and document export were not added because the repository instructions explicitly define them as deterministic prototype simulations and the request prohibited new product scope.

## Scope confirmations

- No additional Commercial Manager module was introduced.
- Commercial navigation is exactly Dashboard, Plan, Projects, and Reporting.
- Reporting tabs are exactly Submissions and Reports.
- No Atlas design-system redesign was performed; the only visual correction restored an intended existing four-column grid behavior.
