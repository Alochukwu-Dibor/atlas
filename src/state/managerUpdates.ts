import { atlas } from '../data/atlas';
import type { ProjectBaseline } from './plan';

export type ManagerSubmissionStatus = 'draft' | 'submitted';
export type ManagerChartType = 'bar' | 'line';

export interface ProjectAssignment {
  userId: string;
  departmentId: string;
  projectIds: string[];
}

export interface ManagerUpdateSections {
  highlights: string;
  ongoingActivities: string;
  risks: string;
  plansForWeek: string;
}

export type UpdateOutcomeStatus = 'achieved' | 'partially_achieved' | 'not_achieved' | 'deferred';
export type ActivityStatus = 'not_started' | 'in_progress' | 'completed';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ManagerPlanLink {
  strategicObjectiveId: string;
  kpiId: string;
  targetId: string;
  milestoneId: string;
}

export interface ManagerMetricInput {
  id: string;
  label: string;
  unit: string;
  value: string;
}

export type ManagerMeasureType = 'KPI' | 'Target' | 'Milestone';
export type MeasureStatus =
  'not_started' | 'in_progress' | 'completed' | 'on_track' | 'at_risk' | 'critical';

export interface ManagerMeasureRevision {
  id: string;
  reportingPeriodId: string;
  managerId: string;
  previousValue: string;
  currentValue: string;
  variance: string;
  recordedAt: string;
}

export interface ManagerPerformanceMeasure {
  id: string;
  planItemId: string;
  type: ManagerMeasureType;
  name: string;
  projectId: string;
  departmentId: string;
  unit: string;
  approvedValue: string;
  previousValue: string;
  currentValue: string;
  plannedCompletion: string;
  previousStatus: string;
  currentStatus: MeasureStatus;
  currentProgress: string;
  forecastCompletion: string;
  variance: string;
  status: MeasureStatus;
  evidenceIds: string[];
  reviewStatus: 'draft' | 'submitted' | 'reviewed';
  revisions: ManagerMeasureRevision[];
  addChart: boolean;
}

export interface ManagerHighlightRecord {
  id: string;
  text: string;
  linkedPlanItemIds: string[];
}

export interface ManagerActivityRecord {
  id: string;
  activity: string;
  status: ActivityStatus;
  progressPercent: string;
  expectedCompletion: string;
  linkedPlanItemId: string;
  blocker: string;
  narrative: string;
}

export type CommitmentStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'blocked';

export interface ManagerCommitmentRecord {
  id: string;
  commitment: string;
  expectedOutcome: string;
  ownerId: string;
  dueDate: string;
  linkedPlanItemId: string;
  dependency: string;
  status: CommitmentStatus;
}

export interface ManagerCommitmentOutcome {
  commitmentId: string;
  commitment: string;
  expectedOutcome: string;
  status: CommitmentStatus;
  actualOutcome: string;
  delayReason: string;
  revisedForecast: string;
  evidenceIds: string[];
}

export interface ManagerRiskRecord {
  id: string;
  risk: string;
  impact: string;
  likelihood: 'low' | 'medium' | 'high';
  linkedPlanItemId: string;
  potentialImpact: string;
  mitigation: string;
  ownerId: string;
  targetResolution: string;
  comment: string;
}

export interface ManagerStructuredSections {
  highlights: ManagerPlanLink & {
    previousPlanUpdateId: string;
    expectedOutcome: string;
    plannedValue: string;
    actualValue: string;
    unit: string;
    outcomeStatus: UpdateOutcomeStatus;
  };
  ongoingActivities: ManagerPlanLink & {
    activity: string;
    status: ActivityStatus;
    progressPercent: string;
    forecastCompletion: string;
  };
  risks: ManagerPlanLink & {
    riskTitle: string;
    severity: RiskSeverity;
    quantifiedImpact: string;
    mitigation: string;
    targetResolutionDate: string;
  };
  plansForWeek: ManagerPlanLink & {
    commitment: string;
    expectedOutcome: string;
    plannedValue: string;
    unit: string;
    dueDate: string;
  };
}

export interface GeneratedChart {
  id: string;
  type: ManagerChartType;
  title: string;
  values: { label: string; value: number; planValue?: number }[];
  generatedAt: string;
}

