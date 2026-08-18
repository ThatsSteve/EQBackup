# Fase 5 — Redesign wizard + player A/B

## Agente
frontend-redesign-dev

## Scope
- Applicazione del design system a tutti gli step
- Fix bug noti del player: `biquadNodesRef` mai popolato in modalità parametrica, doppio volume
  (`audioEl.volume` + `masterGain`), RAF loop senza cleanup a fine brano
- Grafici Recharts con vista tabellare alternativa accessibile

## Definition of Done
Slider parametrici modificano l'audio in tempo reale; nessun leak di CPU rilevabile dopo 5 minuti di
riproduzione continua.
