import type { ConfirmedPlanBaseline } from '../state/plan';
import type { WorkflowState } from '../state/workflow';
import { atlas, getCycle, getUser } from './atlas';
import { selectCommercialDashboard } from './commercialDashboard';
import { selectCommercialProjects, selectCommercialProjectWorkspace } from './commercialProjects';

export type CommercialReportType =
  'performance_report' | 'executive_summary' | 'project_progress_report';

export interface ReportingSubmissionItem {
  id: string;
  title: string;
  contributor: string;
  department: string;
  departmentId: string;
  projectId: string | null;
  project: string;
  submittedAt: string | null;
  status: string;
}

export interface ReportingFollowUpItem extends ReportingSubmissionItem {
  context: string;
  dueDate: string;
  reminderSentAt: string | null;
}

export interface CommercialReportPreview {
  type: CommercialReportType;
  title: string;
  reportingPeriod: string;
  generatedAt: string;
  headline: string;
  metrics: { label: string; value: string; status?: string }[];
  sections: {
    title: string;
    columns?: string[];
    rows?: string[][];
    items?: string[];
  }[];
}

function projectName(plan: ConfirmedPlanBaseline, projectId: string | null) {
  if (!projectId) return 'Business unit update';
  return plan.projects.find((project) => project.id === projectId)?.name ?? 'Unknown project';
}

export function selectCommercialReporting(
  plan: ConfirmedPlanBaseline | null,
  workflow: WorkflowState,
  cycleId: string,
) {
  if (!plan) return null;
  const cycle = getCycle(cycleId);
  const expectedDepartments = atlas.departments.filter((department) => department.required);
  const reports = expectedDepartments.map((department) => {
    const report = workflow.reports.find(
      (item) => item.cycleId === cycleId && item.departmentId === department.id,
    );
    return {
      id: report?.id ?? `missing:${cycleId}:${department.id}`,
      title: report?.title ?? `${department.name} Weekly Execution Update`,
      contributor:
        getUser(report?.managerId ?? department.managerId ?? '')?.name ?? 'Unassigned contributor',
      department: department.name,
      departmentId: department.id,
      projectId: report?.projectId ?? null,
      project: projectName(plan, report?.projectId ?? null),
      submittedAt: report?.submittedAt ?? null,
      status: report?.status ?? 'draft',
      report,
    };
  });
  const received = reports.filter(
    (item) => item.submittedAt || !['draft', 'rejected'].includes(item.status),
  );
  const needsReview = reports
    .filter((item) => ['submitted', 'resubmitted', 'needs_clarification'].includes(item.status))
    .map((item) => ({
      id: item.id,
      title: item.title,
      contributor: item.contributor,
      department: item.department,
      departmentId: item.departmentId,
      projectId: item.projectId,
      project: item.project,
      submittedAt: item.submittedAt,
      status: item.status,
    }));
  const followUp: ReportingFollowUpItem[] = reports
    .filter((item) => ['draft', 'rejected', 'needs_clarification'].includes(item.status))
    .map((item) => {
      const reminder = workflow.reminders.find(
        (record) =>
          record.cycleId === cycleId &&
          record.departmentId === item.departmentId &&
          record.projectId === item.projectId,
      );
      const clarification = item.report
        ? workflow.comments.find(
            (comment) => comment.reportId === item.report!.id && comment.status === 'open',
          )
        : undefined;
      return {
        id: item.id,
        title: item.title,
        contributor: item.contributor,
        department: item.department,
        departmentId: item.departmentId,
        projectId: item.projectId,
        project: item.project,
        submittedAt: item.submittedAt,
        status: item.status,
        context:
          item.status === 'needs_clarification'
            ? (clarification?.question ?? 'Clarification response is outstanding.')
            : item.status === 'rejected'
              ? 'A revised Weekly Execution Update is overdue.'
              : 'Expected Weekly Execution Update has not been submitted.',
        dueDate: clarification?.dueDate ?? cycle.dueDate,
        reminderSentAt: reminder?.sentAt ?? null,
      };
    });
  return {
    cycle,
    totalExpected: reports.length,
    receivedCount: received.length,
    completenessPercent: reports.length ? Math.round((received.length / reports.length) * 100) : 0,
    pendingCount: reports.filter((item) => ['draft', 'rejected'].includes(item.status)).length,
    submittedCount: received.length,
    awaitingReviewCount: needsReview.length,
    needsReview,
    followUp,
  };
}

