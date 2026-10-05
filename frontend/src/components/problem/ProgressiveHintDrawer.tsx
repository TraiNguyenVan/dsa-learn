import React, { useState, useEffect, useCallback } from 'react';
import {
  Lightbulb,
  Compass,
  Code2,
  Lock,
  Unlock,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ProgressiveHint } from '@/lib/types';
import { fetchExerciseHints, unlockNextHint } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProgressiveHintDrawerProps {
  topicId: string;
  exerciseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ProgressiveHintDrawer: React.FC<ProgressiveHintDrawerProps> = ({
  topicId,
  exerciseId,
  isOpen,
  onClose,
}) => {
  const [hints, setHints] = useState<ProgressiveHint[]>([]);
  const [maxUnlockedTier, setMaxUnlockedTier] = useState(0);
  const [loading, setLoading] = useState(false);
  const [unlockingTier, setUnlockingTier] = useState<number | null>(null);
  const [confirmingTier, setConfirmingTier] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadHints = useCallback(async () => {
    if (!exerciseId || !topicId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExerciseHints(topicId, exerciseId);
      setHints(data.hints || []);
      setMaxUnlockedTier(data.max_unlocked_tier || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load hints');
    } finally {
      setLoading(false);
    }
  }, [topicId, exerciseId]);

  useEffect(() => {
    if (isOpen) {
      loadHints();
    }
  }, [isOpen, loadHints]);

  const handleUnlock = async (tier: number) => {
    setUnlockingTier(tier);
    setError(null);
    try {
      await unlockNextHint(topicId, exerciseId);
      setConfirmingTier(null);
      await loadHints();
    } catch (err: any) {
      setError(err?.message || 'Failed to unlock hint');
    } finally {
      setUnlockingTier(null);
    }
  };

  if (!isOpen) return null;

  const renderContent = (markdown?: string | null) => {
    if (!markdown) return null;
    const html = DOMPurify.sanitize(marked.parse(markdown, { gfm: true, breaks: true }) as string);
    return (
      <div
        className="prose prose-invert prose-xs max-w-none text-slate-300 [&>p]:leading-relaxed [&>pre]:bg-slate-950/80 [&>pre]:p-2.5 [&>pre]:rounded-md [&>pre]:border [&>pre]:border-slate-800 [&>pre]:font-mono [&>code]:text-emerald-400 [&>code]:bg-slate-800/60 [&>code]:px-1 [&>code]:rounded"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  const getTierMetadata = (tier: number) => {
    switch (tier) {
      case 1:
        return {
          label: 'Tier 1: Nudge',
          icon: <Lightbulb className="w-4 h-4 text-amber-400" />,
          color: 'border-amber-500/30 bg-amber-500/5',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          desc: 'High-level conceptual direction without revealing code or exact algorithmic structure.',
        };
      case 2:
        return {
          label: 'Tier 2: Strategy',
          icon: <Compass className="w-4 h-4 text-sky-400" />,
          color: 'border-sky-500/30 bg-sky-500/5',
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          desc: 'Specific algorithmic pattern, data structure choices, and step-by-step invariant guidance.',
        };
      case 3:
      default:
        return {
          label: 'Tier 3: Pseudocode',
          icon: <Code2 className="w-4 h-4 text-emerald-400" />,
          color: 'border-emerald-500/30 bg-emerald-500/5',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          desc: 'Concrete pseudocode blueprint and class outline directly guiding your C++ implementation.',
        };
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0F172A] border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#121A2B]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Progressive Hints</h2>
            <p className="text-xs text-slate-400">3-tier guidance without accidental spoilers</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs font-mono border-slate-700 text-slate-300">
            {maxUnlockedTier} / {hints.length || 3} Unlocked
          </Badge>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Hint Stream */}
      <ScrollArea className="flex-1 p-5">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="text-xs">Loading progressive hints...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {hints.map((hint) => {
              const meta = getTierMetadata(hint.tier);
              const isUnlocked = hint.is_unlocked;
              const isNextToUnlock = hint.tier === maxUnlockedTier + 1;
              const isConfirming = confirmingTier === hint.tier;

              return (
                <div
                  key={hint.tier}
                  className={`rounded-lg border transition-all ${
                    isUnlocked ? meta.color : 'border-slate-800 bg-slate-900/40 opacity-90'
                  }`}
                >
                  {/* Tier Card Header */}
                  <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {meta.icon}
                      <span className="text-xs font-semibold text-white">{meta.label}</span>
                    </div>
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Unlocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500">
                        <Lock className="w-3.5 h-3.5" />
                        Locked
                      </span>
                    )}
                  </div>

                  {/* Tier Card Body */}
                  <div className="p-4">
                    {isUnlocked ? (
                      <div>
                        <h4 className="text-xs font-semibold text-white mb-2">{hint.title}</h4>
                        {renderContent(hint.content_markdown)}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-400 leading-relaxed">{meta.desc}</p>

                        {isNextToUnlock ? (
                          isConfirming ? (
                            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                              <div className="flex items-start gap-2 text-amber-300 text-xs">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                                <span>
                                  Ready to reveal <strong>{meta.label}</strong>? Try thinking through the
                                  problem first!
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUnlock(hint.tier)}
                                  disabled={unlockingTier === hint.tier}
                                  className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white"
                                >
                                  {unlockingTier === hint.tier ? (
                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                  ) : (
                                    <Unlock className="w-3 h-3 mr-1" />
                                  )}
                                  Confirm Unlock
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setConfirmingTier(null)}
                                  className="h-7 text-xs text-slate-400 hover:text-white"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmingTier(hint.tier)}
                              className="w-full text-xs border-slate-700 hover:border-emerald-500/60 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 cursor-pointer"
                            >
                              <Unlock className="w-3.5 h-3.5 mr-1.5" />
                              Unlock {meta.label}
                            </Button>
                          )
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 italic">
                            <Lock className="w-3 h-3" />
                            Must unlock earlier tier first
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-[#121A2B] text-center">
        <p className="text-[11px] text-slate-400">
          Unlocks are saved to your local offline database and remain accessible anytime.
        </p>
      </div>
    </div>
  );
};
