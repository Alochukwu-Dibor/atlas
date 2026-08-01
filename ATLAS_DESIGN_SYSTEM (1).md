# Atlas Design System

**Version:** 3.0  
**Status:** Approved for prototype implementation  
**Last updated:** 1 August 2026

## 1. Purpose

This file is the visual authority for the Atlas prototype. It translates the approved visual references into reusable tokens, component rules, chart conventions and responsive behaviour.

The approved page sketches remain the structural authority. This file controls how those structures look; it does not authorise rearranging them.

Atlas should feel **precise, calm, operational, credible and executive-ready**. It should resemble a serious operating system for an energy company, not a colourful startup dashboard or an AI-themed product.

## 2. Design principles

1. **Information first:** values, status and required action take priority over decoration.
2. **Dense but calm:** support executive and operational scanning without visual noise.
3. **Evidence remains reachable:** summaries use progressive disclosure rather than hiding source context.
4. **Status is explicit:** colour always appears with a label, icon, line style or pattern.
5. **Structure is stable:** consistent placement helps users build a reliable mental model.
6. **Charts are analytical controls:** every graph must be data-driven, labelled and inspectable.
7. **Synthetic data is disclosed:** prototype exports and detail views state that figures are illustrative.

## 3. Colour tokens

### 3.1 Core palette

| Token | CSS variable | Value | Use |
|---|---|---:|---|
| Canvas | `--atlas-canvas` | `#F5F6F8` | Application background |
| Surface | `--atlas-surface` | `#FFFFFF` | Cards, tables, forms |
| Surface subtle | `--atlas-surface-subtle` | `#F9FAFB` | Sidebar, table headers, grouped controls |
| Surface selected | `--atlas-surface-selected` | `#F2F4F7` | Active navigation and neutral selection |
| Text primary | `--atlas-text-primary` | `#171A1F` | Headings, values, primary copy |
| Text secondary | `--atlas-text-secondary` | `#667085` | Descriptions and labels |
| Text muted | `--atlas-text-muted` | `#98A2B3` | Metadata and disabled copy |
| Border | `--atlas-border` | `#E4E7EC` | Panels and row dividers |
| Border strong | `--atlas-border-strong` | `#D0D5DD` | Inputs and emphasised boundaries |
| Atlas Indigo | `--atlas-primary` | `#4F46E5` | Primary actions and main chart series |
| Indigo hover | `--atlas-primary-hover` | `#4338CA` | Hover and pressed states |
| Indigo tint | `--atlas-primary-tint` | `#EEF2FF` | Selected and informational backgrounds |
| Dark action | `--atlas-dark-action` | `#17181C` | Tooltips and floating action bars |

### 3.2 Semantic palette

| State | Foreground | Tint | Meaning |
|---|---:|---:|---|
| Success | `#079455` | `#ECFDF3` | Approved, on track, positive movement |
| Warning | `#DC6803` | `#FFFAEB` | At risk, due soon, needs attention |
| Critical | `#D92D20` | `#FEF3F2` | Delayed, overdue, critical exposure |
| Information | `#1570EF` | `#EFF8FF` | In progress, submitted, contextual info |
| Neutral | `#475467` | `#F2F4F7` | Draft, not started, inactive |

Do not use success green to mean “above plan” when a higher value is adverse, such as incidents or expenditure. Semantic meaning takes precedence over mathematical direction.

### 3.3 Chart series

| Series | Treatment |
|---|---|
| Actual / primary | Indigo `#4F46E5`, 2px solid |
| Plan / target | Slate `#667085`, 1.5px dashed |
| Previous period | Blue `#1570EF`, 1.5px solid at reduced opacity |
| Base forecast | Indigo tint, 1.5px dotted or dashed |
| Downside forecast | Critical `#D92D20`, 1.5px dotted |
| Positive bars | Success `#079455` |
| Negative bars | Critical `#D92D20` |
| Neutral bars | `#98A2B3` |
| Gridlines | `#EAECF0`, 1px |

Planned, actual and forecast data must differ by line style as well as colour.

## 4. Typography

