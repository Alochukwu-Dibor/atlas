import { describe, expect, it } from 'vitest';
import {
  createInitialManagerUpdatesState,
  extractChartValues,
  managerUpdatesReducer,
  selectAssignedProjectIds,
  selectManagerUpdates,
  selectVisibleSubmittedUpdates,
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

  it('derives deterministic chart values from numeric Highlights content', () => {
    expect(extractChartValues('Output was 96,800 bopd, 3.5% below a 100000 plan.')).toEqual([
      { label: 'Value 1', value: 96800 },
      { label: 'Value 2', value: 3.5 },
      { label: 'Value 3', value: 100000 },
    ]);
    expect(extractChartValues('No measurable values yet.')).toEqual([]);
  });
});
