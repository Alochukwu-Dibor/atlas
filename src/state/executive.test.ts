import { describe, expect, it } from 'vitest';
import { createInitialExecutiveState, executiveReducer } from './executive';

describe('executive decision state', () => {
  it('requires an owner and due date for assignments', () => {
    const initial = createInitialExecutiveState();
    const invalid = executiveReducer(initial, {
      type: 'RECORD_DECISION',
      recommendationId: 'rec_integrity',
      action: 'assign_action',
      rationale: 'Assign the integrity review.',
    });
    expect(invalid.error).toMatch(/owner and due date/i);
    expect(invalid.decisions).toHaveLength(initial.decisions.length);
  });

  it('links each decision and audit event to its recommendation', () => {
    const initial = createInitialExecutiveState();
    const next = executiveReducer(initial, {
      type: 'RECORD_DECISION',
      recommendationId: 'rec_cash',
      action: 'assign_action',
      rationale: 'Prepare the downside liquidity response.',
      ownerId: 'usr_finance',
      dueDate: '2026-08-07',
    });
    const decision = next.decisions.at(-1)!;
    const audit = next.auditEvents.at(-1)!;
    expect(decision.recommendationId).toBe('rec_cash');
    expect(decision.ownerId).toBe('usr_finance');
    expect(audit.recommendationId).toBe('rec_cash');
    expect(audit.decisionId).toBe(decision.id);
  });

  it('returns assigned actions to the responsible workspace with auditable progress', () => {
    const initial = createInitialExecutiveState();
    const next = executiveReducer(initial, {
      type: 'UPDATE_ACTION_PROGRESS',
      decisionId: 'dec_001',
      status: 'awaiting_verification',
      progressNote: 'Rotor logistics confirmed; evidence attached for Commercial verification.',
      actorId: 'usr_operations',
    });
    expect(next.decisions.find((decision) => decision.id === 'dec_001')).toMatchObject({
      status: 'awaiting_verification',
      progressNote: expect.stringContaining('Rotor logistics'),
    });
    expect(next.auditEvents.at(-1)?.decisionId).toBe('dec_001');
  });
});