**Typeface:** Inter, with `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, sans-serif fallbacks.

Use `font-variant-numeric: tabular-nums` for KPIs, tables, axes, dates and financial values.

| Role | Size / line height | Weight |
|---|---|---|
| Page title | 24px / 32px | 600 |
| Section heading | 18px / 28px | 600 |
| Panel title | 14px / 20px | 600 |
| Primary KPI | 28–32px / 36px | 600 |
| Secondary KPI | 20–24px / 30px | 600 |
| Body | 14px / 20px | 400 |
| Supporting | 12px / 18px | 400 |
| Metadata / overline | 11px / 16px | 500 |
| Button / control | 13px / 20px | 500 |

Use sentence case. Avoid oversized headings; dashboard values should carry the strongest emphasis.

## 5. Grid, spacing and sizing

Atlas uses a 12-column desktop grid.

| Token | Value |
|---|---:|
| Minimum target width | 1280px |
| Workspace padding | 24px |
| Grid gap | 16px |
| Section gap | 24px |
| Panel padding | 20px |
| Compact panel padding | 16px |
| Sidebar width | 232px |
| Top header height | 64px |
| Standard control height | 36px |
| Large control height | 40px |
| Table row height | 48px |
| Compact table row | 44px |

Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 48px`.

## 6. Application shells

### 6.1 Shared sidebar shell

Used by Commercial Manager, Production, Finance, HSE, and Legal & Regulatory.

- Fixed 232px light sidebar using Surface Subtle.
- Atlas identity at the top.
- Navigation grouped by function with visible text labels.
- Active item uses a pale neutral or indigo-tinted rounded state.
- Current user profile and role are anchored at the bottom.
- Main content uses Canvas with 24px padding.
- Header contains page title/description on the left and compact context controls on the right.

### 6.2 Department reporting shell

- Full-width 64px application header; no Commercial or CEO navigation.
- Shoreline identity, Reporting module label and last-updated time.
- New Report action and Department Manager profile on the right.
- Reporting content uses the same canvas, surface and component rules.
- The navy promotional/reporting banner shown in the reference is excluded.

### 6.3 CEO executive shell

- Full-width layout with no persistent sidebar.
- Compact top header with Atlas identity, asset context, reporting period and Export Report action.
- Uses wider chart panels and slightly more horizontal breathing room.
- Routine submission queues, missing reports and departmental tasks are excluded.

## 7. Panels and KPI cards

- Surface background, 1px Border, 12px radius, no default shadow.
- Heading top-left; overflow or drill-through action top-right.
- KPI order: label → value and unit → comparison/status → supporting context.
- Primary values should not wrap; units remain visually secondary.
- Delta badges use semantic text on tint backgrounds.
- Circular indicators use a restrained 8–10px track and include a text equivalent.
- Mini visualisations appear only where the approved page structure calls for them.
- Clickable cards use hover border `#D0D5DD`, visible focus and pointer cursor.

## 8. Charts

### 8.1 Global requirements

- Render from `ATLAS_MOCK_DATA.json`; no screenshots or static chart images.
- Legends sit above the plot and align left unless the sketch dictates otherwise.
- Axes use 11–12px muted labels and human-readable unit formatting.
- Tooltips use Dark Action, white text, exact value, series name and period.
- Use a thin dashed crosshair where time-series comparison benefits from it.
- Data points appear on hover or at material events.
- Provide an accessible chart summary and a data-table alternative.
- Respect reduced-motion preferences.

### 8.2 Approved chart treatments

| Context | Required visual |
|---|---|
| CEO production | KPI summary left; multi-series monthly line chart right; actual solid, plan dashed, previous-period comparison |
| CEO cash | Liquidity summary left; actual-to-forecast boundary; base and downside forecasts; repayment marker |
| Production | Large planned-versus-actual line chart with Daily / Weekly / Monthly control |
| Finance cashflow | Inflow and outflow lines plus net-cashflow positive/negative bars |
| Finance budget | Circular budget-variance ring with textual breakdown |
| HSE incidents | Actual TRIR line, dashed target and incident-count bars using dual axes |
| HSE compliance | Circular compliance ring with category breakdown |
| Legal calendar | Horizontal regulatory timeline with status-coded events and reporting-month transition |
| Legal compliance | Circular compliance ring linked to obligations |

