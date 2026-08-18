# Security Audit — Fase 3: Onboarding "Configura la tua IA" (frontend, Step 0 gate)

**Data:** 2026-08-18
**Auditor:** security-auditor (permessi: sola scrittura `implementation/reports/*`)
**Commit di riferimento:** `26fd0b5` (unico commit; working tree con modifiche Fasi 0/1/2 pre-esistenti non committate + modifiche Fase 3 non committate)
**Gate precedenti:** Fase 2 security=PASS (`phase-2-security.md`), Fase 2 QA=PASS (`phase-2-qa.md`)
**Esito complessivo:** **PASS**

---

## 1. Contesto e scope del diff

La Fase 3 implementa, **frontend-only**, lo Step 0 del wizard come gate sopra il wizard esistente: nuovo
modulo puro `frontend/src/ai/aiConfig.js` (presets provider, badge tier, mascheratura, validazione form),
componente `frontend/src/components/OnboardingAiStep.jsx` (+ CSS) con onboarding (Locale/Cloud/Nessuna IA)
e gestione multi-profilo, e in `App.jsx` esclusivamente import + stato gate + render condizionale +
pulsante "Impostazioni IA".

**File nuovi (Fase 3):** `frontend/src/ai/aiConfig.js` (166 righe), `frontend/src/ai/aiConfig.test.js` (178
righe, 22 test), `frontend/src/components/OnboardingAiStep.jsx` (676 righe), `frontend/src/components/OnboardingAiStep.css` (316 righe).

**File modificati (Fase 3):** `frontend/src/App.jsx` — **+57/−0** in 4 punti localizzati (verificato `git
diff HEAD -- frontend/src/App.jsx`): import (riga 11), stato gate + useEffect GET profili (righe
658–678), `handleAiOnboardingComplete` (righe 1337–1346), render condizionale nel `main-wizard-wrapper`
+ pulsante "Impostazioni IA" nell'header (righe 1381–1418). Reducer, timeline, `maxStepReached`,
condizioni `state.step === N` e step esistenti **invariati**.

**File backend:** nessun file backend toccato dalla Fase 3. I diff su `server.js`, `engine/*`, `test/*`
sono integralmente le modifiche pre-esistenti Fasi 0/1/2 già auditate (confronto con
`phase-2-security.md` §1 e §4: `server.js`, `aiOrchestrator.js`, `coreCalculator.js`,
`genreArtistMatrix.js`, `graphEngine.js`, `engine/knowledge_graph.json` — conteggi `git diff --stat`
coincidenti).

---

## 2. Check eseguiti ed evidenze

### 2.1 Security checklist Fase 3 — API key mai esposta

