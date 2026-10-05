import React from 'react';
import { ArrayElementState, ArrayPointerState } from '@/lib/types';

interface ArrayCanvasProps {
  elements: ArrayElementState[];
  pointers: ArrayPointerState[];
}

export const ArrayCanvas: React.FC<ArrayCanvasProps> = ({ elements = [], pointers = [] }) => {
  if (elements.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 font-mono text-xs">
        Array is empty
      </div>
    );
  }

  const cellSize = 56;
  const gap = 8;
  const paddingX = 40;
  const totalWidth = Math.max(700, elements.length * (cellSize + gap) + paddingX * 2);
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
            id="pointer-arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#38BDF8" />
          </marker>
        </defs>

        {/* Array Cells */}
        {elements.map((el, idx) => {
          const x = paddingX + idx * (cellSize + gap);
          const y = 90;

          let strokeColor = '#334155';
          let fillColor = '#0F172A';
          let textColor = '#F8FAFC';

          if (el.status === 'active' || el.is_highlighted) {
            strokeColor = '#FBBF24';
            fillColor = 'rgba(251, 191, 36, 0.15)';
            textColor = '#FBBF24';
          } else if (el.status === 'sorted') {
            strokeColor = '#10B981';
            fillColor = 'rgba(16, 185, 129, 0.15)';
            textColor = '#34D399';
          } else if (el.status === 'candidate') {
            strokeColor = '#38BDF8';
            fillColor = 'rgba(56, 189, 248, 0.1)';
            textColor = '#7DD3FC';
          }

          return (
            <g key={idx} className="transition-all duration-300">
              {/* Index Label */}
              <text
                x={x + cellSize / 2}
                y={y - 12}
                textAnchor="middle"
                fill="#64748B"
                className="text-[11px] font-mono"
              >
                [{el.index}]
              </text>

              {/* Cell Box */}
              <rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={6}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={el.is_highlighted ? 2.5 : 1.5}
              />

              {/* Value Text */}
              <text
                x={x + cellSize / 2}
                y={y + cellSize / 2 + 5}
                textAnchor="middle"
                fill={textColor}
                className="text-base font-bold font-mono"
              >
                {el.value}
              </text>
            </g>
          );
        })}

        {/* Pointers Below Cells */}
        {pointers.map((ptr, pIdx) => {
          const targetEl = elements[ptr.target_index];
          if (!targetEl) return null;
          const x = paddingX + ptr.target_index * (cellSize + gap) + cellSize / 2;
          const arrowTopY = 90 + cellSize + 8;
          const labelY = arrowTopY + 32;

          return (
            <g key={pIdx} className="transition-all duration-300">
              {/* Upward Arrow */}
              <line
                x1={x}
                y1={labelY - 14}
                x2={x}
                y2={arrowTopY}
                stroke={ptr.color || '#38BDF8'}
                strokeWidth={2}
                markerEnd="url(#pointer-arrow)"
              />

              {/* Pointer Name Pill */}
              <rect
                x={x - 24}
                y={labelY - 10}
                width={48}
                height={20}
                rx={4}
                fill="#1E293B"
                stroke={ptr.color || '#38BDF8'}
                strokeWidth={1.5}
              />
              <text
                x={x}
                y={labelY + 4}
                textAnchor="middle"
                fill={ptr.color || '#38BDF8'}
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
