# Bug Assessment: Keyboard Shortcuts Modal Cannot Be Closed Once Opened

- **Slug**: shortcuts-modal-unclosable
- **Created**: 2026-10-06
- **Source**: pasted text (DOM dump of the trigger button + freeform complaint)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

```html
<button class="inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-50 cursor-pointer hover:bg-slate-800 rounded-md text-xs h-8 w-8 p-0 text-slate-400 hover:text-white" title="Keyboard shortcuts"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-keyboard w-4 h-4">…</svg></button> once oopen there is no way to close
```

No URL was supplied, so the URL Trust Policy was not exercised.

The pasted `class` attribute is the trigger button's rendered `className`. It reconstructs exactly to the shortcuts button in `frontend/src/components/layout/Header.tsx:133-141`: base styles from `frontend/src/components/ui/button.tsx:11`, ghost variant `hover:bg-slate-800` (`button.tsx:18`), `sm` size `rounded-md text-xs h-8` (`button.tsx:25`), plus the local override `h-8 w-8 p-0 text-slate-400 hover:text-white` and `title="Keyboard shortcuts"`. `PlaybackControls.tsx:130-138` renders a visually similar help button but its title is `Keyboard shortcuts help`, so the report is unambiguously about the Header. `lucide-react` resolves `Keyboard` to `lucide-keyboard`, matching the SVG class in the report.

## Symptom

Clicking the keyboard-shortcuts button in the header opens a panel whose body is visible but whose title bar is pushed off the top of the screen, so the `✕` close control is not clickable; the overlay simultaneously covers the whole 56px header strip and swallows clicks on every other header button, and there is no Escape or backdrop-dismiss handler. Expected: the modal renders centered in the viewport with its close button reachable, `Escape` closes it, clicking the backdrop closes it, and the header actions remain usable either way.

## Reproduction

### Verified locally (Linux, this host, Chromium 1.63 via Playwright with `/usr/bin/chromium`)

The React app was not launched; instead the exact DOM/CSS structure produced by `Header.tsx:50` + `Header.tsx:218-266` was reproduced as a standalone static page (`h-screen` root with `overflow:hidden` → `<header class="h-14 … backdrop-blur">` → `position:fixed; inset:0; display:flex; align-items:center; justify-content:center; padding:16px` overlay → card with title row containing `✕` and eight `py-1` shortcut rows) and measured with `getBoundingClientRect()` at a 1280×800 viewport. The markup and class-derived CSS are a faithful copy of the Tailwind utilities used at those lines.

1. Open the page; the header measures `height: 56` (Tailwind `h-14`).
2. Click the `⌨` button; the overlay mounts.
3. Measured geometry while open:

   | Element | top | bottom | height |
   | :- | -: | -: | -: |
   | overlay (`fixed inset-0`) | 0 | 55 | **55** |
   | modal card | **-107** | 162 | 269 |
   | `✕` close button | **-86** | **-68** | 18 |
   | viewport height | | 800 | |

4. The overlay is **55px tall, not 800px** — it occupies the header band only, not the viewport.
5. `document.elementFromPoint()` at the centre of the shortcuts toggle button (1252, 28) returns the **overlay**, and `overlay.onclick` is `null`. So the toggle button, and every other header button (Reset, Solution, Run, Debug, Test Suite, Save), is inert while the modal is open, and clicking the overlay itself does nothing.

Screenshot of the reproduced state (`/tmp/opencode/repro-shot.png`): the first visible row is `Save to Disk`; the `Keyboard Shortcuts` title bar and the `✕` are entirely above the top edge; page content below the header is fully bright and interactive because the dim backdrop never reaches it.

### In the real app the offset is larger

The reproduced card is 269px tall. The real card (`Header.tsx:219-264`) has the same `p-5`, the same title row and the same eight `py-1` shortcut rows, and measures ~270-300px in the shipped Tailwind theme, so the vertical overflow is ≈ `-(cardHeight - 24) / 2` ≈ **-123px to -138px** — the title bar plus the first three shortcut rows are clipped off the top. The conclusion is invariant: the `✕` sits entirely above `y = 0` and is unreachable by pointer.

### Steps in the shipped app (for manual confirmation)

1. `npm run dev` in `frontend/` and open the dashboard.
2. Click the keyboard icon in the top-right header.
3. Observe the panel appears hanging from the top edge with its title bar/`✕` clipped off-screen.
4. Try: `✕` (unreachable), `Escape` (no handler — `frontend/src/App.tsx:219-273` handles only `Ctrl+Enter`, `Ctrl+Shift+Enter`, `F5`, `F10`, `F11`, `Shift+F11`, `Shift+F5`), backdrop click (no handler), header buttons (covered by the overlay), closing the tab and reopening (only path that works).

## Suspected Code Paths

