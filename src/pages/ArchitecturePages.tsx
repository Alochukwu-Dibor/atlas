import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartWrapper } from '../components/Charts';
import {
  Button,
  DataTable,
  DetailTabs,
  Drawer,
  KpiCard,
  PageHeader,
  Panel,
  Select,
  StatusBadge,
  useToast,
} from '../components/Ui';
import { DecisionHistory, EvidenceTable, HistoryTable } from '../components/Traceability';
import { RecommendationsPage } from './CommercialPages';
import {
  atlas,
  format,
  getBusinessPlanDelivery,
  getDepartment,
  getObjectiveKpis,
  getStrategicObjective,
  getUser,
  getValidatedExecutiveData,
  phase1Domain,
} from '../data/atlas';
import { useAtlas } from '../state/AtlasContext';
import { reportDepartmentName, selectSubmissionQueue } from '../state/workflow';

type ObjectiveTab =
  | 'overview'
  | 'kpis'
  | 'projects'
  | 'activities'
  | 'updates'
  | 'commitments'
  | 'risks'
  | 'decisions'
  | 'evidence';

const objectiveTabs: readonly { id: ObjectiveTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'kpis', label: 'KPIs' },
  { id: 'projects', label: 'Projects and Initiatives' },
  { id: 'activities', label: 'Activities' },
  { id: 'updates', label: 'Weekly Updates' },
  { id: 'commitments', label: 'Commitments' },
  { id: 'risks', label: 'Risks' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'evidence', label: 'Evidence and History' },
];