| Check | Esito | Evidenza |
|---|---|---|
| Nessun `console.*` nei file nuovi | ✅ | Grep `console\.(log\|debug\|info\|warn\|error\|trace)` su `frontend/src/ai/` → **No files found**; su `OnboardingAiStep.jsx` → **No files found** (unico `console.error` del frontend è in `AudioPlayerAB.jsx:465`, pre-esistente, fuori scope) |
| Campo chiave azzerato dopo il salvataggio | ✅ | `OnboardingAiStep.jsx:176` — `setForm((f) => ({ ...f, apiKey: '' }))` subito dopo la creazione; il campo riaperto in gestione riparte sempre da `apiKey: ''` (`handleSelectPreset`:140, `handleSelectCustom`:155, endpoint manuale:600) |
| Stato mascherato pilotato da `hasApiKey` | ✅ | `OnboardingAiStep.jsx:350` → `maskedKeyLabel(savedProfile.hasApiKey)`; `aiConfig.js:164-165` → solo `'Chiave salvata ••••••••'` / `'Nessuna chiave salvata'`. Il backend non restituisce mai la chiave (`stripSecret`, `registry.js:38-42`, verificato Fase 2); la UI non tenta di rileggerla |
| Input `type="password"` + no autocomplete | ✅ | `OnboardingAiStep.jsx:314` (`type="password"`, `autoComplete="off"`, `spellCheck="false"`) |
| Chiave solo nel body della singola POST di creazione | ✅ | `OnboardingAiStep.jsx:164-168` — unico fetch con body `JSON.stringify(payload)` (che include `apiKey`); `GET` (riga 87), `POST /:id/test` (196-198) e `POST /:id/activate` (223-225) hanno body **assente**. `App.jsx:672` GET senza body |
| Nessuna chiave in localStorage/sessionStorage | ✅ | Grep `localStorage\|sessionStorage` su `frontend/src` → in `App.jsx` solo `PEQ_AI_ONBOARDING_DONE === '1'` (riga 664, read) e `localStorage.setItem('PEQ_AI_ONBOARDING_DONE', '1')` (riga 1344): **booleano, mai chiavi/dati profilo**. Righe 861/884 pre-esistenti (presets, Fase 0). Nessun `sessionStorage` |
| Nessun echo della chiave in errori/placeholder | ✅ | Nessun `err.message`/`.stack`/`responseText` mostrato (grep → No files found). Errori: messaggi fissi generici (`'Impossibile creare il profilo.'`, `'Test del provider non riuscito.'`, `'Attivazione del profilo non riuscita.'` + varianti "server non raggiungibile"); su 400 si mostra `data.error` sanitizzato del backend (stringhe fisse, verificate Fase 2). Placeholder del campo chiave: `'Incolla la tua chiave API'` (riga 317) — generico, nessun echo |
| XSS (valori backend renderizzati come testo) | ✅ | `modelName`, `data.error`, `name`, `tier` renderizzati solo come testo JSX (escape automatico React); grep `dangerouslySetInnerHTML\|eval(\|new Function\|innerHTML` su `frontend/src` → **No files found** |

### 2.2 Superficie di rete — nessuna nuova superficie, nessun fetch esterno

| Check | Esito | Evidenza |
|---|---|---|
| Tutti i fetch dei file nuovi/modificati → solo `http://localhost:3001` | ✅ | Grep `fetch(` su `frontend/src`: `OnboardingAiStep.jsx` ha 4 fetch, tutti su `API_PROFILES = 'http://localhost:3001/api/ai/profiles'` (riga 41; GET 87, POST 164, `/test` 196, `/activate` 223). `App.jsx` riga 672 (nuova): `fetch('http://localhost:3001/api/ai/profiles')`. Tutte le altre 18 occorrenze di `App.jsx` sono pre-esistenti e su `localhost:3001` |
| Le URL esterne nei preset NON sono fetcchiate dal browser | ✅ | `aiConfig.js:13-76` — `baseUrl` cloud/locali sono **dati costanti** inviati al backend nel body di POST (che li valida via `registry.js`); nessun `fetch('http://localhost:1234')`, `:11434`, `api.openai.com`, `api.anthropic.com`, ecc. nei file frontend (grep `fetch(` → nessun match esterno). I test di connessione passano dal backend (`POST /:id/test`) |
| CORS non peggiorato | ✅ | Fase 3 non tocca `server.js:36` (`app.use(cors())` pre-esistente, permissivo `*` — nota Fase 2 §3.1, azione Fase 7). Nessuna nuova superficie di rete lato backend |
| Nessuna chiamata automatica a ogni keystroke | ✅ | Test di connessione solo su pulsante esplicito ("Testa connessione"/"Testa"), disabilitato in flight (`testingId`); nessun debounce/effetto su `form.apiKey` |

### 2.3 Segreti e path personali nei file toccati

