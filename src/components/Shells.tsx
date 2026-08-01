import {
  Activity,
  BarChart3,
  ClipboardCheck,
  FileText,
  Gavel,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { atlas, getAsset, getCycle, getDepartment, getUser } from '../data/atlas';
import { useAtlas } from '../state/AtlasContext';
import { Button, Select, StateView, useToast } from './Ui';

const navItems = [
  { to: '/commercial', label: 'Overview', icon: LayoutDashboard },
  { to: '/production', label: 'Production', icon: Activity },
  { to: '/finance', label: 'Finance', icon: BarChart3 },
  { to: '/hse', label: 'HSE', icon: ShieldCheck },
  { to: '/legal', label: 'Legal & Regulatory', icon: Gavel },
  { to: '/commercial/review/rpt_fin_w30', label: 'Reports / Review Queue', icon: ClipboardCheck },
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
  const { activeUserId, setActiveUserId } = useAtlas();
  const navigate = useNavigate();
  const roles = atlas.users.filter((user) =>
    ['usr_ceo', 'usr_commercial', 'usr_operations'].includes(user.id),
  );
  const onChange = (id: string) => {
    setActiveUserId(id);
    const role = getUser(id)?.role;
    navigate(
      role === 'ceo' ? '/executive' : role === 'department_manager' ? '/department' : '/commercial',
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

function ScenarioOutlet() {
  const { scenarioId, resetDemo } = useAtlas();
  if (scenarioId === 'processing') {
    return (
      <StateView
        type="loading"
        title="Loading reporting data"
        message="Atlas is applying the selected asset and reporting-period context."
        action={<Button onClick={resetDemo}>Restore canonical data</Button>}
      />
    );
  }
  if (scenarioId === 'empty') {
    return (
      <StateView
        type="empty"
        title="No reporting data"
        message="No submissions are available for this synthetic scenario. Start a report or restore the canonical demo."
        action={<Button onClick={resetDemo}>Restore canonical data</Button>}
      />
    );
  }
  if (scenarioId === 'conflict') {
    return (
      <StateView
        type="error"
        title="Conflicting sources require review"
        message="The document and XLSX fixture disagree. Open the report review or restore the canonical demo."
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
  const { assetId, setAssetId, cycleId, setCycleId, scenarioId, setScenarioId, resetDemo } =
    useAtlas();
  const showToast = useToast();
  const cycles = allowOpenCycle
    ? atlas.reportingCycles
    : atlas.reportingCycles.filter((cycle) => cycle.status === 'published_locked');
  return (
    <>
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
  if (!['commercial_manager', 'ceo'].includes(role)) {
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
  return (
    <div className="shell shell--sidebar">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Primary navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
              <Icon aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
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
  const { role, activeUserId } = useAtlas();
  const user = getUser(activeUserId)!;
  const department = getDepartment(user.departmentId);
  if (role !== 'department_manager') {
    return (
      <StateView
        type="no-access"
        title="Department workspace restricted"
        message="Switch to a Department Manager persona to access reporting."
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
          Reporting · {department?.name}
        </span>
        <span className="last-updated">Last updated 1 Aug 2026 · 09:00 WAT</span>
        <div className="department-header__actions">
          <PersonaControl />
          <NavLink to="/department/reports/new" className="button button--primary">
            New Report
          </NavLink>
          <Profile />
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
  if (role !== 'ceo') {
    return (
      <StateView
        type="no-access"
        title="Executive workspace restricted"
        message="Only the CEO persona can view published executive updates."
        action={<PersonaControl />}
      />
    );
  }
  return (
    <div className="shell shell--executive">
      <header className="executive-header">
        <Brand />
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
    role === 'ceo' ? '/executive' : role === 'department_manager' ? '/department' : '/commercial';
  queueMicrotask(() => navigate(target, { replace: true }));
  return (
    <StateView
      type="loading"
      title="Loading Atlas"
      message={`${getAsset(atlas.organisation.defaultAssetId).name} · ${getCycle(atlas.demoStates.defaultPublishedCycleId).label}`}
    />
  );
}
