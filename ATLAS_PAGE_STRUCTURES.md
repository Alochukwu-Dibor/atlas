# Atlas Page Structures

**Version:** 1.0  
**Status:** Locked structural specification  
**Last updated:** 1 August 2026

## 1. How to use this file

This is the canonical page-layout specification for the Atlas prototype. The attached page sketches determine structure; the visual-reference images determine styling through `ATLAS_DESIGN_SYSTEM.md`.

Do not rearrange regions, change chart types, collapse multiple approved cards into one, or introduce a sidebar on the CEO page. At narrower widths, sections may stack only in the reading order documented here.

## 2. Shared foundations

### 2.1 Shared context controls

Where specified, the header includes:

- Asset/project selector
- Reporting-period selector
- Export action
- Last-updated metadata where useful

Changing the asset or period refreshes every card, chart and table on the page.

### 2.2 Shared sidebar navigation

Used by Commercial Manager and performance modules.

Suggested primary navigation order:

1. Overview
2. Production
3. Finance
4. HSE
5. Legal & Regulatory
6. Reports / Review Queue

The user profile and role remain at the bottom. Only routes authorised for the active persona appear.

### 2.3 Interaction conventions

- Summary cards link to their detailed module.
- Attention, priority and alert rows open a contextual right-side drawer unless the structure specifies a dedicated route.
- Table rows open the underlying record.
- Charts provide hover tooltips and accessible data details.
- Evidence and audit history remain available from all material issues and metrics.

## 3. CEO Dashboard

**Route:** `/executive`  
**Shell:** Full-width executive shell; no persistent sidebar  
**Primary question:** Where should I intervene?

### 3.1 Header

Left:

- Page title: Executive Overview
- Asset/project selector beneath or adjacent to title

Right:

- Reporting-period selector
- Export Report action

Default context: `OML 30 — All Fields and Projects`.

Period options:

- Weekly Executive Update
- Monthly Performance Report
- Custom period

### 3.2 Top executive summary — 12-column `3 / 5 / 4`

| Grid | Card | Required content |
|---:|---|---|
| 3 | Overall Project Status | Overall status; movement; project counts by status; project breakdown link |
| 5 | HSE Performance | Fatalities; LTIs; TRIR; high-potential incidents; overdue actions; movement |
| 4 | Legal Issues and Exposure | Issue materiality; estimated exposure; issues affecting delivery; nearest deadline |

### 3.3 Performance row — two equal cards `6 / 6`

#### Production Performance

Internal composition follows the approved graph reference:

- KPI summary on the left
- Multi-series monthly line chart on the right
- Actual production: solid line
- Planned production: dashed line
- Previous-period comparison where useful
- Legend, labelled axes, monthly intervals and exact-value tooltips
- Detail link

View switch: Total OML 30, individual field, Gross Production, SNRL Working Interest.

#### Cashflow and Financing Position

Internal composition:

- Liquidity and runway summary on the left
- Time-series chart on the right
- Actual cash balance through current period
- Visible actual/forecast boundary
- Base-case and downside forecasts
- Financing-repayment marker
- Next repayment date and detail link

### 3.4 Recommendations and Decisions — full width `12`

Four horizontal recommendation blocks:

1. Address production underperformance
2. Approve urgent integrity expenditure
3. Resolve material legal exposure
4. Approve financing or cash-preservation action

Each block contains priority/status, title, explanation, financial or operational impact and review action.

Decision actions:

- Approve
- Defer
- Request more information
- Assign an action
- Record a decision

Assignment requires owner and due date.

### 3.5 Exclusions

Do not show departmental submission queues, missing reports, reporting readiness or routine manager tasks.

**Locked hierarchy:** Header and filters → three executive status cards → two performance charts → full-width recommendations and decisions.

## 4. Commercial Manager Dashboard

**Route:** `/commercial`  
**Shell:** Shared fixed sidebar  
**Primary job:** See performance and reporting readiness, resolve exceptions and publish the executive update.

### 4.1 Header

- Page title and concise description
- Reporting-period selector
- Asset/project context where useful
- Publish/update action appears only when workflow state permits

### 4.2 Summary row — 12-column `2 / 3 / 3 / 4`

