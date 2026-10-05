import React, { useState, useEffect } from 'react';
import { Sparkles, Compass, Loader2 } from 'lucide-react';
import { PatternBlueprint, DecisionMatrixEntry } from '@/lib/types';
import { fetchPatterns } from '@/lib/api';
import { PatternBlueprintViewer } from './PatternBlueprintViewer';
import { DecisionMatrixViewer } from './DecisionMatrixViewer';

interface PatternsContainerProps {
  topicId?: string | null;
  onSelectExercise?: (exerciseId: string) => void;
}

export const PatternsContainer: React.FC<PatternsContainerProps> = ({
  topicId,
  onSelectExercise,
}) => {
  const [subTab, setSubTab] = useState<'blueprints' | 'matrix'>('blueprints');
  const [patterns, setPatterns] = useState<PatternBlueprint[]>([]);
  const [decisionMatrix, setDecisionMatrix] = useState<DecisionMatrixEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    // Fetch all patterns (or topic-scoped if desired)
    fetchPatterns()
      .then((data) => {
        if (isMounted) {
          setPatterns(data.patterns || []);
          setDecisionMatrix(data.decision_matrix || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to load pattern blueprints');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [topicId]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 bg-[#0F172A]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <span className="text-xs">Loading patterns and decision matrix...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-[#0F172A]">
        <div className="p-4 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs max-w-md text-center">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0F172A]">
      {/* Top Secondary Sub-nav */}
      <div className="px-6 py-2 bg-[#121A2B] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('blueprints')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              subTab === 'blueprints'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Algorithmic Blueprints ({patterns.length})</span>
          </button>
          <button
            onClick={() => setSubTab('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              subTab === 'matrix'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Decision Matrix ({decisionMatrix.length})</span>
          </button>
        </div>
      </div>

      {/* Body View */}
      <div className="flex-1 overflow-hidden">
        {subTab === 'blueprints' ? (
          <PatternBlueprintViewer
            patterns={patterns}
            onSelectExercise={onSelectExercise}
          />
        ) : (
          <DecisionMatrixViewer entries={decisionMatrix} />
        )}
      </div>
    </div>
  );
};
