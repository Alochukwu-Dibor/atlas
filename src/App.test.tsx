import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { activePersonaStorageKey, AtlasProvider } from './state/AtlasContext';
import {
  createEmptyManagerUpdatesState,
  createInitialManagerUpdatesState,
  managerUpdatesReducer,
  managerUpdatesStorageKey,
  type ManagerWeeklyUpdate,
} from './state/managerUpdates';
import { executiveStorageKey } from './state/executive';
import { recommendationStorageKey } from './state/recommendations';
import { workflowStorageKey } from './state/workflow';
import {
  getApprovedPlanFixtureFile,
  initialPlanState,
  planReducer,
  planStorageKey,
} from './state/plan';

function seedConfirmedPlan() {
  let state = planReducer(initialPlanState(), {
    type: 'SELECT_FILE',
    file: getApprovedPlanFixtureFile(),
  });
  state = planReducer(state, { type: 'START_UPLOAD' });
  state = planReducer(state, { type: 'START_EXTRACTION' });
  state = planReducer(state, { type: 'COMPLETE_EXTRACTION' });
  state = planReducer(state, {
    type: 'CONFIRM_PLAN',
    actorId: 'usr_commercial',
    now: '2026-08-06T10:00:00+01:00',
  });
  window.localStorage.setItem(planStorageKey, JSON.stringify(state));
}

function seedPrivateManagerDraft() {
  const update: ManagerWeeklyUpdate = {
    id: 'private_manager_draft',
    creatorId: 'usr_operations',
    departmentId: 'dept_operations',
    projectId: 'prj_compressor',
    reportingPeriodId: 'cycle_2026_w31',
    reportingDeadline: '2026-08-04',
    sections: {
      highlights: 'Private draft highlight.',
      ongoingActivities: '',
      risks: '',
      plansForWeek: '',
    },
    chart: null,
    attachments: [],
    status: 'draft',
    savedAt: '2026-08-03T12:01:00+01:00',
    submittedAt: null,
    visibleToRoles: [],
    comments: [],
  };
  const state = managerUpdatesReducer(createInitialManagerUpdatesState(), {
    type: 'UPSERT_UPDATE',
    update,
  });
  window.localStorage.setItem(managerUpdatesStorageKey, JSON.stringify(state));
}

