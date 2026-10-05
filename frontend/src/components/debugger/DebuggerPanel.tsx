/**
 * Debugger panel: the stepping toolbar plus the debug console.
 *
 * The panel stays the platform's own component (FR-020). It is populated from
 * the adopted library's data through `useDebugger`, and re-themed to the
 * project's design system (FR-021, SC-003, SC-012).
 *
 * Icons are vector components from the established set with accessible names.
 * No emoji, no glyph substitutes (SC-004).
 */

import {
  Bug,
  CornerDownRight,
  CornerUpRight,
  Pause,
  Play,
  SkipForward,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DebugConsole } from '@/components/debugger/DebugConsole';
import type { DebugSessionState, DebugStackFrame, DebugVariable } from '@/lib/types';

export interface DebuggerAvailability {
  available: boolean;
  remediation: string | null;
}

interface DebuggerPanelProps {
  debugState: DebugSessionState;
  callStack: DebugStackFrame[];
  variables: DebugVariable[];
  statusMessage: string;
  remediation: string | null;
  availability: DebuggerAvailability;
  selectedFrameId: string | null;
  expandedHandles: Set<string>;
  childrenByHandle: Record<string, DebugVariable[]>;
  appliedBreakpoints: number;
  requestedBreakpoints: number;
  onContinue: () => void;
  onPause: () => void;
  onStepOver: () => void;
  onStepInto: () => void;
  onStepOut: () => void;
  onStop: () => void;
  onStart: () => void;
  onSelectFrame: (frameId: string) => void;
  onExpandVariable: (handle: string) => void;
}

export function DebuggerPanel({
  debugState,
  callStack,
  variables,
  statusMessage,
  remediation,
  availability,
  selectedFrameId,
  expandedHandles,
  childrenByHandle,
  appliedBreakpoints,
  requestedBreakpoints,
  onContinue,
  onPause,
  onStepOver,
  onStepInto,
  onStepOut,
  onStop,
  onStart,
  onSelectFrame,
  onExpandVariable,
}: DebuggerPanelProps) {
  const isStopped = debugState === 'STOPPED';
  const isIdle = debugState === 'IDLE' || debugState === 'TERMINATED' || debugState === 'FAILED';
  // A session still compiling or launching has no stepping controls, but must
  // stay cancellable rather than trapping the learner in a hung state (FR-018).
  const isStarting = debugState === 'COMPILING' || debugState === 'LAUNCHING';
  const canStart = isIdle && availability.available;

  return (
    <div className="debug-surface h-full flex flex-col text-xs">
      <div className="debug-pane-header px-3 py-1.5 border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isIdle ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onStart}
              disabled={!canStart}
              className="debug-focusable h-7 text-xs"
              title={
                availability.available
                  ? 'Start debugging (F5)'
                  : 'The debugger is unavailable on this machine'
              }
            >
              <Bug className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              Start Debugging (F5)
            </Button>
          ) : isStarting ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStop}
              className="debug-focusable h-7 px-2 text-destructive hover:text-destructive"
              title="Cancel (Shift+F5)"
            >
              <Square className="w-3 h-3 mr-1 fill-current" aria-hidden="true" />
              Cancel
            </Button>
          ) : (
            <>
              {isStopped ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onContinue}
                  className="debug-focusable h-7 px-2.5"
                  title="Continue (F5)"
                >
                  <Play className="w-3.5 h-3.5 mr-1 fill-current" aria-hidden="true" />
                  Continue (F5)
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPause}
                  className="debug-focusable h-7 px-2.5"
                  title="Pause"
                >
                  <Pause className="w-3.5 h-3.5 mr-1 fill-current" aria-hidden="true" />
                  Pause
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onStepOver}
                disabled={!isStopped}
                className="debug-focusable h-7 px-2"
                title="Step Over (F10)"
              >
                <SkipForward className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Step Over (F10)
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onStepInto}
                disabled={!isStopped}
                className="debug-focusable h-7 px-2"
                title="Step Into (F11)"
              >
                <CornerDownRight className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Step Into (F11)
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onStepOut}
                disabled={!isStopped}
                className="debug-focusable h-7 px-2"
                title="Step Out (Shift+F11)"
              >
                <CornerUpRight className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Step Out (Shift+F11)
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onStop}
                className="debug-focusable h-7 px-2 text-destructive hover:text-destructive"
                title="Stop Debugging (Shift+F5)"
              >
                <Square className="w-3 h-3 mr-1 fill-current" aria-hidden="true" />
                Stop
              </Button>
            </>
          )}
        </div>

        <p className="debug-muted font-mono text-[11px] truncate max-w-sm" role="status">
          {statusMessage ||
            (isIdle ? 'Debugger ready. Set breakpoints and click Start.' : debugState)}
        </p>
      </div>

      {!availability.available && isIdle && (
        <p
          className="px-3 py-1.5 border-b text-[11px] text-destructive"
          role="status"
        >
          Debugging is unavailable: {availability.remediation ?? 'GDB is required.'}
        </p>
      )}

      {remediation && debugState !== 'IDLE' && (
        <p className="px-3 py-1.5 border-b text-[11px] text-destructive" role="status">
          {remediation}
        </p>
      )}

      {requestedBreakpoints > 0 && appliedBreakpoints < requestedBreakpoints && (
        <p className="px-3 py-1.5 border-b text-[11px] debug-muted" role="status">
          {appliedBreakpoints} of {requestedBreakpoints} breakpoints could be placed.
        </p>
      )}

      <DebugConsole
        callStack={callStack}
        variables={variables}
        selectedFrameId={selectedFrameId}
        isStopped={isStopped}
        onSelectFrame={onSelectFrame}
        onExpandVariable={onExpandVariable}
        expandedHandles={expandedHandles}
        childrenByHandle={childrenByHandle}
      />
    </div>
  );
}