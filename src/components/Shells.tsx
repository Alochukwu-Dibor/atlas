import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  ClipboardCheck,
  FileText,
  Gavel,
  LayoutDashboard,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { atlas, getAsset, getCycle, getDepartment, getUser } from '../data/atlas';
import { useAtlas } from '../state/AtlasContext';
import { Button, Drawer, Field, Select, StateView, StatusBadge, useToast } from './Ui';

const commercialNavItems = [
  { to: '/commercial', label: 'Business Overview', icon: LayoutDashboard },
  { to: '/execution', label: 'Execution', icon: Activity },
  { to: '/projects', label: 'Projects', icon: BriefcaseBusiness },
  { to: '/reviews', label: 'Reviews', icon: ClipboardCheck },
  { to: '/decisions', label: 'Decisions', icon: Lightbulb },
  { to: '/outputs', label: 'Outputs', icon: FileText },
];

const commercialConfigurationItems = [
  { to: '/kpi-library', label: 'KPI Library', icon: BarChart3 },
  { to: '/reporting-templates', label: 'Reporting Templates', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Gavel },
];

const executiveNavItems = [
  { to: '/executive', label: 'CEO View', icon: LayoutDashboard },
  { to: '/executive/cfo', label: 'CFO View', icon: BarChart3 },
  { to: '/executive/decisions', label: 'Decisions', icon: Lightbulb },
  { to: '/executive/outputs', label: 'Outputs', icon: FileText },
];

export function Brand() {
  return (
    <div className="brand">
      <span className="brand__mark">A</span>
      <div>
        <strong>Atlas</strong>
        <small>Shoreline Natural Resources</small>
      </div>
    </div>
  );
}

function PersonaControl() {
  const { activeUserId, setActiveUserId, setCycleId, setDepartmentId } = useAtlas();
  const navigate = useNavigate();
  const roles = atlas.users;
  const onChange = (id: string) => {
    setActiveUserId(id);
    const role = getUser(id)?.role;
    const selectedUser = getUser(id);
    if (selectedUser?.departmentId) setDepartmentId(selectedUser.departmentId);
    setCycleId(
      ['ceo', 'cfo'].includes(role ?? '')
        ? atlas.demoStates.defaultPublishedCycleId
        : atlas.demoStates.defaultOpenCycleId,
    );
    navigate(
      role === 'ceo'
        ? '/executive'
        : role === 'cfo'
          ? '/executive/cfo'
          : role === 'department_manager'
            ? '/department'
            : '/commercial',
    );
  };
  return (
    <Select
      label="Active demo persona"
      value={activeUserId}
      onChange={onChange}
      options={roles.map((user) => ({ value: user.id, label: user.title }))}
    />
  );
}

function DepartmentControl() {
  const { departmentId, setDepartmentId } = useAtlas();
  return (
    <Select
      label="Department workspace"
      value={departmentId}
      onChange={setDepartmentId}
      options={atlas.departments.map((department) => ({
        value: department.id,
        label: department.name,
      }))}
    />
  );
}

function AssignedActionInbox({
  responsibleOnly = false,
  responsibleUserId,
}: {
  responsibleOnly?: boolean;
  responsibleUserId?: string | null;
}) {
  const { activeUserId, executive, executiveDispatch } = useAtlas();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const assigned = executive.decisions.filter(
    (decision) =>
      decision.ownerId &&
      (!responsibleOnly || decision.ownerId === (responsibleUserId ?? activeUserId)),
  );
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Assigned actions ({assigned.length})
      </Button>
      <Drawer title="Executive assigned actions" open={open} onClose={() => setOpen(false)}>
        {assigned.length === 0 ? (
          <p>No CEO actions are assigned to this workspace.</p>
        ) : (
          assigned.map((decision) => {
            const recommendation = atlas.recommendations.find(
              (item) => item.id === decision.recommendationId,
            );
            return (
              <article className="comment-card" key={decision.id}>
                <StatusBadge status={decision.status} />
                <strong>{recommendation?.title}</strong>
                <p>{decision.rationale}</p>
                <small>
                  Owner: {getUser(decision.ownerId ?? '')?.name} · Due {decision.dueDate}
                </small>
                {decision.progressNote && <p>Latest progress: {decision.progressNote}</p>}
                <Field label="Action status">
                  <select
                    value={decision.status}
                    onChange={(event) =>
                      executiveDispatch({
                        type: 'UPDATE_ACTION_PROGRESS',
                        decisionId: decision.id,
                        status: event.target.value as typeof decision.status,
                        progressNote:
                          notes[decision.id] ?? 'Status reviewed in the responsible workspace.',
                        actorId: activeUserId,
                      })
                    }
                  >
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="awaiting_verification">Awaiting verification</option>
                    <option value="completed">Completed</option>
                  </select>
                </Field>
                <Field label="Progress note">
                  <textarea
                    rows={3}
                    value={notes[decision.id] ?? ''}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [decision.id]: event.target.value }))
                    }
                  />
                </Field>
                <Button
                  disabled={!notes[decision.id]?.trim()}
                  onClick={() => {
                    executiveDispatch({
                      type: 'UPDATE_ACTION_PROGRESS',
                      decisionId: decision.id,
                      status: decision.status,
                      progressNote: notes[decision.id],
                      actorId: activeUserId,
                    });
                    setNotes((current) => ({ ...current, [decision.id]: '' }));
                  }}
                >
                  Save progress
                </Button>
              </article>
            );
          })
        )}
      </Drawer>
    </>
  );
}

