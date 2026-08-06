import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { useAtlas } from '../state/AtlasContext';

type ProjectView = 'overview' | 'adherence' | 'activity';

const projectViews: readonly { id: ProjectView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'adherence', label: 'KPI, target and milestone adherence' },
  { id: 'activity', label: 'Activity log' },
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
  return (
    <Panel title={`${type} adherence`} className="section">
      {records.length ? (
        <DataTable
          caption={`${type} adherence`}
          headers={[
            'Measure',
            'Type',
            'Department',
            'Approved baseline / target',
            'Current actual / status',
            'Variance / adherence',
            'Due date / reporting period',
            'Health',
          ]}
          rows={records.map((measure) => [
            <span
              className={focusedMeasure === measure.sourceId ? 'measure-focus' : undefined}
              aria-current={focusedMeasure === measure.sourceId ? 'true' : undefined}
            >
              {measure.name}
            </span>,
            <span className="measure-type">{measure.type}</span>,
            measure.department,
            measureValue(measure.approvedValue, measure.unit),
            measureValue(measure.actualValue, measure.unit),
            <div className="adherence-cell">
              <span>{measure.variance}</span>
              <progress
                value={measure.adherencePercent}
                max={100}
                aria-label={`${measure.name} adherence`}
              />
              <small>{measure.adherencePercent}% adherence</small>
            </div>,
            measure.dueOrPeriod.includes('2026-')
              ? format.date(measure.dueOrPeriod)
              : measure.dueOrPeriod,
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
  const { plan } = useAtlas();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const projects = selectCommercialProjects(plan.confirmedPlan);

  if (!plan.confirmedPlan) {
    return (
      <>
        <PageHeader
          title="Projects"
          description="How is each project performing against the confirmed approved plan?"
        />
        <StateView
          type="empty"
          title="Confirm an approved plan to activate Projects"
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
      <PageHeader
        title="Projects"
        description="How is each project performing against the confirmed approved plan?"
      />
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

function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { plan, workflow } = useAtlas();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedView = searchParams.get('view');
  const view: ProjectView = projectViews.some((item) => item.id === requestedView)
    ? (requestedView as ProjectView)
    : 'overview';
  const focusedMeasure = searchParams.get('measure');
  const project = selectCommercialProjectWorkspace(plan.confirmedPlan, workflow, projectId);

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
        action={<Button onClick={() => navigate('/projects')}>Back to Projects</Button>}
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
            <ArrowLeft aria-hidden="true" /> Back to Projects
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
                  <button key={insight.id} onClick={() => navigate(insight.destination)}>
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
            type="KPI"
            measures={project.measures}
            focusedMeasure={focusedMeasure}
          />
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
    </>
  );
}

export default function CommercialProjectsPage() {
  const { projectId } = useParams();
  return projectId ? <ProjectWorkspace projectId={projectId} /> : <ProjectsList />;
}