export interface ManagerAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploaded' | 'error';
  error?: string;
}

export interface ManagerUpdateComment {
  id: string;
  authorId: string;
  authorRole: 'department_manager' | 'commercial_manager' | 'ceo' | 'cfo';
  comment: string;
  timestamp: string;
}

export interface ManagerWeeklyUpdate {
  id: string;
  creatorId: string;
  departmentId: string;
  projectId: string;
  reportingPeriodId: string;
  reportingDeadline: string;
  sections: ManagerUpdateSections;
  structuredSections?: ManagerStructuredSections;
  metricInputs?: ManagerMetricInput[];
  performanceMeasures?: ManagerPerformanceMeasure[];
  highlights?: ManagerHighlightRecord[];
  activities?: ManagerActivityRecord[];
  previousCommitmentOutcomes?: ManagerCommitmentOutcome[];
  commitments?: ManagerCommitmentRecord[];
  structuredRisks?: ManagerRiskRecord[];
  supportRequired?: string;
  chart: GeneratedChart | null;
  attachments: ManagerAttachment[];
  pastedText?: string;
  status: ManagerSubmissionStatus;
  savedAt: string;
  submittedAt: string | null;
  visibleToRoles: ('commercial_manager' | 'ceo' | 'cfo')[];
  comments: ManagerUpdateComment[];
}

export interface ManagerUpdatesState {
  version: 3;
  updates: ManagerWeeklyUpdate[];
  lastError: string | null;
}

export type ManagerUpdatesAction =
  | { type: 'UPSERT_UPDATE'; update: ManagerWeeklyUpdate }
  | { type: 'ADD_COMMENT'; updateId: string; comment: ManagerUpdateComment }
  | { type: 'DELETE_UPDATE'; updateId: string; actorId: string }
  | { type: 'RESET' }
  | { type: 'CLEAR_ALL' }
  | { type: 'CLEAR_ERROR' };

export const managerUpdatesStorageKey = 'atlas.manager-updates.v1';
export const managerPrototypeNow = '2026-08-03T12:00:00+01:00';

const sharedMetricDefinitions: Record<string, { id: string; label: string; unit: string }[]> = {
  dept_operations: [
    { id: 'gross_oil_produced', label: 'Gross oil produced', unit: 'bbl' },
    { id: 'average_daily_production', label: 'Average daily production', unit: 'bopd' },
    { id: 'production_downtime', label: 'Production downtime', unit: 'hours' },
    { id: 'deferred_production', label: 'Deferred production', unit: 'bbl' },
    { id: 'facility_availability', label: 'Facility availability', unit: '%' },
  ],
  dept_subsea: [
    { id: 'subsea_system_availability', label: 'Subsea system availability', unit: '%' },
    { id: 'flowline_inspection_progress', label: 'Flowline inspection progress', unit: '%' },
    { id: 'subsea_integrity_actions', label: 'Subsea integrity actions closed', unit: 'count' },
    { id: 'intervention_readiness', label: 'Intervention readiness', unit: '%' },
  ],
  dept_finance: [
    { id: 'opening_cash', label: 'Opening cash', unit: 'USD' },
    { id: 'cash_receipts', label: 'Cash receipts', unit: 'USD' },
    { id: 'operating_payments', label: 'Operating payments', unit: 'USD' },
    { id: 'capital_payments', label: 'Capital payments', unit: 'USD' },
    { id: 'committed_spend', label: 'Committed spend', unit: 'USD' },
    { id: 'receivables_outstanding', label: 'Receivables outstanding', unit: 'USD' },
  ],
  dept_hse: [
    { id: 'hours_worked', label: 'Hours worked', unit: 'hours' },
    { id: 'recordable_incidents', label: 'Recordable incidents', unit: 'count' },
    { id: 'lost_time_incidents', label: 'Lost-time incidents', unit: 'count' },
    { id: 'near_misses', label: 'Near misses', unit: 'count' },
    { id: 'corrective_actions_closed', label: 'Corrective actions closed', unit: 'count' },
  ],
  dept_legal: [
    { id: 'obligations_due', label: 'Regulatory obligations due', unit: 'count' },
    { id: 'obligations_completed', label: 'Obligations completed on time', unit: 'count' },
    { id: 'permits_renewed', label: 'Permits renewed', unit: 'count' },
    { id: 'active_disputes', label: 'Active disputes', unit: 'count' },
    { id: 'legal_exposure', label: 'Estimated legal exposure', unit: 'USD' },
  ],
  dept_projects: [
    { id: 'physical_progress', label: 'Physical progress', unit: '%' },
    { id: 'planned_work_complete', label: 'Planned work completed', unit: '%' },
    { id: 'milestones_completed', label: 'Milestones completed', unit: 'count' },
    { id: 'schedule_variance', label: 'Schedule variance', unit: 'days' },
    { id: 'actual_cost', label: 'Actual cost', unit: 'USD' },
  ],
  dept_commercial: [
    { id: 'gas_available_hours', label: 'Available gas handling hours', unit: 'hours' },
    { id: 'gas_planned_hours', label: 'Planned gas handling hours', unit: 'hours' },
    { id: 'allocated_volume', label: 'Allocated gas volume', unit: 'mmscf' },
    { id: 'reconciled_volume', label: 'Reconciled gas volume', unit: 'mmscf' },
  ],
};

