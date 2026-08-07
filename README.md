# Atlas functional front-end prototype

Atlas is a functional front-end prototype for synthetic OML 30 plan tracking and weekly reporting. It connects one shared Manager update workflow with Commercial review and CEO/CFO visibility through typed, fixture-driven state.

> All operational, financial, HSE, and legal figures in this repository are synthetic and do not represent Shoreline Natural Resources’ actual performance.

## Completed scope

- Strict TypeScript React/Vite application with role-aware Manager, Commercial and Executive shells.
- Commercial Plan upload, deterministic extraction, editable review, validation and confirmed baseline persistence.
- Commercial Dashboard, Projects and Reporting driven by the confirmed plan and shared reporting records.
- Shared Manager Weekly Updates with drafts, attachments, deterministic charts, submission, resubmission, creator deletion and deadline locking.
- Canonical cross-role submissions and discussions visible to authorised Commercial Manager, CEO and CFO personas.
- Separate current-period CEO and CFO dashboards derived from the confirmed plan and validated reporting records, plus one shared Executive View Updates workspace with persisted discussions.
- Loading, empty, recoverable error, no-access, processing, conflict, read-only, and locked states through deterministic scenarios and route permissions.
- Device-local persistence and a confirmation-protected **Reset Atlas** action that clears the plan and cross-role workflow data.

See the latest Manager and Commercial build audits for verified route and workflow results. Earlier phase files remain historical acceptance records.

## Run locally

Requirements: Node.js 24 and npm 11, or compatible current LTS versions.

```bash
npm install
npm run dev
```

The default persona is Commercial Manager and the default context is the open weekly cycle.

## Deploy on Vercel

Use the Vite framework preset with `npm run build` and the `dist` output directory. The root `vercel.json` rewrites direct requests such as `/commercial` and `/executive` to `index.html`, allowing React Router to restore the correct page after a browser refresh.

## Demo personas and scenarios

Use the persona selector to switch among:

- Commercial Manager — Dashboard, Plan, Projects and Reporting. Reporting contains Submissions and Reports.
- Manager — one shared Weekly Updates and Submissions workspace; department changes assignment context without changing the interface.
- CEO — Dashboard and View Updates.
- CFO — Dashboard and View Updates.

Managers and Commercial Managers can draft and submit the same Weekly Update structure. Submitted updates use one canonical record across Manager, Commercial Manager, CEO and CFO views; comments share that record, resubmission replaces it, and the creator may delete it. After the reporting deadline, content is read-only while comments remain open.

Scenarios include canonical, empty, processing, conflict, and ready-to-publish states. **Restore canonical data** restores deterministic fixtures for scenario recovery. **Reset Atlas** is available from a confirmed Plan and clears all device-local plan, workflow, submission, discussion, recommendation and decision data so the walkthrough restarts at plan upload.

## Routes

| Route                           | Workspace                                                 |
| ------------------------------- | --------------------------------------------------------- |
| `/commercial`                   | Commercial Dashboard                                      |
| `/plan`                         | Approved-plan upload, extraction, review and confirmation |
| `/projects`                     | Commercial Projects                                       |
| `/projects/:projectId`          | Full-page project workspace                               |
| `/reviews`                      | Commercial Reporting: Submissions and Reports             |
| `/reviews/:id`                  | Full-page Commercial review                               |
| `/reviews/weekly-update`        | Commercial Manager participation in shared Weekly Updates |
| `/reviews/my-submissions`       | Commercial Manager's own Weekly Updates                   |
| `/reviews/weekly-updates/:id`   | Full-page submitted Weekly Update and discussion          |
| `/manager/weekly-updates`       | Shared Manager Weekly Updates                             |
| `/manager/submissions`          | Shared Manager Submissions                                |
| `/manager/submissions/:id`      | Full-page Manager submission and discussion               |
| `/executive`                    | CEO View                                                  |
| `/executive/cfo`                | CFO View                                                  |
| `/executive/view-updates`       | Shared CEO/CFO submitted-update list                      |
| `/executive/view-updates/:id`   | Shared CEO/CFO update detail and discussion               |
| `/executive/weekly-updates/:id` | Compatibility route for existing Executive update links   |

Legacy `/department` and `/department/reports/*` URLs redirect to the shared Manager routes; they do not render a department-specific Manager interface.

## Verification

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

Run the commands above after changes; current exact results are recorded in the latest build audit.

## Architecture

- `src/data/types.ts` — explicit planning, execution, decision, evidence, output, and history domain contracts.
- `src/data/atlas.ts` — typed fixture graph, selectors, status semantics, and formatters.
- `src/state/AtlasContext.tsx` — shared persona, direct-route persona persistence, context, scenarios, fixture restore and destructive reset.
- `src/state/managerUpdates.ts` — canonical Manager/Commercial Weekly Updates, comments, permissions, deadlines, resubmission and deletion.
- `src/state/workflow.ts` — Weekly Execution Updates, commitments, clarifications, Commercial review, publication, lock, revision, and audit state machine.
- `src/state/executive.ts` — decisions, assignments, progress, persistence, and audit state.
- `src/components/` — shells, design-system primitives, accessible charts, drawers, and dialogs.
- `src/pages/` — plan, Manager, Commercial review, project and Executive route implementations.
- `src/styles.css` — Atlas design tokens and locked desktop/responsive layout rules.

No backend, live authentication, live AI/OCR, regulator submission, external-system integration, or deployment is included.
