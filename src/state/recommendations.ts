import { atlas } from '../data/atlas';

export type RecommendationStatus = 'system_draft' | 'approved' | 'manager_draft';

export interface CommercialRecommendation {
  id: string;
  source: 'atlas_system' | 'commercial_manager';
  category: string;
  title: string;
  rationale: string;
  impact: string;
  status: RecommendationStatus;
  relatedIds: string[];
  updatedAt: string;
}

export interface RecommendationAuditEvent {
  id: string;
  recommendationId: string;
  action: 'created' | 'edited' | 'approved';
  actorId: string;
  timestamp: string;
  summary: string;
}

export interface RecommendationState {
  version: 1;
  items: CommercialRecommendation[];
  auditEvents: RecommendationAuditEvent[];
  error?: string;
}

export type RecommendationAction =
  | {
      type: 'CREATE_RECOMMENDATION';
      category: string;
      title: string;
      rationale: string;
      impact: string;
      actorId: string;
      now: string;
    }
  | {
      type: 'EDIT_RECOMMENDATION';
      id: string;
      category: string;
      title: string;
      rationale: string;
      impact: string;
      actorId: string;
      now: string;
    }
  | { type: 'APPROVE_RECOMMENDATION'; id: string; actorId: string; now: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

export const recommendationStorageKey = 'atlas.commercial.recommendations.v1';

export function createInitialRecommendationState(): RecommendationState {
  return {
    version: 1,
    items: atlas.recommendations.map((item) => ({
      id: item.id,
      source: 'atlas_system',
      category: item.category,
      title: item.title,
      rationale: item.explanation,
      impact: item.impact,
      status: 'system_draft',
      relatedIds: [...item.relatedIds],
      updatedAt: atlas.meta.asOf,
    })),
    auditEvents: [],
  };
}

function valid(action: { category: string; title: string; rationale: string; impact: string }) {
  return Boolean(
    action.category.trim() &&
    action.title.trim() &&
    action.rationale.trim() &&
    action.impact.trim(),
  );
}

export function recommendationReducer(
  state: RecommendationState,
  action: RecommendationAction,
): RecommendationState {
  if (action.type === 'RESET') return createInitialRecommendationState();
  if (action.type === 'CLEAR_ERROR') return { ...state, error: undefined };

  if (action.type === 'CREATE_RECOMMENDATION') {
    if (!valid(action)) return { ...state, error: 'Complete every Recommended Action field.' };
    const id = `rec_commercial_${state.items.filter((item) => item.source === 'commercial_manager').length + 1}`;
    const item: CommercialRecommendation = {
      id,
      source: 'commercial_manager',
      category: action.category.trim(),
      title: action.title.trim(),
      rationale: action.rationale.trim(),
      impact: action.impact.trim(),
      status: 'manager_draft',
      relatedIds: [],
      updatedAt: action.now,
    };
    return {
      version: 1,
      items: [item, ...state.items],
      auditEvents: [
        ...state.auditEvents,
        {
          id: `rec_audit_${state.auditEvents.length + 1}`,
          recommendationId: id,
          action: 'created',
          actorId: action.actorId,
          timestamp: action.now,
          summary: 'Commercial Manager created a Recommended Action.',
        },
      ],
    };
  }

  const item = state.items.find((entry) => entry.id === action.id);
  if (!item) return { ...state, error: 'The Recommended Action is unavailable.' };

  if (action.type === 'APPROVE_RECOMMENDATION') {
    return {
      version: 1,
      items: state.items.map((entry) =>
        entry.id === action.id ? { ...entry, status: 'approved', updatedAt: action.now } : entry,
      ),
      auditEvents: [
        ...state.auditEvents,
        {
          id: `rec_audit_${state.auditEvents.length + 1}`,
          recommendationId: item.id,
          action: 'approved',
          actorId: action.actorId,
          timestamp: action.now,
          summary: 'Commercial Manager approved the Recommended Action.',
        },
      ],
    };
  }

  if (!valid(action)) return { ...state, error: 'Complete every Recommended Action field.' };
  return {
    version: 1,
    items: state.items.map((entry) =>
      entry.id === action.id
        ? {
            ...entry,
            category: action.category.trim(),
            title: action.title.trim(),
            rationale: action.rationale.trim(),
            impact: action.impact.trim(),
            updatedAt: action.now,
          }
        : entry,
    ),
    auditEvents: [
      ...state.auditEvents,
      {
        id: `rec_audit_${state.auditEvents.length + 1}`,
        recommendationId: item.id,
        action: 'edited',
        actorId: action.actorId,
        timestamp: action.now,
        summary: 'Commercial Manager edited the Recommended Action while retaining its source.',
      },
    ],
  };
}

export function loadRecommendationState(): RecommendationState {
  if (typeof window === 'undefined') return createInitialRecommendationState();
  try {
    const stored = window.localStorage.getItem(recommendationStorageKey);
    if (!stored) return createInitialRecommendationState();
    const parsed = JSON.parse(stored) as RecommendationState;
    return parsed.version === 1 ? parsed : createInitialRecommendationState();
  } catch {
    return createInitialRecommendationState();
  }
}
