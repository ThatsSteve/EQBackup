# Security Audit — Fase 2: Layer di astrazione provider IA (backend)

**Data:** 2026-08-18
**Auditor:** security-auditor (permessi: sola scrittura `implementation/reports/*`)
**Commit di riferimento:** `26fd0b5` (unico commit; working tree + index contengono modifiche Fase 0/1 NON committate + modifiche Fase 2 NON committate)
**Esito complessivo:** **PASS**

---

## 1. Contesto e scope del diff

La Fase 2 implementa il layer di astrazione provider IA: `engine/ai/` (ProviderInterface, registry, schema/eqIntentSchema, capabilityProbe, jsonRepair, secretsVault, promptSanitizer, adapter openAICompatible/anthropic + stub googleGemini), 4 endpoint REST profili, canale SSE `/api/chat/stream`, giuntura provider attivo in `generateAIFilters`, sanitizzazione prompt-injection, e 8 file di test `test/ai-*.test.js`.

**File nuovi (Fase 2):** `engine/ai/*` (10 file), `test/ai-{vault,schema,sanitizer,registry,probe,jsonrepair,adapter,endpoints}.test.js` (8 file).

**File modificati (Fase 2):** `server.js` (import layer AI + 4 endpoint + SSE + refactor `buildStructuredPayload`), `engine/aiOrchestrator.js` (giuntura registry + sanitizzazione), `.gitignore` (+`/data/`), `.env.example` (documentata `PEQ_AI_PROFILES_PATH`).

**File modificati (Fasi 0/1, nel working tree, inclusi nella scansione per regressioni):** `engine/graphEngine.js`, `engine/dspEngine/coreCalculator.js`, `engine/dspEngine/genreArtistMatrix.js`, `.gitignore` (Fase 0), `.opencode/agents/*.md` (Fase 0), `package.json`/lock (root+frontend, Fase 0), `test/phase1-e2e.test.js`/`test/smoke.test.js` (Fase 0/1). `implementation/plan_state.json` modificato solo dall'orchestrator (`current_phase: 2`, status `security_review`) — non oggetto di audit.

---

## 2. Check eseguiti ed evidenze

### 2.1 Segreti

| Check | Esito | Evidenza |
|---|---|---|
| Chiavi API/token in codice (`engine/ai/`, `server.js`, `aiOrchestrator.js`, `test/ai-*.test.js`) | ✅ nessun match | Grep `sk-[A-Za-z0-9]{16,}`, `ghp_`, `gho_`, `AKIA`, `xox[baprs]-`, `-----BEGIN`, `AIza...` → **No files found**. Nessuna URL con credenziali inline (`://user@`) |
| Placeholder nei test chiaramente fittizi | ✅ | Tutti i valori chiave nei test sono `FAKE-PLACEHOLDER-KEY` o `SUPER-SECRET-FAKE-PLACEHOLDER-KEY-123456` (7 file test); non matchano pattern gitleaks ad alta segnatura; nessuna chiave reale |
| `.env` reali / `.env.example` | ✅ | Solo `.env.example` (untracked, versionabile); contiene `PORT`, `EAPO_CONFIG_DIR` (path di installazione generico E-APO) e `PEQ_AI_PROFILES_PATH` documentata come *commento* con nota esplicita "la variabile NON contiene chiavi". Nessun `.env` reale |
| `.gitignore` copre segreti/profili/dati | ✅ | `*.env` + `!.env.example`, `ai-profiles.enc`, `/data/` (nuovo Fase 2), `/engine/knowledge_graph.json`. `git status --ignored --short` conferma `!! data/` e `!! engine/knowledge_graph.json` (ignorati). `data/` su disco è vuota: nessun `ai-profiles.enc` creato da test (usano `os.tmpdir()`) |
| Segreti in log e risposte HTTP di errore | ✅ | Nessuna credenziale nei `console.*` dei file nuovi/modificati; tutti gli errori dei 4 nuovi endpoint e del canale SSE sono messaggi generici fissi (`'Impossibile creare il profilo.'`, `'Test del provider non riuscito.'`, ecc.) |
| History git | ✅ | Unico commit `26fd0b5`; nessun commit con segreti (limite noto da Fase 0) |
| Log orchestratore untracked in root | ✅ | `run-orchestrator.log/err`, `test-detach.log` scanditi: nessun segreto/chiave/endpoint privato (solo output git status e ping loopback) |

