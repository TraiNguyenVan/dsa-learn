export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ExerciseStatus = 'NOT_ATTEMPTED' | 'IN_PROGRESS' | 'COMPLETED';
export type VerificationStatus = 'PASSED' | 'FAILED' | 'COMPILATION_ERROR' | 'TIMEOUT' | 'RUNTIME_ERROR';

export interface ExerciseSummary {
  id: string;
  topic_id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  /** Marks a from-scratch implementation exercise; drives FoundationBadge. */
  is_foundation?: boolean;
  /** Defaults to "problem" server-side (contract E-01). */
  kind?: 'problem' | 'implementation';
  /** Per-operation labels evaluated individually for implementation exercises. */
  components?: string[];
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

/** One entry in the suspended call stack (data-model.md §1.6).
 *  `level` 0 is the innermost frame; `line`/`column` are -1 when unknown. */
export interface DebugStackFrame {
  id: string;
  level: number;
  function: string;
  file: string | null;
  line: number;
  column: number;
}

/** A named, typed value with a lazily expandable child collection (data-model.md §1.8).
 *  `handle` is null whenever `has_children` is false. */
export interface DebugVariable {
  name: string;
  type: string | null;
  value: string;
  has_children: boolean;
  handle: string | null;
  truncated: boolean;
}

export type DebugSessionState =
  | 'IDLE'
  | 'COMPILING'
  | 'LAUNCHING'
  | 'RUNNING'
  | 'STOPPED'
  | 'TERMINATED'
  | 'FAILED';

export type DebugCommandType =
  | 'start'
  | 'continue'
  | 'step_over'
  | 'step_into'
  | 'step_out'
  | 'pause'
  | 'stop'
  | 'select_frame'
  | 'expand_variable'
  | 'refresh';

export interface DebugBreakpointSpec {
  file: string;
  line: number;
}

export interface DebugStartData {
  applied_breakpoints: number;
  requested_breakpoints: number;
  orphaned_breakpoints: { file: string; line: number; reason: string }[];
}

/** Every server->client message, discriminated by `type` (contracts/debug-protocol.md §3). */
export type DebugServerMessage =
  | { type: 'result'; id: number; command: DebugCommandType; data: Partial<DebugStartData> & Record<string, unknown> }
  | { type: 'error'; id: number; code: string; message: string; remediation: string | null }
  | { type: 'state'; state: DebugSessionState; reason?: string; line?: number; file?: string; exit_code?: number }
  | { type: 'stack'; frames: DebugStackFrame[] }
  | { type: 'variables'; frame_id: string; variables: DebugVariable[] }
  | { type: 'output'; stream: 'console' | 'stderr' | 'target'; text: string; seq: number }
  | { type: 'diagnostic'; blocked_reason: string; remediation: string | null }
  | { type: 'engine_error'; message: string };

export interface CompileRunResult {
  status: 'SUCCESS' | 'COMPILATION_ERROR' | 'TIMEOUT' | 'RUNTIME_ERROR';
  compiler_output: string;
  program_output: string;
  exit_code: number | null;
  duration_ms: number;
}

/** Result of POST /api/exercises/{id}/debug-build. On success the server hands back the
 *  authoritative absolute paths, so the client never rebuilds the exercise layout. */
export interface DebugBuildResult {
  status: 'SUCCESS' | 'COMPILATION_ERROR';
  compiler_output: string;
  program_path: string | null;
  source_path: string | null;
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
    /** Single-valued: this platform supports exactly one engine (FR-005). */
    flavor: 'gdb' | 'none';
    version: string;
    meets_minimum_version: boolean;
    /** Null exactly when `available` is true. Never a generic "unavailable" (FR-007). */
    blocked_reason: string | null;
    remediation: string | null;
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
  /** spec 006 FR-001: true when the generic fallback stands in for an
   *  un-authored lesson. Drives the visible notice and suppresses credit. */
  is_placeholder: boolean;
  /** spec 006 FR-004: topic ids this lesson builds on. Always present. */
  prerequisites: string[];
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
  | 'BALANCE'
  // spec 006: actions the new visual styles need (research R-004).
  | 'EXPAND'    // a traversal frontier grows by a node
  | 'VISIT'     // a node is consumed / settled
  | 'RECURSE'   // a backtracking call descends
  | 'BACKTRACK' // a backtracking call returns
  | 'PRUNE'     // a branch is abandoned, with a reason
  | 'WRITE'     // a table cell is filled from its dependency
  | 'EXHAUST';  // the search space is exhausted; the algorithm terminates

export type DataStructureType =
  | 'ARRAY'
  | 'LINKED_LIST'
  // spec 006: STACK_QUEUE is split. A queue cannot demonstrate a monotonic
  // stack's invariant, so a single type cannot honestly serve both subjects
  // (research R-004).
  | 'STACK'
  | 'QUEUE'
  | 'BINARY_SEARCH_TREE'
  | 'HEAP'
  | 'GRAPH'
  | 'TRIE'
  | 'DP_TABLE'
  | 'BACKTRACK';

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

// --- spec 006: state shapes for the new visual styles (research R-004) ---
// Each shape is self-describing so its renderer needs no branching on a
// discriminator, and so every subject is drawn in a layout suited to it rather
// than forced into an array or tree (FR-012).

export interface GraphNodeState {
  id: string;
  label: string;
  /** Deterministic layered layout: assigned by the generator from traversal
   *  depth, never by a force simulation (research R-003). */
  x: number;
  y: number;
  /** `covered`/`partial` are segment-tree specific: a range query marks a node
   *  fully covered, partially overlapping, or excluded from the query. */
  status?: 'default' | 'frontier' | 'visited' | 'active' | 'exhausted' | 'covered' | 'partial' | 'excluded';
}

export interface GraphEdgeState {
  from: string;
  to: string;
  weight?: number;
  status?: 'default' | 'traversed' | 'discarded';
}

export interface GraphState {
  nodes: GraphNodeState[];
  edges: GraphEdgeState[];
  /** Nodes discovered but not yet expanded. */
  frontier: string[];
  /** Nodes already settled; makes re-entry impossible. */
  visited: string[];
  active_node_id: string | null;
}

export interface TrieNodeState {
  id: string;
  char: string;
  depth: number;
  is_terminal: boolean;
  child_ids: string[];
}

export interface TrieState {
  nodes: TrieNodeState[];
  active_node_id: string | null;
}

export interface DpTableState {
  rows: string[];
  cols: string[];
  cells: Array<Array<number | null>>;
  active_cell: [number, number] | null;
  /** Inclusive cell range the current computation depends on. */
  active_range: [number, number, number, number] | null;
}

export interface BacktrackState {
  /** Nodes on the current recursion path, root first. */
  path: string[];
  /** Nodes whose subtree has been fully explored. */
  explored: string[];
  /** Nodes abandoned, with the reason the branch was pruned. */
  pruned: Array<{ node: string; reason: string }>;
  active_node_id: string | null;
}

export interface StackState {
  /** Index 0 is the bottom of the stack. */
  entries: Array<{ value: number | string; label?: string }>;
  popped: Array<{ value: number | string; label?: string }>;
}

export interface QueueState {
  entries: Array<{ value: number | string; label?: string }>;
  dequeued: Array<{ value: number | string; label?: string }>;
}

export interface VisualizerStateFrame {
  step_index: number;
  total_steps: number;
  action_type: ActionType;
  /** What changed at this step. */
  description: string;
  /** Why that change follows. Required and non-empty: FR-009 requires
   *  narration that explains the reasoning, and a separate field is what makes
   *  that mechanically checkable rather than a matter of taste (research R-005).
   *  A rationale that merely restates `description` still fails review (F-04). */
  rationale: string;
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
  stack_state?: StackState;
  queue_state?: QueueState;
  graph_state?: GraphState;
  trie_state?: TrieState;
  dp_table_state?: DpTableState;
  backtrack_state?: BacktrackState;
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

