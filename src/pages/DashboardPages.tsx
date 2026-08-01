import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import {
  AlertTriangle,
  Check,
  FileSpreadsheet,
  FileText,
  FormInput,
  Mail,
  Plus,
  Upload,
} from 'lucide-react';
import { ChartWrapper, Ring } from '../components/Charts';
import { ContextControls } from '../components/Shells';
import {
  Button,
  DataTable,
  DetailLink,
  Drawer,
  Field,
  KpiCard,
  Modal,
  PageHeader,
  Panel,
  StatusBadge,
  useToast,
} from '../components/Ui';
import {
  atlas,
  format,
  getCycle,
  getDepartment,
  getDepartmentReports,
  getProductionKpis,
  getReadiness,
  getUser,
} from '../data/atlas';
import { useAtlas } from '../state/AtlasContext';

export function DepartmentDashboard() {
  const navigate = useNavigate();
  const { activeUserId, cycleId } = useAtlas();
  const reports = getDepartmentReports(activeUserId);
  const cycle = getCycle(cycleId);
  const pending = reports.filter((report) =>
    ['submitted', 'resubmitted'].includes(report.status),
  ).length;
  const returned = reports.filter((report) => report.status === 'needs_clarification').length;
  return (
    <>
      <PageHeader
        title="Weekly reporting"
        description="Prepare, certify and track your department’s reporting position."
      />
      <div className="grid grid--3">
        <KpiCard
          label="Submissions due"
          value={reports.some((report) => report.cycleId === cycle.id) ? '1' : '0'}
          status="due_soon"
          context={cycle.label}
        />
        <KpiCard
          label="Pending Commercial review"
          value={String(pending)}
          status={pending ? 'submitted' : 'approved'}
          context={pending ? 'Awaiting review' : 'No reports waiting'}
        />
        <KpiCard
          label="Returned submissions"
          value={String(returned)}
          status={returned ? 'needs_clarification' : 'approved'}
          context={returned ? 'Response due 3 Aug 2026' : 'No action required'}
        />
      </div>
      <Panel title="Submission history" className="section">
        <DataTable
          caption="Department submission history"
          headers={['Project · Period', 'Method', 'Status', 'Submitted']}
          rows={reports.map((report) => [
            <div>
              <strong>{report.title}</strong>
              <small>OML 30 · {getCycle(report.cycleId).label}</small>
            </div>,
            report.methods.map((method) => method.replaceAll('_', ' ')).join(' · '),
            <StatusBadge status={report.status} />,
            report.submittedAt ? format.date(report.submittedAt) : '—',
          ])}
          onRowClick={(index) => navigate(`/department/reports/${reports[index].id}`)}
        />
      </Panel>
    </>
  );
}

const methods = [
  {
    id: 'structured_form',
    label: 'Atlas Structured Form',
    detail: 'Guided departmental fields and validations',
    icon: FormInput,
  },
  { id: 'document_upload', label: 'Document Upload', detail: 'PDF or DOCX', icon: Upload },
  {
    id: 'xlsx_upload',
    label: 'XLSX Upload',
    detail: 'Atlas template or existing workbook',
    icon: FileSpreadsheet,
  },
  {
    id: 'paste_email_or_transcript',
    label: 'Paste Email or Call Transcript',
    detail: 'Choose source type in Content',
    icon: Mail,
  },
] as const;

