import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
import { CurriculumSidebar } from '@/components/curriculum/CurriculumSidebar';
import { ProblemViewer } from '@/components/problem/ProblemViewer';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { useEditorSync } from '@/components/editor/useEditorSync';
import { TestRunnerDrawer } from '@/components/runner/TestRunnerDrawer';
import { CompilerOutputView } from '@/components/runner/CompilerOutputView';
import { TerminalDrawer } from '@/components/terminal/TerminalDrawer';
import { DebuggerPanel } from '@/components/debugger/DebuggerPanel';
import { useDebugger, debugShortcutAction } from '@/components/debugger/useDebugger';
import { SolutionModal } from '@/components/problem/SolutionModal';
import { TopicNavTabs, TopicViewMode } from '@/components/curriculum/TopicNavTabs';
import { ConceptLessonViewer } from '@/components/concept/ConceptLessonViewer';
import { VisualizerContainer } from '@/components/visualizer/VisualizerContainer';
import { PatternsContainer } from '@/components/patterns/PatternsContainer';
import {
  fetchTopics,
  fetchExercises,
  fetchExerciseDetail,
  runVerification,
  compileAndRunExercise,
  resetExercise,
  fetchToolsStatus,
} from '@/lib/api';
import {
  TopicSummary,
  ExerciseSummary,
  ExerciseDetail,
  VerificationResult,
  CompileRunResult,
  ToolsStatus,
  DebugVariable,
} from '@/lib/types';
import type { DebugOutputStream } from '@/components/terminal/useTerminal';
import { useSSE } from '@/lib/useEvents';
import { Play, Bug, Terminal, Cpu } from 'lucide-react';

type BottomTab = 'runner' | 'compiler' | 'terminal' | 'debugger';

