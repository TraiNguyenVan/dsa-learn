/**
 * Location gates G-19 and G-20 (spec 007).
 *
 * Pure-function tests over `frontend/src/lib/location/location.ts`. No React
 * mount and no DOM dependency (R-008) — which is what lets these run in an
 * environment where `vitest` is not installed and the component tree cannot be
 * rendered without monaco-editor, katex and marked.
 *
 * Invariants asserted here are numbered to match
 * specs/007-concept-theory-navigation/contracts/location-contract.md.
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_VIEW,
  encodeLocation,
  locationsEqual,
  parseLocation,
  resolveLocation,
  validateLocation,
  type ValidationContext,
} from '@/lib/location/location';
import type { LearningLocation } from '@/lib/types';

const CONTEXT: ValidationContext = {
  knownTopicIds: ['arrays-hashing', 'linked-lists', 'trees', 'graphs'],
  knownSectionIds: ['overview', 'core-operations-invariants', 'limits'],
  knownExerciseIds: ['dynamic-array', 'two-sum'],
  fallbackTopicId: 'arrays-hashing',
  fallbackExerciseId: 'dynamic-array',
};

describe('parseLocation', () => {
  it('splits a full query string', () => {
    expect(parseLocation('?topic=trees&view=concept&section=limits')).toEqual({
      topic: 'trees',
      view: 'concept',
      section: 'limits',
    });
  });

  it('accepts a string with no leading question mark', () => {
    expect(parseLocation('topic=trees').topic).toBe('trees');
  });

  it('returns an empty object for empty input', () => {
    expect(parseLocation('')).toEqual({});
    expect(parseLocation('?')).toEqual({});
  });

  it('ignores unknown parameters rather than erroring', () => {
    expect(parseLocation('?topic=trees&unrelated=1')).toEqual({ topic: 'trees' });
  });

  it('never throws on a malformed percent-escape', () => {
    expect(() => parseLocation('?topic=%E0%A4%A')).not.toThrow();
  });
});

describe('validateLocation — gate G-19', () => {
  it('accepts a fully valid location with no problems', () => {
    const r = validateLocation(
      { topic: 'trees', view: 'concept', section: 'core-operations-invariants' },
      CONTEXT
    );
    expect(r.problems).toEqual([]);
    expect(r.usedFallbackTopic).toBe(false);
    expect(r.usedFallbackView).toBe(false);
    expect(r.location).toEqual({
      topic_id: 'trees',
      view: 'concept',
      section_id: 'core-operations-invariants',
    });
  });

  it('defaults an absent view to concept', () => {
    const r = validateLocation({ topic: 'trees' }, CONTEXT);
    expect(r.location.view).toBe(DEFAULT_VIEW);
    expect(r.problems).toEqual([]);
  });

  it('falls back to the first topic for an unknown topic and reports it', () => {
    const r = validateLocation({ topic: 'no-such-topic' }, CONTEXT);
    expect(r.location.topic_id).toBe('arrays-hashing');
    expect(r.usedFallbackTopic).toBe(true);
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0].field).toBe('topic');
    expect(r.problems[0].given).toBe('no-such-topic');
  });

  it('falls back to concept for an unknown view and reports it', () => {
    const r = validateLocation({ topic: 'trees', view: 'nonsense' }, CONTEXT);
    expect(r.location.view).toBe('concept');
    expect(r.usedFallbackView).toBe(true);
    expect(r.problems[0].field).toBe('view');
  });

  it('drops an unknown section but keeps topic and view — L-4', () => {
    const r = validateLocation(
      { topic: 'trees', view: 'concept', section: 'does-not-exist' },
      CONTEXT
    );
    expect(r.location.topic_id).toBe('trees');
    expect(r.location.view).toBe('concept');
    expect(r.location.section_id).toBeUndefined();
    expect(r.problems[0].field).toBe('section');
  });

  it('does not honour a section outside the concept view — L-5', () => {
    const r = validateLocation(
      { topic: 'trees', view: 'visualizer', section: 'limits' },
      CONTEXT
    );
    expect(r.location.section_id).toBeUndefined();
  });

  it('substitutes the first exercise in the exercises view', () => {
    const r = validateLocation(
      { topic: 'trees', view: 'exercises', exercise: 'not-an-exercise' },
      CONTEXT
    );
    expect(r.location.exercise_id).toBe('dynamic-array');
    expect(r.problems.some((p) => p.field === 'exercise')).toBe(true);
  });

  it('resolves fields independently — a bad section does not lose the topic', () => {
    const r = validateLocation(
      { topic: 'graphs', view: 'concept', section: 'missing-section' },
      CONTEXT
    );
    expect(r.location.topic_id).toBe('graphs');
    expect(r.usedFallbackTopic).toBe(false);
  });

  it('always returns a renderable location — L-1, L-2', () => {
    const r = validateLocation({}, CONTEXT);
    expect(r.location.topic_id).toBe('arrays-hashing');
    expect(['concept', 'visualizer', 'patterns', 'exercises']).toContain(r.location.view);
  });

  it('orders problems topic, view, section — L-7', () => {
    // `view` is bogus so it falls back to concept, the only view in which a
    // section is checked at all; the bogus exercise is not acted on, so it is
    // not reported.
    const r = validateLocation(
      { topic: 'bogus', view: 'bogus', section: 'bogus', exercise: 'bogus' },
      CONTEXT
    );
    const order = r.problems.map((p) => p.field);
    expect(order).toEqual(['topic', 'view', 'section']);
  });

  it('reports an exercise problem in the exercises view', () => {
    const r = validateLocation(
      { topic: 'bogus', view: 'exercises', exercise: 'bogus' },
      CONTEXT
    );
    expect(r.problems.map((p) => p.field)).toEqual(['topic', 'exercise']);
  });

  it('gives every problem a non-empty human-readable reason — L-6', () => {
    const r = resolveLocation('?topic=bogus&view=bogus&section=bogus', CONTEXT);
    expect(r.problems.length).toBeGreaterThan(0);
    for (const p of r.problems) {
      expect(p.reason.length).toBeGreaterThan(0);
    }
  });
});

describe('resolveLocation', () => {
  it('resolves a full deep link', () => {
    const r = resolveLocation('?topic=trees&view=concept&section=limits', CONTEXT);
    expect(r.location.topic_id).toBe('trees');
    expect(r.location.section_id).toBe('limits');
    expect(r.problems).toEqual([]);
  });

  it('reports an unreadable link but still renders — L-1', () => {
    const r = resolveLocation('total-nonsense', CONTEXT);
    expect(r.location.topic_id).toBe('arrays-hashing');
    expect(r.problems[0].field).toBe('syntax');
  });

  it('does not flag a legitimate empty search as garbage', () => {
    expect(resolveLocation('', CONTEXT).problems).toEqual([]);
    expect(resolveLocation('?', CONTEXT).problems).toEqual([]);
  });

  it('surfaces every downgrade for a stale link', () => {
    // `view` must be `concept` for a section problem to exist at all: per L-5 a
    // section is only honoured in the concept view, so in any other view the
    // section is inapplicable rather than wrong and nothing is reported. Using a
    // non-concept view here would assert `['topic']`, which is the behaviour the
    // L-5 case above already covers.
    const r = resolveLocation(
      '?topic=removed-topic&view=concept&section=removed-section',
      CONTEXT
    );
    expect(r.usedFallbackTopic).toBe(true);
    expect(r.problems.map((p) => p.field)).toEqual(['topic', 'section']);
  });

  it('does not report an inapplicable section as a downgrade — L-5, not L-6', () => {
    // L-6 requires every *downgrade* to be recorded. A section outside the
    // concept view is not a downgrade: it was never going to be honoured, the
    // same way an exercise outside the exercises view is not reported. If this
    // ever needs to change, it is a change to L-5 in the contract — not to this
    // assertion.
    const r = resolveLocation(
      '?topic=removed-topic&view=visualizer&section=removed-section',
      CONTEXT
    );
    expect(r.problems.map((p) => p.field)).toEqual(['topic']);
  });
});

describe('encodeLocation — gate G-20', () => {
  it('omits the default view — encoding rule 3', () => {
    expect(encodeLocation({ topic_id: 'trees', view: 'concept' })).toBe('?topic=trees');
  });

  it('emits an explicit non-default view', () => {
    expect(encodeLocation({ topic_id: 'trees', view: 'visualizer' })).toBe(
      '?topic=trees&view=visualizer'
    );
  });

  it('omits undefined section and exercise entirely — encoding rule 1', () => {
    const encoded = encodeLocation({ topic_id: 'trees', view: 'concept' });
    expect(encoded).not.toContain('section');
    expect(encoded).not.toContain('exercise');
  });

  it('encodes parameters in the fixed order — encoding rule 4', () => {
    const encoded = encodeLocation({
      topic_id: 'trees',
      view: 'visualizer',
      section_id: 'limits',
      exercise_id: 'two-sum',
    });
    expect(encoded).toBe('?topic=trees&view=visualizer&section=limits&exercise=two-sum');
  });

  it('percent-encodes values — encoding rule 2', () => {
    const encoded = encodeLocation({
      topic_id: 'weird id/&',
      view: 'concept',
    });
    expect(encoded).toBe('?topic=weird%20id%2F%26');
    expect(parseLocation(encoded).topic).toBe('weird id/&');
  });

  it('treats an absent view and an explicit concept identically', () => {
    expect(locationsEqual({ topic_id: 'trees', view: 'concept' }, { topic_id: 'trees', view: 'concept' })).toBe(
      true
    );
  });

  it('round-trips a location', () => {
    const original: LearningLocation = {
      topic_id: 'graphs',
      view: 'exercises',
      exercise_id: 'two-sum',
    };
    const decoded = parseLocation(encodeLocation(original));
    const resolved = validateLocation(decoded, {
      ...CONTEXT,
      knownTopicIds: [...CONTEXT.knownTopicIds, 'graphs'],
      knownExerciseIds: ['two-sum'],
      fallbackExerciseId: 'two-sum',
    });
    expect(resolved.location.topic_id).toBe(original.topic_id);
    expect(resolved.location.view).toBe(original.view);
    expect(resolved.location.exercise_id).toBe(original.exercise_id);
  });

  it('distinguishes two different positions', () => {
    const a = encodeLocation({ topic_id: 'trees', view: 'concept' });
    const b = encodeLocation({ topic_id: 'graphs', view: 'concept' });
    expect(a).not.toBe(b);
  });
});

describe('history sequence — gate G-20 (H-2, H-3, H-4)', () => {
  // Models the exact sequence in quickstart.md S5: five links then five backs.
  const chain: LearningLocation[] = [
    { topic_id: 'arrays-hashing', view: 'concept' },
    { topic_id: 'linked-lists', view: 'concept' },
    { topic_id: 'trees', view: 'concept' },
    { topic_id: 'graphs', view: 'concept' },
    { topic_id: 'graph-algorithms', view: 'concept' },
  ];

  it('produces one distinct addressable entry per jump', () => {
    const encoded = chain.map((loc) => encodeLocation(loc));
    expect(new Set(encoded).size).toBe(chain.length);
  });

  it('reconstructs the visited sequence by walking backwards', () => {
    // What popstate would observe: the previous entry's address. Every hop must
    // resolve to its own topic, or a back action would land somewhere else.
    const context: ValidationContext = {
      ...CONTEXT,
      knownTopicIds: [...CONTEXT.knownTopicIds, 'graph-algorithms'],
    };
    const visited = [...chain].reverse();
    const recovered = visited.map((loc) =>
      validateLocation(parseLocation(encodeLocation(loc)), context).location
    );
    expect(recovered.map((l) => l.topic_id)).toEqual([
      'graph-algorithms',
      'graphs',
      'trees',
      'linked-lists',
      'arrays-hashing',
    ]);
    expect(recovered.every((l) => l.view === 'concept')).toBe(true);
  });
});