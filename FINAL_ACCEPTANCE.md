# Atlas final acceptance record

**Audit date:** 1 August 2026

**Scope:** Functional front-end prototype only

**Data classification:** Entirely synthetic prototype data
**Release commit:** The authoritative final hash is `git rev-parse origin/main` after the release commit. A commit cannot embed its own SHA without changing that SHA; the exact verified hash is therefore recorded in the release handoff.

## Executive summary

Atlas satisfies the approved front-end scope and locked page structures. The final pass closed the two previously documented lifecycle gaps: gated publication with immutable cycles/revisions and closed-loop CEO assignment progress. Automated verification, desktop/narrow browser acceptance, accessibility checks, and cross-page reconciliation passed. No backend, deployment, or unapproved product region was added.

## Page inventory and structural acceptance

| Page/route                                  | Status      | Evidence                                                                                                                                |
| ------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Department dashboard `/department`          | Implemented | `DepartmentDashboard`, `DepartmentShell`; three equal KPI cards and full-width history; locked rows/revisions                           |
| Create report `/department/reports/new`     | Implemented | `CreateReportPage`, `SourceMethodCards`; two steps, common details, exactly four method cards, repeatable sources, review/certification |
| Department review `/department/reports/:id` | Implemented | `DepartmentReportReview`; evidence/comments/audit, response/resubmit, read-only lock, revision creation                                 |
| Commercial dashboard `/commercial`          | Implemented | `CommercialDashboard`; `2/3/3/4`, `3/5/4`, queue, narrative preview, gate, publish/lock                                                 |
| Commercial review `/commercial/review/:id`  | Implemented | `CommercialReviewPage`; queue navigation, fields, lineage, comments, audit, clarification, override, approval                           |
| Projects `/projects`                        | Implemented | `ProjectsPage`; portfolio health, project KPIs, full portfolio table, row evidence drawer                                               |
| Recommendations `/recommendations`          | Implemented | `RecommendationsPage`; prominent authoring, system recommendation edit/approval, status and audit                                       |
| CEO `/executive`                            | Implemented | `ExecutiveDashboard`, `ExecutiveShell`; no sidebar, `3/5/4`, `6/6`, four decisions                                                      |
| Production `/production`                    | Implemented | `ProductionPage`; five KPIs, `8/4`, field table, planned/actual chart                                                                   |
| Finance `/finance`                          | Implemented | `FinancePage`; five KPIs, `6/3/3`, `8/4`, mixed cashflow and variance ring                                                              |
| HSE `/hse`                                  | Implemented | `HsePage`; six KPIs, `6/3/3`, `3/3/6`, mixed dual-axis chart                                                                            |
| Legal `/legal`                              | Implemented | `LegalPage`; six KPIs, `5/4/3`, `4/4/4`, timeline and compliance ring                                                                   |

Browser-measured desktop columns matched all ratios at 1440 × 1000. At 1024 × 900, approved regions stacked in reading order, the sidebar compacted to 76 px, and document width did not overflow.

## Critical workflow acceptance

| Workflow                          | Status      | Evidence                                                                                     |
| --------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| Department happy path             | Implemented | `workflowReducer`; create/add source/correct/certify/submit tests                            |
| Department selection              | Implemented | all eight departments; department-matched form fields and extraction fixtures; route test    |
| Multi-source add/replace/remove   | Implemented | `ADD_SOURCE`, `REPLACE_SOURCE`, `REMOVE_SOURCE`; dependency-warning modals and audit         |
| Missing/failed/unsupported source | Implemented | deterministic source status fixtures; `getSubmissionBlockers`; source controls               |
| Conflict and manager correction   | Implemented | original extraction retained; separate `ManagerCorrection`; audit test                       |
| Submit and Commercial queue       | Implemented | `SUBMIT_REPORT`, `selectSubmissionQueue`; route/component tests                              |
| Clarification/response/resubmit   | Implemented | field question/due date, response, re-certification, `resubmitted`; reducer test             |
| Approval and readiness            | Implemented | `APPROVE_REPORT`, `selectReadiness`; eight-department gate                                   |
| Commercial recommendations        | Implemented | author/edit/approve state, persistence, audit events, reducer and route tests                |
| Controlled value override         | Implemented | original Department value retained, revised value/reason/audit; reducer test                 |
| Narrative and preview             | Implemented | `SAVE_EXECUTIVE_NARRATIVE`; publication modal preview and disclosure                         |
| Publication gate                  | Implemented | all mandatory reports approved or reasoned controlled exception; reducer/browser tests       |
| Publish/notify/lock               | Implemented | `PUBLISH_CYCLE`; simulated CEO notification audit; reports/cycle locked                      |
| CEO update                        | Implemented | newly published cycle becomes selectable; saved narrative displayed in CEO header            |
| CEO decision/assignment           | Implemented | five approved actions; recommendation link; rationale and owner/due-date gate                |
| Action return/progress            | Implemented | responsible-workspace inbox, status/note, audit test                                         |
| Published immutability            | Implemented | all material report mutations rejected for locked records; reducer test                      |
| Post-publication revision         | Implemented | separate Draft revision with `supersedesReportId`; original preserved; browser/reducer test  |
| Reset                             | Implemented | confirmation-protected reset of workflow, executive, persona, context, scenario, and storage |

