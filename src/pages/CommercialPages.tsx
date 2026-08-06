import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ContextControls } from '../components/Shells';
import {
  Button,
  DataTable,
  DetailTabs,
  Drawer,
  Field,
  Modal,
  PageHeader,
  Panel,
  StatusBadge,
  useToast,
} from '../components/Ui';
import { EvidenceTable, HistoryTable } from '../components/Traceability';
import { format, getStrategicObjective, getUser, phase1Domain } from '../data/atlas';
import { useAtlas } from '../state/AtlasContext';
import type { CommercialRecommendation } from '../state/recommendations';

const recommendationCategories = ['production', 'integrity', 'finance', 'legal', 'hse', 'projects'];

function prototypeTime(sequence: number) {
  return `2026-08-01T11:${String(sequence % 60).padStart(2, '0')}:00+01:00`;
}

type ProjectTab =
  | 'overview'
  | 'activities'
  | 'updates'
  | 'commitments'
  | 'risks'
  | 'decisions'
  | 'history'
  | 'evidence';

const projectTabs: readonly { id: ProjectTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'activities', label: 'Activities' },
  { id: 'updates', label: 'Weekly Updates' },
  { id: 'commitments', label: 'Commitments' },
  { id: 'risks', label: 'Risks' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'history', label: 'History' },
  { id: 'evidence', label: 'Evidence' },
];

