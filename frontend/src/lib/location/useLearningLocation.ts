/**
 * History-API binding for the learning location (spec 007, T030).
 *
 * Implements
 * specs/007-concept-theory-navigation/contracts/location-contract.md section 4.
 *
 * No router dependency (R-004). The platform has four views and one topic
 * selector; the History API covers every requirement Q2 made — address bar,
 * back/forward, copyable, open-in-new-tab — without a provider wrapping the
 * tree or a route table to maintain.
 *
 * The backend needs no change either: `_serve_static` already resolves any
 * unknown path to index.html (app.py), so a query string on the root path is
 * served correctly as-is.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_VIEW,
  encodeLocation,
  parseLocation,
  validateLocation,
  type ValidationContext,
} from './location';
import type { LearningLocation, ResolvedLocation, TopicView } from '@/lib/types';

/** Read the current location from the browser address.
 *
 * Accepts an injectable reader so the sequencing logic is testable without a
 * DOM (R-008).
 */
export type LocationReader = () => string;

const defaultReader: LocationReader = () =>
  typeof window === 'undefined' ? '' : window.location.search;

export type HistoryWriter = (url: string, replace: boolean) => void;

const defaultWriter: HistoryWriter = (url, replace) => {
  if (typeof window === 'undefined') return;
  const href = `${window.location.pathname}${url}`;
  if (replace) {
    window.history.replaceState({}, '', href);
  } else {
    window.history.pushState({}, '', href);
  }
};

export interface UseLearningLocationOptions {
  /**
   * Validates against the live curriculum. Until the graph has loaded, callers
   * pass an empty context so validation degrades to the fallback rather than
   * rejecting a legitimate deep link.
   */
  context: ValidationContext;
  reader?: LocationReader;
  writer?: HistoryWriter;
  /** Called when the address changes from outside (the browser's back button). */
  onExternalChange?: (location: ResolvedLocation) => void;
}

export interface UseLearningLocationResult {
  /** Always renderable (L-1). */
  location: ResolvedLocation;
  /** Raw requested position, including fields validation dropped. */
  requested: LearningLocation;
  navigate(next: LearningLocation, opts?: { replace?: boolean }): void;
  update(patch: Partial<LearningLocation>, opts?: { replace?: boolean }): void;
  /** Re-read the address, e.g. once the graph resolves and validation sharpens. */
  revalidate(): void;
}

function toLearningLocation(next: Partial<LearningLocation>): LearningLocation {
  return {
    topic_id: next.topic_id ?? '',
    view: next.view ?? DEFAULT_VIEW,
    ...(next.section_id ? { section_id: next.section_id } : {}),
    ...(next.exercise_id ? { exercise_id: next.exercise_id } : {}),
  };
}

/**
 * Owns "where the learner is" for the whole app.
 *
 * H-1: the initial location is parsed and validated **synchronously** during
 * state initialisation — no effect, no fetch. This is what makes a deep link
 * correct on the first paint rather than flashing the default topic and
 * correcting itself a tick later.
 */
export function useLearningLocation(
  options: UseLearningLocationOptions
): UseLearningLocationResult {
  const { context, reader = defaultReader, writer = defaultWriter } = options;

  const read = useCallback(
    (): { resolved: ResolvedLocation; requested: LearningLocation } => {
      const raw = parseLocation(reader());
      const resolved = validateLocation(raw, context);
      return {
        resolved,
        requested: toLearningLocation({
          topic_id: raw.topic,
          view: (raw.view as TopicView) ?? DEFAULT_VIEW,
          section_id: raw.section,
          exercise_id: raw.exercise,
        }),
      };
    },
    // `context` is intentionally part of the key: when the graph resolves,
    // validation sharpens and the same address may now be fully valid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reader, context]
  );

  // Synchronous initial read — H-1.
  const [state, setState] = useState(read);

  const revalidate = useCallback(() => {
    setState(read());
  }, [read]);

  // H-5: back and forward re-derive from the address, so they move through the
  // sequence actually visited rather than through app-internal state.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const next = read();
      setState(next);
      options.onExternalChange?.(next.resolved);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [read, options.onExternalChange]);

  const commit = useCallback(
    (next: LearningLocation, replace: boolean) => {
      // Rule 5: encode the caller's intent, do not pre-normalise it. A stale
      // topic must not be silently rewritten to the fallback before the
      // address ever records what was asked for.
      const url = encodeLocation(next);
      // H-3: initial load and non-positional view changes replace rather than
      // push, so SC-004's back-trace is exactly one action per real jump.
      writer(url, replace);
      setState(read());
    },
    [writer, read]
  );

  const navigate = useCallback(
    (next: LearningLocation, opts?: { replace?: boolean }) => {
      commit(toLearningLocation(next), opts?.replace ?? false);
    },
    [commit]
  );

  const update = useCallback(
    (patch: Partial<LearningLocation>, opts?: { replace?: boolean }) => {
      // H-8: a patch that does not mention the view never changes it. This is
      // what stops selecting a topic from ejecting the learner out of the
      // lesson they were reading.
      commit(toLearningLocation({ ...state.requested, ...patch }), opts?.replace ?? false);
    },
    [commit, state.requested]
  );

  return useMemo(
    () => ({
      location: state.resolved,
      requested: state.requested,
      navigate,
      update,
      revalidate,
    }),
    [state.resolved, state.requested, navigate, update, revalidate]
  );
}