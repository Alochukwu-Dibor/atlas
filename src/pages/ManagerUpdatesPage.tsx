import { BarChart3, FileCheck2, FileUp, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartWrapper } from '../components/Charts';
import {
  Button,
  DataTable,
  Field,
  Modal,
  PageHeader,
  Panel,
  StateView,
  StatusBadge,
  useToast,
} from '../components/Ui';
import { atlas, format, getCycle, getDepartment, getUser } from '../data/atlas';
import { useAtlas } from '../state/AtlasContext';
import {
  extractChartValues,
  selectAssignedProjectIds,
  selectManagerUpdates,
  type GeneratedChart,
  type ManagerAttachment,
  type ManagerChartType,
  type ManagerUpdateSections,
  type ManagerWeeklyUpdate,
} from '../state/managerUpdates';

const emptySections: ManagerUpdateSections = {
  highlights: '',
  ongoingActivities: '',
  risks: '',
  plansForWeek: '',
};

const sectionDefinitions: {
  key: keyof ManagerUpdateSections;
  title: string;
  instruction: string;
}[] = [
  {
    key: 'highlights',
    title: 'Highlights from the Previous Week',
    instruction: 'Summarise material delivery, outcomes and measurable movement from last week.',
  },
  {
    key: 'ongoingActivities',
    title: 'Ongoing Activities',
    instruction: 'Describe active work, current progress and the next meaningful milestone.',
  },
  {
    key: 'risks',
    title: 'Risks',
    instruction: 'Record material constraints, potential impact and any support required.',
  },
  {
    key: 'plansForWeek',
    title: 'Plans for the Week',
    instruction: 'State the specific delivery priorities and expected outcomes for this week.',
  },
];

function prototypeTime(sequence: number) {
  return `2026-08-06T16:${String(sequence % 60).padStart(2, '0')}:00+01:00`;
}

function fileSize(bytes: number) {
  return bytes < 1_000_000
    ? `${Math.max(1, Math.round(bytes / 1_000))} KB`
    : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function ChartPreview({ chart }: { chart: GeneratedChart }) {
  return (
    <ChartWrapper
      title={chart.title}
      summary={`Deterministic preview created from ${chart.values.length} numeric values in Highlights.`}
      tableHeaders={['Extracted value', 'Value']}
      tableRows={chart.values.map((value) => [value.label, String(value.value)])}
    >
      {chart.type === 'bar' ? (
        <BarChart data={chart.values} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="value" name="Extracted value" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={chart.values} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            name="Extracted value"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 4 }}
          />
        </LineChart>
      )}
    </ChartWrapper>
  );
}

export function ManagerWeeklyUpdatesPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const { activeUserId, departmentId, managerUpdates, managerUpdatesDispatch, plan, role } =
    useAtlas();
  const isCommercial = role === 'commercial_manager';
  const submissionsPath = isCommercial ? '/reviews' : '/manager/submissions';
  const detailPath = (id: string) =>
    isCommercial ? `/reviews/weekly-updates/${id}` : `/manager/submissions/${id}`;
  const assignedIds = selectAssignedProjectIds(activeUserId);
  const projects = (plan.confirmedPlan?.projects ?? atlas.projects).filter((project) =>
    assignedIds.includes(project.id),
  );
  const requestedUpdate = managerUpdates.updates.find(
    (update) => update.id === searchParams.get('update'),
  );
  const [periodId, setPeriodId] = useState(
    requestedUpdate?.reportingPeriodId ?? atlas.demoStates.defaultOpenCycleId,
  );
  const [projectId, setProjectId] = useState(requestedUpdate?.projectId ?? projects[0]?.id ?? '');
  const [sections, setSections] = useState<ManagerUpdateSections>(
    requestedUpdate?.sections ?? emptySections,
  );
  const [attachments, setAttachments] = useState<ManagerAttachment[]>(
    requestedUpdate?.attachments ?? [],
  );
  const [chart, setChart] = useState<GeneratedChart | null>(requestedUpdate?.chart ?? null);
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [chartType, setChartType] = useState<ManagerChartType>(
    requestedUpdate?.chart?.type ?? 'bar',
  );
  const [pendingChart, setPendingChart] = useState<GeneratedChart | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const period = atlas.reportingCycles.find((cycle) => cycle.id === periodId);
  const existing = managerUpdates.updates.find(
    (update) =>
      update.creatorId === activeUserId &&
      update.projectId === projectId &&
      update.reportingPeriodId === periodId,
  );
  const closed = period?.status !== 'open';
  const chartValues = extractChartValues(sections.highlights);

  const loadContext = (nextPeriodId: string, nextProjectId: string) => {
    const saved = managerUpdates.updates.find(
      (update) =>
        update.creatorId === activeUserId &&
        update.projectId === nextProjectId &&
        update.reportingPeriodId === nextPeriodId,
    );
    setSections(saved?.sections ?? emptySections);
    setAttachments(saved?.attachments ?? []);
    setChart(saved?.chart ?? null);
    setErrors({});
  };

  const buildUpdate = (status: 'draft' | 'submitted') => {
    if (!period || !projectId) return null;
    const now = prototypeTime(managerUpdates.updates.length + 1);
    return {
      id: existing?.id ?? `manager_update_${activeUserId}_${projectId}_${periodId}`,
      creatorId: activeUserId,
      departmentId,
      projectId,
      reportingPeriodId: periodId,
      reportingDeadline: period.dueDate,
      sections,
      chart,
      attachments: attachments.filter((attachment) => attachment.status === 'uploaded'),
      status,
      savedAt: now,
      submittedAt: status === 'submitted' ? now : null,
      visibleToRoles: status === 'submitted' ? (['commercial_manager', 'ceo', 'cfo'] as const) : [],
    } satisfies ManagerWeeklyUpdate;
  };

  const saveDraft = () => {
    if (!periodId || !projectId) {
      setErrors({ context: 'Select a reporting period and assigned project.' });
      return;
    }
    const update = buildUpdate('draft');
    if (!update) return;
    managerUpdatesDispatch({ type: 'UPSERT_UPDATE', update });
    setErrors({});
    showToast('Weekly Update saved as a draft.');
  };

  const submit = () => {
    const nextErrors = Object.fromEntries(
      sectionDefinitions
        .filter((section) => !sections[section.key].trim())
        .map((section) => [section.key, `${section.title} is required.`]),
    );
    if (!periodId || !projectId) nextErrors.context = 'Select a reporting period and project.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const update = buildUpdate('submitted');
    if (!update) return;
    managerUpdatesDispatch({ type: 'UPSERT_UPDATE', update });
    setErrors({});
    setSubmittedId(update.id);
  };

  if (submittedId) {
    return (
      <StateView
        type="locked"
        title="Weekly Update submitted"
        message="The submitted update is now visible to authorised Commercial Managers, the CEO and the CFO."
        action={
          <div className="form-actions">
            <Button onClick={() => navigate(detailPath(submittedId))}>View Submission</Button>
            <Button variant="secondary" onClick={() => navigate(submissionsPath)}>
              Return to Submissions
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="manager-update-page">
      <PageHeader
        title="Weekly Updates"
        description="Prepare a structured update for an assigned Shoreline project."
      />
      <Panel title="Update context" className="manager-update-context">
        <div className="form-grid">
          <Field label="Reporting period" error={errors.context}>
            <select
              aria-label="Reporting period"
              value={periodId}
              onChange={(event) => {
                setPeriodId(event.target.value);
                loadContext(event.target.value, projectId);
              }}
            >
              {atlas.reportingCycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assigned project" error={errors.context}>
            <select
              aria-label="Assigned project"
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                loadContext(periodId, event.target.value);
              }}
              disabled={!projects.length}
            >
              {!projects.length && <option value="">No assigned projects</option>}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {period && (
          <div className="manager-period-status" role="status">
            <span>
              Reporting deadline <strong>{format.date(period.dueDate)}</strong>
            </span>
            <StatusBadge status={period.status} />
          </div>
        )}
      </Panel>

      {!projects.length ? (
        <StateView
          type="empty"
          title="No assigned projects"
          message="This Manager does not currently have an assigned project for Weekly Updates."
        />
      ) : closed ? (
        <StateView
          type="empty"
          title="Reporting period closed"
          message="New updates cannot be created for a closed reporting period. Select an open period to continue."
        />
      ) : existing?.status === 'submitted' ? (
        <StateView
          type="locked"
          title="Update already submitted"
          message="A submitted update already exists for this project and reporting period."
          action={
            <Button onClick={() => navigate(detailPath(existing.id))}>View Submission</Button>
          }
        />
      ) : (
        <>
          {existing?.status === 'draft' && (
            <div className="info-panel section" role="status">
              <strong>Draft reopened</strong>
              <span>
                Your existing draft for this project and reporting period is ready to edit.
              </span>
            </div>
          )}
          <div className="manager-update-sections section">
            {sectionDefinitions.map((section) => (
              <Panel title={section.title} key={section.key}>
                <p className="panel-intro">{section.instruction}</p>
                <Field label={section.title} error={errors[section.key]}>
                  <textarea
                    aria-label={section.title}
                    rows={5}
                    value={sections[section.key]}
                    onChange={(event) =>
                      setSections((current) => ({
                        ...current,
                        [section.key]: event.target.value,
                      }))
                    }
                  />
                </Field>
                {section.key === 'highlights' && (
                  <div className="form-actions">
                    <Button
                      variant="secondary"
                      disabled={chartValues.length === 0}
                      onClick={() => {
                        setPendingChart(null);
                        setChartType(chart?.type ?? 'bar');
                        setChartModalOpen(true);
                      }}
                    >
                      <BarChart3 aria-hidden="true" />
                      {chart ? 'Regenerate Chart' : 'Generate Chart'}
                    </Button>
                    {chart && (
                      <Button variant="tertiary" onClick={() => setChart(null)}>
                        Remove Chart
                      </Button>
                    )}
                  </div>
                )}
                {section.key === 'highlights' && chart && <ChartPreview chart={chart} />}
              </Panel>
            ))}
          </div>

          <Panel title="Supporting Documents" className="section manager-attachments">
            <p>Optionally attach supporting PDF, DOCX, XLSX, PNG or JPG files up to 10 MB.</p>
            <input
              ref={fileInput}
              className="sr-only"
              type="file"
              multiple
              aria-label="Supporting documents"
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? []);
                setAttachments((current) => [
                  ...current,
                  ...selected.map((file, index) => {
                    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
                    const validType = ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg'].includes(
                      extension,
                    );
                    const validSize = file.size <= 10_000_000;
                    return {
                      id: `attachment_${current.length + index + 1}_${file.name}`,
                      name: file.name,
                      type: file.type || extension.toUpperCase(),
                      size: file.size,
                      status: validType && validSize ? 'uploaded' : 'error',
                      error: !validType
                        ? 'Unsupported file type.'
                        : !validSize
                          ? 'File exceeds the 10 MB limit.'
                          : undefined,
                    } satisfies ManagerAttachment;
                  }),
                ]);
                event.target.value = '';
              }}
            />
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>
              <FileUp aria-hidden="true" /> Attach documents
            </Button>
            {attachments.length > 0 && (
              <ul className="manager-attachment-list">
                {attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <FileCheck2 aria-hidden="true" />
                    <span>
                      <strong>{attachment.name}</strong>
                      <small>
                        {attachment.type || 'File'} · {fileSize(attachment.size)}
                      </small>
                      {attachment.error && <em>{attachment.error}</em>}
                    </span>
                    <StatusBadge status={attachment.status} />
                    <Button
                      variant="tertiary"
                      onClick={() =>
                        setAttachments((current) =>
                          current.filter((item) => item.id !== attachment.id),
                        )
                      }
                    >
                      <Trash2 aria-hidden="true" /> Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="form-actions form-actions--end manager-update-actions">
            <Button variant="secondary" onClick={saveDraft}>
              Save as Draft
            </Button>
            <Button onClick={submit}>Submit Update</Button>
          </div>
          {managerUpdates.lastError && <p className="field__error">{managerUpdates.lastError}</p>}
        </>
      )}

      <Modal
        open={chartModalOpen}
        title="Generate chart from Highlights"
        onClose={() => setChartModalOpen(false)}
        footer={
          pendingChart ? (
            <>
              <Button
                variant="tertiary"
                onClick={() => {
                  setPendingChart(null);
                  setChartModalOpen(false);
                }}
              >
                Remove
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  setPendingChart({
                    ...pendingChart,
                    id: `${pendingChart.id}_regenerated`,
                    generatedAt: prototypeTime(managerUpdates.updates.length + 2),
                  })
                }
              >
                Regenerate
              </Button>
              <Button
                onClick={() => {
                  setChart(pendingChart);
                  setChartModalOpen(false);
                }}
              >
                Keep Chart
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setChartModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  setPendingChart({
                    id: `chart_${activeUserId}_${projectId}_${periodId}`,
                    type: chartType,
                    title: 'Highlights chart',
                    values: chartValues,
                    generatedAt: prototypeTime(managerUpdates.updates.length + 1),
                  })
                }
              >
                Generate Preview
              </Button>
            </>
          )
        }
      >
        <Field label="Chart type">
          <select
            aria-label="Chart type"
            value={chartType}
            onChange={(event) => setChartType(event.target.value as ManagerChartType)}
            disabled={Boolean(pendingChart)}
          >
            <option value="bar">Bar chart</option>
            <option value="line">Line chart</option>
          </select>
        </Field>
        {!pendingChart ? (
          <p>Atlas found {chartValues.length} numeric values in Highlights for this preview.</p>
        ) : (
          <ChartPreview chart={pendingChart} />
        )}
      </Modal>
    </div>
  );
}

