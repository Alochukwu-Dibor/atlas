import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContextControls } from '../components/Shells';
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
} from '../components/Ui';
import { DecisionHistory, EvidenceTable, HistoryTable } from '../components/Traceability';
import { RecommendationsPage } from './CommercialPages';
import {
  atlas,
  format,
  getBusinessPlanDelivery,
  getDepartment,
  getLiquidity,
  getObjectiveKpis,
  getStrategicObjective,
  getUser,
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
        controls={<ContextControls />}
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
        controls={<ContextControls />}
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
          <>
            <ContextControls />
            <Button variant="secondary" onClick={() => setRecommendedActionsOpen(true)}>
              Draft recommended action
            </Button>
          </>
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
  return (
    <>
      <PageHeader
        title="Outputs"
        description="Validated management, executive, governance and regulatory deliverables."
        controls={<ContextControls />}
      />
      <Panel title="Output readiness" className="section">
        <DataTable
          caption="Output readiness"
          headers={[
            'Output',
            'Audience',
            'Reporting period',
            'Readiness',
            'Missing inputs',
            'Last generated',
          ]}
          rows={phase1Domain.outputs.map((output) => [
            output.name,
            output.audience.replaceAll('_', ' '),
            atlas.reportingCycles.find((period) => period.id === output.reportingPeriodId)?.label ??
              '—',
            <StatusBadge status={output.readinessStatus} />,
            String(output.missingInputIds.length),
            output.lastGeneratedAt ? format.date(output.lastGeneratedAt) : 'Not generated',
          ])}
        />
      </Panel>
    </>
  );
}

export function KpiLibraryPage() {
  return (
    <>
      <PageHeader
        title="KPI Library"
        description="Definitions, ownership, targets and executive visibility for business-plan measures."
      />
      <Panel title="Configured KPIs" className="section">
        <DataTable
          caption="KPI Library"
          headers={['KPI', 'Category', 'Objective', 'Target', 'Actual', 'Forecast', 'Owner']}
          rows={phase1Domain.kpiDefinitions.map((kpi) => {
            const target = phase1Domain.kpiTargets.find((item) => item.kpiId === kpi.id);
            return [
              kpi.name,
              kpi.category,
              getStrategicObjective(kpi.strategicObjectiveId)?.name ?? '—',
              target ? `${target.approvedBaseline} ${kpi.unit}` : '—',
              target ? `${target.actual} ${kpi.unit}` : '—',
              target ? `${target.currentForecast} ${kpi.unit}` : '—',
              getUser(kpi.ownerId)?.name ?? 'Unassigned',
            ];
          })}
        />
      </Panel>
    </>
  );
}

export function ReportingTemplatesPage() {
  return (
    <>
      <PageHeader
        title="Reporting Templates"
        description="Common and department-specific structures for Weekly Execution Updates."
      />
      <Panel title="Active templates" className="section">
        <DataTable
          caption="Reporting templates"
          headers={['Template', 'Department', 'Sections', 'Status']}
          rows={atlas.reportingTemplates.map((template) => [
            template.name,
            template.departmentId ? getDepartment(template.departmentId)?.name : 'All departments',
            String(template.sections.length),
            <StatusBadge status={template.status} />,
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
  const liquidity = getLiquidity();
  const budget = atlas.approvedBudgets[0];
  const forecast = atlas.budgetLines.reduce((total, line) => total + line.currentForecast, 0);
  const committed = atlas.budgetLines.reduce((total, line) => total + line.committed, 0);
  return (
    <>
      <PageHeader
        title="CFO View"
        description="Funding capacity, approved budget delivery and financial interventions from validated shared data."
        controls={<ContextControls allowOpenCycle={false} />}
      />
      <div className="grid grid--4">
        <KpiCard
          label="Available liquidity"
          value={format.usd(liquidity.availableLiquidityUsd)}
          status="at_risk"
          context={`${liquidity.runwayMonths} months runway`}
        />
        <KpiCard
          label="Approved budget"
          value={format.usd(budget.approvedAmount)}
          status="approved"
          context="Immutable approved baseline"
        />
        <KpiCard
          label="Current forecast"
          value={format.usd(forecast)}
          status={forecast > budget.approvedAmount ? 'adverse' : 'on_track'}
          context="Separate from approved baseline"
        />
        <KpiCard
          label="Committed spend"
          value={format.usd(committed)}
          status="in_progress"
          context="Across linked budget lines"
        />
      </div>
      <Panel title="Financial decisions requiring attention" className="section">
        <DataTable
          caption="CFO decisions requiring attention"
          headers={['Issue', 'Impact', 'Due date', 'Status']}
          rows={phase1Domain.decisionSupportItems
            .filter((item) => item.ownerId === 'usr_cfo' || item.type.includes('financial'))
            .map((item) => [
              item.issue,
              item.businessImpact,
              format.date(item.dueDate),
              <StatusBadge status={item.status} />,
            ])}
        />
      </Panel>
    </>
  );
}
