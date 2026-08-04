# ATLAS IA refinement — Phase 1 audit

**Phase date:** 4 August 2026

**Scope:** Shared domain foundation, canonical navigation, terminology and shell treatment

**Data classification:** Entirely synthetic prototype data

## Implemented

- Added explicit domain contracts for Business Unit, Business Plan, Planning Period, Strategic Theme, Strategic Objective, KPI/Target, Approved Budget/Budget Line, Project/Initiative, Operational Activity, Commitment, Weekly Execution Update, Risk, Decision Support, Decision, Evidence, Output and Historical Revision.
- Extended the fixture into a linked business-plan graph while retaining every original operating, financial, HSE, legal, source, comment and audit fixture.
- Kept approved KPI and budget baselines separate from actual, current forecast and prior forecast values.
- Added project-optional Weekly Execution Updates and contributor context selection for business unit, objective and optional project/asset.
- Added shared selectors for business-plan delivery, objective KPIs, history and traceability.
- Replaced primary Commercial navigation with Business Overview, Execution, Projects, Reviews, Decisions and Outputs.
- Separated Commercial configuration into KPI Library, Reporting Templates and Settings.
- Added Contributor navigation for Submit Update and My Updates.
- Added an Executive navigation foundation for CEO View, CFO View, Decisions and Outputs.
- Added canonical Execution, Reviews, Decisions, Outputs, configuration and CFO routes while preserving every pre-Phase-1 route.
- Applied calm neutral shell styling, restrained interaction blue, neutral information states and removed gradients.
- Updated visible product terminology without renaming stable reducer actions or legacy URLs.

## Functionality preserved

- Four submission methods, repeatable sources and deterministic extraction.
- Conflict validation, corrections, certification and submission gates.
- Clarification, response, resubmission, Commercial override and approval.
- Readiness, controlled publication exceptions, immutable publication and revisions.
- Decision assignment, due-date validation and action progress.
- Evidence drawers, audits, synthetic disclosure, local persistence and demo reset.
- Production, Finance, HSE, Legal, Projects and legacy Decision Support routes.

## Canonical routes added

- `/execution`
- `/reviews` and `/reviews/:id`
- `/decisions`
- `/outputs`
- `/kpi-library`
- `/reporting-templates`
- `/settings`
- `/executive/cfo`
- `/executive/decisions`
- `/executive/outputs`

## Verification

- JSON schema fixture parses successfully.
- Strict TypeScript compilation passes.
- Eight test files and 41 tests pass.
- Formatting, lint, production build and local runtime route checks pass.

## Remaining work after Phase 1

- Refactor Business Overview into its final four-section hierarchy.
- Add objective-detail tabs and deeper Execution history.
- Replace the current Projects summary-card treatment with search, filters and tabbed detail.
- Complete the structured Weekly Execution Update sections for commitments, activities, risks, forecasts and next-week plans.
- Consolidate legacy recommendation and executive decision state into one decision state machine.
- Add Output preview/generation state and audience-specific templates.
- Refine CEO and CFO detailed content using the shared data model.
- Move detailed Production, Finance, HSE and Legal content fully behind contextual drill-downs.
