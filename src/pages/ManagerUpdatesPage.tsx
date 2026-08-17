import { ClipboardPaste, FileCheck2, FileUp, Plus, Trash2 } from 'lucide-react';
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
  calculateMeasure,
  createCommitmentOutcomes,
  createInheritedPerformanceMeasures,
  isUpdatePastDeadline,
  latestPreviousManagerUpdate,
  selectAssignedProjectIds,
  selectManagerUpdates,
  selectVisibleSubmittedUpdates,
  type GeneratedChart,
  type ManagerAttachment,
  type ManagerChartType,
  type ManagerActivityRecord,
  type ManagerCommitmentOutcome,
  type ManagerCommitmentRecord,
  type ManagerHighlightRecord,
  type ManagerPerformanceMeasure,
  type ManagerRiskRecord,
  type ManagerStructuredSections,
  type ManagerUpdateComment,
  type ManagerUpdateSections,
  type ManagerWeeklyUpdate,
} from '../state/managerUpdates';

function emptyHighlight(index = 1): ManagerHighlightRecord {
  return { id: `highlight_${index}`, text: '', linkedPlanItemIds: [] };
}

function emptyActivity(index = 1): ManagerActivityRecord {
  return {
    id: `activity_${index}`,
    activity: '',
    status: 'in_progress',
    progressPercent: '',
    expectedCompletion: '',
    linkedPlanItemId: '',
    blocker: '',
    narrative: '',
  };
}

function emptyCommitment(ownerId: string, index = 1): ManagerCommitmentRecord {
  return {
    id: `commitment_${index}`,
    commitment: '',
    expectedOutcome: '',
    ownerId,
    dueDate: '',
    linkedPlanItemId: '',
    dependency: '',
    status: 'not_started',
  };
}

