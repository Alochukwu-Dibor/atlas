import { atlas } from '../data/atlas';

export type PlanStage =
  'upload' | 'uploading' | 'extracting' | 'review' | 'confirm' | 'confirmed' | 'error';

export type PlanFieldType = 'text' | 'number' | 'currency' | 'percentage' | 'date';
export type PlanReviewSection = 'project' | 'budget' | 'timeline' | 'kpis' | 'milestones';

export interface PlanFile {
  name: string;
  size: number;
  type: string;
}

export interface ProjectBudget {
  id: string;
  projectId: string;
  budgetLineId: string;
  approvedAmount: number;
  currency: string;
}

export interface ProjectTimeline {
  id: string;
  projectId: string;
  startDate: string;
  endDate: string;
}

export interface PlanKpi {
  id: string;
  projectId: string;
  departmentId: string;
  name: string;
  unit: string;
}

export interface PlanTarget {
  id: string;
  projectId: string;
  kpiId: string;
  departmentId: string;
  approvedBaseline: number;
  unit: string;
}

export interface PlanMilestone {
  id: string;
  projectId: string;
  departmentId: string;
  name: string;
  dueDate: string;
}

export interface PlanCustomField {
  id: string;
  projectId: string;
  section: PlanReviewSection;
  name: string;
  type: PlanFieldType;
  value: string;
}

export interface ProjectBaseline {
  id: string;
  name: string;
  departmentId: string;
  strategicObjectiveIds: string[];
  budget: ProjectBudget;
  timeline: ProjectTimeline;
  kpis: PlanKpi[];
  targets: PlanTarget[];
  milestones: PlanMilestone[];
}

export interface ConfirmedPlanBaseline {
  id: string;
  businessPlanId: string;
  businessUnitId: string;
  planningPeriodId: string;
  name: string;
  file: PlanFile;
  projects: ProjectBaseline[];
  customFields: PlanCustomField[];
  totalApprovedBudget: number;
  confirmedAt: string;
  confirmedBy: string;
  status: 'confirmed_tracking_baseline';
}

export interface PlanConfirmationState {
  confirmedPlan: ConfirmedPlanBaseline | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
}

export interface PlanValidationIssue {
  id: string;
  projectId: string | null;
  field: string;
  message: string;
}

export interface PlanState extends PlanConfirmationState {
  version: 1;
  stage: PlanStage;
  file: PlanFile | null;
  extractionProgress: number;
  extractionMessage: string;
  projects: ProjectBaseline[];
  customFields: PlanCustomField[];
  hasUnsavedEdits: boolean;
  error: string | null;
}

export type PlanAction =
  | { type: 'SELECT_FILE'; file: PlanFile }
  | { type: 'REMOVE_FILE' }
  | { type: 'START_UPLOAD' }
  | { type: 'START_EXTRACTION' }
  | { type: 'SET_EXTRACTION_PROGRESS'; progress: number; message: string }
  | { type: 'COMPLETE_EXTRACTION' }
  | { type: 'SET_STAGE'; stage: 'review' | 'confirm' }
  | { type: 'UPDATE_PROJECT'; projectId: string; field: 'name' | 'departmentId'; value: string }
  | { type: 'UPDATE_BUDGET'; projectId: string; value: number }
  | { type: 'UPDATE_TIMELINE'; projectId: string; field: 'startDate' | 'endDate'; value: string }
  | { type: 'ADD_PROJECT'; project: ProjectBaseline }
  | { type: 'REMOVE_PROJECT'; projectId: string }
  | { type: 'ADD_KPI'; projectId: string; kpi: PlanKpi; target: PlanTarget }
  | {
      type: 'UPDATE_KPI';
      projectId: string;
      kpiId: string;
      field: 'name' | 'unit' | 'departmentId';
      value: string;
    }
  | { type: 'UPDATE_TARGET'; projectId: string; targetId: string; value: number }
  | { type: 'REMOVE_KPI'; projectId: string; kpiId: string }
  | { type: 'ADD_MILESTONE'; projectId: string; milestone: PlanMilestone }
  | {
      type: 'UPDATE_MILESTONE';
      projectId: string;
      milestoneId: string;
      field: 'name' | 'dueDate' | 'departmentId';
      value: string;
    }
  | { type: 'REMOVE_MILESTONE'; projectId: string; milestoneId: string }
  | { type: 'ADD_CUSTOM_FIELD'; field: PlanCustomField }
  | {
      type: 'UPDATE_CUSTOM_FIELD';
      fieldId: string;
      field: 'name' | 'type' | 'value' | 'section' | 'projectId';
      value: string;
    }
  | { type: 'REMOVE_CUSTOM_FIELD'; fieldId: string }
  | { type: 'CONFIRM_PLAN'; actorId: string; now: string }
  | { type: 'RESTART' }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'RESET' };

