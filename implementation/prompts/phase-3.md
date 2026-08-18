# Task — Fase 3: Onboarding "Configura la tua IA" (frontend, nuovo Step 0 del wizard)

## Obiettivo
UX per scegliere la potenza di calcolo IA (provider locale o cloud) come **primo passo del wizard**, così come richiesto dalla sezione 5 FASE 3 del piano: un nuovo step iniziale con tre opzioni (Locale / Cloud / "Nessuna IA"), test di connessione in tempo reale con badge di tier (🟢 Ottimale / 🟡 Compatibile / 🔴 Solo chat), multi-profilo salvabile e cambiabile dalle impostazioni **senza rifare l'onboarding**. Un utente senza alcuna IA configurata deve poter completare comunque l'intero wizard.

## Contesto (verificato sul codice reale al 2026-08-18)

- Sei `frontend-redesign-dev`. Repo: `C:\Users\yscuo\Desktop\EQ` (git; HEAD `26fd0b5`; working tree con modifiche Fasi 0/1/2 **non committate**). **Non committare nulla**: la commit avviene a fine ciclo dall'orchestratore.
- Fasi 0, 1 e 2 sono DONE con gate security=PASS e QA=PASS (report in `implementation/reports/phase-{0,1,2}-{security,qa}.md`). Fase 3 è `ready` in `implementation/plan_state.json` (`attempts: 0`) — primo tentativo.
- **Tutto il backend AI della Fase 2 esiste già e funziona** (65 test pass): il tuo lavoro è SOLO frontend. **Non modificare alcun file backend** (`server.js`, `engine/ai/**`). Il criterio di accettazione ufficiale della Fase 3 sarà verificato da `qa-verifier` nel gate successivo; la tua evidenza primaria sono i test frontend che produci e il comportamento a runtime verificabile.

### Contratto backend verificato (righe confermate leggendo i file)

- `POST /api/ai/profiles` — `server.js:361-375`. Body `{ name, type, baseUrl?, apiKey?, model? }`. Valida `name` non vuoto e `type` ∈ `SUPPORTED_TYPES = ['openai-compatible','anthropic','google-gemini']` (`engine/ai/registry.js:31`). Risponde `201 { success, profile }` dove `profile` **non contiene mai `apiKey`** ma espone `hasApiKey: boolean` (`registry.js:38-42`, `stripSecret`).
- `GET /api/ai/profiles` — `server.js:377-384`. Risponde `{ success, profiles }`; ogni profilo è `{ id, name, type, baseUrl, model, hasApiKey, tier, active, createdAt, updatedAt }` (mai `apiKey`; `tier` può essere `null` se mai testato).
- `POST /api/ai/profiles/:id/test` — `server.js:386-397`. Risponde `{ success: probe.ok, tier, latencyMs, modelName }` (`engine/ai/capabilityProbe.js` → `{ ok, tier, latencyMs, modelName, details }`, catch globale → tier 3, righe 94-103). **Non attiva** il profilo. `success` è `false` quando il tier è 3.
- `POST /api/ai/profiles/:id/activate` — `server.js:399-417`. Esegue il probe solo se `tier` è `null`, poi imposta il profilo attivo (un solo attivo alla volta, gli altri `active: false`). **Un profilo tier 3 resta attivabile** (solo chat conversazionale — comportamento voluto e documentato).
- **NON esistono endpoint PUT/DELETE per i profili** (il registry ha `updateProfile`/`deleteProfile` interni ma non esposti su REST). Vedi `DA CHIARIRE` più sotto.
- BaseUrl di default degli adapter (per i quick-start): OpenAI-compatibile → `http://localhost:1234/v1` (LM Studio, `engine/ai/adapters/openAICompatible.js:32`); Anthropic → `https://api.anthropic.com` (`anthropic.js:27`); Gemini → `https://generativelanguage.googleapis.com` (`googleGemini.js:30`) — **attenzione: l'adapter Gemini è uno STUB documentato della Fase 2** (`googleGemini.js:4-20`): il probe degrada SEMPRE a tier 3. La UI deve mostrarlo onestamente (badge 🔴 Solo chat) e senza errori bloccanti.
- `server.js:36` — `app.use(cors())` permissivo `*` pre-esistente (Fase 2 §3.1: superficie di rete ampliata; **non peggiorarla**). Server su `127.0.0.1:3001` (`server.js:515-517`).

