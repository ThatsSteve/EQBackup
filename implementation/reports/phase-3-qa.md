# QA Report — Fase 3: Onboarding "Configura la tua IA" (frontend, nuovo Step 0 gate del wizard)

**Data:** 2026-08-18
**Verificatore:** qa-verifier (permessi: sola scrittura `implementation/reports/*`)
**Commit di riferimento:** `26fd0b5` (unico commit; working tree con modifiche Fasi 0/1/2 pre-esistenti + modifiche Fase 3 non committate)
**Gate precedenti:** Fase 2 security=PASS, Fase 2 QA=PASS, Fase 3 security=PASS (`phase-3-security.md`)
**Esito complessivo:** **PASS**

---

## 1. Metodologia

- **Suite:** `npm test` dalla root (backend `vitest run` + `npm --prefix frontend test`) → **exit 0**.
- **Build:** `npm run build` in `frontend/` → **exit 0** (vite v8.1.5, 2767 moduli trasformati; artefatti `dist/` coperti da `frontend/.gitignore:11`).
- **Diff:** `git diff HEAD -- frontend/src/App.jsx`, `--stat` globale, `git diff HEAD -- frontend/package.json|package-lock.json`.
- **Grep statici** (tool Grep su `frontend/src`): `console\.`, `fetch(`, `localStorage|sessionStorage`, pattern segreti, `method: PUT|DELETE`, URL esterne, `.skip/.only/.todo`.
- **Limite ambientale (documentato, non bloccante):** il backend non è in esecuzione sulla macchina di QA → `curl.exe -s -v http://127.0.0.1:3001/api/ai/profiles` → **Connection refused** (evidenza raccolta, riga sotto). Il contratto HTTP reale degli endpoint consumati dal frontend è quindi verificato tramite la suite Supertest in-process (65/65 test pass, inclusi `ai-endpoints.test.js` e `ai-registry.test.js`), stessa evidenza primaria usata dal gate Fase 2. Il rifiuto di connessione costituisce comunque un caso reale del criterio di accettazione ("backend irraggiungibile") e la UI lo gestisce (catch → lista vuota → "Nessuna IA" percorribile, `OnboardingAiStep.jsx:98-103,551`).
- **Resa desktop/mobile:** verificata staticamente (build + CSS con media query `max-width: 640px` e griglia `auto-fit`). La resa visiva effettiva richiede verifica umana in browser (nessun jsdom/@testing-library installato, come da vincolo di fase) — NON marcata PASS per default, vedi C3.

---

## 2. Criteri verificati — esito singolo ed evidenze