- `frontend/src/components/layout/Header.tsx:218` — the overlay `div` with `fixed inset-0` is rendered *inside* `<header>`; `position: fixed` therefore resolves against the header, not the viewport.
- `frontend/src/components/layout/Header.tsx:50` — `<header … backdrop-blur …>`: a non-`none` `backdrop-filter` (and `filter`) makes the element a containing block for fixed-position descendants per the CSS Filter Effects spec, and a stacking context besides. This is what converts `inset-0` from "whole viewport" to "the 56px header box".
- `frontend/src/components/layout/Header.tsx:224-229` — the `✕` close button lives in the card's title row, i.e. in the top ~40px of a ~270-300px card, which is precisely the region that overflows above the viewport.
- `frontend/src/components/layout/Header.tsx:136` — `onClick={() => setShowShortcuts(!showShortcuts)}`: the only other close path, and it is unreachable because the overlay covers the header band.
- `frontend/src/components/layout/Header.tsx:218` — overlay has no `onClick` to dismiss on backdrop click.
- `frontend/src/App.tsx:219-273` — global `keydown` handler with no `Escape` branch, so the modal has no keyboard dismissal.
- `frontend/src/App.tsx:368` — root `h-screen … overflow-hidden` confirms the app renders at exactly viewport height, so the 56px containing block is not offset by scroll.
- `frontend/src/components/problem/SolutionModal.tsx:66-141` — the **working** reference: `Dialog.Root` + `Dialog.Portal` + `Dialog.Overlay` + `Dialog.Content` + `Dialog.Close`, i.e. the pattern that escapes the containing-block trap and provides Escape, focus trap and `aria-modal` for free. `@radix-ui/react-dialog` is already a dependency (`frontend/package.json`).
- Same-shape latent instances (currently render correctly, no dismiss affordances): `frontend/src/components/visualizer/VisualizerContainer.tsx:368` and `frontend/src/components/visualizer/PlaybackControls.tsx:141`. They have no filter ancestor, so their `fixed inset-0` does resolve to the viewport — but both still lack backdrop-click and Escape dismissal. `PlaybackControls.tsx:140` (`localHelpOpen && !onOpenHelp`) also makes that component's own modal dead code, since `VisualizerContainer.tsx:363` always passes `onOpenHelp`.

Introduced in `b3513bc` ("feat(editor): implement in-browser C++ autocompletion, debugging, and interactive learning"); long-standing, not a regression.

## Root Cause Hypothesis

The shortcuts modal is a `position: fixed` overlay rendered inside an ancestor that establishes a containing block for fixed descendants. `Header.tsx:50` applies `backdrop-blur` to the `<header>`, which under the CSS Filter Effects spec makes the header the containing block for fixed-position descendants (and a stacking context). Consequently `fixed inset-0` on `Header.tsx:218` resolves to the header's padding box — 100% of the width but only 56px of height — instead of the viewport. The flex centering (`items-center justify-center`, `p-4`) then vertically centers a ~270-300px card inside a 24px-tall content box, pushing the card's top ~130px above `y = 0`. The card's title row is the topmost element, so the `✕` lands entirely above the viewport and cannot be clicked. Two independent defects then remove every remaining exit: the same overlay, now sitting inside the header's box, covers the header strip and makes the toggle button (and the other header actions) unclickable, and the component has no backdrop-click handler and no `Escape` handler to fall back on. **Confidence: high** — measured directly in Chromium against a faithful reproduction, and consistent with the rendered class names in the report.

## Proposed Remediation

**Preferred**: render the shortcuts modal through a React portal onto `document.body` so it escapes the header's `backdrop-filter` containing block, and give it a real dismissal contract. Concretely, wrap the block at `Header.tsx:217-267` in `createPortal(<div …>, document.body)`, add `onClick` on the overlay that closes only when the click target is the overlay itself (`if (e.target === e.currentTarget) setShowShortcuts(false)`), add an `Escape` `keydown` listener scoped to the modal's open lifetime (or reuse the existing global handler in `App.tsx` by lifting the flag), and add `role="dialog"`, `aria-modal="true"`, `aria-label="Keyboard Shortcuts"`, `aria-expanded`/`aria-haspopup="dialog"` on the trigger, plus `initialFocus`/`onOpenAutoFocus` handling so focus lands on the `✕` and returns to the trigger on close.

**Alternatives**:

- **Adopt Radix `Dialog` for this modal** (mirroring `SolutionModal.tsx` verbatim, swapping `Dialog.Portal`/`Overlay`/`Content`/`Close` in place of the hand-rolled divs). This is the smallest diff that fixes every sub-problem at once — portal, `Escape`, focus trap and restore, outside-click dismiss, `aria-modal`, scroll lock — and it removes a hand-rolled modal rather than adding hand-rolled behaviour to it. Trade-off: slightly heavier render than a plain div, and the visual styling must be re-applied to Radix primitives (the existing `SolutionModal` styling is a usable template). This is arguably the stronger recommendation; it is listed second only because it introduces a library dependency into a file that currently has none.
- **Keep the inline div and stop `Header.tsx:50` from being a containing block** (drop `backdrop-blur`, or move it to an inner non-ancestor element). Trade-off: fixes the geometry but *not* the missing dismissal paths, and it changes the header's visual design and would regress the same bug the moment anyone re-adds a blur. Rejected.
- **Minimal patch: add `Escape` + backdrop-click only.** Trade-off: unblocks the user without touching layout, but leaves the overlay covering the header band (a 56px-tall scrim artifact) and the card overflowing its own container. Acceptable as a hotfix, not as the fix.

