@echo off
REM ===========================================================================
REM  DSA Learn - Windows verification probe
REM
REM  Batches every question this fix left open into one run. Safe: writes only
REM  probe.cpp / probe_out* into the target directory and never modifies the
REM  repository, the learner workspace, or the progress database.
REM
REM  Usage (from anywhere):
REM      dsa-learn\... : copy this file into the repo root, then
REM      windows-probe.bat
REM      windows-probe.bat C:\path\to\dsa-learn
REM ===========================================================================

setlocal enabledelayedexpansion

set "REPO=%~1"
if "%REPO%"=="" set "REPO=%CD%"

echo ===========================================================================
echo  DSA Learn Windows probe
echo  repo: %REPO%
echo ===========================================================================

if not exist "%REPO%\run.py" (
    echo ERROR: run.py not found in "%REPO%".
    echo Pass the repo root as argument 1, e.g. windows-probe.bat C:\src\dsa-learn
    exit /b 1
)

cd /d "%REPO%"

echo.
echo == 1. OS and interpreter discovery =========================================
ver
where python
where python3
where py
where bash
where wsl

echo.
echo == 2. Compilers ============================================================
where g++
where clang++
where cl
g++ --version

echo.
echo == 3. THE .exe QUESTION ====================================================
REM Answer to the open question "does g++ -o <no-ext> emit <name> or <name>.exe>?"
echo int main(){return 0;} > probe.cpp
g++ -std=c++20 probe.cpp -o probe_out
echo dir probe_out*  should show probe_out OR probe_out.exe:
dir probe_out*

echo.
echo == 4. Windows launcher shims (NEVER EXECUTED BEFORE THIS FIX) =============
echo --- dsa-learn.cmd ---
call dsa-learn.cmd version
echo exit code: %ERRORLEVEL%
echo --- dsa-learn.ps1 ---
powershell -NoProfile -ExecutionPolicy Bypass -Command ".\dsa-learn.ps1 version"
echo exit code: %ERRORLEVEL%

echo.
echo == 5. Interpreter-override fallback ========================================
set "DSA_LEARN_PYTHON="
where python >nul 2>nul && set "DSA_LEARN_PYTHON=python"
if defined DSA_LEARN_PYTHON (
    call dsa-learn.cmd version
    echo exit code: %ERRORLEVEL%
)

echo.
echo == 6. Full end-to-end verification =========================================
echo --- compile + run an exercise ---
call dsa-learn.cmd list
call dsa-learn.cmd test two-sum
echo exit code: %ERRORLEVEL%

echo.
echo --- full test suite (never previously run on Windows) ---
python -m unittest discover tests
echo exit code: %ERRORLEVEL%

echo.
echo == 7. Diagnostic parser on real Windows paths ===============================
REM If compile produced errors above, confirm they were parsed rather than
REM silently dropped. Prints the parsed diagnostic count.
python -c "import sys; sys.path.insert(0,'.'); from dsa_learn.runner.compiler import parse_diagnostics as p; s=r'C:\Users\you\exercises\two-sum\solution.cpp:14:5: error: use of undeclared identifier vector'; d=p(s); print('parsed diagnostics:', len(d)); print('line/col:', (d[0].line, d[0].column) if d else 'NONE - REGRESSION')"

del probe.cpp probe_out probe_out.exe >nul 2>nul

echo.
echo ===========================================================================
echo  Probe complete. Report the output above.
echo  Pay attention to:
echo    - section 3: settles the .exe question
echo    - section 4: first-ever execution of the .cmd and .ps1 shims
echo    - section 6: whether the full suite passes on Windows
echo ===========================================================================
endlocal