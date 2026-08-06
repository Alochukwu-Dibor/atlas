import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { AtlasProvider } from './state/AtlasContext';
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
    expect(navigation).toHaveTextContent('DashboardPlanProjectsReporting');
    expect(within(navigation).getAllByRole('link')).toHaveLength(4);
    expect(within(navigation).queryByRole('link', { name: 'Execution' })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole('link', { name: 'Decisions' })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole('link', { name: 'Outputs' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Portfolio Health' })).toBeVisible();
    expect(screen.queryByText('Business Health')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Current performance' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Production capacity/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Cash-flow position/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^HSE TRIR/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Legal 86%/ })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'What Needs My Attention' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Today’s Priorities' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Plan Delivery Trend' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
    expect(
      screen.queryByRole('navigation', { name: 'Configuration navigation' }),
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
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeVisible();
    expect(screen.getByRole('table', { name: 'Commercial project portfolio' })).toBeVisible();
  });

  it('renders the linked Execution workspace on its canonical route', async () => {
    render(
      <MemoryRouter initialEntries={['/execution']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Execution' })).toBeVisible();
    expect(screen.getByRole('table', { name: 'Strategic objective delivery' })).toBeVisible();
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

    const projectRow = await screen.findByRole('row', {
      name: /Compressor Station B Restoration/,
    });
    await user.click(projectRow);

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Compressor Station B Restoration' })).toBeVisible();
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
    await user.click(await screen.findByRole('button', { name: /Production capacity/ }));
    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Compressor Station B Restoration' })).toBeVisible();
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
    const submissionRow = await screen.findByRole('row', {
      name: /HSE Weekly Execution Update Clarification remains unresolved/,
    });
    await user.click(submissionRow);
    expect(await screen.findByRole('heading', { name: 'Update Review' })).toBeVisible();
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

  it('uses contextual tabs for objective delivery details', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/execution']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    const objectiveRow = await screen.findByRole('row', {
      name: /Restore and sustain planned production/,
    });
    await user.click(objectiveRow);
    const drawer = screen.getByRole('dialog', {
      name: 'Restore and sustain planned production',
    });
    expect(within(drawer).getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(drawer).queryByRole('table', { name: 'Objective KPIs' })).not.toBeInTheDocument();
    await user.click(within(drawer).getByRole('tab', { name: 'KPIs' }));
    expect(within(drawer).getByRole('table', { name: 'Objective KPIs' })).toBeVisible();
  });

  it('filters projects and progressively reveals project evidence', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Projects' });
    expect(screen.queryByText('Average progress')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Search projects'), 'Compressor');
    expect(screen.getByRole('table', { name: 'Commercial project portfolio' })).toHaveTextContent(
      'Compressor Station B Restoration',
    );
    expect(screen.queryByText('Fiscal Metering Upgrade')).not.toBeInTheDocument();
    await user.click(screen.getByRole('row', { name: /Compressor Station B Restoration/ }));
    const drawer = screen.getByRole('dialog', { name: 'Compressor Station B Restoration' });
    expect(
      within(drawer).queryByText('Operations weekly production fixture'),
    ).not.toBeInTheDocument();
    await user.click(within(drawer).getByRole('tab', { name: 'Evidence' }));
    expect(within(drawer).getByText('Operations weekly production fixture')).toBeVisible();
  });

  it('opens decision details with contextual summary, context, history and evidence tabs', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/decisions']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.click(
      await screen.findByRole('row', {
        name: /Compressor restoration is behind the approved plan/,
      }),
    );
    const drawer = screen.getByRole('dialog', {
      name: 'Compressor restoration is behind the approved plan',
    });
    expect(within(drawer).getByText('Proceed with expedited logistics.')).toBeVisible();
    await user.click(within(drawer).getByRole('tab', { name: 'Context' }));
    expect(within(drawer).getByText(/main driver of the production shortfall/)).toBeVisible();
    expect(within(drawer).getByRole('tab', { name: 'History' })).toBeVisible();
    expect(within(drawer).getByRole('tab', { name: 'Evidence' })).toBeVisible();
    expect(within(drawer).getByRole('tab', { name: 'Comments' })).toBeVisible();
  });

  it('exposes meeting governance context through its related decision', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/decisions']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.click(
      await screen.findByRole('row', {
        name: /Urgent integrity expenditure requires approval/,
      }),
    );
    const drawer = screen.getByRole('dialog', {
      name: 'Urgent integrity expenditure requires approval',
    });
    await user.click(within(drawer).getByRole('tab', { name: 'Context' }));
    expect(within(drawer).getByText('Commercial Review')).toBeVisible();
    expect(within(drawer).getByText(/1 linked commitment/)).toBeVisible();
  });

  it('preserves recommendation authoring inside Decisions and redirects the legacy route', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/recommendations']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Decisions' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Draft recommended action' }));
    const drawer = screen.getByRole('dialog', { name: 'Recommended actions' });
    expect(
      within(drawer).getByRole('heading', { name: 'Write a Commercial Recommended Action' }),
    ).toBeVisible();
    expect(within(drawer).getByRole('button', { name: 'Add Recommended Action' })).toBeDisabled();
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
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'usr_cfo');
    expect(await screen.findByRole('heading', { name: 'CFO View' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Executive navigation' })).toHaveTextContent(
      'CEO ViewCFO ViewDecisionsOutputs',
    );
    expect(screen.getByRole('heading', { name: 'Cash-flow forecast' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Historical financial variance' })).toBeVisible();
  });

  it('keeps the CEO View focused on delivery, risk and intervention', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'usr_ceo');
    expect(await screen.findByRole('heading', { name: 'CEO View' })).toBeVisible();
    expect(screen.getByText('Business-plan delivery')).toBeVisible();
    expect(screen.getByText('Budget position')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Strategic risks' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Critical decisions' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Executive summary' })).toBeVisible();
    expect(screen.queryByText(/submission queue/i)).not.toBeInTheDocument();
  });

  it('groups Outputs and blocks generation until inputs are validated', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/outputs']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Outputs' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Management' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Executive and Governance' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Regulatory' })).toBeVisible();
    const blockedRow = screen.getByRole('row', { name: /Weekly Management Pack/ });
    expect(within(blockedRow).getByRole('button', { name: 'Generate' })).toBeDisabled();
    const readyRow = screen.getByRole('row', { name: /Monthly Business Performance Report/ });
    await user.click(within(readyRow).getByRole('button', { name: 'Generate' }));
    expect(readyRow).toHaveTextContent('Generated now');
  });

  it('reveals KPI definitions and thresholds contextually', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/kpi-library']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'Gross oil production' }));
    const drawer = screen.getByRole('dialog', { name: 'Gross oil production' });
    expect(within(drawer).getByText('Sum of daily field production')).toBeVisible();
    await user.click(within(drawer).getByRole('tab', { name: 'Thresholds and target' }));
    expect(within(drawer).getByText('>= 95% of plan')).toBeVisible();
  });

  it('uses one shared Weekly Execution Update structure with department-specific fields', async () => {
    render(
      <MemoryRouter initialEntries={['/reporting-templates']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Shared Weekly Execution Update structure' }),
    ).toBeVisible();
    expect(screen.getByText('Executive highlight')).toBeVisible();
    expect(
      screen.getByRole('table', { name: 'Department-specific reporting templates' }),
    ).toHaveTextContent('Community Relations');
  });

  it('exposes Users and Roles as commercial configuration', async () => {
    render(
      <MemoryRouter initialEntries={['/users-roles']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Users and Roles' })).toBeVisible();
    expect(screen.getByRole('table', { name: 'Users and role access' })).toBeVisible();
  });

  it('lets a Department Manager choose any department and loads matching structured fields', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/department']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'usr_operations');
    expect(await screen.findByRole('heading', { name: 'My Updates' })).toBeVisible();
    const department = screen.getByLabelText('Department workspace');
    expect(department).toHaveDisplayValue('Operations');
    expect(department.querySelectorAll('option')).toHaveLength(8);
    await user.selectOptions(department, 'dept_finance');
    await user.click(screen.getByRole('link', { name: 'Submit Update' }));
    expect(
      await screen.findByRole('heading', { name: 'Step 1 of 3 — Context & methods' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Department')).toHaveValue('Finance');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('Available liquidity')).toHaveValue('42500000');
  });

  it('keeps Contributor navigation limited to Submit Update and My Updates', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'usr_operations');
    const navigation = await screen.findByRole('navigation', { name: 'Contributor navigation' });
    expect(navigation).toHaveTextContent('Submit UpdateMy Updates');
    expect(navigation.querySelectorAll('a')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'Projects' })).not.toBeInTheDocument();
  });

  it('renders the table-led Commercial Reviews workspace with all required filters', async () => {
    render(
      <MemoryRouter initialEntries={['/reviews']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Reviews' })).toBeVisible();
    expect(screen.getByLabelText('Reporting period filter')).toBeVisible();
    expect(screen.getByLabelText('Business unit or project filter')).toBeVisible();
    expect(screen.getByLabelText('Review status filter')).toBeVisible();
    const table = screen.getByRole('table', { name: 'Weekly Execution Update review queue' });
    expect(table).toHaveTextContent('Department');
    expect(table).toHaveTextContent('Material change');
    expect(table).toHaveTextContent('Action');
  });

  it('denies a Contributor access to Commercial Reviews', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/reviews']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'usr_operations');
    expect(await screen.findByRole('heading', { name: 'My Updates' })).toBeVisible();
  });
});
