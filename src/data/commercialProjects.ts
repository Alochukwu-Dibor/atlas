import type { ConfirmedPlanBaseline, ProjectBaseline } from '../state/plan';
import type { WorkflowState } from '../state/workflow';
import {
  atlas,
  getCycle,
  getDepartment,
  getStrategicObjective,
  getUser,
  phase1Domain,
  statusLabels,
} from './atlas';
import type { PortfolioHealthStatus } from './commercialDashboard';

export type ProjectMeasureType = 'KPI' | 'Target' | 'Milestone';

export interface CommercialProjectListItem {
  id: string;
  name: string;
  phase: string;
  health: PortfolioHealthStatus;
  healthPercent: number;
  progressPercent: number;
  plannedProgressPercent: number | null;
  reportingAvailable: boolean;
}

export interface CommercialProjectMeasure {
  id: string;
  sourceId: string;
  name: string;
  type: ProjectMeasureType;
  department: string;
  approvedValue: number | string;
  actualValue: number | string;
  unit: string;
  variance: string;
  adherencePercent: number;
  dueOrPeriod: string;
  status: string;
}

export interface CommercialProjectInsight {
  id: string;
  title: string;
  reason: string;
  status: string;
  destination: string;
}

export interface CommercialProjectActivity {
  id: string;
  description: string;
  actor: string;
  timestamp: string;
  context: string;
  status: string;
  destination?: string;
}

export interface CommercialProjectWorkspace extends CommercialProjectListItem {
  objective: string;
  objectiveId: string | null;
  targetAdherencePercent: number;
  measures: CommercialProjectMeasure[];
  insights: CommercialProjectInsight[];
  activities: CommercialProjectActivity[];
}

export function normaliseProjectHealth(status: string): PortfolioHealthStatus {
  if (status === 'critical' || status === 'delayed') return 'critical';
  if (status === 'at_risk' || status === 'needs_attention') return 'at_risk';
  return 'on_track';
}

function healthPercent(status: PortfolioHealthStatus) {
  return status === 'on_track' ? 100 : status === 'at_risk' ? 65 : 25;
}

function projectListItem(baseline: ProjectBaseline): CommercialProjectListItem {
  const reported = phase1Domain.projects.find((project) => project.id === baseline.id);
  const health = normaliseProjectHealth(reported?.status ?? 'at_risk');
  return {
    id: baseline.id,
    name: baseline.name,
    phase: reported?.phase ?? 'Awaiting first report',
    health,
    healthPercent: healthPercent(health),
    progressPercent: reported?.progressPercent ?? 0,
    plannedProgressPercent: reported?.planPercent ?? null,
    reportingAvailable: Boolean(reported),
  };
}

export function selectCommercialProjects(
  confirmedPlan: ConfirmedPlanBaseline | null,
): CommercialProjectListItem[] {
  return confirmedPlan?.projects.map(projectListItem) ?? [];
}

function adherenceFor(kpiId: string, baseline: number, actual: number) {
  if (baseline === 0) return Math.max(0, Math.round(100 - Math.abs(actual) * 10));
  if (kpiId === 'kpi_trir' && actual <= 0) return 100;
  if (kpiId === 'kpi_trir') return Math.min(100, Math.round((baseline / actual) * 100));
  return Math.max(0, Math.min(100, Math.round((actual / baseline) * 100)));
}

