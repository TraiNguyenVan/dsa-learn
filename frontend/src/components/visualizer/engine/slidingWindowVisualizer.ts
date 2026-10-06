import { VisualizerStateFrame } from '@/lib/types';
import { collapseTrailingDuplicate, renumber } from './frameUtils';

/**
 * Sliding-window trace generator (spec 006, T066).
 *
 * Finds the longest subarray with no repeated character — the shrinkable
 * property from the lesson. Every frame states the window invariant explicitly,
 * because the invariant is what makes the linear bound hold, and an animation that
 * only showed the window would not let a learner see why `$L` never moves back.
 *
 * The frequency table is carried in the frame description rather than as state,
 * because the state field is a single window snapshot (F-06: exactly one state
 * field per frame) and the counts are text here for legibility.
 */
export function generateSlidingWindowTrace(input: string[]): VisualizerStateFrame[] {
  const chars = [...input];
  const frames: VisualizerStateFrame[] = [];

  const counts = new Map<string, number>();
  let left = 0;
  let best = 0;
  let bestStart = 0;

  const snap = (
    action: VisualizerStateFrame['action_type'],
    description: string,
    rationale: string,
    active: number | null = null,
  ): void => {
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: action,
      description,
      rationale,
      data_structure_type: 'ARRAY',
      array_state: {
        elements: chars.map((c, i) => ({
          value: c,
          index: i,
          is_highlighted: i === active || (i >= left && i <= rightBound),
          status: i === active ? 'active' : i > rightBound ? 'candidate' : 'default',
        })),
        pointers: [
          { name: 'left', target_index: left, color: '#38BDF8' },
          { name: 'right', target_index: rightBound, color: '#34D399' },
        ],
      },
    });
  };

  let rightBound = -1;

  if (chars.length === 0) {
    frames.push({
      step_index: 0,
      total_steps: 1,
      action_type: 'INIT',
      description: 'Input is empty, so the window is empty and the longest valid window has length 0.',
      rationale: 'The empty case must still be stated once. With no characters there is no right edge to advance, so the answer is 0 by inspection rather than by search — the O(1) boundary case.',
      data_structure_type: 'ARRAY',
      array_state: { elements: [], pointers: [] },
    });
    return frames;
  }

  snap(
    'INIT',
    `Window is empty (left = ${left}, right = -1). Frequency table: empty.`,
    'Both edges start outside the array, which is the standard initial condition for a half-open window. Starting with a non-empty window would force a special case for the first element.',
  );

  for (let right = 0; right < chars.length; right++) {
    rightBound = right;
    const ch = chars[right];
    counts.set(ch, (counts.get(ch) ?? 0) + 1);

    if (counts.get(ch)! > 1) {
      snap(
        'EXPAND',
        `Advanced right to ${right} (character "${ch}"). "${ch}" is now duplicated, so the window is invalid. Counts: ${describeCounts()}.`,
        'The invariant "every character in the window appears at most once" is what validity means here. Advancing the right edge can only break it, never fix it, because adding an element can introduce a duplicate but never remove one.',
        right,
      );
    } else {
      snap(
        'EXPAND',
        `Advanced right to ${right} (character "${ch}"). No duplicate introduced; the window is valid. Counts: ${describeCounts()}.`,
        'The window is the largest valid one ending at this position because the previous right edge already recorded the largest valid window for the previous position, and extending by a non-repeating character keeps it valid.',
        right,
      );
    }

    // Contract while invalid.
    while (counts.get(ch)! > 1) {
      const outgoing = chars[left];
      const next = (counts.get(outgoing) ?? 1) - 1;
      if (next <= 0) counts.delete(outgoing);
      else counts.set(outgoing, next);

      snap(
        'PRUNE',
        `Window invalid: contracted left to ${left + 1}, removing "${outgoing}". Counts: ${describeCounts()}.`,
        'Shrinking from the left is the only way to restore validity, and it is safe because an invalid window has no valid sub-window to find instead — for the no-repeat property every subset of an invalid window is still invalid in the relevant sense. The left edge never moves backwards, which is what bounds the whole run to O(N).',
        left,
      );
      left += 1;
    }

    const len = right - left + 1;
    if (len > best) {
      best = len;
      bestStart = left;
      snap(
        'HIGHLIGHT',
        `Longest valid window so far: length ${best} (indices ${bestStart} to ${bestStart + best - 1}).`,
        'The loop invariant after each right edge is that the window is the largest valid window ending at this position. Recording the maximum over all positions therefore yields the global optimum, so the answer is correct when the sweep finishes rather than at some point during it.',
      );
    }
  }

  snap(
    'EXHAUST',
    `Search complete. Longest subarray with no repeated character has length ${best}, starting at index ${bestStart}.`,
    `The right edge advanced ${chars.length} times and the left edge advanced at most ${chars.length} times, so total movement was at most ${chars.length * 2} and the whole scan is linear. That bound comes from the left edge never retreating, not from any per-step cleverness.`,
  );

  return renumber(collapseTrailingDuplicate(frames));

  function describeCounts(): string {
    const parts = Array.from(counts.entries()).map(([k, v]) => `${k} x${v}`);
    return parts.length ? parts.join(', ') : 'empty';
  }
}