import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { AtlasProvider } from './state/AtlasContext';

afterEach(cleanup);

describe('route architecture', () => {
  it('renders Business Overview with the Phase 1 Commercial navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Business Overview' }, { timeout: 5000 }),
    ).toBeVisible();
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(navigation).toBeVisible();
    expect(navigation).toHaveTextContent(
      'Business OverviewExecutionProjectsReviewsDecisionsOutputs',
    );
    expect(screen.getByText('Business Health')).toBeVisible();
    expect(screen.getByText('73%')).toBeVisible();
    expect(screen.getByText('4 of 4 objectives need attention')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('navigation', { name: 'Configuration navigation' })).toHaveTextContent(
      'KPI LibraryReporting TemplatesSettings',
    );
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

  it('routes the Commercial project breakdown action to Projects', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Project breakdown' }));

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeVisible();
  });

  it('preserves recommendation authoring under Decision Support terminology', async () => {
    render(
      <MemoryRouter initialEntries={['/recommendations']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Decision Support' })).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Write a Commercial Recommended Action' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add Recommended Action' })).toBeDisabled();
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
      await screen.findByRole('heading', { name: 'Submit Weekly Execution Update' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Department')).toHaveValue('Finance');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('Available liquidity')).toHaveValue('42500000');
  });
});
