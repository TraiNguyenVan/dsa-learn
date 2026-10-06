import { LinkedListNodeState, VisualizerStateFrame } from '@/lib/types';
import { collapseTrailingDuplicate, renumber } from './frameUtils';

export function generateInsertHeadTrace(
  initialVals: number[],
  newVal: number
): VisualizerStateFrame[] {
  const frames: VisualizerStateFrame[] = [];
  const nodes: LinkedListNodeState[] = initialVals.map((v, idx) => ({
    id: `node_${idx}`,
    value: v,
    next_id: idx < initialVals.length - 1 ? `node_${idx + 1}` : null,
    is_highlighted: false,
    status: 'default',
  }));

  // Frame 0: Initial list
  frames.push({
    step_index: 0,
    total_steps: 0,
    action_type: 'INIT',
    description: `Initial linked list with ${nodes.length} nodes. Head points to ${nodes.length > 0 ? nodes[0].value : 'null'}.`,
    rationale: 'The head pointer is the only structure-level link the operation must respect, so establishing it first shows exactly what is about to be displaced.',
    data_structure_type: 'LINKED_LIST',
    linked_list_state: {
      nodes: JSON.parse(JSON.stringify(nodes)),
      pointers: nodes.length > 0 ? [{ name: 'head', target_node_id: nodes[0].id, color: '#10B981' }] : [],
    },
  });

  // Frame 1: Allocate new node
  const newNode: LinkedListNodeState = {
    id: 'new_node',
    value: newVal,
    next_id: null,
    is_highlighted: true,
    status: 'target',
    label: 'new',
  };
  // Frame 1 must snapshot the node, not alias it. Every later frame mutates
  // `newNode` in place, so sharing the reference made frame 1 retroactively show
  // the finished link while its own description claimed `newNode->next = nullptr`
  // -- and made the relink step below render no visible change at all
  // (contract F-05, FR-016).
  const withAllocated = [JSON.parse(JSON.stringify(newNode)), ...JSON.parse(JSON.stringify(nodes))];

  frames.push({
    step_index: frames.length,
    total_steps: 0,
    action_type: 'INSERT',
    description: `Allocated new node with value ${newVal} on heap (newNode->val = ${newVal}, newNode->next = nullptr).`,
    rationale: 'A node cannot be linked until it exists and is allocated. Leaving next null makes it a well-formed one-node list in its own right, so the structure is valid at every point of the operation.',
    data_structure_type: 'LINKED_LIST',
    linked_list_state: {
      nodes: withAllocated,
      pointers: [
        ...(nodes.length > 0 ? [{ name: 'head', target_node_id: nodes[0].id, color: '#10B981' }] : []),
        { name: 'new', target_node_id: newNode.id, color: '#38BDF8' },
      ],
    },
  });

  // Frame 2: Link new node's next to head
  const oldHeadId = nodes.length > 0 ? nodes[0].id : null;
  newNode.next_id = oldHeadId;
  const withLinked = [newNode, ...JSON.parse(JSON.stringify(nodes))];

  frames.push({
    step_index: frames.length,
    total_steps: 0,
    action_type: 'POINTER_MOVE',
    description: `Set newNode->next to current head (${oldHeadId ? `node ${nodes[0].value}` : 'nullptr'}).`,
    rationale: 'This is the step that attaches the new node to the rest of the list. Until it happens the new node is unreachable and the operation has not yet changed anything observable.',
    data_structure_type: 'LINKED_LIST',
    linked_list_state: {
      nodes: withLinked,
      pointers: [
        ...(oldHeadId ? [{ name: 'head', target_node_id: oldHeadId, color: '#10B981' }] : []),
        { name: 'new', target_node_id: newNode.id, color: '#38BDF8' },
      ],
    },
  });

  // Frame 3: Update head pointer to new node
  newNode.status = 'default';
  newNode.is_highlighted = false;
  newNode.label = undefined;
  const finalized = [newNode, ...JSON.parse(JSON.stringify(nodes))];

  frames.push({
    step_index: frames.length,
    total_steps: 0,
    action_type: 'HIGHLIGHT',
    description: `Updated head pointer to point to newNode (head = newNode). Insert at head complete in O(1) time.`,
    rationale: 'Repointing head makes the new node reachable from the entry point, which is what makes the insertion visible to every later traversal. No existing link changed, so the operation is O(1) regardless of list length.',
    data_structure_type: 'LINKED_LIST',
    linked_list_state: {
      nodes: finalized,
      pointers: [{ name: 'head', target_node_id: newNode.id, color: '#10B981' }],
    },
  });

  return renumber(collapseTrailingDuplicate(frames));
}

