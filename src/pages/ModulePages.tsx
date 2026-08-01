import { useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartWrapper, Ring } from '../components/Charts';
import { ContextControls } from '../components/Shells';
import {
  Button,
  DataTable,
  Drawer,
  KpiCard,
  PageHeader,
  Panel,
  SegmentedControl,
  StatusBadge,
} from '../components/Ui';
import { atlas, format } from '../data/atlas';

const chartAxis = { stroke: '#98A2B3', fontSize: 11 };

function ModuleHeader({ title, description }: { title: string; description: string }) {
  return (
    <PageHeader
      title={title}
      description={description}
      controls={
        <>
          <ContextControls />
          <Button onClick={() => window.print()}>Export</Button>
        </>
      }
    />
  );
}

export function ProductionPage() {
  const [period, setPeriod] = useState('Weekly');
  const [detail, setDetail] = useState<string | null>(null);
  const { kpis } = atlas.production;
  return (
    <>
      <ModuleHeader
        title="Production"
        description="OML 30 production performance, constraints and field-level delivery."
      />
      <div className="kpi-strip kpi-strip--5">
        <KpiCard
          label="Gross OML 30 oil"
          value={format.number(kpis.grossOilActualBopd)}
          unit="bopd"
          status={kpis.status}
          context={`${format.percent(kpis.grossOilVariancePercent)} vs plan`}
        />
        <KpiCard
          label="SNRL working interest"
          value={format.number(kpis.workingInterestActualBopd)}
          unit="bopd"
          status="at_risk"
          context="45% working interest"
        />
        <KpiCard
          label="Gas production"
          value={kpis.gasActualMmscfd.toFixed(1)}
          unit="MMscf/d"
          status="at_risk"
          context={`Plan ${kpis.gasPlanMmscfd.toFixed(1)}`}
        />
        <KpiCard
          label="System availability"
          value={format.percent(kpis.systemAvailabilityPercent)}
          status="at_risk"
          context="Compressor B constrained"
        />
        <KpiCard
          label="Days since last LTI"
          value={String(kpis.daysSinceLastLti)}
          status="on_track"
          context="No lost-time injuries"
        />
      </div>
      <div className="analysis-8-4 section">
        <Panel
          title="Production trend"
          action={
            <SegmentedControl
              label="Production trend period"
              value={period}
              onChange={setPeriod}
              options={['Daily', 'Weekly', 'Monthly']}
            />
          }
        >
          <ChartWrapper
            title="Planned versus actual production"
            summary="Actual production remains below the 120,000 bopd plan throughout the week."
            tableHeaders={['Date', 'Actual bopd', 'Plan bopd']}
            tableRows={atlas.production.weeklyTrend.map((point) => [
              point.date,
              format.number(point.actualBopd),
              format.number(point.planBopd),
            ])}
          >
            <LineChart data={atlas.production.weeklyTrend}>
              <CartesianGrid stroke="#EAECF0" vertical={false} />
              <XAxis dataKey="date" tick={chartAxis} tickFormatter={(value) => value.slice(8)} />
              <YAxis tick={chartAxis} tickFormatter={(value) => `${value / 1000}k`} />
              <Tooltip />
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
            </LineChart>
          </ChartWrapper>
        </Panel>
        <Panel title="Production summary">
          <dl className="summary-list">
            <div>
              <dt>Planned oil</dt>
              <dd>{format.number(kpis.grossOilPlanBopd)} bopd</dd>
            </div>
            <div>
              <dt>Actual oil</dt>
              <dd>{format.number(kpis.grossOilActualBopd)} bopd</dd>
            </div>
            <div>
              <dt>Variance</dt>
              <dd>{format.number(kpis.grossOilVarianceBopd)} bopd</dd>
            </div>
            <div>
              <dt>SNRL working interest</dt>
              <dd>{format.number(kpis.workingInterestActualBopd)} bopd</dd>
            </div>
            <div>
              <dt>Gas</dt>
              <dd>{kpis.gasActualMmscfd} MMscf/d</dd>
            </div>
            <div>
              <dt>Available capacity</dt>
              <dd>{format.number(kpis.availableCapacityBopd)} bopd</dd>
            </div>
            <div>
              <dt>Deferred production</dt>
              <dd>{format.number(kpis.deferredProductionBopd)} bopd</dd>
            </div>
          </dl>
        </Panel>
      </div>
      <Panel
        title="Field performance"
        className="section"
        action={
          <SegmentedControl
            label="View field performance by"
            value="Fields"
            onChange={() => undefined}
            options={['Fields', 'Flowstations', 'Facilities']}
          />
        }
      >
        <DataTable
          caption="OML 30 field performance"
          headers={[
            'Field',
            'Planned',
            'Actual',
            'Variance',
            'Availability',
            'Status',
            'Versus plan',
            'Action',
          ]}
          rows={atlas.production.fields.map((field) => {
            const fieldName = atlas.assets[0].fields.find(
              (item) => item.id === field.fieldId,
            )?.name;
            return [
              fieldName,
              `${format.number(field.planBopd)} bopd`,
              `${format.number(field.actualBopd)} bopd`,
              `${format.number(field.varianceBopd)} bopd`,
              format.percent(field.availabilityPercent),
              <StatusBadge status={field.status} />,
              format.percent(field.variancePercent),
              <Button variant="tertiary" onClick={() => setDetail(fieldName ?? '')}>
                Open
              </Button>,
            ];
          })}
        />
      </Panel>
      <Drawer title={detail ?? ''} open={Boolean(detail)} onClose={() => setDetail(null)}>
        <p>Field performance, trend, source evidence and operating constraints.</p>
        <StatusBadge status="at_risk" />
      </Drawer>
    </>
  );
}

