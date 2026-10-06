import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import type { ConceptLesson } from '@/lib/types';
import { ConceptLessonViewer } from '../ConceptLessonViewer';

const fetchTopicLesson = vi.fn();
const updateLessonProgress = vi.fn();
const fetchCurriculumGraph = vi.fn();
const saveReadingPosition = vi.fn();

/**
 * A PARTIAL mock, not a replacement.
 *
 * A `vi.mock` factory that returns an object literal closes over the module's
 * export list: any export a component imports but the factory omits resolves to
 * `undefined`, and the next addition to `@/lib/api` breaks every suite that
 * mocks it. That is exactly how this suite went red when spec 007 added
 * `fetchCurriculumGraph` — the component threw on mount.
 *
 * Spreading the real module means this suite tracks only the four functions it
 * actually asserts on. `importOriginal` is safe here: `api.ts` is type-only
 * imports plus `async` functions with no module-scope side effects.
 *
 * See `.specify/bugs/concept-viewer-api-mock-incomplete`.
 */
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchTopicLesson: (...args: unknown[]) => fetchTopicLesson(...args),
  updateLessonProgress: (...args: unknown[]) => updateLessonProgress(...args),
  fetchCurriculumGraph: (...args: unknown[]) => fetchCurriculumGraph(...args),
  saveReadingPosition: (...args: unknown[]) => saveReadingPosition(...args),
}));

// Verbatim excerpt of dsa_learn/curriculum/topics/arrays-hashing/lesson.md,
// the content reported as showing raw markdown and LaTeX source.
const CONTENT_MARKDOWN = [
  'Arrays and Hash Tables represent the foundational building blocks of algorithmic computing.',
  'A contiguous array stores elements of identical types in adjacent memory locations, enabling instantaneous $O(1)$ random access by index.',
  '',
  '- **Hash Table Buckets & Collisions**: `std::unordered_map` typically utilizes separate chaining or open addressing:',
  '  - **Separate Chaining**: An array of buckets where each bucket points to a linked list.',
  '- **Load Factor ($\\alpha = N / B$)**: When the ratio of stored elements $N$ to buckets $B$ exceeds a threshold (typically $0.75$ or $1.0$), the table reallocates.',
  '',
  '1. **Direct Indexing**: $arr[k] = \\text{base\\_address} + (k \\times \\text{element\\_size})$. Always $O(1)$.',
].join('\n');

const LESSON: ConceptLesson = {
  topic_id: 'arrays-hashing',
  title: 'Arrays & Hashing',
  summary: 'Comprehensive conceptual guide and complexity analysis.',
  // spec 006: both fields are always present on the lesson endpoint (H-04).
  is_placeholder: false,
  prerequisites: [],
  sections: [
    {
      id: 'memory-anatomy-layout',
      title: 'Memory Anatomy & Layout',
      order: 2,
      estimated_minutes: 3,
      content_markdown: CONTENT_MARKDOWN,
    },
  ],
  complexity_matrix: [],
  reading_progress: {
    topic_id: 'arrays-hashing',
    completed_sections: [],
    last_read_section: null,
    progress_pct: 0,
  },
};

/**
 * A graph that arrived and found nothing for `arrays-hashing`. Distinct from a
 * graph that never arrived — the viewer must not conflate the two.
 */
const EMPTY_GRAPH = {
  nodes: [],
  prerequisites_by_topic: {},
  dependents_by_topic: {},
  neighbours_by_topic: {},
  unresolved: [],
};

/** The leaf statement ForwardLinks makes only when the graph actually arrived. */
const LEAF_CLAIM = /No other topic in the curriculum builds on this one/;

