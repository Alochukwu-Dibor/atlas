# Commercial Manager Reporting — Build Audit

## Inspected before implementation

- The existing Commercial Manager Plan, Dashboard, and Projects routes and their shared confirmed-plan data.
- The workflow reducer, reporting-cycle fixtures, review queue, comments, audit events, and local prototype persistence.
- Existing Atlas shells, tabs, panels, tables, badges, drawers, forms, toast feedback, and review actions.
- Existing project identifiers and project workspace routes used by Dashboard and Projects.

## What was built

The Commercial Manager Reporting workspace now has exactly two primary tabs:

- **Submissions** — overall completeness, received/expected counts, pending status summary, submissions needing review, and deterministic follow-up reminders.
- **Reports** — generation and preview of Performance Report, Executive Summary, and Project Progress Report.

The workspace consumes the confirmed approved plan and the existing reporting workflow rather than introducing a disconnected reporting dataset.

## Routes

| Route           | Purpose                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `/reviews`      | Commercial Manager Reporting workspace; preserves the selected Submissions or Reports tab in the URL. |
| `/reviews/:id`  | Full-page submission review that is safe to refresh and link directly.                                |
| `/projects/:id` | Existing project workspace used by review and generated-report cross-links.                           |

The legacy review implementation was extended in place; existing workflow actions and route compatibility remain intact.

## Components and implementation

- Reused the existing application shell, `PageHeader`, `DetailTabs`, `Panel`, `DataTable`, `StatusBadge`, `Button`, `Drawer`, `StateView`, and toast patterns.
- Added a Reporting page composed from existing visual primitives rather than creating a new visual system.
- Extended the existing full-page review with submission identity, contributor, department, project, reporting period, methods, complete submitted content, evidence access, retained comments, and a back-to-Reporting action.
- Added concise responsive layout rules for completeness, follow-up rows, report choices, and generated previews.

## Data, statuses, and relationships

- Submission completeness is derived from the eight expected Atlas departments and workflow reports for the current reporting cycle.
- Received, pending, and awaiting-review totals are computed from workflow status rather than separately hard-coded UI totals.
- Confirmed-plan project IDs resolve project names and link review records to existing project workspaces.
- Report previews are derived from the same confirmed plan, Commercial Dashboard selectors, Commercial Projects selectors, and reporting-cycle data.
- Current prototype fixture result: 1 of 8 expected submissions received (13%), with one submission awaiting review.

## Comments and reminders

- General review comments append to the existing review comment history without changing submission status.
- Comments are retained by the existing local prototype persistence layer and remain visible after route navigation and refresh.
- Reminders are deterministic workflow records with cycle, department, project, recipient, sender, and timestamp.
- A reminder can be sent only once for the same cycle/department/project combination; the UI immediately changes to a disabled **Reminder sent** state and shows toast feedback.
- Both actions create workflow audit events.

## Report generation

- **Performance Report**: portfolio health, current production position, plan delivery, completeness, plan-versus-actual measures, and priority attention items.
- **Executive Summary**: concise portfolio position, weekly movement, material issues, and items requiring executive attention.
- **Project Progress Report**: confirmed projects, current phase, health, progress, and KPI/target/milestone adherence, with optional project scope.
- Generation uses a short deterministic loading state and then renders a data-derived preview. It does not imply a live document-generation integration.

## Cross-module links verified

- Reporting review row → `/reviews/rpt_hse_w31`.
- Direct refresh of the submission review route.
- Review → related project `/projects/prj_compressor` where a project is linked.
- Review → Back to Reporting.
- Invalid review ID → explicit error state with Back to Reporting action.

## Verification performed

Commands run successfully before the final commit:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm test -- --run`
- `npm run build`
- `git diff --check`

Automated coverage includes Reporting tab structure, completeness data, reminders, all three report previews, selector consistency, retained review comments, reminder audit events, and no-confirmed-plan behavior.

Browser QA at desktop size covered:

- Submissions layout, table, statuses, and follow-up list.
- Review navigation, direct URL, refresh, retained comment, and related-project navigation.
- Reminder success and duplicate-prevention state.
- All three report-type selections, loading state, preview switching, and project scope control.
- Invalid review-route error state.
- Layout overflow and visible component alignment.

## Known limitations

- File export is not added because this phase requested generated previews, and the repository models external export as a deterministic prototype simulation.
- Reminder delivery is simulated locally; no email or notification service is contacted.
- Unassigned departments use an explicit **Unassigned contributor** label until the fixture provides a department contributor.
- Cross-browser visual inspection is limited to the available in-app Chromium browser; lint, type, tests, and production build provide the remaining automated confidence.

## Earlier inconsistencies resolved

- Replaced the generic review landing experience with the approved two-tab Reporting workspace.
- Updated previous/next review navigation to the canonical `/reviews/:id` route.
- Added missing submission identity, full content context, general comments, and related-project navigation to review detail.
- Kept Reports separate from the older Outputs concept and limited generation choices to the three approved Commercial Manager reports.

## Remaining Commercial Manager work

- The four approved Commercial Manager modules — Dashboard, Plan, Projects, and Reporting — are now wired to the confirmed-plan and workflow sources.
- Remaining work is limited to any future owner-approved end-to-end polish, additional fixture breadth, or export simulation; no additional Commercial Manager module is required.
