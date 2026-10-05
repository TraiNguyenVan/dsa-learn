import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Terminal,
  Layers,
  Zap,
} from 'lucide-react';
import { VerificationResult } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TestRunnerDrawerProps {
  result: VerificationResult | null;
  isExecuting: boolean;
}

export function TestRunnerDrawer({ result, isExecuting }: TestRunnerDrawerProps) {
  const [activeTab, setActiveTab] = useState('tiers');

  if (isExecuting) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-slate-400 space-y-3 select-none">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <div className="text-sm font-mono text-emerald-400 font-medium">Compiling with g++ (C++20)...</div>
        <p className="text-xs text-slate-500">Executing multi-tier verification test suite</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-slate-500 space-y-2 select-none">
        <Terminal className="w-8 h-8 text-slate-700" />
        <div className="text-sm font-medium text-slate-400">Ready to verify</div>
        <p className="text-xs text-slate-600">
          Edit your local code stub and click <strong className="text-slate-400">Run Tests</strong> or press{' '}
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Ctrl+Enter</kbd>
        </p>
      </div>
    );
  }

  const isPassed = result.status === 'PASSED';
  const isCompileError = result.status === 'COMPILATION_ERROR';
  const isTimeout = result.status === 'TIMEOUT';
  const isRuntimeError = result.status === 'RUNTIME_ERROR';

  return (
    <div className="h-full flex flex-col overflow-hidden text-slate-200">
      {/* Header Result Summary */}
      <div className="px-5 py-2.5 bg-[#121A2B]/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center space-x-3">
          {isPassed ? (
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold text-sm font-mono">ALL TESTS PASSED</span>
            </div>
          ) : isCompileError ? (
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold text-sm font-mono">COMPILATION FAILED</span>
            </div>
          ) : isTimeout ? (
            <div className="flex items-center space-x-2 text-amber-400">
              <Clock className="w-5 h-5" />
              <span className="font-bold text-sm font-mono">TIME LIMIT EXCEEDED</span>
            </div>
          ) : isRuntimeError ? (
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold text-sm font-mono">RUNTIME ERROR</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <span className="font-bold text-sm font-mono">TESTS FAILED</span>
            </div>
          )}

          <Badge variant="outline" className="text-xs font-mono text-slate-400">
            {result.duration_ms} ms
          </Badge>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-7 text-xs">
              <TabsTrigger value="tiers" className="h-6 px-2.5">
                <Layers className="w-3.5 h-3.5 mr-1" />
                Tiers ({result.summary.passed}/{result.summary.total})
              </TabsTrigger>
              {result.diagnostics.length > 0 && (
                <TabsTrigger value="diagnostics" className="h-6 px-2.5 text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  Diagnostics ({result.diagnostics.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="raw" className="h-6 px-2.5">
                <Terminal className="w-3.5 h-3.5 mr-1" />
                Raw Output
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden bg-[#0F172A]">
        {activeTab === 'tiers' && (
          <ScrollArea className="h-full p-4">
            {result.tiers.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6">
                No test results available (compilation or execution fault prevented test suite from running).
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl">
                {result.tiers.map((tier) => (
                  <div
                    key={tier.tier}
                    className="border border-slate-800/80 rounded-lg bg-[#141C2E]/60 overflow-hidden"
                  >
                    <div className="px-3.5 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 font-mono flex items-center">
                        <Zap className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                        {tier.tier}
                      </span>
                      <span
                        className={cn(
                          'font-mono text-[11px]',
                          tier.passed === tier.total ? 'text-emerald-400' : 'text-red-400'
                        )}
                      >
                        {tier.passed}/{tier.total} Passed
                      </span>
                    </div>

                    <div className="divide-y divide-slate-800/40">
                      {tier.tests.map((test, idx) => (
                        <div key={idx} className="p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {test.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                              )}
                              <span
                                className={cn(
                                  'font-medium',
                                  test.passed ? 'text-slate-300' : 'text-red-300'
                                )}
                              >
                                {test.name}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500">
                              {test.duration_us} µs
                            </span>
                          </div>

                          {!test.passed && (
                            <div className="mt-2.5 p-3 rounded bg-slate-950/80 border border-red-900/40 font-mono text-xs space-y-1.5">
                              {test.expected && (
                                <div className="text-emerald-400">
                                  <span className="text-slate-500 mr-2">Expected:</span>
                                  {test.expected}
                                </div>
                              )}
                              {test.actual && (
                                <div className="text-red-400">
                                  <span className="text-slate-500 mr-2">Actual:  </span>
                                  {test.actual}
                                </div>
                              )}
                              {test.failure_message && (
                                <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                                  {test.failure_message}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {activeTab === 'diagnostics' && (
          <ScrollArea className="h-full p-4">
            <div className="space-y-3 max-w-4xl">
              {result.diagnostics.map((diag, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-red-900/50 bg-red-950/20 text-xs space-y-2 font-mono"
                >
                  <div className="flex items-center justify-between text-red-400">
                    <span className="font-bold">
                      Line {diag.line}, Column {diag.column} [{diag.severity.toUpperCase()}]
                    </span>
                    <span className="text-[11px] text-slate-500 truncate max-w-xs">{diag.file}</span>
                  </div>

                  <div className="text-slate-200 bg-slate-950/80 p-2.5 rounded border border-slate-800">
                    {diag.raw_message}
                  </div>

                  {diag.explanation && (
                    <div className="text-slate-300 font-sans leading-relaxed">
                      <strong className="text-amber-300 font-mono">💡 Explanation: </strong>
                      {diag.explanation}
                    </div>
                  )}

                  {diag.suggestion && (
                    <div className="text-emerald-300 font-sans">
                      <strong className="text-emerald-400 font-mono">🔧 Suggestion: </strong>
                      <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300 font-mono">
                        {diag.suggestion}
                      </code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {activeTab === 'raw' && (
          <ScrollArea className="h-full p-4 font-mono text-xs">
            <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed">
              {result.raw_output || 'No output recorded.'}
            </pre>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