function ScenarioOutlet() {
  const { scenarioId, resetDemo } = useAtlas();
  if (scenarioId === 'processing') {
    return (
      <StateView
        type="loading"
        title="Loading execution data"
        message="Atlas is applying the selected asset and reporting-period context."
        action={<Button onClick={resetDemo}>Restore canonical data</Button>}
      />
    );
  }
  if (scenarioId === 'empty') {
    return (
      <StateView
        type="empty"
        title="No execution data"
        message="No updates are available for this synthetic scenario. Submit an update or restore the canonical demo."
        action={<Button onClick={resetDemo}>Restore canonical data</Button>}
      />
    );
  }
  if (scenarioId === 'conflict') {
    return (
      <StateView
        type="error"
        title="Conflicting sources require review"
        message="The document and XLSX fixture disagree. Open the update review or restore the canonical demo."
        action={<Button onClick={resetDemo}>Restore canonical data</Button>}
      />
    );
  }
  return <Outlet />;
}

function Profile() {
  const { activeUserId } = useAtlas();
  const user = getUser(activeUserId)!;
  return (
    <div className="profile">
      <span className="avatar">
        {user.name
          .split(' ')
          .map((name) => name[0])
          .join('')
          .slice(0, 2)}
      </span>
      <div>
        <strong>{user.name}</strong>
        <small>{user.title}</small>
      </div>
    </div>
  );
}

export function ContextControls({ allowOpenCycle = true }: { allowOpenCycle?: boolean }) {
  const {
    assetId,
    setAssetId,
    businessUnitId,
    setBusinessUnitId,
    cycleId,
    setCycleId,
    scenarioId,
    setScenarioId,
    resetDemo,
    workflow,
  } = useAtlas();
  const showToast = useToast();
  const cycles = allowOpenCycle
    ? atlas.reportingCycles
    : atlas.reportingCycles.filter(
        (cycle) =>
          cycle.status === 'published_locked' ||
          workflow.publications.some(
            (publication) =>
              publication.cycleId === cycle.id && publication.status === 'published_locked',
          ),
      );
  return (
    <>
      <Select
        label="Business unit"
        value={businessUnitId}
        onChange={setBusinessUnitId}
        options={atlas.businessUnits.map((unit) => ({ value: unit.id, label: unit.name }))}
      />
      <Select
        label="Asset context"
        value={assetId}
        onChange={setAssetId}
        options={atlas.assets.map((asset) => ({ value: asset.id, label: asset.label }))}
      />
      <Select
        label="Reporting period"
        value={cycleId}
        onChange={setCycleId}
        options={cycles.map((cycle) => ({ value: cycle.id, label: cycle.label }))}
      />
      <Select
        label="Demo scenario"
        value={scenarioId}
        onChange={(value) => setScenarioId(value as typeof scenarioId)}
        options={atlas.demoStates.availableScenarios.map((scenario) => ({
          value: scenario.id,
          label: scenario.label,
        }))}
      />
      <Button
        variant="secondary"
        onClick={() => {
          if (!window.confirm('Reset all device-local Atlas demo changes?')) return;
          resetDemo();
          showToast('Canonical demo scenario restored');
        }}
      >
        <RefreshCw aria-hidden="true" />
        Reset demo
      </Button>
    </>
  );
}

