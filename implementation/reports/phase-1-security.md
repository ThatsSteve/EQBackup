# Security Audit — Fase 1: Stabilizzazione critica (backend)

**Data:** 2026-08-17
**Auditor:** security-auditor (permessi: sola scrittura `implementation/reports/*`)
**Commit di riferimento:** `26fd0b5` (unico commit; working tree + index contengono modifiche Fase 0 NON committate + modifiche Fase 1 NON committate)
**Esito complessivo:** **PASS**

---

## 1. Contesto e scope del diff

La Fase 1 stabilizza la pipeline backend: motore deterministico locale dei desiderata (6 intenti), guardrails psicoacustici su **tutti** i filtri (base AutoEq inclusa), fix del preamp anti-clipping, rimozione log diagnostici con nomi artisti, refactor di `server.js` per esportare `app` senza listener (testabilità), test E2E offline.

**Distinzione Fase 0 vs Fase 1** (il working tree contiene entrambi gli insiemi, nessuno dei due committato). Ho confrontato il diff reale `git diff` (vs HEAD `26fd0b5`) con l'elenco dichiarato dal report della Fase 0: l'insieme Fase 1 dichiarato dal dev coincide esattamente con i file il cui diff NON è riconducibile alla Fase 0.

| File | Tipo di modifica | Appartenenza |
|---|---|---|
| `engine/aiOrchestrator.js` | modificato (profilo ponderato artista deterministico, `foundArtists` in uscita, `clearTimeout` in `finally`) | **Fase 1** |
| `engine/dspEngine/coreCalculator.js` | modificato (guardrails su tutta la curva, preamp = `min(basePreamp, antiClipping)`) | **Fase 1** |
| `engine/dspEngine/genreArtistMatrix.js` | modificato (rimozione `console.log` diagnostici con nomi artisti) | **Fase 1** |
| `engine/graphEngine.js` | modificato (rimozione import morto; filtri `recommended_modifiers` dai nodi locali) | **Fase 1** |
| `server.js` | modificato (`PEQ_WIZARD_AI_PROFILE`, `require.main === module`, `module.exports = app`) | **Fase 1** |
| `test/phase1-e2e.test.js` | nuovo (E2E offline) | **Fase 1** |
| `.gitignore`, agenti `.opencode/agents/*.md`, `package.json`/lock (root+frontend), `vitest.config.js`, `test/smoke.test.js`, `frontend/src/smoke.test.js`, `.github/`, `.husky/`, `.env.example`, `test-api.js`/`test_phase2.js` (eliminati), `engine/knowledge_graph.json` (rimozione dal tracking) | — | Fase 0 (già auditate; i diff correnti coincidono con la descrizione del report Fase 0) |

`implementation/plan_state.json` modificato solo dall'orchestrator (`status: "security_review"`) — non oggetto di audit.

---

## 2. Check eseguiti ed evidenze

### 2.1 Segreti

| Check | Esito | Evidenza |
|---|---|---|
| Chiavi API/token/connection string nei file toccati e nel repo | ✅ nessun match | Grep su intero repo (esclusi `node_modules`, lock, `.git`): `sk-[A-Za-z0-9]{16,}`, `api[_-]?key`, `apikey`, `Bearer `, `AKIA`, `ghp_`, `xox[baprs]`, `-----BEGIN …PRIVATE KEY`, `mongodb(+srv)?://`, `postgres://`, `mysql://`, `redis://` → match SOLO in documentazione/prompt/report che **citano i pattern di ricerca** (`implementation/prompts/*.md`, `.opencode/agents/*.md`, `Files/*.md`, report Fase 0), mai segreti reali. Nessun match nei 6 file toccati |
| `.env` reali su disco / `.env.example` | ✅ | Directory root: solo `.env.example` (untracked `??`, versionabile); nessun `.env` reale. `.env.example` contiene solo `PORT`/`EAPO_CONFIG_DIR` (Fase 0) |
| `.gitignore` copre segreti/profili/dati utente | ✅ invariato | `*.env` + `!.env.example`, `ai-profiles.enc`, `/engine/knowledge_graph.json` → `git status --ignored` conferma `!! engine/knowledge_graph.json` (ignorato, resta su disco come dati utente) |
| Segreti loggati o in risposta HTTP di errore | ✅ | Nessuna credenziale in `console.*` dei file toccati; `/api/calculate-eq` restituisce solo `err.message` (messaggi di eccezione, nessuna chiave) |
| History git | ✅ | Unico commit `26fd0b5`; nessun commit con segreti (limitazione nota dalla Fase 0: `git fsck` non eseguibile con i permessi correnti) |

