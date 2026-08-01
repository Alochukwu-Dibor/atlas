import { describe, expect, it } from 'vitest';
import { createInitialRecommendationState, recommendationReducer } from './recommendations';

const now = '2026-08-01T11:20:00+01:00';

describe('Commercial recommendations', () => {
  it('creates a prominent manager recommendation and records an audit event', () => {
    const state = recommendationReducer(createInitialRecommendationState(), {
      type: 'CREATE_RECOMMENDATION',
      category: 'projects',
      title: 'Confirm rotor logistics milestone',
      rationale: 'The current target remains exposed to final logistics confirmation.',
      impact: 'Protects the compressor restoration date and deferred production recovery.',
      actorId: 'usr_commercial',
      now,
    });
    expect(state.items[0]).toMatchObject({
      source: 'commercial_manager',
      status: 'manager_draft',
      title: 'Confirm rotor logistics milestone',
    });
    expect(state.auditEvents.at(-1)?.action).toBe('created');
  });

  it('allows system recommendations to be edited and approved', () => {
    const initial = createInitialRecommendationState();
    const system = initial.items[0];
    const edited = recommendationReducer(initial, {
      type: 'EDIT_RECOMMENDATION',
      id: system.id,
      category: system.category,
      title: `${system.title} now`,
      rationale: system.rationale,
      impact: system.impact,
      actorId: 'usr_commercial',
      now,
    });
    const approved = recommendationReducer(edited, {
      type: 'APPROVE_RECOMMENDATION',
      id: system.id,
      actorId: 'usr_commercial',
      now,
    });
    expect(approved.items.find((item) => item.id === system.id)).toMatchObject({
      title: `${system.title} now`,
      status: 'approved',
    });
    expect(approved.auditEvents.map((event) => event.action)).toEqual(['edited', 'approved']);
  });
});
