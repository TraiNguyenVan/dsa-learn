import { VisualizerStateFrame, GraphNodeState } from '@/lib/types';

/**
 * Segment-tree range-query generator (spec 006, T088).
 *
 * Reuses the GRAPH state shape because a segment tree *is* a tree, and the
 * renderer draws it from the same deterministic layered layout. What makes it a
 * segment tree rather than a generic tree is the node label: every node names the
 * index range it covers, which is what makes the descent readable.
 *
 * The `covered` / `partial` / `excluded` statuses encode the partition invariant
 * directly, so the learner can watch the $O(\log n)$ decomposition happen.
 */
export function generateSegmentTreeQueryTrace(
  values: number[],
  lo: number,
  hi: number,
): VisualizerStateFrame[] {
  const nums = [...values];
  const n = nums.length;
  const frames: VisualizerStateFrame[] = [];

  // Build the tree over whatever prefix of `nums` is real.
  //
  // Nodes are keyed by *heap index* (left = 2i+1, right = 2i+2) and materialised
  // into an array in that order. An earlier version pushed nodes in post-order
  // while still indexing children as 2i+1, which silently mismatched every
  // child reference and crashed on the first query.
  const size = Math.max(1, n);
  interface Node {
    id: string;
    heapIndex: number;
    range: [number, number];
    value: number | null;
  }
  const byHeap = new Map<number, Node>();

  const build = (heapIndex: number, a: number, b: number, depth: number): number | null => {
    const isLeaf = depth === 0 || a > b;
    if (isLeaf) {
      const value = a < n ? nums[a] : null;
      byHeap.set(heapIndex, { id: `n${heapIndex}`, heapIndex, range: [a, b], value });
      return value;
    }
    const mid = Math.floor((a + b) / 2);
    const lv = build(2 * heapIndex + 1, a, mid, depth - 1);
    const rv = build(2 * heapIndex + 2, mid + 1, b, depth - 1);
    const value = lv === null ? rv : rv === null ? lv : Math.min(lv, rv);
    byHeap.set(heapIndex, { id: `n${heapIndex}`, heapIndex, range: [a, b], value });
    return value;
  };

  const depth = Math.max(0, Math.ceil(Math.log2(Math.max(2, size))) - 1);
  build(0, 0, Math.max(0, size - 1), depth);

  const nodes: Node[] = [...byHeap.values()].sort((x, y) => x.heapIndex - y.heapIndex);
  const indexOf = new Map<number, number>();
  nodes.forEach((nd, i) => indexOf.set(nd.heapIndex, i));

  const layout = new Map<string, { x: number; y: number }>();
  const byLevel = new Map<number, number[]>();
  nodes.forEach((_, i) => {
    const level = Math.floor(Math.log2(i + 1));
    const list = byLevel.get(level) ?? [];
    list.push(i);
    byLevel.set(level, list);
  });
  const widest = Math.max(...Array.from(byLevel.values(), (l) => l.length));
  byLevel.forEach((idxs, level) => {
    const start = ((widest - idxs.length) * 100) / 2 + 50;
    idxs.forEach((nodeIdx, xi) => {
      layout.set(nodes[nodeIdx].id, { x: start + xi * 100, y: 40 + level * 80 });
    });
  });

  const statuses = new Map<string, GraphNodeState['status']>();
  let running: number | null = null;
  let coveredNodes = 0;

  const snap = (
    action: VisualizerStateFrame['action_type'],
    description: string,
    rationale: string,
    active: string | null = null,
  ): void => {
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: action,
      description,
      rationale,
      data_structure_type: 'GRAPH',
      graph_state: {
        nodes: nodes.map((nd) => ({
          id: nd.id,
          label: `[${nd.range[0]},${nd.range[1]}]=${nd.value === null ? 'inf' : nd.value}`,
          x: layout.get(nd.id)?.x ?? 0,
          y: layout.get(nd.id)?.y ?? 0,
          status: statuses.get(nd.id) ?? 'default',
        })),
        edges: nodes
          .filter((nd) => nd.heapIndex !== 0)
          .map((nd) => ({
            from: nodes[indexOf.get(Math.floor((nd.heapIndex - 1) / 2)) ?? 0].id,
            to: nd.id,
          })),
        frontier: [],
        visited: nodes.filter((nd) => statuses.get(nd.id) === 'covered').map((nd) => nd.id),
        active_node_id: active,
      },
    });
  };

  if (n === 0) {
    // One frame. The tree is a single empty node either way, so an opening frame
    // and a closing frame would render identically (F-05).
    snap(
      'EXHAUST',
      'No elements, so the tree is a single empty node and the query returns the identity value: infinity for a minimum aggregate.',
      'Absence is represented by the identity element rather than a special flag, which keeps every merge a plain binary operation. That is a design choice trading expressiveness for uniformity, and it is why an empty range needs no separate code path.',
    );
    return finalize(frames);
  }

  snap(
    'INIT',
    `Segment tree built over ${n} element${n === 1 ? '' : 's'} (${nodes.length} nodes). Querying the minimum over [${lo}, ${hi}].`,
    'Every node stores the aggregate of the index range it covers, correct by induction because its range is the disjoint union of its children\'s. That invariant is what makes a query answerable by merging O(log n) nodes instead of scanning.',
  );

  const visit = (idx: number): void => {
    const node = nodes[idx];
    const [a, b] = node.range;

    if (a > hi || b < lo) {
      statuses.set(node.id, 'excluded');
      snap(
        'PRUNE',
        `Node [${a},${b}] skipped: disjoint from the query range [${lo},${hi}].`,
        'The partition invariant says a query merges only nodes lying inside the range. This one cannot contribute, and excluding it immediately is what stops the query from touching every node.',
        node.id,
      );
      return;
    }

    if (lo <= a && b <= hi) {
      statuses.set(node.id, 'covered');
      coveredNodes++;
      running = running === null || (node.value !== null && node.value < running) ? (node.value ?? running) : running;
      snap(
        'EXPAND',
        `Node [${a},${b}] is fully inside the query; folded its value ${node.value === null ? 'inf' : node.value} into the running result ${running === null ? 'inf' : running}.`,
        'A fully covered node needs no descent: its stored aggregate already answers the query for its whole range. Folding it directly is the step that keeps the query logarithmic — at each level at most two nodes are partial, and everything between them is taken whole.',
        node.id,
      );
      return;
    }

    statuses.set(node.id, 'partial');
    snap(
      'EXPAND',
      `Node [${a},${b}] partially overlaps [${lo},${hi}], so it splits and descends.`,
        'A partial node cannot be answered from its own aggregate, because that aggregate covers elements outside the query. Splitting and recursing on both children is correct precisely because the children\' ranges are disjoint and jointly cover the parent\'s.',
      node.id,
    );

    const mid = Math.floor((a + b) / 2);
    const leftIdx = indexOf.get(node.heapIndex * 2 + 1);
    const rightIdx = indexOf.get(node.heapIndex * 2 + 2);
    if (leftIdx !== undefined) visit(leftIdx);
    if (rightIdx !== undefined && mid < hi) visit(rightIdx);
  };

  if (hi >= lo) {
    visit(0);
    snap(
      'EXHAUST',
      `Query complete. Minimum over [${lo},${hi}] is ${running === null ? 'undefined' : running}, using ${coveredNodes} canonical node${coveredNodes === 1 ? '' : 's'}.`,
      'A contiguous range is covered by O(log n) canonical nodes because at each level at most two nodes straddle the boundaries. Merging them by associativity gives the same result whatever order they are folded in, which is what licenses the recursion.',
    );
  } else {
    // Mark the root so this frame differs from the opening one, and state the
    // reason rather than also emitting a separate "nothing merged" frame that
    // would render identically (F-05).
    statuses.set(nodes[0].id, 'excluded');
    snap(
      'EXHAUST',
      `Query range [${lo},${hi}] is inverted, so it has no canonical decomposition and nothing was folded.`,
      'An inverted range is empty by definition, so folding a node whose range is not inside the query would silently corrupt the result. Detecting it explicitly is the difference between an honest "no answer" and a plausible wrong number.',
      nodes[0].id,
    );
  }

  return finalize(frames);
}

function finalize(frames: VisualizerStateFrame[]): VisualizerStateFrame[] {
  frames.forEach((f, i) => {
    f.step_index = i;
    f.total_steps = frames.length;
  });
  return frames;
}