import React from 'react';
import { StackState } from '@/lib/types';

interface StackCanvasProps {
  stack: StackState;
}

/**
 * Vertical layout with index 0 at the bottom and the topmost entry emphasised.
 *
 * The bottom-anchored ordering is deliberate: it matches how the array backing
 * the stack is actually laid out, so a learner reading this picture and the code
 * `arr[s-1]` sees the same object. Index 0 sits at the bottom and the highest
 * index at the top, and `top emphasis` marks exactly the element `pop` would
 * return.
 */
export const StackCanvas: React.FC<StackCanvasProps> = ({ stack }) => {
  const entries = stack.entries ?? [];
  const popped = stack.popped ?? [];

  if (entries.length === 0 && popped.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-1">
        <span className="text-slate-400">Stack is empty</span>
        <span>Size is 0, so top is undefined and pop would underflow.</span>
      </div>
    );
  }

  const topIndex = entries.length - 1;

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 gap-4">
      <div className="flex items-end gap-6">
        {/* The stack itself: index 0 at the bottom. */}
        <div className="flex flex-col-reverse items-stretch gap-1">
          {entries.map((entry, idx) => {
            const isTop = idx === topIndex;
            return (
              <div key={`stack_${idx}`} className="flex items-center gap-2">
                <span className="w-6 text-right text-[10px] font-mono text-slate-600">
                  {idx}
                </span>
                <div
                  className={`w-40 h-10 rounded border flex items-center justify-between px-3 font-mono text-sm transition-all duration-200 ${
                    isTop
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : 'border-slate-700 bg-slate-900 text-slate-200'
                  }`}
                >
                  <span className="font-bold">{String(entry.value)}</span>
                  {entry.label && (
                    <span className="text-[10px] text-slate-400">{entry.label}</span>
                  )}
                  {isTop && (
                    <span className="text-[10px] uppercase tracking-wide text-emerald-300">
                      top
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Already-popped entries, shown above so LIFO is visible. */}
        {popped.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              popped
            </span>
            <div className="flex flex-col items-end gap-1">
              {popped.map((entry, idx) => (
                <div
                  key={`popped_${idx}`}
                  className="w-32 h-8 rounded border border-slate-800 bg-slate-900/60 flex items-center justify-between px-3 font-mono text-xs text-slate-500"
                >
                  <span className="font-bold">{String(entry.value)}</span>
                  {entry.label && (
                    <span className="text-[10px] text-slate-600">{entry.label}</span>
                  )}
                </div>
              ))}
            </div>
            <span className="text-[10px] font-mono text-slate-600">
              returned most recent first
            </span>
          </div>
        )}
      </div>

      <div className="text-[11px] font-mono text-slate-500">
        size = {entries.length} &nbsp;|&nbsp; push at index {entries.length}, pop from index{' '}
        {topIndex}
        {topIndex < 0 ? ' (undefined while empty)' : ''}
      </div>
    </div>
  );
};