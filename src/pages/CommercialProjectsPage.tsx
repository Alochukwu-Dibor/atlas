import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartWrapper } from '../components/Charts';
import {
  AtlasInsightDrawer,
  HealthMetricCard,
  type AtlasInsightContext,
} from '../components/AtlasInsightDrawer';
import {
  Button,
  DataTable,
  DetailTabs,
  Field,
  KpiCard,
  PageHeader,
  Panel,
  StateView,
  StatusBadge,
} from '../components/Ui';
import {
  selectCommercialProjects,
  selectCommercialProjectWorkspace,
  type CommercialProjectMeasure,
} from '../data/commercialProjects';
import { format } from '../data/atlas';
import {
  selectPortfolioDepartments,
  type PortfolioDepartmentId,
} from '../data/commercialPortfolio';
import { useAtlas } from '../state/AtlasContext';

type ProjectView = 'overview' | 'adherence' | 'activity';

const projectViews: readonly { id: ProjectView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'adherence', label: 'Target and Milestone adherence' },
  { id: 'activity', label: 'Activity log' },
];

type PortfolioView = 'projects' | 'departments';

const portfolioViews: readonly { id: PortfolioView; label: string }[] = [
  { id: 'departments', label: 'Performance' },
  { id: 'projects', label: 'Projects' },
];

function measureValue(value: number | string, unit: string) {
  if (typeof value === 'string') {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? format.date(value) : value;
  }
  return `${format.number(value)}${unit ? ` ${unit}` : ''}`;
}

function ProjectMeasureTable({
  type,
  measures,
  focusedMeasure,
}: {
  type: CommercialProjectMeasure['type'];
  measures: CommercialProjectMeasure[];
  focusedMeasure: string | null;
}) {
  const records = measures.filter((measure) => measure.type === type);
  const currentValue = (measure: CommercialProjectMeasure) => {
    if (type !== 'Milestone') return measureValue(measure.actualValue, measure.unit);
    if (measure.status === 'completed') return 'Completed';
    if (measure.status === 'scheduled' || measure.status === 'missing_inputs') return 'Not started';
    return 'In progress';
  };
  return (
    <Panel title={`${type} adherence`} className="section">
      {records.length ? (
        <DataTable
          caption={`${type} adherence`}
          headers={[
            'Measure',
            'Approved baseline / target',
            type === 'Milestone' ? 'Current status' : 'Current actual / status',
            'Variance / adherence',
            'Health',
          ]}
          rows={records.map((measure) => [
            <span
              className={focusedMeasure === measure.sourceId ? 'measure-focus' : undefined}
              aria-current={focusedMeasure === measure.sourceId ? 'true' : undefined}
            >
              {measure.name}
            </span>,
            measureValue(measure.approvedValue, measure.unit),
            currentValue(measure),
            <div className="adherence-cell">
              <span>{measure.variance}</span>
              <progress
                value={measure.adherencePercent}
                max={100}
                aria-label={`${measure.name} adherence`}
              />
              <small>{measure.adherencePercent}% adherence</small>
            </div>,
            <StatusBadge status={measure.status} />,
          ])}
        />
      ) : (
        <p className="empty-copy">
          No approved {type.toLowerCase()} measures are linked to this project.
        </p>
      )}
    </Panel>
  );
}

function ProjectsList() {
  const { plan, managerUpdates } = useAtlas();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const projects = selectCommercialProjects(plan.confirmedPlan, managerUpdates);

  if (!plan.confirmedPlan) {
    return (
      <>
        <StateView
          type="empty"
          title="Confirm an approved plan to activate Portfolio"
          message="Project names, phases and approved measures are loaded from the confirmed tracking baseline."
          action={<Button onClick={() => navigate('/plan')}>Open Plan</Button>}
        />
      </>
    );
  }

  const filtered = projects.filter((project) =>
    project.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <div className="project-list-toolbar">
        <Field label="Search projects">
          <input
            type="search"
            value={search}
            placeholder="Search confirmed projects"
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
      </div>
      <Panel title="Confirmed project portfolio" className="section">
        {filtered.length ? (
          <DataTable
            caption="Commercial project portfolio"
            headers={['Project name', 'Current phase', 'Health', 'Progress']}
            rows={filtered.map((project) => [
              <strong>{project.name}</strong>,
              project.phase,
              <StatusBadge status={project.health} />,
              <div className="progress-cell">
                <progress
                  value={project.progressPercent}
                  max={100}
                  aria-label={`${project.name} progress`}
                />
                <span>{project.progressPercent}%</span>
              </div>,
            ])}
            onRowClick={(index) => navigate(`/projects/${filtered[index].id}`)}
          />
        ) : (
          <p className="empty-copy">No confirmed projects match this search.</p>
        )}
      </Panel>
    </>
  );
}

