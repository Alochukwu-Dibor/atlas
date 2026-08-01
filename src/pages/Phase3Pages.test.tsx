import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/Ui';
import { AtlasProvider } from '../state/AtlasContext';
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

  it('enforces assignment requirements and displays the linked decision', async () => {
    const user = userEvent.setup();
    renderPage(<ExecutiveDashboard />);
    const recommendation = screen
      .getByRole('heading', { name: 'Approve urgent export-line integrity expenditure' })
      .closest('article')!;
    await user.click(within(recommendation).getByRole('button', { name: 'Review action' }));
    await user.selectOptions(screen.getByLabelText('Decision action'), 'assign_action');
    await user.type(screen.getByLabelText('Decision rationale'), 'Complete the integrity review.');
    const record = screen.getByRole('button', { name: 'Record Decision' });
    expect(record).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Assignment owner'), 'usr_operations');
    await user.type(screen.getByLabelText('Assignment due date'), '2026-08-06');
    expect(record).toBeEnabled();
    await user.click(record);
    expect(within(recommendation).getByText(/Complete the integrity review/)).toBeVisible();
    expect(within(recommendation).getByText(/Ifeanyi Eze/)).toBeVisible();
  });
});
