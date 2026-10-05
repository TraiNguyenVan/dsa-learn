import { TreeNodeState, VisualizerStateFrame } from '@/lib/types';

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
    data_structure_type: 'BINARY_SEARCH_TREE',
    tree_state: {
      nodes: initialNodes,
      active_node_id: root ? root.id : null,
    },
  });

  if (!root) {
    frames.push({
      step_index: 1,
      total_steps: 2,
      action_type: 'INIT',
      description: `Tree is empty. Target ${target} cannot be found.`,
      data_structure_type: 'BINARY_SEARCH_TREE',
      tree_state: { nodes: [], active_node_id: null },
    });
    return frames;
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
      data_structure_type: 'BINARY_SEARCH_TREE',
      tree_state: {
        nodes: initialNodes,
        active_node_id: null,
      },
    });
  }

  frames.forEach((f) => (f.total_steps = frames.length));
  return frames;
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
      data_structure_type: 'BINARY_SEARCH_TREE',
      tree_state: { nodes: singleNode, active_node_id: 'node_root' },
    });
    return frames;
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

  frames.forEach((f) => (f.total_steps = frames.length));
  return frames;
}
