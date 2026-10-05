# Bug Assessment: LaTeX Math Rendering and All-Caps Problem Descriptions

- **Slug**: problem-latex-rendering-caps
- **Created**: 2026-10-05
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

```text
most of the problems are not rendered properly, still pure latex. also alot of problems are vague, text are all caps
```

The user also provided two screenshots from the running dashboard at `http://localhost:8080`:
1. "Two Sum" showing raw LaTeX strings in the Constraints section (`$2 \le \text{nums.length} \le 10^5$`, `$-10^9 \le \text{nums}[i] \le 10^9$`, `$-10^9 \le \text{target} \le 10^9$`) and unrendered markdown backticks in the description.
2. "Search a 2D Matrix" showing the entire problem statement rendered in ALL CAPS (`PROBLEM DESCRIPTION YOU ARE GIVEN AN $M \TIMES N$ INTEGER MATRIX...`) with a bottom border line, raw LaTeX math (`$M \TIMES N$`), and no Constraints, Target Complexity, or Examples sections.

## Symptom

1. Mathematical LaTeX expressions (such as `$2 \le \text{nums.length} \le 10^5$`, `$m \times n$`, `$O(N)$`, and `$i^{\text{th}}$`) are displayed literally as raw LaTeX syntax instead of rendered mathematical notation across all curriculum problems.
2. For 35 out of 50 curriculum problems (including "Search a 2D Matrix", "Daily Temperatures", "Trapping Rain Water", "3Sum", etc.), the problem description text is transformed into ALL CAPS monospace font inside a heading element with a bottom border line.
3. The same 35 problems are severely under-specified ("vague"), consisting of only a single sentence and completely lacking `## Constraints`, `## Target Complexity`, and `## Examples` sections.

## Reproduction

1. Start the local server (`./dsa-learn serve`) and open the dashboard in a browser at `http://localhost:8080`.
2. Select **Two Sum** in the curriculum sidebar:
   - Observe under **Constraints** that math bounds are shown as unparsed LaTeX: `$2 \le \text{nums.length} \le 10^5$`, `$-10^9 \le \text{nums}[i] \le 10^9$`.
   - Observe in the problem body that inline code tokens retain raw backticks (e.g. `` `nums` ``).
3. Select **Search a 2D Matrix** (or any of the 35 stub exercises such as **Daily Temperatures**, **Trapping Rain Water**, or **Coin Change**):
   - Observe that the entire problem description is rendered in ALL CAPS (`PROBLEM DESCRIPTION YOU ARE GIVEN AN $M \TIMES N$ INTEGER MATRIX...`).
   - Observe that the text is wrapped within an `<h2>` heading block with an underline border.
   - Observe that there are no example cases, input/output specifications, or constraint limits provided.

## Suspected Code Paths

- `frontend/src/components/problem/ProblemViewer.tsx:104-152` — Hand-rolled markdown renderer splits content by `\n\n` and checks `paragraph.startsWith('## ')`. When the heading is not followed by an empty line, the entire problem description is captured as a heading, wrapped in `<h2>`, and styled with Tailwind classes `uppercase tracking-wider font-mono border-b border-slate-800 pb-1`. Furthermore, `ProblemViewer.tsx` does not integrate KaTeX or any markdown parser, leaving LaTeX math expressions and markdown formatting unrendered.
- `frontend/package.json` — Does not declare `katex` (or markdown rendering packages) in dependencies.
- `dsa_learn/curriculum/topics/**/problem.md` (35 files) — 35 of the 50 exercise markdown files are minimal stubs where line 4 immediately follows `## Problem Description` without an intervening blank line, triggering the parser bug. They also lack `## Constraints`, `## Target Complexity`, and `## Examples`.

## Root Cause Hypothesis

