# Bug Assessment: Committed frontend/dist Silently Stale — Server Serves a Bundle Many Commits Behind Source

- **Slug**: stale-committed-frontend-dist
- **Created**: 2026-10-06
- **Source**: pasted text ("create a new bug based on what you found while implement thid") — found while implementing spec 007
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

Found while implementing `007-concept-theory-navigation`. Verbatim user input:

```text
create a new bug based on what you found while implement thid
```

During spec 007 the frontend toolchain could not run: `npm run build` and `npx vite build` both failed because `frontend/node_modules` was only partially installed. Investigating that exposed a larger problem — `frontend/dist/` is committed to git, and it is five source commits stale.

## Symptom

The dashboard serves `frontend/dist/index.html` and its bundled assets from disk (`dsa_learn/server/app.py:304-326`). That directory is tracked in git (155 files) and has not been rebuilt since commit `f4efe82`. Five subsequent commits touched `frontend/src`, including two that fixed user-visible bugs and one that delivered an entire feature. Anyone running the platform therefore sees the old interface: spec 006's `ComplexityMatrixTable`, `MemoryDiagram`, `ProgressiveHintDrawer`, `DecisionMatrixViewer` and `StepNarrative` are all absent from the shipped bundle, as is the entirety of spec 007.

Expected: the dashboard reflects `frontend/src`. Observed: it reflects `f4efe82`, and nothing in the repository, the build output, or the test suite reports the discrepancy.

## Reproduction

1. `git log -1 -- frontend/dist` → `f4efe82 feat(debugger): replace hand-written DAP client with vendored pygdbmi`
2. `git log -1 -- frontend/src` → `e760186 feat(curriculum): author deep theory and visualization for all 16 topics`
3. `git rev-list --count f4efe82..HEAD -- frontend/src` → `5`
4. `git ls-files frontend/dist | wc -l` → `155` (tracked, not ignored)
5. `grep -l "ComplexityMatrixTable" frontend/dist/assets/*.js` → no match (the component exists in `frontend/src/components/concept/ComplexityMatrixTable.tsx`)
6. `grep -l "DecisionMatrixViewer\|StepNarrative\|MemoryDiagram\|ProgressiveHintDrawer" frontend/dist/assets/*.js` → no match for any
7. Serve the platform and open the Concept & Theory tab → the authored 16-topic theory material from spec 006 is absent

## Suspected Code Paths

- `dsa_learn/server/app.py:304-326` — `_serve_static` reads `FRONTEND_DIST_DIR` and falls back to `index.html`. It has no notion of staleness, so it serves whatever is on disk regardless of `frontend/src`.
- `frontend/dist/index.html` — references `/assets/index-BRMHjlne.js`, dated `Oct 6 06:59`, from before the five later commits.
- `.gitignore` — contains `frontend/node_modules/` and `frontend/.vite/` but **no** `dist` entry, which is why 155 build artifacts are tracked.
- `.github/workflows/` — **does not exist**. No CI builds the frontend, so no signal is ever produced.
- `frontend/package.json` — `"build": "tsc -b && vite build"`. This is the only path that refreshes `dist`, and it is manual.
- `README.md` — `grep -n "npm run build"` returns nothing, so the required build step is undocumented.

Two of the five missing-behind commits are already-filed bug fixes whose repairs are therefore not actually live:

- `f02c56d fix(concept): render lesson markdown and math instead of raw source` → see `.specify/bugs/concept-theory-latex-rendering`
- `c36aaf6 fix(layout): portal the shortcuts modal to document.body` → see `.specify/bugs/shortcuts-modal-unclosable`

That second one matters most: `shortcuts-modal-unclosable` describes a modal that could not be dismissed, with no way out short of reloading. That fix is committed to source and **absent from the bundle the server actually serves**.

## Root Cause Hypothesis

