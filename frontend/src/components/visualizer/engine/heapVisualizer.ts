import { VisualizerStateFrame } from '@/lib/types';
import { collapseTrailingDuplicate, renumber } from './frameUtils';

export function generateHeapInsertTrace(
  initialHeap: number[],
  val: number
): VisualizerStateFrame[] {
  const frames: VisualizerStateFrame[] = [];
  const heap = [...initialHeap];

  frames.push({
    step_index: 0,
    total_steps: 0,
    action_type: 'INIT',
    description: `Min-Heap initialized with ${heap.length} elements. Inserting value ${val}.`,
    rationale: 'The new value is known but not yet placed, so the heap is shown in its valid pre-insertion state and the violation is yet to exist.',
    data_structure_type: 'HEAP',
    heap_state: {
      elements: heap.map((v, i) => ({ value: v, index: i, is_highlighted: false })),
      swapping_indices: null,
    },
  });

  // Step 1: Push to end of flat array
  heap.push(val);
  let curr = heap.length - 1;

  frames.push({
    step_index: frames.length,
    total_steps: 0,
    action_type: 'INSERT',
    description: `Appended ${val} to bottom-most, right-most position (index ${curr}) to maintain complete binary tree property.`,
    rationale: 'Appending at the next free slot is the only position that preserves the complete-tree shape. It may break the ordering invariant, but breaking shape is unrecoverable while breaking order is fixable by sifting.',
    data_structure_type: 'HEAP',
    heap_state: {
      elements: heap.map((v, i) => ({ value: v, index: i, is_highlighted: i === curr })),
      swapping_indices: null,
    },
  });

  // Step 2: Sift up / Bubble up
  while (curr > 0) {
    const parent = Math.floor((curr - 1) / 2);

    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: 'COMPARE',
      description: `Comparing child at index ${curr} (${heap[curr]}) with parent at index ${parent} (${heap[parent]}).`,
      rationale: 'The min-heap invariant constrains only the parent-child relation, never siblings, so this is the single comparison that determines whether sifting is needed at all.',
      data_structure_type: 'HEAP',
      heap_state: {
        elements: heap.map((v, i) => ({ value: v, index: i, is_highlighted: i === curr || i === parent })),
        swapping_indices: [curr, parent],
      },
    });

    if (heap[curr] < heap[parent]) {
      // Swap
      const temp = heap[curr];
      heap[curr] = heap[parent];
      heap[parent] = temp;

      frames.push({
        step_index: frames.length,
        total_steps: 0,
        action_type: 'SWAP',
        description: `Child ${heap[parent]} < parent ${heap[curr]}. Violated min-heap invariant! Swapping indices ${curr} and ${parent}.`,
        rationale: 'A child below its parent violates the min-heap property. The new value can only ever be too small near the root, because it was just placed at the last slot, so restoring the invariant means moving it upward.',
        data_structure_type: 'HEAP',
        heap_state: {
          elements: heap.map((v, i) => ({ value: v, index: i, is_highlighted: i === curr || i === parent })),
          swapping_indices: [curr, parent],
        },
      });

      curr = parent;
    } else {
      frames.push({
        step_index: frames.length,
        total_steps: 0,
        action_type: 'HIGHLIGHT',
        description: `Heap invariant restored! Node ${heap[curr]} >= parent ${heap[parent]}. Sift up complete.`,
        rationale: 'The value has risen to a position where it is at least as large as its parent. Because it stopped moving at a leaf or at the root, no ancestor relation remains violated, so the whole heap is valid again.',
        data_structure_type: 'HEAP',
        heap_state: {
          elements: heap.map((v, i) => ({ value: v, index: i, is_highlighted: i === curr })),
          swapping_indices: null,
        },
      });
      break;
    }
  }

  return renumber(collapseTrailingDuplicate(frames));
}
