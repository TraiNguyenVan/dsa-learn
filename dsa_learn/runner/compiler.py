"""GCC C++ Compiler wrapper and diagnostic sanitizer for DSA Learn."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from dsa_learn.config import (
    DEFAULT_COMPILER,
    DEFAULT_COMPILER_FLAGS,
    DSA_TEST_HPP,
    HARNESS_DIR,
    binary_candidates,
    resolve_compiler,
)

# The file group is non-greedy up to the FIRST ":<digits>:<digits>:" triplet so that a
# Windows drive letter ("C:\...\solution.cpp:14:5: error:") does not terminate the match.
DIAGNOSTIC_REGEX = re.compile(
    r"^(?P<file>.+?):(?P<line>\d+):(?P<column>\d+):\s+(?P<severity>error|warning|note):\s+(?P<message>.+)$"
)

# Common C++ educational diagnostic explanations
COMMON_HINTS: list[tuple[re.Pattern, str, str]] = [
    (
        re.compile(r"use of undeclared identifier 'unordered_map'|'unordered_map' was not declared", re.I),
        "'unordered_map' is not recognized. In C++, hash maps require '#include <unordered_map>' and either 'using namespace std;' or the prefix 'std::unordered_map'.",
        "#include <unordered_map>",
    ),
    (
        re.compile(r"use of undeclared identifier 'unordered_set'|'unordered_set' was not declared", re.I),
        "'unordered_set' is not recognized. Did you forget to '#include <unordered_set>' or prefix with 'std::'?",
        "#include <unordered_set>",
    ),
    (
        re.compile(r"use of undeclared identifier 'vector'|'vector' was not declared", re.I),
        "'vector' is not recognized. Did you forget '#include <vector>' or 'std::vector'?",
        "#include <vector>",
    ),
    (
        re.compile(r"use of undeclared identifier 'string'|'string' was not declared", re.I),
        "'string' is not recognized. Did you forget '#include <string>' or 'std::string'?",
        "#include <string>",
    ),
    (
        re.compile(r"use of undeclared identifier 'queue'|'queue' was not declared", re.I),
        "'queue' is not recognized. Did you forget '#include <queue>' or 'std::queue'?",
        "#include <queue>",
    ),
    (
        re.compile(r"use of undeclared identifier 'stack'|'stack' was not declared", re.I),
        "'stack' is not recognized. Did you forget '#include <stack>' or 'std::stack'?",
        "#include <stack>",
    ),
    (
        re.compile(r"use of undeclared identifier 'max'|'max' was not declared|use of undeclared identifier 'min'|'min' was not declared", re.I),
        "'min' or 'max' was not found. Include '<algorithm>' for 'std::min' and 'std::max'.",
        "#include <algorithm>",
    ),
    (
        re.compile(r"use of undeclared identifier 'INT_MAX'|'INT_MAX' was not declared|'INT_MIN' was not declared", re.I),
        "'INT_MAX' / 'INT_MIN' was not found. Include '<climits>' for integer limit constants.",
        "#include <climits>",
    ),
    (
        re.compile(r"control reaches end of non-void function", re.I),
        "This function is expected to return a value, but execution can reach the end without a 'return' statement.",
        "Ensure all conditional branches return a valid value.",
    ),
    (
        re.compile(r"reference to local variable .+ returned", re.I),
        "Returning a reference or pointer to a stack-allocated local variable causes undefined behavior because the memory is freed when the function exits.",
        "Return by value instead of by reference, or allocate memory on the heap.",
    ),
    (
        re.compile(r"cannot convert '.*' to '.*'", re.I),
        "Type mismatch: the expression cannot be converted to the required type.",
        "Check variable types and return types for compatibility.",
    ),
    (
        re.compile(r"no matching function for call to", re.I),
        "Function arguments do not match any available function overload or constructor signature.",
        "Check parameter types and argument order.",
    ),
]


@dataclass
class CompilerDiagnostic:
    file: str
    line: int
    column: int
    severity: str
    raw_message: str
    explanation: str
    suggestion: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class CompilerResult:
    success: bool
    binary_path: Path | None
    diagnostics: list[CompilerDiagnostic]
    raw_output: str
    duration_ms: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": self.success,
            "binary_path": str(self.binary_path) if self.binary_path else None,
            "diagnostics": [d.to_dict() for d in self.diagnostics],
            "raw_output": self.raw_output,
            "duration_ms": self.duration_ms,
        }


def resolve_output_binary(output_binary: Path, platform: str | None = None) -> Path | None:
    """Return the compiled binary actually written to disk, tolerating a platform suffix.

    ``g++ -o build/run_x`` writes ``build/run_x`` on POSIX but ``build/run_x.exe`` on
    Windows. Probing every candidate keeps callers correct on both without hardcoding
    an assumption about which toolchain appends the suffix.
    """
    for name in binary_candidates(output_binary.stem, platform):
        candidate = output_binary.with_name(name)
        if candidate.exists():
            return candidate
    return None


def parse_diagnostics(compiler_output: str, solution_file: Path | None = None) -> list[CompilerDiagnostic]:
    """Parse raw GCC diagnostics output into structured, actionable items."""
    diagnostics: list[CompilerDiagnostic] = []
    lines = compiler_output.splitlines()

    for line in lines:
        match = DIAGNOSTIC_REGEX.match(line.strip())
        if match:
            file_str = match.group("file")
            line_no = int(match.group("line"))
            col_no = int(match.group("column"))
            severity = match.group("severity")
            msg = match.group("message")

            explanation = msg
            suggestion = ""
            for pattern, hint_expl, hint_sugg in COMMON_HINTS:
                if pattern.search(msg):
                    explanation = hint_expl
                    suggestion = hint_sugg
                    break

            diagnostics.append(
                CompilerDiagnostic(
                    file=file_str,
                    line=line_no,
                    column=col_no,
                    severity=severity,
                    raw_message=msg,
                    explanation=explanation,
                    suggestion=suggestion,
                )
            )

    return diagnostics


def compile_exercise(
    solution_file: Path,
    test_file: Path,
    output_binary: Path,
    compiler: str | None = None,
    extra_flags: list[str] | None = None,
) -> CompilerResult:
    """Compile learner solution and test suite together into an executable."""
    compiler_bin = compiler or resolve_compiler() or DEFAULT_COMPILER
    output_binary.parent.mkdir(parents=True, exist_ok=True)

    # Check if compiler exists
    if not shutil.which(compiler_bin):
        err_msg = (
            f"Compiler '{compiler_bin}' was not found on your system.\n"
            "Prerequisite: Please install a modern C++ compiler supporting C++20:\n"
            "  - Ubuntu/Debian: sudo apt update && sudo apt install -y g++ build-essential\n"
            "  - Fedora: sudo dnf install -y gcc-c++\n"
            "  - Alpine: apk add g++\n"
            "  - macOS: xcode-select --install\n"
            "  - Windows: Install MinGW-w64 (e.g. via MSYS2). MSVC's cl.exe is not\n"
            "    supported: the build uses GCC/Clang flags such as -std=c++20."
        )
        return CompilerResult(
            success=False,
            binary_path=None,
            diagnostics=[
                CompilerDiagnostic(
                    file=str(solution_file),
                    line=1,
                    column=1,
                    severity="error",
                    raw_message=f"Compiler '{compiler_bin}' not found.",
                    explanation=err_msg,
                    suggestion="Install modern C++ compiler (g++ >= 11)",
                )
            ],
            raw_output=err_msg,
            duration_ms=0,
        )

    # Prepare staged test runner pointing to the exact solution file
    staged_runner = output_binary.parent / f"_runner_{output_binary.stem}.cpp"
    test_content = test_file.read_text(encoding="utf-8")
    sol_posix = solution_file.resolve().as_posix()
    staged_content = test_content.replace(
        '#include "solution.cpp"',
        f'#include "{sol_posix}"',
    )
    staged_runner.write_text(staged_content, encoding="utf-8")

    cmd = [
        compiler_bin,
        *DEFAULT_COMPILER_FLAGS,
        *(extra_flags or []),
        f"-I{HARNESS_DIR}",
        f"-I{solution_file.parent.resolve()}",
        str(staged_runner),
        "-o",
        str(output_binary),
    ]

    start_time = time.perf_counter()
    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=15,  # 15s build timeout limit
        )
        duration_ms = int((time.perf_counter() - start_time) * 1000)
        raw_output = (proc.stdout + "\n" + proc.stderr).strip()

        diagnostics = parse_diagnostics(raw_output, solution_file)

        # GCC/Clang may append a platform suffix (.exe on Windows) to -o. Probe for
        # whichever spelling was actually produced rather than assuming one.
        resolved_binary = resolve_output_binary(output_binary)
        success = proc.returncode == 0 and resolved_binary is not None

        return CompilerResult(
            success=success,
            binary_path=resolved_binary,
            diagnostics=diagnostics,
            raw_output=raw_output,
            duration_ms=duration_ms,
        )
    except subprocess.TimeoutExpired:
        duration_ms = int((time.perf_counter() - start_time) * 1000)
        return CompilerResult(
            success=False,
            binary_path=None,
            diagnostics=[
                CompilerDiagnostic(
                    file=str(solution_file),
                    line=1,
                    column=1,
                    severity="error",
                    raw_message="Compilation timed out after 15 seconds.",
                    explanation="The compiler exceeded the maximum allowable compilation time.",
                )
            ],
            raw_output="Compilation timed out.",
            duration_ms=duration_ms,
        )
    except Exception as exc:
        duration_ms = int((time.perf_counter() - start_time) * 1000)
        return CompilerResult(
            success=False,
            binary_path=None,
            diagnostics=[
                CompilerDiagnostic(
                    file=str(solution_file),
                    line=1,
                    column=1,
                    severity="error",
                    raw_message=str(exc),
                    explanation="An unexpected error occurred while invoking the compiler.",
                )
            ],
            raw_output=str(exc),
            duration_ms=duration_ms,
        )


def compile_debug_binary(
    solution_file: Path,
    test_file: Path,
    output_binary: Path,
    compiler: str | None = None,
) -> CompilerResult:
    """Compile with debug symbols (-g -O0) for interactive GDB/CodeLLDB sessions."""
    from dsa_learn.config import DEBUG_COMPILER_FLAGS
    return compile_exercise(
        solution_file=solution_file,
        test_file=test_file,
        output_binary=output_binary,
        compiler=compiler,
        extra_flags=DEBUG_COMPILER_FLAGS,
    )


def compile_and_run_direct(
    exercise_id: str,
    custom_stdin: str = "",
    timeout_ms: int = 3000,
) -> dict[str, Any]:
    """Compile exercise and directly execute the binary with stdin and timeout."""
    from dsa_learn.config import BUILD_DIR, WORKSPACE_ROOT
    from dsa_learn.runner.executor import find_exercise

    ex = find_exercise(exercise_id)
    sol_file = WORKSPACE_ROOT / ex["starter_relpath"]
    test_file = WORKSPACE_ROOT / ex["test_relpath"]
    out_bin = BUILD_DIR / f"run_{ex['slug']}"

    comp_res = compile_exercise(sol_file, test_file, out_bin)
    if not comp_res.success or not comp_res.binary_path:
        return {
            "status": "COMPILATION_ERROR",
            "compiler_output": comp_res.raw_output,
            "program_output": "",
            "exit_code": 1,
            "duration_ms": comp_res.duration_ms,
        }

    start_exec = time.perf_counter()
    timeout_sec = max(timeout_ms / 1000.0, 0.5)

    try:
        run_proc = subprocess.run(
            [str(comp_res.binary_path)],
            input=custom_stdin,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout_sec,
        )
        duration_ms = int((time.perf_counter() - start_exec) * 1000)
        status = "SUCCESS" if run_proc.returncode == 0 else "RUNTIME_ERROR"
        prog_output = run_proc.stdout + ("\n" + run_proc.stderr if run_proc.stderr else "")

        return {
            "status": status,
            "compiler_output": comp_res.raw_output,
            "program_output": prog_output.strip(),
            "exit_code": run_proc.returncode,
            "duration_ms": duration_ms,
        }
    except subprocess.TimeoutExpired:
        duration_ms = int((time.perf_counter() - start_exec) * 1000)
        return {
            "status": "TIMEOUT",
            "compiler_output": comp_res.raw_output,
            "program_output": f"Execution timed out after {timeout_ms}ms.",
            "exit_code": None,
            "duration_ms": duration_ms,
        }
    except Exception as exc:
        duration_ms = int((time.perf_counter() - start_exec) * 1000)
        return {
            "status": "RUNTIME_ERROR",
            "compiler_output": comp_res.raw_output,
            "program_output": str(exc),
            "exit_code": 1,
            "duration_ms": duration_ms,
        }

