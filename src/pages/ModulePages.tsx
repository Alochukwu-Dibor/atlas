import { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartWrapper, Ring } from '../components/Charts';
import {
  Button,
  DataTable,
  Drawer,
  KpiCard,
  PageHeader,
  Panel,
  SegmentedControl,
  Select,
  StatusBadge,
} from '../components/Ui';
import {
  atlas,
  buildSyntheticExport,
  format,
  getLiquidity,
  getProductionScope,
} from '../data/atlas';

const chartAxis = { stroke: '#98A2B3', fontSize: 11 };
type Grain = 'Daily' | 'Weekly' | 'Monthly';
type ProductionView = 'Fields' | 'Flowstations' | 'Facilities';

function ModuleHeader({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        controls={<Button onClick={() => window.print()}>Export</Button>}
      />
      <p className="export-disclosure">{buildSyntheticExport(`Atlas ${title}`)}</p>
    </>
  );
}

function EvidenceDrawer({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Drawer title={title} open={open} onClose={onClose}>
      <p className="drawer-disclosure">{atlas.meta.disclosure}</p>
      {children}
    </Drawer>
  );
}

export function ProductionPage() {
  const [grain, setGrain] = useState<Grain>('Daily');
  const [scopeId, setScopeId] = useState('asset_oml30');
  const [viewBy, setViewBy] = useState<ProductionView>('Fields');
  const [detail, setDetail] = useState<string | null>(null);
  const selectedField = atlas.production.fields.find((field) => field.fieldId === scopeId);
  const scope = getProductionScope(scopeId);
  const workingInterest = getProductionScope(scopeId, 'working_interest');
  const trend = useMemo(() => {
    if (selectedField) {
      return selectedField.sparklineBopd.map((actualBopd, index) => ({
        period: atlas.production.weeklyTrend[index].date,
        actualBopd,
        planBopd: selectedField.planBopd,
      }));
    }
    if (grain === 'Monthly') {
      return atlas.production.monthlyTrend.map((point) => ({
        period: point.month,
        actualBopd: point.actualBopd,
        planBopd: point.planBopd,
      }));
    }
    if (grain === 'Weekly') {
      const count = atlas.production.weeklyTrend.length;
      return [
        {
          period: '20–26 Jul',
          actualBopd: Math.round(
            atlas.production.weeklyTrend.reduce((sum, point) => sum + point.actualBopd, 0) / count,
          ),
          planBopd: Math.round(
            atlas.production.weeklyTrend.reduce((sum, point) => sum + point.planBopd, 0) / count,
          ),
        },
      ];
    }
    return atlas.production.weeklyTrend.map((point) => ({
      period: point.date,
      actualBopd: point.actualBopd,
      planBopd: point.planBopd,
    }));
  }, [grain, selectedField]);

  const visibleFields = selectedField
    ? atlas.production.fields.filter((field) => field.fieldId === selectedField.fieldId)
    : atlas.production.fields;
  const fieldRows = visibleFields.map((field) => {
    const assetField = atlas.assets[0].fields.find((item) => item.id === field.fieldId)!;
    const label = viewBy === 'Flowstations' ? assetField.flowstation : assetField.name;
    return [
      label,
      `${format.number(field.planBopd)} bopd`,
      `${format.number(field.actualBopd)} bopd`,
      `${format.number(field.varianceBopd)} bopd · ${format.percent(field.variancePercent)}`,
      format.percent(field.availabilityPercent),
      <StatusBadge status={field.status} />,
      field.sparklineBopd.map((value) => Math.round(value / 100)).join(' · '),
      format.percent(field.variancePercent),
      <Button variant="tertiary" onClick={() => setDetail(assetField.name)}>
        Open
      </Button>,
    ];
  });
  const facilityRows = atlas.assets[0].facilities.map((facility) => [
    facility.name,
    '—',
    '—',
    'Facility-level allocation unavailable in fixture',
    facility.id === 'facility_compressor_b'
      ? format.percent(atlas.production.kpis.systemAvailabilityPercent)
      : '—',
    <StatusBadge status={facility.id === 'facility_compressor_b' ? 'constrained' : 'on_track'} />,
    '—',
    '—',
    <Button variant="tertiary" onClick={() => setDetail(facility.name)}>
      Open
    </Button>,
  ]);

  return (
    <>
      <ModuleHeader
        title="Production"
        description="OML 30 production performance, constraints and field-level delivery."
      />
      <div className="module-filter-row">
        <Select
          label="Production asset or field"
          value={scopeId}
          onChange={setScopeId}
          options={[
            { value: 'asset_oml30', label: 'OML 30 — All Fields' },
            ...atlas.assets[0].fields.map((field) => ({ value: field.id, label: field.name })),
          ]}
        />
        <span>
          {scope.fieldCount} field{scope.fieldCount === 1 ? '' : 's'} in view · oil volumes in bopd
        </span>
      </div>
      <div className="kpi-strip kpi-strip--5">
        <KpiCard
          label="Gross OML 30 oil"
          value={format.number(scope.actual)}
          unit="bopd"
          status={scope.variancePercent < -10 ? 'at_risk' : 'on_track'}
          context={`${format.percent(scope.variancePercent)} vs plan`}
          onClick={() => setDetail('Gross oil production')}
        />
        <KpiCard
          label="SNRL working interest"
          value={format.number(workingInterest.actual)}
          unit="bopd"
          status={scope.variancePercent < -10 ? 'at_risk' : 'on_track'}
          context={`${atlas.organisation.workingInterestPercent}% working interest`}
          onClick={() => setDetail('Working-interest production')}
        />
        <KpiCard
          label="Gas production"
          value={atlas.production.kpis.gasActualMmscfd.toFixed(1)}
          unit="MMscf/d"
          status="at_risk"
          context={`Plan ${atlas.production.kpis.gasPlanMmscfd.toFixed(1)}`}
          onClick={() => setDetail('Gas production')}
        />
        <KpiCard
          label="System availability"
          value={format.percent(atlas.production.kpis.systemAvailabilityPercent)}
          status="at_risk"
          context="Compressor B constrained"
          onClick={() => setDetail('System availability')}
        />
        <KpiCard
          label="Days since last LTI"
          value={String(atlas.production.kpis.daysSinceLastLti)}
          status="on_track"
          context="No lost-time injuries"
          onClick={() => setDetail('Days since last LTI')}
        />
      </div>
      <div className="analysis-8-4 section">
        <Panel
          title="Production trend"
          action={
            <SegmentedControl
              label="Production trend period"
              value={grain}
              onChange={(value) => setGrain(value as Grain)}
              options={['Daily', 'Weekly', 'Monthly']}
            />
          }
        >
          <ChartWrapper
            title="Planned versus actual production"
            summary={`The selected view shows ${format.number(scope.actual)} bopd actual against ${format.number(scope.plan)} bopd plan.`}
            tableHeaders={['Period', 'Actual bopd', 'Plan bopd']}
            tableRows={trend.map((point) => [
              point.period,
              format.number(point.actualBopd),
              format.number(point.planBopd),
            ])}
          >
            <LineChart data={trend}>
              <CartesianGrid stroke="#EAECF0" vertical={false} />
              <XAxis dataKey="period" tick={chartAxis} />
              <YAxis tick={chartAxis} unit=" bopd" tickFormatter={(value) => `${value / 1000}k`} />
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
            </LineChart>
          </ChartWrapper>
        </Panel>
        <Panel title="Production summary">
          <dl className="summary-list">
            <div>
              <dt>Planned oil</dt>
              <dd>{format.number(scope.plan)} bopd</dd>
            </div>
            <div>
              <dt>Actual oil</dt>
              <dd>{format.number(scope.actual)} bopd</dd>
            </div>
            <div>
              <dt>Variance</dt>
              <dd>
                {format.number(scope.variance)} bopd · {format.percent(scope.variancePercent)}
              </dd>
            </div>
            <div>
              <dt>SNRL working interest</dt>
              <dd>{format.number(workingInterest.actual)} bopd</dd>
            </div>
            <div>
              <dt>Gas</dt>
              <dd>{atlas.production.kpis.gasActualMmscfd} MMscf/d</dd>
            </div>
            <div>
              <dt>Available capacity</dt>
              <dd>{format.number(atlas.production.kpis.availableCapacityBopd)} bopd</dd>
            </div>
            <div>
              <dt>Deferred production</dt>
              <dd>{format.number(atlas.production.kpis.deferredProductionBopd)} bopd</dd>
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
            value={viewBy}
            onChange={(value) => setViewBy(value as ProductionView)}
            options={['Fields', 'Flowstations', 'Facilities']}
          />
        }
      >
        <DataTable
          caption={`OML 30 ${viewBy.toLowerCase()} performance`}
          headers={[
            viewBy === 'Fields' ? 'Field' : viewBy === 'Flowstations' ? 'Flowstation' : 'Facility',
            'Planned',
            'Actual',
            'Variance',
            'Availability',
            'Status',
            'Trend',
            'Versus plan',
            'Action',
          ]}
          rows={viewBy === 'Facilities' ? facilityRows : fieldRows}
        />
      </Panel>
      <EvidenceDrawer title={detail ?? ''} open={Boolean(detail)} onClose={() => setDetail(null)}>
        <dl className="summary-list">
          <div>
            <dt>Current actual</dt>
            <dd>{format.number(scope.actual)} bopd</dd>
          </div>
          <div>
            <dt>Approved plan</dt>
            <dd>{format.number(scope.plan)} bopd</dd>
          </div>
          <div>
            <dt>Primary constraint</dt>
            <dd>{atlas.production.kpis.primaryConstraint}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>Operations approved report · Daily Production fixture</dd>
          </div>
        </dl>
      </EvidenceDrawer>
    </>
  );
}

