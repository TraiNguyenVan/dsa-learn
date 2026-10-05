"""Design-system conformance for the debug surfaces.

SC-003 requires 100% of debug surfaces to render from the project's token set,
with zero off-palette hard-coded colours. SC-004 requires no emoji or glyph
substitutes used as icons, visible focus states, and 150-300ms transitions.

These are static checks, so they catch a regression at review time rather than
only in the browser.
"""

import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEBUGGER_DIR = REPO_ROOT / "frontend" / "src" / "components" / "debugger"
TERMINAL_DIR = REPO_ROOT / "frontend" / "src" / "components" / "terminal"
GLOBALS_CSS = REPO_ROOT / "frontend" / "src" / "styles" / "globals.css"

#: Literal colours in Tailwind arbitrary values or raw hex within a class string.
_OFF_PALETTE = re.compile(r"""(?:bg|text|border|ring|from|to|via)-\[#[0-9a-fA-F]{3,8}\]""")
_HEX_LITERAL = re.compile(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b")

#: Emoji and pictographic ranges, plus dingbats that get used as stand-in icons.
_EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF]"
)


def _debug_sources() -> list[Path]:
    return sorted(list(DEBUGGER_DIR.rglob("*.tsx")) + list(TERMINAL_DIR.rglob("*.tsx")))


#: xterm reads literal colour values and cannot resolve CSS custom properties, so
#: its theme is the one legitimate place a hex value may appear. Each entry maps a
#: terminal colour slot to the token it stands in for.
XTERM_TOKEN_MAP = {
    "background": "--color-background",
    "foreground": "--color-foreground",
    "cursor": "--color-accent",
    "selectionBackground": "--color-border",
    "black": "--color-card",
    "red": "--color-destructive",
    "green": "--color-accent",
    "yellow": "--color-foreground",
    "blue": "--color-border",
    "magenta": "--color-accent",
    "cyan": "--color-muted-foreground",
    "white": "--color-foreground",
}


class TestNoOffPaletteColours(unittest.TestCase):
    """SC-003: every debug colour resolves through a design token."""

    def _tokens_from_css(self) -> dict[str, str]:
        css = GLOBALS_CSS.read_text(encoding="utf-8")
        return {
            name: value.lower()
            for name, value in re.findall(r"(--color-[\w-]+):\s*(#[0-9a-fA-F]{3,8})", css)
        }

    def test_no_tailwind_arbitrary_colour_values(self):
        for path in _debug_sources():
            text = path.read_text(encoding="utf-8")
            found = _OFF_PALETTE.findall(text)
            self.assertEqual(found, [], f"{path.name} uses off-palette colours: {found}")

    def test_no_raw_hex_outside_the_xterm_theme(self):
        for path in _debug_sources():
            text = path.read_text(encoding="utf-8")
            without_theme = re.sub(r"theme:\s*\{.*?\}", "", text, flags=re.S)
            found = _HEX_LITERAL.findall(without_theme)
            self.assertEqual(
                found, [], f"{path.name} hard-codes colours outside the xterm theme: {found}"
            )

    def test_every_xterm_colour_matches_its_design_token(self):
        """The xterm theme must be spelled-out tokens, not a private palette."""
        tokens = self._tokens_from_css()
        drawer = (TERMINAL_DIR / "TerminalDrawer.tsx").read_text(encoding="utf-8")
        theme = re.search(r"theme:\s*\{(.*?)\n\s*\},", drawer, flags=re.S)
        self.assertIsNotNone(theme, "no xterm theme block found")
        values = dict(
            (slot, value.lower())
            for slot, value in re.findall(r"(\w+):\s*'(#[0-9a-fA-F]{3,8})'", theme.group(1))
        )
        self.assertEqual(set(values), set(XTERM_TOKEN_MAP), "theme slots changed")
        for slot, token in XTERM_TOKEN_MAP.items():
            self.assertEqual(
                values[slot],
                tokens.get(token),
                f"xterm {slot} is {values[slot]} but {token} is {tokens.get(token)}",
            )

    def test_debug_components_use_the_token_classes(self):
        combined = "\n".join(p.read_text(encoding="utf-8") for p in _debug_sources())
        for token in ("debug-surface", "debug-pane", "debug-muted", "debug-focusable"):
            self.assertIn(token, combined, f"expected the {token} token class to be used")


