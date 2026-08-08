import { describe, expect, it } from 'vitest';
import { getApprovedPlanFixtureFile, initialPlanState, planReducer } from '../state/plan';
import { selectPortfolioDepartments } from './commercialPortfolio';

function confirmedPlan() {
  let state = planReducer(initialPlanState(), {
    type: 'SELECT_FILE',
    file: getApprovedPlanFixtureFile(),
  });
  state = planReducer(state, { type: 'START_EXTRACTION' });
  state = planReducer(state, { type: 'COMPLETE_EXTRACTION' });
  state = planReducer(state, {
    type: 'CONFIRM_PLAN',
    actorId: 'usr_commercial',
    now: '2026-08-08T10:00:00+01:00',
  });
  return state.confirmedPlan;
}

describe('Commercial Portfolio departments', () => {
  it('uses the six approved departments and only confirmed linked projects', () => {
    expect(
      selectPortfolioDepartments(null).every((department) => department.projects.length === 0),
    ).toBe(true);
    const departments = selectPortfolioDepartments(confirmedPlan());
    expect(departments.map((department) => department.name)).toEqual([
      'Finance',
      'HSE',
      'Legal & Regulatory',
      'Production',
      'Engineering/Construction',
      'Community',
    ]);
    expect(
      departments
        .find((department) => department.id === 'community')
        ?.projects.map((project) => project.id),
    ).toEqual(['prj_integrity', 'prj_wellwork']);
  });
});