| Grid | Card | Required content |
|---:|---|---|
| 2 | Reporting Readiness | Compact circular score; readiness percentage; approved departments / required departments |
| 3 | Overall Project Status | Status distribution; material movement; drill-through |
| 3 | Production Performance | Actual, plan, variance, short trend/status |
| 4 | Cashflow and Financing Position | Liquidity, runway, financing warning and drill-through |

Reporting Readiness example: `82% Reporting Ready` and `6 of 8 departmental reports approved`.

### 4.3 Lower row — 12-column `3 / 5 / 4`

#### Left column `3` — two stacked cards

1. Legal Issues and Regulatory Exposure
2. HSE Performance

Together they match the full height of the centre and right cards.

#### Centre `5` — Attention Required

This is the dominant lower card. Example rows:

- Production variance awaiting Operations explanation
- Finance submission missing bank confirmation
- Project milestone inconsistency
- HSE incident requiring clarification
- Legal deadline approaching

Each row opens the relevant submission or issue in a review drawer.

#### Right `4` — Today’s Priorities

Full-height action list. Example rows:

- Review Operations weekly report
- Resolve Finance and bank-payment discrepancy
- Approve HSE submission
- Review delayed project milestone
- Publish weekly executive update

Each row opens the related action or submission.

**Locked hierarchy:** Sidebar → header → four summary cards → two stacked status cards + Attention Required + Today’s Priorities.

## 5. Department Manager Dashboard

**Route:** `/department`  
**Shell:** Department reporting header; no Commercial/CEO navigation

### 5.1 Header

- Shoreline Natural Resources identity
- Reporting module indicator
- Last-updated timestamp
- New Report button
- Manager profile and role

Ignore and exclude the navy Weekly Reporting banner from the first reference image.

### 5.2 Reporting summary — three equal cards `4 / 4 / 4`

1. Submissions Due
   - Count due
   - Reporting period
   - Deadline or all-submitted state
2. Pending Commercial Review
   - Awaiting-review count
   - Supporting state text
3. Returned Submissions
   - Returned count
   - Most urgent response deadline

Use “Returned Submissions,” not “Rejected Submissions.”

### 5.3 Submission History — full width

| Column | Content |
|---|---|
| Project · Period | Related asset/project and reporting period |
| Method | One or multiple source-method labels |
| Status | Draft, Submitted, Needs Clarification, Resubmitted, Approved or Locked |
| Submitted | Date and time, or em dash for drafts |

Selecting a row opens the report, sources, comments, evidence and audit history.

**Locked hierarchy:** Application header → three reporting-status cards → full-width submission-history table.

## 6. Create Weekly Report

**Route:** `/department/reports/new`  
**Shell:** Department reporting shell

### 6.1 Step indicator

Two visible steps:

1. Details & Method
2. Content

### 6.2 Step 1 — Common Details

One full-width card containing a two-column, two-row form:

| Left | Right |
|---|---|
| Project selector | Department, auto-populated and locked |
| Reporting-period selector | Generated but editable title |

Below the fields, an information panel shows the relevant locked baseline and explains that baseline changes require a Commercial Manager request.

### 6.3 Step 1 — Submission method selection

Four equal-width selectable cards:

1. Atlas Structured Form
2. Document Upload — PDF or DOCX
3. XLSX Upload
4. Paste Email or Call Transcript

One or several cards may be selected. The fourth card opens a source-type choice between Email and Call Transcript.

Continue is bottom-right and disabled until required details are complete and at least one method is selected.

### 6.4 Step 2 — Content

Render selected-method inputs followed by:

- Add another source
- Source list and processing state
- Extracted-information review
- Missing-data, low-confidence and conflict warnings
- Certification statement
- Submit Report action

At the standardised-review stage, use a split desktop layout:

- Left: original source viewer/excerpt
- Right: Atlas standardised departmental report

Every extracted item shows a source reference.

**Locked hierarchy:** Header → two-step indicator → common details → four method cards → Continue → method content → extraction review → certify and submit.

## 7. Commercial Review

**Route:** `/commercial/review/:id` or a dashboard review drawer, depending on depth  
**Shell:** Shared sidebar