export function createEmptyStructuredSections(): ManagerStructuredSections {
  const link = { strategicObjectiveId: '', kpiId: '', targetId: '', milestoneId: '' };
  return {
    highlights: {
      ...link,
      previousPlanUpdateId: '',
      expectedOutcome: '',
      plannedValue: '',
      actualValue: '',
      unit: '',
      outcomeStatus: 'achieved',
    },
    ongoingActivities: {
      ...link,
      activity: '',
      status: 'in_progress',
      progressPercent: '',
      forecastCompletion: '',
    },
    risks: {
      ...link,
      riskTitle: '',
      severity: 'medium',
      quantifiedImpact: '',
      mitigation: '',
      targetResolutionDate: '',
    },
    plansForWeek: {
      ...link,
      commitment: '',
      expectedOutcome: '',
      plannedValue: '',
      unit: '',
      dueDate: '',
    },
  };
}

export function createManagerMetricInputs(departmentId: string): ManagerMetricInput[] {
  return (sharedMetricDefinitions[departmentId] ?? []).map((definition) => ({
    ...definition,
    value: '',
  }));
}

function measureHealth(planItemId: string, approved: number, current: number): MeasureStatus {
  if (!Number.isFinite(current)) return 'not_started';
  const adherence =
    planItemId === 'kpi_trir'
      ? current <= 0
        ? 100
        : (approved / current) * 100
      : approved === 0
        ? Math.max(0, 100 - Math.abs(current) * 10)
        : (current / approved) * 100;
  if (adherence >= 95) return 'on_track';
  if (adherence >= 85) return 'at_risk';
  return 'critical';
}

export function calculateMeasure(measure: ManagerPerformanceMeasure): ManagerPerformanceMeasure {
  if (measure.type === 'Milestone') {
    return {
      ...measure,
      variance:
        measure.currentStatus === 'completed'
          ? 'Completed'
          : measure.currentProgress
            ? `${measure.currentProgress}% complete`
            : 'Awaiting update',
      status: measure.currentStatus,
    };
  }
  const approved = Number(measure.approvedValue);
  const current = Number(measure.currentValue);
  if (!measure.currentValue.trim() || !Number.isFinite(approved) || !Number.isFinite(current)) {
    return { ...measure, variance: 'Awaiting update', status: 'not_started' };
  }
  const variancePercent = approved === 0 ? current : ((current - approved) / approved) * 100;
  return {
    ...measure,
    variance: `${variancePercent >= 0 ? '+' : ''}${variancePercent.toFixed(1)}%`,
    status: measureHealth(measure.planItemId, approved, current),
  };
}

