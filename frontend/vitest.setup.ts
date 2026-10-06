/**
 * jsdom polyfills for APIs the component tree uses but jsdom does not implement.
 *
 * Loaded via `setupFiles` in `vitest.config.ts`. Test-only: nothing here reaches
 * the production bundle, and `vite.config.ts` is deliberately left untouched.
 */

/**
 * `IntersectionObserver` is not implemented by jsdom.
 *
 * `ConceptLessonViewer` uses one to decide which lesson section is currently in
 * view so it can record a reading position (spec 007 FR-015). Mounting the
 * viewer therefore throws `IntersectionObserver is not defined` inside a passive
 * effect, which React surfaces as an unhandled error and vitest attributes to
 * whichever test happened to be running.
 *
 * This is an environment gap, not a product defect — the observer is a real
 * browser API and the component's use of it is correct. The stub is a no-op:
 * it records registrations and never fires. That keeps component tests
 * deterministic, because no reading-position write is triggered unless a test
 * explicitly drives it.
 *
 * If a test needs to assert reading-position behaviour, drive the callback
 * directly rather than widening this stub into a layout simulator.
 */
class NoopIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(_callback: IntersectionObserverCallback) {}

  observe(_target: Element): void {}
  unobserve(_target: Element): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = NoopIntersectionObserver;
}

/**
 * Scrolling APIs jsdom does not implement.
 *
 * `ConceptLessonViewer` scrolls its own container to the top and calls
 * `scrollIntoView` on a section when restoring a reading position. jsdom defines
 * neither, so both throw `is not a function` from inside a passive effect. That
 * aborts React's commit, so the tree never reaches the DOM — which surfaces to
 * tests as a baffling "unable to find element with the text: Arrays & Hashing"
 * rather than as a missing browser API.
 *
 * No-ops: jsdom has no layout, so there is nothing to scroll. Recording the
 * calls would be useful for asserting scroll restoration, but that needs
 * assertions worth writing first; add them when they are.
 */
for (const method of ['scrollTo', 'scroll', 'scrollIntoView'] as const) {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  if (typeof proto[method] === 'undefined') {
    proto[method] = function noopScroll() {};
  }
}