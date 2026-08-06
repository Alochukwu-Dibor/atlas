import {
  BarChart3,
  BriefcaseBusiness,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Lightbulb,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { atlas, getAsset, getCycle, getUser } from '../data/atlas';
import { useAtlas } from '../state/AtlasContext';
import { Button, Select, StateView } from './Ui';

const commercialNavItems = [
  { to: '/commercial', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/plan', label: 'Plan', icon: FileText },
  { to: '/projects', label: 'Projects', icon: BriefcaseBusiness },
  { to: '/reviews', label: 'Reporting', icon: BarChart3 },
];

const executiveNavItems = [
  { to: '/executive', label: 'CEO View', icon: LayoutDashboard },
  { to: '/executive/cfo', label: 'CFO View', icon: BarChart3 },
  { to: '/executive/decisions', label: 'Decisions', icon: Lightbulb },
  { to: '/executive/outputs', label: 'Outputs', icon: FileText },
];

export function Brand() {
  return <div className="brand">Atlas</div>;
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
  const user = getUser(activeUserId)!;
  return (
    <label className="persona-control">
      <span className="avatar" aria-hidden="true" />
      <span className="persona-control__identity">
        <strong>{user.name}</strong>
        <small>{user.title}</small>
      </span>
      <ChevronDown aria-hidden="true" />
      <select
        aria-label="Active demo persona"
        value={activeUserId}
        onChange={(event) => onChange(event.target.value)}
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.title}
          </option>
        ))}
      </select>
    </label>
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

function ScenarioOutlet() {
  const { scenarioId, resetDemo } = useAtlas();
  const location = useLocation();
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
  if (scenarioId === 'empty' && location.pathname !== '/commercial') {
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
    <div className="shell shell--top">
      <header className="app-header">
        <div className="app-header__top">
          <Brand />
          <div className="app-header__actions">
            <PersonaControl />
          </div>
        </div>
        <div className="app-header__nav-row">
          <nav aria-label="Primary navigation" className="top-nav">
            {primaryItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                <Icon aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <span className="synthetic-note">Synthetic prototype data</span>
      </header>
      <main className="workspace">
        <ScenarioOutlet key={activeUserId} />
      </main>
    </div>
  );
}

export function DepartmentShell() {
  const { role } = useAtlas();
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
      <header className="app-header department-header">
        <div className="app-header__top">
          <Brand />
          <div className="app-header__actions department-header__actions">
            <DepartmentControl />
            <PersonaControl />
          </div>
        </div>
        <div className="app-header__nav-row">
          <nav className="contributor-nav" aria-label="Contributor navigation">
            <NavLink to="/department/reports/new">Submit Update</NavLink>
            <NavLink to="/department" end>
              My Updates
            </NavLink>
          </nav>
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
      <header className="app-header executive-header">
        <div className="app-header__top">
          <Brand />
          <div className="app-header__actions executive-header__actions">
            <PersonaControl />
          </div>
        </div>
        <div className="app-header__nav-row">
          <nav className="executive-nav" aria-label="Executive navigation">
            {executiveNavItems.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/executive'}>
                {label}
              </NavLink>
            ))}
          </nav>
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
