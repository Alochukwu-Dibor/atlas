# Atlas Commercial Plan Module — Build Audit

## Inspected before implementation

- Read `AGENTS.md`, `Atlas_PRD (1).md`, `ATLAS_PAGE_STRUCTURES.md`, `ATLAS_DESIGN_SYSTEM (1).md`, `ATLAS_USER_FLOWS.md`, and `ATLAS_MOCK_DATA.json` in full.
- Inspected the React Router route tree, Commercial/Contributor/Executive shells, shared UI components, typed fixture selectors, persisted reducers, tests, and the existing Commercial Dashboard, Projects and Reviews implementations.
- Confirmed the starting worktree was clean on `main`, tracking `origin/main`.
- Ran the existing Vite application and checked the Commercial, Contributor, CEO and CFO workspaces before implementation.

## Implementation checklist

- [x] Commercial navigation contains only Dashboard, Plan, Projects and Reporting.
- [x] Dashboard retains the current Business Overview implementation.
- [x] Plan supports upload, extraction, grouped review, validation and confirmation.
- [x] Projects retains its existing route and consumes confirmed project names, budgets and milestone baselines where available.
- [x] Reporting retains the existing Commercial Reviews route and interaction flow.

## What was built

- Added the `/plan` route and a four-stage Plan workflow: Upload, Extract, Review and Confirm.
- Added file selection, supported-format and size validation, selected-file, replacement/removal, deterministic uploading/extraction progress, error and confirmed states.
- Added project-grouped editing for project identity, department, budget, timeline, KPIs, targets and milestones.
- Added project, KPI, milestone and custom-field add/remove actions. Custom fields retain field name, field type, value, project and section.
- Added live required-field validation. Confirmation is disabled until blocking issues are resolved.
- Added a confirmation summary and explicit warning that Atlas does not approve the plan; it verifies an externally approved plan as its tracking baseline.
- Added a successful confirmed-baseline state and browser-local persistence.

## Routes and navigation

- Added `/plan` under the existing Commercial shell.
- Commercial primary navigation is now exactly: Dashboard (`/commercial`), Plan (`/plan`), Projects (`/projects`) and Reporting (`/reviews`).
- Existing legacy direct routes remain registered to preserve working functionality, but they are no longer Commercial primary-navigation modules.
- Contributor and Executive route trees and navigation were not changed.

## Components

- Reused `PageHeader`, `Panel`, `Button`, `Field`, `DetailTabs`, `Modal`, `StatusBadge`, `StateView`, toast notifications and the existing shell/navigation patterns.
- Added Plan-specific composition in `src/pages/PlanPage.tsx` and responsive styles in `src/styles.css`.
- Extended `ProjectsPage`, `ProjectOverview` and `CommercialDashboard` minimally so an available confirmed baseline supplies project names, approved project budgets, milestone dates and total approved budget.

## Data models and fixtures

- Added reusable types for `ProjectBaseline`, `ProjectBudget`, `ProjectTimeline`, `PlanKpi`, `PlanTarget`, `PlanMilestone`, `PlanCustomField`, `ConfirmedPlanBaseline` and `PlanConfirmationState`.
- Added a deterministic Shoreline OML 30 approved-plan extraction fixture to `ATLAS_MOCK_DATA.json` that references the existing projects, budget lines, KPI definitions, targets and milestones.
- The fixture project budgets total the existing approved USD 185m business-plan budget.
- Added `atlas-plan-v1` localStorage persistence through the shared `AtlasContext`; reset-demo clears this state consistently with the other prototype reducers.
- Approved baselines remain separate from existing actuals, committed spend and forecasts.

## Interactions verified

- Selected the synthetic approved-plan fixture and exercised finite upload/extraction progress.
- Removed a selected file and verified extraction became disabled.
- Edited a required project field, verified validation appeared and confirmation became unavailable, then restored the value.
- Added, edited and removed a custom field while preserving the rest of the review state.
- Navigated between grouped project review sections without losing edits.
- Reviewed summary counts, acknowledged the confirmation warning and confirmed the baseline.
- Reloaded `/plan` and verified the confirmed state persisted.
- Loaded Dashboard, Projects and Reporting and switched among Commercial, Department Manager, CEO and CFO personas.

## Commands and results

- `npm run format` — passed.
- `npm run lint` — passed with zero warnings.
- `npm run typecheck` — passed in TypeScript strict mode.
- `npm test -- --run` — passed; 9 files and 60 tests.
- `npm run build` — passed; Vite production bundle generated.
- `git diff --check` — passed.

## Screens visually inspected

- Plan upload and selected-file states.
- Extraction progress state.
- Grouped extraction review, including project navigation and editable forms.
- Validation and custom-field presentation.
- Confirmation summary and warning modal.
- Confirmed-plan success state.
- Existing Commercial Dashboard, Projects and Reporting pages.
- Contributor My Updates, CEO View and CFO View route loading.

Desktop inspection used the in-app Chromium browser at the available desktop viewport. Automated responsive styles and route tests passed; Safari and Edge were not available for direct visual inspection.

## Known limitations

- Extraction is deterministic and fixture-driven. No live OCR, AI processing, backend upload or external document storage is implied.
- Persistence is browser-local and suitable only for the prototype; it does not synchronize across devices or users.
- Confirmed edits to the four existing fixture projects flow into the current Dashboard/Projects baseline selectors. A newly added project is retained in the confirmed Plan state but will require the future Projects module pass to receive full operational status, risk, activity and decision records before it can appear as a complete project-table row.
- The native replace-file chooser is browser/platform UI; supported file selection/removal is covered by component tests, while the visual browser run used the deterministic synthetic fixture.
- Historical approved-plan version comparison remains outside this Plan-only implementation and should be addressed when the wider Reporting/history scope is approved.

## Remaining approved modules

- **Dashboard:** retain the confirmed total/project baselines already wired, then complete any separately approved Dashboard arrangement and decision-priority work.
- **Projects:** consume newly added confirmed Plan projects after their operational attributes are defined; retain the current search, filters, table and contextual detail interaction.
- **Reporting:** use the confirmed plan’s project/KPI/target/milestone definitions throughout contributor and review comparisons during the Reporting module pass.

## Assumptions

- “Reporting” maps to the existing Commercial Reviews workspace at `/reviews` for this Plan-first phase, avoiding premature construction of a replacement Reporting module.
- The latest explicit four-module instruction supersedes earlier documents that exposed Execution, Reviews, Decisions and Outputs as Commercial primary-navigation items. Their existing direct routes are preserved.
- The uploaded plan was approved outside Atlas; `confirmed_tracking_baseline` records verification only.