export function createInheritedPerformanceMeasures(
  project: ProjectBaseline,
  departmentId: string,
  previousUpdate?: ManagerWeeklyUpdate,
): ManagerPerformanceMeasure[] {
  const previousMeasures = previousUpdate?.performanceMeasures ?? [];
  const projectKpis = project.kpis.filter(
    (kpi) => kpi.departmentId === departmentId || departmentId === 'dept_commercial',
  );
  const departmentKpis = atlas.kpiTargets
    .filter(
      (target) =>
        target.departmentId === departmentId &&
        (target.projectId === null || target.projectId === project.id),
    )
    .flatMap((target) => {
      const definition = atlas.kpiDefinitions.find((kpi) => kpi.id === target.kpiId);
      return definition
        ? [
            {
              id: definition.id,
              projectId: project.id,
              departmentId,
              name: definition.name,
              unit: definition.unit,
            },
          ]
        : [];
    });
  const relevantKpis = [...projectKpis, ...departmentKpis].filter(
    (kpi, index, items) => items.findIndex((item) => item.id === kpi.id) === index,
  );
  const kpis = relevantKpis.map((kpi) => {
    const target =
      project.targets.find((item) => item.kpiId === kpi.id) ??
      atlas.kpiTargets.find((item) => item.kpiId === kpi.id);
    const previous = previousMeasures.find((item) => item.planItemId === kpi.id);
    const latestValidated = atlas.kpiTargets.find((item) => item.kpiId === kpi.id);
    return calculateMeasure({
      id: `measure_${kpi.id}_${project.id}`,
      planItemId: kpi.id,
      type: 'KPI',
      name: kpi.name,
      projectId: project.id,
      departmentId: kpi.departmentId,
      unit: kpi.unit,
      approvedValue: String(target?.approvedBaseline ?? ''),
      previousValue: previous?.currentValue ?? String(latestValidated?.actual ?? ''),
      currentValue: '',
      plannedCompletion: '',
      previousStatus:
        previous?.status ??
        (latestValidated?.status === 'on_track'
          ? 'on_track'
          : latestValidated?.status === 'at_risk'
            ? 'at_risk'
            : latestValidated?.status === 'off_track'
              ? 'critical'
              : 'not_started'),
      currentStatus: 'not_started',
      currentProgress: '',
      forecastCompletion: '',
      variance: 'Awaiting update',
      status: 'not_started',
      evidenceIds: [],
      reviewStatus: 'draft',
      revisions: previous?.revisions ?? [],
      addChart: false,
    });
  });
  const milestones = project.milestones.map((milestone) => {
    const previous = previousMeasures.find((item) => item.planItemId === milestone.id);
    const latestValidated = atlas.milestones.find((item) => item.id === milestone.id);
    return calculateMeasure({
      id: `measure_${milestone.id}_${project.id}`,
      planItemId: milestone.id,
      type: 'Milestone',
      name: milestone.name,
      projectId: project.id,
      departmentId: milestone.departmentId,
      unit: '',
      approvedValue: milestone.dueDate,
      previousValue: previous?.currentValue ?? '',
      currentValue: '',
      plannedCompletion: milestone.dueDate,
      previousStatus:
        previous?.currentStatus ??
        (latestValidated?.status === 'complete'
          ? 'completed'
          : latestValidated?.status === 'in_progress'
            ? 'in_progress'
            : 'not_started'),
      currentStatus: 'not_started',
      currentProgress: '',
      forecastCompletion: milestone.dueDate,
      variance: 'Awaiting update',
      status: 'not_started',
      evidenceIds: [],
      reviewStatus: 'draft',
      revisions: previous?.revisions ?? [],
      addChart: false,
    });
  });
  return [...kpis, ...milestones];
}

export function createCommitmentOutcomes(
  previousUpdate?: ManagerWeeklyUpdate,
): ManagerCommitmentOutcome[] {
  return (previousUpdate?.commitments ?? []).map((commitment) => ({
    commitmentId: commitment.id,
    commitment: commitment.commitment,
    expectedOutcome: commitment.expectedOutcome,
    status: commitment.status,
    actualOutcome: '',
    delayReason: '',
    revisedForecast: commitment.dueDate,
    evidenceIds: [],
  }));
}