## Requirements traceability

| Requirement source | Requirement                                                                                          | Status      | Code/route/test evidence                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| PRD §3–5           | Synthetic, executive-reporting prototype with Department, Commercial, CEO personas                   | Implemented | `atlas.meta`, shells, routes, disclosure                                           |
| PRD §6             | Role-specific access and route boundaries                                                            | Implemented | `SidebarShell`, `DepartmentShell`, `ExecutiveShell`, `App.test.tsx`                |
| PRD §7.1           | Common details, locked baseline, editable title                                                      | Implemented | `CreateReportPage` step 1                                                          |
| PRD §7.2           | Exactly four top-level input methods; combined email/transcript                                      | Implemented | `methodDefinitions`, `SourceMethodCards`, component test                           |
| PRD §7.3           | Combine methods and several sources                                                                  | Implemented | source list/actions; workflow test                                                 |
| PRD §7.4           | Deterministic extraction, source references, warnings, standardised review                           | Implemented | fixture extractors, split review, `getSubmissionBlockers`                          |
| PRD §7.5           | Correction preserves extracted value and audit                                                       | Implemented | `ManagerCorrection`, `CORRECT_FIELD`, reducer test                                 |
| PRD §7.6           | Certification and submission validation                                                              | Implemented | certification card/blockers; submit test                                           |
| PRD §8.1           | Commercial readiness/exception dashboard and review queue                                            | Implemented | `/commercial`, shared selectors                                                    |
| PRD §8.2           | Review, evidence, clarification, override, approval, narrative, publication                          | Implemented | `/commercial/review/:id`, publication modal/actions                                |
| PRD §8.3           | Publish only when approved or controlled exception; lock and notify                                  | Implemented | `PUBLISH_CYCLE`, browser/reducer acceptance                                        |
| PRD §9             | CEO performance, recommendations, five approved decisions and assignment                             | Implemented | `/executive`, `executiveReducer`, Phase 3 tests                                    |
| PRD §10            | Production, Finance, HSE, Legal performance modules                                                  | Implemented | `/production`, `/finance`, `/hse`, `/legal`; measured grids                        |
| PRD §11            | Loading, empty, error, no access, stale/read-only/locked states                                      | Implemented | `ScenarioOutlet`, `StateView`, shell gates, report notices                         |
| PRD §12            | Device-local deterministic simulation and auditability                                               | Implemented | v3 workflow/v2 executive storage, reset, audit events                              |
| PRD §13            | Published immutability and revision                                                                  | Implemented | lock guard, `CREATE_REVISION`, test/browser evidence                               |
| PRD §14            | Accessible interaction and responsive desktop behavior                                               | Implemented | semantic UI, chart tables, focus management, media queries                         |
| Page §3            | CEO exact hierarchy and exclusions                                                                   | Implemented | `.executive-top`, `.executive-performance`, recommendation panel; no sidebar/queue |
| Page §4            | Commercial exact top/lower ratios and actions                                                        | Implemented | `.commercial-top`, `.commercial-lower`; browser measurement                        |
| Page §5            | Department exact header, three cards, history; no navy banner                                        | Implemented | `DepartmentShell`, `DepartmentDashboard`                                           |
| Page §6            | Create Report exact sequence and four cards                                                          | Implemented | `CreateReportPage`, method card test                                               |
| Page §7            | Commercial review body/action requirements                                                           | Implemented | `CommercialReviewPage` and lifecycle state                                         |
| Product owner      | Commercial Projects navigation, portfolio health and project breakdown routing                       | Implemented | `/projects`, sidebar navigation, dashboard link, route tests                       |
| Product owner      | Commercial recommendation authoring, editing and approval                                            | Implemented | `/recommendations`, `recommendationsReducer`, route/reducer tests                  |
| Product owner      | Department selection and department-matched structured/extracted data                                | Implemented | `DepartmentControl`, `fieldsForDepartment`, route/reducer tests                    |
| Page §8            | Production five KPIs, `8/4`, table/controls                                                          | Implemented | `ProductionPage`; desktop browser audit                                            |
| Page §9            | Finance five KPIs, `6/3/3`, `8/4`                                                                    | Implemented | `FinancePage`; desktop browser audit                                               |
| Page §10           | HSE six KPIs, `6/3/3`, `3/3/6`                                                                       | Implemented | `HsePage`; desktop browser audit                                                   |
| Page §11           | Legal six KPIs, `5/4/3`, `4/4/4`                                                                     | Implemented | `LegalPage`; desktop browser audit                                                 |
| Page §12           | Required non-happy states                                                                            | Implemented | scenarios, permissions, processing/source/read-only states                         |
| Flows §2           | Sign-in/persona simulation and context                                                               | Implemented | persona/context controls; deterministic route switch                               |
| Flows §3–4         | Create/multi-source/extract/review/submit                                                            | Implemented | reporting pages and workflow reducer tests                                         |
| Flows §5           | Commercial review/clarify/override/approve                                                           | Implemented | review page and tests                                                              |
| Flows §6           | Consolidate/preview/publish/lock/notify                                                              | Implemented | publication state/UI/browser flow                                                  |
| Flows §7           | CEO review/decision/assignment/return                                                                | Implemented | executive dashboard, inbox, progress audit                                         |
| Flows §8           | Correction after publication creates revision                                                        | Implemented | revision state/UI/browser flow                                                     |
| Design §2–13       | Tokens, shells, typography, cards, tables, forms, statuses, drawers/charts, responsive/accessibility | Implemented | `src/styles.css`, reusable components, measured/browser/a11y tests                 |
| Mock data          | All figures, units, relationships, sources, statuses and disclosure                                  | Implemented | typed `atlas`, shared selectors, reconciliation tests                              |

