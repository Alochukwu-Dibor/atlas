**PRODUCT REQUIREMENTS DOCUMENT**

**Atlas Executive Reporting Prototype**

From departmental evidence to an auditable executive decision

**Product:** Atlas

**Organisation context:** Shoreline Natural Resources / OML 30 prototype

**Document version:** 1.0

**Date:** 1 August 2026

**Status:** Build-ready prototype scope

**Product intent** Give Department Managers flexible reporting inputs, give the Commercial Manager a controlled consolidation and publishing workflow, and give the CEO a concise view of performance, exposure and decisions requiring intervention.

**STRUCTURAL AUTHORITY**

The approved sketches supplied by the product owner are the canonical structural references for each page. The prototype may adopt the Atlas visual system, but it must not rearrange the approved page hierarchy, card relationships, chart locations or primary interactions without approval.

# Document map

This PRD translates the agreed product concept, reporting workflow, page sketches and Atlas Design System v3 into a single implementation specification.

- 1\. Executive summary

- 2\. Product problem and objectives

- 3\. Users and permissions

- 4\. What we will build - step by step

- 5\. Information architecture and shared application rules

- 6\. End-to-end reporting workflow

- 7\. Department Manager experience

- 8\. Commercial Manager experience

- 9\. CEO experience

- 10\. Performance modules

- 11\. Shared data, status and audit logic

- 12\. Design system and structural constraints

- 13\. Prototype data and simulation boundaries

- 14\. Functional acceptance criteria

- 15\. Non-functional requirements and QA

- 16\. Scope boundaries and delivery

# 1. Executive summary

Atlas is an executive reporting and decision-support prototype for an oil and gas operating context. It standardises weekly departmental inputs, preserves evidence and source references, consolidates performance and risk information, and presents decision-ready outputs to senior leadership.

The first prototype will demonstrate one coherent reporting cycle for OML 30 using realistic but entirely synthetic data. It will be a functional front-end experience: pages, filters, charts, tables, drawers, review states and cross-role workflows will behave realistically, while AI extraction, authentication, production integrations and secure persistence will be simulated.

**Core product promise** The same evidence should move from departmental reporting to Commercial review and CEO intervention without being recollected, manually reformatted or stripped of its source context.

# 2. Product problem and objectives

## 2.1 Problem

Weekly operating information arrives in inconsistent formats: structured reports, spreadsheets, documents, emails and call notes. Consolidation is manual, explanations are detached from figures, conflicts are difficult to trace, and executive reports often reveal outcomes without showing what changed, why it changed or who must act.

## 2.2 Objectives

- Allow Department Managers to submit one weekly report using one or several supported sources.

- Convert varied inputs into a consistent departmental reporting structure while preserving source evidence.

- Help the Commercial Manager identify missing data, conflicts, material variances and issues requiring escalation.

- Publish a concise executive update focused on production, cashflow, project status, HSE, legal exposure and interventions.

- Return CEO decisions into the responsible manager's workflow with owner, due date and audit history.

- Maintain one internally consistent OML 30 story across every dashboard and reporting period.

## 2.3 Success criteria for the prototype

- A reviewer can complete the core Department Manager -\> Commercial Manager -\> CEO flow without explanation.

- Every executive metric can be traced to a departmental report and source reference.

- The approved page structures and graph placements are recognisable against the supplied sketches.

- The same metric and status agree wherever they appear across pages.

- The prototype clearly distinguishes simulated intelligence from production-ready processing.

# 3. Users and permissions

| **Role**           | **Primary job**                                             | **Key permissions**                                                                                                                            |
|--------------------|-------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| Department Manager | Prepare and certify the department's weekly position.       | Create drafts; add multiple sources; correct extracted values; resolve conflicts; certify; submit; respond to returns; see department history. |
| Commercial Manager | Validate, consolidate and publish decision-ready reporting. | Review all submissions; request clarification; apply controlled overrides; edit narrative; approve; publish; see evidence and audit history.   |
| CEO / Executive    | Understand performance and decide where to intervene.       | View published outcomes; drill into explanations and evidence; approve, defer, request information, assign actions, escalate and acknowledge.  |
| Prototype Admin    | Support demonstrations and reset scenarios.                 | Switch personas; reset synthetic reporting cycle; seed alternate states. Not a production user role.                                           |

