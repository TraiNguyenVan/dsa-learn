import React, { useState } from 'react';
import { Layers, ArrowRight } from 'lucide-react';

interface MemoryDiagramProps {
  topicId?: string;
}

export const MemoryDiagram: React.FC<MemoryDiagramProps> = ({ topicId = 'arrays-hashing' }) => {
  const isPointerTopic = topicId === 'linked-lists' || topicId === 'trees';
  const [activeTab, setActiveTab] = useState<'contiguous' | 'linked'>(
    isPointerTopic ? 'linked' : 'contiguous'
  );

  return (
    <div className="my-6 border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60 shadow-sm">
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-semibold text-slate-200 tracking-wide uppercase font-mono">
            Memory Layout & Physical Architecture
          </h4>
        </div>
        <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => setActiveTab('contiguous')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              activeTab === 'contiguous'
                ? 'bg-emerald-600/30 text-emerald-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Contiguous (Array)
          </button>
          <button
            onClick={() => setActiveTab('linked')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              activeTab === 'linked'
                ? 'bg-sky-600/30 text-sky-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pointer-Linked (Heap)
          </button>
        </div>
      </div>

      <div className="p-4 bg-slate-950/70">
        {activeTab === 'contiguous' ? (
          <div>
            <div className="mb-2 text-xs text-slate-400">
              Contiguous memory allocation provides constant-time O(1) random offset access and high L1/L2 cache-line spatial locality.
            </div>
            {/* SVG Visual of Contiguous Array Buffer */}
            <div className="flex items-center justify-center py-4 overflow-x-auto">
              <div className="flex items-center space-x-1 font-mono text-xs">
                {[10, 20, 30, 40, 50].map((val, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 mb-1">0x{100 + idx * 4}</span>
                    <div className="w-14 h-14 bg-emerald-950/50 border border-emerald-500/50 rounded flex flex-col items-center justify-center text-emerald-300 shadow-sm">
                      <span className="text-sm font-bold">{val}</span>
                      <span className="text-[9px] text-emerald-500/80">arr[{idx}]</span>
                    </div>
                    <span className="text-[9px] text-slate-600 mt-1">4 bytes</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center font-mono mt-2 bg-slate-900/60 p-2 rounded border border-slate-800">
              Address Formula: <span className="text-emerald-400">Address = Base + (Index × sizeof(int))</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-2 text-xs text-slate-400">
              Pointer-linked allocation scatters dynamic heap records connected by 64-bit addresses, permitting dynamic re-linking without element shifts.
            </div>
            {/* SVG Visual of Linked Nodes */}
            <div className="flex items-center justify-center py-4 overflow-x-auto space-x-3">
              {[
                { val: 12, addr: '0x7F01', next: '0x7F44' },
                { val: 99, addr: '0x7F44', next: '0x7F82' },
                { val: 37, addr: '0x7F82', next: 'nullptr' },
              ].map((node, idx) => (
                <React.Fragment key={idx}>
                  <div className="flex flex-col items-center font-mono text-xs">
                    <span className="text-[10px] text-slate-500 mb-1">{node.addr}</span>
                    <div className="flex border border-sky-500/50 rounded overflow-hidden shadow-sm">
                      <div className="w-10 h-12 bg-sky-950/50 flex flex-col items-center justify-center border-r border-sky-800 text-sky-200">
                        <span className="text-xs font-bold">{node.val}</span>
                        <span className="text-[8px] text-sky-400">data</span>
                      </div>
                      <div className="w-12 h-12 bg-slate-900/70 flex flex-col items-center justify-center text-slate-300">
                        <span className="text-[9px] font-mono text-slate-400">{node.next}</span>
                        <span className="text-[8px] text-slate-500">next*</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-600 mt-1">16 bytes</span>
                  </div>
                  {idx < 2 && (
                    <div className="flex items-center text-sky-400/80 px-1 pt-4">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 text-center font-mono mt-2 bg-slate-900/60 p-2 rounded border border-slate-800">
              Pointer Traversal: <span className="text-sky-400">curr = curr-&gt;next (Heap dereference per hop)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
