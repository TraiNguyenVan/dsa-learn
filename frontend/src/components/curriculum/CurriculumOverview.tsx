/**
 * Whole-curriculum overview — spec 007 US5 (FR-020..FR-023).
 *
 * The most direct possible answer to "almost no direct place to do that": one
 * screen listing every topic with its position in the progression and the
 * learner's recorded progress, each one click from its concept & theory lesson.
 *
 * FR-022: a learner with no recorded progress sees this render completely.
 * Topics with nothing recorded show as unstarted, never omitted — a hidden
 * topic is indistinguishable from a missing one.
 */

import React, { useMemo } from 'react';
import { BookOpen, GitBranch, CornerDownLeft, CornerDownRight, RefreshCw, Compass } from 'lucide-react';

import type { CurriculumGraph, GraphNode } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CurriculumOverviewProps {
  graph: CurriculumGraph | null;
  loading?: boolean;
  error?: string | null;
  onNavigate: (topicId: string) => void;
  onRetry?: () => void;
}

interface ProgressCounts {
  completedSections: number;
  totalSections: number;
}

function ProgressBar({ completedSections: done, totalSections: total }: ProgressCounts) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-slate-500 shrink-0">
        {total === 0 ? 'no lesson' : `${done}/${total}`}
      </span>
    </div>
  );
}

export const CurriculumOverview: React.FC<CurriculumOverviewProps> = ({
  graph,
  loading = false,
  error = null,
  onNavigate,
  onRetry,
}) => {
  /**
   * Section counts are not in the graph payload — the graph is about
   * relationships, not lesson content. Fetching all 16 lessons up front to fill
   * this in would work against SC-013's 2-second cold-load budget, so a topic
   * whose lesson has not been loaded shows exercise progress instead of
   * inventing a lesson percentage.
   */
  const sectionCounts = useMemo(() => new Map<string, ProgressCounts>(), []);

  const nodes: GraphNode[] = graph?.nodes ?? [];

  return (
    <div className="h-full flex flex-col bg-[#0F172A] text-slate-200">
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              The Whole Curriculum
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
              Sixteen topics connected by what each one builds on. Open any topic's
              concept &amp; theory lesson directly — nothing here needs an exercise in
              progress first.
            </p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 px-2.5 py-1.5 rounded border border-slate-700 hover:border-emerald-500/40 transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Retry
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 border border-amber-700/50 bg-amber-950/30 rounded-lg px-4 py-3">
          <p className="text-xs text-amber-200/80">
            The curriculum overview could not be loaded. Individual topics remain
            reachable from the lesson you are reading.
          </p>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="px-6 py-4 space-y-2">
          {loading && nodes.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-8 justify-center">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Loading curriculum…
            </div>
          )}

          {nodes.map((node) => {
            const prereqs = graph?.prerequisites_by_topic?.[node.id] ?? [];
            const dependents = graph?.dependents_by_topic?.[node.id] ?? [];
            const counts = sectionCounts.get(node.id);
            const isIsolated = prereqs.length === 0 && dependents.length === 0;

            return (
              <button
                key={node.id}
                onClick={() => onNavigate(node.id)}
                className="group w-full text-left px-4 py-3 rounded-lg border border-slate-800 bg-slate-900/40 hover:border-emerald-500/40 hover:bg-slate-900/70 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-mono text-slate-600 shrink-0 mt-1 w-6">
                    {String(node.display_order ?? '—').padStart(2, '0')}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors">
                        {node.title}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                        <CornerDownLeft className="w-3 h-3" />
                        {prereqs.length}
                        <CornerDownRight className="w-3 h-3 ml-1" />
                        {dependents.length}
                      </span>
                      {isIsolated && (
                        <span className="text-[10px] font-mono uppercase tracking-wide text-slate-600 border border-slate-700 rounded px-1.5 py-0.5">
                          no links yet
                        </span>
                      )}
                    </span>

                    {node.description && (
                      <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                        {node.description}
                      </span>
                    )}

                    <span className="flex items-center gap-4 mt-2 flex-wrap">
                      {counts ? (
                        <ProgressBar
                          completedSections={counts.completedSections}
                          totalSections={counts.totalSections}
                        />
                      ) : (
                        <span className="text-[10px] font-mono text-slate-600">
                          lesson not opened yet
                        </span>
                      )}
                      {node.exercise_count > 0 && (
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {node.completed_count}/{node.exercise_count} exercises
                        </span>
                      )}
                      {node.exercise_count === 0 && (
                        <span className="text-[10px] font-mono text-slate-600">
                          no exercises yet
                        </span>
                      )}
                    </span>
                  </span>

                  <GitBranch className="w-4 h-4 text-slate-700 group-hover:text-emerald-400 shrink-0 mt-1 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};