# Fase 4 — Design system & rifattorizzazione frontend

## Agente
frontend-redesign-dev

## Obiettivo
Fondamenta del redesign: token, struttura componenti, base comune mobile/desktop.

## Scope
- Token di design centralizzati (colore, tipografia, spaziatura, breakpoint)
- Scomposizione di `App.jsx` (2.673 righe) in `WizardShell`, step separati, `contexts/EqStateContext`,
  hook dedicati (`useEqCalculation`, `useLiveSync`)
- Layout responsive mobile/desktop dalla stessa base di componenti (no due codebase parallele)

## Definition of Done
Nessun file di componente sopra ~300 righe senza motivo annotato; stesso comportamento funzionale
pre/post refactor (regressione zero contro la Fase 1).