function emptyRisk(ownerId: string, index = 1): ManagerRiskRecord {
  return {
    id: `risk_${index}`,
    risk: '',
    impact: '',
    likelihood: 'medium',
    linkedPlanItemId: '',
    potentialImpact: '',
    mitigation: '',
    ownerId,
    targetResolution: '',
    comment: '',
  };
}

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
  const hasPlanSeries = chart.values.some((value) => value.planValue !== undefined);
  return (
    <ChartWrapper
      title={chart.title}
      summary={`Deterministic preview created from ${chart.values.length} structured reporting values.`}
      tableHeaders={hasPlanSeries ? ['Period', 'Actual', 'Approved plan'] : ['Measure', 'Value']}
      tableRows={chart.values.map((value) => [
        value.label,
        String(value.value),
        ...(hasPlanSeries ? [String(value.planValue ?? '')] : []),
      ])}
    >
      {chart.type === 'bar' ? (
        <BarChart data={chart.values} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          {hasPlanSeries && (
            <Bar dataKey="planValue" name="Approved plan" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
          )}
          <Bar dataKey="value" name="Extracted value" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={chart.values} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          {hasPlanSeries && (
            <Line
              type="monotone"
              dataKey="planValue"
              name="Approved plan"
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
          )}
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

function StructuredSectionSummary({
  update,
  section,
}: {
  update: ManagerWeeklyUpdate;
  section: keyof ManagerStructuredSections;
}) {
  const value = update.structuredSections?.[section];
  if (!value) return null;
  const objective = atlas.strategicObjectives.find(
    (item) => item.id === value.strategicObjectiveId,
  );
  const kpi = atlas.kpiDefinitions.find((item) => item.id === value.kpiId);
  const milestone = atlas.milestones.find((item) => item.id === value.milestoneId);
  const rows: [string, string][] = [
    ['Goal', objective?.name ?? 'Not linked'],
    ['KPI', kpi?.name ?? 'Not linked'],
    ['Milestone', milestone?.name ?? 'Not linked'],
  ];
  if (section === 'highlights') {
    const highlight = update.structuredSections!.highlights;
    rows.push(
      ['Expected outcome', highlight.expectedOutcome || 'Not provided'],
      ['Planned value', `${highlight.plannedValue || '—'} ${highlight.unit}`.trim()],
      ['Actual value', `${highlight.actualValue || '—'} ${highlight.unit}`.trim()],
      ['Outcome', highlight.outcomeStatus.replaceAll('_', ' ')],
    );
  } else if (section === 'ongoingActivities') {
    const activity = update.structuredSections!.ongoingActivities;
    rows.push(
      ['Activity', activity.activity || 'Not provided'],
      ['Status', activity.status.replaceAll('_', ' ')],
      ['Progress', activity.progressPercent ? `${activity.progressPercent}%` : 'Not provided'],
      ['Forecast completion', activity.forecastCompletion || 'Not provided'],
    );
  } else if (section === 'risks') {
    const risk = update.structuredSections!.risks;
    rows.push(
      ['Risk', risk.riskTitle || 'Not provided'],
      ['Severity', risk.severity],
      ['Quantified impact', risk.quantifiedImpact || 'Not provided'],
      ['Mitigation', risk.mitigation || 'Not provided'],
    );
  } else {
    const plan = update.structuredSections!.plansForWeek;
    rows.push(
      ['Commitment', plan.commitment || 'Not provided'],
      ['Expected outcome', plan.expectedOutcome || 'Not provided'],
      ['Planned value', `${plan.plannedValue || '—'} ${plan.unit}`.trim()],
      ['Due date', plan.dueDate || 'Not provided'],
    );
  }
  return (
    <dl className="manager-structured-summary">
      {rows.map(([label, content]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{content}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ExecutiveUpdatesPage() {
  const navigate = useNavigate();
  const { role, managerUpdates } = useAtlas();
  const [search, setSearch] = useState('');
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
  const previewRows = updates.length
    ? [
        ['usr_operations', 'dept_operations', 'prj_compressor', '2026-08-03T09:10:00+01:00'],
        ['usr_finance', 'dept_finance', 'prj_metering', '2026-08-03T09:35:00+01:00'],
        ['usr_hse', 'dept_hse', 'prj_integrity', '2026-08-03T10:05:00+01:00'],
        ['usr_legal', 'dept_legal', 'prj_integrity', '2026-08-03T10:40:00+01:00'],
        ['usr_commercial', 'dept_commercial', 'prj_wellwork', '2026-08-03T11:15:00+01:00'],
      ].map(([creatorId, departmentId, projectId, submittedAt], index) => ({
        update: {
          ...updates[0],
          id: `executive_preview_update_${index + 1}`,
          creatorId,
          departmentId,
          projectId,
          reportingPeriodId: 'cycle_2026_w31',
          submittedAt,
        },
        detailId: updates[0].id,
      }))
    : [];
  const displayRows = [
    ...updates.map((update) => ({ update, detailId: update.id })),
    ...previewRows,
  ];
  const filteredUpdates = displayRows.filter(({ update }) => {
    const manager = getUser(update.creatorId)?.name ?? '';
    const department = getDepartment(update.departmentId)?.name ?? '';
    const project = atlas.projects.find((item) => item.id === update.projectId)?.name ?? '';
    const period = getCycle(update.reportingPeriodId).label;
    return `${period} ${manager} ${department} ${project}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });
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
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
          </div>
          {filteredUpdates.length ? (
            <DataTable
              caption="Authorised submitted Weekly Updates"
              headers={['Reporting Period', 'Manager', 'Project', 'Date Submitted', 'Action']}
              rows={filteredUpdates.map(({ update, detailId }) => [
                getCycle(update.reportingPeriodId).label,
                <strong>{getUser(update.creatorId)?.name ?? 'Manager'}</strong>,
                atlas.projects.find((project) => project.id === update.projectId)?.name ??
                  'Project',
                update.submittedAt ? format.date(update.submittedAt) : 'Not submitted',
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/executive/view-updates/${detailId}`)}
                >
                  View update
                </Button>,
              ])}
            />
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
  const creatingAnother = searchParams.has('new');
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
  const initialProject = projects.find(
    (project) => project.id === (requestedUpdate?.projectId ?? projects[0]?.id),
  );
  const initialPreviousUpdate = latestPreviousManagerUpdate(
    managerUpdates.updates,
    activeUserId,
    initialProject?.id ?? '',
    requestedUpdate?.reportingPeriodId ?? atlas.demoStates.defaultOpenCycleId,
  );
  const [performanceMeasures, setPerformanceMeasures] = useState<ManagerPerformanceMeasure[]>(
    requestedUpdate?.performanceMeasures ??
      (initialProject
        ? createInheritedPerformanceMeasures(initialProject, departmentId, initialPreviousUpdate)
        : []),
  );
  const [highlights, setHighlights] = useState<ManagerHighlightRecord[]>(
    requestedUpdate?.highlights ?? [
      { ...emptyHighlight(), text: requestedUpdate?.sections.highlights ?? '' },
    ],
  );
  const [activities, setActivities] = useState<ManagerActivityRecord[]>(
    requestedUpdate?.activities ?? [
      {
        ...emptyActivity(),
        activity: requestedUpdate?.sections.ongoingActivities ?? '',
        narrative: requestedUpdate?.sections.ongoingActivities ?? '',
      },
    ],
  );
  const [previousCommitmentOutcomes, setPreviousCommitmentOutcomes] = useState<
    ManagerCommitmentOutcome[]
  >(requestedUpdate?.previousCommitmentOutcomes ?? createCommitmentOutcomes(initialPreviousUpdate));
  const [commitments, setCommitments] = useState<ManagerCommitmentRecord[]>(
    requestedUpdate?.commitments ?? [
      {
        ...emptyCommitment(activeUserId),
        commitment: requestedUpdate?.sections.plansForWeek ?? '',
      },
    ],
  );
  const [structuredRisks, setStructuredRisks] = useState<ManagerRiskRecord[]>(
    requestedUpdate?.structuredRisks ?? [
      { ...emptyRisk(activeUserId), risk: requestedUpdate?.sections.risks ?? '' },
    ],
  );
  const [supportRequired, setSupportRequired] = useState(requestedUpdate?.supportRequired ?? '');
  const [attachments, setAttachments] = useState<ManagerAttachment[]>(
    requestedUpdate?.attachments ?? [],
  );
  const [pastedText, setPastedText] = useState(requestedUpdate?.pastedText ?? '');
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [chart, setChart] = useState<GeneratedChart | null>(requestedUpdate?.chart ?? null);
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [chartType, setChartType] = useState<ManagerChartType>(
    requestedUpdate?.chart?.type ?? 'bar',
  );
  const [pendingChart, setPendingChart] = useState<GeneratedChart | null>(null);
  const [selectedChartMeasureId, setSelectedChartMeasureId] = useState('');
  const [chartRange, setChartRange] = useState('4');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const period = atlas.reportingCycles.find((cycle) => cycle.id === periodId);
  const matchingUpdates = managerUpdates.updates
    .filter(
      (update) =>
        update.creatorId === activeUserId &&
        update.projectId === projectId &&
        update.reportingPeriodId === periodId,
    )
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const existing =
    requestedUpdate ??
    (creatingAnother ? undefined : matchingUpdates.find((update) => update.status === 'draft'));
  const selectedProject = projects.find((project) => project.id === projectId);
  const closed = period?.status !== 'open';
  const editingSubmitted = requestedUpdate?.status === 'submitted';
  const chartableMeasures = performanceMeasures.filter(
    (measure) => measure.type !== 'Milestone' && Number.isFinite(Number(measure.approvedValue)),
  );
  const selectedChartMeasure =
    chartableMeasures.find((measure) => measure.id === selectedChartMeasureId) ??
    chartableMeasures[0];
  const allChartValues = selectedChartMeasure
    ? [
        ...managerUpdates.updates
          .filter(
            (update) =>
              update.projectId === projectId &&
              update.status === 'submitted' &&
              update.performanceMeasures?.some(
                (measure) =>
                  measure.planItemId === selectedChartMeasure.planItemId &&
                  measure.currentValue.trim() &&
                  Number.isFinite(Number(measure.currentValue)),
              ),
          )
          .map((update) => {
            const measure = update.performanceMeasures!.find(
              (item) => item.planItemId === selectedChartMeasure.planItemId,
            )!;
            return {
              label: getCycle(update.reportingPeriodId).label.replace(/^.*·\s*/, ''),
              value: Number(measure.currentValue),
              planValue: Number(measure.approvedValue),
            };
          }),
        ...(selectedChartMeasure.currentValue.trim() &&
        Number.isFinite(Number(selectedChartMeasure.currentValue))
          ? [
              {
                label: period?.label.replace(/^.*·\s*/, '') ?? 'Current',
                value: Number(selectedChartMeasure.currentValue),
                planValue: Number(selectedChartMeasure.approvedValue),
              },
            ]
          : []),
      ]
    : [];
  const chartValues =
    chartRange === 'quarter'
      ? allChartValues
      : allChartValues.slice(-Math.max(1, Number(chartRange) || 4));

  const loadContext = (nextPeriodId: string, nextProjectId: string) => {
    const saved = creatingAnother
      ? undefined
      : managerUpdates.updates
          .filter(
            (update) =>
              update.creatorId === activeUserId &&
              update.projectId === nextProjectId &&
              update.reportingPeriodId === nextPeriodId &&
              update.status === 'draft',
          )
          .sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
    const nextProject = projects.find((project) => project.id === nextProjectId);
    const previous = latestPreviousManagerUpdate(
      managerUpdates.updates,
      activeUserId,
      nextProjectId,
      nextPeriodId,
    );
    setPerformanceMeasures(
      saved?.performanceMeasures ??
        (nextProject
          ? createInheritedPerformanceMeasures(nextProject, departmentId, previous)
          : []),
    );
    setHighlights(
      saved?.highlights ?? [{ ...emptyHighlight(), text: saved?.sections.highlights ?? '' }],
    );
    setActivities(
      saved?.activities ?? [
        {
          ...emptyActivity(),
          activity: saved?.sections.ongoingActivities ?? '',
          narrative: saved?.sections.ongoingActivities ?? '',
        },
      ],
    );
    setPreviousCommitmentOutcomes(
      saved?.previousCommitmentOutcomes ?? createCommitmentOutcomes(previous),
    );
    setCommitments(
      saved?.commitments ?? [
        { ...emptyCommitment(activeUserId), commitment: saved?.sections.plansForWeek ?? '' },
      ],
    );
    setStructuredRisks(
      saved?.structuredRisks ?? [{ ...emptyRisk(activeUserId), risk: saved?.sections.risks ?? '' }],
    );
    setSupportRequired(saved?.supportRequired ?? '');
    setAttachments(saved?.attachments ?? []);
    setPastedText(saved?.pastedText ?? '');
    setChart(saved?.chart ?? null);
    setSelectedChartMeasureId('');
    setErrors({});
  };

  const startAnotherUpdate = () => {
    const previous = latestPreviousManagerUpdate(
      managerUpdates.updates,
      activeUserId,
      projectId,
      periodId,
    );
    setPerformanceMeasures(
      selectedProject
        ? createInheritedPerformanceMeasures(selectedProject, departmentId, previous)
        : [],
    );
    setHighlights([emptyHighlight()]);
    setActivities([emptyActivity()]);
    setPreviousCommitmentOutcomes(createCommitmentOutcomes(previous));
    setCommitments([emptyCommitment(activeUserId)]);
    setStructuredRisks([emptyRisk(activeUserId)]);
    setSupportRequired('');
    setAttachments([]);
    setPastedText('');
    setChart(null);
    setPendingChart(null);
    setErrors({});
    setSubmittedId(null);
    navigate(
      `${isCommercial ? '/reviews/weekly-update' : '/manager/weekly-updates'}?new=${managerUpdates.updates.length + 1}`,
    );
  };

  const buildUpdate = (status: 'draft' | 'submitted') => {
    if (!period || !projectId) return null;
    const now = prototypeTime(
      managerUpdates.updates.length + 1 + (existing?.status === 'submitted' ? 20 : 0),
    );
    const savedAttachments = attachments.filter((attachment) => attachment.status === 'uploaded');
    const evidenceIds = savedAttachments.map((attachment) => attachment.id);
    const canonicalSections: ManagerUpdateSections = {
      highlights: highlights
        .map((highlight) => highlight.text.trim())
        .filter(Boolean)
        .join('\n\n'),
      ongoingActivities: activities
        .map((activity) => activity.narrative.trim() || activity.activity.trim())
        .filter(Boolean)
        .join('\n\n'),
      risks: structuredRisks
        .map((risk) => risk.comment.trim() || risk.risk.trim())
        .filter(Boolean)
        .join('\n\n'),
      plansForWeek: commitments
        .map((commitment) => commitment.commitment.trim())
        .filter(Boolean)
        .join('\n\n'),
    };
    const tracedMeasures = performanceMeasures.map((measure) => {
      const calculated = calculateMeasure({
        ...measure,
        evidenceIds,
        reviewStatus: status,
      });
      if (status !== 'submitted' || !calculated.currentValue.trim()) return calculated;
      return {
        ...calculated,
        revisions: [
          ...calculated.revisions,
          {
            id: `revision_${calculated.planItemId}_${periodId}_${calculated.revisions.length + 1}`,
            reportingPeriodId: periodId,
            managerId: activeUserId,
            previousValue: calculated.previousValue,
            currentValue: calculated.currentValue,
            variance: calculated.variance,
            recordedAt: now,
          },
        ],
      };
    });
    return {
      id:
        existing?.id ??
        `manager_update_${activeUserId}_${projectId}_${periodId}_${managerUpdates.updates.length + 1}`,
      creatorId: activeUserId,
      departmentId,
      projectId,
      reportingPeriodId: periodId,
      reportingDeadline: period.dueDate,
      sections: canonicalSections,
      structuredSections: existing?.structuredSections,
      metricInputs: existing?.metricInputs,
      performanceMeasures: tracedMeasures,
      highlights,
      activities,
      previousCommitmentOutcomes: previousCommitmentOutcomes.map((outcome) => ({
        ...outcome,
        evidenceIds,
      })),
      commitments,
      structuredRisks,
      supportRequired: supportRequired.trim(),
      chart,
      attachments: savedAttachments,
      pastedText: pastedText.trim(),
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
    const nextErrors: Record<string, string> = {};
    if (!periodId || !projectId) nextErrors.context = 'Select a reporting period and project.';
    if (
      performanceMeasures.length > 0 &&
      !performanceMeasures.some(
        (measure) =>
          measure.currentValue.trim() ||
          measure.currentProgress.trim() ||
          measure.currentStatus !== 'not_started',
      )
    )
      nextErrors.performance = 'Update at least one approved measure.';
    if (!highlights.some((highlight) => highlight.text.trim()))
      nextErrors.highlights = 'Add at least one highlight from last week.';
    if (!activities.some((activity) => activity.activity.trim()))
      nextErrors.activities = 'Add at least one ongoing activity.';
    if (!commitments.some((commitment) => commitment.commitment.trim()))
      nextErrors.commitments = 'Add at least one commitment for next week.';
    if (!structuredRisks.some((risk) => risk.risk.trim()))
      nextErrors.risks = 'Add a risk or record “No material risks”.';
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
            <Button variant="secondary" onClick={startAnotherUpdate}>
              Start Another Update
            </Button>
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
          <Panel title="Performance against plan" className="section manager-performance-panel">
            <p className="panel-intro">
              Atlas loaded the approved measures assigned to this department and project. Update
              only the current value or status; plan relationships and variance are inherited.
            </p>
            {performanceMeasures.length ? (
              <div className="manager-performance-table-wrap">
                <table className="manager-performance-table">
                  <caption className="sr-only">Approved performance measures</caption>
                  <thead>
                    <tr>
                      <th>Measure</th>
                      <th>Type</th>
                      <th>Approved plan</th>
                      <th>Previous</th>
                      <th>Current</th>
                      <th>Variance</th>
                      <th>Status</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceMeasures.map((measure) => (
                      <tr key={measure.id}>
                        <th scope="row">{measure.name}</th>
                        <td>{measure.type}</td>
                        <td>
                          {measure.approvedValue} {measure.unit}
                        </td>
                        <td>
                          {measure.type === 'Milestone'
                            ? measure.previousStatus.replaceAll('_', ' ')
                            : `${measure.previousValue || '—'} ${measure.unit}`}
                        </td>
                        <td>
                          {measure.type === 'Milestone' ? (
                            <div className="manager-measure-current">
                              <select
                                aria-label={`${measure.name} current status`}
                                value={measure.currentStatus}
                                onChange={(event) =>
                                  setPerformanceMeasures((current) =>
                                    current.map((item) =>
                                      item.id === measure.id
                                        ? calculateMeasure({
                                            ...item,
                                            currentStatus: event.target
                                              .value as ManagerPerformanceMeasure['currentStatus'],
                                          })
                                        : item,
                                    ),
                                  )
                                }
                              >
                                <option value="not_started">Not started</option>
                                <option value="in_progress">In progress</option>
                                <option value="completed">Completed</option>
                              </select>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                aria-label={`${measure.name} current progress`}
                                placeholder="Progress %"
                                value={measure.currentProgress}
                                onChange={(event) =>
                                  setPerformanceMeasures((current) =>
                                    current.map((item) =>
                                      item.id === measure.id
                                        ? calculateMeasure({
                                            ...item,
                                            currentProgress: event.target.value,
                                          })
                                        : item,
                                    ),
                                  )
                                }
                              />
                              <input
                                type="date"
                                aria-label={`${measure.name} forecast completion`}
                                value={measure.forecastCompletion}
                                onChange={(event) =>
                                  setPerformanceMeasures((current) =>
                                    current.map((item) =>
                                      item.id === measure.id
                                        ? { ...item, forecastCompletion: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            </div>
                          ) : (
                            <div className="manager-value-input">
                              <input
                                type="number"
                                inputMode="decimal"
                                aria-label={`${measure.name} current value`}
                                value={measure.currentValue}
                                onChange={(event) =>
                                  setPerformanceMeasures((current) =>
                                    current.map((item) =>
                                      item.id === measure.id
                                        ? calculateMeasure({
                                            ...item,
                                            currentValue: event.target.value,
                                          })
                                        : item,
                                    ),
                                  )
                                }
                              />
                              <span>{measure.unit}</span>
                            </div>
                          )}
                        </td>
                        <td>{measure.variance}</td>
                        <td>
                          <StatusBadge status={measure.status} />
                        </td>
                        <td>
                          {measure.type !== 'Milestone' && (
                            <div className="manager-measure-actions">
                              <Button
                                variant="tertiary"
                                onClick={() => {
                                  setSelectedChartMeasureId(measure.id);
                                  setPendingChart(null);
                                  setChartModalOpen(true);
                                }}
                              >
                                View trend
                              </Button>
                              <Button
                                variant="tertiary"
                                onClick={() => {
                                  setSelectedChartMeasureId(measure.id);
                                  setPendingChart(null);
                                  setChartModalOpen(true);
                                }}
                              >
                                Add chart
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-copy">
                No approved KPI, target, or milestone is assigned to this context.
              </p>
            )}
            {errors.performance && <p className="field__error">{errors.performance}</p>}
          </Panel>

          <Panel title="Highlights from last week" className="section">
            <p className="panel-intro">
              Add narrative context first. Link approved plan items only where they help explain the
              highlight.
            </p>
            <div className="manager-repeatable-list">
              {highlights.map((highlight, index) => (
                <div className="manager-repeatable-record" key={highlight.id}>
                  <Field label={`Highlight ${index + 1}`}>
                    <textarea
                      aria-label={`Highlight ${index + 1}`}
                      rows={3}
                      value={highlight.text}
                      onChange={(event) =>
                        setHighlights((current) =>
                          current.map((item) =>
                            item.id === highlight.id ? { ...item, text: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <details>
                    <summary>Link plan items</summary>
                    <div className="manager-plan-tags">
                      {performanceMeasures.map((measure) => (
                        <label key={measure.id}>
                          <input
                            type="checkbox"
                            checked={highlight.linkedPlanItemIds.includes(measure.planItemId)}
                            onChange={(event) =>
                              setHighlights((current) =>
                                current.map((item) =>
                                  item.id === highlight.id
                                    ? {
                                        ...item,
                                        linkedPlanItemIds: event.target.checked
                                          ? [...item.linkedPlanItemIds, measure.planItemId]
                                          : item.linkedPlanItemIds.filter(
                                              (id) => id !== measure.planItemId,
                                            ),
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                          {measure.name}
                        </label>
                      ))}
                    </div>
                  </details>
                  {highlights.length > 1 && (
                    <Button
                      variant="tertiary"
                      onClick={() =>
                        setHighlights((current) =>
                          current.filter((item) => item.id !== highlight.id),
                        )
                      }
                    >
                      <Trash2 aria-hidden="true" /> Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {errors.highlights && <p className="field__error">{errors.highlights}</p>}
            <Button
              variant="secondary"
              onClick={() =>
                setHighlights((current) => [...current, emptyHighlight(current.length + 1)])
              }
            >
              <Plus aria-hidden="true" /> Add highlight
            </Button>
          </Panel>

          <Panel title="Ongoing activities" className="section">
            <div className="manager-repeatable-list">
              {activities.map((activity, index) => (
                <div className="manager-repeatable-record manager-record-grid" key={activity.id}>
                  <Field label={`Activity ${index + 1}`}>
                    <input
                      value={activity.activity}
                      onChange={(event) =>
                        setActivities((current) =>
                          current.map((item) =>
                            item.id === activity.id
                              ? { ...item, activity: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      value={activity.status}
                      onChange={(event) =>
                        setActivities((current) =>
                          current.map((item) =>
                            item.id === activity.id
                              ? {
                                  ...item,
                                  status: event.target.value as ManagerActivityRecord['status'],
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="not_started">Not started</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </Field>
                  <Field label="Progress (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={activity.progressPercent}
                      onChange={(event) =>
                        setActivities((current) =>
                          current.map((item) =>
                            item.id === activity.id
                              ? { ...item, progressPercent: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Expected completion">
                    <input
                      type="date"
                      value={activity.expectedCompletion}
                      onChange={(event) =>
                        setActivities((current) =>
                          current.map((item) =>
                            item.id === activity.id
                              ? { ...item, expectedCompletion: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Linked plan item (optional)">
                    <select
                      value={activity.linkedPlanItemId}
                      onChange={(event) =>
                        setActivities((current) =>
                          current.map((item) =>
                            item.id === activity.id
                              ? { ...item, linkedPlanItemId: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">No link</option>
                      {performanceMeasures.map((measure) => (
                        <option key={measure.id} value={measure.planItemId}>
                          {measure.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Blocker">
                    <input
                      value={activity.blocker}
                      onChange={(event) =>
                        setActivities((current) =>
                          current.map((item) =>
                            item.id === activity.id
                              ? { ...item, blocker: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Narrative update">
                    <textarea
                      rows={3}
                      value={activity.narrative}
                      onChange={(event) =>
                        setActivities((current) =>
                          current.map((item) =>
                            item.id === activity.id
                              ? { ...item, narrative: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  {activities.length > 1 && (
                    <Button
                      variant="tertiary"
                      onClick={() =>
                        setActivities((current) =>
                          current.filter((item) => item.id !== activity.id),
                        )
                      }
                    >
                      <Trash2 aria-hidden="true" /> Remove activity
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {errors.activities && <p className="field__error">{errors.activities}</p>}
            <Button
              variant="secondary"
              onClick={() =>
                setActivities((current) => [...current, emptyActivity(current.length + 1)])
              }
            >
              <Plus aria-hidden="true" /> Add activity
            </Button>
          </Panel>

          <Panel title="Previous commitments and outcomes" className="section">
            {previousCommitmentOutcomes.length ? (
              <div className="manager-repeatable-list">
                {previousCommitmentOutcomes.map((outcome) => (
                  <div
                    className="manager-repeatable-record manager-record-grid"
                    key={outcome.commitmentId}
                  >
                    <div className="manager-record-heading">
                      <strong>{outcome.commitment}</strong>
                      <small>{outcome.expectedOutcome}</small>
                    </div>
                    <Field label="Current status">
                      <select
                        value={outcome.status}
                        onChange={(event) =>
                          setPreviousCommitmentOutcomes((current) =>
                            current.map((item) =>
                              item.commitmentId === outcome.commitmentId
                                ? {
                                    ...item,
                                    status: event.target
                                      .value as ManagerCommitmentOutcome['status'],
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="completed">Completed</option>
                        <option value="in_progress">In progress</option>
                        <option value="delayed">Delayed</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </Field>
                    <Field label="Actual outcome">
                      <textarea
                        rows={2}
                        value={outcome.actualOutcome}
                        onChange={(event) =>
                          setPreviousCommitmentOutcomes((current) =>
                            current.map((item) =>
                              item.commitmentId === outcome.commitmentId
                                ? { ...item, actualOutcome: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </Field>
                    {(outcome.status === 'delayed' || outcome.status === 'blocked') && (
                      <>
                        <Field label="Delay or blocker reason">
                          <input
                            value={outcome.delayReason}
                            onChange={(event) =>
                              setPreviousCommitmentOutcomes((current) =>
                                current.map((item) =>
                                  item.commitmentId === outcome.commitmentId
                                    ? { ...item, delayReason: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field label="Revised forecast">
                          <input
                            type="date"
                            value={outcome.revisedForecast}
                            onChange={(event) =>
                              setPreviousCommitmentOutcomes((current) =>
                                current.map((item) =>
                                  item.commitmentId === outcome.commitmentId
                                    ? { ...item, revisedForecast: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Field>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-copy">
                No commitments were carried forward from the previous period.
              </p>
            )}
          </Panel>

          <Panel title="Plans / new commitments for next week" className="section">
            <div className="manager-repeatable-list">
              {commitments.map((commitment, index) => (
                <div className="manager-repeatable-record manager-record-grid" key={commitment.id}>
                  <Field label={`Commitment ${index + 1}`}>
                    <input
                      value={commitment.commitment}
                      onChange={(event) =>
                        setCommitments((current) =>
                          current.map((item) =>
                            item.id === commitment.id
                              ? { ...item, commitment: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Expected outcome">
                    <input
                      value={commitment.expectedOutcome}
                      onChange={(event) =>
                        setCommitments((current) =>
                          current.map((item) =>
                            item.id === commitment.id
                              ? { ...item, expectedOutcome: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Owner">
                    <select
                      value={commitment.ownerId}
                      onChange={(event) =>
                        setCommitments((current) =>
                          current.map((item) =>
                            item.id === commitment.id
                              ? { ...item, ownerId: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      {atlas.users
                        .filter(
                          (user) => user.departmentId === departmentId || user.id === activeUserId,
                        )
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Due date">
                    <input
                      type="date"
                      value={commitment.dueDate}
                      onChange={(event) =>
                        setCommitments((current) =>
                          current.map((item) =>
                            item.id === commitment.id
                              ? { ...item, dueDate: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Linked plan item (optional)">
                    <select
                      value={commitment.linkedPlanItemId}
                      onChange={(event) =>
                        setCommitments((current) =>
                          current.map((item) =>
                            item.id === commitment.id
                              ? { ...item, linkedPlanItemId: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">No link</option>
                      {performanceMeasures.map((measure) => (
                        <option key={measure.id} value={measure.planItemId}>
                          {measure.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Dependency">
                    <input
                      value={commitment.dependency}
                      onChange={(event) =>
                        setCommitments((current) =>
                          current.map((item) =>
                            item.id === commitment.id
                              ? { ...item, dependency: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      value={commitment.status}
                      onChange={(event) =>
                        setCommitments((current) =>
                          current.map((item) =>
                            item.id === commitment.id
                              ? {
                                  ...item,
                                  status: event.target.value as ManagerCommitmentRecord['status'],
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="not_started">Not started</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                      <option value="delayed">Delayed</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </Field>
                  {commitments.length > 1 && (
                    <Button
                      variant="tertiary"
                      onClick={() =>
                        setCommitments((current) =>
                          current.filter((item) => item.id !== commitment.id),
                        )
                      }
                    >
                      <Trash2 aria-hidden="true" /> Remove commitment
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {errors.commitments && <p className="field__error">{errors.commitments}</p>}
            <Button
              variant="secondary"
              onClick={() =>
                setCommitments((current) => [
                  ...current,
                  emptyCommitment(activeUserId, current.length + 1),
                ])
              }
            >
              <Plus aria-hidden="true" /> Add commitment
            </Button>
          </Panel>

          <Panel title="Risks and constraints" className="section">
            <div className="manager-repeatable-list">
              {structuredRisks.map((risk, index) => (
                <div className="manager-repeatable-record manager-record-grid" key={risk.id}>
                  <Field label={`Risk ${index + 1}`}>
                    <input
                      value={risk.risk}
                      onChange={(event) =>
                        setStructuredRisks((current) =>
                          current.map((item) =>
                            item.id === risk.id ? { ...item, risk: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Impact">
                    <select
                      value={risk.impact}
                      onChange={(event) =>
                        setStructuredRisks((current) =>
                          current.map((item) =>
                            item.id === risk.id ? { ...item, impact: event.target.value } : item,
                          ),
                        )
                      }
                    >
                      <option value="">Select impact</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </Field>
                  <Field label="Likelihood">
                    <select
                      value={risk.likelihood}
                      onChange={(event) =>
                        setStructuredRisks((current) =>
                          current.map((item) =>
                            item.id === risk.id
                              ? {
                                  ...item,
                                  likelihood: event.target.value as ManagerRiskRecord['likelihood'],
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </Field>
                  <Field label="Affected plan item (optional)">
                    <select
                      value={risk.linkedPlanItemId}
                      onChange={(event) =>
                        setStructuredRisks((current) =>
                          current.map((item) =>
                            item.id === risk.id
                              ? { ...item, linkedPlanItemId: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">Project-level risk</option>
                      {performanceMeasures.map((measure) => (
                        <option key={measure.id} value={measure.planItemId}>
                          {measure.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Potential impact">
                    <input
                      value={risk.potentialImpact}
                      onChange={(event) =>
                        setStructuredRisks((current) =>
                          current.map((item) =>
                            item.id === risk.id
                              ? { ...item, potentialImpact: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Mitigation">
                    <input
                      value={risk.mitigation}
                      onChange={(event) =>
                        setStructuredRisks((current) =>
                          current.map((item) =>
                            item.id === risk.id
                              ? { ...item, mitigation: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Owner">
                    <select
                      value={risk.ownerId}
                      onChange={(event) =>
                        setStructuredRisks((current) =>
                          current.map((item) =>
                            item.id === risk.id ? { ...item, ownerId: event.target.value } : item,
                          ),
                        )
                      }
                    >
                      {atlas.users
                        .filter(
                          (user) => user.departmentId === departmentId || user.id === activeUserId,
                        )
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Target resolution">
                    <input
                      type="date"
                      value={risk.targetResolution}
                      onChange={(event) =>
                        setStructuredRisks((current) =>
                          current.map((item) =>
                            item.id === risk.id
                              ? { ...item, targetResolution: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Comment">
                    <textarea
                      rows={3}
                      value={risk.comment}
                      onChange={(event) =>
                        setStructuredRisks((current) =>
                          current.map((item) =>
                            item.id === risk.id ? { ...item, comment: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  {structuredRisks.length > 1 && (
                    <Button
                      variant="tertiary"
                      onClick={() =>
                        setStructuredRisks((current) =>
                          current.filter((item) => item.id !== risk.id),
                        )
                      }
                    >
                      <Trash2 aria-hidden="true" /> Remove risk
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {errors.risks && <p className="field__error">{errors.risks}</p>}
            <Button
              variant="secondary"
              onClick={() =>
                setStructuredRisks((current) => [
                  ...current,
                  emptyRisk(activeUserId, current.length + 1),
                ])
              }
            >
              <Plus aria-hidden="true" /> Add risk
            </Button>
          </Panel>

          <Panel title="Support or decisions required" className="section">
            <Field label="Support or decision required">
              <textarea
                rows={4}
                value={supportRequired}
                placeholder="Describe the decision, support, owner, and required timing."
                onChange={(event) => setSupportRequired(event.target.value)}
              />
            </Field>
          </Panel>

          {chart && (
            <Panel title="Chart added to update" className="section">
              <ChartPreview chart={chart} />
              <Button variant="tertiary" onClick={() => setChart(null)}>
                Remove chart
              </Button>
            </Panel>
          )}

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
            <div className="manager-support-actions">
              <Button variant="secondary" onClick={() => fileInput.current?.click()}>
                <FileUp aria-hidden="true" /> Attach documents
              </Button>
              <button
                type="button"
                className="manager-paste-action"
                onClick={() => setPasteModalOpen(true)}
              >
                <ClipboardPaste aria-hidden="true" />
                <span>
                  <strong>{pastedText ? 'Edit pasted text' : 'Paste text'}</strong>
                  <small>Paste email thread or transcript</small>
                </span>
              </button>
            </div>
            {pastedText && (
              <p className="manager-pasted-summary">Pasted text added to this update.</p>
            )}
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
        open={pasteModalOpen}
        title="Paste email thread or transcript"
        onClose={() => setPasteModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPasteModalOpen(false)}>
              Cancel
            </Button>
            {pastedText && (
              <Button variant="tertiary" onClick={() => setPastedText('')}>
                Remove text
              </Button>
            )}
            <Button onClick={() => setPasteModalOpen(false)} disabled={!pastedText.trim()}>
              Add to update
            </Button>
          </>
        }
      >
        <Field label="Email thread or transcript">
          <textarea
            value={pastedText}
            placeholder="Paste the source text here"
            rows={12}
            onChange={(event) => setPastedText(event.target.value)}
          />
        </Field>
        <p className="field-hint">This text is stored with the draft and submitted update.</p>
      </Modal>

      <Modal
        open={chartModalOpen}
        title="KPI performance trend"
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
                disabled={!selectedChartMeasure || chartValues.length === 0}
                onClick={() =>
                  setPendingChart({
                    id: `chart_${activeUserId}_${projectId}_${periodId}`,
                    type: chartType,
                    title: `${selectedChartMeasure?.name ?? 'KPI'} — plan vs actual`,
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
        <div className="manager-chart-controls">
          <Field label="KPI">
            <select
              aria-label="KPI to visualise"
              value={selectedChartMeasure?.id ?? ''}
              onChange={(event) => {
                setSelectedChartMeasureId(event.target.value);
                setPendingChart(null);
              }}
              disabled={Boolean(pendingChart)}
            >
              {chartableMeasures.map((measure) => (
                <option key={measure.id} value={measure.id}>
                  {measure.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Time range">
            <select
              aria-label="Chart time range"
              value={chartRange}
              onChange={(event) => {
                setChartRange(event.target.value);
                setPendingChart(null);
              }}
              disabled={Boolean(pendingChart)}
            >
              <option value="4">Last 4 weeks</option>
              <option value="6">Last 6 weeks</option>
              <option value="8">Last 8 weeks</option>
              <option value="quarter">Quarter / available history</option>
            </select>
          </Field>
          <Field label="Chart type">
            <select
              aria-label="Chart type"
              value={chartType}
              onChange={(event) => setChartType(event.target.value as ManagerChartType)}
              disabled={Boolean(pendingChart)}
            >
              <option value="line">Line chart</option>
              <option value="bar">Bar chart</option>
            </select>
          </Field>
        </div>
        {!pendingChart ? (
          <p>
            {chartValues.length
              ? `Atlas found ${chartValues.length} validated or current reporting values. The approved plan is shown as a separate series.`
              : 'Enter a current KPI value, or select a KPI with submitted history, to generate this chart.'}
          </p>
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
  const createPath = `${isCommercial ? '/reviews/weekly-update' : '/manager/weekly-updates'}?new=${managerUpdates.updates.length + 1}`;
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
      {update.performanceMeasures?.length ? (
        <Panel title="Performance against plan" className="section">
          <DataTable
            caption="Submitted performance against approved plan"
            headers={[
              'Measure',
              'Type',
              'Approved plan',
              'Previous',
              'Current',
              'Variance',
              'Status',
            ]}
            rows={update.performanceMeasures.map((measure) => [
              measure.name,
              measure.type,
              `${measure.approvedValue} ${measure.unit}`.trim(),
              measure.type === 'Milestone'
                ? measure.previousStatus.replaceAll('_', ' ')
                : `${measure.previousValue || '—'} ${measure.unit}`.trim(),
              measure.type === 'Milestone'
                ? `${measure.currentStatus.replaceAll('_', ' ')} · ${measure.currentProgress || 0}%`
                : `${measure.currentValue || '—'} ${measure.unit}`.trim(),
              measure.variance,
              <StatusBadge status={measure.status} />,
            ])}
          />
        </Panel>
      ) : update.metricInputs?.some((input) => input.value) ? (
        <Panel title="Department Performance Inputs" className="section">
          <DataTable
            caption="Submitted department performance values"
            headers={['Measure', 'Actual value', 'Unit']}
            rows={update.metricInputs
              .filter((input) => input.value)
              .map((input) => [input.label, input.value, input.unit])}
          />
        </Panel>
      ) : null}
      {deadlinePassed && update.status === 'submitted' && update.creatorId === activeUserId && (
        <div className="info-panel section" role="status">
          <strong>Reporting deadline passed</strong>
          <span>This submission is view only, but its discussion remains open.</span>
        </div>
      )}
      <Panel title="Highlights from last week" className="section">
        {update.highlights?.length ? (
          <ul className="manager-detail-list">
            {update.highlights.map((highlight) => (
              <li key={highlight.id}>
                <p>{highlight.text}</p>
                {highlight.linkedPlanItemIds.length > 0 && (
                  <small>
                    Linked:{' '}
                    {highlight.linkedPlanItemIds
                      .map(
                        (id) =>
                          update.performanceMeasures?.find((measure) => measure.planItemId === id)
                            ?.name ?? id,
                      )
                      .join(' · ')}
                  </small>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <StructuredSectionSummary update={update} section="highlights" />
            <p>{update.sections.highlights || 'No content added.'}</p>
          </>
        )}
      </Panel>
      {update.chart && (
        <Panel title="Generated Chart" className="section">
          <ChartPreview chart={update.chart} />
        </Panel>
      )}
      {update.activities ? (
        <Panel title="Ongoing activities" className="section">
          <DataTable
            caption="Submitted ongoing activities"
            headers={['Activity', 'Status', 'Progress', 'Expected completion', 'Blocker', 'Update']}
            rows={update.activities.map((activity) => [
              activity.activity,
              <StatusBadge status={activity.status} />,
              activity.progressPercent ? `${activity.progressPercent}%` : '—',
              activity.expectedCompletion || '—',
              activity.blocker || 'None',
              activity.narrative || '—',
            ])}
          />
        </Panel>
      ) : null}
      {update.previousCommitmentOutcomes && (
        <Panel title="Previous commitments and outcomes" className="section">
          {update.previousCommitmentOutcomes.length ? (
            <DataTable
              caption="Previous commitment outcomes"
              headers={[
                'Commitment',
                'Status',
                'Actual outcome',
                'Delay / blocker',
                'Revised forecast',
              ]}
              rows={update.previousCommitmentOutcomes.map((outcome) => [
                outcome.commitment,
                <StatusBadge status={outcome.status} />,
                outcome.actualOutcome || '—',
                outcome.delayReason || '—',
                outcome.revisedForecast || '—',
              ])}
            />
          ) : (
            <p className="empty-copy">No commitments were carried forward.</p>
          )}
        </Panel>
      )}
      {update.commitments ? (
        <Panel title="Plans / new commitments for next week" className="section">
          <DataTable
            caption="New weekly commitments"
            headers={[
              'Commitment',
              'Expected outcome',
              'Owner',
              'Due date',
              'Dependency',
              'Status',
            ]}
            rows={update.commitments.map((commitment) => [
              commitment.commitment,
              commitment.expectedOutcome,
              getUser(commitment.ownerId)?.name ?? 'Unassigned',
              commitment.dueDate || '—',
              commitment.dependency || 'None',
              <StatusBadge status={commitment.status} />,
            ])}
          />
        </Panel>
      ) : null}
      {update.structuredRisks ? (
        <Panel title="Risks and constraints" className="section">
          <DataTable
            caption="Submitted risks and constraints"
            headers={['Risk', 'Impact', 'Likelihood', 'Potential impact', 'Mitigation', 'Owner']}
            rows={update.structuredRisks.map((risk) => [
              risk.risk,
              risk.impact || '—',
              risk.likelihood,
              risk.potentialImpact || '—',
              risk.mitigation || '—',
              getUser(risk.ownerId)?.name ?? 'Unassigned',
            ])}
          />
        </Panel>
      ) : (
        <div className="manager-submission-sections section">
          {sectionDefinitions.slice(1).map((section) => (
            <Panel title={section.title} key={section.key}>
              <StructuredSectionSummary update={update} section={section.key} />
              <p>{update.sections[section.key] || 'No content added.'}</p>
            </Panel>
          ))}
        </div>
      )}
      {update.supportRequired && (
        <Panel title="Support or decisions required" className="section">
          <p>{update.supportRequired}</p>
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
                  <small>Prototype file metadata only · preview unavailable</small>
                </span>
                <StatusBadge status={attachment.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-copy">No supporting documents attached.</p>
        )}
        {update.pastedText && (
          <div className="manager-pasted-text">
            <strong>Pasted email thread or transcript</strong>
            <p>{update.pastedText}</p>
          </div>
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
