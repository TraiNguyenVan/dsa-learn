# Bug Fix: Concept & Theory Tab Renders Raw Markdown and LaTeX Source

- **Slug**: concept-theory-latex-rendering
- **Fixed**: 2026-10-06
- **Assessment**: ./assessment.md
- **Status**: applied (closed 2026-10-06, verified)

## Summary

The Concept & Theory tab emitted `section.content_markdown` as a bare JSX text node, so every `$...$` group and markdown construct in a lesson appeared as literal source. The working `marked` + `katex` + `DOMPurify` pipeline was extracted out of `ProblemViewer.tsx` into a shared `frontend/src/lib/markdown.ts` and wired into `ConceptLessonViewer` (and the hint drawer), with the markdown/KaTeX CSS generalized from `.problem-markdown` to a shared `.markdown-body` selector.

This is **not** a regression of `.specify/bugs/problem-latex-rendering-caps/`. That fix landed the KaTeX pipeline on the Practice & Code tab only; `renderMarkdownWithMath` was a module-local function and the concept tab was never wired up. The extraction below is byte-identical to the previously shipped function, and a new test now pins the problem tab's behavior so it cannot silently drift.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/lib/markdown.ts` | added | Shared `renderMarkdownWithMath(markdown, { breaks })`. Body lifted verbatim from `ProblemViewer.tsx`; adds a `breaks` option and the sanitize-before-KaTeX ordering contract as a doc comment. |
| `frontend/src/components/concept/ConceptLessonViewer.tsx` | modified | Renders each section through the shared helper (`useMemo` keyed on `lesson`, `breaks: true`) and injects it with `dangerouslySetInnerHTML`. Dropped the inert `prose prose-invert prose-sm` classes and `whitespace-pre-line`; now uses `.markdown-body`. |
| `frontend/src/components/problem/ProblemViewer.tsx` | modified | Local `renderMarkdownWithMath` removed; imports the shared one. No behavior change (`breaks: false` remains the default). |
| `frontend/src/components/problem/ProgressiveHintDrawer.tsx` | modified | `marked` + `DOMPurify` replaced by the shared renderer with `breaks: true`, so `$...$` in hint text now typesets instead of leaking. |
| `frontend/src/components/concept/MemoryDiagram.tsx` | modified | Hardcoded caption `$O(1)$` → `O(1)`. |
| `frontend/src/styles/globals.css` | modified | All 13 `.problem-markdown <descendant>` rules rewritten to `:is(.markdown-body, .problem-markdown) <descendant>`; header comment updated. `.problem-markdown` is retained in the selector so the Practice & Code tab is untouched. |
| `frontend/src/lib/__tests__/markdown.test.ts` | added test | 9 unit tests for the shared renderer (inline/display math, `\text{}` with `\_`, bold/nested lists/ordered lists, sanitization, malformed math, empty input, `breaks`). |
| `frontend/src/components/concept/__tests__/ConceptLessonViewer.test.tsx` | added test | Component regression test using the reported `arrays-hashing` content: asserts KaTeX markup and real `<ul>/<ol>/<strong>/<code>` elements, and no raw `**`, backticks, `$O(1)$`, `\alpha`, or `base\_address` in the visible output. |
| `frontend/src/components/problem/__tests__/ProblemViewer.test.tsx` | added test | Pins the earlier bug's fix: the problem tab still renders KaTeX inside `.problem-markdown` after the extraction and CSS selector change. |
| `frontend/vitest.config.ts` | added | Separate vitest config (jsdom + `@` alias + react plugin) so the production `vite.config.ts` stays untouched. `include` is scoped to the vitest-based suites. |
| `frontend/package.json` | modified | Dev deps: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`. Added `"test:unit": "vitest run"`. |
| `frontend/package-lock.json` | modified | Lockfile for the above. |
| `tests/test_curriculum.py` | modified | New `TestLessonMarkdown::test_lesson_math_delimiters_are_balanced` — lints every `lesson.md` for unbalanced `$` delimiters (display `$$…$$` stripped first, escaped `\$` ignored). |
| `frontend/dist/**` | modified | Rebuilt with `npm run build`; the Python server serves this committed bundle, so the fix is only visible after the rebuild. |

## Diff Highlights

```tsx
// frontend/src/components/concept/ConceptLessonViewer.tsx
const renderedSectionBodies = useMemo(() => {
  const bodies = new Map<string, string>();
  lesson?.sections.forEach((section) => {
    bodies.set(section.id, renderMarkdownWithMath(section.content_markdown, { breaks: true }));
  });
  return bodies;
}, [lesson]);
...
<div
  className="markdown-body text-sm leading-relaxed text-slate-300"
  dangerouslySetInnerHTML={{ __html: renderedSectionBodies.get(section.id) ?? '' }}
/>
```

```css
/* frontend/src/styles/globals.css */
:is(.markdown-body, .problem-markdown) .katex { font-size: 1.05em; color: #f1f5f9; }
:is(.markdown-body, .problem-markdown) .katex-display { margin: .75rem 0; overflow-x: auto; }
```

## Tests Added or Updated

- `frontend/src/lib/__tests__/markdown.test.ts::renderMarkdownWithMath > renders inline math and leaves no literal dollar signs`
- `...::renders display math into a katex-display block`
- `...::renders lesson-style math containing \text{} with escaped underscores` — pins the `\text{base\_address}` construct from the report
- `...::renders bold, bullets and nested lists` — 2-space indented nested `<ul>`
- `...::renders ordered lists without leaking the raw markers`
- `...::strips scripts and event handlers (DOMPurify runs before KaTeX injection)`
- `...::does not throw on malformed math`
- `...::returns an empty string for empty input`
- `...::reflows single newlines by default and preserves them with breaks: true`
- `frontend/src/components/concept/__tests__/ConceptLessonViewer.test.tsx::ConceptLessonViewer > renders lesson markdown as HTML with typeset math, not as raw source` — the actual reported symptom, driven by a verbatim `arrays-hashing/lesson.md` excerpt
- `frontend/src/components/problem/__tests__/ProblemViewer.test.tsx::ProblemViewer > still renders KaTeX math inside .problem-markdown` — regression guard for `problem-latex-rendering-caps`
- `tests/test_curriculum.py::TestLessonMarkdown::test_lesson_math_delimiters_are_balanced`

Note on assertions: KaTeX intentionally embeds the original TeX in `<annotation encoding="application/x-tex">` for accessibility. Tests strip those annotations before asserting that no raw source survives, so they check what the user actually sees.

## Local Verification

- `cd frontend && npm run test:unit` → **20 passed / 20**, 4 files. (11 authored by this fix; the other 9 belong to a concurrent `debugger-stuck-connecting` session that adopted the same vitest setup.)
- `cd frontend && npx tsc -p /tmp/opencode/tsconfig.concept-check.json --noEmit` → **exit 0** for every file this fix touches (including the new tests).
- `cd frontend && npm run build` → **succeeded in 1m 3s** (`tsc -b` + `vite build`).
- `grep ":is(.markdown-body,.problem-markdown)" dist/assets/index-*.css` → **13 rules emitted**, including `.katex { font-size: 1.05em; color: #f1f5f9 }` and `.katex-display`.
- `python3 -m unittest discover tests/` → **88 passed (55.4s), OK**.
- Ad-hoc content sweep: rendered every non-heading line of the four authored `lesson.md` files (`arrays-hashing`, `two-pointers`, `linked-lists`, `trees`) through the renderer and asserted no `$`, `**`, `\text`, `\alpha`, `\times`, or `\log` survives in the visible output — **passed**. This ran as a temporary vitest file, which was deleted afterwards; it is not part of the committed suite because it couples the frontend tests to curriculum content.
- Manual checks: **none in a browser.** No browser was driven in this session. The user should confirm the tab at `localhost:8080` (or their `--port` override).

## Deviations from Assessment

1. **`MemoryDiagram.tsx:51` uses plain text `O(1)`,** not the shared inline-math helper. The assessment allowed either; a static caption does not justify a second `dangerouslySetInnerHTML` site.
2. **CSS uses `:is(.markdown-body, .problem-markdown)` rather than a rename plus alias class.** The assessment floated both; keeping `.problem-markdown` inside the same selector list means the Practice & Code tab cannot regress from this change at all.
3. **The shared helper takes a `breaks` option** instead of one fixed default. The assessment's risk section recommended resolving the `breaks` conflict this way; the user confirmed `breaks: true` for lesson prose and hints.
4. **`ProgressiveHintDrawer` was included.** The assessment listed it as optional and left it as an open question; the user chose full scope.
5. **Two files beyond the assessment's change list:** `frontend/vitest.config.ts` and `frontend/src/components/problem/__tests__/ProblemViewer.test.tsx`. The former keeps the production Vite config untouched; the latter is the regression guard the assessment's "CSS refactor regression" risk calls for.
6. **Test script named `test:unit`, not `test`.** A concurrent session had already claimed `npm test` for its `node --test` suite; overwriting it would have broken their work.
7. **`@tailwindcss/typography` was not added.** That was the assessment's first alternative; the preferred hand-tuned CSS path was taken, so the dead `prose` classes were removed rather than made live.
8. **`vitest.config.ts` `include` is scoped by directory** rather than a broad `src/**/*.test.{ts,tsx}`, because the repo already contains two non-vitest harnesses: `src/components/visualizer/engine/__tests__/visualizers.test.ts` (self-shimmed `describe`/`it`, tracked in git) and `src/components/layout/__tests__/headerShortcutsModal.test.mjs` (`node --test`). A broad glob fails with "No test suite found" on both.

## Follow-ups

- **Rebuild before/with any frontend change.** `frontend/dist` is committed and served by `dsa_learn/server/app.py:261-297`; the fix is invisible until `npm run build` is re-run and the regenerated assets committed.
- **Browser confirmation.** Open the Concept & Theory tab and confirm the reported sections now show typeset math and real lists.
- **Consolidate the four test harnesses** now coexisting in `frontend/`: `node --test` (`.mjs`), a self-shimmed `.ts` file, and vitest. `src/components/visualizer/engine/__tests__/visualizers.test.ts` is currently not wired to any npm script.
- **Hint drawer still has inert `prose prose-invert prose-xs` classes** and does not carry `.markdown-body`, so hint math renders with base KaTeX CSS but without the `1.05em` sizing. Consider folding it in later.
- **`$` ambiguity in the inline-math regex** is unchanged: two dollar signs on one line are always treated as math, so future lesson prose using currency (`$5 and $10`) would be swallowed. Pre-existing in the problem tab; the shared helper is now the single place to fix it.
- **Update `specs/003-interactive-concept-learning/tasks.md:53`**, where task T014 is marked complete for markdown rendering that had not actually been implemented.
- **Concurrency note:** this workspace had two other in-flight bug-fix sessions (`debugger-stuck-connecting`, `shortcuts-modal-unclosable`) editing `frontend/src`, `frontend/dist`, and `frontend/package.json` at the same time. `npm run build` failed twice mid-session on their half-finished `useDAP.ts` → `api.ts` import before their change landed; the successful build above includes all three sessions' work. Review the commit for this slug with that in mind — `frontend/dist`, `frontend/package.json`, and `frontend/vitest.config.ts` are shared files.