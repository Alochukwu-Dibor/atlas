import type { ConfirmedPlanBaseline, ProjectBaseline } from '../state/plan';
import { deriveProjectHealthFromUpdates, type ManagerUpdatesState } from '../state/managerUpdates';
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

function projectListItem(
  baseline: ProjectBaseline,
  managerUpdates?: ManagerUpdatesState,
): CommercialProjectListItem {
  const reported = phase1Domain.projects.find((project) => project.id === baseline.id);
  const fallbackHealth = normaliseProjectHealth(reported?.status ?? 'at_risk');
  const derived = managerUpdates
    ? deriveProjectHealthFromUpdates(managerUpdates, baseline.id, fallbackHealth)
    : { status: fallbackHealth, score: healthPercent(fallbackHealth) };
  return {
    id: baseline.id,
    name: baseline.name,
    phase: reported?.phase ?? 'Awaiting first report',
    health: derived.status,
    healthPercent: derived.score,
    progressPercent: reported?.progressPercent ?? 0,
    plannedProgressPercent: reported?.planPercent ?? null,
    reportingAvailable: Boolean(reported),
  };
}

export function selectCommercialProjects(
  confirmedPlan: ConfirmedPlanBaseline | null,
  managerUpdates?: ManagerUpdatesState,
): CommercialProjectListItem[] {
  return confirmedPlan?.projects.map((project) => projectListItem(project, managerUpdates)) ?? [];
}

function adherenceFor(kpiId: string, baseline: number, actual: number) {
  if (baseline === 0) return Math.max(0, Math.round(100 - Math.abs(actual) * 10));
  if (kpiId === 'kpi_trir' && actual <= 0) return 100;
  if (kpiId === 'kpi_trir') return Math.min(100, Math.round((baseline / actual) * 100));
  return Math.max(0, Math.min(100, Math.round((actual / baseline) * 100)));
}

type SupplementalMeasure = Omit<
  CommercialProjectMeasure,
  'id' | 'sourceId' | 'type' | 'department'
>;

const projectAdherenceFixtures: Record<
  string,
  { targets: SupplementalMeasure[]; milestones: SupplementalMeasure[] }
