import { describe, expect, it } from 'vitest';
import {
  getApprovedPlanFixtureFile,
  initialPlanState,
  planReducer,
  type ConfirmedPlanBaseline,
} from '../state/plan';
import { createInitialWorkflowState } from '../state/workflow';
import { selectCommercialDashboard } from './commercialDashboard';
import { selectCommercialProjects, selectCommercialProjectWorkspace } from './commercialProjects';

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

describe('Commercial Projects selectors', () => {
  it('uses only confirmed-plan projects and preserves Dashboard health semantics', () => {
    expect(selectCommercialProjects(null)).toEqual([]);
    const projects = selectCommercialProjects(confirmedPlan());
    expect(projects).toHaveLength(4);
    expect(projects.map((project) => project.name)).toEqual([
      'Compressor Station B Restoration',
      'Ughelli Export Line Integrity Programme',
      'Kokori Well Restoration Campaign',
      'Fiscal Metering Upgrade',
    ]);
    expect(projects.find((project) => project.id === 'prj_integrity')).toMatchObject({
      health: 'critical',
      healthPercent: 25,
      progressPercent: 54,
    });
    const dashboard = selectCommercialDashboard(
      confirmedPlan(),
      createInitialWorkflowState(),
      'cycle_2026_w31',
    )!;
    expect(
      projects.map(({ id, health, progressPercent }) => ({ id, health, progressPercent })),
    ).toEqual(
      dashboard.projects.map(({ id, status, progressPercent }) => ({
        id,
        health: status,
        progressPercent,
      })),
    );
  });

  it('derives KPI, target and milestone adherence from the confirmed baseline', () => {
    const project = selectCommercialProjectWorkspace(
      confirmedPlan(),
      createInitialWorkflowState(),
      'prj_compressor',
    )!;
    expect(project.objective).toBe('Restore and sustain planned production');
    expect(project.measures.map((measure) => measure.type)).toEqual(['KPI', 'Target', 'Milestone']);
    expect(project.measures[0]).toMatchObject({
      approvedValue: 120000,
      actualValue: 96800,
      status: 'at_risk',
    });
    expect(project.insights[0].destination).toContain('/projects/prj_compressor?view=adherence');
  });

  it('builds a chronological, linked project activity log', () => {
    const project = selectCommercialProjectWorkspace(
      confirmedPlan(),
      createInitialWorkflowState(),
      'prj_compressor',
    )!;
    expect(project.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: 'Approved plan confirmed as the Atlas tracking baseline.',
          destination: '/plan',
        }),
        expect.objectContaining({
          description: 'Weekly Execution Update received.',
          destination: '/reviews/rpt_ops_w30',
        }),
        expect.objectContaining({
          description: 'Weekly Execution Update reviewed and approved.',
          destination: '/reviews/rpt_ops_w30',
        }),
      ]),
    );
    expect(
      project.activities.every(
        (activity, index) =>
          index === 0 ||
          Date.parse(project.activities[index - 1].timestamp) >= Date.parse(activity.timestamp),
      ),
    ).toBe(true);
  });

  it('returns null for an unknown confirmed project identifier', () => {
    expect(
      selectCommercialProjectWorkspace(
        confirmedPlan(),
        createInitialWorkflowState(),
        'unknown-project',
      ),
    ).toBeNull();
  });
});
