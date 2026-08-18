# RESUME — Personal EQ: contesto generale e istruzioni per riprendere

> Data snapshot: 2026-08-18 · Stato: **Fasi 0-6 DONE (gate verifier PASS)** · Fase corrente: **7 (ready)**
> Questo documento vive in `Resume/RESUME.md` ed è la prima cosa da leggere per riprendere il lavoro.

---

## 1. Contesto generale del progetto

**Personal EQ** è un'app desktop Windows (dev: `node`/Express + Vite/React) che genera curve
di equalizzazione parametrica per cuffie/DAC/AMP, con motore DSP deterministico (`engine/`)
e un layer IA "bring-your-own-AI" (`engine/ai/`): l'utente collega qualunque provider
(LM Studio/Ollama locali, OpenAI/Anthropic/Gemini/OpenRouter cloud) e l'app usa la IA
per i 6 intenti timbrici, con fallback deterministico sempre attivo.

- **Backend**: Express, bind su `127.0.0.1:3001` (`server.js`, NON modificare senza scope esplicito).
- **Frontend**: Vite + React 19, cartella `frontend/`; unico host di rete = `http://localhost:3001`
  (centralizzato in `frontend/src/api/client.js`: `API_BASE`, `apiGet`, `apiPost`).
- **DSP**: `engine/dspEngine/coreCalculator.js`, `engine/graphEngine.js`, `engine/aiOrchestrator.js`.
- **Piano**: `implementation/IMPLEMENTATION_PLAN.md` (riferimento archivistico) + `implementation/plan_state.json`
  (stato macchina) + `implementation/phases/phase-N.md` (spec autosufficienti, una per fase) +
  `implementation/reports/phase-N-verify.md` (unico report gate).
- **Agenti OpenCode**: definiti in `.opencode/agents/` (4: `architect-orchestrator` primary + subagent
  `backend-ai-dev`, `frontend-redesign-dev`, `verifier`; `opencode.json` assegna i modelli).
