import { VisualizerStateFrame } from '@/lib/types';
import { collapseTrailingDuplicate, renumber } from './frameUtils';

export function generateBinarySearchTrace(
  sortedNums: number[],
  target: number
): VisualizerStateFrame[] {
  const frames: VisualizerStateFrame[] = [];
  const nums = [...sortedNums].sort((a, b) => a - b);

  // Initial Frame
  frames.push({
    step_index: 0,
    total_steps: 0,
    action_type: 'INIT',
    description: `Binary Search initialized for target ${target} across sorted array of ${nums.length} elements.`,
rationale: 'Nothing has been excluded yet, so every index is still a candidate and the search window is the whole array.',
    data_structure_type: 'ARRAY',
    array_state: {
      elements: nums.map((v, i) => ({ value: v, index: i, is_highlighted: false })),
      pointers: [],
    },
  });

  let left = 0;
  let right = nums.length - 1;
  let foundIndex = -1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midVal = nums[mid];

    // Frame: Pointers updated and mid selected
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: 'COMPARE',
      description: `Evaluating search window [${left}, ${right}]. Calculated mid index ${mid} (value: ${midVal}).`,
rationale: 'Probing the midpoint is what makes this logarithmic: one comparison discards half the candidates. Any other probe would discard strictly less.',
      data_structure_type: 'ARRAY',
      array_state: {
        elements: nums.map((v, i) => ({
          value: v,
          index: i,
          is_highlighted: i === mid,
          status: i >= left && i <= right ? (i === mid ? 'active' : 'candidate') : 'default',
        })),
        pointers: [
          { name: 'left', target_index: left, color: '#38BDF8' },
          { name: 'right', target_index: right, color: '#34D399' },
          { name: 'mid', target_index: mid, color: '#FBBF24' },
        ],
      },
    });

    if (midVal === target) {
      foundIndex = mid;
      frames.push({
        step_index: frames.length,
        total_steps: 0,
        action_type: 'HIGHLIGHT',
        description: `Target ${target} successfully found at index ${mid}!`,
rationale: 'The midpoint equals the target, so the search has located the value outright and no further narrowing is needed.',
        data_structure_type: 'ARRAY',
        array_state: {
          elements: nums.map((v, i) => ({
            value: v,
            index: i,
            is_highlighted: i === mid,
            status: i === mid ? 'sorted' : 'default',
          })),
          pointers: [{ name: 'target', target_index: mid, color: '#10B981' }],
        },
      });
      break;
    } else if (midVal < target) {
      frames.push({
        step_index: frames.length,
        total_steps: 0,
        action_type: 'POINTER_MOVE',
        description: `Mid value ${midVal} < target ${target}. Target must reside in right partition. Shifting left pointer to ${mid + 1}.`,
rationale: 'The array is sorted non-decreasingly, so every index at or left of mid holds a value no larger than midVal. None can be the target, so discarding them is safe rather than merely convenient.',
        data_structure_type: 'ARRAY',
        array_state: {
          elements: nums.map((v, i) => ({
            value: v,
            index: i,
            is_highlighted: false,
            status: i > mid && i <= right ? 'candidate' : 'default',
          })),
          pointers: [
            { name: 'left', target_index: mid + 1, color: '#38BDF8' },
            { name: 'right', target_index: right, color: '#34D399' },
          ],
        },
      });
      left = mid + 1;
    } else {
      frames.push({
        step_index: frames.length,
        total_steps: 0,
        action_type: 'POINTER_MOVE',
        description: `Mid value ${midVal} > target ${target}. Target must reside in left partition. Shifting right pointer to ${mid - 1}.`,
rationale: 'Sorted order means every index at or right of mid holds a value no smaller than midVal. None can be the target, so discarding them preserves correctness.',
        data_structure_type: 'ARRAY',
        array_state: {
          elements: nums.map((v, i) => ({
            value: v,
            index: i,
            is_highlighted: false,
            status: i >= left && i < mid ? 'candidate' : 'default',
          })),
          pointers: [
            { name: 'left', target_index: left, color: '#38BDF8' },
            { name: 'right', target_index: mid - 1, color: '#34D399' },
          ],
        },
      });
      right = mid - 1;
    }
  }

  if (foundIndex === -1) {
    // An empty input never entered the loop, so a "search exhausted" frame here
    // would be visually identical to the opening frame -- two blank screens in a
    // row. Say the absence once, in the opening frame, instead (contract F-05).
    if (nums.length === 0) {
      frames[0].total_steps = 1;
      return frames;
    }
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: 'INIT',
      description: `Search exhausted (left > right). Target ${target} is not present in the array.`,
rationale: 'Each iteration removed only indices that provably cannot hold the target. Once left passes right the candidate set is empty, which proves absence instead of merely failing to find a value.',
      data_structure_type: 'ARRAY',
      array_state: {
        elements: nums.map((v, i) => ({ value: v, index: i, is_highlighted: false })),
        pointers: [],
      },
    });
  }

  // Populate total_steps
  return renumber(collapseTrailingDuplicate(frames));
}