export function ManagerSubmissionsPage() {
  const navigate = useNavigate();
  const { activeUserId, managerUpdates } = useAtlas();
  const updates = selectManagerUpdates(managerUpdates, activeUserId);
  return (
    <>
      <PageHeader
        title="Submissions"
        description="Reopen drafts and view Weekly Updates you have submitted."
        controls={
          <Button onClick={() => navigate('/manager/weekly-updates')}>New Weekly Update</Button>
        }
      />
      {updates.length ? (
        <Panel title="My Weekly Updates">
          <DataTable
            caption="Manager Weekly Update submissions"
            headers={['Reporting period', 'Project', 'Saved', 'Status', 'Action']}
            rows={updates.map((update) => [
              getCycle(update.reportingPeriodId).label,
              atlas.projects.find((project) => project.id === update.projectId)?.name ?? 'Project',
              format.date(update.submittedAt ?? update.savedAt),
              <StatusBadge status={update.status} />,
              update.status === 'draft' ? 'Continue editing' : 'View submission',
            ])}
            onRowClick={(index) => navigate(`/manager/submissions/${updates[index].id}`)}
          />
        </Panel>
      ) : (
        <StateView
          type="empty"
          title="No Weekly Updates yet"
          message="Create an update for an assigned project and reporting period."
          action={
            <Button onClick={() => navigate('/manager/weekly-updates')}>Create Update</Button>
          }
        />
      )}
    </>
  );
}