function seedExecutiveUpdateSet() {
  const commercialUpdate: ManagerWeeklyUpdate = {
    id: 'manager_update_commercial_compressor_w31',
    creatorId: 'usr_commercial',
    departmentId: 'dept_commercial',
    projectId: 'prj_compressor',
    reportingPeriodId: 'cycle_2026_w31',
    reportingDeadline: '2026-08-04',
    sections: {
      highlights: 'Commercial delivery reached 93% against the approved weekly plan.',
      ongoingActivities: 'Cost recovery validation and partner alignment remain in progress.',
      risks: 'One partner invoice remains unresolved.',
      plansForWeek: 'Close the invoice query and update the commercial forecast.',
    },
    chart: {
      id: 'chart_commercial_compressor_w31',
      type: 'line',
      title: 'Commercial delivery chart',
      values: [
        { label: 'Plan', value: 100 },
        { label: 'Actual', value: 93 },
      ],
      generatedAt: '2026-08-03T11:00:00+01:00',
    },
    attachments: [
      {
        id: 'attachment_commercial_compressor_w31',
        name: 'Commercial_Performance_W31.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 184_000,
        status: 'uploaded',
      },
    ],
    status: 'submitted',
    savedAt: '2026-08-03T11:00:00+01:00',
    submittedAt: '2026-08-03T11:00:00+01:00',
    visibleToRoles: ['commercial_manager', 'ceo', 'cfo'],
    comments: [],
  };
  const hiddenDraft: ManagerWeeklyUpdate = {
    ...commercialUpdate,
    id: 'manager_update_operations_wellwork_w31_draft',
    creatorId: 'usr_operations',
    departmentId: 'dept_operations',
    projectId: 'prj_wellwork',
    chart: null,
    attachments: [],
    status: 'draft',
    submittedAt: null,
    visibleToRoles: [],
  };
  let state = managerUpdatesReducer(createInitialManagerUpdatesState(), {
    type: 'UPSERT_UPDATE',
    update: commercialUpdate,
  });
  state = managerUpdatesReducer(state, { type: 'UPSERT_UPDATE', update: hiddenDraft });
  window.localStorage.setItem(managerUpdatesStorageKey, JSON.stringify(state));
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('route architecture', () => {
  it('renders the confirmed-plan Dashboard with approved Commercial navigation', async () => {
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }, { timeout: 5000 }),
    ).toBeVisible();
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(navigation).toBeVisible();
    expect(navigation).toHaveTextContent('DashboardPortfolioReporting');
    expect(within(navigation).getAllByRole('link')).toHaveLength(3);
    expect(within(navigation).queryByRole('link', { name: 'Plan' })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole('link', { name: 'Execution' })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole('link', { name: 'Decisions' })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole('link', { name: 'Outputs' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Portfolio Health' })).toBeVisible();
    expect(screen.queryByText('Business Health')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Current performance' })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Production / })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Cash runway/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^HSE \(TRIR\)/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Exposure/ })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Needs your attention' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Today’s priorities' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Plan Delivery Trend' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('button', { name: 'Update Plan' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reset Atlas' })).toBeVisible();
    expect(
      screen.queryByRole('navigation', { name: 'Configuration navigation' }),
    ).not.toBeInTheDocument();
  });

  it('opens the confirmed plan at review from the Dashboard action', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'Update Plan' }));
    expect(await screen.findByRole('heading', { name: 'Extraction review' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Upload another plan' })).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: /Upload the externally approved/ }),
    ).not.toBeInTheDocument();
  });

  it('directs an unconfigured Dashboard to the Plan module', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Confirm an approved plan to activate the Dashboard',
      }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Open Plan' }));
    expect(await screen.findByRole('heading', { name: 'Plan' })).toBeVisible();
  });

  it('completes the approved Plan extraction and confirmation flow', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/plan']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Plan' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Use synthetic plan fixture' }));
    expect(screen.getByText('OML30_2026_Approved_Business_Plan.pdf')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Continue and extract' }));
    expect(
      await screen.findByRole('heading', { name: 'Extracting approved baseline information' }),
    ).toBeVisible();
    expect(
      await screen.findByText(
        'All required baseline information is complete.',
        {},
        { timeout: 3500 },
      ),
    ).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Custom fields' }));
    await user.click(screen.getByRole('button', { name: 'Add Custom Field' }));
    const modal = screen.getByRole('dialog', { name: 'Add custom field' });
    await user.type(within(modal).getByLabelText('Field name'), 'Partner carry basis');
    await user.type(within(modal).getByLabelText('Value'), 'JV approved');
    await user.click(within(modal).getByRole('button', { name: 'Add field' }));
    expect(screen.getByDisplayValue('Partner carry basis')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Review confirmation summary' }));
    expect(screen.getByRole('heading', { name: 'Confirm tracking baseline' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Confirm as Atlas baseline' }));
    const warning = screen.getByRole('dialog', {
      name: 'Confirm approved plan as tracking baseline',
    });
    await user.click(within(warning).getByRole('checkbox'));
    await user.click(within(warning).getByRole('button', { name: 'Confirm baseline' }));
    expect(
      await screen.findByRole('heading', {
        name: 'Approved plan confirmed as the Atlas tracking baseline',
      }),
    ).toBeVisible();
  });

  it('resets the complete local walkthrough to the approved-plan upload step', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/plan']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Approved plan confirmed as the Atlas tracking baseline',
      }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Reset Atlas' }));
    const warning = screen.getByRole('dialog', { name: 'Reset Atlas and start from scratch?' });
    expect(within(warning).getByText(/clears the confirmed plan/)).toBeVisible();
    await user.click(within(warning).getByRole('button', { name: 'Reset and start over' }));

    expect(
      await screen.findByRole('heading', { name: 'Upload the externally approved business plan' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continue and extract' })).toBeDisabled();
    expect(window.localStorage.getItem(planStorageKey)).toContain('"confirmedPlan":null');
    await waitFor(() => {
      expect(window.localStorage.getItem(managerUpdatesStorageKey)).toContain('"updates":[]');
      expect(window.localStorage.getItem(executiveStorageKey)).toContain('"decisions":[]');
      expect(window.localStorage.getItem(recommendationStorageKey)).toContain('"items":[]');
      expect(window.localStorage.getItem(workflowStorageKey)).toContain('"reports":[]');
    });
  });

  it('accepts and removes a supported approved-plan file', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/plan']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Plan' });
    const input = screen.getByLabelText('Approved plan file');
    await user.upload(
      input,
      new File(['approved plan'], 'Shoreline_Approved_Plan.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    expect(screen.getByText('Shoreline_Approved_Plan.xlsx')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continue and extract' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(screen.queryByText('Shoreline_Approved_Plan.xlsx')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue and extract' })).toBeDisabled();
  });

  it('renders the new Commercial Projects workspace', async () => {
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/projects?tab=projects']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Portfolio' })).toBeVisible();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Performance',
      'Projects',
    ]);
    expect(screen.getByRole('tab', { name: 'Projects' })).toHaveAttribute('aria-selected', 'true');
    const table = screen.getByRole('table', { name: 'Commercial project portfolio' });
    expect(table).toBeVisible();
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Project name', 'Current phase', 'Health', 'Progress']);
  });

  it('requires a confirmed plan before showing the project list', async () => {
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Confirm an approved plan to view department delivery',
      }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open Plan' })).toBeVisible();
  });

  it('loads a project workspace directly and handles an unknown project identifier', async () => {
    seedConfirmedPlan();
    const { unmount } = render(
      <MemoryRouter initialEntries={['/projects/prj_integrity']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Ughelli Export Line Integrity Programme' }),
    ).toBeVisible();
    unmount();
    render(
      <MemoryRouter initialEntries={['/projects/unknown-project']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Project not found' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Back to Portfolio' })).toBeVisible();
  });

  it('does not expose superseded Commercial Manager routes', async () => {
    render(
      <MemoryRouter initialEntries={['/execution']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  it('routes an attention project to its dedicated project workspace', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );

    const projectRow = await screen.findByRole('button', {
      name: /Compressor Station B Restoration Replacement rotor delivery/,
    });
    await user.click(projectRow);

    expect(
      await screen.findByRole('heading', { name: 'Compressor Station B Restoration' }),
    ).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('drills the Production KPI into its linked project workspace', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: /^Production / }));
    expect(
      await screen.findByRole('heading', { name: 'Compressor Station B Restoration' }),
    ).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a submission requiring attention in its full review route', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    const submissionRow = await screen.findByRole('button', {
      name: /HSE Weekly Execution Update Clarification remains unresolved/,
    });
    await user.click(submissionRow);
    expect(await screen.findByRole('heading', { name: 'Submission Review' })).toBeVisible();
    expect(screen.getByText(/HSE · Weekly Execution Update · 27 Jul–2 Aug 2026/)).toBeVisible();
  });

  it('does not expose global context or demo controls on the Dashboard', async () => {
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Portfolio Health' });
    expect(screen.queryByLabelText('Business unit')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset context')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Reporting period')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Demo scenario')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset demo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Assigned actions/ })).not.toBeInTheDocument();
  });

  it('filters projects and opens the full-page adherence and activity views', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/projects?tab=projects']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Portfolio' });
    expect(screen.queryByText('Average progress')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Search projects'), 'Compressor');
    expect(screen.getByRole('table', { name: 'Commercial project portfolio' })).toHaveTextContent(
      'Compressor Station B Restoration',
    );
    expect(screen.queryByText('Fiscal Metering Upgrade')).not.toBeInTheDocument();
    await user.click(screen.getByRole('row', { name: /Compressor Station B Restoration/ }));
    expect(
      await screen.findByRole('heading', { name: 'Compressor Station B Restoration' }),
    ).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Target and Milestone adherence' }));
    expect(screen.queryByRole('table', { name: 'KPI adherence' })).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Target adherence' })).toBeVisible();
    expect(screen.getByRole('table', { name: 'Milestone adherence' })).toBeVisible();
    expect(
      within(screen.getByRole('table', { name: 'Target adherence' })).getAllByRole('row'),
    ).toHaveLength(4);
    expect(
      within(screen.getByRole('table', { name: 'Milestone adherence' })).getAllByRole('row'),
    ).toHaveLength(4);
    await user.click(screen.getByRole('tab', { name: 'Activity log' }));
    expect(
      screen.getByText('Approved plan confirmed as the Atlas tracking baseline.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Back to Portfolio' })).toBeVisible();
  });

  it('enforces persona permissions for the executive route', () => {
    render(
      <MemoryRouter initialEntries={['/executive']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Executive workspace restricted' })).toBeVisible();
  });

  it('routes the CFO persona into the role-specific Executive workspace', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'usr_cfo');
    expect(await screen.findByRole('heading', { name: 'CFO Dashboard' })).toBeVisible();
    const navigation = screen.getByRole('navigation', { name: 'Executive navigation' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(2);
    expect(navigation).toHaveTextContent('DashboardView Updates');
    expect(screen.getByRole('heading', { name: 'Cash Flow Forecast' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'OpEx' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'CapEx' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Financial Risks' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Receivables' })).not.toBeInTheDocument();
  });

  it('keeps the CEO Dashboard focused on operational performance, risks and insights', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'usr_ceo');
    expect(await screen.findByRole('heading', { name: 'CEO Dashboard' })).toBeVisible();
    expect(screen.getByText('Business Health')).toBeVisible();
    expect(screen.getByText('Production')).toBeVisible();
    expect(screen.getByText('Budget variance')).toBeVisible();
    expect(screen.getByText('Cash runway')).toBeVisible();
    expect(screen.queryByText('Legal & Regulatory Position')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Planned vs Actual Production' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Strategic Risks' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Insights' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Critical decisions' })).not.toBeInTheDocument();
    expect(screen.queryByText(/submission queue/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Production 96,800 bopd/ }));
    expect(
      await screen.findByRole('heading', { name: 'Compressor Station B Restoration' }),
    ).toBeVisible();
  });

  it('limits CEO and CFO navigation to Dashboard and the shared View Updates workspace', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'usr_ceo');
    const navigation = await screen.findByRole('navigation', { name: 'Executive navigation' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(2);
    expect(navigation).toHaveTextContent('DashboardView Updates');
    expect(within(navigation).queryByRole('link', { name: 'Decisions' })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole('link', { name: 'Outputs' })).not.toBeInTheDocument();
    await user.click(within(navigation).getByRole('link', { name: 'View Updates' }));
    expect(await screen.findByRole('heading', { name: 'View Updates' })).toBeVisible();
  });

  it('consolidates department managers into one Manager role and two-item navigation', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    const personas = screen.getByLabelText('Active demo persona');
    expect(
      Array.from(personas.querySelectorAll('option')).map((option) => option.textContent),
    ).toEqual([
      'Chief Executive Officer',
      'Chief Financial Officer',
      'Commercial Manager',
      'Manager',
    ]);
    await user.selectOptions(personas, 'manager');
    expect(await screen.findByRole('heading', { name: 'Weekly Updates' })).toBeVisible();
    const navigation = screen.getByRole('navigation', { name: 'Manager navigation' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(2);
    expect(navigation).toHaveTextContent('Weekly UpdatesSubmissions');
    const department = screen.getByLabelText('Department workspace');
    expect(department).toHaveDisplayValue('Production');
    expect(
      Array.from(department.querySelectorAll('option')).map((option) => option.textContent),
    ).toEqual([
      'Production',
      'Subsea',
      'Engineering & Projects',
      'Commercial & Planning',
      'Finance',
      'HSE',
      'Legal & Regulatory',
    ]);
    await user.selectOptions(department, 'dept_finance');
    expect(department).toHaveDisplayValue('Finance');
    expect(screen.getByLabelText('Assigned project')).toHaveTextContent(
      'Compressor Station B Restoration',
    );
    await user.selectOptions(department, 'dept_subsea');
    expect(department).toHaveDisplayValue('Subsea');
    expect(screen.getAllByText('Tonye Amachree')[0]).toBeVisible();
    expect(screen.getByLabelText('Assigned project')).toHaveTextContent('Fiscal Metering Upgrade');
    await user.selectOptions(department, 'dept_commercial');
    expect(await screen.findByRole('heading', { name: 'Reporting' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'No access' })).not.toBeInTheDocument();
  });

  it('saves and reopens a partial Manager Weekly Update draft', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(await screen.findByLabelText('Active demo persona'), 'manager');
    await user.type(
      await screen.findByLabelText('Highlight 1'),
      'Production delivery reached 96,800 bopd.',
    );
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));
    await user.click(screen.getByRole('link', { name: 'Submissions' }));
    const draft = await screen.findByRole('row', { name: /Not submitted Draft/ });
    await user.click(draft);
    await user.click(await screen.findByRole('button', { name: 'Continue editing' }));
    expect(await screen.findByLabelText('Highlight 1')).toHaveValue(
      'Production delivery reached 96,800 bopd.',
    );
    expect(screen.getByText('Draft reopened')).toBeVisible();
  });

  it('validates and submits the exact shared Manager Weekly Update sections with a chart and attachment', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'manager');
    await user.click(await screen.findByRole('button', { name: 'Submit Update' }));
    expect(screen.getByText('Update at least one approved measure.')).toBeVisible();
    expect(screen.getByText('Add at least one highlight from last week.')).toBeVisible();
    expect(screen.getByText('Add at least one ongoing activity.')).toBeVisible();
    expect(screen.getByText('Add at least one commitment for next week.')).toBeVisible();
    expect(screen.getByText('Add a risk or record “No material risks”.')).toBeVisible();

    await user.type(
      screen.getByLabelText('Highlight 1'),
      'Production reached 96,800 bopd against 100,000 bopd plan.',
    );
    await user.type(screen.getByLabelText('Activity 1'), 'Install replacement rotor');
    await user.type(screen.getByLabelText('Risk 1'), 'Delivery float is limited to two days.');
    await user.type(screen.getByLabelText('Commitment 1'), 'Complete alignment and testing');
    await user.type(screen.getAllByLabelText(/current value/i)[0], '96800');
    await user.click(screen.getAllByRole('button', { name: 'Add chart' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'KPI performance trend' });
    await user.selectOptions(within(dialog).getByLabelText('Chart type'), 'line');
    await user.click(within(dialog).getByRole('button', { name: 'Generate Preview' }));
    expect(within(dialog).getByLabelText(/plan vs actual/i)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Keep Chart' }));

    await user.upload(
      screen.getByLabelText('Supporting documents'),
      new File(['synthetic evidence'], 'compressor-status.pdf', { type: 'application/pdf' }),
    );
    expect(screen.getByText('compressor-status.pdf')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Submit Update' }));
    expect(await screen.findByRole('heading', { name: 'Weekly Update submitted' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'View Submission' }));
    expect(await screen.findByText('compressor-status.pdf')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Generated Chart' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Edit and resubmit' }));
    expect(await screen.findByRole('button', { name: 'Resubmit Update' })).toBeVisible();
    await user.clear(screen.getByLabelText('Activity 1'));
    await user.type(
      screen.getByLabelText('Activity 1'),
      'Rotor installation and alignment are now complete.',
    );
    await user.click(screen.getByRole('button', { name: 'Resubmit Update' }));
    expect(await screen.findByRole('heading', { name: 'Weekly Update resubmitted' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'View Submission' }));
    expect(
      await screen.findByText('Rotor installation and alignment are now complete.'),
    ).toBeVisible();
  }, 10_000);

  it('starts another clean Weekly Update without resetting submitted data', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'manager');
    await user.type(screen.getByLabelText('Highlight 1'), 'Result context');
    await user.type(screen.getByLabelText('Activity 1'), 'Restore compressor');
    await user.type(screen.getByLabelText('Risk 1'), 'Rotor delay');
    await user.type(screen.getByLabelText('Commitment 1'), 'Complete commissioning');
    await user.type(screen.getAllByLabelText(/current value/i)[0], '96800');
    await user.click(screen.getByRole('button', { name: 'Submit Update' }));
    expect(await screen.findByRole('heading', { name: 'Weekly Update submitted' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Start Another Update' }));
    expect(await screen.findByRole('heading', { name: 'Weekly Updates' })).toBeVisible();
    expect(screen.getByLabelText('Highlight 1')).toHaveValue('');
    expect(screen.getAllByLabelText(/current value/i)[0]).toHaveValue(null);
  });

  it('blocks creation in a closed Manager reporting period', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'manager');
    await user.selectOptions(await screen.findByLabelText('Reporting period'), 'cycle_2026_w30');
    expect(await screen.findByRole('heading', { name: 'Reporting period closed' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Submit Update' })).not.toBeInTheDocument();
  });

  it('uses the same Weekly Update component for a Commercial Manager without changing Commercial navigation', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/reviews']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'Create my Weekly Update' }));
    expect(await screen.findByRole('heading', { name: 'Weekly Updates' })).toBeVisible();
    expect(
      screen.getByLabelText('Assigned project').querySelectorAll('option').length,
    ).toBeGreaterThan(1);
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(3);
    expect(navigation).toHaveTextContent('DashboardPortfolioReporting');
    expect(screen.getByLabelText('Highlight 1')).toBeVisible();
    expect(screen.getByLabelText('Activity 1')).toBeVisible();
    expect(screen.getByLabelText('Risk 1')).toBeVisible();
    expect(screen.getByLabelText('Commitment 1')).toBeVisible();
  });

  it('keeps a Commercial Manager draft private while listing it in My submissions', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/reviews']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'Create my Weekly Update' }));
    await user.type(
      await screen.findByLabelText('Highlight 1'),
      'Commercial close-out reached 92% this week.',
    );
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));
    await user.click(screen.getByRole('link', { name: 'Reporting' }));
    await user.click(await screen.findByRole('button', { name: 'My submissions' }));
    const table = await screen.findByRole('table', { name: 'Manager Weekly Update submissions' });
    expect(within(table).getByText('Not submitted')).toBeVisible();
    expect(within(table).getByText('Draft')).toBeVisible();
    await user.click(within(table).getByRole('row', { name: /Not submitted Draft/ }));
    expect(await screen.findByText('Commercial close-out reached 92% this week.')).toBeVisible();
    expect(
      screen.getByText('Discussion becomes available after this draft is submitted.'),
    ).toBeVisible();
  });

  it('lets a Commercial Manager view, comment on and open the project for a submitted Manager update', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/reviews']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    const submittedTable = await screen.findByRole('table', {
      name: 'Submitted Manager Weekly Updates',
    });
    await user.click(within(submittedTable).getByRole('row', { name: /Ughelli/ }));
    expect(await screen.findByRole('heading', { name: 'Comments & Responses' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open related project' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(screen.getByText('Enter a comment or response.')).toBeVisible();
    await user.type(screen.getByRole('textbox'), 'Confirm the revised access date.');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(screen.getByText('Confirm the revised access date.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Edit and resubmit' })).not.toBeInTheDocument();
  });

  it('lets CEO and CFO view and discuss the same submitted update without edit access', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    seedExecutiveUpdateSet();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'usr_ceo');
    await user.click(
      within(await screen.findByRole('navigation', { name: 'Executive navigation' })).getByRole(
        'link',
        { name: 'View Updates' },
      ),
    );
    const executiveUpdates = await screen.findByRole('table', {
      name: 'Authorised submitted Weekly Updates',
    });
    expect(within(executiveUpdates).getAllByRole('row')).toHaveLength(8);
    expect(executiveUpdates).toHaveTextContent('Tunde Adebayo');
    expect(executiveUpdates).toHaveTextContent('Chinedu Nwosu');
    expect(executiveUpdates).not.toHaveTextContent('Private draft highlight');
    await user.type(screen.getByLabelText('Search updates'), 'Ughelli');
    expect(within(executiveUpdates).getAllByRole('row')).toHaveLength(4);
    await user.clear(screen.getByLabelText('Search updates'));
    const viewActions = within(executiveUpdates).getAllByRole('button', { name: 'View update' });
    expect(viewActions).toHaveLength(7);
    await user.click(viewActions[0]);
    expect(await screen.findByText('Commercial_Performance_W31.xlsx')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Generated Chart' })).toBeVisible();
    expect(await screen.findByLabelText('Add a comment')).toBeVisible();
    await user.type(screen.getByLabelText('Add a comment'), 'CEO: confirm intervention owner.');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(screen.getByText('CEO: confirm intervention owner.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /resubmit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete submission' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to View Updates' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open related project' })).toBeVisible();

    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'usr_cfo');
    await user.click(
      within(await screen.findByRole('navigation', { name: 'Executive navigation' })).getByRole(
        'link',
        { name: 'View Updates' },
      ),
    );
    const cfoUpdates = await screen.findByRole('table', {
      name: 'Authorised submitted Weekly Updates',
    });
    await user.click(within(cfoUpdates).getAllByRole('button', { name: 'View update' })[0]);
    expect(await screen.findByText('CEO: confirm intervention owner.')).toBeVisible();
    await user.type(screen.getByLabelText('Add a comment'), 'CFO: confirm the cash impact.');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(screen.getByText('CFO: confirm the cash impact.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /resubmit/i })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'usr_commercial');
    await user.click(screen.getByRole('link', { name: 'Reporting' }));
    await user.click(await screen.findByRole('button', { name: 'My submissions' }));
    const managerHistory = await screen.findByRole('table', {
      name: 'Manager Weekly Update submissions',
    });
    await user.click(within(managerHistory).getByRole('row', { name: /Compressor/ }));
    expect(await screen.findByText('CEO: confirm intervention owner.')).toBeVisible();
    expect(screen.getByText('CFO: confirm the cash impact.')).toBeVisible();
    await user.type(
      screen.getByLabelText('Add a response'),
      'Commercial Manager: cash impact is included in the revised forecast.',
    );
    await user.click(screen.getByRole('button', { name: 'Post response' }));
    expect(
      screen.getByText('Commercial Manager: cash impact is included in the revised forecast.'),
    ).toBeVisible();
  });

  it('restores the Executive persona for direct update-detail refreshes and handles invalid IDs', async () => {
    seedConfirmedPlan();
    seedExecutiveUpdateSet();
    window.localStorage.setItem(activePersonaStorageKey, 'usr_ceo');
    const { unmount } = render(
      <MemoryRouter
        initialEntries={['/executive/view-updates/manager_update_commercial_compressor_w31']}
      >
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Commercial_Performance_W31.xlsx')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Back to View Updates' })).toBeVisible();
    unmount();
    const privateView = render(
      <MemoryRouter
        initialEntries={['/executive/view-updates/manager_update_operations_wellwork_w31_draft']}
      >
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Submission unavailable' })).toBeVisible();
    expect(
      screen.queryByText('Commercial delivery reached 93% against the approved weekly plan.'),
    ).not.toBeInTheDocument();
    privateView.unmount();
    render(
      <MemoryRouter initialEntries={['/executive/view-updates/not-a-submission']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Submission not found' })).toBeVisible();
  });

  it('shows a clear Executive empty state when no submitted updates are authorised', async () => {
    seedConfirmedPlan();
    window.localStorage.setItem(activePersonaStorageKey, 'usr_cfo');
    window.localStorage.setItem(
      managerUpdatesStorageKey,
      JSON.stringify(createEmptyManagerUpdatesState()),
    );
    render(
      <MemoryRouter initialEntries={['/executive/view-updates']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: 'No submitted Weekly Updates' }),
    ).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('keeps deadline-locked content read only while allowing the Manager to respond', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'manager');
    await user.selectOptions(screen.getByLabelText('Department workspace'), 'dept_projects');
    await user.click(screen.getByRole('link', { name: 'Submissions' }));
    const history = await screen.findByRole('table', { name: 'Manager Weekly Update submissions' });
    await user.click(within(history).getByRole('row', { name: /Ughelli/ }));
    expect(
      await screen.findByText('This submission is view only, but its discussion remains open.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /resubmit/i })).not.toBeInTheDocument();
    await user.type(
      screen.getByLabelText('Add a response'),
      'Access meeting is confirmed for Friday.',
    );
    await user.click(screen.getByRole('button', { name: 'Post response' }));
    expect(screen.getByText('Access meeting is confirmed for Friday.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Delete submission' }));
    const deletion = screen.getByRole('dialog', { name: 'Delete submitted Weekly Update?' });
    await user.click(within(deletion).getByRole('button', { name: 'Delete submission' }));
    expect(await screen.findByRole('heading', { name: 'No Weekly Updates yet' })).toBeVisible();
  });

  it('distinguishes unknown submissions from permission failures and never exposes another Manager draft', async () => {
    seedPrivateManagerDraft();
    const { unmount } = render(
      <MemoryRouter initialEntries={['/reviews/weekly-updates/private_manager_draft']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Submission unavailable' })).toBeVisible();
    expect(screen.queryByText('Private draft highlight.')).not.toBeInTheDocument();
    unmount();
    render(
      <MemoryRouter initialEntries={['/reviews/weekly-updates/not-a-submission']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Submission not found' })).toBeVisible();
  });

  it('renders Reporting with exactly the Submissions and Reports tabs', async () => {
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/reviews']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Reporting' })).toBeVisible();
    const tabs = screen.getByRole('tablist', { name: 'Reporting workspace' });
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Submissions', 'Reports']);
    expect(screen.getByRole('progressbar', { name: 'Submission completeness' })).toBeVisible();
    expect(screen.getByRole('table', { name: 'Submissions needing review' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Follow Up Required' })).toBeVisible();
  });

  it('sends one persistent prototype reminder and prevents a repeated send', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/reviews']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    const sendButtons = await screen.findAllByRole('button', { name: 'Send reminder' });
    await user.click(sendButtons[0]);
    const sentButton = screen.getByRole('button', { name: 'Reminder sent' });
    expect(sentButton).toBeDisabled();
    await user.click(screen.getByRole('tab', { name: 'Reports' }));
    await user.click(screen.getByRole('tab', { name: 'Submissions' }));
    expect(screen.getByRole('button', { name: 'Reminder sent' })).toBeDisabled();
  });

  it('generates previews for all three Commercial report types', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/reviews?tab=reports']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    for (const name of ['Performance Report', 'Executive Summary', 'Project Progress Report']) {
      await user.click(await screen.findByRole('radio', { name: new RegExp(name) }));
      await user.click(screen.getByRole('button', { name: 'Generate report' }));
      expect(await screen.findByRole('heading', { name }, { timeout: 2500 })).toBeVisible();
    }
  });

  it('adds and retains a review comment and links a submission to its project', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/reviews/rpt_ops_w30']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Submission Review' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open related project' })).toBeVisible();
    await user.type(screen.getByLabelText('Add a comment'), 'Confirm rotor evidence before close.');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(screen.getByText('Confirm rotor evidence before close.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Back to Reporting' }));
    expect(await screen.findByRole('heading', { name: 'Reporting' })).toBeVisible();
  });

  it('prevents a Manager from accessing Commercial Reporting', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    render(
      <MemoryRouter initialEntries={['/reviews']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'manager');
    expect(await screen.findByRole('heading', { name: 'Weekly Updates' })).toBeVisible();
  });
});
