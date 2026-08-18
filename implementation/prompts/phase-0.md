# Task — Fase 0: Governance & tooling

## Obiettivo
Mettere in piedi l'infrastruttura di esecuzione automatica (agenti OpenCode, framework di test, hook pre-commit di secret-scanning, CI, igiene `.env`/`.gitignore`) prima di toccare qualsiasi funzionalità.

## Contesto
Questa è la prima fase del piano (`implementation/IMPLEMENTATION_PLAN.md`, sezione 5). Tutto il ciclo operativo descritto nella sezione 4 del piano — orchestrator → prompt-writer → dev → security-auditor → qa-verifier — **dipende da ciò che costruisci ora**: senza i 6 agenti in `.opencode/agents/`, senza una pipeline `npm test` che esce 0, e senza secret-scanning a monte, nessuna fase successiva può partire o essere validata. Non devi implementare alcuna funzionalità: solo infrastruttura e tooling.

Repo: `C:\Users\yscuo\Desktop\EQ` (git, branch `main`, commit di partenza `26fd0b5`). `.opencode/agents/` è vuota. `implementation/` esiste già con `IMPLEMENTATION_PLAN.md` e `plan_state.json` (fase 0 = `ready`); `implementation/prompts/` esiste (contiene questo file); `implementation/reports/` NON esiste.

## Cosa implementare

### 1. I 6 file agente in `C:\Users\yscuo\Desktop\EQ\.opencode\agents\` (PRIMO task, prima di tutto il resto)
La cartella sorgente `opencode-agents/` citata dal piano **non è presente nel repo**: devi **creare** i 6 file `.md` da zero, usando come unica fonte le specifiche della sezione 3 del piano (tabella Mode/Ruolo/Permessi e testo di governance). Il nome del file determina il nome dell'agente. Non inventare permessi oltre a quelli elencati.

Per ciascun file: frontmatter YAML con `name` (uguale al nome file), `description` (deve descrivere il ruolo per permettere il dispatch automatico da parte dell'orchestrator), `mode`, e un blocco `permission` con pattern glob. **Non fissare il campo `model`** (i subagent ereditano il modello dell'invocante). Se non sei certo della sintassi esatta del blocco `permission` di OpenCode, verificala con la documentazione ufficiale (puoi usare webfetch) — ma le regole di allow/deny da rispettare sono esattamente queste:

| File | mode | Regole `permission` richieste |
|---|---|---|
| `architect-orchestrator.md` | `primary` | `edit` SOLO su `implementation/**`; `bash` SOLO comandi di sola lettura (`git status`, `git diff`, `git log`, `ls`, `cat`); `task` SOLO verso i 5 subagent (i loro nomi file); `webfetch` non concesso |
| `prompt-writer.md` | `subagent` + `hidden: true` | `edit` SOLO su `implementation/prompts/*`; `bash`, `webfetch`, `task` negati |
| `backend-ai-dev.md` | `subagent` | `edit`, `bash`, `webfetch` consentiti; `task` negato |
| `frontend-redesign-dev.md` | `subagent` | `edit`, `bash`, `webfetch` consentiti; `task` negato |
| `security-auditor.md` | `subagent` | `edit` SOLO su `implementation/reports/*`; `bash` SOLO comandi diagnostici: `grep`, `git diff`, `git log`, `git status`, `npm audit`, `npm test`; `webfetch`/`task` non concessi |
| `qa-verifier.md` | `subagent` | `edit` SOLO su `implementation/reports/*`; `bash` SOLO: `npm test`, `npm run`, `curl` verso `localhost`/`127.0.0.1`, `grep`, `git diff`, `git log`; `webfetch`/`task` non concessi |

Dopo aver creato i file, verifica che OpenCode li riconosca con `opencode agent list` (deve elencare tutti e 6).

### 2. Framework di test reale (Vitest/Supertest backend + Vitest frontend)
Sostituisce i file di test legacy rotti `test-api.js` e `test_phase2.js`.

**Backend (root, CommonJS):**
- In `C:\Users\yscuo\Desktop\EQ\package.json` (attualmente `"type": "commonjs"`, script `test` = `echo "Error: no test specified" && exit 1`):
  - `npm install -D vitest supertest` (dipendenze esistenti `cors`/`express` non vanno toccate);
  - script `test` → `"test": "vitest run && npm --prefix frontend test"`;
