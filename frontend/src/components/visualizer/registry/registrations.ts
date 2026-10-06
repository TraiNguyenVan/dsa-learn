/**
 * Registry entries for the generators that already existed before spec 006
 * (task T059).
 *
 * Each entry is filed under the topic whose subject the algorithm actually
 * belongs to. Before this change the container fell through to
 * `generateBinarySearchTrace` for any topic it did not recognise, which meant
 * six topics were shown a binary search animation they had nothing to do with
 * (FR-013, FR-016). A topic with no entry here now renders the explicit
 * incomplete state instead, until its own animation is authored in US2.
 */

import { generateBinarySearchTrace, generateTwoSumTrace } from '../engine/arrayVisualizer';
import { generateInsertHeadTrace, generateReverseListTrace } from '../engine/linkedListVisualizer';
import { generateBSTInsertTrace, generateBSTSearchTrace } from '../engine/treeVisualizer';
import { generateHeapInsertTrace } from '../engine/heapVisualizer';
import { generateMonotonicStackTrace, generateQueueTrace } from '../engine/stackVisualizer';
import { generateBFSTrace, type GraphInput } from '../engine/graphVisualizer';
import { generateTrieTrace } from '../engine/trieVisualizer';
import { generateDPTabularTrace } from '../engine/dpVisualizer';
import { generateBacktrackingTrace } from '../engine/backtrackingVisualizer';
import { generateSlidingWindowTrace } from '../engine/slidingWindowVisualizer';
import { generateHashInsertTrace } from '../engine/hashVisualizer';
import { generateMergeSortTrace } from '../engine/sortingVisualizer';
import { generateUnionFindTrace } from '../engine/unionFindVisualizer';
import { generateSegmentTreeQueryTrace } from '../engine/segmentTreeVisualizer';
import { generateBitwiseTrace } from '../engine/bitwiseVisualizer';
import {
  generateTopologicalSortTrace,
  type DirectedGraphInput,
} from '../engine/topologicalSortVisualizer';
import {
  registerVisualization,
  type VisualizerInput,
  type VisualizationRegistration,
} from './index';

const nums = (s: string): number[] =>
  s.trim() ? s.split(',').map((p) => parseInt(p.trim(), 10)).filter((n) => !Number.isNaN(n)) : [];

const numberInput = (s: string, params: Record<string, unknown> = {}) => ({
  input: nums(s),
  params,
});

/** Flat number list -> consecutive pairs, dropping an odd trailing element. */
const toPairs = (flat: number[]): Array<[number, number]> => {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i + 1 < flat.length; i += 2) pairs.push([flat[i], flat[i + 1]]);
  return pairs;
};

/**
 * Render any VisualizerInput as the comma-separated text the input box edits.
 * Non-flat inputs (edge lists, matrices) are not yet editable in the container;
 * they render as an empty string and their generators are driven from presets.
 */
export function formatInput(input: unknown): string {
  if (!Array.isArray(input)) return '';
  return input
    .filter((v): v is number | string => typeof v === 'number' || typeof v === 'string')
    .join(', ');
}