export function latestPreviousManagerUpdate(
  updates: ManagerWeeklyUpdate[],
  creatorId: string,
  projectId: string,
  reportingPeriodId: string,
) {
  const currentEnd =
    atlas.reportingCycles.find((cycle) => cycle.id === reportingPeriodId)?.endDate ?? '';
  return updates
    .filter((update) => {
      const updateEnd =
        atlas.reportingCycles.find((cycle) => cycle.id === update.reportingPeriodId)?.endDate ?? '';
      return (
        update.creatorId === creatorId &&
        update.projectId === projectId &&
        update.status === 'submitted' &&
        updateEnd < currentEnd
      );
    })
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))[0];
}

export const projectAssignments: ProjectAssignment[] = [
  {
    userId: 'usr_operations',
    departmentId: 'dept_operations',
    projectIds: ['prj_compressor', 'prj_wellwork'],
  },
  {
    userId: 'usr_subsea',
    departmentId: 'dept_subsea',
    projectIds: ['prj_integrity', 'prj_metering'],
  },
  {
    userId: 'usr_finance',
    departmentId: 'dept_finance',
    projectIds: ['prj_compressor', 'prj_metering'],
  },
  {
    userId: 'usr_hse',
    departmentId: 'dept_hse',
    projectIds: ['prj_compressor', 'prj_integrity'],
  },
  {
    userId: 'usr_legal',
    departmentId: 'dept_legal',
    projectIds: ['prj_integrity', 'prj_compressor'],
  },
  {
    userId: 'usr_projects',
    departmentId: 'dept_projects',
    projectIds: atlas.projects.map((project) => project.id),
  },
  {
    userId: 'usr_commercial',
    departmentId: 'dept_commercial',
    projectIds: atlas.projects.map((project) => project.id),
  },
];

function initialUpdates(): ManagerWeeklyUpdate[] {
  return [
    {
      id: 'manager_update_projects_integrity_w30',
      creatorId: 'usr_projects',
      departmentId: 'dept_projects',
      projectId: 'prj_integrity',
      reportingPeriodId: 'cycle_2026_w30',
      reportingDeadline: atlas.reportingCycles.find((cycle) => cycle.id === 'cycle_2026_w30')!
        .dueDate,
      sections: {
        highlights:
          'Inspection coverage reached 54% against 70% plan; 16 kilometres of line were verified.',
        ongoingActivities:
          'ROW access coordination and ultrasonic inspection continue on the western segment.',
        risks:
          'Community access restrictions may move the remaining inspection window by seven days.',
        plansForWeek:
          'Close the access agreement and complete inspection of the remaining priority segments.',
      },
      chart: {
        id: 'chart_projects_integrity_w30',
        type: 'bar',
        title: 'Highlights chart',
        values: [
          { label: 'Value 1', value: 54 },
          { label: 'Value 2', value: 70 },
          { label: 'Value 3', value: 16 },
        ],
        generatedAt: '2026-07-28T11:10:00+01:00',
      },
      attachments: [
        {
          id: 'attachment_projects_integrity_w30',
          name: 'Ughelli_Integrity_Progress.xlsx',
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 286_000,
          status: 'uploaded',
        },
      ],
      status: 'submitted',
      savedAt: '2026-07-28T11:10:00+01:00',
      submittedAt: '2026-07-28T11:10:00+01:00',
      visibleToRoles: ['commercial_manager', 'ceo', 'cfo'],
      comments: [
        {
          id: 'comment_integrity_w30_commercial',
          authorId: 'usr_commercial',
          authorRole: 'commercial_manager',
          comment: 'Please confirm whether the community access date is now firm.',
          timestamp: '2026-07-29T09:15:00+01:00',
        },
      ],
    },
  ];
}

export function createInitialManagerUpdatesState(): ManagerUpdatesState {
  return { version: 3, updates: initialUpdates(), lastError: null };
}

export function createEmptyManagerUpdatesState(): ManagerUpdatesState {
  return { version: 3, updates: [], lastError: null };
}