export function FinancePage() {
  const [period, setPeriod] = useState('Monthly');
  const { kpis } = atlas.finance;
  return (
    <>
      <ModuleHeader
        title="Finance"
        description="Liquidity, cashflow, budget performance and near-term obligations."
      />
      <div className="kpi-strip kpi-strip--5">
        <KpiCard
          label="Available liquidity"
          value={format.usd(kpis.availableLiquidityUsd)}
          status={kpis.status}
          context={`${kpis.runwayMonths} months runway`}
        />
        <KpiCard
          label="Revenue YTD"
          value={format.usd(kpis.revenueYtdUsd)}
          status="at_risk"
          context={`Plan ${format.usd(kpis.revenuePlanYtdUsd)}`}
        />
        <KpiCard
          label="OPEX YTD"
          value={format.usd(kpis.opexYtdUsd)}
          status="at_risk"
          context={`Plan ${format.usd(kpis.opexPlanYtdUsd)}`}
        />
        <KpiCard
          label="CAPEX & JV calls YTD"
          value={format.usd(kpis.capexAndJvCallsYtdUsd)}
          status="on_track"
          context={`Plan ${format.usd(kpis.capexPlanYtdUsd)}`}
        />
        <KpiCard
          label="Obligations due · 12 months"
          value={format.usd(kpis.obligationsDue12MonthsUsd)}
          status="at_risk"
          context={`${format.usd(kpis.nextRepaymentUsd)} due 30 Sep`}
        />
      </div>
      <div className="analysis-6-3-3 section">
        <Panel
          title="Cashflow summary"
          action={
            <SegmentedControl
              label="Cashflow period"
              value={period}
              onChange={setPeriod}
              options={['Daily', 'Weekly', 'Monthly']}
            />
          }
        >
          <ChartWrapper
            title="Cashflow summary"
            summary="Monthly net cashflow became negative from April and reached minus 8.5 million dollars in July."
            tableHeaders={['Month', 'Inflows', 'Outflows', 'Net']}
            tableRows={atlas.finance.cashflow.map((point) => [
              point.month,
              format.usd(point.inflowUsd),
              format.usd(point.outflowUsd),
              format.usd(point.netUsd),
            ])}
          >
            <ComposedChart data={atlas.finance.cashflow}>
              <CartesianGrid stroke="#EAECF0" vertical={false} />
              <XAxis dataKey="month" tick={chartAxis} />
              <YAxis tick={chartAxis} tickFormatter={(value) => `$${value / 1_000_000}m`} />
              <Tooltip formatter={(value) => format.usd(Number(value))} />
              <Legend />
              <Bar dataKey="netUsd" name="Net cashflow" fill="#98A2B3" />
              <Line dataKey="inflowUsd" name="Inflows" stroke="#079455" strokeWidth={2} />
              <Line dataKey="outflowUsd" name="Outflows" stroke="#D92D20" strokeWidth={2} />
            </ComposedChart>
          </ChartWrapper>
        </Panel>
        <Panel title="Cash position summary">
          <dl className="summary-list">
            <div>
              <dt>Unrestricted cash</dt>
              <dd>{format.usd(kpis.unrestrictedCashUsd)}</dd>
            </div>
            <div>
              <dt>Restricted cash</dt>
              <dd>{format.usd(kpis.restrictedCashUsd)}</dd>
            </div>
            <div>
              <dt>Undrawn facilities</dt>
              <dd>{format.usd(kpis.undrawnFacilitiesUsd)}</dd>
            </div>
            <div>
              <dt>Total liquidity</dt>
              <dd>{format.usd(kpis.availableLiquidityUsd)}</dd>
            </div>
            <div>
              <dt>Monthly burn</dt>
              <dd>{format.usd(kpis.averageMonthlyBurnUsd)}</dd>
            </div>
            <div>
              <dt>Runway</dt>
              <dd>{kpis.runwayMonths} months</dd>
            </div>
            <div>
              <dt>Next repayment</dt>
              <dd>{format.date(kpis.nextRepaymentDate)}</dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Budget variance">
          <Ring
            value={Math.round(atlas.finance.budgetVariance.overallPercent)}
            label="Adverse variance"
            tone="warning"
          />
          <dl className="summary-list">
            <div>
              <dt>Over plan</dt>
              <dd>{format.usd(atlas.finance.budgetVariance.overBudgetUsd)}</dd>
            </div>
            <div>
              <dt>Under plan</dt>
              <dd>{format.usd(atlas.finance.budgetVariance.underBudgetUsd)}</dd>
            </div>
            <div>
              <dt>Net adverse</dt>
              <dd>{format.usd(atlas.finance.budgetVariance.netAdverseUsd)}</dd>
            </div>
          </dl>
        </Panel>
      </div>
      <div className="lower-8-4 section">
        <Panel title="Commitments and obligations">
          <DataTable
            caption="Commitments and obligations"
            headers={[
              'Category',
              'Total committed',
              'Paid to date',
              'Remaining',
              'Due within 30 days',
              'Status',
            ]}
            rows={atlas.finance.commitments.map((item) => [
              item.category,
              format.usd(item.totalCommittedUsd),
              format.usd(item.paidToDateUsd),
              format.usd(item.remainingUsd),
              format.usd(item.due30DaysUsd),
              <StatusBadge status={item.status} />,
            ])}
          />
        </Panel>
        <Panel title="Invoices and receivables">
          <DataTable
            caption="Invoices and receivables"
            headers={['Reference', 'Source', 'Amount', 'Due', 'Status']}
            rows={atlas.finance.receivables.map((item) => [
              item.reference,
              item.source,
              format.usd(item.amountUsd),
              format.date(item.dueDate),
              <StatusBadge status={item.status} />,
            ])}
          />
        </Panel>
      </div>
    </>
  );
}

