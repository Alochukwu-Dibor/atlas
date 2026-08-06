import { ArrowRight, Bell, Check, FileText } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  DataTable,
  DetailTabs,
  KpiCard,
  PageHeader,
  Panel,
  Select,
  StateView,
  StatusBadge,
  useToast,
} from '../components/Ui';
import { format, getCycle, getDepartment, getUser } from '../data/atlas';
import {
  commercialReportDescriptions,
  generateCommercialReport,
  selectCommercialReporting,
  type CommercialReportPreview,
  type CommercialReportType,
} from '../data/commercialReporting';
import { useAtlas } from '../state/AtlasContext';
import { selectVisibleSubmittedUpdates } from '../state/managerUpdates';

type ReportingTab = 'submissions' | 'reports';

const reportingTabs: readonly { id: ReportingTab; label: string }[] = [
  { id: 'submissions', label: 'Submissions' },
  { id: 'reports', label: 'Reports' },
];

const reportTypes: { id: CommercialReportType; label: string }[] = [
  { id: 'performance_report', label: 'Performance Report' },
  { id: 'executive_summary', label: 'Executive Summary' },
  { id: 'project_progress_report', label: 'Project Progress Report' },
];

function prototypeTime(sequence: number) {
  return `2026-08-06T15:${String(sequence % 60).padStart(2, '0')}:00+01:00`;
}

function SubmissionCompleteness({
  percentage,
  received,
  expected,
  period,
}: {
  percentage: number;
  received: number;
  expected: number;
  period: string;
}) {
  return (
    <Panel title="Overall submission completeness">
      <div className="submission-completeness">
        <div>
          <strong>{percentage}%</strong>
          <span>
            {received} of {expected} expected submissions received
          </span>
          <small>{period}</small>
        </div>
        <progress value={percentage} max={100} aria-label="Submission completeness" />
      </div>
    </Panel>
  );
}