export function generateReverseListTrace(initialVals: number[]): VisualizerStateFrame[] {
  const frames: VisualizerStateFrame[] = [];
  const nodes: LinkedListNodeState[] = initialVals.map((v, idx) => ({
    id: `node_${idx}`,
    value: v,
    next_id: idx < initialVals.length - 1 ? `node_${idx + 1}` : null,
    is_highlighted: false,
    status: 'default',
  }));

  frames.push({
    step_index: 0,
    total_steps: 0,
    action_type: 'INIT',
    description: `Reversal initialized. Pointers: prev = nullptr, curr = head.`,
    rationale: 'prev starts null because there is nothing yet to point back to, and curr starts at head because that is the only node whose successor is currently known. Reversal needs to see one node ahead before it can safely overwrite any link.',
    data_structure_type: 'LINKED_LIST',
    linked_list_state: {
      nodes: JSON.parse(JSON.stringify(nodes)),
      pointers: nodes.length > 0 ? [{ name: 'curr', target_node_id: nodes[0].id, color: '#38BDF8' }] : [],
    },
  });

  if (nodes.length <= 1) {
    return renumber(collapseTrailingDuplicate(frames));
  }

  const currentNodes: LinkedListNodeState[] = JSON.parse(JSON.stringify(nodes));
  let prevId: string | null = null;
  let currIndex = 0;

  while (currIndex < currentNodes.length) {
    const curr = currentNodes[currIndex];
    const nextId = curr.next_id;

    // Frame: Step start
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: 'POINTER_MOVE',
      description: `Saving next = curr->next (${nextId || 'nullptr'}). Preparing to reverse curr (node ${curr.value}).`,
      rationale: 'curr->next is about to be overwritten. Saving it first is what prevents the remaining suffix from being lost, which is the entire reason reversal needs three pointers rather than two.',
      data_structure_type: 'LINKED_LIST',
      linked_list_state: {
        nodes: JSON.parse(JSON.stringify(currentNodes)),
        pointers: [
          ...(prevId ? [{ name: 'prev', target_node_id: prevId, color: '#A855F7' }] : []),
          { name: 'curr', target_node_id: curr.id, color: '#38BDF8' },
          ...(nextId ? [{ name: 'next', target_node_id: nextId, color: '#FBBF24' }] : []),
        ],
      },
    });

    // Invert link
    curr.next_id = prevId;

    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: 'SWAP',
      description: `Inverted pointer: curr->next = prev (${prevId || 'nullptr'}).`,
      rationale: 'This is the step that actually reverses: curr now points backwards to the node already processed. Re-linking in place is what keeps the reversal O(1) space instead of building a new list.',
      data_structure_type: 'LINKED_LIST',
      linked_list_state: {
        nodes: JSON.parse(JSON.stringify(currentNodes)),
        pointers: [
          ...(prevId ? [{ name: 'prev', target_node_id: prevId, color: '#A855F7' }] : []),
          { name: 'curr', target_node_id: curr.id, color: '#38BDF8' },
          ...(nextId ? [{ name: 'next', target_node_id: nextId, color: '#FBBF24' }] : []),
        ],
      },
    });

    // Advance pointers
    prevId = curr.id;
    currIndex++;
  }

  // Final frame: head = prev
  frames.push({
    step_index: frames.length,
    total_steps: 0,
    action_type: 'HIGHLIGHT',
    description: `Reversal complete! Updated head pointer to prev (node ${currentNodes[currentNodes.length - 1].value}).`,
    rationale: 'After the walk, prev holds the last node processed, which is the original tail. That node is now the head of the reversed list, so moving head to prev completes the reversal without a second pass.',
    data_structure_type: 'LINKED_LIST',
    linked_list_state: {
      nodes: JSON.parse(JSON.stringify(currentNodes)),
      pointers: [{ name: 'head', target_node_id: prevId, color: '#10B981' }],
    },
  });

  return renumber(collapseTrailingDuplicate(frames));
}