export const planStorageKey = 'atlas-plan-v1';

const extraction = atlas.approvedPlanExtraction;

function extractedProjects(): ProjectBaseline[] {
  return extraction.projectBaselines.map((fixture) => {
    const project = atlas.projects.find((item) => item.id === fixture.projectId)!;
    const kpis: PlanKpi[] = fixture.kpiIds.map((id) => {
      const kpi = atlas.kpiDefinitions.find((item) => item.id === id)!;
      const target = atlas.kpiTargets.find((item) => item.kpiId === id);
      return {
        id: kpi.id,
        projectId: project.id,
        departmentId: target?.departmentId ?? project.ownerDepartmentId,
        name: kpi.name,
        unit: kpi.unit,
      };
    });
    return {
      id: project.id,
      name: project.name,
      departmentId: project.ownerDepartmentId,
      strategicObjectiveIds: [...project.strategicObjectiveIds],
      budget: {
        id: `${fixture.budgetLineId}_${project.id}`,
        projectId: project.id,
        budgetLineId: fixture.budgetLineId,
        approvedAmount: fixture.approvedBudget,
        currency: fixture.currency,
      },
      timeline: {
        id: `timeline_${project.id}`,
        projectId: project.id,
        startDate: fixture.startDate,
        endDate: fixture.endDate,
      },
      kpis,
      targets: fixture.targetIds.map((id) => {
        const target = atlas.kpiTargets.find((item) => item.id === id)!;
        const kpi = atlas.kpiDefinitions.find((item) => item.id === target.kpiId)!;
        return {
          id: `${target.id}_${project.id}`,
          projectId: project.id,
          kpiId: target.kpiId,
          departmentId: target.departmentId,
          approvedBaseline: target.approvedBaseline,
          unit: kpi.unit,
        };
      }),
      milestones: fixture.milestoneIds.map((id) => {
        const milestone = atlas.milestones.find((item) => item.id === id)!;
        return {
          id: milestone.id,
          projectId: project.id,
          departmentId: project.ownerDepartmentId,
          name: milestone.name,
          dueDate: milestone.dueDate,
        };
      }),
    };
  });
}

export function initialPlanState(): PlanState {
  return {
    version: 1,
    stage: 'upload',
    file: null,
    extractionProgress: 0,
    extractionMessage: 'Waiting for an approved plan file.',
    projects: [],
    customFields: [],
    hasUnsavedEdits: false,
    error: null,
    confirmedPlan: null,
    confirmedAt: null,
    confirmedBy: null,
  };
}

export function loadPlanState(): PlanState {
  try {
    const stored = window.localStorage.getItem(planStorageKey);
    if (!stored) return initialPlanState();
    const parsed = JSON.parse(stored) as Partial<PlanState>;
    if (parsed.version !== 1) return initialPlanState();
    return { ...initialPlanState(), ...parsed };
  } catch {
    return initialPlanState();
  }
}

function updateProject(
  projects: ProjectBaseline[],
  projectId: string,
  updater: (project: ProjectBaseline) => ProjectBaseline,
) {
  return projects.map((project) => (project.id === projectId ? updater(project) : project));
}

