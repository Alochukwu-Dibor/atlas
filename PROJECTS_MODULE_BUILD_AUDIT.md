# Commercial Manager Projects module build audit

## Pages and routes built

- `/projects` — confirmed-plan project list with exactly Project name, Current phase, Health and Progress columns.
- `/projects/:projectId` — refresh-safe, full-page project workspace.
- `/projects/:projectId?view=overview` — project overview.
- `/projects/:projectId?view=adherence&measure=:measureId` — KPI, target and milestone adherence with optional focused measure.
- `/projects/:projectId?view=activity` — chronological project activity log.
- Unknown project identifiers render a Project not found state with a return action.
- Projects without a confirmed plan render a Plan-linked empty state.

## Components added, reused or changed

- Added `CommercialProjectsPage` for the confirmed-plan list and full-page workspace.
- Reused the Atlas `PageHeader`, `Panel`, `DataTable`, `DetailTabs`, `KpiCard`, `StatusBadge`, `StateView`, `Field` and `Button` components.
- Reused native progress elements with explicit accessible labels for list progress, adherence and summary progress.
- Added project-workspace layout styles for the status summary, insights, adherence tables and activity timeline while preserving existing tokens and responsive patterns.
- Updated App routing so project URLs render the full page rather than the previous drawer.

## Project data model and derivation

- Added shared selectors in `src/data/commercialProjects.ts`; no additional project fixture was created.
- Project names, budgets, timelines, KPI links, targets and milestones originate from `plan.confirmedPlan`.
- Current phase, health and progress come from the matching shared reporting/domain project with the same stable project ID.
- KPI and target actuals come from the shared KPI-target reporting records matched by KPI ID.
- Milestone status comes from the shared milestone record matched by the confirmed milestone ID.
- Project activity is assembled from the plan confirmation, workflow submissions and approvals, historical revisions, and linked review comments.

## Health, progress and adherence logic

- Health uses the same normalization as the Dashboard: delayed/critical = Critical; at-risk/needs-attention = At risk; otherwise On track.
- Project-health percentages use the same Dashboard roll-up weights: On track 100%, At risk 65%, Critical 25%.
- Progress is the latest reported project completion percentage; a confirmed project without a matching report is shown as 0% and Awaiting first report.
- KPI/target adherence is actual divided by the approved target, capped at 100%. Lower-is-better TRIR reverses the ratio; zero-baseline variance uses an adverse-distance calculation.
- Milestone adherence is 100% On track, 65% At risk, 25% Delayed/Critical and 0% when reporting is missing.
- The overview adherence percentage is the average of confirmed targets and milestones, avoiding duplicate weighting from the KPI summary rows.

## Navigation paths verified

- Dashboard Portfolio Health → `/projects`.
- Dashboard attention project → `/projects/:projectId`.
- Projects table row → `/projects/:projectId`.
- Overview KPI card, Project insight and View adherence → the linked adherence view/measure.
- Activity records → the linked Plan, project or submission-review record.
- Back to Projects → `/projects`.
- Direct refresh-style navigation to `/projects/prj_integrity?view=adherence` retained the correct project and selected view.
- `/projects/not-a-project` rendered the expected invalid-ID state.

## Tests and commands

- `npm run format` — passed.
- `npm run lint` — passed with zero warnings.
- `npm run typecheck` — passed.
- `npm test -- --run` — passed: 11 files, 73 tests.
- `npm run build` — passed.
- `git diff --check` — passed.

Tests cover confirmed-plan list derivation, Dashboard/Projects consistency, adherence calculation, chronological activity, list and workspace routes, direct detail loading, invalid IDs, no-plan behavior, search, tabs and full-page navigation.

## Visual QA

The in-app desktop browser was used to inspect:

- the four-column Projects table and progress indicators;
- the Overview status strip, KPI card, objective, target adherence and project insights;
- KPI, target and milestone adherence tables;
- the chronological Activity log;
- Dashboard-to-Projects navigation, direct detail loading, adherence navigation, Back to Projects and invalid IDs.

No page-level drawer remained on the routed experience. No visible clipping, route failure or development-server error was observed at the available desktop viewport.

## Cross-module inconsistencies corrected

- The previous Projects list used all operational project records even when no plan was confirmed; it now lists only confirmed-plan project identifiers and names.
- The previous project route opened a drawer, so a refresh did not represent a dedicated workspace state; it now renders a full page and encodes the selected view in the URL.
- Dashboard labels the most severe project state Critical while the source fixture uses Delayed; Projects now uses the same normalized Critical status as Dashboard.
- The previous list exposed eight columns and duplicated objective, budget, risk and milestone detail; the primary table now contains the four approved columns and moves measure detail into the workspace.

## Known limitations

- Some confirmed projects do not yet have linked submissions or revision events. Their activity log therefore contains only source-backed events that exist in the prototype rather than invented reminders or comments.
- KPI actuals are shared reporting measures. When one approved KPI is linked to more than one confirmed project, Atlas shows the same validated actual against each project-specific approved target.
- Separate Safari and Edge visual sessions were not available in this environment.

## Remaining Reporting work

- Complete the Commercial Manager Reporting module around confirmed-plan project context and stable project IDs.
- Ensure submission review, consolidation/publication and output readiness use the same baseline and link back to the relevant project workspace where applicable.
