import React from 'react';
import { QueueState } from '@/lib/types';

interface QueueCanvasProps {
  queue: QueueState;
}

/**
 * Horizontal layout, index 0 on the left as `front`, highest index on the right as
 * `rear`.
 *
 * The front/rear split is the whole distinguishing feature against a stack, so
 * it is labelled explicitly rather than left to be inferred from position. A
 * learner seeing only boxes would have no way to tell a queue from a stack drawn
 * sideways.
 */
export const QueueCanvas: React.FC<QueueCanvasProps> = ({ queue }) => {
  const entries = queue.entries ?? [];
  const dequeued = queue.dequeued ?? [];

  if (entries.length === 0 && dequeued.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-1">
        <span className="text-slate-400">Queue is empty</span>
        <span>Both front and rear are undefined, so dequeue would underflow.</span>
      </div>
    );
  }

  const frontIndex = 0;
  const rearIndex = entries.length - 1;

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 gap-5">
      {/* The queue: index 0 at the front, leftmost. */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-stretch gap-1">
          {entries.map((entry, idx) => {
            const isFront = idx === frontIndex;
            const isRear = idx === rearIndex;
            const both = entries.length === 1;
            return (
              <div
                key={`queue_${idx}`}
                className={`w-16 h-12 rounded border flex flex-col items-center justify-center font-mono transition-all duration-200 ${
                  isFront
                    ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                    : isRear
                    ? 'border-amber-400 bg-amber-500/15 text-amber-100'
                    : 'border-slate-700 bg-slate-900 text-slate-200'
                }`}
              >
                <span className="text-xs font-bold">{String(entry.value)}</span>
                {entry.label && (
                  <span className="text-[9px] text-slate-400">{entry.label}</span>
                )}
                {(isFront || both) && (
                  <span className="text-[9px] uppercase tracking-wide text-sky-300">
                    front
                  </span>
                )}
                {(isRear || both) && (
                  <span className="text-[9px] uppercase tracking-wide text-amber-300">
                    rear
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Index ruler so front/rear indices are unambiguous. */}
        <div className="flex gap-1">
          {entries.map((_, idx) => (
            <div key={`idx_${idx}`} className="w-16 text-center text-[9px] font-mono text-slate-600">
              [{idx}]
            </div>
          ))}
        </div>
      </div>

      {dequeued.length > 0 && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
            dequeued (oldest first)
          </span>
          <div className="flex gap-1">
            {dequeued.map((entry, idx) => (
              <div
                key={`dequeued_${idx}`}
                className="w-16 h-9 rounded border border-slate-800 bg-slate-900/60 flex items-center justify-center font-mono text-xs text-slate-500"
              >
                <span className="font-bold">{String(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-[11px] font-mono text-slate-500">
        size = {entries.length} &nbsp;|&nbsp; dequeue removes index {frontIndex}, enqueue appends
        at index {rearIndex + 1} &nbsp;|&nbsp; first in, first out
      </div>
    </div>
  );
};