import { atlas, getDepartment, getUser } from '../data/atlas';

export type ReportStatus =
  'draft' | 'submitted' | 'needs_clarification' | 'resubmitted' | 'approved' | 'published_locked';

export type SourceMethod =
  'structured_form' | 'document_upload' | 'xlsx_upload' | 'paste_email_or_transcript';

export type SourceStatus =
  | 'uploading'
  | 'processing'
  | 'extracted'
  | 'partial'
  | 'invalid'
  | 'conflict'
  | 'failed_extraction'
  | 'unsupported';

export interface StandardField {
  key: string;
  label: string;
  value: string;
  unit?: string;
  required: boolean;
  sourceIds: string[];
  confidence: number;
}

export interface WorkflowSource {
  id: string;
  reportId: string;
  method: SourceMethod;
  subtype?: 'email' | 'call_transcript';
  name: string;
  status: SourceStatus;
  addedAt: string;
  reference: string;
  excerpt: string;
  extractedValues: Record<string, string>;
  error?: string;
  supersededBy?: string;
}

export interface ManagerCorrection {
  id: string;
  reportId: string;
  fieldKey: string;
  fieldLabel: string;
  sourceId: string;
  originalValue: string;
  correctedValue: string;
  reason: string;
  actorId: string;
  timestamp: string;
}

export interface ControlledOverride {
  id: string;
  reportId: string;
  fieldKey: string;
  fieldLabel: string;
  departmentValue: string;
  revisedValue: string;
  reason: string;
  reviewerId: string;
  timestamp: string;
}

export interface WorkflowComment {
  id: string;
  reportId: string;
  field: string;
  authorId: string;
  question: string;
  response?: string;
  status: 'open' | 'resolved';
  createdAt: string;
  dueDate?: string;
}

export interface WorkflowAuditEvent {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  summary: string;
  before?: string;
  after?: string;
}

export interface WorkflowReport {
  id: string;
  cycleId: string;
  departmentId: string;
  managerId: string | null;
  projectId: string;
  title: string;
  methods: SourceMethod[];
  status: ReportStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  sourceIds: string[];
  fields: StandardField[];
  certification: boolean;
  revision: number;
  clarificationAnswered: boolean;
}

export interface WorkflowState {
  version: 2;
  reports: WorkflowReport[];
  sources: WorkflowSource[];
  comments: WorkflowComment[];
  corrections: ManagerCorrection[];
  overrides: ControlledOverride[];
  auditEvents: WorkflowAuditEvent[];
  lastError: string | null;
}

function normaliseStatus(status: string): ReportStatus {
  if (status === 'locked') return 'published_locked';
  if (
    [
      'draft',
      'submitted',
      'needs_clarification',
      'resubmitted',
      'approved',
      'published_locked',
    ].includes(status)
  ) {
    return status as ReportStatus;
  }
  return 'draft';
}

function normaliseSourceStatus(status: string): SourceStatus {
  if (status === 'in_progress') return 'extracted';
  if (status === 'missing_confirmation') return 'partial';
  if (
    [
      'uploading',
      'processing',
      'extracted',
      'partial',
      'invalid',
      'conflict',
      'failed_extraction',
      'unsupported',
    ].includes(status)
  ) {
    return status as SourceStatus;
  }
  return 'extracted';
}