The issue results from a combination of a fragile frontend markdown parser and incomplete curriculum markdown files:
1. **Frontend Parser Flaw**: `ProblemViewer.tsx` attempts to parse markdown by splitting text strictly on double newlines (`split('\n\n')`). If a heading like `## Problem Description` is immediately followed by body text on the next line without an empty line (`\n\n`), the entire block begins with `## ` and is matched by `paragraph.startsWith('## ')`. The component strips `## ` and places the entire body text into an `<h2>` styled with `uppercase tracking-wider font-mono border-b border-slate-800 pb-1`. This forces the description into uppercase and adds an underline border.
2. **Missing LaTeX & Markdown Support**: `ProblemViewer.tsx` has no LaTeX rendering library (such as KaTeX) and no rich markdown parser (or inline code/bold/list handlers). Math expressions delimited by `$` are rendered as literal plaintext.
3. **Incomplete Problem Files**: 35 out of the 50 curriculum `problem.md` files are stubs containing only a title and a 1-sentence description placed directly under `## Problem Description` without a blank line. They lack `## Constraints`, `## Target Complexity`, and `## Examples`, leaving problems vague compared to the 15 fully-specified problems.
Confidence: high.

## Proposed Remediation

**Preferred**:
1. **Frontend**: Replace the fragile paragraph-splitting parser in `frontend/src/components/problem/ProblemViewer.tsx` with a proper Markdown and LaTeX renderer. Add `katex` (along with its CSS) and integrate either `marked` with KaTeX parsing or a React-based Markdown+KaTeX component (sanitized via `dompurify`). Ensure headings are strictly parsed line-by-line rather than across paragraphs, and ensure heading `uppercase` styling does not bleed into body text. Support inline code (`` `code` ``), bold/italic, lists, and LaTeX math blocks (`$...$` and `$$...$$`).
2. **Curriculum**: Expand all 35 stub `problem.md` files in `dsa_learn/curriculum/topics/` to include full problem descriptions, `## Constraints`, `## Target Complexity`, and `## Examples` (with Input, Output, and Explanation blocks matching their existing `tests.cpp` and `solution.cpp`). Ensure proper blank lines follow all markdown headings.
3. **Curriculum Validation Test**: Add an automated test (e.g. `tests/test_curriculum.py`) validating that every exercise in `dsa_learn/curriculum/topics/` has valid markdown formatting, required headings (`Problem Description`, `Constraints`, `Target Complexity`, `Examples`), and no malformed LaTeX.

**Alternatives**:
- *Alternative 1 (Frontend-only parser patch)*: Fix `ProblemViewer.tsx` to parse line-by-line, remove `uppercase` styling from headings or problem descriptions, and add basic LaTeX replacement. Trade-off: Resolves the all-caps symptom and renders math, but leaves 35 curriculum problems vague and undocumented.
- *Alternative 2 (Curriculum-only plaintext conversion)*: Update all 35 `problem.md` files to add missing sections and replace LaTeX expressions with Unicode math symbols (e.g. `≤`, `×`, `10⁵`). Trade-off: Avoids frontend dependencies for KaTeX, but leaves the frontend parser fragile and unable to render standard LaTeX math.

**Files likely to change**:
- `frontend/src/components/problem/ProblemViewer.tsx`
- `frontend/package.json`
- `frontend/src/styles/globals.css` (or `main.tsx` for KaTeX CSS import)
- `dsa_learn/curriculum/topics/**/problem.md` (35 stub problem files)
- `tests/test_curriculum.py` (new validation test)

**Tests to add or update**:
- `tests/test_curriculum.py`: Automated test to verify all 50 `problem.md` files contain `## Problem Description`, `## Constraints`, `## Target Complexity`, and `## Examples`, and have proper markdown structure.
- Frontend test or build verification ensuring KaTeX and Markdown render cleanly without typescript/vite build errors.

## Risks & Considerations

- **KaTeX Bundle Size**: Adding `katex` will increase the frontend bundle size slightly. KaTeX styles (`katex/dist/katex.min.css`) must be imported.
- **XSS Protection**: When rendering parsed Markdown and KaTeX HTML into the DOM, ensure DOMPurify is used to prevent any cross-site scripting vulnerabilities.
- **Consistency with Existing Tests**: Ensure the newly documented constraints and examples in each of the 35 `problem.md` files strictly align with the existing C++ test suites in `tests.cpp`.

## Open Questions

- None. The issue and root causes are fully identified and verified across the codebase.
