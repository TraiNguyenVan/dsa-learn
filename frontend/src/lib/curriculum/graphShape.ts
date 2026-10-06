/**
 * Graph payload normalisation and validation-context construction
 * (spec 007, T045/T046).
 *
 * Pure functions, no React and no DOM (R-008), so the graph contract is
 * testable without mounting the tree.
 *
 * Two responsibilities, deliberately in one place because the second derives
 * from the first:
 *   - `parseCurriculumGraph` turns an untrusted JSON payload into a graph the
 *     UI can index without guarding every access.
 *   - `buildValidationContext` turns that graph into what location validation
 *     needs, so a deep link can be checked against the live curriculum.
 */

import type {
  CurriculumGraph,
  GraphNode,
  LearningLocation,
  NeighbourSuggestion,
  TopicSummary,
  UnresolvedReference,
} from '@/lib/types';
import type { ValidationContext } from '@/lib/location/location';

const EMPTY_GRAPH: CurriculumGraph = {
  nodes: [],
  prerequisites_by_topic: {},
  dependents_by_topic: {},
  neighbours_by_topic: {},
  unresolved: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseNode(raw: unknown): GraphNode | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!id) return null;

  const order = raw.display_order;
  return {
    id,
    title: typeof raw.title === 'string' ? raw.title : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    display_order: typeof order === 'number' ? order : null,
    exercise_count: typeof raw.exercise_count === 'number' ? raw.exercise_count : 0,
    completed_count: typeof raw.completed_count === 'number' ? raw.completed_count : 0,
    // Invariant I-5: a node only ever exists for a real topic.
    resolved: true,
  };
}

function parseNodeList(raw: unknown): GraphNode[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseNode).filter((n): n is GraphNode => n !== null);
}

function parseUnresolved(raw: unknown): UnresolvedReference[] {
  if (!Array.isArray(raw)) return [];
  const out: UnresolvedReference[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    if (typeof entry.referenced_by !== 'string' || typeof entry.referenced_id !== 'string') {
      continue;
    }
    out.push({
      referenced_by: entry.referenced_by,
      referenced_id: entry.referenced_id,
      resolved: false,
    });
  }
  return out;
}

function parseBucket(raw: unknown): Record<string, GraphNode[]> {
  if (!isRecord(raw)) return {};
  const out: Record<string, GraphNode[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    out[key] = parseNodeList(value);
  }
  return out;
}

function parseNeighbourBucket(raw: unknown): Record<string, NeighbourSuggestion[]> {
  if (!isRecord(raw)) return {};
  const out: Record<string, NeighbourSuggestion[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) {
      out[key] = [];
      continue;
    }
    const suggestions: NeighbourSuggestion[] = [];
    for (const entry of value) {
      if (!isRecord(entry)) continue;
      const node = parseNode(entry.node);
      if (!node) continue;
      suggestions.push({
        node,
        reason: entry.reason === 'adjacent-in-order' ? 'adjacent-in-order' : 'shared-prerequisite',
        shared_prerequisite_titles: Array.isArray(entry.shared_prerequisite_titles)
          ? entry.shared_prerequisite_titles.filter((t): t is string => typeof t === 'string')
          : [],
      });
    }
    out[key] = suggestions;
  }
  return out;
}

/**
 * Normalise a graph payload. Never throws (FR-014): a malformed response
 * degrades to an empty graph, which renders as "no cross-topic navigation"
 * rather than breaking the lesson the learner opened.
 */
export function parseCurriculumGraph(payload: unknown): CurriculumGraph {
  if (!isRecord(payload)) return { ...EMPTY_GRAPH };

  return {
    nodes: parseNodeList(payload.nodes),
    prerequisites_by_topic: parseBucket(payload.prerequisites_by_topic),
    dependents_by_topic: parseBucket(payload.dependents_by_topic),
    neighbours_by_topic: parseNeighbourBucket(payload.neighbours_by_topic),
    unresolved: parseUnresolved(payload.unresolved),
  };
}

/**
 * Build the validation context location validation needs.
 *
 * `fallbackTopicId` is the first topic by display order — the same choice the
 * server makes — so client and server agree on what "the first topic" means.
 * With no graph available the caller's own topic list is used, so a deep link
 * still resolves rather than falling back to an empty string.
 */
export function buildValidationContext(
  graph: CurriculumGraph | null,
  topics: TopicSummary[]
): ValidationContext {
  const nodes = graph?.nodes ?? [];

  const knownTopicIds = nodes.length > 0 ? nodes.map((n) => n.id) : topics.map((t) => t.id);

  const ordered = [...nodes].sort((a, b) => {
    const ao = a.display_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.display_order ?? Number.MAX_SAFE_INTEGER;
    return ao === bo ? a.id.localeCompare(b.id) : ao - bo;
  });

  const fallbackTopicId =
    ordered[0]?.id ?? [...topics].sort((a, b) => a.display_order - b.display_order)[0]?.id ?? '';

  return {
    knownTopicIds,
    // Section ids are per-topic and only known once a lesson has loaded; the
    // viewer resolves the section itself, so nothing is pre-declared here.
    knownSectionIds: [],
    knownExerciseIds: [],
    fallbackTopicId,
    fallbackExerciseId: null,
  };
}

/** Prerequisite nodes for a topic, or an empty array when the graph is absent. */
export function prerequisitesFor(graph: CurriculumGraph | null, topicId: string): GraphNode[] {
  return graph?.prerequisites_by_topic?.[topicId] ?? [];
}

/** Dependent nodes for a topic, or an empty array when the graph is absent. */
export function dependentsFor(graph: CurriculumGraph | null, topicId: string): GraphNode[] {
  return graph?.dependents_by_topic?.[topicId] ?? [];
}

/** Neighbour suggestions for a topic, or an empty array when the graph is absent. */
export function neighboursFor(
  graph: CurriculumGraph | null,
  topicId: string
): NeighbourSuggestion[] {
  return graph?.neighbours_by_topic?.[topicId] ?? [];
}

/** Unresolved references declared by a topic (FR-007). */
export function unresolvedFor(graph: CurriculumGraph | null, topicId: string): UnresolvedReference[] {
  return (graph?.unresolved ?? []).filter((ref) => ref.referenced_by === topicId);
}

/** The overview's entry-point location for a topic (FR-021). */
export function overviewEntryLocation(topicId: string): LearningLocation {
  return { topic_id: topicId, view: 'concept' };
}