function fieldsForReport(reportId: string, departmentId: string): StandardField[] {
  if (departmentId === 'dept_finance') {
    return [
      {
        key: 'availableLiquidityUsd',
        label: 'Available liquidity',
        value: String(atlas.finance.kpis.availableLiquidityUsd),
        unit: 'USD',
        required: true,
        sourceIds: ['src_fin_xlsx'],
        confidence: 0.99,
      },
      {
        key: 'unrestrictedCashUsd',
        label: 'Unrestricted cash',
        value: String(atlas.finance.kpis.unrestrictedCashUsd),
        unit: 'USD',
        required: true,
        sourceIds: ['src_fin_xlsx', 'src_fin_pdf'],
        confidence: 0.82,
      },
      {
        key: 'nextRepaymentUsd',
        label: 'Next financing repayment',
        value: String(atlas.finance.kpis.nextRepaymentUsd),
        unit: 'USD',
        required: true,
        sourceIds: ['src_fin_xlsx'],
        confidence: 0.99,
      },
    ];
  }
  return [
    {
      key: 'grossOilActualBopd',
      label: 'Gross oil production',
      value: String(atlas.production.kpis.grossOilActualBopd),
      unit: 'bopd',
      required: true,
      sourceIds: reportId.includes('w31') ? ['src_ops_w31_form'] : ['src_ops_xlsx'],
      confidence: 0.99,
    },
    {
      key: 'grossOilPlanBopd',
      label: 'Approved production baseline',
      value: String(atlas.production.kpis.grossOilPlanBopd),
      unit: 'bopd',
      required: true,
      sourceIds: reportId.includes('w31') ? ['src_ops_w31_form'] : ['src_ops_form'],
      confidence: 1,
    },
    {
      key: 'primaryConstraint',
      label: 'Primary constraint',
      value: atlas.production.kpis.primaryConstraint,
      required: true,
      sourceIds: reportId.includes('w31') ? ['src_ops_w31_form'] : ['src_ops_email'],
      confidence: 0.96,
    },
  ];
}

export function createInitialWorkflowState(): WorkflowState {
  const reports: WorkflowReport[] = atlas.departmentReports.map((report) => ({
    id: report.id,
    cycleId: report.cycleId,
    departmentId: report.departmentId,
    managerId: report.managerId,
    projectId: report.projectId,
    title: report.title,
    methods: report.methods as SourceMethod[],
    status: normaliseStatus(report.status),
    submittedAt: report.submittedAt,
    approvedAt: report.approvedAt,
    sourceIds: [...report.sourceIds],
    fields: fieldsForReport(report.id, report.departmentId),
    certification: report.status !== 'draft',
    revision: report.status === 'needs_clarification' ? 1 : 0,
    clarificationAnswered: false,
  }));

  const sources: WorkflowSource[] = atlas.sources.map((source) => ({
    id: source.id,
    reportId: source.reportId,
    method: source.type as SourceMethod,
    subtype:
      'sourceSubtype' in source ? (source.sourceSubtype as 'email' | 'call_transcript') : undefined,
    name: source.name,
    status: normaliseSourceStatus(source.status),
    addedAt: source.addedAt,
    reference:
      atlas.sourceReferences.find((reference) => reference.sourceId === source.id)?.locator ??
      'Fixture source record',
    excerpt:
      atlas.sourceReferences.find((reference) => reference.sourceId === source.id)?.excerpt ??
      'Synthetic source fixture retained for prototype review.',
    extractedValues: {},
  }));

  const comments: WorkflowComment[] = atlas.reviewComments.map((comment) => ({
    id: comment.id,
    reportId: comment.reportId,
    field: comment.field,
    authorId: comment.authorId,
    question: comment.question,
    status: comment.status as 'open' | 'resolved',
    createdAt: comment.createdAt,
    dueDate: comment.dueDate,
  }));

  const auditEvents: WorkflowAuditEvent[] = atlas.auditEvents.map((event) => ({
    id: event.id,
    actorId: event.actorId,
    actorRole: getUser(event.actorId)?.role ?? 'prototype_admin',
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    timestamp: event.timestamp,
    summary: event.summary,
  }));

  return {
    version: 2,
    reports,
    sources,
    comments,
    corrections: [],
    overrides: [],
    auditEvents,
    lastError: null,
  };
}

function audit(
  state: WorkflowState,
  event: Omit<WorkflowAuditEvent, 'id' | 'actorRole'> & { actorRole?: string },
): WorkflowAuditEvent[] {
  return [
    ...state.auditEvents,
    {
      ...event,
      id: `audit_${state.auditEvents.length + 1}_${event.timestamp}`,
      actorRole: event.actorRole ?? getUser(event.actorId)?.role ?? 'prototype_admin',
    },
  ];
}

