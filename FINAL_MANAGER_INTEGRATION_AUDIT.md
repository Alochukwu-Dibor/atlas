# Final Manager Integration and Quality Audit

## Outcome

The completed Atlas prototype now has one shared **Manager** experience with exactly two modules: **Weekly Updates** and **Submissions**. Department selection changes the active Manager identity and assigned-project context; it does not change the interface or navigation.

Submitted Weekly Updates use one canonical persisted record across Manager, Commercial Manager, CEO and CFO views. The creator can now delete a submitted update, including a deadline-locked update. Deletion removes the canonical record and its shared comments from every role view.

The Commercial Manager's **Reset Atlas** action is distinct from scenario recovery. It clears the confirmed plan and all persisted workflow, Weekly Update, comment, review, recommendation and executive-decision records, then returns to plan upload. Manager, CEO, CFO and Commercial screens display empty states until a new approved plan is confirmed.

## Module and route map

| Workspace                    | Route                                               | Result                                                                           |
| ---------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| Manager Weekly Updates       | `/manager/weekly-updates`                           | Create, save, reopen, submit and resubmit the shared four-section Weekly Update. |
| Manager Submissions          | `/manager/submissions`                              | Creator-only history of drafts and submitted updates.                            |
| Manager submission detail    | `/manager/submissions/:id`                          | Full-page detail, discussion, edit/resubmit where open, and creator deletion.    |
| Commercial Dashboard         | `/commercial`                                       | Approved Dashboard; empty until a plan is confirmed.                             |
| Commercial Plan              | `/plan`                                             | Upload, extraction, review, confirmation and destructive Reset Atlas.            |
| Commercial Projects          | `/projects`, `/projects/:projectId`                 | Confirmed-plan project list and full-page detail.                                |
| Commercial Reporting         | `/reviews`                                          | Exactly Submissions and Reports.                                                 |
| Commercial participation     | `/reviews/weekly-update`, `/reviews/my-submissions` | Reuses the shared Manager form and creator history.                              |
| Commercial update detail     | `/reviews/weekly-updates/:id`                       | Full-page authorised submitted-update detail and discussion.                     |
| Commercial review detail     | `/reviews/:id`                                      | Full-page reporting review.                                                      |
| CEO                          | `/executive`                                        | Executive view and submitted Weekly Updates; empty without a plan.               |
| CFO                          | `/executive/cfo`                                    | Finance view and submitted Weekly Updates; empty without a plan.                 |
| Executive update detail      | `/executive/weekly-updates/:id`                     | Full-page shared submitted-update discussion.                                    |
| Executive contextual modules | `/executive/decisions`, `/executive/outputs`        | Existing Executive modules; empty behind the no-plan shell after Reset Atlas.    |

Legacy `/department` and `/department/reports/*` routes redirect to the canonical Manager routes and do not render a department-specific experience. Unknown submission IDs render **Submission not found**; an unauthorised record renders **Submission unavailable** without exposing content.

## Cross-role permissions

| Capability                    | Manager                          | Commercial Manager                                 | CEO                          | CFO                          |
| ----------------------------- | -------------------------------- | -------------------------------------------------- | ---------------------------- | ---------------------------- |
| Create a Weekly Update        | Assigned confirmed-plan projects | Assigned confirmed-plan projects through Reporting | No                           | No                           |
| View a draft                  | Creator only                     | Creator only                                       | No                           | No                           |
| View submitted updates        | Own submissions                  | Own plus authorised submitted Manager records      | Authorised submitted records | Authorised submitted records |
| Edit/resubmit before deadline | Creator                          | Creator                                            | No                           | No                           |
| Edit after deadline           | No                               | No                                                 | No                           | No                           |
| Comment after submission      | Yes, when visible                | Yes, when visible                                  | Yes, when visible            | Yes, when visible            |
| Delete submitted update       | Creator only                     | Creator only                                       | No                           | No                           |

The delete reducer validates submitted status and creator identity. The UI additionally applies the shared role, assignment and creator permission selector. Deleting a record also deletes its shared discussion because comments are nested on the same canonical submission.

## Canonical data and derivation rules

- `ManagerUpdatesState` version 2 is the single device-local source for drafts, submitted updates, attachments, generated charts and shared comments.
- Stable update IDs are retained through submission and resubmission.
- The `UPSERT_UPDATE` reducer enforces one record per creator, project and reporting period; resubmission replaces the existing record instead of appending a duplicate.
- Confirmed-plan project IDs are used for Manager assignments and Commercial drill-downs.
- Reporting deadlines come from the shared reporting-cycle fixture and are evaluated against the deterministic prototype timestamp.
- Drafts have no cross-role visibility. Submitted records declare Commercial Manager, CEO and CFO visibility and are filtered through central permission helpers.
- Reset Atlas dispatches explicit `CLEAR_ALL` actions to workflow, Manager updates, recommendations and executive state, resets Plan to its empty upload state and clears every related local-storage key.
- **Restore canonical data** remains a separate recovery action that restores deterministic fixtures; it is not the destructive Plan reset.