export function CreateReportPage() {
  const { activeUserId, cycleId, setCycleId } = useAtlas();
  const user = getUser(activeUserId)!;
  const department = getDepartment(user.departmentId)!;
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState(`${department.name} Weekly Report · 27 Jul–2 Aug 2026`);
  const [sourceType, setSourceType] = useState('email');
  const [certified, setCertified] = useState(false);
  const showToast = useToast();
  const toggleMethod = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  return (
    <>
      <PageHeader
        title="Create weekly report"
        description="Add one or several source types, then review Atlas’ deterministic standardisation."
      />
      <ol className="steps" aria-label="Report creation progress">
        <li className={step === 1 ? 'is-active' : 'is-complete'}>
          <span>{step === 1 ? '1' : <Check />}</span>Details & Method
        </li>
        <li className={step === 2 ? 'is-active' : ''}>
          <span>2</span>Content
        </li>
      </ol>
      {step === 1 ? (
        <>
          <Panel title="Common details" className="section">
            <div className="form-grid">
              <Field label="Project / Asset">
                <select defaultValue="asset_oml30">
                  <option value="asset_oml30">OML 30 — All Fields and Projects</option>
                </select>
              </Field>
              <Field label="Department">
                <input value={department.name} disabled aria-label="Department" />
              </Field>
              <Field label="Reporting period">
                <select value={cycleId} onChange={(event) => setCycleId(event.target.value)}>
                  {atlas.reportingCycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Submission title">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-label="Submission title"
                />
              </Field>
            </div>
            <div className="info-panel">
              <strong>Locked baseline</strong>
              <span>
                Gross oil production plan: {format.number(atlas.production.kpis.grossOilPlanBopd)}{' '}
                bopd. Baseline changes require a Commercial Manager request.
              </span>
            </div>
          </Panel>
          <section className="section" aria-labelledby="method-title">
            <div className="section-heading">
              <div>
                <h2 id="method-title">Choose submission methods</h2>
                <p>Select one or more methods. You can add several sources later.</p>
              </div>
            </div>
            <div className="method-grid">
              {methods.map(({ id, label, detail, icon: Icon }) => (
                <button
                  key={id}
                  className={`method-card ${selected.includes(id) ? 'is-selected' : ''}`}
                  aria-pressed={selected.includes(id)}
                  onClick={() => toggleMethod(id)}
                >
                  <span className="method-card__icon">
                    <Icon />
                  </span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                  {selected.includes(id) && <Check className="method-card__check" />}
                </button>
              ))}
            </div>
            <div className="form-actions">
              <Button variant="secondary" onClick={() => history.back()}>
                Cancel
              </Button>
              <Button disabled={!title || selected.length === 0} onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="content-split section">
            <Panel title="Original sources">
              <div className="source-list">
                {selected.map((id) => {
                  const method = methods.find((item) => item.id === id)!;
                  return (
                    <article className="source-item" key={id}>
                      <method.icon />
                      <div>
                        <strong>{method.label}</strong>
                        <small>Fixture ready for deterministic processing</small>
                      </div>
                      <StatusBadge status="extracted" />
                    </article>
                  );
                })}
              </div>
              {selected.includes('paste_email_or_transcript') && (
                <Field label="Source type">
                  <select
                    value={sourceType}
                    onChange={(event) => setSourceType(event.target.value)}
                  >
                    <option value="email">Email</option>
                    <option value="call_transcript">Call Transcript</option>
                  </select>
                </Field>
              )}
              <Button variant="secondary">
                <Plus />
                Add another source
              </Button>
            </Panel>
            <Panel title="Atlas standardised departmental report">
              <div className="warning-list">
                <span>
                  <AlertTriangle />1 material variance requires confirmation
                </span>
                <span>
                  <AlertTriangle />1 source value has medium confidence
                </span>
              </div>
              <dl className="metric-review">
                <div>
                  <dt>Gross oil production</dt>
                  <dd>{format.number(atlas.production.kpis.grossOilActualBopd)} bopd</dd>
                  <small>Daily Production!H20:H26 · 99% confidence</small>
                </div>
                <div>
                  <dt>Plan variance</dt>
                  <dd>{format.percent(atlas.production.kpis.grossOilVariancePercent)}</dd>
                  <small>Calculated against locked baseline</small>
                </div>
                <div>
                  <dt>Primary constraint</dt>
                  <dd>{atlas.production.kpis.primaryConstraint}</dd>
                  <small>Email body, paragraph 2 · 96% confidence</small>
                </div>
              </dl>
            </Panel>
          </div>
          <Panel className="section certification">
            <label>
              <input
                type="checkbox"
                checked={certified}
                onChange={(event) => setCertified(event.target.checked)}
              />
              I confirm that I have reviewed the extracted information and that this report
              accurately represents the department’s position for the reporting period.
            </label>
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                disabled={!certified}
                onClick={() => showToast('Report submitted to Commercial review')}
              >
                Submit Report
              </Button>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}

export function DepartmentReportReview() {
  const { id } = useParams();
  const report =
    atlas.departmentReports.find((item) => item.id === id) ?? atlas.departmentReports[0];
  return (
    <>
      <PageHeader
        title={report.title}
        description="Sources, reviewer comments, evidence and audit history."
      />
      <Panel title="Report status">
        <StatusBadge status={report.status} />
        <p>
          This Phase 1 route establishes the approved reporting review hierarchy. Detailed
          correction and resubmission workflows remain for Phase 2.
        </p>
      </Panel>
    </>
  );
}

export function CommercialDashboard() {
  const [detail, setDetail] = useState<string | null>(null);
  const readiness = getReadiness();
  const production = getProductionKpis();
  return (
    <>
      <PageHeader
        title="Commercial overview"
        description="Resolve reporting exceptions and prepare the next decision-ready executive update."
        controls={<ContextControls />}
      />
      <div className="commercial-top">
        <Panel title="Reporting readiness">
          <Ring value={readiness.reportingReadinessPercent} label="Reporting ready" />
          <p>
            {readiness.approvedReports} of {readiness.requiredReports} departmental reports approved
          </p>
        </Panel>
        <Panel title="Overall project status">
          <div className="metric-large">
            <StatusBadge status={atlas.executiveSummary.overallStatus} />
            <strong>2 on track</strong>
            <span>1 at risk · 1 delayed</span>
          </div>
          <DetailLink onClick={() => setDetail('Project status')}>Project breakdown</DetailLink>
        </Panel>
        <Panel title="Production performance">
          <div className="metric-large">
            <strong>
              {format.number(production.actual)} <small>bopd</small>
            </strong>
            <span>{format.percent(production.variancePercent)} vs plan</span>
            <StatusBadge status={production.status} />
          </div>
          <DetailLink onClick={() => setDetail('Production performance')} />
        </Panel>
        <Panel title="Cashflow and financing position">
          <div className="metric-large">
            <strong>{format.usd(atlas.finance.kpis.availableLiquidityUsd)}</strong>
            <span>{atlas.finance.kpis.runwayMonths} months runway</span>
            <StatusBadge status={atlas.finance.kpis.status} />
          </div>
          <DetailLink onClick={() => setDetail('Cashflow and financing')} />
        </Panel>
      </div>
      <div className="commercial-lower section">
        <div className="commercial-lower__stack">
          <Panel title="Legal issues and regulatory exposure">
            <strong className="panel-value">
              {format.usd(atlas.legalRegulatory.kpis.estimatedExposureUsd)}
            </strong>
            <p>{atlas.legalRegulatory.kpis.criticalRisks} critical risks · deadline 5 Aug</p>
            <StatusBadge status="at_risk" />
          </Panel>
          <Panel title="HSE performance">
            <strong className="panel-value">TRIR {atlas.hse.kpis.trir}</strong>
            <p>
              {atlas.hse.kpis.highPotentialIncidents} high-potential incident ·{' '}
              {atlas.hse.compliance.overdueFindings} overdue actions
            </p>
            <StatusBadge status="at_risk" />
          </Panel>
        </div>
        <Panel title="Attention required" className="attention-card">
          <div className="action-list">
            {atlas.commercialDashboard.attentionItems.map((item) => (
              <button key={item.id} onClick={() => setDetail(item.title)}>
                <span>
                  <StatusBadge status={item.severity} />
                  <strong>{item.title}</strong>
                </span>
                <small>{item.status.replaceAll('_', ' ')}</small>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Today’s priorities">
          <div className="action-list">
            {atlas.commercialDashboard.priorities.map((item) => (
              <button key={item.id} onClick={() => setDetail(item.title)}>
                <span>
                  <StatusBadge status={item.status} />
                  <strong>{item.title}</strong>
                </span>
                <small>Due {format.date(item.dueDate)}</small>
              </button>
            ))}
          </div>
        </Panel>
      </div>
      <Drawer title={detail ?? ''} open={Boolean(detail)} onClose={() => setDetail(null)}>
        <p>
          Review the standardised value, source evidence, comments and audit history in context.
        </p>
        <div className="info-panel">
          <strong>Synthetic evidence</strong>
          <span>
            This prototype uses deterministic fixture data and does not connect to live operating
            systems.
          </span>
        </div>
        <Button onClick={() => setDetail(null)}>Close review</Button>
      </Drawer>
    </>
  );
}

export function CommercialReviewPage() {
  const { id } = useParams();
  const report =
    atlas.departmentReports.find((item) => item.id === id) ?? atlas.departmentReports[1];
  const [modal, setModal] = useState<'clarify' | 'override' | null>(null);
  const [reason, setReason] = useState('');
  const showToast = useToast();
  return (
    <>
      <PageHeader
        title="Submission review"
        description={`${report.title} · ${report.sourceIds.length} sources`}
        controls={<StatusBadge status={report.status} />}
      />
      <div className="review-layout">
        <Panel title="Standardised report">
          <dl className="metric-review">
            <div>
              <dt>Available liquidity</dt>
              <dd>{format.usd(atlas.finance.kpis.availableLiquidityUsd)}</dd>
              <small>Liquidity Summary!B14 · 99% confidence</small>
            </div>
            <div>
              <dt>Unrestricted cash</dt>
              <dd>{format.usd(atlas.finance.kpis.unrestrictedCashUsd)}</dd>
              <small>Final bank confirmation missing</small>
            </div>
            <div>
              <dt>Next financing repayment</dt>
              <dd>
                {format.usd(atlas.finance.kpis.nextRepaymentUsd)} ·{' '}
                {format.date(atlas.finance.kpis.nextRepaymentDate)}
              </dd>
              <small>Debt Schedule!F9:G9</small>
            </div>
          </dl>
        </Panel>
        <Panel title="Evidence and audit">
          <div className="warning-list">
            <span>
              <AlertTriangle />
              Bank confirmation missing
            </span>
          </div>
          {atlas.sources
            .filter((source) => source.reportId === report.id)
            .map((source) => (
              <article className="source-item" key={source.id}>
                <FileText />
                <div>
                  <strong>{source.name}</strong>
                  <small>{source.type.replaceAll('_', ' ')}</small>
                </div>
                <StatusBadge status={source.status} />
              </article>
            ))}
        </Panel>
      </div>
      <div className="review-actions section">
        <Button variant="secondary" onClick={() => setModal('clarify')}>
          Request clarification
        </Button>
        <Button variant="secondary" onClick={() => setModal('override')}>
          Controlled override
        </Button>
        <Button onClick={() => showToast('Report approved; readiness recalculated')}>
          Approve report
        </Button>
      </div>
      <Modal
        title={modal === 'override' ? 'Apply controlled override' : 'Request clarification'}
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={!reason.trim()}
              onClick={() => {
                showToast(
                  modal === 'override'
                    ? 'Override recorded with audit event'
                    : 'Clarification request sent',
                );
                setModal(null);
                setReason('');
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <Field label={modal === 'override' ? 'Mandatory reason' : 'Field-level question'}>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} />
        </Field>
      </Modal>
    </>
  );
}

export function ExecutiveDashboard() {
  const [decision, setDecision] = useState<string | null>(null);
  const [owner, setOwner] = useState('usr_operations');
  const [dueDate, setDueDate] = useState('2026-08-04');
  const showToast = useToast();
  const productionRows = atlas.production.monthlyTrend.map((point) => [
    point.month,
    format.number(point.actualBopd),
    format.number(point.planBopd),
    format.number(point.previousYearBopd),
  ]);
  const cashRows = atlas.finance.cashPositionForecast.map((point) => [
    point.month,
    point.actualUsd ? format.usd(point.actualUsd) : '—',
    point.baseForecastUsd ? format.usd(point.baseForecastUsd) : '—',
    point.downsideForecastUsd ? format.usd(point.downsideForecastUsd) : '—',
  ]);
  return (
    <>
      <PageHeader
        title="Executive Overview"
        description={atlas.executiveSummary.headline}
        controls={
          <>
            <ContextControls allowOpenCycle={false} />
            <Button onClick={() => window.print()}>Export Report</Button>
          </>
        }
      />
      <div className="executive-top">
        <Panel title="Overall project status">
          <StatusBadge status={atlas.executiveSummary.overallStatus} />
          <strong className="panel-value">At risk</strong>
          <p>Moved from on track · 2 on track · 1 at risk · 1 delayed</p>
          <DetailLink>Project breakdown</DetailLink>
        </Panel>
        <Panel title="HSE performance">
          <div className="mini-metrics">
            <span>
              <strong>0</strong>Fatalities
            </span>
            <span>
              <strong>0</strong>LTIs
            </span>
            <span>
              <strong>0.17</strong>TRIR
            </span>
            <span>
              <strong>1</strong>High-potential incident
            </span>
            <span>
              <strong>2</strong>Overdue actions
            </span>
          </div>
          <StatusBadge status="adverse" />
        </Panel>
        <Panel title="Legal issues and exposure">
          <strong className="panel-value">
            {format.usd(atlas.executiveSummary.legal.estimatedExposureUsd)}
          </strong>
          <p>2 high issues · 1 affecting delivery</p>
          <p>Nearest deadline {format.date(atlas.executiveSummary.legal.nearestDeadline)}</p>
        </Panel>
      </div>
      <div className="executive-performance section">
        <Panel title="Production performance">
          <div className="chart-card-layout">
            <div className="chart-summary">
              <strong>{format.number(atlas.production.kpis.grossOilActualBopd)}</strong>
              <span>bopd gross production</span>
              <StatusBadge status="at_risk" />
              <small>{format.percent(atlas.production.kpis.grossOilVariancePercent)} vs plan</small>
            </div>
            <ChartWrapper
              title="Monthly production performance"
              summary="Actual production fell below plan to 96,800 bopd in July."
              tableHeaders={['Month', 'Actual', 'Plan', 'Previous period']}
              tableRows={productionRows}
            >
              <LineChart
                data={atlas.production.monthlyTrend}
                margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid stroke="#EAECF0" vertical={false} />
                <XAxis dataKey="month" tickFormatter={(value) => value.slice(5)} />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
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
                <Line
                  dataKey="previousYearBopd"
                  name="Previous period"
                  stroke="#1570EF"
                  opacity={0.65}
                  dot={false}
                />
              </LineChart>
            </ChartWrapper>
          </div>
        </Panel>
        <Panel title="Cashflow and financing position">
          <div className="chart-card-layout">
            <div className="chart-summary">
              <strong>{format.usd(atlas.finance.kpis.availableLiquidityUsd)}</strong>
              <span>available liquidity</span>
              <StatusBadge status="at_risk" />
              <small>{atlas.finance.kpis.runwayMonths} months runway</small>
            </div>
            <ChartWrapper
              title="Cash position forecast"
              summary="Liquidity declines through December, with a 15 million dollar repayment in September."
              tableHeaders={['Month', 'Actual', 'Base', 'Downside']}
              tableRows={cashRows}
            >
              <AreaChart
                data={atlas.finance.cashPositionForecast}
                margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid stroke="#EAECF0" vertical={false} />
                <XAxis dataKey="month" tickFormatter={(value) => value.slice(5)} />
                <YAxis tickFormatter={(value) => `$${value / 1_000_000}m`} />
                <Tooltip formatter={(value) => format.usd(Number(value))} />
                <Legend />
                <ReferenceLine
                  x="2026-07"
                  stroke="#98A2B3"
                  strokeDasharray="3 3"
                  label="Forecast"
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
                  name="Downside"
                  stroke="#D92D20"
                  strokeDasharray="2 4"
                  dot={false}
                />
                <ReferenceLine x="2026-09" stroke="#D92D20" label="Repayment" />
              </AreaChart>
            </ChartWrapper>
          </div>
        </Panel>
      </div>
      <Panel title="Recommendations and decisions" className="section recommendations">
        <div>
          {atlas.recommendations.map((item) => (
            <article className="recommendation" key={item.id}>
              <StatusBadge status={item.priority} />
              <div>
                <h3>{item.title}</h3>
                <p>{item.explanation}</p>
                <small>{item.impact}</small>
              </div>
              <Button variant="secondary" onClick={() => setDecision(item.id)}>
                Review action
              </Button>
            </article>
          ))}
        </div>
      </Panel>
      <Modal
        title="Record executive decision"
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button
              disabled={!owner || !dueDate}
              onClick={() => {
                showToast('Executive decision recorded and assigned');
                setDecision(null);
              }}
            >
              Record decision
            </Button>
          </>
        }
      >
        <Field label="Decision action">
          <select defaultValue="assign_action">
            <option value="approve">Approve</option>
            <option value="defer">Defer</option>
            <option value="request_information">Request more information</option>
            <option value="assign_action">Assign an action</option>
            <option value="record_decision">Record a decision</option>
          </select>
        </Field>
        <Field label="Owner">
          <select value={owner} onChange={(event) => setOwner(event.target.value)}>
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
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </Field>
      </Modal>
    </>
  );
}
