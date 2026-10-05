import React, { useState } from 'react';
import {
  Sparkles,
  Target,
  ShieldCheck,
  AlertTriangle,
  Code2,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { PatternBlueprint } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PatternBlueprintViewerProps {
  patterns: PatternBlueprint[];
  selectedPatternId?: string | null;
  onSelectExercise?: (exerciseId: string) => void;
}

export const PatternBlueprintViewer: React.FC<PatternBlueprintViewerProps> = ({
  patterns,
  selectedPatternId,
  onSelectExercise,
}) => {
  const [activeId, setActiveId] = useState<string>(
    selectedPatternId || (patterns.length > 0 ? patterns[0].id : '')
  );
  const [copied, setCopied] = useState(false);

  const activePattern = patterns.find((p) => p.id === activeId) || patterns[0];

  const handleCopy = () => {
    if (!activePattern?.code_template_cpp) return;
    navigator.clipboard.writeText(activePattern.code_template_cpp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activePattern) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        No algorithmic patterns found.
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden bg-[#0F172A]">
      {/* Pattern Selector Sidebar */}
      <div className="w-72 shrink-0 border-r border-slate-800 bg-[#121A2B] flex flex-col">
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2 text-white font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pattern Blueprints ({patterns.length})</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Algorithmic templates, invariant rules, and trigger cues
          </p>
        </div>

        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {patterns.map((pattern) => {
              const isSelected = pattern.id === activePattern.id;
              return (
                <button
                  key={pattern.id}
                  onClick={() => setActiveId(pattern.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-xs transition-colors flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-emerald-400 font-medium border-l-2 border-emerald-500'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="truncate">
                    <div className="truncate text-white font-medium group-hover:text-emerald-300">
                      {pattern.title}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {pattern.topic_ids.join(', ')}
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-slate-600'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Main Pattern Detail Content */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-4xl space-y-6">
          {/* Header */}
          <div className="border-b border-slate-800 pb-5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {activePattern.topic_ids.map((topic) => (
                <Badge
                  key={topic}
                  variant="outline"
                  className="text-[11px] font-mono border-slate-700 bg-slate-900/60 text-slate-300"
                >
                  {topic}
                </Badge>
              ))}
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">{activePattern.title}</h1>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">{activePattern.summary}</p>
          </div>

          {/* Trigger Cues */}
          <div className="rounded-lg border border-slate-800 bg-[#121A2B]/60 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>When to Apply This Pattern (Trigger Cues)</span>
            </div>
            <ul className="space-y-1.5 pl-6 list-disc text-xs text-slate-300 marker:text-emerald-500">
              {activePattern.trigger_cues.map((cue, idx) => (
                <li key={idx} className="leading-relaxed">
                  {cue}
                </li>
              ))}
            </ul>
          </div>

          {/* Invariant Rules */}
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Loop Invariants (Rules to Uphold)</span>
            </div>
            <ul className="space-y-1.5 pl-6 list-disc text-xs text-slate-300 marker:text-indigo-400">
              {activePattern.invariant_rules.map((rule, idx) => (
                <li key={idx} className="leading-relaxed">
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* C++20 Implementation Template */}
          <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-300">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>Canonical C++20 Template</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 px-2 text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400 mr-1" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    <span>Copy Template</span>
                  </>
                )}
              </Button>
            </div>
            <pre className="p-4 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed whitespace-pre">
              {activePattern.code_template_cpp}
            </pre>
          </div>

          {/* Common Pitfalls */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Common Pitfalls & Edge Cases</span>
            </div>
            <ul className="space-y-1.5 pl-6 list-disc text-xs text-slate-300 marker:text-amber-400">
              {activePattern.common_pitfalls.map((pitfall, idx) => (
                <li key={idx} className="leading-relaxed">
                  {pitfall}
                </li>
              ))}
            </ul>
          </div>

          {/* Related Exercises */}
          {activePattern.related_exercise_ids.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-white mb-3">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Practice Exercises Featuring This Pattern</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activePattern.related_exercise_ids.map((exId) => (
                  <Button
                    key={exId}
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectExercise?.(exId)}
                    className="text-xs font-mono border-slate-700 bg-slate-900/60 hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <span>{exId}</span>
                    <ExternalLink className="w-3 h-3 ml-1.5 text-slate-500" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
