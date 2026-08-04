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
  selectReportSources,
  selectReportsForDepartment,
  selectSubmissionQueue,
  type ManagerCorrection,
  type SourceMethod,
  type SourceStatus,
  type WorkflowReport,
  type WorkflowSource,
} from '../state/workflow';

const methodDefinitions = [
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
  const pending = reports.filter((report) => ['submitted', 'resubmitted'].includes(report.status));
  const returned = reports.filter((report) => report.status === 'needs_clarification');
  const due = reports.filter(
    (report) => report.cycleId === activeCycle.id && report.status === 'draft',
  );

  return (
    <>
      <PageHeader
        title="My Updates"
        description="Prepare, certify and track your department’s Weekly Execution Updates. Changes are stored only on this device for the prototype."
      />
      <div className="grid grid--3">
        <KpiCard
          label="Submissions due"
          value={String(due.length)}
          status={due.length ? 'due_soon' : 'approved'}
          context={due.length ? activeCycle.label : 'All required updates submitted'}
          onClick={due.length ? () => navigate('/department/reports/new') : undefined}
        />
        <KpiCard
          label="Pending Commercial review"
          value={String(pending.length)}
          status={pending.length ? 'submitted' : 'approved'}
          context={pending.length ? 'Awaiting Commercial review' : 'No updates waiting'}
          onClick={pending[0] ? () => navigate(`/department/reports/${pending[0].id}`) : undefined}
        />
        <KpiCard
          label="Returned submissions"
          value={String(returned.length)}
          status={returned.length ? 'needs_clarification' : 'approved'}
          context={returned.length ? 'Commercial response required' : 'No action required'}
          onClick={
            returned[0] ? () => navigate(`/department/reports/${returned[0].id}`) : undefined
          }
        />
      </div>
      <Panel title="Update history" className="section">
        <DataTable
          caption="Department submission history"
          headers={['Project · Period', 'Method', 'Status', 'Submitted']}
          rows={reports.map((report) => [
            <div>
              <strong>{report.title}</strong>
              <small>OML 30 · {getCycle(report.cycleId).label}</small>
            </div>,
            report.methods.length ? report.methods.map(methodLabel).join(' · ') : 'No sources yet',
            <StatusBadge status={report.status} />,
            report.submittedAt ? format.date(report.submittedAt) : '—',
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
      <Panel title="Atlas Structured Form" className="method-input">
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
      <Panel title="Document Upload · PDF or DOCX" className="method-input">
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
      <Panel title="XLSX Upload" className="method-input">
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
    <Panel title="Paste Email or Call Transcript" className="method-input">
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
  const [step, setStep] = useState<1 | 2>(1);
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

  useEffect(() => {
    if (cycleId !== atlas.demoStates.defaultOpenCycleId) {
      setCycleId(atlas.demoStates.defaultOpenCycleId);
    }
  }, [cycleId, setCycleId]);

  const sources = selectReportSources(workflow, report.id);
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
    blockedReasons.length === 0 && ['draft', 'needs_clarification'].includes(report.status);

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
      <PageHeader
        title="Submit Weekly Execution Update"
        description="Deterministic extraction and device-local persistence for synthetic prototype data."
      />
      <ol className="steps" aria-label="Update creation progress">
        <li className={step === 1 ? 'is-active' : 'is-complete'}>
          <span>{step === 1 ? '1' : <Check aria-hidden="true" />}</span>Details & Method
        </li>
        <li className={step === 2 ? 'is-active' : ''}>
          <span>2</span>Content
        </li>
      </ol>
      {step === 1 ? (
        <>
          <Panel title="Common details" className="section">
            <div className="form-grid">
              <Field label="Business unit">
                <select aria-label="Business unit" value={businessUnitId} disabled>
                  {atlas.businessUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Strategic objective">
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
                {primaryField.label}: {primaryField.value} {primaryField.unit}. Baseline changes
                require a Commercial Manager request.
              </span>
            </div>
          </Panel>
          <section className="section" aria-labelledby="method-title">
            <div className="section-heading">
              <div>
                <h2 id="method-title">Choose submission methods</h2>
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
      ) : (
        <>
          <section className="section" aria-labelledby="content-method-title">
            <div className="section-heading">
              <div>
                <h2 id="content-method-title">Method content</h2>
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
              <Button variant="secondary" onClick={() => setStep(1)}>
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
  const [modal, setModal] = useState<'clarify' | 'override' | null>(null);
  const [field, setField] = useState('Gross oil production');
  const [comment, setComment] = useState('');
  const [dueDate, setDueDate] = useState('2026-08-03');
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [viewSource, setViewSource] = useState<WorkflowSource | null>(null);
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
      <div className="review-layout section">
        <Panel title="Standardised update and source lineage">
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
                  <small>
                    Source references: {item.sourceIds.join(', ')} ·{' '}
                    {Math.round(item.confidence * 100)}% confidence
                  </small>
                  {correction && (
                    <small className="audit-note">
                      Manager correction preserved: {correction.originalValue} →{' '}
                      {correction.correctedValue}. Reason: {correction.reason}
                    </small>
                  )}
                  {override && (
                    <small className="override-note">
                      Commercial override for consolidation: {override.departmentValue} →{' '}
                      {override.revisedValue}. Reason: {override.reason}
                    </small>
                  )}
                </div>
              );
            })}
          </dl>
        </Panel>
        <div className="review-stack">
          <Panel title="Sources and evidence">
            {sources.map((source) => (
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
          </Panel>
          <Panel title="Comments and audit history">
            {comments.map((item) => (
              <article className="comment-card" key={item.id}>
                <StatusBadge status={item.status} />
                <strong>{item.field}</strong>
                <p>{item.question}</p>
                {item.response && (
                  <div className="response">
                    <small>Department response</small>
                    <p>{item.response}</p>
                  </div>
                )}
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
          Controlled override
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
          Approve update
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
                  showToast('Controlled override recorded separately from the department value');
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
        <Field label="Field or section">
          <select value={field} onChange={(event) => setField(event.target.value)}>
            {report.fields.map((item) => (
              <option key={item.key}>{item.label}</option>
            ))}
          </select>
        </Field>
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
        title={viewSource?.name ?? ''}
        open={Boolean(viewSource)}
        onClose={() => setViewSource(null)}
      >
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