### C1 — Criterio di accettazione ufficiale: utente senza IA configurata completa l'intero wizard — **PASS**
- **Evidenza statica:** `OnboardingAiStep.jsx:551` — card "Nessuna IA" → `onClick={onComplete}` **senza alcuna dipendenza dal backend** (nessun fetch, nessuna attesa su `profilesLoaded`). `App.jsx:1337-1346` `handleAiOnboardingComplete` → setta stato + `localStorage.setItem('PEQ_AI_ONBOARDING_DONE','1')` + scroll top. Con `!aiOnboardingDone` il gate renderizza `OnboardingAiStep` al posto del wizard (`App.jsx:1381-1390`); al completamento il wizard esistente si monta **invariato**: step 0 biforcazione Interattivo/Analitico ancora presente (`App.jsx:1455,1467`), step 1 hardware, 2 generi, 3 tuning, 4 EQ (git diff: nessun'altra modifica).
- **Evidenza dinamica (backend irraggiungibile, caso reale):** `curl.exe -s -v -m 5 http://127.0.0.1:3001/api/ai/profiles` → `connect to 127.0.0.1 port 3001 ... failed: Connection refused`. Con GET vuoto o irraggiungibile la UI mostra la lista vuota + messaggio informativo e l'onboarding resta percorribile con "Nessuna IA".
- **Fallback deterministico `local-graph`:** default backend invariato (`server.js:33-34`, non toccato dalla Fase 3). Verificato dalla suite in-process: `ai-endpoints.test.js:136` ("profilo attivo tier 3: /api/calculate-eq risponde 200 con filtri deterministici") e `phase1-e2e.test.js` (POST `/api/calculate-eq` deterministico, curva non vuota, guardrails). `curl POST /api/calculate-eq` live non eseguibile (server down) — coperto da Supertest.

### C2 — Modulo puro `aiConfig.js` (presets, badge, validazione) — **PASS**
- **Presets** (`aiConfig.js:13-76`) coerenti col backend Fase 2: LM Studio `http://localhost:1234/v1`, Ollama `http://localhost:11434/v1` (entrambi `openai-compatible`, `keyRequired:false`); OpenAI `https://api.openai.com/v1`, OpenRouter `https://openrouter.ai/api/v1`, Anthropic `https://api.anthropic.com`, Gemini `https://generativelanguage.googleapis.com` (`keyRequired:true`, `experimental:true` con descrizione che dichiara lo stub). `SUPPORTED_TYPES` = specchio di `registry.js:31`.
- **`tierToBadge`** esatto: 1→`🟢 Ottimale`, 2→`🟡 Compatibile`, 3→`🔴 Solo chat`, null/undefined/ignoto→`Non testato` (testato 6/6, inclusi `null`, `undefined`, `99`).
- **`isKeyRequired`**: locali (`localhost`/`127.0.0.1`) → false, cloud → true (2 test, coprono i 4 casi locali e i 4 cloud).
- **`validateProfileForm`**: name mancante, type non supportato, baseUrl mancante, model>200 char, cloud senza chiave (openai-compatible e anthropic) → errore; locali e cloud con chiave fittizia → `valid:true` (8 test).
- **`defaultProfileName`**: non vuoto per tutti i tipi supportati (1 test). **`maskedKeyLabel`**: solo stato mascherato da booleano (2 test, nessuna chiave asserita).
- **ES module puro** (nessun import, nessun DOM). **22 test pass** in `aiConfig.test.js` (6+2+8+1+2+3). Nessun `.skip/.only/.todo` (grep → no match).

### C3 — Componente `OnboardingAiStep.jsx` — **PASS**
- **Tre opzioni** (`OnboardingAiStep.jsx:526-559`): Locale, Cloud, "Nessuna IA", come `option-card` riusando le classi esistenti.
- **Quick-start locali** (`:573-587`): Auto-detect LM Studio `:1234` e Ollama `:11434` → crea profilo con baseUrl preset e apiKey vuota → lancia il test (azione esplicita, non keystroke). **Endpoint manuale locale** (`:589-608`), **endpoint OpenAI-compatibile personalizzato** cloud (`:647-655`).
- **Form cloud chiave obbligatoria mascherata**: `:311-320` `type="password"`, `autoComplete="off"`, `spellCheck="false"`, placeholder generico "Incolla la tua chiave API". Chiave richiesta pilotata da `isKeyRequired` (`:264,309`).
- **"Testa connessione" esplicito**: `:361-369` pulsante → `POST /api/ai/profiles/:id/test` (`:196-199`, body assente) → badge `tierToBadge` con `modelName`/`latencyMs` se presenti (`:206-209`); stato di caricamento `testingId` + pulsante disabilitato in flight. **Nessun test automatico a ogni keystroke**: unico `useEffect` del componente è il fetch iniziale dei profili (`:109`); nessun debounce/setTimeout sul form.
- **Attivazione mai bloccata su tier 3**: `handleActivateProfile` (`:219-240`) non contiene alcun controllo su `tier`; chiama `POST /:id/activate` e va a `onComplete()` indipendentemente dal tier (comportamento backend documentato: il tier 3 resta attivabile).
- **Modalità gestione** (`:399-497`): lista profili con nome/tipo/model/badge tier/indicatore attivo, "Attiva" su profili non attivi → activate, "Testa" → test, form nuovo profilo; **lista vuota gestita senza crash** (`:411-416`, con nota vault dev-only); pulsante Chiudi → onClose.
- **Errore di rete gestito**: ogni fetch in try/catch con messaggi generici fissi; su 400 si mostra solo `data.error` sanitizzato del backend. Nessun `err.message`/body grezzo renderizzato (grep confermato dal gate security).
- **Resa visiva**: build OK; CSS scoped `OnboardingAiStep.css` con responsive (`@media max-width:640px`, griglia `auto-fit minmax(200px,1fr)`), focus visibile e `prefers-reduced-motion`. **Resa desktop/mobile effettiva: NON VERIFICABILE AUTOMATICAMENTE** (niente jsdom/@testing-library): serve verifica visiva umana in browser su `npm run dev` — non bloccante, i vincoli funzionali sono coperti da test puri + build.

### C4 — Inserimento in `App.jsx` (gate reversibile, +57/−0) — **PASS**
- `git diff HEAD -- frontend/src/App.jsx` = **+57/−0** in 5 punti localizzati:
  1. import `OnboardingAiStep` (riga 11);
  2. stato gate `aiOnboardingDone` (da `localStorage PEQ_AI_ONBOARDING_DONE === '1'`) + `aiSettingsOpen` + useEffect GET profili che auto-completa l'onboarding se esiste un profilo `active` (righe 658-678);
  3. `handleAiOnboardingComplete` (righe 1337-1346);
  4. render condizionale nel `main-wizard-wrapper` + pulsante "⚙️ Impostazioni IA" nell'header (righe 1381-1418);
  5. parentesi di chiusura del condizionale (riga 2706).
- **Numerazione/reducer/timeline/maxStepReached invariati**: `Math.min(4, ...)` e `Math.max(0, ...)` intatti (`App.jsx:79-80`), `maxStepReached` iniziale 1 (riga 723), timeline `[1,2,3,4]` (riga 2670), step 0 Interattivo/Analitico (righe 1455/1467), condizioni `state.step === N` non toccate. Reversibile: basta rimuovere il condizionale.

### C5 — Multi-profilo e cambio attivo senza rifare l'onboarding — **PASS**
- **Gestione** riapribile dal pulsante "Impostazioni IA" nell'header (`App.jsx:1410-1416`) → `OnboardingAiStep mode="manage"` (`App.jsx:1384-1388`), senza toccare il flag `PEQ_AI_ONBOARDING_DONE`.
- **Edit/delete NON implementati** (correttamente): grep `method: 'PUT'|'DELETE'` su `frontend/src` → **No files found**; il backend non espone endpoint PUT/DELETE (documentato nel prompt di fase, `DA CHIARIRE`).
- **Switch via activate, un solo attivo**: backend `ai-registry.test.js:70` ("un solo profilo attivo alla volta (attivare uno disattiva gli altri)") e `ai-endpoints.test.js` (activate) PASS nella suite. Verifica curl live su due profili non eseguibile (server non in esecuzione) — coperta da Supertest in-process.

### C6 — Security checklist Fase 3 — **PASS**
- **Chiave azzerata dopo il salvataggio**: `OnboardingAiStep.jsx:176` `setForm(f => ({ ...f, apiKey: '' }))` subito dopo la POST; campo riaperto in gestione sempre vuoto (handleSelectPreset/handleSelectCustom/endpoint manuale).
- **Stato mascherato da `hasApiKey`**: `:350` `maskedKeyLabel(savedProfile.hasApiKey)` → solo "Chiave salvata ••••••••" / "Nessuna chiave salvata" (`aiConfig.js:164-165`); la chiave non viene mai riletta.
- **Nessun `console.*` nei file nuovi**: grep su `frontend/src/ai/` e `OnboardingAiStep.jsx` → unico match è un commento (riga 17). I `console.error` in `App.jsx` sono pre-esistenti (righe 761-1246, fuori dal diff).
- **Nessuna chiave in localStorage**: grep `localStorage|sessionStorage` → solo il flag booleano `PEQ_AI_ONBOARDING_DONE` (App.jsx:664,1344) e il `LOCAL_STORAGE_KEY` pre-esistente dei presets (861,884).
- **Chiave solo nel body della POST di creazione**: unico fetch con body che include `apiKey` è `OnboardingAiStep.jsx:164-168`; GET (87), `/test` (196-198) e `/activate` (223-225) hanno body **assente**; `App.jsx:672` GET senza body.
- **Pattern segreti**: `sk-[A-Za-z0-9]{8,}`, `Bearer `, `C:\Users`, `AIza`, `ghp_`, `AKIA` su `frontend/src` → **No files found**. Placeholder di test chiaramente fittizio `FAKE-PLACEHOLDER-KEY`.

### C7 — Regressione e perimetro — **PASS**
- `npm test` dalla root → **exit 0**: backend **10 file / 65 test PASS** (invariati), frontend **2 file / 23 test PASS** (smoke 1 + aiConfig 22). `frontend/src/smoke.test.js` verde (incluso nella run).
- `npm run build` (frontend) → **exit 0**, nessun errore di bundling (import del componente incluso, 2767 moduli).
- **Nessun file backend modificato dalla Fase 3**: `git diff HEAD --stat` — i conteggi backend (`server.js` +207, `aiOrchestrator.js` +222, `coreCalculator.js` +16, `genreArtistMatrix.js` +12, `graphEngine.js` +7, `knowledge_graph.json` −673) sono **identici** alla baseline Fasi 0/1/2 riportata in `phase-2-security.md` §1 e `phase-3-security.md` §1. L'unico file `frontend/src` toccato è `App.jsx` (+57/−0).

### C8 — DoD 9, 10, 12, 13 — **PASS**
- **DoD 9**: `App.jsx` modificato SOLO per import + stato gate + render condizionale + pulsante (diff verificato, +57/−0, 5 hunk localizzati). ✓
- **DoD 10**: nessuna nuova dipendenza. `frontend/package.json` diff vs HEAD = solo Fase 0 (`"test": "vitest run"` + `vitest ^4.1.10`). `frontend/package-lock.json` diff vs HEAD = solo l'albero vitest (Fase 0): `vitest`, `@vitest/*`, `chai`, `magic-string`, `tinyrainbow`, ecc. — nessuna aggiunta Fase 3. ✓
- **DoD 12**: grep segreti su `frontend/src` → nessun match; nessun path personale. ✓
- **DoD 13**: `implementation/plan_state.json` riflette solo lo stato orchestrator (fase 3 = `qa_review`, `last_security: PASS`); HEAD invariato a `26fd0b5` (nessun commit eseguito né da me né dal dev). ✓
- **Guardrails fisici** (`[-12,+9]` dB, Q `[0.5,3.5]`): non toccati dalla Fase 3 (frontend-only); la suite backend Fase 1/2 che li verifica resta verde (65/65). Il layer IA produce solo intenti `[-5,+5]` validati dallo schema (`eqIntentSchema.js`), mai freq/Q/gain fisici.

---

## 3. Verdetto

**PASS.** Tutti i criteri della Fase 3 sono soddisfatti con evidenza di esecuzione reale:

| Criterio | Esito |
|---|---|
| C1 Criterio di accettazione ufficiale (Nessuna IA + fallback deterministico) | PASS |
| C2 Modulo puro `aiConfig.js` + 22 test | PASS |
| C3 Componente `OnboardingAiStep.jsx` (3 opzioni, quick-start, test esplicito, tier 3 non bloccante, gestione multi-profilo, lista vuota) | PASS |
| C4 Inserimento `App.jsx` +57/−0, wizard invariato | PASS |
| C5 Multi-profilo / switch via activate / nessun edit-delete | PASS |
| C6 Security checklist Fase 3 (chiave mai esposta) | PASS |
| C7 Regressione (`npm test` exit 0, smoke verde, nessun file backend toccato, build OK) | PASS |
| C8 DoD 9/10/12/13 (diff App.jsx, zero nuove dipendenze, grep segreti, plan_state/commit) | PASS |

**Nessun criterio FAIL.** Limitazioni documentate non bloccanti: (1) verifica HTTP live via curl non eseguibile perché il backend non è in esecuzione sulla macchina di QA — il contratto è coperto dalla suite Supertest in-process (65/65) e il "Connection refused" osservato è di fatto il caso "backend irraggiungibile" che la UI deve (e risulta) gestire; (2) resa visiva desktop/mobile del componente da confermare umanamente in browser (`npm run dev`), vincolo di fase senza jsdom/@testing-library.