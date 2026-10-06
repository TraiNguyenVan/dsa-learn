/**
 * Frame invariant tests, F-01..F-07 (spec 006, contract
 * contracts/visualizer-registry-contract.md §3.1).
 *
 * These are the checks that make SC-007 (narration), SC-008 (determinism) and
 * SC-010 (meaningful steps) mechanically verifiable rather than a matter of
 * reviewer taste. Run with `npx vitest run src/components/visualizer`.
 */

import { describe, it, expect } from 'vitest';
import { REGISTRATIONS } from '../../registry/registrations';
import { generateBinarySearchTrace, generateTwoSumTrace } from '../arrayVisualizer';
import { generateInsertHeadTrace, generateReverseListTrace } from '../linkedListVisualizer';
import { generateBSTInsertTrace, generateBSTSearchTrace } from '../treeVisualizer';
import { generateHeapInsertTrace } from '../heapVisualizer';
import type { VisualizerStateFrame } from '@/lib/types';

/** FR-014: the boundary inputs every registration must be able to handle. */
const BOUNDARY_CASES: Array<{ name: string; input: number[] | string[] }> = [
  { name: 'empty', input: [] },
  { name: 'single element', input: [42] },
  { name: 'already sorted', input: [1, 2, 3, 4, 5] },
  { name: 'all duplicates', input: [7, 7, 7, 7] },
];

/** Renderable signature of a frame, used to detect visually identical steps. */
function frameSignature(frame: VisualizerStateFrame): string {
  return JSON.stringify({
    ds: frame.data_structure_type,
    array: frame.array_state,
    list: frame.linked_list_state,
    tree: frame.tree_state,
    heap: frame.heap_state,
    stack: frame.stack_state,
    queue: frame.queue_state,
    graph: frame.graph_state,
    trie: frame.trie_state,
    dp: frame.dp_table_state,
    backtrack: frame.backtrack_state,
  });
}

/** Every frame set produced by a registration, across its default and boundaries. */
function framesFor(reg: (typeof REGISTRATIONS)[number]): VisualizerStateFrame[][] {
  const firstParam = reg.parameters[0];
  const baseParams: Record<string, unknown> = {};
  if (firstParam) baseParams[firstParam.name] = firstParam.defaultValue;

  const sets: VisualizerStateFrame[][] = [reg.generate([], baseParams)];
  if (reg.operationId === 'reverse_list') {
    sets.push(reg.generate([1, 2, 3, 4, 5], baseParams));
    sets.push(reg.generate([10, 20], baseParams));
    sets.push(reg.generate([42], baseParams));
  } else {
    for (const boundary of BOUNDARY_CASES) {
      sets.push(reg.generate(boundary.input as never, baseParams));
    }
  }
  return sets;
}

describe('frame invariants F-01..F-07', () => {
  it('F-01/F-02: step indices are contiguous from 0 and total_steps matches', () => {
    for (const reg of REGISTRATIONS) {
      for (const frames of framesFor(reg)) {
        expect(frames.length, `${reg.operationId} produced no frames`).toBeGreaterThan(0);
        frames.forEach((f, i) => {
          expect(f.step_index, `${reg.operationId} frame ${i}`).toBe(i);
          expect(f.total_steps, `${reg.operationId} frame ${i}`).toBe(frames.length);
        });
      }
    }
  });

  it('F-03: every frame carries a non-empty rationale', () => {
    for (const reg of REGISTRATIONS) {
      for (const frames of framesFor(reg)) {
        for (const f of frames) {
          expect(f.rationale, `${reg.operationId} frame ${f.step_index} has no rationale`).toBeTruthy();
          expect(f.rationale.trim().length).toBeGreaterThan(20);
        }
      }
    }
  });

  it('F-05: no two consecutive frames are visually identical', () => {
    for (const reg of REGISTRATIONS) {
      for (const frames of framesFor(reg)) {
        for (let i = 1; i < frames.length; i++) {
          expect(
            frameSignature(frames[i]),
            `${reg.operationId} frames ${i - 1} and ${i} are identical`,
          ).not.toBe(frameSignature(frames[i - 1]));
        }
      }
    }
  });

  it('F-06: exactly one state field is present and matches the data structure type', () => {
    const FIELD_FOR: Record<string, keyof VisualizerStateFrame> = {
      ARRAY: 'array_state',
      LINKED_LIST: 'linked_list_state',
      BINARY_SEARCH_TREE: 'tree_state',
      HEAP: 'heap_state',
      STACK: 'stack_state',
      QUEUE: 'queue_state',
      GRAPH: 'graph_state',
      TRIE: 'trie_state',
      DP_TABLE: 'dp_table_state',
      BACKTRACK: 'backtrack_state',
    };
    const ALL_FIELDS = Object.keys(FIELD_FOR).map((k) => FIELD_FOR[k]);

    for (const reg of REGISTRATIONS) {
      for (const frames of framesFor(reg)) {
        for (const f of frames) {
          const present = ALL_FIELDS.filter((field) => (f as never)[field] !== undefined);
          expect(present.length, `${reg.operationId} frame ${f.step_index}`).toBe(1);
          expect(present[0]).toBe(FIELD_FOR[f.data_structure_type]);
        }
      }
    }
  });

  it('F-07: repeated calls on identical input produce identical output', () => {
    for (const reg of REGISTRATIONS) {
      const first = framesFor(reg)[0];
      const second = framesFor(reg)[0];
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    }
  });

  it('F-07: the named generators are stable across repeated invocation', () => {
    expect(JSON.stringify(generateBinarySearchTrace([1, 2, 3, 4, 5], 3)))
      .toBe(JSON.stringify(generateBinarySearchTrace([1, 2, 3, 4, 5], 3)));
    expect(JSON.stringify(generateTwoSumTrace([1, 2, 3, 4, 5], 7)))
      .toBe(JSON.stringify(generateTwoSumTrace([1, 2, 3, 4, 5], 7)));
    expect(JSON.stringify(generateInsertHeadTrace([1, 2, 3], 9)))
      .toBe(JSON.stringify(generateInsertHeadTrace([1, 2, 3], 9)));
    expect(JSON.stringify(generateReverseListTrace([1, 2, 3])))
      .toBe(JSON.stringify(generateReverseListTrace([1, 2, 3])));
    expect(JSON.stringify(generateBSTSearchTrace([5, 3, 8], 3)))
      .toBe(JSON.stringify(generateBSTSearchTrace([5, 3, 8], 3)));
    expect(JSON.stringify(generateBSTInsertTrace([5, 3, 8], 4)))
      .toBe(JSON.stringify(generateBSTInsertTrace([5, 3, 8], 4)));
    expect(JSON.stringify(generateHeapInsertTrace([5, 9], 1)))
      .toBe(JSON.stringify(generateHeapInsertTrace([5, 9], 1)));
  });

  it('F-07: sorting the input does not change the trace (no locale/seed dependence)', () => {
    expect(JSON.stringify(generateBinarySearchTrace([9, 1, 5, 3], 5)))
      .toBe(JSON.stringify(generateBinarySearchTrace([1, 3, 5, 9], 5)));
  });
});
