import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
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
import {
  Button,
  KpiCard,
  Modal,
  PageHeader,
  Panel,
  StateView,
  StatusBadge,
  useToast,
} from '../components/Ui';
import { getUser } from '../data/atlas';
import { selectCommercialDashboard } from '../data/commercialDashboard';
import { useAtlas } from '../state/AtlasContext';

export default function CommercialDashboardPage() {
  const navigate = useNavigate();
  const [resetWarningOpen, setResetWarningOpen] = useState(false);
  const toast = useToast();
  const { plan, planDispatch, resetAtlas, workflow, cycleId, scenarioId, activeUserId } =
    useAtlas();
  const dashboard = selectCommercialDashboard(plan.confirmedPlan, workflow, cycleId, scenarioId);

  if (!dashboard) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="How is the portfolio performing, and what should the Commercial Manager focus on now?"
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
  const firstName = getUser(activeUserId)?.name.split(' ')[0] ?? 'there';
  const dashboardCards: Array<{
    id: string;
    label: string;
    value: string;
    unit?: string;
    context: string;
    tone: 'critical' | 'success' | 'neutral';
    destination: string;
  }> = [
    {
      id: 'production',
      label: 'Production',
      value: '123.1k',
      context: '-7.1% vs plan',
      tone: 'critical' as const,
      destination: '/projects/prj_compressor',
    },
    {
      id: 'budget',
      label: 'Budget',
      value: '+3.7%',
      context: 'over plan',
      tone: 'critical' as const,
      destination: '/projects?tab=departments',
    },
    {
      id: 'cash',
      label: 'Cash runway',
      value: '9',
      unit: 'mo',
      context: 'min in book',
      tone: 'neutral' as const,
      destination: '/projects?tab=departments',
    },
    {
      id: 'hse',
      label: 'HSE (TRIR)',
      value: '0.40',
      context: 'under 0.80',
      tone: 'success' as const,
      destination: '/projects/prj_integrity',
    },
    {
      id: 'exposure',
      label: 'Exposure',
      value: '2',
      unit: 'high',
      context: '4 med · 6 low',
      tone: 'neutral' as const,
      destination: '/projects?tab=departments',
    },
  ];
  const displayPriorities = [
    {
      id: 'monthly-report',
      title: 'Approve Monthly Report',
      reference: 'July 2026',
      timing: 'Due today',
      urgent: true,
      destination: '/reviews?tab=reports',
    },
    {
      id: 'project-delay',
      title: 'Review OML 18 Delay',
      reference: 'Development project',
      timing: 'Due today',
      urgent: true,
      destination: '/projects/prj_compressor',
    },
    {
      id: 'finance-review',
      title: 'Meet Finance',
      reference: 'Cashflow & obligations',
      timing: '11:00',
      urgent: false,
      destination: '/projects?tab=departments',
    },
    {
      id: 'board-pack',
      title: 'Submit Board Pack',
      reference: 'July 2026',
      timing: '15:00',
      urgent: false,
      destination: '/reviews?tab=reports',
    },
  ];
  return (
    <>
      <header className="commercial-dashboard-hero">
        <div>
          <h1 className="sr-only">Dashboard</h1>
          <p>Portfolio overview</p>
          <h2>Good morning, {firstName}</h2>
          <div className="commercial-dashboard-hero__status" aria-label="Portfolio project status">
            <span>Projects 7</span>
            <span>
              <i className="status-dot status-dot--success" />3 on track
            </span>
            <span>
              <i className="status-dot status-dot--neutral" />2 delayed
            </span>
            <span>
              <i className="status-dot status-dot--critical" />2 critical
            </span>
          </div>
        </div>
        <div className="commercial-dashboard-hero__actions">
          <Button
            onClick={() => {
              planDispatch({ type: 'SET_STAGE', stage: 'review' });
              navigate('/plan?mode=review');
            }}
          >
            Update Plan
          </Button>
          <Button variant="secondary" onClick={() => setResetWarningOpen(true)}>
            Reset Atlas
          </Button>
        </div>
      </header>

      {dashboard.reportingCoverage.limited && (
        <div className="info-panel dashboard-coverage" role="status">
          <strong>Limited reporting data</strong>
          <span>
            No submissions are available for the selected reporting period. Project health and KPI
            cards use the latest validated reporting data available.
          </span>
        </div>
      )}

      <section aria-labelledby="current-performance-title">
        <h2 id="current-performance-title" className="sr-only">
          Current performance
        </h2>
        <div className="kpi-strip kpi-strip--5 dashboard-kpis">
          {dashboardCards.map((metric) => (
            <KpiCard
              key={metric.id}
              label={metric.label}
              value={metric.value}
              unit={metric.unit}
              context={metric.context}
              contextTone={metric.tone}
              onClick={() => navigate(metric.destination)}
            />
          ))}
        </div>
      </section>

      <div className="commercial-dashboard-focus">
        <div className="commercial-dashboard-health">
          <h2 className="sr-only">Portfolio Health</h2>
          <button className="portfolio-score-card" onClick={() => navigate('/projects')}>
            <span>Portfolio health</span>
            <span className="portfolio-score-ring">
              <strong>76</strong>
              <small>/100</small>
            </span>
            <b>Healthy</b>
            <small>↓ Dropped from 80% five weeks ago</small>
          </button>
        </div>

        <Panel
          title="Needs your attention"
          className="dashboard-attention-list"
          action={
            <span>
              {dashboard.attention.length} open ·{' '}
              {dashboard.attention.filter((item) => item.status === 'critical').length} critical
            </span>
          }
        >
          {dashboard.attention.length ? (
            <div>
              {dashboard.attention.slice(0, 6).map((item) => (
                <button key={item.id} onClick={() => navigate(item.destination)}>
                  <i
                    className={`status-dot status-dot--${item.status === 'critical' ? 'critical' : item.status === 'on_track' ? 'success' : 'neutral'}`}
                  />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.reason}</small>
                  </span>
                  <StatusBadge status={item.status} />
                  <ArrowRight aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <p className="empty-copy">No projects or submissions currently require attention.</p>
          )}
          <Button variant="tertiary" onClick={() => navigate('/projects')}>
            View all issues <ArrowRight aria-hidden="true" />
          </Button>
        </Panel>

        <Panel
          title="Today’s priorities"
          className="dashboard-priorities dashboard-priorities--compact"
        >
          <ol>
            {displayPriorities.map((priority) => (
              <li key={priority.id}>
                <button onClick={() => navigate(priority.destination)}>
                  <span>
                    <strong>{priority.title}</strong>
                    <small>{priority.reference}</small>
                  </span>
                  <span>
                    <b className={priority.urgent ? 'is-urgent' : ''}>{priority.timing}</b>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <Button variant="tertiary" onClick={() => navigate('/reviews')}>
            View all actions <ArrowRight aria-hidden="true" />
          </Button>
        </Panel>

        <Panel
          title="Plan Delivery Trend"
          className="dashboard-trend"
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
      </div>
      <Modal
        open={resetWarningOpen}
        title="Reset Atlas and start from scratch?"
        onClose={() => setResetWarningOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetWarningOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetAtlas();
                setResetWarningOpen(false);
                navigate('/plan', { replace: true });
                toast('Atlas reset. Upload an approved plan to begin.');
              }}
            >
              Reset and start over
            </Button>
          </>
        }
      >
        <p>
          This clears the confirmed plan and all local prototype data across Manager, Commercial
          Manager, CEO and CFO views. Atlas will return to the approved-plan upload step.
        </p>
      </Modal>
    </>
  );
}