export function HsePage() {
  const { kpis } = atlas.hse;
  return (
    <>
      <ModuleHeader
        title="HSE"
        description="Safety outcomes, environmental performance, compliance and corrective actions."
      />
      <div className="kpi-strip kpi-strip--6">
        <KpiCard
          label="TRIR"
          value={String(kpis.trir)}
          status="at_risk"
          context={`Target ${kpis.trirTarget}`}
        />
        <KpiCard
          label="Recordable incidents"
          value={String(kpis.recordableIncidents)}
          status="at_risk"
        />
        <KpiCard label="LTIFR" value={kpis.ltifr.toFixed(1)} status="on_track" />
        <KpiCard
          label="Process-safety events"
          value={String(kpis.processSafetyEvents)}
          status="at_risk"
        />
        <KpiCard
          label="Safety observations"
          value={format.number(kpis.safetyObservations)}
          status="on_track"
        />
        <KpiCard
          label="Days since last LTI"
          value={String(kpis.daysSinceLastLti)}
          status="on_track"
        />
      </div>
      <div className="analysis-6-3-3 section">
        <Panel title="Incident trend">
          <ChartWrapper
            title="Incident trend"
            summary="TRIR rose above the 0.12 target in July, with two recordable incidents."
            tableHeaders={['Month', 'TRIR', 'Target', 'Incidents']}
            tableRows={atlas.hse.trend.map((point) => [
              point.month,
              point.trir,
              point.target,
              point.recordableIncidents,
            ])}
          >
            <ComposedChart data={atlas.hse.trend}>
              <CartesianGrid stroke="#EAECF0" vertical={false} />
              <XAxis dataKey="month" tick={chartAxis} />
              <YAxis yAxisId="rate" tick={chartAxis} />
              <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={chartAxis} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="count" dataKey="recordableIncidents" name="Incidents" fill="#98A2B3" />
              <Line
                yAxisId="rate"
                dataKey="trir"
                name="Actual TRIR"
                stroke="#4F46E5"
                strokeWidth={2}
              />
              <Line
                yAxisId="rate"
                dataKey="target"
                name="Target"
                stroke="#667085"
                strokeDasharray="6 5"
              />
            </ComposedChart>
          </ChartWrapper>
        </Panel>
        <Panel title="Incident summary">
          <dl className="summary-list">
            <div>
              <dt>Total recordables</dt>
              <dd>{kpis.recordableIncidents}</dd>
            </div>
            <div>
              <dt>Medical treatment cases</dt>
              <dd>{kpis.medicalTreatmentCases}</dd>
            </div>
            <div>
              <dt>LTIs</dt>
              <dd>{kpis.lostTimeInjuries}</dd>
            </div>
            <div>
              <dt>Near misses</dt>
              <dd>{kpis.nearMisses}</dd>
            </div>
            <div>
              <dt>High-potential incidents</dt>
              <dd>{kpis.highPotentialIncidents}</dd>
            </div>
            <div>
              <dt>Employee hours</dt>
              <dd>{format.number(kpis.employeeHours)}</dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Top incidents">
          <div className="compact-list">
            {atlas.hse.incidents.map((incident) => (
              <button key={incident.id}>
                <span>
                  <strong>{incident.title}</strong>
                  <small>{incident.location}</small>
                </span>
                <StatusBadge status={incident.severity} />
              </button>
            ))}
          </div>
        </Panel>
      </div>
      <div className="lower-3-3-6 section">
        <Panel title="Environmental performance">
          <dl className="summary-list">
            <div>
              <dt>Spills</dt>
              <dd>
                {atlas.hse.environmental.hydrocarbonSpills} ·{' '}
                {atlas.hse.environmental.spillVolumeBarrels} bbl
              </dd>
            </div>
            <div>
              <dt>Produced-water compliance</dt>
              <dd>{format.percent(atlas.hse.environmental.producedWaterCompliancePercent)}</dd>
            </div>
            <div>
              <dt>Flaring intensity</dt>
              <dd>{atlas.hse.environmental.flaringIntensityMscfPerBoe} Mscf/boe</dd>
            </div>
            <div>
              <dt>Notifications</dt>
              <dd>{atlas.hse.environmental.regulatoryNotifications}</dd>
            </div>
          </dl>
        </Panel>
        <Panel title="HSE compliance">
          <Ring value={atlas.hse.compliance.scorePercent} label="Compliant" tone="success" />
          <p>
            {atlas.hse.compliance.compliantRequirements} compliant ·{' '}
            {atlas.hse.compliance.minorGaps} minor · {atlas.hse.compliance.majorGaps} major
          </p>
        </Panel>
        <Panel title="HSE actions">
          <DataTable
            caption="HSE corrective actions"
            headers={['Action', 'Related record', 'Owner', 'Due date', 'Status']}
            rows={atlas.hse.actions.map((item) => [
              item.title,
              item.relatedRecordId,
              item.owner,
              format.date(item.dueDate),
              <StatusBadge status={item.status} />,
            ])}
          />
        </Panel>
      </div>
    </>
  );
}

