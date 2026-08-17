import { atlas, format, getCycle, getDepartment, getUser, phase1Domain } from './atlas';
import type { ConfirmedPlanBaseline } from '../state/plan';
import {
  deriveProjectHealthFromUpdates,
  selectLatestSubmittedMeasure,
  type ManagerUpdatesState,
} from '../state/managerUpdates';
import { reportDepartmentName, selectSubmissionQueue, type WorkflowState } from '../state/workflow';

export type PortfolioHealthStatus = 'on_track' | 'at_risk' | 'critical';

export interface DashboardProjectHealth {
  id: string;
  name: string;
  status: PortfolioHealthStatus;
  progressPercent: number | null;
  plannedProgressPercent: number | null;
  variancePoints: number | null;
  reason: string;
  reportingAvailable: boolean;
}

export interface DashboardKpiMetric {
  id: 'production' | 'cash_flow' | 'hse' | 'legal';
  title: string;
  result: string;
  context: string;
  status: string;
  destination: string;
}

export interface DashboardActionItem {
  id: string;
  title: string;
  reason: string;
  reference: string;
  status: string;
  destination: string;
  rank: number;
}

function normaliseProjectHealth(status: string): PortfolioHealthStatus {
  if (status === 'critical' || status === 'delayed') return 'critical';
  if (status === 'at_risk' || status === 'needs_attention') return 'at_risk';
  return 'on_track';
}

function confirmedTarget(plan: ConfirmedPlanBaseline, kpiId: string) {
  for (const project of plan.projects) {
    const target = project.targets.find((item) => item.kpiId === kpiId);
    if (target) return target;
  }
  return undefined;
}

function projectDestination(projectId: string) {
  return `/projects/${projectId}`;
}

