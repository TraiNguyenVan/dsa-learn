import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import type { ConceptLesson } from '@/lib/types';
import { ConceptLessonViewer } from '../ConceptLessonViewer';

const fetchTopicLesson = vi.fn();
const updateLessonProgress = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchTopicLesson: (...args: unknown[]) => fetchTopicLesson(...args),
  updateLessonProgress: (...args: unknown[]) => updateLessonProgress(...args),
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

describe('ConceptLessonViewer', () => {
  beforeEach(() => {
    fetchTopicLesson.mockReset();
    updateLessonProgress.mockReset();
    fetchTopicLesson.mockResolvedValue(LESSON);
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
});