### 7.1 Review header

- Department and reporting period
- Submission status
- Manager and submission timestamp
- Source count and method labels
- Previous/next queue navigation

### 7.2 Review body

Primary review area should support:

- Standardised report fields and narrative
- Variance flags and required explanations
- Source references beside every material value
- Missing evidence and conflicts
- Field-level comments
- Source/evidence viewer in a side panel or drawer
- Audit history

### 7.3 Review action area

- Approve report
- Request clarification
- Controlled override
- Save executive narrative
- Publish when every gate is satisfied

Override requires revised value, reason and confirmation. Clarification requires at least one field-level question.

## 8. Production Page

**Route:** `/production`  
**Shell:** Shared fixed sidebar; Production active

### 8.1 Header

- Title and description
- Asset/project selector
- Reporting-period selector
- Export action

Default: `OML 30 — All Fields`.

### 8.2 KPI strip — five equal cards

1. Gross OML 30 oil production
2. SNRL working-interest production
3. Gas production
4. Production-system availability
5. Days since last lost-time injury

Each production card contains actual, unit, plan comparison and semantic status.

### 8.3 Production analysis — `8 / 4`

#### Production Trend `8`

- Large planned-versus-actual line chart
- Actual solid; plan dashed
- Date x-axis; volume y-axis
- Daily / Weekly / Monthly controls
- Legend, exact tooltips and detail link

#### Production Summary `4`

- Planned oil production
- Actual oil production
- Absolute and percentage variance
- SNRL working-interest production
- Gas production
- Available capacity
- Deferred production

### 8.4 Field Performance — full width

View By control: Fields, Flowstations, Facilities.

| Column | Content |
|---|---|
| Field | Field name |
| Planned | bopd |
| Actual | bopd |
| Variance | Absolute and percentage |
| Availability | Percentage |
| Status | On Track, At Risk, Constrained or Offline |
| Trend | Seven-day sparkline |
| Versus Plan | Percentage |
| Action | Opens field detail |

Fields: Afiesere, Eriemu, Evwreni, Oweh, Olomoro–Oleh, Kokori, Oroni and Uzere.

**Locked hierarchy:** Sidebar → header and filters → five KPI cards → Production Trend + Production Summary → Field Performance table.

## 9. Finance Page

**Route:** `/finance`  
**Shell:** Shared fixed sidebar; Finance active

### 9.1 Header

- Title and description
- Asset/project selector
- Reporting-period selector
- Export action

Default: `OML 30 — All Fields and Projects`.

### 9.2 KPI strip — five equal cards

1. Available liquidity, including runway
2. Revenue and lifting proceeds YTD
3. OPEX YTD
4. CAPEX and JV cash calls YTD
5. Financing obligations due within 12 months

### 9.3 Analysis row — 12-column `6 / 3 / 3`

#### Cashflow Summary `6`

- Cash inflows solid line
- Cash outflows solid line
- Net cashflow positive/negative bars
- USD y-axis; date x-axis
- Daily / Weekly / Monthly controls
- Legend and exact tooltips

#### Cash Position Summary `3`

- Unrestricted cash
- Restricted cash
- Undrawn committed facilities
- Total liquidity
- Average monthly burn
- Runway
- Next financing repayment and due date

#### Budget Variance `3`

- Circular variance visual
- Overall variance versus approved budget
- Amount under plan
- Amount over plan
- Percentage distribution
- Variance-analysis link

### 9.4 Lower row — `8 / 4`

#### Commitments and Obligations `8`

Columns: Category, Total committed, Paid to date, Remaining, Due within 30 days, Status.

#### Invoices and Receivables `4`

Columns: Reference, Revenue source/project, Amount, Due date, Status.

**Locked hierarchy:** Sidebar → header and filters → five financial KPIs → Cashflow + Cash Position + Budget Variance → Commitments + Receivables.

## 10. HSE Page

**Route:** `/hse`  
**Shell:** Shared fixed sidebar; HSE active

### 10.1 Header

- Title and description
- Asset/project selector
- Reporting-period selector
- Export action

Default: `OML 30 — All Fields and Facilities`.

### 10.2 KPI strip — six equal cards