export function FinancePage() {
  const [grain, setGrain] = useState<Grain>('Monthly');
  const [detail, setDetail] = useState<string | null>(null);
  const liquidity = getLiquidity();
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
          value={format.usd(liquidity.availableLiquidityUsd)}
          status={kpis.status}
          context={`${liquidity.runwayMonths} months runway`}
          onClick={() => setDetail('Available liquidity')}
        />
        <KpiCard
          label="Revenue YTD"
          value={format.usd(kpis.revenueYtdUsd)}
          status="at_risk"
          context={`Plan ${format.usd(kpis.revenuePlanYtdUsd)}`}
          onClick={() => setDetail('Revenue YTD')}
        />
        <KpiCard
          label="OPEX YTD"
          value={format.usd(kpis.opexYtdUsd)}
          status="at_risk"
          context={`Plan ${format.usd(kpis.opexPlanYtdUsd)}`}
          onClick={() => setDetail('OPEX YTD')}
        />
        <KpiCard
          label="CAPEX & JV calls YTD"
          value={format.usd(kpis.capexAndJvCallsYtdUsd)}
          status="on_track"
          context={`Plan ${format.usd(kpis.capexPlanYtdUsd)}`}
          onClick={() => setDetail('CAPEX and JV calls')}
        />
        <KpiCard
          label="Obligations due · 12 months"
          value={format.usd(kpis.obligationsDue12MonthsUsd)}
          status="at_risk"
          context={`${format.usd(kpis.nextRepaymentUsd)} due 30 Sep`}
          onClick={() => setDetail('Financing obligations')}
        />
      </div>
      <div className="analysis-6-3-3 section">
        <Panel
          title="Cashflow summary"
          action={
            <SegmentedControl
              label="Cashflow period"
              value={grain}
              onChange={(value) => setGrain(value as Grain)}
              options={['Daily', 'Weekly', 'Monthly']}
            />
          }
        >
          <p className="chart-context">
            {grain} control selected · source fixture is reported monthly.
          </p>
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
              <YAxis
                tick={chartAxis}
                unit=" USD"
                tickFormatter={(value) => `$${value / 1_000_000}m`}
              />
              <Tooltip formatter={(value) => format.usd(Number(value))} />
              <Legend />
              <Bar dataKey="netUsd" name="Net cashflow">
                {atlas.finance.cashflow.map((point) => (
                  <Cell key={point.month} fill={point.netUsd >= 0 ? '#079455' : '#D92D20'} />
                ))}
              </Bar>
              <Line
                dataKey="inflowUsd"
                name="Inflows"
                stroke="#079455"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="outflowUsd"
                name="Outflows"
                stroke="#D92D20"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ChartWrapper>
        </Panel>
        <Panel title="Cash position summary">
          <dl className="summary-list">
            <div>
              <dt>Unrestricted cash</dt>
              <dd>{format.usd(liquidity.unrestrictedCashUsd)}</dd>
            </div>
            <div>
              <dt>Restricted cash</dt>
              <dd>{format.usd(liquidity.restrictedCashUsd)}</dd>
            </div>
            <div>
              <dt>Undrawn facilities</dt>
              <dd>{format.usd(liquidity.undrawnFacilitiesUsd)}</dd>
            </div>
            <div>
              <dt>Total liquidity</dt>
              <dd>{format.usd(liquidity.availableLiquidityUsd)}</dd>
            </div>
            <div>
              <dt>Monthly burn</dt>
              <dd>{format.usd(kpis.averageMonthlyBurnUsd)}</dd>
            </div>
            <div>
              <dt>Runway</dt>
              <dd>{liquidity.runwayMonths} months</dd>
            </div>
            <div>
              <dt>Next repayment</dt>
              <dd>
                {format.usd(kpis.nextRepaymentUsd)} · {format.date(kpis.nextRepaymentDate)}
              </dd>
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
            <div>
              <dt>Distribution</dt>
              <dd>{format.percent(atlas.finance.budgetVariance.overallPercent)} adverse</dd>
            </div>
          </dl>
          <Button variant="tertiary" onClick={() => setDetail('Budget variance analysis')}>
            Variance analysis
          </Button>
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
            onRowClick={(index) => setDetail(atlas.finance.commitments[index].category)}
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
            headers={['Reference', 'Revenue source / Project', 'Amount', 'Due date', 'Status']}
            onRowClick={(index) => setDetail(atlas.finance.receivables[index].reference)}
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
      <EvidenceDrawer title={detail ?? ''} open={Boolean(detail)} onClose={() => setDetail(null)}>
        <dl className="summary-list">
          <div>
            <dt>Available liquidity</dt>
            <dd>{format.usd(liquidity.availableLiquidityUsd)}</dd>
          </div>
          <div>
            <dt>Runway</dt>
            <dd>{liquidity.runwayMonths} months</dd>
          </div>
          <div>
            <dt>Next financing repayment</dt>
            <dd>
              {format.usd(kpis.nextRepaymentUsd)} · {format.date(kpis.nextRepaymentDate)}
            </dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>Treasury_Cash_Position_W30.xlsx</dd>
          </div>
        </dl>
      </EvidenceDrawer>
    </>
  );
}

