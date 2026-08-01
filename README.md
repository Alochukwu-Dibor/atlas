# Atlas functional front-end prototype

Atlas is the completed front-end prototype for synthetic OML 30 executive reporting. It connects Department Manager reporting, Commercial review and publication, performance modules, and CEO decisions through one typed, fixture-driven state model.

> All operational, financial, HSE, and legal figures in this repository are synthetic and do not represent Shoreline Natural Resources’ actual performance.

## Completed scope

- Strict TypeScript React/Vite application with role-aware Department, Commercial/module, and CEO shells.
- All ten specified routes and their locked desktop/responsive structures.
- Exactly four Department input methods, repeatable multi-source entry, deterministic extraction states, conflicts, source lineage, corrections, certification, clarification, resubmission, override, and approval.
- Commercial readiness, executive-narrative preview, controlled publication exceptions, publication gate, CEO notification simulation, immutable published cycles, and separate post-publication revisions.
- CEO production, cash, HSE, legal, recommendation, decision, and assignment experiences.
- Closed-loop assigned-action inboxes with owner, due date, progress status, note, and audit event.
- Production, Finance, HSE, and Legal & Regulatory charts, accessible data tables, filters, evidence drawers, and synthetic export disclosures.
- Loading, empty, recoverable error, no-access, processing, conflict, read-only, and locked states through deterministic scenarios and route permissions.
- Device-local persistence and a confirmation-protected canonical reset.

See [FINAL_ACCEPTANCE.md](./FINAL_ACCEPTANCE.md) for the final traceability and acceptance record and [BUILD_AUDIT.md](./BUILD_AUDIT.md) for the concise engineering audit.

## Run locally

Requirements: Node.js 24 and npm 11, or compatible current LTS versions.

```bash
npm install
npm run dev
```

The default persona is Commercial Manager and the default context is the open weekly cycle.

## Demo personas and scenarios

Use the persona selector to switch among:

- Commercial Manager — overview, review, publication, modules, and action verification.
- CEO — full-width published executive workspace with no sidebar.
- Operations Manager — Department reporting, returned actions, locked reports, and revisions.

Scenarios include canonical, empty, processing, conflict, and ready-to-publish states. The ready-to-publish scenario deterministically supplies approved mandatory reports. Reset demo asks for confirmation before clearing all device-local changes.

## Routes

| Route                     | Workspace                                    |
| ------------------------- | -------------------------------------------- |
| `/department`             | Department Manager dashboard                 |
| `/department/reports/new` | Create Weekly Report                         |
| `/department/reports/:id` | Department report review/revision            |
| `/commercial`             | Commercial Manager dashboard and publication |
| `/commercial/review/:id`  | Commercial submission review                 |
| `/executive`              | CEO Executive Overview                       |
| `/production`             | Production performance                       |
| `/finance`                | Finance performance                          |
| `/hse`                    | HSE performance                              |
| `/legal`                  | Legal & Regulatory performance               |

## Verification

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

The final suite passes formatting, lint, strict typecheck, 30 tests, and production build. The audit reports a React Router RSC/server-action advisory; Atlas is a client-only `BrowserRouter` application and implements neither affected feature, while the proposed forced remediation is a breaking downgrade. See the acceptance record for the risk disposition.

## Architecture

- `src/data/atlas.ts` — typed fixture access, selectors, status semantics, and formatters.
- `src/state/AtlasContext.tsx` — shared persona, context, scenarios, persistence, and reset.
- `src/state/workflow.ts` — reporting, publication, lock, revision, and audit state machine.
- `src/state/executive.ts` — decisions, assignments, progress, persistence, and audit state.
- `src/components/` — shells, design-system primitives, accessible charts, drawers, and dialogs.
- `src/pages/` — reporting, executive, and performance route implementations.
- `src/styles.css` — Atlas design tokens and locked desktop/responsive layout rules.

No backend, live authentication, live AI/OCR, regulator submission, external-system integration, or deployment is included.