### 2.2 secretsVault.js (fallback dev-only)

| Check | Esito | Evidenza |
|---|---|---|
| File `ai-profiles.enc` senza chiavi in plaintext | ✅ | `saveProfiles` cifra `JSON.stringify(profiles)` in AES-256-GCM (righe 83-87); test `test/ai-vault.test.js:42-49` asserisce che il file letto non contiene né la chiave né la stringa `apiKey` |
| Fallback dev-only marcato non sicuro | ✅ | Header del file (righe 6-13) "IMPLEMENTAZIONE DEV-ONLY — NON SICURA PER PRODUZIONE" + `console.warn` una tantum senza dati personali (righe 33-42) |
| Chiave mai scritta su disco | ✅ | Chiave effimera `crypto.randomBytes(32)` solo in memoria (riga 60); mai passata a `saveProfiles`/`loadProfiles`; decifratura non sopravvive al riavvio (documentato) |
| Percorso default fuori da file versionati | ✅ | `DEFAULT_PATH = <root>/data/ai-profiles.enc` (riga 29), coperto da `/data/` in `.gitignore`; configurabile via `PEQ_AI_PROFILES_PATH`; test `ai-vault.test.js:62-68` verifica che il path non punti in `engine/` o `test/` |
| File corrotto/illeggibile → nessun crash | ✅ | `loadProfiles` catch → warning generico (righe 98-103, via `sanitizeErrorMessage` che ritorna solo `'errore interno del vault'`, mai `err.message`) + lista vuota; test presente |

### 2.3 Errori provider sanitizzati / log

| Check | Esito | Evidenza |
|---|---|---|
| Mai `err.message`/`err.stack`/body di risposta con credenziali al frontend | ✅ | Adapter: `_rawChat` ritorna `{status}` su HTTP non-2xx senza body (openAICompatible.js:130-132, anthropic.js:147-149); streaming emette `httpStatusMessage(status)` generico (ProviderInterface.js:62-76). `capabilityProbe` catch → tier 3 senza loggare l'eccezione (righe 94-103). Endpoint `/:id/test` restituisce solo `{success, tier, latencyMs, modelName}`, mai `details`/`raw`. `generateAIFilters` non propaga mai `raw` |
| Nessun `console.*` nuovo con chiavi/endpoint privati/dati personali | ✅ | Tutti i `console.warn` nuovi sono generici: `secretsVault.js:38` (warning dev-only), `secretsVault.js:101` (vault), `registry.js:56` (registry), `aiOrchestrator.js:166` ("Provider attivo non disponibile"). Nessuno contiene chiavi, URL con credenziali o nomi artisti/hardware. `capabilityProbe.js` non contiene alcun `console.*` |
| Nessuna regressione rispetto alla Fase 1 (log con nomi artisti) | ✅ | `genreArtistMatrix.js` resta senza log diagnostici (commento esplicativo al posto dei `[ARTIST ENGINE DIAGNOSTIC]`); la Fase 2 non aggiunge log con nomi artisti. I `console.log` con nomi artisti in `graphEngine.js:31,41,49,65,73,76` (ingestion esterna) sono **pre-esistenti e invariati** (già segnalati in Fase 1 §3.2) |

### 2.4 Sanitizzazione prompt-injection