- Crea `C:\Users\yscuo\Desktop\EQ\vitest.config.js` in CommonJS (`module.exports`) con `test.include: ['test/**/*.test.js']`, così il run root non pesca i test del frontend.
- Crea `C:\Users\yscuo\Desktop\EQ\test\smoke.test.js` (CommonJS): un test banale che dimostra che il harness è attivo — es. `require('supertest')` è una funzione e un'asserzione banale. **Non fare `require('./server')`**: farebbe partire il listener e `testEngineAccuracy()`. In questa fase non serve alcun test reale di funzionalità.
- **Elimina** `C:\Users\yscuo\Desktop\EQ\test-api.js` e `C:\Users\yscuo\Desktop\EQ\test_phase2.js` (i file rotti citati dal piano come sostituendi).

**Frontend (`C:\Users\yscuo\Desktop\EQ\frontend\`, Vite 8, `"type": "module"`):**
- `npm --prefix frontend install -D vitest`;
- script `test` → `"test": "vitest run"`;
- Crea `frontend/src/smoke.test.js` (ESM) con un test banale. Non aggiungere jsdom/happy-dom in questa fase: non ci sono ancora componenti da testare.

### 3. Hook pre-commit di secret-scanning + `npm audit` in CI
- **Hook pre-commit versionato** con husky: `npm install -D husky` poi `npx husky init` (crea `.husky/pre-commit`). Il file `.husky/pre-commit` deve eseguire il secret-scanning sui file staged con **gitleaks**: `gitleaks protect --staged --verbose`. Se gitleaks non è installato sul sistema, installalo (`choco install gitleaks`, `brew install gitleaks` oppure `go install github.com/gitleaks/gitleaks/v8@latest`). **Il hook deve FALLIRE (exit 1) con un messaggio chiaro se lo scanner non è disponibile**: mai passare silenziosamente senza scansione.
- **Verifica il criterio**: crea un file temporaneo NON tracciato contenente un secret di prova riconosciuto dai default di gitleaks (es. riga `sk-test-1234567890abcdef` o un token `ghp_...`), `git add` del file, tentativo di `git commit` → il commit deve essere BLOCCATO. Poi rimuovi il secret e verifica che un commit pulito passi. Il secret di prova non deve MAI finire in un commit: usa un file temporaneo e cancellalo/ripristinalo al termine della verifica.
- **CI con `npm audit`**: crea `C:\Users\yscuo\Desktop\EQ\.github\workflows\ci.yml` (GitHub Actions — è la scelta di default; il piano dice solo "in CI"). Pipeline: `actions/checkout@v4` → `actions/setup-node@v4` → `npm ci` → `npm --prefix frontend ci` → `npm audit --audit-level=high` (fallisce su vulnerabilità high/critical) → `npm test`.

### 4. `.env.example` allineato alle variabili reali
Oggi **non esiste** alcun `.env.example` e il codice **non legge alcun `process.env`** (verificato). Le variabili "reali" da documentare sono quelle che il codice usa oggi come costanti:
- `PORT=3001` — porta del server Express (`server.js` riga 17);
- `EAPO_CONFIG_DIR=C:\Program Files\EqualizerAPO\config` — directory di configurazione di Equalizer APO (`engine/fileSync.js` riga 4).

Crea `C:\Users\yscuo\Desktop\EQ\.env.example` con un header che spieghi che contiene SOLO variabili di sviluppo locale (porta, path E-APO) e mai chiavi API utente (quelle andranno in `ai-profiles.enc` cifrato, dalla Fase 2). Non inserire alcun segreto. **Non modificare `server.js`/`engine/*` per leggere queste variabili in questa fase** (è un refactor funzionale, fuori scope). Il file deve essere versionato (non ignorato).

### 5. Aggiornamento di `C:\Users\yscuo\Desktop\EQ\.gitignore`
Contenuto attuale (4 righe): `node_modules/`, `.env`, `.env.local`, `.DS_Store`. Aggiorna a:
- `node_modules/` e `.DS_Store` (restano);
- `*.env` con esclusione esplicita `!.env.example` (il file della sezione 4 deve restare versionato);
- `ai-profiles.enc`;
- `/engine/knowledge_graph.json` — con la seguente decisione obbligatoria: ispeziona `C:\Users\yscuo\Desktop\EQ\engine\knowledge_graph.json` (673 righe, profili hardware/artisti/deficit EQ). È un knowledge graph di profilazione EQ personale: trattalo come dati utente → aggiungilo al `.gitignore` **e** rimuovilo dal tracking con `git rm --cached engine/knowledge_graph.json` (il file resta su disco per lo sviluppo locale, esce solo dal repo). Se dopo l'ispezione giudichi che NON contiene dati utente, lascialo tracciato e motiva la decisione nel report finale.

### 6. Cartella `implementation/reports/`
Crea `C:\Users\yscuo\Desktop\EQ\implementation\reports\` con un `.gitkeep`: è la destinazione dei report dei gate (security-auditor, qa-verifier) delle fasi successive.

## Vincoli non negoziabili
- **Sezione 1.3 del piano (vale per ogni fase):** nessuna API key, endpoint privato o token in codice, `.git`, log o file di stato in chiaro. `.env` resta solo per variabili di sviluppo locali, mai per chiavi utente finali.
- Il secret di prova usato per verificare l'hook non deve mai entrare in un commit (nemmeno temporaneamente): file di prova non tracciato, cancellato o ripristinato a fine verifica.
- **Nessun refactor funzionale in questa fase**: non modificare `server.js`, `engine/**`, `frontend/src/**` esistenti, `src/artists.json`, `scripts/**`, `frontend/vite.config.js`. Sono ammesse solo aggiunte (test, file agente, hook, workflow, `.env.example`) e l'eliminazione dei 2 file di test legacy rotti.
- Rispetta i tipi di modulo esistenti: CommonJS alla root, ESM in `frontend/`.
- **Non toccare `C:\Users\yscuo\Desktop\EQ\implementation\plan_state.json`**: lo aggiorna solo l'orchestrator. Il tuo `git diff` su quel file deve restare vuoto.
- **Non invocare altri agenti** (il tuo blocco `permission.task` è negato): lavora in autonomia.
- Non fissare il campo `model` nei file agente e non inventare permessi oltre alla tabella della sezione 3.
- Se incontri un blocco tecnico non previsto (es. gitleaks non installabile, sintassi `permission` diversa da quanto previsto), riportalo nel messaggio finale con i dettagli invece di aggirarlo silenziosamente.

## Definition of Done (tutte verificabili, verificale tu stesso)
1. `opencode agent list` elenca i 6 agenti (`architect-orchestrator`, `prompt-writer`, `backend-ai-dev`, `frontend-redesign-dev`, `security-auditor`, `qa-verifier`).
2. `npm test` (dalla root `C:\Users\yscuo\Desktop\EQ`) esce con codice 0 (pipeline backend + frontend funzionante).
3. L'hook pre-commit blocca un commit che contiene un secret di prova staged, e lascia passare un commit pulito.
4. `C:\Users\yscuo\Desktop\EQ\.env.example` esiste, è versionato (non ignorato: verifica che `git check-ignore -v .env.example` non produca match), è allineato a `PORT`/`EAPO_CONFIG_DIR` e non contiene segreti.
5. `.gitignore` copre `*.env` (con `!.env.example`), `ai-profiles.enc` e `/engine/knowledge_graph.json`.
6. `engine/knowledge_graph.json` non è più tracciato (`git ls-files engine/knowledge_graph.json` vuoto) se hai giudicato che contiene dati utente; resta su disco.
7. `.github/workflows/ci.yml` esiste e include `npm audit`.
8. `implementation/reports/` esiste con `.gitkeep`.
9. `git diff -- implementation/plan_state.json` è vuoto; nessuna modifica a codice funzionale esistente.

## Self-check richiesto (riporta TUTTO nel messaggio finale)
Esegui i comandi qui sotto e riporta gli esiti nel messaggio finale, in modo esplicito:
- Elenco dei file creati/modificati/eliminati, con i 6 file agente elencati singolarmente.
- Output di `opencode agent list`.
- Exit code e output di `npm test`.
- Descrizione della prova dell'hook pre-commit: secret di prova usato, esito del commit bloccato, esito del commit pulito.
- Decisione su `engine/knowledge_graph.json` (dati utente sì/no) con motivazione e output di `git ls-files engine/knowledge_graph.json`.
- Output di `git status` finale e `git diff -- implementation/plan_state.json` (atteso: vuoto).

## Se questo è un retry
Non applicabile: è la prima fase, non esistono report FAIL precedenti.