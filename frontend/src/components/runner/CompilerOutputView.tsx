import { CompileRunResult } from '@/lib/types';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Terminal } from 'lucide-react';

interface CompilerOutputViewProps {
  result: CompileRunResult | null;
  isRunning: boolean;
}

export function CompilerOutputView({ result, isRunning }: CompilerOutputViewProps) {
  if (isRunning) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 gap-2">
        <span className="animate-spin text-lg">⟳</span>
        <span className="text-xs">Compiling and executing code...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
        <Terminal className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
        <p>No execution output yet.</p>
        <p className="text-[11px] text-slate-600 mt-1">Press "Run" or Ctrl+Shift+Enter to compile and run.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0B1220] overflow-hidden text-xs">
      {/* Status Bar */}
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          {result.status === 'SUCCESS' && (
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Finished (Exit Code: {result.exit_code})
            </span>
          )}
          {result.status === 'COMPILATION_ERROR' && (
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <XCircle className="w-4 h-4" /> Compilation Failed
            </span>
          )}
          {result.status === 'TIMEOUT' && (
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Clock className="w-4 h-4" /> Time Limit Exceeded
            </span>
          )}
          {result.status === 'RUNTIME_ERROR' && (
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <AlertTriangle className="w-4 h-4" /> Runtime Fault (Exit Code: {result.exit_code})
            </span>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          Duration: <span className="text-slate-200">{result.duration_ms}ms</span>
        </div>
      </div>

      {/* Output Console */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed space-y-3">
        {result.program_output && (
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Standard Output:</div>
            <pre className="p-3 rounded bg-slate-950/70 border border-slate-800 text-slate-200 whitespace-pre-wrap">
              {result.program_output}
            </pre>
          </div>
        )}

        {result.compiler_output && (
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Compiler Diagnostics:</div>
            <pre className="p-3 rounded bg-slate-950/70 border border-slate-800 text-slate-300 whitespace-pre-wrap">
              {result.compiler_output}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
