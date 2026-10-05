# Bug Assessment: Concept & Theory Tab Renders Raw Markdown and LaTeX Source

- **Slug**: concept-theory-latex-rendering
- **Created**: 2026-10-06
- **Source**: pasted text + screenshot
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

Pasted text:

```text
[Image 1] concept and theory latex is not displayed properly
```

The screenshot shows the running dashboard (`localhost:5080`) with the **Concept & Theory** tab active, topic **Arrays & Hashing**, sections **02 Memory Anatomy & Layout**, **03 Core Operations & Invariants**, and **04 Trade-offs & When to Use**. Every LaTeX expression and every markdown construct appears as literal source text:

- `$std::unordered_map$`-style content rendered literally: `` `std::unordered_map` ``
- `**Separate Chaining**` and `**Open Addressing**` bold markers shown as raw `**`
- `- ` bullet markers shown as raw dashes, with nested list items collapsed onto one line
- `**Load Factor ($\alpha = N / B$)**: ...` — the `$...$` group shown verbatim, bold markers shown verbatim
- `$[L, R]$`-style bounds and `$O(1)$`, `$O(N)$`, `$O(N^2)$` shown verbatim
- `1. **Direct Indexing**: $arr[k] = \text{base\_address} + (k \times \text{element\_size})$. Always $O(1)$.` shown verbatim, including `1. ` and `\text{...}`
- `$\text{key}_1 == \text{key}_2 \implies \text{hash}(\text{key}_1) == \text{hash}(\text{key}_2)$` shown verbatim

This is the same user-visible class of bug as `.specify/bugs/problem-latex-rendering-caps`, but in the **Concept & Theory** tab rather than the Practice & Code tab.

## Symptom

The Concept & Theory tab dumps the raw markdown/LaTeX **source** of each lesson section into the DOM as plain text instead of rendering it, so `$O(N)$`, `\alpha`, `\text{...}`, `**bold**`, list bullets, and inline code all appear literally; the expectation is that lesson markdown is rendered as formatted prose with typeset math (as already happens in the Practice & Code tab).

## Reproduction

1. Start the local server (`./dsa-learn serve`, or `./dsa-learn serve --port 5080` — the screenshot URL is `localhost:5080`) and open the dashboard.
2. Click the **Concept & Theory** tab in the topic navigation.
3. Select the topic **Arrays & Hashing** (sidebar, or any topic with a lesson: **Two Pointers**, **Linked Lists**, **Trees**).
4. Scroll to section **02 Memory Anatomy & Layout** and observe:
   - `**Hash Table Buckets & Collisions**: std::unordered_map typically utilizes ...` rendered with literal `**` and literal backticks.
   - `**Load Factor ($\alpha = N / B$)**: ... exceeds a threshold (typically $0.75$ or $1.0$) ...` fully literal.
5. Scroll to section **03 Core Operations & Invariants** and observe the numbered list `1. **Direct Indexing**: $arr[k] = \text{base\_address} + (k \times \text{element\_size})$. Always $O(1)$.` fully literal.

Notes on scope and unknowns:

- [NEEDS CLARIFICATION: The screenshot shows port `5080`, which is not configured anywhere in this repository (`vite.config.ts:15` = 5173, `dsa_learn/config.py:35` `DEFAULT_PORT` = 8080). Confirm which launch command/port the user used so reproduction steps match; the bug is port-independent.]
- All 12 topics are affected. 4 topics (`arrays-hashing`, `two-pointers`, `linked-lists`, `trees`) render authored `lesson.md` files that contain `$...$` math; the other 8 fall back to the Python-generated lesson at `dsa_learn/curriculum/loader.py:68-96`, which also contains `$O(1)$`, `$O(N)$`, `$O(N^2)$`.
- `frontend/src/components/concept/MemoryDiagram.tsx:51` also shows a literal `$O(1)$` in the same tab (hardcoded JSX string, not markdown).

## Suspected Code Paths

- `frontend/src/components/concept/ConceptLessonViewer.tsx:197-198` — **primary cause.** `section.content_markdown` is emitted as a plain React text child:
  ```tsx
  <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed font-sans whitespace-pre-line">
    {section.content_markdown}
  </div>
  ```
  No `marked`, no `katex`, no `dangerouslySetInnerHTML` — raw markdown source reaches the DOM verbatim.
