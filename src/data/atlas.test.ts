import { describe, expect, it } from 'vitest';
import {
  atlas,
  format,
  getDepartmentReports,
  getExecutiveMetrics,
  getLiquidity,
  getProductionKpis,
  getProductionScope,
  getReadiness,
  getSourceReference,
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
});
