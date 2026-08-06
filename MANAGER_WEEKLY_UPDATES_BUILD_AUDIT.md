# Shared Manager Weekly Updates — Build Audit

## Outcome

The former department-specific Contributor entry points now resolve to one shared Manager workspace. The role switcher exposes one **Manager** persona, and Manager navigation contains only **Weekly Updates** and **Submissions**. Department remains record context and changes the active Manager identity and project assignments without changing the interface.

Commercial Managers use the same Weekly Update component from Reporting while retaining the approved Commercial navigation: Dashboard, Plan, Projects and Reporting.

## Routes and access

| Route                           | Access and purpose                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| `/manager/weekly-updates`       | Manager create, reopen and submit workflow.                                                |
| `/manager/submissions`          | Creator-only drafts and submitted-update history.                                          |
| `/manager/submissions/:id`      | Full-page Manager submission detail; drafts are creator-only.                              |
| `/reviews/weekly-update`        | The same update component for the Commercial Manager, mounted inside the Commercial shell. |
| `/reviews/weekly-updates/:id`   | Submitted update detail for an authorised Commercial Manager.                              |
| `/executive/weekly-updates/:id` | Submitted update detail with CEO/CFO authorisation.                                        |

Legacy `/department` and `/department/reports/*` URLs redirect to the canonical Manager routes so saved prototype links do not fail. They no longer render the old department-specific workflow.

## Workflow completed

- Open-cycle context shows reporting period, deadline and only projects assigned to the active Manager.
- Closed cycles display a locked empty state and do not render create or submit controls.
- Exactly four required content sections are used: Highlights from the Previous Week, Ongoing Activities, Risks and Plans for the Week.
- Supporting Documents is optional and accepts PDF, DOCX, XLSX, PNG and JPG files up to 10 MB, with uploaded/error metadata and removal.
- Highlights can generate a deterministic Bar or Line chart from entered numeric values. Preview actions are Generate, Keep, Regenerate and Remove.
- Save as Draft validates only the reporting context, retains partial text, chart and attachments, and reopens the unique creator/project/period record rather than creating duplicates.
- Submit Update validates all four content sections, records a deterministic prototype timestamp, locks the submitted record and shows success actions.
- Drafts are visible only to their creator. Submitted records are authorised for Commercial Manager, CEO and CFO roles.
- No approval workflow was added.

## Shared data and state

`src/state/managerUpdates.ts` defines the shared types for project assignments, reporting context, Weekly Update sections, generated charts, attachments and submission status. Stable IDs are reused from the existing Atlas project, department, user and reporting-period fixtures.

The reducer enforces one update for each creator/project/reporting-period key and persists the prototype state under `atlas.manager-updates.v1`. Reset Atlas clears this state through `AtlasContext` alongside the existing prototype state.

Two missing department Manager identities were added to the canonical mock data so Supply Chain and Community Relations no longer inherit another department's assignments. Their project assignments use existing confirmed project IDs.

## Components reused and changed

- Reused the existing application shells, PageHeader, Panel, Field, Button, DataTable, StatusBadge, Modal, StateView, toast and accessible ChartWrapper patterns.
- Added `ManagerUpdatesPage.tsx` for the shared create, list and full-page detail experiences.
- Simplified the role switcher to CEO, CFO, Commercial Manager and Manager.
- Replaced Contributor navigation with the two approved Manager destinations.
- Added a Submitted Weekly Updates table to Commercial Reporting and a **Create my Weekly Update** action that mounts the shared workflow contextually.
- Added responsive Manager form, attachment and submission-detail layout using existing Atlas tokens.

## Verification results

- `npm run format:check` — passed.
- `npm run lint` — passed with zero warnings.
- `npm run typecheck` — passed in strict TypeScript mode.
- `npm test` — passed: 13 test files, 82 tests.
- `npm run build` — passed; Vite production bundle generated.
- `git diff --check` — passed.

Focused tests cover Manager role consolidation, two-link navigation, department switching, assigned projects, partial draft save/reopen, required-section validation, deterministic chart generation, valid attachment persistence, submission success, closed-cycle prevention, Commercial reuse of the same form, creator/project/period uniqueness and submitted-role visibility.

## Visual QA

The in-app Chromium browser was used at the default desktop viewport and a temporary 768 px responsive viewport. Inspected states included:

- Manager role selection and exactly two navigation links.
- Operations project assignments and all four required sections.
- Open-cycle deadline/status presentation.
- Closed-cycle locked state.
- Desktop two-column and responsive one-column section layouts.
- No horizontal overflow at 768 px.
- Commercial navigation preservation around the shared workflow.
- Browser console warnings and errors; none were present.

## Known prototype limitations

- Attachments, chart generation, persistence and submission visibility are deterministic browser-local simulations. Files are represented by metadata and are not uploaded to a server.
- CEO/CFO authorisation is implemented through the shared full-page detail route; no new executive dashboard queue was introduced because the existing executive scope excludes raw submission queues.
- Legacy department URLs remain redirects for compatibility rather than returning 404.
- Direct Safari and Edge visual sessions were unavailable; responsive behavior was verified in Chromium and through automated tests.

## Scope confirmation

- Manager navigation contains only Weekly Updates and Submissions.
- The role switcher contains only one Manager option; no department-specific role options remain.
- Commercial Manager navigation remains exactly Dashboard, Plan, Projects and Reporting.
- No new Commercial module, department UI variant, approval workflow or design-system redesign was introduced.
