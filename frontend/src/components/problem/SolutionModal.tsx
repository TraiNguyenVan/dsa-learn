import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Lightbulb, Copy, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchSolution } from '@/lib/api';

interface SolutionModalProps {
  exerciseId: string | null;
  exerciseTitle?: string;
  isCompleted: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function SolutionModal({
  exerciseId,
  exerciseTitle,
  isCompleted,
  isOpen,
  onClose,
}: SolutionModalProps) {
  const [solution, setSolution] = useState<{
    solution_code: string;
    time_complexity: string;
    space_complexity: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !exerciseId) {
      setSolution(null);
      setError(null);
      return;
    }

    if (isCompleted) {
      loadSolution(false);
    }
  }, [isOpen, exerciseId, isCompleted]);

  const loadSolution = async (confirmReveal: boolean) => {
    if (!exerciseId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSolution(exerciseId, confirmReveal);
      setSolution(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load canonical solution');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (solution) {
      navigator.clipboard.writeText(solution.solution_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#121A2B] border border-slate-800 rounded-xl shadow-2xl p-6 z-50 max-h-[85vh] flex flex-col text-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <Dialog.Title className="text-base font-bold text-white font-mono">
                Canonical Solution: {exerciseTitle}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {!isCompleted && !solution && (
              <div className="p-4 bg-amber-950/30 border border-amber-800/60 rounded-lg text-xs space-y-3">
                <div className="flex items-center space-x-2 text-amber-300 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Exercise Not Yet Solved</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Solving the problem yourself provides the greatest pedagogical value. Are you sure you want to reveal the canonical reference solution now?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSolution(true)}
                  disabled={loading}
                  className="border-amber-700/60 text-amber-300 hover:bg-amber-900/40"
                >
                  {loading ? 'Revealing...' : 'Yes, reveal solution'}
                </Button>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
                {error}
              </div>
            )}

            {solution && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono bg-slate-900/80 px-3 py-2 rounded border border-slate-800">
                  <span className="text-emerald-400">Time Complexity: {solution.time_complexity}</span>
                  <span className="text-indigo-400">Space Complexity: {solution.space_complexity}</span>
                </div>

                <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                    <span>C++20 Reference Implementation</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyCode}
                      className="h-6 px-2 text-[11px] text-slate-400 hover:text-white"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                    <code>{solution.solution_code}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
