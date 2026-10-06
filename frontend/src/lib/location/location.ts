/**
 * Learning location encode / parse / validate (spec 007, Q2 = fully addressable).
 *
 * Implements
 * specs/007-concept-theory-navigation/contracts/location-contract.md sections
 * 1-3.
 *
 * Deliberately pure: no React import and no DOM access beyond an explicitly
 * passed-in search string. R-008 requires these functions to be testable in an
 * environment where `vitest` is not installed and mounting the React tree would
 * drag in monaco-editor, katex and marked. The riskiest logic in this feature is
 * a location resolving to the *wrong topic*, so it is kept checkable as a pure
 * round trip.
 */

import type {
  LearningLocation,
  LocationProblem,
  RawLocation,
  ResolvedLocation,
  TopicView,
} from '@/lib/types';

export const TOPIC_VIEWS: TopicView[] = ['concept', 'visualizer', 'patterns', 'exercises'];

/** The view this feature is about, and the app's existing default. */
export const DEFAULT_VIEW: TopicView = 'concept';

/** Grammar order, fixed (encoding rule 4).
 *
 * Two locations denoting the same position MUST encode to byte-identical
 * strings, which is what makes the back/forward sequence comparison in gate
 * G-20 exact rather than dependent on field order.
 */
const PARAM_ORDER = ['topic', 'view', 'section', 'exercise'] as const;

/** What validation needs to know about the current curriculum. */
export interface ValidationContext {
  knownTopicIds: string[];
  /** Section ids of the lesson for whichever topic gets resolved. */
  knownSectionIds: string[];
  /** Exercise ids for whichever topic gets resolved. */
  knownExerciseIds: string[];
  /** First topic by display order. */
  fallbackTopicId: string;
  /** First exercise of the resolved topic, or null when it has none. */
  fallbackExerciseId: string | null;
}

