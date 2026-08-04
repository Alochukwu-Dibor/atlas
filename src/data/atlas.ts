import atlasData from '../../ATLAS_MOCK_DATA.json';
import type {
  ApprovedBudget,
  BudgetLine,
  BusinessPlan,
  BusinessUnit,
  DecisionRecord,
  DecisionSupportItem,
  EvidenceRecord,
  ExecutionRisk,
  HistoricalRevision,
  KpiDefinition,
  KpiTarget,
  Milestone,
  OperationalActivity,
  OutputRecord,
  PlanningPeriod,
  StrategicObjective,
  StrategicTheme,
  ProjectInitiative,
  Commitment,
  WeeklyExecutionUpdate,
} from './types';

export type AtlasData = typeof atlasData;
export type PersonaRole = AtlasData['users'][number]['role'];
export type ScenarioId = AtlasData['demoStates']['availableScenarios'][number]['id'];
export type StatusTone = 'success' | 'warning' | 'critical' | 'information' | 'neutral';

export const atlas = atlasData;

export const statusLabels: Record<string, string> = {
  active: 'Active',
  adverse: 'Adverse',
  approved: 'Approved',
  assigned: 'Assigned',
  at_risk: 'At risk',
  awaiting_confirmation: 'Awaiting confirmation',
  awaiting_government: 'Awaiting government',
  awaiting_partner: 'Awaiting partner',
  awaiting_verification: 'Awaiting verification',
  closed: 'Closed',
  completed: 'Completed',
  conflict: 'Conflict',
  constrained: 'Constrained',
  critical: 'Critical',
  decision_recorded: 'Decision recorded',
  delayed: 'Delayed',
  draft: 'Draft',
  due_soon: 'Due soon',
  extracted: 'Extracted',
  high: 'High',
  in_progress: 'In progress',
  locked: 'Locked',
  low: 'Low',
  medium: 'Medium',
  missing_inputs: 'Missing inputs',
  manager_draft: 'Manager draft',
  missing_confirmation: 'Missing confirmation',
  partial: 'Partial extraction',
  invalid: 'Invalid',
  failed_extraction: 'Failed extraction',
  unsupported: 'Unsupported',
  uploading: 'Uploading',
  processing: 'Processing',
  needs_clarification: 'Needs clarification',
  needs_attention: 'Needs attention',
  not_started: 'Not started',
  on_track: 'On track',
  ongoing: 'Ongoing',
  open: 'Open',
  overdue: 'Overdue',
  pending: 'Pending',
  published_locked: 'Published · Locked',
  ready: 'Ready',
  reviewed: 'Reviewed',
  resubmitted: 'Resubmitted',
  resolved: 'Resolved',
  resolved_for_publication: 'Resolved for publication',
  scheduled: 'Scheduled',
  stalled: 'Stalled',
  system_draft: 'System Recommended Action',
  submitted: 'Submitted',
  under_review: 'Under review',
  upcoming: 'Upcoming',
  upcoming_next_month: 'Upcoming next month',
  validation_issue: 'Validation issue',
};

export function toneForStatus(status: string): StatusTone {
  if (
    [
      'approved',
      'closed',
      'completed',
      'extracted',
      'on_track',
      'published_locked',
      'submitted',
    ].includes(status)
  ) {
    return status === 'submitted' ? 'information' : 'success';
  }
  if (
    [
      'critical',
      'delayed',
      'failed_extraction',
      'invalid',
      'offline',
      'overdue',
      'unsupported',
    ].includes(status)
  )
    return 'critical';
  if (
    [
      'active',
      'adverse',
      'at_risk',
      'conflict',
      'due_soon',
      'high',
      'missing_confirmation',
      'missing_inputs',
      'needs_attention',
      'needs_clarification',
      'partial',
      'validation_issue',
    ].includes(status)
  )
    return 'warning';
  if (['in_progress', 'processing', 'resubmitted', 'under_review', 'uploading'].includes(status))
    return 'information';
  return 'neutral';
}

export const format = {
  number: (value: number) => new Intl.NumberFormat('en-GB').format(value),
  percent: (value: number) => `${value.toFixed(Number.isInteger(value) ? 0 : 1)}%`,
  usd: (value: number) => {
    const absolute = Math.abs(value);
    const compact =
      absolute >= 1_000_000
        ? `${(absolute / 1_000_000).toFixed(absolute % 1_000_000 ? 1 : 0)}m`
        : `${Math.round(absolute / 1_000)}k`;
    return `${value < 0 ? '−' : ''}$${compact}`;
  },
  date: (value: string) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(value),
    ),
};

export function getUser(userId: string) {
  return atlas.users.find((user) => user.id === userId);
}

export function getDepartment(departmentId: string | null) {
  return atlas.departments.find((department) => department.id === departmentId);
}

export function getCycle(cycleId: string) {
  return atlas.reportingCycles.find((cycle) => cycle.id === cycleId) ?? atlas.reportingCycles[0];
}

export function getAsset(assetId: string) {
  return atlas.assets.find((asset) => asset.id === assetId) ?? atlas.assets[0];
}

export function getDepartmentReports(userId: string) {
  return atlas.departmentReports.filter((report) => report.managerId === userId);
}

export function getReadiness() {
  const { approvedReports, requiredReports, reportingReadinessPercent } = atlas.commercialDashboard;
  return { approvedReports, requiredReports, reportingReadinessPercent };
}

export function getProductionKpis() {
  const kpis = atlas.production.kpis;
  return {
    actual: kpis.grossOilActualBopd,
    plan: kpis.grossOilPlanBopd,
    variance: kpis.grossOilVarianceBopd,
    variancePercent: kpis.grossOilVariancePercent,
    status: kpis.status,
  };
}

