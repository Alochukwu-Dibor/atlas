import { BarChart3, BriefcaseBusiness, ChevronDown, FileText, LayoutDashboard } from 'lucide-react';
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

export function Brand() {
  return <div className="brand">Atlas</div>;
}

function PersonaControl() {
  const { activeUserId, role, setActiveUserId, setCycleId, setDepartmentId } = useAtlas();
  const navigate = useNavigate();
  const onChange = (id: string) => {
    const resolvedId =
      id === 'manager'
        ? (atlas.departments.find((department) => department.managerId)?.managerId ??
          'usr_projects')
        : id;
    setActiveUserId(resolvedId);
    const nextRole = getUser(resolvedId)?.role;
    const selectedUser = getUser(resolvedId);
    if (selectedUser?.departmentId) setDepartmentId(selectedUser.departmentId);
    setCycleId(atlas.demoStates.defaultOpenCycleId);
    navigate(
      nextRole === 'ceo'
        ? '/executive'
        : nextRole === 'cfo'
          ? '/executive/cfo'
          : nextRole === 'department_manager'
            ? '/manager/weekly-updates'
            : '/commercial',
    );
  };
  const user = getUser(activeUserId)!;
  const selectedPersona = role === 'department_manager' ? 'manager' : activeUserId;
  const personaOptions = [
    { value: 'usr_ceo', label: 'Chief Executive Officer' },
    { value: 'usr_cfo', label: 'Chief Financial Officer' },
    { value: 'usr_commercial', label: 'Commercial Manager' },
    { value: 'manager', label: 'Manager' },
  ];
  return (
    <label className="persona-control">
      <span className="avatar" aria-hidden="true" />
      <span className="persona-control__identity">
        <strong>{user.name}</strong>
        <small>{role === 'department_manager' ? 'Manager' : user.title}</small>
      </span>
      <ChevronDown aria-hidden="true" />
      <select
        aria-label="Active demo persona"
        value={selectedPersona}
        onChange={(event) => onChange(event.target.value)}
      >
        {personaOptions.map((persona) => (
          <option key={persona.value} value={persona.value}>
            {persona.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DepartmentControl() {
  const { role, departmentId, setDepartmentId, setActiveUserId } = useAtlas();
  return (
    <Select
      label="Department workspace"
      value={departmentId}
      onChange={(nextDepartmentId) => {
        setDepartmentId(nextDepartmentId);
        const managerId = atlas.departments.find(
          (department) => department.id === nextDepartmentId,
        )?.managerId;
        if (role === 'department_manager' && managerId) setActiveUserId(managerId);
      }}
      options={atlas.departments.map((department) => ({
        value: department.id,
        label: department.name,
      }))}
    />
  );
}

function ScenarioOutlet() {
  const { plan, role, scenarioId, resetDemo } = useAtlas();
  const location = useLocation();
  if (!plan.confirmedPlan && (role === 'ceo' || role === 'cfo')) {
    return (
      <StateView
        type="empty"
        title="No confirmed plan data"
        message="A Commercial Manager must confirm an approved plan before executive data is available."
      />
    );
  }
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
          <Button onClick={() => window.location.assign('/manager/weekly-updates')}>
            Return to Manager workspace
          </Button>
        }
      />
    );
  }
  const primaryItems =
    role === 'commercial_manager'
      ? commercialNavItems
      : [
          {
            to: role === 'cfo' ? '/executive/cfo' : '/executive',
            label: 'Dashboard',
            icon: LayoutDashboard,
          },
          { to: '/executive/view-updates', label: 'View Updates', icon: FileText },
        ];
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

export function ManagerShell() {
  const { role, activeUserId } = useAtlas();
  if (role !== 'department_manager') {
    return (
      <StateView
        type="no-access"
        title="Manager workspace restricted"
        message="Switch to the Manager persona to access this workspace. Commercial Managers create their own update from Reporting."
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
          <nav className="contributor-nav" aria-label="Manager navigation">
            <NavLink to="/manager/weekly-updates">Weekly Updates</NavLink>
            <NavLink to="/manager/submissions">Submissions</NavLink>
          </nav>
        </div>
      </header>
      <main className="department-workspace">
        <ScenarioOutlet key={activeUserId} />
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
  const dashboardPath = role === 'cfo' ? '/executive/cfo' : '/executive';
  const executiveNavItems = [
    { to: dashboardPath, label: 'Dashboard' },
    { to: '/executive/view-updates', label: 'View Updates' },
  ];
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
              <NavLink key={to} to={to} end>
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
          ? '/manager/weekly-updates'
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
