/**
 * Graph shape / overview entry-point tests — runnable without `vitest` (spec 007).
 *
 * Mirrors `graphShape.test.ts` for the same reason as
 * `location.node.test.mjs`: the vitest binary is not installed here, and these
 * modules are pure functions precisely so the contracts stay verifiable.
 *
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(here, '..', '..', '..', '..');

// `graphShape.ts` imports types only from '@/lib/types' (erased) plus the
// `ValidationContext` type from '@/lib/location/location' (also type-only), so
// each module transpiles standalone with no alias resolution.
const workDir = mkdtempSync(join(tmpdir(), 'dsa-graph-'));

async function load(sourceRel) {
  const outFile = join(workDir, sourceRel.replace(/[^a-z0-9]/gi, '_') + '.mjs');
  execFileSync(
    join(frontendRoot, 'node_modules', '.bin', 'esbuild'),
    [join(frontendRoot, sourceRel), '--format=esm', '--outfile=' + outFile, '--log-level=error'],
    { stdio: 'inherit' }
  );
  return import('file://' + outFile);
}

const graphShape = await load('src/lib/curriculum/graphShape.ts');
const location = await load('src/lib/location/location.ts');

const node = (id, order, extra = {}) => ({
  id,
  title: id === 'trees' ? 'Trees & Binary Search Trees' : id,
  description: 'desc',
  display_order: order,
  exercise_count: 1,
  completed_count: 0,
  resolved: true,
  ...extra,
});

const GRAPH_JSON = {
  nodes: [node('arrays-hashing', 1), node('linked-lists', 6), node('trees', 7), node('math-bitwise', 16)],
  prerequisites_by_topic: {
    'arrays-hashing': [],
    'linked-lists': [],
    trees: [node('arrays-hashing', 1), node('linked-lists', 6)],
    'math-bitwise': [],
  },
  dependents_by_topic: {
    'arrays-hashing': [node('trees', 7)],
    'linked-lists': [node('trees', 7)],
    trees: [],
    'math-bitwise': [],
  },
  neighbours_by_topic: {
    'arrays-hashing': [{ node: node('trees', 7), reason: 'adjacent-in-order', shared_prerequisite_titles: [] }],
    'linked-lists': [],
    trees: [],
    'math-bitwise': [{ node: node('linked-lists', 6), reason: 'adjacent-in-order', shared_prerequisite_titles: [] }],
  },
  unresolved: [],
};

const graph = graphShape.parseCurriculumGraph(GRAPH_JSON);
const ctx = graphShape.buildValidationContext(graph, []);

test('parseCurriculumGraph accepts a well-formed graph', () => {
  assert.equal(graph.nodes.length, 4);
  assert.deepEqual(graph.unresolved, []);
});

test('parseCurriculumGraph normalises missing buckets to empty maps', () => {
  const sparse = graphShape.parseCurriculumGraph({ nodes: [node('only', 1)] });
  assert.deepEqual(sparse.prerequisites_by_topic, {});
  assert.deepEqual(sparse.dependents_by_topic, {});
  assert.deepEqual(sparse.neighbours_by_topic, {});
  assert.deepEqual(sparse.unresolved, []);
});

test('parseCurriculumGraph never throws on a malformed payload — FR-014', () => {
  assert.doesNotThrow(() => graphShape.parseCurriculumGraph(null));
  assert.doesNotThrow(() => graphShape.parseCurriculumGraph({ nodes: 'not-an-array' }));
  assert.deepEqual(graphShape.parseCurriculumGraph(null).nodes, []);
});

test('buildValidationContext exposes every topic id in display order', () => {
  assert.deepEqual(ctx.knownTopicIds, ['arrays-hashing', 'linked-lists', 'trees', 'math-bitwise']);
  assert.equal(ctx.fallbackTopicId, 'arrays-hashing');
});

test('buildValidationContext falls back to the caller topic list when no graph', () => {
  const c = graphShape.buildValidationContext(null, [{ id: 'zulu', display_order: 2 }, { id: 'alpha', display_order: 1 }]);
  assert.deepEqual(c.knownTopicIds, ['zulu', 'alpha']);
  assert.equal(c.fallbackTopicId, 'alpha');
});

test('every topic is reachable in one interaction — SC-007 / FR-021', () => {
  for (const n of graph.nodes) {
    const decoded = location.validateLocation({ topic: n.id }, ctx);
    assert.deepEqual(decoded.problems, []);
    assert.equal(decoded.location.topic_id, n.id);
    assert.equal(decoded.location.view, 'concept');
  }
});

test('selecting a topic encodes a short concept-view link', () => {
  assert.equal(location.encodeLocation(graphShape.overviewEntryLocation('trees')), '?topic=trees');
});

test('the fully disconnected topic renders with zero counts — FR-022', () => {
  assert.deepEqual(graph.prerequisites_by_topic['math-bitwise'], []);
  assert.deepEqual(graph.dependents_by_topic['math-bitwise'], []);
  const decoded = location.validateLocation({ topic: 'math-bitwise', view: 'concept' }, ctx);
  assert.deepEqual(decoded.problems, []);
  assert.equal(decoded.location.topic_id, 'math-bitwise');
});

test('zero progress still yields the full graph — FR-022', () => {
  const zeroed = graphShape.parseCurriculumGraph({
    ...GRAPH_JSON,
    nodes: GRAPH_JSON.nodes.map((n) => ({ ...n, completed_count: 0 })),
  });
  assert.equal(zeroed.nodes.length, 4);
  assert.equal(graphShape.buildValidationContext(zeroed, []).knownTopicIds.length, 4);
});

test('accessors return empty arrays when the graph is absent', () => {
  assert.deepEqual(graphShape.prerequisitesFor(null, 'trees'), []);
  assert.deepEqual(graphShape.dependentsFor(null, 'trees'), []);
  assert.deepEqual(graphShape.neighboursFor(null, 'trees'), []);
  assert.deepEqual(graphShape.unresolvedFor(null, 'trees'), []);
});

test('accessors isolate the current topic — FR-003', () => {
  assert.deepEqual(
    graphShape.dependentsFor(graph, 'arrays-hashing').map((n) => n.id),
    ['trees']
  );
  assert.deepEqual(
    graphShape.prerequisitesFor(graph, 'trees').map((n) => n.id),
    ['arrays-hashing', 'linked-lists']
  );
});

test('a neighbour suggestion keeps its reason — FR-017', () => {
  const suggestions = graphShape.neighboursFor(graph, 'arrays-hashing');
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].reason, 'adjacent-in-order');
  assert.equal(suggestions[0].node.title, 'Trees & Binary Search Trees');
});