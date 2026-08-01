# Atlas Prototype — Agent Instructions

These instructions apply to the entire repository.

## 1. Authority order

When requirements appear ambiguous, use this order:

1. The product owner's latest explicit instruction.
2. `ATLAS_PAGE_STRUCTURES.md` for page hierarchy, grid, chart placement and page interactions.
3. `ATLAS_USER_FLOWS.md` for workflow behaviour, states and transitions.
4. `ATLAS_MOCK_DATA.json` for all displayed figures and cross-page relationships.
5. `ATLAS_DESIGN_SYSTEM.md` for visual tokens and component styling.
6. `Atlas_PRD.md` for product intent, scope and acceptance criteria.

Do not infer permission to override a higher-authority file from a lower-authority one.

## 2. Build gate

- Do not begin application implementation until the product owner explicitly says **“Start building.”**
- Creating or refining specification files is allowed before the build gate.
- Do not create a GitHub repository, connect a remote, commit, push or deploy until explicitly instructed.

## 3. Locked product decisions

- Atlas is a functional front-end prototype for Shoreline Natural Resources / OML 30 using entirely synthetic data.
- The CEO dashboard uses a full-width shell with no persistent sidebar.
- Commercial, Production, Finance, HSE, and Legal & Regulatory use the shared fixed-sidebar shell.
- Department Manager pages use the reporting-focused application header and must not expose Commercial or CEO navigation.
- The navy banner shown in the Department Dashboard reference is excluded.
- Department reporting offers exactly four top-level input method cards:
  1. Atlas Structured Form
  2. Document Upload
  3. XLSX Upload
  4. Paste Email or Call Transcript
- Email and Call Transcript are source types inside one combined paste method, not separate cards.
- Users may combine input methods and add several sources.
- Page sketches define structure. Visual references define styling. Do not confuse the two.

## 4. Structural fidelity

- Follow every page hierarchy and grid ratio in `ATLAS_PAGE_STRUCTURES.md`.
- Do not merge, remove, reorder or replace approved sections.
- Preserve chart type, location, relative proportion, axes, legend and series relationships.
- Responsive layouts may stack sections only when necessary and must preserve reading order.
- Do not replace a chart with a KPI card, table, screenshot or placeholder.

## 5. Data rules

- Treat `ATLAS_MOCK_DATA.json` as the single source of truth.
- Do not hard-code conflicting figures inside components.
- Derive repeated KPIs and statuses through shared selectors/utilities.
- Production, cash, project, HSE and legal facts must tell one coherent story across Department, Commercial, module and CEO pages.
- Preserve units, reporting periods, source references and status semantics.
- All exports and relevant detail views must identify the data as synthetic prototype data.

## 6. Prototype simulation rules

The following are realistic simulations, not production integrations:

- Authentication and role switching
- PDF/DOCX/XLSX extraction
- Email/transcript interpretation
- Notifications
- Persistence
- Publishing
- Export
- External systems and regulatory filing

Use deterministic fixture-driven behaviour. Do not claim arbitrary AI processing, secure persistence or live integration.

## 7. State and audit rules

- Never silently resolve contradictory source values.
- Manager corrections retain the extracted value and create an audit event.
- Commercial overrides retain the approved department value, require a reason and create an audit event.
- Published cycles are immutable; later corrections create a revision.
- CEO decisions reference the recommendation or issue that caused them.
- Assignment decisions require an owner and due date.

## 8. Suggested application architecture

Use a modern TypeScript front end with:

- Reusable shell, card, table, chart, drawer, badge and form components
- Route-level pages matching the routes in the PRD
- Central typed mock-data store loaded from `ATLAS_MOCK_DATA.json`
- Shared reporting-period and asset-context state
- Derived selectors for repeated metrics
- A deterministic demo-state layer for workflow transitions
- Accessible chart library capable of mixed line/bar, dual-axis, timeline and circular visuals
- Tests for selectors, state transitions and critical user flows

If the chosen framework differs, preserve the same separation of data, presentation and workflow logic.

## 9. Engineering standards

- Use TypeScript strict mode.
- Prefer small, composable components over page-specific duplication.
- Use design tokens; do not scatter raw colours and spacing values.
- Use semantic HTML and explicit labels.
- All primary actions must work; avoid dead buttons.
- Add loading, empty, error and no-access states to each primary page.
- Keep charts keyboard-accessible and provide text/table equivalents.
- Respect `prefers-reduced-motion`.
- Keep the console free of avoidable warnings and errors.

## 10. Verification requirements

Before declaring the build complete:

1. Run formatting, lint, typecheck and tests.
2. Verify all routes and persona permissions.
3. Complete the Department → Commercial → CEO happy path.
4. Complete conflict, return/resubmit, override and decision-assignment paths.
5. Compare each page against its approved structural specification.
6. Verify repeated metrics match across pages.
7. Check keyboard navigation, focus visibility, labels and colour-independent status.
8. Check Chrome, Safari and Edge desktop behaviour where the environment allows.
9. Verify synthetic-data disclosure in exports.

## 11. Scope control

Do not add these without explicit approval:

- Production backend or database
- Live AI/OCR
- Real authentication or user administration
- Live email, bank, ERP, historian, call or regulator integrations
- Automated regulatory submission
- Mobile application or offline mode
- New dashboards, metrics or page regions not specified in the source files

If implementation exposes a genuine product ambiguity, document the smallest decision needed and ask before changing the locked experience.
