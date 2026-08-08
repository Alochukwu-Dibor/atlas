import { atlas, format, getCycle, phase1Domain } from './atlas';
import type { ConfirmedPlanBaseline, PlanTarget } from '../state/plan';
import type { ManagerUpdatesState } from '../state/managerUpdates';

export interface ExecutiveMetric {
  id: string;
  label: string;
  value: string;
  status: string;
  comparison: string;
  reportingPeriod: string;
  destination?: string;
  available: boolean;
}

export interface ExecutiveRiskRow {
  id: string;
  risk: string;
  impact: string;
  exposure: string;
  mitigation: string;
  status: string;
  destination?: string;
}

export interface ExecutiveInsight {
  id: string;
  title: string;
  detail: string;
  impact: string;
  status: string;
  destination?: string;
}

function confirmedTarget(plan: ConfirmedPlanBaseline, kpiId: string): PlanTarget | undefined {
  return plan.projects
    .flatMap((project) => project.targets)
    .find((target) => target.kpiId === kpiId);
}

function reportedTarget(kpiId: string, cycleId: string) {
  return (
    phase1Domain.kpiTargets.find(
      (target) => target.kpiId === kpiId && target.reportingPeriodId === cycleId,
    ) ?? phase1Domain.kpiTargets.find((target) => target.kpiId === kpiId)
  );
}

function currentSubmittedUpdates(managerUpdates: ManagerUpdatesState, cycleId: string) {
  return managerUpdates.updates
    .filter((update) => update.status === 'submitted' && update.reportingPeriodId === cycleId)
    .sort((left, right) => (right.submittedAt ?? '').localeCompare(left.submittedAt ?? ''));
}

function updateDestination(updateId: string) {
  return `/executive/view-updates/${updateId}`;
}