export function loadManagerUpdatesState(): ManagerUpdatesState {
  if (typeof window === 'undefined') return createInitialManagerUpdatesState();
  try {
    const stored = window.localStorage.getItem(managerUpdatesStorageKey);
    if (!stored) return createInitialManagerUpdatesState();
    const parsed = JSON.parse(stored) as
      ManagerUpdatesState | (Omit<ManagerUpdatesState, 'version'> & { version: 1 | 2 });
    if (parsed.version === 3) return parsed;
    if (parsed.version === 1 || parsed.version === 2) {
      return {
        ...parsed,
        version: 3,
        updates: parsed.updates.map((update) => ({
          ...update,
          comments: 'comments' in update ? update.comments : [],
        })),
      };
    }
    return createInitialManagerUpdatesState();
  } catch {
    return createInitialManagerUpdatesState();
  }
}

export function managerUpdatesReducer(
  state: ManagerUpdatesState,
  action: ManagerUpdatesAction,
): ManagerUpdatesState {
  if (action.type === 'RESET') return createInitialManagerUpdatesState();
  if (action.type === 'CLEAR_ALL') return createEmptyManagerUpdatesState();
  if (action.type === 'CLEAR_ERROR') return { ...state, lastError: null };
  if (action.type === 'DELETE_UPDATE') {
    const update = state.updates.find((item) => item.id === action.updateId);
    if (!update || update.status !== 'submitted' || update.creatorId !== action.actorId) {
      return { ...state, lastError: 'Only the creator can delete a submitted update.' };
    }
    return {
      ...state,
      updates: state.updates.filter((item) => item.id !== action.updateId),
      lastError: null,
    };
  }
  if (action.type === 'ADD_COMMENT') {
    const update = state.updates.find((item) => item.id === action.updateId);
    if (!update || update.status !== 'submitted' || !action.comment.comment.trim()) {
      return { ...state, lastError: 'Comments are available only on submitted updates.' };
    }
    return {
      ...state,
      updates: state.updates.map((item) =>
        item.id === action.updateId
          ? { ...item, comments: [...item.comments, action.comment] }
          : item,
      ),
      lastError: null,
    };
  }
  const exists = state.updates.some((update) => update.id === action.update.id);
  return {
    ...state,
    updates: exists
      ? state.updates.map((update) => (update.id === action.update.id ? action.update : update))
      : [...state.updates, action.update],
    lastError: null,
  };
}

export function selectAssignedProjectIds(userId: string) {
  return projectAssignments.find((assignment) => assignment.userId === userId)?.projectIds ?? [];
}

export function selectManagerUpdates(state: ManagerUpdatesState, creatorId: string) {
  return state.updates
    .filter((update) => update.creatorId === creatorId)
    .sort((a, b) => {
      const periodDifference = getPeriodEnd(b.reportingPeriodId).localeCompare(
        getPeriodEnd(a.reportingPeriodId),
      );
      return periodDifference || b.savedAt.localeCompare(a.savedAt);
    });
}

export function selectVisibleSubmittedUpdates(
  state: ManagerUpdatesState,
  role: 'commercial_manager' | 'ceo' | 'cfo',
) {
  return state.updates
    .filter((update) => update.status === 'submitted' && update.visibleToRoles.includes(role))
    .sort((a, b) => {
      const periodDifference = getPeriodEnd(b.reportingPeriodId).localeCompare(
        getPeriodEnd(a.reportingPeriodId),
      );
      return periodDifference || (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '');
    });
}

export function deriveProjectHealthFromUpdates(
  state: ManagerUpdatesState,
  projectId: string,
  fallback: 'on_track' | 'at_risk' | 'critical' = 'at_risk',
) {
  const latest = state.updates
    .filter(
      (update) =>
        update.projectId === projectId &&
        update.status === 'submitted' &&
        Boolean(update.performanceMeasures?.length),
    )
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))[0];
  if (!latest?.performanceMeasures?.length) {
    return {
      status: fallback,
      score: fallback === 'on_track' ? 100 : fallback === 'at_risk' ? 65 : 25,
    };
  }
  const statuses = latest.performanceMeasures
    .map((measure) => calculateMeasure(measure).status)
    .filter((status) => status !== 'not_started');
  const hasCriticalMeasure = statuses.includes('critical');
  const hasAtRiskMeasure = statuses.includes('at_risk');
  const hasCriticalRisk = latest.structuredRisks?.some(
    (risk) => risk.impact === 'critical' || (risk.impact === 'high' && risk.likelihood === 'high'),
  );
  const hasBlockedCommitment = latest.commitments?.some(
    (commitment) => commitment.status === 'blocked' || commitment.status === 'delayed',
  );
  const status =
    hasCriticalMeasure || hasCriticalRisk
      ? 'critical'
      : hasAtRiskMeasure || hasBlockedCommitment
        ? 'at_risk'
        : statuses.length
          ? 'on_track'
          : fallback;
  const measureScores = statuses.map((measureStatus) =>
    measureStatus === 'on_track' || measureStatus === 'completed'
      ? 100
      : measureStatus === 'at_risk' || measureStatus === 'in_progress'
        ? 65
        : 25,
  );
  const score = measureScores.length
    ? Math.round(measureScores.reduce((sum, value) => sum + value, 0) / measureScores.length)
    : status === 'on_track'
      ? 100
      : status === 'at_risk'
        ? 65
        : 25;
  return { status, score };
}

