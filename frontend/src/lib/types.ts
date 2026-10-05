export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ExerciseStatus = 'NOT_ATTEMPTED' | 'IN_PROGRESS' | 'COMPLETED';
export type VerificationStatus = 'PASSED' | 'FAILED' | 'COMPILATION_ERROR' | 'TIMEOUT' | 'RUNTIME_ERROR';

export interface ExerciseSummary {
  id: string;
  topic_id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  time_complexity_target: string;
  space_complexity_target: string;
  status: ExerciseStatus;
  attempts_count: number;
  completed_at?: string;
  reference_url?: string;
}

export interface TopicSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  display_order: number;
  exercise_count: number;
  completed_count: number;
  roadmap_url?: string;
}

export interface CompilerDiagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'note';
  raw_message: string;
  explanation: string;
  suggestion?: string;
}

export interface TestCaseResult {
  tier: string;
  name: string;
  passed: boolean;
  duration_us: number;
  expected?: string;
  actual?: string;
  failure_message?: string;
}

export interface TierSummary {
  tier: string;
  total: number;
  passed: number;
  tests: TestCaseResult[];
}

export interface VerificationResult {
  id: string;
  exercise_id: string;
  timestamp: string;
  status: VerificationStatus;
  duration_ms: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  tiers: TierSummary[];
  diagnostics: CompilerDiagnostic[];
  raw_output?: string;
}

export interface ExerciseDetail extends ExerciseSummary {
  timeout_ms: number;
  problem_markdown: string;
  solution_code: string;
  solution_relpath: string;
  last_attempt?: any;
}

export interface ProgressOverviewData {
  total_exercises: number;
  completed_exercises: number;
  overall_completion_rate: number;
  topics: {
    topic_id: string;
    title: string;
    total: number;
    completed: number;
    mastery_percent: number;
  }[];
}