export type WorkflowAction =
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' }
  | { type: 'UPDATE_REPORT_DETAILS'; reportId: string; title: string; methods: SourceMethod[] }
  | { type: 'ADD_SOURCE'; source: WorkflowSource; actorId: string }
  | {
      type: 'REPLACE_SOURCE';
      reportId: string;
      sourceId: string;
      replacement: WorkflowSource;
      actorId: string;
    }
  | { type: 'REMOVE_SOURCE'; reportId: string; sourceId: string; actorId: string; now: string }
  | { type: 'CORRECT_FIELD'; correction: ManagerCorrection }
  | { type: 'SUBMIT_REPORT'; reportId: string; actorId: string; now: string }
  | { type: 'REQUEST_CLARIFICATION'; comment: WorkflowComment }
  | {
      type: 'RESPOND_CLARIFICATION';
      reportId: string;
      commentId: string;
      response: string;
      actorId: string;
      now: string;
    }
  | { type: 'APPROVE_REPORT'; reportId: string; actorId: string; now: string }
  | { type: 'APPLY_OVERRIDE'; override: ControlledOverride };

function updateReport(
  reports: WorkflowReport[],
  reportId: string,
  updater: (report: WorkflowReport) => WorkflowReport,
) {
  return reports.map((report) => (report.id === reportId ? updater(report) : report));
}

