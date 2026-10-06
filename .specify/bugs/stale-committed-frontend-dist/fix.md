# Bug Fix: Committed frontend/dist Silently Stale — Server Serves a Bundle Many Commits Behind Source

- **Slug**: stale-committed-frontend-dist
- **Fixed**: 2026-10-06
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`frontend/dist/` was five source commits stale, so the dashboard served an interface missing spec 006's authored theory components and the entirety of spec 007 — including the fixes for two previously-filed bugs. Rebuilt the bundle to match current source, and added `tests/test_frontend_dist.py` so a forgotten rebuild fails the test suite instead of being discovered by a learner.

The assessment proposed untracking `dist/`. **That was wrong**, and the fix departs from it deliberately — see Deviations.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/dist/**` | modified (rebuilt) | 39 files replaced. Old bundle `index-BRMHjlne.js` (5.35 MB, `f4efe82`) → `index-CwrE6-E4.js` (5.47 MB). All previously-absent features now present. |
| `tests/test_frontend_dist.py` | added | 7 tests. Staleness gate, content freshness, servability, and two guards keeping `dist/` tracked. |
| `README.md` | modified | New "Rebuilding the dashboard bundle" subsection under Development. Documents why `dist/` is committed, the rebuild command, the OOM workaround, and the gate that enforces it. |
| `dsa_learn/server/app.py` | modified | The missing-`dist` placeholder page now says `npm ci && npm run build` rather than `npm run build`, so the first-time instruction matches reality. |

## Diff Highlights

The staleness gate — the piece that was entirely absent when this bug was found:

```python
def test_dist_is_not_older_than_source(self) -> None:
    newest_src = _newest_mtime(SRC)
    dist_time = DIST_INDEX.stat().st_mtime
    self.assertGreaterEqual(
        dist_time,
        newest_src,
        "frontend/dist/ is STALE: it predates changes in frontend/src. "
        "Rebuild with: cd frontend && npm ci && npm run build",
    )
```

And the guard against "fixing" this the wrong way later:

```python
def test_gitignore_does_not_exclude_dist(self) -> None:
    offenders = [p for p in patterns if re.fullmatch(r"(frontend/)?dist/?", p)]
    self.assertEqual([], offenders, f".gitignore excludes dist via {offenders}, "
        "which contradicts README.md:145")
```

## Tests Added or Updated

`tests/test_frontend_dist.py` — 7 tests, all passing:

- `test_dist_is_not_older_than_source` — **the direct check for this bug.** Fails when `dist/` predates `frontend/src`.
- `test_bundle_contains_current_features` — asserts 8 user-visible strings are in the shipped bundle. Complements the mtime check: catches "you forgot to rebuild" *and* "you rebuilt from the wrong tree".
- `test_dist_index_exists` — fails with the exact rebuild command when the bundle is missing.
- `test_referenced_assets_exist` — every asset `index.html` references resolves, so the dashboard cannot serve a 404 page.
- `test_index_html_is_actually_an_html_document` — guards against a truncated build.
- `test_dist_is_tracked_by_git` / `test_gitignore_does_not_exclude_dist` — keep `dist/` tracked, because README:145 promises pre-built assets ship with the repo.

The gate was verified to actually fail: touching `frontend/src/App.tsx` produced the stale-bundle assertion, and the suite returned to green once source mtimes were realigned.

## Local Verification

- `cd frontend && npm run build` → **OOM at the default heap** (heap limit ~2 GB, monaco bundle is 5.47 MB). Re-ran with `NODE_OPTIONS="--max-old-space-size=8192" npx vite build` → `✓ built in 1m 6s`.
- Feature presence in the new bundle, by user-visible string: `Theoretical Foundations`, `Builds on`, `Where this leads`, `Related topics`, `Curriculum Map`, `Mark as read` — all present. All were absent before.
- `python3 -m unittest discover -s tests -p 'test_*.py'` → **456 tests, OK (17 skipped)**. Up from 449; the 7 new ones are `test_frontend_dist.py`.
- `python3 -m unittest tests.test_frontend_dist` → 7 passed.
- Negative test: `touch frontend/src/App.tsx` then re-run → fails with the stale-bundle message. Confirms the gate is not vacuous.
- Live serve check: `GET /` → 200, 862 bytes, `id="root"` present. Referenced bundle → 200, 5,467,561 bytes, all four checked UI strings present. The server now serves current code.
- `cd frontend && npx tsc --noEmit` → **0 errors**.

## Deviations from Assessment

**1. Did not untrack `dist/`. The assessment's preferred remedy was wrong.**

The assessment listed `[NEEDS CLARIFICATION: was frontend/dist/ committed intentionally…]`. Evidence answers it: **yes, deliberately.** README.md:145 reads:

> "Node 18+ is only needed if you plan to edit frontend source, since pre-built assets ship in `frontend/dist/`."

Untracking would have removed a documented, intentional capability — running the dashboard with no Node — and contradicted Principle IV, which requires the platform to work on a bare Python + g++ machine. The assessment itself flagged this as the main trade-off of its own recommendation; on inspection the trade-off is unacceptable. Confirmed with the user, who chose "keep tracked, add staleness gate".

`git rm -r --cached` was not run. `.gitignore` was not modified. The 155 files remain tracked.

**2. Did not add `.github/workflows/ci.yml`.**

The assessment called this part of the preferred remedy but also raised it as a clarification. Confirmed with the user: skipped. This repo has no CI at all, and introducing the first workflow touches every future commit and may surface unrelated pre-existing failures — a separate decision, not part of fixing this bug. The staleness test is what catches this locally; CI would only duplicate it remotely.

**3. Rebuilt `dist/` — not in the assessment's remediation at all.**

The assessment described detecting staleness but never rebuilding the bundle. Fixing the bug requires both: the gate prevents recurrence, but without a rebuild the stale bundle would still be live. This was scope the assessment missed.

**4. `FRESHNESS_MARKERS` uses user-visible strings, not component names.**

Component identifiers are absent from a production bundle because minification mangles them — an earlier verification pass of mine grepped for `ComplexityMatrixTable` and wrongly reported it missing from a bundle that did contain it. The test asserts rendered text (`"Builds on"`, `"Curriculum Map"`, …), which survives minification. The list is the one manual coupling in the module and is documented as such in its docstring.

**5. Root cause confirmed, not corrected.**

The assessment hypothesised `dist/` was committed "at some point" deliberately but lost its freshness mechanism. `git log --diff-filter=A` shows it was added in the initial core commit `8fe8192`, consistent with intentional. So the diagnosis was right; only the remedy was wrong.

## Follow-ups

- **Re-verify the two masked bugs in a browser.** `concept-theory-latex-rendering` (`f02c56d`) and `shortcuts-modal-unclosable` (`c36aaf6`) had fixes committed but never in the served bundle. Both are now live, but if either was signed off by observing a running dashboard, that observation was against the stale bundle and the verdict may be wrong. This is the highest-value outstanding item.
- **Commit the 39-file `dist/` diff separately** from other work, per the assessment's risk note about diff size.
- **Consider `NODE_OPTIONS` in `frontend/package.json`'s `build` script.** The default-heap OOM is now a known papercut for anyone rebuilding; encoding the heap bump in the script would remove a step from the documented instructions.
- **Bundle size is growing** — 5.47 MB, 1.45 MB gzipped, and the build already warns about chunks over 500 kB. Monaco's language grammars dominate. Not this bug's job, but it will keep needing an 8 GB heap.
- **Consider CI later**, if wanted, to run `npm ci && npm run build` plus both test suites. Now that `npm run build` is known to need a raised heap, a workflow would need that set too.