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
      <MemoryRouter initialEntries={['/projects']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeVisible();
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
      await screen.findByRole('heading', { name: 'Confirm an approved plan to activate Projects' }),
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
    expect(screen.getByRole('button', { name: 'Back to Projects' })).toBeVisible();
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

    const projectRow = await screen.findByRole('row', {
      name: /Compressor Station B Restoration/,
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
    await user.click(await screen.findByRole('button', { name: /Production capacity/ }));
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
    const submissionRow = await screen.findByRole('row', {
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
    expect(
      await screen.findByRole('heading', { name: 'Compressor Station B Restoration' }),
    ).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'KPI, target and milestone adherence' }));
    expect(screen.getByRole('table', { name: 'KPI adherence' })).toBeVisible();
    expect(screen.getByRole('table', { name: 'Target adherence' })).toBeVisible();
    expect(screen.getByRole('table', { name: 'Milestone adherence' })).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Activity log' }));
    expect(
      screen.getByText('Approved plan confirmed as the Atlas tracking baseline.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Back to Projects' })).toBeVisible();
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

  it('preserves shared Decisions and Outputs for the Executive workspace', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    await user.selectOptions(screen.getByLabelText('Active demo persona'), 'usr_ceo');
    const navigation = await screen.findByRole('navigation', { name: 'Executive navigation' });
    await user.click(within(navigation).getByRole('link', { name: 'Decisions' }));
    expect(await screen.findByRole('heading', { name: 'Decisions' })).toBeVisible();
    await user.click(within(navigation).getByRole('link', { name: 'Outputs' }));
    expect(await screen.findByRole('heading', { name: 'Outputs' })).toBeVisible();
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
