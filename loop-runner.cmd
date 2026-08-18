@echo off
setlocal enabledelayedexpansion
cd /d C:\Users\yscuo\Desktop\EQ
set "OPENCODE=C:\Users\yscuo\AppData\Roaming\npm\opencode.cmd"
:loop
echo [%date% %time%] starting orchestrator run >> C:\Users\yscuo\Desktop\EQ\run-orchestrator-loop.log
%OPENCODE% run --agent architect-orchestrator "Leggi implementation/IMPLEMENTATION_PLAN.md e implementation/plan_state.json, individua la fase corrente ed esegui il ciclo operativo descritto alla sezione 4 del piano fino a un gate PASS o a un blocco che richiede la mia decisione. Procedi fase dopo fase, senza fermarti tra una fase e la successiva." >> C:\Users\yscuo\Desktop\EQ\run-orchestrator.log 2>&1 < NUL
echo [%date% %time%] run exited with code %ERRORLEVEL% >> C:\Users\yscuo\Desktop\EQ\run-orchestrator-loop.log
timeout /t 30 /nobreak > NUL
goto loop