function measuresFor(baseline: ProjectBaseline): CommercialProjectMeasure[] {
  const cycle = getCycle(atlas.demoStates.defaultOpenCycleId);
  const targets = baseline.targets.map((target) => {
    const reported = phase1Domain.kpiTargets.find((item) => item.kpiId === target.kpiId);
    const definition = phase1Domain.kpiDefinitions.find((item) => item.id === target.kpiId);
    const actual = reported?.actual ?? 0;
    const variance = actual - target.approvedBaseline;
    return {
      id: `target:${target.id}`,
      sourceId: target.id,
      name: `${definition?.name ?? target.kpiId} target`,
      type: 'Target' as const,
      department: getDepartment(target.departmentId)?.name ?? 'Unassigned',
      approvedValue: target.approvedBaseline,
      actualValue: reported ? actual : 'Awaiting report',
      unit: target.unit,
      variance: reported
        ? `${variance > 0 ? '+' : ''}${variance.toLocaleString()} ${target.unit}`
        : '—',
      adherencePercent: reported ? adherenceFor(target.kpiId, target.approvedBaseline, actual) : 0,
      dueOrPeriod: cycle.label,
      status: reported?.status ?? 'missing_inputs',
    };
  });
  const kpis = baseline.kpis.map((kpi) => {
    const target = baseline.targets.find((item) => item.kpiId === kpi.id);
    const reported = phase1Domain.kpiTargets.find((item) => item.kpiId === kpi.id);
    const approved = target?.approvedBaseline ?? 'Not set';
    const actual = reported?.actual ?? 'Awaiting report';
    return {
      id: `kpi:${kpi.id}`,
      sourceId: kpi.id,
      name: kpi.name,
      type: 'KPI' as const,
      department: getDepartment(kpi.departmentId)?.name ?? 'Unassigned',
      approvedValue: approved,
      actualValue: actual,
      unit: kpi.unit,
      variance:
        reported && target
          ? `${reported.variance > 0 ? '+' : ''}${reported.variance.toLocaleString()} ${kpi.unit}`
          : '—',
      adherencePercent:
        reported && target ? adherenceFor(kpi.id, target.approvedBaseline, reported.actual) : 0,
      dueOrPeriod: cycle.label,
      status: reported?.status ?? 'missing_inputs',
    };
  });
  const milestones = baseline.milestones.map((milestone) => {
    const reported = phase1Domain.milestones.find((item) => item.id === milestone.id);
    const status = reported?.status ?? 'missing_inputs';
    return {
      id: `milestone:${milestone.id}`,
      sourceId: milestone.id,
      name: milestone.name,
      type: 'Milestone' as const,
      department: getDepartment(milestone.departmentId)?.name ?? 'Unassigned',
      approvedValue: milestone.dueDate,
      actualValue: reported
        ? (statusLabels[reported.status] ?? reported.status)
        : 'Awaiting report',
      unit: '',
      variance:
        status === 'on_track'
          ? 'On schedule'
          : status === 'delayed'
            ? 'Delivery date at risk'
            : 'Requires attention',
      adherencePercent:
        status === 'on_track'
          ? 100
          : status === 'at_risk'
            ? 65
            : status === 'delayed' || status === 'critical'
              ? 25
              : 0,
      dueOrPeriod: milestone.dueDate,
      status,
    };
  });
  return [...kpis, ...targets, ...milestones];
}

