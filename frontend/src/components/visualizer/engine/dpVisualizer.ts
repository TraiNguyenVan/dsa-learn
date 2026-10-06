import { VisualizerStateFrame } from '@/lib/types';
import { collapseTrailingDuplicate, renumber } from './frameUtils';

/**
 * Dynamic-programming table fill generator (spec 006, T064).
 *
 * Fills a canonical bottom-up table — the minimum number of coins for each amount,
 * or 0/1 knapsack — emitting one frame per state write and, crucially, marking
 * `active_range` so the learner can see *which cells the current cell reads from*.
 *
 * Showing the dependency range is the point of the animation. A DP table on its own
 * looks like an arbitrary grid of numbers; seeing the reads that produce each entry
 * is what makes the recurrence visible as a recurrence.
 */
export function generateDPTabularTrace(
  values: number[],
  target: number,
  mode: 'coin-change' | 'knapsack' = 'coin-change',
): VisualizerStateFrame[] {
  const nums = [...values].filter((v) => v > 0);
  const frames: VisualizerStateFrame[] = [];

  const cap = Math.max(0, Math.min(target, 400));
  const cols = Array.from({ length: cap + 1 }, (_, i) => `n=${i}`);
  const rows = mode === 'coin-change' ? ['0 coins', ...nums.map((c) => `use ${c}`)] : ['0 weight', ...nums.map((c) => `item ${c}`)];

  const cells: Array<Array<number | null>> = rows.map(() => Array.from({ length: cap + 1 }, () => null));
  // Row 0 is the base case: zero coins (or zero weight) costs 0 for every amount.
  for (let c = 0; c <= cap; c++) cells[0][c] = 0;

  const snap = (
    action: VisualizerStateFrame['action_type'],
    description: string,
    rationale: string,
    activeCell: [number, number] | null = null,
    activeRange: [number, number, number, number] | null = null,
  ): void => {
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: action,
      description,
      rationale,
      data_structure_type: 'DP_TABLE',
      dp_table_state: {
        rows,
        cols,
        cells: cells.map((row) => [...row]),
        active_cell: activeCell,
        active_range: activeRange,
      },
    });
  };

  if (nums.length === 0) {
    snap(
      'INIT',
      'No usable values, so only the base-case row exists and every amount costs 0.',
      'With no items or coins available the state space is degenerate: the only reachable answer is the base case. This is the boundary case that a DP must handle explicitly, because every later cell would otherwise read from an impossible predecessor.',
    );
    return renumber(collapseTrailingDuplicate(frames));
  }

  snap(
    'INIT',
    `Table allocated: ${rows.length} rows by ${cols.length} columns, ${rows.length * cols.length} states.`,
    'The state count is a product of the two ranges, which is why a DP is polynomial where the naive recursion is exponential. Each state will be written exactly once, after every state it reads.',
  );

  for (let r = 1; r < rows.length; r++) {
    const item = nums[r - 1];
    for (let c = 0; c <= cap; c++) {
      const include = c >= item;
      // Coin change: take the coin, then read the subproblem for the remainder.
      // Knapsack: same shape, different row ordering (see below).
      const sub = include ? cells[r - 1][c - item] : null;
      const skip = cells[r - 1][c];
      const includeCost = sub === null ? null : sub + 1;
      const best = skip === null ? includeCost : includeCost === null ? skip : Math.min(skip, includeCost);

      cells[r][c] = best;

      if (!include) {
        snap(
          'WRITE',
          `[${r}][${c}] = ${best}. Amount ${c} is smaller than ${item}, so this coin cannot be used here.`,
          `The only way to reach amount ${c} without coin ${item} is the row above, and the base case guarantees that value exists. When a state has no valid "include" branch its recurrence must fall back to "skip", and forgetting that fallback is what produces unreachable states.`,
          [r, c],
          [r - 1, r - 1, c, c],
        );
        continue;
      }

      snap(
        'WRITE',
        `[${r}][${c}] = ${best}, from min(skip=${skip}, take=${includeCost}).`,
        `Optimal substructure: the best solution using coin ${item} takes it and then solves the remainder ${c - item}, which is exactly the cell to the left in the row above. Taking the minimum of the two branches is what makes the entry optimal rather than merely feasible — a DP that records only one branch stops being correct as soon as the other is smaller.`,
        [r, c],
        [r - 1, r - 1, c - item, c],
      );
    }
  }

  const answer = cells[cells.length - 1][cap];
  snap(
    'EXHAUST',
    `Table complete. Answer for amount ${cap} is ${answer === null ? 'unreachable' : answer}.`,
    answer === null
      ? 'A null entry at the final cell means no combination reaches this amount. That is a proved impossibility rather than an uncomputed value, because every cell is written exactly once from cells that are themselves final.'
      : 'The final cell holds the optimum because each entry was computed from already-final predecessors. Every state was visited exactly once, which is precisely the property that separates DP from the exponential recursion it replaces.',
  );

  return renumber(collapseTrailingDuplicate(frames));
}