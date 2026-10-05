import React, { useState, useMemo } from 'react';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  Clock,
  Cpu,
  Star,
  Search,
} from 'lucide-react';
import { DecisionMatrixEntry } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DecisionMatrixViewerProps {
  entries: DecisionMatrixEntry[];
}

export const DecisionMatrixViewer: React.FC<DecisionMatrixViewerProps> = ({ entries }) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesScenario =
        selectedScenarioId === 'all' || entry.id === selectedScenarioId;
      const matchesSearch =
        search.trim() === '' ||
        entry.scenario.toLowerCase().includes(search.toLowerCase()) ||
        entry.candidates.some((c) =>
          c.structure_name.toLowerCase().includes(search.toLowerCase())
        );
      return matchesScenario && matchesSearch;
    });
  }, [entries, selectedScenarioId, search]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0F172A]">
      {/* Header & Controls */}
      <div className="px-6 py-4 border-b border-slate-800 bg-[#121A2B]/60 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Data Structure Decision Matrix
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare candidate data structures across operational requirements and trade-offs
            </p>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search scenarios or structures..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Scenario Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            onClick={() => setSelectedScenarioId('all')}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              selectedScenarioId === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Scenarios ({entries.length})
          </button>
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setSelectedScenarioId(entry.id)}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer truncate max-w-xs ${
                selectedScenarioId === entry.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {entry.scenario}
            </button>
          ))}
        </div>
      </div>

      {/* Main Comparison Area */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-5xl space-y-8">
          {filteredEntries.map((scenario) => (
            <div key={scenario.id} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="text-sm font-bold text-white">{scenario.scenario}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scenario.candidates.map((cand, idx) => {
                  const isRec = cand.is_recommended;
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-4 flex flex-col justify-between transition-all ${
                        isRec
                          ? 'border-emerald-500/40 bg-emerald-950/15 shadow-sm'
                          : 'border-slate-800 bg-[#121A2B]/40 opacity-90'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Title & Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white leading-tight">
                            {cand.structure_name}
                          </h4>
                          {isRec && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                              <Star className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
                              Recommended
                            </span>
                          )}
                        </div>

                        {/* Complexity Badges */}
                        <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                          <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>{cand.time_complexity}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                            <Cpu className="w-3 h-3 text-indigo-400" />
                            <span>{cand.space_overhead}</span>
                          </div>
                        </div>

                        {/* Best When */}
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>Best When:</span>
                          </div>
                          <p className="text-slate-300 leading-relaxed text-[11px] pl-4">
                            {cand.best_when}
                          </p>
                        </div>

                        {/* Avoid When */}
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>Avoid When:</span>
                          </div>
                          <p className="text-slate-400 leading-relaxed text-[11px] pl-4">
                            {cand.avoid_when}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
