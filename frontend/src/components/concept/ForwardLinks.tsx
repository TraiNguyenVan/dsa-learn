/**
 * Forward-link block: the topics that build on the current one — spec 007 US2.
 *
 * The prerequisite graph only teaches one direction at a time, which teaches as
 * badly as no path at all. This is the other half: after finishing a topic, the
 * learner can see what they unlocked and what to learn next.
 *
 * FR-003: this block is deliberately styled opposite to `PrerequisiteLinks` so
 * the two directions can never be confused.
 *
 * FR-005: a topic nothing builds on is a leaf. It says so plainly and shows no
 * list — an empty heading reads as a bug, and inventing neighbours here would
 * duplicate the neighbour block's job.
 *
 * That leaf statement is only truthful when the graph actually arrived. When it
 * did not, this block renders nothing at all — see `graphAvailable` below.
 */

import React from 'react';
import { Compass, CornerDownRight, GitBranch } from 'lucide-react';

import type { GraphNode } from '@/lib/types';

interface ForwardLinksProps {
  dependents: GraphNode[];
  onNavigate: (topicId: string) => void;
  /**
   * Whether the graph actually arrived.
   *
   * An empty `dependents` list means two very different things, and conflating
   * them is a lie. If the graph loaded and found no dependents, this topic is a
   * leaf and FR-005 says so. If the graph never loaded, we do not know that —
   * the learner would be told "no other topic builds on this one" purely because
   * a request failed, which is both unsupported and discourages exactly the
   * exploration this block exists to enable.
   *
   * `navigation-graph-contract.md` "Advisory fetch" requires all three navigation
   * blocks to render nothing on failure. Defaults to `true` so an omitted prop
   * keeps the original leaf-statement behaviour.
   */
  graphAvailable?: boolean;
}

export const ForwardLinks: React.FC<ForwardLinksProps> = ({
  dependents,
  onNavigate,
  graphAvailable = true,
}) => {
  // Nothing to say: either the graph failed, or it loaded and this topic is a
  // leaf. Both render nothing here — the leaf case gets its own copy below,
  // because "we know nothing builds on this" deserves an explanation.
  if (dependents.length === 0 && !graphAvailable) return null;

  if (dependents.length === 0) {
    // FR-005: honest about being a leaf rather than showing an empty list.
    return (
      <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
        <h3 className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5" />
          Where this leads
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          No other topic in the curriculum builds on this one yet — it is a
          starting point, or an endpoint in the current progression.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
      <h3 className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1.5">
        <GitBranch className="w-3.5 h-3.5" />
        Where this leads
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        {dependents.length === 1
          ? 'One topic builds on this one.'
          : `${dependents.length} topics build on this one.`}
      </p>

      <div className="space-y-1.5">
        {dependents.map((node) => (
          <button
            key={node.id}
            onClick={() => onNavigate(node.id)}
            className="group w-full text-left flex items-start gap-2 px-3 py-2 rounded border border-slate-800 bg-slate-950/50 hover:border-sky-500/40 hover:bg-sky-500/5 transition-colors"
          >
            <CornerDownRight className="w-3.5 h-3.5 text-sky-500/60 mt-0.5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors">
                  {node.title}
                </span>
                {node.exercise_count > 0 && (
                  <span className="text-[10px] font-mono text-slate-500">
                    {node.completed_count}/{node.exercise_count} exercises
                  </span>
                )}
              </span>
              {node.description && (
                <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {node.description}
                </span>
              )}
            </span>
            <Compass className="w-3.5 h-3.5 text-slate-600 group-hover:text-sky-400 shrink-0 mt-0.5 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};