export function selectLatestSubmittedMeasure(
  state: ManagerUpdatesState,
  planItemId: string,
  projectId?: string,
) {
  for (const update of [...state.updates]
    .filter((item) => item.status === 'submitted' && (!projectId || item.projectId === projectId))
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))) {
    const measure = update.performanceMeasures?.find(
      (item) => item.planItemId === planItemId && item.currentValue.trim(),
    );
    if (measure) return measure;
  }
  return undefined;
}

function getPeriodEnd(periodId: string) {
  return atlas.reportingCycles.find((cycle) => cycle.id === periodId)?.endDate ?? '';
}

export function isUpdatePastDeadline(
  update: Pick<ManagerWeeklyUpdate, 'reportingDeadline'>,
  now = managerPrototypeNow,
) {
  return now.slice(0, 10) > update.reportingDeadline;
}

export function canViewDraft(update: ManagerWeeklyUpdate, userId: string) {
  return (
    update.status === 'draft' &&
    update.creatorId === userId &&
    selectAssignedProjectIds(userId).includes(update.projectId)
  );
}

export function canViewUpdate(
  update: ManagerWeeklyUpdate,
  userId: string,
  role: 'department_manager' | 'commercial_manager' | 'ceo' | 'cfo',
) {
  if (canViewDraft(update, userId)) return true;
  if (update.status !== 'submitted') return false;
  if (update.creatorId === userId && selectAssignedProjectIds(userId).includes(update.projectId)) {
    return true;
  }
  if (!update.visibleToRoles.includes(role as 'commercial_manager' | 'ceo' | 'cfo')) return false;
  if (role === 'commercial_manager') {
    return selectAssignedProjectIds(userId).includes(update.projectId);
  }
  return role === 'ceo' || role === 'cfo';
}

export function canEditUpdate(
  update: ManagerWeeklyUpdate,
  userId: string,
  role: 'department_manager' | 'commercial_manager' | 'ceo' | 'cfo',
  now = managerPrototypeNow,
) {
  return (
    update.creatorId === userId &&
    (role === 'department_manager' || role === 'commercial_manager') &&
    selectAssignedProjectIds(userId).includes(update.projectId) &&
    !isUpdatePastDeadline(update, now)
  );
}

export function canResubmitUpdate(
  update: ManagerWeeklyUpdate,
  userId: string,
  role: 'department_manager' | 'commercial_manager' | 'ceo' | 'cfo',
  now = managerPrototypeNow,
) {
  return update.status === 'submitted' && canEditUpdate(update, userId, role, now);
}

export function canDeleteUpdate(
  update: ManagerWeeklyUpdate,
  userId: string,
  role: 'department_manager' | 'commercial_manager' | 'ceo' | 'cfo',
) {
  return (
    update.status === 'submitted' &&
    update.creatorId === userId &&
    (role === 'department_manager' || role === 'commercial_manager') &&
    selectAssignedProjectIds(userId).includes(update.projectId)
  );
}

export function canCommentOnUpdate(
  update: ManagerWeeklyUpdate,
  userId: string,
  role: 'department_manager' | 'commercial_manager' | 'ceo' | 'cfo',
) {
  return update.status === 'submitted' && canViewUpdate(update, userId, role);
}
