import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  RotateCcw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { VisualizerStateFrame } from '@/lib/types';
import { recordVisualizerProgress } from '@/lib/api';
import { generateBinarySearchTrace, generateTwoSumTrace } from './engine/arrayVisualizer';
import { generateInsertHeadTrace, generateReverseListTrace } from './engine/linkedListVisualizer';
import { generateBSTInsertTrace, generateBSTSearchTrace } from './engine/treeVisualizer';
import { generateHeapInsertTrace } from './engine/heapVisualizer';
import { usePlayback } from './engine/usePlayback';
import { ArrayCanvas } from './renderers/ArrayCanvas';
import { LinkedListCanvas } from './renderers/LinkedListCanvas';
import { TreeCanvas } from './renderers/TreeCanvas';
import { HeapCanvas } from './renderers/HeapCanvas';
import { PlaybackControls } from './PlaybackControls';
import { StepNarrative } from './StepNarrative';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface VisualizerContainerProps {
  topicId: string;
}

interface OperationOption {
  id: string;
  name: string;
  defaultInput: string;
  defaultParam: number;
  presets: Array<{ name: string; input: string; param: number }>;
}

export const VisualizerContainer: React.FC<VisualizerContainerProps> = ({ topicId }) => {
  // Determine available operations based on topic
  const operations: OperationOption[] = useMemo(() => {
    if (topicId === 'linked-lists') {
      return [
        {
          id: 'insert_head',
          name: 'Insert at Head',
          defaultInput: '10, 20, 30',
          defaultParam: 5,
          presets: [
            { name: 'Standard List', input: '10, 20, 30', param: 5 },
            { name: 'Empty List (Boundary)', input: '', param: 42 },
            { name: 'Single Node', input: '99', param: 1 },
          ],
        },
        {
          id: 'reverse_list',
          name: 'Reverse List (In-Place)',
          defaultInput: '1, 2, 3, 4, 5',
          defaultParam: 0,
          presets: [
            { name: 'Linear 5-Node List', input: '1, 2, 3, 4, 5', param: 0 },
            { name: 'Two Nodes', input: '10, 20', param: 0 },
            { name: 'Single Node', input: '42', param: 0 },
          ],
        },
      ];
    }

    if (topicId === 'trees') {
      return [
        {
          id: 'bst_search',
          name: 'Binary Search Tree - Search',
          defaultInput: '50, 30, 70, 20, 40, 60, 80',
          defaultParam: 40,
          presets: [
            { name: 'Balanced Tree (Found)', input: '50, 30, 70, 20, 40, 60, 80', param: 40 },
            { name: 'Missing Key', input: '50, 30, 70, 20, 40', param: 99 },
            { name: 'Skewed Degenerate Tree (O(N))', input: '10, 20, 30, 40, 50', param: 50 },
          ],
        },
        {
          id: 'bst_insert',
          name: 'Binary Search Tree - Insert',
          defaultInput: '30, 15, 50, 10, 22',
          defaultParam: 25,
          presets: [
            { name: 'Standard Tree', input: '30, 15, 50, 10, 22', param: 25 },
            { name: 'Empty Tree', input: '', param: 50 },
            { name: 'Duplicate Key (Ignored)', input: '30, 15, 50', param: 30 },
          ],
        },
      ];
    }

    if (topicId === 'heap') {
      return [
        {
          id: 'heap_insert',
          name: 'Min-Heap - Insert (Bubble-Up)',
          defaultInput: '10, 20, 15, 30, 40',
          defaultParam: 5,
          presets: [
            { name: 'Insert Smaller (Swaps to Root)', input: '10, 20, 15, 30, 40', param: 5 },
            { name: 'Insert Larger (No Swap)', input: '10, 20, 15', param: 50 },
          ],
        },
      ];
    }

    // Default for Arrays & Hashing, Two Pointers, Binary Search
    return [
      {
        id: 'binary_search',
        name: 'Binary Search (Array)',
        defaultInput: '2, 5, 8, 12, 16, 23, 38, 56, 72, 91',
        defaultParam: 23,
        presets: [
          { name: 'Target Present (Mid Partition)', input: '2, 5, 8, 12, 16, 23, 38, 56, 72, 91', param: 23 },
          { name: 'Target Missing', input: '2, 5, 8, 12, 16, 23, 38', param: 15 },
          { name: 'Boundary Element (Head)', input: '10, 20, 30, 40, 50', param: 10 },
        ],
      },
      {
        id: 'two_sum',
        name: 'Two Pointers (Sorted Two Sum)',
        defaultInput: '1, 3, 4, 7, 10, 11, 15',
        defaultParam: 11,
        presets: [
          { name: 'Pair Present (4 + 7 = 11)', input: '1, 3, 4, 7, 10, 11, 15', param: 11 },
          { name: 'Pair Missing', input: '2, 4, 6, 8, 10', param: 15 },
        ],
      },
    ];
  }, [topicId]);

  const [selectedOpId, setSelectedOpId] = useState<string>(operations[0]?.id || '');
  const activeOp = operations.find((o) => o.id === selectedOpId) || operations[0];

  const [inputStr, setInputStr] = useState<string>(activeOp.defaultInput);
  const [paramVal, setParamVal] = useState<number>(activeOp.defaultParam);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Frames generation
  const [frames, setFrames] = useState<VisualizerStateFrame[]>([]);

  const parseNums = useCallback((str: string): number[] => {
    if (!str.trim()) return [];
    return str
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }, []);

  const runOperation = useCallback(() => {
    setValidationError(null);
    const nums = parseNums(inputStr);

    // Validate boundaries
    if (nums.length > 20) {
      setValidationError('Collection size capped at 20 elements for visual legibility.');
      return;
    }
    for (const n of nums) {
      if (n < -999 || n > 999) {
        setValidationError('Elements must be between -999 and 999.');
        return;
      }
    }
    if (paramVal < -999 || paramVal > 999) {
      setValidationError('Parameter value must be between -999 and 999.');
      return;
    }

    let generated: VisualizerStateFrame[] = [];

    switch (activeOp.id) {
      case 'binary_search':
        generated = generateBinarySearchTrace(nums, paramVal);
        break;
      case 'two_sum':
        generated = generateTwoSumTrace(nums, paramVal);
        break;
      case 'insert_head':
        generated = generateInsertHeadTrace(nums, paramVal);
        break;
      case 'reverse_list':
        generated = generateReverseListTrace(nums);
        break;
      case 'bst_search':
        generated = generateBSTSearchTrace(nums, paramVal);
        break;
      case 'bst_insert':
        generated = generateBSTInsertTrace(nums, paramVal);
        break;
      case 'heap_insert':
        generated = generateHeapInsertTrace(nums, paramVal);
        break;
      default:
        generated = generateBinarySearchTrace(nums, paramVal);
    }

    setFrames(generated);

    // Persist explored operation in SQLite
    recordVisualizerProgress(topicId, activeOp.id).catch(() => {});
  }, [activeOp.id, inputStr, paramVal, parseNums, topicId]);

  // Re-run on op change
  useEffect(() => {
    setInputStr(activeOp.defaultInput);
    setParamVal(activeOp.defaultParam);
  }, [activeOp]);

  useEffect(() => {
    runOperation();
  }, [runOperation]);

  const playback = usePlayback({
    totalSteps: frames.length,
  });

  const currentFrame = frames[playback.currentStep] || frames[0];

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
              value={activeOp.id}
              onChange={(e) => setSelectedOpId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs font-mono text-white rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              {operations.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name}
                </option>
              ))}
            </select>

            {/* Presets */}
            {activeOp.presets && activeOp.presets.length > 0 && (
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="text-slate-500 text-[11px] font-mono">Presets:</span>
                {activeOp.presets.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputStr(p.input);
                      setParamVal(p.param);
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

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Target / Val:</span>
            <input
              type="number"
              value={paramVal}
              onChange={(e) => setParamVal(parseInt(e.target.value, 10) || 0)}
              className="w-20 bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1 text-white focus:outline-none focus:border-emerald-500 text-xs text-center"
            />
          </div>
        </div>

        {validationError && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg p-2.5 px-3 flex items-center space-x-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Canvas Display Surface */}
        <div className="border border-slate-800 rounded-xl bg-gradient-to-b from-slate-950 to-[#0B1220] min-h-[280px] flex items-center justify-center relative overflow-hidden shadow-inner">
          {currentFrame?.data_structure_type === 'ARRAY' && (
            <ArrayCanvas
              elements={currentFrame.array_state?.elements || []}
              pointers={currentFrame.array_state?.pointers || []}
            />
          )}

          {currentFrame?.data_structure_type === 'LINKED_LIST' && (
            <LinkedListCanvas
              nodes={currentFrame.linked_list_state?.nodes || []}
              pointers={currentFrame.linked_list_state?.pointers || []}
            />
          )}

          {currentFrame?.data_structure_type === 'BINARY_SEARCH_TREE' && (
            <TreeCanvas
              nodes={currentFrame.tree_state?.nodes || []}
              activeNodeId={currentFrame.tree_state?.active_node_id}
            />
          )}

          {currentFrame?.data_structure_type === 'HEAP' && (
            <HeapCanvas
              elements={currentFrame.heap_state?.elements || []}
              swappingIndices={currentFrame.heap_state?.swapping_indices}
            />
          )}
        </div>

        {/* Step Commentary Narrative */}
        {currentFrame && (
          <StepNarrative
            actionType={currentFrame.action_type}
            description={currentFrame.description}
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
                  onClick={() => setShowHelp(false)}
                  className="h-6 w-6 p-0 text-slate-500 hover:text-white"
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