export function isTopicView(value: string | undefined | null): value is TopicView {
  return !!value && (TOPIC_VIEWS as string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

/**
 * Serialise a location to a query string.
 *
 * Rules (contract section 2):
 *  1. Emit only known parameters; never `&section=` for an undefined section.
 *  2. Percent-encode every value — topic ids are catalog data and this string
 *     is a public, copyable surface.
 *  3. Omit `view` when it equals the `concept` default, keeping shared links
 *     short. Parsing treats absent and explicit-`concept` identically.
 *  4. Parameter order is fixed as topic, view, section, exercise.
 *  5. Do NOT normalise or drop an invalid topic here. Validation is a separate
 *     concern; conflating them would make a stale link encode as if it were
 *     valid.
 */
export function encodeLocation(loc: LearningLocation): string {
  const parts: string[] = [];

  if (loc.topic_id) {
    parts.push(`topic=${encodeURIComponent(loc.topic_id)}`);
  }

  if (loc.view && loc.view !== DEFAULT_VIEW) {
    parts.push(`view=${encodeURIComponent(loc.view)}`);
  }

  if (loc.section_id) {
    parts.push(`section=${encodeURIComponent(loc.section_id)}`);
  }

  if (loc.exercise_id) {
    parts.push(`exercise=${encodeURIComponent(loc.exercise_id)}`);
  }

  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/** Build the full href for a location, preserving any non-location query. */
export function locationToHref(loc: LearningLocation, pathname = '/'): string {
  return `${pathname}${encodeLocation(loc)}`;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Split a query string into fields with NO validation and NO defaults applied.
 *
 * Never throws: a malformed string yields whatever fields were recoverable.
 */
export function parseLocation(search: string): RawLocation {
  const raw: RawLocation = {};
  if (!search) return raw;

  const query = search.startsWith('?') ? search.slice(1) : search;
  if (!query) return raw;

  for (const pair of query.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = eq === -1 ? pair : pair.slice(0, eq);
    const value = eq === -1 ? '' : pair.slice(eq + 1);

    let decodedKey = key;
    let decodedValue = value;
    try {
      decodedKey = decodeURIComponent(key);
      decodedValue = decodeURIComponent(value);
    } catch {
      // A malformed percent-escape is not worth throwing over: keep the raw
      // text so validation can report it as an unknown field.
    }

    switch (decodedKey) {
      case 'topic':
      case 'view':
      case 'section':
      case 'exercise':
        raw[decodedKey] = decodedValue;
        break;
      default:
        // Unknown parameters are ignored rather than treated as an error: the
        // address may carry unrelated query state.
        break;
    }
  }

  return raw;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Resolve a parsed location into something always renderable (L-1, L-2, L-3).
 *
 * Each field resolves independently — a bad field never invalidates the others
 * — and every downgrade is recorded as a problem so a stale link is visible to
 * the person who followed it (L-6). Problems are ordered `syntax`, `topic`,
 * `view`, `section`, `exercise` (L-7).
 */
export function validateLocation(
  raw: RawLocation,
  context: ValidationContext
): ResolvedLocation {
  const problems: LocationProblem[] = [];
  let usedFallbackTopic = false;
  let usedFallbackView = false;

  const knownTopics = new Set(context.knownTopicIds);
  const knownSections = new Set(context.knownSectionIds);
  const knownExercises = new Set(context.knownExerciseIds);

  // -- topic ---------------------------------------------------------------
  let topicId: string;
  if (raw.topic && knownTopics.has(raw.topic)) {
    topicId = raw.topic;
  } else {
    topicId = context.fallbackTopicId;
    if (raw.topic) {
      usedFallbackTopic = true;
      problems.push({
        field: 'topic',
        given: raw.topic,
        reason: `"${raw.topic}" is not a topic in this curriculum. Showing the first topic instead.`,
      });
    }
  }

  // -- view ----------------------------------------------------------------
  let view: TopicView = DEFAULT_VIEW;
  if (raw.view !== undefined && raw.view !== '') {
    if (isTopicView(raw.view)) {
      view = raw.view;
    } else {
      usedFallbackView = true;
      problems.push({
        field: 'view',
        given: raw.view,
        reason: `"${raw.view}" is not a view on this platform. Showing the concept and theory view instead.`,
      });
    }
  }

  // -- section -------------------------------------------------------------
  // Only meaningful in the concept view (L-5), so a section outside it is
  // dropped from the resolved location rather than carried as a field no
  // consumer would honour. The address itself is left untouched, so a learner
  // who shared the link sees what they shared.
  //
  // An unknown section within the concept view degrades to the lesson as a
  // whole with topic and view intact (L-4) — the placeholder-lesson case, where
  // sections come from generated fallback text and a shared link can name an id
  // that no longer exists.
  let sectionId: string | undefined;
  if (view === 'concept' && raw.section !== undefined && raw.section !== '') {
    if (knownSections.has(raw.section)) {
      sectionId = raw.section;
    } else {
      problems.push({
        field: 'section',
        given: raw.section,
        reason: `That part of the lesson is no longer here. Showing the lesson from the start.`,
      });
    }
  }

  // -- exercise ------------------------------------------------------------
  let exerciseId: string | undefined;
  if (view === 'exercises') {
    if (raw.exercise && knownExercises.has(raw.exercise)) {
      exerciseId = raw.exercise;
    } else if (context.fallbackExerciseId) {
      exerciseId = context.fallbackExerciseId;
      if (raw.exercise) {
        problems.push({
          field: 'exercise',
          given: raw.exercise,
          reason: `"${raw.exercise}" is not an exercise on this topic. Showing the first one instead.`,
        });
      }
    }
  }

  const location: LearningLocation = { topic_id: topicId, view };
  if (sectionId) location.section_id = sectionId;
  if (exerciseId) location.exercise_id = exerciseId;

  return { location, problems, usedFallbackTopic, usedFallbackView };
}

/**
 * Convenience: parse then validate in one step.
 *
 * A `syntax` problem is recorded when the query string could not be parsed as
 * key/value pairs at all, but this still returns a renderable location (L-1).
 */
export function resolveLocation(search: string, context: ValidationContext): ResolvedLocation {
  const raw = parseLocation(search);

  // A query string with no recognisable parameters is almost certainly garbage.
  // Report it rather than silently showing the fallback topic.
  const hasAnyField = PARAM_ORDER.some((key) => raw[key] !== undefined);
  const stripped = search.replace(/^\?/, '').trim();
  const isSyntaxGarbage = stripped.length > 0 && !hasAnyField;

  const resolved = validateLocation(raw, context);
  if (isSyntaxGarbage) {
    // Ordered first per L-7.
    resolved.problems.unshift({
      field: 'syntax',
      given: stripped,
      reason: 'That link could not be read. Showing the first topic instead.',
    });
  }

  return resolved;
}

/** Compare two locations by their encoded form.
 *
 * Used by the history tests: because encodeLocation is canonical, equal
 * encodings mean equal positions.
 */
export function locationsEqual(a: LearningLocation, b: LearningLocation): boolean {
  return encodeLocation(a) === encodeLocation(b);
}