import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
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
  DataTable,
  KpiCard,
  PageHeader,
  Panel,
  StateView,
  StatusBadge,
} from '../components/Ui';
import { selectCommercialDashboard } from '../data/commercialDashboard';
import { useAtlas } from '../state/AtlasContext';

function statusCopy(status: string) {
  if (status === 'critical') return 'Critical intervention required';
  if (status === 'at_risk') return 'At risk';
  return 'On track';
}

export default function CommercialDashboardPage() {
  const navigate = useNavigate();
  const { plan, workflow, cycleId, scenarioId } = useAtlas();
  const dashboard = selectCommercialDashboard(plan.confirmedPlan, workflow, cycleId, scenarioId);

  if (!dashboard) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="How is the portfolio performing, and what should the Commercial Manager focus on now?"
          controls={<ContextControls />}
        />
        <StateView
          type="empty"
          title="Confirm an approved plan to activate the Dashboard"
          message="Atlas needs a verified confirmed-plan baseline before it can compare project and reporting performance."
          action={<Button onClick={() => navigate('/plan')}>Open Plan</Button>}
        />
      </>
    );
  }

  const currentWeek = dashboard.trend.find((point) => point.currentReportingWeek)?.period;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="How is the portfolio performing, and what should the Commercial Manager focus on now?"
        controls={<ContextControls />}
      />

      {dashboard.reportingCoverage.limited && (
        <div className="info-panel dashboard-coverage" role="status">
          <strong>Limited reporting data</strong>
          <span>
            No submissions are available for the selected reporting period. Project health and KPI
            cards use the latest validated reporting data available.
          </span>
        </div>
      )}

      <Panel
        title="Portfolio Health"
        className="portfolio-health"
        action={
          <Button variant="secondary" onClick={() => navigate('/projects')}>
            View projects <ArrowRight aria-hidden="true" />
          </Button>
        }
      >
        <div className="portfolio-health__summary">
          <div>
            <small>Confirmed project roll-up</small>
            <strong>{dashboard.portfolioHealth.score}</strong>
            <span>out of 100</span>
          </div>
          <div>
            <StatusBadge status={dashboard.portfolioHealth.status} />
            <h3>{statusCopy(dashboard.portfolioHealth.status)}</h3>
            <p>
              Derived from the latest reported health of {dashboard.projects.length} confirmed
              projects.
            </p>
          </div>
        </div>
        <div className="portfolio-health__breakdown" aria-label="Project health breakdown">
          <button onClick={() => navigate('/projects?health=on_track')}>
            <StatusBadge status="on_track" />
            <strong>{dashboard.portfolioHealth.breakdown.on_track}</strong>
            <span>On track</span>
          </button>
          <button onClick={() => navigate('/projects?health=at_risk')}>
            <StatusBadge status="at_risk" />
            <strong>{dashboard.portfolioHealth.breakdown.at_risk}</strong>
            <span>At risk</span>
          </button>
          <button onClick={() => navigate('/projects?health=critical')}>
            <StatusBadge status="critical" />
            <strong>{dashboard.portfolioHealth.breakdown.critical}</strong>
            <span>Critical</span>
          </button>
        </div>
      </Panel>

      <section className="section" aria-labelledby="portfolio-kpis-title">
        <header className="section-heading">
          <div>
            <h2 id="portfolio-kpis-title">Current performance</h2>
            <p>Approved plan targets compared with the latest validated reporting results.</p>
          </div>
        </header>
        <div className="kpi-strip kpi-strip--4 dashboard-kpis">
          {dashboard.kpis.map((metric) => (
            <KpiCard
              key={metric.id}
              label={metric.title}
              value={metric.result}
              context={metric.context}
              status={metric.status}
              onClick={() => navigate(metric.destination)}
            />
          ))}
        </div>
      </section>

      <Panel title="What Needs My Attention" className="section">
        {dashboard.attention.length ? (
          <DataTable
            caption="Items requiring Commercial Manager attention"
            headers={['Item', 'Why it needs attention', 'Related record', 'Urgency', 'Action']}
            rows={dashboard.attention.map((item) => [
              item.title,
              item.reason,
              item.reference,
              <StatusBadge status={item.status} />,
              'Open',
            ])}
            onRowClick={(index) => navigate(dashboard.attention[index].destination)}
          />
        ) : (
          <p className="empty-copy">No projects or submissions currently require attention.</p>
        )}
      </Panel>

      <Panel title="Today’s Priorities" className="section dashboard-priorities">
        {dashboard.priorities.length ? (
          <ol>
            {dashboard.priorities.map((priority, index) => (
              <li key={priority.id}>
                <span>{index + 1}</span>
                <button onClick={() => navigate(priority.destination)}>
                  <span>
                    <strong>{priority.title}</strong>
                    <small>{priority.reason}</small>
                    <em>{priority.reference}</em>
                  </span>
                  <span>
                    <StatusBadge status={priority.status} />
                    <b>
                      Open <ArrowRight aria-hidden="true" />
                    </b>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-copy">Atlas has no current priorities for this reporting period.</p>
        )}
      </Panel>

      <Panel
        title="Plan Delivery Trend"
        className="section dashboard-trend"
        action={currentWeek ? <StatusBadge status="active" /> : undefined}
      >
        <p className="panel-intro">
          Week-on-week delivery against the timeline in {dashboard.plan.name}. The final point is
          the current reporting week{currentWeek ? ` (${currentWeek})` : ''}.
        </p>
        <ChartWrapper
          title="Approved plan delivery versus reported actual delivery"
          summary={`Current reported delivery is ${dashboard.trend.at(-1)?.actualDeliveryPercent}% against ${dashboard.trend.at(-1)?.plannedDeliveryPercent}% planned.`}
          tableHeaders={['Reporting week', 'Planned delivery', 'Actual delivery', 'Current week']}
          tableRows={dashboard.trend.map((point) => [
            point.period,
            `${point.plannedDeliveryPercent}%`,
            `${point.actualDeliveryPercent}%`,
            point.currentReportingWeek ? 'Yes' : 'No',
          ])}
        >
          <LineChart data={dashboard.trend} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="period" tickLine={false} axisLine={false} />
            <YAxis domain={[65, 95]} tickLine={false} axisLine={false} unit="%" />
            <Tooltip formatter={(value, name) => [`${value}%`, name]} />
            <Legend />
            {currentWeek && (
              <ReferenceLine
                x={currentWeek}
                stroke="#98a2b3"
                strokeDasharray="4 4"
                label={{ value: 'Current week', position: 'insideTopRight', fill: '#667085' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="plannedDeliveryPercent"
              name="Approved plan"
              stroke="#101828"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actualDeliveryPercent"
              name="Reported actual"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartWrapper>
      </Panel>
    </>
  );
}
