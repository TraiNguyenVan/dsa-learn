/**
 * Regression guard for the keyboard-shortcuts modal.
 *
 * Bug: the modal used to be rendered inline inside <header>. The header sets
 * `backdrop-filter`, and a non-`none` filter makes an element the containing
 * block for `position: fixed` descendants. So `fixed inset-0` resolved to the
 * 56px header strip instead of the viewport: the card was centred against that
 * strip, its top ~130px landed above y=0, the ✕ close button was unreachable,
 * the overlay swallowed every header action, and with no Escape or backdrop
 * dismissal the only way out was reloading the page.
 *
 * frontend/ has no DOM test runner, so these assertions read the component
 * source instead of rendering it. That is enough to pin the invariants that
 * actually regressed: the overlay must be portalled out of the header, and it
 * must keep a dismissal path. A layout-level check (overlay height ==
 * innerHeight) belongs in a real browser suite — see
 * .specify/bugs/shortcuts-modal-unclosable/fix.md for the Playwright script
 * used to verify it.
 *
 * Run: npm run test:ui
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'Header.tsx'), 'utf8');

function sliceBetween(startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.ok(start !== -1, `Header.tsx must still contain ${JSON.stringify(startNeedle)}`);
  const end = endNeedle === null ? source.length : source.indexOf(endNeedle, start);
  assert.ok(end !== -1, `Header.tsx must still contain ${JSON.stringify(endNeedle)}`);
  return source.slice(start, end);
}

const headerComponent = () => sliceBetween('export function Header', null);
const headerElement = () => sliceBetween('<header', '</header>');
const dialogComponent = () => sliceBetween('function ShortcutsDialog', '\nexport function Header');

function assertMatches(haystack, pattern, message) {
  assert.ok(pattern.test(haystack), `${message} (pattern: ${pattern})`);
}

function assertNoMatch(haystack, pattern, message) {
  assert.ok(!pattern.test(haystack), `${message} (pattern: ${pattern})`);
}

test('shortcuts overlay is portalled to document.body, not mounted inside <header>', () => {
  assertMatches(
    dialogComponent(),
    /createPortal\([\s\S]*document\.body\s*\)/,
    'ShortcutsDialog must render through createPortal(..., document.body)'
  );
  assertNoMatch(
    dialogComponent(),
    /createPortal\([\s\S]*<\/?header/i,
    'the portal must not be mounted into the header element'
  );
});

test('no fixed overlay is mounted directly inside <header>', () => {
  // A `fixed inset-0` node that is a DOM descendant of the header is constrained
  // by the header's backdrop-filter containing block. The only fixed overlay the
  // header may reference is the one created by the portalled component.
  const found = headerElement().match(/fixed inset-0/g) ?? [];
  assert.equal(
    found.length,
    0,
    'Header must not contain an inline `fixed inset-0` overlay; found ' + found.length
  );
});

test('shortcuts overlay is dismissed by Escape', () => {
  const dialog = dialogComponent();
  assertMatches(dialog, /event\.key === 'Escape'/, 'must handle the Escape key');
  assertMatches(dialog, /addEventListener\('keydown'/, 'must listen for keydown');
  assertMatches(dialog, /removeEventListener\('keydown'/, 'must remove the keydown listener on unmount');
});

test('shortcuts overlay is dismissed by clicking the backdrop', () => {
  assertMatches(
    dialogComponent(),
    /event\.target === event\.currentTarget/,
    'backdrop click must close only when the click lands on the backdrop itself'
  );
});

test('shortcuts overlay exposes dialog semantics and a labelled close control', () => {
  const dialog = dialogComponent();
  assertMatches(dialog, /role="dialog"/, 'the card must be a dialog');
  assertMatches(dialog, /aria-modal="true"/, 'the dialog must be modal');
  assertMatches(dialog, /aria-label="Keyboard Shortcuts"/, 'the dialog needs a name');
  assertMatches(dialog, /aria-label="Close keyboard shortcuts"/, 'the ✕ control needs an accessible name');
});

test('focus moves to the close control on open and back to the trigger on close', () => {
  assertMatches(
    dialogComponent(),
    /closeButtonRef\.current\?\.focus\(/,
    'focus must move into the dialog on open'
  );
  assertMatches(
    headerComponent(),
    /shortcutsButtonRef\.current\?\.focus\(/,
    'focus must return to the trigger on close'
  );
});

test('the trigger advertises its expanded state', () => {
  assertMatches(headerComponent(), /aria-haspopup="dialog"/, 'trigger must announce a dialog popup');
  assertMatches(headerComponent(), /aria-expanded=\{showShortcuts\}/, 'trigger must expose aria-expanded');
});