import { describe, expect, it } from 'vitest';
import {
  canCommentOnUpdate,
  canDeleteUpdate,
  canEditUpdate,
  canResubmitUpdate,
  canViewDraft,
  canViewUpdate,
  createInitialManagerUpdatesState,
  extractChartValues,
  managerUpdatesReducer,
  selectAssignedProjectIds,
  selectManagerUpdates,
  selectVisibleSubmittedUpdates,
  isUpdatePastDeadline,
  type ManagerWeeklyUpdate,
} from './managerUpdates';

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

  it('derives deterministic chart values from numeric Highlights content', () => {
    expect(extractChartValues('Output was 96,800 bopd, 3.5% below a 100000 plan.')).toEqual([
      { label: 'Value 1', value: 96800 },
      { label: 'Value 2', value: 3.5 },
      { label: 'Value 3', value: 100000 },
    ]);
    expect(extractChartValues('No measurable values yet.')).toEqual([]);
  });
});
