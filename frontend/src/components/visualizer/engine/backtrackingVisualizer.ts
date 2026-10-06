import { VisualizerStateFrame } from '@/lib/types';
import { collapseTrailingDuplicate, renumber } from './frameUtils';

/**
 * Backtracking trace generator (spec 006, T065).
 *
 * Searches for pairs summing to a target in a small integer list. Every emitted
 * step is one of RECURSE, BACKTRACK, PRUNE or VISIT, and every PRUNE frame carries
 * the reason in the frame's `rationale` as well as in the state — the reason is
 * the single most useful thing this animation can teach, because pruning soundness
 * is where backtracking implementations actually go wrong.
 *
 * Depth is bounded so the search space stays small: with branching factor $b$ and
 * depth $d$ the node count is $b^d$, and an unbounded search would generate more
 * frames than a learner can step through.
 */
export function generateBacktrackingTrace(input: number[], target: number): VisualizerStateFrame[] {
  const nums = [...input];
  const frames: VisualizerStateFrame[] = [];

  const path: string[] = [];
  const explored: string[] = [];
  const pruned: Array<{ node: string; reason: string }> = [];
  const solutions: string[][] = [];

  const snap = (
    action: VisualizerStateFrame['action_type'],
    description: string,
    rationale: string,
    active: string | null = null,
  ): void => {
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: action,
      description,
      rationale,
      data_structure_type: 'BACKTRACK',
      backtrack_state: {
        path: [...path],
        explored: [...explored],
        pruned: pruned.map((p) => ({ ...p })),
        active_node_id: active,
      },
    });
  };

  if (nums.length === 0) {
    snap(
      'EXHAUST',
      'Input is empty, so there is no first move to try and the search space is empty.',
      'Completeness is vacuous here: with no candidates there can be no solution. The search terminates immediately, which is the O(1) boundary case rather than an error.',
    );
    return renumber(collapseTrailingDuplicate(frames));
  }

  snap(
    'INIT',
    `Searching for pairs summing to ${target} across ${nums.length} values.`,
    'The search enumerates every first choice, then every second choice beneath it. Completeness follows only because every candidate is tried at every level — pruning is what may remove a branch, and only a sound prune may do that.',
  );

  const label = (i: number, j: number): string => `${nums[i]}+${nums[j]}`;

  for (let i = 0; i < nums.length; i++) {
    // Prune level 1 on the remaining-sum argument.
    const remaining = target - nums[i];
    path.push(`pick ${nums[i]}`);
    snap(
      'RECURSE',
      `Trying ${nums[i]} as the first element (index ${i}). Remaining target: ${remaining}.`,
      'Each first choice opens a subtree containing every pair that uses this index. The subtree is complete on its own, which is what lets the search enumerate all solutions rather than stopping at the first.',
      `pick ${nums[i]}`,
    );

    // Duplicate-index pruning: j must exceed i, so the remaining range is i+1..n-1.
    if (nums.length - (i + 1) === 0) {
      pruned.push({
        node: `pick ${nums[i]}`,
        reason: 'No index remains after this one, so no distinct second element can pair with it. Pruned without descending.',
      });
      snap(
        'PRUNE',
        `Pruned: nothing remains to the right of index ${i}, so no pair is possible.`,
        `Once index ${i} is chosen, every later pair must use an index strictly greater than ${i}, otherwise the same pair would be found twice from the other starting index. With none left, the entire subtree is empty — pruning here discards nothing that could have been a solution.`,
      );
    } else {
      let foundHere = false;
      for (let j = i + 1; j < nums.length; j++) {
        const sum = nums[i] + nums[j];
        path.push(`try ${nums[j]}`);

        if (sum === target) {
          foundHere = true;
          solutions.push([`${nums[i]}`, `${nums[j]}`]);
          snap(
            'VISIT',
            `Found a solution: ${nums[i]} + ${nums[j]} = ${target}.`,
            'Every constraint is satisfied at the moment a solution is recorded, which is what makes it valid to report without a separate verification pass. Recording here rather than on unwind is what lets the search enumerate every solution.',
          );
        } else if (sum < target) {
          pruned.push({
            node: `${nums[i]}+${nums[j]}`,
            reason: `Sum ${sum} is below ${target}, and both values are non-decreasing within this fixed first choice, so no later second element can reach it either.`,
          });
          snap(
            'PRUNE',
            `Pruned ${nums[i]} + ${nums[j]} = ${sum}, below the target ${target}.`,
            `Within this subtree the first element is fixed at ${nums[i]}, so the sum only grows as the second element advances. Once the sum is too small it can never become large enough, and the whole remainder of this subtree is dead. This is a monotone argument, and monotonicity is exactly what makes pruning sound rather than hopeful.`,
            `${nums[i]}+${nums[j]}`,
          );
        } else {
          pruned.push({
            node: `${nums[i]}+${nums[j]}`,
            reason: `Sum ${sum} exceeds ${target}. Earlier second elements in this subtree were all below target, so none works.`,
          });
          snap(
            'PRUNE',
            `Pruned ${nums[i]} + ${nums[j]} = ${sum}, above the target ${target}.`,
            `Because the sum is non-decreasing in the second element, every later candidate is larger still. And every earlier candidate in this subtree was already tested and pruned below the target. So this second element and all of its successors are eliminated in one move.`,
            `${nums[i]}+${nums[j]}`,
          );
        }

        path.pop();
        if (frames.length > 400) break;
      }
      if (frames.length > 400) break;

      snap(
        'BACKTRACK',
        `Backtracked out of ${label(i, i + 1) === '' ? '' : `index ${i}`} — all second choices exhausted.`,
        foundHere
          ? 'The subtree is fully explored, so every solution inside it has been recorded. Restoring the stack here is what lets the next first choice start from exactly the same state this one did.'
          : 'Exhausting every second choice without a hit proves no pair begins with this first element. Returning to the previous frame is what allows the search to try the next alternative rather than restarting.',
        `pick ${nums[i]}`,
      );
    }

    explored.push(`pick ${nums[i]}`);
    path.pop();
    if (frames.length > 400) break;
  }

  snap(
    'EXHAUST',
    solutions.length
      ? `Search complete. ${solutions.length} solution${solutions.length === 1 ? '' : 's'} found: ${solutions.map((s) => s.join('+')).join(', ')}.`
      : `Search complete. No pair sums to ${target}.`,
    solutions.length
      ? 'Completeness holds because every first choice was tried and no sound prune ever discarded a branch containing a solution. The result is therefore exhaustive, not merely the first answer found.'
      : 'Every candidate pair was either tested or pruned by a monotone argument showing it could not reach the target. So absence here is proved rather than merely unobserved — which is the whole correctness claim for a pruned search.',
  );

  return renumber(collapseTrailingDuplicate(frames));
}