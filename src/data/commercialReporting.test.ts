import { describe, expect, it } from 'vitest';
import {
  getApprovedPlanFixtureFile,
  initialPlanState,
  planReducer,
  type ConfirmedPlanBaseline,
} from '../state/plan';
import { createInitialWorkflowState, workflowReducer } from '../state/workflow';
import { selectCommercialDashboard } from './commercialDashboard';
import { selectCommercialProjects } from './commercialProjects';
import {
  generateCommercialReport,
  selectCommercialReporting,
  type CommercialReportType,
} from './commercialReporting';

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

describe('Commercial Reporting selectors', () => {
  it('derives completeness and review/follow-up queues from the canonical workflow', () => {
    expect(
      selectCommercialReporting(null, createInitialWorkflowState(), 'cycle_2026_w31'),
    ).toBeNull();
    const result = selectCommercialReporting(
      confirmedPlan(),
      createInitialWorkflowState(),
      'cycle_2026_w31',
    )!;
    expect(result.totalExpected).toBe(7);
    expect(result.receivedCount).toBe(1);
    expect(result.completenessPercent).toBe(14);
    expect(result.needsReview.map((item) => item.id)).toEqual(['rpt_hse_w31']);
    expect(result.followUp).toHaveLength(7);
  });

  it('shows a sent reminder from persisted workflow activity', () => {
    const workflow = workflowReducer(createInitialWorkflowState(), {
      type: 'SEND_REMINDER',
      reminder: {
        id: 'reminder_test',
        cycleId: 'cycle_2026_w31',
        departmentId: 'dept_operations',
        projectId: 'prj_compressor',
        recipientId: 'usr_operations',
        sentAt: '2026-08-06T15:00:00+01:00',
        sentBy: 'usr_commercial',
      },
    });
    const result = selectCommercialReporting(confirmedPlan(), workflow, 'cycle_2026_w31')!;
    expect(result.followUp.find((item) => item.departmentId === 'dept_operations')).toMatchObject({
      reminderSentAt: '2026-08-06T15:00:00+01:00',
    });
  });

  it('generates all three report types from Dashboard and Projects figures', () => {
    const plan = confirmedPlan();
    const workflow = createInitialWorkflowState();
    const dashboard = selectCommercialDashboard(plan, workflow, 'cycle_2026_w31')!;
    const projects = selectCommercialProjects(plan);
    const types: CommercialReportType[] = [
      'performance_report',
      'executive_summary',
      'project_progress_report',
    ];
    const previews = types.map((type) =>
      generateCommercialReport(type, plan, workflow, 'cycle_2026_w31', '2026-08-06T15:00:00+01:00'),
    );
    expect(previews.every(Boolean)).toBe(true);
    expect(previews[0]?.metrics[0].value).toBe(`${dashboard.portfolioHealth.score}/100`);
    expect(previews[2]?.metrics[0].value).toBe(String(projects.length));
    expect(previews[2]?.sections[0].rows?.[0]).toContain(`${projects[0].progressPercent}%`);
  });
});
