import React from 'react';
import { LinkedListNodeState, LinkedListPointerState } from '@/lib/types';

interface LinkedListCanvasProps {
  nodes: LinkedListNodeState[];
  pointers: LinkedListPointerState[];
}

export const LinkedListCanvas: React.FC<LinkedListCanvasProps> = ({ nodes = [], pointers = [] }) => {
  if (nodes.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 font-mono text-xs">
        List is empty (head = nullptr)
      </div>
    );
  }

  const nodeWidth = 80;
  const nodeHeight = 50;
  const nodeGap = 44;
  const startX = 40;
  const totalWidth = Math.max(700, nodes.length * (nodeWidth + nodeGap) + 120);
  const totalHeight = 220;

  return (
    <div className="w-full overflow-x-auto flex items-center justify-center p-4">
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="select-none"
      >
        <defs>
          <marker
            id="ll-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#38BDF8" />
          </marker>
        </defs>

        {nodes.map((node, idx) => {
          const x = startX + idx * (nodeWidth + nodeGap);
          const y = 85;

          const isHighlighted = node.is_highlighted;
          let strokeColor = '#334155';
          let fillColor = '#0F172A';
          if (isHighlighted || node.status === 'target') {
            strokeColor = '#38BDF8';
            fillColor = 'rgba(56, 189, 248, 0.15)';
          }

          return (
            <g key={node.id} className="transition-all duration-300">
              {/* Node Outer Container */}
              <rect
                x={x}
                y={y}
                width={nodeWidth}
                height={nodeHeight}
                rx={6}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isHighlighted ? 2.5 : 1.5}
              />

              {/* Data / Next Divider */}
              <line
                x1={x + nodeWidth * 0.6}
                y1={y}
                x2={x + nodeWidth * 0.6}
                y2={y + nodeHeight}
                stroke={strokeColor}
                strokeWidth={1}
              />

              {/* Node Data Value */}
              <text
                x={x + (nodeWidth * 0.6) / 2}
                y={y + nodeHeight / 2 + 5}
                textAnchor="middle"
                fill="#F8FAFC"
                className="text-sm font-bold font-mono"
              >
                {node.value}
              </text>

              {/* Next Pointer Dot */}
              <circle
                cx={x + nodeWidth * 0.8}
                cy={y + nodeHeight / 2}
                r={3.5}
                fill="#38BDF8"
              />

              {/* Arrow to Next Node or Null Indicator */}
              {node.next_id ? (
                <line
                  x1={x + nodeWidth * 0.8}
                  y1={y + nodeHeight / 2}
                  x2={x + nodeWidth + nodeGap - 4}
                  y2={y + nodeHeight / 2}
                  stroke="#38BDF8"
                  strokeWidth={2}
                  markerEnd="url(#ll-arrow)"
                />
              ) : (
                <g>
                  <line
                    x1={x + nodeWidth * 0.8}
                    y1={y + nodeHeight / 2}
                    x2={x + nodeWidth + 24}
                    y2={y + nodeHeight / 2}
                    stroke="#64748B"
                    strokeWidth={1.5}
                  />
                  <text
                    x={x + nodeWidth + 30}
                    y={y + nodeHeight / 2 + 4}
                    fill="#64748B"
                    className="text-[10px] font-mono"
                  >
                    null
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* External Pointer Pins (head, curr, prev, next) */}
        {pointers.map((ptr, pIdx) => {
          const targetNodeIdx = nodes.findIndex((n) => n.id === ptr.target_node_id);
          if (targetNodeIdx === -1) return null;
          const x = startX + targetNodeIdx * (nodeWidth + nodeGap) + (nodeWidth * 0.6) / 2;
          const arrowBottomY = 85 - 6;
          const labelY = arrowBottomY - 26;

          return (
            <g key={pIdx} className="transition-all duration-300">
              <line
                x1={x}
                y1={labelY + 14}
                x2={x}
                y2={arrowBottomY}
                stroke={ptr.color || '#10B981'}
                strokeWidth={2}
                markerEnd="url(#ll-arrow)"
              />
              <rect
                x={x - 24}
                y={labelY - 6}
                width={48}
                height={18}
                rx={4}
                fill="#1E293B"
                stroke={ptr.color || '#10B981'}
                strokeWidth={1.5}
              />
              <text
                x={x}
                y={labelY + 7}
                textAnchor="middle"
                fill={ptr.color || '#10B981'}
                className="text-[10px] font-bold font-mono tracking-wider uppercase"
              >
                {ptr.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
