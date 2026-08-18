# Fase 0 — Governance & tooling

## Agente
architect-orchestrator (setup) → backend-ai-dev (tooling)

## Obiettivo
Infrastruttura minima prima di toccare funzionalità.

## Scope
- Introdurre un framework di test reale: Vitest (frontend) + Vitest/Supertest (backend); rimuovere
  `test-api.js` e `test_phase2.js` se ancora presenti e rotti/duplicati rispetto alla nuova `test/`
- Hook pre-commit di secret-scanning (es. gitleaks) + `npm audit` richiamabile in CI
- `.env.example` allineato alle variabili reali; `.gitignore` deve coprire `ai-profiles.enc`, `*.env`,
  eventuali file con dati utente in `knowledge_graph.json`
- Correggere `package.json`: rimuovere `"main": "index.js"` se il file non esiste (o crearlo), allineare
  il campo `license` a quanto dichiarato nel README

## Definition of Done
- `npm test` gira senza errori di configurazione (anche a copertura bassa, ma la pipeline funziona)
- Un secret di prova nel diff viene bloccato dall'hook pre-commit
- `package.json` internamente coerente (nessun campo che punta a file inesistenti, licenza allineata al README)

## Security checklist
Nessuna novità di superficie: è il gate stesso che nasce qui.
