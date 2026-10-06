import React from 'react';
import { ActionType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Info, CheckCircle2, ArrowRightLeft, Plus, Trash2, Search,
  GitBranch, CornerDownRight, Undo2, Ban, PenLine, CircleSlash, Layers,
} from 'lucide-react';

interface StepNarrativeProps {
  actionType: ActionType;
  description: string;
  /**
   * Why this step follows (spec 006, FR-009). Rendered distinctly from
   * `description` because the requirement is that the learner is told the
   * reasoning, not merely shown what changed. A `rationale` that restates
   * `description` still fails contract invariant F-04 at review.
   */
  rationale: string;
  stepIndex: number;
  totalSteps: number;
}

function getActionBadge(type: ActionType) {
  switch (type) {
    case 'COMPARE':
      return { label: 'Comparing', icon: Search, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    case 'POINTER_MOVE':
      return { label: 'Pointer Shift', icon: ArrowRightLeft, color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' };
    case 'INSERT':
      return { label: 'Insertion', icon: Plus, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    case 'REMOVE':
      return { label: 'Deletion', icon: Trash2, color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    case 'SWAP':
      return { label: 'Swap', icon: ArrowRightLeft, color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    case 'HIGHLIGHT':
      return { label: 'Target Found', icon: CheckCircle2, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    case 'EXPAND':
      return { label: 'Frontier Expands', icon: GitBranch, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    case 'VISIT':
      return { label: 'Visit', icon: CornerDownRight, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    case 'RECURSE':
      return { label: 'Recurse', icon: Layers, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    case 'BACKTRACK':
      return { label: 'Backtrack', icon: Undo2, color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
    case 'PRUNE':
      return { label: 'Pruned', icon: Ban, color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    case 'WRITE':
      return { label: 'State Written', icon: PenLine, color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
    case 'EXHAUST':
      return { label: 'Exhausted', icon: CircleSlash, color: 'bg-slate-700/30 text-slate-300 border-slate-600/30' };
    default:
      return { label: 'Operation', icon: Info, color: 'bg-slate-700/30 text-slate-300 border-slate-600/30' };
  }
}

export const StepNarrative: React.FC<StepNarrativeProps> = ({
  actionType,
  description,
  rationale,
  stepIndex,
  totalSteps,
}) => {
  const badge = getActionBadge(actionType);
  const Icon = badge.icon;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex items-start space-x-3 shadow-sm">
      <div className="p-1 rounded bg-slate-800 shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-emerald-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1.5">
          <Badge variant="outline" className={`text-[10px] font-mono py-0 px-1.5 ${badge.color}`}>
            {badge.label}
          </Badge>
          <span className="text-[11px] font-mono text-slate-500">
            Frame {stepIndex + 1} of {totalSteps}
          </span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed font-sans">{description}</p>
        {rationale && (
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans mt-1.5 pt-1.5 border-t border-slate-800/70">
            <span className="font-mono text-slate-500 uppercase tracking-wide text-[10px] mr-1.5">
              Why
            </span>
            {rationale}
          </p>
        )}
      </div>
    </div>
  );
};