> = {
  prj_compressor: {
    targets: [
      {
        name: 'Restore gross oil delivery to 120,000 barrels per day',
        approvedValue: 120000,
        actualValue: 96800,
        unit: 'bopd',
        variance: '-23,200 bopd',
        adherencePercent: 81,
        dueOrPeriod: '27 Jul–2 Aug 2026',
        status: 'at_risk',
      },
      {
        name: 'Recover 23,200 barrels per day of deferred production before September',
        approvedValue: 23200,
        actualValue: 11600,
        unit: 'bopd',
        variance: '-11,600 bopd',
        adherencePercent: 50,
        dueOrPeriod: '2026-08-31',
        status: 'at_risk',
      },
      {
        name: 'Maintain compressor-system availability above 90%',
        approvedValue: 90,
        actualValue: 82.4,
        unit: '%',
        variance: '-7.6 pp',
        adherencePercent: 92,
        dueOrPeriod: '27 Jul–2 Aug 2026',
        status: 'needs_attention',
      },
    ],
    milestones: [
      {
        name: 'Replacement rotor delivered to Compressor Station B',
        approvedValue: '2026-08-06',
        actualValue: 'At risk',
        unit: '',
        variance: 'Logistics confirmation outstanding',
        adherencePercent: 65,
        dueOrPeriod: '2026-08-06',
        status: 'at_risk',
      },
      {
        name: 'Compressor mechanical installation and alignment completed',
        approvedValue: '2026-08-08',
        actualValue: 'Not started',
        unit: '',
        variance: 'Dependent on rotor delivery',
        adherencePercent: 20,
        dueOrPeriod: '2026-08-08',
        status: 'needs_attention',
      },
      {
        name: 'Performance test confirms at least 90% station availability',
        approvedValue: '2026-08-09',
        actualValue: 'Scheduled',
        unit: '',
        variance: 'Test window remains open',
        adherencePercent: 45,
        dueOrPeriod: '2026-08-09',
        status: 'scheduled',
      },
    ],
  },
  prj_integrity: {
    targets: [
      {
        name: 'Complete 100% of priority export-line inspection scope',
        approvedValue: 100,
        actualValue: 54,
        unit: '%',
        variance: '-46 pp',
        adherencePercent: 54,
        dueOrPeriod: '2026-08-22',
        status: 'delayed',
      },
      {
        name: 'Deliver the integrity programme within the approved USD 28 million budget',
        approvedValue: 28000000,
        actualValue: 30100000,
        unit: 'USD forecast',
        variance: '+USD 2.1m',
        adherencePercent: 93,
        dueOrPeriod: '2026-08-22',
        status: 'at_risk',
      },
      {
        name: 'Resolve all high-risk access constraints before inspection mobilisation',
        approvedValue: 2,
        actualValue: 1,
        unit: 'constraints closed',
        variance: '1 remains open',
        adherencePercent: 50,
        dueOrPeriod: '2026-08-05',
        status: 'critical',
      },
    ],
    milestones: [
      {
        name: 'Community access protocol executed for the inspection corridor',
        approvedValue: '2026-08-05',
        actualValue: 'In progress',
        unit: '',
        variance: 'Executive action required',
        adherencePercent: 55,
        dueOrPeriod: '2026-08-05',
        status: 'at_risk',
      },
      {
        name: 'Priority export-line inspection window completed',
        approvedValue: '2026-08-15',
        actualValue: 'Delayed',
        unit: '',
        variance: 'Forecast 22 Aug 2026',
        adherencePercent: 54,
        dueOrPeriod: '2026-08-15',
        status: 'delayed',
      },
      {
        name: 'Final integrity findings and repair plan approved',
        approvedValue: '2026-08-22',
        actualValue: 'Not started',
        unit: '',
        variance: 'Dependent on inspection',
        adherencePercent: 15,
        dueOrPeriod: '2026-08-22',
        status: 'needs_attention',
      },
    ],
  },
  prj_wellwork: {
    targets: [
      {
        name: 'Restore the first Kokori well to sustained production before September',
        approvedValue: 1,
        actualValue: 0,
        unit: 'well online',
        variance: 'Commissioning pending',
        adherencePercent: 61,
        dueOrPeriod: '2026-08-28',
        status: 'on_track',
      },
      {
        name: 'Complete at least 60% of the well-restoration campaign by week 31',
        approvedValue: 60,
        actualValue: 61,
        unit: '%',
        variance: '+1 pp',
        adherencePercent: 100,
        dueOrPeriod: '27 Jul–2 Aug 2026',
        status: 'on_track',
      },
      {
        name: 'Deliver the campaign within the approved USD 65 million budget',
        approvedValue: 65000000,
        actualValue: 64200000,
        unit: 'USD forecast',
        variance: '-USD 0.8m',
        adherencePercent: 100,
        dueOrPeriod: '2026-09-15',
        status: 'on_track',
      },
    ],
    milestones: [
      {
        name: 'First restored Kokori well restarted',
        approvedValue: '2026-08-28',
        actualValue: 'On track',
        unit: '',
        variance: 'No schedule variance',
        adherencePercent: 72,
        dueOrPeriod: '2026-08-28',
        status: 'on_track',
      },
      {
        name: 'Three-well workover sequence completed',
        approvedValue: '2026-09-08',
        actualValue: 'In progress',
        unit: '',
        variance: 'Sequence 2 of 3 active',
        adherencePercent: 67,
        dueOrPeriod: '2026-09-08',
        status: 'on_track',
      },
      {
        name: 'Sustained production test and campaign handover completed',
        approvedValue: '2026-09-15',
        actualValue: 'Scheduled',
        unit: '',
        variance: 'Test plan approved',
        adherencePercent: 45,
        dueOrPeriod: '2026-09-15',
        status: 'scheduled',
      },
    ],
  },
  prj_metering: {
    targets: [
      {
        name: 'Complete 100% of fiscal-metering commissioning scope',
        approvedValue: 100,
        actualValue: 88,
        unit: '%',
        variance: '-12 pp',
        adherencePercent: 88,
        dueOrPeriod: '2026-08-12',
        status: 'on_track',
      },
      {
        name: 'Achieve at least 98% measurement accuracy at acceptance',
        approvedValue: 98,
        actualValue: 96.4,
        unit: '%',
        variance: '-1.6 pp',
        adherencePercent: 98,
        dueOrPeriod: '2026-08-12',
        status: 'needs_attention',
      },
      {
        name: 'Close all acceptance punch-list items before custody transfer',
        approvedValue: 12,
        actualValue: 9,
        unit: 'items closed',
        variance: '3 items open',
        adherencePercent: 75,
        dueOrPeriod: '2026-08-12',
        status: 'on_track',
      },
    ],
    milestones: [
      {
        name: 'Fiscal meter installation and loop checks completed',
        approvedValue: '2026-08-06',
        actualValue: 'Completed',
        unit: '',
        variance: 'Completed on schedule',
        adherencePercent: 100,
        dueOrPeriod: '2026-08-06',
        status: 'completed',
      },
      {
        name: 'Calibration and proving accepted by operations assurance',
        approvedValue: '2026-08-10',
        actualValue: 'In progress',
        unit: '',
        variance: 'Final proving run pending',
        adherencePercent: 88,
        dueOrPeriod: '2026-08-10',
        status: 'on_track',
      },
      {
        name: 'Custody-transfer handover certificate signed',
        approvedValue: '2026-08-12',
        actualValue: 'Scheduled',
        unit: '',
        variance: 'Acceptance meeting booked',
        adherencePercent: 60,
        dueOrPeriod: '2026-08-12',
        status: 'scheduled',
      },
    ],
  },
};

