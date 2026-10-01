$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

$py = "python"
if (Test-Path ".venv\Scripts\python.exe") {
    $py = ".venv\Scripts\python.exe"
}

& $py -m ruff check apps tests database
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $py -m ruff format --check apps tests database
exit $LASTEXITCODE
