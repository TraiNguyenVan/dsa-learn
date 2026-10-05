export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ExerciseStatus = 'NOT_ATTEMPTED' | 'IN_PROGRESS' | 'COMPLETED';
export type VerificationStatus = 'PASSED' | 'FAILED' | 'COMPILATION_ERROR' | 'TIMEOUT' | 'RUNTIME_ERROR';

export interface ExerciseSummary {
  id: string;
  topic_id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  is_foundation?: boolean;
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
  component?: string;
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

export interface FoundationMethodSummary {
  name: string;
  total: number;
  passed: number;
  status: 'PASSED' | 'FAILED';
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
  methods?: FoundationMethodSummary[];
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

// In-Browser Code Editor & Developer Environment Types

export interface EditorSession {
  exercise_id: string;
  file_relpath: string;
  content: string;
  is_dirty: boolean;
  last_saved_at?: string;
  revision: number;
}

export interface DiagnosticItem {
  line: number;
  column: number;
  end_line: number;
  end_column: number;
  severity: 'error' | 'warning' | 'information' | 'hint';
  message: string;
  source?: string;
}

export interface TerminalSession {
  session_id: string;
  pid: number;
  cols: number;
  rows: number;
  shell_cmd: string;
  cwd: string;
  status: 'ACTIVE' | 'CLOSING' | 'TERMINATED';
}

export interface Breakpoint {
  file: string;
  line: number;
  verified: boolean;
}

export interface StackFrame {
  id: number;
  name: string;
  source?: string;
  line: number;
  column: number;
}

export interface Scope {
  name: string;
  variablesReference: number;
  expensive?: boolean;
}

export interface Variable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
}

export type DebugSessionState =
  | 'IDLE'
  | 'COMPILING'
  | 'LAUNCHING'
  | 'RUNNING'
  | 'STOPPED'
  | 'TERMINATED';

export interface CompileRunResult {
  status: 'SUCCESS' | 'COMPILATION_ERROR' | 'TIMEOUT' | 'RUNTIME_ERROR';
  compiler_output: string;
  program_output: string;
  exit_code: number | null;
  duration_ms: number;
}

export interface ToolsStatus {
  compiler: {
    available: boolean;
    binary: string;
    flavor: string;
  };
  language_server: {
    available: boolean;
    binary: string;
  };
  debugger: {
    available: boolean;
    binary: string;
    flavor: 'gdb-dap' | 'codelldb' | 'lldb-dap' | 'none';
  };
  shell: {
    available: boolean;
    path: string;
    platform: string;
  };
}

// Concept Learning, Pedagogy & Interactive Visualizer Types

export interface LessonSection {
  id: string;
  title: string;
  order: number;
  estimated_minutes: number;
  content_markdown: string;
}

export interface ComplexityEntry {
  operation: string;
  best_time: string;
  average_time: string;
  worst_time: string;
  space_complexity: string;
  notes: string;
}

export interface LessonReadingProgress {
  topic_id: string;
  completed_sections: string[];
  last_read_section: string | null;
  progress_pct: number;
  completed_at?: string | null;
  updated_at?: string;
}

export interface ConceptLesson {
  topic_id: string;
  title: string;
  summary: string;
  sections: LessonSection[];
  complexity_matrix: ComplexityEntry[];
  reading_progress: LessonReadingProgress;
}

export type ActionType =
  | 'INIT'
  | 'COMPARE'
  | 'POINTER_MOVE'
  | 'INSERT'
  | 'REMOVE'
  | 'SWAP'
  | 'HIGHLIGHT'
  | 'TRAVERSE'
  | 'SPLIT'
  | 'MERGE'
  | 'BALANCE';

export type DataStructureType =
  | 'ARRAY'
  | 'LINKED_LIST'
  | 'STACK_QUEUE'
  | 'BINARY_SEARCH_TREE'
  | 'HEAP'
  | 'GRAPH';

export interface ArrayElementState {
  value: number | string;
  index: number;
  is_highlighted: boolean;
  status?: 'default' | 'active' | 'sorted' | 'candidate';
  label?: string;
}

export interface ArrayPointerState {
  name: string;
  target_index: number;
  color: string;
}

export interface LinkedListNodeState {
  id: string;
  value: number | string;
  next_id: string | null;
  prev_id?: string | null;
  is_highlighted: boolean;
  status?: 'default' | 'target' | 'visited';
  label?: string;
}

export interface LinkedListPointerState {
  name: string;
  target_node_id: string | null;
  color: string;
}

export interface TreeNodeState {
  id: string;
  value: number;
  left_id: string | null;
  right_id: string | null;
  is_highlighted: boolean;
  status?: 'default' | 'active' | 'found' | 'rotated';
  height?: number;
}

export interface HeapElementState {
  value: number;
  index: number;
  is_highlighted: boolean;
}

export interface VisualizerStateFrame {
  step_index: number;
  total_steps: number;
  action_type: ActionType;
  description: string;
  data_structure_type: DataStructureType;
  array_state?: {
    elements: ArrayElementState[];
    pointers: ArrayPointerState[];
  };
  linked_list_state?: {
    nodes: LinkedListNodeState[];
    pointers: LinkedListPointerState[];
  };
  tree_state?: {
    nodes: TreeNodeState[];
    active_node_id: string | null;
  };
  heap_state?: {
    elements: HeapElementState[];
    swapping_indices: [number, number] | null;
  };
}

export interface VisualizerOperation {
  id: string;
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    label: string;
    type: 'number' | 'string' | 'boolean';
    default_value: any;
    min?: number;
    max?: number;
  }>;
  presets: Array<{
    name: string;
    description: string;
    initial_values: any[];
    operation_param: any;
  }>;
}