- `frontend/src/components/concept/ConceptLessonViewer.tsx:197` — `whitespace-pre-line` + dead `prose`/`prose-invert` classes. `@tailwindcss/typography` is **not** installed (`frontend/package.json:29-39`; `frontend/node_modules/@tailwindcss/` contains only `node`, `oxide`, `oxide-linux-x64-gnu`, `vite`), so `prose*` emits zero CSS and formatting collapses to a flat text block.
- `frontend/src/components/concept/MemoryDiagram.tsx:51` — hardcoded caption string containing `$O(1)$`, rendered as plain text in the same tab.
- `frontend/src/components/problem/ProblemViewer.tsx:18-58` — **the working reference implementation** the concept tab is missing: `renderMarkdownWithMath()` extracts `$$…$$` then `$…$` into placeholder tokens, runs `marked.parse(..., { gfm: true, breaks: false })`, sanitizes with `DOMPurify.sanitize()`, then splices in `katex.renderToString()` output (consumed at `:64-67`, injected at `:165-168`). It is a module-local function, not exported, so it cannot be reused as-is.
- `frontend/src/components/problem/ProgressiveHintDrawer.tsx:78-87` — markdown is parsed here (`marked` + `DOMPurify`, `breaks: true`) but **without** math support; `$...$` leaks literally in hint text.
- `frontend/src/main.tsx:4` — `import 'katex/dist/katex.min.css'` is already global, so KaTeX styles/fonts are available app-wide; no CDN, no MathJax anywhere in the repo.
- `frontend/src/styles/globals.css:77-184` — the only math/markdown styling, scoped entirely to `.problem-markdown` (`.problem-markdown .katex` at `:174`, `.problem-markdown .katex-display` at `:179`). The concept tab carries no matching class, so even injected KaTeX HTML would be unstyled there.
- `dsa_learn/curriculum/topics/arrays-hashing/lesson.md:15,18` — source content that triggers the symptom (`$\alpha = N / B$`, `$arr[k] = \text{base\_address} + (k \times \text{element\_size})$`, `$O(1)$`, `$0.75$`, `$1.0$`, `$[\text{min}, \text{max}]$`, `$2 \times$`).
- `dsa_learn/curriculum/loader.py:130-193` / `:68-96` — backend correctly returns `content_markdown` untouched; **the backend is not at fault**, it is intentionally markdown-with-LaTeX source.
- `dsa_learn/curriculum/loader.py:18-65` (`parse_markdown_sections`) — splits on `## ` and strips those headings, so section bodies contain `###`-and-deeper only; relevant to heading styling decisions.
- `specs/003-interactive-concept-learning/tasks.md:53` — task **T014** ("Implement `ConceptLessonViewer` component rendering markdown sections") is checked off `[X]` even though markdown/math rendering was never wired up; the declaration of completion is inaccurate.
- Content plumbing (verified correct, listed for completeness): `frontend/src/components/curriculum/TopicNavTabs.tsx:17-23` (tab) → `frontend/src/App.tsx:390-415` (mount) → `frontend/src/lib/api.ts:107-111` (`GET /api/curriculum/topics/{id}/lesson`) → `dsa_learn/server/handlers.py:260-267`.

## Root Cause Hypothesis

The Concept & Theory tab was never given a markdown/LaTeX rendering step. `ConceptLessonViewer.tsx:197-198` renders `section.content_markdown` as a bare JSX text child, so every markdown construct (`**bold**`, `- ` bullets, `` `code` ``, `1.` lists) and every LaTeX group (`$O(1)$`, `$\alpha = N / B$`, `$\text{base\_address} + (k \times \text{element\_size})$`) is emitted literally. The KaTeX + marked + DOMPurify pipeline exists and works, but only inside `ProblemViewer.tsx:18-58`, where it is a non-exported module-local function; the earlier fix for the Practice & Code tab (`.specify/bugs/problem-latex-rendering-caps`) therefore fixed exactly one call site. Two secondary blockers reinforce the symptom: the only math CSS is scoped to `.problem-markdown` (`globals.css:77-184`) and never applied to the concept tab, and the `prose prose-invert prose-sm` classes on line 197 are inert because `@tailwindcss/typography` is not a declared dependency, so there is no fallback typography either. Confidence: **high** — the screenshot text matches `dsa_learn/curriculum/topics/arrays-hashing/lesson.md` verbatim, and the render site demonstrably bypasses both `marked` and `katex`.