function ReportPreview({ preview }: { preview: CommercialReportPreview }) {
  return (
    <div className="report-preview" aria-live="polite">
      <header>
        <div>
          <span>Generated report preview</span>
          <h2>{preview.title}</h2>
          <p>{preview.reportingPeriod}</p>
        </div>
        <small>
          Generated{' '}
          {new Intl.DateTimeFormat('en-GB', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(preview.generatedAt))}
        </small>
      </header>
      <p className="report-preview__headline">{preview.headline}</p>
      <div className="grid grid--4 report-preview__metrics">
        {preview.metrics.map((metric) => (
          <KpiCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            status={metric.status}
          />
        ))}
      </div>
      {preview.sections.map((section) => (
        <Panel title={section.title} key={section.title} className="section">
          {section.rows && section.columns && (
            <DataTable caption={section.title} headers={section.columns} rows={section.rows} />
          )}
          {section.items && (
            <ul className="report-preview__items">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </Panel>
      ))}
    </div>
  );
}

export default function CommercialReportingPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [searchParams] = useSearchParams();
  const { activeUserId, cycleId, plan, workflow, workflowDispatch, managerUpdates } = useAtlas();
  const requestedTab = searchParams.get('tab');
  const tab: ReportingTab = requestedTab === 'reports' ? 'reports' : 'submissions';
  const [reportType, setReportType] = useState<CommercialReportType>('performance_report');
  const [projectScope, setProjectScope] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<CommercialReportPreview | null>(null);
  const reporting = selectCommercialReporting(plan.confirmedPlan, workflow, cycleId);
  const submittedManagerUpdates = selectVisibleSubmittedUpdates(
    managerUpdates,
    'commercial_manager',
  );

  if (!plan.confirmedPlan || !reporting) {
    return (
      <>
        <PageHeader
          title="Reporting"
          description="What has been submitted, what needs review, and what report should be generated?"
        />
        <StateView
          type="empty"
          title="Confirm an approved plan to activate Reporting"
          message="Reporting completeness and generated reports require the confirmed tracking baseline."
          action={<Button onClick={() => navigate('/plan')}>Open Plan</Button>}
        />
      </>
    );
  }

  const navigateTab = (nextTab: ReportingTab) => navigate(`/reviews?tab=${nextTab}`);
  const generate = () => {
    setGenerating(true);
    setPreview(null);
    window.setTimeout(() => {
      setPreview(
        generateCommercialReport(
          reportType,
          plan.confirmedPlan,
          workflow,
          cycleId,
          prototypeTime(workflow.auditEvents.length + 1),
          projectScope,
        ),
      );
      setGenerating(false);
    }, 700);
  };

  return (
    <>
      <PageHeader
        title="Reporting"
        description="What has been submitted, what needs review, and what report should be generated?"
        controls={
          <Button variant="secondary" onClick={() => navigate('/reviews/weekly-update')}>
            Create my Weekly Update
          </Button>
        }
      />
      <DetailTabs
        label="Reporting workspace"
        value={tab}
        onChange={navigateTab}
        tabs={reportingTabs}
      />

      {tab === 'submissions' && (
        <div className="reporting-submissions">
          <div className="reporting-summary-grid">
            <SubmissionCompleteness
              percentage={reporting.completenessPercent}
              received={reporting.receivedCount}
              expected={reporting.totalExpected}
              period={reporting.cycle.label}
            />
            <Panel title="Pending-submissions summary">
              <div className="submission-status-summary">
                <div>
                  <span>Pending</span>
                  <strong>{reporting.pendingCount}</strong>
                </div>
                <div>
                  <span>Submitted or received</span>
                  <strong>{reporting.submittedCount}</strong>
                </div>
                <div>
                  <span>Awaiting review</span>
                  <strong>{reporting.awaitingReviewCount}</strong>
                </div>
              </div>
            </Panel>
          </div>

          <Panel title="Submitted Weekly Updates" className="section">
            {submittedManagerUpdates.length ? (
              <DataTable
                caption="Submitted Manager Weekly Updates"
                headers={['Manager', 'Department', 'Project', 'Reporting period', 'Submitted']}
                rows={submittedManagerUpdates.map((update) => [
                  getUser(update.creatorId)?.name ?? 'Manager',
                  getDepartment(update.departmentId)?.name ?? 'Department',
                  plan.confirmedPlan?.projects.find((project) => project.id === update.projectId)
                    ?.name ?? 'Project',
                  reporting.cycle.id === update.reportingPeriodId
                    ? reporting.cycle.label
                    : getCycle(update.reportingPeriodId).label,
                  update.submittedAt ? format.date(update.submittedAt) : 'Not submitted',
                ])}
                onRowClick={(index) =>
                  navigate(`/reviews/weekly-updates/${submittedManagerUpdates[index].id}`)
                }
              />
            ) : (
              <p className="empty-copy">No Manager Weekly Updates have been submitted.</p>
            )}
          </Panel>

          <Panel title="Needs Review" className="section">
            {reporting.needsReview.length ? (
              <DataTable
                caption="Submissions needing review"
                headers={[
                  'Submission / department',
                  'Related project',
                  'Submission date',
                  'Status',
                  'Action',
                ]}
                rows={reporting.needsReview.map((submission) => [
                  <span className="submission-identity">
                    <strong>{submission.department}</strong>
                    <small>{submission.title}</small>
                  </span>,
                  submission.project,
                  submission.submittedAt ? format.date(submission.submittedAt) : 'Not submitted',
                  <StatusBadge status={submission.status} />,
                  <Button
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/reviews/${submission.id}`);
                    }}
                  >
                    Review
                  </Button>,
                ])}
                onRowClick={(index) => navigate(`/reviews/${reporting.needsReview[index].id}`)}
              />
            ) : (
              <p className="empty-copy">No submitted updates currently require review.</p>
            )}
          </Panel>

          <Panel title="Follow Up Required" className="section">
            {reporting.followUp.length ? (
              <div className="follow-up-list">
                {reporting.followUp.map((item) => {
                  const sent = Boolean(item.reminderSentAt);
                  return (
                    <article key={item.id}>
                      <div>
                        <strong>{item.contributor}</strong>
                        <span>
                          {item.department} · {item.project}
                        </span>
                        <p>{item.context}</p>
                        <small>
                          Due {format.date(item.dueDate)} ·{' '}
                          {Date.parse(item.dueDate) < Date.parse('2026-08-06T15:00:00+01:00')
                            ? 'Overdue'
                            : 'Pending'}
                        </small>
                      </div>
                      <StatusBadge status={item.status} />
                      <Button
                        variant="secondary"
                        disabled={sent}
                        onClick={() => {
                          workflowDispatch({
                            type: 'SEND_REMINDER',
                            reminder: {
                              id: `reminder_${workflow.reminders.length + 1}`,
                              cycleId,
                              departmentId: item.departmentId,
                              projectId: item.projectId,
                              recipientId:
                                workflow.reports.find((report) => report.id === item.id)
                                  ?.managerId ?? null,
                              sentAt: prototypeTime(workflow.auditEvents.length + 1),
                              sentBy: activeUserId,
                            },
                          });
                          showToast(`Reminder sent to ${item.contributor}`);
                        }}
                      >
                        {sent ? <Check aria-hidden="true" /> : <Bell aria-hidden="true" />}
                        {sent ? 'Reminder sent' : 'Send reminder'}
                      </Button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="empty-copy">No contributors currently require follow-up.</p>
            )}
          </Panel>
        </div>
      )}

      {tab === 'reports' && (
        <div className="reporting-reports">
          <Panel title="Generate a report">
            <div className="report-type-grid" role="radiogroup" aria-label="Report type">
              {reportTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  role="radio"
                  aria-checked={reportType === type.id}
                  className={reportType === type.id ? 'is-active' : ''}
                  onClick={() => {
                    setReportType(type.id);
                    setPreview(null);
                  }}
                >
                  <FileText aria-hidden="true" />
                  <strong>{type.label}</strong>
                  <span>{commercialReportDescriptions[type.id]}</span>
                </button>
              ))}
            </div>
            {reportType === 'project_progress_report' && (
              <div className="report-scope">
                <Select
                  label="Project report scope"
                  value={projectScope}
                  onChange={setProjectScope}
                  options={[
                    { value: 'all', label: 'All confirmed projects' },
                    ...plan.confirmedPlan.projects.map((project) => ({
                      value: project.id,
                      label: project.name,
                    })),
                  ]}
                />
              </div>
            )}
            <div className="report-generation-action">
              <span>{reporting.cycle.label}</span>
              <Button disabled={generating} onClick={generate}>
                {generating ? 'Generating report…' : 'Generate report'}
                {!generating && <ArrowRight aria-hidden="true" />}
              </Button>
            </div>
          </Panel>

          {generating && (
            <StateView
              type="loading"
              title="Generating report preview"
              message="Atlas is combining the confirmed plan with current validated reporting data."
            />
          )}
          {preview && <ReportPreview preview={preview} />}
        </div>
      )}
    </>
  );
}