export interface PatternBlueprint {
  id: string;
  title: string;
  topic_ids: string[];
  summary: string;
  trigger_cues: string[];
  invariant_rules: string[];
  code_template_cpp: string;
  common_pitfalls: string[];
  related_exercise_ids: string[];
}

export interface DecisionMatrixCandidate {
  structure_name: string;
  time_complexity: string;
  space_overhead: string;
  best_when: string;
  avoid_when: string;
  is_recommended: boolean;
}

export interface DecisionMatrixEntry {
  id: string;
  scenario: string;
  candidates: DecisionMatrixCandidate[];
}

export interface ProgressiveHint {
  tier: number;
  type: 'NUDGE' | 'STRATEGY' | 'PSEUDOCODE';
  title: string;
  is_unlocked: boolean;
  content_markdown?: string | null;
}

export interface ExerciseHintsResponse {
  exercise_id: string;
  total_hints: number;
  max_unlocked_tier: number;
  hints: ProgressiveHint[];
}

export interface UnlockHintResponse {
  unlocked_tier: number;
  hint: {
    tier: number;
    type: 'NUDGE' | 'STRATEGY' | 'PSEUDOCODE';
    title: string;
    content_markdown: string;
  };
}

// In-Browser C++ Code Autocompletion & IntelliSense Types

export type LanguageServiceStatus = 'connecting' | 'active' | 'fallback';

export interface LanguageServiceState {
  status: LanguageServiceStatus;
  binaryDetected: boolean;
  message?: string;
}

export interface LSPCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string | { kind: string; value: string };
  insertText?: string;
  sortText?: string;
}

export interface LSPCompletionList {
  isIncomplete: boolean;
  items: LSPCompletionItem[];
}

export interface LSPHover {
  contents: string | { kind?: string; value: string } | Array<string | { kind?: string; value: string }>;
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface LSPParameterInformation {
  label: string | [number, number];
  documentation?: string | { kind: string; value: string };
}

export interface LSPSignatureInformation {
  label: string;
  documentation?: string | { kind: string; value: string };
  parameters?: LSPParameterInformation[];
  activeParameter?: number;
}

export interface LSPSignatureHelp {
  signatures: LSPSignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}

export interface StaticCompletionEntry {
  label: string;
  kind: 'keyword' | 'type' | 'function' | 'snippet';
  detail: string;
  documentation: string;
  insertText: string;
  isSnippet?: boolean;
}