**Permission rule** Department Managers see only their own department and permitted assets. Commercial Managers can see all departmental submissions in the reporting cycle. CEO pages show published information only.

# 4. What we will build - step by step

1.  **Foundation and reusable components:** Set up the Atlas application shell, routes, design tokens, chart system, tables, status badges, filters, drawers and two shell variants: the CEO full-width shell and the sidebar workspace shell.

2.  **Shared prototype data:** Create one synthetic OML 30 dataset and a shared asset/reporting-period state so Production, Finance, HSE, Legal, Commercial and CEO views tell the same story.

3.  **Department Manager dashboard:** Build submission summary cards, reporting history and entry points for new, returned and draft reports.

4.  **Weekly report setup:** Build the two-step report flow beginning with project, department, reporting period, generated title and locked baseline information.

5.  **Four input methods:** Implement Structured Form, Document Upload, XLSX Upload, and Paste Email or Call Transcript. Managers can combine methods using Add another source.

6.  **Standardisation and review:** Simulate extraction, mapping and source attribution; show missing fields, conflicts, low-confidence values, material variances and corrections before certification.

7.  **Commercial review and publication:** Build the reporting-readiness dashboard, review queue, evidence drawer, clarification flow, controlled override, executive narrative editor, approval and publish states.

8.  **CEO dashboard and decisions:** Build the full-width executive view with the exact chart relationships in the approved sketch, recommendation blocks and decision actions.

9.  **Performance modules:** Build Production, Finance, HSE and Legal & Regulatory pages with the locked card, chart and table arrangements from their respective sketches.

10. **Closed-loop actions:** Return CEO decisions and Commercial clarification requests into the correct departmental workflow with owners, due dates and audit history.

11. **Prototype completeness:** Add realistic filters, tooltips, drawers, empty/loading/error states, mocked exports and desktop-responsive behaviour.

12. **Quality and handoff:** Run functional, visual, accessibility and cross-page consistency QA; obtain approval; then prepare and push the verified repository to GitHub.

# 5. Information architecture and shared application rules

| **Route / workspace**   | **Primary user**                | **Purpose**                                                              |
|-------------------------|---------------------------------|--------------------------------------------------------------------------|
| /department             | Department Manager              | Reporting status and submission history.                                 |
| /department/reports/new | Department Manager              | Create report, add sources, review extraction and submit.                |
| /commercial             | Commercial Manager              | Reporting readiness, risks, priorities and review queue.                 |
| /commercial/review/:id  | Commercial Manager              | Validate evidence, request clarification, override, approve and publish. |
| /executive              | CEO                             | Published performance, exposure, recommendations and decisions.          |
| /production             | Commercial / authorised leaders | Production performance by OML 30 field/facility.                         |
| /finance                | Commercial / authorised leaders | Liquidity, cashflow, budget variance and obligations.                    |
| /hse                    | Commercial / authorised leaders | Safety, environmental performance, compliance and actions.               |
| /legal                  | Commercial / authorised leaders | Legal exposure, regulatory calendar, approvals and contracts.            |

## 5.1 Shared rules

- Asset/project and reporting-period filters are shared state and refresh all content on a page.

- Selecting a KPI or record opens the relevant detail page or contextual drawer.

- Every displayed metric exposes source, reporting date, data owner and latest review status through progressive disclosure.

- Charts are functional and data-driven; screenshots and static chart placeholders are not acceptable.

- All prototype financial, operational, legal and HSE values are synthetic and labelled appropriately in export views.

- Desktop is the primary target. Narrow desktop/tablet layouts may stack approved sections while preserving order; no mobile-first redesign is required.

# 6. End-to-end reporting workflow

1.  **Reporting cycle opens:** Atlas creates the weekly reporting period, applies locked baselines and shows each Department Manager what is due.

2.  **Manager creates a report:** The manager confirms project, department, period and title, then selects one or more input methods.

3.  **Sources are added:** The manager completes a structured form, uploads a document, uploads an XLSX file, and/or pastes an email or call transcript.

4.  **Atlas creates a standardised draft:** The prototype maps source content into department-specific fields and retains a traceable reference for every extracted value.