export function LegalPage() {
  const { kpis } = atlas.legalRegulatory;
  return (
    <>
      <ModuleHeader
        title="Legal & Regulatory"
        description="Material exposure, regulatory deadlines, approvals and obligations."
      />
      <div className="kpi-strip kpi-strip--6">
        <KpiCard
          label="Legal exposure"
          value={format.usd(kpis.estimatedExposureUsd)}
          status="at_risk"
          context={`${kpis.openLegalMatters} open matters`}
        />
        <KpiCard
          label="Regulatory compliance"
          value={format.percent(kpis.compliancePercent)}
          status="at_risk"
        />
        <KpiCard
          label="Regulatory submissions"
          value={String(kpis.submissionsDueThisMonth)}
          status="due_soon"
          context={`${kpis.submissionsOutstanding} outstanding`}
        />
        <KpiCard
          label="Government approvals"
          value={String(kpis.governmentApprovalsPending)}
          status="in_progress"
        />
        <KpiCard
          label="Contractual obligations"
          value={format.percent(kpis.contractualObligationsOnTimePercent)}
          status="at_risk"
        />
        <KpiCard label="Critical risks" value={String(kpis.criticalRisks)} status="critical" />
      </div>
      <div className="legal-overview section">
        <Panel title="Legal & Regulatory risk register">
          <DataTable
            caption="Legal and regulatory risks"
            headers={['Issue', 'Asset / Project', 'Owner', 'Impact', 'Status', 'Due date']}
            rows={atlas.legalRegulatory.risks.map((item) => [
              item.issue,
              item.assetProject,
              item.owner,
              <StatusBadge status={item.impact} />,
              <StatusBadge status={item.status} />,
              format.date(item.dueDate),
            ])}
          />
        </Panel>
        <Panel title="Regulatory calendar">
          <div className="timeline" role="list" aria-label="Regulatory events">
            {atlas.legalRegulatory.calendar.map((event) => (
              <button role="listitem" key={event.id}>
                <span className={`timeline__dot timeline__dot--${event.status}`} />
                <strong>{event.name}</strong>
                <small>
                  {event.regulator} · {format.date(event.dueDate)}
                </small>
                <StatusBadge status={event.status} />
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Compliance overview">
          <Ring
            value={atlas.legalRegulatory.compliance.scorePercent}
            label="Compliant"
            tone="success"
          />
          <p>
            {atlas.legalRegulatory.compliance.compliantRequirements} compliant ·{' '}
            {atlas.legalRegulatory.compliance.minorIssues} minor ·{' '}
            {atlas.legalRegulatory.compliance.majorIssues} major
          </p>
        </Panel>
      </div>
      <div className="lower-4-4-4 section">
        <Panel title="Government & regulator engagement">
          <DataTable
            caption="Government and regulator engagement"
            headers={['Organisation', 'Owner', 'Status', 'Next engagement']}
            rows={atlas.legalRegulatory.engagements.map((item) => [
              item.organisation,
              item.owner,
              <StatusBadge status={item.status} />,
              format.date(item.nextDate),
            ])}
          />
        </Panel>
        <Panel title="Contracts & approvals">
          <DataTable
            caption="Contracts and approvals"
            headers={['Contract / Approval', 'Asset / Project', 'Status', 'Owner', 'Due']}
            rows={atlas.legalRegulatory.contractsApprovals.map((item) => [
              item.name,
              item.assetProject,
              <StatusBadge status={item.status} />,
              item.owner,
              format.date(item.dueDate),
            ])}
          />
        </Panel>
        <Panel title="Executive alerts">
          <div className="compact-list">
            {atlas.legalRegulatory.risks.slice(0, 3).map((risk) => (
              <button key={risk.id}>
                <span>
                  <strong>{risk.issue}</strong>
                  <small>
                    {risk.owner} · due {format.date(risk.dueDate)}
                  </small>
                </span>
                <StatusBadge status={risk.impact} />
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
