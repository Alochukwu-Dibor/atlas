# Atlas functional front-end prototype

Atlas is the completed front-end prototype for synthetic OML 30 executive reporting. It connects Department Manager reporting, Commercial review and publication, performance modules, and CEO decisions through one typed, fixture-driven state model.

> All operational, financial, HSE, and legal figures in this repository are synthetic and do not represent Shoreline Natural Resources’ actual performance.

## Completed scope

- Strict TypeScript React/Vite application with role-aware Department, Commercial/module, and CEO shells.
- Phase 1 decision-intelligence foundation: approved business plan, linked execution entities, Weekly Execution Updates, CFO persona, Outputs, Decision Support, evidence, and revision history.
- Phase 2 contributor and review workflow: structured weekly execution content, operational activities, commitment outcomes and revisions, contextual evidence, clarifications, table-led Commercial Reviews, rejection, and approval.
- All ten specified routes and their locked desktop/responsive structures, plus the approved Commercial Projects and Recommendations workspaces.
- Exactly four Department input methods, repeatable multi-source entry, deterministic extraction states, conflicts, source lineage, corrections, certification, clarification, resubmission, override, and approval.
- Commercial readiness, executive-narrative preview, controlled publication exceptions, publication gate, CEO notification simulation, immutable published cycles, and separate post-publication revisions.
- CEO production, cash, HSE, legal, recommendation, decision, and assignment experiences.
- Closed-loop assigned-action inboxes with owner, due date, progress status, note, and audit event.
- Production, Finance, HSE, and Legal & Regulatory charts, accessible data tables, filters, evidence drawers, and synthetic export disclosures.
- Loading, empty, recoverable error, no-access, processing, conflict, read-only, and locked states through deterministic scenarios and route permissions.
- Device-local persistence and a confirmation-protected canonical reset.

See [PHASE_2_AUDIT.md](./PHASE_2_AUDIT.md) for the current IA-refinement audit. [PHASE_1_AUDIT.md](./PHASE_1_AUDIT.md), [FINAL_ACCEPTANCE.md](./FINAL_ACCEPTANCE.md), and [BUILD_AUDIT.md](./BUILD_AUDIT.md) retain earlier acceptance records.

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

- Commercial Manager — Business Overview, Execution, Projects, Reviews, Decisions, Outputs, and configuration.
- CEO — validated CEO View, Decisions, Outputs, and existing executive actions.
- CFO — shared-data CFO View, Decisions, and Outputs.
- Department Managers — select any of the eight reporting departments and use department-matched structured fields, extracted fixtures, returned actions, locked reports, and revisions.

Scenarios include canonical, empty, processing, conflict, and ready-to-publish states. The ready-to-publish scenario deterministically supplies approved mandatory reports. Reset demo asks for confirmation before clearing all device-local changes.

## Routes

| Route                     | Workspace                                 |
| ------------------------- | ----------------------------------------- |
| `/commercial`             | Commercial Business Overview              |
| `/execution`              | Business-plan objective execution         |
| `/projects`               | Projects                                  |
| `/reviews`                | Weekly Execution Update review queue      |
| `/reviews/:id`            | Update Review                             |
| `/decisions`              | Commercial Decisions and Decision Support |
| `/outputs`                | Commercial Outputs                        |
| `/kpi-library`            | KPI Library                               |
| `/reporting-templates`    | Reporting Templates                       |
| `/settings`               | Prototype Settings                        |
| `/department`             | Contributor My Updates                    |
| `/department/reports/new` | Contributor Submit Update                 |
| `/department/reports/:id` | Weekly Execution Update review/revision   |
| `/executive`              | CEO View                                  |
| `/executive/cfo`          | CFO View                                  |
| `/executive/decisions`    | Executive Decisions                       |
| `/executive/outputs`      | Executive Outputs                         |

The legacy `/commercial/review/:id`, `/recommendations`, `/production`, `/finance`, `/hse`, and `/legal` routes remain available while later phases migrate their detailed content.

## Verification

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

The Phase 2 suite passes formatting, lint, strict typecheck, 45 tests, and production build. See the current audit for deferred detailed IA work.

## Architecture

- `src/data/types.ts` — explicit planning, execution, decision, evidence, output, and history domain contracts.
- `src/data/atlas.ts` — typed fixture graph, selectors, status semantics, and formatters.
- `src/state/AtlasContext.tsx` — shared persona, context, scenarios, persistence, and reset.
- `src/state/workflow.ts` — Weekly Execution Updates, commitments, clarifications, Commercial review, publication, lock, revision, and audit state machine.
- `src/state/executive.ts` — decisions, assignments, progress, persistence, and audit state.
- `src/components/` — shells, design-system primitives, accessible charts, drawers, and dialogs.
- `src/pages/` — architecture, contributor, review, executive, and performance route implementations.
- `src/styles.css` — Atlas design tokens and locked desktop/responsive layout rules.

No backend, live authentication, live AI/OCR, regulator submission, external-system integration, or deployment is included.