| Check | Esito | Evidenza |
|---|---|---|
| `sk-[A-Za-z0-9]{8,}`, `ghp_`, `gho_`, `AKIA`, `xox[baprs]-`, `-----BEGIN`, `AIza`, `Bearer ` | ✅ | Grep stringente `sk-[A-Za-z0-9]{8,}` su `frontend/src` → **No files found**. Pattern combinato → unico match in `frontend/src/assets/vite.svg` (asset **pre-esistente, invariato** vs HEAD, `git diff` vuoto): falso positivo della sola sottostringa `sk-` (1 carattere) in dati SVG minificati — non un segreto (escluso dal pattern stringente e da gitleaks ad alta segnatura) |
| `C:\Users` / `C:/Users` | ✅ | Grep su `frontend/src` → **No files found** (nessun path assoluto personale nei file toccati) |
| Placeholder di test fittizi | ✅ | `aiConfig.test.js:132` → `apiKey: 'FAKE-PLACEHOLDER-KEY'`; nessuna chiave reale o semi-reale nei test |
| `apiKey` nei test come valore d'asserzione | ✅ | `aiConfig.test.js` non asserisce mai la chiave in output/console; `maskedKeyLabel` testato solo con booleano |

### 2.4 Dipendenze

| Check | Esito | Evidenza |
|---|---|---|
| Nessuna nuova dipendenza Fase 3 | ✅ | `git diff HEAD -- frontend/package.json` = integralmente Fase 0 (`"test": "vitest run"` + `vitest ^4.1.10` devDep); `frontend/package-lock.json` invariato rispetto alla Fase 0 (nessuna aggiunta: diff vs HEAD = solo lock Fase 0). La Fase 3 usa solo React/ES module puri, zero import nuovi |
| `npm audit --audit-level=high` (frontend) | ⚠️ pre-esistente | Stesse advisory della Fase 0/1/2, NON introdotte qui: `nanoid <3.3.18` (high, GHSA-2v37-7h3g-55p8) e `postcss <=8.5.22` (moderate) nel lock di base. Nessuna vulnerabilità nuova |

### 2.5 Regressioni Fasi 0/1/2

| Check | Esito | Evidenza |
|---|---|---|
| `npm test` dalla root → exit 0 | ✅ | Backend: **10 file / 65 test pass** (invariati); frontend: **2 file / 23 test pass** (smoke 1 + `aiConfig.test.js` 22: tierToBadge 6, isKeyRequired 2, validateProfileForm 8, defaultProfileName 1, maskedKeyLabel 2, presets 3). Exit 0 |
| Nessuna modifica a file backend da parte della Fase 3 | ✅ | `git status --short`: i file backend modificati (`server.js`, `engine/*`) sono i soli pre-esistenti Fasi 0/1/2 già auditate; la Fase 3 tocca solo `frontend/src/App.jsx` (M) e i 4 file nuovi sotto `frontend/src/ai/` e `frontend/src/components/` |
| `App.jsx` modificato solo nei 4 punti dichiarati | ✅ | Diff +57 righe esattamente come dichiarato; reducer, timeline `[1,2,3,4]`, `maxStepReached`, ~20 condizioni `state.step === N` e step esistenti invariati |
| Vault dev-only: lista vuota trattata come stato normale | ✅ | `OnboardingAiStep.jsx:84-107` — `fetchProfiles` catch → lista vuota + messaggio informativo ("Backend non raggiungibile: puoi comunque proseguire con Nessuna IA"); modalità gestione con lista vuota → testo esplicativo, nessun crash (righe 411-416) |
| "Nessuna IA" sempre percorribile (criterio di accettazione) | ✅ | `OnboardingAiStep.jsx:551` — pulsante "Nessuna IA" → `onComplete()` diretta, nessuna dipendenza dal backend; flag booleano localStorage; ripercorribile via "Impostazioni IA" |

---

## 3. Vulnerabilità trovate

**Nessuna vulnerabilità critica o alta introdotta dalla Fase 3.** Nessun problema di severità alta/critica
aperto sulle modifiche della fase.

Note **da monitorare** (non bloccanti; nessuna introdotta o peggiorata da questa fase):

### 3.1 (media — pre-esistente, INVARIATO) CORS permissivo `*` + superfici profili ora esposte anche in UI
- **File/riga:** `server.js:36` (`app.use(cors())`) — già registrato in Fase 0/1 §3.1 e Fase 2 §3.1.
- **Descrizione:** la Fase 3 aggiunge UI che usa gli endpoint `/api/ai/profiles*` già esistenti, senza
  toccare il CORS e senza nuove superfici. Resta valida la mitigazione richiesta per la Fase 7:
  allowlist origini locali o token/CSRF locale per gli endpoint mutanti.
