# Executive View Updates Build Audit

## Outcome

CEO and CFO retain separate dashboards and now share one **View Updates** workspace backed by the existing canonical Manager submission state. Both Executive navigation bars contain exactly **Dashboard** and **View Updates**. No approval workflow, notification system or additional Executive module was introduced.

Atlas now also includes a restrained SVG favicon at `public/atlas-mark.svg`, linked from `index.html`.

## Navigation and routes

| Route                           | Access      | Purpose                                              |
| ------------------------------- | ----------- | ---------------------------------------------------- |
| `/executive`                    | CEO         | Existing CEO Dashboard.                              |
| `/executive/cfo`                | CFO         | Existing CFO Dashboard.                              |
| `/executive/view-updates`       | CEO and CFO | Shared authorised submitted-update list.             |
| `/executive/view-updates/:id`   | CEO and CFO | Shared full-page update detail and discussion.       |
| `/executive/weekly-updates/:id` | CEO and CFO | Compatibility route for existing saved update links. |

The obsolete Executive Decisions and Outputs destinations were removed from navigation and the active route tree. Existing Commercial and Manager navigation remains unchanged.

The selected persona is now persisted device-locally so refreshing a direct CEO/CFO update URL retains the current Executive permission context. Invalid IDs render **Submission not found**; drafts and other unauthorised records render **Submission unavailable** without exposing content.

## Shared list

`ExecutiveUpdatesPage` reuses the existing page header, panel, field, table, button, pagination and empty-state primitives. It displays only `submitted` records authorised for the active CEO or CFO role.

The table contains exactly:

- Reporting Period
- Manager & Department
- Project
- Date Submitted
- Action

Records are sorted by reporting-period end date and then submission timestamp, newest first. Search covers period, contributor, department and project. Each row has a keyboard-accessible **View update** button. Drafts never enter the selector or table. Empty canonical state produces a dedicated no-updates state; route-level Suspense retains the existing loading state.

## Detail, comments, charts and attachments

The Executive detail route reuses `ManagerSubmissionDetailPage`, the same canonical record and the same discussion thread used by Manager and Commercial Manager views.

- Detail shows reporting period, contributor, department, project, submission date and all four saved content sections.
- Saved generated charts render through the existing accessible `ChartPreview` and data-table fallback.
- Supporting documents reuse the existing prototype attachment metadata and preview-unavailable treatment.
- CEO and CFO can post non-empty comments and see Commercial/Manager comments and responses.
- Comments append to the submission without changing any submitted section.
- Submission creators retain response access in their existing Manager or Commercial workspace.
- CEO and CFO never receive edit, resubmit or delete controls.
- Deadline locking continues to block creator content editing without closing discussion.
- **Back to View Updates** returns to the shared list.
- **Open related project** uses the existing confirmed project workspace and permissions.

## Canonical model and permissions

- `ManagerUpdatesState` remains the single persisted source for drafts, submissions, charts, attachments and comments.
- Stable IDs and the existing creator/project/period uniqueness rule prevent duplicate submissions.
- `selectVisibleSubmittedUpdates` filters by submitted status and declared role visibility, then applies deterministic period/date sorting.
- Existing `canViewDraft`, `canViewUpdate`, `canEditUpdate`, `canCommentOnUpdate`, `canResubmitUpdate` and `canDeleteUpdate` helpers remain authoritative.
- CEO/CFO visibility requires a submitted record whose `visibleToRoles` includes the active role.
- Drafts remain creator-only; Executive users cannot edit or delete any submission.

## Components changed or reused

### Changed

- `ExecutiveUpdatesPage` replaces the reduced dashboard-embedded update table with the complete shared list.
- `ManagerSubmissionDetailPage` now uses Executive-specific back navigation and exposes the existing project link to authorised Executives.
- `ExecutiveShell` now builds two role-correct navigation items only.
- `AtlasContext` persists the active persona for direct route refresh.
- CEO and CFO dashboards no longer duplicate a submitted-update panel.

### Reused

- Canonical Manager update state, reducer, selectors and permission helpers.
- Full-page submission detail, discussion, generated chart and attachment components.
- Atlas table, pagination, fields, buttons, panels, state views and responsive styles.

### Removed where safe

- Executive Decisions and Outputs route imports and route entries.
- Dashboard-level `SubmittedWeeklyUpdatesPanel` and its duplicate CEO/CFO rendering.
- Obsolete Executive navigation entries for CEO View, CFO View, Decisions and Outputs.

## Verification

Automated coverage verifies:

- CEO and CFO navigation contains exactly Dashboard and View Updates.
- Manager and Commercial Manager submitted records appear in the same Executive list.
- Drafts do not appear.
- Search filtering and the five required table columns.
- CEO and CFO use the same list/detail component and canonical comments.
- Chart and attachment rendering.
- CEO comment, CFO comment and creator response persistence.
- No Executive edit, resubmit or delete controls.
- Direct-detail persona restoration, invalid IDs and unauthorised drafts.
- Empty Executive update state.
- Reporting-period and submission-date sorting.
- Existing Manager, Commercial, Dashboard, Project, Reporting and reset flows.

Browser QA verified CEO list/detail navigation, saved chart rendering, CEO comment creation, CFO access to the same comment, absence of Executive edit/delete actions, direct CFO detail refresh, invalid-ID fallback, favicon presence, zero console warnings/errors and no page-level overflow at 768 px.

## Commands and results

| Command                | Result                             |
| ---------------------- | ---------------------------------- |
| `npm run format:check` | Passed.                            |
| `npm run lint`         | Passed with zero warnings.         |
| `npm run typecheck`    | Passed.                            |
| `npm test`             | Passed: 13 files, 94 tests.        |
| `npm run build`        | Passed: 2,389 modules transformed. |
| `git diff --check`     | Passed.                            |

## Known limitations

- Persistence and role switching remain deterministic browser-local prototype simulations, not multi-user authentication or a backend.
- Attachments retain metadata only; durable file storage and document preview are outside prototype scope.
- Comments simulate a shared thread inside one browser profile.
- The compatibility `/executive/weekly-updates/:id` route remains to avoid breaking saved prototype links; new navigation uses `/executive/view-updates/:id`.

## Remaining dashboard work

No Dashboard change was required by this phase. The existing CEO and CFO dashboards remain separate and passed route and visual checks. Any future Dashboard content change requires separate product approval; no known Dashboard defect was introduced or left unresolved by View Updates.
