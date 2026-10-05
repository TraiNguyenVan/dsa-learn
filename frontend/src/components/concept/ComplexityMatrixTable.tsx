import React from 'react';
import { ComplexityEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface ComplexityMatrixTableProps {
  entries: ComplexityEntry[];
}

function getComplexityBadgeVariant(complexity: string): string {
  if (complexity.includes('O(1)')) {
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  }
  if (complexity.includes('log')) {
    return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
  }
  if (complexity.includes('O(N^2)') || complexity.includes('O(2^N)')) {
    return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  }
  if (complexity.includes('O(N)')) {
    return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  }
  return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
}

export const ComplexityMatrixTable: React.FC<ComplexityMatrixTableProps> = ({ entries }) => {
  if (!entries || entries.length === 0) {
    return null;
  }

  return (
    <div className="my-6 border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60 shadow-sm">
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-200 tracking-wide uppercase font-mono">
          Operational Complexity Matrix (Big-O)
        </h4>
        <span className="text-[11px] text-slate-400 font-mono">Time & Space Profiles</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-950/40 text-slate-400 font-mono">
              <th className="py-2.5 px-4 font-medium">Operation</th>
              <th className="py-2.5 px-3 font-medium">Best Time</th>
              <th className="py-2.5 px-3 font-medium">Average Time</th>
              <th className="py-2.5 px-3 font-medium">Worst Time</th>
              <th className="py-2.5 px-3 font-medium">Space (Aux)</th>
              <th className="py-2.5 px-4 font-medium">Mechanism & Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-slate-300">
            {entries.map((entry, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2.5 px-4 font-medium text-white">{entry.operation}</td>
                <td className="py-2.5 px-3">
                  <Badge variant="outline" className={`font-mono text-[11px] ${getComplexityBadgeVariant(entry.best_time)}`}>
                    {entry.best_time}
                  </Badge>
                </td>
                <td className="py-2.5 px-3">
                  <Badge variant="outline" className={`font-mono text-[11px] ${getComplexityBadgeVariant(entry.average_time)}`}>
                    {entry.average_time}
                  </Badge>
                </td>
                <td className="py-2.5 px-3">
                  <Badge variant="outline" className={`font-mono text-[11px] ${getComplexityBadgeVariant(entry.worst_time)}`}>
                    {entry.worst_time}
                  </Badge>
                </td>
                <td className="py-2.5 px-3">
                  <Badge variant="outline" className="font-mono text-[11px] bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                    {entry.space_complexity}
                  </Badge>
                </td>
                <td className="py-2.5 px-4 text-slate-400 text-xs leading-relaxed">{entry.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
