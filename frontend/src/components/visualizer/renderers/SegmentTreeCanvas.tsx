import React from 'react';
import { GraphNodeState } from '@/lib/types';

interface SegmentTreeCanvasProps {
  /**
   * Complete binary tree laid out deterministically by node position.
   *
   * Typed against `GraphNodeState` rather than a narrower local shape: a segment
   * tree reuses the GRAPH state shape, so the status union it receives is the
   * full one. Narrowing it here is what would force the caller to cast.
   */
  nodes: GraphNodeState[];
  /** Query range currently highlighted, if any. */
  range?: [number, number] | null;
}

/**
 * Deterministic array-backed layout: position in the node array fixes the
 * coordinates, so the same tree always draws identically.
 *
 * The layout is by heap position rather than by traversal order, which means a
 * node's coordinates are a pure function of its index. A layout driven by
 * insertion history or by a force simulation would move nodes between frames and
 * make the animation harder to follow — and, with a force simulation, would make
 * it differ between runs.
 */
export const SegmentTreeCanvas: React.FC<SegmentTreeCanvasProps> = ({ nodes, range }) => {
  if (nodes.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-1">
        <span className="text-slate-400">Segment tree is empty</span>
        <span>No nodes, so every query over it is trivially the empty range.</span>
      </div>
    );
  }

  const NODE_W = 96;
  const NODE_H = 34;
  const LEVEL_GAP = 56;
  const X_GAP = 28;
  const MARGIN = 70;
  const MARGIN_Y = 34;

  // Group by level, preserving array order within a level.
  const levels: number[][] = [];
  nodes.forEach((_, i) => {
    const level = Math.floor(Math.log2(i + 1));
    (levels[level] ??= []).push(i);
  });

  const coords = new Map<string, { x: number; y: number }>();
  levels.forEach((idxs, li) => {
    idxs.forEach((nodeIdx, xi) => {
      const levelSpan = levels[li].length;
      const full = levelSpan * NODE_W + (levelSpan - 1) * X_GAP;
      const total = levels[0].length * NODE_W + (levels[0].length - 1) * X_GAP;
      const x = (total - full) / 2 + xi * (NODE_W + X_GAP) + NODE_W / 2 + MARGIN - 30;
      coords.set(nodes[nodeIdx].id, { x, y: MARGIN_Y + li * LEVEL_GAP });
    });
  });

  const minX = Math.min(...Array.from(coords.values(), (c) => c.x)) - NODE_W;
  const maxX = Math.max(...Array.from(coords.values(), (c) => c.x)) + NODE_W;
  const minY = MARGIN_Y - LEVEL_GAP;
  const maxY = MARGIN_Y + levels.length * LEVEL_GAP;
  const width = maxX - minX;
  const height = maxY - minY;

  const fill = (status?: string): { bg: string; stroke: string } => {
    switch (status) {
      case 'active':
        return { bg: 'rgba(251, 191, 36, 0.22)', stroke: '#FBBF24' };
      case 'covered':
        return { bg: 'rgba(16, 185, 129, 0.18)', stroke: '#10B981' };
      case 'partial':
        return { bg: 'rgba(34, 211, 238, 0.14)', stroke: '#22D3EE' };
      case 'excluded':
        return { bg: '#0F172A', stroke: '#1E293B' };
      default:
        return { bg: '#0F172A', stroke: '#334155' };
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 gap-2 overflow-x-auto">
      <svg width={width} height={height} viewBox={`${minX} ${minY} ${width} ${height}`} className="select-none">
        {/* Edges from heap-position parent to children. */}
        {nodes.map((_, i) => {
          const left = 2 * i + 1;
          const right = 2 * i + 2;
          const a = coords.get(nodes[i].id);
          if (!a) return null;
          return (
            <React.Fragment key={`e_${i}`}>
              {left < nodes.length && coords.get(nodes[left].id) && (
                <line
                  x1={a.x}
                  y1={a.y + NODE_H / 2}
                  x2={coords.get(nodes[left].id)!.x}
                  y2={coords.get(nodes[left].id)!.y - NODE_H / 2}
                  stroke="#334155"
                  strokeWidth={1.5}
                />
              )}
              {right < nodes.length && coords.get(nodes[right].id) && (
                <line
                  x1={a.x}
                  y1={a.y + NODE_H / 2}
                  x2={coords.get(nodes[right].id)!.x}
                  y2={coords.get(nodes[right].id)!.y - NODE_H / 2}
                  stroke="#334155"
                  strokeWidth={1.5}
                />
              )}
            </React.Fragment>
          );
        })}

        {nodes.map((n) => {
          const c = coords.get(n.id)!;
          const s = fill(n.status);
          const inRange =
            range && n.label ? n.label.includes(`[${range[0]},${range[1]}]`) : false;
          return (
            <g key={n.id}>
              <rect
                x={c.x - NODE_W / 2}
                y={c.y - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={5}
                fill={s.bg}
                stroke={inRange ? '#F472B6' : s.stroke}
                strokeWidth={inRange ? 2.5 : 1.5}
                strokeDasharray={n.status === 'excluded' ? '3 3' : undefined}
              />
              <text
                x={c.x}
                y={c.y + 4}
                textAnchor="middle"
                fill={n.status === 'excluded' ? '#475569' : '#F8FAFC'}
                className="text-[10px] font-mono"
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center justify-center gap-x-4 text-[10px] font-mono text-slate-500">
        <span className="text-amber-300">active</span>
        <span className="text-emerald-400">fully covered by the query</span>
        <span className="text-cyan-300">partially covered</span>
        <span className="text-rose-300">range node</span>
        <span>
          {nodes.length} nodes, {levels.length} levels — position fixes the layout
        </span>
        {range && <span>query [{range[0]}, {range[1]}]</span>}
      </div>
    </div>
  );
};