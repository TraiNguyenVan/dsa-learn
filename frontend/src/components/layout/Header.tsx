import { useState } from 'react';
import {
  Play,
  RotateCcw,
  Lightbulb,
  ShieldCheck,
  Bug,
  Save,
  CheckCircle2,
  AlertCircle,
  Keyboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SaveStatus } from '@/components/editor/useEditorSync';

interface HeaderProps {
  exerciseTitle?: string;
  isExecuting: boolean;
  isDebugging?: boolean;
  saveStatus?: SaveStatus;
  onRun: () => void;
  onDirectRun?: () => void;
  onDebug?: () => void;
  onSave?: () => void;
  onReset: () => void;
  onViewSolution: () => void;
  solvedCount: number;
  totalCount: number;
}

export function Header({
  exerciseTitle,
  isExecuting,
  isDebugging = false,
  saveStatus = 'saved',
  onRun,
  onDirectRun,
  onDebug,
  onSave,
  onReset,
  onViewSolution,
  solvedCount,
  totalCount,
}: HeaderProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const percent = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

  return (
    <header className="h-14 border-b border-slate-800 bg-[#0B132B]/90 backdrop-blur px-4 flex items-center justify-between select-none">
      {/* Brand & Platform Info */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
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
          <div className="hidden lg:flex items-center pl-4 border-l border-slate-800 text-xs text-slate-300">
            <span className="text-slate-500 mr-2">Problem:</span>
            <span className="font-semibold text-white">{exerciseTitle}</span>
          </div>
        )}
      </div>

      {/* Center Save Status Indicator */}
      <div className="hidden md:flex items-center gap-2 text-xs">
        {saveStatus === 'saved' && (
          <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Saved to disk
          </span>
        )}
        {saveStatus === 'saving' && (
          <span className="text-sky-400 flex items-center gap-1 font-mono text-[11px]">
            <span className="animate-spin text-xs">⟳</span> Saving...
          </span>
        )}
        {saveStatus === 'dirty' && (
          <span className="text-amber-400 flex items-center gap-1 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Unsaved changes
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="text-rose-400 flex items-center gap-1 font-mono text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Save failed
          </span>
        )}

        {onSave && saveStatus === 'dirty' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            className="h-6 px-2 text-[10px] text-slate-300 hover:text-white"
            title="Save file to disk (Ctrl+S)"
          >
            <Save className="w-3 h-3 mr-1" /> Save
          </Button>
        )}
      </div>

      {/* Progress & Actions */}
      <div className="flex items-center space-x-3">
        {/* Progress bar */}
        <div className="hidden xl:flex items-center space-x-3 bg-slate-900/70 border border-slate-800 rounded-md px-3 py-1.5">
          <div className="flex flex-col">
            <div className="flex items-center justify-between text-[11px] text-slate-400 space-x-2">
              <span>Progress</span>
              <span className="font-mono text-emerald-400">{solvedCount}/{totalCount} ({percent}%)</span>
            </div>
            <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Shortcuts button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
          title="Keyboard shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </Button>

        {/* Reset button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="text-xs h-8"
          title="Reset starter template"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-400" />
          Reset
        </Button>

        {/* View Solution */}
        <Button
          variant="outline"
          size="sm"
          onClick={onViewSolution}
          className="text-xs h-8"
          title="View canonical reference solution"
        >
          <Lightbulb className="w-3.5 h-3.5 mr-1 text-amber-400" />
          Solution
        </Button>

        {/* Direct Run button */}
        {onDirectRun && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDirectRun}
            disabled={isExecuting}
            className="text-xs h-8 border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-200"
            title="Compile and execute directly (Ctrl+Shift+Enter)"
          >
            <Play className="w-3.5 h-3.5 mr-1 text-sky-400" /> Run
          </Button>
        )}

        {/* Debug button */}
        {onDebug && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDebug}
            disabled={isExecuting}
            className={`text-xs h-8 border-purple-800/60 ${isDebugging ? 'bg-purple-900/60 text-purple-300' : 'bg-purple-950/30 text-purple-300 hover:bg-purple-900/40'}`}
            title="Debug solution with breakpoints (F5)"
          >
            <Bug className="w-3.5 h-3.5 mr-1 text-purple-400" /> Debug
          </Button>
        )}

        {/* Run Tests (Verification) */}
        <Button
          variant="accent"
          size="sm"
          onClick={onRun}
          disabled={isExecuting}
          className="text-xs h-8 min-w-[95px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          title="Compile and verify test suite (Ctrl+Enter)"
        >
          {isExecuting ? (
            <span className="flex items-center">
              <span className="animate-spin mr-1.5">⟳</span> Testing...
            </span>
          ) : (
            <span className="flex items-center">
              <Play className="w-3.5 h-3.5 mr-1 fill-white" /> Test Suite
            </span>
          )}
        </Button>
      </div>

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#121A2B] border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-emerald-400" /> Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2.5 pt-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Run Test Suite</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">Ctrl + Enter</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Direct Compile & Run</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">Ctrl + Shift + Enter</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Save to Disk</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">Ctrl + S</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Toggle Breakpoint</span>
                <span className="text-slate-300 font-mono">Click Gutter</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Start / Continue Debug</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">F5</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Step Over</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">F10</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Step Into</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">F11</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Step Out</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">Shift + F11</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