export function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  if (action.type === 'RESET') return createInitialWorkflowState();
  if (action.type === 'CLEAR_ERROR') return { ...state, lastError: null };

  if (action.type === 'UPDATE_REPORT_DETAILS') {
    return {
      ...state,
      reports: updateReport(state.reports, action.reportId, (report) => ({
        ...report,
        title: action.title,
        methods: action.methods,
      })),
      lastError: null,
    };
  }

  if (action.type === 'ADD_SOURCE') {
    return {
      ...state,
      sources: [...state.sources, action.source],
      reports: updateReport(state.reports, action.source.reportId, (report) => ({
        ...report,
        sourceIds: [...report.sourceIds, action.source.id],
        methods: report.methods.includes(action.source.method)
          ? report.methods
          : [...report.methods, action.source.method],
      })),
      auditEvents: audit(state, {
        actorId: action.actorId,
        action: 'source_added',
        entityType: 'source',
        entityId: action.source.id,
        timestamp: action.source.addedAt,
        summary: `${action.source.name} added as a simulated ${action.source.method.replaceAll('_', ' ')} source.`,
      }),
      lastError: null,
    };
  }

  if (action.type === 'REPLACE_SOURCE') {
    const now = action.replacement.addedAt;
    return {
      ...state,
      sources: [
        ...state.sources.map((source) =>
          source.id === action.sourceId
            ? { ...source, supersededBy: action.replacement.id }
            : source,
        ),
        action.replacement,
      ],
      reports: updateReport(state.reports, action.reportId, (report) => ({
        ...report,
        sourceIds: report.sourceIds.map((id) =>
          id === action.sourceId ? action.replacement.id : id,
        ),
      })),
      auditEvents: audit(state, {
        actorId: action.actorId,
        action: 'source_replaced',
        entityType: 'source',
        entityId: action.sourceId,
        timestamp: now,
        summary: `Source replaced by ${action.replacement.name}; the prior extraction remains in audit history.`,
        before: action.sourceId,
        after: action.replacement.id,
      }),
      lastError: null,
    };
  }

  if (action.type === 'REMOVE_SOURCE') {
    return {
      ...state,
      sources: state.sources.filter((source) => source.id !== action.sourceId),
      reports: updateReport(state.reports, action.reportId, (report) => ({
        ...report,
        sourceIds: report.sourceIds.filter((id) => id !== action.sourceId),
      })),
      auditEvents: audit(state, {
        actorId: action.actorId,
        action: 'source_removed',
        entityType: 'source',
        entityId: action.sourceId,
        timestamp: action.now,
        summary: 'Source removed after dependency warning confirmation.',
      }),
      lastError: null,
    };
  }

  if (action.type === 'CORRECT_FIELD') {
    const correction = action.correction;
    return {
      ...state,
      corrections: [...state.corrections, correction],
      reports: updateReport(state.reports, correction.reportId, (report) => ({
        ...report,
        fields: report.fields.map((field) =>
          field.key === correction.fieldKey
            ? { ...field, value: correction.correctedValue }
            : field,
        ),
      })),
      auditEvents: audit(state, {
        actorId: correction.actorId,
        action: 'extracted_value_corrected',
        entityType: 'department_report',
        entityId: correction.reportId,
        timestamp: correction.timestamp,
        summary: `${correction.fieldLabel} corrected with manager explanation.`,
        before: correction.originalValue,
        after: correction.correctedValue,
      }),
      lastError: null,
    };
  }

  if (action.type === 'SUBMIT_REPORT') {
    const report = state.reports.find((item) => item.id === action.reportId);
    if (!report || !['draft', 'needs_clarification'].includes(report.status)) {
      return { ...state, lastError: 'Only Draft or Needs Clarification reports can be submitted.' };
    }
    if (report.status === 'needs_clarification' && !report.clarificationAnswered) {
      return { ...state, lastError: 'Respond to every clarification before resubmitting.' };
    }
    const nextStatus: ReportStatus =
      report.status === 'needs_clarification' ? 'resubmitted' : 'submitted';
    return {
      ...state,
      reports: updateReport(state.reports, action.reportId, (item) => ({
        ...item,
        status: nextStatus,
        certification: true,
        submittedAt: action.now,
        revision: nextStatus === 'resubmitted' ? item.revision + 1 : item.revision,
      })),
      auditEvents: audit(state, {
        actorId: action.actorId,
        action: nextStatus === 'resubmitted' ? 'report_resubmitted' : 'report_submitted',
        entityType: 'department_report',
        entityId: action.reportId,
        timestamp: action.now,
        summary: `Report certified and ${nextStatus === 'resubmitted' ? 'resubmitted' : 'submitted'} to Commercial review.`,
        before: report.status,
        after: nextStatus,
      }),
      lastError: null,
    };
  }

  if (action.type === 'REQUEST_CLARIFICATION') {
    const report = state.reports.find((item) => item.id === action.comment.reportId);
    if (!report || !['submitted', 'resubmitted'].includes(report.status)) {
      return { ...state, lastError: 'Clarification can only be requested on submitted reports.' };
    }
    return {
      ...state,
      comments: [...state.comments, action.comment],
      reports: updateReport(state.reports, report.id, (item) => ({
        ...item,
        status: 'needs_clarification',
        clarificationAnswered: false,
      })),
      auditEvents: audit(state, {
        actorId: action.comment.authorId,
        action: 'clarification_requested',
        entityType: 'department_report',
        entityId: report.id,
        timestamp: action.comment.createdAt,
        summary: `${action.comment.field}: ${action.comment.question}`,
        before: report.status,
        after: 'needs_clarification',
      }),
      lastError: null,
    };
  }

  if (action.type === 'RESPOND_CLARIFICATION') {
    const report = state.reports.find((item) => item.id === action.reportId);
    if (!report || report.status !== 'needs_clarification' || !action.response.trim()) {
      return { ...state, lastError: 'A returned report and response are required.' };
    }
    const comments = state.comments.map((comment) =>
      comment.id === action.commentId
        ? { ...comment, response: action.response, status: 'resolved' as const }
        : comment,
    );
    const allAnswered = comments
      .filter((comment) => comment.reportId === action.reportId)
      .every((comment) => comment.status === 'resolved');
    return {
      ...state,
      comments,
      reports: updateReport(state.reports, action.reportId, (item) => ({
        ...item,
        clarificationAnswered: allAnswered,
      })),
      auditEvents: audit(state, {
        actorId: action.actorId,
        action: 'clarification_answered',
        entityType: 'department_report',
        entityId: action.reportId,
        timestamp: action.now,
        summary: 'Department Manager answered a Commercial clarification in context.',
      }),
      lastError: null,
    };
  }

  if (action.type === 'APPROVE_REPORT') {
    const report = state.reports.find((item) => item.id === action.reportId);
    if (!report || !['submitted', 'resubmitted'].includes(report.status)) {
      return { ...state, lastError: 'Only Submitted or Resubmitted reports can be approved.' };
    }
    return {
      ...state,
      reports: updateReport(state.reports, action.reportId, (item) => ({
        ...item,
        status: 'approved',
        approvedAt: action.now,
      })),
      auditEvents: audit(state, {
        actorId: action.actorId,
        action: 'report_approved',
        entityType: 'department_report',
        entityId: action.reportId,
        timestamp: action.now,
        summary: 'Commercial Manager approved the report for consolidation.',
        before: report.status,
        after: 'approved',
      }),
      lastError: null,
    };
  }

  if (action.type === 'APPLY_OVERRIDE') {
    const override = action.override;
    const report = state.reports.find((item) => item.id === override.reportId);
    if (!report || !['submitted', 'resubmitted', 'approved'].includes(report.status)) {
      return { ...state, lastError: 'Controlled overrides require a reviewable report.' };
    }
    if (!override.reason.trim() || !override.revisedValue.trim()) {
      return { ...state, lastError: 'A revised value and reason are required for an override.' };
    }
    return {
      ...state,
      overrides: [...state.overrides, override],
      auditEvents: audit(state, {
        actorId: override.reviewerId,
        action: 'controlled_override_applied',
        entityType: 'department_report',
        entityId: override.reportId,
        timestamp: override.timestamp,
        summary: `${override.fieldLabel} overridden for consolidation; the department value is preserved.`,
        before: override.departmentValue,
        after: override.revisedValue,
      }),
      lastError: null,
    };
  }

  return state;
}

