/**
 * Location gates G-19 / G-20 — runnable today without `vitest` (spec 007).
 *
 * `frontend/node_modules/.bin` has `tsc`, `vite`, and `esbuild` but no
 * `vitest` binary, and monaco-editor / katex / marked are absent, so the
 * vitest suite beside this file cannot execute in this environment.
 *
 * `location.ts` was written as pure functions with no React and no DOM
 * dependency precisely so it could still be verified (R-008). This harness
 * transpiles that one module with the locally installed esbuild and runs the
 * same gate assertions under `node:test`. No network access, no install.
 *
 * When `vitest` is available, `location.test.ts` is the primary suite and this
 * file is redundant — both assert the same invariants numbered to
 * specs/007-concept-theory-navigation/contracts/location-contract.md.
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
const locationSource = join(frontendRoot, 'src', 'lib', 'location', 'location.ts');

// Transpile just the location module. Its only import is a type-only import
// from '@/lib/types', which esbuild erases, so no alias resolution is needed.
const workDir = mkdtempSync(join(tmpdir(), 'dsa-loc-'));
const outFile = join(workDir, 'location.mjs');
execFileSync(
  join(frontendRoot, 'node_modules', '.bin', 'esbuild'),
  [locationSource, '--format=esm', '--outfile=' + outFile, '--log-level=error'],
  { stdio: 'inherit' }
);
const {
  encodeLocation,
  parseLocation,
  validateLocation,
  resolveLocation,
  locationsEqual,
  DEFAULT_VIEW,
} = await import('file://' + outFile);

const CONTEXT = {
  knownTopicIds: ['arrays-hashing', 'linked-lists', 'trees', 'graphs'],
  knownSectionIds: ['overview', 'core-operations-invariants', 'limits'],
  knownExerciseIds: ['dynamic-array', 'two-sum'],
  fallbackTopicId: 'arrays-hashing',
  fallbackExerciseId: 'dynamic-array',
};

// ---------------------------------------------------------------------------
// parseLocation
// ---------------------------------------------------------------------------

test('parseLocation splits a full query string', () => {
  assert.deepEqual(parseLocation('?topic=trees&view=concept&section=limits'), {
    topic: 'trees',
    view: 'concept',
    section: 'limits',
  });
});

test('parseLocation accepts a string with no leading question mark', () => {
  assert.equal(parseLocation('topic=trees').topic, 'trees');
});

test('parseLocation returns an empty object for empty input', () => {
  assert.deepEqual(parseLocation(''), {});
  assert.deepEqual(parseLocation('?'), {});
});

test('parseLocation ignores unknown parameters', () => {
  assert.deepEqual(parseLocation('?topic=trees&unrelated=1'), { topic: 'trees' });
});

test('parseLocation never throws on a malformed percent-escape', () => {
  assert.doesNotThrow(() => parseLocation('?topic=%E0%A4%A'));
});

// ---------------------------------------------------------------------------
// gate G-19 — validation
// ---------------------------------------------------------------------------

test('G-19: a fully valid location resolves with no problems', () => {
  const r = validateLocation(
    { topic: 'trees', view: 'concept', section: 'core-operations-invariants' },
    CONTEXT
  );
  assert.deepEqual(r.problems, []);
  assert.equal(r.usedFallbackTopic, false);
  assert.equal(r.usedFallbackView, false);
  assert.equal(r.location.topic_id, 'trees');
  assert.equal(r.location.section_id, 'core-operations-invariants');
});

test('G-19: an absent view defaults to concept', () => {
  const r = validateLocation({ topic: 'trees' }, CONTEXT);
  assert.equal(r.location.view, DEFAULT_VIEW);
  assert.deepEqual(r.problems, []);
});

test('G-19: an unknown topic falls back and is reported', () => {
  const r = validateLocation({ topic: 'no-such-topic' }, CONTEXT);
  assert.equal(r.location.topic_id, 'arrays-hashing');
  assert.equal(r.usedFallbackTopic, true);
  assert.equal(r.problems.length, 1);
  assert.equal(r.problems[0].field, 'topic');
  assert.equal(r.problems[0].given, 'no-such-topic');
});

test('G-19: an unknown view falls back to concept and is reported', () => {
  const r = validateLocation({ topic: 'trees', view: 'nonsense' }, CONTEXT);
  assert.equal(r.location.view, 'concept');
  assert.equal(r.usedFallbackView, true);
});

test('G-19: an unknown section degrades to the lesson as a whole — L-4', () => {
  const r = validateLocation(
    { topic: 'trees', view: 'concept', section: 'does-not-exist' },
    CONTEXT
  );
  assert.equal(r.location.topic_id, 'trees');
  assert.equal(r.location.view, 'concept');
  assert.equal(r.location.section_id, undefined);
  assert.equal(r.problems[0].field, 'section');
});

test('G-19: a section outside the concept view is not honoured — L-5', () => {
  const r = validateLocation(
    { topic: 'trees', view: 'visualizer', section: 'limits' },
    CONTEXT
  );
  assert.equal(r.location.section_id, undefined);
});

test('G-19: fields resolve independently', () => {
  const r = validateLocation(
    { topic: 'graphs', view: 'concept', section: 'missing-section' },
    CONTEXT
  );
  assert.equal(r.location.topic_id, 'graphs');
  assert.equal(r.usedFallbackTopic, false);
});

test('G-19: validation always returns a renderable location — L-1, L-2, L-3', () => {
  const r = validateLocation({}, CONTEXT);
  assert.ok(r.location.topic_id);
  assert.ok(['concept', 'visualizer', 'patterns', 'exercises'].includes(r.location.view));
});

test('G-19: problems are ordered topic, view, section — L-7', () => {
  // `view` is bogus, so it falls back to concept, which is the only view in
  // which a section is checked at all; the bogus exercise is therefore not
  // acted on and not reported.
  const r = validateLocation(
    { topic: 'bogus', view: 'bogus', section: 'bogus', exercise: 'bogus' },
    CONTEXT
  );
  assert.deepEqual(
    r.problems.map((p) => p.field),
    ['topic', 'view', 'section']
  );
});

test('G-19: an exercise problem is reported in the exercises view', () => {
  const r = validateLocation(
    { topic: 'bogus', view: 'exercises', exercise: 'bogus' },
    CONTEXT
  );
  assert.deepEqual(
    r.problems.map((p) => p.field),
    ['topic', 'exercise']
  );
});

test('G-19: every problem carries a non-empty human-readable reason — L-6', () => {
  const r = resolveLocation('?topic=bogus&view=bogus&section=bogus', CONTEXT);
  assert.ok(r.problems.length > 0);
  for (const p of r.problems) {
    assert.ok(p.reason.length > 0, `empty reason for ${p.field}`);
  }
});

test('G-19: an unreadable link still renders and is reported — L-1, L-6', () => {
  const r = resolveLocation('total-nonsense', CONTEXT);
  assert.equal(r.location.topic_id, 'arrays-hashing');
  assert.equal(r.problems[0].field, 'syntax');
});

test('G-19: an empty search is not treated as garbage', () => {
  assert.deepEqual(resolveLocation('', CONTEXT).problems, []);
  assert.deepEqual(resolveLocation('?', CONTEXT).problems, []);
});

test('G-19: a stale link surfaces every downgrade — L-6, L-7', () => {
  // `view` must be `concept`: per L-5 a section is only honoured there, so in
  // any other view it is inapplicable rather than wrong and goes unreported.
  const r = resolveLocation(
    '?topic=removed-topic&view=concept&section=removed-section',
    CONTEXT
  );
  assert.equal(r.usedFallbackTopic, true);
  assert.deepEqual(
    r.problems.map((p) => p.field),
    ['topic', 'section']
  );
});

test('G-19: an inapplicable section is not reported as a downgrade — L-5', () => {
  // The mirror of the vitest case of the same name. It exists here because this
  // mirror previously omitted the stale-link case entirely, which is how the two
  // suites silently diverged and a wrong assertion shipped green in one of them.
  const r = resolveLocation(
    '?topic=removed-topic&view=visualizer&section=removed-section',
    CONTEXT
  );
  assert.deepEqual(
    r.problems.map((p) => p.field),
    ['topic']
  );
});

test('G-19: the exercises view substitutes the first exercise', () => {
  const r = validateLocation(
    { topic: 'trees', view: 'exercises', exercise: 'not-an-exercise' },
    CONTEXT
  );
  assert.equal(r.location.exercise_id, 'dynamic-array');
  assert.ok(r.problems.some((p) => p.field === 'exercise'));
});

// ---------------------------------------------------------------------------
// gate G-20 — encoding and history sequence
// ---------------------------------------------------------------------------

test('G-20: the default view is omitted — encoding rule 3', () => {
  assert.equal(encodeLocation({ topic_id: 'trees', view: 'concept' }), '?topic=trees');
});

test('G-20: a non-default view is emitted', () => {
  assert.equal(
    encodeLocation({ topic_id: 'trees', view: 'visualizer' }),
    '?topic=trees&view=visualizer'
  );
});

test('G-20: undefined section and exercise are omitted entirely — encoding rule 1', () => {
  const encoded = encodeLocation({ topic_id: 'trees', view: 'concept' });
  assert.ok(!encoded.includes('section'));
  assert.ok(!encoded.includes('exercise'));
});

test('G-20: parameters use the fixed order — encoding rule 4', () => {
  assert.equal(
    encodeLocation({
      topic_id: 'trees',
      view: 'visualizer',
      section_id: 'limits',
      exercise_id: 'two-sum',
    }),
    '?topic=trees&view=visualizer&section=limits&exercise=two-sum'
  );
});

test('G-20: values are percent-encoded — encoding rule 2', () => {
  const encoded = encodeLocation({ topic_id: 'weird id/&', view: 'concept' });
  assert.equal(encoded, '?topic=weird%20id%2F%26');
  assert.equal(parseLocation(encoded).topic, 'weird id/&');
});

test('G-20: a location round-trips', () => {
  const encoded = encodeLocation({
    topic_id: 'trees',
    view: 'exercises',
    exercise_id: 'two-sum',
  });
  const r = validateLocation(parseLocation(encoded), CONTEXT);
  assert.equal(r.location.topic_id, 'trees');
  assert.equal(r.location.view, 'exercises');
  assert.equal(r.location.exercise_id, 'two-sum');
  assert.deepEqual(r.problems, []);
});

test('G-20: equivalent locations encode identically', () => {
  assert.ok(
    locationsEqual(
      { topic_id: 'trees', view: 'concept' },
      { topic_id: 'trees', view: 'concept' }
    )
  );
  assert.ok(
    !locationsEqual(
      { topic_id: 'trees', view: 'concept' },
      { topic_id: 'graphs', view: 'concept' }
    )
  );
});

test('G-20: a five-link chain yields five distinct addressable entries — H-4', () => {
  const chain = [
    { topic_id: 'arrays-hashing', view: 'concept' },
    { topic_id: 'linked-lists', view: 'concept' },
    { topic_id: 'trees', view: 'concept' },
    { topic_id: 'graphs', view: 'concept' },
    { topic_id: 'graph-algorithms', view: 'concept' },
  ];
  const encoded = chain.map((l) => encodeLocation(l));
  assert.equal(new Set(encoded).size, chain.length);
});

test('G-20: walking the chain backwards reconstructs the visited sequence — H-5', () => {
  const chain = [
    { topic_id: 'arrays-hashing', view: 'concept' },
    { topic_id: 'linked-lists', view: 'concept' },
    { topic_id: 'trees', view: 'concept' },
    { topic_id: 'graphs', view: 'concept' },
    { topic_id: 'graph-algorithms', view: 'concept' },
  ];
  const context = { ...CONTEXT, knownTopicIds: [...CONTEXT.knownTopicIds, 'graph-algorithms'] };
  const reversed = [...chain].reverse();
  const recovered = reversed.map(
    (loc) => validateLocation(parseLocation(encodeLocation(loc)), context).location.topic_id
  );
  // Every hop resolves to its own topic, so a back action returns the learner
  // exactly where they were rather than to a fallback.
  assert.deepEqual(recovered, [
    'graph-algorithms',
    'graphs',
    'trees',
    'linked-lists',
    'arrays-hashing',
  ]);
});