export function ProjectsPage() {
  const { plan } = useAtlas();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedHealth = searchParams.get('health');
  const selectedProjectId = projectId ?? null;
  const [detailTab, setDetailTab] = useState<ProjectTab>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(requestedHealth ?? 'all');
  const [objectiveFilter, setObjectiveFilter] = useState('all');
  const baselineProjects = plan.confirmedPlan?.projects ?? [];
  const currentProjects = phase1Domain.projects.map((project) => ({
    ...project,
    name: baselineProjects.find((baseline) => baseline.id === project.id)?.name ?? project.name,
  }));
  const selected = currentProjects.find((project) => project.id === selectedProjectId);
  const filteredProjects = currentProjects.filter(
    (project) =>
      project.name.toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter === 'all' ||
        project.status === statusFilter ||
        (statusFilter === 'critical' && project.status === 'delayed')) &&
      (objectiveFilter === 'all' || project.strategicObjectiveIds.includes(objectiveFilter)),
  );
  const openProject = (id: string) => {
    setDetailTab('overview');
    navigate(`/projects/${id}`);
  };

  return (
    <>
      <PageHeader
        title="Projects"
        description="Which projects are delivering as planned, and which require intervention?"
        controls={<ContextControls />}
      />
      <div className="project-toolbar" aria-label="Project filters">
        <Field label="Search projects">
          <input
            type="search"
            value={search}
            placeholder="Search projects"
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        <Field label="Project health">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All health states</option>
            <option value="on_track">On track</option>
            <option value="at_risk">At risk</option>
            <option value="critical">Critical</option>
            <option value="delayed">Delayed</option>
          </select>
        </Field>
        <Field label="Strategic objective">
          <select
            value={objectiveFilter}
            onChange={(event) => setObjectiveFilter(event.target.value)}
          >
            <option value="all">All strategic objectives</option>
            {phase1Domain.strategicObjectives.map((objective) => (
              <option key={objective.id} value={objective.id}>
                {objective.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Panel title="Project portfolio" className="section">
        <DataTable
          caption="Commercial project portfolio"
          headers={[
            'Project',
            'Strategic Objective',
            'Phase',
            'Health',
            'Milestone Progress',
            'Budget Variance',
            'Key Risk',
            'Next Milestone',
          ]}
          rows={filteredProjects.map((project) => {
            const confirmedBaseline = baselineProjects.find((item) => item.id === project.id);
            const budget = phase1Domain.budgetLines.find(
              (line) => line.id === project.approvedBudgetLineId,
            );
            const approvedBaseline =
              confirmedBaseline?.budget.approvedAmount ?? budget?.approvedBaseline;
            const variance =
              budget && approvedBaseline
                ? ((budget.currentForecast - approvedBaseline) / approvedBaseline) * 100
                : 0;
            const risk = phase1Domain.risks.find((item) => project.riskIds.includes(item.id));
            const milestone =
              confirmedBaseline?.milestones[0] ??
              phase1Domain.milestones.find((item) => project.milestoneIds.includes(item.id));
            return [
              project.name,
              getStrategicObjective(project.strategicObjectiveIds[0])?.name ?? '—',
              project.phase ?? 'Execution',
              <StatusBadge status={project.status} />,
              <div className="progress-cell">
                <progress value={project.progressPercent} max={100} />
                <span>{project.progressPercent}%</span>
              </div>,
              budget ? format.percent(variance) : '—',
              risk?.description ?? 'No material risk',
              milestone ? `${milestone.name} · ${format.date(milestone.dueDate)}` : '—',
            ];
          })}
          onRowClick={(index) => openProject(filteredProjects[index].id)}
        />
      </Panel>
      <Drawer
        title={selected?.name ?? ''}
        open={Boolean(selected)}
        onClose={() => {
          navigate('/projects');
        }}
      >
        {selected && (
          <div className="detail-workspace">
            <DetailTabs
              label="Project detail"
              value={detailTab}
              onChange={setDetailTab}
              tabs={projectTabs}
            />
            {detailTab === 'overview' && <ProjectOverview projectId={selected.id} />}
            {detailTab === 'activities' && <ProjectActivities projectId={selected.id} />}
            {detailTab === 'updates' && <ProjectUpdates projectId={selected.id} />}
            {detailTab === 'commitments' && <ProjectCommitments projectId={selected.id} />}
            {detailTab === 'risks' && <ProjectRisks projectId={selected.id} />}
            {detailTab === 'decisions' && <ProjectDecisions projectId={selected.id} />}
            {detailTab === 'history' && (
              <HistoryTable revisionIds={selected.historicalRevisionIds} entityId={selected.id} />
            )}
            {detailTab === 'evidence' && <EvidenceTable evidenceIds={selected.evidenceIds} />}
          </div>
        )}
      </Drawer>
    </>
  );
}

function ProjectOverview({ projectId }: { projectId: string }) {
  const { plan } = useAtlas();
  const project = phase1Domain.projects.find((record) => record.id === projectId)!;
  const confirmedBaseline = plan.confirmedPlan?.projects.find((record) => record.id === projectId);
  const budget = phase1Domain.budgetLines.find((line) => line.id === project.approvedBudgetLineId);
  const milestone =
    confirmedBaseline?.milestones[0] ??
    phase1Domain.milestones.find((item) => project.milestoneIds.includes(item.id));
  const approvedBaseline = confirmedBaseline?.budget.approvedAmount ?? budget?.approvedBaseline;
  const variance =
    budget && approvedBaseline
      ? ((budget.currentForecast - approvedBaseline) / approvedBaseline) * 100
      : 0;
  return (
    <div className="detail-stack">
      <div className="detail-lead">
        <StatusBadge status={project.status} />
        <strong>{project.progressPercent}% complete</strong>
        <p>{project.issue ?? 'No material variance requires intervention.'}</p>
      </div>
      <dl className="summary-list">
        <div>
          <dt>Performance against plan</dt>
          <dd>
            {project.progressPercent}% actual · {project.planPercent ?? project.progressPercent}%
            plan
          </dd>
        </div>
        <div>
          <dt>Budget variance</dt>
          <dd>{budget ? format.percent(variance) : 'No linked budget line'}</dd>
        </div>
        <div>
          <dt>Next milestone</dt>
          <dd>{milestone ? `${milestone.name} · ${format.date(milestone.dueDate)}` : '—'}</dd>
        </div>
        <div>
          <dt>Required action</dt>
          <dd>
            {project.decisionIds.length ? 'Resolve linked decision before milestone' : 'Monitor'}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ProjectActivities({ projectId }: { projectId: string }) {
  const records = phase1Domain.operationalActivities.filter(
    (record) => record.projectId === projectId,
  );
  return (
    <DataTable
      caption="Project activities"
      headers={['Activity', 'Owner', 'Progress', 'Blocker', 'Expected completion']}
      rows={records.map((record) => [
        record.title,
        getUser(record.ownerId ?? '')?.name ?? 'Unassigned',
        `${record.progressPercent}%`,
        record.blocker ?? 'No blocker',
        format.date(record.expectedCompletion),
      ])}
    />
  );
}

function ProjectUpdates({ projectId }: { projectId: string }) {
  const records = phase1Domain.weeklyExecutionUpdates.filter(
    (record) => record.projectId === projectId,
  );
  return (
    <DataTable
      caption="Project weekly updates"
      headers={['Update', 'Executive highlight', 'Forecast change', 'Status']}
      rows={records.map((record) => [
        record.title,
        record.executiveHighlight,
        record.forecastChanges,
        <StatusBadge status={record.status} />,
      ])}
    />
  );
}

function ProjectCommitments({ projectId }: { projectId: string }) {
  const records = phase1Domain.commitments.filter((record) => record.projectId === projectId);
  return (
    <DataTable
      caption="Project commitments"
      headers={['Commitment', 'Owner', 'Due date', 'Expected result', 'Status']}
      rows={records.map((record) => [
        record.description,
        getUser(record.ownerId ?? '')?.name ?? 'Unassigned',
        format.date(record.dueDate),
        record.expectedResult,
        <StatusBadge status={record.status} />,
      ])}
    />
  );
}

function ProjectRisks({ projectId }: { projectId: string }) {
  const records = phase1Domain.risks.filter((record) => record.projectId === projectId);
  return (
    <DataTable
      caption="Project risks"
      headers={['Risk', 'Impact', 'Trend', 'Mitigation', 'Status']}
      rows={records.map((record) => [
        record.description,
        record.impact,
        record.trend,
        record.mitigation,
        <StatusBadge status={record.status} />,
      ])}
    />
  );
}

function ProjectDecisions({ projectId }: { projectId: string }) {
  const records = phase1Domain.decisionSupportItems.filter(
    (record) => record.projectId === projectId,
  );
  return (
    <DataTable
      caption="Project decisions"
      headers={['Issue', 'Business impact', 'Recommended action', 'Due date', 'Status']}
      rows={records.map((record) => [
        record.issue,
        record.businessImpact,
        record.recommendedAction,
        format.date(record.dueDate),
        <StatusBadge status={record.status} />,
      ])}
    />
  );
}

export function RecommendationsPage({ embedded = false }: { embedded?: boolean }) {
  const { activeUserId, recommendations, recommendationDispatch } = useAtlas();
  const showToast = useToast();
  const [category, setCategory] = useState('production');
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [impact, setImpact] = useState('');
  const [editing, setEditing] = useState<CommercialRecommendation | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editRationale, setEditRationale] = useState('');
  const [editImpact, setEditImpact] = useState('');

  const openEdit = (item: CommercialRecommendation) => {
    setEditing(item);
    setEditCategory(item.category);
    setEditTitle(item.title);
    setEditRationale(item.rationale);
    setEditImpact(item.impact);
  };

  return (
    <>
      {!embedded && (
        <PageHeader
          title="Decision Support"
          description="Review Recommended Actions and shape the items proposed for executive decision."
          controls={<ContextControls />}
        />
      )}
      <Panel title="Write a Commercial Recommended Action" className="recommendation-compose">
        <p>
          Add your judgement prominently before consolidation. Every Recommended Action remains
          editable and auditable in this device-local prototype.
        </p>
        <div className="form-grid">
          <Field label="Category">
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {recommendationCategories.map((item) => (
                <option key={item} value={item}>
                  {item[0].toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Recommended Action title">
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Rationale">
            <textarea
              rows={4}
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
            />
          </Field>
          <Field label="Expected impact">
            <textarea rows={4} value={impact} onChange={(event) => setImpact(event.target.value)} />
          </Field>
        </div>
        {recommendations.error && <p className="field__error">{recommendations.error}</p>}
        <div className="form-actions">
          <Button
            disabled={!title.trim() || !rationale.trim() || !impact.trim()}
            onClick={() => {
              recommendationDispatch({
                type: 'CREATE_RECOMMENDATION',
                category,
                title,
                rationale,
                impact,
                actorId: activeUserId,
                now: prototypeTime(recommendations.auditEvents.length + 1),
              });
              setTitle('');
              setRationale('');
              setImpact('');
              showToast('Commercial Recommended Action added');
            }}
          >
            Add Recommended Action
          </Button>
        </div>
      </Panel>

      <Panel title="System and Commercial Recommended Actions" className="section recommendations">
        {recommendations.items.map((item) => (
          <article className="recommendation" key={item.id}>
            <div>
              <StatusBadge status={item.status} />
              <small>
                {item.source === 'atlas_system' ? 'Atlas system' : 'Commercial Manager'}
              </small>
            </div>
            <div>
              <h3>{item.title}</h3>
              <p>{item.rationale}</p>
              <small>{item.impact}</small>
            </div>
            <div className="recommendation-actions">
              <Button variant="secondary" onClick={() => openEdit(item)}>
                Edit
              </Button>
              <Button
                disabled={item.status === 'approved'}
                onClick={() => {
                  recommendationDispatch({
                    type: 'APPROVE_RECOMMENDATION',
                    id: item.id,
                    actorId: activeUserId,
                    now: prototypeTime(recommendations.auditEvents.length + 1),
                  });
                  showToast('Recommended Action approved by Commercial');
                }}
              >
                {item.status === 'approved' ? 'Approved' : 'Approve'}
              </Button>
            </div>
          </article>
        ))}
      </Panel>

      <Modal
        title={`Edit Recommended Action${editing ? ` · ${editing.title}` : ''}`}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editTitle.trim() || !editRationale.trim() || !editImpact.trim()}
              onClick={() => {
                if (!editing) return;
                recommendationDispatch({
                  type: 'EDIT_RECOMMENDATION',
                  id: editing.id,
                  category: editCategory,
                  title: editTitle,
                  rationale: editRationale,
                  impact: editImpact,
                  actorId: activeUserId,
                  now: prototypeTime(recommendations.auditEvents.length + 1),
                });
                setEditing(null);
                showToast('Recommended Action edits saved with an audit event');
              }}
            >
              Save changes
            </Button>
          </>
        }
      >
        <Field label="Category">
          <select value={editCategory} onChange={(event) => setEditCategory(event.target.value)}>
            {recommendationCategories.map((item) => (
              <option key={item} value={item}>
                {item[0].toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Recommended Action title">
          <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
        </Field>
        <Field label="Rationale">
          <textarea
            rows={4}
            value={editRationale}
            onChange={(event) => setEditRationale(event.target.value)}
          />
        </Field>
        <Field label="Expected impact">
          <textarea
            rows={4}
            value={editImpact}
            onChange={(event) => setEditImpact(event.target.value)}
          />
        </Field>
      </Modal>
    </>
  );
}
