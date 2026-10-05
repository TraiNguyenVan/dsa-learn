# DSA Learn CLI Launcher (Windows PowerShell)
# Delegates to run.py so sys.path setup happens in Python, not via a
# platform-specific PYTHONPATH separator.
#
#   .\dsa-learn.ps1 version
#   $env:DSA_LEARN_PYTHON = 'C:\Python312\python.exe'   # optional override

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runPy = Join-Path $scriptDir 'run.py'

function Invoke-DsaLearn([string]$interpreter, [string[]]$extraArgs) {
    & $interpreter @extraArgs $runPy @args
    exit $LASTEXITCODE
}

if ($env:DSA_LEARN_PYTHON) {
    Invoke-DsaLearn $env:DSA_LEARN_PYTHON @()
}

foreach ($candidate in @('py', 'python', 'python3')) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
        if ($candidate -eq 'py') { Invoke-DsaLearn $candidate @('-3') }
        else { Invoke-DsaLearn $candidate @() }
    }
}

Write-Error 'DSA Learn: no Python interpreter found on PATH. Install Python 3.10+ and re-run, or set DSA_LEARN_PYTHON to the interpreter path.'