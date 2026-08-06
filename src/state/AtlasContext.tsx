import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import { atlas, type PersonaRole, type ScenarioId } from '../data/atlas';
import {
  loadWorkflowState,
  workflowReducer,
  workflowStorageKey,
  type WorkflowAction,
  type WorkflowState,
} from './workflow';
import {
  executiveReducer,
  executiveStorageKey,
  loadExecutiveState,
  type ExecutiveAction,
  type ExecutiveState,
} from './executive';
import {
  loadRecommendationState,
  recommendationReducer,
  recommendationStorageKey,
  type RecommendationAction,
  type RecommendationState,
} from './recommendations';
import {
  loadPlanState,
  planReducer,
  planStorageKey,
  type PlanAction,
  type PlanState,
} from './plan';
import {
  loadManagerUpdatesState,
  managerUpdatesReducer,
  managerUpdatesStorageKey,
  type ManagerUpdatesAction,
  type ManagerUpdatesState,
} from './managerUpdates';

interface AtlasState {
  activeUserId: string;
  role: PersonaRole;
  assetId: string;
  businessUnitId: string;
  planningPeriodId: string;
  cycleId: string;
  departmentId: string;
  scenarioId: ScenarioId;
  workflow: WorkflowState;
  workflowDispatch: Dispatch<WorkflowAction>;
  executive: ExecutiveState;
  executiveDispatch: Dispatch<ExecutiveAction>;
  recommendations: RecommendationState;
  recommendationDispatch: Dispatch<RecommendationAction>;
  plan: PlanState;
  planDispatch: Dispatch<PlanAction>;
  managerUpdates: ManagerUpdatesState;
  managerUpdatesDispatch: Dispatch<ManagerUpdatesAction>;
  setActiveUserId: (id: string) => void;
  setAssetId: (id: string) => void;
  setBusinessUnitId: (id: string) => void;
  setPlanningPeriodId: (id: string) => void;
  setCycleId: (id: string) => void;
  setDepartmentId: (id: string) => void;
  setScenarioId: (id: ScenarioId) => void;
  resetDemo: () => void;
  resetAtlas: () => void;
}

const AtlasContext = createContext<AtlasState | null>(null);

export function AtlasProvider({ children }: { children: ReactNode }) {
  const defaults = atlas.demoStates;
  const [activeUserId, setActiveUserId] = useState(defaults.defaultPersonaId);
  const [assetId, setAssetId] = useState(atlas.organisation.defaultAssetId);
  const [businessUnitId, setBusinessUnitId] = useState(atlas.businessUnits[0].id);
  const [planningPeriodId, setPlanningPeriodId] = useState(atlas.planningPeriods[0].id);
  const [cycleId, setCycleId] = useState(defaults.defaultOpenCycleId);
  const [departmentId, setDepartmentId] = useState('dept_operations');
  const [scenarioId, setScenarioState] = useState<ScenarioId>('canonical');
  const [workflow, workflowDispatch] = useReducer(workflowReducer, undefined, loadWorkflowState);
  const [executive, executiveDispatch] = useReducer(
    executiveReducer,
    undefined,
    loadExecutiveState,
  );
  const [recommendations, recommendationDispatch] = useReducer(
    recommendationReducer,
    undefined,
    loadRecommendationState,
  );
  const [plan, planDispatch] = useReducer(planReducer, undefined, loadPlanState);
  const [managerUpdates, managerUpdatesDispatch] = useReducer(
    managerUpdatesReducer,
    undefined,
    loadManagerUpdatesState,
  );
  const role = atlas.users.find((user) => user.id === activeUserId)?.role ?? 'commercial_manager';

  useEffect(() => {
    window.localStorage.setItem(workflowStorageKey, JSON.stringify(workflow));
  }, [workflow]);

  useEffect(() => {
    window.localStorage.setItem(executiveStorageKey, JSON.stringify(executive));
  }, [executive]);

  useEffect(() => {
    window.localStorage.setItem(recommendationStorageKey, JSON.stringify(recommendations));
  }, [recommendations]);

  useEffect(() => {
    window.localStorage.setItem(planStorageKey, JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    window.localStorage.setItem(managerUpdatesStorageKey, JSON.stringify(managerUpdates));
  }, [managerUpdates]);

  const value = useMemo<AtlasState>(
    () => ({
      activeUserId,
      role,
      assetId,
      businessUnitId,
      planningPeriodId,
      cycleId,
      departmentId,
      scenarioId,
      workflow,
      workflowDispatch,
      executive,
      executiveDispatch,
      recommendations,
      recommendationDispatch,
      plan,
      planDispatch,
      managerUpdates,
      managerUpdatesDispatch,
      setActiveUserId,
      setAssetId,
      setBusinessUnitId,
      setPlanningPeriodId,
      setCycleId,
      setDepartmentId,
      setScenarioId: (id) => {
        setScenarioState(id);
        if (id === 'ready_to_publish') {
          setCycleId(defaults.defaultOpenCycleId);
          workflowDispatch({
            type: 'APPLY_READY_SCENARIO',
            cycleId: defaults.defaultOpenCycleId,
            actorId: activeUserId,
            now: '2026-08-01T10:45:00+01:00',
          });
        }
      },
      resetDemo: () => {
        setActiveUserId(defaults.defaultPersonaId);
        setAssetId(atlas.organisation.defaultAssetId);
        setBusinessUnitId(atlas.businessUnits[0].id);
        setPlanningPeriodId(atlas.planningPeriods[0].id);
        setCycleId(defaults.defaultOpenCycleId);
        setDepartmentId('dept_operations');
        setScenarioState('canonical');
        window.localStorage.removeItem(workflowStorageKey);
        window.localStorage.removeItem(executiveStorageKey);
        window.localStorage.removeItem(recommendationStorageKey);
        window.localStorage.removeItem(planStorageKey);
        window.localStorage.removeItem(managerUpdatesStorageKey);
        workflowDispatch({ type: 'RESET' });
        executiveDispatch({ type: 'RESET' });
        recommendationDispatch({ type: 'RESET' });
        planDispatch({ type: 'RESET' });
        managerUpdatesDispatch({ type: 'RESET' });
      },
      resetAtlas: () => {
        setAssetId(atlas.organisation.defaultAssetId);
        setBusinessUnitId(atlas.businessUnits[0].id);
        setPlanningPeriodId(atlas.planningPeriods[0].id);
        setCycleId(defaults.defaultOpenCycleId);
        setDepartmentId('dept_operations');
        setScenarioState('canonical');
        window.localStorage.removeItem(workflowStorageKey);
        window.localStorage.removeItem(executiveStorageKey);
        window.localStorage.removeItem(recommendationStorageKey);
        window.localStorage.removeItem(planStorageKey);
        window.localStorage.removeItem(managerUpdatesStorageKey);
        workflowDispatch({ type: 'CLEAR_ALL' });
        executiveDispatch({ type: 'CLEAR_ALL' });
        recommendationDispatch({ type: 'CLEAR_ALL' });
        planDispatch({ type: 'RESET' });
        managerUpdatesDispatch({ type: 'CLEAR_ALL' });
      },
    }),
    [
      activeUserId,
      assetId,
      businessUnitId,
      cycleId,
      departmentId,
      defaults.defaultPersonaId,
      defaults.defaultOpenCycleId,
      role,
      scenarioId,
      workflow,
      executive,
      recommendations,
      plan,
      managerUpdates,
      planningPeriodId,
    ],
  );

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}

export function useAtlas() {
  const context = useContext(AtlasContext);
  if (!context) throw new Error('useAtlas must be used inside AtlasProvider');
  return context;
}