export function validatePlan(state: Pick<PlanState, 'projects' | 'customFields'>) {
  const issues: PlanValidationIssue[] = [];
  if (state.projects.length === 0) {
    issues.push({
      id: 'projects-empty',
      projectId: null,
      field: 'projects',
      message: 'At least one project is required.',
    });
  }
  state.projects.forEach((project) => {
    if (!project.name.trim())
      issues.push({
        id: `${project.id}-name`,
        projectId: project.id,
        field: 'name',
        message: 'Project name is required.',
      });
    if (!project.departmentId)
      issues.push({
        id: `${project.id}-department`,
        projectId: project.id,
        field: 'departmentId',
        message: 'Project department is required.',
      });
    if (!(project.budget.approvedAmount > 0))
      issues.push({
        id: `${project.id}-budget`,
        projectId: project.id,
        field: 'budget',
        message: 'Approved project budget must be greater than zero.',
      });
    if (!project.timeline.startDate || !project.timeline.endDate)
      issues.push({
        id: `${project.id}-timeline`,
        projectId: project.id,
        field: 'timeline',
        message: 'Project start and end dates are required.',
      });
    if (
      project.timeline.startDate &&
      project.timeline.endDate &&
      project.timeline.startDate > project.timeline.endDate
    )
      issues.push({
        id: `${project.id}-timeline-order`,
        projectId: project.id,
        field: 'timeline',
        message: 'Project end date must be after its start date.',
      });
    if (project.kpis.length === 0)
      issues.push({
        id: `${project.id}-kpis`,
        projectId: project.id,
        field: 'kpis',
        message: 'At least one KPI is required for each project.',
      });
    project.kpis.forEach((kpi) => {
      if (!kpi.name.trim() || !kpi.unit.trim() || !kpi.departmentId)
        issues.push({
          id: `${project.id}-${kpi.id}`,
          projectId: project.id,
          field: 'kpis',
          message: 'Every KPI requires a name, unit and department.',
        });
      const target = project.targets.find((item) => item.kpiId === kpi.id);
      if (!target || !Number.isFinite(target.approvedBaseline))
        issues.push({
          id: `${project.id}-${kpi.id}-target`,
          projectId: project.id,
          field: 'targets',
          message: `A numeric approved target is required for ${kpi.name || 'this KPI'}.`,
        });
    });
    project.milestones.forEach((milestone) => {
      if (!milestone.name.trim() || !milestone.dueDate)
        issues.push({
          id: `${project.id}-${milestone.id}`,
          projectId: project.id,
          field: 'milestones',
          message: 'Every milestone requires a name and due date.',
        });
    });
  });
  state.customFields.forEach((field) => {
    if (!field.name.trim() || !field.value.trim())
      issues.push({
        id: field.id,
        projectId: field.projectId,
        field: 'customFields',
        message: 'Custom fields require both a name and value.',
      });
  });
  return issues;
}

