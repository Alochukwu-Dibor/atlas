import { beforeEach, describe, expect, it } from 'vitest';
import {
  getApprovedPlanFixtureFile,
  initialPlanState,
  loadPlanState,
  planReducer,
  planStorageKey,
  validatePlan,
} from './plan';

function extractedState() {
  let state = planReducer(initialPlanState(), {
    type: 'SELECT_FILE',
    file: getApprovedPlanFixtureFile(),
  });
  state = planReducer(state, { type: 'START_UPLOAD' });
  state = planReducer(state, { type: 'START_EXTRACTION' });
  return planReducer(state, { type: 'COMPLETE_EXTRACTION' });
}

describe('approved plan baseline state', () => {
  beforeEach(() => window.localStorage.clear());

  it('extracts one coherent USD 185m project baseline', () => {
    const state = extractedState();
    expect(state.stage).toBe('review');
    expect(state.projects).toHaveLength(4);
    expect(state.projects.reduce((sum, project) => sum + project.budget.approvedAmount, 0)).toBe(
      185_000_000,
    );
    expect(validatePlan(state)).toEqual([]);
  });

  it('blocks confirmation when a required value is removed', () => {
    let state = extractedState();
    state = planReducer(state, {
      type: 'UPDATE_PROJECT',
      projectId: 'prj_compressor',
      field: 'name',
      value: '',
    });
    expect(validatePlan(state)).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
    );
    state = planReducer(state, {
      type: 'CONFIRM_PLAN',
      actorId: 'usr_commercial',
      now: '2026-08-06T10:00:00+01:00',
    });
    expect(state.confirmedPlan).toBeNull();
    expect(state.error).toMatch(/resolve validation/i);
  });

  it('persists the confirmed baseline without changing approved values', () => {
    let state = extractedState();
    state = planReducer(state, {
      type: 'ADD_CUSTOM_FIELD',
      field: {
        id: 'custom_partner_basis',
        projectId: 'prj_compressor',
        section: 'budget',
        name: 'Partner carry basis',
        type: 'text',
        value: 'JV approved',
      },
    });
    state = planReducer(state, {
      type: 'CONFIRM_PLAN',
      actorId: 'usr_commercial',
      now: '2026-08-06T10:00:00+01:00',
    });
    expect(state.confirmedPlan?.totalApprovedBudget).toBe(185_000_000);
    expect(state.confirmedPlan?.customFields).toHaveLength(1);
    window.localStorage.setItem(planStorageKey, JSON.stringify(state));
    expect(loadPlanState().confirmedPlan?.status).toBe('confirmed_tracking_baseline');
  });
});
