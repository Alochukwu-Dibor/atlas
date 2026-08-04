import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContextControls } from '../components/Shells';
import {
  Button,
  DataTable,
  Drawer,
  KpiCard,
  PageHeader,
  Panel,
  StatusBadge,
} from '../components/Ui';
import {
  atlas,
  format,
  getBusinessPlanDelivery,
  getDepartment,
  getLiquidity,
  getStrategicObjective,
  getUser,
  phase1Domain,
} from '../data/atlas';
import { useAtlas } from '../state/AtlasContext';
import { reportDepartmentName, selectSubmissionQueue } from '../state/workflow';

export function ExecutionPage() {
  const { businessUnitId } = useAtlas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const delivery = getBusinessPlanDelivery(businessUnitId);
  const selected = selectedId ? getStrategicObjective(selectedId) : undefined;

  return (
    <>
      <PageHeader
        title="Execution"
        description="How the approved business plan is being delivered across objectives, owners and execution vehicles."
        controls={<ContextControls />}
      />
      <Panel title="Business-plan objectives" className="section">
        <DataTable
          caption="Strategic objective delivery"
          headers={[
            'Objective',
            'Status',
            'Progress',
            'Owner',
            'KPIs',
            'Projects / initiatives',
            'Risks',
            'Commitments',
          ]}
          rows={delivery.objectives.map((objective) => [
            objective.name,
            <StatusBadge status={objective.status} />,
            `${objective.progressPercent}%`,
            getUser(objective.ownerId ?? '')?.name ?? 'Unassigned',
            String(objective.kpiIds.length),
            String(objective.projectIds.length + objective.initiativeIds.length),
            String(objective.riskIds.length),
            String(objective.commitmentIds.length),
          ])}
          onRowClick={(index) => setSelectedId(delivery.objectives[index].id)}
        />
      </Panel>
      <Drawer
        title={selected?.name ?? ''}
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
      >
        {selected && (
          <>
            <StatusBadge status={selected.status} />
            <p>{selected.description}</p>
            <dl className="summary-list">
              <div>
                <dt>Progress</dt>
                <dd>{selected.progressPercent}%</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{getUser(selected.ownerId ?? '')?.name}</dd>
              </div>
              <div>
                <dt>Linked KPIs</dt>
                <dd>{selected.kpiIds.length}</dd>
              </div>
              <div>
                <dt>Evidence records</dt>
                <dd>{selected.evidenceIds.length}</dd>
              </div>
            </dl>
            <p className="info-panel">
              Phase 1 establishes the linked objective record. Tabbed performance, updates,
              commitments, risks, decisions and history follow in later phases.
            </p>
          </>
        )}
      </Drawer>
    </>
  );
}

export function ReviewsPage() {
  const navigate = useNavigate();
  const { cycleId, workflow } = useAtlas();
  const queue = selectSubmissionQueue(workflow, cycleId);
  return (
    <>
      <PageHeader
        title="Reviews"
        description="Validate Weekly Execution Updates before they affect executive insights or Outputs."
        controls={<ContextControls />}
      />
      <Panel title="Weekly Execution Update review queue" className="section">
        <DataTable
          caption="Weekly Execution Update review queue"
          headers={['Department', 'Owner', 'Reporting period', 'Method', 'Status', 'Action']}
          rows={queue.map((update) => [
            reportDepartmentName(update),
            getUser(update.managerId ?? '')?.name ?? 'Unassigned',
            atlas.reportingCycles.find((period) => period.id === update.cycleId)?.label ?? '—',
            update.methods.join(' · '),
            <StatusBadge status={update.status} />,
            'Review update',
          ])}
          onRowClick={(index) => navigate(`/reviews/${queue[index].id}`)}
        />
      </Panel>
    </>
  );
}

export function DecisionsPage() {
  const { role } = useAtlas();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        title="Decisions"
        description="Decision Support, approvals, interventions and escalations linked to business-plan delivery."
        controls={<ContextControls />}
      />
      <Panel
        title="Decision Support"
        className="section"
        action={
          role === 'commercial_manager' ? (
            <Button variant="secondary" onClick={() => navigate('/recommendations')}>
              Manage recommended actions
            </Button>
          ) : undefined
        }
      >
        <DataTable
          caption="Decision Support items"
          headers={['Issue', 'Type', 'Business impact', 'Owner', 'Due date', 'Status']}
          rows={phase1Domain.decisionSupportItems.map((item) => [
            item.issue,
            item.type.replaceAll('_', ' '),
            item.businessImpact,
            getUser(item.ownerId ?? '')?.name ?? 'Unassigned',
            format.date(item.dueDate),
            <StatusBadge status={item.status} />,
          ])}
        />
      </Panel>
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
