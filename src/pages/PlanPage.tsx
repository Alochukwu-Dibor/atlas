import { CheckCircle2, FileCheck2, FileUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { atlas, format, getDepartment, getUser } from '../data/atlas';
import { useAtlas } from '../state/AtlasContext';
import {
  getApprovedPlanFixtureFile,
  validatePlan,
  type PlanCustomField,
  type PlanFieldType,
  type PlanKpi,
  type PlanMilestone,
  type PlanReviewSection,
  type PlanTarget,
  type ProjectBaseline,
} from '../state/plan';
import {
  Button,
  DetailTabs,
  Field,
  Modal,
  PageHeader,
  Panel,
  StateView,
  StatusBadge,
  useToast,
} from '../components/Ui';

type ReviewTab = 'overview' | 'kpis' | 'milestones' | 'custom';

const reviewTabs = [
  { id: 'overview', label: 'Project, budget & timeline' },
  { id: 'kpis', label: 'KPIs & targets' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'custom', label: 'Custom fields' },
] as const;

const stageLabels = ['Upload', 'Extract', 'Review', 'Confirm'];

function stageIndex(stage: string) {
  if (stage === 'upload' || stage === 'error') return 0;
  if (stage === 'uploading' || stage === 'extracting') return 1;
  if (stage === 'review') return 2;
  return 3;
}

function PlanSteps({ stage }: { stage: string }) {
  const active = stageIndex(stage);
  return (
    <ol className="plan-steps" aria-label="Plan confirmation progress">
      {stageLabels.map((label, index) => (
        <li
          key={label}
          className={index === active ? 'is-active' : index < active ? 'is-complete' : ''}
        >
          <span>{index < active ? <CheckCircle2 aria-hidden="true" /> : index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function FileSize({ bytes }: { bytes: number }) {
  return <>{(bytes / 1_000_000).toFixed(1)} MB</>;
}

function UploadPlan() {
  const { plan, planDispatch } = useAtlas();
  const inputRef = useRef<HTMLInputElement>(null);
  const supported = atlas.approvedPlanExtraction.supportedExtensions
    .map((item) => item.toUpperCase())
    .join(', ');
  const selectFile = (file: File | null) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (
      !atlas.approvedPlanExtraction.supportedExtensions.includes(
        extension as 'pdf' | 'docx' | 'xlsx',
      )
    ) {
      planDispatch({ type: 'SET_ERROR', message: `Unsupported file type. Use ${supported}.` });
      return;
    }
    if (file.size > 25_000_000) {
      planDispatch({
        type: 'SET_ERROR',
        message: 'The selected file is larger than the 25 MB prototype limit.',
      });
      return;
    }
    planDispatch({
      type: 'SELECT_FILE',
      file: { name: file.name, size: file.size, type: file.type },
    });
  };

  if (plan.stage === 'error') {
    return (
      <StateView
        type="error"
        title="The approved plan could not be prepared"
        message={plan.error ?? 'Choose another approved plan file and try again.'}
        action={
          <Button onClick={() => planDispatch({ type: 'RESTART' })}>Choose another file</Button>
        }
      />
    );
  }

  return (
    <Panel className="plan-upload-panel">
      <div className="plan-upload-zone">
        <FileUp aria-hidden="true" />
        <h2>Upload the externally approved business plan</h2>
        <p>
          Atlas will structure the approved plan for verification. It does not approve the plan.
        </p>
        <input
          ref={inputRef}
          className="sr-only"
          aria-label="Approved plan file"
          type="file"
          accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
        />
        {!plan.file ? (
          <div className="plan-upload-actions">
            <Button onClick={() => inputRef.current?.click()}>Choose approved plan</Button>
            <Button
              variant="secondary"
              onClick={() =>
                planDispatch({ type: 'SELECT_FILE', file: getApprovedPlanFixtureFile() })
              }
            >
              Use synthetic plan fixture
            </Button>
          </div>
        ) : (
          <div className="selected-plan-file" role="status">
            <FileCheck2 aria-hidden="true" />
            <div>
              <strong>{plan.file.name}</strong>
              <small>
                <FileSize bytes={plan.file.size} /> · Ready to extract
              </small>
            </div>
            <Button variant="tertiary" onClick={() => inputRef.current?.click()}>
              Replace file
            </Button>
            <Button variant="tertiary" onClick={() => planDispatch({ type: 'REMOVE_FILE' })}>
              Remove file
            </Button>
          </div>
        )}
        <small>Supported files: {supported} · Maximum 25 MB · Synthetic prototype processing</small>
      </div>
      <div className="form-actions form-actions--end">
        <Button disabled={!plan.file} onClick={() => planDispatch({ type: 'START_UPLOAD' })}>
          Continue and extract
        </Button>
      </div>
    </Panel>
  );
}

function ExtractPlan() {
  const { plan, planDispatch } = useAtlas();
  useEffect(() => {
    if (plan.stage === 'uploading') {
      const timer = window.setTimeout(() => planDispatch({ type: 'START_EXTRACTION' }), 350);
      return () => window.clearTimeout(timer);
    }
    if (plan.stage !== 'extracting') return;
    const timers = [
      window.setTimeout(
        () =>
          planDispatch({
            type: 'SET_EXTRACTION_PROGRESS',
            progress: 38,
            message: 'Matching projects and approved project budgets…',
          }),
        300,
      ),
      window.setTimeout(
        () =>
          planDispatch({
            type: 'SET_EXTRACTION_PROGRESS',
            progress: 64,
            message: 'Connecting department KPIs and targets…',
          }),
        650,
      ),
      window.setTimeout(
        () =>
          planDispatch({
            type: 'SET_EXTRACTION_PROGRESS',
            progress: 86,
            message: 'Structuring milestones and project timelines…',
          }),
        1000,
      ),
      window.setTimeout(() => planDispatch({ type: 'COMPLETE_EXTRACTION' }), 1400),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [plan.stage, planDispatch]);

  const uploading = plan.stage === 'uploading';
  return (
    <Panel className="plan-extraction-panel">
      <div className="extraction-heading">
        <span className="loading-ring" aria-hidden="true" />
        <div>
          <h2>
            {uploading ? 'Uploading approved plan' : 'Extracting approved baseline information'}
          </h2>
          <p>
            {uploading
              ? 'Preparing the selected file for deterministic prototype extraction.'
              : plan.extractionMessage}
          </p>
        </div>
      </div>
      <progress
        max="100"
        value={uploading ? 6 : plan.extractionProgress}
        aria-label="Plan extraction progress"
      />
      <strong>{uploading ? 6 : plan.extractionProgress}%</strong>
      <ul className="extraction-list">
        <li>Projects and project budgets</li>
        <li>Department KPIs and approved targets</li>
        <li>Department milestones and project timelines</li>
      </ul>
      <p className="prototype-note">
        This prototype uses the selected Shoreline fixture; it does not perform live AI or OCR
        processing.
      </p>
    </Panel>
  );
}

function DepartmentSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Select department</option>
      {atlas.departments.map((department) => (
        <option key={department.id} value={department.id}>
          {department.name}
        </option>
      ))}
    </select>
  );
}

function ReviewPlan() {
  const { plan, planDispatch } = useAtlas();
  const [selectedProjectId, setSelectedProjectId] = useState(plan.projects[0]?.id ?? '');
  const [tab, setTab] = useState<ReviewTab>('overview');
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState<Omit<PlanCustomField, 'id'>>({
    projectId: selectedProjectId,
    section: 'project',
    name: '',
    type: 'text',
    value: '',
  });
  const issues = validatePlan(plan);
  const project = plan.projects.find((item) => item.id === selectedProjectId) ?? plan.projects[0];
  const newId = (prefix: string) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const addProject = () => {
    const projectId = newId('plan_project');
    const baseline: ProjectBaseline = {
      id: projectId,
      name: 'New project',
      departmentId: 'dept_projects',
      strategicObjectiveIds: [],
      budget: {
        id: newId('budget'),
        projectId,
        budgetLineId: newId('line'),
        approvedAmount: 0,
        currency: 'USD',
      },
      timeline: { id: newId('timeline'), projectId, startDate: '', endDate: '' },
      kpis: [],
      targets: [],
      milestones: [],
    };
    planDispatch({ type: 'ADD_PROJECT', project: baseline });
    setSelectedProjectId(projectId);
    setTab('overview');
  };

  if (!project) {
    return (
      <StateView
        type="empty"
        title="No extracted projects"
        message="Add a project to continue reviewing the approved plan."
        action={<Button onClick={addProject}>Add project</Button>}
      />
    );
  }

  const projectIssues = issues.filter((issue) => issue.projectId === project.id);
  const addKpi = () => {
    const kpiId = newId('kpi');
    const kpi: PlanKpi = {
      id: kpiId,
      projectId: project.id,
      departmentId: project.departmentId,
      name: 'New KPI',
      unit: '%',
    };
    const target: PlanTarget = {
      id: newId('target'),
      projectId: project.id,
      kpiId,
      departmentId: project.departmentId,
      approvedBaseline: 0,
      unit: '%',
    };
    planDispatch({ type: 'ADD_KPI', projectId: project.id, kpi, target });
  };
  const addMilestone = () => {
    const milestone: PlanMilestone = {
      id: newId('milestone'),
      projectId: project.id,
      departmentId: project.departmentId,
      name: 'New milestone',
      dueDate: project.timeline.endDate,
    };
    planDispatch({ type: 'ADD_MILESTONE', projectId: project.id, milestone });
  };

  return (
    <div className="plan-review-layout">
      <aside className="plan-project-list" aria-label="Extracted projects">
        <div>
          <strong>Extracted projects</strong>
          <StatusBadge status={issues.length ? 'validation_issue' : 'ready'} />
        </div>
        {plan.projects.map((item, index) => {
          const count = issues.filter((issue) => issue.projectId === item.id).length;
          return (
            <button
              key={item.id}
              className={item.id === project.id ? 'is-active' : ''}
              onClick={() => setSelectedProjectId(item.id)}
            >
              <span>
                <small>Project {index + 1}</small>
                <strong>{item.name || 'Untitled project'}</strong>
              </span>
              {count ? (
                <b aria-label={`${count} validation issues`}>{count}</b>
              ) : (
                <CheckCircle2 aria-label="Valid" />
              )}
            </button>
          );
        })}
        <Button variant="secondary" onClick={addProject}>
          <Plus aria-hidden="true" /> Add project
        </Button>
      </aside>
      <div className="plan-review-content">
        <Panel
          className="validation-summary"
          title="Extraction review"
          action={
            <span>
              {plan.hasUnsavedEdits ? 'Session edits preserved' : 'Extracted fixture loaded'}
            </span>
          }
        >
          <p>
            Verify every value against the externally approved plan before confirming it as Atlas’s
            tracking baseline.
          </p>
          {issues.length ? (
            <div className="validation-alert" role="alert">
              <strong>
                {issues.length} required {issues.length === 1 ? 'issue' : 'issues'} must be
                resolved.
              </strong>
              <span>
                {projectIssues[0]?.message ?? 'Select an affected project to review its fields.'}
              </span>
            </div>
          ) : (
            <div className="validation-success">
              <CheckCircle2 aria-hidden="true" />
              <span>All required baseline information is complete.</span>
            </div>
          )}
        </Panel>
        <div className="plan-project-heading">
          <div>
            <small>{getDepartment(project.departmentId)?.name}</small>
            <h2>{project.name || 'Untitled project'}</h2>
          </div>
          <Button
            variant="destructive"
            onClick={() => planDispatch({ type: 'REMOVE_PROJECT', projectId: project.id })}
          >
            <Trash2 aria-hidden="true" /> Remove project
          </Button>
        </div>
        <DetailTabs label="Plan review section" value={tab} onChange={setTab} tabs={reviewTabs} />

        {tab === 'overview' && (
          <Panel title="Project, budget and timeline">
            <div className="form-grid">
              <Field
                label="Project name"
                error={!project.name.trim() ? 'Project name is required.' : undefined}
              >
                <input
                  value={project.name}
                  onChange={(event) =>
                    planDispatch({
                      type: 'UPDATE_PROJECT',
                      projectId: project.id,
                      field: 'name',
                      value: event.target.value,
                    })
                  }
                />
              </Field>
              <Field
                label="Owning department"
                error={!project.departmentId ? 'Department is required.' : undefined}
              >
                <DepartmentSelect
                  value={project.departmentId}
                  onChange={(value) =>
                    planDispatch({
                      type: 'UPDATE_PROJECT',
                      projectId: project.id,
                      field: 'departmentId',
                      value,
                    })
                  }
                />
              </Field>
              <Field
                label="Approved project budget (USD)"
                error={
                  project.budget.approvedAmount <= 0
                    ? 'Enter an amount greater than zero.'
                    : undefined
                }
              >
                <input
                  type="number"
                  min="0"
                  value={project.budget.approvedAmount}
                  onChange={(event) =>
                    planDispatch({
                      type: 'UPDATE_BUDGET',
                      projectId: project.id,
                      value: event.target.valueAsNumber,
                    })
                  }
                />
              </Field>
              <Field label="Budget currency">
                <input value={project.budget.currency} disabled />
              </Field>
              <Field label="Plan start date">
                <input
                  type="date"
                  value={project.timeline.startDate}
                  onChange={(event) =>
                    planDispatch({
                      type: 'UPDATE_TIMELINE',
                      projectId: project.id,
                      field: 'startDate',
                      value: event.target.value,
                    })
                  }
                />
              </Field>
              <Field
                label="Plan end date"
                error={
                  project.timeline.endDate < project.timeline.startDate
                    ? 'End date must follow the start date.'
                    : undefined
                }
              >
                <input
                  type="date"
                  value={project.timeline.endDate}
                  onChange={(event) =>
                    planDispatch({
                      type: 'UPDATE_TIMELINE',
                      projectId: project.id,
                      field: 'endDate',
                      value: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </Panel>
        )}

        {tab === 'kpis' && (
          <Panel
            title="Department KPIs and approved targets"
            action={
              <Button variant="secondary" onClick={addKpi}>
                <Plus aria-hidden="true" /> Add KPI
              </Button>
            }
          >
            {project.kpis.length === 0 ? (
              <p className="empty-copy">
                No KPI is connected to this project. Add one to resolve validation.
              </p>
            ) : (
              <div className="editable-record-list">
                {project.kpis.map((kpi) => {
                  const target = project.targets.find((item) => item.kpiId === kpi.id);
                  return (
                    <article key={kpi.id}>
                      <div className="form-grid">
                        <Field label="KPI name">
                          <input
                            value={kpi.name}
                            onChange={(event) =>
                              planDispatch({
                                type: 'UPDATE_KPI',
                                projectId: project.id,
                                kpiId: kpi.id,
                                field: 'name',
                                value: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Department">
                          <DepartmentSelect
                            value={kpi.departmentId}
                            onChange={(value) =>
                              planDispatch({
                                type: 'UPDATE_KPI',
                                projectId: project.id,
                                kpiId: kpi.id,
                                field: 'departmentId',
                                value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Approved target">
                          <input
                            type="number"
                            value={target?.approvedBaseline ?? ''}
                            onChange={(event) =>
                              target &&
                              planDispatch({
                                type: 'UPDATE_TARGET',
                                projectId: project.id,
                                targetId: target.id,
                                value: event.target.valueAsNumber,
                              })
                            }
                          />
                        </Field>
                        <Field label="Unit">
                          <input
                            value={kpi.unit}
                            onChange={(event) =>
                              planDispatch({
                                type: 'UPDATE_KPI',
                                projectId: project.id,
                                kpiId: kpi.id,
                                field: 'unit',
                                value: event.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                      <Button
                        variant="tertiary"
                        onClick={() =>
                          planDispatch({ type: 'REMOVE_KPI', projectId: project.id, kpiId: kpi.id })
                        }
                      >
                        Remove KPI
                      </Button>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {tab === 'milestones' && (
          <Panel
            title="Department milestones"
            action={
              <Button variant="secondary" onClick={addMilestone}>
                <Plus aria-hidden="true" /> Add milestone
              </Button>
            }
          >
            {project.milestones.length === 0 ? (
              <p className="empty-copy">No milestones were extracted for this project.</p>
            ) : (
              <div className="editable-record-list">
                {project.milestones.map((milestone) => (
                  <article key={milestone.id}>
                    <div className="form-grid">
                      <Field label="Milestone">
                        <input
                          value={milestone.name}
                          onChange={(event) =>
                            planDispatch({
                              type: 'UPDATE_MILESTONE',
                              projectId: project.id,
                              milestoneId: milestone.id,
                              field: 'name',
                              value: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Due date">
                        <input
                          type="date"
                          value={milestone.dueDate}
                          onChange={(event) =>
                            planDispatch({
                              type: 'UPDATE_MILESTONE',
                              projectId: project.id,
                              milestoneId: milestone.id,
                              field: 'dueDate',
                              value: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Responsible department">
                        <DepartmentSelect
                          value={milestone.departmentId}
                          onChange={(value) =>
                            planDispatch({
                              type: 'UPDATE_MILESTONE',
                              projectId: project.id,
                              milestoneId: milestone.id,
                              field: 'departmentId',
                              value,
                            })
                          }
                        />
                      </Field>
                    </div>
                    <Button
                      variant="tertiary"
                      onClick={() =>
                        planDispatch({
                          type: 'REMOVE_MILESTONE',
                          projectId: project.id,
                          milestoneId: milestone.id,
                        })
                      }
                    >
                      Remove milestone
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </Panel>
        )}

        {tab === 'custom' && (
          <Panel
            title="Custom fields"
            action={
              <Button
                onClick={() => {
                  setCustomDraft({
                    projectId: project.id,
                    section: 'project',
                    name: '',
                    type: 'text',
                    value: '',
                  });
                  setCustomOpen(true);
                }}
              >
                <Plus aria-hidden="true" /> Add Custom Field
              </Button>
            }
          >
            {plan.customFields.filter((field) => field.projectId === project.id).length === 0 ? (
              <p className="empty-copy">
                Add information from the approved plan that Atlas did not anticipate.
              </p>
            ) : (
              <div className="editable-record-list">
                {plan.customFields
                  .filter((field) => field.projectId === project.id)
                  .map((field) => (
                    <article key={field.id}>
                      <div className="form-grid">
                        <Field label="Field name">
                          <input
                            value={field.name}
                            onChange={(event) =>
                              planDispatch({
                                type: 'UPDATE_CUSTOM_FIELD',
                                fieldId: field.id,
                                field: 'name',
                                value: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Field type">
                          <select
                            value={field.type}
                            onChange={(event) =>
                              planDispatch({
                                type: 'UPDATE_CUSTOM_FIELD',
                                fieldId: field.id,
                                field: 'type',
                                value: event.target.value,
                              })
                            }
                          >
                            {['text', 'number', 'currency', 'percentage', 'date'].map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Relevant section">
                          <select
                            value={field.section}
                            onChange={(event) =>
                              planDispatch({
                                type: 'UPDATE_CUSTOM_FIELD',
                                fieldId: field.id,
                                field: 'section',
                                value: event.target.value,
                              })
                            }
                          >
                            {['project', 'budget', 'timeline', 'kpis', 'milestones'].map(
                              (section) => (
                                <option key={section} value={section}>
                                  {section}
                                </option>
                              ),
                            )}
                          </select>
                        </Field>
                        <Field label="Value">
                          <input
                            type={
                              field.type === 'date'
                                ? 'date'
                                : field.type === 'number' ||
                                    field.type === 'currency' ||
                                    field.type === 'percentage'
                                  ? 'number'
                                  : 'text'
                            }
                            value={field.value}
                            onChange={(event) =>
                              planDispatch({
                                type: 'UPDATE_CUSTOM_FIELD',
                                fieldId: field.id,
                                field: 'value',
                                value: event.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                      <Button
                        variant="tertiary"
                        onClick={() =>
                          planDispatch({ type: 'REMOVE_CUSTOM_FIELD', fieldId: field.id })
                        }
                      >
                        Remove custom field
                      </Button>
                    </article>
                  ))}
              </div>
            )}
          </Panel>
        )}

        <div className="form-actions form-actions--between">
          <span>
            {plan.projects.length} projects ·{' '}
            {format.usd(plan.projects.reduce((sum, item) => sum + item.budget.approvedAmount, 0))}{' '}
            approved budget
          </span>
          <Button
            disabled={issues.length > 0}
            onClick={() => planDispatch({ type: 'SET_STAGE', stage: 'confirm' })}
          >
            Review confirmation summary
          </Button>
        </div>
      </div>
      <Modal
        title="Add custom field"
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCustomOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!customDraft.name.trim() || !customDraft.value.trim()}
              onClick={() => {
                planDispatch({
                  type: 'ADD_CUSTOM_FIELD',
                  field: { ...customDraft, id: newId('custom') },
                });
                setCustomOpen(false);
              }}
            >
              Add field
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Field name">
            <input
              value={customDraft.name}
              onChange={(event) =>
                setCustomDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
          </Field>
          <Field label="Field type">
            <select
              value={customDraft.type}
              onChange={(event) =>
                setCustomDraft((current) => ({
                  ...current,
                  type: event.target.value as PlanFieldType,
                }))
              }
            >
              {['text', 'number', 'currency', 'percentage', 'date'].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Relevant project">
            <select
              value={customDraft.projectId}
              onChange={(event) =>
                setCustomDraft((current) => ({ ...current, projectId: event.target.value }))
              }
            >
              {plan.projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Relevant section">
            <select
              value={customDraft.section}
              onChange={(event) =>
                setCustomDraft((current) => ({
                  ...current,
                  section: event.target.value as PlanReviewSection,
                }))
              }
            >
              {['project', 'budget', 'timeline', 'kpis', 'milestones'].map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Value">
            <input
              value={customDraft.value}
              onChange={(event) =>
                setCustomDraft((current) => ({ ...current, value: event.target.value }))
              }
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function ConfirmPlan() {
  const { activeUserId, plan, planDispatch } = useAtlas();
  const toast = useToast();
  const [warningOpen, setWarningOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const issues = validatePlan(plan);
  const summary = useMemo(
    () => ({
      projects: plan.projects.length,
      budget: plan.projects.reduce((sum, project) => sum + project.budget.approvedAmount, 0),
      kpis: plan.projects.reduce((sum, project) => sum + project.kpis.length, 0),
      targets: plan.projects.reduce((sum, project) => sum + project.targets.length, 0),
      milestones: plan.projects.reduce((sum, project) => sum + project.milestones.length, 0),
    }),
    [plan.projects],
  );
  const period = atlas.planningPeriods.find(
    (item) => item.id === atlas.approvedPlanExtraction.planningPeriodId,
  )!;

  return (
    <div className="confirm-plan-stack">
      <Panel title="Confirm tracking baseline">
        <p className="panel-intro">
          This is a verification step. The business plan was approved outside Atlas; confirmation
          makes its structured information the baseline used across Atlas.
        </p>
        <dl className="plan-summary-grid">
          <div>
            <dt>Projects</dt>
            <dd>{summary.projects}</dd>
          </div>
          <div>
            <dt>Total approved budget</dt>
            <dd>{format.usd(summary.budget)}</dd>
          </div>
          <div>
            <dt>KPIs</dt>
            <dd>{summary.kpis}</dd>
          </div>
          <div>
            <dt>Targets</dt>
            <dd>{summary.targets}</dd>
          </div>
          <div>
            <dt>Milestones</dt>
            <dd>{summary.milestones}</dd>
          </div>
          <div>
            <dt>Plan timeline</dt>
            <dd>
              {format.date(period.startDate)} – {format.date(period.endDate)}
            </dd>
          </div>
          <div>
            <dt>Validation</dt>
            <dd>
              <StatusBadge status={issues.length ? 'validation_issue' : 'ready'} />
            </dd>
          </div>
        </dl>
        {issues.length > 0 && (
          <div className="validation-alert" role="alert">
            <strong>{issues.length} unresolved issues</strong>
            <span>Return to the extraction review and complete required information.</span>
          </div>
        )}
        <div className="form-actions form-actions--between">
          <Button
            variant="secondary"
            onClick={() => planDispatch({ type: 'SET_STAGE', stage: 'review' })}
          >
            Back to review
          </Button>
          <Button disabled={issues.length > 0} onClick={() => setWarningOpen(true)}>
            Confirm as Atlas baseline
          </Button>
        </div>
      </Panel>
      <Modal
        title="Confirm approved plan as tracking baseline"
        open={warningOpen}
        onClose={() => {
          setWarningOpen(false);
          setAcknowledged(false);
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setWarningOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!acknowledged}
              onClick={() => {
                planDispatch({
                  type: 'CONFIRM_PLAN',
                  actorId: activeUserId,
                  now: new Date().toISOString(),
                });
                setWarningOpen(false);
                toast('Approved plan confirmed as the Atlas tracking baseline.');
              }}
            >
              Confirm baseline
            </Button>
          </>
        }
      >
        <p>
          This action does not approve the business plan. It confirms that the information reviewed
          here matches the plan approved outside Atlas and will determine baselines across
          Dashboard, Projects, Reporting, contributor and executive views.
        </p>
        <label className="confirmation-check">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>I have verified the extracted values against the externally approved plan.</span>
        </label>
      </Modal>
    </div>
  );
}

function ConfirmedPlan() {
  const { plan, planDispatch, resetAtlas } = useAtlas();
  const navigate = useNavigate();
  const toast = useToast();
  const [resetWarningOpen, setResetWarningOpen] = useState(false);
  const confirmed = plan.confirmedPlan;
  if (!confirmed) return null;
  return (
    <>
      <Panel className="confirmed-plan-state">
        <CheckCircle2 aria-hidden="true" />
        <StatusBadge status="approved" />
        <h2>Approved plan confirmed as the Atlas tracking baseline</h2>
        <p>
          {confirmed.name} was verified by {getUser(confirmed.confirmedBy)?.name}. Atlas will use
          this confirmed information for downstream tracking; the original plan remains externally
          approved.
        </p>
        <dl className="plan-summary-grid">
          <div>
            <dt>Projects</dt>
            <dd>{confirmed.projects.length}</dd>
          </div>
          <div>
            <dt>Approved budget</dt>
            <dd>{format.usd(confirmed.totalApprovedBudget)}</dd>
          </div>
          <div>
            <dt>Confirmed</dt>
            <dd>{format.date(confirmed.confirmedAt)}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{confirmed.file.name}</dd>
          </div>
        </dl>
        <div className="form-actions">
          <Button onClick={() => navigate('/commercial')}>Go to Dashboard</Button>
          <Button variant="secondary" onClick={() => planDispatch({ type: 'RESTART' })}>
            Upload replacement plan
          </Button>
          <Button variant="destructive" onClick={() => setResetWarningOpen(true)}>
            Reset Atlas
          </Button>
        </div>
      </Panel>
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
          This clears the confirmed plan, Weekly Updates, submissions, comments, reviews, decisions
          and other local prototype data across Manager, Commercial Manager, CEO and CFO views.
          Atlas will return to the approved-plan upload step.
        </p>
      </Modal>
    </>
  );
}

export default function PlanPage() {
  const { plan } = useAtlas();
  const content =
    plan.stage === 'upload' || plan.stage === 'error' ? (
      <UploadPlan />
    ) : plan.stage === 'uploading' || plan.stage === 'extracting' ? (
      <ExtractPlan />
    ) : plan.stage === 'review' ? (
      <ReviewPlan />
    ) : plan.stage === 'confirm' ? (
      <ConfirmPlan />
    ) : (
      <ConfirmedPlan />
    );
  return (
    <div className="page-shell plan-page">
      <PageHeader
        title="Plan"
        description="Verify an externally approved plan and confirm the structured information Atlas will use as its tracking baseline."
      />
      <PlanSteps stage={plan.stage} />
      {content}
    </div>
  );
}
