import { VisualizerStateFrame } from '@/lib/types';

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
        data_structure_type: 'HEAP',
        heap_state: {
          elements: heap.map((v, i) => ({ value: v, index: i, is_highlighted: i === curr })),
          swapping_indices: null,
        },
      });
      break;
    }
  }

  frames.forEach((f) => (f.total_steps = frames.length));
  return frames;
}
