/**
 * Neighbour suggestions for the current topic — spec 007 US4, FR-017.
 *
 * The prerequisite graph only answers "what must I know first". Learners
 * routinely want "what else covers this", and until now the only discovery
 * surface was a list of problems.
 *
 * FR-017 requires the reason be shown: an unexplained suggestion is
 * indistinguishable from noise. R-002 makes the reason concrete — a sibling
 * names the shared prerequisites it has in common.
 *
 * FR-019: the server caps this at five, so the block stays a suggestion rather
 * than becoming a second navigation menu that buries the lesson.
 */

import React from 'react';
import { Sparkles, Users } from 'lucide-react';

import type { NeighbourSuggestion } from '@/lib/types';

interface TopicNeighboursProps {
  neighbours: NeighbourSuggestion[];
  onNavigate: (topicId: string) => void;
}

const REASON_LABEL: Record<NeighbourSuggestion['reason'], string> = {
  'shared-prerequisite': 'builds on the same foundations',
  'adjacent-in-order': 'next in the learning order',
};

export const TopicNeighbours: React.FC<TopicNeighboursProps> = ({ neighbours, onNavigate }) => {
  if (neighbours.length === 0) return null;

  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
      <h3 className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        Related topics
      </h3>
      <p className="text-xs text-slate-500 mb-3">Not required first — offered because they sit nearby.</p>

      <div className="space-y-1.5">
        {neighbours.map((s) => (
          <button
            key={s.node.id}
            onClick={() => onNavigate(s.node.id)}
            className="group w-full text-left flex items-start gap-2 px-3 py-2 rounded border border-slate-800 bg-slate-950/50 hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-violet-500/60 mt-0.5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-200 group-hover:text-violet-300 transition-colors">
                {s.node.title}
              </span>
              {/* FR-017: the reason, not just the topic. */}
              <span className="block text-[11px] text-slate-500 mt-0.5">
                {REASON_LABEL[s.reason]}
                {s.shared_prerequisite_titles.length > 0 && (
                  <span className="text-slate-600">
                    {' '}
                    — both use {s.shared_prerequisite_titles.join(' and ')}
                  </span>
                )}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};