1. Total Recordable Incident Rate
2. Total Recordable Incidents
3. Lost-Time Injury Frequency Rate
4. Process-Safety Events
5. Safety Observations
6. Days Since Last Lost-Time Injury

### 10.3 Incident analysis — `6 / 3 / 3`

#### Incident Trend `6`

- Actual TRIR solid line
- Target TRIR dashed line
- Recordable incidents as bars
- Dual y-axes; date x-axis
- Daily / Weekly / Monthly controls
- Legend and tooltips

#### Incident Summary `3`

Total recordables, medical treatment cases, LTIs, restricted work cases, near misses, high-potential incidents, employee/contractor hours, actual TRIR and target.

#### Top Incidents `3`

Columns: Incident, Location, Severity. Selection opens details, investigation, evidence and corrective actions.

### 10.4 Lower row — `3 / 3 / 6`

#### Environmental Performance `3`

Spills/volume, produced-water compliance, flaring intensity, environmental incidents, notifications and target status.

#### HSE Compliance `3`

Circular compliance visual: score, compliant requirements, minor gaps, major gaps and overdue findings.

#### HSE Actions `6`

Columns: Action, Related incident/audit, Owner, Due date, Status.

**Locked hierarchy:** Sidebar → header and filters → six HSE KPIs → Incident Trend + Incident Summary + Top Incidents → Environmental + Compliance + HSE Actions.

## 11. Legal & Regulatory Page

**Route:** `/legal`  
**Shell:** Shared fixed sidebar; Legal & Regulatory active

### 11.1 Header

- Title and description
- Asset/project selector
- Reporting-period selector
- Export action

Default: `OML 30 — All Fields and Projects`.

### 11.2 KPI strip — six equal cards

1. Legal Exposure
2. Regulatory Compliance
3. Regulatory Submissions
4. Government Approvals
5. Contractual Obligations
6. Critical Risks

### 11.3 Overview row — `5 / 4 / 3`

#### Legal & Regulatory Risk Register `5`

Columns: Issue, Asset/Project, Owner, Impact, Status, Due date.

#### Regulatory Calendar `4`

- Functional horizontal timeline
- Submission/approval, regulator, due date and status
- Reporting-month transition
- Hover details and selectable events

Statuses: Submitted, Upcoming, Due Soon, Overdue, Upcoming Next Month.

#### Compliance Overview `3`

Circular compliance visual: score, compliant requirements, minor issues, major issues and detail link.

### 11.4 Lower row — `4 / 4 / 4`

#### Government & Regulator Engagement

Columns: Organisation, Relationship owner, Status, Next engagement.

#### Contracts & Approvals

Columns: Contract/approval, Asset/project, Status, Owner, Due date.

#### Executive Alerts

Prioritised list of material matters. Every alert shows severity and opens the source matter.

**Locked hierarchy:** Sidebar → header and filters → six KPIs → Risk Register + Regulatory Calendar + Compliance → Engagement + Contracts & Approvals + Executive Alerts.

## 12. Required non-happy states

Every primary page requires:

- Loading skeleton matching its final structure
- Empty state with clear reason and next action
- Recoverable error state
- No-access state
- Stale-data indicator when relevant

Workflow pages additionally require upload/extraction processing, failed extraction, unsaved changes and locked/read-only states.

## 13. Structural QA checklist

- [ ] CEO page has no sidebar.
- [ ] CEO top row is `3 / 5 / 4` and performance row is `6 / 6`.
- [ ] Commercial top row is `2 / 3 / 3 / 4`; lower row is `3 / 5 / 4`.
- [ ] Department dashboard excludes the navy banner.
- [ ] Create Report shows exactly four method cards.
- [ ] Production uses 5 KPIs, `8 / 4` analysis and full-width table.
- [ ] Finance uses 5 KPIs, `6 / 3 / 3` analysis and `8 / 4` tables.
- [ ] HSE uses 6 KPIs, `6 / 3 / 3` analysis and `3 / 3 / 6` lower row.
- [ ] Legal uses 6 KPIs, `5 / 4 / 3` overview and `4 / 4 / 4` lower row.
- [ ] All approved charts are functional and retain the specified series relationships.
