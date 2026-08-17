import { describe, expect, it } from 'vitest';
import {
  getApprovedPlanFixtureFile,
  initialPlanState,
  planReducer,
  type ConfirmedPlanBaseline,
} from './plan';
import {
  calculateMeasure,
  canCommentOnUpdate,
  canDeleteUpdate,
  canEditUpdate,
  canResubmitUpdate,
  canViewDraft,
  canViewUpdate,
  createCommitmentOutcomes,
  createInitialManagerUpdatesState,
  createEmptyStructuredSections,
  createInheritedPerformanceMeasures,
  createManagerMetricInputs,
  deriveProjectHealthFromUpdates,
  managerUpdatesReducer,
  selectAssignedProjectIds,
  selectManagerUpdates,
  selectVisibleSubmittedUpdates,
  isUpdatePastDeadline,
  type ManagerWeeklyUpdate,
} from './managerUpdates';

function confirmedPlan(): ConfirmedPlanBaseline {
  let state = planReducer(initialPlanState(), {
    type: 'SELECT_FILE',
    file: getApprovedPlanFixtureFile(),
  });
  state = planReducer(state, { type: 'START_EXTRACTION' });
  state = planReducer(state, { type: 'COMPLETE_EXTRACTION' });
  state = planReducer(state, {
    type: 'CONFIRM_PLAN',
    actorId: 'usr_commercial',
    now: '2026-08-06T10:00:00+01:00',
  });
  return state.confirmedPlan!;
}

function draft(overrides: Partial<ManagerWeeklyUpdate> = {}): ManagerWeeklyUpdate {
  return {
    id: 'manager_update_operations_compressor_w31',
    creatorId: 'usr_operations',
    departmentId: 'dept_operations',
    projectId: 'prj_compressor',
    reportingPeriodId: 'cycle_2026_w31',
    reportingDeadline: '2026-08-07',
    sections: {
      highlights: 'Output reached 96,800 bopd against 100,000 plan.',
      ongoingActivities: '',
      risks: '',
      plansForWeek: '',
    },
    chart: null,
    attachments: [],
    status: 'draft',
    savedAt: '2026-08-06T16:01:00+01:00',
    submittedAt: null,
    visibleToRoles: [],
    ...overrides,
    comments: overrides.comments ?? [],
  };
}