## Proposed Remediation

**Preferred**:

1. **Extract the existing renderer into a shared module.** Move `renderMarkdownWithMath()` out of `frontend/src/components/problem/ProblemViewer.tsx:18-58` verbatim into a new `frontend/src/lib/markdown.ts` and export it. Preserve the ordering exactly: extract math to tokens → `marked.parse` → `DOMPurify.sanitize` → splice `katex.renderToString` output last. Sanitizing *after* KaTeX injection would strip KaTeX's MathML/`<annotation>` subtree, so this sequence must not be inverted. Re-import the shared function in `ProblemViewer.tsx` (behaviour-preserving refactor) and, optionally, in `ProgressiveHintDrawer.tsx:78-87` so hint math renders too.
2. **Wire the concept tab to it.** In `ConceptLessonViewer.tsx`, render each `section.content_markdown` through the shared function, memoized (a `useMemo` over the joined sections, or a small child component so a section's HTML is cached by identity), and inject via `dangerouslySetInnerHTML` exactly as `ProblemViewer.tsx:165-168` does. Drop `whitespace-pre-line` (the HTML now carries real block structure) and drop the inert `prose prose-invert prose-sm` classes.
3. **Share the CSS.** Generalize the `.problem-markdown` block in `frontend/src/styles/globals.css:77-184` to a neutral shared class (e.g. `.markdown-body`) used by the problem tab, the hint drawer, and the concept tab, keeping the `.katex` / `.katex-display` rules at `:174-184` in scope. Note the `text-transform: uppercase` on `.problem-markdown h2` (`:92`) — since `parse_markdown_sections` (`loader.py:18-65`) strips all `##` headings, only `###`-and-deeper can appear inside a section body, but confirm the uppercase rule is acceptable if they do.
4. **Fix the stray caption.** Replace the hardcoded `$O(1)$` at `frontend/src/components/concept/MemoryDiagram.tsx:51` with either the shared inline-math helper or plain text (`O(1)`).
5. **Rebuild `frontend/dist`.** `frontend/dist` is committed (154 tracked files, including the KaTeX webfonts) and is what the Python server actually serves (`dsa_learn/config.py:30-31`, `dsa_learn/server/app.py:261-297`), so `npm run build` is required for the fix to appear at the served URL.

**Alternatives**:

- *Add `@tailwindcss/typography` and keep `prose prose-invert prose-sm`* — smallest diff at the call site, and the plugin config is straightforward on Tailwind v4. Trade-off: adds a dependency, and KaTeX spacing/scale inside `prose` is materially weaker than the existing hand-tuned `.problem-markdown` rules, leaving the concept and problem tabs visually inconsistent.
- *Curriculum-only: replace LaTeX in `lesson.md` with Unicode* (`O(1)`, `α = N / B`, `×`, `≤`) — no frontend change, zero regression risk to the problem tab. Trade-off: gives up real typesetting (fractions, subscripts, `\implies`), and it fixes only the math, not the raw `**`/bullets/backticks that make up most of the reported ugliness — so it does not actually resolve the report.

**Files likely to change**:
- `frontend/src/lib/markdown.ts` (new — shared `renderMarkdownWithMath`)
- `frontend/src/components/concept/ConceptLessonViewer.tsx`
- `frontend/src/components/concept/MemoryDiagram.tsx`
- `frontend/src/components/problem/ProblemViewer.tsx` (import the shared function instead of the local copy)
- `frontend/src/components/problem/ProgressiveHintDrawer.tsx` (optional: route through the shared function)
- `frontend/src/styles/globals.css`
- `frontend/dist/**` (rebuilt artifacts, committed to git)

**Tests to add or update**:

- The frontend currently has **no test runner** (no vitest/jest/testing-library in `frontend/package.json` or `frontend/vite.config.ts`); all 19 tests under `tests/` are Python. Add `vitest` + `jsdom` as devDependencies and unit-test the extracted `renderMarkdownWithMath`:
  - inline `$O(1)$` emits `<span class="katex">` and contains no literal `$`
  - display `$$…$$` emits `katex-display`
  - `**bold**`, `- ` bullets, and 2-space nested lists produce `<strong>` / `<ul>` / nested `<ul>`
  - inline code `` `std::unordered_map` `` produces `<code>` with no backticks
  - sanitization: a `<script>` / `onerror=` payload in `content_markdown` is stripped (assert the sanitize-before-KaTeX ordering is preserved)
  - malformed math does not throw (falls back to literal `$…$`)
- A component test for `ConceptLessonViewer` asserting the rendered section HTML contains KaTeX markup and no raw `**`/`$` from a known lesson fixture.
- `npm run build` must pass (`tsc -b && vite build`) and `.markdown-body .katex` must appear in the emitted CSS.
- Optional Python-side content lint (fits the existing `tests/` suite, e.g. alongside `tests/test_lesson_api.py`): assert every `lesson.md` has balanced `$` delimiters per line so malformed math is caught before it reaches the UI.
- Consider updating `specs/003-interactive-concept-learning/tasks.md:53` (T014 currently marked `[X]`) once the renderer is actually wired in.

## Risks & Considerations

- **XSS / sanitization ordering.** `DOMPurify.sanitize()` must run *before* KaTeX HTML is spliced in (`ProblemViewer.tsx:42` → `:47`). Inverting this strips KaTeX's MathML and `<annotation>` output. Lesson content comes from local files, but the shared helper must not weaken the guarantee established for problem content.
- **CSS refactor regression.** Renaming `.problem-markdown` touches the Practice & Code tab, which was just fixed. Verify Two Sum / Search a 2D Matrix render identically (or keep `.problem-markdown` as an alias alongside the new class).
- **Committed `dist`.** The served UI comes from `frontend/dist`, which is tracked in git. A source-only change will not appear in the browser until `npm run build` is run and the regenerated assets are committed.
- **`breaks` semantics.** `ProblemViewer` uses `breaks: false` (reflows to paragraphs) while `ProgressiveHintDrawer` uses `breaks: true`. Lesson prose is authored across multiple lines per paragraph (e.g. `arrays-hashing/lesson.md:5-6`), so a single shared helper with `breaks: false` will join those lines. Decide explicitly; recommendation is a per-call `breaks` option with `true` for lesson prose.
- **`$` ambiguity.** The inline regex `(^|[^\\])\$([^\$\n]+?)\$` will treat any pair of dollar signs on one line as math. No current `lesson.md` uses currency, but future content with e.g. `$5 and $10` on one line would be swallowed into a KaTeX render (with a visible red error via `throwOnError: false`). This risk already exists in the problem tab; a shared helper is the right place to address it.
- **`\text{...}` with escaped underscores.** Lesson content uses `\text{base\_address}` and `\text{element\_size}`. Verify KaTeX 0.19 renders `\_` inside `\text{}` without error before committing the fix.
- **Unknown CSS dependency state.** Because `@tailwindcss/typography` is absent, any assumption that `prose` styles exist elsewhere in the app is unsafe — including in `ProgressiveHintDrawer.tsx:83`.
- **Related but unfixed sites.** Hint text (`ProgressiveHintDrawer.tsx`) and the `MemoryDiagram` caption leak `$...$` literally; the `ComplexityMatrixTable` renders plain-text complexity strings (no math, out of scope). The Patterns & Decision Matrix viewers were not inspected and were not reported.

## Open Questions

- [NEEDS CLARIFICATION: Which launch command/port produced `localhost:5080`? It is not configured in this repo (5173 for Vite, 8080–8100 for the Python server), so the reproduction steps should name the exact command the user ran.]
- [NEEDS CLARIFICATION: Should lesson prose preserve authored single newlines (`breaks: true`) or reflow into paragraphs (`breaks: false`)? Recommendation: `true`, since lesson markdown wraps lines manually.]
- [NEEDS CLARIFICATION: Is adding a frontend test runner (vitest + jsdom) in scope, or should verification stay limited to `npm run build` plus manual inspection? There is currently zero frontend test infrastructure.]
- [NEEDS CLARIFICATION: Should this fix also cover the hint drawer (`ProgressiveHintDrawer.tsx`) and the `MemoryDiagram` caption, or strictly the Concept & Theory tab?]
- [NEEDS CLARIFICATION: Should headings nested inside a lesson section body (`###` and deeper) be styled as headings, and should the uppercase rule from `.problem-markdown h2` be avoided there?]