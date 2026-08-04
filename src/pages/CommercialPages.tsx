import { useState } from 'react';
import { ContextControls } from '../components/Shells';
import {
  Button,
  DataTable,
  Drawer,
  Field,
  KpiCard,
  Modal,
  PageHeader,
  Panel,
  StatusBadge,
  useToast,
} from '../components/Ui';
import { atlas, format, getDepartment } from '../data/atlas';
import { useAtlas } from '../state/AtlasContext';
import type { CommercialRecommendation } from '../state/recommendations';

const recommendationCategories = ['production', 'integrity', 'finance', 'legal', 'hse', 'projects'];

function prototypeTime(sequence: number) {
  return `2026-08-01T11:${String(sequence % 60).padStart(2, '0')}:00+01:00`;
}

export function ProjectsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const selected = atlas.projects.find((project) => project.id === selectedProjectId);
  const atRisk = atlas.projects.filter((project) => project.status === 'at_risk').length;
  const delayed = atlas.projects.filter((project) => project.status === 'delayed').length;
  const averageProgress = Math.round(
    atlas.projects.reduce((sum, project) => sum + project.progressPercent, 0) /
      atlas.projects.length,
  );

  return (
    <>
      <PageHeader
        title="Projects"
        description="Portfolio delivery, milestones, constraints and intervention priorities."
        controls={<ContextControls />}
      />
      <div className="grid grid--4">
        <KpiCard
          label="Business Plan Delivery"
          value="At risk"
          status="at_risk"
          context={`${atRisk + delayed} of ${atlas.projects.length} projects need attention`}
        />
        <KpiCard
          label="Projects on track"
          value={String(atlas.projects.filter((project) => project.status === 'on_track').length)}
          status="on_track"
          context={`${atlas.projects.length} active projects`}
        />
        <KpiCard
          label="Average progress"
          value={`${averageProgress}%`}
          status={averageProgress >= 70 ? 'on_track' : 'at_risk'}
          context="Across the approved portfolio"
        />
        <KpiCard
          label="Delayed projects"
          value={String(delayed)}
          status={delayed ? 'delayed' : 'on_track'}
          context="Requires Commercial intervention"
        />
      </div>
      <Panel title="Project portfolio" className="section">
        <DataTable
          caption="Commercial project portfolio"
          headers={['Project', 'Status', 'Progress', 'Plan', 'Owner', 'Target date', 'Issue']}
          rows={atlas.projects.map((project) => [
            project.name,
            <StatusBadge status={project.status} />,
            <div className="progress-cell">
              <progress value={project.progressPercent} max={100} />
              <span>{project.progressPercent}%</span>
            </div>,
            `${project.planPercent}%`,
            getDepartment(project.ownerDepartmentId)?.name ?? 'Unassigned',
            format.date(project.targetDate),
            project.issue ?? 'No material issue',
          ])}
          onRowClick={(index) => setSelectedProjectId(atlas.projects[index].id)}
        />
      </Panel>
      <Drawer
        title={selected?.name ?? ''}
        open={Boolean(selected)}
        onClose={() => setSelectedProjectId(null)}
      >
        {selected && (
          <>
            <StatusBadge status={selected.status} />
            <dl className="summary-list">
              <div>
                <dt>Progress</dt>
                <dd>{selected.progressPercent}%</dd>
              </div>
              <div>
                <dt>Approved plan</dt>
                <dd>{selected.planPercent}%</dd>
              </div>
              <div>
                <dt>Target date</dt>
                <dd>{format.date(selected.targetDate)}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{getDepartment(selected.ownerDepartmentId)?.name}</dd>
              </div>
            </dl>
            <h3>Current issue</h3>
            <p>{selected.issue ?? 'No material issue reported.'}</p>
            <div className="info-panel">
              <strong>Synthetic evidence</strong>
              <span>{atlas.meta.disclosure}</span>
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}

export function RecommendationsPage() {
  const { activeUserId, recommendations, recommendationDispatch } = useAtlas();
  const showToast = useToast();
  const [category, setCategory] = useState('production');
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [impact, setImpact] = useState('');
  const [editing, setEditing] = useState<CommercialRecommendation | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editRationale, setEditRationale] = useState('');
  const [editImpact, setEditImpact] = useState('');

  const openEdit = (item: CommercialRecommendation) => {
    setEditing(item);
    setEditCategory(item.category);
    setEditTitle(item.title);
    setEditRationale(item.rationale);
    setEditImpact(item.impact);
  };

  return (
    <>
      <PageHeader
        title="Decision Support"
        description="Review Recommended Actions and shape the items proposed for executive decision."
        controls={<ContextControls />}
      />
      <Panel title="Write a Commercial Recommended Action" className="recommendation-compose">
        <p>
          Add your judgement prominently before consolidation. Every Recommended Action remains
          editable and auditable in this device-local prototype.
        </p>
        <div className="form-grid">
          <Field label="Category">
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {recommendationCategories.map((item) => (
                <option key={item} value={item}>
                  {item[0].toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Recommended Action title">
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Rationale">
            <textarea
              rows={4}
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
            />
          </Field>
          <Field label="Expected impact">
            <textarea rows={4} value={impact} onChange={(event) => setImpact(event.target.value)} />
          </Field>
        </div>
        {recommendations.error && <p className="field__error">{recommendations.error}</p>}
        <div className="form-actions">
          <Button
            disabled={!title.trim() || !rationale.trim() || !impact.trim()}
            onClick={() => {
              recommendationDispatch({
                type: 'CREATE_RECOMMENDATION',
                category,
                title,
                rationale,
                impact,
                actorId: activeUserId,
                now: prototypeTime(recommendations.auditEvents.length + 1),
              });
              setTitle('');
              setRationale('');
              setImpact('');
              showToast('Commercial Recommended Action added');
            }}
          >
            Add Recommended Action
          </Button>
        </div>
      </Panel>

      <Panel title="System and Commercial Recommended Actions" className="section recommendations">
        {recommendations.items.map((item) => (
          <article className="recommendation" key={item.id}>
            <div>
              <StatusBadge status={item.status} />
              <small>
                {item.source === 'atlas_system' ? 'Atlas system' : 'Commercial Manager'}
              </small>
            </div>
            <div>
              <h3>{item.title}</h3>
              <p>{item.rationale}</p>
              <small>{item.impact}</small>
            </div>
            <div className="recommendation-actions">
              <Button variant="secondary" onClick={() => openEdit(item)}>
                Edit
              </Button>
              <Button
                disabled={item.status === 'approved'}
                onClick={() => {
                  recommendationDispatch({
                    type: 'APPROVE_RECOMMENDATION',
                    id: item.id,
                    actorId: activeUserId,
                    now: prototypeTime(recommendations.auditEvents.length + 1),
                  });
                  showToast('Recommended Action approved by Commercial');
                }}
              >
                {item.status === 'approved' ? 'Approved' : 'Approve'}
              </Button>
            </div>
          </article>
        ))}
      </Panel>

      <Modal
        title={`Edit Recommended Action${editing ? ` · ${editing.title}` : ''}`}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editTitle.trim() || !editRationale.trim() || !editImpact.trim()}
              onClick={() => {
                if (!editing) return;
                recommendationDispatch({
                  type: 'EDIT_RECOMMENDATION',
                  id: editing.id,
                  category: editCategory,
                  title: editTitle,
                  rationale: editRationale,
                  impact: editImpact,
                  actorId: activeUserId,
                  now: prototypeTime(recommendations.auditEvents.length + 1),
                });
                setEditing(null);
                showToast('Recommended Action edits saved with an audit event');
              }}
            >
              Save changes
            </Button>
          </>
        }
      >
        <Field label="Category">
          <select value={editCategory} onChange={(event) => setEditCategory(event.target.value)}>
            {recommendationCategories.map((item) => (
              <option key={item} value={item}>
                {item[0].toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Recommended Action title">
          <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
        </Field>
        <Field label="Rationale">
          <textarea
            rows={4}
            value={editRationale}
            onChange={(event) => setEditRationale(event.target.value)}
          />
        </Field>
        <Field label="Expected impact">
          <textarea
            rows={4}
            value={editImpact}
            onChange={(event) => setEditImpact(event.target.value)}
          />
        </Field>
      </Modal>
    </>
  );
}
