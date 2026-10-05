import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
import { CurriculumSidebar } from '@/components/curriculum/CurriculumSidebar';
import { ProblemViewer } from '@/components/problem/ProblemViewer';
import { TestRunnerDrawer } from '@/components/runner/TestRunnerDrawer';
import { SolutionModal } from '@/components/problem/SolutionModal';
import {
  fetchTopics,
  fetchExercises,
  fetchExerciseDetail,
  runVerification,
  resetExercise,
} from '@/lib/api';
import {
  TopicSummary,
  ExerciseSummary,
  ExerciseDetail,
  VerificationResult,
} from '@/lib/types';
import { useSSE } from '@/lib/useEvents';

export function App() {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [currentExercise, setCurrentExercise] = useState<ExerciseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [testResult, setTestResult] = useState<VerificationResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [solutionModalOpen, setSolutionModalOpen] = useState(false);

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

  // Execute verification
  const handleRun = useCallback(async () => {
    if (!selectedExerciseId || isExecuting) return;

    setIsExecuting(true);
    try {
      const result = await runVerification(selectedExerciseId);
      setTestResult(result);
      // Refresh exercise status in list
      loadCatalogData();
    } catch (err) {
      console.error('Verification failed', err);
    } finally {
      setIsExecuting(false);
    }
  }, [selectedExerciseId, isExecuting, loadCatalogData]);

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
          console.log(`File saved on disk for ${data.exercise_id}, triggering auto-verification...`);
          handleRun();
        }
      },
      [selectedExerciseId, handleRun]
    )
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to run verification
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun]);

  const solvedCount = exercises.filter((e) => e.status === 'COMPLETED').length;
  const isCurrentCompleted = currentExercise?.status === 'COMPLETED';

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0F172A] overflow-hidden select-none">
      <Header
        exerciseTitle={currentExercise?.title}
        isExecuting={isExecuting}
        onRun={handleRun}
        onReset={handleReset}
        onViewSolution={() => setSolutionModalOpen(true)}
        solvedCount={solvedCount}
        totalCount={exercises.length}
      />

      <ResizableLayout
        sidebar={
          <CurriculumSidebar
            topics={topics}
            exercises={exercises}
            selectedExerciseId={selectedExerciseId}
            onSelectExercise={(id) => setSelectedExerciseId(id)}
          />
        }
        problemView={<ProblemViewer exercise={currentExercise} loading={loadingDetail} />}
        runnerView={<TestRunnerDrawer result={testResult} isExecuting={isExecuting} />}
      />

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
