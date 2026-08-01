import { useMemo, useState } from 'react';
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
import { ContextControls } from '../components/Shells';
import {
  Button,
  DetailLink,
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
  getExecutiveMetrics,
  getProductionScope,
  getUser,
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
  const [detail, setDetail] = useState<string | null>(null);
  const [recommendationId, setRecommendationId] = useState<string | null>(null);
  const [decisionAction, setDecisionAction] = useState<ExecutiveDecisionAction>('approve');
  const [rationale, setRationale] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const showToast = useToast();
  const metrics = getExecutiveMetrics();
  const selectedPublication = workflow.publications.find((item) => item.cycleId === cycleId);
  const scopedProduction = getProductionScope(scopeId, interest);
  const selectedField = atlas.production.fields.find((field) => field.fieldId === scopeId);
  const interestFactor =
    interest === 'working_interest' ? atlas.organisation.workingInterestPercent / 100 : 1;
  const productionData = useMemo(
    () =>
      selectedField
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
          })),
    [interestFactor, selectedField],
  );
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
        title="Executive Overview"
        description={selectedPublication?.executiveNarrative || atlas.executiveSummary.headline}
        controls={
          <>
            <ContextControls allowOpenCycle={false} />
            <Button onClick={() => window.print()}>Export Report</Button>
          </>
        }
      />
      <p className="export-disclosure">{buildSyntheticExport('Atlas Executive Overview')}</p>

      <div className="executive-top">
        <Panel title="Overall project status">
          <StatusBadge status={atlas.executiveSummary.overallStatus} />
          <strong className="panel-value">At risk</strong>
          <p>
            Moved from {statusLabels[atlas.executiveSummary.previousStatus]} ·{' '}
            {atlas.executiveSummary.projectCounts.onTrack} on track ·{' '}
            {atlas.executiveSummary.projectCounts.atRisk} at risk ·{' '}
            {atlas.executiveSummary.projectCounts.delayed} delayed
          </p>
          <DetailLink onClick={() => setDetail('Project breakdown')}>Project breakdown</DetailLink>
        </Panel>
        <Panel title="HSE performance">
          <div className="mini-metrics">
            <span>
              <strong>{metrics.hse.lostTimeInjuries}</strong>LTIs
            </span>
            <span>
              <strong>{atlas.executiveSummary.hse.fatalities}</strong>Fatalities
            </span>
            <span>
              <strong>{metrics.hse.trir}</strong>TRIR
            </span>
            <span>
              <strong>{metrics.hse.highPotentialIncidents}</strong>High-potential incident
            </span>
            <span>
              <strong>{atlas.executiveSummary.hse.overdueCorrectiveActions}</strong>Overdue actions
            </span>
          </div>
          <StatusBadge status="adverse" />
          <DetailLink onClick={() => setDetail('HSE performance')}>View HSE evidence</DetailLink>
        </Panel>
        <Panel title="Legal issues and exposure">
          <strong className="panel-value">{format.usd(metrics.legal.estimatedExposureUsd)}</strong>
          <p>
            {atlas.executiveSummary.legal.highIssues} high issues ·{' '}
            {atlas.executiveSummary.legal.deliveryAffectingIssues} affecting delivery
          </p>
          <p>Nearest deadline {format.date(atlas.executiveSummary.legal.nearestDeadline)}</p>
          <DetailLink onClick={() => setDetail('Legal issues and exposure')}>
            View issue history
          </DetailLink>
        </Panel>
      </div>

      <div className="executive-performance section">
        <Panel
          title="Production performance"
          action={
            <div className="inline-controls">
              <Select
                label="Production scope"
                value={scopeId}
                onChange={setScopeId}
                options={[
                  { value: 'asset_oml30', label: 'Total OML 30' },
                  ...atlas.assets[0].fields.map((field) => ({
                    value: field.id,
                    label: field.name,
                  })),
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
            </div>
          }
        >
          <div className="chart-card-layout">
            <div className="chart-summary">
              <strong>{format.number(scopedProduction.actual)}</strong>
              <span>
                bopd {interest === 'gross' ? 'gross production' : 'SNRL working interest'}
              </span>
              <StatusBadge
                status={scopedProduction.variancePercent < -10 ? 'at_risk' : 'on_track'}
              />
              <small>{format.percent(scopedProduction.variancePercent)} vs plan</small>
              <DetailLink onClick={() => setDetail('Production performance')}>
                Production evidence
              </DetailLink>
            </div>
            <ChartWrapper
              title="Executive production performance"
              summary={`Actual production is ${format.number(scopedProduction.actual)} bopd against ${format.number(scopedProduction.plan)} bopd plan.`}
              tableHeaders={['Period', 'Actual bopd', 'Plan bopd', 'Historical bopd']}
              tableRows={productionData.map((point) => [
                point.period,
                format.number(point.actualBopd),
                format.number(point.planBopd),
                'previousBopd' in point ? format.number(Number(point.previousBopd ?? 0)) : '—',
              ])}
            >
              <LineChart data={productionData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="#EAECF0" vertical={false} />
                <XAxis dataKey="period" />
                <YAxis unit=" bopd" tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip formatter={(value) => `${format.number(Number(value))} bopd`} />
                <Legend />
                <Line
                  dataKey="actualBopd"
                  name="Actual"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  dot={false}
                />
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
                    name="Historical"
                    stroke="#1570EF"
                    opacity={0.65}
                    dot={false}
                  />
                )}
              </LineChart>
            </ChartWrapper>
          </div>
        </Panel>

        <Panel title="Cashflow and financing position">
          <div className="chart-card-layout">
            <div className="chart-summary">
              <strong>{format.usd(metrics.liquidity.availableLiquidityUsd)}</strong>
              <span>available liquidity</span>
              <StatusBadge status="at_risk" />
              <small>{metrics.liquidity.runwayMonths} months runway</small>
              <small>
                {format.usd(atlas.finance.kpis.nextRepaymentUsd)} due{' '}
                {format.date(atlas.finance.kpis.nextRepaymentDate)}
              </small>
              <DetailLink onClick={() => setDetail('Cashflow and financing')}>
                Financing evidence
              </DetailLink>
            </div>
            <ChartWrapper
              title="Cash position forecast"
              summary="Actual liquidity reaches 42.5 million dollars in July; base and downside forecasts diverge after the actual boundary, with a 15 million dollar September repayment."
              tableHeaders={['Month', 'Actual', 'Base forecast', 'Downside forecast', 'Repayment']}
              tableRows={atlas.finance.cashPositionForecast.map((point) => [
                point.month,
                point.actualUsd ? format.usd(point.actualUsd) : '—',
                point.baseForecastUsd ? format.usd(point.baseForecastUsd) : '—',
                point.downsideForecastUsd ? format.usd(point.downsideForecastUsd) : '—',
                'repaymentUsd' in point && point.repaymentUsd
                  ? format.usd(point.repaymentUsd)
                  : '—',
              ])}
            >
              <AreaChart
                data={atlas.finance.cashPositionForecast}
                margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid stroke="#EAECF0" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis unit=" USD" tickFormatter={(value) => `$${value / 1_000_000}m`} />
                <Tooltip formatter={(value) => format.usd(Number(value))} />
                <Legend />
                <ReferenceLine
                  x="2026-07"
                  stroke="#98A2B3"
                  strokeDasharray="3 3"
                  label="Actual / forecast"
                />
                <Area
                  dataKey="actualUsd"
                  name="Actual cash"
                  stroke="#4F46E5"
                  fill="#EEF2FF"
                  connectNulls={false}
                />
                <Line
                  dataKey="baseForecastUsd"
                  name="Base forecast"
                  stroke="#4F46E5"
                  strokeDasharray="5 4"
                  dot={false}
                />
                <Line
                  dataKey="downsideForecastUsd"
                  name="Downside forecast"
                  stroke="#D92D20"
                  strokeDasharray="2 4"
                  dot={false}
                />
                <ReferenceLine x="2026-09" stroke="#D92D20" label="Repayment $15m" />
              </AreaChart>
            </ChartWrapper>
          </div>
        </Panel>
      </div>

      <Panel title="Recommendations and decisions" className="section recommendations">
        {atlas.recommendations.map((item) => {
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

      <Drawer title={detail ?? ''} open={Boolean(detail)} onClose={() => setDetail(null)}>
        <p>{atlas.meta.disclosure}</p>
        <dl className="summary-list">
          <div>
            <dt>Source cycle</dt>
            <dd>{atlas.reportingCycles.find((cycle) => cycle.id === cycleId)?.label}</dd>
          </div>
          <div>
            <dt>Production evidence</dt>
            <dd>Operations approved report</dd>
          </div>
          <div>
            <dt>Finance evidence</dt>
            <dd>Treasury fixture workbook</dd>
          </div>
          <div>
            <dt>HSE evidence</dt>
            <dd>HSE approved report</dd>
          </div>
          <div>
            <dt>Legal evidence</dt>
            <dd>Legal approved report</dd>
          </div>
        </dl>
        <h3>Decision audit</h3>
        <div className="audit-list">
          {executive.auditEvents.map((event) => (
            <article key={event.id}>
              <strong>{event.summary}</strong>
              <small>{format.date(event.timestamp)}</small>
            </article>
          ))}
        </div>
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
