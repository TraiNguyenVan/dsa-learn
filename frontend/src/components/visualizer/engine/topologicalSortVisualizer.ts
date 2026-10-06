import { VisualizerStateFrame, GraphState } from '@/lib/types';

export interface DirectedGraphInput {
  nodes: string[];
  edges: Array<[string, string] | [string, string, number]>;
}

/**
 * Topological-sort generator (spec 006, T091).
 *
 * Kahn's algorithm: repeatedly emit a vertex whose in-degree within the remaining
 * graph is zero. The interesting content is the failure case — when no zero-in-degree
 * vertex remains while vertices do, the graph contains a cycle and no topological
 * order exists. That is a correct and useful answer, not an error, so it gets its
 * own terminal frame rather than a silent stop.
 *
 * Layout is deterministic: nodes sit on a fixed row in declaration order and edges
 * are drawn above them, so nothing jumps between frames.
 */
export function generateTopologicalSortTrace(input: DirectedGraphInput): VisualizerStateFrame[] {
  const graph: DirectedGraphInput =
    input && Array.isArray(input.nodes) ? input : { nodes: [], edges: [] };
  const nodeIds = [...graph.nodes];
  const rawEdges = (Array.isArray(graph.edges) ? graph.edges : []).filter(
    (e) => nodeIds.includes(e[0]) && nodeIds.includes(e[1]),
  );

  const frames: VisualizerStateFrame[] = [];
  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const id of nodeIds) {
    inDegree.set(id, 0);
    outgoing.set(id, []);
  }
  // Duplicates are kept: a parallel edge raises in-degree twice and is decremented
  // twice, so the algorithm stays correct. Dropping them silently would change the
  // counts the animation is teaching.
  for (const e of rawEdges) {
    outgoing.get(e[0])!.push(e[1]);
    inDegree.set(e[1], (inDegree.get(e[1]) ?? 0) + 1);
  }

  const emitted: string[] = [];
  const status = new Map<string, GraphState['nodes'][number]['status']>();
  const ready: string[] = [];
  const layout = new Map<string, { x: number; y: number }>();
  nodeIds.forEach((id, i) => layout.set(id, { x: 70 + i * 120, y: 200 }));

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
        nodes: nodeIds.map((id) => ({
          id,
          label: id,
          x: layout.get(id)?.x ?? 0,
          y: layout.get(id)?.y ?? 0,
          status: status.get(id) ?? 'default',
        })),
        edges: rawEdges.map((e) => ({
          from: e[0],
          to: e[1],
          weight: e.length > 2 ? e[2] : undefined,
          status: emitted.includes(e[1]) ? 'traversed' : 'default',
        })),
        frontier: [...ready],
        visited: [...emitted],
        active_node_id: active,
      },
    });
  };

  if (nodeIds.length === 0) {
    // One frame, not two. With no vertices there is nothing to mark, so an opening
    // frame and a closing frame would render identically (F-05) and the learner
    // would see a frozen canvas at the very point the answer is given.
    snap(
      'EXHAUST',
      'Graph has no vertices, so the topological order is empty and no cycle can exist.',
      'The empty graph is trivially acyclic and its topological order is the empty sequence. Completeness holds because every vertex is emitted exactly when its in-degree reaches zero, and with no vertices nothing can remain unemitted.',
    );
    return finalize(frames);
  }

  for (const id of nodeIds) if ((inDegree.get(id) ?? 0) === 0) ready.push(id);

  // Mark the eligible set in the opening frame. Without this the first VISIT on a
  // graph whose source already has in-degree 0 highlights the same nodes and the
  // two frames render identically (F-05), which reads as a stalled animation.
  for (const id of ready) status.set(id, 'frontier');

  snap(
    'INIT',
    `${nodeIds.length} vertices, ${rawEdges.length} edges. Zero in-degree: ${ready.length ? ready.join(', ') : '(none)'}.`,
    'A vertex may be emitted only once every predecessor has been, which is exactly the condition that its in-degree is zero. Emitting it then guarantees all its successors see one fewer unprocessed predecessor.',
    ready[0] ?? null,
  );

  while (ready.length > 0) {
    const v = ready.shift()!;
    emitted.push(v);
    status.set(v, 'visited');

    const released: string[] = [];
    for (const w of outgoing.get(v) ?? []) {
      const d = (inDegree.get(w) ?? 1) - 1;
      inDegree.set(w, d);
      if (d === 0) released.push(w);
    }

    snap(
      'VISIT',
      `Emitted ${v}. It had in-degree 0, so all of its predecessors are already emitted. Remaining: ${nodeIds.length - emitted.length} vertex${nodeIds.length - emitted.length === 1 ? '' : 'es'}.`,
      'The emitted sequence is a topological order because every edge from u to v forces u to be emitted before v: v cannot reach in-degree zero while u is still unprocessed. That is the whole correctness argument, and it is why the order is valid the moment it is emitted rather than only at the end.',
      v,
    );

    for (const w of released) {
      status.set(w, 'frontier');
      snap(
        'EXPAND',
        `${w} reached in-degree 0, so it becomes eligible.`,
        `Every predecessor of ${w} has now been emitted, so nothing left can precede it. That is precisely the moment it becomes safe to schedule, and queueing it here is what keeps the algorithm linear rather than requiring a rescan for the next candidate.`,
        w,
      );
    }
  }

  const remaining = nodeIds.filter((id) => !emitted.includes(id));
  if (remaining.length > 0) {
    // Mark the stuck vertices. On a fully cyclic graph nothing was ever eligible,
    // so without this the failure frame renders exactly as the opening frame did
    // (F-05) and the learner sees no change at the point the algorithm gives up.
    for (const id of remaining) status.set(id, 'exhausted');
    snap(
      'EXHAUST',
      `Stuck: ${remaining.join(', ')} all have in-degree at least 1 within the remaining graph, so no topological order exists.`,
      `Following an incoming edge backwards from any remaining vertex must eventually revisit one, because the graph is finite — and a revisit on a backward path is a cycle. So the failure is not a limitation of this algorithm, it is a proof that the graph is cyclic.`,
    );
  } else {
    snap(
      'EXHAUST',
      `Topological order complete: ${emitted.join(' -> ')}.`,
      'Every vertex was emitted, so the output is a valid topological order by the in-degree argument. Note the order is not unique: any sequence satisfying the edge constraints would do, which is why the queue order is an implementation detail rather than part of the answer.',
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