export function selectCommercialDashboard(
  confirmedPlan: ConfirmedPlanBaseline | null,
  workflow: WorkflowState,
  cycleId: string,
  scenarioId: string = 'canonical',
  managerUpdates?: ManagerUpdatesState,
) {
  if (!confirmedPlan) return null;

  const projects: DashboardProjectHealth[] = confirmedPlan.projects.map((baseline) => {
    const actual = phase1Domain.projects.find((project) => project.id === baseline.id);
    if (!actual) {
      return {
        id: baseline.id,
        name: baseline.name,
        status: 'at_risk',
        progressPercent: null,
        plannedProgressPercent: null,
        variancePoints: null,
        reason: 'No weekly reporting data is available for this confirmed project.',
        reportingAvailable: false,
      };
    }
    const plannedProgress = actual.planPercent ?? actual.progressPercent;
    const variancePoints = actual.progressPercent - plannedProgress;
    const fallbackStatus = normaliseProjectHealth(actual.status);
    const derived = managerUpdates
      ? deriveProjectHealthFromUpdates(managerUpdates, baseline.id, fallbackStatus)
      : { status: fallbackStatus };
    return {
      id: actual.id,
      name: baseline.name,
      status: derived.status,
      progressPercent: actual.progressPercent,
      plannedProgressPercent: plannedProgress,
      variancePoints,
      reason:
        actual.issue ??
        (variancePoints < 0
          ? `${Math.abs(variancePoints)} percentage points behind approved progress.`
          : 'Delivery is aligned with the approved project plan.'),
      reportingAvailable: true,
    };
  });

  const healthBreakdown = {
    on_track: projects.filter((project) => project.status === 'on_track').length,
    at_risk: projects.filter((project) => project.status === 'at_risk').length,
    critical: projects.filter((project) => project.status === 'critical').length,
  };
  const healthScore = projects.length
    ? Math.round(
        projects.reduce(
          (sum, project) =>
            sum + (project.status === 'on_track' ? 100 : project.status === 'at_risk' ? 65 : 25),
          0,
        ) / projects.length,
      )
    : 0;
  const portfolioStatus: PortfolioHealthStatus = healthBreakdown.critical
    ? 'critical'
    : healthBreakdown.at_risk
      ? 'at_risk'
      : 'on_track';

  const reportedProduction = phase1Domain.kpiTargets.find(
    (target) => target.kpiId === 'kpi_gross_production',
  );
  const reportedLegal = phase1Domain.kpiTargets.find(
    (target) => target.kpiId === 'kpi_regulatory_compliance',
  );
  const submittedProduction = managerUpdates
    ? selectLatestSubmittedMeasure(managerUpdates, 'kpi_gross_production')
    : undefined;
  const submittedLegal = managerUpdates
    ? selectLatestSubmittedMeasure(managerUpdates, 'kpi_regulatory_compliance')
    : undefined;
  const productionActual = submittedProduction?.currentValue
    ? Number(submittedProduction.currentValue)
    : reportedProduction?.actual;
  const legalActual = submittedLegal?.currentValue
    ? Number(submittedLegal.currentValue)
    : reportedLegal?.actual;
  const productionTarget = confirmedTarget(confirmedPlan, 'kpi_gross_production');
  const hseTarget = confirmedTarget(confirmedPlan, 'kpi_trir');
  const legalTarget = confirmedTarget(confirmedPlan, 'kpi_regulatory_compliance');
  const productionVariance =
    productionTarget && productionActual !== undefined
      ? ((productionActual - productionTarget.approvedBaseline) /
          productionTarget.approvedBaseline) *
        100
      : null;

  const kpis: DashboardKpiMetric[] = [
    {
      id: 'production',
      title: 'Production capacity',
      result:
        productionActual !== undefined ? `${format.number(productionActual)} bopd` : 'No report',
      context:
        productionTarget && productionActual !== undefined
          ? `${format.number(productionTarget.approvedBaseline)} bopd plan · ${format.percent(productionVariance ?? 0)} variance`
          : 'Awaiting confirmed target and weekly actual',
      status: submittedProduction?.status ?? reportedProduction?.status ?? 'missing_inputs',
      destination: projectDestination(
        productionTarget?.projectId ?? confirmedPlan.projects[0]?.id ?? 'prj_compressor',
      ),
    },
    {
      id: 'cash_flow',
      title: 'Cash-flow position',
      result: format.usd(atlas.finance.kpis.availableLiquidityUsd),
      context: `${atlas.finance.kpis.runwayMonths.toFixed(1)} months runway · ${format.usd(atlas.finance.kpis.nextRepaymentUsd)} repayment due ${format.date(atlas.finance.kpis.nextRepaymentDate)}`,
      status: atlas.finance.kpis.status,
      destination: '/projects',
    },
    {
      id: 'hse',
      title: 'HSE',
      result: `TRIR ${atlas.hse.kpis.trir.toFixed(2)}`,
      context: hseTarget
        ? `${hseTarget.approvedBaseline.toFixed(2)} approved target · ${atlas.hse.kpis.recordableIncidents} recordable incidents`
        : 'Awaiting confirmed HSE target',
      status:
        atlas.hse.kpis.trir > (hseTarget?.approvedBaseline ?? atlas.hse.kpis.trirTarget)
          ? 'at_risk'
          : 'on_track',
      destination: projectDestination(hseTarget?.projectId ?? 'prj_integrity'),
    },
    {
      id: 'legal',
      title: 'Legal',
      result: legalActual !== undefined ? `${legalActual}% on time` : 'No report',
      context:
        legalTarget && legalActual !== undefined
          ? `${legalTarget.approvedBaseline}% approved target · community access issue unresolved`
          : 'Awaiting confirmed legal target and weekly actual',
      status: submittedLegal?.status ?? reportedLegal?.status ?? 'missing_inputs',
      destination: projectDestination(legalTarget?.projectId ?? 'prj_integrity'),
    },
  ];

  const queue = scenarioId === 'empty' ? [] : selectSubmissionQueue(workflow, cycleId);
  const submissions = queue.filter((report) =>
    ['submitted', 'resubmitted', 'needs_clarification'].includes(report.status),
  );
  const projectAttention: DashboardActionItem[] = projects
    .filter(
      (project) =>
        project.status === 'critical' ||
        project.status === 'at_risk' ||
        (project.variancePoints ?? 0) <= -10,
    )
    .map((project) => ({
      id: `project_${project.id}`,
      title: project.name,
      reason: project.reason,
      reference: 'Project',
      status: project.status,
      destination: projectDestination(project.id),
      rank: project.status === 'critical' ? 100 : 76,
    }));
  const submissionAttention: DashboardActionItem[] = submissions.map((report) => ({
    id: `submission_${report.id}`,
    title: `${reportDepartmentName(report)} Weekly Execution Update`,
    reason:
      report.status === 'needs_clarification'
        ? 'Clarification remains unresolved before this update can be approved.'
        : `Submitted information is waiting for Commercial review for ${getCycle(report.cycleId).label}.`,
    reference: report.title,
    status: report.status,
    destination: `/reviews/${report.id}`,
    rank: report.status === 'needs_clarification' ? 96 : report.status === 'resubmitted' ? 90 : 84,
  }));
  const attention = [...projectAttention, ...submissionAttention].sort(
    (left, right) => right.rank - left.rank || left.id.localeCompare(right.id),
  );

  const cycle = getCycle(cycleId);
  const hseProject = hseTarget?.projectId ?? 'prj_compressor';
  const legalRisk = phase1Domain.risks.find((risk) => risk.category === 'regulatory');
  const priorityCandidates: DashboardActionItem[] = [
    ...projectAttention,
    ...submissionAttention,
    ...(productionVariance !== null && productionVariance <= -10
      ? [
          {
            id: 'priority_production_variance',
            title: 'Resolve the production-capacity gap',
            reason: `Weekly production is ${format.percent(productionVariance)} below the confirmed plan target.`,
            reference: 'Compressor Station B Restoration',
            status: 'critical',
            destination: projectDestination(productionTarget?.projectId ?? 'prj_compressor'),
            rank: 94,
          },
        ]
      : []),
    ...(atlas.hse.kpis.trir > (hseTarget?.approvedBaseline ?? atlas.hse.kpis.trirTarget)
      ? [
          {
            id: 'priority_hse',
            title: 'Close the compressor-isolation HSE actions',
            reason: `TRIR is ${atlas.hse.kpis.trir.toFixed(2)} against the confirmed ${
              hseTarget?.approvedBaseline.toFixed(2) ?? atlas.hse.kpis.trirTarget.toFixed(2)
            } target, with one high-potential event under review.`,
            reference: 'HSE · Compressor Station B',
            status: 'high',
            destination: projectDestination(hseProject),
            rank: 88,
          },
        ]
      : []),
    ...(legalRisk
      ? [
          {
            id: 'priority_legal',
            title: 'Resolve community access before the inspection window',
            reason: legalRisk.impact,
            reference: `${getDepartment(legalRisk.departmentId ?? null)?.name ?? 'Legal'} · ${getUser(legalRisk.ownerId ?? '')?.name ?? 'Unassigned'}`,
            status: legalRisk.status,
            destination: projectDestination(legalRisk.projectId ?? 'prj_integrity'),
            rank: 86,
          },
        ]
      : []),
    ...(submissions.length
      ? [
          {
            id: 'priority_reporting_deadline',
            title: 'Complete the weekly review queue',
            reason: `${submissions.length} ${submissions.length === 1 ? 'submission requires' : 'submissions require'} review before the ${format.date(cycle.dueDate)} reporting deadline.`,
            reference: cycle.label,
            status: 'due_soon',
            destination: '/reviews',
            rank: 82,
          },
        ]
      : []),
  ];
  const priorities = priorityCandidates
    .sort((left, right) => right.rank - left.rank || left.id.localeCompare(right.id))
    .filter(
      (item, index, items) =>
        items.findIndex(
          (candidate) =>
            candidate.destination === item.destination && candidate.title === item.title,
        ) === index,
    )
    .slice(0, 6);

  const trend = atlas.businessPlanDeliveryTrend.map((point) => ({
    period: point.period,
    plannedDeliveryPercent: point.plannedDeliveryPercent,
    actualDeliveryPercent: point.deliveryPercent,
    currentReportingWeek: point.currentReportingWeek,
  }));

  return {
    plan: confirmedPlan,
    projects,
    portfolioHealth: { status: portfolioStatus, score: healthScore, breakdown: healthBreakdown },
    kpis,
    attention,
    priorities,
    trend,
    reportingCoverage: {
      received: queue.length,
      expected: atlas.departments.filter((department) => department.required).length,
      limited: queue.length === 0,
    },
  };
}