export function selectExecutiveDashboard(
  plan: ConfirmedPlanBaseline | null,
  managerUpdates: ManagerUpdatesState,
  cycleId: string,
) {
  if (!plan) return null;

  const cycle = getCycle(cycleId);
  const submissions = currentSubmittedUpdates(managerUpdates, cycleId);
  const productionPlan = confirmedTarget(plan, 'kpi_gross_production');
  const productionActual = reportedTarget('kpi_gross_production', cycleId);
  const liquidityPlan = confirmedTarget(plan, 'kpi_liquidity');
  const liquidityActual = reportedTarget('kpi_liquidity', cycleId);
  const hsePlan = confirmedTarget(plan, 'kpi_trir');
  const hseActual = reportedTarget('kpi_trir', cycleId);
  const legalPlan = confirmedTarget(plan, 'kpi_regulatory_compliance');
  const legalActual = reportedTarget('kpi_regulatory_compliance', cycleId);
  const costRecoveryPlan = confirmedTarget(plan, 'kpi_cost_recovery');
  const costRecoveryActual = reportedTarget('kpi_cost_recovery', cycleId);
  const productionBaseline = productionPlan?.approvedBaseline ?? productionActual?.approvedBaseline;
  const liquidityBaseline = liquidityPlan?.approvedBaseline ?? liquidityActual?.approvedBaseline;
  const hseBaseline = hsePlan?.approvedBaseline ?? hseActual?.approvedBaseline;
  const legalBaseline = legalPlan?.approvedBaseline ?? legalActual?.approvedBaseline;
  const costRecoveryBaseline =
    costRecoveryPlan?.approvedBaseline ?? costRecoveryActual?.approvedBaseline;

  const productionDestination = productionPlan?.projectId
    ? `/projects/${productionPlan.projectId}`
    : '/executive/view-updates';
  const hseDestination =
    hsePlan?.projectId || legalPlan?.projectId
      ? `/projects/${hsePlan?.projectId ?? legalPlan?.projectId}`
      : '/executive/view-updates';
  const legalDestination = legalPlan?.projectId
    ? `/projects/${legalPlan.projectId}`
    : '/executive/view-updates';

  const ceoMetrics = [
    productionActual && productionBaseline !== undefined
      ? {
          id: 'production',
          label: 'Production Performance',
          value: `${format.number(productionActual.actual)} bopd`,
          status: productionActual.status,
          comparison: `${format.number(productionBaseline)} bopd plan · ${format.number(productionActual.variance)} bopd variance`,
          reportingPeriod: cycle.label,
          destination: productionDestination,
          available: true,
        }
      : null,
    liquidityActual && liquidityBaseline !== undefined
      ? {
          id: 'cash-flow',
          label: 'Cash Flow',
          value: format.usd(liquidityActual.actual),
          status: liquidityActual.status,
          comparison: `${format.usd(liquidityActual.variance)} against the ${format.usd(liquidityBaseline)} approved liquidity baseline`,
          reportingPeriod: cycle.label,
          destination: '/executive/view-updates',
          available: true,
        }
      : null,
    hseActual && hseBaseline !== undefined
      ? {
          id: 'hse',
          label: 'HSE Performance',
          value: `TRIR ${hseActual.actual.toFixed(2)}`,
          status: hseActual.status,
          comparison: `${hseBaseline.toFixed(2)} approved maximum · ${atlas.hse.kpis.recordableIncidents} recordable incidents`,
          reportingPeriod: cycle.label,
          destination: hseDestination,
          available: true,
        }
      : null,
    legalActual && legalBaseline !== undefined
      ? {
          id: 'legal',
          label: 'Legal & Regulatory Position',
          value: `${legalActual.actual}% on time`,
          status: legalActual.status,
          comparison: `${legalBaseline}% approved target · ${atlas.legalRegulatory.kpis.submissionsOutstanding} obligations outstanding`,
          reportingPeriod: cycle.label,
          destination: legalDestination,
          available: true,
        }
      : null,
  ].filter(Boolean) as ExecutiveMetric[];

  const productionTrend = atlas.production.monthlyTrend.map((point, index, points) => {
    const current = index === points.length - 1;
    const planned = current && productionPlan ? productionPlan.approvedBaseline : point.planBopd;
    const actual = current && productionActual ? productionActual.actual : point.actualBopd;
    return {
      period: point.month,
      planned,
      actual,
      variance: actual - planned,
      currentReportingPeriod: current,
    };
  });

  const strategicRisks: ExecutiveRiskRow[] = phase1Domain.risks
    .filter((risk) => risk.reportingPeriodId === cycleId)
    .sort((left, right) => {
      const rank = (status: string) => (status === 'critical' ? 3 : status === 'at_risk' ? 2 : 1);
      return (
        rank(right.status) - rank(left.status) || right.financialExposure - left.financialExposure
      );
    })
    .map((risk) => {
      const sourceUpdate = submissions.find((update) => update.projectId === risk.projectId);
      return {
        id: risk.id,
        risk: risk.description,
        impact: risk.impact,
        exposure: format.usd(risk.financialExposure),
        mitigation: risk.mitigation,
        status: risk.status,
        destination: sourceUpdate
          ? updateDestination(sourceUpdate.id)
          : risk.projectId
            ? `/projects/${risk.projectId}`
            : undefined,
      };
    });

  const productionGap =
    productionActual && productionBaseline !== undefined
      ? ((productionActual.actual - productionBaseline) / productionBaseline) * 100
      : null;
  const nextForecast = atlas.finance.cashPositionForecast.find(
    (point) => point.month > cycle.endDate.slice(0, 7) && point.baseForecastUsd !== null,
  );
  const insights: ExecutiveInsight[] = [
    ...(productionGap !== null
      ? [
          {
            id: 'production-gap',
            title: 'Production recovery remains the principal delivery constraint',
            detail: `Current production is ${format.percent(Math.abs(productionGap))} below the confirmed baseline, led by constrained compressor capacity.`,
            impact: `${format.number(Math.abs(productionActual?.variance ?? 0))} bopd is unavailable against plan.`,
            status: productionGap <= -15 ? 'critical' : productionGap < 0 ? 'at_risk' : 'on_track',
            destination: productionDestination,
          },
        ]
      : []),
    ...(nextForecast && liquidityPlan && liquidityActual
      ? [
          {
            id: 'liquidity-forecast',
            title: 'Liquidity headroom is forecast to narrow',
            detail: `The next available base forecast is ${format.usd(nextForecast.baseForecastUsd ?? 0)} after the current reporting period.`,
            impact: `This is ${format.usd((nextForecast.baseForecastUsd ?? 0) - liquidityPlan.approvedBaseline)} against the approved liquidity baseline.`,
            status: 'at_risk',
            destination: '/executive/view-updates',
          },
        ]
      : []),
    ...(strategicRisks.some((risk) => risk.status === 'critical')
      ? [
          {
            id: 'risk-concentration',
            title: 'Strategic exposure is concentrated in near-term delivery',
            detail: `${strategicRisks.filter((risk) => risk.status === 'critical').length} critical risk requires immediate control, with schedule and production effects linked.`,
            impact: 'Delay would extend revenue deferment and reduce operating flexibility.',
            status: 'critical',
            destination: strategicRisks.find((risk) => risk.status === 'critical')?.destination,
          },
        ]
      : []),
  ];

  const selectedPeriodBudgetLines = phase1Domain.budgetLines.filter(
    (line) => line.reportingPeriodId === cycleId,
  );
  const currentBudgetLines = selectedPeriodBudgetLines.length
    ? selectedPeriodBudgetLines
    : phase1Domain.budgetLines;
  const total = (field: 'approvedBaseline' | 'committed' | 'actual' | 'currentForecast') =>
    currentBudgetLines.reduce((sum, line) => sum + line[field], 0);
  const approvedSpend = plan.totalApprovedBudget;
  const committedSpend = total('committed');
  const approvedVsCommitted = approvedSpend ? (committedSpend / approvedSpend) * 100 : null;
  const revenueGap = atlas.finance.kpis.revenueYtdUsd - atlas.finance.kpis.revenuePlanYtdUsd;
  const cfoMetrics = [
    liquidityActual && liquidityBaseline !== undefined
      ? {
          id: 'cash-position',
          label: 'Cash Position',
          value: format.usd(liquidityActual.actual),
          status: liquidityActual.status,
          comparison: `${format.usd(liquidityActual.variance)} against ${format.usd(liquidityBaseline)} approved liquidity · ${atlas.finance.kpis.runwayMonths.toFixed(1)} months runway`,
          reportingPeriod: cycle.label,
          destination: '/executive/view-updates',
          available: true,
        }
      : null,
    approvedVsCommitted !== null && currentBudgetLines.length
      ? {
          id: 'approved-committed',
          label: 'Approved vs Committed',
          value: format.percent(approvedVsCommitted),
          status:
            approvedVsCommitted > 100
              ? 'critical'
              : approvedVsCommitted > 85
                ? 'at_risk'
                : 'in_progress',
          comparison: `${format.usd(committedSpend)} committed of ${format.usd(approvedSpend)} approved`,
          reportingPeriod: cycle.label,
          destination: '/executive/view-updates',
          available: true,
        }
      : null,
    costRecoveryActual && costRecoveryBaseline !== undefined
      ? {
          id: 'cost-recovery',
          label: 'Cost Recovery',
          value: `${costRecoveryActual.actual}%`,
          status: costRecoveryActual.status,
          comparison: `${costRecoveryBaseline}% approved target · ${format.percent(costRecoveryActual.variance)} variance`,
          reportingPeriod: cycle.label,
          destination: '/executive/view-updates',
          available: true,
        }
      : null,
    productionActual && productionBaseline !== undefined
      ? {
          id: 'revenue-production',
          label: 'Revenue Impacting Production Variance',
          value: format.usd(revenueGap),
          status: revenueGap < 0 ? 'at_risk' : 'on_track',
          comparison: `${format.percent(productionGap ?? 0)} production variance against the confirmed baseline`,
          reportingPeriod: cycle.label,
          destination: productionDestination,
          available: true,
        }
      : null,
  ].filter(Boolean) as ExecutiveMetric[];

  const cashFlowForecast = atlas.finance.cashflow.map((point) => ({
    period: point.month,
    forecastInflows: point.inflowUsd,
    forecastOutflows: point.outflowUsd,
    netCashPosition: point.netUsd,
  }));

  const spend = (category: 'opex' | 'capex') => {
    const lines = currentBudgetLines.filter((line) => line.category === category);
    const sum = (field: 'approvedBaseline' | 'committed' | 'actual' | 'currentForecast') =>
      lines.reduce((amount, line) => amount + line[field], 0);
    const approved = sum('approvedBaseline');
    const actual = sum('actual');
    const forecast = sum('currentForecast');
    return {
      category,
      available: lines.length > 0,
      approved,
      committed: sum('committed'),
      actual,
      remaining: approved - actual,
      variance: forecast - approved,
      status: forecast > approved ? 'adverse' : 'on_track',
    };
  };

  return {
    cycle,
    ceo: {
      metrics: ceoMetrics,
      productionTrend: productionPlan && productionActual ? productionTrend : [],
      strategicRisks,
      insights,
    },
    cfo: {
      metrics: cfoMetrics,
      cashFlowForecast,
      spend: [spend('opex'), spend('capex')],
      financialRisks: strategicRisks.filter((risk) =>
        phase1Domain.risks.some(
          (source) => source.id === risk.id && source.category === 'financial',
        ),
      ),
    },
  };
}
