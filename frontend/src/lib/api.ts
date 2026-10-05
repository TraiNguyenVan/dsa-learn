import {
  CompileRunResult,
  ConceptLesson,
  DecisionMatrixEntry,
  ExerciseDetail,
  ExerciseHintsResponse,
  ExerciseSummary,
  LessonReadingProgress,
  PatternBlueprint,
  ProgressOverviewData,
  TopicSummary,
  ToolsStatus,
  UnlockHintResponse,
  VerificationResult,
} from './types';

const API_BASE = '/api';

export async function fetchTopics(): Promise<TopicSummary[]> {
  const res = await fetch(`${API_BASE}/topics`);
  if (!res.ok) throw new Error('Failed to fetch topics');
  const data = await res.json();
  return data.topics || [];
}

export async function fetchExercises(): Promise<ExerciseSummary[]> {
  const res = await fetch(`${API_BASE}/exercises`);
  if (!res.ok) throw new Error('Failed to fetch exercises');
  const data = await res.json();
  return data.exercises || [];
}

export async function fetchExerciseDetail(exerciseId: string): Promise<ExerciseDetail> {
  const res = await fetch(`${API_BASE}/exercises/${exerciseId}`);
  if (!res.ok) throw new Error(`Failed to fetch exercise ${exerciseId}`);
  return res.json();
}

export async function saveExerciseCode(
  exerciseId: string,
  code: string
): Promise<{ status: string; saved_at: string; file_path: string }> {
  const res = await fetch(`${API_BASE}/exercises/${exerciseId}/code`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Failed to save code for ${exerciseId}`);
  return res.json();
}

export async function runVerification(exerciseId: string): Promise<VerificationResult> {
  const res = await fetch(`${API_BASE}/exercises/${exerciseId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to execute verification');
  return res.json();
}

export async function compileAndRunExercise(
  exerciseId: string,
  stdin = '',
  timeoutMs = 3000
): Promise<CompileRunResult> {
  const res = await fetch(`${API_BASE}/exercises/${exerciseId}/compile-run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stdin, timeout_ms: timeoutMs }),
  });
  if (!res.ok) throw new Error('Failed to run code');
  return res.json();
}

export async function resetExercise(exerciseId: string): Promise<{ message: string; solution_code: string }> {
  const res = await fetch(`${API_BASE}/exercises/${exerciseId}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to reset exercise');
  return res.json();
}

export async function fetchSolution(exerciseId: string, confirmReveal = false): Promise<{ solution_code: string; time_complexity: string; space_complexity: string }> {
  const res = await fetch(`${API_BASE}/exercises/${exerciseId}/solution?confirm_reveal=${confirmReveal}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch solution');
  }
  return res.json();
}

export async function fetchProgress(): Promise<ProgressOverviewData> {
  const res = await fetch(`${API_BASE}/progress`);
  if (!res.ok) throw new Error('Failed to fetch progress');
  return res.json();
}

export async function fetchToolsStatus(): Promise<ToolsStatus> {
  const res = await fetch(`${API_BASE}/tools`);
  if (!res.ok) throw new Error('Failed to inspect host developer tools');
  return res.json();
}

// Concept Learning, Pedagogy & Hints API

export async function fetchTopicLesson(topicId: string): Promise<ConceptLesson> {
  const res = await fetch(`${API_BASE}/curriculum/topics/${topicId}/lesson`);
  if (!res.ok) throw new Error(`Failed to fetch lesson for topic ${topicId}`);
  return res.json();
}

export async function updateLessonProgress(
  topicId: string,
  sectionId: string,
  markCompleted = true
): Promise<LessonReadingProgress> {
  const res = await fetch(`${API_BASE}/curriculum/topics/${topicId}/lesson/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section_id: sectionId, mark_completed: markCompleted }),
  });
  if (!res.ok) throw new Error(`Failed to update lesson progress for topic ${topicId}`);
  return res.json();
}

export async function recordVisualizerProgress(
  topicId: string,
  operationId: string
): Promise<{ topic_id: string; explored_operations: string[] }> {
  const res = await fetch(`${API_BASE}/curriculum/topics/${topicId}/visualizer/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation_id: operationId }),
  });
  if (!res.ok) throw new Error(`Failed to record visualizer progress for topic ${topicId}`);
  return res.json();
}

export async function fetchPatterns(topicId?: string): Promise<{
  patterns: PatternBlueprint[];
  decision_matrix: DecisionMatrixEntry[];
}> {
  const url = topicId ? `${API_BASE}/patterns?topic_id=${encodeURIComponent(topicId)}` : `${API_BASE}/patterns`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch pattern blueprints');
  return res.json();
}

export async function fetchExerciseHints(topicId: string, exerciseId: string): Promise<ExerciseHintsResponse> {
  const res = await fetch(`${API_BASE}/exercises/${topicId}/${exerciseId}/hints`);
  if (!res.ok) throw new Error(`Failed to fetch hints for exercise ${exerciseId}`);
  return res.json();
}

export async function unlockNextHint(topicId: string, exerciseId: string): Promise<UnlockHintResponse> {
  const res = await fetch(`${API_BASE}/exercises/${topicId}/${exerciseId}/hints/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to unlock hint for ${exerciseId}`);
  }
  return res.json();
}
