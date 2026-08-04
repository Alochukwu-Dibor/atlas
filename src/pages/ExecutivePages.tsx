import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartWrapper } from '../components/Charts';
import { ContextControls } from '../components/Shells';
import { EvidenceTable, HistoryTable } from '../components/Traceability';
import {
  Button,
  DataTable,
  DetailTabs,
  Drawer,
  Field,
  Modal,
  PageHeader,
  Panel,
  Select,
  StatusBadge,
  useToast,
} from '../components/Ui';
import {
  atlas,
  buildSyntheticExport,
  format,
  getProductionScope,
  getUser,
  getValidatedExecutiveData,
  statusLabels,
  type ProductionInterest,
} from '../data/atlas';
import { useAtlas } from '../state/AtlasContext';
import type { ExecutiveDecisionAction } from '../state/executive';

const decisionLabels: Record<ExecutiveDecisionAction, string> = {
  approve: 'Approve',
  defer: 'Defer',
  request_information: 'Request More Information',
  assign_action: 'Assign Action',
  record_decision: 'Record Decision',
};

export function ExecutiveDashboard() {
  const { cycleId, executive, executiveDispatch, workflow } = useAtlas();
  const [scopeId, setScopeId] = useState('asset_oml30');
  const [interest, setInterest] = useState<ProductionInterest>('gross');
  const [trendRange, setTrendRange] = useState('6');
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [riskTab, setRiskTab] = useState<'summary' | 'history' | 'evidence'>('summary');
  const [recommendationId, setRecommendationId] = useState<string | null>(null);
  const [decisionAction, setDecisionAction] = useState<ExecutiveDecisionAction>('approve');
  const [rationale, setRationale] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const showToast = useToast();
  const validated = getValidatedExecutiveData();
  const selectedPublication = workflow.publications.find((item) => item.cycleId === cycleId);
  const scopedProduction = getProductionScope(scopeId, interest);
  const selectedField = atlas.production.fields.find((field) => field.fieldId === scopeId);
  const interestFactor =
    interest === 'working_interest' ? atlas.organisation.workingInterestPercent / 100 : 1;
  const productionData = useMemo(() => {
    const data = selectedField
      ? selectedField.sparklineBopd.map((actualBopd, index) => ({
          period: atlas.production.weeklyTrend[index].date,
          actualBopd: Math.round(actualBopd * interestFactor),
          planBopd: Math.round(selectedField.planBopd * interestFactor),
        }))
      : atlas.production.monthlyTrend.map((point) => ({
          period: point.month,
          actualBopd: Math.round(point.actualBopd * interestFactor),
          planBopd: Math.round(point.planBopd * interestFactor),
          previousBopd: Math.round(point.previousYearBopd * interestFactor),
        }));
    return trendRange === '6' ? data.slice(-6) : data;
  }, [interestFactor, selectedField, trendRange]);
  const selectedRisk = validated.strategicRisks.find((risk) => risk.id === selectedRiskId);
  const selectedRecommendation = atlas.recommendations.find((item) => item.id === recommendationId);
  const assignmentValid = decisionAction !== 'assign_action' || Boolean(ownerId && dueDate);
  const canRecord = Boolean(rationale.trim() && assignmentValid);

  const closeDecision = () => {
    setRecommendationId(null);
    setDecisionAction('approve');
    setRationale('');
    setOwnerId('');
    setDueDate('');
    executiveDispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <>
      <PageHeader
        title="CEO View"
        description="Are we delivering the business plan, and where must I intervene?"
        controls={
          <>
            <ContextControls allowOpenCycle={false} />
            <Button onClick={() => window.print()}>Export Report</Button>
          </>
        }
      />
      <p className="export-disclosure">{buildSyntheticExport('Atlas CEO View')}</p>

      <div className="grid grid--4 executive-kpis">
        <article className="panel kpi">
          <span className="kpi__label">Business-plan delivery</span>
          <span className="kpi__value">{validated.businessDelivery.deliveryPercent}%</span>
          <span className="kpi__footer">
            <StatusBadge status={validated.businessDelivery.status} />
            <span>Down 3 points from the previous period</span>
          </span>
        </article>
        <article className="panel kpi">
          <span className="kpi__label">Production</span>
          <span className="kpi__value">{format.number(scopedProduction.actual)} bopd</span>
          <span className="kpi__footer">
            <StatusBadge status="at_risk" />
            <span>{format.percent(scopedProduction.variancePercent)} vs approved plan</span>
          </span>
        </article>
        <article className="panel kpi">
          <span className="kpi__label">Budget position</span>
          <span className="kpi__value">{format.percent(validated.budget.variancePercent)}</span>
          <span className="kpi__footer">
            <StatusBadge status="adverse" />
            <span>{format.usd(validated.budget.forecastSpend)} forecast</span>
          </span>
        </article>
        <article className="panel kpi">
          <span className="kpi__label">Cash runway</span>
          <span className="kpi__value">{validated.liquidity.runwayMonths} months</span>
          <span className="kpi__footer">
            <StatusBadge status="at_risk" />
            <span>{format.usd(validated.liquidity.availableLiquidityUsd)} available</span>
          </span>
        </article>
      </div>

      <Panel
        title="Production against plan"
        className="section"
        action={
          <div className="inline-controls">
            <Select
              label="Production scope"
              value={scopeId}
              onChange={setScopeId}
              options={[
                { value: 'asset_oml30', label: 'Total OML 30' },
                ...atlas.assets[0].fields.map((field) => ({ value: field.id, label: field.name })),
              ]}
            />
            <Select
              label="Production interest"
              value={interest}
              onChange={(value) => setInterest(value as ProductionInterest)}
              options={[
                { value: 'gross', label: 'Gross Production' },
                { value: 'working_interest', label: 'SNRL Working Interest' },
              ]}
            />
            <Select
              label="Production trend range"
              value={trendRange}
              onChange={setTrendRange}
              options={[
                { value: '6', label: 'Last 6 periods' },
                { value: 'all', label: 'All available periods' },
              ]}
            />
          </div>
        }
      >
        <ChartWrapper
          title="Executive production performance"
          summary={`Actual production is ${format.number(scopedProduction.actual)} bopd against ${format.number(scopedProduction.plan)} bopd plan, a ${format.percent(scopedProduction.variancePercent)} variance.`}
          tableHeaders={['Period', 'Actual bopd', 'Plan bopd', 'Historical bopd']}
          tableRows={productionData.map((point) => [
            point.period,
            format.number(point.actualBopd),
            format.number(point.planBopd),
            'previousBopd' in point ? format.number(Number(point.previousBopd ?? 0)) : '—',
          ])}
        >
          <LineChart data={productionData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="period" tickLine={false} axisLine={false} />
            <YAxis
              domain={['dataMin - 5000', 'dataMax + 3000']}
              tickFormatter={(value) => `${value / 1000}k`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip formatter={(value) => `${format.number(Number(value))} bopd`} />
            <Legend />
            <Line dataKey="actualBopd" name="Actual" stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line
              dataKey="planBopd"
              name="Plan"
              stroke="#667085"
              strokeDasharray="6 5"
              dot={false}
            />
            {!selectedField && (
              <Line
                dataKey="previousBopd"
                name="Previous year"
                stroke="#98a2b3"
                strokeDasharray="2 4"
                dot={false}
              />
            )}
          </LineChart>
        </ChartWrapper>
      </Panel>

      <div className="grid grid--2 section executive-attention-grid">
        <Panel title="Strategic risks">
          <DataTable
            caption="Strategic risks requiring executive attention"
            headers={['Risk', 'Impact', 'Trend', 'Exposure', 'Owner', 'Status']}
            rows={validated.strategicRisks.map((risk) => [
              risk.description,
              risk.impact,
              risk.trend,
              format.usd(risk.financialExposure),
              getUser(risk.ownerId ?? '')?.name ?? 'Unassigned',
              <StatusBadge status={risk.status} />,
            ])}
            onRowClick={(index) => {
              setSelectedRiskId(validated.strategicRisks[index].id);
              setRiskTab('summary');
            }}
          />
        </Panel>

        <Panel title="Critical decisions" className="recommendations">
          {atlas.recommendations
            .filter((item) => item.status !== 'decision_recorded')
            .map((item) => {
              const decisions = executive.decisions.filter(
                (decision) => decision.recommendationId === item.id,
              );
              const latest = decisions.at(-1);
              return (
                <article className="recommendation" key={item.id}>
                  <div>
                    <StatusBadge status={item.priority} />
                    <small>{statusLabels[item.status]}</small>
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.explanation}</p>
                    <small>{item.impact}</small>
                    {latest && (
                      <p className="decision-summary">
                        <strong>{decisionLabels[latest.action]}</strong> · {latest.rationale}
                        {latest.ownerId && ` · ${getUser(latest.ownerId)?.name}`}
                        {latest.dueDate && ` · due ${format.date(latest.dueDate)}`}
                      </p>
                    )}
                  </div>
                  <Button variant="secondary" onClick={() => setRecommendationId(item.id)}>
                    Review action
                  </Button>
                </article>
              );
            })}
        </Panel>
      </div>

      <Panel title="Executive summary" className="section executive-summary">
        <p>{selectedPublication?.executiveNarrative || atlas.executiveSummary.headline}</p>
        <p>
          Business-plan delivery is at {validated.businessDelivery.deliveryPercent}%. Production is{' '}
          {format.percent(validated.production.variancePercent)} below plan, the current budget
          forecast is {format.percent(validated.budget.variancePercent)} adverse, and cash runway is{' '}
          {validated.liquidity.runwayMonths} months. Executive intervention should remain focused on
          compressor restoration, integrity access and liquidity protection.
        </p>
      </Panel>

      <Drawer
        title={selectedRisk?.description ?? ''}
        open={Boolean(selectedRisk)}
        onClose={() => setSelectedRiskId(null)}
      >
        {selectedRisk && (
          <div className="detail-workspace">
            <DetailTabs
              label="Strategic risk detail"
              value={riskTab}
              onChange={setRiskTab}
              tabs={[
                { id: 'summary', label: 'Summary' },
                { id: 'history', label: 'History' },
                { id: 'evidence', label: 'Evidence' },
              ]}
            />
            {riskTab === 'summary' && (
              <dl className="context-list">
                <div>
                  <dt>Business impact</dt>
                  <dd>{selectedRisk.impact}</dd>
                </div>
                <div>
                  <dt>Likelihood and trend</dt>
                  <dd>
                    {selectedRisk.likelihood} · {selectedRisk.trend}
                  </dd>
                </div>
                <div>
                  <dt>Financial exposure</dt>
                  <dd>{format.usd(selectedRisk.financialExposure)}</dd>
                </div>
                <div>
                  <dt>Mitigation</dt>
                  <dd>{selectedRisk.mitigation}</dd>
                </div>
              </dl>
            )}
            {riskTab === 'history' && (
              <HistoryTable
                revisionIds={selectedRisk.historicalRevisionIds}
                entityId={selectedRisk.id}
              />
            )}
            {riskTab === 'evidence' && <EvidenceTable evidenceIds={selectedRisk.evidenceIds} />}
          </div>
        )}
      </Drawer>

      <Modal
        title={`Record decision${selectedRecommendation ? ` · ${selectedRecommendation.title}` : ''}`}
        open={Boolean(recommendationId)}
        onClose={closeDecision}
        footer={
          <>
            <Button variant="secondary" onClick={closeDecision}>
              Cancel
            </Button>
            <Button
              disabled={!canRecord}
              onClick={() => {
                if (!recommendationId) return;
                executiveDispatch({
                  type: 'RECORD_DECISION',
                  recommendationId,
                  action: decisionAction,
                  rationale,
                  ownerId,
                  dueDate,
                });
                showToast('Executive decision recorded with an audit event');
                closeDecision();
              }}
            >
              Record Decision
            </Button>
          </>
        }
      >
        <p>
          Decision source: <strong>{selectedRecommendation?.title}</strong>
        </p>
        <Field label="Decision action">
          <select
            aria-label="Decision action"
            value={decisionAction}
            onChange={(event) => setDecisionAction(event.target.value as ExecutiveDecisionAction)}
          >
            {Object.entries(decisionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rationale">
          <textarea
            aria-label="Decision rationale"
            rows={4}
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
          />
        </Field>
        {decisionAction === 'assign_action' && (
          <>
            <Field label="Owner">
              <select
                aria-label="Assignment owner"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
              >
                <option value="">Select owner</option>
                {atlas.users
                  .filter((user) => user.role === 'department_manager')
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Due date">
              <input
                aria-label="Assignment due date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </Field>
          </>
        )}
        {executive.error && <p className="field__error">{executive.error}</p>}
      </Modal>
    </>
  );
}
