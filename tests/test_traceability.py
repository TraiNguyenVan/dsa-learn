"""Success-criterion traceability (spec 006, T133).

Every success criterion in spec.md must be committed to something checkable — a
validation gate, a quickstart scenario, or an explicitly recorded reviewer
walkthrough. A criterion that maps to none of those is a criterion nobody is
holding the work to, so this asserts the mapping exists and names real gates.

This does not assert the criterion *passes*; that is what the gates do. It asserts
the criterion is reachable from a check, which is the weaker and more useful
property: it catches an unmapped criterion rather than a broken one.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

SPEC_DIR = Path(__file__).resolve().parent.parent / "specs" / "006-add-dsa-learning-materials"
SPEC = SPEC_DIR / "spec.md"
QUICKSTART = SPEC_DIR / "quickstart.md"
CONTRACT = SPEC_DIR / "contracts" / "curriculum-content-contract.md"

# Criteria whose enforcement is a reviewer walkthrough rather than an automated
# gate, with the reason recorded so the exemption is visible rather than implicit.
WALKTHROUGH_CRITERIA = {
    "SC-027": "constitution quality gates — a human reviewing the diff against the five principles",
}


def criteria() -> list[str]:
    return sorted(set(re.findall(r"\bSC-\d{3}\b", SPEC.read_text(encoding="utf-8"))))


def traceability_rows() -> dict[str, str]:
    text = QUICKSTART.read_text(encoding="utf-8")
    rows: dict[str, str] = {}
    for line in text.splitlines():
        m = re.match(r"\|\s*(SC-\d{3})\b[^|]*\|(.+?)\s*\|\s*$", line)
        if m:
            rows[m.group(1)] = m.group(2).strip()
    return rows


def scenarios() -> set[str]:
    return set(re.findall(r"^## (S\d)\.", QUICKSTART.read_text(encoding="utf-8"), re.M))


def gates() -> set[str]:
    return set(re.findall(r"\b(G-\d{2})\b", CONTRACT.read_text(encoding="utf-8")))


class TestTraceability(unittest.TestCase):
    def test_every_criterion_has_a_traceability_row(self):
        rows = traceability_rows()
        unmapped = [c for c in criteria() if c not in rows]
        self.assertEqual([], unmapped, f"criteria with no traceability row: {unmapped}")

    def test_no_traceability_row_names_an_unknown_criterion(self):
        rows = traceability_rows()
        known = set(criteria())
        extra = [c for c in rows if c not in known]
        self.assertEqual([], extra, f"traceability rows for non-existent criteria: {extra}")

    def test_every_row_names_a_real_scenario_or_gate(self):
        rows = traceability_rows()
        known_s = scenarios()
        known_g = gates()
        offenders = []
        for criterion, target in rows.items():
            refs = set(re.findall(r"\b(S\d|G-\d{2})\b", target))
            if not refs:
                offenders.append(f"{criterion}: '{target}' names no scenario or gate")
                continue
            unknown = refs - known_s - known_g
            if unknown:
                offenders.append(f"{criterion}: references unknown {sorted(unknown)}")
        self.assertEqual([], offenders, "\n".join(offenders))

    def test_walkthrough_only_criteria_are_documented(self):
        rows = traceability_rows()
        for criterion in WALKTHROUGH_CRITERIA:
            self.assertIn(criterion, rows, f"{criterion} is exempt but unmapped")
            self.assertIn(
                "walkthrough",
                rows[criterion].lower(),
                f"{criterion} is an exempt walkthrough criterion but its row does not say so",
            )

    def test_every_scenario_is_reachable_from_the_docs(self):
        known = scenarios()
        self.assertTrue(known, "quickstart.md declares no scenarios")
        text = QUICKSTART.read_text(encoding="utf-8")
        for scenario in sorted(known):
            self.assertGreater(
                text.count(scenario),
                1,
                f"{scenario} is declared but never referenced elsewhere in quickstart.md",
            )


class TestSpecAndQuickstartAgree(unittest.TestCase):
    def test_quickstart_names_the_backend_test_invocation(self):
        """pytest is not installed here; a validation guide that tells the reader to
        run it wastes their time on a command that cannot work."""
        text = QUICKSTART.read_text(encoding="utf-8")
        self.assertNotIn(
            "python3 -m pytest",
            text,
            "quickstart.md still tells the reader to run pytest, which is not installed",
        )
        self.assertIn("python3 -m unittest", text, "quickstart.md omits the unittest invocation")

    def test_spec_declares_the_expected_number_of_criteria(self):
        self.assertGreaterEqual(len(criteria()), 27, "spec.md declares fewer than 27 criteria")


if __name__ == "__main__":  # pragma: no cover
    unittest.main(verbosity=2)