const REGISTRATIONS: VisualizationRegistration[] = [
  {
    topicId: 'binary-search',
    operationId: 'binary_search',
    name: 'Binary Search',
    description: 'Halves a sorted search window one comparison at a time.',
    dataStructureType: 'ARRAY',
    parameters: [
      { name: 'target', label: 'Target', type: 'number', defaultValue: 23, min: -999, max: 999 },
    ],
    presets: [
      { name: 'Target Present', description: 'Target sits mid-window.', ...numberInput('2, 5, 8, 12, 16, 23, 38, 56, 72, 91', { target: 23 }) },
      { name: 'Target Missing', description: 'Search exhausts the window.', ...numberInput('2, 5, 8, 12, 16, 23, 38', { target: 15 }) },
      { name: 'Boundary Head', description: 'Target is the first element.', ...numberInput('10, 20, 30, 40, 50', { target: 10 }) },
      { name: 'Single Element', description: 'Boundary: one-element window.', ...numberInput('7', { target: 7 }) },
      { name: 'Empty Array', description: 'Boundary: nothing to search.', ...numberInput('', { target: 5 }) },
      { name: 'All Duplicates', description: 'Boundary: every value identical.', ...numberInput('4, 4, 4, 4, 4', { target: 4 }) },
      { name: 'Already Sorted', description: 'Sorted input converges immediately.', ...numberInput('1, 2, 3, 4, 5, 6, 7, 8', { target: 8 }) },
    ],
    generate: (input, params) => generateBinarySearchTrace(input as number[], Number(params.target ?? 0)),
  },

  {
    topicId: 'two-pointers',
    operationId: 'two_sum',
    name: 'Two Pointers (Sorted Two Sum)',
    description: 'Converges left and right, discarding a whole row or column per comparison.',
    dataStructureType: 'ARRAY',
    parameters: [
      { name: 'target', label: 'Target', type: 'number', defaultValue: 11, min: -999, max: 999 },
    ],
    presets: [
      { name: 'Pair Present', description: 'Sum matches mid-run.', ...numberInput('1, 3, 4, 7, 10, 11, 15', { target: 11 }) },
      { name: 'Pair Missing', description: 'Pointers meet with no solution.', ...numberInput('2, 4, 6, 8, 10', { target: 15 }) },
      { name: 'Two Elements', description: 'Boundary: minimal non-empty window.', ...numberInput('3, 4', { target: 7 }) },
      { name: 'Single Element', description: 'Boundary: pointers start already equal.', ...numberInput('9', { target: 9 }) },
      { name: 'Empty Array', description: 'Boundary: no pointers to place.', ...numberInput('', { target: 4 }) },
      { name: 'All Duplicates', description: 'Boundary: every value identical.', ...numberInput('5, 5, 5, 5, 5', { target: 10 }) },
      { name: 'Already Sorted', description: 'Sorted input converges immediately.', ...numberInput('1, 2, 3, 4, 5', { target: 7 }) },
    ],
    generate: (input, params) => generateTwoSumTrace(input as number[], Number(params.target ?? 0)),
  },

  {
    topicId: 'linked-lists',
    operationId: 'insert_head',
    name: 'Linked List — Insert at Head',
    description: 'Relinks one node ahead of the head pointer.',
    dataStructureType: 'LINKED_LIST',
    parameters: [
      { name: 'value', label: 'New Value', type: 'number', defaultValue: 5, min: -999, max: 999 },
    ],
    presets: [
      { name: 'Standard List', description: 'Three-node list.', ...numberInput('10, 20, 30', { value: 5 }) },
      { name: 'Empty List', description: 'Boundary: head is null.', ...numberInput('', { value: 42 }) },
      { name: 'Single Node', description: 'Boundary: one existing node.', ...numberInput('99', { value: 1 }) },
      { name: 'All Duplicates', description: 'Boundary: repeated values make node identity indistinguishable by value.', ...numberInput('7, 7, 7', { value: 7 }) },
      { name: 'Two Nodes', description: 'Boundary: minimal non-empty list.', ...numberInput('10, 20', { value: 5 }) },
      { name: 'Already Ordered', description: 'Boundary: ascending input, inserted value extends the range.', ...numberInput('1, 2, 3, 4, 5', { value: 6 }) },
    ],
    generate: (input, params) => generateInsertHeadTrace(input as number[], Number(params.value ?? 0)),
  },

  {
    topicId: 'linked-lists',
    operationId: 'reverse_list',
    name: 'Linked List — Reverse In Place',
    description: 'Three-pointer walk that inverts each link without allocating a node.',
    dataStructureType: 'LINKED_LIST',
    parameters: [],
    presets: [
      { name: 'Linear 5-Node List', description: 'Odd-length list.', ...numberInput('1, 2, 3, 4, 5') },
      { name: 'Two Nodes', description: 'Boundary: minimal reversal.', ...numberInput('10, 20') },
      { name: 'Single Node', description: 'Boundary: reversal is a no-op.', ...numberInput('42') },
      { name: 'Empty List', description: 'Boundary: nothing to reverse.', ...numberInput('') },
      { name: 'All Duplicates', description: 'Boundary: pointer identity by value.', ...numberInput('8, 8, 8, 8') },
    ],
    generate: (input) => generateReverseListTrace(input as number[]),
  },

  {
    topicId: 'trees',
    operationId: 'bst_search',
    name: 'Binary Search Tree — Search',
    description: 'Descends one subtree per comparison, bounded by tree height.',
    dataStructureType: 'BINARY_SEARCH_TREE',
    parameters: [
      { name: 'target', label: 'Target', type: 'number', defaultValue: 40, min: -999, max: 999 },
    ],
    presets: [
      { name: 'Balanced Tree (Found)', description: 'Target found on the left path.', ...numberInput('50, 30, 70, 20, 40, 60, 80', { target: 40 }) },
      { name: 'Missing Key', description: 'Search exhausts a subtree.', ...numberInput('50, 30, 70, 20, 40', { target: 99 }) },
      { name: 'Skewed Degenerate', description: 'Boundary: unbalanced tree degrades to O(N).', ...numberInput('10, 20, 30, 40, 50', { target: 50 }) },
      { name: 'Empty Tree', description: 'Boundary: no root to descend from.', ...numberInput('', { target: 5 }) },
      { name: 'Single Node', description: 'Boundary: only the root exists.', ...numberInput('42', { target: 42 }) },
      { name: 'All Duplicates', description: 'Boundary: repeated keys ignored.', ...numberInput('5, 5, 5', { target: 5 }) },
    ],
    generate: (input, params) => generateBSTSearchTrace(input as number[], Number(params.target ?? 0)),
  },

  {
    topicId: 'trees',
    operationId: 'bst_insert',
    name: 'Binary Search Tree — Insert',
    description: 'Follows the search path to a null link, then attaches there.',
    dataStructureType: 'BINARY_SEARCH_TREE',
    parameters: [
      { name: 'key', label: 'Key', type: 'number', defaultValue: 25, min: -999, max: 999 },
    ],
    presets: [
      { name: 'Standard Tree', description: 'Key lands in an interior null link.', ...numberInput('30, 15, 50, 10, 22', { key: 25 }) },
      { name: 'Empty Tree', description: 'Boundary: key becomes the root.', ...numberInput('', { key: 50 }) },
      { name: 'Duplicate Key', description: 'Boundary: duplicate is ignored.', ...numberInput('30, 15, 50', { key: 30 }) },
      { name: 'Single Node', description: 'Boundary: one existing node.', ...numberInput('10', { key: 20 }) },
      { name: 'All Duplicates', description: 'Boundary: repeated keys collapse.', ...numberInput('5, 5, 5', { key: 5 }) },
    ],
    generate: (input, params) => generateBSTInsertTrace(input as number[], Number(params.key ?? 0)),
  },

  {
    topicId: 'heap',
    operationId: 'heap_insert',
    name: 'Min-Heap — Insert (Bubble-Up)',
    description: 'Appends at the next free slot, then sifts up until the min-heap invariant holds.',
    dataStructureType: 'HEAP',
    parameters: [
      { name: 'value', label: 'New Value', type: 'number', defaultValue: 5, min: -999, max: 999 },
    ],
    presets: [
      { name: 'Insert Smaller', description: 'Value swaps all the way to the root.', ...numberInput('10, 20, 15, 30, 40', { value: 5 }) },
      { name: 'Insert Larger', description: 'Value stops immediately, no swap.', ...numberInput('10, 20, 15', { value: 50 }) },
      { name: 'Empty Heap', description: 'Boundary: value becomes the root.', ...numberInput('', { value: 42 }) },
      { name: 'Single Node', description: 'Boundary: no parent to compare against.', ...numberInput('7', { value: 3 }) },
      { name: 'All Duplicates', description: 'Boundary: equal values need no swap.', ...numberInput('5, 5, 5', { value: 5 }) },
    ],
    generate: (input, params) => generateHeapInsertTrace(input as number[], Number(params.value ?? 0)),
  },

  // -------------------------------------------------------------------------
  // spec 006 US2: one animation per remaining topic, each with the FR-014
  // boundary presets.
  // -------------------------------------------------------------------------

  {
    topicId: 'stack',
    operationId: 'monotonic_stack',
    name: 'Monotonic Stack',
    description: 'Pops every dominated element on each push, so total work stays linear.',
    dataStructureType: 'STACK',
    parameters: [],
    presets: [
      { name: 'Random Values', description: 'Typical mixed input.', input: nums('5, 2, 6, 3, 1'), params: {} },
      { name: 'Empty Input', description: 'Boundary: nothing to push.', input: nums(''), params: {} },
      { name: 'Single Element', description: 'Boundary: one push, no pops.', input: nums('7'), params: {} },
      { name: 'Already Sorted', description: 'Boundary: ascending input, no element is dominated.', input: nums('1, 2, 3, 4, 5'), params: {} },
      { name: 'Reverse Sorted', description: 'Boundary: every push pops the entire stack.', input: nums('9, 7, 5, 3, 1'), params: {} },
      { name: 'All Duplicates', description: 'Boundary: equal values are not dominated by each other.', input: nums('4, 4, 4, 4'), params: {} },
      { name: 'Long Increasing Run', description: 'Boundary: a single pop closes the whole search space.', input: nums('1, 2, 3, 4, 5, 6, 7, 8'), params: {} },
      { name: 'Exhausted Pass', description: 'Boundary: full pass ends with one survivor, the maximum.', input: nums('3, 1, 4, 1, 5, 9, 2, 6'), params: {} },
    ],
    generate: (input) => generateMonotonicStackTrace(input as number[]),
  },

  {
    topicId: 'stack',
    operationId: 'fifo_queue',
    name: 'FIFO Queue',
    description: 'Enqueue at the rear, dequeue from the front, and watch the two ends diverge.',
    dataStructureType: 'QUEUE',
    parameters: [
      {
        name: 'operation',
        label: 'Operation',
        type: 'string',
        defaultValue: 'dequeue',
      },
    ],
    presets: [
      { name: 'Enqueue Only', description: 'Fills the queue to show arrival order.', input: nums('1, 2, 3, 4'), params: { operation: 'enqueue' } },
      { name: 'Enqueue Then Dequeue', description: 'Shows departure order matching arrival order.', input: nums('1, 2, 3, 4'), params: { operation: 'dequeue' } },
      { name: 'Empty Queue', description: 'Boundary: front and rear both undefined.', input: nums(''), params: { operation: 'dequeue' } },
      { name: 'Single Element', description: 'Boundary: front and rear are the same slot.', input: nums('5'), params: { operation: 'dequeue' } },
      { name: 'Two Elements', description: 'Boundary: minimal non-empty drain.', input: nums('8, 9'), params: { operation: 'dequeue' } },
      { name: 'Already Sorted', description: 'Boundary: ascending input.', input: nums('1, 2, 3'), params: { operation: 'dequeue' } },
      { name: 'Fully Drained', description: 'Boundary: the last element leaves and the queue is empty again.', input: nums('1'), params: { operation: 'dequeue' } },
      { name: 'All Duplicates', description: 'Boundary: identical values, order still observable by position.', input: nums('6, 6, 6'), params: { operation: 'dequeue' } },
    ],
    generate: (input, params) =>
      generateQueueTrace(input as number[], (params.operation as 'enqueue' | 'dequeue') ?? 'enqueue'),
  },

  {
    topicId: 'graphs',
    operationId: 'bfs_traversal',
    name: 'Breadth-First Search',
    description: 'Expands the frontier level by level from a source, proving reachability.',
    dataStructureType: 'GRAPH',
    parameters: [
      { name: 'source', label: 'Source', type: 'string', defaultValue: 'A' },
    ],
    presets: [
      {
        name: 'Standard Graph',
        description: '6 vertices, 7 edges, fully reachable.',
        input: { nodes: ['A', 'B', 'C', 'D', 'E', 'F'], edges: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'E'], ['E', 'F'], ['B', 'F']] } as unknown as VisualizerInput,
        params: { source: 'A' },
      },
      {
        name: 'Single Vertex',
        description: 'Boundary: one vertex, no edges.',
        input: { nodes: ['A'], edges: [] } as unknown as VisualizerInput,
        params: { source: 'A' },
      },
      {
        name: 'Disconnected Component',
        description: 'Boundary: a vertex unreachable from the source.',
        input: { nodes: ['A', 'B', 'C', 'D'], edges: [['A', 'B'], ['C', 'D']] } as unknown as VisualizerInput,
        params: { source: 'A' },
      },
      {
        name: 'Fully Connected',
        description: 'Boundary: every vertex adjacent to the source.',
        input: { nodes: ['A', 'B', 'C'], edges: [['A', 'B'], ['A', 'C']] } as unknown as VisualizerInput,
        params: { source: 'A' },
      },
      {
        name: 'Cycle', description: 'Boundary: a cycle, so the visited set is the only thing preventing a loop.', input: { nodes: ['A', 'B', 'C'], edges: [['A', 'B'], ['B', 'C'], ['C', 'A']] } as unknown as VisualizerInput, params: { source: 'A' } },
      {
        name: 'Weighted Edges',
        description: 'Boundary: weights present but BFS ignores them (that is Dijkstra).',
        input: { nodes: ['A', 'B', 'C'], edges: [['A', 'B', 5], ['B', 'C', 2], ['A', 'C', 9]] } as unknown as VisualizerInput,
        params: { source: 'A' },
      },
      {
        name: 'Linear Chain',
        description: 'Boundary: a path, so each vertex has exactly one neighbour to expand.',
        input: { nodes: ['A', 'B', 'C', 'D'], edges: [['A', 'B'], ['B', 'C'], ['C', 'D']] } as unknown as VisualizerInput,
        params: { source: 'A' },
      },
      {
        name: 'Empty Graph',
        description: 'Boundary: no vertices, so the frontier is empty from the start.',
        input: { nodes: [], edges: [] } as unknown as VisualizerInput,
        params: { source: 'A' },
      },
      {
        name: 'Source Absent',
        description: 'Boundary: the named source is not in the graph, so the search must fall back.',
        input: { nodes: ['A', 'B'], edges: [['A', 'B']] } as unknown as VisualizerInput,
        params: { source: 'Z' },
      },
      {
        name: 'Duplicate Edges',
        description: 'Boundary: parallel edges between the same pair, which the visited set must tolerate.',
        input: { nodes: ['A', 'B', 'C'], edges: [['A', 'B'], ['A', 'B'], ['B', 'C'], ['B', 'C']] } as unknown as VisualizerInput,
        params: { source: 'A' },
      },
    ],
    generate: (input, params) =>
      generateBFSTrace(input as unknown as GraphInput, String(params.source ?? 'A')),
  },

  {
    topicId: 'tries',
    operationId: 'trie_insert_search',
    name: 'Trie Insert and Prefix Search',
    description: 'Same walk, two purposes: membership decides by the terminal flag.',
    dataStructureType: 'TRIE',
    parameters: [
      { name: 'query', label: 'Query', type: 'string', defaultValue: 'cat' },
      { name: 'mode', label: 'Mode', type: 'string', defaultValue: 'search' },
    ],
    presets: [
      { name: 'Exact Key', description: 'Walk succeeds and the terminal flag is set.', input: ['cat', 'car', 'cart'], params: { query: 'cat', mode: 'search' } },
      { name: 'Valid Prefix Only', description: 'Walk succeeds but the flag is unset: a prefix, not a key.', input: ['cart', 'carbon'], params: { query: 'car', mode: 'search' } },
      { name: 'Missing Prefix', description: 'Walk fails mid-string: no key starts this way.', input: ['cat', 'car'], params: { query: 'dog', mode: 'search' } },
      { name: 'Empty Query', description: 'Boundary: the empty string is a prefix of every key.', input: ['cat'], params: { query: '', mode: 'search' } },
      { name: 'Empty Trie', description: 'Boundary: nothing stored yet.', input: [], params: { query: 'cat', mode: 'search' } },
      { name: 'Single Character', description: 'Boundary: one-character key.', input: ['a'], params: { query: 'a', mode: 'search' } },
      { name: 'Insert Shared Prefixes', description: 'Builds a trie to show prefix sharing.', input: ['cat', 'car', 'card'], params: { query: 'ca', mode: 'insert' } },
      { name: 'All Duplicate Keys', description: 'Boundary: the same key inserted twice, which is idempotent.', input: ['cat', 'cat', 'cat'], params: { query: 'cat', mode: 'insert' } },
    ],
    generate: (input, params) =>
      generateTrieTrace(
        input as string[],
        String(params.query ?? 'cat'),
        (params.mode as 'insert' | 'search') ?? 'search',
      ),
  },

  {
    topicId: 'dynamic-programming',
    operationId: 'dp_table_fill',
    name: 'DP Table Fill',
    description: 'Writes each state once, showing exactly which cells it reads from.',
    dataStructureType: 'DP_TABLE',
    parameters: [
      { name: 'target', label: 'Target', type: 'number', defaultValue: 7, min: 0, max: 60 },
    ],
    presets: [
      { name: 'Standard Coins', description: 'Coins 1, 3, 4 to amount 7.', input: nums('1, 3, 4'), params: { target: 7 } },
      { name: 'No Solution', description: 'Boundary: unreachable amount, so the final cell stays null.', input: nums('4, 6'), params: { target: 5 } },
      { name: 'Zero Target', description: 'Boundary: the base case alone.', input: nums('1, 3, 4'), params: { target: 0 } },
      { name: 'Empty Input', description: 'Boundary: no coins, degenerate table.', input: nums(''), params: { target: 5 } },
      { name: 'Single Coin', description: 'Boundary: one row of transitions.', input: nums('5'), params: { target: 10 } },
      { name: 'Already Ordered', description: 'Boundary: ascending coin values.', input: nums('1, 2, 3, 4, 5'), params: { target: 9 } },
      { name: 'All Duplicates', description: 'Boundary: repeated coin values, redundant rows.', input: nums('3, 3, 3'), params: { target: 9 } },
    ],
    generate: (input, params) =>
      generateDPTabularTrace(input as number[], Number(params.target ?? 7)),
  },

  {
    topicId: 'backtracking',
    operationId: 'pruned_pair_search',
    name: 'Backtracking with Pruning',
    description: 'Recurses, backtracks, and prunes branches with a stated reason.',
    dataStructureType: 'BACKTRACK',
    parameters: [
      { name: 'target', label: 'Target Sum', type: 'number', defaultValue: 9, min: -999, max: 999 },
    ],
    presets: [
      { name: 'Solution Found', description: 'A pair exists early in the search.', input: nums('4, 8, 1, 5'), params: { target: 9 } },
      { name: 'Multiple Solutions', description: 'Two or more pairs, so exhaustiveness is visible.', input: nums('1, 8, 2, 7'), params: { target: 9 } },
      { name: 'No Solution', description: 'Every candidate is pruned; absence is proved.', input: nums('20, 30, 40'), params: { target: 9 } },
      { name: 'Empty Input', description: 'Boundary: no first move to try.', input: nums(''), params: { target: 9 } },
      { name: 'Single Element', description: 'Boundary: no second index can pair with the first.', input: nums('5'), params: { target: 9 } },
      { name: 'Two Elements', description: 'Boundary: minimal non-trivial search.', input: nums('4, 5'), params: { target: 9 } },
      { name: 'All Duplicates', description: 'Boundary: equal values, multiple index pairs, one value sum.', input: nums('3, 3, 3'), params: { target: 6 } },
    ],
    generate: (input, params) => generateBacktrackingTrace(input as number[], Number(params.target ?? 9)),
  },

  {
    topicId: 'sliding-window',
    operationId: 'longest_unique_window',
    name: 'Longest Subarray Without Repeats',
    description: 'Expands right, contracts left, and states the window invariant each step.',
    dataStructureType: 'ARRAY',
    parameters: [],
    presets: [
      { name: 'Standard Text', description: 'Mixed characters with repeats.', input: ['a', 'b', 'c', 'a', 'd', 'b'] as unknown as VisualizerInput, params: {} },
      { name: 'All Unique', description: 'Boundary: no contraction ever needed.', input: ['a', 'b', 'c', 'd'] as unknown as VisualizerInput, params: {} },
      { name: 'All Duplicates', description: 'Boundary: contraction on nearly every step.', input: ['a', 'a', 'a', 'a'] as unknown as VisualizerInput, params: {} },
      { name: 'Empty Input', description: 'Boundary: no right edge to advance.', input: [] as unknown as VisualizerInput, params: {} },
      { name: 'Single Character', description: 'Boundary: one step, no duplicate possible.', input: ['x'] as unknown as VisualizerInput, params: {} },
      { name: 'Two Characters', description: 'Boundary: minimal repeat test.', input: ['a', 'a'] as unknown as VisualizerInput, params: {} },
      { name: 'Already Ordered', description: 'Boundary: strictly increasing window throughout.', input: ['a', 'b', 'c', 'd', 'e'] as unknown as VisualizerInput, params: {} },
      { name: 'Exhausted Sweep', description: 'Boundary: sweep reaches the last index and the window is reused from scratch twice.', input: ['a', 'b', 'c', 'a', 'b', 'c'] as unknown as VisualizerInput, params: {} },
    ],
    generate: (input) => generateSlidingWindowTrace(input as string[]),
  },

  {
    topicId: 'arrays-hashing',
    operationId: 'hash_bucket_insert',
    name: 'Hash Table Insert (Buckets and Collisions)',
    description: 'Places keys by key mod bucket count and surfaces every collision.',
    dataStructureType: 'ARRAY',
    parameters: [
      { name: 'buckets', label: 'Bucket Count', type: 'number', defaultValue: 5, min: 1, max: 24 },
    ],
    presets: [
      { name: 'Mixed Keys', description: 'Some collisions, some buckets empty.', input: nums('5, 12, 3, 17, 8'), params: { buckets: 5 } },
      { name: 'Every Key Collides', description: 'Boundary: all keys land in one bucket, the O(N) worst case.', input: nums('2, 7, 12, 17'), params: { buckets: 5 } },
      { name: 'No Collisions', description: 'Boundary: hash is effectively a perfect permutation here.', input: nums('1, 2, 3, 4'), params: { buckets: 4 } },
      { name: 'All Duplicates', description: 'Boundary: identical keys, so the same bucket every time.', input: nums('7, 7, 7, 7'), params: { buckets: 5 } },
      { name: 'Single Key', description: 'Boundary: one insert, no collisions possible.', input: nums('9'), params: { buckets: 5 } },
      { name: 'Empty Input', description: 'Boundary: table allocated but nothing stored.', input: nums(''), params: { buckets: 5 } },
      { name: 'Single Bucket', description: 'Boundary: one bucket forces a chain by construction.', input: nums('3, 9, 15'), params: { buckets: 1 } },
      { name: 'Exhausted Buckets', description: 'Boundary: every bucket occupied, load factor exactly 1.0.', input: nums('0, 1, 2, 3, 4'), params: { buckets: 5 } },
    ],
    generate: (input, params) => generateHashInsertTrace(input as number[], Number(params.buckets ?? 5)),
  },

  // -------------------------------------------------------------------------
  // spec 006 US3: the four subject areas that had no topic at all.
  // -------------------------------------------------------------------------

  {
    topicId: 'sorting',
    operationId: 'merge_sort',
    name: 'Merge Sort',
    description: 'Splits to single elements, then merges sorted runs one comparison at a time.',
    dataStructureType: 'ARRAY',
    parameters: [],
    presets: [
      { name: 'Mixed Values', description: 'Unsorted input, the general case.', input: nums('5, 2, 9, 1, 7'), params: {} },
      { name: 'Already Sorted', description: 'Boundary: merges still run, so mergesort does not adapt.', input: nums('1, 2, 3, 4, 5'), params: {} },
      { name: 'Reverse Sorted', description: 'Boundary: every merge takes the full run length.', input: nums('5, 4, 3, 2, 1'), params: {} },
      { name: 'All Duplicates', description: 'Boundary: ties must break consistently to stay stable.', input: nums('4, 4, 4, 4'), params: {} },
      { name: 'Single Element', description: 'Boundary: no merge is needed at all.', input: nums('7'), params: {} },
      { name: 'Two Elements', description: 'Boundary: one merge of two length-1 runs.', input: nums('8, 3'), params: {} },
      { name: 'Empty Input', description: 'Boundary: recursion terminates immediately, no merge runs.', input: nums(''), params: {} },
      { name: 'Complete Sort', description: 'Boundary: the whole array sorted and the merge count reported, which is where the trace ends.', input: nums('4, 4, 2, 2, 9, 1'), params: {} },
    ],
    generate: (input) => generateMergeSortTrace(input as number[]),
  },

  {
    topicId: 'graph-algorithms',
    operationId: 'topological_sort',
    name: 'Topological Sort (Kahn)',
    description: 'Emits vertices only at in-degree zero, and reports the cycle when none remain.',
    dataStructureType: 'GRAPH',
    parameters: [],
    presets: [
      {
        name: 'DAG Course Order',
        description: '6 vertices, acyclic, every vertex reachable from the source.',
        input: { nodes: ['a', 'b', 'c', 'd', 'e', 'f'], edges: [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['d', 'e'], ['e', 'f']] } as unknown as VisualizerInput,
        params: {},
      },
      {
        name: 'Cyclic',
        description: 'Boundary: a cycle, so no topological order exists.',
        input: { nodes: ['a', 'b', 'c'], edges: [['a', 'b'], ['b', 'c'], ['c', 'a']] } as unknown as VisualizerInput,
        params: {},
      },
      {
        name: 'Single Vertex',
        description: 'Boundary: one vertex, no edges, trivially ordered.',
        input: { nodes: ['a'], edges: [] } as unknown as VisualizerInput,
        params: {},
      },
      {
        name: 'Empty Graph',
        description: 'Boundary: no vertices, so the order is empty.',
        input: { nodes: [], edges: [] } as unknown as VisualizerInput,
        params: {},
      },
      {
        name: 'Duplicate Edges',
        description: 'Boundary: parallel edges, which raise in-degree without adding order.',
        input: { nodes: ['a', 'b', 'c'], edges: [['a', 'b'], ['a', 'b'], ['b', 'c']] } as unknown as VisualizerInput,
        params: {},
      },
      {
        name: 'Disconnected Components',
        description: 'Boundary: two independent chains that must both be emitted.',
        input: { nodes: ['a', 'b', 'c', 'd'], edges: [['a', 'b'], ['c', 'd']] } as unknown as VisualizerInput,
        params: {},
      },
      {
        name: 'All Same In-Degree',
        description: 'Boundary: a wide level of independent vertices, so emission order is unconstrained.',
        input: { nodes: ['a', 'b', 'c', 'd'], edges: [['a', 'e'], ['b', 'e'], ['c', 'e'], ['d', 'e']] } as unknown as VisualizerInput,
        params: {},
      },
    ],
    generate: (input) => generateTopologicalSortTrace(input as unknown as DirectedGraphInput),
  },

  {
    topicId: 'advanced-data-structures',
    operationId: 'union_find',
    name: 'Disjoint-Set Union',
    description: 'Union by rank decides the survivor; path compression flattens the chains.',
    dataStructureType: 'GRAPH',
    parameters: [],
    presets: [
      { name: 'Chain Build', description: 'Six unions forming one component.', input: nums('0, 1, 1, 2, 2, 3'), params: {} },
      { name: 'Disconnected Sets', description: 'Boundary: two components never joined.', input: nums('0, 1, 3, 4'), params: {} },
      { name: 'Redundant Union', description: 'Boundary: an edge whose endpoints are already connected.', input: nums('0, 1, 1, 2, 0, 2'), params: {} },
      { name: 'Self Union', description: 'Boundary: an element unioned with itself.', input: nums('0, 0, 1, 1'), params: {} },
      { name: 'Single Pair', description: 'Boundary: one union, minimal non-trivial case.', input: nums('0, 1'), params: {} },
      { name: 'Empty Sequence', description: 'Boundary: an empty operation list, so every element stays its own root.', input: nums(''), params: {} },
      { name: 'All Duplicates', description: 'Boundary: the same pair repeated, so all but the first are pruned.', input: nums('2, 3, 2, 3, 2, 3'), params: {} },
    ],
    generate: (input) => generateUnionFindTrace(toPairs(input as number[])),
  },

  {
    topicId: 'advanced-data-structures',
    operationId: 'segment_tree_query',
    name: 'Segment Tree Range Query',
    description: 'Descends only into partially covered nodes and merges the rest whole.',
    dataStructureType: 'GRAPH',
    parameters: [
      { name: 'lo', label: 'Query Low', type: 'number', defaultValue: 1, min: 0, max: 999 },
      { name: 'hi', label: 'Query High', type: 'number', defaultValue: 6, min: 0, max: 999 },
    ],
    presets: [
      { name: 'Full Range', description: 'The whole array, answered by the root.', input: nums('3, 1, 4, 1, 5, 9, 2, 6'), params: { lo: 0, hi: 7 } },
      { name: 'Interior Range', description: 'Fully covered by two canonical nodes.', input: nums('3, 1, 4, 1, 5, 9, 2, 6'), params: { lo: 2, hi: 5 } },
      { name: 'Single Element', description: 'Boundary: a range of length 1.', input: nums('3, 1, 4, 1, 5, 9, 2, 6'), params: { lo: 4, hi: 4 } },
      { name: 'Exhausted Empty Range', description: 'Boundary: low exceeds high, so the query has no canonical nodes and folds nothing.', input: nums('3, 1, 4, 1, 5, 9, 2, 6'), params: { lo: 5, hi: 2 } },
      { name: 'Empty Array', description: 'Boundary: no elements at all.', input: nums(''), params: { lo: 0, hi: 0 } },
      { name: 'Already Ordered', description: 'Boundary: ascending input.', input: nums('1, 2, 3, 4, 5, 6'), params: { lo: 1, hi: 4 } },
      { name: 'All Duplicates', description: 'Boundary: equal values, so minima tie everywhere.', input: nums('7, 7, 7, 7'), params: { lo: 1, hi: 2 } },
    ],
    generate: (input, params) =>
      generateSegmentTreeQueryTrace(input as number[], Number(params.lo ?? 0), Number(params.hi ?? 0)),
  },

  {
    topicId: 'math-bitwise',
    operationId: 'bitwise_demo',
    name: 'Bitwise Identities',
    description: 'Shows each operand as its bit expansion so the identities are visible.',
    dataStructureType: 'ARRAY',
    parameters: [
      { name: 'a', label: 'A', type: 'number', defaultValue: 12, min: 0, max: 999 },
      { name: 'b', label: 'B', type: 'number', defaultValue: 10, min: 0, max: 999 },
      { name: 'op', label: 'Operation', type: 'number', defaultValue: 0, min: 0, max: 5 },
    ],
    presets: [
      { name: 'XOR', description: 'a XOR b with distinct operands.', input: [], params: { a: 12, b: 10, op: 0 } },
      { name: 'Duplicate Operands Cancel Completely', description: 'Boundary: a equals b, so a XOR a exhausts to 0 and the pair cancels entirely.', input: [], params: { a: 12, b: 12, op: 0 } },
      { name: 'AND', description: 'a AND b: bits set in both.', input: [], params: { a: 12, b: 10, op: 1 } },
      { name: 'OR', description: 'a OR b: bits set in either.', input: [], params: { a: 12, b: 10, op: 2 } },
      { name: 'Single Set Bit Cleared', description: 'Boundary: one set bit, which a AND (a-1) removes entirely.', input: [], params: { a: 8, b: 0, op: 4 } },
      { name: 'Isolate Lowest Bit', description: 'a AND -a: keeps only the lowest set bit.', input: [], params: { a: 12, b: 0, op: 5 } },
      { name: 'Empty Operand', description: 'Boundary: a = 0, so there are no set bits to work with at all.', input: [], params: { a: 0, b: 5, op: 4 } },
      { name: 'Every Bit Set', description: 'Boundary: all positions set across the display width.', input: [], params: { a: 63, b: 63, op: 1 } },
    ],
    generate: (_input, params) =>
      generateBitwiseTrace(Number(params.a ?? 0), Number(params.b ?? 0), Number(params.op ?? 0)),
  },
];

let registered = false;

/** Idempotent: safe to call on every module load. */
export function registerExistingGenerators(): void {
  if (registered) return;
  for (const registration of REGISTRATIONS) {
    registerVisualization(registration);
  }
  registered = true;
}

export { REGISTRATIONS };