export function ManagerSubmissionDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { activeUserId, role, managerUpdates } = useAtlas();
  const backPath =
    role === 'commercial_manager'
      ? '/reviews'
      : role === 'ceo' || role === 'cfo'
        ? '/executive'
        : '/manager/submissions';
  const backLabel =
    role === 'commercial_manager'
      ? 'Back to Reporting'
      : role === 'ceo' || role === 'cfo'
        ? 'Back to Executive view'
        : 'Back to Submissions';
  const update = managerUpdates.updates.find((item) => item.id === id);
  const canView =
    update &&
    (update.creatorId === activeUserId ||
      (update.status === 'submitted' &&
        ['commercial_manager', 'ceo', 'cfo'].includes(role) &&
        update.visibleToRoles.includes(role as 'commercial_manager' | 'ceo' | 'cfo')));
  if (!update || !canView) {
    return (
      <StateView
        type="empty"
        title="Submission unavailable"
        message="This Weekly Update does not exist or is not visible to the current user."
        action={<Button onClick={() => navigate(backPath)}>{backLabel}</Button>}
      />
    );
  }
  const project = atlas.projects.find((item) => item.id === update.projectId);
  return (
    <>
      <PageHeader
        title={project?.name ?? 'Weekly Update'}
        description={`${getCycle(update.reportingPeriodId).label} · ${getDepartment(update.departmentId)?.name ?? 'Department'} · ${getUser(update.creatorId)?.name ?? 'Manager'}`}
        controls={
          <>
            <Button variant="secondary" onClick={() => navigate(backPath)}>
              {backLabel}
            </Button>
            <StatusBadge status={update.status} />
          </>
        }
      />
      <Panel title="Submission details">
        <dl className="plan-summary-grid">
          <div>
            <dt>Project</dt>
            <dd>{project?.name ?? 'Project'}</dd>
          </div>
          <div>
            <dt>Reporting deadline</dt>
            <dd>{format.date(update.reportingDeadline)}</dd>
          </div>
          <div>
            <dt>Saved</dt>
            <dd>{format.date(update.savedAt)}</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>{update.submittedAt ? format.date(update.submittedAt) : 'Not submitted'}</dd>
          </div>
        </dl>
      </Panel>
      <div className="manager-submission-sections section">
        {sectionDefinitions.map((section) => (
          <Panel title={section.title} key={section.key}>
            <p>{update.sections[section.key] || 'No content added.'}</p>
          </Panel>
        ))}
      </div>
      {update.chart && (
        <Panel title="Generated Chart" className="section">
          <ChartPreview chart={update.chart} />
        </Panel>
      )}
      <Panel title="Supporting Documents" className="section">
        {update.attachments.length ? (
          <ul className="manager-attachment-list">
            {update.attachments.map((attachment) => (
              <li key={attachment.id}>
                <FileCheck2 aria-hidden="true" />
                <span>
                  <strong>{attachment.name}</strong>
                  <small>
                    {attachment.type} · {fileSize(attachment.size)}
                  </small>
                </span>
                <StatusBadge status={attachment.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-copy">No supporting documents attached.</p>
        )}
      </Panel>
      {update.status === 'draft' && update.creatorId === activeUserId && (
        <div className="form-actions form-actions--end">
          <Button onClick={() => navigate(`/manager/weekly-updates?update=${update.id}`)}>
            Continue editing
          </Button>
        </div>
      )}
    </>
  );
}
