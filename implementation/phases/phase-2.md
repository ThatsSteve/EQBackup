# Fase 2 — Layer di astrazione provider IA (backend)

## Agente
backend-ai-dev

## Obiettivo
Qualunque provider IA (locale o cloud) deve poter produrre lo stesso contratto: JSON a 6 intenti
semantici (`sub_bass_intent`…`brilliance_intent`, range -5.0..+5.0). Mai parametri fisici.

## Scope
- `engine/ai/` — adapter OpenAI-compatibile (copre LM Studio/Ollama/OpenAI/Groq/OpenRouter/endpoint
  custom) + adapter Anthropic nativo
- `capabilityProbe.js` — al collegamento di un provider, test con lo schema reale, assegna un tier:
  1 nativo (structured output/function calling), 2 prompt-guidato (validazione + 1 retry con feedback
  errore), 3 inaffidabile (solo chat, generazione EQ ricade su `graphEngine.js`)
- `jsonRepair.js` — retry con feedback per i provider tier 2
- `secretsVault.js` — cifratura profili (interfaccia pronta per storage cifrato locale; se non ancora
  in Electron, fallback dev-only chiaramente segnalato come non sicuro per produzione)
- Endpoint REST: `POST/GET /api/ai/profiles`, `POST /api/ai/profiles/:id/test`,
  `POST /api/ai/profiles/:id/activate`
- Streaming SSE su `/api/chat` (serve alla Fase 6)

## Definition of Done
Stesso identico JSON di output valido ottenuto da almeno due adapter diversi con lo stesso input
semantico; un provider "rotto" di test degrada a tier 3 senza crashare l'app.

## Security checklist
Nessuna chiave in log o in errori restituiti al frontend; testo da fonti web (RAG hardware) sanificato
prima di entrare nel prompt inviato al provider (mitigazione prompt injection).