export function HsePage() {
  const [grain, setGrain] = useState<Grain>('Monthly');
  const [detail, setDetail] = useState<string | null>(null);
  const { kpis } = atlas.hse;
  const selectedIncident = atlas.hse.incidents.find((incident) => incident.id === detail);
  const selectedAction = atlas.hse.actions.find((action) => action.id === detail);
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
          onClick={() => setDetail('Total Recordable Incident Rate')}
        />
        <KpiCard
          label="Recordable incidents"
          value={String(kpis.recordableIncidents)}
          status="at_risk"
          onClick={() => setDetail('Recordable incidents')}
        />
        <KpiCard
          label="LTIFR"
          value={kpis.ltifr.toFixed(1)}
          status="on_track"
          onClick={() => setDetail('Lost-Time Injury Frequency Rate')}
        />
        <KpiCard
          label="Process-safety events"
          value={String(kpis.processSafetyEvents)}
          status="at_risk"
          onClick={() => setDetail('Process-safety events')}
        />
        <KpiCard
          label="Safety observations"
          value={format.number(kpis.safetyObservations)}
          status="on_track"
          onClick={() => setDetail('Safety observations')}
        />
        <KpiCard
          label="Days since last LTI"
          value={String(kpis.daysSinceLastLti)}
          status="on_track"
          onClick={() => setDetail('Days since last LTI')}
        />
      </div>
      <div className="analysis-6-3-3 section">
        <Panel
          title="Incident trend"
          action={
            <SegmentedControl
              label="Incident trend period"
              value={grain}
              onChange={(value) => setGrain(value as Grain)}
              options={['Daily', 'Weekly', 'Monthly']}
            />
          }
        >
          <p className="chart-context">
            {grain} control selected · source fixture is reported monthly.
          </p>
          <ChartWrapper
            title="Incident trend"
            summary="TRIR rose above the 0.12 target in July, with two recordable incidents."
            tableHeaders={['Month', 'Actual TRIR', 'Target TRIR', 'Incidents']}
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
              <YAxis
                yAxisId="rate"
                tick={chartAxis}
                label={{ value: 'TRIR', angle: -90, position: 'insideLeft' }}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                allowDecimals={false}
                tick={chartAxis}
                label={{ value: 'Incidents', angle: 90, position: 'insideRight' }}
              />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="count"
                dataKey="recordableIncidents"
                name="Recordable incidents"
                fill="#98A2B3"
              />
              <Line
                yAxisId="rate"
                dataKey="trir"
                name="Actual TRIR"
                stroke="#4F46E5"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="rate"
                dataKey="target"
                name="Target TRIR"
                stroke="#667085"
                strokeDasharray="6 5"
                dot={false}
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
              <dt>Restricted work cases</dt>
              <dd>{kpis.restrictedWorkCases}</dd>
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
              <dt>Employee / contractor hours</dt>
              <dd>
                {format.number(kpis.employeeHours)} / {format.number(kpis.contractorHours)}
              </dd>
            </div>
            <div>
              <dt>Actual / target TRIR</dt>
              <dd>
                {kpis.trir} / {kpis.trirTarget}
              </dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Top incidents">
          <div className="compact-list">
            {atlas.hse.incidents.map((incident) => (
              <button key={incident.id} onClick={() => setDetail(incident.id)}>
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
              <dt>Spills / volume</dt>
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
              <dt>Environmental incidents</dt>
              <dd>{atlas.hse.environmental.environmentalIncidents}</dd>
            </div>
            <div>
              <dt>Notifications</dt>
              <dd>{atlas.hse.environmental.regulatoryNotifications}</dd>
            </div>
            <div>
              <dt>Target status</dt>
              <dd>
                <StatusBadge status={atlas.hse.environmental.status} />
              </dd>
            </div>
          </dl>
        </Panel>
        <Panel title="HSE compliance">
          <Ring value={atlas.hse.compliance.scorePercent} label="Compliant" tone="success" />
          <p>
            {atlas.hse.compliance.compliantRequirements} compliant ·{' '}
            {atlas.hse.compliance.minorGaps} minor · {atlas.hse.compliance.majorGaps} major ·{' '}
            {atlas.hse.compliance.overdueFindings} overdue
          </p>
          <Button variant="tertiary" onClick={() => setDetail('HSE compliance evidence')}>
            View obligations
          </Button>
        </Panel>
        <Panel title="HSE actions">
          <DataTable
            caption="HSE corrective actions"
            headers={['Action', 'Related incident / Audit', 'Owner', 'Due date', 'Status']}
            onRowClick={(index) => setDetail(atlas.hse.actions[index].id)}
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
      <EvidenceDrawer
        title={selectedIncident?.title ?? selectedAction?.title ?? detail ?? ''}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
      >
        <p>
          Investigation, evidence, exposure and corrective actions remain linked to the selected HSE
          record.
        </p>
        <dl className="summary-list">
          {selectedIncident && (
            <>
              <div>
                <dt>Incident</dt>
                <dd>{selectedIncident.title}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{selectedIncident.location}</dd>
              </div>
              <div>
                <dt>Investigation</dt>
                <dd>{selectedIncident.investigationStatus.replaceAll('_', ' ')}</dd>
              </div>
              <div>
                <dt>Related actions</dt>
                <dd>
                  {
                    atlas.hse.actions.filter((item) => item.relatedRecordId === selectedIncident.id)
                      .length
                  }
                </dd>
              </div>
            </>
          )}
          {selectedAction && (
            <>
              <div>
                <dt>Action</dt>
                <dd>{selectedAction.title}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{selectedAction.owner}</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>{format.date(selectedAction.dueDate)}</dd>
              </div>
            </>
          )}
          <div>
            <dt>Actual / target TRIR</dt>
            <dd>
              {kpis.trir} / {kpis.trirTarget}
            </dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>Compressor_B_Initial_Incident_Report.pdf</dd>
          </div>
          <div>
            <dt>Open actions</dt>
            <dd>{atlas.hse.actions.filter((item) => item.status !== 'closed').length}</dd>
          </div>
        </dl>
      </EvidenceDrawer>
    </>
  );
}

export function LegalPage() {
  const [detail, setDetail] = useState<string | null>(null);
  const { kpis } = atlas.legalRegulatory;
  const selectedRisk = atlas.legalRegulatory.risks.find((risk) => risk.id === detail);
  const selectedCalendarEvent = atlas.legalRegulatory.calendar.find((event) => event.id === detail);
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
          onClick={() => setDetail('Legal exposure')}
        />
        <KpiCard
          label="Regulatory compliance"
          value={format.percent(kpis.compliancePercent)}
          status="at_risk"
          onClick={() => setDetail('Regulatory compliance')}
        />
        <KpiCard
          label="Regulatory submissions"
          value={String(kpis.submissionsDueThisMonth)}
          status="due_soon"
          context={`${kpis.submissionsOutstanding} outstanding`}
          onClick={() => setDetail('Regulatory submissions')}
        />
        <KpiCard
          label="Government approvals"
          value={String(kpis.governmentApprovalsPending)}
          status="in_progress"
          onClick={() => setDetail('Government approvals')}
        />
        <KpiCard
          label="Contractual obligations"
          value={format.percent(kpis.contractualObligationsOnTimePercent)}
          status="at_risk"
          onClick={() => setDetail('Contractual obligations')}
        />
        <KpiCard
          label="Critical risks"
          value={String(kpis.criticalRisks)}
          status="critical"
          onClick={() => setDetail('Critical legal risks')}
        />
      </div>
      <div className="legal-overview section">
        <Panel title="Legal & Regulatory risk register">
          <DataTable
            caption="Legal and regulatory risks"
            headers={['Issue', 'Asset / Project', 'Owner', 'Impact', 'Status', 'Due date']}
            onRowClick={(index) => setDetail(atlas.legalRegulatory.risks[index].id)}
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
          <div
            className="timeline timeline--horizontal"
            role="list"
            aria-label="Regulatory calendar timeline"
          >
            {atlas.legalRegulatory.calendar.map((event) => (
              <button
                role="listitem"
                key={event.id}
                title={`${event.regulator} · ${format.date(event.dueDate)} · ${event.status.replaceAll('_', ' ')}`}
                onClick={() => setDetail(event.id)}
              >
                <span className={`timeline__dot timeline__dot--${event.status}`} />
                <strong>{event.name}</strong>
                <small>
                  {event.regulator} · {format.date(event.dueDate)}
                </small>
                <StatusBadge status={event.status} />
              </button>
            ))}
          </div>
          <div className="month-boundary" aria-label="Reporting month transition">
            August reporting month → September
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
          <Button variant="tertiary" onClick={() => setDetail('Compliance obligations')}>
            View obligations
          </Button>
        </Panel>
      </div>
      <div className="lower-4-4-4 section">
        <Panel title="Government & regulator engagement">
          <DataTable
            caption="Government and regulator engagement"
            headers={['Organisation', 'Relationship owner', 'Status', 'Next engagement']}
            onRowClick={(index) => setDetail(atlas.legalRegulatory.engagements[index].id)}
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
            headers={['Contract / Approval', 'Asset / Project', 'Status', 'Owner', 'Due date']}
            onRowClick={(index) => setDetail(atlas.legalRegulatory.contractsApprovals[index].id)}
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
              <button key={risk.id} onClick={() => setDetail(risk.id)}>
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
      <EvidenceDrawer
        title={selectedRisk?.issue ?? selectedCalendarEvent?.name ?? detail ?? ''}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
      >
        <p>
          Issue history, exposure, evidence and actions for the selected legal or regulatory matter.
        </p>
        <dl className="summary-list">
          {selectedRisk && (
            <>
              <div>
                <dt>Issue</dt>
                <dd>{selectedRisk.issue}</dd>
              </div>
              <div>
                <dt>Exposure</dt>
                <dd>{format.usd(selectedRisk.estimatedExposureUsd)}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{selectedRisk.owner}</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>{format.date(selectedRisk.dueDate)}</dd>
              </div>
            </>
          )}
          {selectedCalendarEvent && (
            <>
              <div>
                <dt>Submission / Approval</dt>
                <dd>{selectedCalendarEvent.name}</dd>
              </div>
              <div>
                <dt>Regulator</dt>
                <dd>{selectedCalendarEvent.regulator}</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>{format.date(selectedCalendarEvent.dueDate)}</dd>
              </div>
            </>
          )}
          <div>
            <dt>Total estimated exposure</dt>
            <dd>{format.usd(kpis.estimatedExposureUsd)}</dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>Legal approved report · NUPRC engagement transcript</dd>
          </div>
          <div>
            <dt>Actions</dt>
            <dd>Owner and due date retained on the source matter</dd>
          </div>
        </dl>
      </EvidenceDrawer>
    </>
  );
}