### 2.2 Log con dati personali (checklist specifica Fase 1)

| Check | Esito | Evidenza |
|---|---|---|
| `genreArtistMatrix.js`: `console.log` diagnostici `[ARTIST ENGINE DIAGNOSTIC]` con nomi artisti rimossi | ✅ | Diff confermato: rimossi `processedNames` + 5 `console.log` (nomi artisti + vettore ponderato); resta solo un commento esplicativo. Stato corrente: nessun log con nomi artisti nel file |
| `aiOrchestrator.js`: nessun nuovo log con dati personali | ✅ | Diff non aggiunge `console.*`; l'unico `console.warn` (riga 139, pre-esistente) logga solo `err.message` (fetch/abort/parse), mai payload utente |
| `graphEngine.js`: nessun nuovo log con dati personali | ✅ | Diff non aggiunge `console.*` (solo rimozione import morto + blocco `recommended_modifiers`). I `console.log` pre-esistenti con nomi artisti (righe 31/41/49/65/73/76) vivono SOLO nel ramo di ingestion esterna, non nel flusso del fix — vedi §3.2 |
| `coreCalculator.js`: nuovi log senza dati personali | ✅ | I 2 `console.log` aggiunti (righe 227-228) contengono solo valori numerici in dB (`totalMaxGain`, `finalPreamp`), nessun nome/hardware/artista |
| `server.js`: nessun nuovo log | ✅ | Diff aggiunge solo commenti + logica di esportazione; log esistenti (`[API] Ricevuta richiesta EQ…`) pre-esistenti e senza dati personali oltre destinazione/formato |
| Flusso dati artista → risposta API | ✅ (funzionale, non log) | I nomi artista entrano nel campo `origin` dei filtri (`ARTISTA: …`) e nella risposta `payload` di `/api/calculate-eq`: sono i dati che l'utente ha selezionato, usati dal frontend per etichettare i filtri. Non vengono scritti su nessun log |

### 2.3 Superficie di rete

| Check | Esito | Evidenza |
|---|---|---|
| Bind/porta invariati | ✅ | `server.js:369` → `app.listen(PORT, '127.0.0.1', …)` con `PORT = 3001` (riga 17). Il refactor `require.main === module` (riga 365) non cambia il comportamento con `node server.js`; sotto `require` (test) nessun listener attivo |
| CORS NON peggiorato | ✅ | `app.use(cors())` (riga 28) invariato rispetto alla Fase 0: permissivo pre-esistente (Fase 0 §3.1), **non toccato né peggiorato** da questa fase; rivalidazione prevista alla Fase 2 |
| Nessuna nuova superficie di rete | ✅ | Nessun nuovo endpoint, nessun nuovo bind, nessun nuovo fetch introdotto. Al contrario: `/api/calculate-eq` resta sul profilo `local-graph` (bypass LM Studio, come prima del refactor) |
| Rate limiting | ⚠️ pre-esistente | Assente sugli endpoint verso servizi terzi — invariato rispetto alla Fase 0 (§3.4), fuori scope Fase 1 |
| Nuova variabile d'ambiente `PEQ_WIZARD_AI_PROFILE` | ✅ | Default `local-graph` = comportamento invariato (bypass LM Studio nel wizard); è una giuntura dichiarata per Fase 2/3, non apre superficie |

### 2.4 Timeout fetch esterni

| Check | Esito | Evidenza |
|---|---|---|
| Fetch LM Studio (`aiOrchestrator.js:90-107`) | ✅ | `AbortController` + `setTimeout(45000)`; il diff sposta `clearTimeout(timeoutId)` in un `finally` che copre anche il caso di fetch che lancia eccezione — fix esplicito della fase |
| Nuovi fetch nei file toccati | ✅ nessuno | Il diff Fase 1 non aggiunge alcun fetch; il test E2E non effettua chiamate di rete |
| Test E2E offline | ✅ | Artisti `daft_punk`/`hans_zimmer` presenti nel grafo locale con `recommended_modifiers` → nessuna ingestion iTunes/MusicBrainz; headphone `acme test hp 9000` non matcha `autoeq_db.json` → fallback locale `dummy_autoeq.txt` (nessun fetch AutoEq); profilo wizard `local-graph` → LM Studio non contattato; `destination: 'clipboard'` → nessuna scrittura. Evidenza empirica: suite backend completata in ~288ms (un timeout LM Studio da solo ne avrebbe richiesti 45s) |
| Fetch pre-esistenti con timeout | ✅ | `graphEngine.js` ingestion esterna usa `AbortSignal.timeout(4000)` (righe 35, 57); `server.js:88` `/api/engine-status` usa `AbortSignal.timeout(1000)` |
| `autoeqParser.js:36` fetch AutoEq remoto | ⚠️ pre-esistente | `fetch(url)` SENZA timeout — file non toccato dalla Fase 1, fuori scope; non innescato dal test (headphone ignoto → fallback locale). Vedi §3.3 |