### Stato frontend verificato (righe confermate leggendo i file)

- `frontend/` è React 19 + Vite (porta dev di default 5173, **nessun proxy** in `frontend/vite.config.js`): tutte le chiamate backend sono `fetch('http://localhost:3001/api/...')` hardcoded — 18 occorrenze in `frontend/src/App.jsx` (righe 469, 707, 730, 749, 800, 803, 806, 810, 817, 824, 881, 1022, 1079, 1135, 1169, 1202, 1234, 1254), con `headers: { 'Content-Type': 'application/json' }`. Segui lo stesso pattern.
- `frontend/src/App.jsx` è un monolite di **2.673 righe** (refactor previsto in Fase 4 — **NON anticiparlo**). Stato wizard: `useReducer` con `initialState.step: 0` (`App.jsx:46-47`); reducer con `NEXT_STEP → Math.min(4, ...)` (`App.jsx:78`) e `PREV_STEP → Math.max(0, ...)` (`App.jsx:79`); `maxStepReached` iniziale 1 (`App.jsx:698`); `handleNextStep` (`App.jsx:1315-1337`) con validazioni sugli step 1 (cuffia obbligatoria) e 2 (default generi).
- Step esistenti del wizard (da NON rinumerare): `App.jsx:1386-1416` step 0 = biforcazione (Interattivo vs Analitico); `App.jsx:1419+` step 1 = Hardware Profiler; step 2 = generi/artisti; step 3 = tuning timbrico; step 4 = EQ finale. Footer con timeline `[1,2,3,4]` a `App.jsx:2604-2650`.
- La chat (`AIPersona`) è nascosta quando `state.step === 0` (`App.jsx:508`) e il FAB mobile è nascosto quando `state.step === 0` (`App.jsx:2659`): con lo Step 0 IA come gate (approccio sotto) la chat resta nascosta durante l'onboarding IA — comportamento coerente, non richiede modifiche.
- CSS riutilizzabili già presenti in `frontend/src/index.css`: `.glass-panel` (riga 62), `.step-container` (244), `.step-title` (253), `.step-subtitle` (263), `.option-card` (297) e `.option-card.active` (327), `.badge` (362), `.input-group` (387), `.input-label` (400), `.btn-primary` (526), `.btn-secondary` (548), `.error-text` (234). **Riutilizza queste classi; non creare un design system** (è la Fase 4). CSS aggiuntivo solo se strettamente necessario, scoped al nuovo componente.
- Test frontend: `frontend/package.json` — ESM (`"type": "module"`), script `"test": "vitest run"`, devDependencies **senza jsdom e senza @testing-library** (solo vite/vitest/oxlint/plugin-react). Unico test esistente: `frontend/src/smoke.test.js` (1 test di harness). `npm test` dalla root = `vitest run && npm --prefix frontend test` (`package.json` root).

### Nota chiave: dove inserire lo Step 0 (decisione già presa — eseguila come indicato)

Rinumerare tutti gli step esistenti (+1) è **troppo invasivo** sul monolite: toccherebbe i clamp del reducer (`App.jsx:78-79`), `maxStepReached` (`:698`), la timeline `[1,2,3,4]` (`:2614`) e **~20 condizioni** `state.step === N` sparse (righe 434-446, 508, 869, 891, 897, 1316, 1322, 1386, 1419, 1769, 1967, 2262) → rischio di regressione alto su un file da 2.673 righe. Questa rinumerazione appartiene al refactor della Fase 4/5.