export const workflowStorageKey = 'atlas.prototype.workflow.v2';

export function loadWorkflowState(): WorkflowState {
  if (typeof window === 'undefined') return createInitialWorkflowState();
  try {
    const stored = window.localStorage.getItem(workflowStorageKey);
    if (!stored) return createInitialWorkflowState();
    const parsed = JSON.parse(stored) as WorkflowState;
    return parsed.version === 2 ? parsed : createInitialWorkflowState();
  } catch {
    return createInitialWorkflowState();
  }
}

export function selectReportsForUser(state: WorkflowState, userId: string) {
  return state.reports.filter((report) => report.managerId === userId);
}

export function selectReportSources(state: WorkflowState, reportId: string) {
  const report = state.reports.find((item) => item.id === reportId);
  if (!report) return [];
  return report.sourceIds
    .map((sourceId) => state.sources.find((source) => source.id === sourceId))
    .filter((source): source is WorkflowSource => Boolean(source));
}

export function selectReadiness(state: WorkflowState, cycleId: string) {
  const requiredDepartments = atlas.departments.filter((department) => department.required);
  const approved = new Set(
    state.reports
      .filter((report) => report.cycleId === cycleId && report.status === 'approved')
      .map((report) => report.departmentId),
  );
  const requiredReports = requiredDepartments.length;
  const approvedReports = approved.size;
  return {
    approvedReports,
    requiredReports,
    reportingReadinessPercent: Math.round((approvedReports / requiredReports) * 100),
  };
}

export function selectSubmissionQueue(state: WorkflowState, cycleId?: string) {
  return state.reports.filter(
    (report) =>
      (!cycleId || report.cycleId === cycleId) &&
      ['submitted', 'resubmitted', 'needs_clarification'].includes(report.status),
  );
}

export function getSubmissionBlockers(
  report: WorkflowReport,
  sources: WorkflowSource[],
  corrections: ManagerCorrection[],
  certified: boolean,
) {
  const hasUsableSource = sources.some((source) =>
    ['extracted', 'partial', 'conflict'].includes(source.status),
  );
  const hasInvalidSource = sources.some((source) =>
    ['processing', 'uploading', 'invalid', 'unsupported', 'failed_extraction'].includes(
      source.status,
    ),
  );
  const hasConflict = sources.some((source) => source.status === 'conflict');
  const conflictResolved = corrections.some(
    (correction) =>
      correction.reportId === report.id && correction.fieldKey === 'grossOilActualBopd',
  );
  return [
    !hasUsableSource ? 'Add and process at least one valid source.' : '',
    hasInvalidSource ? 'Replace or remove incomplete and failed sources.' : '',
    hasConflict && !conflictResolved ? 'Resolve every conflicting source value.' : '',
    report.fields.some((field) => field.required && !field.value.trim())
      ? 'Complete every required standardised field.'
      : '',
    !certified ? 'Confirm the certification statement.' : '',
  ].filter(Boolean);
}

export function reportDepartmentName(report: WorkflowReport) {
  return getDepartment(report.departmentId)?.name ?? report.departmentId;
}
