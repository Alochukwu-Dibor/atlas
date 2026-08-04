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
  status: 'not_started' | 'in_progress' | 'awaiting_verification' | 'completed';
  progressNote?: string;
}

export interface ExecutiveAuditEvent {
  id: string;
  recommendationId: string;
  decisionId: string;
  summary: string;
  timestamp: string;
}

export interface ExecutiveState {
  version: 2;
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
  | {
      type: 'UPDATE_ACTION_PROGRESS';
      decisionId: string;
      status: ExecutiveDecision['status'];
      progressNote: string;
      actorId: string;
    }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

export const executiveStorageKey = 'atlas.executive.v2';
const prototypeTimestamp = '2026-08-01T09:00:00+01:00';

export function createInitialExecutiveState(): ExecutiveState {
  return {
    version: 2,
    decisions: atlas.decisions.map((decision) => ({
      id: decision.id,
      recommendationId: decision.recommendationId,
      action: decision.decisionType as ExecutiveDecisionAction,
      rationale: decision.rationale,
      ownerId: decision.ownerId,
      dueDate: decision.dueDate,
      createdAt: decision.createdAt,
      status: decision.status as ExecutiveDecision['status'],
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
  if (action.type === 'UPDATE_ACTION_PROGRESS') {
    const decision = state.decisions.find((item) => item.id === action.decisionId);
    if (!decision?.ownerId) return { ...state, error: 'Only assigned decisions can be updated.' };
    if (!action.progressNote.trim()) {
      return { ...state, error: 'Add a progress note before updating the action.' };
    }
    return {
      version: 2,
      decisions: state.decisions.map((item) =>
        item.id === action.decisionId
          ? { ...item, status: action.status, progressNote: action.progressNote.trim() }
          : item,
      ),
      auditEvents: [
        ...state.auditEvents,
        {
          id: `audit_action_${state.auditEvents.length + 1}`,
          recommendationId: decision.recommendationId,
          decisionId: decision.id,
          summary: `${action.actorId} updated assigned action to ${action.status.replaceAll('_', ' ')}: ${action.progressNote.trim()}`,
          timestamp: prototypeTimestamp,
        },
      ],
    };
  }
  if (!atlas.recommendations.some((item) => item.id === action.recommendationId)) {
    return { ...state, error: 'The selected Decision Support item is unavailable.' };
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
    status: action.action === 'assign_action' ? 'not_started' : 'completed',
  };
  const label = action.action.replaceAll('_', ' ');
  return {
    version: 2,
    decisions: [...state.decisions, decision],
    auditEvents: [
      ...state.auditEvents,
      {
        id: `audit_phase3_${state.auditEvents.length + 1}`,
        recommendationId: action.recommendationId,
        decisionId: id,
        summary: `CEO recorded ${label} for Decision Support item ${action.recommendationId}.`,
        timestamp: prototypeTimestamp,
      },
    ],
  };
}

export function loadExecutiveState(): ExecutiveState {
  try {
    const stored = window.localStorage.getItem(executiveStorageKey);
    if (!stored) return createInitialExecutiveState();
    const parsed = JSON.parse(stored) as ExecutiveState;
    return parsed.version === 2 ? parsed : createInitialExecutiveState();
  } catch {
    return createInitialExecutiveState();
  }
}
