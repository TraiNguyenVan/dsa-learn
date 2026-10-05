import React from 'react';
import { Blocks } from 'lucide-react';

interface FoundationBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const FoundationBadge: React.FC<FoundationBadgeProps> = ({ className = '', size = 'sm' }) => {
  if (size === 'md') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 ${className}`}
        title="Foundational implementation exercise: Build the data structure from scratch"
      >
        <Blocks className="w-3.5 h-3.5" />
        <span>Foundation</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium tracking-wide bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 ${className}`}
      title="Foundational: Build from scratch"
    >
      <Blocks className="w-2.5 h-2.5" />
      <span>Foundation</span>
    </span>
  );
};
