$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

$py = "python"
if (Test-Path ".venv\Scripts\python.exe") {
    $py = ".venv\Scripts\python.exe"
} elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe") {
    $py = "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe"
}

& $py scripts/run_demo_scenario.py @args
exit $LASTEXITCODE
