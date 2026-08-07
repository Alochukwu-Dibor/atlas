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
  canCommentOnUpdate,
  canDeleteUpdate,
  canEditUpdate,
  canResubmitUpdate,
  canViewUpdate,
  extractChartValues,
  isUpdatePastDeadline,
  selectAssignedProjectIds,
  selectManagerUpdates,
  selectVisibleSubmittedUpdates,
  type GeneratedChart,
  type ManagerAttachment,
  type ManagerChartType,
  type ManagerUpdateComment,
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
  return `2026-08-03T12:${String(sequence % 60).padStart(2, '0')}:00+01:00`;
}

const discussionRoleLabels = {
  department_manager: 'Manager',
  commercial_manager: 'Commercial Manager',
  ceo: 'CEO',
  cfo: 'CFO',
} as const;

function fileSize(bytes: number) {
  return bytes < 1_000_000
    ? `${Math.max(1, Math.round(bytes / 1_000))} KB`
    : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  }).format(new Date(value));
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

export function ExecutiveUpdatesPage() {
  const navigate = useNavigate();
  const { role, managerUpdates } = useAtlas();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  if (role !== 'ceo' && role !== 'cfo') {
    return (
      <StateView
        type="no-access"
        title="View Updates unavailable"
        message="Only the CEO and CFO can access the Executive View Updates workspace."
      />
    );
  }
  const updates = selectVisibleSubmittedUpdates(managerUpdates, role as 'ceo' | 'cfo');
  const filteredUpdates = updates.filter((update) => {
    const manager = getUser(update.creatorId)?.name ?? '';
    const department = getDepartment(update.departmentId)?.name ?? '';
    const project = atlas.projects.find((item) => item.id === update.projectId)?.name ?? '';
    const period = getCycle(update.reportingPeriodId).label;
    return `${period} ${manager} ${department} ${project}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredUpdates.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageUpdates = filteredUpdates.slice(safePage * pageSize, (safePage + 1) * pageSize);
  return (
    <>
      <PageHeader
        title="View Updates"
        description="Review submitted Weekly Updates and request clarification through the shared discussion."
      />
      {updates.length ? (
        <Panel title="Submitted Weekly Updates">
          <div className="submission-history-tools">
            <Field label="Search updates">
              <input
                type="search"
                value={search}
                placeholder="Search by period, contributor, department or project"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
              />
            </Field>
          </div>
          {pageUpdates.length ? (
            <>
              <DataTable
                caption="Authorised submitted Weekly Updates"
                headers={[
                  'Reporting Period',
                  'Manager & Department',
                  'Project',
                  'Date Submitted',
                  'Action',
                ]}
                rows={pageUpdates.map((update) => [
                  getCycle(update.reportingPeriodId).label,
                  <span className="submission-status-cell">
                    <strong>{getUser(update.creatorId)?.name ?? 'Manager'}</strong>
                    <small>{getDepartment(update.departmentId)?.name ?? 'Department'}</small>
                  </span>,
                  atlas.projects.find((project) => project.id === update.projectId)?.name ??
                    'Project',
                  update.submittedAt ? format.date(update.submittedAt) : 'Not submitted',
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/executive/view-updates/${update.id}`)}
                  >
                    View update
                  </Button>,
                ])}
              />
              <div className="table-pagination" aria-label="Executive updates pagination">
                <span>
                  {safePage * pageSize + 1}–
                  {Math.min((safePage + 1) * pageSize, filteredUpdates.length)} of{' '}
                  {filteredUpdates.length}
                </span>
                <div className="form-actions">
                  <Button
                    variant="secondary"
                    disabled={safePage === 0}
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="empty-copy">No submitted Weekly Updates match this search.</p>
          )}
        </Panel>
      ) : (
        <StateView
          type="empty"
          title="No submitted Weekly Updates"
          message="Authorised Manager and Commercial Manager submissions will appear here after submission."
        />
      )}
    </>
  );
}

export function ManagerWeeklyUpdatesPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const { activeUserId, departmentId, managerUpdates, managerUpdatesDispatch, plan, role } =
    useAtlas();
  const actorRole = role as ManagerUpdateComment['authorRole'];
  const isCommercial = role === 'commercial_manager';
  const submissionsPath = isCommercial ? '/reviews' : '/manager/submissions';
  const detailPath = (id: string) =>
    isCommercial ? `/reviews/weekly-updates/${id}` : `/manager/submissions/${id}`;
  const assignedIds = selectAssignedProjectIds(activeUserId);
  const projects = (plan.confirmedPlan?.projects ?? []).filter((project) =>
    assignedIds.includes(project.id),
  );
  const requestedRecord = managerUpdates.updates.find(
    (update) => update.id === searchParams.get('update'),
  );
  const requestedUpdate =
    requestedRecord && canEditUpdate(requestedRecord, activeUserId, actorRole)
      ? requestedRecord
      : undefined;
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
  const editingSubmitted = requestedUpdate?.status === 'submitted';
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
    const now = prototypeTime(
      managerUpdates.updates.length + 1 + (existing?.status === 'submitted' ? 20 : 0),
    );
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
      comments: existing?.comments ?? [],
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

  if (!plan.confirmedPlan) {
    return (
      <StateView
        type="empty"
        title="No confirmed plan assignments"
        message="A Commercial Manager must confirm an approved plan before Weekly Updates can be created."
        action={
          isCommercial ? <Button onClick={() => navigate('/plan')}>Open Plan</Button> : undefined
        }
      />
    );
  }

  if (requestedRecord && !requestedUpdate) {
    const deadlinePassed =
      requestedRecord.creatorId === activeUserId && isUpdatePastDeadline(requestedRecord);
    return (
      <StateView
        type="locked"
        title={deadlinePassed ? 'Reporting deadline passed' : 'Update unavailable'}
        message={
          deadlinePassed
            ? 'This submitted update is now view only. Its discussion remains available on the Submission Detail page.'
            : 'This update cannot be edited by the current user.'
        }
        action={
          requestedRecord.creatorId === activeUserId ? (
            <Button onClick={() => navigate(detailPath(requestedRecord.id))}>
              View Submission
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (submittedId) {
    return (
      <StateView
        type="locked"
        title={editingSubmitted ? 'Weekly Update resubmitted' : 'Weekly Update submitted'}
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
      ) : existing?.status === 'submitted' && !editingSubmitted ? (
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
            {editingSubmitted ? (
              <Button variant="secondary" onClick={() => navigate(detailPath(requestedUpdate.id))}>
                Cancel editing
              </Button>
            ) : (
              <Button variant="secondary" onClick={saveDraft}>
                Save as Draft
              </Button>
            )}
            <Button onClick={submit}>
              {editingSubmitted ? 'Resubmit Update' : 'Submit Update'}
            </Button>
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
  const { activeUserId, managerUpdates, role } = useAtlas();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const updates = selectManagerUpdates(managerUpdates, activeUserId);
  const filteredUpdates = updates.filter((update) => {
    const project = atlas.projects.find((item) => item.id === update.projectId)?.name ?? '';
    const period = getCycle(update.reportingPeriodId).label;
    return `${project} ${period} ${update.status}`.toLowerCase().includes(search.toLowerCase());
  });
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredUpdates.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageUpdates = filteredUpdates.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const isCommercial = role === 'commercial_manager';
  const createPath = isCommercial ? '/reviews/weekly-update' : '/manager/weekly-updates';
  const detailPath = (id: string) =>
    isCommercial ? `/reviews/weekly-updates/${id}` : `/manager/submissions/${id}`;
  return (
    <>
      <PageHeader
        title="Submissions"
        description="Reopen drafts and view Weekly Updates you have submitted."
        controls={<Button onClick={() => navigate(createPath)}>New Weekly Update</Button>}
      />
      {updates.length ? (
        <Panel title="My Weekly Updates">
          <div className="submission-history-tools">
            <Field label="Search submissions">
              <input
                type="search"
                value={search}
                placeholder="Search by period, project or status"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
              />
            </Field>
          </div>
          {pageUpdates.length ? (
            <>
              <DataTable
                caption="Manager Weekly Update submissions"
                headers={['Reporting Period', 'Project', 'Date Submitted', 'Status']}
                rows={pageUpdates.map((update) => [
                  getCycle(update.reportingPeriodId).label,
                  atlas.projects.find((project) => project.id === update.projectId)?.name ??
                    'Project',
                  update.submittedAt ? format.date(update.submittedAt) : 'Not submitted',
                  <span className="submission-status-cell">
                    <StatusBadge status={update.status} />
                    {update.status === 'submitted' && isUpdatePastDeadline(update) && (
                      <small>View only</small>
                    )}
                  </span>,
                ])}
                onRowClick={(index) => navigate(detailPath(pageUpdates[index].id))}
              />
              <div className="table-pagination" aria-label="Submission history pagination">
                <span>
                  {safePage * pageSize + 1}–
                  {Math.min((safePage + 1) * pageSize, filteredUpdates.length)} of{' '}
                  {filteredUpdates.length}
                </span>
                <div className="form-actions">
                  <Button
                    variant="secondary"
                    disabled={safePage === 0}
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="empty-copy">No submissions match this search.</p>
          )}
        </Panel>
      ) : (
        <StateView
          type="empty"
          title="No Weekly Updates yet"
          message="Create an update for an assigned project and reporting period."
          action={<Button onClick={() => navigate(createPath)}>Create Update</Button>}
        />
      )}
    </>
  );
}

export function ManagerSubmissionDetailPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { id } = useParams();
  const { activeUserId, role, managerUpdates, managerUpdatesDispatch } = useAtlas();
  const actorRole = role as ManagerUpdateComment['authorRole'];
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isCommercial = role === 'commercial_manager';
  const isExecutive = role === 'ceo' || role === 'cfo';
  const update = managerUpdates.updates.find((item) => item.id === id);
  const viewingOwnCommercialUpdate = isCommercial && update?.creatorId === activeUserId;
  const backPath = viewingOwnCommercialUpdate
    ? '/reviews/my-submissions'
    : isCommercial
      ? '/reviews'
      : isExecutive
        ? '/executive/view-updates'
        : '/manager/submissions';
  const backLabel = viewingOwnCommercialUpdate
    ? 'Back to Submissions'
    : isCommercial
      ? 'Back to Reporting'
      : isExecutive
        ? 'Back to View Updates'
        : 'Back to Submissions';
  const canView = update ? canViewUpdate(update, activeUserId, actorRole) : false;
  const canEdit = update ? canEditUpdate(update, activeUserId, actorRole) : false;
  const canResubmit = update ? canResubmitUpdate(update, activeUserId, actorRole) : false;
  const canComment = update ? canCommentOnUpdate(update, activeUserId, actorRole) : false;
  const canDelete = update ? canDeleteUpdate(update, activeUserId, actorRole) : false;
  const deadlinePassed = update ? isUpdatePastDeadline(update) : false;

  if (!update) {
    return (
      <StateView
        type="empty"
        title="Submission not found"
        message="No Weekly Update exists for this submission identifier."
        action={<Button onClick={() => navigate(backPath)}>{backLabel}</Button>}
      />
    );
  }
  if (!canView) {
    return (
      <StateView
        type="no-access"
        title="Submission unavailable"
        message="This Weekly Update is not visible to the current user. Drafts remain private to their creator."
        action={<Button onClick={() => navigate(backPath)}>{backLabel}</Button>}
      />
    );
  }
  const project = atlas.projects.find((item) => item.id === update.projectId);
  const editPath = isCommercial
    ? `/reviews/weekly-update?update=${update.id}`
    : `/manager/weekly-updates?update=${update.id}`;
  const addComment = () => {
    const value = commentText.trim();
    if (!value) {
      setCommentError('Enter a comment or response.');
      return;
    }
    const comment = {
      id: `manager_comment_${update.id}_${update.comments.length + 1}`,
      authorId: activeUserId,
      authorRole: actorRole,
      comment: value,
      timestamp: prototypeTime(managerUpdates.updates.length + update.comments.length + 1),
    } satisfies ManagerUpdateComment;
    managerUpdatesDispatch({ type: 'ADD_COMMENT', updateId: update.id, comment });
    setCommentText('');
    setCommentError('');
  };
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
            {(isExecutive || (isCommercial && update.creatorId !== activeUserId)) && (
              <Button variant="secondary" onClick={() => navigate(`/projects/${update.projectId}`)}>
                Open related project
              </Button>
            )}
            <StatusBadge status={update.status} />
          </>
        }
      />
      <Panel title="Submission details">
        <dl className="plan-summary-grid">
          <div>
            <dt>Reporting Period</dt>
            <dd>{getCycle(update.reportingPeriodId).label}</dd>
          </div>
          <div>
            <dt>Project</dt>
            <dd>{project?.name ?? 'Project'}</dd>
          </div>
          <div>
            <dt>Creator</dt>
            <dd>{getUser(update.creatorId)?.name ?? 'Manager'}</dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{getDepartment(update.departmentId)?.name ?? 'Department'}</dd>
          </div>
          <div>
            <dt>Submission Status</dt>
            <dd>{update.status === 'draft' ? 'Draft' : 'Submitted'}</dd>
          </div>
          <div>
            <dt>Submission Date</dt>
            <dd>{update.submittedAt ? format.date(update.submittedAt) : 'Not submitted'}</dd>
          </div>
          <div>
            <dt>Reporting Deadline</dt>
            <dd>{format.date(update.reportingDeadline)}</dd>
          </div>
        </dl>
      </Panel>
      {deadlinePassed && update.status === 'submitted' && update.creatorId === activeUserId && (
        <div className="info-panel section" role="status">
          <strong>Reporting deadline passed</strong>
          <span>This submission is view only, but its discussion remains open.</span>
        </div>
      )}
      <Panel title="Highlights from the Previous Week" className="section">
        <p>{update.sections.highlights || 'No content added.'}</p>
      </Panel>
      {update.chart && (
        <Panel title="Generated Chart" className="section">
          <ChartPreview chart={update.chart} />
        </Panel>
      )}
      <div className="manager-submission-sections section">
        {sectionDefinitions.slice(1).map((section) => (
          <Panel title={section.title} key={section.key}>
            <p>{update.sections[section.key] || 'No content added.'}</p>
          </Panel>
        ))}
      </div>
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
                  <small>Prototype file metadata only · preview unavailable</small>
                </span>
                <StatusBadge status={attachment.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-copy">No supporting documents attached.</p>
        )}
      </Panel>
      <Panel title="Comments & Responses" className="section manager-discussion">
        {update.status === 'draft' ? (
          <p className="empty-copy">Discussion becomes available after this draft is submitted.</p>
        ) : (
          <>
            {update.comments.length ? (
              <ol className="manager-comment-list">
                {update.comments.map((comment) => (
                  <li key={comment.id}>
                    <div>
                      <strong>
                        {getUser(comment.authorId)?.name ??
                          discussionRoleLabels[comment.authorRole]}
                      </strong>
                      <span>{discussionRoleLabels[comment.authorRole]}</span>
                      <time dateTime={comment.timestamp}>{formatTimestamp(comment.timestamp)}</time>
                    </div>
                    <p>{comment.comment}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-copy">No comments or responses yet.</p>
            )}
            {canComment && (
              <div className="manager-comment-form">
                <Field
                  label={update.creatorId === activeUserId ? 'Add a response' : 'Add a comment'}
                  error={commentError}
                >
                  <textarea
                    rows={3}
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                  />
                </Field>
                <Button onClick={addComment}>
                  {update.creatorId === activeUserId ? 'Post response' : 'Post comment'}
                </Button>
              </div>
            )}
          </>
        )}
      </Panel>
      {(canEdit || canDelete) && (
        <div className="form-actions form-actions--end section">
          {canDelete && (
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 aria-hidden="true" />
              Delete submission
            </Button>
          )}
          {canEdit && (
            <Button onClick={() => navigate(editPath)}>
              {canResubmit ? 'Edit and resubmit' : 'Continue editing'}
            </Button>
          )}
        </div>
      )}
      <Modal
        open={deleteOpen}
        title="Delete submitted Weekly Update?"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                managerUpdatesDispatch({
                  type: 'DELETE_UPDATE',
                  updateId: update.id,
                  actorId: activeUserId,
                });
                setDeleteOpen(false);
                navigate(backPath, { replace: true });
                showToast('Submitted Weekly Update deleted across Atlas.');
              }}
            >
              Delete submission
            </Button>
          </>
        }
      >
        <p>
          This permanently removes the submitted update and its comments from Manager, Commercial
          Manager, CEO and CFO views. This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