**Files likely to change**:

- `frontend/src/components/layout/Header.tsx` — the modal (`:217-267`), the trigger's `aria-*` (`:133-141`), and the `showShortcuts` state wiring.
- `frontend/src/components/ui/dialog.tsx` (new, if the Radix route is chosen) — thin styled wrapper over `@radix-ui/react-dialog`, so the two existing hand-rolled modals can share one implementation.

**Tests to add or update**:

- A DOM/interaction test that opens the modal and asserts the close control is inside the viewport — e.g. after clicking the trigger, `document.querySelector('[role="dialog"]')!.getBoundingClientRect().top >= 0` and `.bottom <= window.innerHeight`. This assertion fails against the current code (`top === -107`) and is the direct regression lock for the reported bug.
- The same test must assert the overlay itself covers the viewport (`overlay.height === window.innerHeight`), since that is the containing-block symptom and would catch a re-introduction of any ancestor `filter`/`backdrop-filter`/`transform`/`contain`.
- Dismissal tests: `Escape` closes; backdrop click closes; the `✕` click closes; clicking the trigger a second time closes; focus returns to the trigger after close.
- Do-not-block test: with the modal open, `elementFromPoint` over the trigger and over each header action resolves to the action, not the overlay.
- `frontend/package.json` has **no** `test` script and no test framework; the single existing suite (`frontend/src/components/visualizer/engine/__tests__/visualizers.test.ts`) hand-rolls `expect`/`describe` and is not wired to a runner. Locking this fix in therefore needs runner setup — Playwright is the natural choice given it is already installed on this host (`playwright` 1.63 + `/usr/bin/chromium`) and the failure is layout-driven. If a runner is out of scope for the fix, the minimum viable guard is a static source assertion (the overlay must not be a descendant of the `<header>` / must be portalled), which is weaker but cheap.
- Same suite should be extended to `VisualizerContainer.tsx:368` and `PlaybackControls.tsx:141` so the two latent copies cannot regress the same way.

## Risks & Considerations

- **Blast radius of the fix**: `Header` is rendered unconditionally in `App.tsx:369`, so a change here affects every screen and both app modes (`exercises` and `concept`). The portal must not break the `h-screen` flex layout, which it will not — `document.body` is outside the app root's overflow context.
- **Currently blocked actions**: while the modal is open the entire header action bar is inert, so `Test Suite`, `Run`, `Debug`, `Reset`, `Solution` and `Save` are all unavailable until reload. The user report understates the impact; it should be verified manually in the shipped app before closing the bug.
- **Regression risk is low but the pattern is contagious**: three hand-rolled `fixed inset-0` overlays exist. Fixing only `Header.tsx` leaves the same class of bug one `backdrop-blur` away in the other two. A shared `Dialog` primitive removes the repetition rather than triaging it three times.
- **`SolutionModal.tsx` should be checked too**: it is correct today only because Radix portals to `document.body`. Do not "simplify" it into an inline div.
- **No data risk**: the modal holds no state and performs no writes. No migration, no API change, no perf or security surface. The only real cost is the scroll lock / focus-trap behaviour a real dialog adds.
- **Observability**: this is purely visual/DOM, so it will never surface in logs or the Python test suite; only a browser-level test can hold the line.
- **Dead code**: `PlaybackControls.tsx:133-155`'s local `localHelpOpen` path is unreachable while `VisualizerContainer.tsx:363` always supplies `onOpenHelp`. Worth folding into the same change or filing separately; not required for this fix.

## Open Questions

- [NEEDS CLARIFICATION: the report gives no environment. Confirm whether the user is on the `npm run dev` build, the `frontend/dist` bundle (`frontend/dist/assets/index-Dr6_Lxd5.js`, which already contains the same `fixed inset-0` overlay), or the packaged launcher, and whether they ever saw the title bar at all — a very tall/short window shifts how many rows are clipped but not the `✕` being unreachable.]
- [NEEDS CLARIFICATION: was a page reload required to recover, or did the user find an escape route we have not identified? If a reload was needed, that confirms severity `high`.]
- [NEEDS CLARIFICATION: should the fix adopt Radix `Dialog` (consistent with `SolutionModal.tsx`, larger diff, better semantics) or stay dependency-free with a portal plus hand-rolled dismissal? This is a design decision for the fix step.]
- [NEEDS CLARIFICATION: is a frontend test runner in scope for this bug, or should the fix ship with a source-level guard only and the runner be filed separately?]