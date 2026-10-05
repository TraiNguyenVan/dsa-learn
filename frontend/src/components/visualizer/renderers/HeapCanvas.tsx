import React from 'react';
import { HeapElementState } from '@/lib/types';

interface HeapCanvasProps {
  elements: HeapElementState[];
  swappingIndices?: [number, number] | null;
}

export const HeapCanvas: React.FC<HeapCanvasProps> = ({ elements = [], swappingIndices }) => {
  if (elements.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 font-mono text-xs">
        Heap is empty
      </div>
    );
  }

  const canvasWidth = 720;
  const canvasHeight = 260;

  // Compute (x, y) for complete binary tree of elements
  const nodeRadius = 18;
  const coords: Array<{ x: number; y: number }> = elements.map((_, idx) => {
    const level = Math.floor(Math.log2(idx + 1));
    const itemsInLevel = Math.pow(2, level);
    const positionInLevel = idx - (itemsInLevel - 1);
    const xStep = canvasWidth / (itemsInLevel + 1);
    const x = (positionInLevel + 1) * xStep;
    const y = 35 + level * 50;
    return { x, y };
  });

  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      {/* Top: Complete Binary Tree View */}
      <svg
        width={canvasWidth}
        height={canvasHeight}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="select-none"
      >
        {/* Tree Edges (parent -> left, parent -> right) */}
        {elements.map((_, idx) => {
          const leftChild = 2 * idx + 1;
          const rightChild = 2 * idx + 2;

          return (
            <React.Fragment key={`edge_${idx}`}>
              {leftChild < elements.length && (
                <line
                  x1={coords[idx].x}
                  y1={coords[idx].y}
                  x2={coords[leftChild].x}
                  y2={coords[leftChild].y}
                  stroke="#334155"
                  strokeWidth={2}
                />
              )}
              {rightChild < elements.length && (
                <line
                  x1={coords[idx].x}
                  y1={coords[idx].y}
                  x2={coords[rightChild].x}
                  y2={coords[rightChild].y}
                  stroke="#334155"
                  strokeWidth={2}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Tree Nodes */}
        {elements.map((el, idx) => {
          const isSwapping = swappingIndices && (swappingIndices[0] === idx || swappingIndices[1] === idx);
          const isHighlight = el.is_highlighted || isSwapping;

          return (
            <g key={`heap_node_${idx}`} className="transition-all duration-300">
              <circle
                cx={coords[idx].x}
                cy={coords[idx].y}
                r={nodeRadius}
                fill={isHighlight ? 'rgba(251, 191, 36, 0.2)' : '#0F172A'}
                stroke={isHighlight ? '#FBBF24' : '#334155'}
                strokeWidth={isHighlight ? 2.5 : 1.5}
              />
              <text
                x={coords[idx].x}
                y={coords[idx].y + 4}
                textAnchor="middle"
                fill={isHighlight ? '#FBBF24' : '#F8FAFC'}
                className="text-xs font-bold font-mono"
              >
                {el.value}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Bottom: Underlying Flat Array Representation */}
      <div className="mt-4 flex flex-col items-center">
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2">
          Underlying Flat Array Representation
        </span>
        <div className="flex items-center space-x-1 font-mono text-xs">
          {elements.map((el, idx) => {
            const isSwapping = swappingIndices && (swappingIndices[0] === idx || swappingIndices[1] === idx);
            return (
              <div key={`flat_${idx}`} className="flex flex-col items-center">
                <span className="text-[9px] text-slate-500 mb-0.5">[{idx}]</span>
                <div
                  className={`w-10 h-10 rounded border flex items-center justify-center font-bold transition-all ${
                    isSwapping
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                      : el.is_highlighted
                      ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                      : 'border-slate-700 bg-slate-900 text-white'
                  }`}
                >
                  {el.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
