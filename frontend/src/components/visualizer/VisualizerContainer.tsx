import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Sparkles, RotateCcw, AlertCircle, HelpCircle } from 'lucide-react';
import { VisualizerStateFrame } from '@/lib/types';
import { recordVisualizerProgress, getPlaybackPosition, savePlaybackPosition } from '@/lib/api';
import { getVisualizationsForTopic } from './registry';
import { registerExistingGenerators, formatInput } from './registry/registrations';
import { renderFrame } from './renderers/rendererMap';
import { usePlayback } from './engine/usePlayback';
import { StepNarrative } from './StepNarrative';
import { PlaybackControls } from './PlaybackControls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

registerExistingGenerators();

interface VisualizerContainerProps {
  topicId: string;
}

export const VisualizerContainer: React.FC<VisualizerContainerProps> = ({ topicId }) => {
  // Registry lookup replaces the previous `if (topicId === ...)` chain.
  const operations = useMemo(() => getVisualizationsForTopic(topicId), [topicId]);

  const [selectedOpId, setSelectedOpId] = useState<string>('');
  const activeOp = useMemo(
    () => operations.find((o) => o.operationId === selectedOpId) ?? operations[0],
    [operations, selectedOpId],
  );

  const [inputStr, setInputStr] = useState<string>('');
  const [paramVal, setParamVal] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const [frames, setFrames] = useState<VisualizerStateFrame[]>([]);
  const [resumeStep, setResumeStep] = useState(0);

  // Keep the newest position available to the persistence effect without making
  // that effect re-run on every single step.
  const stepRef = useRef(0);

  // Select the first operation whenever the topic changes.
  useEffect(() => {
    setSelectedOpId(operations[0]?.operationId ?? '');
  }, [operations]);

  // Reset the input controls to the operation's declared defaults.
  useEffect(() => {
    if (!activeOp) return;
    const preset = activeOp.presets[0];
    setInputStr(formatInput(preset?.input));
    const first = activeOp.parameters[0];
    setParamVal(first ? String(preset?.params?.[first.name] ?? first.defaultValue ?? '') : '');
  }, [activeOp]);

  const parseInput = useCallback((str: string, type: string): number[] | string[] | null => {
    if (!str.trim()) return type === 'numberList' ? [] : [];
    if (type === 'stringList') {
      return str.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return str.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
  }, []);

  const runOperation = useCallback(async () => {
    setValidationError(null);
    if (!activeOp) {
      setFrames([]);
      return;
    }

    const firstParam = activeOp.parameters[0];
    const input = parseInput(inputStr, firstParam?.type ?? 'numberList');

    if (Array.isArray(input) && input.length > 20) {
      setValidationError('Collection size capped at 20 elements for visual legibility.');
      return;
    }
    if (Array.isArray(input)) {
      for (const n of input) {
        if (typeof n === 'number' && (n < -999 || n > 999)) {
          setValidationError('Elements must be between -999 and 999.');
          return;
        }
      }
    }
    if (paramVal !== '' && (Number(paramVal) < -999 || Number(paramVal) > 999)) {
      setValidationError('Parameter value must be between -999 and 999.');
      return;
    }

    const params: Record<string, unknown> = {};
    if (firstParam) params[firstParam.name] = paramVal === '' ? firstParam.defaultValue : Number(paramVal);

    const generated = activeOp.generate(input as never, params);
    setFrames(generated);
    stepRef.current = 0;
    setResumeStep(0);

    recordVisualizerProgress(topicId, activeOp.operationId).catch(() => {});

    // FR-017: restore where this learner last stopped, when that position is
    // still meaningful for the frames just generated.
    try {
      const saved = await getPlaybackPosition(topicId, activeOp.operationId);
      const valid =
        saved.last_step > 0 && saved.last_step < generated.length && saved.last_step < saved.total_steps
          ? saved.last_step
          : 0;
      stepRef.current = valid;
      setResumeStep(valid);
    } catch {
      /* progress persistence is best-effort */
    }
  }, [activeOp, inputStr, paramVal, parseInput, topicId]);

  useEffect(() => {
    runOperation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOp?.operationId]);

  const playback = usePlayback({
    totalSteps: frames.length,
    initialStep: resumeStep,
    onStepChange: (step) => {
      stepRef.current = step;
    },
  });

  // Persist the playback position, debounced so a fast playthrough does not
  // issue one request per frame (contract H-06).
  useEffect(() => {
    if (!activeOp || frames.length === 0) return;
    const handle = setTimeout(() => {
      savePlaybackPosition(topicId, activeOp.operationId, stepRef.current, frames.length).catch(() => {});
    }, 500);
    return () => clearTimeout(handle);
  }, [playback.currentStep, activeOp, frames.length, topicId]);

  const currentFrame = frames[playback.currentStep] || frames[0];

  // FR-013: a topic with no authored animation says so explicitly. It must never
  // fall back to another topic's animation.
  if (operations.length === 0) {
    return (
      <div className="h-full flex flex-col bg-[#0F172A] p-4 lg:p-6 overflow-y-auto select-none">
        <div className="max-w-2xl mx-auto w-full border border-slate-800 rounded-xl bg-slate-900/60 p-8 text-center">
          <AlertCircle className="w-6 h-6 mx-auto mb-3 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200 mb-2">
            Visualization not yet authored for this topic
          </h3>
          <p className="text-xs font-mono text-slate-400 leading-relaxed">
            Theory and cost analysis are available under &ldquo;Concept &amp; Theory&rdquo;.
            An animation for this topic is being authored and will appear here once it exists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0F172A] p-4 lg:p-6 overflow-y-auto select-none">
      <div className="max-w-5xl mx-auto w-full space-y-4">
        {/* Top Control Bar: Operation Picker & Presets */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
                Operation:
              </span>
            </div>

            <select
              value={activeOp?.operationId ?? ''}
              onChange={(e) => setSelectedOpId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs font-mono text-white rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              {operations.map((op) => (
                <option key={op.operationId} value={op.operationId}>
                  {op.name}
                </option>
              ))}
            </select>

            {activeOp && activeOp.presets.length > 0 && (
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="text-slate-500 text-[11px] font-mono">Presets:</span>
                {activeOp.presets.map((p) => (
                  <button
                    key={p.name}
                    title={p.description}
                    onClick={() => {
                      setInputStr(formatInput(p.input));
                      const first = activeOp.parameters[0];
                      setParamVal(first ? String(p.params[first.name] ?? '') : '');
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-[11px] font-mono transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            size="sm"
            onClick={runOperation}
            className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 self-start md:self-auto text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Generate Trace</span>
          </Button>
        </div>

        {/* Input Tuning Parameters */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 px-4 flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
            <span className="text-slate-400">Elements:</span>
            <input
              type="text"
              value={inputStr}
              onChange={(e) => setInputStr(e.target.value)}
              placeholder="e.g. 10, 20, 30"
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          {activeOp && activeOp.parameters.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">{activeOp.parameters[0].label}:</span>
              <input
                type="number"
                value={paramVal}
                onChange={(e) => setParamVal(e.target.value)}
                className="w-20 bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1 text-white focus:outline-none focus:border-emerald-500 text-xs text-center"
              />
            </div>
          )}
        </div>

        {validationError && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg p-2.5 px-3 flex items-center space-x-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Canvas Display Surface */}
        <div className="border border-slate-800 rounded-xl bg-gradient-to-b from-slate-950 to-[#0B1220] min-h-[280px] flex items-center justify-center relative overflow-hidden shadow-inner">
          {renderFrame(currentFrame)}
        </div>

        {/* Step Commentary Narrative */}
        {currentFrame && (
          <StepNarrative
            actionType={currentFrame.action_type}
            description={currentFrame.description}
            rationale={currentFrame.rationale}
            stepIndex={playback.currentStep}
            totalSteps={frames.length}
          />
        )}

        {/* Playback Controls Bar */}
        <PlaybackControls
          currentStep={playback.currentStep}
          totalSteps={frames.length}
          isPlaying={playback.isPlaying}
          speed={playback.speedMultiplier}
          onPlay={playback.play}
          onPause={playback.pause}
          onStepNext={playback.stepNext}
          onStepPrev={playback.stepPrev}
          onReset={playback.reset}
          onJumpToStep={playback.jumpToStep}
          onSpeedChange={playback.setSpeedMultiplier}
          onOpenHelp={() => setShowHelp(true)}
        />

        {/* Keyboard Shortcuts Dialog Modal */}
        {showHelp && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-white">Visualizer Shortcuts</h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-slate-500 hover:text-white"
                  onClick={() => setShowHelp(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Play / Pause</span>
                  <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-200">
                    Space
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Step Forward</span>
                  <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-200">
                    → (Right Arrow)
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Step Backward</span>
                  <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-200">
                    ← (Left Arrow)
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Reset</span>
                  <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-200">
                    R
                  </Badge>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => setShowHelp(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
