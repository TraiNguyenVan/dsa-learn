import {
  Play,
  Pause,
  SkipForward,
  CornerDownRight,
  CornerUpRight,
  Square,
  Bug,
  Layers,
  Variable as VariableIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DebugSessionState, StackFrame, Variable } from '@/lib/types';

interface DebuggerPanelProps {
  debugState: DebugSessionState;
  callStack: StackFrame[];
  variables: Variable[];
  statusMessage: string;
  onContinue: () => void;
  onPause: () => void;
  onStepOver: () => void;
  onStepInto: () => void;
  onStepOut: () => void;
  onStop: () => void;
  onStart: () => void;
}

export function DebuggerPanel({
  debugState,
  callStack,
  variables,
  statusMessage,
  onContinue,
  onPause,
  onStepOver,
  onStepInto,
  onStepOut,
  onStop,
  onStart,
}: DebuggerPanelProps) {
  const isStopped = debugState === 'STOPPED';
  const isIdle = debugState === 'IDLE' || debugState === 'TERMINATED';

  return (
    <div className="h-full flex flex-col bg-[#0B1220] text-xs">
      {/* Stepping Toolbar */}
      <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-1.5">
          {isIdle ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onStart}
              className="h-7 text-xs bg-purple-950/40 border-purple-800 text-purple-300 hover:bg-purple-900/50"
              title="Launch Debugger (F5)"
            >
              <Bug className="w-3.5 h-3.5 mr-1 text-purple-400" /> Start Debugging (F5)
            </Button>
          ) : (
            <>
              {isStopped ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onContinue}
                  className="h-7 px-2.5 bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/50"
                  title="Continue (F5)"
                >
                  <Play className="w-3.5 h-3.5 mr-1 fill-emerald-400 text-emerald-400" /> Continue (F5)
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPause}
                  className="h-7 px-2.5 bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/50"
                  title="Pause"
                >
                  <Pause className="w-3.5 h-3.5 mr-1 fill-amber-400 text-amber-400" /> Pause
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onStepOver}
                disabled={!isStopped}
                className="h-7 px-2 text-slate-300 hover:text-white"
                title="Step Over (F10)"
              >
                <SkipForward className="w-3.5 h-3.5 mr-1 text-sky-400" /> Step Over (F10)
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onStepInto}
                disabled={!isStopped}
                className="h-7 px-2 text-slate-300 hover:text-white"
                title="Step Into (F11)"
              >
                <CornerDownRight className="w-3.5 h-3.5 mr-1 text-teal-400" /> Step Into (F11)
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onStepOut}
                disabled={!isStopped}
                className="h-7 px-2 text-slate-300 hover:text-white"
                title="Step Out (Shift+F11)"
              >
                <CornerUpRight className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Step Out
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onStop}
                className="h-7 px-2 text-rose-400 hover:text-rose-300"
                title="Stop Debugging (Shift+F5)"
              >
                <Square className="w-3 h-3 mr-1 fill-rose-400" /> Stop
              </Button>
            </>
          )}
        </div>

        {/* State Status Banner */}
        <div className="font-mono text-[11px] text-slate-400 truncate max-w-sm">
          {statusMessage || (isIdle ? 'Debugger ready. Set breakpoints and click Start.' : debugState)}
        </div>
      </div>

      {/* Panels: Call Stack & Scoped Variables */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Call Stack */}
        <div className="w-1/2 border-r border-slate-800/80 flex flex-col bg-[#0A101D]">
          <div className="px-3 py-1.5 bg-slate-900/40 border-b border-slate-800 text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" /> Call Stack
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {callStack.length === 0 ? (
              <div className="text-slate-600 text-[11px] p-2 italic">No active frames</div>
            ) : (
              callStack.map((frame, idx) => (
                <div
                  key={frame.id}
                  className={`p-1.5 rounded font-mono text-[11px] flex justify-between items-center ${
                    idx === 0 ? 'bg-purple-950/40 text-purple-200 border border-purple-800/50' : 'text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <span className="truncate">{frame.name}</span>
                  <span className="text-[10px] text-slate-500 font-sans ml-2">Line {frame.line}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Variables Inspection */}
        <div className="w-1/2 flex flex-col bg-[#090F1B]">
          <div className="px-3 py-1.5 bg-slate-900/40 border-b border-slate-800 text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <VariableIcon className="w-3.5 h-3.5 text-teal-400" /> Scoped Variables
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {variables.length === 0 ? (
              <div className="text-slate-600 text-[11px] p-2 italic">No variables in current scope</div>
            ) : (
              <div className="space-y-1 font-mono text-[11px]">
                {variables.map((v) => (
                  <div key={v.name} className="flex items-baseline justify-between p-1 rounded hover:bg-slate-800/30">
                    <div className="flex items-baseline gap-1.5 truncate">
                      <span className="text-teal-300 font-semibold">{v.name}:</span>
                      {v.type && <span className="text-[10px] text-slate-500 font-sans">({v.type})</span>}
                    </div>
                    <span className="text-amber-300 ml-2 font-bold select-text">{v.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
