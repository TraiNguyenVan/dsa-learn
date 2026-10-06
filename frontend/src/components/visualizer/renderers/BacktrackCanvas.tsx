import React from 'react';
import { BacktrackState } from '@/lib/types';

interface BacktrackCanvasProps {
  state: BacktrackState;
}

/**
 * Three distinct visual roles, because a backtracking frame is about the
 * *history* of the search rather than the current state alone:
 *
 *   - `path`     — the current recursion path, root first. Drawn largest.
 *   - `explored` — nodes whose subtree is fully finished. Muted.
 *   - `pruned`   — nodes abandoned, each labelled with the reason. Drawn with a
 *                  strike and the reason attached, because *why* a branch died is
 *                  the single most useful thing this animation can communicate.
 */
export const BacktrackCanvas: React.FC<BacktrackCanvasProps> = ({ state }) => {
  const path = state.path ?? [];
  const explored = state.explored ?? [];
  const pruned = state.pruned ?? [];

  if (path.length === 0 && explored.length === 0 && pruned.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-1">
        <span className="text-slate-400">Search has not started</span>
        <span>The path is empty at the root, so no decision has been made yet.</span>
      </div>
    );
  }

  const reasonFor = new Map(pruned.map((p) => [p.node, p.reason]));

  return (
    <div className="w-full flex flex-col items-center justify-start p-4 gap-4 overflow-x-auto">
      {/* Current recursion path. */}
      <div className="w-full max-w-3xl">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">
          current path (depth {path.length - 1})
        </div>
        <div className="flex items-center flex-wrap gap-1">
          {path.map((node, i) => {
            const isLeafNode = i === path.length - 1;
            return (
              <React.Fragment key={`path_${i}`}>
                {i > 0 && <span className="text-slate-600 font-mono text-xs">→</span>}
                <span
                  className={`px-2.5 py-1 rounded font-mono text-xs border transition-all duration-200 ${
                    isLeafNode
                      ? 'border-amber-400 bg-amber-500/20 text-amber-100 font-bold'
                      : 'border-indigo-600/70 bg-indigo-500/10 text-indigo-200'
                  }`}
                >
                  {node}
                </span>
              </React.Fragment>
            );
          })}
          {path.length === 1 && (
            <span className="text-[10px] font-mono text-slate-600 ml-2">
              at the root, about to choose a first move
            </span>
          )}
        </div>
      </div>

      {/* Finished subtrees. */}
      {explored.length > 0 && (
        <div className="w-full max-w-3xl">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">
            fully explored ({explored.length})
          </div>
          <div className="flex items-center flex-wrap gap-1.5">
            {explored.map((node) => (
              <span
                key={`explored_${node}`}
                className="px-2 py-0.5 rounded font-mono text-[11px] border border-slate-700 bg-slate-900 text-slate-400"
              >
                {node}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pruned branches, each with its reason. */}
      {pruned.length > 0 && (
        <div className="w-full max-w-3xl">
          <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400/80 mb-2">
            pruned ({pruned.length})
          </div>
          <div className="flex flex-col gap-1.5">
            {pruned.map((p) => (
              <div key={`pruned_${p.node}`} className="flex items-start gap-2">
                <span className="px-2 py-0.5 rounded font-mono text-[11px] border border-rose-800 bg-rose-950/40 text-rose-300 line-through">
                  {p.node}
                </span>
                <span className="text-[11px] font-mono text-slate-400 leading-snug pt-0.5">
                  <span className="text-rose-400/80 uppercase tracking-wide text-[9px] mr-1">
                    why
                  </span>
                  {p.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counters make the search's shape legible at a glance. */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 text-[10px] font-mono text-slate-500">
        <span>depth {path.length - 1}</span>
        <span>{explored.length} explored</span>
        <span>{pruned.length} pruned</span>
        <span>
          {reasonFor.size} distinct prune reasons
        </span>
      </div>
    </div>
  );
};