function measuresFor(baseline: ProjectBaseline): CommercialProjectMeasure[] {
  const cycle = getCycle(atlas.demoStates.defaultOpenCycleId);
  const baselineTargets = baseline.targets.map((target) => {
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
  const baselineMilestones = baseline.milestones.map((milestone) => {
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
  const fixture = projectAdherenceFixtures[baseline.id];
  const department = getDepartment(baseline.departmentId)?.name ?? 'Unassigned';
  const targets =
    fixture?.targets.map((measure, index) => ({
      ...measure,
      id: `target:${baseline.id}:${index + 1}`,
      sourceId: baselineTargets[index]?.sourceId ?? `target_${baseline.id}_${index + 1}`,
      type: 'Target' as const,
      department,
    })) ?? baselineTargets;
  const milestones =
    fixture?.milestones.map((measure, index) => ({
      ...measure,
      id: `milestone:${baseline.id}:${index + 1}`,
      sourceId: baselineMilestones[index]?.sourceId ?? `milestone_${baseline.id}_${index + 1}`,
      type: 'Milestone' as const,
      department,
    })) ?? baselineMilestones;
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
  managerUpdates?: ManagerUpdatesState,
): CommercialProjectWorkspace | null {
  const baseline = confirmedPlan?.projects.find((project) => project.id === projectId);
  if (!confirmedPlan || !baseline) return null;
  const listItem = projectListItem(baseline, managerUpdates);
  const reported = phase1Domain.projects.find((project) => project.id === baseline.id);
  const latestUpdate = managerUpdates?.updates
    .filter(
      (update) =>
        update.projectId === projectId &&
        update.status === 'submitted' &&
        Boolean(update.performanceMeasures?.length),
    )
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))[0];
  const measures = measuresFor(baseline).map((measure) => {
    const linkedPlanItemId =
      measure.type === 'Target'
        ? (baseline.targets.find((target) => target.id === measure.sourceId)?.kpiId ??
          measure.sourceId)
        : measure.sourceId;
    const updateMeasure = latestUpdate?.performanceMeasures?.find(
      (item) => item.planItemId === linkedPlanItemId,
    );
    if (
      !updateMeasure ||
      (updateMeasure.type !== 'Milestone' && !updateMeasure.currentValue.trim()) ||
      (updateMeasure.type === 'Milestone' && updateMeasure.currentStatus === 'not_started')
    )
      return measure;
    const actual =
      updateMeasure.type === 'Milestone'
        ? updateMeasure.currentStatus.replaceAll('_', ' ')
        : Number(updateMeasure.currentValue);
    return {
      ...measure,
      actualValue: actual,
      variance: updateMeasure.variance,
      adherencePercent:
        updateMeasure.status === 'on_track' ? 100 : updateMeasure.status === 'at_risk' ? 65 : 25,
      status: updateMeasure.status,
    };
  });
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
