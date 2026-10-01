$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

$py = "python"
if (Test-Path ".venv\Scripts\python.exe") {
    $py = ".venv\Scripts\python.exe"
}

& $py -m ruff format apps tests database
exit $LASTEXITCODE
