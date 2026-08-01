# Atlas build audit

## Final status

**Release acceptance pass complete — 1 August 2026**

The Atlas functional front-end prototype now covers the specified Department → Commercial → CEO lifecycle, including publication lock, post-publication revision, and closed-loop CEO assignments. All data and integrations remain deterministic simulations using `ATLAS_MOCK_DATA.json`.

## Completed lifecycle

- Department report details and exactly four selectable input-method cards.
- Several sources per report; add, replace, and dependency-confirmed removal with retained audit history.
- Deterministic processing, partial, invalid, unsupported, failed, low-confidence, and conflict states.
- Standardised field review with source references, manager correction, certification, and submission gates.
- Commercial field-level clarification, Department response, re-certification, resubmission, controlled override, and approval.
- Shared readiness recalculation across eight required departments.
- Department selection across all eight required departments, with department-matched structured fields and deterministic extraction fixtures.
- Commercial Projects portfolio and recommendation authoring, editing, approval, and audit workflows.
- Ready-to-publish fixture, executive narrative save/preview, controlled exception reason, gated publication, simulated CEO notification, and immutable lock.
- Separate auditable revision after publication; the original published record remains unchanged.
- Recommendation-linked CEO decisions and assignments with owner/due-date gates.
- Responsible-workspace action inbox, progress statuses/notes, and audit event.
- Confirmation-protected canonical reset.

## Structural result

- CEO: no sidebar; `3 / 5 / 4`, `6 / 6`, four recommendation blocks.
- Commercial: fixed sidebar; `2 / 3 / 3 / 4`, `3 / 5 / 4`, review queue and gated publication modal.
- Department: reporting header without Commercial/CEO navigation or excluded navy banner; `4 / 4 / 4` and submission history.
- Create Report: two steps, common details, exactly four method cards, repeatable content sources, extraction review, and certification.
- Commercial Review: queue navigation, source evidence, comments, audit, clarification, override, and approval.
- Projects: portfolio health, project KPIs, full project table, and evidence drawer.
- Recommendations: prominent Commercial authoring plus system recommendation edit/approval controls.
- Production: five KPIs, `8 / 4`, full-width table.
- Finance: five KPIs, `6 / 3 / 3`, `8 / 4`.
- HSE: six KPIs, `6 / 3 / 3`, `3 / 3 / 6`.
- Legal: six KPIs, `5 / 4 / 3`, `4 / 4 / 4`.

All approved charts preserve the required series and expose summaries plus keyboard-accessible table equivalents.

## Data reconciliation

- Gross production: `96,800 bopd`; plan `120,000 bopd`; variance `−19.3%`.
- SNRL working-interest production: `43,560 bopd`, exactly 45% of gross actual.
- Liquidity: `$42.5m` = `$18.5m` unrestricted + `$4m` restricted + `$20m` undrawn.
- TRIR: `0.17` against `0.12` target.
- Legal exposure: `$18.4m`; critical risks: `2`.
- Repeated CEO/module/Commercial figures and source references reconcile through shared selectors.

## Verification results

| Check                  | Result                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Prettier               | Passed                                                                                                            |
| ESLint                 | Passed with zero warnings                                                                                         |
| TypeScript strict mode | Passed                                                                                                            |
| Tests                  | 8 files, 37 tests passed                                                                                          |
| Production build       | Passed                                                                                                            |
| Critical reducer paths | Submit, clarify, resubmit, approve, override, publish, lock, revise, decide, assign, progress passed              |
| Desktop browser        | All specified routes and locked ratios passed at 1440 × 1000                                                      |
| Narrow browser         | 1024 × 900 stacks correctly; no horizontal overflow                                                               |
| Browser console        | No warnings or errors                                                                                             |
| Accessibility          | Labelled controls, visible statuses/focus, keyboard rows/charts, dialog focus trap/Escape/restore, reduced motion |

## Environmental and risk disposition

- The only available browser was the Codex in-app Chromium browser. Standalone Safari and Edge were unavailable, so engine-specific checks are not claimed.
- No supplied image files were present for image-by-image comparison; the locked Markdown structures and design tokens were used.
- `npm audit --omit=dev` reports two high-severity findings from a React Router RSC/server-action CSRF advisory. Atlas is a client-only `BrowserRouter` prototype with no RSC or server actions, so the affected execution path is absent. The offered `--force` fix is a breaking downgrade and was not applied.
- PDF/DOCX/XLSX extraction, notifications, export, authentication, persistence, and publication are explicitly labelled deterministic prototype simulations.

## Intentionally out of scope

Production backend/database, real authentication, live AI/OCR, live email/bank/ERP/historian/regulator integrations, automated regulatory submission, mobile/offline application, downloadable production-grade export generation, deployment, and any dashboard or metric not present in the approved sources.

No known in-scope functional or structural blocker remains. See `FINAL_ACCEPTANCE.md` for the complete traceability matrix.