- **Guida di riferimento**: `Resume/00_LEGGI_PRIMA.md` (spiega l'architettura v2 e cosa migrare).

---

## 2. Stato delle fasi (plan_state.json)

| Fase | Titolo | Stato | Verifier |
|---|---|---|---|
| 0 | Governance & tooling | done | PASS |
| 1 | Stabilizzazione critica (backend) | done | PASS |
| 2 | Layer astrazione provider IA (backend) | done | PASS |
| 3 | Onboarding "Configura la tua IA" (frontend) | done | PASS |
| 4 | Design system & rifattorizzazione frontend | done | PASS |
| 5 | Redesign wizard + player A/B | done | PASS |
| 6 | Chat IA persistente e seamless | **done** | **PASS** |
| 7 | Hardening finale & pre-pubblicazione | **ready** | — |

`current_phase = 7`. Prossima azione = eseguire la **Fase 7**.

---

## 3. Cosa è la Fase 4 e com'è finita (riassunto per continuità)

`App.jsx` è passato da monolite **2.673 righe → shell di 166 righe**:

- `frontend/src/App.jsx` — shell: `EqStateProvider` + `useEqState()`, gate IA Fase 3
  (`aiOnboardingDone` da localStorage `PEQ_AI_ONBOARDING_DONE`, `aiSettingsOpen`), fetch
  `/api/engine-status` e `/api/ai/profiles` (auto-completa se esiste profilo attivo),
  stato `showError`/`maxStepReached`/`uploadedAudioTrack`/`isMobileChatOpen`/`copied`,
  `wizardContentRef`, FAB mobile-chat-fab, layout `canvas-bg` + `Scene3D` + `main-wizard-wrapper`.
- `frontend/src/components/WizardShell.jsx` — header (pulsante "⚙️ Impostazioni IA" +
  select presets), `wizard-content` con AnimatePresence e 5 step, footer timeline
  (classi current/completed/unlocked/locked, `SET_STEP`), `handleNextStep` (validazione
  step 1: `showError` se nessuna cuffia; step 2: `mapGenresToDefaults`).
- `frontend/src/components/steps/` — StepWelcome (39), StepHardware (181),
  HardwareDacAmpSelector (137), StepMusic (198), StepTuning (295), StepEqFinal (132),
  FineTuningPanel (128), EqFiltersTable (46), FaqSection (43), ExportActions (66).
- `frontend/src/components/onboarding-ai/` — OnboardingAiStep orchestratore (223) +
  ChoiceView (67) / LocalView (56) / CloudView (59) / ProfileForm (112) /
  SavedProfileCard (48) / ManageView (75) / shared.jsx (58).
- `frontend/src/hooks/` — useEqCalculation, useEqRefinement, useHardwareDiscovery,
  useLiveSync, usePresets, useMediaQuery, useArtistResolver (tutti cablati in App.jsx).
- `frontend/src/contexts/` — EqStateContext.jsx (`useEqState()` → `{state, dispatch}`) +
  eqReducer.js (puro, 7 action).
- `frontend/src/design-tokens/` — tokens.js/css (10 nomi legacy `:root` preservati come
  alias; breakpoints 640/768/1024), importato da `index.css`.
- `frontend/src/components/AIPersona.jsx` (237) — chat concierge, `apiPost('/api/chat',
  {message, chatHistory, aiPayload, destination})`; nascosta su step 0.

**Verifica finale Fase 4**: `npm test` (root) = **65 backend + 126 frontend verdi**;
`npm run build` (frontend) OK; `npm run lint` 0 errori (warning non bloccanti residui in
file pre-esistenti: AudioPlayerAB, SearchableCombobox, EqStateContext, ecc.);
grep segreti 0 match; fetch solo `localhost:3001`; `AudioPlayerAB.jsx`,
`SearchableCombobox.jsx`, `App.css`, `aiConfig.js`, `smoke.test.js`, `server.js`,
`engine/**`, `test/*.test.js` **non modificati** dalla Fase 4.

---

## 3bis. Cosa è la Fase 5 e com'è finita (riassunto per continuità)

- **`AudioPlayerAB.jsx` (3 bug storici risolti)**:
  1. `biquadNodesRef` ora popolato: la catena parametrica viene costruita da
     `liveParametricFilters` (`buildParametricChain`, nodi `peaking/lowshelf/highshelf`)
     e instradata tramite un `inputNode` unico (`routeActiveChain`) — gli slider modificano
     l'audio in tempo reale;
  2. doppio volume eliminato: solo `masterGain` controlla il volume (`audioEl.volume` rimosso);
  3. RAF loop senza leak a fine brano: nuovo `stopPlayback()` (clearInterval +
     cancelAnimationFrame + `bandLevels` azzerati) collegato a `onEnded` e a pausa.
- **Design system applicato a tutti gli step**: 9 file in `frontend/src/components/steps/`
  passati dai colori hex hardcoded ai token (`var(--color-*)`: accent, semantic, timbre, text);
  gli stroke SVG di Recharts restano hex (le `var()` non valgono negli attributi SVG).
- **`frontend/src/components/charts/EqCurveTable.jsx` (nuovo, 105 righe)**: vista tabellare
  accessibile alternativa ai grafici Recharts in StepTuning e StepEqFinal (toggle nativo con
  `aria-pressed`, `<table>` con caption + `scope="col"/"row"`, valori formattati dB/kHz).
- **Verifica**: 65 backend + 126 frontend verdi, build Vite OK, lint 0 errori, grep segreti
  pulito, gate `verifier` PASS (`implementation/reports/phase-5-verify.md`).
- **Nota di processo**: il primo tentativo orchestrato (dev agent in CLI) ha fallito 2 volte con
  diff vuoto (fase `blocked`); sbloccata facendo il dev **in sessione principale** — confermato
  come modalità standard per i moduli free-tier.

---

## 3ter. Cosa è la Fase 6 e com'è finita (riassunto per continuità)

- **Chat multi-turn e provider-agnostica (DoD)**: `buildMessages` ora accetta la
  cronologia (max 10 turni, soli ruoli user/assistant, contenuti validati) e il
  contesto strutturato del wizard (`currentState`: step corrente + filtri EQ live),
  delimitato nel system prompt. Stesso contratto SSE per tier 1/2 e fallback
  locale → stessa UX con qualunque provider di Fase 3.
- **Streaming SSE (`/api/chat/stream`)**: eventi `delta` → `done` (subito) → evento
  `proposal` separato con la proposta calcolata (filtri + preamp). **Mai applicata
  in automatico**: lo stream NON scrive il file E-APO (a differenza di `/api/chat`
  legacy usato dal pulsante esplicito "AI parametrico" allo Step 4).
- **Frontend**: `apiChatStream` (fetch SSE su POST, EventSource non basta);
  `AIPersona` visibile su TUTTI gli step (anche Welcome) con testo streaming live
  e FAB mobile sempre attivo; proposta EQ mostrata da `EqProposalCard` come diff
  tabellare (filtro, attuale → proposta) con **Applica/Rifiuta**.
- **Persistenza locale**: `utils/chatPersistence.js` (puro, testabile) +
  `EqStateProvider` (load all'init, save debounced 400ms, sync cross-tab via
  `storage` event) + azione `CLEAR_CHAT` (pulsante cestino nell'header chat).
- **Verifica**: 72 backend + 137 frontend verdi (18 test nuovi), build Vite OK,
  lint 0 errori, E2E curl `delta → done → proposal` con filtri reali, gate
  `verifier` PASS (`implementation/reports/phase-6-verify.md`).

---

## 4. Contratti API (backend già pronto)

- `GET /api/engine-status` → `{success, engine}` (es. 'Local Knowledge Graph' | 'LM Studio').
- `GET /api/artists`, `POST /api/resolve-artist` (ricerca/risoluzione artisti).
- `GET /api/presets` (caricamento server-side), salvataggio locale in localStorage
  chiave `PersonalEQ_Presets`.
- `POST /api/calculate-eq` — calcolo EQ (destinazione `clipboard` | `e-apo` | `export`).
- Profili IA: `POST /api/ai/profiles` (body `{name,type,baseUrl?,apiKey?,model?}` →
  201 `{success,profile}` senza chiave), `GET /api/ai/profiles` (`{success,profiles}`),
  `POST /api/ai/profiles/:id/test` (→ `{success,tier,latencyMs,modelName}`),
  `POST /api/ai/profiles/:id/activate` (attivabile anche tier 3).
- `POST /api/chat` (JSON, `{message,chatHistory,aiPayload,destination}` → `{success,reply,payload?,fileContent?}`)
  e SSE `POST /api/chat/stream` (predisposto per Fase 6).

---

## 5. Vincoli operativi (valgono sempre)

1. **MAI usare `opencode run --continue`** (riprende questa sessione e cancella file non
   tracciati — è stata la causa dell'incidente del 2026-08-18 che ha eliminato i moduli
   frontend scomposti). I gate si eseguono con run **attached e monitorata**.
2. **Nessun commit** sulla repo corrente (l'utente non lo ha autorizzato; il salvataggio
   avviene in una repo di backup separata).
3. Non toccare senza scope esplicito: `server.js`, `engine/**`, `test/*.test.js`,
   `frontend/src/components/AudioPlayerAB.jsx`, `SearchableCombobox.jsx`, `App.css`,
   `aiConfig.js` (+ test), `smoke.test.js`, `implementation/plan_state.json`
   (aggiornamento di competenza dell'orchestrator dopo i gate PASS).
4. Nessuna nuova dipendenza npm (l'aggiunta di `vitest` nei lock è carryover Fase 0, già
   classificata non-bloccante dal gate security Fase 4).
5. Componenti `.jsx` nuovi < ~300 righe; `App.jsx` < 200 righe; nessun `@media` con
   valori diversi da `tokens.breakpoints` (640/768/1024).
6. Security: nessun segreto hardcodato (`sk-`, `Bearer `, `AIza`, `ghp_`, `AKIA`, `C:\Users`);
   nessun `fetch` verso host ≠ localhost:3001; chiave API solo nel body della POST di
   creazione profilo, mai in log/localStorage/console.
7. Lingua UI e commenti: **italiano** (i test/commenti esistenti sono in italiano).
8. Modalità di lavoro corrente (v2): ogni fase si esegue con
   `opencode run --agent architect-orchestrator "Leggi implementation/plan_state.json, esegui SOLO la
   fase corrente seguendo implementation/phases/phase-N.md, poi fermati e riportami l'esito."` — run
   **attached e monitorata** (timeout generosi: una fase intera può richiedere 1h+). L'orchestratore
   delega al dev agent e chiude col gate unico `verifier`. Se la run viene uccisa, riesegui lo stesso
   comando: riparte da `plan_state.json`, non perde lavoro. Per più fasi di fila aggiungi "esegui tutte
   le fasi in sequenza senza fermarti finché non trovi un blocco".
9. Su Windows/PowerShell 5.1: niente `&&`/`||`/`grep`/`head` nei comandi; usare
   cmdlet PowerShell o `;` + `if ($?)`.

---

## 6. Ciclo di lavoro per ogni fase (architettura v2)

1. Leggere `implementation/plan_state.json` → fase corrente. Controllare `heartbeat`/`current_step`/
   `step_count_this_phase`: se l'heartbeat è fermo da minuti mentre il processo risulta in esecuzione,
   la run è bloccata → interromperla e rilanciare lo stesso comando.
2. Eseguire la fase con (da `Resume/00_LEGGI_PRIMA.md` §5):
   `opencode run --agent architect-orchestrator "Leggi implementation/plan_state.json, esegui SOLO la
   fase corrente seguendo implementation/phases/phase-N.md, poi fermati e riportami l'esito."`
   L'orchestratore: legge **solo** `phase-N.md`, individua `## Agente`, delega al dev agent via Task,
   aggiorna `heartbeat`/`step_count_this_phase` a ogni checkpoint, poi invoca il gate unico `verifier`
   che scrive `implementation/reports/phase-N-verify.md` (sezioni Sicurezza + QA + Esito complessivo).
   - **Regola diff vuoto** (orchestratore): se il dev agent non produce modifiche, fase fallita SENZA
     verifier — niente cicli a vuoto.
   - **Budget di tempo**: run mai oltre ~25 minuti di lavoro effettivo su una fase; oltre, l'orchestratore
     riporta stato parziale o `blocked` ("run troppo lunga").
   - In pratica, per i moduli free-tier il dev è più affidabile **in questa sessione principale**
     (come già da Fase 4): in tal caso si lavora qui, si aggiorna `plan_state.json` a mano
     (heartbeat/current_step) e si lancia SOLO il gate finale.
3. Esito: **PASS** → fase N `done`, N+1 `ready`, e l'orchestratore **si ferma** e riporta l'esito
   (per più fasi in sequenza serve richiederlo esplicitamente). **FAIL** → `attempts` +1 e nuovo
   giro col dev agent; dopo 2 tentativi falliti consecutivi o >25 passi nella fase → `blocked` + nota
   in `notes` e stop in attesa di input umano.
4. Self-check manuale durante il dev (prima di delegare al gate): `npm test` (root, exit 0),
   `npm run build` (frontend), `npm run lint` 0 errori, conteggio righe, grep segreti pulito.
5. Gate `verifier` (se non già eseguito dall'orchestratore): `opencode run --agent verifier "<task>"`
   con timeout **max 20 minuti** (il report `implementation/reports/phase-N-verify.md` è l'unico file
   che scrive). Se scade: se il report non c'è, rilanciare con prompt mirato e timeout 15 min; se
   ancora nulla, verifica manuale e nota nel report. Mai run in attesa oltre 20 minuti.

---

## 7. Prossime fasi (scope dal piano, §5)

### FASE 5 — Redesign wizard + player A/B (`done`, gate verifier PASS)
- Fatto: fix AudioPlayerAB (3 bug), design-tokens su tutti gli step, EqCurveTable (vista
  tabellare WCAG 2.1 AA). Dettagli nella sezione 3bis.

### FASE 6 — Chat IA persistente e seamless (`done`, gate verifier PASS)
- Fatto: chat multi-turn provider-agnostica (SSE delta/done/proposal), contesto
  wizard strutturato, proposta EQ come diff Applica/Rifiuta (mai automatica),
  cronologia persistita in localStorage. Dettagli nella sezione 3ter.

### FASE 7 — Hardening finale & pre-pubblicazione (`ready`, la prossima)
- Error handler JSON globale, try/catch su `/api/resolve-artist`, CORS ristretto,
  rate-limit sugli endpoint verso terzi; User-Agent reale MusicBrainz; `estimated: true`
  per dati hardware stimati; rimuovere feature dichiarate ma non implementate (CSV/TMQ, OCR);
  allineare README; `npm audit` finale + scansione segreti a tappeto; `npm audit fix`
  per `nanoid` (high, dev-tooling) e `postcss` (moderate) prima del rilascio.

---

## 8. Note operative / ambiente

- L'ambiente ha un **killer di processi esterno** (un "watchdog" di altro sistema) che ha
  ucciso più volte le run CLI e cancellato file non tracciati: per questo il lavoro di dev
  è svolto SOLO dalla sessione principale e i gate vanno monitorati; se una run viene
  uccisa, si riesegue (i report si rigenerano; il file `implementation/reports/*` è l'unico
  file che i gate scrivono).
- `run-watchdog.ps1` + task pianificato `EQWatchdog` (disabilitato) + `loop-runner.cmd`:
  infrastruttura runner resiliente; NON lanciarla più senza supervisione (rischio
  interferenza con la sessione principale).
- Backup della repo: clone locale completo su Desktop + mirror su GitHub `ThatsSteve/EQBackup`
  (push manuale, vedi sezione 9). La repo originale `Desktop/EQ` resta locale e non toccata.

---

## 9. Backup (eseguito il 2026-08-18, v2 con GitHub)

- Repo di backup: `C:\Users\yscuo\Desktop\EQ_backup_2026-08-18` (clone locale completo, tutto
  committato), mirror su GitHub **`ThatsSteve/EQBackup`** (pubblica).
- La repo originale `Desktop/EQ` **non viene mai toccata** (nessun commit, nessun remote).
- Procedura riproducibile:
  1. `git clone C:\Users\yscuo\Desktop\EQ C:\Users\yscuo\Desktop\EQ_backup_<data>`
  2. `robocopy C:\Users\yscuo\Desktop\EQ C:\Users\yscuo\Desktop\EQ_backup_<data> /E /XD node_modules dist .git /XF run-orchestrator*.log run-orchestrator.err run-orchestrator.pid test-detach.log test-detach.pid`
  3. `git -C C:\Users\yscuo\Desktop\EQ_backup_<data> add -A`
  4. `git -C C:\Users\yscuo\Desktop\EQ_backup_<data> commit -m "<descrizione>"`
  5. `git -C C:\Users\yscuo\Desktop\EQ_backup_<data> push origin main` (aggiorna il mirror GitHub)

---

## 10. Checklist rapida per verificare che tutto sia a posto

```
npm test                      # root: 10 file / 65 test backend + 8 file / 126 test frontend, exit 0
npm --prefix frontend run build   # Vite build OK
npm --prefix frontend run lint    # 0 errors
Test-Path frontend/src/App.jsx    # shell 166 righe
Test-Path frontend/src/components/WizardShell.jsx, onboarding-ai/, steps/, hooks/, contexts/
```