import { VisualizerStateFrame } from '@/lib/types';
import { collapseTrailingDuplicate, renumber } from './frameUtils';

/**
 * Monotonic-stack trace generator (spec 006, T060).
 *
 * Demonstrates the technique from the stack lesson's "monotonic stack" section:
 * push each element, and on push first pop every element smaller than it. The
 * payoff frame is the amortisation — each element is popped at most once, which
 * is why the apparent O(N^2) is really O(N).
 *
 * Pure and deterministic: no mutation of the input, no clock, no randomness.
 */
export function generateMonotonicStackTrace(input: number[]): VisualizerStateFrame[] {
  const nums = [...input];
  const frames: VisualizerStateFrame[] = [];

  // `stack` holds indices into `nums`, with values strictly decreasing bottom to
  // top. Indices rather than values, so the canvas can point at the source slot.
  const stack: number[] = [];
  const popped: Array<{ value: number; label?: string }> = [];
  let popCount = 0;

  const snap = (
    action: VisualizerStateFrame['action_type'],
    description: string,
    rationale: string,
  ): void => {
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: action,
      description,
      rationale,
      data_structure_type: 'STACK',
      stack_state: {
        entries: stack.map((i) => ({ value: nums[i], label: `idx ${i}` })),
        popped: [...popped],
      },
    });
  };

  if (nums.length === 0) {
    snap(
      'INIT',
      'Input is empty, so there is nothing to push.',
      'The amortisation argument needs at least one element to say anything; with none, the stack stays empty and the total work is O(1).',
    );
    return renumber(collapseTrailingDuplicate(frames));
  }

  snap(
    'INIT',
    `Monotonic stack initialised over ${nums.length} elements. The stack will hold indices whose values decrease from bottom to top.`,
    'A monotonic stack adds one constraint to the stack invariant: values must strictly decrease. That constraint is what makes a single pass linear, because a dominated element is discarded permanently instead of being compared against every later element.',
  );

  for (let i = 0; i < nums.length; i++) {
// Pop every strictly smaller element: each is dominated by nums[i].
//
// No "about to push" frame is emitted here. Such a frame would render the
// stack exactly as the previous frame already did -- the push has not happened
// yet -- so two consecutive frames would look identical, which contract F-05
// forbids and which reads as a stuck animation. Every pop changes the picture,
// and the push frame below always changes it too, so each emitted frame carries
// a visible change.
    while (stack.length > 0 && nums[stack[stack.length - 1]] < nums[i]) {
      const idx = stack.pop()!;
      popCount++;
      popped.push({ value: nums[idx], label: `idx ${idx}` });
      snap(
        'REMOVE',
        `Popped ${nums[idx]} (index ${idx}): ${nums[idx]} < ${nums[i]}, so it is dominated.`,
        `${nums[idx]} can no longer be the answer for any later element, because any future value large enough to beat it is also larger than ${nums[i]}. Discarding it now is what avoids re-examining it later — this is the second half of the amortisation bound.`
      );
    }

    stack.push(i);
    snap(
      'HIGHLIGHT',
      `Pushed ${nums[i]} (index ${i}) onto the stack. Stack depth is now ${stack.length}.`,
      `After popping, either the top is at least ${nums[i]} or the stack is empty, so pushing restores the decreasing invariant. The stack invariant is maintained at every push, which is what makes the final contents trustworthy.`
    );
  }

  snap(
    'EXHAUST',
    `All ${nums.length} elements processed. ${popCount} pop${popCount === 1 ? '' : 's'} occurred, so the total work was ${nums.length + popCount} operations.`,
    `Each element was pushed exactly once and popped at most once, so total operations is at most 2N — linear. The apparent quadratic from per-push popping never materialises, and this frame is the proof of it.`,
  );

  return renumber(collapseTrailingDuplicate(frames));
}

/**
 * FIFO queue trace generator (T061). Enqueue a batch, then dequeue it all.
 *
 * Running both operations interleaved with a visible front/rear split is the
 * point: a learner who has only seen a stack should be able to see *why* the two
 * are different operations on the same storage.
 */
export function generateQueueTrace(
  input: number[],
  op: 'enqueue' | 'dequeue' = 'enqueue',
): VisualizerStateFrame[] {
  const nums = [...input];
  const frames: VisualizerStateFrame[] = [];
  const entries: Array<{ value: number }> = [];
  const dequeued: Array<{ value: number }> = [];

  const snap = (
    action: VisualizerStateFrame['action_type'],
    description: string,
    rationale: string,
  ): void => {
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: action,
      description,
      rationale,
      data_structure_type: 'QUEUE',
      queue_state: { entries: entries.map((e) => ({ ...e })), dequeued: dequeued.map((e) => ({ ...e })) },
    });
  };

  if (nums.length === 0) {
    snap(
      'INIT',
      'Queue is empty: both front and rear are undefined.',
      'Dequeue on an empty queue would underflow, so the size check is the first guard in any queue implementation. Showing the empty state explicitly is why this boundary case is a preset rather than an afterthought.',
    );
    return renumber(collapseTrailingDuplicate(frames));
  }

  snap(
    'INIT',
    `Queue initialised empty. ${nums.length} element${nums.length === 1 ? '' : 's'} to process.`,
    'FIFO is defined by which end each operation touches: enqueue writes at the rear, dequeue reads from the front. Fixing that assignment is what determines the order elements come back out.',
  );

  if (op === 'enqueue') {
    for (let i = 0; i < nums.length; i++) {
      entries.push({ value: nums[i] });
      snap(
        'INSERT',
        `Enqueued ${nums[i]} at the rear, index ${entries.length - 1}. Queue size is now ${entries.length}.`,
        'Appending at the rear leaves every existing element in place, so the relative order of the queue is preserved and the operation is O(1) regardless of size.'
      );
    }
    snap(
      'EXHAUST',
      `All ${nums.length} elements enqueued in the order ${entries.map((e) => e.value).join(', ')}.`,
      'Enqueue preserves arrival order by construction. Nothing has been removed yet, so the front is still the first element enqueued — which is the property the next operation will test.',
    );
  } else {
    for (let i = 0; i < nums.length; i++) {
      entries.push({ value: nums[i] });
      snap(
        'INSERT',
        `Enqueued ${nums[i]} at the rear. Queue size is now ${entries.length}.`,
        'Appending at the rear leaves every existing element in place, so the relative order of the queue is preserved.'
      );
    }
    while (entries.length > 0) {
      const removed = entries.shift()!;
      dequeued.push(removed);
      snap(
        'REMOVE',
        `Dequeued ${removed.value} from the front. Queue size is now ${entries.length}.`,
        'Removing from the front is what makes this FIFO rather than a stack. The element removed is the one that arrived first, so arrival order is exactly departure order.',
      );
    }
    snap(
      'EXHAUST',
      `Queue drained. ${dequeued.length} element${dequeued.length === 1 ? '' : 's'} left in the order ${dequeued.map((e) => e.value).join(', ')}.`,
      'The dequeue order matches the enqueue order exactly. That equality is the whole guarantee a queue provides, and it is visible here because both ends were shown.',
    );
  }

  return renumber(collapseTrailingDuplicate(frames));
}