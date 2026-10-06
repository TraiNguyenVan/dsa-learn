import { VisualizerStateFrame } from '@/lib/types';

/**
 * Merge-sort trace generator (spec 006, T086).
 *
 * Emits one frame per merge step. The SWAP action marks the point where control
 * returns from the recursive call that sorted each half and the merge begins —
 * without that frame a learner cannot see that the halves were already sorted.
 */
export function generateMergeSortTrace(input: number[]): VisualizerStateFrame[] {
  const nums = [...input];
  const frames: VisualizerStateFrame[] = [];
  let comparisons = 0;
  let merges = 0;

  const snap = (
    action: VisualizerStateFrame['action_type'],
    description: string,
    rationale: string,
    active: number[] = [],
  ): void => {
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: action,
      description,
      rationale,
      data_structure_type: 'ARRAY',
      array_state: {
        elements: nums.map((v, i) => ({
          value: v,
          index: i,
          is_highlighted: active.includes(i),
          status: active.includes(i) ? 'active' : 'default',
        })),
        pointers: [],
      },
    });
  };

  // Runs of length 0 and 1 are both already sorted, and neither executes a merge.
  // Emitting an opening frame and then a closing frame for them would produce two
  // frames with identical state -- nothing to highlight in either -- which trips
  // F-05 and reads as a stalled animation. One frame states the whole situation.
  if (nums.length <= 1) {
    snap(
      nums.length === 0 ? 'INIT' : 'HIGHLIGHT',
      nums.length === 0
        ? 'Input is empty: nothing to sort, and no merge ever runs. Result is the empty array.'
        : `Input has one element (${nums[0]}), which is already sorted, so no merge runs. Result: [${nums[0]}].`,
      nums.length === 0
        ? 'Merge sort is correct by induction on run length, and length 0 is the base case anchoring that induction. The boundary needs no special case inside the merge itself, only in the recursion cutoff.'
        : 'A run of length 1 is sorted by definition, so the recursion returns immediately. This is the other base case, and it is why mergesort behaves identically on sorted and unsorted input.',
      nums.length === 1 ? [0] : [],
    );
    return finalize(frames);
  }

  snap(
    'INIT',
    `Merge sort initialised over ${nums.length} elements.`,
    'Splitting is free; all the work is in the merges. Each merge costs linear time in the combined run length because every element is emitted exactly once.',
  );

  const work = [...nums];

  const sort = (lo: number, hi: number): void => {
    if (hi - lo <= 1) return;
    const mid = Math.floor((lo + hi) / 2);

    sort(lo, mid);
    sort(mid, hi);

    const left = work.slice(lo, mid);
    const right = work.slice(mid, hi);
    merges++;
    snap(
      'SWAP',
      `Merging sorted runs [${lo},${mid}) = [${left.join(', ')}] and [${mid},${hi}) = [${right.join(', ')}].`,
      'Both halves are sorted, so this is a merge of two sorted runs rather than a fresh sort. The merge invariant holds at entry: every element already emitted is no greater than every element not yet emitted. The two runs are highlighted so the boundary being merged is visible.',
      // Highlight both runs: without this the first SWAP frame renders the array
      // exactly as the opening frame did, tripping F-05 and reading as a stall.
      Array.from({ length: hi - lo }, (_, k) => lo + k),
    );

    let i = 0;
    let j = 0;
    let k = lo;
    while (i < left.length && j < right.length) {
      comparisons++;
      const frontLeft = left[i];
      const frontRight = right[j];
      const takeLeft = frontLeft <= frontRight;
      work[k] = takeLeft ? frontLeft : frontRight;
      if (takeLeft) i++;
      else j++;
      snap(
        'MERGE',
        `Took ${work[k]} into position ${k}. Compared ${frontLeft} against ${frontRight}.`,
        takeLeft
          ? `${frontLeft} is the smaller of the two front elements, so it is the minimum of everything remaining: the other run is sorted, so every element after its front is at least as large.`
          : `${frontRight} is strictly smaller, so taking it keeps the output non-decreasing. Emitting the smaller front element each time is what guarantees the merged run is sorted.`,
        [k],
      );
      k++;
    }
    while (i < left.length) {
      work[k] = left[i];
      snap(
        'MERGE',
        `Right run exhausted; copied remaining ${work[k]} into position ${k}.`,
        'Once one run is empty the remainder of the other is already sorted and entirely within bounds, so it is copied in order with no further comparisons. That is why merging two sorted runs is linear in their combined length rather than quadratic.',
        [k],
      );
      i++;
      k++;
    }
    while (j < right.length) {
      work[k] = right[j];
      snap(
        'MERGE',
        `Left run exhausted; copied remaining ${work[k]} into position ${k}.`,
        'Symmetric to the left-exhausted case: the surviving run is already sorted, so the tail is copied directly.',
        [k],
      );
      j++;
      k++;
    }

    snap(
      'HIGHLIGHT',
      `Run [${lo},${hi}) is now sorted: [${work.slice(lo, hi).join(', ')}].`,
      'By the merge invariant the output of this merge is sorted, which is exactly the precondition the next level up needs. Induction on run length closes: the top-level call returns a fully sorted array.',
      // Highlight the run just finalised. Without this, two consecutive merges of
      // identical-looking runs produce identical frames (F-05) and the learner sees
      // the animation stall between levels.
      Array.from({ length: hi - lo }, (_, k) => lo + k),
    );
  };

  sort(0, nums.length);

  snap(
    'EXHAUST',
    `Sorted in ${merges} merge${merges === 1 ? '' : 's'} and ${comparisons} comparison${comparisons === 1 ? '' : 's'}. Result: [${nums.join(', ')}].`,
    `The recursion tree has log2(n) levels, each costing Theta(n) in total, so the whole sort is Theta(n log n) on every input. That is the comparison-sort lower bound, which mergesort attains — and it holds even on already sorted input, unlike insertion sort.`,
  );

  return finalize(frames);
}

function finalize(frames: VisualizerStateFrame[]): VisualizerStateFrame[] {
  frames.forEach((f, i) => {
    f.step_index = i;
    f.total_steps = frames.length;
  });
  return frames;
}