import { TreeNodeState, VisualizerStateFrame } from '@/lib/types';
import { collapseTrailingDuplicate, renumber } from './frameUtils';

/**
 * Normalise a frame list before returning it (contract F-02).
 *
 * Every generator needs `total_steps` to equal the final frame count, but
 * generators build frames with `total_steps: 0` placeholders because the count is
 * not known until the last frame exists. Routing every return path through this
 * helper means an early return cannot leave a frame carrying a stale count --
 * which is exactly what happened on the empty-tree paths, where the early return
 * skipped the post-hoc normalisation and left frame 0 reporting `total_steps: 0`
 * while frame 1 reported 2.
 */
function finalize(frames: VisualizerStateFrame[]): VisualizerStateFrame[] {
  return renumber(collapseTrailingDuplicate(frames));
}

interface InternalBSTNode {
  id: string;
  value: number;
  left: InternalBSTNode | null;
  right: InternalBSTNode | null;
}

function bstToFlatNodes(root: InternalBSTNode | null): TreeNodeState[] {
  if (!root) return [];
  const list: TreeNodeState[] = [];

  function dfs(node: InternalBSTNode, height: number) {
    list.push({
      id: node.id,
      value: node.value,
      left_id: node.left ? node.left.id : null,
      right_id: node.right ? node.right.id : null,
      is_highlighted: false,
      status: 'default',
      height,
    });
    if (node.left) dfs(node.left, height + 1);
    if (node.right) dfs(node.right, height + 1);
  }

  dfs(root, 0);
  return list;
}

function buildBSTFromKeys(keys: number[]): InternalBSTNode | null {
  if (keys.length === 0) return null;
  let idCounter = 1;

  function insertNode(root: InternalBSTNode | null, val: number): InternalBSTNode {
    if (!root) {
      return { id: `tree_node_${idCounter++}`, value: val, left: null, right: null };
    }
    if (val < root.value) {
      root.left = insertNode(root.left, val);
    } else if (val > root.value) {
      root.right = insertNode(root.right, val);
    }
    return root;
  }

  let root: InternalBSTNode | null = null;
  for (const k of keys) {
    root = insertNode(root, k);
  }
  return root;
}

export function generateBSTSearchTrace(initialKeys: number[], target: number): VisualizerStateFrame[] {
  const frames: VisualizerStateFrame[] = [];
  const root = buildBSTFromKeys(initialKeys);
  const initialNodes = bstToFlatNodes(root);

  frames.push({
    step_index: 0,
    total_steps: 0,
    action_type: 'INIT',
    description: `Binary Search Tree initialized with ${initialKeys.length} keys. Searching for target ${target}.`,
    rationale: 'Search starts at the root because the BST ordering invariant makes the root the only node that partitions the whole tree into two self-contained subtrees.',
    data_structure_type: 'BINARY_SEARCH_TREE',
    tree_state: {
      nodes: initialNodes,
      active_node_id: root ? root.id : null,
    },
  });

  if (!root) {
    // An empty tree renders identically before and after "there is nothing to
    // search", so a second frame would show the same blank canvas twice
    // (contract F-05). Say it once, in the opening frame.
    frames[0] = {
      step_index: 0,
      total_steps: 1,
      action_type: 'INIT',
      description: `Tree is empty. Target ${target} cannot be found.`,
      rationale: 'With no root there is no path to traverse. The search terminates immediately, which is the O(1) best case of an empty tree.',
      data_structure_type: 'BINARY_SEARCH_TREE',
      tree_state: { nodes: [], active_node_id: null },
    };
    return finalize(frames);
  }

  let curr: InternalBSTNode | null = root;
  let found = false;

  while (curr) {
    const isMatch = curr.value === target;
    const currId = curr.id;
    const currVal = curr.value;

    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: 'COMPARE',
      description: `Inspecting node ${currVal}. Comparing with target ${target}.`,
      rationale: 'Each comparison decides which half can be discarded. That is what bounds the search by the tree height rather than by the node count.',
      data_structure_type: 'BINARY_SEARCH_TREE',
      tree_state: {
        nodes: initialNodes.map((n) => ({
          ...n,
          is_highlighted: n.id === currId,
          status: n.id === currId ? (isMatch ? 'found' : 'active') : 'default',
        })),
        active_node_id: currId,
      },
    });

    if (isMatch) {
      found = true;
      break;
    } else if (target < currVal) {
      frames.push({
        step_index: frames.length,
        total_steps: 0,
        action_type: 'POINTER_MOVE',
        description: `Target ${target} < current node ${currVal}. Moving to left subtree.`,
        rationale: 'The BST invariant guarantees every key in this node\'s right subtree exceeds it, so if the target is smaller the entire right subtree can be discarded without inspecting it.',
        data_structure_type: 'BINARY_SEARCH_TREE',
        tree_state: {
          nodes: initialNodes.map((n) => ({ ...n, is_highlighted: n.id === currId })),
          active_node_id: curr.left ? curr.left.id : null,
        },
      });
      curr = curr.left;
    } else {
      frames.push({
        step_index: frames.length,
        total_steps: 0,
        action_type: 'POINTER_MOVE',
        description: `Target ${target} > current node ${currVal}. Moving to right subtree.`,
        rationale: 'By the same invariant every key in the left subtree is smaller, so a larger target cannot be there and the whole left subtree is discarded.',
        data_structure_type: 'BINARY_SEARCH_TREE',
        tree_state: {
          nodes: initialNodes.map((n) => ({ ...n, is_highlighted: n.id === currId })),
          active_node_id: curr.right ? curr.right.id : null,
        },
      });
      curr = curr.right;
    }
  }

  if (!found) {
    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: 'INIT',
      description: `Reached null reference. Target ${target} is not in the BST.`,
      rationale: 'Reaching null means every subtree along the path was discarded by a valid ordering argument, so absence is proven rather than merely unobserved. This is also what terminates the search.',
      data_structure_type: 'BINARY_SEARCH_TREE',
      tree_state: {
        nodes: initialNodes,
        active_node_id: null,
      },
    });
  }

  return finalize(frames);
}