5.  **Manager reviews and certifies:** The manager corrects values, resolves conflicts, fills required gaps and confirms the report accurately represents the department's position.

6.  **Commercial Manager reviews:** Atlas highlights reporting readiness, variances, missing evidence, conflicting figures and matters requiring clarification or escalation.

7.  **Executive update is approved and published:** The Commercial Manager applies any controlled overrides, finalises the narrative and locks the reporting cycle.

8.  **CEO reviews and decides:** The CEO sees outcomes and intervention points, then records decisions, owners and due dates.

9.  **Actions flow back:** Department and Commercial workspaces show assigned executive actions in the next operational cycle and audit history.

## 6.1 Reporting statuses

| **Status**          | **Meaning**                                                                                        | **Who can move it** |
|---------------------|----------------------------------------------------------------------------------------------------|---------------------|
| Draft               | Report exists but has not been certified.                                                          | Department Manager  |
| Submitted           | Certified and awaiting Commercial review.                                                          | Department Manager  |
| Needs Clarification | Commercial review has returned specific questions.                                                 | Commercial Manager  |
| Resubmitted         | Manager responded and sent the report back.                                                        | Department Manager  |
| Approved            | Departmental content accepted for consolidation.                                                   | Commercial Manager  |
| Published / Locked  | Executive update published; source reporting cycle is immutable except through audited correction. | Commercial Manager  |

# 7. Department Manager experience

## 7.1 Department Manager dashboard - locked structure

The first reference image's top navy banner is excluded. The approved hierarchy is: application header -\> three reporting-status cards -\> full-width submission-history table.

- Header: Shoreline identity, Reporting module indicator, last-updated timestamp, New Report action and user profile.

- Summary cards: Submissions Due, Pending Commercial Review and Returned Submissions.

- Submission History table columns: Project / Period, Method, Status and Submitted date/time.

- Selecting a record opens the report, sources, reviewer comments, evidence and audit history.

- Department Managers must not see Commercial Manager or CEO navigation options.

## 7.2 Create Weekly Report - Step 1: Details & Method

The page uses the approved two-step indicator: 1. Details & Method and 2. Content. The common-details card is a two-column, two-row form.

| **Area**         | **Requirement**                                                                                                                     |
|------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| Common details   | Project selector; locked department; reporting-period selector; automatically generated but editable submission title.              |
| Baseline panel   | Shows the relevant locked baseline (for example, planned production). Baseline changes require a request to the Commercial Manager. |
| Method selection | Four equal-width selectable cards. One or multiple cards may be selected.                                                           |
| Continue action  | Bottom-right. Disabled until required details are complete and at least one method is selected.                                     |

## 7.3 Supported input methods

| **Method card**                | **Expected behaviour**                                                                                                                                                                                                                                                              |
|--------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Atlas Structured Form          | Department-specific guided fields, units, validations, required explanations and supporting evidence.                                                                                                                                                                               |
| Document Upload                | Accept PDF and DOCX; display extraction progress; map content to Atlas fields; retain page/section reference and original file.                                                                                                                                                     |
| XLSX Upload                    | Support Atlas template and existing workbook paths; show worksheets; map columns; validate values; retain worksheet/cell references; save mapping in the simulated session.                                                                                                         |
| Paste Email or Call Transcript | One method card. Inside it, the manager chooses Email or Call Transcript and pastes the content. Email metadata includes subject, sender, received date and related asset. Transcript processing identifies speakers, figures, decisions, risks, commitments, owners and due dates. |

**Clarification locked** Paste Email and Paste Call Transcript are not separate cards or separate top-level methods. They are one combined input method, with a source-type choice inside the method.

## 7.4 Multiple sources

- A report may use one or several methods in any practical combination.

- Add another source remains available throughout Step 2 until the manager proceeds to final review.

- Each source is listed with type, name/label, date added, extraction status and remove/replace action.

- If sources disagree, Atlas displays both values, their references, reporting dates and owners. The manager must select the authoritative value or explain the resolution.

- Removing a source must warn the user if it supplied data already used in the standardised draft.

## 7.5 Step 2: Content and standardised review

All input methods converge on one review experience. On desktop, the original source appears on the left and the Atlas standardised report on the right. The screen must show:

- Source reference beside every extracted value (document page/section, spreadsheet worksheet/cell, or pasted-text excerpt).

- Missing required fields and required variance explanations.

- Conflicting values, low-confidence extraction labels and invalid units/formats.

- Manager correction controls, with original extraction retained in audit history.

- Material changes, issues, corrective actions, forecasts and matters requiring escalation.

- Certification statement and Submit Report action.

**Certification** I confirm that I have reviewed the extracted information and that this report accurately represents the department's position for the reporting period.

# 8. Commercial Manager experience

## 8.1 Dashboard - locked structure

The Commercial Manager uses the shared fixed-sidebar shell. The locked hierarchy is: sidebar -\> header and period control -\> four summary cards -\> two stacked status cards + Attention Required + Today's Priorities.

| **Region**           | **Required content**                                                                          |
|----------------------|-----------------------------------------------------------------------------------------------|
| Top row card 1       | Reporting Readiness with circular indicator; e.g., percentage ready and departments approved. |
| Top row card 2       | Overall Project Status.                                                                       |
| Top row card 3       | Production Performance.                                                                       |
| Top row card 4       | Cashflow and Financing Position.                                                              |
| Lower left - stacked | Legal Issues and Regulatory Exposure; HSE Performance.                                        |
| Lower centre         | Dominant Attention Required list; selecting a row opens the relevant review drawer.           |
| Lower right          | Full-height Today's Priorities action list.                                                   |

Desktop grid: top row approximately 2 / 3 / 3 / 4 columns; lower row approximately 3 / 5 / 4 columns.

## 8.2 Submission review workspace

- Review queue filters by department, status, severity, missing evidence and reporting period.

- Review drawer shows departmental report, all sources, extracted fields, manager corrections, conflicts, explanations and audit history.

- Commercial Manager may approve, request clarification with field-level comments, or apply a controlled override with reason.

- A controlled override records original value, replacement value, reason, reviewer and timestamp; it never silently rewrites the departmental source.

- Consolidation view creates the executive narrative and highlights changes from the previous published period.

- Approve and Publish Executive Update locks the reporting cycle and creates the CEO notification.

# 9. CEO experience

## 9.1 Dashboard - locked structure

The CEO page uses a full-width executive shell with no persistent sidebar. The locked hierarchy is: header and filters -\> three executive status cards -\> two performance charts -\> full-width recommendations and decisions.

| **Region**        | **Required content**                                                                                                 |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Header            | Page title, asset/project selector, reporting-period selector and Export Report action.                              |
| Top left          | Overall Project Status: status, movement, distribution and project breakdown link.                                   |
| Top centre        | HSE Performance: fatalities, LTIs, TRIR, high-potential incidents, overdue actions and movement.                     |
| Top right         | Legal Issues and Exposure: material issues, financial exposure, operational effect and nearest deadline.             |
| Performance left  | Production: prominent actual value plus multi-series planned-versus-actual chart.                                    |
| Performance right | Cashflow and Financing Position: liquidity summary plus actual/base/downside time-series chart and repayment marker. |
| Bottom full width | Four recommendation/decision blocks with priority, rationale, impact and action.                                     |

## 9.2 CEO actions

- Approve or defer a proposed intervention.

- Request more information from the Commercial Manager.

- Assign an executive action with owner and due date.

- Escalate an issue or record a decision.

- Acknowledge the published update.

- See the explanation and supporting evidence for a metric through progressive disclosure; detailed departmental tables remain hidden by default.

# 10. Performance modules

## 10.1 Production page - locked structure

Sidebar -\> header and filters -\> five KPI cards -\> Production Trend plus Production Summary -\> full-width Field Performance table.

- KPI strip: gross OML 30 oil production, SNRL working-interest production, gas production, production-system availability and days since last LTI.

- Production Trend: large left card; actual solid line, plan dashed line, date axis, volume axis, Daily/Weekly/Monthly controls, legend and tooltips.

- Production Summary: planned, actual, variance, working-interest, gas, capacity and deferred production.

- Field Performance: Afiesere, Eriemu, Evwreni, Oweh, Olomoro-Oleh, Kokori, Oroni and Uzere; view can switch among fields, flowstations and facilities.

## 10.2 Finance page - locked structure