**Approccio obbligatorio, minimale e reversibile:** montare il nuovo Step 0 come **gate** sopra il wizard esistente, senza toccare reducer, timeline o numerazione:

1. Nuovo file `frontend/src/components/OnboardingAiStep.jsx` (UI dello step IA).
2. Nuovo modulo puro `frontend/src/ai/aiConfig.js` (presets, badge tier, mascheratura, validazione — vedi punto 1 sotto) **esportato separatamente per renderlo testabile senza DOM**.
3. In `App.jsx` SOLO: (a) import del componente; (b) uno stato gate (`aiOnboardingDone`) inizializzato da `localStorage` e/o dalla presenza di un profilo attivo in `GET /api/ai/profiles`; (c) render condizionale nel `main-wizard-wrapper` (`App.jsx:1349-1350`): finché `!aiOnboardingDone` renderizza `<OnboardingAiStep onComplete={...} />`, altrimenti il blocco wizard esistente (`motion.div` da `App.jsx:1350` a `:2652`) invariato — due soli punti di modifica localizzati, nessuna re-indentazione necessaria (JSX non dipende dall'indentazione).
4. Un pulsante "Impostazioni IA" nell'header del wizard (`App.jsx:1356-1380`, zona `header-top`) per riaprire `OnboardingAiStep` in modalità gestione profili (multi-profilo senza rifare l'onboarding).

Se durante l'implementazione scopri che anche questo gate è troppo invasivo, **fermati e riporta il blocco nel messaggio finale** invece di forzare una modifica più ampia.

## Cosa implementare