| Check | Esito | Evidenza |
|---|---|---|
| Input web-derived sanitizzato prima della composizione dei messages | ✅ | `promptSanitizer.js` applicato a **tutti** gli `extractedFacts` del grafo (che includono i nomi/genere artisti da ingestion iTunes/MusicBrainz, `graphEngine.js:167`) in **entrambi** i punti di composizione: `aiOrchestrator.js:124` (`sanitizePromptData(extractedFacts).slice(0,8)` prima di `buildMessages`) e `server.js:454` (canale SSE). I fatti sanitizzati vengono ulteriormente delimitati con `wrapAsExternalData` (`aiOrchestrator.js:23`) |
| Tecnica documentata e verificabile | ✅ | "neutralizza + delimita": strip tag XML/HTML e `]]>`, rimozione caratteri di controllo C0/C1, neutralizzazione istruzioni malevole note EN/IT, marker `[DATO ESTERNO NON ESECUTIBILE] ... [/DATO]` |
| Test di efficacia | ✅ | `test/ai-sanitizer.test.js:38-49`: un fatto malevolo web-derived (`ignora tutte le istruzioni precedenti...]]>`, `ignore all previous instructions`) non produce istruzioni attive nel prompt costruito via `buildMessages`; il dato legittimo ("Daft Punk") resta presente solo delimitato |
| `userMessage` trattata come dato utente, non web-derived | ✅ | Va nel ruolo `user` senza sanitizzazione (scelta documentata in `promptSanitizer.js:15-16` e `aiOrchestrator.js:87-89`), coerente con la specifica |

### 2.5 Superficie di rete

