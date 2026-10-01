$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

$py = "python"
if (Test-Path ".venv\Scripts\python.exe") {
    $py = ".venv\Scripts\python.exe"
}

& $py -m alembic -c apps/backend/alembic.ini upgrade head
exit $LASTEXITCODE