export function generateCommercialReport(
  type: CommercialReportType,
  plan: ConfirmedPlanBaseline | null,
  workflow: WorkflowState,
  cycleId: string,
  generatedAt: string,
  projectId: string = 'all',
): CommercialReportPreview | null {
  if (!plan) return null;
  const reporting = selectCommercialReporting(plan, workflow, cycleId)!;
  const dashboard = selectCommercialDashboard(plan, workflow, cycleId)!;
  const projects = selectCommercialProjects(plan).filter(
    (project) => projectId === 'all' || project.id === projectId,
  );
  const production = dashboard.kpis.find((metric) => metric.id === 'production')!;
  const currentTrend = dashboard.trend.at(-1)!;
  const previousTrend = dashboard.trend.at(-2)!;

  if (type === 'performance_report') {
    return {
      type,
      title: 'Performance Report',
      reportingPeriod: reporting.cycle.label,
      generatedAt,
      headline: `Portfolio Health is ${dashboard.portfolioHealth.score}/100 (${dashboard.portfolioHealth.status.replaceAll('_', ' ')}), with ${reporting.receivedCount} of ${reporting.totalExpected} expected submissions received.`,
      metrics: [
        {
          label: 'Portfolio Health',
          value: `${dashboard.portfolioHealth.score}/100`,
          status: dashboard.portfolioHealth.status,
        },
        { label: 'Production capacity', value: production.result, status: production.status },
        {
          label: 'Plan delivery',
          value: `${currentTrend.actualDeliveryPercent}% actual`,
          status:
            currentTrend.actualDeliveryPercent >= currentTrend.plannedDeliveryPercent
              ? 'on_track'
              : 'at_risk',
        },
        {
          label: 'Submission completeness',
          value: `${reporting.completenessPercent}%`,
          status: reporting.completenessPercent === 100 ? 'complete' : 'needs_attention',
        },
      ],
      sections: [
        {
          title: 'Plan versus actual',
          columns: ['Measure', 'Plan', 'Actual', 'Variance'],
          rows: [
            [
              'Business-plan delivery',
              `${currentTrend.plannedDeliveryPercent}%`,
              `${currentTrend.actualDeliveryPercent}%`,
              `${currentTrend.actualDeliveryPercent - currentTrend.plannedDeliveryPercent} points`,
            ],
            [
              'Production capacity',
              production.context.split(' plan')[0],
              production.result,
              production.context,
            ],
          ],
        },
        {
          title: 'Critical project and submission matters',
          items: dashboard.attention.map((item) => `${item.title}: ${item.reason}`),
        },
      ],
    };
  }

  if (type === 'executive_summary') {
    const movement = currentTrend.actualDeliveryPercent - previousTrend.actualDeliveryPercent;
    return {
      type,
      title: 'Executive Summary',
      reportingPeriod: reporting.cycle.label,
      generatedAt,
      headline: `Validated portfolio delivery is ${currentTrend.actualDeliveryPercent}% against ${currentTrend.plannedDeliveryPercent}% plan. Executive attention remains focused on ${dashboard.priorities[0]?.title.toLowerCase() ?? 'current delivery risks'}.`,
      metrics: [
        {
          label: 'Portfolio position',
          value: `${dashboard.portfolioHealth.score}/100`,
          status: dashboard.portfolioHealth.status,
        },
        {
          label: 'Change this week',
          value: `${movement > 0 ? '+' : ''}${movement} points`,
          status: movement >= 0 ? 'on_track' : 'at_risk',
        },
        {
          label: 'Critical projects',
          value: String(dashboard.portfolioHealth.breakdown.critical),
          status: dashboard.portfolioHealth.breakdown.critical ? 'critical' : 'on_track',
        },
        {
          label: 'Awaiting review',
          value: String(reporting.awaitingReviewCount),
          status: reporting.awaitingReviewCount ? 'needs_attention' : 'complete',
        },
      ],
      sections: [
        {
          title: 'Major changes',
          items: [
            `Plan delivery moved ${movement > 0 ? 'up' : 'down'} ${Math.abs(movement)} points from the previous reporting period.`,
            production.context,
          ],
        },
        {
          title: 'Critical issues',
          items: dashboard.attention.map((item) => `${item.title}: ${item.reason}`),
        },
        {
          title: 'Items requiring executive attention',
          items: dashboard.priorities.slice(0, 4).map((item) => `${item.title}: ${item.reason}`),
        },
      ],
    };
  }

  return {
    type,
    title: 'Project Progress Report',
    reportingPeriod: reporting.cycle.label,
    generatedAt,
    headline: `${projects.length} confirmed ${projects.length === 1 ? 'project is' : 'projects are'} included, using the latest reported phase, health, progress and approved-measure adherence.`,
    metrics: [
      { label: 'Projects included', value: String(projects.length) },
      {
        label: 'On track',
        value: String(projects.filter((project) => project.health === 'on_track').length),
        status: 'on_track',
      },
      {
        label: 'At risk',
        value: String(projects.filter((project) => project.health === 'at_risk').length),
        status: 'at_risk',
      },
      {
        label: 'Critical',
        value: String(projects.filter((project) => project.health === 'critical').length),
        status: 'critical',
      },
    ],
    sections: [
      {
        title: 'Project progress and adherence',
        columns: [
          'Project',
          'Current phase',
          'Health',
          'Progress',
          'KPI, target and milestone adherence',
        ],
        rows: projects.map((project) => {
          const workspace = selectCommercialProjectWorkspace(plan, workflow, project.id)!;
          return [
            project.name,
            project.phase,
            project.health.replaceAll('_', ' '),
            `${project.progressPercent}%`,
            `${workspace.targetAdherencePercent}%`,
          ];
        }),
      },
    ],
  };
}

export const commercialReportDescriptions: Record<CommercialReportType, string> = {
  performance_report:
    'Portfolio Health, key performance indicators, plan-versus-actual delivery and critical project or submission matters.',
  executive_summary:
    'A concise validated portfolio position, major changes, critical issues and items requiring executive attention.',
  project_progress_report:
    'Confirmed projects with current phase, health, progress and KPI, target and milestone adherence.',
};