### 2.5 Test harness

| Check | Esito | Evidenza |
|---|---|---|
| `npm test` dalla root (pipeline completa) | ✅ exit 0 | Backend: 2 file/3 test pass (incluso `phase1-e2e.test.js`); frontend: 1 file/1 test pass |
| `test/phase1-e2e.test.js` senza segreti | ✅ | Nessuna chiave/token/path personale; artisti di test hardcoded (`daft_punk`, `hans_zimmer`) non riservati |
| `test/phase1-e2e.test.js` non scrive su Equalizer APO | ✅ | `destination: 'clipboard'` → ramo `else` di `/api/calculate-eq` (server.js:176-179) → nessuna `writeEqFileDebounced`; `compileClipboardFormat` restituisce solo testo |
| `test/phase1-e2e.test.js` offline | ✅ | Nessun `fetch`/`http` nel file (grep `console\.\|fetch(\|http://\|https://\|writeFile\|EqualizerAPO` → nessun match); offline per costruzione (grafo locale + fallback dummy + profilo `local-graph`) e per esecuzione (~288ms) |

### 2.6 Dipendenze

| Check | Esito | Evidenza |
|---|---|---|
| `npm audit --audit-level=high` (root) | ✅ | `found 0 vulnerabilities` |
| Dipendenze aggiunte dalla Fase 1 | ✅ nessuna | Diff `package.json` (root e frontend) identico alla Fase 0 (root: `vitest`, `supertest`, `husky` in devDeps + script `test`/`prepare`; frontend: `vitest` in devDeps + script `test`) — nessuna dipendenza nuova riconducibile alla Fase 1 |
| Frontend: vulnerabilità pre-esistenti note | ⚠️ da Fase 0 | `nanoid <3.3.18` (high) e `postcss <=8.5.22` (moderate) nel lock frontend — pre-esistenti, Fase 0 §3.2, fuori scope Fase 1 |

### 2.7 Regressione pipeline Fase 0 (hook/CI/.gitignore)

| Check | Esito | Evidenza |
|---|---|---|
| `.gitignore` non toccato dalla Fase 1 | ✅ | Diff corrente = esattamente la versione Fase 0 descritta nel report Fase 0 (sezioni `*.env`/`!.env.example`, `ai-profiles.enc`, `/engine/knowledge_graph.json`) |
| `.husky/pre-commit` non toccato | ✅ | Contenuto = versione Fase 0 (gitleaks, `exit 1` se assente); nessuna modifica |
| `.github/workflows/ci.yml` non toccato | ✅ | Contenuto = versione Fase 0 (`checkout@v4`, `setup-node@v4`, `npm ci` x2, `npm audit --audit-level=high`, `npm test`); la Fase 1 vi si appoggia correttamente (il nuovo E2E è offline e passa in CI) |
| Agenti `.opencode/agents/*.md` non toccati | ✅ | Diff = 1 riga eliminata ciascuno, esattamente la descrizione Fase 0 (rimozione `websearch: allow` e `npm ls*`) |

---

## 3. Vulnerabilità trovate

**Nessuna vulnerabilità critica o alta introdotta dalla Fase 1.** Nessun problema di severità alta/critica aperto sulle modifiche della fase.

Problemi minori / pre-esistenti registrati come **da monitorare** (non bloccanti, nessuno introdotto o peggiorato da questa fase):

### 3.1 (bassa — pre-esistente, INVARIATO) CORS permissivo
- **File/riga:** `server.js:28` — `app.use(cors())`
- **Descrizione:** invariato rispetto alla Fase 0 (§3.1 del report Fase 0). La Fase 1 non lo peggiora (stessa direttiva, stesso bind `127.0.0.1`). Resta la rivalidazione obbligatoria alla Fase 2 quando entreranno in gioco chiavi IA cifrate.
- **Azione:** come da piano — allowlist origini locali o token/CSRF al gate della Fase 2.

