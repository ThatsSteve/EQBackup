# Fase 3 — Onboarding "Configura la tua IA" (frontend)

## Agente
frontend-redesign-dev

## Obiettivo
Nuovo Step 0 del wizard per scegliere potenza di calcolo e provider IA.

## Scope
- Locale (auto-detect LM Studio `:1234` / Ollama `:11434`, o endpoint manuale) vs Cloud (quick-start
  OpenAI/Anthropic/Gemini/OpenRouter, o endpoint OpenAI-compatibile custom) vs "Nessuna IA" (motore a
  regole esistente, sempre disponibile)
- Test connessione con badge tier (🟢 Ottimale / 🟡 Compatibile / 🔴 Solo chat)
- Multi-profilo: più configurazioni salvabili, cambiabili dalle impostazioni senza rifare l'onboarding

## Definition of Done
Un utente senza alcuna IA configurata completa comunque l'intero wizard (fallback deterministico
sempre percorribile).

## Security checklist
Il campo API key non è mai loggato in console/network tab in chiaro dopo il salvataggio (mascherato in UI).