export type ProductionInterest = 'gross' | 'working_interest';

export function getProductionScope(
  fieldId = 'asset_oml30',
  interest: ProductionInterest = 'gross',
) {
  const multiplier =
    interest === 'working_interest' ? atlas.organisation.workingInterestPercent / 100 : 1;
  const selectedFields =
    fieldId === 'asset_oml30'
      ? atlas.production.fields
      : atlas.production.fields.filter((field) => field.fieldId === fieldId);
  const actual = selectedFields.reduce((sum, field) => sum + field.actualBopd, 0) * multiplier;
  const plan = selectedFields.reduce((sum, field) => sum + field.planBopd, 0) * multiplier;
  const variance = actual - plan;
  return {
    actual: Math.round(actual),
    plan: Math.round(plan),
    variance: Math.round(variance),
    variancePercent: plan ? Number(((variance / plan) * 100).toFixed(1)) : 0,
    fieldCount: selectedFields.length,
    interest,
  };
}

export function getLiquidity() {
  const { unrestrictedCashUsd, restrictedCashUsd, undrawnFacilitiesUsd } = atlas.finance.kpis;
  return {
    unrestrictedCashUsd,
    restrictedCashUsd,
    undrawnFacilitiesUsd,
    availableLiquidityUsd: unrestrictedCashUsd + restrictedCashUsd + undrawnFacilitiesUsd,
    runwayMonths: atlas.finance.kpis.runwayMonths,
  };
}

export function getExecutiveMetrics() {
  return {
    production: getProductionKpis(),
    liquidity: getLiquidity(),
    hse: atlas.hse.kpis,
    legal: atlas.legalRegulatory.kpis,
  };
}

export function buildSyntheticExport(title: string) {
  return `${title}\nGenerated ${format.date(atlas.meta.asOf)}\n\n${atlas.meta.disclosure}`;
}

export function getSourceReference(entityPath: string) {
  return atlas.sourceReferences.find((reference) => reference.entityPath === entityPath);
}

export const phase1Domain = {
  businessUnits: atlas.businessUnits as BusinessUnit[],
  planningPeriods: atlas.planningPeriods as PlanningPeriod[],
  businessPlans: atlas.businessPlans as BusinessPlan[],
  strategicThemes: atlas.strategicThemes as StrategicTheme[],
  strategicObjectives: atlas.strategicObjectives as StrategicObjective[],
  kpiDefinitions: atlas.kpiDefinitions as KpiDefinition[],
  kpiTargets: atlas.kpiTargets as KpiTarget[],
  approvedBudgets: atlas.approvedBudgets as ApprovedBudget[],
  budgetLines: atlas.budgetLines as BudgetLine[],
  projects: atlas.projects as ProjectInitiative[],
  initiatives: atlas.initiatives as ProjectInitiative[],
  milestones: atlas.milestones as Milestone[],
  operationalActivities: atlas.operationalActivities as OperationalActivity[],
  commitments: atlas.executionCommitments as Commitment[],
  weeklyExecutionUpdates: atlas.weeklyExecutionUpdates as WeeklyExecutionUpdate[],
  risks: atlas.executionRisks as ExecutionRisk[],
  decisionSupportItems: atlas.decisionSupportItems as DecisionSupportItem[],
  decisions: atlas.decisions as DecisionRecord[],
  evidenceRecords: atlas.evidenceRecords as EvidenceRecord[],
  outputs: atlas.outputs as OutputRecord[],
  historicalRevisions: atlas.historicalRevisions as HistoricalRevision[],
};

export function getBusinessUnit(businessUnitId: string) {
  return phase1Domain.businessUnits.find((item) => item.id === businessUnitId);
}

export function getBusinessPlan(businessUnitId: string, planningPeriodId?: string) {
  return phase1Domain.businessPlans.find(
    (item) =>
      item.businessUnitId === businessUnitId &&
      (!planningPeriodId || item.planningPeriodId === planningPeriodId),
  );
}

export function getStrategicObjective(objectiveId: string) {
  return phase1Domain.strategicObjectives.find((item) => item.id === objectiveId);
}

export function getObjectiveKpis(objectiveId: string) {
  const definitions = phase1Domain.kpiDefinitions.filter(
    (item) => item.strategicObjectiveId === objectiveId,
  );
  return definitions.map((definition) => ({
    definition,
    target: phase1Domain.kpiTargets.find((target) => target.kpiId === definition.id),
  }));
}

export function getBusinessPlanDelivery(businessUnitId: string) {
  const objectives = phase1Domain.strategicObjectives.filter(
    (item) => item.businessUnitId === businessUnitId,
  );
  const deliveryPercent = objectives.length
    ? Math.round(
        objectives.reduce((total, objective) => total + objective.progressPercent, 0) /
          objectives.length,
      )
    : 0;
  return {
    deliveryPercent,
    status: objectives.some((item) => ['critical', 'at_risk'].includes(item.status))
      ? 'at_risk'
      : 'on_track',
    objectives,
  };
}

export function getLinkedRevisions(entityId: string) {
  return phase1Domain.historicalRevisions.filter((item) => item.entityId === entityId);
}

export function hasCompleteTraceability(record: {
  businessUnitId?: string;
  strategicObjectiveIds?: string[];
  ownerId?: string | null;
  reportingPeriodId?: string | null;
  evidenceIds?: string[];
  historicalRevisionIds?: string[];
}) {
  return Boolean(
    record.businessUnitId &&
    record.strategicObjectiveIds?.length &&
    record.ownerId &&
    record.reportingPeriodId &&
    record.evidenceIds &&
    record.historicalRevisionIds,
  );
}