export function planReducer(state: PlanState, action: PlanAction): PlanState {
  const edited = (projects: ProjectBaseline[], customFields = state.customFields): PlanState => ({
    ...state,
    projects,
    customFields,
    hasUnsavedEdits: true,
    error: null,
  });
  switch (action.type) {
    case 'SELECT_FILE':
      return { ...initialPlanState(), file: action.file };
    case 'REMOVE_FILE':
    case 'RESTART':
      return initialPlanState();
    case 'START_UPLOAD':
      return state.file
        ? { ...state, stage: 'uploading', error: null }
        : { ...state, error: 'Select an approved plan file first.' };
    case 'START_EXTRACTION':
      return {
        ...state,
        stage: 'extracting',
        extractionProgress: 15,
        extractionMessage: 'Reading approved plan structure…',
      };
    case 'SET_EXTRACTION_PROGRESS':
      return { ...state, extractionProgress: action.progress, extractionMessage: action.message };
    case 'COMPLETE_EXTRACTION':
      return {
        ...state,
        stage: 'review',
        extractionProgress: 100,
        extractionMessage: 'Extraction complete.',
        projects: extractedProjects(),
        customFields: [],
        hasUnsavedEdits: false,
        error: null,
      };
    case 'SET_STAGE':
      return { ...state, stage: action.stage };
    case 'UPDATE_PROJECT':
      return edited(
        updateProject(state.projects, action.projectId, (project) => ({
          ...project,
          [action.field]: action.value,
        })),
      );
    case 'UPDATE_BUDGET':
      return edited(
        updateProject(state.projects, action.projectId, (project) => ({
          ...project,
          budget: { ...project.budget, approvedAmount: action.value },
        })),
      );
    case 'UPDATE_TIMELINE':
      return edited(
        updateProject(state.projects, action.projectId, (project) => ({
          ...project,
          timeline: { ...project.timeline, [action.field]: action.value },
        })),
      );
    case 'ADD_PROJECT':
      return edited([...state.projects, action.project]);
    case 'REMOVE_PROJECT':
      return edited(
        state.projects.filter((project) => project.id !== action.projectId),
        state.customFields.filter((field) => field.projectId !== action.projectId),
      );
    case 'ADD_KPI':
      return edited(
        updateProject(state.projects, action.projectId, (project) => ({
          ...project,
          kpis: [...project.kpis, action.kpi],
          targets: [...project.targets, action.target],
        })),
      );
    case 'UPDATE_KPI':
      return edited(
        updateProject(state.projects, action.projectId, (project) => ({
          ...project,
          kpis: project.kpis.map((kpi) =>
            kpi.id === action.kpiId ? { ...kpi, [action.field]: action.value } : kpi,
          ),
          targets:
            action.field === 'unit'
              ? project.targets.map((target) =>
                  target.kpiId === action.kpiId ? { ...target, unit: action.value } : target,
                )
              : project.targets,
        })),
      );
    case 'UPDATE_TARGET':
      return edited(
        updateProject(state.projects, action.projectId, (project) => ({
          ...project,
          targets: project.targets.map((target) =>
            target.id === action.targetId ? { ...target, approvedBaseline: action.value } : target,
          ),
        })),
      );
    case 'REMOVE_KPI':
      return edited(
        updateProject(state.projects, action.projectId, (project) => ({
          ...project,
          kpis: project.kpis.filter((kpi) => kpi.id !== action.kpiId),
          targets: project.targets.filter((target) => target.kpiId !== action.kpiId),
        })),
      );
    case 'ADD_MILESTONE':
      return edited(
        updateProject(state.projects, action.projectId, (project) => ({
          ...project,
          milestones: [...project.milestones, action.milestone],
        })),
      );
    case 'UPDATE_MILESTONE':
      return edited(
        updateProject(state.projects, action.projectId, (project) => ({
          ...project,
          milestones: project.milestones.map((milestone) =>
            milestone.id === action.milestoneId
              ? { ...milestone, [action.field]: action.value }
              : milestone,
          ),
        })),
      );
    case 'REMOVE_MILESTONE':
      return edited(
        updateProject(state.projects, action.projectId, (project) => ({
          ...project,
          milestones: project.milestones.filter((milestone) => milestone.id !== action.milestoneId),
        })),
      );
    case 'ADD_CUSTOM_FIELD':
      return edited(state.projects, [...state.customFields, action.field]);
    case 'UPDATE_CUSTOM_FIELD':
      return edited(
        state.projects,
        state.customFields.map((field) =>
          field.id === action.fieldId ? { ...field, [action.field]: action.value } : field,
        ),
      );
    case 'REMOVE_CUSTOM_FIELD':
      return edited(
        state.projects,
        state.customFields.filter((field) => field.id !== action.fieldId),
      );
    case 'CONFIRM_PLAN': {
      const issues = validatePlan(state);
      if (!state.file || issues.length)
        return {
          ...state,
          error: !state.file
            ? 'The approved plan file is missing.'
            : 'Resolve validation issues before confirming the baseline.',
        };
      const confirmedPlan: ConfirmedPlanBaseline = {
        id: `confirmed_${extraction.businessPlanId}`,
        businessPlanId: extraction.businessPlanId,
        businessUnitId: extraction.businessUnitId,
        planningPeriodId: extraction.planningPeriodId,
        name:
          atlas.businessPlans.find((item) => item.id === extraction.businessPlanId)?.name ??
          'Approved business plan',
        file: state.file,
        projects: state.projects,
        customFields: state.customFields,
        totalApprovedBudget: state.projects.reduce(
          (sum, project) => sum + project.budget.approvedAmount,
          0,
        ),
        confirmedAt: action.now,
        confirmedBy: action.actorId,
        status: 'confirmed_tracking_baseline',
      };
      return {
        ...state,
        stage: 'confirmed',
        confirmedPlan,
        confirmedAt: action.now,
        confirmedBy: action.actorId,
        hasUnsavedEdits: false,
        error: null,
      };
    }
    case 'SET_ERROR':
      return { ...state, stage: 'error', error: action.message };
    case 'RESET':
      return initialPlanState();
    default:
      return state;
  }
}

export function getApprovedPlanFixtureFile(): PlanFile {
  return { ...extraction.sourceFile };
}