| Check | Esito | Evidenza |
|---|---|---|
| Bind/porta invariati | ✅ | `server.js:515` → `app.listen(PORT, '127.0.0.1', ...)`, `PORT=3001` (riga 25) |
| CORS NON peggiorato | ✅ | `app.use(cors())` (server.js:36) invariato — permissivo pre-esistente (Fase 0 §3.1). La Fase 2 non lo tocca. Nota di rischio in §3.1 |
| Timeout espliciti con `clearTimeout` in `finally` | ✅ | OpenAI-compatible: `testConnection` (74/91), `_rawChat` (122/148), `_chatStream` (180/251). Anthropic: `_rawChat` (139/153), `_chatStream` (182/256). Tutti con `AbortController` + `setTimeout(this.timeoutMs)` + `clearTimeout` in `finally` + cleanup listener esterno |
| SSE: abort su disconnessione client | ✅ | `server.js:446-449` → `req.on('close')` → `controller.abort()`; il signal viene propagato agli adapter (`signal` nei fetch); heartbeat `setInterval` (15s) terminato in `finally` (riga 488); `res.end()` in `finally` |
| Rate limiting | ⚠️ segnalato | Non introdotto (invariato, assente da Fase 0 §3.4); unico nuovo endpoint verso servizi terzi: `POST /api/ai/profiles/:id/test` (azione esplicita dell'utente). Fuori scope Fase 2 → Fase 7 |
| Nuove superfici degne di nota | ⚠️ §3.1 | 4 endpoint + SSE; nessuna superficie senza gestione errori/timeout; vedi nota CORS |

### 2.6 Regressioni Fasi 0/1

| Check | Esito | Evidenza |
|---|---|---|
| `npm test` (root, pipeline completa) | ✅ exit 0 | Backend: **10 file test / 65 test pass** (inclusi `phase1-e2e` e `smoke` Fase 0/1, invariati); frontend: 1 file/1 test pass |
| Fix Fase 1 non riesposti | ✅ | `genreArtistMatrix.js` senza log nomi artisti; `coreCalculator.js` guardrails su tutta la curva + preamp combinato; `graphEngine.js` `recommended_modifiers` dai nodi locali; `server.js` `require.main === module` + bind invariato |
| Test Fase 2 offline e senza effetti collaterali | ✅ | Nessun `fetch` reale (stub globali `vi.stubGlobal`); vault dei test reindirizzato su `os.tmpdir()` (`ai-endpoints.test.js:9-10`, `ai-vault/registry` con dir temporanee); nessuna scrittura su EqualizerAPO (grep `writeFile` → solo tmpdir); nessuna chiave reale |
| Nessuna regressione sul contratto `/api/chat` JSON | ✅ | Test `ai-endpoints.test.js:195-211` verifica `data.reply` e `success:true`; SSE su endpoint separato (`/api/chat/stream`) come da scelta documentata |

### 2.7 Dipendenze

| Check | Esito | Evidenza |
|---|---|---|
| Nuove dipendenze Fase 2 | ✅ nessuna | Diff `package.json` root+frontend = integralmente Fase 0 (`vitest`, `supertest`, `husky`); il layer IA usa solo `node:crypto`, `fs`, `path`, `fetch` globale. Nessuna dipendenza nuova nello scope Fase 2 |
| `npm audit --audit-level=high` (root) | ✅ | `found 0 vulnerabilities` |
| Frontend (pre-esistenti, non Fase 2) | ⚠️ | `nanoid <3.3.18` (high, GHSA-2v37-7h3g-55p8) e `postcss <=8.5.22` (moderate) — stessi advisory della Fase 0/1, introdotti dal lock di base, non toccati dalla Fase 2 (nessun diff frontend) |

---

## 3. Vulnerabilità trovate

**Nessuna vulnerabilità critica o alta introdotta dalla Fase 2.** Nessun problema di severità alta/critica aperto sulle modifiche della fase.

Problemi minori / pre-esistenti registrati come **da monitorare** (non bloccanti, nessuno introdotto o peggiorato da questa fase):

### 3.1 (media — pre-esistente amplificato, NON peggiorato) CORS permissivo + nuove superfici di rete
- **File/riga:** `server.js:36` (`app.use(cors())`) + nuovi endpoint `server.js:361-492`
- **Descrizione:** il CORS `*` pre-esistente, combinato con le nuove superfici della Fase 2, espone a un sito web malevolo (raggiungibile via browser su `http://127.0.0.1:3001`): (a) creazione/attivazione di profili IA con `baseUrl` arbitrario, (b) uso di `POST /api/ai/profiles/:id/test` come oracolo di esistenza/raggiungibilità di servizi interni al dispositivo (SSRF-probe), (c) possibile drenaggio della quota API del provider attivo dell'utente tramite chiamate ripetute a `/api/chat` e `/api/chat/stream`, (d) iniezione di testo arbitrario nella chat se un profilo malevolo viene attivato. **Mitigazioni attuali:** bind `127.0.0.1`, risposte di probe senza body di risposta (`{ok, tier, latencyMs, modelName}`), desiderata validati da schema prima dell'uso DSP, nessun segreto esposto dalle risposte. La Fase 2 **non** peggiora la direttiva CORS.
- **Azione (Fase 7 hardening, come da §3.1 dei report Fase 0/1):** restringere CORS a un'allowlist di origini locali esplicite (es. `http://localhost:5173`) o introdurre un token/CSRF locale per gli endpoint mutanti (`/api/ai/profiles*`, `/api/chat*`); opzionale rate-limit su `/:id/test`.

### 3.2 (bassa — pre-esistente, INVARIATO) Rate limiting assente
- **File:** `server.js` (`/api/resolve-artist`, `/api/sync-autoeq`, `/api/hardware/resolve`, nuovi `/api/ai/profiles/:id/test`)
- **Descrizione:** già registrato in Fase 0 §3.4 e Fase 1 §3.4; la Fase 2 non introduce rate limiting né peggiora (l'unico nuovo endpoint verso terzi è l'azione esplicita di test del profilo). Fase 7.

### 3.3 (bassa — pre-esistente, INVARIATO) Vulnerabilità frontend nel lock di base
- **File:** `frontend/package-lock.json` — `nanoid <3.3.18` (high) e `postcss <=8.5.22` (moderate)
- **Descrizione:** Fase 0 §3.2 / Fase 1 §3.5; la Fase 2 non tocca le dipendenze frontend.

### 3.4 (bassa — pre-esistente, INVARIATO) Log con nomi artisti nell'ingestion esterna
- **File/righe:** `engine/graphEngine.js` 31, 41, 49, 65, 73, 76 (`fetchArtistFromExternalAPI`)
- **Descrizione:** pre-esistenti, già segnalati in Fase 1 §3.2; la Fase 2 non li modifica né aggiunge log simili. Fase 7: abbassare a debug o rimuovere i nomi in chiaro.

### 3.5 (bassa — igiene repo) File untracked dell'orchestratore nella root
- **File:** `run-orchestrator.log`, `run-orchestrator.err`, `run-orchestrator.pid`, `test-detach.log`, `test-detach.pid`
- **Descrizione:** untracked in root, senza segreti (scanditi). Vanno rimossi o aggiunti a `.gitignore` prima della pubblicazione per evitare commit accidentali.

### 3.6 (bassa — nota di design, documentata) Vault dev-only: profili non decifrabili dopo il riavvio
- **File:** `engine/ai/secretsVault.js:59-60`
- **Descrizione:** la chiave effimera in memoria rende `ai-profiles.enc` non decifrabile dopo un riavvio del processo → perdita della configurazione profili con warning generico. È il comportamento dev-only documentato (non un bug di sicurezza); in Electron verrà sostituito da `safeStorage` (interfaccia già pronta).

### 3.7 (bassa — nota) `data/` dentro il working tree (gitignorata)
- **File:** `.gitignore:14`, `engine/ai/secretsVault.js:29`
- **Descrizione:** il default `./data/ai-profiles.enc` è dentro la cartella di progetto ma coperto da `/data/` (verificato `git status --ignored` → `!! data/`). Coerente con la specifica Fase 2; in prospettiva Electron il file andrà in `app.getPath('userData')`, fuori dal progetto.

---

## 4. Conclusioni

- **Diff reale della fase:** verificato e coincidente con la dichiarazione del dev: `engine/ai/` (10 moduli), `test/ai-*.test.js` (8 file), `server.js`, `engine/aiOrchestrator.js`, `.gitignore` (+`/data/`), `.env.example` (+`PEQ_AI_PROFILES_PATH` documentata). I diff di package.json/lock, agenti e parte di `.gitignore` sono integralmente Fase 0 (confronto con report Fase 0/1).
- **Checklist Fase 2 (prompt, punti 11-12 + vincoli):** nessuna chiave in log/errori al frontend ✅; sanitizzazione prompt-injection su tutti gli input web-derived con test ✅; CORS non peggiorato ✅ (raccomandazione §3.1: restringere in Fase 7); rate-limit non introdotto ✅ (segnalato, Fase 7); timeout espliciti su ogni fetch con `clearTimeout` in `finally` ✅; `clearTimeout`/`clearInterval` + abort in `finally` sul canale SSE ✅; `git diff -- implementation/plan_state.json` = solo update dell'orchestrator (status `security_review`) ✅; nessuna nuova dipendenza ✅.
- **Checklist standard esteso:** segreti ✅ (0 match nei file toccati e nei log; placeholder di test fittizi e non usabili), bind `127.0.0.1:3001` invariato ✅, vault senza chiavi in plaintext su disco ✅ (testato), errori provider sanitizzati ✅, nessun `console.*` nuovo con dati sensibili ✅, `npm audit` root 0 vulnerabilità ✅, `npm test` exit 0 (65 test backend) ✅, test offline e senza scritture E-APO ✅, regressione Fase 0/1 ✅.
- **Problemi bloccanti (alta/critica):** **0**.
- **Esito: PASS.** Le note §3.1–§3.7 non bloccano la fase (pre-esistenti e/o fuori scope; nessuna introdotta o peggiorata dalla Fase 2) ma restano tracciate per i gate successivi — in particolare §3.1 (CORS + superfici profili/SSE) e §3.2 (rate-limit) alla Fase 7.