- **Nota Fase 3:** la chiave viaggia in chiaro nel body della POST di creazione su **loopback**
  (`127.0.0.1:3001`) — mitigazione intrinseca di rete; in Electron verrà sostituita da `safeStorage` (piano 1.1).

### 3.2 (bassa — pre-esistente, INVARIATO) Rate limiting assente
- **File:** `server.js` (`/:id/test`, ecc.) — Fase 2 §3.2, azione Fase 7. La Fase 3 non aggiunge chiamate
  automatiche (test solo su azione esplicita dell'utente).

### 3.3 (bassa — pre-esistente, INVARIATO) Advisory `nanoid` (high) / `postcss` (moderate) nel lock frontend
- **File:** `frontend/package-lock.json` — Fase 0 §3.2 / Fase 2 §3.3; non introdotte né toccate qui.

### 3.4 (bassa — nota UX, non di sicurezza) `isKeyRequired` tratta ogni endpoint non-localhost come cloud
- **File/riga:** `frontend/src/ai/aiConfig.js:111-119`
- **Descrizione:** per `openai-compatible`, la chiave è obbligatoria se la baseUrl non matcha
  `localhost`/`127.0.0.1`. Un endpoint LAN privato (`http://192.168.x.x`) richiederebbe quindi la chiave
  anche se il servizio locale non la richiede. Comportamento **più restrittivo del necessario** (a favore
  della sicurezza), condiviso con la validazione del form; non espone nulla. Da riesaminare in Fase 4/5
  per UX (es. riconoscere anche IP privati RFC1918).

### 3.5 (bassa — igiene repo) File untracked dell'orchestratore in root
- **File:** `run-orchestrator.log/err/pid`, `test-detach.log/pid` — Fase 2 §3.5, da ripulire/ignorare prima della pubblicazione.

---

## 4. Conclusioni

- **Diff reale della fase:** verificato e coincidente con la dichiarazione del dev (4 file nuovi + `App.jsx`
  +57/−0 in 4 punti). Nessun file backend toccato; i diff backend sono le sole modifiche pre-esistenti
  Fasi 0/1/2 già auditate.
- **Checklist Fase 3 (prompt, DoD 7, 8, 12):** nessun `console.*` nei file nuovi con dati sensibili ✅;
  chiave azzerata e mascherata da `hasApiKey` dopo il salvataggio, mai riletta ✅; chiave solo nel body
  della singola POST di creazione, mai in GET/test/activate (body assenti) ✅; localStorage solo flag
  booleano ✅; nessun fetch verso host ≠ `http://localhost:3001` (le baseUrl esterne dei preset sono dati
  costanti inviati al backend) ✅; nessun segreto/path personale nei file toccati (falso positivo `sk-` in
  `vite.svg` pre-esistente e invariato, escluso da pattern stringenti) ✅; placeholder di test chiaramente
  fittizi (`FAKE-PLACEHOLDER-KEY`) ✅.
- **Vincoli non negoziabili:** 1.3 (nessuna chiave in codice/git/log/state) ✅; Fase 2 §3.1 CORS non
  peggiorato, nessuna nuova superficie ✅; Fase 2 §3.3 nessuna nuova dipendenza ✅; Fase 2 §3.6 lista vuota
  da vault dev-only gestita senza crash ✅; nessun refactor/anticipo Fase 4 ✅; `git diff -- App.jsx` = solo
  i 4 punti dichiarati ✅.
- **Regressioni:** `npm test` dalla root **exit 0** (65 test backend invariati + 23 frontend). ✅
- **Problemi bloccanti (alta/critica):** **0**.
- **Esito: PASS.** Le note §3.1–§3.5 non bloccano la fase (pre-esistenti e/o fuori scope; nessuna
  introdotta o peggiorata dalla Fase 3) ma restano tracciate per i gate successivi — in particolare §3.1
  (CORS + superfici) e §3.2 (rate-limit) alla Fase 7.