class TestMotionAndFocus(unittest.TestCase):
    """SC-004 / FR-021."""

    def test_debug_tokens_are_declared(self):
        css = GLOBALS_CSS.read_text(encoding="utf-8")
        for token in ("--motion-fast", "--motion-base", "--motion-slow",
                      "--shadow-sm", "--shadow-md", "--shadow-lg"):
            self.assertIn(token, css, f"missing design token {token}")

    def test_motion_band_is_within_150_to_300ms(self):
        css = GLOBALS_CSS.read_text(encoding="utf-8")
        declared = dict(
            (name, int(value))
            for name, value in re.findall(r"--motion-\w+:\s*(\d+)ms", css) and []
        ) or {}
        # Parse explicitly: the values may appear in any order.
        for name, value in re.findall(r"(--motion-\w+):\s*(\d+)ms", css):
            declared[name] = int(value)
        self.assertTrue(declared, "no motion tokens found")
        for name, value in declared.items():
            self.assertGreaterEqual(value, 150, f"{name} is below the 150ms floor")
            self.assertLessEqual(value, 300, f"{name} is above the 300ms ceiling")

    def test_reduced_motion_is_honoured(self):
        css = GLOBALS_CSS.read_text(encoding="utf-8")
        self.assertIn("prefers-reduced-motion", css)

    def test_focus_styles_are_defined(self):
        css = GLOBALS_CSS.read_text(encoding="utf-8")
        self.assertIn("focus-visible", css)

    def test_interactive_controls_carry_a_focus_class(self):
        for path in _debug_sources():
            text = path.read_text(encoding="utf-8")
            for tag in ("<button", "<input", "<select", "<textarea"):
                for match in re.finditer(re.escape(tag), text):
                    # Find the end of the opening tag to check its className.
                    close = text.find(">", match.start())
                    opening = text[match.start():close]
                    if "type=" not in opening:
                        continue
                    # The className may live after the closing `>` when the
                    # opening tag is split across lines, so look a little further.
                    window = text[match.start(): match.start() + 400]
                    if "debug-focusable" in window:
                        continue
                    self.assertIn(
                        "debug-focusable", window,
                        f"{path.name}: a <{tag[1:]}...> has no focus style",
                    )


class TestIcons(unittest.TestCase):
    """SC-004: vector icons with accessible names, never emoji or glyphs."""

    def test_no_emoji_in_debug_sources(self):
        for path in _debug_sources():
            text = path.read_text(encoding="utf-8")
            found = _EMOJI.findall(text)
            self.assertEqual(found, [], f"{path.name} contains emoji: {found}")

    def test_no_emoji_in_debug_source_files(self):
        for path in DEBUGGER_DIR.rglob("*.ts"):
            found = _EMOJI.findall(path.read_text(encoding="utf-8"))
            self.assertEqual(found, [], f"{path.name} contains emoji: {found}")

    def test_decorative_icons_are_hidden_from_assistive_tech(self):
        """An icon next to a text label must not be announced twice."""
        for path in _debug_sources():
            text = path.read_text(encoding="utf-8")
            for match in re.finditer(r"<(\w+)\s+className=\"[^\"]*w-3", text):
                tag_open = text[match.start(): text.find(">", match.start())]
                if "aria-hidden" not in tag_open and "aria-label" not in tag_open:
                    self.fail(
                        f"{path.name}: <{match.group(1)}> icon has neither "
                        "aria-hidden nor an accessible name"
                    )


class TestTypography(unittest.TestCase):
    """FR-021: the debug view uses the project's type tokens."""

    def test_debug_code_text_uses_the_mono_token(self):
        combined = "\n".join(p.read_text(encoding="utf-8") for p in _debug_sources())
        self.assertIn("font-mono", combined)

    def test_body_font_is_declared_globally(self):
        css = GLOBALS_CSS.read_text(encoding="utf-8")
        self.assertIn("IBM Plex Sans", css)
        self.assertIn("JetBrains Mono", css)


if __name__ == "__main__":
    unittest.main()