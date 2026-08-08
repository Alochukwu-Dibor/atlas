import type { ConfirmedPlanBaseline } from '../state/plan';
import { atlas, phase1Domain } from './atlas';
import { selectCommercialProjects, type CommercialProjectListItem } from './commercialProjects';

export type PortfolioDepartmentId =
  'finance' | 'hse' | 'legal' | 'production' | 'engineering' | 'community';

export interface DepartmentMetric {
  label: string;
  value: string;
  context: string;
  status: string;
}

export interface DepartmentRisk {
  id: string;
  issue: string;
  projectId: string;
  impact: string;
  status: string;
}

export interface DepartmentGoal {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  progressPercent: number;
  plannedPercent: number;
  status: string;
}

export interface PortfolioDepartment {
  id: PortfolioDepartmentId;
  name: string;
  description: string;
  projects: CommercialProjectListItem[];
  metrics: DepartmentMetric[];
  risks: DepartmentRisk[];
  goals: DepartmentGoal[];
  overallPercent: number;
  overallStatus: string;
}

const departmentDefinitions: Array<{
  id: PortfolioDepartmentId;
  name: string;
  description: string;
  projectIds: string[];
}> = [
  {
    id: 'finance',
    name: 'Finance',
    description: 'Funding capacity, approved budgets and forecast exposure.',
    projectIds: ['prj_compressor', 'prj_integrity', 'prj_wellwork', 'prj_metering'],
  },
  {
    id: 'hse',
    name: 'HSE',
    description: 'Safety, environmental performance and corrective-action delivery.',
    projectIds: ['prj_compressor', 'prj_integrity', 'prj_wellwork'],
  },
  {
    id: 'legal',
    name: 'Legal & Regulatory',
    description: 'Licence-to-operate obligations, exposure and regulatory deadlines.',
    projectIds: ['prj_compressor', 'prj_integrity', 'prj_metering'],
  },
  {
    id: 'production',
    name: 'Production',
    description: 'Production recovery, asset availability and operational delivery.',
    projectIds: ['prj_compressor', 'prj_wellwork', 'prj_metering'],
  },
  {
    id: 'engineering',
    name: 'Engineering/Construction',
    description: 'Engineering scope, construction progress and milestone delivery.',
    projectIds: ['prj_compressor', 'prj_integrity', 'prj_metering'],
  },
  {
    id: 'community',
    name: 'Community',
    description: 'Stakeholder access, community commitments and project continuity.',
    projectIds: ['prj_integrity', 'prj_wellwork'],
  },
];

function currencyMillions(value: number) {
  return `$${(value / 1_000_000).toFixed(1)}m`;
}

function metricsFor(
  id: PortfolioDepartmentId,
  projects: CommercialProjectListItem[],
): DepartmentMetric[] {
  const averageProgress = projects.length
    ? Math.round(
        projects.reduce((sum, project) => sum + project.progressPercent, 0) / projects.length,
      )
    : 0;
  const metrics: Record<PortfolioDepartmentId, DepartmentMetric[]> = {
    finance: [
      {
        label: 'Budget planned',
        value: '$190M',
        context: '',
        status: '',
      },
      {
        label: 'Budget actual',
        value: '$196.5M',
        context: '',
        status: '',
      },
      {
        label: 'Variance',
        value: '+3.4%',
        context: '',
        status: '',
      },
      {
        label: 'Cash runway',
        value: '11 mo',
        context: '',
        status: '',
      },
      {
        label: 'Loan status',
        value: 'On schedule',
        context: '',
        status: '',
      },
    ],
    hse: [
      {
        label: 'TRIR',
        value: atlas.hse.kpis.trir.toFixed(2),
        context: `Target ≤ ${atlas.hse.kpis.trirTarget.toFixed(2)}`,
        status: 'critical',
      },
      {
        label: 'Recordable incidents',
        value: String(atlas.hse.kpis.recordableIncidents),
        context: 'Current reporting month',
        status: 'at_risk',
      },
      {
        label: 'Compliance score',
        value: `${atlas.hse.compliance.scorePercent}%`,
        context: `${atlas.hse.compliance.overdueFindings} overdue findings`,
        status: 'needs_attention',
      },
    ],
    legal: [
      {
        label: 'Regulatory compliance',
        value: `${atlas.legalRegulatory.kpis.compliancePercent}%`,
        context: 'Against 100% approved target',
        status: 'needs_attention',
      },
      {
        label: 'Open legal matters',
        value: String(atlas.legalRegulatory.kpis.openLegalMatters),
        context: `${atlas.legalRegulatory.kpis.criticalRisks} critical`,
        status: 'at_risk',
      },
      {
        label: 'Estimated exposure',
        value: currencyMillions(atlas.legalRegulatory.kpis.estimatedExposureUsd),
        context: 'Current legal register',
        status: 'at_risk',
      },
    ],
    production: [
      {
        label: 'Gross production',
        value: '96,800 bopd',
        context: '120,000 bopd approved plan',
        status: 'at_risk',
      },
      {
        label: 'Plan attainment',
        value: '80.7%',
        context: '23,200 bopd below plan',
        status: 'at_risk',
      },
      {
        label: 'Linked project progress',
        value: `${averageProgress}%`,
        context: `${projects.length} production-linked projects`,
        status: averageProgress >= 75 ? 'on_track' : 'needs_attention',
      },
    ],
    engineering: [
      {
        label: 'Average project progress',
        value: `${averageProgress}%`,
        context: `${projects.length} engineering-linked projects`,
        status: averageProgress >= 75 ? 'on_track' : 'needs_attention',
      },
      {
        label: 'Milestones on track',
        value: `${projects.filter((project) => project.health === 'on_track').length} of ${projects.length}`,
        context: 'Current project health signal',
        status: 'needs_attention',
      },
      {
        label: 'Projects requiring intervention',
        value: String(projects.filter((project) => project.health !== 'on_track').length),
        context: 'At risk or critical',
        status: 'at_risk',
      },
    ],
    community: [
      {
        label: 'Access commitments',
        value: '4 of 5',
        context: 'One corridor action outstanding',
        status: 'needs_attention',
      },
      {
        label: 'Open stakeholder risks',
        value: '1',
        context: 'Ughelli inspection corridor',
        status: 'at_risk',
      },
      {
        label: 'Linked project progress',
        value: `${averageProgress}%`,
        context: `${projects.length} community-linked projects`,
        status: 'needs_attention',
      },
    ],
  };
  return metrics[id];
}

