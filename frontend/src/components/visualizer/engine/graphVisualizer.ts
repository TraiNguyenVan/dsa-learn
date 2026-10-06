import { VisualizerStateFrame, GraphState } from '@/lib/types';
import { collapseTrailingDuplicate, renumber } from './frameUtils';

export interface GraphInput {
  nodes: string[];
  edges: Array<[string, string] | [string, string, number]>;
}

/**
 * Breadth-first search trace generator (spec 006, T062).
 *
 * Emits frontier and visited sets on every frame so the traversal *invariant* is
 * visible rather than merely the node being processed. The frames are emitted as
 * INIT, then one per discovery (EXPAND) and one per settlement (VISIT), ending
 * with EXHAUST.
 *
 * **Deterministic layout.** Node coordinates are assigned by BFS depth with
 * within-level order given by first-visit index. No force simulation and no
 * seeded PRNG: a randomised layout would produce a different picture on each run,
 * which breaks frame determinism (F-07) and makes run-to-run comparison
 * impossible (research R-003).
 */
export function generateBFSTrace(input: GraphInput, source: string): VisualizerStateFrame[] {
  // Tolerate a malformed or empty input shape rather than throwing. The container
  // can hand over an empty text box, and a generator that crashes leaves the
  // learner with a blank panel and no explanation.
  const graph: GraphInput =
    input && Array.isArray(input.nodes) ? input : { nodes: [], edges: [] };
  const rawEdges = Array.isArray(graph.edges) ? graph.edges : [];
  const nodeIds = [...graph.nodes];
  const frames: VisualizerStateFrame[] = [];

  const neighbours = new Map<string, Array<{ to: string; weight?: number }>>();
  for (const id of nodeIds) neighbours.set(id, []);
  for (const e of rawEdges) {
    const [from, to, weight] = e;
    neighbours.get(from)?.push({ to, weight });
    neighbours.get(to)?.push({ to: from, weight });
  }

  // Edge status map, so the canvas can colour traversed edges.
  const edgeStatus = new Map<string, VisualizerStateFrame extends never ? never : 'default' | 'traversed' | 'discarded'>();
  const edgeKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const e of rawEdges) edgeStatus.set(edgeKey(e[0], e[1]), 'default');

  const visited: string[] = [];
  const visitedSet = new Set<string>();
  const frontier: string[] = [];
  const visitOrder: string[] = [];
  const depth = new Map<string, number>();

  // Layered layout, computed once from BFS distance so every frame shares it.
  const layout = new Map<string, { x: number; y: number }>();
  const computeLayout = (): void => {
    const layers: string[][] = [];
    const seen = new Set<string>();
    const start = source && nodeIds.includes(source) ? source : nodeIds[0];
    if (start === undefined) return;
    layers.push([start]);
    seen.add(start);
    for (let i = 0; i < layers.length; i++) {
      const next: string[] = [];
      for (const id of layers[i]) {
        for (const { to } of neighbours.get(id) ?? []) {
          if (!seen.has(to)) {
            seen.add(to);
            next.push(to);
          }
        }
      }
      if (next.length) layers.push(next);
    }
    const orphans = nodeIds.filter((id) => !seen.has(id));
    if (orphans.length) layers.push(orphans);

    const widest = Math.max(...layers.map((l) => l.length));
    layers.forEach((layer, li) => {
      const span = widest * 100;
      const start = (span - layer.length * 100) / 2 + 50;
      layer.forEach((id, xi) => layout.set(id, { x: start + xi * 100, y: 50 + li * 92 }));
    });
  };
  computeLayout();

  const snap = (
    action: VisualizerStateFrame['action_type'],
    description: string,
    rationale: string,
    active: string | null,
  ): void => {
    const state: GraphState = {
      nodes: nodeIds.map((id) => ({
        id,
        label: id,
        x: layout.get(id)?.x ?? 0,
        y: layout.get(id)?.y ?? 0,
        status: visitedSet.has(id) ? ('visited' as const) : ('default' as const),
      })),
      edges: rawEdges.map((e) => ({
        from: e[0],
        to: e[1],
        weight: e.length > 2 ? e[2] : undefined,
        status: edgeStatus.get(edgeKey(e[0], e[1])),
      })),
      frontier: [...frontier],
      visited: [...visited],
      active_node_id: active,
    };
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: action,
      description,
      rationale,
      data_structure_type: 'GRAPH',
      graph_state: state,
    });
  };

  if (nodeIds.length === 0) {
    snap(
      'EXHAUST',
      'Graph has no vertices, so the frontier is empty and the traversal terminates immediately.',
      'Termination here is the O(1) best case: there is nothing to expand, and the empty reachable set is correct without inspecting any edge.',
      null,
    );
    return renumber(collapseTrailingDuplicate(frames));
  }

  const start = source && nodeIds.includes(source) ? source : nodeIds[0];
  frontier.push(start);
  depth.set(start, 0);

  snap(
    'INIT',
    `BFS seeded at ${start}. Frontier holds ${start}; visited is empty.`,
    'Every vertex marked visited must be reachable, so the invariant is established by starting from the source itself, which is reachable by the path of length zero. No other vertex is claimed yet.',
    start,
  );

  while (frontier.length > 0) {
    const current = frontier.shift()!;
    visited.push(current);
    visitedSet.add(current);
    snap(
      'VISIT',
      `Expanded ${current} at distance ${depth.get(current) ?? 0}. Frontier now: ${frontier.length ? frontier.join(', ') : '(empty)'}.`,
      'Removing from the front of a FIFO queue is what makes BFS process vertices in non-decreasing distance order. That is the whole reason a queue and not a stack is used here.',
      current,
    );

    for (const { to } of neighbours.get(current) ?? []) {
      if (visitedSet.has(to) || frontier.includes(to)) {
        // Only narrate the skip when this edge's own status changes. A graph with
        // parallel edges produces two skips for the same pair, and the second
        // would render identically to the first -- a frozen step (contract F-05).
        const k = edgeKey(current, to);
        const before = edgeStatus.get(k);
        if (before === 'discarded') continue;
        edgeStatus.set(k, 'discarded');
        snap(
          'EXPAND',
          `Edge ${current} to ${to} skipped: ${to} is already discovered.`,
          'This is the visited set doing the work that stops the search from looping forever. Without it a cycle would re-enqueue vertices indefinitely, so the skip is a termination guarantee and not just an optimisation.',
          to,
        );
        continue;
      }
      frontier.push(to);
      depth.set(to, (depth.get(current) ?? 0) + 1);
      edgeStatus.set(edgeKey(current, to), 'traversed');
      snap(
        'EXPAND',
        `Discovered ${to} at distance ${(depth.get(current) ?? 0) + 1} and appended it to the frontier.`,
        `${to} was reached along an edge from an already-visited vertex, so a path exists — which is exactly what makes adding it sound. Its distance is one more than the vertex that found it, because the shortest path to it goes through that vertex.`,
        to,
      );
    }
  }

  const unreachable = nodeIds.filter((id) => !visitedSet.has(id));
  snap(
    'EXHAUST',
    unreachable.length
      ? `BFS complete. Visited ${visited.length} of ${nodeIds.length} vertices; ${unreachable.join(', ')} lie in another component and are unreachable from ${start}.`
      : `BFS complete. All ${visited.length} vertices visited in order ${visitOrder.concat(visited).join(', ') || '(none)'}.`,
    unreachable.length
      ? 'The frontier emptied after exhausting every reachable vertex. Because each discovery was justified by a path from the source, an unvisited vertex provably has no such path — so unreachability is proved rather than merely unobserved.'
      : 'The frontier emptied only after every vertex was removed from it, so the visited set is exactly the reachable set. Completeness holds because every vertex is enqueued the moment one of its neighbours is processed.',
    null,
  );

  return renumber(collapseTrailingDuplicate(frames));
}