## Components and code changes

### Reused

- Existing `Modal`, `Button`, `StateView`, `PageHeader`, `Panel`, `DataTable`, `StatusBadge` and toast components.
- Existing full-page Manager submission detail and shared role shell.
- Existing plan confirmation and role-switching flows.

### Changed

- `ManagerSubmissionDetailPage`: creator-only destructive action, confirmation copy and canonical deletion dispatch.
- `ManagerWeeklyUpdatesPage`: confirmed-plan requirement and no-assignment empty state.
- `ScenarioOutlet`: shared no-plan guard for CEO, CFO, Decisions and Outputs.
- `AtlasContext`: separate `resetAtlas` from fixture-restoring `resetDemo`.
- Manager, workflow, recommendation and executive reducers: explicit empty-state reset actions.
- Plan reset warning: accurately identifies every cleared role and record category.
- README: current shared Manager terminology, route map, deadline behaviour, cross-role visibility and reset semantics.

### Removed or consolidated

- No new department-specific Manager component or navigation was introduced.
- No safe live component was found that needed deletion in this pass. Legacy department URLs remain lightweight compatibility redirects rather than duplicated pages.
- Reset and delete logic is centralised in reducers/context rather than duplicated across role pages.

## End-to-end verification

The automated integration suite verifies:

1. One Manager persona and exactly two Manager navigation links.
2. Department switching with shared UI and stable project assignments.
3. Open-period project selection and four required update sections.
4. Deterministic chart generation and supported attachment metadata.
5. Partial draft save, creator-only visibility and reopen.
6. Submission visibility to Commercial Manager, CEO and CFO.
7. Commercial, CEO and CFO comments and Manager response on one shared record.
8. Before-deadline edit/resubmit with no duplicate record.
9. After-deadline content locking with discussion still available.
10. Creator-only submitted-update deletion and canonical removal.
11. Unknown-ID and no-access states.
12. Manager denial on Commercial Reporting.
13. Plan confirmation validation and destructive reset persistence for plan, workflow, Manager, recommendation and Executive stores.

Browser QA additionally verified the complete fixture plan upload/extraction/confirmation sequence, a deadline-locked Manager submission detail, the delete warning and deletion, disappearance from CEO visibility, destructive Plan reset, and empty states after switching to Manager, CEO, CFO and Commercial Manager.

## Commands and exact results

| Command                | Result                                                 |
| ---------------------- | ------------------------------------------------------ |
| `npm run format:check` | Pass; all files match Prettier style.                  |
| `npm run lint`         | Pass; zero warnings with `--max-warnings 0`.           |
| `npm run typecheck`    | Pass; strict TypeScript build completed.               |
| `npm test`             | Pass; 13 files, 91 tests.                              |
| `npm run build`        | Pass; Vite production build transformed 2,389 modules. |
| `git diff --check`     | Pass; no whitespace errors.                            |

## Visual, accessibility and responsive QA

- Inspected Plan upload, extraction review, confirmation summary, confirmation modal and confirmed state.
- Inspected Manager Weekly Updates, Submissions, deadline-locked full-page detail, discussion, delete action and delete modal.
- Inspected post-delete CEO submitted-update empty state.
- Inspected post-reset Manager, CEO, CFO and Commercial empty states.
- Confirmed the role switcher contains one Manager option and the Manager navigation contains only Weekly Updates and Submissions.
- Confirmed semantic headings, labelled select controls, modal names, status text, disabled action states and keyboard-addressable native controls in the DOM accessibility snapshot.
- At 768 px viewport, the Commercial empty-state page had a 768 px document width with no horizontal overflow.
- Browser console inspection returned no warnings or errors during deletion, role switching or reset.

## Problems fixed

- Plan Reset previously used the fixture-restoring action, so workflow, submission, recommendation and executive fixtures reappeared. It now uses an explicit destructive reset.
- CEO and CFO previously continued showing static fixture data after the plan was cleared. The Executive shell now presents a shared no-plan empty state.
- Manager project selectors previously fell back to static project fixtures when no plan was confirmed. They now require the confirmed-plan source of truth.
- Submitted Weekly Updates previously had no delete operation. Creators now have a confirmation-protected delete action with central reducer validation.
- The active README described superseded department-specific Manager and Commercial module structures. It now reflects the implemented shared experience.

## Remaining prototype limitations

- Persistence is browser-local and deterministic; there is no backend, multi-device synchronisation or production authentication.
- Uploaded supporting documents store prototype metadata only; file preview and durable object storage are intentionally absent.
- Generated charts deterministically extract numeric values from Highlights; they do not use live AI interpretation.
- Comments and role visibility simulate shared records in one browser profile rather than a real multi-user service.
- The responsive audit covered the supported desktop/tablet breakpoint at 768 px, not a dedicated mobile application.

No requested Manager integration requirement remains knowingly unimplemented. No additional Manager or Commercial module was introduced, and the Atlas design system was not redesigned.
