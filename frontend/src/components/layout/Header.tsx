import { Play, RotateCcw, Lightbulb, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  exerciseTitle?: string;
  isExecuting: boolean;
  onRun: () => void;
  onReset: () => void;
  onViewSolution: () => void;
  solvedCount: number;
  totalCount: number;
}

export function Header({
  exerciseTitle,
  isExecuting,
  onRun,
  onReset,
  onViewSolution,
  solvedCount,
  totalCount,
}: HeaderProps) {
  const percent = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

  return (
    <header className="h-14 border-b border-slate-800 bg-[#0B132B]/80 backdrop-blur px-4 flex items-center justify-between select-none">
      {/* Brand & Platform Info */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-mono font-bold">
            C++
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-wide text-white font-mono">DSA LEARN</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-700 bg-slate-800/50">
                C++20
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-900/60 bg-emerald-950/40 text-emerald-400">
                <ShieldCheck className="w-3 h-3 mr-1 inline" /> Offline
              </Badge>
            </div>
          </div>
        </div>

        {exerciseTitle && (
          <div className="hidden md:flex items-center pl-4 border-l border-slate-800 text-xs text-slate-300">
            <span className="text-slate-500 mr-2">Active Problem:</span>
            <span className="font-semibold text-white">{exerciseTitle}</span>
          </div>
        )}
      </div>

      {/* Progress & Actions */}
      <div className="flex items-center space-x-4">
        {/* Global Progress Indicator */}
        <div className="hidden sm:flex items-center space-x-3 bg-slate-900/70 border border-slate-800 rounded-md px-3 py-1.5">
          <div className="flex flex-col">
            <div className="flex items-center justify-between text-[11px] text-slate-400 space-x-2">
              <span>Progress</span>
              <span className="font-mono text-emerald-400">{solvedCount}/{totalCount} ({percent}%)</span>
            </div>
            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-xs"
            title="Reset starter template"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Reset
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onViewSolution}
            className="text-xs"
            title="View canonical reference solution"
          >
            <Lightbulb className="w-3.5 h-3.5 mr-1 text-amber-400" />
            Solution
          </Button>

          <Button
            variant="accent"
            size="sm"
            onClick={onRun}
            disabled={isExecuting}
            className="text-xs min-w-[90px]"
            title="Compile and verify code (Ctrl+Enter)"
          >
            {isExecuting ? (
              <span className="flex items-center">
                <span className="animate-spin mr-1.5">⟳</span> Running...
              </span>
            ) : (
              <span className="flex items-center">
                <Play className="w-3.5 h-3.5 mr-1 fill-white" /> Run Tests
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
