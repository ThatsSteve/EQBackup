# Security Audit — Fase 0: Governance & tooling

**Data:** 2026-08-17
**Auditor:** security-auditor (permessi: sola scrittura `implementation/reports/*`)
**Commit di riferimento:** `26fd0b5` (stato iniziale) → working tree + index correnti (modifiche non ancora committate)
**Esito complessivo:** **PASS**

---

## 1. Contesto e scope del diff

La Fase 0 non introduce funzionalità applicative: infrastruttura di governance e tooling. Modifiche verificate:

| File | Tipo di modifica |
|---|---|
| `.opencode/agents/*.md` (6 file) | 3 già tracciati, 3 modificati per allineamento alla tabella permessi |
| `package.json` (root) | script `test`, `prepare` (husky), devDeps `vitest`, `supertest`, `husky` |
| `package-lock.json` (root) | +vitest/vite/supertest/husky (0 vulnerabilità, versioni patched) |
| `frontend/package.json` + lock | +`vitest` in devDeps (unica aggiunta) |
| `vitest.config.js`, `test/smoke.test.js`, `frontend/src/smoke.test.js` | nuovi (harness di test) |
| `.husky/pre-commit` | nuovo (gitleaks, fail esplicito se assente) |
| `.github/workflows/ci.yml` | nuovo (checkout@v4, setup-node@v4, `npm ci`, `npm --prefix frontend ci`, `npm audit --audit-level=high`, `npm test`) |
| `.env.example` | nuovo (solo `PORT` e `EAPO_CONFIG_DIR`) |
| `.gitignore` | +`*.env` / `!.env.example`, `ai-profiles.enc`, `/engine/knowledge_graph.json` |
| `engine/knowledge_graph.json` | rimosso dal tracking (`git rm --cached`), resta su disco (dati utente) |
| `test-api.js`, `test_phase2.js` | eliminati (legacy rotti) |
| `implementation/reports/.gitkeep` | nuovo |

Nota: `implementation/plan_state.json` è stato modificato dall'orchestrator (`status: "security_review"`), non oggetto di audit.

---

## 2. Check eseguiti ed evidenze

### 2.1 Segreti

| Check | Esito | Evidenza |
|---|---|---|
| Chiavi API/token/connection string nel working tree | ✅ nessun match | `grep` (ripgrep) su intero repo: pattern `sk-[A-Za-z0-9]{16,}`, `ghp_`, `gho_`, `AIza…`, `AKIA…`, `xox[baprs]-…`, `-----BEGIN …PRIVATE KEY`, `Bearer …`, `(api[_-]?key\|secret\|passwd\|password\|token\|authorization)\s*[:=]`, `mongodb(+srv)?://`, `postgres://`, `mysql://`, `redis://` → **No files found** |
| Chiavi/token nella history | ✅ solo 1 commit | `git log --all --oneline` → solo `26fd0b5` (stato iniziale). Nessun commit contenente segreti; il secret di prova gitleaks è stato bloccato dal hook (mai committato). Limite di verifica: `git fsck` non eseguibile con i permessi correnti — la pulizia reflog/gc dichiarata dal dev non è confermabile strumentalmente, ma nessun commit raggiungibile contiene segreti |
| `.env` reali su disco | ✅ assenti | Directory root: presente solo `.env.example`, nessun `.env` |
| `.gitignore` copre segreti/profili | ✅ | `*.env` + `!.env.example`; `ai-profiles.enc`; `/engine/knowledge_graph.json` (vedi 2.2) |
| Segreti loggati / in risposte HTTP di errore | ✅ | `server.js` non logga token né chiavi; errori restituiti sono messaggi di eccezione, nessuna credenziale |

### 2.2 Filesystem / dati

| Check | Esito | Evidenza |
|---|---|---|
| `engine/knowledge_graph.json` (dati utente) fuori dal tracking | ✅ | `git status --ignored --short` → `!! engine/knowledge_graph.json` (ignorato); presente nell'index come `D` (rimozione); il file resta su disco. Decisione documentata in `.gitignore` (commento) |
| Path assoluti personali hardcoded | ✅ nessun match | `grep` `C:\Users\…` → match SOLO in `implementation/prompts/phase-0.md` (prompt operativo che cita il path del repo, non codice). `poc.js` e `.env.example` usano `C:\Program Files\EqualizerAPO\config` (path di installazione generico, non personale) |
| `.env.example` senza segreti | ✅ | Contiene solo `PORT=3001` e `EAPO_CONFIG_DIR`; header che vieta esplicitamente chiavi utente (rimandate a `ai-profiles.enc` cifrato, Fase 2) |

