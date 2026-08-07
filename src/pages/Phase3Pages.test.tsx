import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/Ui';
import { AtlasProvider } from '../state/AtlasContext';
import {
  getApprovedPlanFixtureFile,
  initialPlanState,
  planReducer,
  planStorageKey,
} from '../state/plan';
import { ExecutiveDashboard } from './ExecutivePages';
import { ProductionPage } from './ModulePages';

function renderPage(page: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AtlasProvider>
        <ToastProvider>{page}</ToastProvider>
      </AtlasProvider>
    </MemoryRouter>,
  );
}

function seedConfirmedPlan() {
  let state = planReducer(initialPlanState(), {
    type: 'SELECT_FILE',
    file: getApprovedPlanFixtureFile(),
  });
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

describe('Phase 3 dashboards', () => {
  it('updates production KPIs and chart data from the field and period controls', async () => {
    const user = userEvent.setup();
    renderPage(<ProductionPage />);
    const grossCard = screen.getByRole('button', { name: /Gross OML 30 oil/ });
    expect(grossCard).toHaveTextContent('96,800');
    await user.selectOptions(screen.getByLabelText('Production asset or field'), 'field_eriemu');
    expect(grossCard).toHaveTextContent('14,900');
    await user.selectOptions(screen.getByLabelText('Production asset or field'), 'asset_oml30');
    await user.click(screen.getByRole('button', { name: 'Monthly' }));
    await user.click(screen.getByRole('button', { name: 'View data table' }));
    expect(
      screen.getByRole('table', { name: 'Planned versus actual production data' }),
    ).toHaveTextContent('2026-01');
  });

  it('opens a meaningful metric drawer and exposes export disclosure', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    renderPage(<ProductionPage />);
    expect(screen.getByText(/All operational, financial, HSE and legal data/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(print).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: /Gross OML 30 oil/ }));
    const drawer = screen.getByRole('dialog', { name: 'Gross oil production' });
    expect(
      within(drawer).getByText('Operations approved report · Daily Production fixture'),
    ).toBeVisible();
  });

  it('renders the current-period CEO production evidence and accessible data table', async () => {
    const user = userEvent.setup();
    seedConfirmedPlan();
    renderPage(<ExecutiveDashboard />);
    expect(screen.getByText('96,800 bopd')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'View data table' }));
    expect(
      screen.getByRole('table', {
        name: 'Planned production, actual production and variance data',
      }),
    ).toHaveTextContent('120,000 bopd');
  });
});
