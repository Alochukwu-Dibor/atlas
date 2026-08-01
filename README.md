# Atlas prototype

Atlas is a functional front-end prototype for synthetic OML 30 executive reporting. It connects Department Manager reporting, Commercial review, performance modules, and the CEO’s published executive view through one typed fixture-driven data layer.

> All operational, financial, HSE, and legal figures in this repository are synthetic and do not represent Shoreline Natural Resources’ actual performance.

## Phase 1 scope

This phase establishes:

- React, Vite, and strict TypeScript foundations
- role-aware Department, Commercial/module, and CEO shells
- route-level structures for every specified workspace
- shared design tokens, components, charts, tables, drawers, modals, toasts, and non-happy states
- typed access to `ATLAS_MOCK_DATA.json`, shared selectors, context, and deterministic scenario reset
- first-pass interactions for report setup, Commercial review, evidence drawers, exports, and CEO decisions
- Vitest and Testing Library coverage for selectors, accessibility primitives, and route permissions

Detailed end-to-end workflow completion is intentionally deferred to Phase 2. See `BUILD_AUDIT.md` for the precise boundary.

## Run locally

Requirements: Node.js 24 and npm 11 (or compatible current LTS versions).

```bash
npm install
npm run dev
```

The development server prints its local URL. The default persona is Commercial Manager.

## Demo personas

Use the persona selector to switch among:

- Commercial Manager — shared sidebar workspace
- CEO — full-width executive workspace with published cycles only
- Operations Manager — reporting-focused Department workspace

The demo-scenario selector exposes canonical, empty, processing, conflict, and ready-to-publish fixtures. **Reset demo** returns shared state to the canonical synthetic scenario.

## Routes

| Route                     | Workspace                      |
| ------------------------- | ------------------------------ |
| `/department`             | Department Manager dashboard   |
| `/department/reports/new` | Create Weekly Report           |
| `/department/reports/:id` | Department report review       |
| `/commercial`             | Commercial Manager dashboard   |
| `/commercial/review/:id`  | Commercial submission review   |
| `/executive`              | CEO Executive Overview         |
| `/production`             | Production performance         |
| `/finance`                | Finance performance            |
| `/hse`                    | HSE performance                |
| `/legal`                  | Legal & Regulatory performance |

Persona permissions are applied to these routes. Unknown routes and restricted workspaces show explicit state screens.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Architecture

- `src/data/atlas.ts` — typed fixture access, selectors, status semantics, and formatters
- `src/state/AtlasContext.tsx` — shared persona, asset, period, reporting-cycle scenario, and reset state
- `src/components/` — reusable shells, UI primitives, and accessible chart wrappers
- `src/pages/` — route-level structures grouped by reporting dashboards and performance modules
- `src/styles.css` — Atlas Design System v3 tokens and structural desktop/responsive layouts

Charts expose a textual summary and a switchable data-table equivalent. Print exports include a synthetic-data disclosure.