### 1. Modulo puro `frontend/src/ai/aiConfig.js` (testabile senza DOM)
- Presets provider con baseUrl di default (verificati sopra): `lmstudio` → `http://localhost:1234/v1` (apiKey vuota, `type: 'openai-compatible'`), `ollama` → `http://localhost:11434/v1` (apiKey vuota, `type: 'openai-compatible'`), `openai` → `https://api.openai.com/v1`, `anthropic` → `https://api.anthropic.com`, `openrouter` → `https://openrouter.ai/api/v1`, `gemini` → `https://generativelanguage.googleapis.com` (con nota esposta in UI: adapter sperimentale/stub). Tutti i cloud hanno `apiKey` obbligatoria; i locali opzionale/vuota.
- `tierToBadge(tier)` puro: `1 → { label: '🟢 Ottimale', cls: ... }`, `2 → { label: '🟡 Compatibile', ... }`, `3 → { label: '🔴 Solo chat', ... }`, `null/undefined → { label: 'Non testato', ... }`. La semantica è quella del backend (1.2 del piano, `capabilityProbe`).
- Helper puri per la mascheratura e la validazione: `isKeyRequired(type)`, `validateProfileForm({ name, type, baseUrl, apiKey, model }) → { valid, errors }`, `defaultProfileName(type)` (per generare un `name` non vuoto quando l'utente non ne dà uno — il backend richiede `name` obbligatorio). NESSUN helper deve contenere log della chiave né valori segreti.
- Nessuna dipendenza: solo ES module puro.

### 2. Componente `frontend/src/components/OnboardingAiStep.jsx`
Tre opzioni come card (`option-card`, stile coerente con lo step 0 esistente):

- **Locale** (auto-detect LM Studio `:1234` / Ollama `:11434` o endpoint manuale):
  - Quick-start "Auto-detect LM Studio" e "Auto-detect Ollama": creano il profilo con la baseUrl preset e apiKey vuota, lanciano il test, mostrano il badge. Comodo per l'utente che ha LM Studio/Ollama in esecuzione in locale.
  - Alternativa "endpoint manuale": input per `baseUrl`, `model` (opzionale), `apiKey` (opzionale/vuota per locali).
- **Cloud** (quick-start OpenAI/Anthropic/Gemini/OpenRouter, o endpoint OpenAI-compatibile personalizzato):
  - Card quick-start per ciascun provider con i preset del punto 1; form con `apiKey` obbligatoria (input `type="password"`), `model` (opzionale con placeholder sensato es. `gpt-4o-mini`, `claude-3-5-sonnet-latest`, ecc. — NON inventare un catalogo modelli, lascia il campo libero), e opzione "endpoint OpenAI-compatibile personalizzato" con `baseUrl` editabile.
- **"Nessuna IA"**: opzione sempre disponibile e percorribile → completa l'onboarding senza salvare nulla; il wizard prosegue con il motore a regole deterministico esistente (che è il default `local-graph` del backend — nessuna modifica backend richiesta).

Flusso di salvataggio e test (tutte le chiamate SOLO al backend locale, mai ai provider dal browser):
1. Compila → `POST /api/ai/profiles` (body esatto del contratto). Sul 400 mostrare l'errore sanitizzato già restituito dal backend (messaggi generici fissi, es. `'Campo "name" obbligatorio.'`).
2. "Testa connessione" esplicito (pulsante) → `POST /api/ai/profiles/:id/test` → badge tier da `tierToBadge`, con `modelName` e `latencyMs` se presenti. **Niente test automatici a ogni keystroke** (evita oracoli di rete ripetuti: Fase 2 §3.1/§3.2). Stato di caricamento durante il test; il pulsante disabilitato in flight.
3. "Attiva e continua" → `POST /api/ai/profiles/:id/activate` → `onComplete()`. **L'attivazione non deve mai bloccarsi su un tier 3** (il backend lo attiva comunque: è il comportamento documentato).
4. Durante l'onboarding, se `GET /api/ai/profiles` restituisce già un profilo con `active: true`, il componente può segnalare l'opzione "Usa profilo esistente" → `onComplete()` senza rifare nulla.

Gestione errori: ogni fetch con try/catch; su errore di rete mostrare messaggio generico (`error-text`), **mai** `err.message`/body grezzi che possano contenere la chiave; nessun `console.error` con dati sensibili.

### 3. Punto di inserimento in `App.jsx` (gate, come da decisione sopra)
- Stato: `const [aiOnboardingDone, setAiOnboardingDone] = useState(() => localStorage.getItem('PEQ_AI_ONBOARDING_DONE') === '1');` — il flag in localStorage contiene SOLO un booleano, mai chiavi. Considera anche: se `GET /api/ai/profiles` montato all'avvio trova un profilo `active`, inizializza `aiOnboardingDone = true`.
- `onComplete()`: imposta lo stato, salva il flag in localStorage, e (se il wizard era già montato) scrolla in cima come fa `handleNextStep` (`App.jsx:1334-1336`).
- Render condizionale nel `main-wizard-wrapper` (`App.jsx:1349-1350`). Nessun'altra modifica al monolite.

### 4. Multi-profilo e accesso dalle impostazioni
- `OnboardingAiStep` deve supportare due modalità: **onboarding** (primo avvio) e **gestione** (ri-aperta dal pulsante "Impostazioni IA" nell'header, `App.jsx:1356-1377`).
- In gestione: lista profili da `GET /api/ai/profiles` (nome, tipo, badge tier, `model`, indicatore profilo attivo), pulsante "Attiva" su ciascun profilo non attivo → `POST /api/ai/profiles/:id/activate` (switch senza rifare l'onboarding); pulsante "Testa" → `POST /api/ai/profiles/:id/test` con badge; form per creare un nuovo profilo (stesso form del punto 2).
- **Non implementare edit/delete dei profili**: non esistono endpoint PUT/DELETE sul backend (vedi `DA CHIARIRE`). Lo scope multi-profilo della Fase 3 è: salvare più configurazioni (POST create) e cambiarle (POST activate).
- Lista vuota → stato normale gestito senza crash (vedi anche nota vault dev-only nei vincoli).

### 5. Badge tier con semantica backend (collegamento diretto)
- La fonte di verità dei tier è il backend: i valori arrivano da `POST /:id/test` (`{ success, tier, latencyMs, modelName }`) e dai profili in `GET` (`tier`). Mappa con `tierToBadge`; il colore NON è l'unico canale informativo (testo "Ottimale/Compatibile/Solo chat" sempre presente — accessibilità, WCAG 1.4.1).
- `tier: null` (profilo creato ma mai testato) → "Non testato" + invito a premere "Testa connessione".
- Nota per l'utente: il tier determina cosa può fare l'IA (1: generazione EQ diretta, 2: con retry guidato, 3: solo chat conversazionale — il resto usa il motore deterministico). Breve spiegazione inline, non un doc.

### 6. Mascheratura API key (security checklist della fase)
- Input `type="password"`; **mai** `console.log`/`console.debug` del valore.
- Dopo il salvataggio del profilo: azzerare il campo e mostrare uno stato mascherato "Chiave salvata ••••••••" pilotato da `hasApiKey` restituito dal backend. Il backend non restituisce mai la chiave: la UI non deve MAI provare a "rileggere" o visualizzare la chiave salvata.
- La chiave compare solo nel body della singola richiesta `POST /api/ai/profiles` (necessario per la creazione) e **mai più** nelle richieste successive (`GET`/`test`/`activate` non la contengono; `GET` la espone solo come `hasApiKey`). Nessun echo della chiave in messaggi di errore, placeholder o localStorage.
- Se il form viene riaperto in modalità gestione, il campo chiave deve essere vuoto con placeholder mascherato; l'utente deve poter lasciare il campo vuoto senza effetti (non esistendo update, non si applica: ogni nuovo salvataggio è una nuova creazione).

### 7. "Nessuna IA" e fallback deterministico (criterio di accettazione ufficiale)
- L'opzione "Nessuna IA" completa l'onboarding e consente di proseguire con gli step esistenti 0-4 del wizard esattamente come oggi. Nessuna dipendenza dal backend AI: se `GET /api/ai/profiles` fallisce o restituisce lista vuota, l'onboarding resta comunque percorribile con "Nessuna IA".
- La scelta "Nessuna IA" viene ricordata (flag localStorage) così non viene riproposta a ogni reload, ma deve essere **ripercorribile** dall'utente in ogni momento via "Impostazioni IA".
- Comportamento a valle invariato: con nessun profilo attivo il flusso `local-graph` deterministico è già il default backend (`server.js`); non toccare `/api/calculate-eq` né `/api/chat`.

### 8. Test frontend (Vitest, zero nuove dipendenze)
- I test del componente DOM non sono possibili senza jsdom/@testing-library (non installati e **non da installare**): quindi testa il modulo puro `frontend/src/ai/aiConfig.js` e ogni helper estratto. Copertura minima richiesta:
  - `tierToBadge`: 1→🟢, 2→🟡, 3→🔴, null→"Non testato" (mapping esatto).
  - `isKeyRequired`: provider locali `false`, cloud `true`.
  - `validateProfileForm`: name mancante → errore; `type` non supportato → errore; cloud senza apiKey → errore; caso valido → `valid: true`.
  - `defaultProfileName`: produce nomi non vuoti e leggibili.
- `frontend/src/smoke.test.js` deve restare verde (regressione zero). Nessuna modifica ai test backend.
- `npm test` dalla root (backend + frontend) deve uscire con codice 0.

## Vincoli non negoziabili
- **Sezione 1.3 del piano (vale per ogni fase):** nessuna API key, endpoint privato o token in codice, `.git`, log o file di stato in chiaro. Nel frontend: nessuna chiave in `console.*`, nessuna chiave in localStorage/sessionStorage, nessuna chiave nei messaggi di errore.
- **Security checklist della Fase 3:** il campo API key non è mai loggato in console, e dopo il salvataggio non è mai visibile in chiaro né in UI (mascherato) né nei payload di rete successivi al salvataggio (la chiave compare solo nel body della singola `POST /api/ai/profiles` di creazione, mai nelle `GET`/`test`/`activate` successive — comportamento già garantito dal backend, verificalo anche tu con un test/lettura della risposta).
- **Fase 2 §3.1 (CORS `*` + superfici):** il frontend deve comunicare **esclusivamente** con `http://localhost:3001` (endpoint esistenti). **MAI `fetch` dal browser verso provider esterni o locali** (LM Studio/Ollama/cloud): tutti i test di connessione passano dal backend (`POST /api/ai/profiles/:id/test`). Questo evita sia CORS sia l'esposizione di chiavi verso origini arbitrarie. Non introdurre nuove superfici di rete.
- **Fase 2 §3.3:** advisory pre-esistenti nel frontend lock (`nanoid <3.3.18` high, `postcss <=8.5.22` moderate): **nessuna nuova dipendenza**, `frontend/package-lock.json` non va toccato se non strettamente necessario (in ogni caso nessuna aggiunta). Non installare jsdom/@testing-library.
- **Fase 2 §3.6 (vault dev-only):** dopo un riavvio del processo backend i profili potrebbero non essere decifrabili → `GET /api/ai/profiles` può restituire una lista vuota. La UI deve trattare la lista vuota come stato normale (mai crash, onboarding sempre ripercorribile).
- **NON anticipare la Fase 4:** nessun design token, nessuna scomposizione di `App.jsx`, nessun refactor di componenti esistenti, nessuna modifica alla chat persistente. `App.jsx` si tocca SOLO per: import, stato gate, render condizionale, pulsante "Impostazioni IA". Tutto il resto del monolite resta invariato.
- **NON modificare il backend** (`server.js`, `engine/ai/**`, `test/*.test.js`): la Fase 3 è frontend-only. Se scopri un difetto backend, segnalalo nel messaggio finale.
- **Non toccare `implementation/plan_state.json`** (lo aggiorna solo l'orchestrator): il tuo `git diff` su quel file deve restare vuoto.
- **Non committare**: modifiche nel working tree; la commit avviene a fine ciclo.
- **Non invocare altri agenti** (`permission.task` negato): lavora in autonomia.
- **Regressione zero:** `npm test` dalla root esce con 0 (backend: 65 test invariati; frontend: smoke + nuovi test puri).
- Se incontri un blocco tecnico non previsto, riportalo nel messaggio finale con i dettagli invece di aggirarlo silenziosamente.

## Definition of Done (tutte verificabili — verificale tu stesso prima di dichiararti finito)
1. **Criterio di accettazione ufficiale:** un utente senza alcuna IA configurata può completare l'intero wizard. Verificabile: con `GET /api/ai/profiles` vuoto (o backend irraggiungibile), l'opzione "Nessuna IA" porta al completamento dell'onboarding e gli step esistenti 0-4 del wizard restano tutti percorribili e funzionanti come prima.
2. `frontend/src/ai/aiConfig.js` esiste, è un ES module puro senza dipendenze, e i suoi helper passano i test Vitest (mapping badge esatto, validazione, chiave obbligatoria per cloud, nomi di default non vuoti).
3. `frontend/src/components/OnboardingAiStep.jsx` esiste con le tre opzioni (Locale / Cloud / Nessuna IA), quick-start LM Studio `:1234` e Ollama `:11434`, endpoint manuale, endpoint OpenAI-compatibile personalizzato, form cloud con chiave obbligatoria mascherata.
4. Test connessione in tempo reale: pulsante esplicito → `POST /api/ai/profiles/:id/test` → badge `tierToBadge` (🟢/🟡/🔴/Non testato) con `modelName`/`latencyMs` quando presenti; nessun test automatico a ogni keystroke; stato di caricamento in flight.
5. Attivazione: `POST /api/ai/profiles/:id/activate` da onboarding e da gestione; un solo profilo attivo (comportamento backend); un tier 3 non blocca mai l'attivazione né il completamento dell'onboarding.
6. Multi-profilo: creazione di più profili e cambio del profilo attivo da "Impostazioni IA" (header) **senza rifare l'onboarding**; lista vuota gestita senza crash.
7. **Security checklist Fase 3:** dopo il salvataggio la chiave non è visibile in chiaro in UI (campo azzerato + stato mascherato da `hasApiKey`), non appare in alcun `console.*`, non compare in localStorage e non compare nelle richieste successive al salvataggio. Verifica con grep e con lettura del codice che nessun nuovo file logga valori di input del form chiave.
8. Nessun fetch dal browser verso host diversi da `http://localhost:3001` (grep: nessuna `fetch('http://localhost:1234')`, `11434`, `api.openai.com`, ecc. nei file frontend nuovi/modificati).
9. `App.jsx` modificato SOLO per import + stato gate + render condizionale + pulsante "Impostazioni IA"; reducer, timeline, `maxStepReached`, condizioni `state.step === N` e step esistenti INVARIATI (verifica con `git diff`).
10. Nessun file backend modificato (`git diff` su `server.js`, `engine/`, `test/` vuoto o limitato a... deve essere vuoto). Nessuna nuova dipendenza; `frontend/package-lock.json` invariato.
11. `npm test` dalla root esce con codice 0 (backend 65 test + frontend smoke + nuovi test puri); `frontend/src/smoke.test.js` verde.
12. Nessun segreto/path personale nei file toccati (grep `sk-[A-Za-z0-9]`, `Bearer `, `C:\Users\...` → nessun match nei file nuovi/modificati); nessun placeholder reale di chiave (se usi valori di test, chiaramente fittizi tipo `FAKE-PLACEHOLDER-KEY`).
13. `git diff -- implementation/plan_state.json` vuoto; nessun commit eseguito da te.

## Self-check richiesto (riporta TUTTO nel messaggio finale)
- Elenco file creati/modificati con motivazione sintetica per ciascuno (inclusi i punti esatti di modifica in `App.jsx` con numeri di riga).
- Conferma dell'approccio gate: come hai risolto l'inserimento dello Step 0 e perché è reversibile; conferma che la numerazione degli step esistenti è intatta.
- Mappa badge→tier implementata (valori esatti) e gestione del caso `tier: null`.
- Come hai gestito la mascheratura della chiave e dove la chiave può comparire nei payload di rete (e dove NO).
- Decisione su Gemini (stub backend): come lo presenti in UI senza promettere funzionalità.
- Decisione su profili edit/delete: conferma che non sono implementati (endpoint assenti) e che lo switch avviene via activate.
- Exit code e output di `npm test` (root).
- Output di `git diff -- implementation/plan_state.json` (atteso: vuoto) e `git status --short` (nessun file backend toccato).
- Esito dei grep di sicurezza sui file toccati (punto 12 della DoD).
- Nota esplicita: il criterio di accettazione e la security checklist saranno verificati da `qa-verifier` e `security-auditor` nel gate successivo.

## DA CHIARIRE (per l'orchestratore, non bloccanti per questa fase)
- **Edit/delete profili:** il backend non espone PUT/DELETE su `/api/ai/profiles` (solo create/list/test/activate). La Fase 3 implementa quindi solo creazione + switch attivo. Se in Fase 7 (o in una fase backend dedicata) vorrai la modifica/eliminazione dei profili, servirà un intervento su `server.js`/`registry` fuori dallo scope frontend di questa fase.
- **Posizione delle "Impostazioni":** non esiste ancora una schermata impostazioni (arriverà col redesign Fase 4/5). La Fase 3 le colloca come pulsante nell'header del wizard + sub-view di gestione dentro `OnboardingAiStep`. Se l'orchestratore preferisce un posizionamento diverso, è una decisione da registrare prima della Fase 4.

## Se questo è un retry
Non applicabile: la Fase 3 è al primo tentativo (`attempts: 0`, nessun report FAIL precedente).