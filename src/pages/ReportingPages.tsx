import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  CircleAlert,
  FileSpreadsheet,
  FileText,
  FormInput,
  History,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { ContextControls } from '../components/Shells';
import {
  Button,
  DataTable,
  DetailLink,
  Drawer,
  Field,
  Modal,
  PageHeader,
  Panel,
  StatusBadge,
  useToast,
} from '../components/Ui';
import {
  atlas,
  format,
  getBusinessPlanDelivery,
  getCycle,
  getDepartment,
  getProductionKpis,
  getUser,
} from '../data/atlas';
import { useAtlas } from '../state/AtlasContext';
import {
  reportDepartmentName,
  getSubmissionBlockers,
  selectReadiness,
  selectCommitmentsForDepartment,
  selectPreviousReport,
  selectReportCommitments,
  selectReportSources,
  selectReportsForDepartment,
  selectSubmissionQueue,
  type ManagerCorrection,
  type SourceMethod,
  type SourceStatus,
  type WorkflowReport,
  type WeeklyUpdateContent,
  type WorkflowCommitment,
  type WorkflowSource,
} from '../state/workflow';

const methodDefinitions = [
  {
    id: 'structured_form',
    label: 'Structured form',
    detail: 'Guided departmental fields and validations',
    icon: FormInput,
  },
  { id: 'document_upload', label: 'Report upload', detail: 'PDF or DOCX report', icon: Upload },
  {
    id: 'xlsx_upload',
    label: 'Spreadsheet upload',
    detail: 'Atlas template or existing workbook',
    icon: FileSpreadsheet,
  },
  {
    id: 'paste_email_or_transcript',
    label: 'Manual entry or pasted transcript',
    detail: 'Email and Call Transcript are source types inside this method',
    icon: Mail,
  },
] as const;

const methodLabel = (method: string) =>
  methodDefinitions.find((definition) => definition.id === method)?.label ??
  method.replaceAll('_', ' ');

function prototypeTime(sequence: number) {
  return `2026-08-01T10:${String(sequence % 60).padStart(2, '0')}:00+01:00`;
}

function sourceId(method: SourceMethod, count: number) {
  return `src_phase2_${method}_${count + 1}`;
}