describe('ConceptLessonViewer', () => {
  beforeEach(() => {
    fetchTopicLesson.mockReset();
    updateLessonProgress.mockReset();
    fetchCurriculumGraph.mockReset();
    saveReadingPosition.mockReset();
    fetchTopicLesson.mockResolvedValue(LESSON);
    fetchCurriculumGraph.mockResolvedValue(EMPTY_GRAPH);
    saveReadingPosition.mockResolvedValue({
      topic_id: 'arrays-hashing',
      last_read_section: '',
      updated_at: '',
    });
  });

  afterEach(() => cleanup());

  it('renders lesson markdown as HTML with typeset math, not as raw source', async () => {
    const { container } = render(<ConceptLessonViewer topicId="arrays-hashing" />);

    await screen.findByText('Memory Anatomy & Layout');

    const body = container.querySelector('.markdown-body');
    expect(body).not.toBeNull();

    await waitFor(() => {
      expect(body!.querySelector('.katex')).not.toBeNull();
    });

    // KaTeX embeds the original TeX in <annotation> for accessibility; drop it
    // so the assertions below only look at what the user actually sees.
    const visible = body!.cloneNode(true) as HTMLElement;
    visible.querySelectorAll('annotation').forEach((node) => node.remove());

    const html = visible.innerHTML;
    const text = visible.textContent ?? '';

    // No raw markdown or LaTeX source survives into the rendered lesson.
    expect(text).not.toContain('$O(1)$');
    expect(text).not.toContain('\\alpha');
    expect(html).not.toContain('**');
    expect(html).not.toContain('`std::unordered_map`');
    expect(html).not.toContain('base\\_address');

    // Markdown structure is real elements, not literal text.
    expect(body!.querySelector('strong')).not.toBeNull();
    expect(body!.querySelector('code')).not.toBeNull();
    expect(body!.querySelectorAll('ul').length).toBe(2);
    expect(body!.querySelector('ol')).not.toBeNull();
  });

  // -- spec 007 R-006: the graph fetch is advisory -------------------------
  //
  // `navigation-graph-contract.md` "Advisory fetch": a failed or slow graph
  // request must not block lesson rendering. These were the untested promise
  // behind the regression — the suite went red before anyone checked that the
  // lesson survives the graph being unavailable, which is the only thing that
  // actually matters to a learner.

  it('renders the lesson even when the graph request rejects', async () => {
    fetchCurriculumGraph.mockRejectedValue(new Error('graph endpoint down'));

    render(<ConceptLessonViewer topicId="arrays-hashing" />);

    await screen.findByText('Memory Anatomy & Layout');
    expect(screen.getByText('Arrays & Hashing')).toBeTruthy();
    // The advisory failure never reaches the lesson's error state.
    expect(screen.queryByText('Lesson Not Found')).toBeNull();
  });

  it('renders no navigation blocks when the graph request rejects', async () => {
    fetchCurriculumGraph.mockRejectedValue(new Error('graph endpoint down'));

    render(<ConceptLessonViewer topicId="arrays-hashing" />);

    await screen.findByText('Memory Anatomy & Layout');

    // Flush the graph effect's promise chain so the component has settled out of
    // `graphLoading` before asserting on absence. Without this the assertions
    // would pass for the wrong reason: the blocks are hidden pending the request
    // anyway, so an unsettled component proves nothing about the failure path.
    await act(async () => {});

    // FR-004 / FR-017: empty collections omit the blocks entirely.
    expect(screen.queryByText('Builds on')).toBeNull();
    expect(screen.queryByText('Related topics')).toBeNull();
    // And no leaf claim, because we never learned whether this topic is a leaf.
    expect(screen.queryByText(LEAF_CLAIM)).toBeNull();
  });

  it('survives a synchronous throw from the graph fetch', async () => {
    // The case a `.catch()` on the promise chain cannot see. A synchronous throw
    // escapes the chain entirely, so without the effect's try/catch it
    // propagates out and the lesson never renders at all.
    fetchCurriculumGraph.mockImplementation(() => {
      throw new Error('threw before returning a promise');
    });

    render(<ConceptLessonViewer topicId="arrays-hashing" />);

    await screen.findByText('Memory Anatomy & Layout');
    expect(screen.getByText('Arrays & Hashing')).toBeTruthy();
  });

  it('tells the learner a topic is a leaf when the graph loaded and found nothing', async () => {
    // The counterpart to the case above: an empty graph that actually arrived is
    // a real answer, and FR-005 requires it to be stated rather than shown as an
    // empty list.
    render(<ConceptLessonViewer topicId="arrays-hashing" />);

    await screen.findByText('Memory Anatomy & Layout');
    expect(await screen.findByText(LEAF_CLAIM)).toBeTruthy();
    expect(screen.queryByText('Builds on')).toBeNull();
    expect(screen.queryByText('Related topics')).toBeNull();
  });
});