### 2.3 Superficie di rete (repo esteso, Fase 0)

| Check | Esito | Evidenza |
|---|---|---|
| Bind del backend | ✅ | `server.js:355` → `app.listen(PORT, '127.0.0.1', …)` |
| CORS | ⚠️ da monitorare | `server.js:19` → `app.use(cors())` permissivo. **Pre-esistente** (server.js non toccato dalla Fase 0), non bloccante; vedi §4.1 |
| Rate limiting | ⚠️ da monitorare | Nessun rate limit sugli endpoint che chiamano servizi terzi (`/api/resolve-artist`, `/api/sync-autoeq`). **Pre-esistente**, fuori scope Fase 0; vedi §4.3 |
| Timeout reti esterne | ✅ (per le parti verificate) | `server.js:79` usa `AbortSignal.timeout(1000)`; i prompt agente (`backend-ai-dev.md`) impongono timeout esplicito su ogni fetch esterno con `clearTimeout` in `finally`. Il resto della superficie rete sarà auditato nelle fasi applicative |

### 2.4 Hook pre-commit e CI

| Check | Esito | Evidenza |
|---|---|---|
| Il hook fallisce se gitleaks è assente | ✅ | `.husky/pre-commit:6-13` → `command -v gitleaks` + `exit 1` esplicito con messaggio |
| Hook senza segreti | ✅ | 15 righe, solo logica gitleaks |
| Struttura husky pulita | ✅ | `.husky/_/` (shim standard v9: `h`, `husky.sh`) ignorata da `.husky/_/.gitignore` (`*`); `.husky/pre-commit` è il solo hook custom |
| CI senza segreti e con audit | ✅ | `.github/workflows/ci.yml` — nessuna credenziale; `npm audit --audit-level=high` sulla root; pinning `actions/checkout@v4`/`setup-node@v4` |
| `.env.example` non ignorato | ✅ | `git status --ignored --short` → `.env.example` risulta `??` (untracked, NON `!!`), quindi versionabile |

### 2.5 Dipendenze

| Check | Esito | Evidenza |
|---|---|---|
| `npm audit` root | ✅ 0 vulnerabilità | `npm audit --audit-level=high` (root) → `found 0 vulnerabilities` |
| `npm audit` frontend | ⚠️ pre-esistenti | `npm audit --audit-level=high` (frontend) → 1 high (`nanoid <3.3.18`, GHSA-2v37-7h3g-55p8), 1 moderate (`postcss <=8.5.22`, GHSA-fxqj-rqcc-2cmp). **Non introdotte dalla Fase 0**: il diff del lock frontend aggiunge solo `vitest` (le righe `+` su nanoid/postcss sono nel lock ROOT, dove sono versioni patched). Vedi §4.2 |
| Dipendenze fuori scope | ✅ | Root: solo `vitest@^4.1.10`, `supertest@^7.2.2`, `husky@^9.1.7` (tutte riconducibili allo scope: test harness + hook governance). Frontend: solo `vitest@^4.1.10` |

### 2.6 Harness di test

| Check | Esito | Evidenza |
|---|---|---|
| `npm test` (root, pipeline completa) | ✅ | `vitest run` → 1 file/2 test pass; `npm --prefix frontend test` → 1 file/1 test pass; exit 0 |
| File di test senza side effect | ✅ | `test/smoke.test.js` non carica `./server` (commento esplicito: evita listener HTTP e `testEngineAccuracy()`); smoke test banali, nessun accesso a rete/disco |

### 2.7 Agenti (`.opencode/agents/`)