export function generateBSTInsertTrace(initialKeys: number[], key: number): VisualizerStateFrame[] {
  const frames: VisualizerStateFrame[] = [];
  const root = buildBSTFromKeys(initialKeys);
  const initialNodes = bstToFlatNodes(root);

  frames.push({
    step_index: 0,
    total_steps: 0,
    action_type: 'INIT',
    description: `BST insert initialized for key ${key}. Starting comparison from root.`,
    rationale: 'Insertion follows the same path as search, because the position of a key is determined by exactly the same ordering comparisons.',
    data_structure_type: 'BINARY_SEARCH_TREE',
    tree_state: {
      nodes: initialNodes,
      active_node_id: root ? root.id : null,
    },
  });

  if (!root) {
    const singleNode: TreeNodeState[] = [
      { id: 'node_root', value: key, left_id: null, right_id: null, is_highlighted: true, status: 'found', height: 0 },
    ];
    frames.push({
      step_index: 1,
      total_steps: 2,
      action_type: 'INSERT',
      description: `Tree was empty. Created root node with key ${key}.`,
      rationale: 'An empty tree has no ordering constraints to satisfy, so the new key becomes the root directly with no comparisons required.',
      data_structure_type: 'BINARY_SEARCH_TREE',
      tree_state: { nodes: singleNode, active_node_id: 'node_root' },
    });
    return finalize(frames);
  }

  let curr: InternalBSTNode = root;
  while (true) {
    const currId = curr.id;
    const currVal = curr.value;

    frames.push({
      step_index: frames.length,
      total_steps: 0,
      action_type: 'COMPARE',
      description: `Comparing insert key ${key} with node ${currVal}.`,
      rationale: 'Each comparison preserves the invariant for the subtree not descended into: descending left guarantees the new key will be smaller than everything skipped.',
      data_structure_type: 'BINARY_SEARCH_TREE',
      tree_state: {
        nodes: initialNodes.map((n) => ({
          ...n,
          is_highlighted: n.id === currId,
          status: n.id === currId ? 'active' : 'default',
        })),
        active_node_id: currId,
      },
    });

    if (key === currVal) {
      frames.push({
        step_index: frames.length,
        total_steps: 0,
        action_type: 'HIGHLIGHT',
        description: `Key ${key} already exists in the BST. Duplicate ignored according to BST invariant.`,
        rationale: 'Equal keys occupy the same position under this BST definition, so there is nowhere valid to attach a second copy. Ignoring the duplicate preserves the ordering invariant.',
        data_structure_type: 'BINARY_SEARCH_TREE',
        tree_state: { nodes: initialNodes, active_node_id: currId },
      });
      break;
    } else if (key < currVal) {
      if (!curr.left) {
        const newInternal: InternalBSTNode = { id: `node_new_${key}`, value: key, left: null, right: null };
        curr.left = newInternal;
        const updatedNodes = bstToFlatNodes(root);
        frames.push({
          step_index: frames.length,
          total_steps: 0,
          action_type: 'INSERT',
          description: `Found insertion point! Attached new node ${key} as left child of ${currVal}.`,
          rationale: 'At a null link every key passed on the way was greater, so attaching here leaves the new key greater than its new parent and smaller than all ancestors, satisfying the invariant everywhere.',
          data_structure_type: 'BINARY_SEARCH_TREE',
          tree_state: {
            nodes: updatedNodes.map((n) => ({
              ...n,
              is_highlighted: n.id === newInternal.id,
              status: n.id === newInternal.id ? 'found' : 'default',
            })),
            active_node_id: newInternal.id,
          },
        });
        break;
      }
      curr = curr.left;
    } else {
      if (!curr.right) {
        const newInternal: InternalBSTNode = { id: `node_new_${key}`, value: key, left: null, right: null };
        curr.right = newInternal;
        const updatedNodes = bstToFlatNodes(root);
        frames.push({
          step_index: frames.length,
          total_steps: 0,
          action_type: 'INSERT',
          description: `Found insertion point! Attached new node ${key} as right child of ${currVal}.`,
          rationale: 'By the mirrored argument, every key passed on the way was smaller, so the new key is greater than its new parent and greater than all ancestors, again satisfying the invariant everywhere.',
          data_structure_type: 'BINARY_SEARCH_TREE',
          tree_state: {
            nodes: updatedNodes.map((n) => ({
              ...n,
              is_highlighted: n.id === newInternal.id,
              status: n.id === newInternal.id ? 'found' : 'default',
            })),
            active_node_id: newInternal.id,
          },
        });
        break;
      }
      curr = curr.right;
    }
  }

  return finalize(frames);
}