Sidebar -\> header and filters -\> five financial KPI cards -\> Cashflow chart + Cash Position Summary + Budget Variance -\> Commitments table + Receivables table.

- KPI strip: available liquidity, revenue/lifting proceeds YTD, OPEX YTD, CAPEX/JV cash calls YTD and financing obligations due within 12 months.

- Cashflow Summary: cash inflows and outflows as lines, net cashflow as positive/negative bars, USD axis, period controls and tooltips.

- Cash Position Summary: unrestricted/restricted cash, undrawn facilities, total liquidity, burn, runway and next repayment.

- Budget Variance: circular chart with overall variance, under-plan, over-plan and percentage distribution.

- Lower tables: Commitments and Obligations; Invoices and Receivables.

## 10.3 HSE page - locked structure

Sidebar -\> header and filters -\> six HSE KPI cards -\> Incident Trend + Incident Summary + Top Incidents -\> Environmental Performance + HSE Compliance + HSE Actions.

- KPI strip: TRIR, recordable incidents, LTIFR, process-safety events, safety observations and days since last LTI.

- Incident Trend: actual TRIR solid line, target dashed line, incidents as bars, dual axes and period controls.

- Incident Summary and Top Incidents support the chart with detailed counts and a severity-linked list.

- Lower row: environmental metrics; circular compliance view; corrective-action table.

## 10.4 Legal & Regulatory page - locked structure

Sidebar -\> header and filters -\> six legal/regulatory KPIs -\> Risk Register + Regulatory Calendar + Compliance Overview -\> Regulator Engagement + Contracts & Approvals + Executive Alerts.

- KPI strip: legal exposure, regulatory compliance, submissions, government approvals, contractual obligations and critical risks.

- Risk Register: issue, asset/project, owner, impact, status and due date.

- Regulatory Calendar: functional horizontal timeline with regulator, due date, status and month transition.

- Compliance Overview: circular compliance chart linked to obligations.

- Lower row: government/regulator engagement, contracts/approvals and executive alerts.

## 10.5 Chart fidelity rules

| **Page**         | **Chart behaviour that must be preserved**                                                                                                 |
|------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| CEO - Production | KPI summary on left; multi-series monthly line chart on right; actual solid, plan dashed, comparison lines, axes, legend and hover values. |
| CEO - Cash       | Liquidity summary on left; actual cash to current period; visible actual/forecast boundary; base and downside forecasts; repayment marker. |
| Production       | Large planned-versus-actual line chart beside a numeric summary card.                                                                      |
| Finance          | Mixed line/bar cashflow chart; separate circular budget-variance visual.                                                                   |
| HSE              | Mixed incident-rate line/bar chart with target line and dual axes; separate circular compliance visual.                                    |
| Legal            | Horizontal regulatory timeline and circular compliance visual.                                                                             |

# 11. Shared data, status and audit logic

## 11.1 Conceptual entities

| **Entity**        | **Key fields / relationships**                                                    |
|-------------------|-----------------------------------------------------------------------------------|
| ReportingCycle    | period, asset context, due date, status, published timestamp, previous cycle      |
| DepartmentReport  | department, cycle, manager, status, certification, submitted timestamp            |
| Source            | report, type, name, metadata, original content/file, extraction status            |
| Metric            | name, value, unit, period, department, asset, status, plan/target, previous value |
| SourceReference   | metric/statement, source, page/section, worksheet/cell, excerpt, confidence       |
| Issue / Risk      | category, severity, impact, owner, due date, status, source                       |
| ReviewComment     | field/section, author, request, response, resolution status                       |
| Override          | original value, revised value, reason, reviewer, timestamp                        |
| ExecutiveUpdate   | cycle, narrative, recommendations, approval, publication                          |
| Decision / Action | update, decision, owner, due date, status, acknowledgement                        |
| AuditEvent        | actor, action, entity, before/after, timestamp                                    |

## 11.2 Conflict and correction rules

- Atlas never silently selects between contradictory source values.

- Manager corrections preserve the extracted value and create an audit event.

- Commercial overrides preserve the manager-approved value and require a reason.

- Publishing freezes the cycle. Later corrections create a new auditable revision rather than rewriting history.

- CEO decisions are distinct from source data; they reference the issue or recommendation that triggered them.

