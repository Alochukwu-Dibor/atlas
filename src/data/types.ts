export interface EntityLinkage {
  businessUnitId: string;
  strategicObjectiveIds: string[];
  departmentId?: string | null;
  ownerId?: string | null;
  reportingPeriodId?: string | null;
  projectId?: string | null;
  assetId?: string | null;
  evidenceIds: string[];
  historicalRevisionIds: string[];
}

export interface PlanningPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'approved' | 'closed';
}

export interface BusinessUnit {
  id: string;
  name: string;
  ownerId: string;
  assetIds: string[];
}

export interface BusinessPlan {
  id: string;
  businessUnitId: string;
  planningPeriodId: string;
  name: string;
  status: 'draft' | 'approved' | 'superseded';
  approvedAt: string;
  approvedBy: string;
  strategicThemeIds: string[];
  approvedBudgetId: string;
  historicalRevisionIds: string[];
}

export interface StrategicTheme {
  id: string;
  businessPlanId: string;
  name: string;
  description: string;
  ownerId: string;
  strategicObjectiveIds: string[];
}

export interface StrategicObjective extends EntityLinkage {
  id: string;
  businessPlanId: string;
  strategicThemeId: string;
  name: string;
  description: string;
  status: string;
  progressPercent: number;
  kpiIds: string[];
  budgetLineIds: string[];
  projectIds: string[];
  initiativeIds: string[];
  activityIds: string[];
  commitmentIds: string[];
  riskIds: string[];
  decisionIds: string[];
}

export interface KpiDefinition {
  id: string;
  name: string;
  category: string;
  formula: string;
  unit: string;
  frequency: string;
  ownerId: string;
  strategicObjectiveId: string;
  contributesToBusinessHealth: boolean;
  executiveVisibility: ('ceo' | 'cfo')[];
  targetId: string;
}

export interface KpiTarget extends EntityLinkage {
  id: string;
  kpiId: string;
  planningPeriodId: string;
  approvedBaseline: number;
  actual: number;
  currentForecast: number;
  priorForecast: number;
  variance: number;
  status: string;
}

export interface ApprovedBudget {
  id: string;
  businessPlanId: string;
  planningPeriodId: string;
  businessUnitId: string;
  currency: string;
  approvedAmount: number;
  approvedAt: string;
  approvedBy: string;
  budgetLineIds: string[];
  historicalRevisionIds: string[];
}

export interface BudgetLine extends EntityLinkage {
  id: string;
  approvedBudgetId: string;
  name: string;
  category: 'opex' | 'capex';
  approvedBaseline: number;
  committed: number;
  actual: number;
  currentForecast: number;
  priorForecast: number;
}

export interface ProjectInitiative extends EntityLinkage {
  id: string;
  type: 'project' | 'initiative';
  name: string;
  status: string;
  progressPercent: number;
  approvedBudgetLineId?: string;
  milestoneIds: string[];
  activityIds: string[];
  commitmentIds: string[];
  riskIds: string[];
  decisionIds: string[];
}

export interface Milestone {
  id: string;
  name: string;
  projectId?: string | null;
  dueDate: string;
  status: string;
}

export interface OperationalActivity extends EntityLinkage {
  id: string;
  title: string;
  status: string;
  linkedKpiIds: string[];
  progressPercent: number;
  blocker?: string | null;
  expectedCompletion: string;
  riskIds: string[];
}

export interface Commitment extends EntityLinkage {
  id: string;
  description: string;
  dueDate: string;
  expectedResult: string;
  status: string;
  delayReason?: string | null;
  revisedForecast?: string | null;
  revisionCount: number;
  linkedKpiId?: string | null;
  linkedActivityId?: string | null;
}

export interface WeeklyExecutionUpdate extends EntityLinkage {
  id: string;
  title: string;
  status: string;
  submissionMethods: string[];
  executiveHighlight: string;
  kpiUpdateIds: string[];
  completedActivityIds: string[];
  ongoingActivityIds: string[];
  previousCommitmentIds: string[];
  newCommitmentIds: string[];
  riskIds: string[];
  forecastChanges: string;
  nextWeekPlan: string;
  supportRequired: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
}

export interface ExecutionRisk extends EntityLinkage {
  id: string;
  description: string;
  category: string;
  status: string;
  impact: string;
  likelihood: string;
  trend: string;
  financialExposure: number;
  mitigation: string;
  commitmentIds: string[];
  decisionIds: string[];
}

export interface DecisionSupportItem extends EntityLinkage {
  id: string;
  type: string;
  issue: string;
  whyItMatters: string;
  businessImpact: string;
  historicalContext: string;
  recommendedAction: string;
  dueDate: string;
  status: string;
  finalDecision?: string | null;
  approvedBy?: string | null;
}

export interface DecisionRecord extends EntityLinkage {
  id: string;
  decisionSupportItemId: string;
  issue: string;
  decisionType: string;
  rationale: string;
  finalDecision: string;
  approvedBy: string;
  dueDate: string;
  status: string;
  createdBy: string;
  createdAt: string;
}

export interface EvidenceRecord extends EntityLinkage {
  id: string;
  name: string;
  type: string;
  sourceId?: string | null;
  locator: string;
  validationStatus: string;
}

export interface OutputRecord extends EntityLinkage {
  id: string;
  name: string;
  audience: 'management' | 'executive_governance' | 'regulatory';
  readinessStatus: string;
  missingInputIds: string[];
  lastGeneratedAt?: string | null;
  authorId?: string | null;
  templateId: string;
}

export interface HistoricalRevision {
  id: string;
  entityType: string;
  entityId: string;
  reportingPeriodId: string;
  previousValue: string;
  currentValue: string;
  explanation: string;
  actorId: string;
  reviewerId?: string | null;
  evidenceIds: string[];
  createdAt: string;
}