export function SourceMethodCards({
  selected,
  onToggle,
}: {
  selected: SourceMethod[];
  onToggle: (method: SourceMethod) => void;
}) {
  return (
    <div className="method-grid" data-testid="input-method-cards">
      {methodDefinitions.map(({ id, label, detail, icon: Icon }) => (
        <button
          key={id}
          className={`method-card ${selected.includes(id) ? 'is-selected' : ''}`}
          aria-pressed={selected.includes(id)}
          onClick={() => onToggle(id)}
        >
          <span className="method-card__icon">
            <Icon aria-hidden="true" />
          </span>
          <strong>{label}</strong>
          <small>{detail}</small>
          {selected.includes(id) && <Check className="method-card__check" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}

export function DepartmentDashboard() {
  const navigate = useNavigate();
  const { departmentId, cycleId, workflow } = useAtlas();
  const reports = selectReportsForDepartment(workflow, departmentId);
  const activeCycle = getCycle(cycleId);
  const returned = reports.filter((report) => report.status === 'needs_clarification');
  const commitments = selectCommitmentsForDepartment(workflow, departmentId);
  const dueCommitments = commitments.filter((commitment) =>
    ['in_progress', 'delayed', 'at_risk'].includes(commitment.status),
  );

  return (
    <>
      <PageHeader
        title="My Updates"
        description="Prepare, certify and track your department’s Weekly Execution Updates. Changes are stored only on this device for the prototype."
      />
      <div className="contributor-attention section">
        <Panel title="Current submission deadline">
          <strong>{activeCycle.label}</strong>
          <p>Submit by 3 Aug 2026 · 17:00 WAT.</p>
          <Button onClick={() => navigate('/department/reports/new')}>Continue update</Button>
        </Panel>
        <Panel title="Work requiring attention">
          <p>{dueCommitments.length} previous commitments are due or remain open.</p>
          <p>{returned.length} clarification requests require a response.</p>
        </Panel>
      </div>
      <Panel title="Update history" className="section">
        <DataTable
          caption="Department submission history"
          headers={[
            'Reporting period',
            'Business unit or project',
            'Submitted date',
            'Validation status',
            'Clarification required',
            'Commitments due',
            'Available action',
          ]}
          rows={reports.map((report) => [
            getCycle(report.cycleId).label,
            report.projectId
              ? (atlas.projects.find((project) => project.id === report.projectId)?.name ??
                'Project')
              : (atlas.businessUnits.find((unit) => unit.id === report.businessUnitId)?.name ??
                '—'),
            report.submittedAt ? format.date(report.submittedAt) : 'Not submitted',
            <StatusBadge status={report.status} />,
            report.status === 'needs_clarification' ? 'Yes' : 'No',
            String(
              commitments.filter((commitment) => report.commitmentIds.includes(commitment.id))
                .length,
            ),
            report.status === 'draft'
              ? 'Continue'
              : ['needs_clarification', 'rejected'].includes(report.status)
                ? 'Respond and revise'
                : 'View update',
          ])}
          onRowClick={(index) => navigate(`/department/reports/${reports[index].id}`)}
        />
      </Panel>
    </>
  );
}

interface MethodInputsProps {
  report: WorkflowReport;
  method: SourceMethod;
  onAdd: (source: WorkflowSource) => void;
}

function MethodInputs({ report, method, onAdd }: MethodInputsProps) {
  const { workflow } = useAtlas();
  const department = getDepartment(report.departmentId)!;
  const fixtureValues = Object.fromEntries(report.fields.map((field) => [field.key, field.value]));
  const fixtureExcerpt = report.fields
    .map((field) => `${field.label}: ${field.value}${field.unit ? ` ${field.unit}` : ''}`)
    .join('; ');
  const [structuredValues, setStructuredValues] = useState<Record<string, string>>(fixtureValues);
  const [narrative, setNarrative] = useState(
    `${department.name} position reconciled to the synthetic weekly fixture.`,
  );
  const [file, setFile] = useState<File | null>(null);
  const [workbookScenario, setWorkbookScenario] = useState('valid');
  const [subtype, setSubtype] = useState<'email' | 'call_transcript'>('email');
  const [subject, setSubject] = useState(`${department.name} weekly update`);
  const [content, setContent] = useState(fixtureExcerpt);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const addSource = (
    name: string,
    status: SourceStatus,
    reference: string,
    excerpt: string,
    extractedValues: Record<string, string>,
    sourceError?: string,
  ) => {
    const count = workflow.sources.length;
    onAdd({
      id: sourceId(method, count),
      reportId: report.id,
      method,
      subtype: method === 'paste_email_or_transcript' ? subtype : undefined,
      name,
      status,
      addedAt: prototypeTime(workflow.auditEvents.length + 1),
      reference,
      excerpt,
      extractedValues,
      error: sourceError,
    });
  };

  if (method === 'structured_form') {
    return (
      <Panel title="Structured form" className="method-input">
        <div className="form-grid">
          {report.fields.map((field) => (
            <Field
              key={field.key}
              label={`${field.label}${field.unit ? ` (${field.unit})` : ''}`}
              error={error && !structuredValues[field.key]?.trim() ? error : undefined}
            >
              <input
                aria-label={field.label}
                value={structuredValues[field.key] ?? ''}
                onChange={(event) =>
                  setStructuredValues((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
              />
            </Field>
          ))}
          <Field label="Reporting period">
            <input
              aria-label="Structured form reporting period"
              value={getCycle(report.cycleId).label}
              disabled
            />
          </Field>
        </div>
        <Field
          label={`${department.name} weekly narrative`}
          error={error && !narrative ? error : undefined}
        >
          <textarea
            aria-label={`${department.name} weekly narrative`}
            rows={3}
            value={narrative}
            onChange={(event) => setNarrative(event.target.value)}
            placeholder={`Explain the material ${department.name} position for this cycle.`}
          />
        </Field>
        <div className="form-actions">
          <Button
            onClick={() => {
              if (
                report.fields.some((field) => !structuredValues[field.key]?.trim()) ||
                !narrative.trim()
              ) {
                setError(`Every ${department.name} field and the weekly narrative are required.`);
                return;
              }
              setError('');
              addSource(
                `${department.name} structured return`,
                'extracted',
                `Structured Form > ${department.name} Weekly Position`,
                `${fixtureExcerpt}. ${narrative}`,
                { ...structuredValues, weeklyNarrative: narrative },
              );
            }}
          >
            Save Source
          </Button>
        </div>
      </Panel>
    );
  }

  if (method === 'document_upload') {
    return (
      <Panel title="Report upload · PDF or DOCX" className="method-input">
        <p>
          Deterministic fixture extraction only. Atlas does not perform live OCR or AI processing.
        </p>
        <Field label="Select PDF or DOCX" error={error || undefined}>
          <input
            aria-label="Select PDF or DOCX"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError('');
            }}
          />
        </Field>
        {processing && (
          <p className="processing-state" role="status">
            Processing deterministic document fixture…
          </p>
        )}
        <div className="form-actions">
          <Button
            disabled={processing}
            onClick={() => {
              if (!file) {
                setError('Choose a PDF or DOCX fixture.');
                return;
              }
              const extension = file.name.split('.').pop()?.toLowerCase();
              if (!['pdf', 'docx'].includes(extension ?? '')) {
                addSource(
                  file.name,
                  'unsupported',
                  'No reference',
                  '',
                  {},
                  'Unsupported file type. Use PDF or DOCX.',
                );
                setError('Unsupported file type. Use PDF or DOCX.');
                return;
              }
              setProcessing(true);
              window.setTimeout(() => {
                const failed = file.name.toLowerCase().includes('error');
                addSource(
                  file.name,
                  failed ? 'failed_extraction' : 'extracted',
                  failed ? 'Extraction unavailable' : `Page 2 · ${department.name} Summary`,
                  failed ? '' : fixtureExcerpt,
                  failed ? {} : fixtureValues,
                  failed
                    ? 'Fixture extraction failed. Replace the source or review manually.'
                    : undefined,
                );
                setProcessing(false);
              }, 250);
            }}
          >
            Process Document
          </Button>
        </div>
      </Panel>
    );
  }

  if (method === 'xlsx_upload') {
    return (
      <Panel title="Spreadsheet upload" className="method-input">
        <p>
          Mapping is deterministic and fixture-driven; no live spreadsheet intelligence is claimed.
        </p>
        <div className="form-grid">
          <Field label="Select XLSX workbook" error={error || undefined}>
            <input
              aria-label="Select XLSX workbook"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError('');
              }}
            />
          </Field>
          <Field label="Fixture scenario">
            <select
              aria-label="Workbook fixture scenario"
              value={workbookScenario}
              onChange={(event) => setWorkbookScenario(event.target.value)}
            >
              <option value="valid">Valid Atlas template</option>
              <option value="partial">Partial mapping</option>
              <option value="invalid">Invalid required columns</option>
              <option value="conflict">Conflicts with document value</option>
            </select>
          </Field>
        </div>
        <div className="form-actions">
          <Button
            onClick={() => {
              if (!file || !file.name.toLowerCase().endsWith('.xlsx')) {
                setError('Choose an XLSX workbook.');
                return;
              }
              const status = (
                workbookScenario === 'valid' ? 'extracted' : workbookScenario
              ) as SourceStatus;
              const conflict = workbookScenario === 'conflict';
              const primaryField = report.fields[0];
              const numericValue = Number(primaryField.value);
              const conflictValue = Number.isFinite(numericValue)
                ? String(Math.round(numericValue * 1.05))
                : `${primaryField.value} (conflict)`;
              addSource(
                file.name,
                status,
                `${department.name} Weekly Return!A2:D8`,
                conflict
                  ? `${primaryField.label}: ${conflictValue}; conflicts with ${primaryField.value}.`
                  : fixtureExcerpt,
                conflict ? { ...fixtureValues, [primaryField.key]: conflictValue } : fixtureValues,
                status === 'invalid'
                  ? `Required ${department.name} columns are missing.`
                  : status === 'partial'
                    ? 'Two rows are unmapped; valid rows were retained.'
                    : undefined,
              );
            }}
          >
            Save Mapping
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Manual entry or pasted transcript" className="method-input">
      <div className="form-grid">
        <Field label="Source type">
          <select
            aria-label="Paste source type"
            value={subtype}
            onChange={(event) => setSubtype(event.target.value as typeof subtype)}
          >
            <option value="email">Email</option>
            <option value="call_transcript">Call Transcript</option>
          </select>
        </Field>
        <Field label={subtype === 'email' ? 'Subject' : 'Call title'}>
          <input
            aria-label={subtype === 'email' ? 'Email subject' : 'Call title'}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </Field>
      </div>
      <Field label={subtype === 'email' ? 'Email body' : 'Transcript'} error={error || undefined}>
        <textarea
          aria-label={subtype === 'email' ? 'Email body' : 'Call transcript'}
          rows={5}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Paste the supplied synthetic fixture content."
        />
      </Field>
      <div className="form-actions">
        <Button
          onClick={() => {
            if (!subject.trim() || !content.trim()) {
              setError('Source type, title and content are required.');
              return;
            }
            setError('');
            addSource(
              `${subtype === 'email' ? 'Email' : 'Call transcript'} · ${subject}`,
              'extracted',
              subtype === 'email' ? 'Email body · paragraph 2' : 'Transcript · 00:12:14–00:13:02',
              content,
              fixtureValues,
            );
          }}
        >
          Process Content
        </Button>
      </div>
    </Panel>
  );
}

export function CreateReportPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const {
    activeUserId,
    businessUnitId,
    setBusinessUnitId,
    departmentId,
    cycleId,
    setCycleId,
    workflow,
    workflowDispatch,
  } = useAtlas();
  const department = getDepartment(departmentId)!;
  const report =
    workflow.reports.find(
      (item) =>
        item.departmentId === departmentId && item.cycleId === atlas.demoStates.defaultOpenCycleId,
    ) ?? workflow.reports.find((item) => item.departmentId === departmentId)!;
  const [selected, setSelected] = useState<SourceMethod[]>(report.methods);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState(report.title);
  const [objectiveId, setObjectiveId] = useState(
    report.strategicObjectiveIds[0] ?? atlas.strategicObjectives[0].id,
  );
  const [executionContext, setExecutionContext] = useState(
    report.projectId
      ? `project:${report.projectId}`
      : report.assetId
        ? `asset:${report.assetId}`
        : '',
  );
  const [activeMethods, setActiveMethods] = useState<SourceMethod[]>(report.methods);
  const [viewSource, setViewSource] = useState<WorkflowSource | null>(null);
  const [removeSource, setRemoveSource] = useState<WorkflowSource | null>(null);
  const [replaceSource, setReplaceSource] = useState<WorkflowSource | null>(null);
  const primaryField = report.fields[0];
  const [correctionValue, setCorrectionValue] = useState(primaryField.value);
  const [correctionReason, setCorrectionReason] = useState('');
  const [certified, setCertified] = useState(false);
  const [weekly, setWeekly] = useState<WeeklyUpdateContent>(report.weekly);
  const [commitmentDraft, setCommitmentDraft] = useState({
    description: '',
    ownerId: activeUserId,
    dueDate: '2026-08-09',
    expectedOutcome: '',
    linkedType: 'objective' as WorkflowCommitment['linkedType'],
    linkedId: objectiveId,
    status: 'not_started',
    delayReason: '',
    revisedForecast: '2026-08-09',
    evidence: '',
  });

  useEffect(() => {
    if (cycleId !== atlas.demoStates.defaultOpenCycleId) {
      setCycleId(atlas.demoStates.defaultOpenCycleId);
    }
  }, [cycleId, setCycleId]);

  const sources = selectReportSources(workflow, report.id);
  const commitments = selectCommitmentsForDepartment(workflow, departmentId);
  const reportCommitments = selectReportCommitments(workflow, report.id);
  const corrections = workflow.corrections.filter(
    (correction) => correction.reportId === report.id,
  );
  const hasConflict = sources.some((source) => source.status === 'conflict');
  const conflictResolved = corrections.some(
    (correction) => correction.fieldKey === primaryField.key,
  );
  const missingWarnings = sources.filter((source) => source.status === 'partial');
  const blockedReasons = getSubmissionBlockers(report, sources, corrections, certified);
  const canSubmit =
    blockedReasons.length === 0 &&
    ['draft', 'needs_clarification', 'rejected'].includes(report.status);

  const toggleMethod = (method: SourceMethod) =>
    setSelected((current) =>
      current.includes(method) ? current.filter((item) => item !== method) : [...current, method],
    );

  const addSource = (source: WorkflowSource) => {
    workflowDispatch({ type: 'ADD_SOURCE', source, actorId: activeUserId });
    showToast(`${source.name} added to the report`);
  };

  return (
    <>
      <ol className="steps" aria-label="Update creation progress">
        <li className={step === 1 ? 'is-active' : 'is-complete'}>
          <span>{step === 1 ? '1' : <Check aria-hidden="true" />}</span>Context & methods
        </li>
        <li className={step === 2 ? 'is-active' : ''}>
          <span>{step === 3 ? <Check aria-hidden="true" /> : '2'}</span>Weekly update
        </li>
        <li className={step === 3 ? 'is-active' : ''}>
          <span>3</span>Review & submit
        </li>
      </ol>
      <PageHeader
        title={
          step === 1
            ? 'Step 1 of 3 — Context & methods'
            : step === 2
              ? 'Step 2 of 3 — Weekly update'
              : 'Step 3 of 3 — Review & submit'
        }
      />
      {step === 1 ? (
        <>
          <Panel title="1–4. Confirm update context" className="section">
            <div className="form-grid">
              <Field label="1. Confirm department">
                <input value={department.name} disabled aria-label="Department" />
              </Field>
              <Field label="Business unit">
                <select
                  aria-label="Business unit"
                  value={businessUnitId}
                  onChange={(event) => setBusinessUnitId(event.target.value)}
                >
                  {atlas.businessUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Strategic objective (optional)">
                <select
                  value={objectiveId}
                  onChange={(event) => setObjectiveId(event.target.value)}
                >
                  {atlas.strategicObjectives.map((objective) => (
                    <option key={objective.id} value={objective.id}>
                      {objective.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Project or asset (optional)">
                <select
                  aria-label="Project or asset (optional)"
                  value={executionContext}
                  onChange={(event) => setExecutionContext(event.target.value)}
                >
                  <option value="">Not project-specific</option>
                  {atlas.assets.map((asset) => (
                    <option key={asset.id} value={`asset:${asset.id}`}>
                      {asset.label}
                    </option>
                  ))}
                  {atlas.projects.map((project) => (
                    <option key={project.id} value={`project:${project.id}`}>
                      {project.name}
                    </option>
                  ))}
                </select>
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
                {primaryField.label}: {primaryField.value} {primaryField.unit}. Baseline changes
                require a Commercial Manager request.
              </span>
            </div>
          </Panel>
          <section className="section" aria-labelledby="method-title">
            <div className="section-heading">
              <div>
                <h2 id="method-title">5. Select one or more submission methods</h2>
                <p>
                  Select one or more methods. Several sources of the same method can be added in
                  Content.
                </p>
              </div>
            </div>
            <SourceMethodCards selected={selected} onToggle={toggleMethod} />
            <div className="form-actions">
              <Button variant="secondary" onClick={() => navigate('/department')}>
                Cancel
              </Button>
              <Button
                disabled={!title.trim() || selected.length === 0}
                onClick={() => {
                  workflowDispatch({
                    type: 'UPDATE_REPORT_DETAILS',
                    reportId: report.id,
                    title,
                    methods: selected,
                    businessUnitId,
                    strategicObjectiveIds: [objectiveId],
                    projectId: executionContext.startsWith('project:')
                      ? executionContext.replace('project:', '')
                      : null,
                    assetId: executionContext.startsWith('asset:')
                      ? executionContext.replace('asset:', '')
                      : null,
                  });
                  setActiveMethods(selected);
                  setStep(2);
                }}
              >
                Continue
              </Button>
            </div>
          </section>
        </>
      ) : step === 2 ? (
        <>
          <Panel title="6. Update commitments due from the previous period" className="section">
            {commitments.length === 0 ? (
              <div className="compact-empty">
                <History />
                <p>No previous commitments are due for this department.</p>
              </div>
            ) : (
              <div className="commitment-comparisons">
                {commitments.map((commitment) => {
                  const outcome = weekly.previousCommitmentOutcomes.find(
                    (item) => item.commitmentId === commitment.id,
                  ) ?? {
                    commitmentId: commitment.id,
                    currentOutcome: '',
                    explanation: '',
                    newForecast: commitment.revisedForecast || commitment.dueDate,
                    status: commitment.status,
                    delayReason: commitment.delayReason,
                    evidenceIds: commitment.evidenceIds,
                  };
                  const updateOutcome = (changes: Partial<typeof outcome>) =>
                    setWeekly((current) => ({
                      ...current,
                      previousCommitmentOutcomes: [
                        ...current.previousCommitmentOutcomes.filter(
                          (item) => item.commitmentId !== commitment.id,
                        ),
                        { ...outcome, ...changes },
                      ],
                    }));
                  return (
                    <article className="commitment-comparison" key={commitment.id}>
                      <div>
                        <small>Previous commitment</small>
                        <strong>{commitment.description}</strong>
                        <span>Expected: {commitment.expectedOutcome}</span>
                      </div>
                      <Field label="Current outcome">
                        <textarea
                          rows={2}
                          value={outcome.currentOutcome}
                          onChange={(event) =>
                            updateOutcome({ currentOutcome: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Explanation">
                        <textarea
                          rows={2}
                          value={outcome.explanation}
                          onChange={(event) => updateOutcome({ explanation: event.target.value })}
                        />
                      </Field>
                      <Field label="New forecast">
                        <input
                          type="date"
                          value={outcome.newForecast}
                          onChange={(event) => updateOutcome({ newForecast: event.target.value })}
                        />
                      </Field>
                      <Field label="Status">
                        <select
                          value={outcome.status}
                          onChange={(event) => updateOutcome({ status: event.target.value })}
                        >
                          <option value="complete">Complete</option>
                          <option value="in_progress">In progress</option>
                          <option value="delayed">Delayed</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </Field>
                      <Field label="Evidence reference">
                        <input
                          value={outcome.evidenceIds.join(', ')}
                          onChange={(event) =>
                            updateOutcome({
                              evidenceIds: event.target.value
                                .split(',')
                                .map((value) => value.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </Field>
                      {['delayed', 'blocked'].includes(outcome.status) && (
                        <Field label="Delay reason">
                          <input
                            value={outcome.delayReason}
                            onChange={(event) => updateOutcome({ delayReason: event.target.value })}
                          />
                        </Field>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="7. Enter this week’s execution position" className="section">
            <div className="form-grid form-grid--wide">
              {[
                ['Executive highlight', 'executiveHighlight'],
                ['KPI updates', 'kpiUpdates'],
                ['Risks and constraints', 'risksAndConstraints'],
                ['Forecast changes', 'forecastChanges'],
                ['Plans for next week', 'nextWeekPlan'],
                ['Support or decision required', 'supportRequired'],
              ].map(([label, key]) => (
                <Field key={key} label={label}>
                  <textarea
                    rows={3}
                    value={weekly[key as keyof WeeklyUpdateContent] as string}
                    onChange={(event) =>
                      setWeekly((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                </Field>
              ))}
            </div>
            <div className="activity-selector">
              <strong>Activities completed and ongoing operational activities</strong>
              {atlas.operationalActivities
                .filter((activity) => activity.departmentId === departmentId)
                .map((activity) => (
                  <article key={activity.id}>
                    <div>
                      <strong>{activity.title}</strong>
                      <small>
                        {activity.progressPercent}% complete · {activity.blocker || 'No blocker'}
                      </small>
                    </div>
                    <label>
                      <input
                        type="checkbox"
                        checked={weekly.completedActivityIds.includes(activity.id)}
                        onChange={(event) =>
                          setWeekly((current) => ({
                            ...current,
                            completedActivityIds: event.target.checked
                              ? [...current.completedActivityIds, activity.id]
                              : current.completedActivityIds.filter((id) => id !== activity.id),
                          }))
                        }
                      />
                      Completed
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={weekly.ongoingActivityIds.includes(activity.id)}
                        onChange={(event) =>
                          setWeekly((current) => ({
                            ...current,
                            ongoingActivityIds: event.target.checked
                              ? [...current.ongoingActivityIds, activity.id]
                              : current.ongoingActivityIds.filter((id) => id !== activity.id),
                          }))
                        }
                      />
                      Ongoing
                    </label>
                  </article>
                ))}
            </div>
          </Panel>

          <Panel title="8. Add new commitments" className="section">
            <div className="form-grid">
              <Field label="Description">
                <textarea
                  rows={2}
                  value={commitmentDraft.description}
                  onChange={(event) =>
                    setCommitmentDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Owner">
                <select
                  value={commitmentDraft.ownerId}
                  onChange={(event) =>
                    setCommitmentDraft((current) => ({ ...current, ownerId: event.target.value }))
                  }
                >
                  {atlas.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Due date">
                <input
                  type="date"
                  value={commitmentDraft.dueDate}
                  onChange={(event) =>
                    setCommitmentDraft((current) => ({
                      ...current,
                      dueDate: event.target.value,
                      revisedForecast: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Expected outcome">
                <textarea
                  rows={2}
                  value={commitmentDraft.expectedOutcome}
                  onChange={(event) =>
                    setCommitmentDraft((current) => ({
                      ...current,
                      expectedOutcome: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Linked objective, KPI, activity, milestone or risk">
                <select
                  value={`${commitmentDraft.linkedType}:${commitmentDraft.linkedId}`}
                  onChange={(event) => {
                    const [linkedType, linkedId] = event.target.value.split(':');
                    setCommitmentDraft((current) => ({
                      ...current,
                      linkedType: linkedType as WorkflowCommitment['linkedType'],
                      linkedId,
                    }));
                  }}
                >
                  {atlas.strategicObjectives.map((item) => (
                    <option key={item.id} value={`objective:${item.id}`}>
                      {item.name}
                    </option>
                  ))}
                  {atlas.kpiDefinitions.map((item) => (
                    <option key={item.id} value={`kpi:${item.id}`}>
                      {item.name}
                    </option>
                  ))}
                  {atlas.operationalActivities.map((item) => (
                    <option key={item.id} value={`activity:${item.id}`}>
                      {item.title}
                    </option>
                  ))}
                  {atlas.milestones.map((item) => (
                    <option key={item.id} value={`milestone:${item.id}`}>
                      {item.name}
                    </option>
                  ))}
                  {atlas.executionRisks.map((item) => (
                    <option key={item.id} value={`risk:${item.id}`}>
                      {item.description}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={commitmentDraft.status}
                  onChange={(event) =>
                    setCommitmentDraft((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  <option value="not_started">Not started</option>
                  <option value="in_progress">In progress</option>
                  <option value="at_risk">At risk</option>
                </select>
              </Field>
              {['at_risk', 'delayed'].includes(commitmentDraft.status) && (
                <Field label="Delay reason">
                  <input
                    value={commitmentDraft.delayReason}
                    onChange={(event) =>
                      setCommitmentDraft((current) => ({
                        ...current,
                        delayReason: event.target.value,
                      }))
                    }
                  />
                </Field>
              )}
              <Field label="Revised forecast">
                <input
                  type="date"
                  value={commitmentDraft.revisedForecast}
                  onChange={(event) =>
                    setCommitmentDraft((current) => ({
                      ...current,
                      revisedForecast: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Revision count">
                <input value="0" disabled aria-label="Revision count" />
              </Field>
              <Field label="Evidence reference">
                <input
                  value={commitmentDraft.evidence}
                  onChange={(event) =>
                    setCommitmentDraft((current) => ({ ...current, evidence: event.target.value }))
                  }
                  placeholder="Optional evidence record or source reference"
                />
              </Field>
            </div>
            <Button
              variant="secondary"
              disabled={
                !commitmentDraft.description.trim() || !commitmentDraft.expectedOutcome.trim()
              }
              onClick={() => {
                const id = `commitment_phase2_${workflow.commitments.length + 1}`;
                workflowDispatch({
                  type: 'ADD_COMMITMENT',
                  actorId: activeUserId,
                  now: prototypeTime(workflow.auditEvents.length + 1),
                  commitment: {
                    id,
                    reportId: report.id,
                    description: commitmentDraft.description,
                    ownerId: commitmentDraft.ownerId,
                    departmentId,
                    dueDate: commitmentDraft.dueDate,
                    expectedOutcome: commitmentDraft.expectedOutcome,
                    linkedType: commitmentDraft.linkedType,
                    linkedId: commitmentDraft.linkedId,
                    status: commitmentDraft.status,
                    delayReason: commitmentDraft.delayReason,
                    revisedForecast: commitmentDraft.revisedForecast,
                    evidenceIds: commitmentDraft.evidence ? [commitmentDraft.evidence] : [],
                    revisionCount: 0,
                  },
                });
                setCommitmentDraft((current) => ({
                  ...current,
                  description: '',
                  expectedOutcome: '',
                  evidence: '',
                }));
                showToast('Commitment added to this Weekly Execution Update');
              }}
            >
              <Plus /> Add commitment
            </Button>
          </Panel>

          <section className="section" aria-labelledby="content-method-title">
            <div className="section-heading">
              <div>
                <h2 id="content-method-title">9. Add supporting evidence</h2>
                <p>
                  Each input creates a deterministic source record with its own processing state.
                </p>
              </div>
            </div>
            <div className="method-inputs">
              {activeMethods.map((method) => (
                <MethodInputs key={method} report={report} method={method} onAdd={addSource} />
              ))}
            </div>
          </section>
          <Panel
            title="Add another source"
            className="section"
            action={<span className="prototype-label">Device-local simulation</span>}
          >
            <p>
              Select a method to reveal another input. Existing method types can be used repeatedly.
            </p>
            <div className="inline-methods">
              {methodDefinitions.map((definition) => (
                <Button
                  key={definition.id}
                  variant="secondary"
                  onClick={() =>
                    setActiveMethods((current) =>
                      current.includes(definition.id) ? current : [...current, definition.id],
                    )
                  }
                >
                  <Plus aria-hidden="true" />
                  {definition.label}
                </Button>
              ))}
            </div>
          </Panel>
          <div className="content-split section">
            <Panel title="Original sources">
              {sources.length === 0 ? (
                <div className="compact-empty">
                  <FileText />
                  <p>No sources added yet.</p>
                </div>
              ) : (
                <div className="source-list">
                  {sources.map((source) => (
                    <article className="source-item source-item--actions" key={source.id}>
                      <FileText aria-hidden="true" />
                      <div>
                        <strong>{source.name}</strong>
                        <small>
                          {methodLabel(source.method)} · {source.reference}
                        </small>
                        {source.error && <small className="critical-text">{source.error}</small>}
                      </div>
                      <StatusBadge status={source.status} />
                      <div className="source-actions">
                        <Button variant="tertiary" onClick={() => setViewSource(source)}>
                          View
                        </Button>
                        <Button variant="tertiary" onClick={() => setReplaceSource(source)}>
                          Replace
                        </Button>
                        <Button
                          variant="tertiary"
                          onClick={() => setRemoveSource(source)}
                          aria-label={`Remove ${source.name}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
            <Panel title="Atlas standardised Weekly Execution Update">
              {missingWarnings.map((source) => (
                <div className="warning-banner" key={source.id}>
                  <CircleAlert />
                  {source.error}
                </div>
              ))}
              {hasConflict && !conflictResolved && (
                <div className="conflict-card" data-testid="source-conflict">
                  <header>
                    <AlertTriangle />
                    <strong>Conflicting {primaryField.label.toLowerCase()} values</strong>
                  </header>
                  <div className="conflict-values">
                    <div>
                      <small>Document / structured sources</small>
                      <strong>
                        {primaryField.value} {primaryField.unit}
                      </strong>
                      <span>{department.name} structured return</span>
                    </div>
                    <div>
                      <small>Conflicting XLSX source</small>
                      <strong>
                        {sources.find((source) => source.status === 'conflict')?.extractedValues[
                          primaryField.key
                        ] ?? 'Conflicting value'}{' '}
                        {primaryField.unit}
                      </strong>
                      <span>{department.name} Weekly Return!A2:D8</span>
                    </div>
                  </div>
                  <Field label="Authoritative or corrected value">
                    <input
                      aria-label="Authoritative or corrected value"
                      value={correctionValue}
                      onChange={(event) => setCorrectionValue(event.target.value)}
                    />
                  </Field>
                  <Field label="Required correction reason">
                    <textarea
                      aria-label="Required correction reason"
                      rows={2}
                      value={correctionReason}
                      onChange={(event) => setCorrectionReason(event.target.value)}
                    />
                  </Field>
                  <Button
                    disabled={!correctionValue.trim() || !correctionReason.trim()}
                    onClick={() => {
                      const conflictSource = sources.find(
                        (source) => source.status === 'conflict',
                      )!;
                      const correction: ManagerCorrection = {
                        id: `correction_${workflow.corrections.length + 1}`,
                        reportId: report.id,
                        fieldKey: primaryField.key,
                        fieldLabel: primaryField.label,
                        sourceId: conflictSource.id,
                        originalValue:
                          conflictSource.extractedValues[primaryField.key] ?? primaryField.value,
                        correctedValue: correctionValue,
                        reason: correctionReason,
                        actorId: activeUserId,
                        timestamp: prototypeTime(workflow.auditEvents.length + 1),
                      };
                      workflowDispatch({ type: 'CORRECT_FIELD', correction });
                      showToast('Conflict resolved; original values retained in audit history');
                    }}
                  >
                    Resolve conflict
                  </Button>
                </div>
              )}
              {conflictResolved && (
                <div className="success-banner">
                  <ShieldCheck />
                  Conflict resolved with an auditable manager correction.
                </div>
              )}
              <dl className="metric-review">
                {report.fields.map((field) => {
                  const correction = [...corrections]
                    .reverse()
                    .find((item) => item.fieldKey === field.key);
                  return (
                    <div key={field.key}>
                      <dt>{field.label}</dt>
                      <dd>
                        {field.key.toLowerCase().includes('usd')
                          ? format.usd(Number(field.value))
                          : `${field.value}${field.unit ? ` ${field.unit}` : ''}`}
                      </dd>
                      <small>
                        Source: {field.sourceIds.join(', ')} · {Math.round(field.confidence * 100)}%
                        confidence
                      </small>
                      {correction && (
                        <small className="audit-note">
                          Original {correction.originalValue}; corrected by manager because “
                          {correction.reason}”.
                        </small>
                      )}
                    </div>
                  );
                })}
              </dl>
            </Panel>
          </div>
          <Panel className="section">
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => {
                  workflowDispatch({
                    type: 'UPDATE_WEEKLY_CONTENT',
                    reportId: report.id,
                    content: weekly,
                    actorId: activeUserId,
                    now: prototypeTime(workflow.auditEvents.length + 1),
                  });
                  weekly.previousCommitmentOutcomes.forEach((outcome, index) =>
                    workflowDispatch({
                      type: 'UPDATE_COMMITMENT_OUTCOME',
                      reportId: report.id,
                      outcome,
                      actorId: activeUserId,
                      now: prototypeTime(workflow.auditEvents.length + index + 2),
                    }),
                  );
                  setStep(3);
                }}
              >
                Review structured information
              </Button>
            </div>
          </Panel>
        </>
      ) : (
        <>
          <Panel title="10. Review structured information" className="section review-summary">
            <dl className="summary-list">
              <div>
                <dt>Department</dt>
                <dd>{department.name}</dd>
              </div>
              <div>
                <dt>Business unit</dt>
                <dd>{atlas.businessUnits.find((item) => item.id === businessUnitId)?.name}</dd>
              </div>
              <div>
                <dt>Reporting period</dt>
                <dd>{getCycle(cycleId).label}</dd>
              </div>
              <div>
                <dt>Submission methods</dt>
                <dd>{selected.map(methodLabel).join(' · ')}</dd>
              </div>
              <div>
                <dt>Project / asset</dt>
                <dd>{executionContext || 'Not project-specific'}</dd>
              </div>
              <div>
                <dt>Evidence sources</dt>
                <dd>{sources.length}</dd>
              </div>
            </dl>
            <div className="structured-review-grid">
              <div>
                <small>Executive highlight</small>
                <p>{weekly.executiveHighlight}</p>
              </div>
              <div>
                <small>KPI updates</small>
                <p>{weekly.kpiUpdates}</p>
              </div>
              <div>
                <small>Activities completed</small>
                <p>{weekly.completedActivityIds.length}</p>
              </div>
              <div>
                <small>Ongoing activities</small>
                <p>{weekly.ongoingActivityIds.length}</p>
              </div>
              <div>
                <small>Previous commitments and outcomes</small>
                <p>{weekly.previousCommitmentOutcomes.length}</p>
              </div>
              <div>
                <small>New commitments</small>
                <p>{reportCommitments.filter((item) => item.reportId === report.id).length}</p>
              </div>
              <div>
                <small>Risks and constraints</small>
                <p>{weekly.risksAndConstraints}</p>
              </div>
              <div>
                <small>Forecast changes</small>
                <p>{weekly.forecastChanges}</p>
              </div>
              <div>
                <small>Plans for next week</small>
                <p>{weekly.nextWeekPlan}</p>
              </div>
              <div>
                <small>Support or decision required</small>
                <p>{weekly.supportRequired}</p>
              </div>
            </div>
          </Panel>
          <Panel title="11. Certify and submit" className="section certification">
            <label>
              <input
                type="checkbox"
                checked={certified}
                onChange={(event) => setCertified(event.target.checked)}
              />
              I confirm that I reviewed the structured information and it accurately represents the
              department’s position.
            </label>
            {blockedReasons.length > 0 && (
              <div className="blocking-list" role="status">
                <strong>Submission unavailable</strong>
                <ul>
                  {blockedReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                disabled={!canSubmit}
                onClick={() => {
                  workflowDispatch({
                    type: 'SUBMIT_REPORT',
                    reportId: report.id,
                    actorId: activeUserId,
                    now: prototypeTime(workflow.auditEvents.length + 1),
                  });
                  showToast(
                    report.status === 'needs_clarification'
                      ? 'Update resubmitted to Commercial'
                      : 'Update submitted to Commercial review',
                  );
                  navigate(`/department/reports/${report.id}`);
                }}
              >
                Submit Update
              </Button>
            </div>
          </Panel>
        </>
      )}

      <Drawer
        title={viewSource?.name ?? ''}
        open={Boolean(viewSource)}
        onClose={() => setViewSource(null)}
      >
        {viewSource && (
          <>
            <StatusBadge status={viewSource.status} />
            <h3>Source reference</h3>
            <p>{viewSource.reference}</p>
            <h3>Original excerpt</h3>
            <blockquote>
              {viewSource.excerpt || 'No excerpt available for this failed fixture.'}
            </blockquote>
            <div className="info-panel">
              <strong>Synthetic fixture</strong>
              <span>No live OCR, AI, email, call, or spreadsheet integration is used.</span>
            </div>
          </>
        )}
      </Drawer>
      <Modal
        title="Remove source"
        open={Boolean(removeSource)}
        onClose={() => setRemoveSource(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveSource(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!removeSource) return;
                workflowDispatch({
                  type: 'REMOVE_SOURCE',
                  reportId: report.id,
                  sourceId: removeSource.id,
                  actorId: activeUserId,
                  now: prototypeTime(workflow.auditEvents.length + 1),
                });
                setRemoveSource(null);
                showToast('Source removed; dependent fields revalidated', 'warning');
              }}
            >
              Remove source
            </Button>
          </>
        }
      >
        <p>
          Removing this source may make standardised fields missing or change their value. Its
          removal remains in audit history.
        </p>
      </Modal>
      <Modal
        title="Replace source"
        open={Boolean(replaceSource)}
        onClose={() => setReplaceSource(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReplaceSource(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!replaceSource) return;
                const replacement = {
                  ...replaceSource,
                  id: `${replaceSource.id}_replacement_${workflow.sources.length}`,
                  name: `${replaceSource.name} · replacement`,
                  status: 'extracted' as const,
                  addedAt: prototypeTime(workflow.auditEvents.length + 1),
                  error: undefined,
                };
                workflowDispatch({
                  type: 'REPLACE_SOURCE',
                  reportId: report.id,
                  sourceId: replaceSource.id,
                  replacement,
                  actorId: activeUserId,
                });
                setReplaceSource(null);
                showToast('Replacement processed; prior source retained in audit history');
              }}
            >
              Use deterministic replacement
            </Button>
          </>
        }
      >
        <p>
          The current extraction references will be superseded, not deleted. This prototype uses a
          deterministic replacement fixture.
        </p>
      </Modal>
    </>
  );
}

export function DepartmentReportReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const { activeUserId, workflow, workflowDispatch } = useAtlas();
  const report = workflow.reports.find((item) => item.id === id);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [recertified, setRecertified] = useState(false);
  if (!report)
    return (
      <Panel title="Update unavailable">
        <p>The requested synthetic report fixture was not found.</p>
      </Panel>
    );
  const sources = selectReportSources(workflow, report.id);
  const comments = workflow.comments.filter((comment) => comment.reportId === report.id);
  const corrections = workflow.corrections.filter(
    (correction) => correction.reportId === report.id,
  );
  const auditEvents = workflow.auditEvents.filter(
    (event) => event.entityId === report.id || report.sourceIds.includes(event.entityId),
  );
  const openComments = comments.filter((comment) => comment.status === 'open');
  const canResubmit =
    report.status === 'needs_clarification' && openComments.length === 0 && recertified;
  const readOnly = ['submitted', 'resubmitted', 'approved', 'published_locked'].includes(
    report.status,
  );

  return (
    <>
      <PageHeader
        title={report.title}
        description={`${reportDepartmentName(report)} · ${getCycle(report.cycleId).label}`}
        controls={
          <>
            <StatusBadge status={report.status} />
            {report.status === 'published_locked' && (
              <Button
                onClick={() => {
                  const revisionNumber =
                    workflow.reports.filter((item) => item.supersedesReportId === report.id)
                      .length + 1;
                  workflowDispatch({
                    type: 'CREATE_REVISION',
                    reportId: report.id,
                    actorId: activeUserId,
                    now: prototypeTime(workflow.auditEvents.length + 1),
                  });
                  navigate(`/department/reports/${report.id}_revision_${revisionNumber}`);
                  showToast('Auditable revision created; the published update remains unchanged');
                }}
              >
                Create revision
              </Button>
            )}
          </>
        }
      />
      {readOnly && (
        <div className="info-panel page-notice">
          <strong>Read-only</strong>
          <span>
            {report.status === 'published_locked'
              ? 'This published snapshot is immutable. Create a revision for any later correction.'
              : 'This update is locked for the Department Manager while Commercial review is in progress.'}
          </span>
        </div>
      )}
      {report.status === 'rejected' && (
        <div className="warning-banner page-notice">
          <CircleAlert />
          Commercial rejected this update. Revise its structured information and resubmit it for
          review.
          <Button onClick={() => navigate('/department/reports/new')}>Revise update</Button>
        </div>
      )}
      <div className="review-layout section">
        <Panel title="Update and source evidence">
          <dl className="metric-review">
            {report.fields.map((field) => (
              <div key={field.key}>
                <dt>{field.label}</dt>
                <dd>
                  {field.value} {field.unit}
                </dd>
                <small>
                  Sources: {field.sourceIds.join(', ')} · {Math.round(field.confidence * 100)}%
                  confidence
                </small>
              </div>
            ))}
          </dl>
          <h3>Sources</h3>
          {sources.map((source) => (
            <article className="source-item" key={source.id}>
              <FileText />
              <div>
                <strong>{source.name}</strong>
                <small>{source.reference}</small>
              </div>
              <StatusBadge status={source.status} />
            </article>
          ))}
        </Panel>
        <div className="review-stack">
          <Panel title="Commercial comments">
            {comments.length === 0 ? (
              <p>No Commercial comments.</p>
            ) : (
              comments.map((comment) => (
                <article className="comment-card" key={comment.id}>
                  <StatusBadge status={comment.status} />
                  <strong>{comment.field}</strong>
                  <p>{comment.question}</p>
                  {comment.response && (
                    <div className="response">
                      <small>Department response</small>
                      <p>{comment.response}</p>
                    </div>
                  )}
                  {comment.status === 'open' && (
                    <>
                      <Field label="Response">
                        <textarea
                          aria-label={`Response to ${comment.field}`}
                          rows={3}
                          value={responses[comment.id] ?? ''}
                          onChange={(event) =>
                            setResponses((current) => ({
                              ...current,
                              [comment.id]: event.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Button
                        disabled={!responses[comment.id]?.trim()}
                        onClick={() => {
                          workflowDispatch({
                            type: 'RESPOND_CLARIFICATION',
                            reportId: report.id,
                            commentId: comment.id,
                            response: responses[comment.id],
                            actorId: activeUserId,
                            now: prototypeTime(workflow.auditEvents.length + 1),
                          });
                          showToast('Clarification response saved');
                        }}
                      >
                        Save response
                      </Button>
                    </>
                  )}
                </article>
              ))
            )}
          </Panel>
          <Panel title="Corrections and audit history">
            {corrections.map((correction) => (
              <article className="audit-item" key={correction.id}>
                <RefreshCw />
                <div>
                  <strong>
                    {correction.fieldLabel}: {correction.originalValue} →{' '}
                    {correction.correctedValue}
                  </strong>
                  <small>
                    {correction.reason} · {format.date(correction.timestamp)}
                  </small>
                </div>
              </article>
            ))}
            {auditEvents.map((event) => (
              <article className="audit-item" key={event.id}>
                <History />
                <div>
                  <strong>{event.summary}</strong>
                  <small>
                    {event.actorRole.replaceAll('_', ' ')} · {format.date(event.timestamp)}
                  </small>
                </div>
              </article>
            ))}
          </Panel>
        </div>
      </div>
      {report.status === 'needs_clarification' && (
        <Panel className="section certification">
          <label>
            <input
              type="checkbox"
              checked={recertified}
              onChange={(event) => setRecertified(event.target.checked)}
            />
            I re-certify this report and confirm that every Commercial question has been answered.
          </label>
          {!canResubmit && (
            <p className="critical-text">
              Answer every open question and re-certify before resubmitting.
            </p>
          )}
          <div className="form-actions">
            <Button variant="secondary" onClick={() => navigate('/department')}>
              Back to dashboard
            </Button>
            <Button
              disabled={!canResubmit}
              onClick={() => {
                workflowDispatch({
                  type: 'SUBMIT_REPORT',
                  reportId: report.id,
                  actorId: activeUserId,
                  now: prototypeTime(workflow.auditEvents.length + 1),
                });
                showToast('Update resubmitted with changes highlighted');
              }}
            >
              Resubmit Update
            </Button>
          </div>
        </Panel>
      )}
    </>
  );
}

export function CommercialDashboard() {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');
  const { activeUserId, businessUnitId, cycleId, workflow, workflowDispatch } = useAtlas();
  const showToast = useToast();
  const readiness = selectReadiness(workflow, cycleId);
  const publication = workflow.publications.find((item) => item.cycleId === cycleId);
  const isPublished = publication?.status === 'published_locked';
  const canPublish =
    !isPublished &&
    (readiness.reportingReadinessPercent === 100 ||
      Boolean(publication?.controlledExceptionReason));
  const production = getProductionKpis();
  const businessDelivery = getBusinessPlanDelivery(businessUnitId);
  const objectivesNeedingAttention = businessDelivery.objectives.filter((objective) =>
    ['critical', 'at_risk', 'needs_attention'].includes(objective.status),
  ).length;
  const queue = selectSubmissionQueue(workflow, cycleId);
  const returned = queue.filter((report) => report.status === 'needs_clarification');
  const submitted = queue.filter((report) => ['submitted', 'resubmitted'].includes(report.status));
  return (
    <>
      <PageHeader
        title="Business Overview"
        description="Resolve reporting exceptions and prepare the next decision-ready executive update."
        controls={
          <>
            <ContextControls />
            <Button
              disabled={isPublished}
              onClick={() => {
                setNarrative(publication?.executiveNarrative ?? '');
                setExceptionReason(publication?.controlledExceptionReason ?? '');
                setPublishOpen(true);
              }}
              title={isPublished ? 'This cycle is published and immutable.' : undefined}
            >
              {isPublished ? 'Published · locked' : 'Prepare publication'}
            </Button>
          </>
        }
      />
      <div className="commercial-top">
        <Panel title="Business Health">
          <div className="metric-large">
            <StatusBadge status={businessDelivery.status} />
            <strong>{businessDelivery.deliveryPercent}%</strong>
            <span>Business-plan delivery</span>
            <small>
              {objectivesNeedingAttention} of {businessDelivery.objectives.length} objectives need
              attention
            </small>
          </div>
        </Panel>
        <Panel title="Overall project status">
          <div className="metric-large">
            <StatusBadge status={atlas.executiveSummary.overallStatus} />
            <strong>2 on track</strong>
            <span>1 at risk · 1 delayed</span>
          </div>
          <DetailLink onClick={() => navigate('/projects')}>Project breakdown</DetailLink>
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
            {submitted.map((report) => (
              <button key={report.id} onClick={() => navigate(`/commercial/review/${report.id}`)}>
                <span>
                  <StatusBadge status={report.status} />
                  <strong>{reportDepartmentName(report)} submission awaiting review</strong>
                </span>
                <small>{report.sourceIds.length} sources</small>
              </button>
            ))}
            {returned.map((report) => (
              <button key={report.id} onClick={() => navigate(`/commercial/review/${report.id}`)}>
                <span>
                  <StatusBadge status={report.status} />
                  <strong>{reportDepartmentName(report)} clarification outstanding</strong>
                </span>
                <small>Returned to department</small>
              </button>
            ))}
            {queue.length === 0 && <p>No submission exceptions for this period.</p>}
          </div>
        </Panel>
        <Panel title="Today’s priorities">
          <div className="action-list">
            {queue.slice(0, 4).map((report) => (
              <button key={report.id} onClick={() => navigate(`/commercial/review/${report.id}`)}>
                <span>
                  <StatusBadge status={report.status} />
                  <strong>Review {reportDepartmentName(report)} Weekly Execution Update</strong>
                </span>
                <small>{getCycle(report.cycleId).label}</small>
              </button>
            ))}
            <button disabled={isPublished} onClick={() => setPublishOpen(true)}>
              <span>
                <StatusBadge
                  status={isPublished ? 'published_locked' : canPublish ? 'ready' : 'pending'}
                />
                <strong>Publish weekly executive update</strong>
              </span>
              <small>
                {isPublished
                  ? 'Cycle is immutable'
                  : canPublish
                    ? 'Ready to publish'
                    : 'Approval or controlled exception required'}
              </small>
            </button>
          </div>
        </Panel>
      </div>
      <Panel title="Weekly Execution Update review queue" className="section">
        <DataTable
          caption="Department submission review queue"
          headers={['Department', 'Period', 'Sources', 'Status', 'Submitted']}
          rows={queue.map((report) => [
            reportDepartmentName(report),
            getCycle(report.cycleId).label,
            String(report.sourceIds.length),
            <StatusBadge status={report.status} />,
            report.submittedAt ? format.date(report.submittedAt) : '—',
          ])}
          onRowClick={(index) => navigate(`/commercial/review/${queue[index].id}`)}
        />
      </Panel>
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
      </Drawer>
      <Modal
        title="Consolidate and publish executive update"
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPublishOpen(false)}>
              Close
            </Button>
            <Button
              disabled={!canPublish}
              onClick={() => {
                workflowDispatch({
                  type: 'PUBLISH_CYCLE',
                  cycleId,
                  actorId: activeUserId,
                  now: prototypeTime(workflow.auditEvents.length + 1),
                });
                setPublishOpen(false);
                showToast(
                  'Executive update published; cycle locked and CEO notification simulated',
                );
              }}
            >
              Publish and lock cycle
            </Button>
          </>
        }
      >
        <p>
          {readiness.approvedReports} of {readiness.requiredReports} mandatory departmental reports
          are approved. Publishing creates an immutable cycle snapshot.
        </p>
        <Field label="Executive narrative">
          <textarea
            rows={5}
            value={narrative}
            onChange={(event) => setNarrative(event.target.value)}
          />
        </Field>
        <Button
          variant="secondary"
          disabled={!narrative.trim()}
          onClick={() => {
            workflowDispatch({
              type: 'SAVE_EXECUTIVE_NARRATIVE',
              cycleId,
              narrative,
              actorId: activeUserId,
              now: prototypeTime(workflow.auditEvents.length + 1),
            });
            showToast('Executive narrative saved with an audit event');
          }}
        >
          Save narrative
        </Button>
        <Panel title="Publication preview">
          <p>{narrative || 'Add an executive narrative to complete the preview.'}</p>
          <small>
            {readiness.approvedReports}/{readiness.requiredReports} mandatory updates approved ·{' '}
            {atlas.meta.disclosure}
          </small>
        </Panel>
        {readiness.reportingReadinessPercent < 100 && (
          <div className="info-panel">
            <strong>Controlled exception</strong>
            <span>
              Record why the incomplete mandatory reports do not prevent a decision-ready update.
            </span>
          </div>
        )}
        {readiness.reportingReadinessPercent < 100 && (
          <>
            <Field label="Mandatory exception reason">
              <textarea
                rows={4}
                value={exceptionReason}
                onChange={(event) => setExceptionReason(event.target.value)}
              />
            </Field>
            <Button
              variant="secondary"
              disabled={!exceptionReason.trim()}
              onClick={() => {
                workflowDispatch({
                  type: 'RECORD_CYCLE_EXCEPTION',
                  cycleId,
                  reason: exceptionReason,
                  actorId: activeUserId,
                  now: prototypeTime(workflow.auditEvents.length + 1),
                });
                showToast('Controlled publication exception recorded', 'warning');
              }}
            >
              Record controlled exception
            </Button>
          </>
        )}
        {workflow.lastError && <p className="field__error">{workflow.lastError}</p>}
      </Modal>
    </>
  );
}

export function CommercialReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const { activeUserId, workflow, workflowDispatch } = useAtlas();
  const report = workflow.reports.find((item) => item.id === id);
  const queue = selectSubmissionQueue(workflow);
  const queueIndex = queue.findIndex((item) => item.id === id);
  const [modal, setModal] = useState<'clarify' | 'override' | 'reject' | null>(null);
  const [detailTab, setDetailTab] = useState<'summary' | 'commitments' | 'impact' | 'history'>(
    'summary',
  );
  const [field, setField] = useState('Gross oil production');
  const [comment, setComment] = useState('');
  const [dueDate, setDueDate] = useState('2026-08-03');
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [viewSource, setViewSource] = useState<WorkflowSource | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  if (!report)
    return (
      <Panel title="Submission unavailable">
        <p>The requested report was not found.</p>
      </Panel>
    );
  const sources = selectReportSources(workflow, report.id);
  const comments = workflow.comments.filter((item) => item.reportId === report.id);
  const corrections = workflow.corrections.filter((item) => item.reportId === report.id);
  const overrides = workflow.overrides.filter((item) => item.reportId === report.id);
  const auditEvents = workflow.auditEvents.filter(
    (event) => event.entityId === report.id || report.sourceIds.includes(event.entityId),
  );
  const previousReport = selectPreviousReport(workflow, report);
  const reviewCommitments = selectReportCommitments(workflow, report.id);
  const reviewable = ['submitted', 'resubmitted'].includes(report.status);
  const selectedField = report.fields.find((item) => item.label === field) ?? report.fields[0];
  return (
    <>
      <PageHeader
        title="Update Review"
        description={`${reportDepartmentName(report)} · ${getCycle(report.cycleId).label} · ${report.sourceIds.length} sources`}
        controls={<StatusBadge status={report.status} />}
      />
      <div className="queue-nav">
        <Button
          variant="secondary"
          disabled={queueIndex <= 0}
          onClick={() => navigate(`/commercial/review/${queue[queueIndex - 1].id}`)}
        >
          Previous
        </Button>
        <span>
          Manager: {getUser(report.managerId ?? '')?.name ?? 'Unassigned'} · Submitted{' '}
          {report.submittedAt ? format.date(report.submittedAt) : '—'}
        </span>
        <Button
          variant="secondary"
          disabled={queueIndex < 0 || queueIndex >= queue.length - 1}
          onClick={() => navigate(`/commercial/review/${queue[queueIndex + 1].id}`)}
        >
          Next
        </Button>
      </div>
      <div className="review-tabs section" role="tablist" aria-label="Review detail">
        {[
          ['summary', 'Submitted summary'],
          ['commitments', 'Commitments'],
          ['impact', 'KPI and objective impact'],
          ['history', 'Review history'],
        ].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={detailTab === value}
            className={detailTab === value ? 'is-active' : ''}
            onClick={() => setDetailTab(value as typeof detailTab)}
          >
            {label}
          </button>
        ))}
      </div>
      {detailTab === 'summary' && (
        <div className="review-layout section">
          <Panel title="What was submitted">
            <p className="review-highlight">{report.weekly.executiveHighlight}</p>
            <dl className="summary-list">
              <div>
                <dt>Forecast changes</dt>
                <dd>{report.weekly.forecastChanges}</dd>
              </div>
              <div>
                <dt>Next week</dt>
                <dd>{report.weekly.nextWeekPlan}</dd>
              </div>
              <div>
                <dt>Support required</dt>
                <dd>{report.weekly.supportRequired}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Change from previous period">
            <p>{report.weekly.materialChange}</p>
            <small>
              Previous:{' '}
              {previousReport?.weekly.executiveHighlight ?? 'No comparable prior update available.'}
            </small>
            <Button variant="secondary" onClick={() => setEvidenceOpen(true)}>
              View evidence ({sources.length})
            </Button>
          </Panel>
        </div>
      )}
      {detailTab === 'commitments' && (
        <Panel
          title="Previous commitments → Current outcome → Explanation → New forecast"
          className="section"
        >
          <DataTable
            caption="Commitment comparison"
            headers={[
              'Previous commitment',
              'Current outcome',
              'Explanation',
              'New forecast',
              'Revisions',
            ]}
            rows={reviewCommitments.map((commitment) => {
              const outcome = report.weekly.previousCommitmentOutcomes.find(
                (item) => item.commitmentId === commitment.id,
              );
              return [
                commitment.description,
                outcome?.currentOutcome ||
                  (commitment.reportId === report.id ? 'New commitment' : 'Not updated'),
                outcome?.explanation || commitment.expectedOutcome,
                outcome?.newForecast || commitment.revisedForecast,
                String(commitment.revisionCount),
              ];
            })}
          />
        </Panel>
      )}
      {detailTab === 'impact' && (
        <div className="review-layout section">
          <Panel title="Affected KPIs and objectives">
            <dl className="metric-review">
              {report.fields.map((item) => {
                const correction = [...corrections]
                  .reverse()
                  .find((entry) => entry.fieldKey === item.key);
                const override = [...overrides]
                  .reverse()
                  .find((entry) => entry.fieldKey === item.key);
                return (
                  <div key={item.key}>
                    <dt>{item.label}</dt>
                    <dd>
                      {item.value} {item.unit}
                    </dd>
                    {correction && (
                      <small className="audit-note">
                        Manager correction: {correction.originalValue} → {correction.correctedValue}
                        . {correction.reason}
                      </small>
                    )}
                    {override && (
                      <small className="override-note">
                        Commercial edit: {override.departmentValue} → {override.revisedValue}.{' '}
                        {override.reason}
                      </small>
                    )}
                  </div>
                );
              })}
            </dl>
            <p>
              Objectives:{' '}
              {report.strategicObjectiveIds
                .map((id) => atlas.strategicObjectives.find((item) => item.id === id)?.name)
                .join(' · ')}
            </p>
          </Panel>
          <Panel title="Validation warnings">
            {report.weekly.validationWarnings.length ? (
              report.weekly.validationWarnings.map((warning) => (
                <p className="warning-banner" key={warning}>
                  {warning}
                </p>
              ))
            ) : (
              <div className="compact-empty">
                <Check />
                <p>No unresolved validation warnings.</p>
              </div>
            )}
          </Panel>
        </div>
      )}
      {detailTab === 'history' && (
        <Panel title="Review history" className="section">
          {comments.map((item) => (
            <article className="comment-card" key={item.id}>
              <StatusBadge status={item.status} />
              <strong>{item.field}</strong>
              <p>{item.question}</p>
              {item.response && <p>{item.response}</p>}
            </article>
          ))}
          {auditEvents.map((event) => (
            <article className="audit-item" key={event.id}>
              <History />
              <div>
                <strong>{event.summary}</strong>
                <small>
                  {event.actorRole.replaceAll('_', ' ')} · {format.date(event.timestamp)}
                </small>
              </div>
            </article>
          ))}
        </Panel>
      )}
      {workflow.lastError && (
        <div className="warning-banner section" role="alert">
          <CircleAlert />
          {workflow.lastError}
          <Button variant="tertiary" onClick={() => workflowDispatch({ type: 'CLEAR_ERROR' })}>
            Dismiss
          </Button>
        </div>
      )}
      <div className="review-actions section">
        <Button
          variant="secondary"
          disabled={!reviewable}
          title={!reviewable ? 'Only Submitted or Resubmitted updates can be returned.' : undefined}
          onClick={() => setModal('clarify')}
        >
          Request clarification
        </Button>
        <Button
          variant="secondary"
          disabled={!['submitted', 'resubmitted', 'approved'].includes(report.status)}
          onClick={() => {
            setOverrideValue(selectedField.value);
            setModal('override');
          }}
        >
          Edit structured information
        </Button>
        <Button variant="destructive" disabled={!reviewable} onClick={() => setModal('reject')}>
          Reject
        </Button>
        <Button
          disabled={!reviewable}
          title={!reviewable ? 'Only Submitted or Resubmitted updates can be approved.' : undefined}
          onClick={() => {
            workflowDispatch({
              type: 'APPROVE_REPORT',
              reportId: report.id,
              actorId: activeUserId,
              now: prototypeTime(workflow.auditEvents.length + 1),
            });
            showToast('Update approved; readiness recalculated');
          }}
        >
          Approve
        </Button>
      </div>
      <Modal
        title={
          modal === 'override'
            ? 'Edit structured information'
            : modal === 'reject'
              ? 'Reject Weekly Execution Update'
              : 'Request clarification'
        }
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                modal === 'override'
                  ? !overrideValue.trim() || !overrideReason.trim()
                  : !comment.trim()
              }
              onClick={() => {
                if (modal === 'override') {
                  workflowDispatch({
                    type: 'APPLY_OVERRIDE',
                    override: {
                      id: `override_${workflow.overrides.length + 1}`,
                      reportId: report.id,
                      fieldKey: selectedField.key,
                      fieldLabel: selectedField.label,
                      departmentValue: selectedField.value,
                      revisedValue: overrideValue,
                      reason: overrideReason,
                      reviewerId: activeUserId,
                      timestamp: prototypeTime(workflow.auditEvents.length + 1),
                    },
                  });
                  showToast('Commercial edit recorded separately from the department value');
                } else if (modal === 'reject') {
                  workflowDispatch({
                    type: 'REJECT_REPORT',
                    reportId: report.id,
                    actorId: activeUserId,
                    reason: comment,
                    now: prototypeTime(workflow.auditEvents.length + 1),
                  });
                  showToast('Update rejected with an auditable reason', 'warning');
                } else {
                  workflowDispatch({
                    type: 'REQUEST_CLARIFICATION',
                    comment: {
                      id: `comment_${workflow.comments.length + 1}`,
                      reportId: report.id,
                      field,
                      authorId: activeUserId,
                      question: comment,
                      status: 'open',
                      createdAt: prototypeTime(workflow.auditEvents.length + 1),
                      dueDate,
                    },
                  });
                  showToast('Update returned to the Department Manager', 'warning');
                }
                setModal(null);
                setComment('');
                setOverrideReason('');
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        {modal !== 'reject' && (
          <Field label="Field or section">
            <select value={field} onChange={(event) => setField(event.target.value)}>
              {report.fields.map((item) => (
                <option key={item.key}>{item.label}</option>
              ))}
            </select>
          </Field>
        )}
        {modal === 'override' ? (
          <>
            <div className="preserved-value">
              <small>Approved department value</small>
              <strong>
                {selectedField.value} {selectedField.unit}
              </strong>
              <span>This value remains preserved in the audit record.</span>
            </div>
            <Field label="Revised value">
              <input
                aria-label="Commercial revised value"
                value={overrideValue}
                onChange={(event) => setOverrideValue(event.target.value)}
              />
            </Field>
            <Field label="Mandatory reason">
              <textarea
                aria-label="Commercial override reason"
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                rows={4}
              />
            </Field>
          </>
        ) : modal === 'reject' ? (
          <Field label="Rejection reason">
            <textarea
              aria-label="Rejection reason"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
            />
          </Field>
        ) : (
          <>
            <Field label="Field-level question">
              <textarea
                aria-label="Clarification question"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
              />
            </Field>
            <Field label="Response due date">
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </Field>
          </>
        )}
      </Modal>
      <Drawer
        title={viewSource?.name ?? 'Supporting evidence'}
        open={evidenceOpen}
        onClose={() => {
          setEvidenceOpen(false);
          setViewSource(null);
        }}
      >
        {!viewSource &&
          sources.map((source) => (
            <button
              className="source-item source-item--button"
              key={source.id}
              onClick={() => setViewSource(source)}
            >
              <FileText />
              <div>
                <strong>{source.name}</strong>
                <small>{source.reference}</small>
              </div>
              <StatusBadge status={source.status} />
            </button>
          ))}
        {viewSource && (
          <>
            <StatusBadge status={viewSource.status} />
            <h3>Reference</h3>
            <p>{viewSource.reference}</p>
            <blockquote>{viewSource.excerpt}</blockquote>
            <h3>Extracted values</h3>
            <pre>{JSON.stringify(viewSource.extractedValues, null, 2)}</pre>
          </>
        )}
      </Drawer>
    </>
  );
}