function activitiesFor(
  confirmedPlan: ConfirmedPlanBaseline,
  baseline: ProjectBaseline,
  workflow: WorkflowState,
) {
  const events: CommercialProjectActivity[] = [
    {
      id: `plan:${confirmedPlan.id}:${baseline.id}`,
      description: 'Approved plan confirmed as the Atlas tracking baseline.',
      actor: getUser(confirmedPlan.confirmedBy)?.name ?? 'Commercial Manager',
      timestamp: confirmedPlan.confirmedAt,
      context: confirmedPlan.name,
      status: 'confirmed',
      destination: '/plan',
    },
  ];
  const reports = workflow.reports.filter((report) => report.projectId === baseline.id);
  for (const report of reports) {
    if (report.submittedAt) {
      events.push({
        id: `submitted:${report.id}:${report.revision}`,
        description: 'Weekly Execution Update received.',
        actor:
          getUser(report.managerId ?? '')?.name ??
          getDepartment(report.departmentId)?.name ??
          'Department',
        timestamp: report.submittedAt,
        context: report.title,
        status: report.status,
        destination: `/reviews/${report.id}`,
      });
    }
    if (report.approvedAt) {
      events.push({
        id: `reviewed:${report.id}:${report.revision}`,
        description: 'Weekly Execution Update reviewed and approved.',
        actor: 'Commercial Manager',
        timestamp: report.approvedAt,
        context: report.title,
        status: 'approved',
        destination: `/reviews/${report.id}`,
      });
    }
  }
  const measureIds = new Set([
    baseline.id,
    ...baseline.kpis.map((item) => item.id),
    ...baseline.targets.map((item) => item.kpiId),
    ...baseline.milestones.map((item) => item.id),
  ]);
  for (const revision of phase1Domain.historicalRevisions.filter((item) =>
    measureIds.has(item.entityId),
  )) {
    events.push({
      id: `revision:${revision.id}`,
      description:
        revision.entityType === 'project'
          ? 'Project-health context changed.'
          : 'KPI forecast updated without changing the approved baseline.',
      actor: getUser(revision.actorId)?.name ?? 'Atlas source',
      timestamp: revision.createdAt,
      context: revision.explanation,
      status: 'updated',
      destination:
        revision.entityType === 'project'
          ? `/projects/${baseline.id}?view=overview`
          : `/projects/${baseline.id}?view=adherence&measure=${revision.entityId}`,
    });
  }
  for (const comment of workflow.comments.filter((item) =>
    reports.some((report) => report.id === item.reportId),
  )) {
    events.push({
      id: `comment:${comment.id}`,
      description: 'Review comment added.',
      actor: getUser(comment.authorId)?.name ?? 'Commercial Manager',
      timestamp: comment.createdAt,
      context: comment.question,
      status: comment.status,
      destination: `/reviews/${comment.reportId}`,
    });
  }
  return events.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

export function selectCommercialProjectWorkspace(
  confirmedPlan: ConfirmedPlanBaseline | null,
  workflow: WorkflowState,
  projectId: string,
): CommercialProjectWorkspace | null {
  const baseline = confirmedPlan?.projects.find((project) => project.id === projectId);
  if (!confirmedPlan || !baseline) return null;
  const listItem = projectListItem(baseline);
  const reported = phase1Domain.projects.find((project) => project.id === baseline.id);
  const measures = measuresFor(baseline);
  const targetMeasures = measures.filter((measure) => measure.type !== 'KPI');
  const targetAdherencePercent = targetMeasures.length
    ? Math.round(
        targetMeasures.reduce((sum, measure) => sum + measure.adherencePercent, 0) /
          targetMeasures.length,
      )
    : 0;
  const insights: CommercialProjectInsight[] = [];
  if (reported?.issue) {
    insights.push({
      id: `project:${reported.id}`,
      title: reported.issue,
      reason: `${Math.abs((reported.progressPercent ?? 0) - (reported.planPercent ?? reported.progressPercent ?? 0))} percentage points behind approved progress.`,
      status: listItem.health,
      destination: `/projects/${baseline.id}?view=adherence&measure=${baseline.milestones[0]?.id ?? baseline.kpis[0]?.id}`,
    });
  }
  for (const measure of measures.filter((item) => item.status !== 'on_track').slice(0, 2)) {
    insights.push({
      id: measure.id,
      title: `${measure.name} requires attention`,
      reason: `${String(measure.actualValue)} against approved ${String(measure.approvedValue)}${measure.unit ? ` ${measure.unit}` : ''}.`,
      status: measure.status,
      destination: `/projects/${baseline.id}?view=adherence&measure=${measure.sourceId}`,
    });
  }
  const pendingReport = workflow.reports.find(
    (report) =>
      report.projectId === baseline.id &&
      ['submitted', 'resubmitted', 'needs_clarification'].includes(report.status),
  );
  if (pendingReport) {
    insights.push({
      id: `report:${pendingReport.id}`,
      title: `${pendingReport.title} requires review`,
      reason: `Current review status is ${pendingReport.status.replaceAll('_', ' ')}.`,
      status: pendingReport.status,
      destination: `/reviews/${pendingReport.id}`,
    });
  }
  return {
    ...listItem,
    objective:
      getStrategicObjective(baseline.strategicObjectiveIds[0])?.name ?? 'No linked objective',
    objectiveId: baseline.strategicObjectiveIds[0] ?? null,
    targetAdherencePercent,
    measures,
    insights,
    activities: activitiesFor(confirmedPlan, baseline, workflow),
  };
}
