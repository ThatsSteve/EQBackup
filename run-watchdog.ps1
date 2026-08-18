param()
$ErrorActionPreference = "Continue"
$root = "C:\Users\yscuo\Desktop\EQ"
Set-Location $root

$log = Join-Path $root "run-orchestrator-loop.log"
Add-Content -Path $log -Value ("[{0}] watchdog check" -f (Get-Date))

$running = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -match "node|bun" -and $_.CommandLine -match "architect-orchestrator"
}
if ($running) {
    Add-Content -Path $log -Value ("[{0}] orchestrator already running, skip" -f (Get-Date))
    exit 0
}

Add-Content -Path $log -Value ("[{0}] starting orchestrator run" -f (Get-Date))
& "$env:APPDATA\npm\opencode.cmd" run --agent architect-orchestrator "Leggi implementation/IMPLEMENTATION_PLAN.md e implementation/plan_state.json, individua la fase corrente ed esegui il ciclo operativo descritto alla sezione 4 del piano fino a un gate PASS o a un blocco che richiede la mia decisione. Procedi fase dopo fase, senza fermarti tra una fase e la successiva." *>> (Join-Path $root "run-orchestrator.log")
Add-Content -Path $log -Value ("[{0}] run exited code {1}" -f (Get-Date), $LASTEXITCODE)
exit 0