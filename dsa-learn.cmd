@echo off
REM DSA Learn CLI Launcher (Windows: cmd.exe and PowerShell)
REM Delegates to run.py so sys.path setup happens in Python, not via a
REM platform-specific PYTHONPATH separator.
setlocal

set "SCRIPT_DIR=%~dp0"

REM Honour %DSA_LEARN_PYTHON% when set, otherwise try py, then python.
if defined DSA_LEARN_PYTHON (
    "%DSA_LEARN_PYTHON%" "%SCRIPT_DIR%run.py" %*
    exit /b %ERRORLEVEL%
)

where py >nul 2>nul
if %ERRORLEVEL%==0 (
    py -3 "%SCRIPT_DIR%run.py" %*
    exit /b %ERRORLEVEL%
)

where python >nul 2>nul
if %ERRORLEVEL%==0 (
    python "%SCRIPT_DIR%run.py" %*
    exit /b %ERRORLEVEL%
)

echo DSA Learn: no Python interpreter found on PATH. 1>&2
echo Install Python 3.10+ from https://www.python.org/downloads/ 1>&2
echo and re-run, or set DSA_LEARN_PYTHON to the interpreter path. 1>&2
exit /b 1