/**
 * Prerequisite ("Builds on") block for a concept & theory lesson — spec 007 US1.
 *
 * FR-001 is the reason this component exists. The lesson previously rendered
 * each prerequisite as a de-slugified id — `linked lists` — which is neither the
 * topic's real name nor clickable. Every entry here uses `node.title`, and a
 * consumer MUST NOT synthesise a label from `id`.
 *
 * FR-004: when a topic declares no prerequisites the whole block is omitted
 * rather than rendered empty.
 *
 * FR-007 / R-009: an unresolved reference is shown as visibly unavailable and
 * inert. It is never hidden, and never replaced with a placeholder topic.
 */

import React from 'react';
import { ArrowRight, BookOpen, AlertTriangle } from 'lucide-react';

import type { GraphNode, UnresolvedReference } from '@/lib/types';

interface PrerequisiteLinksProps {
  prerequisites: GraphNode[];
  /** FR-007: declared prerequisites naming topics that do not exist. */
  unresolved?: UnresolvedReference[];
  onNavigate: (topicId: string) => void;
}

export const PrerequisiteLinks: React.FC<PrerequisiteLinksProps> = ({
  prerequisites,
  unresolved = [],
  onNavigate,
}) => {
  // FR-004: no block at all when there is nothing to build on. An empty
  // heading reads as a missing feature rather than a deliberate absence.
  if (prerequisites.length === 0) return null;

  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/50">
      <h3 className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5" />
        Builds on
      </h3>

      <div className="flex flex-wrap gap-2">
        {prerequisites.map((node) => (
          <button
            key={node.id}
            onClick={() => onNavigate(node.id)}
            title={node.description || node.title}
            className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-700 bg-slate-800/60 text-slate-300 text-xs font-medium hover:border-emerald-500/50 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
          >
            <span>{node.title}</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}

        {/* FR-007: report, do not hide. Naming the broken reference tells the
            curriculum author exactly what to fix. */}
        {unresolved.map((ref) => (
          <span
            key={`${ref.referenced_by}->${ref.referenced_id}`}
            title={`Declared prerequisite "${ref.referenced_id}" does not exist in the curriculum`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-amber-800/50 bg-amber-950/30 text-amber-300/70 text-xs font-mono cursor-not-allowed"
          >
            <AlertTriangle className="w-3 h-3" />
            <span className="line-through">{ref.referenced_id}</span>
            <span className="text-[10px] uppercase tracking-wide">unavailable</span>
          </span>
        ))}
      </div>
    </div>
  );
};