export function ExecutionPage() {
  const { businessUnitId } = useAtlas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<ObjectiveTab>('overview');
  const delivery = getBusinessPlanDelivery(businessUnitId);
  const selected = selectedId ? getStrategicObjective(selectedId) : undefined;

  const openObjective = (objectiveId: string) => {
    setSelectedId(objectiveId);
    setDetailTab('overview');
  };

  return (
    <>
      <PageHeader
        title="Execution"
        description="How is the approved business plan being delivered?"
      />
      <Panel title="Strategic objective delivery">
        <DataTable
          caption="Strategic objective delivery"
          headers={[
            'Objective',
            'Status',
            'Progress',
            'Owner',
            'Key KPI',
            'Linked budget',
            'Material risk',
            'Outstanding commitment',
          ]}
          rows={delivery.objectives.map((objective) => {
            const keyKpi = getObjectiveKpis(objective.id)[0];
            const linkedBudget = phase1Domain.budgetLines
              .filter((line) => objective.budgetLineIds.includes(line.id))
              .reduce((sum, line) => sum + line.approvedBaseline, 0);
            const risk = phase1Domain.risks.find((item) => objective.riskIds.includes(item.id));
            const commitment = phase1Domain.commitments.find(
              (item) =>
                objective.commitmentIds.includes(item.id) &&
                !['completed', 'closed'].includes(item.status),
            );
            return [
              objective.name,
              <StatusBadge status={objective.status} />,
              <div className="progress-cell">
                <progress value={objective.progressPercent} max={100} />
                <span>{objective.progressPercent}%</span>
              </div>,
              getUser(objective.ownerId ?? '')?.name ?? 'Unassigned',
              keyKpi?.target
                ? `${keyKpi.definition.name}: ${format.number(keyKpi.target.actual)} ${keyKpi.definition.unit}`
                : '—',
              linkedBudget ? format.usd(linkedBudget) : 'No dedicated line',
              risk?.description ?? 'No material risk',
              commitment?.description ?? 'None outstanding',
            ];
          })}
          onRowClick={(index) => openObjective(delivery.objectives[index].id)}
        />
      </Panel>
      <Drawer
        title={selected?.name ?? ''}
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
      >
        {selected && (
          <div className="detail-workspace">
            <DetailTabs
              label="Objective detail"
              value={detailTab}
              onChange={setDetailTab}
              tabs={objectiveTabs}
            />
            {detailTab === 'overview' && <ObjectiveOverview objectiveId={selected.id} />}
            {detailTab === 'kpis' && <ObjectiveKpis objectiveId={selected.id} />}
            {detailTab === 'projects' && <ObjectiveProjects objectiveId={selected.id} />}
            {detailTab === 'activities' && <ObjectiveActivities objectiveId={selected.id} />}
            {detailTab === 'updates' && <ObjectiveUpdates objectiveId={selected.id} />}
            {detailTab === 'commitments' && <ObjectiveCommitments objectiveId={selected.id} />}
            {detailTab === 'risks' && <ObjectiveRisks objectiveId={selected.id} />}
            {detailTab === 'decisions' && <ObjectiveDecisions objectiveId={selected.id} />}
            {detailTab === 'evidence' && (
              <div className="detail-stack">
                <h3>Evidence</h3>
                <EvidenceTable evidenceIds={selected.evidenceIds} />
                <h3>History</h3>
                <HistoryTable revisionIds={selected.historicalRevisionIds} entityId={selected.id} />
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}

function ObjectiveOverview({ objectiveId }: { objectiveId: string }) {
  const objective = getStrategicObjective(objectiveId)!;
  const linkedBudget = phase1Domain.budgetLines
    .filter((line) => objective.budgetLineIds.includes(line.id))
    .reduce((sum, line) => sum + line.approvedBaseline, 0);
  return (
    <div className="detail-stack">
      <div className="detail-lead">
        <StatusBadge status={objective.status} />
        <strong>{objective.progressPercent}% delivered</strong>
        <p>{objective.description}</p>
      </div>
      <dl className="summary-list">
        <div>
          <dt>Owner</dt>
          <dd>{getUser(objective.ownerId ?? '')?.name ?? 'Unassigned'}</dd>
        </div>
        <div>
          <dt>Linked budget</dt>
          <dd>{linkedBudget ? format.usd(linkedBudget) : 'No dedicated budget line'}</dd>
        </div>
        <div>
          <dt>Delivery vehicles</dt>
          <dd>{objective.projectIds.length + objective.initiativeIds.length}</dd>
        </div>
        <div>
          <dt>Current attention</dt>
          <dd>
            {objective.riskIds.length} risks · {objective.commitmentIds.length} commitments
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ObjectiveKpis({ objectiveId }: { objectiveId: string }) {
  return (
    <DataTable
      caption="Objective KPIs"
      headers={['KPI', 'Approved baseline', 'Actual', 'Forecast', 'Prior forecast', 'Status']}
      rows={getObjectiveKpis(objectiveId).map(({ definition, target }) => [
        definition.name,
        target ? `${format.number(target.approvedBaseline)} ${definition.unit}` : '—',
        target ? `${format.number(target.actual)} ${definition.unit}` : '—',
        target ? `${format.number(target.currentForecast)} ${definition.unit}` : '—',
        target ? `${format.number(target.priorForecast)} ${definition.unit}` : '—',
        target ? <StatusBadge status={target.status} /> : '—',
      ])}
    />
  );
}

function ObjectiveProjects({ objectiveId }: { objectiveId: string }) {
  const records = [...phase1Domain.projects, ...phase1Domain.initiatives].filter((record) =>
    record.strategicObjectiveIds.includes(objectiveId),
  );
  return (
    <DataTable
      caption="Objective projects and initiatives"
      headers={['Project or initiative', 'Type', 'Status', 'Progress']}
      rows={records.map((record) => [
        record.name,
        record.type,
        <StatusBadge status={record.status} />,
        `${record.progressPercent}%`,
      ])}
    />
  );
}

function ObjectiveActivities({ objectiveId }: { objectiveId: string }) {
  const records = phase1Domain.operationalActivities.filter((record) =>
    record.strategicObjectiveIds.includes(objectiveId),
  );
  return (
    <DataTable
      caption="Objective activities"
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

function ObjectiveUpdates({ objectiveId }: { objectiveId: string }) {
  const records = phase1Domain.weeklyExecutionUpdates.filter((record) =>
    record.strategicObjectiveIds.includes(objectiveId),
  );
  return (
    <DataTable
      caption="Objective weekly updates"
      headers={['Weekly update', 'Highlight', 'Forecast change', 'Status']}
      rows={records.map((record) => [
        record.title,
        record.executiveHighlight,
        record.forecastChanges,
        <StatusBadge status={record.status} />,
      ])}
    />
  );
}

function ObjectiveCommitments({ objectiveId }: { objectiveId: string }) {
  const records = phase1Domain.commitments.filter((record) =>
    record.strategicObjectiveIds.includes(objectiveId),
  );
  return (
    <DataTable
      caption="Objective commitments"
      headers={['Commitment', 'Owner', 'Due date', 'Expected result', 'Status', 'Revisions']}
      rows={records.map((record) => [
        record.description,
        getUser(record.ownerId ?? '')?.name ?? 'Unassigned',
        format.date(record.dueDate),
        record.expectedResult,
        <StatusBadge status={record.status} />,
        String(record.revisionCount),
      ])}
    />
  );
}

function ObjectiveRisks({ objectiveId }: { objectiveId: string }) {
  const records = phase1Domain.risks.filter((record) =>
    record.strategicObjectiveIds.includes(objectiveId),
  );
  return (
    <DataTable
      caption="Objective risks"
      headers={['Risk', 'Impact', 'Trend', 'Exposure', 'Status']}
      rows={records.map((record) => [
        record.description,
        record.impact,
        record.trend,
        format.usd(record.financialExposure),
        <StatusBadge status={record.status} />,
      ])}
    />
  );
}

function ObjectiveDecisions({ objectiveId }: { objectiveId: string }) {
  const records = phase1Domain.decisionSupportItems.filter((record) =>
    record.strategicObjectiveIds.includes(objectiveId),
  );
  return (
    <DataTable
      caption="Objective decisions"
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

export function ReviewsPage() {
  const navigate = useNavigate();
  const { workflow } = useAtlas();
  const [periodFilter, setPeriodFilter] = useState('all');
  const [contextFilter, setContextFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const queue = selectSubmissionQueue(workflow).filter(
    (update) =>
      (periodFilter === 'all' || update.cycleId === periodFilter) &&
      (contextFilter === 'all' ||
        update.businessUnitId === contextFilter ||
        update.projectId === contextFilter) &&
      (statusFilter === 'all' || update.status === statusFilter),
  );
  const methodLabels: Record<string, string> = {
    structured_form: 'Structured form',
    xlsx_upload: 'Spreadsheet upload',
    document_upload: 'Report upload',
    paste_email_or_transcript: 'Manual entry or pasted transcript',
  };
  const methodName = (method: string) => methodLabels[method] ?? method.replaceAll('_', ' ');
  return (
    <>
      <PageHeader
        title="Reviews"
        description="Validate Weekly Execution Updates before they affect executive insights or Outputs."
      />
      <div className="filter-bar section" aria-label="Review filters">
        <Select
          label="Reporting period filter"
          value={periodFilter}
          onChange={setPeriodFilter}
          options={[
            { value: 'all', label: 'All reporting periods' },
            ...atlas.reportingCycles.map((period) => ({ value: period.id, label: period.label })),
          ]}
        />
        <Select
          label="Business unit or project filter"
          value={contextFilter}
          onChange={setContextFilter}
          options={[
            { value: 'all', label: 'All business units and projects' },
            ...atlas.businessUnits.map((unit) => ({ value: unit.id, label: unit.name })),
            ...atlas.projects.map((project) => ({ value: project.id, label: project.name })),
          ]}
        />
        <Select
          label="Review status filter"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All review statuses' },
            { value: 'submitted', label: 'Submitted' },
            { value: 'resubmitted', label: 'Resubmitted' },
            { value: 'needs_clarification', label: 'Clarification requested' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
      </div>
      <Panel title="Weekly Execution Update review queue" className="section">
        <DataTable
          caption="Weekly Execution Update review queue"
          headers={[
            'Department',
            'Manager',
            'Business unit or project',
            'Reporting period',
            'Submission method',
            'Status',
            'Material change',
            'Action',
          ]}
          rows={queue.map((update) => [
            reportDepartmentName(update),
            getUser(update.managerId ?? '')?.name ?? 'Unassigned',
            update.projectId
              ? (atlas.projects.find((project) => project.id === update.projectId)?.name ??
                'Project')
              : (atlas.businessUnits.find((unit) => unit.id === update.businessUnitId)?.name ??
                '—'),
            atlas.reportingCycles.find((period) => period.id === update.cycleId)?.label ?? '—',
            update.methods.map(methodName).join(' · '),
            <StatusBadge status={update.status} />,
            update.weekly.materialChange,
            'Review update',
          ])}
          onRowClick={(index) => navigate(`/reviews/${queue[index].id}`)}
        />
      </Panel>
    </>
  );
}

type DecisionTab = 'summary' | 'context' | 'history' | 'evidence' | 'comments';

const decisionTabs: readonly { id: DecisionTab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'context', label: 'Context' },
  { id: 'history', label: 'History' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'comments', label: 'Comments' },
];

export function DecisionsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DecisionTab>('summary');
  const [recommendedActionsOpen, setRecommendedActionsOpen] = useState(false);
  const selected = phase1Domain.decisionSupportItems.find((item) => item.id === selectedId);
  const linkedMeeting = atlas.meetingRecords.find((meeting) =>
    meeting.decisionIds.includes(selectedId ?? ''),
  );
  const openDecision = (id: string) => {
    setSelectedId(id);
    setDetailTab('summary');
  };
  return (
    <>
      <PageHeader
        title="Decisions"
        description="What requires approval, intervention or escalation?"
        controls={
          <Button variant="secondary" onClick={() => setRecommendedActionsOpen(true)}>
            Draft recommended action
          </Button>
        }
      />
      <Panel title="Decision queue">
        <DataTable
          caption="Decision Support items"
          headers={[
            'Issue',
            'Type',
            'Business impact',
            'Owner',
            'Due date',
            'Status',
            'Final decision',
          ]}
          rows={phase1Domain.decisionSupportItems.map((item) => [
            item.issue,
            item.type.replaceAll('_', ' '),
            item.businessImpact,
            getUser(item.ownerId ?? '')?.name ?? 'Unassigned',
            format.date(item.dueDate),
            <StatusBadge status={item.status} />,
            item.finalDecision ?? 'Pending',
          ])}
          onRowClick={(index) => openDecision(phase1Domain.decisionSupportItems[index].id)}
        />
      </Panel>
      <Drawer
        title={selected?.issue ?? ''}
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
      >
        {selected && (
          <div className="detail-workspace">
            <DetailTabs
              label="Decision detail"
              value={detailTab}
              onChange={setDetailTab}
              tabs={decisionTabs}
            />
            {detailTab === 'summary' && (
              <div className="detail-stack">
                <div className="detail-lead">
                  <StatusBadge status={selected.status} />
                  <strong>{selected.recommendedAction}</strong>
                  <p>{selected.whyItMatters}</p>
                </div>
                <dl className="summary-list">
                  <div>
                    <dt>Owner</dt>
                    <dd>{getUser(selected.ownerId ?? '')?.name ?? 'Unassigned'}</dd>
                  </div>
                  <div>
                    <dt>Due date</dt>
                    <dd>{format.date(selected.dueDate)}</dd>
                  </div>
                  <div>
                    <dt>Final decision</dt>
                    <dd>{selected.finalDecision ?? 'Not yet recorded'}</dd>
                  </div>
                  <div>
                    <dt>Approved by</dt>
                    <dd>
                      {selected.approvedBy
                        ? (getUser(selected.approvedBy)?.name ?? 'Unknown')
                        : 'Pending approval'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
            {detailTab === 'context' && (
              <dl className="context-list">
                <div>
                  <dt>Why it matters</dt>
                  <dd>{selected.whyItMatters}</dd>
                </div>
                <div>
                  <dt>Historical context</dt>
                  <dd>{selected.historicalContext}</dd>
                </div>
                <div>
                  <dt>Business impact</dt>
                  <dd>{selected.businessImpact}</dd>
                </div>
                <div>
                  <dt>Recommended action</dt>
                  <dd>{selected.recommendedAction}</dd>
                </div>
                {linkedMeeting && (
                  <div>
                    <dt>Governance source</dt>
                    <dd>
                      <strong>{linkedMeeting.name}</strong> · {format.date(linkedMeeting.date)}
                      <br />
                      {linkedMeeting.summary}
                      <br />
                      Owner: {getUser(linkedMeeting.ownerId)?.name ?? 'Unassigned'} · 1 linked
                      commitment · {linkedMeeting.evidenceIds.length} evidence records
                    </dd>
                  </div>
                )}
              </dl>
            )}
            {detailTab === 'history' && (
              <div className="detail-stack">
                <DecisionHistory decisionId={selected.id} />
                <HistoryTable revisionIds={selected.historicalRevisionIds} entityId={selected.id} />
              </div>
            )}
            {detailTab === 'evidence' && <EvidenceTable evidenceIds={selected.evidenceIds} />}
            {detailTab === 'comments' && (
              <p className="empty-copy">
                No comments recorded. Clarifications remain linked to the originating review.
              </p>
            )}
          </div>
        )}
      </Drawer>
      <Drawer
        title="Recommended actions"
        open={recommendedActionsOpen}
        onClose={() => setRecommendedActionsOpen(false)}
      >
        <RecommendationsPage embedded />
      </Drawer>
    </>
  );
}

export function OutputsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'preview' | 'inputs' | 'evidence'>('preview');
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  const showToast = useToast();
  const selected = phase1Domain.outputs.find((output) => output.id === selectedId);
  const categories = [
    { id: 'management', label: 'Management' },
    { id: 'executive_governance', label: 'Executive and Governance' },
    { id: 'regulatory', label: 'Regulatory' },
  ] as const;
  const missingInputName = (id: string) =>
    phase1Domain.weeklyExecutionUpdates.find((item) => item.id === id)?.title ??
    phase1Domain.decisionSupportItems.find((item) => item.id === id)?.issue ??
    phase1Domain.evidenceRecords.find((item) => item.id === id)?.name ??
    id;
  const canGenerate = (output: (typeof phase1Domain.outputs)[number]) =>
    output.readinessStatus === 'ready' && output.missingInputIds.length === 0;
  return (
    <>
      <PageHeader
        title="Outputs"
        description="What validated report or structured output should be produced?"
      />
      {categories.map((category, index) => {
        const outputs = phase1Domain.outputs.filter((output) => output.audience === category.id);
        return (
          <Panel key={category.id} title={category.label} className={index === 0 ? '' : 'section'}>
            <DataTable
              caption={`${category.label} outputs`}
              headers={[
                'Output',
                'Audience',
                'Reporting period',
                'Readiness',
                'Missing inputs',
                'Last generated',
                'Actions',
              ]}
              rows={outputs.map((output) => {
                const generated = generatedIds.includes(output.id);
                const exportAvailable = generated || Boolean(output.lastGeneratedAt);
                return [
                  output.name,
                  category.label,
                  atlas.reportingCycles.find((period) => period.id === output.reportingPeriodId)
                    ?.label ?? '—',
                  <StatusBadge status={generated ? 'ready' : output.readinessStatus} />,
                  output.missingInputIds.length
                    ? output.missingInputIds.map(missingInputName).join(' · ')
                    : 'None',
                  generated
                    ? 'Generated now'
                    : output.lastGeneratedAt
                      ? format.date(output.lastGeneratedAt)
                      : 'Not generated',
                  <div className="table-actions">
                    <Button
                      variant="tertiary"
                      onClick={() => {
                        setSelectedId(output.id);
                        setDetailTab('preview');
                      }}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={!canGenerate(output)}
                      title={
                        canGenerate(output)
                          ? 'Generate from approved and validated data'
                          : 'Resolve missing or unvalidated inputs before generation'
                      }
                      onClick={() => {
                        setGeneratedIds((ids) => [...new Set([...ids, output.id])]);
                        showToast(`${output.name} generated from validated data`);
                      }}
                    >
                      Generate
                    </Button>
                    <Button
                      variant="tertiary"
                      disabled={!exportAvailable}
                      onClick={() => window.print()}
                    >
                      Export
                    </Button>
                  </div>,
                ];
              })}
            />
          </Panel>
        );
      })}
      <Drawer
        title={selected?.name ?? ''}
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
      >
        {selected && (
          <div className="detail-workspace">
            <DetailTabs
              label="Output detail"
              value={detailTab}
              onChange={setDetailTab}
              tabs={[
                { id: 'preview', label: 'Preview' },
                { id: 'inputs', label: 'Validated inputs' },
                { id: 'evidence', label: 'Evidence' },
              ]}
            />
            {detailTab === 'preview' && (
              <div className="detail-stack">
                <div className="detail-lead">
                  <StatusBadge status={selected.readinessStatus} />
                  <strong>{selected.name}</strong>
                  <p>
                    {selected.missingInputIds.length
                      ? 'Preview only. Generation is blocked until every required input is validated.'
                      : 'All required inputs are approved or validated; this output can be generated.'}
                  </p>
                </div>
                <dl className="summary-list">
                  <div>
                    <dt>Audience</dt>
                    <dd>{selected.audience.replaceAll('_', ' ')}</dd>
                  </div>
                  <div>
                    <dt>Reporting period</dt>
                    <dd>
                      {atlas.reportingCycles.find(
                        (period) => period.id === selected.reportingPeriodId,
                      )?.label ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Publisher</dt>
                    <dd>{selected.authorId ? getUser(selected.authorId)?.name : 'Not assigned'}</dd>
                  </div>
                  <div>
                    <dt>Last generated</dt>
                    <dd>
                      {selected.lastGeneratedAt
                        ? format.date(selected.lastGeneratedAt)
                        : 'Not generated'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
            {detailTab === 'inputs' && (
              <div className="detail-stack">
                <h3>Missing or unresolved inputs</h3>
                {selected.missingInputIds.length ? (
                  <ul className="plain-list">
                    {selected.missingInputIds.map((id) => (
                      <li key={id}>{missingInputName(id)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-copy">No inputs are missing.</p>
                )}
                <h3>Validation rule</h3>
                <p>
                  Only approved Weekly Execution Updates, approved project state and published
                  decisions are included.
                </p>
              </div>
            )}
            {detailTab === 'evidence' && <EvidenceTable evidenceIds={selected.evidenceIds} />}
          </div>
        )}
      </Drawer>
    </>
  );
}

export function KpiLibraryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'definition' | 'thresholds' | 'history'>('definition');
  const selected = phase1Domain.kpiDefinitions.find((kpi) => kpi.id === selectedId);
  const selectedTarget = phase1Domain.kpiTargets.find((target) => target.kpiId === selectedId);
  const selectedMetadata = atlas.kpiLibraryMetadata.find((item) => item.kpiId === selectedId);
  return (
    <>
      <PageHeader
        title="KPI Library"
        description="Definitions, ownership, targets and executive visibility for business-plan measures."
      />
      <Panel title="Configured KPIs" className="section">
        <DataTable
          caption="KPI Library"
          headers={[
            'Name',
            'Category',
            'Target',
            'Owner',
            'Frequency',
            'Executive visibility',
            'Business health',
          ]}
          rows={phase1Domain.kpiDefinitions.map((kpi) => {
            const target = phase1Domain.kpiTargets.find((item) => item.kpiId === kpi.id);
            return [
              <button
                className="table-link"
                onClick={() => {
                  setSelectedId(kpi.id);
                  setDetailTab('definition');
                }}
              >
                {kpi.name}
              </button>,
              kpi.category,
              target ? `${target.approvedBaseline} ${kpi.unit}` : '—',
              getUser(kpi.ownerId)?.name ?? 'Unassigned',
              kpi.frequency,
              kpi.executiveVisibility.map((role) => role.toUpperCase()).join(', ') || 'None',
              kpi.contributesToBusinessHealth ? 'Included' : 'Not included',
            ];
          })}
        />
      </Panel>
      <Drawer
        title={selected?.name ?? ''}
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
      >
        {selected && (
          <div className="detail-workspace">
            <DetailTabs
              label="KPI detail"
              value={detailTab}
              onChange={setDetailTab}
              tabs={[
                { id: 'definition', label: 'Definition' },
                { id: 'thresholds', label: 'Thresholds and target' },
                { id: 'history', label: 'History and evidence' },
              ]}
            />
            {detailTab === 'definition' && (
              <dl className="summary-list">
                <div>
                  <dt>Formula</dt>
                  <dd>{selected.formula}</dd>
                </div>
                <div>
                  <dt>Unit</dt>
                  <dd>{selected.unit}</dd>
                </div>
                <div>
                  <dt>Data source</dt>
                  <dd>{selectedMetadata?.dataSource ?? 'Not configured'}</dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{getUser(selected.ownerId)?.name ?? 'Unassigned'}</dd>
                </div>
                <div>
                  <dt>Reporting frequency</dt>
                  <dd>{selected.frequency}</dd>
                </div>
                <div>
                  <dt>Strategic objective</dt>
                  <dd>{getStrategicObjective(selected.strategicObjectiveId)?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt>Executive visibility</dt>
                  <dd>
                    {selected.executiveVisibility.map((role) => role.toUpperCase()).join(', ') ||
                      'None'}
                  </dd>
                </div>
                <div>
                  <dt>Business Health contribution</dt>
                  <dd>{selected.contributesToBusinessHealth ? 'Included' : 'Not included'}</dd>
                </div>
              </dl>
            )}
            {detailTab === 'thresholds' && (
              <dl className="summary-list">
                <div>
                  <dt>Approved target</dt>
                  <dd>
                    {selectedTarget ? `${selectedTarget.approvedBaseline} ${selected.unit}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Healthy</dt>
                  <dd>{selectedMetadata?.healthyThreshold ?? 'Not configured'}</dd>
                </div>
                <div>
                  <dt>Needs attention</dt>
                  <dd>{selectedMetadata?.attentionThreshold ?? 'Not configured'}</dd>
                </div>
                <div>
                  <dt>Critical</dt>
                  <dd>{selectedMetadata?.criticalThreshold ?? 'Not configured'}</dd>
                </div>
                <div>
                  <dt>Current actual</dt>
                  <dd>{selectedTarget ? `${selectedTarget.actual} ${selected.unit}` : '—'}</dd>
                </div>
                <div>
                  <dt>Current forecast</dt>
                  <dd>
                    {selectedTarget ? `${selectedTarget.currentForecast} ${selected.unit}` : '—'}
                  </dd>
                </div>
              </dl>
            )}
            {detailTab === 'history' && selectedTarget && (
              <div className="detail-stack">
                <HistoryTable
                  revisionIds={selectedTarget.historicalRevisionIds}
                  entityId={selectedTarget.id}
                />
                <EvidenceTable evidenceIds={selectedTarget.evidenceIds} />
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}

export function ReportingTemplatesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const shared = atlas.reportingTemplates.find((template) => template.departmentId === null);
  const departmentTemplates = atlas.reportingTemplates.filter(
    (template) => template.departmentId !== null,
  );
  const selected = atlas.reportingTemplates.find((template) => template.id === selectedId);
  return (
    <>
      <PageHeader
        title="Reporting Templates"
        description="Common and department-specific structures for Weekly Execution Updates."
      />
      <Panel title="Shared Weekly Execution Update structure" className="section">
        <p className="panel-intro">
          Every department template inherits this validated structure before adding its specialist
          fields.
        </p>
        <ol className="template-structure">
          {shared?.sections.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ol>
      </Panel>
      <Panel title="Department-specific fields" className="section">
        <DataTable
          caption="Department-specific reporting templates"
          headers={['Department', 'Template', 'Additional fields', 'Status']}
          rows={departmentTemplates.map((template) => [
            getDepartment(template.departmentId ?? '')?.name ?? 'Unknown',
            <button className="table-link" onClick={() => setSelectedId(template.id)}>
              {template.name}
            </button>,
            template.sections.join(' · '),
            <StatusBadge status={template.status} />,
          ])}
        />
      </Panel>
      <Drawer
        title={selected?.name ?? ''}
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
      >
        {selected && (
          <div className="detail-stack">
            <p>
              This template inherits all {shared?.sections.length ?? 0} shared Weekly Execution
              Update sections and adds the following department-specific fields.
            </p>
            <ul className="plain-list">
              {selected.sections.map((section) => (
                <li key={section}>{section}</li>
              ))}
            </ul>
            <dl className="summary-list">
              <div>
                <dt>Department</dt>
                <dd>{getDepartment(selected.departmentId ?? '')?.name ?? 'All departments'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={selected.status} />
                </dd>
              </div>
            </dl>
          </div>
        )}
      </Drawer>
    </>
  );
}

export function UsersRolesPage() {
  return (
    <>
      <PageHeader
        title="Users and Roles"
        description="Configured prototype personas, department ownership and permitted workspaces."
      />
      <Panel title="Configured access" className="section">
        <DataTable
          caption="Users and role access"
          headers={['User', 'Role', 'Department', 'Workspace access', 'Status']}
          rows={atlas.users.map((user) => [
            user.name,
            user.title,
            user.departmentId
              ? (getDepartment(user.departmentId)?.name ?? 'Unknown')
              : 'Enterprise',
            user.role === 'department_manager'
              ? 'Submit Update · My Updates'
              : user.role === 'commercial_manager'
                ? 'Commercial workspace · Configuration'
                : 'Executive workspace',
            <StatusBadge status="active" />,
          ])}
        />
      </Panel>
    </>
  );
}

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Prototype context and deterministic simulation settings."
      />
      <Panel title="Prototype configuration" className="section">
        <dl className="summary-list">
          <div>
            <dt>Organisation</dt>
            <dd>{atlas.organisation.name}</dd>
          </div>
          <div>
            <dt>Timezone</dt>
            <dd>{atlas.meta.timezone}</dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>{atlas.meta.currency}</dd>
          </div>
          <div>
            <dt>Data mode</dt>
            <dd>Synthetic deterministic fixtures</dd>
          </div>
        </dl>
      </Panel>
    </>
  );
}

export function CfoViewPage() {
  const validated = getValidatedExecutiveData();
  const [cashRange, setCashRange] = useState('6');
  const cashForecast =
    cashRange === '6' ? validated.cashPositionForecast.slice(-6) : validated.cashPositionForecast;
  const costRecovery = validated.costRecovery?.target;
  const productionRevenueGap =
    atlas.finance.kpis.revenueYtdUsd - atlas.finance.kpis.revenuePlanYtdUsd;
  const groupedBudget = (category: 'opex' | 'capex') => {
    const lines = validated.budget.lines.filter((line) => line.category === category);
    const sum = (field: 'approvedBaseline' | 'committed' | 'actual' | 'currentForecast') =>
      lines.reduce((total, line) => total + line[field], 0);
    const approved = sum('approvedBaseline');
    const forecast = sum('currentForecast');
    return {
      approved,
      committed: sum('committed'),
      actual: sum('actual'),
      forecast,
      variancePercent: approved ? ((forecast - approved) / approved) * 100 : 0,
    };
  };
  const opex = groupedBudget('opex');
  const capex = groupedBudget('capex');
  return (
    <>
      <PageHeader
        title="CFO View"
        description="Are we delivering within our funding capacity, and where is cash or value at risk?"
      />
      <div className="grid grid--4 executive-kpis">
        <KpiCard
          label="Cash position"
          value={format.usd(validated.liquidity.availableLiquidityUsd)}
          status="at_risk"
          context={`${validated.liquidity.runwayMonths} months runway · ${format.usd(atlas.finance.kpis.nextRepaymentUsd)} due in September`}
        />
        <KpiCard
          label="Approved vs committed"
          value={`${Math.round((validated.budget.committedSpend / validated.budget.approvedSpend) * 100)}%`}
          status="in_progress"
          context={`${format.usd(validated.budget.committedSpend)} of ${format.usd(validated.budget.approvedSpend)}`}
        />
        <KpiCard
          label="Cost recovery"
          value={`${costRecovery?.actual ?? 0}%`}
          status={costRecovery?.status ?? 'needs_attention'}
          context={`${costRecovery?.approvedBaseline ?? 0}% approved target`}
        />
        <KpiCard
          label="Revenue-impacting production variance"
          value={format.usd(productionRevenueGap)}
          status="at_risk"
          context={`${format.percent(validated.production.variancePercent)} production variance`}
        />
      </div>

      <Panel
        title="Cash-flow forecast"
        className="section"
        action={
          <Select
            label="Cash forecast range"
            value={cashRange}
            onChange={setCashRange}
            options={[
              { value: '6', label: 'Next 6 periods' },
              { value: 'all', label: 'All available periods' },
            ]}
          />
        }
      >
        <ChartWrapper
          title="Cash position actual and forecast"
          summary="Cash falls from actual liquidity of 42.5 million dollars to a 20.5 million dollar base forecast by December; the downside reaches 2 million dollars after the September repayment."
          tableHeaders={['Month', 'Actual', 'Base forecast', 'Downside forecast', 'Repayment']}
          tableRows={cashForecast.map((point) => [
            point.month,
            point.actualUsd ? format.usd(point.actualUsd) : '—',
            point.baseForecastUsd ? format.usd(point.baseForecastUsd) : '—',
            point.downsideForecastUsd ? format.usd(point.downsideForecastUsd) : '—',
            'repaymentUsd' in point && point.repaymentUsd ? format.usd(point.repaymentUsd) : '—',
          ])}
        >
          <AreaChart data={cashForecast} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={(value) => `$${value / 1_000_000}m`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip formatter={(value) => format.usd(Number(value))} />
            <Legend />
            <ReferenceLine x="2026-07" stroke="#98a2b3" strokeDasharray="3 3" />
            <Area dataKey="actualUsd" name="Actual" stroke="#2563eb" fill="#dbeafe" />
            <Line
              dataKey="baseForecastUsd"
              name="Base forecast"
              stroke="#2563eb"
              strokeDasharray="6 4"
              dot={false}
            />
            <Line
              dataKey="downsideForecastUsd"
              name="Downside"
              stroke="#dc2626"
              strokeDasharray="2 4"
              dot={false}
            />
          </AreaChart>
        </ChartWrapper>
      </Panel>

      <Panel title="Opex and Capex position" className="section">
        <DataTable
          caption="Opex and Capex position"
          headers={[
            'Spend type',
            'Approved',
            'Committed',
            'Actual',
            'Forecast',
            'Forecast variance',
          ]}
          rows={[
            [
              'Opex',
              format.usd(opex.approved),
              format.usd(opex.committed),
              format.usd(opex.actual),
              format.usd(opex.forecast),
              format.percent(opex.variancePercent),
            ],
            [
              'Capex',
              format.usd(capex.approved),
              format.usd(capex.committed),
              format.usd(capex.actual),
              format.usd(capex.forecast),
              format.percent(capex.variancePercent),
            ],
          ]}
        />
      </Panel>

      <div className="grid grid--2 section">
        <Panel title="Receivables">
          <DataTable
            caption="Receivables"
            headers={['Reference', 'Source', 'Amount', 'Due date', 'Status']}
            rows={validated.receivables.map((item) => [
              item.reference,
              item.source,
              format.usd(item.amountUsd),
              format.date(item.dueDate),
              <StatusBadge status={item.status} />,
            ])}
          />
        </Panel>
        <Panel title="Royalties, obligations and funding requirements">
          <DataTable
            caption="Royalties, obligations and funding requirements"
            headers={['Obligation', 'Remaining', 'Due in 30 days', 'Status']}
            rows={validated.obligations.map((item) => [
              item.category,
              format.usd(item.remainingUsd),
              format.usd(item.due30DaysUsd),
              <StatusBadge status={item.status} />,
            ])}
          />
        </Panel>
      </div>

      <div className="grid grid--2 section">
        <Panel title="Financial risks">
          <DataTable
            caption="Financial risks"
            headers={['Risk', 'Impact', 'Exposure', 'Mitigation', 'Status']}
            rows={validated.strategicRisks
              .filter((risk) => risk.category === 'financial')
              .map((risk) => [
                risk.description,
                risk.impact,
                format.usd(risk.financialExposure),
                risk.mitigation,
                <StatusBadge status={risk.status} />,
              ])}
          />
        </Panel>
        <Panel title="Decisions requiring CFO approval">
          <DataTable
            caption="CFO decisions requiring attention"
            headers={['Issue', 'Impact', 'Recommended action', 'Due date', 'Status']}
            rows={validated.decisions
              .filter((item) => item.ownerId === 'usr_cfo' || item.type.includes('financial'))
              .map((item) => [
                item.issue,
                item.businessImpact,
                item.recommendedAction,
                format.date(item.dueDate),
                <StatusBadge status={item.status} />,
              ])}
          />
        </Panel>
      </div>

      <Panel title="Historical financial variance" className="section">
        <ChartWrapper
          title="Historical actual and forecast budget variance"
          summary="Actual budget variance moved from 1.2 percent favourable in February to 3.6 percent adverse in July; the current forecast is 4.8 percent adverse."
          tableHeaders={['Period', 'Actual variance', 'Forecast variance']}
          tableRows={validated.financialVarianceTrend.map((point) => [
            point.period,
            format.percent(point.actualVariancePercent),
            format.percent(point.forecastVariancePercent),
          ])}
        >
          <LineChart
            data={validated.financialVarianceTrend}
            margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
          >
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="period" tickLine={false} axisLine={false} />
            <YAxis unit="%" tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend />
            <ReferenceLine y={0} stroke="#667085" />
            <Line
              dataKey="actualVariancePercent"
              name="Actual variance"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="forecastVariancePercent"
              name="Forecast variance"
              stroke="#7c3aed"
              strokeDasharray="6 4"
              dot={false}
            />
          </LineChart>
        </ChartWrapper>
      </Panel>
    </>
  );
}