export function generateTwoSumTrace(
  sortedNums: number[],
  target: number
): VisualizerStateFrame[] {
  const frames: VisualizerStateFrame[] = [];
  const nums = [...sortedNums].sort((a, b) => a - b);

  frames.push({
    step_index: 0,
    total_steps: 0,
    action_type: 'INIT',
    description: `Two Pointers initialized on sorted array searching for pair sum = ${target}.`,
rationale: 'Neither end has been excluded, so [0, n-1] is the full candidate set. Placing pointers at opposite ends is what lets one comparison eliminate an entire row and column of pairs.',
    data_structure_type: 'ARRAY',
    array_state: {
      elements: nums.map((v, i) => ({ value: v, index: i, is_highlighted: false })),
      pointers: [
        { name: 'left', target_index: 0, color: '#38BDF8' },
        { name: 'right', target_index: nums.length - 1, color: '#34D399' },
      ],
    },
  });

  let left = 0;
  let right = nums.length - 1;
  let found = false;

  while (left < right) {
    const sum = nums[left] + nums[right];

    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: 'COMPARE',
      description: `Evaluating sum: arr[${left}] (${nums[left]}) + arr[${right}] (${nums[right]}) = ${sum}. Target is ${target}.`,
rationale: 'This single sum determines a whole cross-product of remaining pairs: any pair with a smaller left value is smaller, and any pair with a larger right value is larger.',
      data_structure_type: 'ARRAY',
      array_state: {
        elements: nums.map((v, i) => ({
          value: v,
          index: i,
          is_highlighted: i === left || i === right,
          status: i === left || i === right ? 'active' : 'default',
        })),
        pointers: [
          { name: 'left', target_index: left, color: '#38BDF8' },
          { name: 'right', target_index: right, color: '#34D399' },
        ],
      },
    });

    if (sum === target) {
      found = true;
      frames.push({
        step_index: frames.length,
        total_steps: 0,
        action_type: 'HIGHLIGHT',
        description: `Target pair found at indices [${left}, ${right}]: ${nums[left]} + ${nums[right]} = ${target}.`,
rationale: 'The sum matches the target exactly, so these two indices are the required pair.',
        data_structure_type: 'ARRAY',
        array_state: {
          elements: nums.map((v, i) => ({
            value: v,
            index: i,
            is_highlighted: i === left || i === right,
            status: i === left || i === right ? 'sorted' : 'default',
          })),
          pointers: [
            { name: 'found', target_index: left, color: '#10B981' },
            { name: 'found', target_index: right, color: '#10B981' },
          ],
        },
      });
      break;
    } else if (sum < target) {
      frames.push({
        step_index: frames.length,
        total_steps: 0,
        action_type: 'POINTER_MOVE',
        description: `Sum ${sum} < target ${target}. Since array is sorted, increment left pointer to increase sum.`,
rationale: 'The sum is too small. With the array sorted, raising left while holding right fixed is the only move that increases the sum. Every other pair reusing this left index is also too small, so left can be discarded.',
        data_structure_type: 'ARRAY',
        array_state: {
          elements: nums.map((v, i) => ({ value: v, index: i, is_highlighted: false })),
          pointers: [
            { name: 'left', target_index: left + 1, color: '#38BDF8' },
            { name: 'right', target_index: right, color: '#34D399' },
          ],
        },
      });
      left++;
    } else {
      frames.push({
        step_index: frames.length,
        total_steps: 0,
        action_type: 'POINTER_MOVE',
        description: `Sum ${sum} > target ${target}. Decrement right pointer to reduce sum.`,
rationale: 'The sum is too large. Lowering right while holding left fixed is the only move that decreases the sum, so every other pair reusing this right index is also too large and right can be discarded.',
        data_structure_type: 'ARRAY',
        array_state: {
          elements: nums.map((v, i) => ({ value: v, index: i, is_highlighted: false })),
          pointers: [
            { name: 'left', target_index: left, color: '#38BDF8' },
            { name: 'right', target_index: right - 1, color: '#34D399' },
          ],
        },
      });
      right--;
    }
  }

  if (!found) {
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: 'INIT',
      description: `Pointers met (left >= right). No pair in the array sums to ${target}.`,
rationale: 'Each iteration eliminated only pairs that provably cannot reach the target. Once the pointers meet no pair remains, which proves no solution exists rather than merely failing to find one.',
      data_structure_type: 'ARRAY',
      array_state: {
        elements: nums.map((v, i) => ({ value: v, index: i, is_highlighted: false })),
        pointers: [],
      },
    });
  }

  return renumber(collapseTrailingDuplicate(frames));
}
