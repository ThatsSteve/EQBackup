# Fase 7 — Hardening finale & preparazione alla pubblicazione

## Agente
verifier guida, backend-ai-dev/frontend-redesign-dev eseguono i fix

## Scope
- Error handler JSON globale, try/catch su `/api/resolve-artist`, CORS ristretto, rate-limit sugli
  endpoint che chiamano servizi terzi
- User-Agent reale per MusicBrainz (rischio ban con placeholder)
- Marcare esplicitamente come `estimated: true` i dati hardware stimati da euristiche; rimuovere i
  deficit fittizi salvati come se fossero reali
- Allineare il README ai numeri reali e rimuovere feature dichiarate ma non implementate
- Audit finale dipendenze (`npm audit`), licenze di terze parti, scansione segreti a tappeto prima del
  push pubblico

## Definition of Done
`verifier` produce PASS su un audit esteso senza eccezioni aperte.