Status definitions: **Implemented** is executable and evidenced; **Partially implemented** would indicate usable but incomplete; **Not implemented** would indicate an unmet in-scope requirement; **Not applicable** indicates intentionally excluded scope. No item in the approved front-end scope remains Partial or Not implemented.

## Data reconciliation

| Fact                  | Reconciled result                               | Evidence                               |
| --------------------- | ----------------------------------------------- | -------------------------------------- |
| Gross oil actual/plan | 96,800 / 120,000 bopd                           | mock data, Commercial, CEO, Production |
| Gross variance        | −23,200 bopd / −19.3%                           | shared production selector/tests       |
| Working interest      | 43,560 bopd = 45%                               | selector/test and CEO/Production       |
| Available liquidity   | $42.5m = $18.5m + $4m + $20m                    | selector/test and CEO/Finance          |
| Financing marker      | $15m due 30 Sept 2026                           | mock data, CEO/Finance chart           |
| HSE                   | TRIR 0.17; target 0.12; 42 days since LTI       | mock data, CEO/HSE/Production          |
| Legal                 | $18.4m exposure; two critical risks             | mock data, CEO/Commercial/Legal        |
| Audit lineage         | report/source/recommendation/cycle IDs retained | workflow/executive reducers and views  |

## Automated test and build results

| Command                | Result                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run format:check` | Passed                                                                                            |
| `npm run lint`         | Passed, zero warnings                                                                             |
| `npm run typecheck`    | Passed, strict TypeScript                                                                         |
| `npm test`             | Passed: 8 files, 37 tests                                                                         |
| `npm run build`        | Passed: Vite production bundle                                                                    |
| `npm audit --omit=dev` | Two high findings; accepted as non-exploitable in this client-only architecture (see limitations) |

## Browser and responsive evidence

- Available engine: Codex in-app Chromium browser only.
- 1440 × 1000: Commercial measured `2/3/3/4` and `3/5/4`; CEO measured `3/5/4` and `6/6`; modules measured every locked ratio; shared sidebar 232 px; CEO sidebar absent.
- 1024 × 900: shared sidebar 76 px; Commercial top becomes two columns and lower row stacks; Legal major regions stack; no horizontal document overflow.
- Functional browser flow completed: ready scenario → narrative save/preview → publish/lock → CEO selects new cycle and sees narrative → Department sees locked report → creates separate Draft revision.
- Browser console: zero warnings/errors across audited routes and interactions.
- Safari and Edge: unavailable in this environment; no unsupported claim is made.

## Accessibility acceptance

- Semantic headings, landmarks, labels, captions, buttons, and explicit status text.
- Focus-visible styling and colour-independent status labels.
- Keyboard-selectable tables; Enter and Space activate rows.
- Drawers/dialogs move focus inside, trap Tab, close with Escape, and restore focus; covered by test.
- Charts provide summaries, legends, labelled axes/tooltips, and switchable data-table equivalents.
- `prefers-reduced-motion` disables nonessential motion.
- No-access states and disabled controls explain the gate or next action.

## Known limitations and risk disposition

- All authentication, extraction, interpretation, notification, persistence, publication, and export behaviors are simulations. They are never presented as live or secure integrations.
- Finance/HSE source trends are monthly; controls do not fabricate unavailable daily records.
- Facility-level production allocations are not present in the fixture, so no synthetic split is invented.
- Reference images were not present in the repository; structural Markdown and design tokens were the available visual authority.
- React Router’s RSC/server-action advisory is reported by npm. Atlas uses client-only `BrowserRouter` and no affected RSC/server-action path. The offered forced downgrade is breaking; it was not applied.

## Remaining issues

No known in-scope functional, data, structural, accessibility, console, or responsive blocker remains. The only unperformed checks are standalone Safari/Edge engine runs and image-by-image visual comparison because those resources were unavailable.

## Intentionally out of scope

- Production backend/database or secure persistence.
- Real authentication or user administration.
- Live AI/OCR, email, bank, ERP, historian, call, regulator, or filing integration.
- Automated regulatory submission.
- Mobile/offline application.
- Production-grade downloadable PDF/XLSX generation beyond print/export simulation.
- Deployment/hosting.
- New dashboards, metrics, or page regions not approved by the source specifications.
