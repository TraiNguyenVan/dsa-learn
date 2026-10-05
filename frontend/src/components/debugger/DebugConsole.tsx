/**
 * Debug console: the call stack and the scoped variables tree.
 *
 * FR-020: these are the platform's own components, populated from the adopted
 * library's data. No third-party panel is involved.
 *
 * FR-021: every colour, font, and spacing value resolves through a design token
 * declared in `globals.css`. There are no literal hex values here, which is what
 * `tests/test_debug_theme.py` enforces.
 */

import { ChevronRight, ChevronDown, Layers, Variable as VariableIcon } from 'lucide-react';
import type { DebugStackFrame, DebugVariable } from '@/lib/types';

interface DebugConsoleProps {
  callStack: DebugStackFrame[];
  variables: DebugVariable[];
  selectedFrameId: string | null;
  isStopped: boolean;
  onSelectFrame: (frameId: string) => void;
  onExpandVariable: (handle: string) => void;
  expandedHandles: Set<string>;
  childrenByHandle: Record<string, DebugVariable[]>;
}

export function DebugConsole({
  callStack,
  variables,
  selectedFrameId,
  isStopped,
  onSelectFrame,
  onExpandVariable,
  expandedHandles,
  childrenByHandle,
}: DebugConsoleProps) {
  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      <section
        className="debug-pane w-1/2 flex flex-col min-h-0 border-r"
        aria-label="Call stack"
      >
        <header className="debug-pane-header px-3 py-1.5 border-b text-[11px] font-semibold flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" aria-hidden="true" />
          Call Stack
        </header>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {callStack.length === 0 ? (
            <p className="debug-muted text-[11px] p-2 italic">No active frames</p>
          ) : (
            callStack.map((frame) => {
              const selected = frame.id === selectedFrameId;
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => onSelectFrame(frame.id)}
                  disabled={!isStopped}
                  aria-current={selected}
                  className={`debug-row debug-focusable w-full text-left p-1.5 rounded font-mono text-[11px] flex justify-between items-center gap-2 border ${
                    selected ? 'debug-row-selected' : 'border-transparent'
                  }`}
                >
                  <span className="truncate">{frame.function}</span>
                  <span className="debug-muted text-[10px] font-sans shrink-0">
                    {frame.line >= 0 ? `Line ${frame.line}` : 'line ?'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="debug-pane w-1/2 flex flex-col min-h-0" aria-label="Variables">
        <header className="debug-pane-header px-3 py-1.5 border-b text-[11px] font-semibold flex items-center gap-1.5">
          <VariableIcon className="w-3.5 h-3.5" aria-hidden="true" />
          Scoped Variables
        </header>
        <div className="flex-1 overflow-y-auto p-2">
          {variables.length === 0 ? (
            <p className="debug-muted text-[11px] p-2 italic">
              {isStopped ? 'No variables in this scope' : 'Variables appear when execution stops'}
            </p>
          ) : (
            <div className="space-y-0.5 font-mono text-[11px]">
              {variables.map((variable, index) => (
                <VariableRow
                  key={`${variable.name}-${index}`}
                  variable={variable}
                  depth={0}
                  expandedHandles={expandedHandles}
                  childrenByHandle={childrenByHandle}
                  onExpand={onExpandVariable}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

interface VariableRowProps {
  variable: DebugVariable;
  depth: number;
  expandedHandles: Set<string>;
  childrenByHandle: Record<string, DebugVariable[]>;
  onExpand: (handle: string) => void;
}

function VariableRow({
  variable,
  depth,
  expandedHandles,
  childrenByHandle,
  onExpand,
}: VariableRowProps) {
  // data-model.md 1.8: has_children false implies a null handle, so an
  // expandable variable always has a handle to expand.
  const expandable = variable.has_children && variable.handle !== null;
  const isOpen = expandable && expandedHandles.has(variable.handle as string);
  const children = expandable ? childrenByHandle[variable.handle as string] ?? [] : [];

  return (
    <>
      <div
        className="debug-row debug-focusable flex items-baseline justify-between gap-2 p-1 rounded"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <div className="flex items-baseline gap-1.5 truncate min-w-0">
          {expandable ? (
            <button
              type="button"
              onClick={() => onExpand(variable.handle as string)}
              aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${variable.name}`}
              aria-expanded={isOpen}
              className="debug-focusable shrink-0 text-muted-foreground hover:text-foreground"
            >
              {isOpen ? (
                <ChevronDown className="w-3 h-3" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-3 h-3" aria-hidden="true" />
              )}
            </button>
          ) : (
            <span className="w-3 shrink-0" aria-hidden="true" />
          )}
          <span className="debug-accent font-semibold truncate">{variable.name}</span>
          {variable.type && (
            <span className="debug-muted text-[10px] font-sans truncate">{variable.type}</span>
          )}
        </div>
        <span className="debug-accent ml-2 font-bold select-text truncate max-w-[45%]" title={variable.value}>
          {variable.value || (variable.has_children ? '{...}' : '')}
          {variable.truncated && <span aria-hidden="true">…</span>}
        </span>
      </div>

      {isOpen &&
        children.map((child, index) => (
          <VariableRow
            key={`${child.name}-${depth}-${index}`}
            variable={child}
            depth={depth + 1}
            expandedHandles={expandedHandles}
            childrenByHandle={childrenByHandle}
            onExpand={onExpand}
          />
        ))}
    </>
  );
}