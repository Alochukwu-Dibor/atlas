import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartWrapper } from '../components/Charts';
import {
  Button,
  DataTable,
  KpiCard,
  PageHeader,
  Panel,
  StateView,
  StatusBadge,
} from '../components/Ui';
import { format } from '../data/atlas';
import { selectExecutiveDashboard } from '../data/executiveDashboard';
import { useAtlas } from '../state/AtlasContext';

export function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { cycleId, managerUpdates, plan } = useAtlas();
  const dashboard = selectExecutiveDashboard(plan.confirmedPlan, managerUpdates, cycleId);

  if (!dashboard) {
    return (
      <StateView
        type="empty"
        title="CEO dashboard unavailable"
        message="A confirmed approved plan is required before Atlas can calculate Executive performance."
      />
    );
  }

  const { metrics, productionTrend, strategicRisks, insights } = dashboard.ceo;

  return (
    <>
      <PageHeader
        title="CEO Dashboard"
        description={`Organisation-wide operational performance · ${dashboard.cycle.label}`}
        controls={
          <Button variant="secondary" onClick={() => navigate('/executive/view-updates')}>
            View submitted updates
          </Button>
        }
      />

      <div className="grid grid--4 executive-kpis">
        <KpiCard label="Portfolio Health" value="76" status="Healthy" />
        {metrics.slice(0, 3).map((metric) => (
          <KpiCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            onClick={metric.destination ? () => navigate(metric.destination!) : undefined}
          />
        ))}
      </div>

      <Panel title="Planned vs Actual Production" className="section">
        {productionTrend.length ? (
          <ChartWrapper
            title="Planned production, actual production and variance"
            summary={`Current production is ${format.number(productionTrend.at(-1)?.actual ?? 0)} bopd against ${format.number(productionTrend.at(-1)?.planned ?? 0)} bopd plan, a ${format.number(productionTrend.at(-1)?.variance ?? 0)} bopd variance for ${dashboard.cycle.label}.`}
            tableHeaders={['Period', 'Planned production', 'Actual production', 'Variance']}
            tableRows={productionTrend.map((point) => [
              point.period,
              `${format.number(point.planned)} bopd`,
              `${format.number(point.actual)} bopd`,
              `${format.number(point.variance)} bopd`,
            ])}
          >
            <AreaChart data={productionTrend} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="executiveProductionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#f8fafc" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="production"
                tickFormatter={(value) => `${value / 1000}k`}
                tickLine={false}
                axisLine={false}
                label={{ value: 'bopd', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={(value) => `${format.number(Number(value))} bopd`} />
              <Legend />
              <Area
                yAxisId="production"
                dataKey="actual"
                name="Actual Production"
                type="monotone"
                stroke="#475569"
                strokeWidth={2}
                fill="url(#executiveProductionFill)"
              />
              <Line
                yAxisId="production"
                dataKey="planned"
                name="Planned Production"
                stroke="#667085"
                strokeDasharray="6 5"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ChartWrapper>
        ) : (
          <StateView
            type="empty"
            title="Production trend unavailable"
            message={`Atlas does not have both a confirmed production baseline and a validated actual for ${dashboard.cycle.label}.`}
          />
        )}
      </Panel>

      <div className="grid grid--2 section executive-dashboard-split">
        <Panel title="Strategic Risks">
          {strategicRisks.length ? (
            <DataTable
              caption="Strategic risks for the current reporting period"
              headers={['Risk', 'Impact']}
              rows={strategicRisks.map((risk) => [
                <span className="risk-title-cell" key={risk.id}>
                  <StatusBadge status={risk.status} />
                  <strong>{risk.risk}</strong>
                </span>,
                risk.impact,
              ])}
              onRowClick={(index) => {
                const destination = strategicRisks[index].destination;
                if (destination) navigate(destination);
              }}
            />
          ) : (
            <p className="empty-copy">No strategic risks are recorded for this reporting period.</p>
          )}
        </Panel>

        <Panel title="Insights" className="executive-insights">
          {insights.length ? (
            <div className="executive-insight-list">
              {insights.map((insight) => (
                <article key={insight.id} className="executive-insight">
                  <div>
                    <StatusBadge status={insight.status} />
                    <h3>{insight.title}</h3>
                    <p>{insight.detail}</p>
                    <small>{insight.impact}</small>
                  </div>
                  {insight.destination && (
                    <Button variant="secondary" onClick={() => navigate(insight.destination!)}>
                      View context
                    </Button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-copy">No deterministic insights are available for this period.</p>
          )}
        </Panel>
      </div>
    </>
  );
}

export function CfoDashboard() {
  const navigate = useNavigate();
  const { cycleId, managerUpdates, plan } = useAtlas();
  const dashboard = selectExecutiveDashboard(plan.confirmedPlan, managerUpdates, cycleId);

  if (!dashboard) {
    return (
      <StateView
        type="empty"
        title="CFO dashboard unavailable"
        message="A confirmed approved plan is required before Atlas can calculate financial performance."
      />
    );
  }

  const { metrics, cashFlowForecast, spend, financialRisks } = dashboard.cfo;
  const forecastStart = cashFlowForecast.at(0)?.period;
  const forecastEnd = cashFlowForecast.at(-1)?.period;

  return (
    <>
      <PageHeader
        title="CFO Dashboard"
        description={`Consolidated financial performance · ${dashboard.cycle.label}`}
        controls={
          <Button variant="secondary" onClick={() => navigate('/executive/view-updates')}>
            View submitted updates
          </Button>
        }
      />

      <div className="grid grid--4 executive-kpis">
        <KpiCard label="Funding Health" value="82" status="Stable" />
        {metrics.slice(0, 3).map((metric) => (
          <KpiCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            onClick={metric.destination ? () => navigate(metric.destination!) : undefined}
          />
        ))}
      </div>

      <Panel title="Cash Flow Forecast" className="section">
        {cashFlowForecast.length ? (
          <ChartWrapper
            title="Forecast inflows, forecast outflows and net cash position"
            summary={`Cash-flow series covers ${forecastStart} to ${forecastEnd} in US dollars. The latest net position is ${format.usd(cashFlowForecast.at(-1)?.netCashPosition ?? 0)}.`}
            tableHeaders={[
              'Forecast period',
              'Forecast inflows',
              'Forecast outflows',
              'Net cash position',
            ]}
            tableRows={cashFlowForecast.map((point) => [
              point.period,
              format.usd(point.forecastInflows),
              format.usd(point.forecastOutflows),
              format.usd(point.netCashPosition),
            ])}
          >
            <AreaChart data={cashFlowForecast} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="executiveCashFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="#f8fafc" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(value) => `$${value / 1_000_000}m`}
                tickLine={false}
                axisLine={false}
                label={{ value: 'USD', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={(value) => format.usd(Number(value))} />
              <Legend />
              <ReferenceLine y={0} stroke="#667085" />
              <Area
                dataKey="forecastInflows"
                name="Forecast Inflows"
                type="monotone"
                stroke="#475569"
                strokeWidth={2}
                fill="url(#executiveCashFill)"
              />
              <Line
                dataKey="forecastOutflows"
                name="Forecast Outflows"
                stroke="#667085"
                strokeDasharray="6 5"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="netCashPosition"
                name="Net Cash Position"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ChartWrapper>
        ) : (
          <StateView
            type="empty"
            title="Cash-flow forecast unavailable"
            message={`No canonical cash-flow series is available for ${dashboard.cycle.label}.`}
          />
        )}
      </Panel>

      <div className="grid grid--2 section executive-dashboard-split executive-spend-grid">
        {spend.map((position) => (
          <Panel key={position.category} title={position.category === 'opex' ? 'OpEx' : 'CapEx'}>
            {position.available ? (
              <dl className="executive-spend-list">
                <div>
                  <dt>Approved</dt>
                  <dd>{format.usd(position.approved)}</dd>
                </div>
                <div>
                  <dt>Committed</dt>
                  <dd>{format.usd(position.committed)}</dd>
                </div>
                <div>
                  <dt>Actual</dt>
                  <dd>{format.usd(position.actual)}</dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd>{format.usd(position.remaining)}</dd>
                </div>
                <div>
                  <dt>Forecast variance</dt>
                  <dd>
                    {format.usd(position.variance)} <StatusBadge status={position.status} />
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="empty-copy">
                No {position.category === 'opex' ? 'OpEx' : 'CapEx'} records are available for this
                reporting period.
              </p>
            )}
          </Panel>
        ))}
      </div>

      <Panel title="Financial Risks" className="section">
        {financialRisks.length ? (
          <DataTable
            caption="Financial risks for the current reporting period"
            headers={['Risk', 'Impact', 'Exposure', 'Mitigation']}
            rows={financialRisks.map((risk) => [
              <span className="risk-title-cell" key={risk.id}>
                <StatusBadge status={risk.status} />
                <strong>{risk.risk}</strong>
              </span>,
              risk.impact,
              risk.exposure,
              risk.mitigation,
            ])}
            onRowClick={(index) => {
              const destination = financialRisks[index].destination;
              if (destination) navigate(destination);
            }}
          />
        ) : (
          <p className="empty-copy">No financial risks are recorded for this reporting period.</p>
        )}
      </Panel>
    </>
  );
}
