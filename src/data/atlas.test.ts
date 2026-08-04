import { describe, expect, it } from 'vitest';
import {
  atlas,
  format,
  getBusinessPlan,
  getBusinessPlanDelivery,
  getDepartmentReports,
  getExecutiveMetrics,
  getLiquidity,
  getProductionKpis,
  getProductionScope,
  getReadiness,
  getSourceReference,
  hasCompleteTraceability,
  phase1Domain,
  toneForStatus,
} from './atlas';

describe('Atlas data selectors', () => {
  it('derives canonical production values from the shared fixture', () => {
    expect(getProductionKpis()).toEqual({
      actual: 96800,
      plan: 120000,
      variance: -23200,
      variancePercent: -19.3,
      status: 'at_risk',
    });
  });

  it('keeps Commercial readiness tied to the reporting fixture', () => {
    expect(getReadiness()).toEqual({
      approvedReports: 6,
      requiredReports: 8,
      reportingReadinessPercent: 82,
    });
  });

  it('returns only reports owned by a department manager', () => {
    const reports = getDepartmentReports('usr_operations');
    expect(reports.map((report) => report.id)).toEqual(['rpt_ops_w30', 'rpt_ops_w31']);
  });

  it('retains evidence references for material values', () => {
    expect(getSourceReference('production.kpis.grossOilActualBopd')?.sourceId).toBe('src_ops_xlsx');
    expect(atlas.meta.synthetic).toBe(true);
  });

  it('formats figures and maps status semantics consistently', () => {
    expect(format.usd(42_500_000)).toBe('$42.5m');
    expect(toneForStatus('overdue')).toBe('critical');
    expect(toneForStatus('needs_clarification')).toBe('warning');
  });

  it('reconciles gross production and working-interest calculations', () => {
    const gross = getProductionScope();
    const workingInterest = getProductionScope('asset_oml30', 'working_interest');
    expect(gross.actual).toBe(getProductionKpis().actual);
    expect(gross.plan).toBe(getProductionKpis().plan);
    expect(workingInterest.actual).toBe(43_560);
    expect(workingInterest.actual).toBe(Math.round(gross.actual * 0.45));
  });

  it('derives liquidity and repeated executive metrics from shared selectors', () => {
    const liquidity = getLiquidity();
    expect(liquidity.availableLiquidityUsd).toBe(
      liquidity.unrestrictedCashUsd + liquidity.restrictedCashUsd + liquidity.undrawnFacilitiesUsd,
    );
    expect(getExecutiveMetrics().production.actual).toBe(getProductionKpis().actual);
    expect(getExecutiveMetrics().liquidity.availableLiquidityUsd).toBe(
      atlas.finance.kpis.availableLiquidityUsd,
    );
    expect(getExecutiveMetrics().hse.trir).toBe(atlas.executiveSummary.hse.trir);
    expect(getExecutiveMetrics().legal.estimatedExposureUsd).toBe(
      atlas.executiveSummary.legal.estimatedExposureUsd,
    );
  });

  it('links the approved business plan to objectives, KPIs, budgets and execution records', () => {
    const plan = getBusinessPlan('bu_oml30', 'period_2026');
    expect(plan?.status).toBe('approved');
    expect(plan?.strategicThemeIds).toHaveLength(4);
    expect(getBusinessPlanDelivery('bu_oml30').objectives).toHaveLength(4);
    expect(phase1Domain.kpiDefinitions).toHaveLength(7);
    expect(phase1Domain.approvedBudgets[0].budgetLineIds).toHaveLength(4);
    expect(phase1Domain.outputs).toHaveLength(4);
    expect(phase1Domain.kpiTargets.find((target) => target.id === 'target_trir')).toMatchObject({
      approvedBaseline: atlas.hse.kpis.trirTarget,
      actual: atlas.hse.kpis.trir,
    });
  });

  it('preserves baselines and supports traceable updates without a project', () => {
    const production = phase1Domain.kpiTargets.find(
      (target) => target.id === 'target_gross_production',
    );
    expect(production).toMatchObject({
      approvedBaseline: 120000,
      actual: 96800,
      currentForecast: 104000,
      priorForecast: 110000,
    });
    const businessUnitUpdate = phase1Domain.weeklyExecutionUpdates.find(
      (update) => update.id === 'update_commercial_w31',
    );
    expect(businessUnitUpdate?.projectId).toBeNull();
    expect(hasCompleteTraceability(businessUnitUpdate ?? {})).toBe(true);
  });
});
