# Task — Fase 2: Layer di astrazione provider IA (backend)

## Obiettivo
Implementare quanto descritto in 1.2 del piano: un layer a Adapter + Registry + Contratto di output fisso che permetta di collegare qualunque provider IA (locale o cloud) e di far produrre sempre il JSON dei 6 intenti (`sub_bass_intent` … `brilliance_intent`, range `-5.0..+5.0`), con fallback deterministico garantito sul motore esistente.

## Contesto
- Sei `backend-ai-dev`. Repo: `C:\Users\yscuo\Desktop\EQ` (git, HEAD `26fd0b5`, working tree con modifiche Fase 0+1 **non committate**). Non committare nulla tu: la commit avviene a fine ciclo dall'orchestratore.
- Fase 0 e Fase 1 sono DONE con gate security=PASS e QA=PASS (report in `implementation/reports/`). Fase 2 è `ready` in `implementation/plan_state.json` (`attempts: 0`): questo è il primo tentativo.
- Harness: `vitest.config.js` include `test/**/*.test.js` (CommonJS, `globals: true`); `npm test` dalla root = `vitest run && npm --prefix frontend test`. Root CommonJS (`"type": "commonjs"`): codice e test in `require()`/`module.exports`. `fetch` globale (Node 18+) è disponibile.
- Stato ri-verificato sul codice reale (righe confermate leggendo i file):
  - `server.js:19-26` — giuntura Fase 2/3: `const WIZARD_AI_PROFILE = process.env.PEQ_WIZARD_AI_PROFILE || 'local-graph';` e `const skipLMStudioForWizard = WIZARD_AI_PROFILE === 'local-graph';` (riga 26), usata a riga 163 nella chiamata a `generateAIFilters`.
  - `server.js:28` — `app.use(cors())` permissivo pre-esistente (Fase 0 §3.1: **non peggiorarlo**).
  - `server.js:294-346` — `POST /api/chat` esiste già, risponde JSON con `reply`, `filters`, `payload`, `baseProfile` (il frontend `App.jsx` legge `data.reply`). La Fase 2 ci aggiunge lo streaming SSE **senza rompere** il contratto JSON attuale.
  - `server.js:369` — bind `127.0.0.1:3001`; `server.js:374` — `module.exports = app` (testabile con Supertest).
  - `engine/aiOrchestrator.js` — `generateAIFilters(aiPayload, userMessage, skipLMStudio)` ha: early-return deterministico (righe 16-23, `desiderata: localDesiderata` da `calculateWeightedArtistProfile`), fetch diretto LM Studio a `http://localhost:1234/v1/chat/completions` con AbortController + timeout 45s e `clearTimeout` in `finally` (righe 88-107), parsing JSON "estremo" con regex `/\{[\s\S]*\}/` (righe 113-117), `console.warn` a riga 139 che logga solo `err.message`. Questi rami LM Studio saranno sostituiti/integrati dal nuovo layer.
  - `engine/graphEngine.js` — `queryAudioGraph` produce `graphFilters`, `extractedFacts` (righe 141, 167: contengono NOMI ARTISTI) e `foundArtists`. I `fact` entrano nel systemPrompt di `aiOrchestrator.js` (riga 39). I nodi da ingestion esterna (`fetchArtistFromExternalAPI`, righe 29-81) sono dati web-derived → **devono passare dalla sanitizzazione prompt-injection**.
  - `.gitignore:11` — `ai-profiles.enc` già ignorato (pattern senza slash: matcha in qualunque sottocartella). `.env.example` vieta già esplicitamente chiavi utente (le rimanda a `ai-profiles.enc`, Fase 2).
  - `engine/ai/` **non esiste ancora**: va creata da zero. `engine/` contiene oggi `aiOrchestrator.js`, `graphEngine.js`, `dspEngine/`, ecc.