Forecast zones may use subtle diagonal hatching. Decorative gradients are not permitted.

## 9. Tables

- Table sits inside a bordered panel.
- Header uses Surface Subtle; sticky when content scrolls.
- Horizontal dividers only; avoid boxed cells.
- Labels left-aligned; numeric values right-aligned.
- Use 12–14px body text and tabular numerals.
- Hover uses Surface Subtle; selected row uses Indigo Tint.
- Status badges are compact and labelled.
- Row actions use a three-dot menu; the row itself may open details when specified.
- Empty state explains why there is no data and the next available action.
- On narrow layouts, preserve column priority and offer horizontal scrolling rather than hiding critical fields.

## 10. Controls and form elements

- Radius 8px; 36px standard height; 40px primary form action.
- Primary: indigo background, white text; hover uses Indigo Hover.
- Secondary: white surface, neutral border, primary text.
- Tertiary: transparent background, indigo or primary text.
- Destructive: pale red or white surface with critical text.
- Filter and period selectors are compact outlined controls.
- Segmented control uses a soft-grey container and white active segment.
- Inputs require persistent labels; placeholder text is supplementary.
- Error messages appear below the affected field and describe resolution.
- Disabled controls retain readable contrast and explain blocking requirements where useful.

## 11. Status badges

| Product status | Semantic style |
|---|---|
| Draft | Neutral |
| Submitted / In Progress | Information |
| Needs Clarification / At Risk / Due Soon | Warning |
| Resubmitted | Information |
| Approved / Published / On Track / Closed | Success |
| Delayed / Overdue / Critical / Offline | Critical |
| Locked | Neutral with lock icon |

## 12. Drawers, menus and modals

- Right-side review drawer: 480–640px depending on evidence density.
- Preserve page context behind the drawer; do not route away for quick review.
- Drawer header remains sticky and includes record title, status and close action.
- Modal max width should match decision complexity; routine confirmation stays compact.
- Shadows are allowed only for drawers, modals, dropdowns, tooltips, floating bulk bars and temporarily elevated selections.

## 13. Icons

- Use one consistent outline icon set.
- Default size 18px, approximately 1.5px stroke.
- Filled icons are reserved for strong selected or semantic states.
- Icon-only actions require an accessible name and tooltip.
- Primary navigation always retains text labels.

## 14. Interaction states

Every interactive component must specify:

- Default
- Hover
- Focus-visible
- Active/pressed
- Selected, if applicable
- Disabled
- Loading
- Error

Skeletons should mirror final component dimensions to minimise layout shift.

## 15. Responsive behaviour

- Desktop at 1280px and above is the fidelity target.
- At narrower desktop/tablet widths, approved grid regions may stack while retaining exact reading order.
- The sidebar may collapse to an icon rail only below the primary target width.
- Tables may horizontally scroll.
- Drawers may become near-full-width.
- Do not create a separate mobile information architecture for this prototype.

## 16. Accessibility

- Meet WCAG 2.1 AA contrast for text and essential controls.
- All workflows must be keyboard-operable.
- Visible focus rings use a 2px indigo outline with offset.
- Use semantic heading order and labelled regions.
- Status never relies on colour alone.
- Charts provide text summaries and underlying tabular values.
- Announce asynchronous extraction, saving and submission states.

## 17. Content and data formatting

- Currency: `$12.4m`, `$850k`; disclose USD in headings or axis labels.
- Oil: `bopd`; gas: `MMscf/d`; percentages: one decimal only where material.
- Dates: `1 Aug 2026` in content; `01 Aug` on compact charts where needed.
- Negative values use a true minus sign and semantic context.
- Use “returned” or “needs clarification,” not “rejected,” for correctable submissions.
- Use “Paste Email or Call Transcript” as one top-level method label.

## 18. Prohibited visual choices

- No decorative gradients, glassmorphism, neon colours or AI sparkle motifs.
- No default card shadows.
- No browser chrome, scenic backgrounds, reference logos or traffic-light controls copied from the visual guides.
- No pie/donut chart when the approved structure requires another visual.
- No chart screenshots, unlabeled axes or colour-only legends.
- No rearrangement of approved page regions to make implementation easier.

