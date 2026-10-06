import { VisualizerStateFrame } from '@/lib/types';

/**
 * Renderable signature of a frame: every state field, and nothing else.
 *
 * Two frames with the same signature draw the same picture no matter what their
 * descriptions say. Contract invariant F-05 forbids that, and for good reason: a
 * learner stepping through sees the canvas freeze for a frame and has no way to
 * tell a summary step from a rendering bug.
 */
export function frameSignature(frame: VisualizerStateFrame): string {
  return JSON.stringify({
    ds: frame.data_structure_type,
    array: frame.array_state,
    list: frame.linked_list_state,
    tree: frame.tree_state,
    heap: frame.heap_state,
    stack: frame.stack_state,
    queue: frame.queue_state,
    graph: frame.graph_state,
    trie: frame.trie_state,
    dp: frame.dp_table_state,
    backtrack: frame.backtrack_state,
  });
}

/**
 * Remove any trailing frame that renders identically to the one before it,
 * folding its narration into that predecessor so no information is lost.
 *
 * This exists for summary frames. A "search complete" frame is valuable when it
 * follows a visible change, but when the algorithm's last real step already left
 * the picture in its final state -- which happens whenever no pruning or popping
 * occurred on the final iteration -- the summary frame adds a duplicate picture
 * and trips F-05. Merging keeps the text and drops the frozen step.
 *
 * Only *trailing* duplicates are merged, and only when they are adjacent. A
 * duplicate in the middle of a trace is a different bug and is left in place so
 * it shows up in review rather than being silently hidden.
 */
export function collapseTrailingDuplicate(frames: VisualizerStateFrame[]): VisualizerStateFrame[] {
  const out = [...frames];
  while (out.length >= 2 && frameSignature(out[out.length - 1]) === frameSignature(out[out.length - 2])) {
    const last = out.pop()!;
    const prev = out[out.length - 1];
    if (last.description && !prev.description.includes(last.description)) {
      prev.description = `${prev.description} ${last.description}`;
    }
    if (last.rationale && !prev.rationale.includes(last.rationale)) {
      prev.rationale = `${prev.rationale} ${last.rationale}`;
    }
  }
  return out;
}

/** Normalise step_index and total_steps after any frame-list surgery. */
export function renumber(frames: VisualizerStateFrame[]): VisualizerStateFrame[] {
  frames.forEach((f, i) => {
    f.step_index = i;
    f.total_steps = frames.length;
  });
  return frames;
}