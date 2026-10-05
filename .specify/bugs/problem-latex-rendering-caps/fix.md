# Bug Fix: LaTeX Math Rendering and All-Caps Problem Descriptions

- **Slug**: problem-latex-rendering-caps
- **Fixed**: 2026-10-05
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Upgraded the frontend problem viewer to render Markdown and KaTeX math using `marked`, `katex`, and `DOMPurify`, imported KaTeX styles, and expanded all 35 stub curriculum problem files with full descriptions, proper heading formatting, constraints, target complexities, and examples.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/package.json` | modified | Added `katex`, `marked`, `dompurify`, `@types/katex`, and `@types/dompurify` dependencies. |
| `frontend/src/main.tsx` | modified | Imported KaTeX styling (`katex/dist/katex.min.css`). |
| `frontend/src/styles/globals.css` | modified | Added typography and code styling for `.problem-markdown` and KaTeX elements. |
| `frontend/src/components/problem/ProblemViewer.tsx` | modified | Replaced brittle string-splitting parser with a memoized `renderMarkdownWithMath` pipeline combining `marked`, `katex`, and `DOMPurify`. |
| `dsa_learn/curriculum/topics/**/problem.md` (35 files) | modified | Upgraded all 35 incomplete problem markdown stubs with complete descriptions, blank lines after headings, constraints, target complexity, and examples matching tests. |
| `tests/test_curriculum.py` | added | Automated test suite verifying that all 50 curriculum problems exist, have required sections, proper blank line formatting, and match catalog complexity. |

## Diff Highlights (optional)

```tsx
// frontend/src/components/problem/ProblemViewer.tsx
function renderMarkdownWithMath(markdown: string): string {
  if (!markdown) return '';

  const mathTokens: Array<{ token: string; math: string; display: boolean }> = [];
  let counter = 0;

  // Extract display math $$...$$
  let processed = markdown.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    const token = `KATEXBLOCKTOKEN${counter++}X`;
    mathTokens.push({ token, math: math.trim(), display: true });
    return token;
  });

  // Extract inline math $...$
  processed = processed.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (_, prefix, math) => {
    const token = `KATEXINLINETOKEN${counter++}X`;
    mathTokens.push({ token, math: math.trim(), display: false });
    return `${prefix}${token}`;
  });

  let html = marked.parse(processed, { async: false, gfm: true, breaks: false }) as string;
  html = DOMPurify.sanitize(html);

  for (const { token, math, display } of mathTokens) {
    try {
      const rendered = katex.renderToString(math, {
        displayMode: display,
        throwOnError: false,
      });
      html = html.replaceAll(token, rendered);
    } catch {
      html = html.replaceAll(token, display ? `$$${math}$$` : `$${math}$`);
    }
  }

  return html;
}
```

## Tests Added or Updated

- `tests/test_curriculum.py::TestCurriculum::test_catalog_structure_and_count` — Verifies catalog structure and ensures exactly 50 exercises are registered.
- `tests/test_curriculum.py::TestCurriculum::test_all_problem_markdown_files_exist_and_complete` — Verifies all 50 exercise problem files exist, have proper `#` title, `## Problem Description`, `## Constraints`, `## Target Complexity`, and `## Examples`, and have blank lines following headings to prevent heading bleed.

## Local Verification

- Commands run:
  - `cd frontend && npm run build` → Built Vite bundle with KaTeX assets and TypeScript verification (`tsc -b`) in ~24s with 0 errors.
  - `python3 -m unittest tests/test_curriculum.py` → 2/2 tests passed (0.002s, OK).
  - `python3 -m unittest discover tests/` → 39/39 tests passed (19.159s, OK).
- Manual checks:
  - Validated that `search-a-2d-matrix` and `daily-temperatures` problem markdown files contain clean, multi-paragraph markdown with LaTeX formulas and standard example blocks.
  - Verified math tokenizer correctly extracts and replaces both inline `$m \times n$` and display `$$...$$` blocks into valid KaTeX markup without heading or font bleed.

## Deviations from Assessment

None. The fix strictly implemented the preferred remediation outlined in the assessment report.

## Follow-ups

- Run verification testing via `/speckit-bug-test slug=problem-latex-rendering-caps`.
