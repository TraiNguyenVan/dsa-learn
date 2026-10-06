/**
 * Graph shape and overview entry-point tests (spec 007, US5).
 *
 * Consumes the same derivation the server exposes, so a change to the graph
 * contract that breaks the overview is caught without mounting React (R-008).
 * The pure location assertions live in `location.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { encodeLocation, validateLocation } from '@/lib/location/location';
import { parseCurriculumGraph, buildValidationContext } from '@/lib/curriculum/graphShape';
import type { CurriculumGraph, TopicView } from '@/lib/types';

const GRAPH_JSON = {
  nodes: [
    { id: 'arrays-hashing', title: 'Arrays & Hashing', description: 'Fundamentals.', display_order: 1, exercise_count: 6, completed_count: 6, resolved: true },
    { id: 'linked-lists', title: 'Linked Lists', description: 'Pointer chains.', display_order: 6, exercise_count: 3, completed_count: 0, resolved: true },
    { id: 'trees', title: 'Trees & Binary Search Trees', description: 'Hierarchies.', display_order: 7, exercise_count: 4, completed_count: 1, resolved: true },
    { id: 'math-bitwise', title: 'Math and Bitwise Techniques', description: 'Arithmetic tricks.', display_order: 16, exercise_count: 0, completed_count: 0, resolved: true },
  ],
  prerequisites_by_topic: {
    'arrays-hashing': [],
    'linked-lists': [],
    trees: [
      { id: 'arrays-hashing', title: 'Arrays & Hashing', description: 'Fundamentals.', display_order: 1, exercise_count: 6, completed_count: 6, resolved: true },
      { id: 'linked-lists', title: 'Linked Lists', description: 'Pointer chains.', display_order: 6, exercise_count: 3, completed_count: 0, resolved: true },
    ],
    'math-bitwise': [],
  },
  dependents_by_topic: {
    'arrays-hashing': [
      { id: 'trees', title: 'Trees & Binary Search Trees', description: 'Hierarchies.', display_order: 7, exercise_count: 4, completed_count: 1, resolved: true },
    ],
    'linked-lists': [
      { id: 'trees', title: 'Trees & Binary Search Trees', description: 'Hierarchies.', display_order: 7, exercise_count: 4, completed_count: 1, resolved: true },
    ],
    trees: [],
    'math-bitwise': [],
  },
  neighbours_by_topic: {
    'arrays-hashing': [
      { node: { id: 'trees', title: 'Trees & Binary Search Trees', description: 'Hierarchies.', display_order: 7, exercise_count: 4, completed_count: 1, resolved: true }, reason: 'adjacent-in-order', shared_prerequisite_titles: [] },
    ],
    'linked-lists': [],
    trees: [],
    'math-bitwise': [
      { node: { id: 'linked-lists', title: 'Linked Lists', description: 'Pointer chains.', display_order: 6, exercise_count: 3, completed_count: 0, resolved: true }, reason: 'adjacent-in-order', shared_prerequisite_titles: [] },
    ],
  },
  unresolved: [],
};

const graph: CurriculumGraph = parseCurriculumGraph(GRAPH_JSON);

describe('parseCurriculumGraph', () => {
  it('accepts a well-formed graph unchanged', () => {
    expect(graph.nodes).toHaveLength(4);
    expect(graph.unresolved).toEqual([]);
  });

  it('normalises missing buckets to empty maps rather than undefined', () => {
    const sparse = parseCurriculumGraph({ nodes: GRAPH_JSON.nodes });
    expect(sparse.prerequisites_by_topic).toEqual({});
    expect(sparse.dependents_by_topic).toEqual({});
    expect(sparse.neighbours_by_topic).toEqual({});
    expect(sparse.unresolved).toEqual([]);
  });

  it('survives a malformed payload without throwing — FR-014', () => {
    expect(() => parseCurriculumGraph(null)).not.toThrow();
    expect(() => parseCurriculumGraph({ nodes: 'not-an-array' })).not.toThrow();
  });
});

describe('buildValidationContext', () => {
  it('exposes every topic id and picks the first topic by display order', () => {
    const ctx = buildValidationContext(graph, []);
    expect(ctx.knownTopicIds).toEqual(['arrays-hashing', 'linked-lists', 'trees', 'math-bitwise']);
    expect(ctx.fallbackTopicId).toBe('arrays-hashing');
  });

  it('falls back to the first id when display orders are absent', () => {
    const ctx = buildValidationContext(parseCurriculumGraph({ nodes: [{ id: 'only' }] }), []);
    expect(ctx.fallbackTopicId).toBe('only');
  });
});

describe('overview entry points — FR-021', () => {
  it('selecting a topic produces a concept-view location', () => {
    const ctx = buildValidationContext(graph, []);
    for (const node of graph.nodes) {
      const href = encodeLocation({ topic_id: node.id, view: 'concept' });
      const decoded = validateLocation({ topic: node.id, view: 'concept' }, ctx);
      expect(decoded.problems).toEqual([]);
      expect(decoded.location.topic_id).toBe(node.id);
      expect(decoded.location.view).toBe('concept' as TopicView);
      // The default view is omitted from the address (encoding rule 3).
      expect(href).toBe(`?topic=${node.id}`);
    }
  });

  it('every topic is reachable in one interaction — SC-007', () => {
    const ctx = buildValidationContext(graph, []);
    for (const node of graph.nodes) {
      const decoded = validateLocation({ topic: node.id }, ctx);
      expect(decoded.problems).toEqual([]);
      expect(decoded.location.topic_id).toBe(node.id);
    }
  });

  it('the fully disconnected topic is reachable and renders with zero counts — FR-022', () => {
    const ctx = buildValidationContext(graph, []);
    const decoded = validateLocation({ topic: 'math-bitwise', view: 'concept' }, ctx);
    expect(decoded.problems).toEqual([]);
    expect(decoded.location.topic_id).toBe('math-bitwise');
    expect(graph.prerequisites_by_topic['math-bitwise']).toEqual([]);
    expect(graph.dependents_by_topic['math-bitwise']).toEqual([]);
  });

  it('a learner with no recorded progress still gets the full graph — FR-022', () => {
    // The graph carries no per-learner gating, so progress fields being zero
    // must not remove any node.
    const zeroed = parseCurriculumGraph({
      ...GRAPH_JSON,
      nodes: GRAPH_JSON.nodes.map((n) => ({ ...n, completed_count: 0 })),
    });
    expect(zeroed.nodes).toHaveLength(4);
    const ctx = buildValidationContext(zeroed, []);
    expect(ctx.knownTopicIds).toHaveLength(4);
  });
});