export function SidebarShell() {
  const { role, activeUserId } = useAtlas();
  if (!['commercial_manager', 'ceo', 'cfo'].includes(role)) {
    return (
      <StateView
        type="no-access"
        title="No access"
        message="Department Managers cannot access the Commercial or executive performance workspace."
        action={
          <Button onClick={() => window.location.assign('/department')}>
            Return to Department reporting
          </Button>
        }
      />
    );
  }
  const primaryItems = role === 'commercial_manager' ? commercialNavItems : executiveNavItems;
  return (
    <div className="shell shell--sidebar">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Primary navigation">
          {primaryItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
              <Icon aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        {role === 'commercial_manager' && (
          <nav aria-label="Configuration navigation" className="sidebar__configuration">
            <span className="sidebar__section-label">Configuration</span>
            {commercialConfigurationItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                <Icon aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
        <div className="sidebar__footer">
          <AssignedActionInbox />
          <PersonaControl />
          <Profile />
          <span className="synthetic-note">Synthetic prototype data</span>
        </div>
      </aside>
      <main className="workspace">
        <ScenarioOutlet key={activeUserId} />
      </main>
    </div>
  );
}

export function DepartmentShell() {
  const { role, departmentId } = useAtlas();
  const department = getDepartment(departmentId)!;
  const manager = getUser(department.managerId ?? '');
  if (role !== 'department_manager') {
    return (
      <StateView
        type="no-access"
        title="Department workspace restricted"
        message="Switch to a Department Manager persona to access Weekly Execution Updates."
        action={<PersonaControl />}
      />
    );
  }
  return (
    <div className="shell shell--department">
      <header className="department-header">
        <Brand />
        <span className="module-label">
          <FileText aria-hidden="true" />
          Weekly Execution Updates · {department.name}
        </span>
        <span className="last-updated">Last updated 1 Aug 2026 · 09:00 WAT</span>
        <div className="department-header__actions">
          <nav className="contributor-nav" aria-label="Contributor navigation">
            <NavLink to="/department/reports/new">Submit Update</NavLink>
            <NavLink to="/department">My Updates</NavLink>
          </nav>
          <PersonaControl />
          <DepartmentControl />
          <AssignedActionInbox responsibleOnly responsibleUserId={department.managerId} />
          <div className="profile">
            <span className="avatar">
              {(manager?.name ?? department.name)
                .split(' ')
                .map((name) => name[0])
                .join('')
                .slice(0, 2)}
            </span>
            <div>
              <strong>{manager?.name ?? 'Acting Department Manager'}</strong>
              <small>{manager?.title ?? `${department.name} Manager`}</small>
            </div>
          </div>
        </div>
      </header>
      <main className="department-workspace">
        <ScenarioOutlet />
      </main>
    </div>
  );
}

export function ExecutiveShell() {
  const { role } = useAtlas();
  if (!['ceo', 'cfo'].includes(role)) {
    return (
      <StateView
        type="no-access"
        title="Executive workspace restricted"
        message="Only an Executive persona can view validated executive information."
        action={<PersonaControl />}
      />
    );
  }
  return (
    <div className="shell shell--executive">
      <header className="executive-header">
        <Brand />
        <nav className="executive-nav" aria-label="Executive navigation">
          {executiveNavItems.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/executive'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="executive-header__actions">
          <PersonaControl />
          <Profile />
        </div>
      </header>
      <main className="executive-workspace">
        <ScenarioOutlet />
      </main>
    </div>
  );
}

export function NotFound() {
  const location = useLocation();
  return (
    <StateView
      type="empty"
      title="Page not found"
      message={`No Atlas route matches ${location.pathname}.`}
      action={<Button onClick={() => window.location.assign('/commercial')}>Go to overview</Button>}
    />
  );
}

export function RouteIndex() {
  const { role } = useAtlas();
  const navigate = useNavigate();
  const target =
    role === 'ceo'
      ? '/executive'
      : role === 'cfo'
        ? '/executive/cfo'
        : role === 'department_manager'
          ? '/department'
          : '/commercial';
  queueMicrotask(() => navigate(target, { replace: true }));
  return (
    <StateView
      type="loading"
      title="Loading Atlas"
      message={`${getAsset(atlas.organisation.defaultAssetId).name} · ${getCycle(atlas.demoStates.defaultPublishedCycleId).label}`}
    />
  );
}