| Check | Esito | Evidenza |
|---|---|---|
| Allineamento permessi alla tabella | ✅ | Diff confermato: rimossi `websearch: allow` da `backend-ai-dev.md` e `frontend-redesign-dev.md`; rimosso `npm ls*` da `security-auditor.md` |
| Nessun segreto negli agenti | ✅ | 6 file senza chiavi/token/path personali |
| Vincoli di sicurezza nei prompt | ✅ | `backend-ai-dev.md`: output IA limitato al JSON dei 6 intenti, nessun segreto in chiaro, fallback deterministico, guardrails `[-12,+9]` dB / Q `[0.5,3.5]`, timeout esterni. `frontend-redesign-dev.md`: mai segreti in `localStorage`/`sessionStorage`. `security-auditor.md`/`qa-verifier.md`: permessi minimi e indipendenza strutturale |

---

## 3. Vulnerabilità trovate

**Nessuna vulnerabilità critica o alta introdotta dalla Fase 0.** Nessun problema di severità alta/critica aperto sulle modifiche della fase.

Problemi minori / pre-esistenti registrati come **da monitorare** (non bloccanti):

### 3.1 (bassa — da monitorare) CORS permissivo pre-esistente
- **File/riga:** `server.js:19` — `app.use(cors())`
- **Descrizione:** CORS aperto a qualunque origine su un server locale che scrive file su Equalizer APO (`writeEqFileDebounced`). Un sito web malevolo visitato dall'utente potrebbe indirizzare richieste cross-origin a `http://127.0.0.1:3001`. L'impatto è mitigato oggi dal bind `127.0.0.1` e dall'assenza di segreti, ma diventerà critico in Fase 2 quando il backend gestirà chiavi IA cifrate.
- **Azione consigliata (fase applicativa, non Fase 0):** restringere CORS a un'allowlist esplicita di origini locali (es. `http://localhost:5173` in dev) o passare a un modello con token/CSRF; rivalidare al gate della Fase 2.

### 3.2 (alta, PRE-ESISTENTE — da monitorare) Vulnerabilità frontend nel lock di base
- **File:** `frontend/package-lock.json` (non modificato in questa fase per questi pacchetti)
- **Descrizione:** `nanoid <3.3.18` (high, GHSA-2v37-7h3g-55p8 — loop infinito di generatori con size 0) e `postcss <=8.5.22` (moderate, GHSA-fxqj-rqcc-2cmp). Già presenti al commit `26fd0b5`; la Fase 0 non le introduce (aggiunge solo `vitest`) e il lock root le contiene nelle versioni patched (3.3.18 / 8.5.26). Impatto pratico limitato (dev-time/build tooling), ma vanno risolte prima della pubblicazione.
- **Azione consigliata:** upgrade di `vite`/dipendenze frontend in una fase applicativa; estendere poi la CI con `npm --prefix frontend audit --audit-level=high` (oggi farebbe fallire il build — per questo la CI audit solo la root, come da piano Fase 0).

### 3.3 (bassa — da monitorare) gitleaks solo nel hook locale, non in CI
- **File:** `.github/workflows/ci.yml`
- **Descrizione:** lo secret-scanning vive solo nel pre-commit hook locale; un contributo via pull request non passerebbe da gitleaks.
- **Azione consigliata (fase futura):** aggiungere `gitleaks/gitleaks-action` alla CI.

### 3.4 (bassa — da monitorare) Rate limiting assente sugli endpoint verso servizi terzi
- **File:** `server.js` (`/api/resolve-artist`, `/api/sync-autoeq`, `/api/hardware/resolve`)
- **Descrizione:** pre-esistente e fuori scope Fase 0 (nessuna superficie di rete aggiunta dalla fase); il piano lo presidia nelle fasi applicative. Registrato per tracciabilità.

---

## 4. Conclusioni

- **Checklist Fase 0 (piano, sez. 1.3):** nessun segreto in codice/`.git`/log/file di stato in chiaro → ✅ soddisfatta. `engine/knowledge_graph.json` (dati utente) correttamente escluso dal repo e la motivazione è documentata nel `.gitignore`.
- **Checklist standard esteso (repo intero):** segreti ✅, bind 127.0.0.1 ✅, path traversal/path personali ✅, `.env.example` ✅, hook pre-commit ✅, CI ✅, audit root ✅ (0 vulnerabilità), test harness ✅.
- **Problemi bloccanti (alta/critica):** **0**.
- **Esito: PASS.** Le note §3.1–§3.4 non bloccano la fase (pre-esistenti e/o fuori scope) ma vanno tenute tracciate e rivalidate nei gate successivi (in particolare §3.1 e §3.2 alla Fase 2).