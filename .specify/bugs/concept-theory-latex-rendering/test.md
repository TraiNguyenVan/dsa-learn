# Bug Verification: Concept & Theory Tab Renders Raw Markdown and LaTeX Source

- **Slug**: concept-theory-latex-rendering
- **Tested**: 2026-10-06
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified
- **Closed**: 2026-10-06

## Summary

The reported symptom no longer reproduces. All 20 lesson sections from 5 topics — covering all 12 topics by construction — render through the shared pipeline with zero literal `$`, `**`, backtick, LaTeX-command, or list-marker text surviving into the visible output, and 53 KaTeX nodes plus real `<strong>`/`<ul>`/`<ol>`/`<code>` elements are produced. The bug was *not* reproduced in a browser (none available in this session); the assessment's manual walkthrough was exercised through its automated equivalent instead, plus a live check that the running server serves the rebuilt bundle containing the fix. No regressions: 20/20 vitest, 7/7 node:test, 88/88 Python, full-project `tsc` clean.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix), automated equivalent | `node /tmp/opencode/verify-render.mjs` after dumping real content via `get_topic_lesson()` | **pass** | 20 sections / 5 topics rendered; 53 `.katex` nodes; `strong=44 ul=18 ol=4 code=41`; 0 raw-source failures. Script lives in `/tmp`, no workspace files written. |
| Report content still reaches the client as LaTeX source | `GET http://127.0.0.1:8080/api/curriculum/topics/arrays-hashing/lesson` | **pass** | Section 03 returns `$arr[k] = \text{base\_address} + (k \times \text{element\_size})$` verbatim — confirms the reproduction input is intact and the fix is genuinely client-side rendering, not a content change. |
| Served bundle contains the fix | `GET /` + `GET /assets/index-Da0ofM_u.js`, grep | **pass** | Server serves the freshly built bundle; contains `markdown-body`, `KATEXINLINETOKEN`, `KATEXBLOCKTOKEN`, `katex-mathml`. |
| New / updated tests | `cd frontend && npm run test:unit` | **pass** | 20 passed / 20, 4 files. 11 authored by this fix (9 `markdown.test.ts`, 1 `ConceptLessonViewer.test.tsx`, 1 `ProblemViewer.test.tsx`); 9 belong to a concurrent `debugger-stuck-connecting` session. |
| Regression suite (frontend, `node --test`) | `cd frontend && npm test` | **pass** | 7 passed / 7 — the shortcuts-modal suite, untouched by this fix. |
| Regression suite (backend) | `python3 -m unittest discover tests/` | **pass** | 88 passed in 36.9s, OK — includes the `TestLessonMarkdown` lint added by this fix. |
| Lint / type-check | `npx tsc -p /tmp/opencode/tsconfig.full-readonly.json --noEmit` (whole `src`, `incremental: false`) | **pass** | Exit 0 across every file in the project, including the three files this fix touched and the two test files it added. |
| Built CSS / asset integrity | `grep` over `frontend/dist` | **pass** | 13 `:is(.markdown-body,.problem-markdown)` rules emitted, including `.katex { font-size: 1.05em; color: #f1f5f9 }` and `.katex-display`; both hashed assets referenced by `dist/index.html` exist on disk. |
| Reproduction in a real browser | open `localhost:8080` → Concept & Theory → Arrays & Hashing | **not-run** | No browser available in this session. Would only confirm visual styling; it cannot change whether raw LaTeX reaches the DOM, which is proven above. |

## Output Excerpts

Automated reproduction over real curriculum content:

```
sections rendered : 20
katex nodes      : 53
markup           : strong=44 ul=18 ol=4 code=41
failures         : 0
```

The exact section from the bug report, before vs. after:

```
--- reported section, VISIBLE OUTPUT post-fix ---
Direct Indexing: arr[k]=base_address+(k×element_size) ... Always O(1). Push Back / Dynamic
Amortization: Appending an element to a dynamic array is O(1) amortized. ...

--- same section, what the user saw pre-fix (raw source) ---
1. **Direct Indexing**: $arr[k] = \text{base\_address} + (k \times \text{element\_size})$.
   Always $O(1)$. 2. **Push Back / Dynamic Amortization**: Appending an element to a ...
```

Test and type-check summaries:

```
 Test Files  4 passed (4)
      Tests  20 passed (20)

ℹ tests 7 / ℹ pass 7 / ℹ fail 0            (npm test)

Ran 88 tests in 36.877s
OK                                           (python3 -m unittest discover tests/)

tsc exit=0                                   (full-project --noEmit)
```

Checks used during reproduction, per section: `class="katex"` present whenever the source contains `$`; and no literal `$`, `**`, `` ` ``, `\command`, or `- **` in the tag-stripped, annotation-stripped output.

## Residual Risks

- **No visual/browser confirmation.** The `.markdown-body` rules are emitted and the classes match, but nobody has looked at the tab. Worth a 10-second eyeball, especially for list indentation and the inherited `text-transform: uppercase` on `h2` (only reachable if a lesson body ever contains a `##`-level heading, which `parse_markdown_sections` currently strips).
- **Hint drawer styling not visually verified.** `ProgressiveHintDrawer` now renders math, but it lacks the `.markdown-body` class, so hint formulas use base KaTeX CSS without the `1.05em` sizing.
- **Topic coverage is by construction, not by enumeration.** The four authored `lesson.md` files were each rendered directly; `graphs` was used as the representative for the generated fallback in `loader.py:get_default_lesson_for_topic`. The remaining seven topics share that same generator string, so they are covered transitively — but not literally enumerated in this run.
- **The `<annotation encoding="application/x-tex">` element still contains the raw TeX.** This is KaTeX's accessibility contract and is hidden by `katex.min.css`; the verification strips it deliberately. Screen readers will read the TeX source, not the visual glyphs.
- **Concurrency.** `frontend/dist`, `frontend/package.json`, and `frontend/vitest.config.ts` were being modified simultaneously by two other bug-fix sessions. The results above are for the workspace as it stands now; a future rebuild could change what is served.
- **Unchanged pre-existing limitation.** The inline-math regex still treats any two dollar signs on one line as math, so future lesson prose using currency would be swallowed. Out of scope for this fix.
- **Still unaddressed by design:** `ComplexityMatrixTable` renders plain-text complexity strings, and the Patterns & Decision Matrix viewers were never inspected.

## Recommendation

Close the bug — verified against real curriculum content end-to-end, with the live server confirmed to serve the fixed bundle and all three test suites green. The only missing evidence is a literal browser look, which is cosmetic and cannot reintroduce the reported raw-LaTeX symptom; a quick manual confirmation before release is a courtesy, not a blocker.