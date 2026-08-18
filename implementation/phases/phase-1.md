# Fase 1 — Stabilizzazione critica

## Agente
backend-ai-dev

## Obiettivo
Rendere end-to-end funzionante la pipeline attuale prima di aggiungere l'astrazione IA (Fase 2),
altrimenti i suoi test non hanno una baseline affidabile.

## Scope
- `aiOrchestrator.js` — fix `ReferenceError: graphResult` (destrutturare anche `foundArtists`)
- Collegare `calculateWeightedArtistProfile` al flusso reale; `graphEngine.js` deve estrarre i
  `recommended_modifiers` dai nodi artista
- `coreCalculator.js` — il preamp anti-clipping deve **combinarsi** col preamp AutoEq, non sovrascriverlo;
  i filtri base AutoEq devono passare dagli stessi guardrails degli "extra"
- Rimuovere `skipLMStudio = true` hardcoded da `server.js` (diventerà scelta esplicita in Fase 2/3)

## Definition of Done
Un test end-to-end (hardware + 2 artisti → filtri generati) produce una curva EQ non vuota e coerente
con i guardrails (gain [-12,+9] dB, Q [0.5,3.5]).

## Security checklist
Nessuna novità di superficie; verificare che il fix non logghi dati hardware/artisti in chiaro oltre
il necessario.