- Il criterio di accettazione ufficiale sarà verificato da `qa-verifier` nel gate successivo: i test automatizzati che produci (punto 11) sono la sua evidenza primaria.

## Cosa implementare

### 1. Struttura `engine/ai/` (come da 1.2 del piano)
Creare `engine/ai/` con tutti i moduli, CommonJS:
- `engine/ai/ProviderInterface.js` — contratto astratto (classe base / docs + method stub che lanciano `NotImplemented`).
- `engine/ai/registry.js` — mappa id → adapter, CRUD profili, gestione profilo attivo, persistenza tramite `secretsVault.js`.
- `engine/ai/adapters/openAICompatible.js` — copre LM Studio (`http://localhost:1234/v1`), Ollama (`http://localhost:11434/v1`), OpenAI (`https://api.openai.com/v1`), Groq, OpenRouter (`https://openrouter.ai/api/v1`), endpoint custom. `apiKey` può essere vuota per i provider locali.
- `engine/ai/adapters/anthropic.js` — Claude nativo via `/v1/messages` (header `x-api-key` + `anthropic-version`; `tool_use` per l'output strutturato).
- `engine/ai/adapters/googleGemini.js` — **opzionale** (il piano lo marca opzionale; stessa logica). Se lo implementi, stesso contratto e stessi test del criterio di accettazione; se non lo implementi, dillo nel riepilogo e lascia il file come stub documentato.
- `engine/ai/schema/eqIntentSchema.js` — JSON Schema dei 6 intenti. **UNICA fonte di verità, provider-agnostico**: lo usano `capabilityProbe.js`, `jsonRepair.js`, gli adapter (per il passaggio dello schema), e i test. Nessuna seconda copia dello schema sparsa altrove (né hardcoded nei test).
- `engine/ai/capabilityProbe.js` — test automatico delle capacità del provider collegato (vedi punto 4).
- `engine/ai/jsonRepair.js` — validazione + retry con feedback per provider senza structured output nativo (tier 2, vedi punto 5).
- `engine/ai/secretsVault.js` — cifratura/decifratura profili IA (vedi punto 6).

### 2. Contratto minimo `AIProvider` (ogni adapter lo implementa)
```js
class AIProvider {
  async testConnection() {}                 // → { ok, latencyMs, modelName }
  async getCapabilities() {}                // → { structuredOutput, functionCalling, streaming }
  async chat({ messages, schema, stream }) {}  // → { raw, parsed, tier, usage }
}
```
- `chat()`: `raw` = risposta grezza del provider (mai loggata/restituita al frontend se contiene chiavi); `parsed` = output normalizzato e validato contro `eqIntentSchema.js` (forma suggerita `{ message, desiderata }` con `desiderata` a 6 intenti); `tier` = tier effettivo usato per quella chiamata; `usage` = token/costo se disponibili, altrimenti `null`.
- `stream: true` → il metodo deve supportare lo streaming token-by-token (usato dal canale SSE del punto 8); il contratto esatto degli eventi è tua scelta purché documentato nel file.

### 3. `eqIntentSchema.js` — unica fonte di verità
Schema che valida l'oggetto `desiderata`: esattamente le 6 chiavi `sub_bass_intent`, `mid_bass_intent`, `low_mids_intent`, `high_mids_intent`, `presence_intent`, `brilliance_intent`, ognuna `number` in `[-5.0, 5.0]`, tutte obbligatorie. Deve poter validare anche l'oggetto completo `{ message, desiderata }`. Deve rifiutare: chiavi mancanti/extra, valori fuori range, tipi non numerici. Implementa la validazione con un helper puro (es. `validateIntentPayload(obj) → { valid, errors }`) senza dipendenze esterne, così funziona anche sotto test con provider mock.

### 4. `capabilityProbe.js` — assegnazione tier al collegamento
Al test di un provider (`POST /api/ai/profiles/:id/test` e al momento dell'attivazione):
- Esegue `testConnection()`, poi una chat di prova con **lo schema reale** (`eqIntentSchema.js`): un mini-prompt che richiede il JSON dei 6 intenti per un caso noto.
- Determina il tier con questa semantica:
  - **Tier 1 — Nativo**: il provider dichiara/supporta structured output o function calling reale (OpenAI `response_format`/`json_schema`, Claude `tool_use`, LM Studio con grammar/json_schema) E la risposta supera la validazione JSON Schema al primo colpo.
  - **Tier 2 — Prompt-guidato**: nessun structured output nativo, ma la risposta è recuperabile con prompt rigido + 1 retry con feedback (`jsonRepair.js`).
  - **Tier 3 — Inaffidabile**: fallisce la validazione anche dopo il retry, o errore/timeout/HTTP non-2xx. Il provider resta disponibile **solo per la chat conversazionale**; la generazione EQ ricade sul motore deterministico (`graphEngine.js`).
- Il probe non deve **mai** crashare: qualunque eccezione/timeout → tier 3. Timeout esplicito su ogni fetch (coerente con i 45s esistenti), `clearTimeout` in `finally`. Ritorna `{ ok, tier, latencyMs, modelName, details }`.

### 5. `jsonRepair.js` — retry con feedback (tier 2)
Per i provider senza structured output nativo: costruire un prompt rigido che impone il formato JSON; estrarre il JSON dalla risposta (la regex `/\{[\s\S]*\}/` già usata in `aiOrchestrator.js:113-117` è un buon punto di partenza, migliorarla se serve); validare con `eqIntentSchema.js`; se invalido → **1 solo retry** aggiungendo nel messaggio di ritorno l'**errore di validazione** (feedback concreto: "manca la chiave x", "valore fuori range") come istruzione di correzione. Mai loop infiniti (max 1 retry). Se anche dopo il retry è invalido → esito tier 3 per quella chiamata.

### 6. `secretsVault.js` — cifratura profili, interfaccia pronta per `safeStorage`
- API minima (async): `encrypt(plaintext) → ciphertext`, `decrypt(ciphertext) → plaintext`, `saveProfiles(profiles)` (scrive il file cifrato), `loadProfiles()` (legge e decifra). Design a tua scelta ma documentato.
- **Interfaccia pronta per Electron `safeStorage`**: i metodi devono essere gli stessi che in Electron useranno `safeStorage.encryptString`/`decryptString` (la Fase Electron sostituirà solo l'implementazione interna, non i call site). 
- **Fallback dev-only** (Fase 2 gira in Node puro, senza Electron): implementazione locale con `node:crypto` (es. AES-256-GCM). Deve essere **chiaramente segnalata come NON sicura per produzione**: `console.warn` una tantum all'avvio con messaggio esplicito (senza dati personali) + commento in testa al file. In dev la chiave resta nel processo (mai scritta su disco).
- File dei profili: `ai-profiles.enc` (già coperto da `.gitignore:11`), in un percorso **fuori da qualsiasi file versionato** (default suggerito `./data/ai-profiles.enc`; se crei la cartella `data/` aggiungi `data/` a `.gitignore` per sicurezza). Percorso configurabile via env (es. `PEQ_AI_PROFILES_PATH`) — non serve toccare `.env.example` a meno che tu non voglia documentare la variabile (facoltativo, e comunque nessuna chiave dentro).
- **Mai chiavi in chiaro** in file di stato versionabili, mai in log. Il file `ai-profiles.enc` NON deve contenere la chiave API in plaintext (verificalo con un test: grep della chiave di test dentro il file → nessun match).

### 7. `registry.js` — CRUD profili + profilo attivo
- Modello profilo: `{ id, name, type: 'openai-compatible'|'anthropic'|'google-gemini', baseUrl, model, apiKey (cifrata via secretsVault, mai esposta), tier, active, createdAt, updatedAt }`. `id` da `crypto.randomUUID()`.
- API: `createProfile`, `getProfile(id)`, `listProfiles()` (mai con `apiKey` — esporre solo `hasApiKey: true/false`), `updateProfile`, `deleteProfile`, `setActiveProfile(id)`, `getActiveProfile()`. Persistenza su `ai-profiles.enc` tramite `secretsVault.js` (caricamento all'avvio, salvataggio a ogni mutazione).
- Attenzione ai fallimenti di persistenza: se il file non esiste al primo avvio → lista vuota, nessun crash; se il file è corrotto/decifrabile → log di warning generico senza dati sensibili e partenza con lista vuota (mai crash all'avvio).

### 8. Endpoint REST in `server.js`
Aggiungere i 4 endpoint (stessa app Express esportata, stesso stile di errori `{ success:false, error }`):
- `POST /api/ai/profiles` — body `{ name, type, baseUrl?, apiKey?, model? }`. Valida `type` (solo i valori supportati) e `name` non vuoto. Ritorna il profilo **senza chiave**. Con `apiKey` vuota per provider locali.
- `GET /api/ai/profiles` — lista profili senza chiavi, con flag `active`.
- `POST /api/ai/profiles/:id/test` — esegue `testConnection()` + `capabilityProbe()` con lo schema reale → `{ ok, tier, latencyMs, modelName }`. Non rende il profilo attivo.
- `POST /api/ai/profiles/:id/activate` — esegue il probe se non ancora fatto, imposta il profilo come attivo, persiste. Un solo profilo attivo alla volta (attivare uno disattiva gli altri).
- Tutti gli errori sanitizzati (vincolo sotto). Nessun timeout pendente: ogni chiamata verso il provider ha timeout esplicito.

### 9. Streaming SSE su `/api/chat`
- Predisporre il canale SSE per la chat persistente della Fase 6: `Content-Type: text/event-stream`, eventi `data:` (delta di testo + evento finale con l'output strutturato se disponibile), heartbeat opzionale, chiusura pulita su `req.on('close')` con abort del fetch, timeout esplicito.
- **Non rompere il contratto JSON attuale** di `POST /api/chat` (`server.js:294-346`, `App.jsx` legge `data.reply`): se preferisci un endpoint separato (es. `POST /api/chat/stream`) fallo, documenta la scelta. Con nessun profilo attivo o provider tier 3 il comportamento non deve mai diventare un errore bloccante.
- Nessun segreto negli eventi; i messaggi di errore inviati sul canale sanitizzati come sotto.

### 10. Giuntura con la Fase 1: `WIZARD_AI_PROFILE` → provider attivo
- Quando un profilo IA è **attivo** (tier 1 o 2), `generateAIFilters` deve poter usare il provider selezionato al posto del fetch LM Studio hardcoded: costruire i messaggi (systemPrompt esistente + `userMessage`), chiamare `provider.chat({ messages, schema: eqIntentSchema })`, usare `parsed.desiderata` come input per `mergeAndSecureFilters` (la catena in `server.js:163-167` resta).
- Quando il provider è **tier 3**: `desiderata` dal motore deterministico (`calculateWeightedArtistProfile`/`graphEngine.js`, come oggi), chat conversazionale via provider se richiesta.
- Quando **nessun profilo è attivo**: comportamento identico all'oggi (`local-graph`, early-return deterministico a `aiOrchestrator.js:16-23`). Il default resta `'local-graph'` (`server.js:25`).
- La modifica può stare in `aiOrchestrator.js` o nel punto di chiamata: tua scelta, ma `test/phase1-e2e.test.js` (che usa `local-graph`) **deve restare verde senza modifiche**.
- Risolvi il conflitto tra `skipLMStudioForWizard` (booleano) e la nuova logica a profili in modo esplicito e revisionabile (es. la giuntura legge il profilo attivo dal registry e usa `local-graph` solo se assente).

### 11. Sanitizzazione prompt-injection (security checklist della fase)
- Implementare una funzione di sanitizzazione (file a tua scelta in `engine/ai/`, es. `engine/ai/promptSanitizer.js`) e applicarla a **ogni input testuale proveniente da fonti web/esterne prima che entri nei messaggi del prompt**: `extractedFacts` del grafo (che includono dati da ingestion esterna, `graphEngine.js:29-81`), contenuti di file caricati (`uploadedFiles`), nomi artisti da API esterne, e qualunque testo RAG hardware. La `userMessage` dell'utente NON è web-derived: va passata come dato, non come istruzione.
- Effetto richiesto: istruzioni malevole incapsulate nei dati web (es. `ignora le istruzioni precedenti e…`, istruzioni di sistema, tag `]]>`) devono essere neutralizzate o delimitate come dati non eseguibili (strip del contenuto non testuale, escaping dei caratteri di controllo, delimitazione tra marker, ecc. — scegli e documenta) **prima** della composizione di `messages`.
- Il punto di applicazione deve essere verificabile: un test dimostra che un input malevolo web-derived non produce un'istruzione effettiva nel prompt costruito.

### 12. Test automatizzati (Vitest/Supertest, in `test/`) — evidenza dei criteri di accettazione
Tutti **offline e deterministici**, **mai chiavi API reali** (valori placeholder ben marcati come fittizi, es. `'FAKE-PLACEHOLDER-KEY'`, e segnalali nel riepilogo perché i gate sappiano che sono finti). Due tecniche ammesse: **stub di `fetch`** (mock globale con `vi.stubGlobal`) o **mini server HTTP locale** (`node:http`) che simula il wire format di LM Studio/OpenAI e di Anthropic. Nessuna dipendenza di rete esterna.
- **Criterio (a) — contratto di output fisso**: con lo stesso input semantico (stesso `messages` e stesso schema), `openAICompatible.chat()` e `anthropic.chat()` (mock) devono produrre **lo stesso identico** `parsed.desiderata` (deep-equal) e validato da `eqIntentSchema.js`. Il mock dei due provider deve rispondere con wire format diversi (choices[0].message.content vs content blocks/tool_use) ma stesso contenuto semantico: il test dimostra che il layer normalizza in un unico JSON.
- **Criterio (b) — provider rotto degrada a tier 3 senza crash**: un adapter/mock che risponde con HTTP 500 o JSON non valido (anche dopo il retry) → `capabilityProbe` assegna tier 3; poi un test che attiva quel profilo e chiama il flusso EQ (via `generateAIFilters` e/o `POST /api/calculate-eq` con Supertest) → **risposta 200, filtri dal motore deterministico, nessun crash** (nessuna eccezione non gestita, il processo test non muore).
- Test di schema: `eqIntentSchema.js` accetta un payload valido e rifiuta (a) chiavi mancanti, (b) valore fuori range (±5.0), (c) tipo non numerico.
- Test endpoint (Supertest sull'app esportata): CRUD completo di `POST`/`GET /api/ai/profiles`, `POST /:id/test` (tier assegnato), `POST /:id/activate` (un solo attivo alla volta). `GET` non espone mai `apiKey` (asserzione sul body).
- Test `secretsVault`: round-trip encrypt/decrypt; il file `ai-profiles.enc` di test (in dir temporanea, es. `os.tmpdir()`) NON contiene la chiave in plaintext.
- Test sanitizzazione: input malevolo web-derived → il prompt costruito non contiene l'istruzione malevola come istruzione attiva.
- Smoke test streaming: il canale SSE risponde `text/event-stream` e chiude; il contratto JSON di `POST /api/chat` continua a funzionare (regressione).
- **Regressione**: `test/phase1-e2e.test.js` e `test/smoke.test.js` (Fase 0+1) devono restare verdi senza modifiche (se una modifica li richiede, motivarla nel riepilogo).
- I test NON devono creare `ai-profiles.enc` nella posizione reale dell'utente: usare dir temporanea o mock del vault.

## Vincoli non negoziabili
- **Sezione 1.3 del piano (vale per ogni fase):** nessuna API key, endpoint privato o token in codice, `.git`, log o file di stato in chiaro. Profili IA cifrati (`ai-profiles.enc`) fuori dal repo, in prospettiva `safeStorage`/userData di Electron; in Fase 2 fallback dev-only **marcato come non sicuro per produzione**. `.env` resta solo per variabili di sviluppo locali. MAI una chiave in chiaro su disco o nei log.
- **Security checklist della Fase 2:**
  1. **Nessuna chiave in log o errori restituiti al frontend.** Gli errori dei provider (401/403/429, body di risposta) NON vanno mai propagati grezzi: sanitizza (`status` + messaggio generico), non loggare mai body di risposte né URL con credenziali, mai `err.message`/`err.stack` che possano contenere la chiave. I nuovi `console.*` della fase non devono contenere chiavi, endpoint privati, né dati personali (nomi artisti/hardware — la Fase 1 ha rimosso i log con nomi artisti: **non reintrodurli**).
  2. **Sanitizzazione prompt-injection** applicata a tutti gli input testuali web-derived prima della composizione del prompt (punto 11).
- **Fase 0 §3.1 (CORS):** `app.use(cors())` permissivo (`server.js:28`) è pre-esistente. **Non peggiorarlo.** Questa fase introduce superfici di rete nuove (4 endpoint + SSE + fetch verso provider cloud): valuta se questa è la sede per restringere CORS a un'allowlist di origini locali (es. `http://localhost:5173` in dev) o se va lasciato alla Fase 7 hardening — in ogni caso **NON peggiorarlo** e **segnala la tua raccomandazione/decisione nel riepilogo finale**. Segnala anche se il nuovo codice di rete introduce altre superfici degne di nota.
- **Fase 0 §3.3:** gitleaks vive solo nel pre-commit hook locale: non introdurre nulla che il hook debba intercettare; mantieni i placeholder delle chiavi nei test chiaramente fittizi.
- **Fase 0 §3.4:** rate limiting assente sugli endpoint verso servizi terzi — fuori scope Fase 2 (destinato alla Fase 7): non peggiorare la situazione; nota che l'unico nuovo endpoint che tocca servizi terzi è `POST /api/ai/profiles/:id/test` (azione esplicita dell'utente).
- Guardrails fisici invariati: gain `[-12, +9]` dB e Q `[0.5, 3.5]` restano hard limit in `coreCalculator.js`; il layer IA produce SOLO i 6 intenti semantici, mai frequenze/Q/gain fisici (competenza esclusiva di `coreCalculator.js`).
- Timeout esplicito su ogni fetch verso servizi esterni (provider, LM Studio, ecc.), `clearTimeout` in blocco `finally`. Abort del fetch quando il client SSE si disconnette.
- CommonJS alla root; niente nuove dipendenze se non strettamente necessarie (preferisci `node:crypto`; se aggiungi una dipendenza, motivala e verifica `npm audit`).
- **Non toccare `implementation/plan_state.json`** (lo aggiorna solo l'orchestrator): il tuo `git diff` su quel file deve restare vuoto.
- **Non committare**: modifiche nel working tree; la commit avviene a fine ciclo. `engine/knowledge_graph.json` e `ai-profiles.enc` restano fuori dal repo.
- **Non invocare altri agenti** (`permission.task` negato): lavora in autonomia.
- Se incontri un blocco tecnico non previsto, riportalo nel messaggio finale con i dettagli invece di aggirarlo silenziosamente.

## Definition of Done (tutte verificabili, verificale tu stesso prima di dichiararti finito)
1. `engine/ai/` esiste con tutti i moduli del punto 1 (gemini opzionale: stub documentato o implementazione); ogni modulo si carica senza errori (`node -e "require('./engine/ai/<modulo>')"`).
2. `eqIntentSchema.js` è l'UNICA fonte di verità dei 6 intenti: usato da probe, jsonRepair, adapter e test; i test provano che accetta payload validi e rifiuta chiavi mancanti/valori fuori range/tipi errati.
3. **Criterio di accettazione ufficiale (a):** stesso identico JSON di output (6 intenti validi, range `-5.0..+5.0`) da almeno due adapter diversi (`openAICompatible` + `anthropic`) con lo stesso input semantico — dimostrato da test offline con mock/stub (deep-equal + validazione schema).
4. **Criterio di accettazione ufficiale (b):** un provider "rotto" di test degrada a tier 3 (probe e/o chat) senza crashare l'app: il flusso EQ risponde comunque 200 con filtri dal motore deterministico.
5. `capabilityProbe.js` assegna i tier 1/2/3 con la semantica del punto 4 e non crasha mai (probe con provider rotto → tier 3, mai eccezione non gestita).
6. `jsonRepair.js` esegue esattamente 1 retry con feedback dell'errore di validazione per i provider tier 2 e non entra in loop.
7. `secretsVault.js`: interfaccia safeStorage-ready documentata, fallback dev-only marcato non sicuro (warn + commento), round-trip encrypt/decrypt funzionante, file `ai-profiles.enc` senza chiavi in plaintext (testato), mai in percorsi versionati.
8. I 4 endpoint REST esistono e passano i test Supertest; `GET /api/ai/profiles` e `POST /api/ai/profiles` non espongono mai `apiKey`; `activate` rende attivo un solo profilo.
9. Streaming SSE su `/api/chat` presente (endpoint separato o content negotiation, scelta documentata); il contratto JSON pre-esistente di `POST /api/chat` continua a funzionare (regressione testata).
10. Giuntura Fase 1: con profilo attivo il flusso usa il provider selezionato; con tier 3 o nessun profilo il comportamento resta deterministico (`local-graph`); `test/phase1-e2e.test.js` verde senza modifiche.
11. Sanitizzazione prompt-injection implementata e testata: un input web-derived malevolo non produce istruzioni attive nel prompt.
12. `npm test` dalla root esce con codice 0 (backend: nuovi test + regressione Fase 0/1; frontend invariato).
13. Nessun segreto/path personale nei file toccati (grep `sk-`, `Bearer `, `C:\Users\...` → nessun match nei file nuovi/modificati; i placeholder di test sono marcati fittizi); nessun nuovo `console.*` con chiavi, endpoint privati o dati personali.
14. `git diff -- implementation/plan_state.json` vuoto; CORS non peggiorato; raccomandazione §3.1 (restringere ora o in Fase 7) segnalata nel riepilogo.

## Self-check richiesto (riporta TUTTO nel messaggio finale)
- Elenco file creati/modificati con motivazione sintetica per ciascuno.
- Decisioni progettuali rilevanti: forma di `parsed`/contratto SSE, posizione della sanitizzazione, scelta della persistenza del vault (percorso + env), scelta sul CORS (§3.1: ristretto ora o lasciato alla Fase 7 — e perché), conferma che §3.4 (rate limiting) non è stato toccato, conferma che i placeholder delle chiavi di test sono fittizi.
- Exit code e output di `npm test` (root) e dei test mirati (`test/ai-*.test.js` singoli).
- Output di `git diff -- implementation/plan_state.json` (atteso: vuoto).
- Esito dei grep di sicurezza sui file toccati.
- Nota esplicita: il criterio di accettazione sarà verificato da `qa-verifier` nel gate successivo del ciclo; i test dei punti 3 e 4 sono l'evidenza primaria.

## Se questo è un retry
Non applicabile: la Fase 2 è al primo tentativo (`attempts: 0`, nessun report FAIL precedente).