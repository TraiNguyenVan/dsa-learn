/**
 * Registry parity and renderer coverage, gates G-05/G-06 (spec 006).
 *
 * G-05 is the gate that makes the old silent-fallback bug impossible to
 * reintroduce: a declared animation with no generator, or a generator with no
 * declaration, fails here rather than surfacing at runtime.
 */

import { describe, it, expect } from 'vitest';
import { REGISTRATIONS } from '../../registry/registrations';
import { RENDERER_MAP } from '../../renderers/rendererMap';
import type { DataStructureType } from '@/lib/types';

const DATA_STRUCTURE_TYPES: DataStructureType[] = [
  'ARRAY', 'LINKED_LIST', 'STACK', 'QUEUE', 'BINARY_SEARCH_TREE',
  'HEAP', 'GRAPH', 'TRIE', 'DP_TABLE', 'BACKTRACK',
];

describe('G-06 renderer coverage', () => {
  it('every DataStructureType has exactly one renderer (RD-01)', () => {
    for (const type of DATA_STRUCTURE_TYPES) {
      expect(RENDERER_MAP[type], `no renderer for ${type}`).toBeTypeOf('function');
    }
  });

  it('the renderer map has no keys outside the type union', () => {
    for (const key of Object.keys(RENDERER_MAP)) {
      expect(DATA_STRUCTURE_TYPES).toContain(key as DataStructureType);
    }
  });
});

/** Mirrors CONSTRUCTION_ONLY_OPERATIONS in tests/test_visualization_declarations.py. */
const CONSTRUCTION_ONLY = new Set(['insert_head', 'reverse_list', 'bst_insert', 'heap_insert']);

describe('G-05 registry parity', () => {
  it('every registration has a unique operationId within its topic (V-01)', () => {
    const seen = new Set<string>();
    for (const reg of REGISTRATIONS) {
      const key = `${reg.topicId}::${reg.operationId}`;
      expect(seen.has(key), `duplicate registration ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it('every registration declares a data structure type with a renderer (V-03)', () => {
    for (const reg of REGISTRATIONS) {
      expect(
        DATA_STRUCTURE_TYPES,
        `${reg.operationId} declares unknown type ${reg.dataStructureType}`,
      ).toContain(reg.dataStructureType as DataStructureType);
    }
  });

  it('every registration covers the FR-014 boundary cases (V-04, gate G-08)', () => {
    for (const reg of REGISTRATIONS) {
      const names = reg.presets.map((p) => p.name.toLowerCase()).join(' | ');
      // Every registration must offer an empty-input, a single-element, and an
      // all-duplicates preset: those three are what break pointer arithmetic,
      // off-by-one indexing, and frequency bookkeeping respectively.
      expect(names, `${reg.operationId} lacks an empty-input preset`).toMatch(/empty|no nodes|no vertices/i);
      expect(names, `${reg.operationId} lacks a single-element preset`).toMatch(
        /single|one vertex|one character|one key|one item/i,
      );
      expect(names, `${reg.operationId} lacks an all-duplicates preset`).toMatch(
        /duplicate|collision|parallel/i,
      );
      // FR-019's exhausted-search boundary attaches to operations that search or
      // have a capacity limit. Pure construction operations have no search to run
      // out of, so forcing a preset there would teach nothing.
      if (!CONSTRUCTION_ONLY.has(reg.operationId)) {
        expect(names, `${reg.operationId} lacks an exhausted-search preset`).toMatch(
          /exhaust|complete|no solution|missing|unreachable|disconnected|drained/i,
        );
      }
      expect(reg.presets.length, `${reg.operationId} has too few presets`).toBeGreaterThanOrEqual(5);
    }
  });

  it('every preset carries a name, description and params (authoring checklist)', () => {
    for (const reg of REGISTRATIONS) {
      for (const preset of reg.presets) {
        expect(preset.name).toBeTruthy();
        expect(preset.description, `preset ${preset.name} on ${reg.operationId}`).toBeTruthy();
        expect(preset.params).toBeDefined();
      }
    }
  });

  it('no registration is filed under a topic whose animation does not belong there', () => {
    // Regression guard for the original defect: six topics fell through to a
    // binary search animation. Each topic now hosts only algorithms from its own
    // subject area. The 5-topic list this began with now covers all 12.
    const EXPECTED: Record<string, string[]> = {
      'arrays-hashing': ['hash_bucket_insert'],
      'two-pointers': ['two_sum'],
      'sliding-window': ['longest_unique_window'],
      stack: ['monotonic_stack', 'fifo_queue'],
      'binary-search': ['binary_search'],
      'linked-lists': ['insert_head', 'reverse_list'],
      trees: ['bst_search', 'bst_insert'],
      tries: ['trie_insert_search'],
      heap: ['heap_insert'],
      backtracking: ['pruned_pair_search'],
      graphs: ['bfs_traversal'],
      'dynamic-programming': ['dp_table_fill'],
    };
    for (const [topic, allowed] of Object.entries(EXPECTED)) {
      const actual = REGISTRATIONS.filter((r) => r.topicId === topic).map((r) => r.operationId);
      expect(actual.sort(), `topic ${topic} hosts unexpected animations`).toEqual(allowed.sort());
    }
  });

  it('covers every catalog topic (V-01)', () => {
    expect(new Set(REGISTRATIONS.map((r) => r.topicId)).size).toBe(12);
  });

  it('F-04: no frame restates its description as its rationale', () => {
    for (const reg of REGISTRATIONS) {
      const first = reg.presets[0];
      const params: Record<string, unknown> = {};
      for (const p of reg.parameters) params[p.name] = first.params[p.name] ?? p.defaultValue;
      for (const f of reg.generate(first.input, params)) {
        expect(f.description.trim(), `${reg.operationId} frame ${f.step_index}`).not.toBe(
          f.rationale.trim(),
        );
      }
    }
  });
});
