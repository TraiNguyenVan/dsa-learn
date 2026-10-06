import React from 'react';
import { GraphState } from '@/lib/types';

interface GraphCanvasProps {
  graph: GraphState;
}

const NODE_RADIUS = 20;
const LEVEL_GAP = 92;
const NODE_GAP = 92;

/**
 * Deterministic layered layout.
 *
 * Nodes are placed in layers by BFS depth from the active node, and within a
 * layer ordered by first-visit index. There is no force simulation and no seeded
 * PRNG: a force layout is randomised by nature, and a randomised layout would
 * make the same input produce different pictures on different runs, breaking the
 * determinism requirement (F-07) and making it impossible for a learner to
 * compare two runs of the same traversal.
 *
 * `x` and `y` supplied by the generator are used when present. The fallback below
 * reproduces the same layering rule from the node list, so the renderer degrades
 * gracefully rather than collapsing every node onto the origin.
 */
export const GraphCanvas: React.FC<GraphCanvasProps> = ({ graph }) => {
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];
  const visited = new Set(graph.visited ?? []);
  const frontier = new Set(graph.frontier ?? []);

  if (nodes.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-1">
        <span className="text-slate-400">Graph is empty</span>
        <span>No vertices, so the frontier is empty and the traversal terminates at once.</span>
      </div>
    );
  }

  // Fallback layout: layer by BFS distance from the active node (or the first
  // node), ordering within a layer by first-visit index.
  const hasCoords = nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y));
  let coords = new Map<string, { x: number; y: number }>();

  if (!hasCoords) {
    const adjacency = new Map<string, string[]>();
    for (const n of nodes) adjacency.set(n.id, []);
    for (const e of edges) {
      adjacency.get(e.from)?.push(e.to);
      if (adjacency.get(e.to) && !adjacency.get(e.from)!.includes(e.to)) {
        adjacency.get(e.to)!.push(e.from);
      }
    }

    const rootId = graph.active_node_id ?? nodes[0].id;
    const layers: string[][] = [[rootId]];
    const depth = new Map<string, number>([[rootId, 0]]);
    for (let i = 0; i < layers.length; i++) {
      const next: string[] = [];
      for (const id of layers[i]) {
        for (const nb of adjacency.get(id) ?? []) {
          if (!depth.has(nb)) {
            depth.set(nb, i + 1);
            next.push(nb);
          }
        }
      }
      if (next.length) layers.push(next);
    }
    // Any node still unplaced is disconnected from the root; give it its own row.
    const orphans = nodes.map((n) => n.id).filter((id) => !depth.has(id));
    if (orphans.length) layers.push(orphans);

    const maxWidth = Math.max(...layers.map((l) => l.length));
    const width = maxWidth * NODE_GAP;
    layers.forEach((layer, li) => {
      const offset = (width - layer.length * NODE_GAP) / 2 + NODE_GAP / 2;
      layer.forEach((id, xi) => {
        coords.set(id, { x: offset + xi * NODE_GAP, y: 50 + li * LEVEL_GAP });
      });
    });
  } else {
    for (const n of nodes) coords.set(n.id, { x: n.x, y: n.y });
  }

  const bounds = nodes.map((n) => coords.get(n.id)!);
  const minX = Math.min(...bounds.map((c) => c.x)) - 50;
  const maxX = Math.max(...bounds.map((c) => c.x)) + 50;
  const minY = Math.min(...bounds.map((c) => c.y)) - 50;
  const maxY = Math.max(...bounds.map((c) => c.y)) + 50;

  const style = (n: (typeof nodes)[number]) => {
    if (n.id === graph.active_node_id) {
      return { fill: 'rgba(251, 191, 36, 0.22)', stroke: '#FBBF24', width: 2.5 };
    }
    if (frontier.has(n.id)) {
      return { fill: 'rgba(34, 211, 238, 0.18)', stroke: '#22D3EE', width: 2 };
    }
    if (visited.has(n.id) || n.status === 'visited') {
      return { fill: 'rgba(16, 185, 129, 0.14)', stroke: '#10B981', width: 2 };
    }
    if (n.status === 'exhausted') {
      return { fill: '#0F172A', stroke: '#475569', width: 1.5, dashed: true };
    }
    return { fill: '#0F172A', stroke: '#334155', width: 1.5 };
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 gap-2">
      <svg
        width={maxX - minX}
        height={maxY - minY}
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        className="select-none max-w-full"
      >
        {/* Edges first so nodes paint over the endpoints. */}
        {edges.map((e, i) => {
          const a = coords.get(e.from);
          const b = coords.get(e.to);
          if (!a || !b) return null;
          const traversed = e.status === 'traversed';
          return (
            <g key={`edge_${i}`}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={traversed ? '#10B981' : e.status === 'discarded' ? '#7F1D1D' : '#334155'}
                strokeWidth={traversed ? 2.5 : 1.5}
                strokeDasharray={e.status === 'discarded' ? '4 4' : undefined}
              />
              {e.weight !== undefined && (
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 5}
                  textAnchor="middle"
                  fill="#64748B"
                  className="text-[10px] font-mono"
                >
                  {e.weight}
                </text>
              )}
            </g>
          );
        })}

        {nodes.map((n) => {
          const c = coords.get(n.id)!;
          const s = style(n);
          return (
            <g key={`node_${n.id}`} className="transition-all duration-300">
              <circle
                cx={c.x}
                cy={c.y}
                r={NODE_RADIUS}
                fill={s.fill}
                stroke={s.stroke}
                strokeWidth={s.width}
                strokeDasharray={'dashed' in s && s.dashed ? '3 3' : undefined}
              />
              <text
                x={c.x}
                y={c.y + 4}
                textAnchor="middle"
                fill="#F8FAFC"
                className="text-xs font-bold font-mono"
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500">
        <span>
          frontier {graph.frontier.length ? `(${graph.frontier.join(', ')})` : '(empty)'}
        </span>
        <span>
          visited {graph.visited.length ? `(${graph.visited.join(', ')})` : '(empty)'}
        </span>
        <span>
          {nodes.length} vertices, {edges.length} edges
        </span>
        <span>deterministic layered layout</span>
      </div>
    </div>
  );
};