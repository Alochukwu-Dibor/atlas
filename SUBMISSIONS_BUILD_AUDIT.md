# Shared Manager Submissions — Build Audit

## Outcome

The Submissions experience now provides creator-only history, full-page submission detail, before-deadline editing and resubmission, after-deadline content locking, and a single persisted discussion thread shared by Managers, Commercial Managers, the CEO and the CFO.

No new Manager or Executive navigation module was introduced. Manager navigation remains exactly **Weekly Updates** and **Submissions**.

## Routes and screens

| Route                           | Screen and access                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `/manager/submissions`          | Signed-in Manager's own drafts and submitted updates.                                               |
| `/manager/submissions/:id`      | Creator detail, edit/resubmit entry point and discussion.                                           |
| `/reviews/my-submissions`       | Commercial Manager's own contributor history inside the Commercial shell.                           |
| `/reviews/weekly-updates/:id`   | Authorised Commercial detail for submitted Manager updates or the Commercial Manager's own records. |
| `/executive/weekly-updates/:id` | Shared submitted-update detail for CEO and CFO.                                                     |

The existing `/reviews` Reporting screen now links to submitted Manager updates and provides **My submissions** and **Create my Weekly Update** actions. CEO View and CFO View contain contextual Submitted Weekly Updates tables; no separate Executive module was added.

## Submission behaviour

- History shows Reporting Period, Project, Date Submitted and Status only.
- Drafts display **Not submitted** and remain visible only to their creator.
- Records sort by newest reporting period, with saved time as a stable tie-breaker.
- Search filters by period, project or status; the table uses five-row pagination with existing Atlas fields, buttons and table styling.
- Stable record IDs support refresh-safe full-page detail routes.
- Unknown IDs show **Submission not found**; denied records show **Submission unavailable** without exposing draft content.
- Detail shows period, project, creator, department, status, submission date, deadline, all four update sections, generated chart, attachment metadata and discussion.

## Deadline and resubmission rules

The deterministic prototype clock is 3 August 2026. This keeps the 4 August current cycle editable and the 28 July historical cycle locked.

- Draft creator: view, continue editing, save and submit before the deadline.
- Submitted creator before deadline: view, edit locally and resubmit. The canonical submitted record remains unchanged until **Resubmit Update** is selected.
- Resubmission reuses the same submission ID and creator/project/period key, replaces content, chart and attachments, and advances the submission timestamp.
- Submitted creator after deadline: view only, with an explicit deadline-passed explanation.
- Discussion remains active after the content deadline.
- The reducer continues preventing duplicate creator/project/reporting-period records.

## Cross-role visibility and permissions

Central helpers in `src/state/managerUpdates.ts` evaluate View Update, View Draft, Edit Update, Resubmit Update and Comment permissions from the user, role, assigned project, status and deadline.

- Managers see only records they created for assigned projects.
- Commercial Managers see their own drafts in My submissions and submitted Manager records for permitted projects in Reporting.
- CEO and CFO see only submitted records authorised for their roles.
- Commercial and Executive users cannot edit another user's update.
- Draft records are never returned by cross-role selectors.

## Comments and attachments

- Each submitted update owns one canonical `comments` array.
- Comments retain stable ID, author, role, text and timestamp.
- Commercial Manager, CEO and CFO can comment; the submission creator can respond.
- Empty comments are blocked in both the UI and reducer.
- Comments never mutate submission sections, chart or attachments and persist with the existing browser-local state.
- Submitted attachments display their recorded metadata. Because the prototype stores no file bytes, it explicitly reports preview unavailability and does not render fake download links.

## Components and data changes

- Reused PageHeader, Panel, Field, Button, DataTable, StatusBadge, StateView, ChartWrapper and the existing Commercial and Executive shells.
- Extended `ManagerWeeklyUpdate` with a persisted discussion thread and migrated existing version-one browser records with empty comments.
- Added reusable permission and deadline selectors instead of duplicating role logic in each page.
- Added one reusable Executive submitted-update table consumed by both CEO and CFO views.
- Added responsive history, pagination, status and discussion styling using existing Atlas tokens.

## Verification

- `npm run format:check` — passed.
- `npm run lint` — passed with zero warnings.
- `npm run typecheck` — passed in strict TypeScript mode.
- `npm test -- --reporter=dot` — passed: 13 files, 89 tests.
- `npm run build` — passed; Vite production bundle generated.
- `git diff --check` — passed.

Verified automated flows include draft privacy, creator-only history, required submission fields, chart and attachment retention, submission, edit/resubmit replacement, duplicate prevention, deadline locking, Commercial comments/project access, CEO/CFO visibility and comments, Manager response to an Executive comment, unknown IDs and permission failures.

Browser QA covered Manager history/detail, the locked historical record, attachment fallback, responsive one-column layout at 768 px, Commercial Reporting integration, CEO submitted-update integration and route transitions. No horizontal overflow or browser console warnings/errors were found.

## Known limitations and remaining work

- Persistence, timestamps, attachments and discussions are deterministic browser-local simulations, not backend services.
- Attachment contents are unavailable after selection because the prototype intentionally stores metadata only.
- The Executive tables are contextual read surfaces rather than a new queue or module.
- Direct visual QA used the available Chromium surface; Safari and Edge were not available.
- No approval workflow, external messaging, document service or new navigation scope was added.
