import { describe, expect, it } from 'vitest';
import {
  createInitialManagerUpdatesState,
  managerUpdatesReducer,
  type ManagerWeeklyUpdate,
} from '../state/managerUpdates';
import {
  getApprovedPlanFixtureFile,
  initialPlanState,
  planReducer,
  type ConfirmedPlanBaseline,
} from '../state/plan';
import { selectExecutiveDashboard } from './executiveDashboard';

function confirmedPlan(): ConfirmedPlanBaseline {
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
  return state.confirmedPlan!;
}

describe('Executive dashboard selector', () => {
  it('requires the confirmed approved-plan baseline', () => {
    expect(
      selectExecutiveDashboard(null, createInitialManagerUpdatesState(), 'cycle_2026_w31'),
    ).toBeNull();
  });

  it('derives the required CEO and CFO sections from one current-period model', () => {
    const dashboard = selectExecutiveDashboard(
      confirmedPlan(),
      createInitialManagerUpdatesState(),
      'cycle_2026_w31',
    )!;

    expect(dashboard.ceo.metrics.map((metric) => metric.label)).toEqual([
      'Production Performance',
      'Cash Flow',
      'HSE Performance',
      'Legal & Regulatory Position',
    ]);
    expect(dashboard.cfo.metrics.map((metric) => metric.label)).toEqual([
      'Cash Position',
      'Approved vs Committed',
      'Cost Recovery',
      'Revenue Impacting Production Variance',
    ]);
    expect(dashboard.ceo.productionTrend.at(-1)).toEqual(
      expect.objectContaining({ planned: 120_000, actual: 96_800, variance: -23_200 }),
    );
    expect(dashboard.cfo.spend.map((position) => position.category)).toEqual(['opex', 'capex']);
    expect(dashboard.cfo.cashFlowForecast.at(-1)).toEqual(
      expect.objectContaining({
        forecastInflows: 41_000_000,
        forecastOutflows: 49_500_000,
        netCashPosition: -8_500_000,
      }),
    );
  });

  it('links a strategic risk to its current submitted update when one exists', () => {
    const update: ManagerWeeklyUpdate = {
      id: 'manager_update_operations_compressor_w31',
      creatorId: 'usr_operations',
      departmentId: 'dept_operations',
      projectId: 'prj_compressor',
      reportingPeriodId: 'cycle_2026_w31',
      reportingDeadline: '2026-08-04',
      sections: {
        highlights: 'Compressor recovery remains behind plan.',
        ongoingActivities: 'Rotor logistics are in progress.',
        risks: 'Rotor delay may extend production deferment.',
        plansForWeek: 'Receive and install the replacement rotor.',
      },
      chart: null,
      attachments: [],
      status: 'submitted',
      savedAt: '2026-08-03T10:00:00+01:00',
      submittedAt: '2026-08-03T10:00:00+01:00',
      visibleToRoles: ['commercial_manager', 'ceo', 'cfo'],
      comments: [],
    };
    const updates = managerUpdatesReducer(createInitialManagerUpdatesState(), {
      type: 'UPSERT_UPDATE',
      update,
    });
    const dashboard = selectExecutiveDashboard(confirmedPlan(), updates, 'cycle_2026_w31')!;
    expect(dashboard.ceo.strategicRisks[0]).toEqual(
      expect.objectContaining({
        id: 'risk_compressor_delay',
        destination: '/executive/view-updates/manager_update_operations_compressor_w31',
      }),
    );
  });

  it('uses the latest validated metric when the selected period has no direct KPI record', () => {
    const dashboard = selectExecutiveDashboard(
      confirmedPlan(),
      createInitialManagerUpdatesState(),
      'cycle_2026_w30',
    )!;
    expect(dashboard.ceo.metrics).toHaveLength(4);
    expect(dashboard.ceo.metrics.every((metric) => metric.available)).toBe(true);
    expect(dashboard.ceo.productionTrend.length).toBeGreaterThan(0);
    expect(dashboard.cfo.metrics).toHaveLength(4);
    expect(dashboard.cfo.metrics.every((metric) => metric.available)).toBe(true);
    expect(dashboard.ceo.metrics.some((metric) => metric.value === 'Unavailable')).toBe(false);
    expect(dashboard.cfo.metrics.some((metric) => metric.value === 'Unavailable')).toBe(false);
  });
});