export function App() {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [currentExercise, setCurrentExercise] = useState<ExerciseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeMode, setActiveMode] = useState<TopicViewMode>('exercises');

  // Verification & Direct Run state
  const [testResult, setTestResult] = useState<VerificationResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [compileResult, setCompileResult] = useState<CompileRunResult | null>(null);
  const [isDirectRunning, setIsDirectRunning] = useState(false);

  // Bottom drawer active tab
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('runner');
  const [solutionModalOpen, setSolutionModalOpen] = useState(false);

  // Breakpoints in editor
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  // Line the debuggee is stopped on (FR-015)
  const [activeLine, setActiveLine] = useState<number | null>(null);
  // Toolchain diagnostics; gates the start control (FR-008)
  const [toolsStatus, setToolsStatus] = useState<ToolsStatus | null>(null);
  // The terminal registers its debug-output writer here (FR-016)
  const [writeDebugOutput, setWriteDebugOutput] = useState<
    ((stream: DebugOutputStream, text: string) => void) | null
  >(null);

  // Two-way editor sync
  const { code, status: saveStatus, handleCodeChange, saveNow } = useEditorSync({
    exerciseId: selectedExerciseId,
    initialCode: currentExercise?.solution_code ?? '',
    onSaved: () => {
      // Optional callback when code saved
    },
  });

  // Debugger hook (GDB/MI over /ws/debug)
  const {
    debugState,
    callStack,
    variables,
    statusMessage: debugStatusMessage,
    remediation: debugRemediation,
    appliedBreakpoints,
    requestedBreakpoints,
    startDebug,
    continueDebug,
    stepOver,
    stepInto,
    stepOut,
    pauseDebug,
    stopDebug,
    selectFrame,
    expandVariable,
  } = useDebugger({
    exerciseId: selectedExerciseId,
    active: activeBottomTab === 'debugger',
    onActiveLineChange: (line) => setActiveLine(line),
    onOutput: (stream, text) => writeDebugOutput?.(stream, text),
  });

  // Variable tree expansion state: the server owns handles, the client owns
  // which ones are open and what their children are.
  const [expandedHandles, setExpandedHandles] = useState<Set<string>>(new Set());
  const [childrenByHandle, setChildrenByHandle] = useState<Record<string, DebugVariable[]>>({});
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  // A new stop invalidates every handle the server released.
  useEffect(() => {
    setExpandedHandles(new Set());
    setChildrenByHandle({});
    setSelectedFrameId(null);
  }, [debugState, activeLine]);

  const handleExpandVariable = useCallback(
    (handle: string) => {
      setExpandedHandles((prev) => {
        const next = new Set(prev);
        if (next.has(handle)) {
          next.delete(handle);
          return next;
        }
        next.add(handle);
        return next;
      });
      setChildrenByHandle((prev) => {
        if (prev[handle]) return prev;
        expandVariable(handle);
        return prev;
      });
    },
    [expandVariable],
  );

  const handleToggleBreakpoint = useCallback((line: number) => {
    setBreakpoints((prev) =>
      prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line].sort((a, b) => a - b)
    );
  }, []);

  // Toolchain diagnostics decide whether debugging can start at all (FR-008)
  useEffect(() => {
    let mounted = true;
    fetchToolsStatus()
      .then((status) => {
        if (mounted) setToolsStatus(status);
      })
      .catch(() => {
        // Diagnostics failing must not break the rest of the dashboard.
        if (mounted) setToolsStatus(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Load curriculum catalog & exercises
  const loadCatalogData = useCallback(async () => {
    try {
      const [tData, eData] = await Promise.all([fetchTopics(), fetchExercises()]);
      setTopics(tData);
      setExercises(eData);

      if (!selectedExerciseId && eData.length > 0) {
        setSelectedExerciseId(eData[0].id);
      }
    } catch (err) {
      console.error('Failed to load curriculum catalog', err);
    }
  }, [selectedExerciseId]);

  useEffect(() => {
    loadCatalogData();
  }, [loadCatalogData]);

  // Load exercise detail when selectedExerciseId changes
  useEffect(() => {
    if (!selectedExerciseId) return;

    let isMounted = true;
    setLoadingDetail(true);
    setTestResult(null);
    setCompileResult(null);
    setBreakpoints([]);

    fetchExerciseDetail(selectedExerciseId)
      .then((detail) => {
        if (isMounted) {
          setCurrentExercise(detail);
        }
      })
      .catch((err) => console.error('Failed to fetch exercise details', err))
      .finally(() => {
        if (isMounted) setLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedExerciseId]);

  // Execute verification (Run Tests)
  const handleRun = useCallback(async () => {
    if (!selectedExerciseId || isExecuting) return;

    // Save unsaved edits first
    await saveNow();

    setIsExecuting(true);
    setActiveBottomTab('runner');
    try {
      const result = await runVerification(selectedExerciseId);
      setTestResult(result);
      loadCatalogData();
    } catch (err) {
      console.error('Verification failed', err);
    } finally {
      setIsExecuting(false);
    }
  }, [selectedExerciseId, isExecuting, saveNow, loadCatalogData]);

  // Execute standalone compile and run
  const handleDirectRun = useCallback(async () => {
    if (!selectedExerciseId || isDirectRunning) return;

    await saveNow();

    setIsDirectRunning(true);
    setActiveBottomTab('compiler');
    try {
      const result = await compileAndRunExercise(selectedExerciseId);
      setCompileResult(result);
    } catch (err) {
      console.error('Direct run failed', err);
    } finally {
      setIsDirectRunning(false);
    }
  }, [selectedExerciseId, isDirectRunning, saveNow]);

  // Start debugger
  const handleStartDebug = useCallback(async () => {
    if (!selectedExerciseId) return;
    // FR-008: never attempt a launch when the engine is unusable.
    if (toolsStatus && !toolsStatus.debugger.available) return;
    await saveNow();
    setActiveBottomTab('debugger');
    // The server resolves the authoritative absolute source path from the debug
    // build; the client only supplies the workspace-relative path.
    const relpath = currentExercise?.solution_relpath ?? '';
    startDebug(breakpoints.map((line) => ({ file: relpath, line })));
  }, [selectedExerciseId, saveNow, startDebug, breakpoints, toolsStatus, currentExercise]);

  // Reset exercise starter stub
  const handleReset = useCallback(async () => {
    if (!selectedExerciseId) return;
    const confirmReset = window.confirm(
      `Are you sure you want to reset '${currentExercise?.title}' back to the starter code?`
    );
    if (!confirmReset) return;

    try {
      await resetExercise(selectedExerciseId);
      if (selectedExerciseId) {
        const updated = await fetchExerciseDetail(selectedExerciseId);
        setCurrentExercise(updated);
      }
    } catch (err) {
      console.error('Reset failed', err);
    }
  }, [selectedExerciseId, currentExercise]);

  // Listen for local file changes from SSE
  useSSE(
    useCallback(
      (data: { exercise_id: string; file: string }) => {
        if (data.exercise_id === selectedExerciseId) {
          console.log(`File saved on disk for ${data.exercise_id}, refreshing...`);
        }
      },
      [selectedExerciseId]
    )
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+Enter: Direct Compile & Run
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleDirectRun();
        return;
      }

      // Ctrl+Enter: Run Verification Tests
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
        return;
      }

      // Debug shortcuts: F5 start/continue, F10/F11/Shift+F11 step, Shift+F5 stop.
      // The gating rules live in debugShortcutAction so they are unit-testable.
      const debugAction = debugShortcutAction(e.key, e.shiftKey, debugState);
      if (debugAction) {
        e.preventDefault();
        switch (debugAction) {
          case 'start':
            handleStartDebug();
            break;
          case 'continue':
            continueDebug();
            break;
          case 'step_over':
            stepOver();
            break;
          case 'step_into':
            stepInto();
            break;
          case 'step_out':
            stepOut();
            break;
          case 'stop':
            stopDebug();
            break;
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun, handleDirectRun, handleStartDebug, debugState, continueDebug, stepOver, stepInto, stepOut, stopDebug]);

  const solvedCount = exercises.filter((e) => e.status === 'COMPLETED').length;
  const isCurrentCompleted = currentExercise?.status === 'COMPLETED';

  // Bottom drawer content with tabs
  const renderBottomDrawer = () => (
    <div className="h-full flex flex-col bg-[#0B1220] overflow-hidden">
      {/* Drawer Tabs Header */}
      <div className="flex items-center justify-between px-3 border-b border-slate-800 bg-[#080E1A] select-none">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveBottomTab('runner')}
            className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              activeBottomTab === 'runner'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Test Suite
          </button>

          <button
            onClick={() => setActiveBottomTab('compiler')}
            className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              activeBottomTab === 'compiler'
                ? 'border-sky-500 text-sky-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> Compiler Output
          </button>

          <button
            onClick={() => setActiveBottomTab('terminal')}
            className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              activeBottomTab === 'terminal'
                ? 'border-teal-500 text-teal-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Terminal
          </button>

          <button
            onClick={() => setActiveBottomTab('debugger')}
            className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              activeBottomTab === 'debugger'
                ? 'border-purple-500 text-purple-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bug className="w-3.5 h-3.5" /> Debugger
            {debugState === 'STOPPED' && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Drawer Tab View */}
      <div className="flex-1 overflow-hidden">
        {activeBottomTab === 'runner' && (
          <TestRunnerDrawer result={testResult} isExecuting={isExecuting} />
        )}
        {activeBottomTab === 'compiler' && (
          <CompilerOutputView result={compileResult} isRunning={isDirectRunning} />
        )}
        {activeBottomTab === 'terminal' && (
          <TerminalDrawer
            active={activeBottomTab === 'terminal'}
            onDebugWriterReady={setWriteDebugOutput}
          />
        )}
        {activeBottomTab === 'debugger' && (
          <DebuggerPanel
            debugState={debugState}
            callStack={callStack}
            variables={variables}
            statusMessage={debugStatusMessage}
            remediation={debugRemediation}
            availability={{
              available: toolsStatus?.debugger.available ?? true,
              remediation: toolsStatus?.debugger.remediation ?? null,
            }}
            selectedFrameId={selectedFrameId}
            expandedHandles={expandedHandles}
            childrenByHandle={childrenByHandle}
            appliedBreakpoints={appliedBreakpoints}
            requestedBreakpoints={requestedBreakpoints}
            onContinue={continueDebug}
            onPause={pauseDebug}
            onStepOver={stepOver}
            onStepInto={stepInto}
            onStepOut={stepOut}
            onStop={stopDebug}
            onStart={handleStartDebug}
            onSelectFrame={selectFrame}
            onExpandVariable={handleExpandVariable}
          />
        )}
      </div>
    </div>
  );

  const effectiveTopicId = selectedTopicId || currentExercise?.topic_id || (topics.length > 0 ? topics[0].id : null);
  const activeTopic = topics.find((t) => t.id === effectiveTopicId);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0F172A] overflow-hidden select-none">
      <Header
        exerciseTitle={currentExercise?.title}
        isExecuting={isExecuting || isDirectRunning}
        isDebugging={debugState !== 'IDLE' && debugState !== 'TERMINATED'}
        saveStatus={saveStatus}
        onRun={handleRun}
        onDirectRun={handleDirectRun}
        onDebug={handleStartDebug}
        onSave={saveNow}
        onReset={handleReset}
        onViewSolution={() => setSolutionModalOpen(true)}
        solvedCount={solvedCount}
        totalCount={exercises.length}
      />

      <TopicNavTabs
        activeMode={activeMode}
        onModeChange={setActiveMode}
        topicTitle={activeTopic?.title}
      />

      {activeMode === 'concept' ? (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 shrink-0 border-r border-slate-800 bg-[#121A2B]">
            <CurriculumSidebar
              topics={topics}
              exercises={exercises}
              selectedExerciseId={selectedExerciseId}
              selectedTopicId={effectiveTopicId}
              onSelectExercise={(id) => {
                setSelectedExerciseId(id);
                setActiveMode('exercises');
              }}
              onSelectTopic={(topicId) => {
                setSelectedTopicId(topicId);
                setActiveMode('concept');
              }}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <ConceptLessonViewer
              topicId={effectiveTopicId || 'arrays-hashing'}
              onNavigateToVisualizer={() => setActiveMode('visualizer')}
              onNavigateToExercises={() => setActiveMode('exercises')}
            />
          </div>
        </div>
      ) : activeMode === 'visualizer' ? (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 shrink-0 border-r border-slate-800 bg-[#121A2B]">
            <CurriculumSidebar
              topics={topics}
              exercises={exercises}
              selectedExerciseId={selectedExerciseId}
              selectedTopicId={effectiveTopicId}
              onSelectExercise={(id) => {
                setSelectedExerciseId(id);
                setActiveMode('exercises');
              }}
              onSelectTopic={(topicId) => {
                setSelectedTopicId(topicId);
                setActiveMode('visualizer');
              }}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <VisualizerContainer topicId={effectiveTopicId || 'arrays-hashing'} />
          </div>
        </div>
      ) : activeMode === 'patterns' ? (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 shrink-0 border-r border-slate-800 bg-[#121A2B]">
            <CurriculumSidebar
              topics={topics}
              exercises={exercises}
              selectedExerciseId={selectedExerciseId}
              selectedTopicId={effectiveTopicId}
              onSelectExercise={(id) => {
                setSelectedExerciseId(id);
                setActiveMode('exercises');
              }}
              onSelectTopic={(topicId) => {
                setSelectedTopicId(topicId);
                setActiveMode('patterns');
              }}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <PatternsContainer
              topicId={effectiveTopicId}
              onSelectExercise={(id) => {
                setSelectedExerciseId(id);
                setActiveMode('exercises');
              }}
            />
          </div>
        </div>
      ) : (
        <ResizableLayout
          sidebar={
            <CurriculumSidebar
              topics={topics}
              exercises={exercises}
              selectedExerciseId={selectedExerciseId}
              selectedTopicId={effectiveTopicId}
              onSelectExercise={(id) => {
                setSelectedExerciseId(id);
                setActiveMode('exercises');
              }}
              onSelectTopic={(topicId) => {
                setSelectedTopicId(topicId);
                setActiveMode('concept');
              }}
            />
          }
          problemView={<ProblemViewer exercise={currentExercise} loading={loadingDetail} />}
          editorView={
            <CodeEditor
              exerciseId={selectedExerciseId}
              value={code}
              onChange={handleCodeChange}
              onSave={saveNow}
              breakpoints={breakpoints}
              onToggleBreakpoint={handleToggleBreakpoint}
              activeDebugLine={activeLine}
            />
          }
          bottomView={renderBottomDrawer()}
        />
      )}

      <SolutionModal
        exerciseId={selectedExerciseId}
        exerciseTitle={currentExercise?.title}
        isCompleted={isCurrentCompleted}
        isOpen={solutionModalOpen}
        onClose={() => setSolutionModalOpen(false)}
      />
    </div>
  );
}

export default App;
