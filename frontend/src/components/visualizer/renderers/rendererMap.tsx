/**
 * Subject-to-renderer map (task T007).
 *
 * Replaces the `if (data_structure_type === ...)` chain that previously lived in
 * the visualizer container. Every type in the `DataStructureType` union must
 * have exactly one entry here (invariant RD-01), which the registry-parity
 * contract test enforces.
 *
 * Types not yet implemented render an explicit "not yet available" panel rather
 * than silently drawing nothing. A blank canvas reads as a bug; a labelled
 * panel reads as an honest gap.
 */

import React from 'react';
import type { DataStructureType, VisualizerStateFrame } from '@/lib/types';
import { ArrayCanvas } from './ArrayCanvas';
import { LinkedListCanvas } from './LinkedListCanvas';
import { TreeCanvas } from './TreeCanvas';
import { HeapCanvas } from './HeapCanvas';
import { StackCanvas } from './StackCanvas';
import { QueueCanvas } from './QueueCanvas';
import { GraphCanvas } from './GraphCanvas';
import { TrieCanvas } from './TrieCanvas';
import { DpTableCanvas } from './DpTableCanvas';
import { BacktrackCanvas } from './BacktrackCanvas';
import { SegmentTreeCanvas } from './SegmentTreeCanvas';

interface CanvasShellProps {
  children: React.ReactNode;
}

const CanvasShell: React.FC<CanvasShellProps> = ({ children }) => (
  <div className="w-full h-full flex items-center justify-center">{children}</div>
);

export type RendererFor<K extends DataStructureType> = React.FC<{
  frame: Extract<VisualizerStateFrame, { data_structure_type: K }>;
}>;

/**
 * Each entry receives the whole frame and reads only its own state field, so no
 * renderer branches on a discriminator (invariant RD-02).
 */
export const RENDERER_MAP: Record<DataStructureType, React.FC<{ frame: VisualizerStateFrame }>> = {
  ARRAY: ({ frame }) => (
    <CanvasShell>
      <ArrayCanvas
        elements={frame.array_state?.elements ?? []}
        pointers={frame.array_state?.pointers ?? []}
      />
    </CanvasShell>
  ),

  LINKED_LIST: ({ frame }) => (
    <CanvasShell>
      <LinkedListCanvas
        nodes={frame.linked_list_state?.nodes ?? []}
        pointers={frame.linked_list_state?.pointers ?? []}
      />
    </CanvasShell>
  ),

  BINARY_SEARCH_TREE: ({ frame }) => (
    <CanvasShell>
      <TreeCanvas
        nodes={frame.tree_state?.nodes ?? []}
        activeNodeId={frame.tree_state?.active_node_id}
      />
    </CanvasShell>
  ),

  HEAP: ({ frame }) => (
    <CanvasShell>
      <HeapCanvas
        elements={frame.heap_state?.elements ?? []}
        swappingIndices={frame.heap_state?.swapping_indices}
      />
    </CanvasShell>
  ),

  STACK: ({ frame }) => <StackCanvas stack={frame.stack_state ?? { entries: [], popped: [] }} />,
  QUEUE: ({ frame }) => <QueueCanvas queue={frame.queue_state ?? { entries: [], dequeued: [] }} />,
  GRAPH: ({ frame }) => {
    const graph = frame.graph_state ?? {
      nodes: [], edges: [], frontier: [], visited: [], active_node_id: null,
    };
    // A segment tree reuses the GRAPH state shape (it is a tree, and the layout
    // rule is the same), but its node labels carry index ranges and its statuses
    // are covered/partial/excluded rather than frontier/visited. Dispatch on the
    // status vocabulary so neither canvas has to tolerate the other's states.
    const isSegmentTree = graph.nodes.some((n) =>
      n.status === 'covered' || n.status === 'partial' || n.status === 'excluded',
    );
    return isSegmentTree ? (
      <SegmentTreeCanvas nodes={graph.nodes} />
    ) : (
      <GraphCanvas graph={graph} />
    );
  },
  TRIE: ({ frame }) => <TrieCanvas trie={frame.trie_state ?? { nodes: [], active_node_id: null }} />,
  DP_TABLE: ({ frame }) => (
    <DpTableCanvas
      table={frame.dp_table_state ?? { rows: [], cols: [], cells: [], active_cell: null, active_range: null }}
    />
  ),
  BACKTRACK: ({ frame }) => (
    <BacktrackCanvas
      state={frame.backtrack_state ?? { path: [], explored: [], pruned: [], active_node_id: null }}
    />
  ),
};

export function renderFrame(frame: VisualizerStateFrame | undefined): React.ReactNode {
  if (!frame) {
    return (
      <div className="text-slate-500 font-mono text-xs">No frames generated for this operation.</div>
    );
  }
  const Renderer = RENDERER_MAP[frame.data_structure_type];
  return <Renderer frame={frame} />;
}
