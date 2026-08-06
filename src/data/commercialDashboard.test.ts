import { describe, expect, it } from 'vitest';
import { createInitialWorkflowState } from '../state/workflow';
import {
  getApprovedPlanFixtureFile,
  initialPlanState,
  planReducer,
  type ConfirmedPlanBaseline,
} from '../state/plan';
import { selectCommercialDashboard } from './commercialDashboard';

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

describe('Commercial Dashboard selectors', () => {
  it('requires the shared confirmed-plan baseline', () => {
    expect(
      selectCommercialDashboard(null, createInitialWorkflowState(), 'cycle_2026_w31'),
    ).toBeNull();
  });

  it('derives portfolio health and the four required KPI areas consistently', () => {
    const result = selectCommercialDashboard(
      confirmedPlan(),
      createInitialWorkflowState(),
      'cycle_2026_w31',
    )!;
    expect(result.portfolioHealth).toEqual({
      status: 'critical',
      score: 73,
      breakdown: { on_track: 2, at_risk: 1, critical: 1 },
    });
    expect(result.kpis.map((metric) => metric.title)).toEqual([
      'Production capacity',
      'Cash-flow position',
      'HSE',
      'Legal',
    ]);
    expect(result.kpis[0].context).toContain('120,000 bopd plan');
    expect(result.attention).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: '/projects/prj_compressor' }),
        expect.objectContaining({ destination: '/reviews/rpt_hse_w31' }),
      ]),
    );
  });

  it('keeps priority order deterministic and handles limited reporting', () => {
    const workflow = createInitialWorkflowState();
    const first = selectCommercialDashboard(confirmedPlan(), workflow, 'cycle_2026_w31')!;
    const second = selectCommercialDashboard(confirmedPlan(), workflow, 'cycle_2026_w31')!;
    expect(first.priorities.map((priority) => priority.id)).toEqual(
      second.priorities.map((priority) => priority.id),
    );
    const limited = selectCommercialDashboard(
      confirmedPlan(),
      workflow,
      'cycle_2026_w31',
      'empty',
    )!;
    expect(limited.reportingCoverage.limited).toBe(true);
    expect(limited.attention.some((item) => item.id.startsWith('submission_'))).toBe(false);
    expect(limited.projects).toHaveLength(4);
  });

  it('provides planned and actual values for every delivery-trend week', () => {
    const result = selectCommercialDashboard(
      confirmedPlan(),
      createInitialWorkflowState(),
      'cycle_2026_w31',
    )!;
    expect(result.trend).toHaveLength(6);
    expect(result.trend.every((point) => Number.isFinite(point.plannedDeliveryPercent))).toBe(true);
    expect(result.trend.every((point) => Number.isFinite(point.actualDeliveryPercent))).toBe(true);
    expect(result.trend.at(-1)?.currentReportingWeek).toBe(true);
  });
});