describe('Manager Weekly Update state', () => {
  it('limits a Manager to stable assigned project identifiers', () => {
    expect(selectAssignedProjectIds('usr_operations')).toEqual(['prj_compressor', 'prj_wellwork']);
    expect(selectAssignedProjectIds('usr_commercial')).toContain('prj_integrity');
    expect(selectAssignedProjectIds('unknown')).toEqual([]);
  });

  it('upserts the same creator/project/period draft instead of duplicating it', () => {
    let state = managerUpdatesReducer(createInitialManagerUpdatesState(), {
      type: 'UPSERT_UPDATE',
      update: draft(),
    });
    state = managerUpdatesReducer(state, {
      type: 'UPSERT_UPDATE',
      update: draft({
        sections: { ...draft().sections, risks: 'Rotor delivery remains the key constraint.' },
      }),
    });
    const updates = selectManagerUpdates(state, 'usr_operations');
    expect(updates).toHaveLength(1);
    expect(updates[0].sections.risks).toMatch(/rotor/i);
  });

  it('allows distinct updates for the same project and period while preserving stable records', () => {
    let state = managerUpdatesReducer(createInitialManagerUpdatesState(), {
      type: 'UPSERT_UPDATE',
      update: draft({ id: 'manager_update_operations_compressor_w31_1' }),
    });
    state = managerUpdatesReducer(state, {
      type: 'UPSERT_UPDATE',
      update: draft({ id: 'manager_update_operations_compressor_w31_2' }),
    });
    expect(
      selectManagerUpdates(state, 'usr_operations').filter(
        (update) =>
          update.projectId === 'prj_compressor' && update.reportingPeriodId === 'cycle_2026_w31',
      ),
    ).toHaveLength(2);
  });

  it('creates department-specific base inputs and plan-linked structured sections', () => {
    expect(createManagerMetricInputs('dept_finance').map((input) => input.id)).toContain(
      'opening_cash',
    );
    expect(createManagerMetricInputs('dept_hse').map((input) => input.id)).toContain(
      'hours_worked',
    );
    expect(createEmptyStructuredSections().highlights.outcomeStatus).toBe('achieved');
    expect(createEmptyStructuredSections().plansForWeek.strategicObjectiveId).toBe('');
  });

  it('inherits assigned approved measures and calculates current variance without editable links', () => {
    const project = confirmedPlan().projects.find((item) => item.id === 'prj_compressor')!;
    const measures = createInheritedPerformanceMeasures(project, 'dept_operations');
    const production = measures.find((measure) => measure.planItemId === 'kpi_gross_production')!;
    expect(production).toMatchObject({
      type: 'KPI',
      approvedValue: '120000',
      previousValue: '96800',
    });
    expect(calculateMeasure({ ...production, currentValue: '114000' })).toMatchObject({
      variance: '-5.0%',
      status: 'on_track',
    });
  });

  it('rolls previous commitments forward and derives project health from structured submissions', () => {
    const previous = draft({
      commitments: [
        {
          id: 'commitment_1',
          commitment: 'Complete rotor alignment',
          expectedOutcome: 'Compressor ready for test',
          ownerId: 'usr_operations',
          dueDate: '2026-08-07',
          linkedPlanItemId: 'milestone_compressor_install',
          dependency: '',
          status: 'in_progress',
        },
      ],
    });
    expect(createCommitmentOutcomes(previous)[0]).toMatchObject({
      commitment: 'Complete rotor alignment',
      actualOutcome: '',
      revisedForecast: '2026-08-07',
    });

    const state = managerUpdatesReducer(createInitialManagerUpdatesState(), {
      type: 'UPSERT_UPDATE',
      update: draft({
        status: 'submitted',
        visibleToRoles: ['commercial_manager', 'ceo', 'cfo'],
        performanceMeasures: [
          {
            id: 'measure_1',
            planItemId: 'kpi_gross_production',
            type: 'KPI',
            name: 'Gross oil production',
            projectId: 'prj_compressor',
            departmentId: 'dept_operations',
            unit: 'bopd',
            approvedValue: '120000',
            previousValue: '96800',
            currentValue: '90000',
            plannedCompletion: '',
            previousStatus: 'at_risk',
            currentStatus: 'not_started',
            currentProgress: '',
            forecastCompletion: '',
            variance: '-25.0%',
            status: 'critical',
            evidenceIds: [],
            reviewStatus: 'submitted',
            revisions: [],
            addChart: false,
          },
        ],
      }),
    });
    expect(deriveProjectHealthFromUpdates(state, 'prj_compressor')).toMatchObject({
      status: 'critical',
      score: 25,
    });
  });

  it('keeps drafts private and exposes only submitted updates to authorised roles', () => {
    let state = managerUpdatesReducer(createInitialManagerUpdatesState(), {
      type: 'UPSERT_UPDATE',
      update: draft(),
    });
    expect(selectVisibleSubmittedUpdates(state, 'commercial_manager')).not.toContainEqual(
      expect.objectContaining({ id: draft().id }),
    );
    state = managerUpdatesReducer(state, {
      type: 'UPSERT_UPDATE',
      update: draft({
        status: 'submitted',
        submittedAt: '2026-08-06T16:02:00+01:00',
        visibleToRoles: ['commercial_manager', 'ceo', 'cfo'],
      }),
    });
    expect(selectVisibleSubmittedUpdates(state, 'commercial_manager')[0].id).toBe(draft().id);
    expect(selectVisibleSubmittedUpdates(state, 'ceo')[0].id).toBe(draft().id);
    expect(selectVisibleSubmittedUpdates(state, 'cfo')[0].id).toBe(draft().id);
  });

  it('sorts Executive updates by reporting period and then submission date', () => {
    let state = managerUpdatesReducer(createInitialManagerUpdatesState(), {
      type: 'UPSERT_UPDATE',
      update: draft({
        id: 'manager_update_operations_compressor_w31_early',
        status: 'submitted',
        submittedAt: '2026-08-03T10:00:00+01:00',
        visibleToRoles: ['commercial_manager', 'ceo', 'cfo'],
      }),
    });
    state = managerUpdatesReducer(state, {
      type: 'UPSERT_UPDATE',
      update: draft({
        id: 'manager_update_finance_metering_w31_late',
        creatorId: 'usr_finance',
        departmentId: 'dept_finance',
        projectId: 'prj_metering',
        status: 'submitted',
        submittedAt: '2026-08-03T11:00:00+01:00',
        visibleToRoles: ['commercial_manager', 'ceo', 'cfo'],
      }),
    });
    expect(selectVisibleSubmittedUpdates(state, 'ceo').map((update) => update.id)).toEqual([
      'manager_update_finance_metering_w31_late',
      'manager_update_operations_compressor_w31_early',
      'manager_update_projects_integrity_w30',
    ]);
  });

  it('applies creator, project, role, status and deadline permissions centrally', () => {
    const privateDraft = draft();
    expect(canViewDraft(privateDraft, 'usr_operations')).toBe(true);
    expect(canViewUpdate(privateDraft, 'usr_commercial', 'commercial_manager')).toBe(false);
    expect(canCommentOnUpdate(privateDraft, 'usr_operations', 'department_manager')).toBe(false);

    const submitted = draft({
      status: 'submitted',
      submittedAt: '2026-08-03T12:05:00+01:00',
      visibleToRoles: ['commercial_manager', 'ceo', 'cfo'],
    });
    expect(canViewUpdate(submitted, 'usr_commercial', 'commercial_manager')).toBe(true);
    expect(canViewUpdate(submitted, 'usr_ceo', 'ceo')).toBe(true);
    expect(canEditUpdate(submitted, 'usr_ceo', 'ceo')).toBe(false);
    expect(canResubmitUpdate(submitted, 'usr_operations', 'department_manager')).toBe(true);
    expect(canCommentOnUpdate(submitted, 'usr_operations', 'department_manager')).toBe(true);
    expect(isUpdatePastDeadline(submitted)).toBe(false);

    const expired = draft({ reportingDeadline: '2026-08-02', status: 'submitted' });
    expect(isUpdatePastDeadline(expired)).toBe(true);
    expect(canEditUpdate(expired, 'usr_operations', 'department_manager')).toBe(false);
    expect(canCommentOnUpdate(expired, 'usr_operations', 'department_manager')).toBe(true);
  });

  it('persists non-empty discussion comments without changing submitted content', () => {
    const submitted = draft({
      status: 'submitted',
      submittedAt: '2026-08-03T12:05:00+01:00',
      visibleToRoles: ['commercial_manager', 'ceo', 'cfo'],
    });
    let state = managerUpdatesReducer(createInitialManagerUpdatesState(), {
      type: 'UPSERT_UPDATE',
      update: submitted,
    });
    state = managerUpdatesReducer(state, {
      type: 'ADD_COMMENT',
      updateId: submitted.id,
      comment: {
        id: 'comment_1',
        authorId: 'usr_commercial',
        authorRole: 'commercial_manager',
        comment: 'Confirm the revised delivery date.',
        timestamp: '2026-08-03T12:10:00+01:00',
      },
    });
    const saved = state.updates.find((update) => update.id === submitted.id)!;
    expect(saved.comments).toHaveLength(1);
    expect(saved.sections).toEqual(submitted.sections);
  });

  it('lets only the creator delete a submitted update and removes the canonical record', () => {
    const submitted = draft({
      status: 'submitted',
      submittedAt: '2026-08-03T12:05:00+01:00',
      visibleToRoles: ['commercial_manager', 'ceo', 'cfo'],
    });
    let state = managerUpdatesReducer(createInitialManagerUpdatesState(), {
      type: 'UPSERT_UPDATE',
      update: submitted,
    });
    expect(canDeleteUpdate(submitted, 'usr_operations', 'department_manager')).toBe(true);
    expect(canDeleteUpdate(submitted, 'usr_commercial', 'commercial_manager')).toBe(false);
    state = managerUpdatesReducer(state, {
      type: 'DELETE_UPDATE',
      updateId: submitted.id,
      actorId: 'usr_commercial',
    });
    expect(state.updates.some((update) => update.id === submitted.id)).toBe(true);
    expect(state.lastError).toMatch(/only the creator/i);
    state = managerUpdatesReducer(state, {
      type: 'DELETE_UPDATE',
      updateId: submitted.id,
      actorId: 'usr_operations',
    });
    expect(state.updates.some((update) => update.id === submitted.id)).toBe(false);
  });

  it('clears every Manager update for a destructive Atlas reset', () => {
    const state = managerUpdatesReducer(createInitialManagerUpdatesState(), { type: 'CLEAR_ALL' });
    expect(state.updates).toEqual([]);
    expect(state.lastError).toBeNull();
  });
});