# 12. Design system and structural constraints

Atlas Design System v3 governs the visual layer. Approved sketches govern page structure. Where the two appear to conflict, the structure remains fixed and the design system controls colour, typography, spacing, borders and component styling.

| **Token / rule** | **Specification**                                                                                             |
|------------------|---------------------------------------------------------------------------------------------------------------|
| Canvas / surface | \#F5F6F8 canvas; \#FFFFFF panels; \#F9FAFB subtle surfaces.                                                   |
| Text             | \#171A1F primary; \#667085 secondary; \#98A2B3 muted.                                                         |
| Accent           | \#4F46E5 Atlas Indigo; \#4338CA hover; \#EEF2FF selected/informational tint.                                  |
| Semantic         | \#079455 success; \#DC6803 warning; \#D92D20 critical; \#1570EF information.                                  |
| Typography       | Inter in the product UI; compact hierarchy; tabular numerals for operational and financial values.            |
| Grid             | 12 columns; 24px workspace padding; 16px grid gap; 24px section gap; 232px sidebar.                           |
| Panels           | White, 1px \#E4E7EC border, 12px radius, no default shadow.                                                   |
| Controls         | 8px radius; 36px standard height; primary indigo; secondary white/outlined.                                   |
| Tables           | Subtle header fill, horizontal separators, 44-48px rows, sticky header, right-aligned numbers.                |
| Charts           | 2px primary line; dashed plan/target; distinct forecast treatment; light gridlines; dark exact-value tooltip. |

## 12.1 Structural rules

- Do not redesign, merge, reorder or omit approved page regions.

- CEO uses the no-sidebar full-width shell; Commercial and performance pages use the fixed sidebar; Department reporting uses its approved application header and reporting-focused navigation.

- Chart type, location, proportions, legend, axes and series relationships follow the supplied reference images.

- Responsive changes may stack regions only when necessary and must preserve the original reading order.

- Status is always communicated with text or icon as well as colour.

# 13. Prototype data and simulation boundaries

## 13.1 Synthetic scenario

The demo dataset will depict a single weekly cycle in which production is below plan due to a compressor/facility constraint, cash runway is pressured by a near-term financing obligation, an HSE corrective action is overdue, and a legal/regulatory deadline requires attention. These linked facts will appear consistently in departmental reports, Commercial review, module dashboards and the CEO recommendation set.

## 13.2 Simulated behaviours

| **Prototype behaviour**         | **Simulation approach**                                                                                  |
|---------------------------------|----------------------------------------------------------------------------------------------------------|
| Document/XLSX extraction        | Predefined fixtures and timed processing states produce realistic mapped results and warnings.           |
| Email/transcript interpretation | Pasted demo content triggers deterministic extraction examples; arbitrary AI processing is not promised. |
| Authentication and roles        | Persona switcher or seeded demo sessions.                                                                |
| Persistence                     | Local/session state or lightweight mock store; resettable demo scenario.                                 |
| Export                          | Mocked downloadable report or print-ready view; no regulated filing submission.                          |
| Notifications                   | In-app simulated notifications; no live email/SMS delivery.                                              |
| Integrations                    | No live ERP, production historian, bank, regulator, email or call-platform integration.                  |

# 14. Functional acceptance criteria

## 14.1 Cross-product

- Changing the reporting period or asset context updates every relevant card, chart and table on the page.

- The same seeded metric displays the same value, unit, status and period across every page where it appears.

- All interactive cards, table rows and chart points expose a clear hover/focus state and open the intended detail.

- Each material metric or statement can be traced to at least one source reference.

- Loading, empty, error and no-access states exist for every primary page.

## 14.2 Department Manager

- The dashboard matches the approved header, three-card summary and submission-history layout; the ignored navy banner is absent.

- Continue is disabled until required details and at least one input method are selected.

- Exactly four top-level method cards appear: Structured Form, Document Upload, XLSX Upload, and Paste Email or Call Transcript.

- The combined paste method requires the user to select Email or Call Transcript before adding content.

- The manager can combine multiple methods and add more than one source of the same method.

- Conflicting values remain unresolved until the manager selects an authoritative value or records an explanation.

- Submission is blocked while required fields, unresolved conflicts or certification are incomplete.

