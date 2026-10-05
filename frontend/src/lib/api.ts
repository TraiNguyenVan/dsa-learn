import {
  ExerciseDetail,
  ExerciseSummary,
  ProgressOverviewData,
  TopicSummary,
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

export async function runVerification(exerciseId: string): Promise<VerificationResult> {
  const res = await fetch(`${API_BASE}/exercises/${exerciseId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to execute verification');
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
