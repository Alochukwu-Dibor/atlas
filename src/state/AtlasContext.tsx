import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { atlas, type PersonaRole, type ScenarioId } from '../data/atlas';

interface AtlasState {
  activeUserId: string;
  role: PersonaRole;
  assetId: string;
  cycleId: string;
  scenarioId: ScenarioId;
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
  const [cycleId, setCycleId] = useState(defaults.defaultPublishedCycleId);
  const [scenarioId, setScenarioId] = useState<ScenarioId>('canonical');
  const role = atlas.users.find((user) => user.id === activeUserId)?.role ?? 'commercial_manager';

  const value = useMemo<AtlasState>(
    () => ({
      activeUserId,
      role,
      assetId,
      cycleId,
      scenarioId,
      setActiveUserId,
      setAssetId,
      setCycleId,
      setScenarioId,
      resetDemo: () => {
        setActiveUserId(defaults.defaultPersonaId);
        setAssetId(atlas.organisation.defaultAssetId);
        setCycleId(defaults.defaultPublishedCycleId);
        setScenarioId('canonical');
      },
    }),
    [
      activeUserId,
      assetId,
      cycleId,
      defaults.defaultPersonaId,
      defaults.defaultPublishedCycleId,
      role,
      scenarioId,
    ],
  );

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}

export function useAtlas() {
  const context = useContext(AtlasContext);
  if (!context) throw new Error('useAtlas must be used inside AtlasProvider');
  return context;
}
