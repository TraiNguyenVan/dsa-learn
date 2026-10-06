import React from 'react';
import { DpTableState } from '@/lib/types';

interface DpTableCanvasProps {
  table: DpTableState;
}

const CELL_W = 74;
const CELL_H = 40;
const HEADER_W = 150;

/**
 * Fixed grid: one row per row label, one column per column label.
 *
 * A table's meaning lives in the labels, so both header axes are drawn. The
 * active range highlight is a rectangle behind the dependency cells rather than a
 * per-cell tint, because what matters at each step is the *set* the current cell
 * reads from, not the state of any one of them.
 */
export const DpTableCanvas: React.FC<DpTableCanvasProps> = ({ table }) => {
  const rows = table.rows ?? [];
  const cols = table.cols ?? [];
  const cells = table.cells ?? [];

  const width = HEADER_W + cols.length * CELL_W + 24;
  const height = 40 + rows.length * CELL_H + 16;

  const inActiveRange = (r: number, c: number): boolean => {
    if (!table.active_range) return false;
    const [r0, c0, r1, c1] = table.active_range;
    return r >= r0 && r <= r1 && c >= c0 && c <= c1;
  };

  const isActiveCell = (r: number, c: number): boolean => {
    if (!table.active_cell) return false;
    return table.active_cell[0] === r && table.active_cell[1] === c;
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 gap-2 overflow-x-auto">
      <div className="flex items-start gap-3">
        <table className="border-collapse" style={{ width, height }}>
          <thead>
            <tr>
              <th className="text-[10px] font-mono text-slate-500 font-normal px-2 py-1 text-left">
                state \ input
              </th>
              {cols.map((c, ci) => (
                <th key={`col_${ci}`} className="px-1 py-1">
                  <span
                    className={`block text-[10px] font-mono rounded py-0.5 ${
                      table.active_range && ci >= table.active_range[1] && ci <= table.active_range[3]
                        ? 'bg-cyan-500/20 text-cyan-200'
                        : 'text-slate-500'
                    }`}
                  >
                    {c}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rowLabel, ri) => (
              <tr key={`row_${ri}`}>
                <th className="text-[10px] font-mono text-slate-500 font-normal px-2 py-1 text-right whitespace-nowrap">
                  <span
                    className={
                      table.active_range && ri >= table.active_range[0] && ri <= table.active_range[2]
                        ? 'text-cyan-300'
                        : ''
                    }
                  >
                    {rowLabel}
                  </span>
                </th>
                {cols.map((_, ci) => {
                  const value = cells[ri]?.[ci];
                  const active = isActiveCell(ri, ci);
                  const dep = inActiveRange(ri, ci);
                  return (
                    <td key={`cell_${ri}_${ci}`} className="p-0">
                      <div
                        style={{ width: CELL_W, height: CELL_H }}
                        className={`flex items-center justify-center font-mono text-xs border transition-all duration-200 ${
                          active
                            ? 'border-amber-400 bg-amber-500/25 text-amber-100 font-bold'
                            : dep
                            ? 'border-cyan-600/60 bg-cyan-500/10 text-cyan-100'
                            : value === null || value === undefined
                            ? 'border-slate-800 bg-slate-900/60 text-slate-600'
                            : 'border-slate-700 bg-slate-900 text-slate-200'
                        }`}
                      >
                        {value === null || value === undefined ? '—' : String(value)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 text-[10px] font-mono text-slate-500">
        <span className="text-amber-300">active cell</span>
        <span className="text-cyan-300">dependency range read by this step</span>
        <span>
          {rows.length} rows × {cols.length} cols = {rows.length * cols.length} states
        </span>
        {table.active_cell && (
          <span>
            writing [{table.active_cell[0]}][{table.active_cell[1]}]
          </span>
        )}
      </div>
    </div>
  );
};