### 3.2 (bassa — pre-esistente) Log con nomi artisti nel ramo di ingestion esterna
- **File/righe:** `engine/graphEngine.js` righe 31, 41, 49, 65, 73, 76 (`fetchArtistFromExternalAPI`) e `engine/dspEngine/artistResolver.js` righe 51, 57, 61, 79 (`/api/resolve-artist`)
- **Descrizione:** `console.log`/`console.warn` che stampano nomi artista quando un artista NON è nel grafo locale e si ricorre a iTunes/MusicBrainz, o su `/api/resolve-artist`. **Pre-esistenti e non toccati dalla Fase 1**; il fix della fase ha rimosso i log diagnostici che giravano a OGNI step del wizard (`genreArtistMatrix.js`), mentre questi girano solo su azione esplicita di ingestion/ricerca dell'utente. Segnalati per tracciabilità: la checklist di fase chiede che il fix "non riesponga" oltre il necessario — verificato che il fix stesso non lo fa.
- **Azione consigliata (fase futura, es. Fase 7 hardening):** abbassare questi log a `debug` o rimuovere i nomi in chiaro.

### 3.3 (bassa — pre-esistente) Fetch remoto AutoEq senza timeout
- **File/riga:** `engine/autoeqParser.js:36` — `const res = await fetch(url);`
- **Descrizione:** il fetch del profilo parametrico da GitHub (quando l'headphone matcha `autoeq_db.json`) non ha timeout né AbortController. Pre-esistente e fuori scope Fase 1 (file non toccato); il test E2E non lo innesca (headphone ignoto → fallback `dummy_autoeq.txt`). Un headphone reale matchato può far pendere la richiesta.
- **Azione consigliata (fase futura):** aggiungere `AbortSignal.timeout(...)` coerente con gli altri fetch esterni.

### 3.4 (bassa — pre-esistente, INVARIATO) Rate limiting assente
- **File:** `server.js` (`/api/resolve-artist`, `/api/sync-autoeq`, `/api/hardware/resolve`)
- **Descrizione:** già registrato in Fase 0 §3.4; la Fase 1 non aggiunge superficie, non lo aggrava.

### 3.5 (bassa — pre-esistente, INVARIATO) Vulnerabilità frontend nel lock di base
- **File:** `frontend/package-lock.json` — `nanoid <3.3.18` (high) e `postcss <=8.5.22` (moderate)
- **Descrizione:** Fase 0 §3.2; nessuna dipendenza nuova introdotta dalla Fase 1 (diff package.json/lock invariati rispetto alla Fase 0).

---

## 4. Conclusioni

- **Diff reale della fase:** verificato e coincidente con la dichiarazione del dev: `engine/aiOrchestrator.js`, `engine/dspEngine/coreCalculator.js`, `engine/dspEngine/genreArtistMatrix.js`, `engine/graphEngine.js`, `server.js`, `test/phase1-e2e.test.js`. I diff di `.gitignore`, agenti, package.json/lock sono integralmente riconducibili alla Fase 0 (confronto con report Fase 0).
- **Checklist Fase 1 (piano):** il fix non riespone log con dati hardware/artisti in chiaro oltre il necessario → ✅ soddisfatta (rimozione `[ARTIST ENGINE DIAGNOSTIC]` confermata; nessun nuovo `console.log` con dati personali nei file toccati; i soli log con nomi artista sono pre-esistenti e confinati all'ingestion esterna).
- **Checklist standard:** segreti ✅ (0 match nei file toccati e nel repo al netto di citazioni documentali), bind `127.0.0.1:3001` invariato ✅, CORS non peggiorato ✅, timeout: nessun nuovo fetch, `clearTimeout` in `finally` sul fetch LM Studio ✅, test E2E offline e senza scritture E-APO ✅, `npm audit` root 0 vulnerabilità ✅, `npm test` exit 0 ✅, hook/CI/.gitignore non toccati ✅.
- **Problemi bloccanti (alta/critica):** **0**.
- **Esito: PASS.** Le note §3.1–§3.5 non bloccano la fase (pre-esistenti e/o fuori scope) ma restano tracciate per i gate successivi (in particolare §3.1 e §3.5 alla Fase 2, §3.2 e §3.3 alla Fase 7).