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

interface AtlasState {
  activeUserId: string;
  role: PersonaRole;
  assetId: string;
  cycleId: string;
  scenarioId: ScenarioId;
  workflow: WorkflowState;
  workflowDispatch: Dispatch<WorkflowAction>;
  executive: ExecutiveState;
  executiveDispatch: Dispatch<ExecutiveAction>;
  setActiveUserId: (id: string) => void;
  setAssetId: (id: string) => void;
  setCycleId: (id: string) => void;
  setScenarioId: (id: ScenarioId) => void;
  resetDemo: () => void;
}

const AtlasContext = createContext<AtlasState | null>(null);

export function AtlasProvider({ children }: { children: ReactNode }) {
  const defaults = atlas.demoStates;
  const [activeUserId, setActiveUserId] = useState(defaults.defaultPersonaId);
  const [assetId, setAssetId] = useState(atlas.organisation.defaultAssetId);
  const [cycleId, setCycleId] = useState(defaults.defaultOpenCycleId);
  const [scenarioId, setScenarioState] = useState<ScenarioId>('canonical');
  const [workflow, workflowDispatch] = useReducer(workflowReducer, undefined, loadWorkflowState);
  const [executive, executiveDispatch] = useReducer(
    executiveReducer,
    undefined,
    loadExecutiveState,
  );
  const role = atlas.users.find((user) => user.id === activeUserId)?.role ?? 'commercial_manager';

  useEffect(() => {
    window.localStorage.setItem(workflowStorageKey, JSON.stringify(workflow));
  }, [workflow]);

  useEffect(() => {
    window.localStorage.setItem(executiveStorageKey, JSON.stringify(executive));
  }, [executive]);

  const value = useMemo<AtlasState>(
    () => ({
      activeUserId,
      role,
      assetId,
      cycleId,
      scenarioId,
      workflow,
      workflowDispatch,
      executive,
      executiveDispatch,
      setActiveUserId,
      setAssetId,
      setCycleId,
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
        setCycleId(defaults.defaultOpenCycleId);
        setScenarioState('canonical');
        window.localStorage.removeItem(workflowStorageKey);
        window.localStorage.removeItem(executiveStorageKey);
        workflowDispatch({ type: 'RESET' });
        executiveDispatch({ type: 'RESET' });
      },
    }),
    [
      activeUserId,
      assetId,
      cycleId,
      defaults.defaultPersonaId,
      defaults.defaultOpenCycleId,
      role,
      scenarioId,
      workflow,
      executive,
    ],
  );

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}

export function useAtlas() {
  const context = useContext(AtlasContext);
  if (!context) throw new Error('useAtlas must be used inside AtlasProvider');
  return context;
}
