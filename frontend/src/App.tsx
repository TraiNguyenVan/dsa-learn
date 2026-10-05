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
import { useDAP } from '@/components/debugger/useDAP';
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
} from '@/lib/api';
import {
  TopicSummary,
  ExerciseSummary,
  ExerciseDetail,
  VerificationResult,
  CompileRunResult,
} from '@/lib/types';
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

  // Two-way editor sync
  const { code, status: saveStatus, handleCodeChange, saveNow } = useEditorSync({
    exerciseId: selectedExerciseId,
    initialCode: currentExercise?.solution_code ?? '',
    onSaved: () => {
      // Optional callback when code saved
    },
  });

  // DAP Debugger hook
  const {
    debugState,
    activeLine,
    callStack,
    variables,
    statusMessage: debugStatusMessage,
    startDebug,
    continueExec,
    stepOver,
    stepInto,
    stepOut,
    pauseExec,
    stopDebug,
  } = useDAP({
    exerciseId: selectedExerciseId,
  });

  const handleToggleBreakpoint = useCallback((line: number) => {
    setBreakpoints((prev) =>
      prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line].sort((a, b) => a - b)
    );
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
    await saveNow();
    setActiveBottomTab('debugger');
    startDebug(breakpoints);
  }, [selectedExerciseId, saveNow, startDebug, breakpoints]);

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

      // F5: Start / Continue Debugging
      if (e.key === 'F5') {
        e.preventDefault();
        if (debugState === 'STOPPED') {
          continueExec();
        } else if (debugState === 'IDLE' || debugState === 'TERMINATED') {
          handleStartDebug();
        }
        return;
      }

      // F10: Step Over
      if (e.key === 'F10' && debugState === 'STOPPED') {
        e.preventDefault();
        stepOver();
        return;
      }

      // F11: Step Into
      if (e.key === 'F11' && debugState === 'STOPPED') {
        e.preventDefault();
        stepInto();
        return;
      }

      // Shift+F11: Step Out
      if (e.shiftKey && e.key === 'F11' && debugState === 'STOPPED') {
        e.preventDefault();
        stepOut();
        return;
      }

      // Shift+F5: Stop Debugging
      if (e.shiftKey && e.key === 'F5' && debugState !== 'IDLE') {
        e.preventDefault();
        stopDebug();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun, handleDirectRun, handleStartDebug, debugState, continueExec, stepOver, stepInto, stepOut, stopDebug]);

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
          <TerminalDrawer active={activeBottomTab === 'terminal'} />
        )}
        {activeBottomTab === 'debugger' && (
          <DebuggerPanel
            debugState={debugState}
            callStack={callStack}
            variables={variables}
            statusMessage={debugStatusMessage}
            onContinue={continueExec}
            onPause={pauseExec}
            onStepOver={stepOver}
            onStepInto={stepInto}
            onStepOut={stepOut}
            onStop={stopDebug}
            onStart={handleStartDebug}
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
