import React from 'react';
import { TreeNodeState } from '@/lib/types';

interface TreeCanvasProps {
  nodes: TreeNodeState[];
  activeNodeId?: string | null;
}

interface RenderNode extends TreeNodeState {
  x: number;
  y: number;
}

export const TreeCanvas: React.FC<TreeCanvasProps> = ({ nodes = [], activeNodeId }) => {
  if (nodes.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 font-mono text-xs">
        Tree is empty (root = nullptr)
      </div>
    );
  }

  // Calculate layout coordinates
  const canvasWidth = 720;
  const canvasHeight = 280;
  const rootNode = nodes[0]; // first node is root

  // Build map
  const nodeMap = new Map<string, TreeNodeState>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Determine positions using in-order traversal for x-coordinates
  const inOrderIds: string[] = [];
  function inOrder(id: string | null) {
    if (!id || !nodeMap.has(id)) return;
    const n = nodeMap.get(id)!;
    inOrder(n.left_id);
    inOrderIds.push(n.id);
    inOrder(n.right_id);
  }
  inOrder(rootNode.id);

  const xStep = canvasWidth / (Math.max(inOrderIds.length, 1) + 1);
  const xCoords = new Map<string, number>();
  inOrderIds.forEach((id, idx) => {
    xCoords.set(id, (idx + 1) * xStep);
  });

  const positionedNodes: RenderNode[] = nodes.map((n) => {
    const x = xCoords.get(n.id) || canvasWidth / 2;
    const depth = n.height || 0;
    const y = 40 + depth * 55;
    return { ...n, x, y };
  });

  const positionedMap = new Map<string, RenderNode>();
  positionedNodes.forEach((n) => positionedMap.set(n.id, n));

  return (
    <div className="w-full overflow-x-auto flex items-center justify-center p-4">
      <svg
        width={canvasWidth}
        height={canvasHeight}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="select-none"
      >
        {/* Draw Edges */}
        {positionedNodes.map((node) => (
          <React.Fragment key={`edges_${node.id}`}>
            {node.left_id && positionedMap.has(node.left_id) && (
              <line
                x1={node.x}
                y1={node.y}
                x2={positionedMap.get(node.left_id)!.x}
                y2={positionedMap.get(node.left_id)!.y}
                stroke="#334155"
                strokeWidth={2}
              />
            )}
            {node.right_id && positionedMap.has(node.right_id) && (
              <line
                x1={node.x}
                y1={node.y}
                x2={positionedMap.get(node.right_id)!.x}
                y2={positionedMap.get(node.right_id)!.y}
                stroke="#334155"
                strokeWidth={2}
              />
            )}
          </React.Fragment>
        ))}

        {/* Draw Circular Nodes */}
        {positionedNodes.map((node) => {
          const isActive = node.id === activeNodeId || node.is_highlighted;
          const isFound = node.status === 'found';

          let strokeColor = '#334155';
          let fillColor = '#0F172A';
          let textColor = '#F8FAFC';

          if (isFound) {
            strokeColor = '#10B981';
            fillColor = 'rgba(16, 185, 129, 0.2)';
            textColor = '#34D399';
          } else if (isActive) {
            strokeColor = '#FBBF24';
            fillColor = 'rgba(251, 191, 36, 0.2)';
            textColor = '#FBBF24';
          }

          return (
            <g key={`node_${node.id}`} className="transition-all duration-300">
              <circle
                cx={node.x}
                cy={node.y}
                r={20}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isActive || isFound ? 2.5 : 1.5}
              />
              <text
                x={node.x}
                y={node.y + 4.5}
                textAnchor="middle"
                fill={textColor}
                className="text-xs font-bold font-mono"
              >
                {node.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
