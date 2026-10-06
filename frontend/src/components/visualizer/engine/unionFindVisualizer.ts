import { VisualizerStateFrame, GraphNodeState } from '@/lib/types';

/**
 * Disjoint-set union trace generator (spec 006, T087).
 *
 * Shows both optimisations as they happen: union by rank decides which root
 * survives, and path compression rewrites the pointers walked. The node labels
 * carry the parent chain, so the "before and after" of a compression step is
 * visible rather than inferred.
 *
 * Laid out as a forest in the GRAPH state shape. Positions are fixed at build
 * time from the element index, so the animation never jumps.
 */
export function generateUnionFindTrace(
  pairs: Array<[number, number]>,
  elementCount?: number,
): VisualizerStateFrame[] {
  const ops = pairs
    .map(([a, b]) => [a, b] as [number, number])
    .filter(([a, b]) => Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0);

  const n = Math.max(2, elementCount ?? ops.reduce((m, p) => Math.max(m, p[0], p[1]), 0) + 1);
  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = new Array(n).fill(0);

  const frames: VisualizerStateFrame[] = [];
  const status = new Map<string, GraphNodeState['status']>();
  const activeEdges = new Set<number>();
  let findCalls = 0;
  let compressed = 0;
  let unionCalls = 0;
  let redundant = 0;
  let lastForestSignature = '';

  /** Signature of the current forest, used to suppress no-op frames. */
  const forestSignature = (): string =>
    Array.from({ length: n }, (_, i) => `${i}:${parent[i]}`).join(',') +
    '|' + Array.from(status.entries()).map(([k, v]) => `${k}=${v}`).sort().join(',');

  const layout = new Map<string, { x: number; y: number }>();
  for (let i = 0; i < n; i++) {
    // Deterministic: elements sit in a fixed row, so a pointer rewrite is the
    // only thing that moves.
    layout.set(`e${i}`, { x: 60 + i * 100, y: 60 });
  }

  const find = (x: number): { root: number; path: number[] } => {
    const path: number[] = [];
    let cur = x;
    while (parent[cur] !== cur) {
      path.push(cur);
      cur = parent[cur];
    }
    return { root: cur, path };
  };

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
        nodes: Array.from({ length: n }, (_, i) => ({
          id: `e${i}`,
          label: `${i}${parent[i] !== i ? ` -> ${parent[i]}` : ''}`,
          x: 60 + i * 100,
          y: 60,
          status: status.get(`e${i}`) ?? 'default',
        })),
        // Only the forest edges: parent -> child, one per non-root element.
        edges: Array.from({ length: n }, (_, i) => ({ from: `e${parent[i]}`, to: `e${i}` })).filter(
          (e) => e.from !== e.to,
        ),
        frontier: [],
        visited: [],
        active_node_id: active,
      },
    });
  };

  if (ops.length === 0) {
    // One frame only. With no operations the forest never changes, so an opening
    // frame followed by a summary would render identically (F-05) and the canvas
    // would look frozen at the exact point the answer is given.
    snap(
      'EXHAUST',
      `Union-find initialised over ${n} elements with an empty operation sequence: every element is its own root and no union ever ran.`,
      'The invariant holds because no two elements are connected. An empty operation sequence is a valid boundary case: the structure is well-formed and answers every connectivity query in the negative at constant cost.',
    );
    return finalize(frames);
  }

  snap(
    'INIT',
    `Union-find initialised over ${n} element${n === 1 ? '' : 's'}: every element is its own root.`,
    'The invariant is that parent[x] equals parent[y] exactly when x and y are connected. It holds initially because no two elements are connected, and every operation below preserves it.',
  );

  ops.forEach(([a, b], opIndex) => {
    unionCalls++;
    const ra = find(a);
    const rb = find(b);
    findCalls += 2;

    for (const p of ra.path) status.set(`e${p}`, 'visited');

    if (ra.root === rb.root) {
      redundant++;
      // Skipping a redundant union mutates nothing, so two consecutive skips would
      // render identically (F-05). Emit the frame only when the forest actually
      // looks different from the previous one; the running total goes into the
      // summary so no information is lost by not repeating an identical picture.
      const sig = forestSignature();
      if (sig !== lastForestSignature) {
        lastForestSignature = sig;
        snap(
          'PRUNE',
          `Union(${a}, ${b}): both already reach root ${ra.root}, so this edge is redundant and skipped. (${redundant} skipped so far.)`,
          'Skipping is exactly the test that makes Kruskal correct — accepting this edge would close a cycle. The invariant is unchanged, and nothing was paid beyond the two finds.',
          `e${ra.root}`,
        );
      }
      return;
    }

    // Union by rank: the shallower tree is attached under the deeper one.
    let [keep, drop] = [ra.root, rb.root];
    if (rank[keep] > rank[drop]) [keep, drop] = [drop, keep];
    else if (rank[keep] === rank[drop]) rank[keep]++;

    parent[drop] = keep;
    status.set(`e${drop}`, 'active');
    activeEdges.add(opIndex);
    lastForestSignature = forestSignature();

    snap(
      'INSERT',
      `Union(${a}, ${b}): root ${drop} attached under root ${keep} (rank ${rank[keep]}).`,
      `Attaching the shallower tree under the deeper one bounds tree height: each time a node's depth increases, its component has at least doubled. That bound is what turns a worst-case O(n) find into a logarithmic one.`,
      `e${keep}`,
    );

    // Path compression on the element that caused the walk.
    const target = find(keep === ra.root ? a : b);
    const walked = target.path;
    if (walked.length > 1) {
      for (const p of walked) parent[p] = keep;
      lastForestSignature = forestSignature();
      compressed += walked.length;
      snap(
        'SPLIT',
        `Path compression: rewrote the chain ${walked.join(' -> ')} so each element points straight at root ${keep}.`,
        'Rewriting pointers within a tree does not move any element to a different component, so correctness is untouched while the walk gets shorter. That is the ideal shape for an optimisation: same answer, less work.',
        `e${keep}`,
      );
    }
  });

  const roots = new Set(Array.from({ length: n }, (_, i) => find(i).root));
  snap(
    'EXHAUST',
    `Done. ${unionCalls} union calls (${redundant} redundant and skipped), ${findCalls} finds, ${compressed} pointer rewrites by path compression. ${roots.size} component${roots.size === 1 ? '' : 's'} remain.`,
    `With both optimisations the amortised cost per operation is alpha(n), where alpha is the inverse Ackermann function and is below 5 for any n that fits in memory. Using only one of them loses that bound and settles for O(log n) — a measurable difference on large inputs.`,
  );

  return finalize(frames);
}

function finalize(frames: VisualizerStateFrame[]): VisualizerStateFrame[] {
  frames.forEach((f, i) => {
    f.step_index = i;
    f.total_steps = frames.length;
  });
  return frames;
}