function risksFor(
  id: PortfolioDepartmentId,
  projects: CommercialProjectListItem[],
): DepartmentRisk[] {
  const projectIds = new Set(projects.map((project) => project.id));
  const projectRisks = phase1Domain.risks
    .filter((risk) => risk.projectId && projectIds.has(risk.projectId))
    .map((risk) => ({
      id: risk.id,
      issue: risk.description,
      projectId: risk.projectId!,
      impact: risk.impact,
      status: risk.status,
    }));
  const extras: Partial<Record<PortfolioDepartmentId, DepartmentRisk[]>> = {
    hse: [
      {
        id: 'hse_compressor_isolation',
        issue: 'Compressor isolation corrective actions remain open',
        projectId: 'prj_compressor',
        impact: 'High-potential safety exposure',
        status: 'at_risk',
      },
    ],
    legal: [
      {
        id: 'legal_metering_acceptance',
        issue: 'Regulatory acceptance must precede custody-transfer handover',
        projectId: 'prj_metering',
        impact: 'Commissioning approval',
        status: 'due_soon',
      },
    ],
    community: [
      {
        id: 'community_access',
        issue: 'Community access protocol is outstanding for the inspection corridor',
        projectId: 'prj_integrity',
        impact: 'Seven-day inspection delay',
        status: 'critical',
      },
    ],
  };
  return [...(extras[id] ?? []), ...projectRisks].slice(0, 4);
}

export function selectPortfolioDepartments(
  confirmedPlan: ConfirmedPlanBaseline | null,
): PortfolioDepartment[] {
  const confirmedProjects = selectCommercialProjects(confirmedPlan);
  return departmentDefinitions.map((definition) => {
    const projects = confirmedProjects.filter((project) =>
      definition.projectIds.includes(project.id),
    );
    const goals = projects.map((project) => ({
      id: `${definition.id}:${project.id}`,
      name: `${project.name} delivery against approved plan`,
      projectId: project.id,
      projectName: project.name,
      progressPercent: project.progressPercent,
      plannedPercent: project.plannedProgressPercent ?? 0,
      status: project.health,
    }));
    const overallPercent = goals.length
      ? Math.round(
          goals.reduce(
            (sum, goal) =>
              sum + Math.min(100, (goal.progressPercent / Math.max(goal.plannedPercent, 1)) * 100),
            0,
          ) / goals.length,
        )
      : 0;
    return {
      ...definition,
      projects,
      metrics: metricsFor(definition.id, projects),
      risks: risksFor(definition.id, projects),
      goals,
      overallPercent,
      overallStatus:
        overallPercent >= 95 ? 'on_track' : overallPercent >= 80 ? 'needs_attention' : 'at_risk',
    };
  });
}
