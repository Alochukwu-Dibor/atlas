import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { AtlasProvider } from './state/AtlasContext';

afterEach(cleanup);

describe('route architecture', () => {
  it('renders the Commercial dashboard in the shared sidebar shell', async () => {
    render(
      <MemoryRouter initialEntries={['/commercial']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Commercial overview' }, { timeout: 5000 }),
    ).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    expect(screen.getByText('Portfolio Health')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Average progress: 68%' })).toBeVisible();
    expect(screen.getByText('Plan 75% · 2 of 4 projects need attention')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: 'Recommendations' })).toHaveAttribute(
      'href',
      '/recommendations',
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

  it('renders the prominent Commercial recommendation composer', async () => {
    render(
      <MemoryRouter initialEntries={['/recommendations']}>
        <AtlasProvider>
          <App />
        </AtlasProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Recommendations' })).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Write a Commercial recommendation' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add recommendation' })).toBeDisabled();
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
    expect(await screen.findByRole('heading', { name: 'Weekly reporting' })).toBeVisible();
    const department = screen.getByLabelText('Department workspace');
    expect(department).toHaveDisplayValue('Operations');
    expect(department.querySelectorAll('option')).toHaveLength(8);
    await user.selectOptions(department, 'dept_finance');
    await user.click(screen.getByRole('link', { name: 'New Report' }));
    expect(await screen.findByRole('heading', { name: 'Create weekly report' })).toBeVisible();
    expect(screen.getByLabelText('Department')).toHaveValue('Finance');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('Available liquidity')).toHaveValue('42500000');
  });
});