function DepartmentsDashboard() {
  const { plan } = useAtlas();
  const navigate = useNavigate();
  const departments = selectPortfolioDepartments(plan.confirmedPlan);
  const [departmentId, setDepartmentId] = useState<PortfolioDepartmentId>('finance');
  const [projectId, setProjectId] = useState('all');
  const [drawerContext, setDrawerContext] = useState<AtlasInsightContext | null>(null);
  const department = departments.find((item) => item.id === departmentId) ?? departments[0];

  if (!plan.confirmedPlan) {
    return (
      <StateView
        type="empty"
        title="Confirm an approved plan to view department delivery"
        message="Department dashboards use confirmed projects and approved baselines as their scope."
        action={<Button onClick={() => navigate('/plan')}>Open Plan</Button>}
      />
    );
  }

  const visibleGoals =
    projectId === 'all'
      ? department.goals
      : department.goals.filter((goal) => goal.projectId === projectId);
  const visibleRisks = department.risks.filter(
    (risk) => projectId === 'all' || risk.projectId === projectId,
  );
  const chartData = visibleGoals.map((goal) => ({
    project: goal.projectName
      .replace('Compressor Station B ', '')
      .replace('Ughelli Export Line ', '')
      .replace('Kokori ', ''),
    planned: goal.plannedPercent,
    actual: goal.progressPercent,
  }));

  const selectDepartment = (nextId: PortfolioDepartmentId) => {
    setDepartmentId(nextId);
    setProjectId('all');
  };

  return (
    <div className="department-portfolio">
      <div className="portfolio-department-picker" aria-label="Departments">
        {departments.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === department.id ? 'is-active' : ''}
            aria-pressed={item.id === department.id}
            onClick={() => selectDepartment(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="department-portfolio__header">
        <div>
          <h2>{department.name}</h2>
          <p>{department.description}</p>
        </div>
        <Field label="Filter by project">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="all">All linked projects</option>
            {department.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div
        className={`grid department-metrics ${department.id === 'finance' ? 'department-metrics--6' : 'grid--4'}`}
      >
        <HealthMetricCard
          label={`${department.name} Health`}
          value={department.overallPercent}
          status={department.overallStatus}
        />
        {department.metrics.map((metric) => (
          <KpiCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            context={metric.context}
            contextTone={
              metric.status === 'on_track'
                ? 'success'
                : metric.status === 'at_risk' || metric.status === 'critical'
                  ? 'critical'
                  : 'neutral'
            }
          />
        ))}
      </div>

      <div className="department-portfolio__grid">
        <Panel title="Delivery performance">
          {chartData.length ? (
            <ChartWrapper
              title={`${department.name} project delivery`}
              summary={`Planned and actual progress for ${visibleGoals.length} linked department goals.`}
              tableHeaders={['Project', 'Planned progress', 'Actual progress']}
              tableRows={chartData.map((point) => [
                point.project,
                `${point.planned}%`,
                `${point.actual}%`,
              ])}
            >
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -14, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="project" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
                <Bar dataKey="planned" name="Approved plan" fill="#98a2b3" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual delivery" fill="#175cd3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartWrapper>
          ) : (
            <p className="empty-copy">No projects are linked to this department filter.</p>
          )}
        </Panel>

        <Panel title="Risks">
          {visibleRisks.length ? (
            <div className="department-risk-list">
              {visibleRisks.map((risk) => (
                <button
                  key={risk.id}
                  type="button"
                  onClick={() =>
                    setDrawerContext({
                      title: risk.issue,
                      description: risk.impact,
                      impact: `Linked project: ${department.projects.find((project) => project.id === risk.projectId)?.name ?? 'Confirmed project'}`,
                      status: risk.status,
                      kind: 'risk',
                      reference:
                        department.projects.find((project) => project.id === risk.projectId)
                          ?.name ?? department.name,
                    })
                  }
                >
                  <span>
                    <strong>{risk.issue}</strong>
                    <small>{risk.impact}</small>
                  </span>
                  <StatusBadge status={risk.status} />
                  <ArrowRight aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <p className="empty-copy">No open risks match this department and project filter.</p>
          )}
        </Panel>
      </div>

      <Panel title="Goals adherence" className="section">
        {visibleGoals.length ? (
          <DataTable
            caption={`${department.name} goals adherence`}
            headers={['Goal', 'Project', 'Progress', 'Status']}
            rows={visibleGoals.map((goal) => [
              <strong>{goal.name}</strong>,
              goal.projectName,
              <div className="progress-cell">
                <progress value={goal.progressPercent} max={100} />
                <span>{goal.progressPercent}%</span>
              </div>,
              <StatusBadge status={goal.status} />,
            ])}
            onRowClick={(index) => navigate(`/projects/${visibleGoals[index].projectId}`)}
          />
        ) : (
          <p className="empty-copy">No goals match this department and project filter.</p>
        )}
      </Panel>
      <AtlasInsightDrawer context={drawerContext} onClose={() => setDrawerContext(null)} />
    </div>
  );
}

function PortfolioList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const view: PortfolioView = searchParams.get('tab') === 'projects' ? 'projects' : 'departments';
  return (
    <>
      <PageHeader
        title="Portfolio"
        description="How are confirmed projects and responsible departments delivering against plan?"
      />
      <DetailTabs
        label="Portfolio"
        value={view}
        tabs={portfolioViews}
        onChange={(nextView) => navigate(`/projects?tab=${nextView}`)}
      />
      {view === 'projects' ? <ProjectsList /> : <DepartmentsDashboard />}
    </>
  );
}

function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { plan, workflow, managerUpdates } = useAtlas();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [drawerContext, setDrawerContext] = useState<AtlasInsightContext | null>(null);
  const requestedView = searchParams.get('view');
  const view: ProjectView = projectViews.some((item) => item.id === requestedView)
    ? (requestedView as ProjectView)
    : 'overview';
  const focusedMeasure = searchParams.get('measure');
  const project = selectCommercialProjectWorkspace(
    plan.confirmedPlan,
    workflow,
    projectId,
    managerUpdates,
  );

  if (!plan.confirmedPlan) {
    return (
      <StateView
        type="empty"
        title="No confirmed project baseline"
        message="Confirm the approved plan before opening a project workspace."
        action={<Button onClick={() => navigate('/plan')}>Open Plan</Button>}
      />
    );
  }
  if (!project) {
    return (
      <StateView
        type="error"
        title="Project not found"
        message={`No confirmed project matches the identifier “${projectId}”.`}
        action={<Button onClick={() => navigate('/projects')}>Back to Portfolio</Button>}
      />
    );
  }

  const navigateView = (nextView: ProjectView, measure?: string) => {
    const query = new URLSearchParams({ view: nextView });
    if (measure) query.set('measure', measure);
    navigate(`/projects/${project.id}?${query.toString()}`);
  };
  const kpiMeasures = project.measures.filter((measure) => measure.type === 'KPI');
  return (
    <>
      <PageHeader
        title={project.name}
        description="Project workspace · performance against the confirmed approved plan"
        controls={
          <Button variant="secondary" onClick={() => navigate('/projects')}>
            <ArrowLeft aria-hidden="true" /> Back to Portfolio
          </Button>
        }
      />
      <div className="project-workspace-status" aria-label="Current project status">
        <span>
          Current phase <strong>{project.phase}</strong>
        </span>
        <span>
          Project health <strong>{project.healthPercent}%</strong>
        </span>
        <StatusBadge status={project.health} />
      </div>
      <DetailTabs
        label="Project workspace"
        value={view}
        onChange={navigateView}
        tabs={projectViews}
      />

      {view === 'overview' && (
        <div className="project-overview">
          <section aria-labelledby="project-kpis-title">
            <div className="section-heading">
              <div>
                <h2 id="project-kpis-title">Project KPIs</h2>
                <p>Latest reporting results against confirmed targets.</p>
              </div>
            </div>
            {kpiMeasures.length ? (
              <div className="grid grid--3 project-kpis">
                {kpiMeasures.map((measure) => (
                  <KpiCard
                    key={measure.id}
                    label={measure.name}
                    value={measureValue(measure.actualValue, measure.unit)}
                    status={measure.status}
                    context={`${measureValue(measure.approvedValue, measure.unit)} approved · ${measure.variance}`}
                    onClick={() => navigateView('adherence', measure.sourceId)}
                  />
                ))}
              </div>
            ) : (
              <p className="empty-copy">No KPIs are linked to this confirmed project baseline.</p>
            )}
          </section>

          <div className="project-overview-grid">
            <Panel title="Project objective">
              <p className="project-objective">{project.objective}</p>
              <dl className="summary-list">
                <div>
                  <dt>Current progress</dt>
                  <dd>
                    {project.progressPercent}% actual
                    {project.plannedProgressPercent !== null
                      ? ` · ${project.plannedProgressPercent}% planned`
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt>Reporting coverage</dt>
                  <dd>
                    {project.reportingAvailable
                      ? 'Latest reporting available'
                      : 'Awaiting first report'}
                  </dd>
                </div>
              </dl>
            </Panel>
            <Panel
              title="Target adherence"
              action={
                <Button variant="secondary" onClick={() => navigateView('adherence')}>
                  View adherence <ArrowRight aria-hidden="true" />
                </Button>
              }
            >
              <div className="target-adherence-summary">
                <strong>{project.targetAdherencePercent}%</strong>
                <span>combined target and milestone adherence</span>
                <progress
                  value={project.targetAdherencePercent}
                  max={100}
                  aria-label="Combined target and milestone adherence"
                />
              </div>
            </Panel>
          </div>

          <Panel title="Project insights">
            {project.insights.length ? (
              <div className="project-insights">
                {project.insights.map((insight) => (
                  <button
                    key={insight.id}
                    onClick={() =>
                      setDrawerContext({
                        title: insight.title,
                        description: insight.reason,
                        impact: `Project: ${project.name}`,
                        status: insight.status,
                        kind: 'insight',
                        reference: project.name,
                      })
                    }
                  >
                    <span>
                      <strong>{insight.title}</strong>
                      <small>{insight.reason}</small>
                    </span>
                    <StatusBadge status={insight.status} />
                    <ArrowRight aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-copy">No project-specific matters currently require attention.</p>
            )}
          </Panel>
        </div>
      )}

      {view === 'adherence' && (
        <div className="project-adherence">
          <div className="section-heading">
            <div>
              <h2>Approved measure adherence</h2>
              <p>
                Read-only comparison against the confirmed baseline. Baseline revisions remain in
                Plan.
              </p>
            </div>
          </div>
          {focusedMeasure && (
            <p className="info-panel" role="status">
              <strong>Focused measure</strong>
              <span>
                {project.measures.find((measure) => measure.sourceId === focusedMeasure)?.name ??
                  'The linked measure'}
              </span>
            </p>
          )}
          <ProjectMeasureTable
            type="Target"
            measures={project.measures}
            focusedMeasure={focusedMeasure}
          />
          <ProjectMeasureTable
            type="Milestone"
            measures={project.measures}
            focusedMeasure={focusedMeasure}
          />
        </div>
      )}

      {view === 'activity' && (
        <Panel title="Activity log" className="section">
          {project.activities.length ? (
            <ol className="project-activity-log">
              {project.activities.map((activity) => (
                <li key={activity.id}>
                  <time dateTime={activity.timestamp}>
                    {new Intl.DateTimeFormat('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(activity.timestamp))}
                  </time>
                  <div>
                    <strong>{activity.description}</strong>
                    <p>{activity.context}</p>
                    <small>{activity.actor}</small>
                  </div>
                  <StatusBadge status={activity.status} />
                  {activity.destination && (
                    <Button variant="secondary" onClick={() => navigate(activity.destination!)}>
                      Open record
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty-copy">No activity has been recorded for this project.</p>
          )}
        </Panel>
      )}
      <AtlasInsightDrawer context={drawerContext} onClose={() => setDrawerContext(null)} />
    </>
  );
}

export default function CommercialProjectsPage() {
  const { projectId } = useParams();
  return projectId ? <ProjectWorkspace projectId={projectId} /> : <PortfolioList />;
}
