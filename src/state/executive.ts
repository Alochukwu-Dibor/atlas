import { atlas } from '../data/atlas';

export type ExecutiveDecisionAction =
  'approve' | 'defer' | 'request_information' | 'assign_action' | 'record_decision';

export interface ExecutiveDecision {
  id: string;
  recommendationId: string;
  action: ExecutiveDecisionAction;
  rationale: string;
  ownerId?: string;
  dueDate?: string;
  createdAt: string;
}

export interface ExecutiveAuditEvent {
  id: string;
  recommendationId: string;
  decisionId: string;
  summary: string;
  timestamp: string;
}

export interface ExecutiveState {
  decisions: ExecutiveDecision[];
  auditEvents: ExecutiveAuditEvent[];
  error?: string;
}

export type ExecutiveAction =
  | {
      type: 'RECORD_DECISION';
      recommendationId: string;
      action: ExecutiveDecisionAction;
      rationale: string;
      ownerId?: string;
      dueDate?: string;
    }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

export const executiveStorageKey = 'atlas.executive.v1';
const prototypeTimestamp = '2026-08-01T09:00:00+01:00';

export function createInitialExecutiveState(): ExecutiveState {
  return {
    decisions: atlas.decisions.map((decision) => ({
      id: decision.id,
      recommendationId: decision.recommendationId,
      action: decision.decisionType as ExecutiveDecisionAction,
      rationale: decision.rationale,
      ownerId: decision.ownerId,
      dueDate: decision.dueDate,
      createdAt: decision.createdAt,
    })),
    auditEvents: atlas.auditEvents
      .filter((event) => event.entityType === 'recommendation')
      .map((event) => ({
        id: event.id,
        recommendationId: event.entityId,
        decisionId:
          atlas.decisions.find((decision) => decision.recommendationId === event.entityId)?.id ??
          event.entityId,
        summary: event.summary,
        timestamp: event.timestamp,
      })),
  };
}

export function executiveReducer(state: ExecutiveState, action: ExecutiveAction): ExecutiveState {
  if (action.type === 'RESET') return createInitialExecutiveState();
  if (action.type === 'CLEAR_ERROR') return { ...state, error: undefined };
  if (!atlas.recommendations.some((item) => item.id === action.recommendationId)) {
    return { ...state, error: 'The selected recommendation is unavailable.' };
  }
  if (!action.rationale.trim()) {
    return { ...state, error: 'Add a rationale before recording the decision.' };
  }
  if (action.action === 'assign_action' && (!action.ownerId || !action.dueDate)) {
    return { ...state, error: 'Assignment decisions require an owner and due date.' };
  }
  const id = `dec_phase3_${state.decisions.length + 1}`;
  const decision: ExecutiveDecision = {
    id,
    recommendationId: action.recommendationId,
    action: action.action,
    rationale: action.rationale.trim(),
    ownerId: action.action === 'assign_action' ? action.ownerId : undefined,
    dueDate: action.action === 'assign_action' ? action.dueDate : undefined,
    createdAt: prototypeTimestamp,
  };
  const label = action.action.replaceAll('_', ' ');
  return {
    decisions: [...state.decisions, decision],
    auditEvents: [
      ...state.auditEvents,
      {
        id: `audit_phase3_${state.auditEvents.length + 1}`,
        recommendationId: action.recommendationId,
        decisionId: id,
        summary: `CEO recorded ${label} for recommendation ${action.recommendationId}.`,
        timestamp: prototypeTimestamp,
      },
    ],
  };
}

export function loadExecutiveState(): ExecutiveState {
  try {
    const stored = window.localStorage.getItem(executiveStorageKey);
    return stored ? (JSON.parse(stored) as ExecutiveState) : createInitialExecutiveState();
  } catch {
    return createInitialExecutiveState();
  }
}
