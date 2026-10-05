import { VisualizerStateFrame } from '@/lib/types';

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
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: 'INIT',
      description: `Search exhausted (left > right). Target ${target} is not present in the array.`,
      data_structure_type: 'ARRAY',
      array_state: {
        elements: nums.map((v, i) => ({ value: v, index: i, is_highlighted: false })),
        pointers: [],
      },
    });
  }

  // Populate total_steps
  frames.forEach((f) => (f.total_steps = frames.length));
  return frames;
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
      data_structure_type: 'ARRAY',
      array_state: {
        elements: nums.map((v, i) => ({ value: v, index: i, is_highlighted: false })),
        pointers: [],
      },
    });
  }

  frames.forEach((f) => (f.total_steps = frames.length));
  return frames;
}
