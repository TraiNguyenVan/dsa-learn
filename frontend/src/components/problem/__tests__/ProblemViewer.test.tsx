import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ExerciseDetail } from '@/lib/types';
import { ProblemViewer } from '../ProblemViewer';

const EXERCISE: ExerciseDetail = {
  id: 'two-sum',
  topic_id: 'arrays-hashing',
  slug: 'two-sum',
  title: 'Two Sum',
  difficulty: 'Easy',
  time_complexity_target: 'O(N)',
  space_complexity_target: 'O(N)',
  status: 'NOT_ATTEMPTED',
  attempts_count: 0,
  timeout_ms: 5000,
  problem_markdown: [
    '## Constraints',
    '',
    '- $2 \\le \\text{nums.length} \\le 10^5$',
    '',
    '- Target time complexity: $O(N)$',
  ].join('\n'),
  solution_code: '',
  solution_relpath: 'exercises/arrays-hashing/two-sum/solution.cpp',
};

// Guards the shared-renderer extraction: the Practice & Code tab must keep
// rendering math and must keep its `.problem-markdown` class so the shared
// markdown/KaTeX CSS still applies after the selector change.
describe('ProblemViewer', () => {
  afterEach(() => cleanup());

  it('still renders KaTeX math inside .problem-markdown', () => {
    const { container } = render(<ProblemViewer exercise={EXERCISE} loading={false} />);

    const body = container.querySelector('.problem-markdown');
    expect(body).not.toBeNull();
    expect(body!.querySelector('.katex')).not.toBeNull();
    expect(body!.querySelectorAll('ul').length).toBeGreaterThan(0);
  });
});