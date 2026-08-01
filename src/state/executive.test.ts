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
});