- A submitted report enters the Commercial review queue and becomes read-only until returned.

## 14.3 Commercial Manager

- The dashboard follows the locked four-card top row and three-column lower row.

- Reporting Readiness reflects departmental submission/review states for the selected cycle.

- Attention Required items open the corresponding review context.

- Requesting clarification changes status, records field-level questions and notifies the Department Manager in the prototype.

- An override cannot be saved without a reason and creates an audit event.

- Publishing is unavailable until mandatory departmental reports are approved or an explicit controlled exception exists.

- Publishing locks the cycle and makes the executive update visible to the CEO.

## 14.4 CEO

- Only published cycles appear in the executive workspace.

- The dashboard uses the approved no-sidebar structure and chart placements.

- Selecting a metric reveals explanation and evidence without exposing detailed departmental tables by default.

- A decision requires an action type; assignment additionally requires owner and due date.

- Recorded decisions appear in Commercial and responsible Department Manager workspaces.

## 14.5 Performance pages

- Production, Finance, HSE and Legal pages each preserve their approved KPI, chart and table hierarchy.

- Every chart renders from the shared prototype dataset with labelled axes, legend and exact-value tooltips.

- Planned/target, actual and forecast series are distinguishable by line style as well as colour.

- Table records support hover, selection and detail opening; numerical columns align consistently.

- All module exports state that prototype data is synthetic.

# 15. Non-functional requirements and QA

## 15.1 Non-functional requirements

- Accessibility: keyboard navigation, visible focus, semantic headings, labelled controls, colour-independent status and chart summaries.

- Performance: primary pages should become interactive quickly with the seeded dataset; chart transitions must not block navigation.

- Consistency: shared components and tokens are used across all pages; no page-specific visual system forks.

- Clarity: synthetic processing and mock exports must never appear to be production-integrated operations.

- Auditability: every correction, override, review request, publication and executive decision creates a visible audit event.

## 15.2 QA plan

| **QA stream**    | **Checks**                                                                                                                  |
|------------------|-----------------------------------------------------------------------------------------------------------------------------|
| Functional       | Happy path; multi-source path; conflicts; return/resubmit; override; publish; CEO action; reset.                            |
| Visual           | Compare each page against approved structural sketch; verify grid, region order, chart proportions and responsive stacking. |
| Data consistency | Trace seeded metrics across source, department report, Commercial, module and CEO views.                                    |
| Accessibility    | Keyboard-only task completion, focus order, labels, contrast, reduced motion and chart text equivalents.                    |
| Content          | Oil and gas terminology, units, dates, statuses, synthetic-data disclosures and error copy.                                 |
| Browser          | Current Chrome, Safari and Edge desktop versions.                                                                           |

# 16. Scope boundaries and delivery

## 16.1 In scope

- All pages and workflows specified in this PRD.

- Functional front-end navigation, filtering, charts, tables, drawers, review actions and simulated exports.

- Synthetic OML 30 dataset and resettable demonstration states.

- Repository setup and GitHub push after user approval of the verified prototype.

## 16.2 Out of scope for this prototype

- Production authentication, authorisation and user administration.

- Live AI/OCR processing for arbitrary files, emails or transcripts.

- Secure file storage, regulated records management and production audit infrastructure.

- Live ERP, banking, historian, email, call, regulator or document-management integrations.

- Automated regulatory filing or legally binding electronic approvals.

- Production mobile application and offline mode.

## 16.3 Delivery gate

Implementation does not begin until the product owner explicitly says “Start building.” The repository will not be created, connected or pushed before that instruction. After implementation, the prototype must pass functional, visual, accessibility and cross-page data-consistency checks before GitHub handoff.

## 16.4 Assumptions to validate during build

- Desktop prototype minimum width remains 1280px.

- OML 30 fields and operational terminology are suitable for the synthetic demonstration context.

- Commercial Manager is the publishing authority for the executive update.

- One reporting cycle can contain one certified report per department, with revisions preserved in history.

- PDF/DOCX/XLSX demo files will be supplied as safe synthetic fixtures or created for the prototype.

**Ready-state definition** This PRD is ready for build when the product owner confirms the scope, page structures, four input methods and prototype simulation boundaries, then gives the explicit instruction to start.