`frontend/dist/` was committed deliberately at some point (to let the dashboard run without a build step), but no mechanism was ever added to keep it in step with `frontend/src`. Because the directory is tracked rather than ignored, `git status` shows no drift — the staleness is invisible to every tool in the project. `npx vite build` fails offline without a full `node_modules`, and the partial install present here meant the build could not be run to discover the gap. Confidence: **high**. The evidence is direct: component source files exist, the corresponding bundle has no trace of them, and the file timestamps and git history agree.

## Proposed Remediation

**Preferred**: stop tracking `dist/` and make the build an explicit, documented prerequisite of running the dashboard.

1. Add `frontend/dist/` to `.gitignore` and `git rm -r --cached frontend/dist` (155 files), keeping the working copy so nothing breaks immediately.
2. Document the build step in `README.md` and have `dsa_learn`'s "API live" placeholder page (which already appears when `dist` is absent) state that the dashboard must be built first. This makes a missing build loud instead of silent.
3. Add a minimal CI workflow that runs `npm ci && npm run build` on every push, so a build break is caught before it reaches anyone.

This removes 155 generated files from history's future, and converts a silent failure into either a working build or an explicit message.

**Alternatives**:

- *Keep `dist/` tracked, but add a staleness check.* A test that compares `dist/index.html`'s mtime against the newest `frontend/src` file would fail loudly. Far cheaper, and preserves the zero-build-run experience — but keeps the repo carrying build output and still does nothing about the case where `dist` is absent.
- *Serve the dashboard from a dev server instead.* A Vite proxy already exists in `vite.config.ts`, so `npm run dev` is viable. Best developer experience, worst offline story: Principle IV requires the platform to work with no network, and a dev server is not the artifact the constitution describes.

**Files likely to change**:

- `.gitignore` — add `frontend/dist/`
- `README.md` — document `npm ci && npm run build` as a prerequisite
- `.github/workflows/ci.yml` — new; install and build the frontend
- `frontend/dist/**` — untracked going forward (`git rm -r --cached`)
- `tests/test_frontend_dist.py` — new; a guard, below

**Tests to add or update**:

- A test asserting `frontend/dist/` is not tracked (`git ls-files frontend/dist` is empty), so it cannot silently reappear.
- A test asserting that when `dist/index.html` exists, its referenced asset bundle actually contains the components `frontend/src` defines — the direct check for this bug. Cheaper form: assert `dist` is not older than the newest `frontend/src` commit.
- Keep the existing `tests/test_offline_verification.py` suite green; it currently passes without noticing any of this.

## Risks & Considerations

- **Untracking `dist` breaks the "clone and run" path** for anyone relying on the committed bundle. Mitigate by documenting the build and making the missing-dist placeholder explicit. This is the main trade-off against the preferred option and the reason the staleness test is worth adding regardless.
- **`git rm -r --cached` leaves the files on disk**, so a running local server is unaffected. Use `--cached`, never `-r`.
- **Removing 155 tracked files produces a large diff.** Best landed as its own commit, separate from any feature work.
- **No CI exists today**, so adding the first workflow may surface unrelated pre-existing failures. That is information, not regression — worth stating in the commit message so it is not misread.
- **This bug masks other bugs.** Two already-filed assessments (`concept-theory-latex-rendering`, `shortcuts-modal-unclosable`) have fixes that are committed but not live. Any prior verification done against a running dashboard may have been observing the stale bundle, so "fixed" claims for those should be re-checked after a rebuild.

## Open Questions

- [NEEDS CLARIFICATION: was `frontend/dist/` committed intentionally to support running without a build step? If so, the preferred remedy should keep that capability, and the staleness test becomes the primary fix rather than the secondary one.]
- [NEEDS CLARIFICATION: should CI be added in this fix, or is that out of scope for a single bug? The assessment treats it as part of the preferred remedy.]
- [NEEDS CLARIFICATION: were the `concept-theory-latex-rendering` and `shortcuts-modal-unclosable` fixes ever verified in a browser? If they were verified against a running server, that verification was against the stale bundle and the result may be wrong.]