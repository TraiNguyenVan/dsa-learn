# Bug Fix: Keyboard Shortcuts Modal Cannot Be Closed Once Opened

- **Slug**: shortcuts-modal-unclosable
- **Fixed**: 2026-10-06
- **Assessment**: ./assessment.md
- **Status**: applied
- **Closed**: 2026-10-06 — verified manually by the reporter (modal opens centred with a reachable `✕`, closes again). `/speckit.bug.test` was intentionally not run.

## Summary

The keyboard-shortcuts modal is now rendered through a `createPortal(..., document.body)` instead of inline inside the `backdrop-blur`-bearing `<header>`, so its `fixed inset-0` overlay is sized by the viewport rather than by the 56px header strip. It also gained the dismissal paths that were missing: `Escape`, backdrop click, an accessible `role="dialog"`/`aria-modal` card with a labelled `✕`, focus moved to `✕` on open and returned to the trigger on close.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/src/components/layout/Header.tsx` | modified | New `ShortcutsDialog` component portalled to `document.body`; inline overlay deleted; Escape + backdrop dismissal; `role="dialog"`/`aria-modal`/`aria-label`; `aria-label` on the `✕`; focus in/out; `ref`, `aria-haspopup`, `aria-expanded` on the trigger; `closeShortcuts`/`toggleShortcuts` callbacks |
| `frontend/src/components/layout/__tests__/headerShortcutsModal.test.mjs` | added | Zero-dependency `node:test` regression guard (7 tests) pinning the portal and the dismissal paths |
| `frontend/package.json` | modified | Added `test` (`node --test …`) and `test:ui` scripts |
| `frontend/dist/**` | regenerated | `npm run build` output; `frontend/dist` is committed in this repo and is what `dsa_learn/server/app.py:262` serves, so the bundle had to be rebuilt for the fix to reach the shipped app |
| `.specify/bugs/shortcuts-modal-unclosable/modal-probe.mjs` | added | Browser-level probe (Playwright) used for verification; see *Local Verification* |

Scope stayed inside the files named by the assessment. No new runtime dependency (`react-dom`'s `createPortal` was already available; Radix was deliberately not adopted, per the user's choice).

## Diff Highlights

```tsx
function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 …"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Keyboard Shortcuts" …>
```

```diff
-      {showShortcuts && (
-        <div className="fixed inset-0 z-50 flex items-center justify-center …">
…
-      )}
+      {showShortcuts && <ShortcutsDialog onClose={closeShortcuts} />}
```

## Tests Added or Updated

- `frontend/src/components/layout/__tests__/headerShortcutsModal.test.mjs::shortcuts overlay is portalled to document.body, not mounted inside <header>` — the direct regression lock; the overlay must be a portal whose target is `document.body`.
- `…::no fixed overlay is mounted directly inside <header>` — asserts zero inline `fixed inset-0` nodes inside the `<header>` element, which is the containing-block trap itself.
- `…::shortcuts overlay is dismissed by Escape` — `Escape` branch plus listener added *and* removed on unmount (no leak).
- `…::shortcuts overlay is dismissed by clicking the backdrop` — `event.target === event.currentTarget` guard, so clicks inside the card do not dismiss.
- `…::shortcuts overlay exposes dialog semantics and a labelled close control` — `role="dialog"`, `aria-modal`, dialog label, close-button label.
- `…::focus moves to the close control on open and back to the trigger on close` — focus in and out.
- `…::the trigger advertises its expanded state` — `aria-haspopup="dialog"` and `aria-expanded={showShortcuts}`.

The guard was validated against the pre-fix source: running it over `git show HEAD:frontend/src/components/layout/Header.tsx` fails **7/7**, and it passes 7/7 on the fixed file — so it genuinely detects the regression rather than merely passing.

## Local Verification

| Check | Command | Result |
|---|---|---|
| Regression guard | `npm test` in `frontend/` | **pass** — 7 tests, 0 fail (`ℹ pass 7 / ℹ fail 0`) |
| Guard detects the old bug | `node --test` over `git show HEAD:…/Header.tsx` | **fail as expected** — 7 tests, 7 fail |
| Type-check + build | `npm run build` in `frontend/` (`tsc -b && vite build`) | **pass** — no TS errors, `✓ built in 34.52s` |
| Browser behaviour | Playwright 1.63 + Chromium on the built `frontend/dist` (`.specify/bugs/shortcuts-modal-unclosable/modal-probe.mjs`) | **pass** — see below |

Browser measurements after the fix, 1280×800 viewport, `frontend/dist` served over `127.0.0.1`:

```
viewport        1280 x 800
header height   56
overlay         top 0   bottom 800  1280 x 800   <- full viewport (was 1280 x 55)
dialog          top 208 bottom 592  448 x 384   <- centred (was top -107)
close button    top 229 bottom 249               <- inside the viewport (was -86 .. -68)
portal parent   BODY.bg-[#0F172A]…                <- no longer a <header> descendant
focus on open   "Close keyboard shortcuts"        <- focus lands on ✕
close via ✕     dialogCount 0, focus returned to "Keyboard shortcuts"
close via Esc   dialogCount 0
close via scrim dialogCount 0
click inside    dialogCount 1                     <- card clicks do not dismiss
```

Screenshot: `/tmp/opencode/fixed-open.png` — modal centred, title bar and `✕` visible, scrim dimming the whole app.

Not run: the Python suite (`python3 -m unittest discover tests`). No backend code, no API and no test fixture was touched, and several suites shell out to `g++`; running it was judged expensive relative to the change. `frontend/src/components/visualizer/engine/__tests__/visualizers.test.ts` also remains unwired to any runner — that predates this bug.

The probe emitted three pre-existing `pageerror`s (`Failed to resolve module specifier …webWorkerBootstrap.js`) from Monaco's workers when `dist` is served statically without the backend. They are unrelated to this change and appear identically with the modal untouched.

## Deviations from Assessment

1. **Rejected one of the assessment's proposed tests as self-contradictory.** The assessment listed both "clicking the trigger a second time closes" and "with the modal open, `elementFromPoint` over the trigger and over each header action resolves to the action, not the overlay". Those cannot both hold: a correct modal scrim covers the viewport, so the trigger is *supposed* to be blocked while open. The real regression was never that header buttons were blocked — it was that nothing could close the modal. The implemented and verified invariant is the scrim-covers-viewport one, with dismissal via `✕`/`Escape`/backdrop. `toggleShortcuts` was kept (open/close from the trigger is still correct if the trigger is activated programmatically or by keyboard), but it is not reachable by mouse while the scrim is up.
2. **No `Tab` focus trap.** Deliberately omitted: the assessment listed a trap under the Radix alternative, not under the preferred remediation, and hand-rolling one would exceed "keep the change minimal". `aria-modal="true"` plus focus-in/focus-restore cover the reported symptom; the gap is recorded under *Follow-ups*.
3. **`frontend/package.json` gained a `test` script, and `frontend/dist` was regenerated** — neither file was listed under *Files likely to change*. Both are consequences of the assessment's own *Tests to add or update* and *Risks* sections (no runner exists; `dist` is committed and served by the backend), so they are logged here as in-scope expansions rather than silent additions.
4. **The two latent copies were left alone** (`VisualizerContainer.tsx:368`, `PlaybackControls.tsx:141`), as the assessment placed them under *Risks*/*Follow-ups* rather than under the preferred remediation. They render correctly today because no ancestor applies a filter, but neither has Escape or backdrop dismissal.

## Follow-ups

- Fix the two remaining hand-rolled overlays the same way (`VisualizerContainer.tsx:368`, `PlaybackControls.tsx:141`), or extract all three into one shared `ui/dialog.tsx` wrapping the already-present `@radix-ui/react-dialog` so the pattern cannot recur.
- `PlaybackControls.tsx:133-155` is unreachable dead code: `VisualizerContainer.tsx:363` always passes `onOpenHelp`, and the local modal is gated behind `localHelpOpen && !onOpenHelp`.
- Promote `modal-probe.mjs` into a committed browser suite (Playwright or vitest + jsdom) so layout-level assertions (`overlay.height === innerHeight`, `dialog.top >= 0`) are checked automatically instead of by hand; the current guard is source-level only.
- Add a `Tab` focus trap, or switch to Radix `Dialog`, for full modal semantics.
- Wire `frontend/src/components/visualizer/engine/__tests__/visualizers.test.ts` into the `test` script so `npm test` is not misleadingly narrow.
- Consider a repo-level lint rule (or a shared `Dialog` primitive) forbidding `fixed` overlays under elements with `backdrop-blur`/`filter`/`transform` — the root cause is invisible to review because `fixed inset-0` reads as viewport-relative.