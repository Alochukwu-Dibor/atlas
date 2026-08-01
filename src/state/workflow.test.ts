import { describe, expect, it } from 'vitest';
import {
  createInitialWorkflowState,
  getSubmissionBlockers,
  selectReadiness,
  selectReportSources,
  workflowReducer,
  type ManagerCorrection,
  type WorkflowComment,
  type WorkflowSource,
} from './workflow';

const now = '2026-08-01T10:30:00+01:00';
const actorId = 'usr_operations';

function source(overrides: Partial<WorkflowSource> = {}): WorkflowSource {
  return {
    id: 'src_test_1',
    reportId: 'rpt_ops_w31',
    method: 'document_upload',
    name: 'Operations fixture.pdf',
    status: 'extracted',
    addedAt: now,
    reference: 'Page 2 · Production Summary',
    excerpt: 'Average gross production: 96,800 bopd.',
    extractedValues: { grossOilActualBopd: '96800' },
    ...overrides,
  };
}

describe('Atlas reporting workflow', () => {
  it('preserves the published fixture readiness and controlled-exception snapshot', () => {
    expect(selectReadiness(createInitialWorkflowState(), 'cycle_2026_w30')).toEqual({
      approvedReports: 6,
      requiredReports: 8,
      reportingReadinessPercent: 82,
    });
  });

  it('adds several sources and removes only the confirmed source', () => {
    const initial = createInitialWorkflowState();
    const first = workflowReducer(initial, {
      type: 'ADD_SOURCE',
      source: source(),
      actorId,
    });
    const second = workflowReducer(first, {
      type: 'ADD_SOURCE',
      source: source({ id: 'src_test_2', method: 'xlsx_upload', name: 'Operations.xlsx' }),
      actorId,
    });
    expect(selectReportSources(second, 'rpt_ops_w31').map((item) => item.id)).toContain(
      'src_test_2',
    );
    const removed = workflowReducer(second, {
      type: 'REMOVE_SOURCE',
      reportId: 'rpt_ops_w31',
      sourceId: 'src_test_1',
      actorId,
      now,
    });
    expect(removed.sources.some((item) => item.id === 'src_test_1')).toBe(false);
    expect(removed.auditEvents.at(-1)?.action).toBe('source_removed');
  });

  it('blocks submission for required source, conflict, and certification conditions', () => {
    const state = createInitialWorkflowState();
    const report = state.reports.find((item) => item.id === 'rpt_ops_w31')!;
    expect(getSubmissionBlockers(report, [], [], false)).toEqual([
      'Add and process at least one valid source.',
      'Confirm the certification statement.',
    ]);
    expect(getSubmissionBlockers(report, [source({ status: 'conflict' })], [], true)).toContain(
      'Resolve every conflicting source value.',
    );
  });

  it('preserves a conflicting extraction and creates a manager correction audit event', () => {
    const initial = createInitialWorkflowState();
    const withConflict = workflowReducer(initial, {
      type: 'ADD_SOURCE',
      source: source({
        id: 'src_conflict',
        method: 'xlsx_upload',
        status: 'conflict',
        extractedValues: { grossOilActualBopd: '102400' },
      }),
      actorId,
    });
    const correction: ManagerCorrection = {
      id: 'correction_test',
      reportId: 'rpt_ops_w31',
      fieldKey: 'grossOilActualBopd',
      fieldLabel: 'Gross oil production',
      sourceId: 'src_conflict',
      originalValue: '102400',
      correctedValue: '96800',
      reason: 'Daily production sheet is the approved weekly source.',
      actorId,
      timestamp: now,
    };
    const corrected = workflowReducer(withConflict, { type: 'CORRECT_FIELD', correction });
    expect(corrected.sources.find((item) => item.id === 'src_conflict')?.extractedValues).toEqual({
      grossOilActualBopd: '102400',
    });
    expect(corrected.corrections[0].originalValue).toBe('102400');
    expect(corrected.auditEvents.at(-1)?.action).toBe('extracted_value_corrected');
  });

  it('moves Draft to Submitted with submitter, timestamp, and audit state', () => {
    const state = workflowReducer(createInitialWorkflowState(), {
      type: 'SUBMIT_REPORT',
      reportId: 'rpt_ops_w31',
      actorId,
      now,
    });
    const report = state.reports.find((item) => item.id === 'rpt_ops_w31')!;
    expect(report.status).toBe('submitted');
    expect(report.submittedAt).toBe(now);
    expect(state.auditEvents.at(-1)?.after).toBe('submitted');
  });

  it('supports clarification, response, resubmission, and Commercial approval', () => {
    const submitted = workflowReducer(createInitialWorkflowState(), {
      type: 'SUBMIT_REPORT',
      reportId: 'rpt_ops_w31',
      actorId,
      now,
    });
    const comment: WorkflowComment = {
      id: 'comment_test',
      reportId: 'rpt_ops_w31',
      field: 'Gross oil production',
      authorId: 'usr_commercial',
      question: 'Confirm the authoritative weekly average.',
      status: 'open',
      createdAt: now,
      dueDate: '2026-08-03',
    };
    const returned = workflowReducer(submitted, { type: 'REQUEST_CLARIFICATION', comment });
    expect(returned.reports.find((item) => item.id === 'rpt_ops_w31')?.status).toBe(
      'needs_clarification',
    );
    const answered = workflowReducer(returned, {
      type: 'RESPOND_CLARIFICATION',
      reportId: 'rpt_ops_w31',
      commentId: comment.id,
      response: 'Confirmed against Daily Production!H20:H26.',
      actorId,
      now,
    });
    const resubmitted = workflowReducer(answered, {
      type: 'SUBMIT_REPORT',
      reportId: 'rpt_ops_w31',
      actorId,
      now,
    });
    expect(resubmitted.reports.find((item) => item.id === 'rpt_ops_w31')?.status).toBe(
      'resubmitted',
    );
    const approved = workflowReducer(resubmitted, {
      type: 'APPROVE_REPORT',
      reportId: 'rpt_ops_w31',
      actorId: 'usr_commercial',
      now,
    });
    expect(approved.reports.find((item) => item.id === 'rpt_ops_w31')?.status).toBe('approved');
  });

  it('requires an override reason and preserves the department value separately', () => {
    const submitted = workflowReducer(createInitialWorkflowState(), {
      type: 'SUBMIT_REPORT',
      reportId: 'rpt_ops_w31',
      actorId,
      now,
    });
    const rejected = workflowReducer(submitted, {
      type: 'APPLY_OVERRIDE',
      override: {
        id: 'override_test',
        reportId: 'rpt_ops_w31',
        fieldKey: 'grossOilActualBopd',
        fieldLabel: 'Gross oil production',
        departmentValue: '96800',
        revisedValue: '97400',
        reason: '',
        reviewerId: 'usr_commercial',
        timestamp: now,
      },
    });
    expect(rejected.overrides).toHaveLength(0);
    expect(rejected.lastError).toContain('reason');
    const accepted = workflowReducer(submitted, {
      type: 'APPLY_OVERRIDE',
      override: {
        id: 'override_test',
        reportId: 'rpt_ops_w31',
        fieldKey: 'grossOilActualBopd',
        fieldLabel: 'Gross oil production',
        departmentValue: '96800',
        revisedValue: '97400',
        reason: 'Commercial cut-off includes a late validated meter ticket.',
        reviewerId: 'usr_commercial',
        timestamp: now,
      },
    });
    expect(accepted.overrides[0]).toMatchObject({
      departmentValue: '96800',
      revisedValue: '97400',
    });
  });

  it('enforces the publication gate, records an exception, and locks the cycle', () => {
    const initial = createInitialWorkflowState();
    const blocked = workflowReducer(initial, {
      type: 'PUBLISH_CYCLE',
      cycleId: 'cycle_2026_w31',
      actorId: 'usr_commercial',
      now,
    });
    expect(blocked.lastError).toMatch(/approve every mandatory report/i);
    const excepted = workflowReducer(initial, {
      type: 'RECORD_CYCLE_EXCEPTION',
      cycleId: 'cycle_2026_w31',
      reason: 'Six missing departments have confirmed no material change before cut-off.',
      actorId: 'usr_commercial',
      now,
    });
    const published = workflowReducer(excepted, {
      type: 'PUBLISH_CYCLE',
      cycleId: 'cycle_2026_w31',
      actorId: 'usr_commercial',
      now,
    });
    expect(published.publications.find((item) => item.cycleId === 'cycle_2026_w31')?.status).toBe(
      'published_locked',
    );
    expect(
      published.reports
        .filter((report) => report.cycleId === 'cycle_2026_w31')
        .every((report) => report.status === 'published_locked'),
    ).toBe(true);
    expect(published.auditEvents.at(-1)?.action).toBe('executive_update_published');
  });

  it('keeps published reports immutable and creates a separate auditable revision', () => {
    const initial = createInitialWorkflowState();
    const original = initial.reports.find((report) => report.id === 'rpt_ops_w30')!;
    expect(original.status).toBe('published_locked');
    const rejected = workflowReducer(initial, {
      type: 'UPDATE_REPORT_DETAILS',
      reportId: original.id,
      title: 'Mutated title',
      methods: original.methods,
    });
    expect(rejected.reports.find((report) => report.id === original.id)?.title).toBe(
      original.title,
    );
    const revised = workflowReducer(initial, {
      type: 'CREATE_REVISION',
      reportId: original.id,
      actorId,
      now,
    });
    const revision = revised.reports.at(-1)!;
    expect(revision).toMatchObject({
      status: 'draft',
      supersedesReportId: original.id,
    });
    expect(revised.reports.find((report) => report.id === original.id)).toEqual(original);
    expect(revised.auditEvents.at(-1)?.action).toBe('post_publication_revision_created');
  });
});
