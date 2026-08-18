# Task — Retry Fase 4: Design system & rifattorizzazione frontend (tentativo 3)

## Obiettivo
Completare la rifattorizzazione strutturale della Fase 4, non completata nei tentativi 1 e 2. Il contesto
completo (mappa di `App.jsx`, tabella di estrazione, vincoli, DoD) è in `implementation/prompts/phase-4.md`:
**leggilo e rispettalo per intero**. Questo file elenca SOLO ciò che manca, dal report QA del tentativo 2
(`implementation/reports/phase-4-qa.md`).

## Stato attuale verificato dal QA (tentativo 2)
- `App.jsx` è **ancora il monolite di 2.730 righe** (shell NON creata: `WizardShell.jsx`, `AIPersona.jsx`,
  `steps/Step{Welcome,Hardware,Music,Tuning,EqFinal}.jsx`, `onboarding-ai/*` inesistenti).
- Esistono ma sono **orfani** (non importati da App.jsx): `Scene3D.jsx`, `ManualSpecsCard.jsx`,
  `charts/EqCurveTooltip.jsx`, `StepHardware.jsx`, `contexts/EqStateContext.jsx`, `contexts/eqReducer.js`,
  `hooks/*`, `data/eqOptions.js`, `utils/eqChart.js`, `utils/genreDefaults.js`, `utils/exporters.js`,
  `api/client.js`, `design-tokens/*`.
- `OnboardingAiStep.jsx` = 676 righe, non scomposto; `StepHardware.jsx` = 386 righe (oltre il cap ~300).
- `npm test` (root): **19 test falliti** (identici al tentativo 1): `eqOptions.test.js` (1),
  `eqChart.test.js` (16), `exporters.test.js` (2). `npm run build` (frontend) = OK.
- `plan_state.json` è stato modificato dal dev (VIETATO): riportarlo invariato.
- Security: PASS (nessun segreto, unico host `localhost:3001`, nessuna nuova dipendenza).

## Cosa implementare (TUTTI i punti, in quest'ordine)

### 1. Fix dei 19 test rossi (più veloce, fallo per primo)
- `frontend/src/data/eqOptions.test.js:11` — attende `GENRES_LIST` di 10 elementi, i dati reali ne hanno 9.
  Allinea il test ai dati reali (coerente con `App.jsx:14-24`).
- `frontend/src/utils/eqChart.test.js` — 16 failure: `calculateTripleChartData([],[],[])` deve restituire
  `[]` (non 51 punti a gain 0); la griglia logaritmica deve dare 20000 Hz esatti all'estremo superiore
  (`points[50].freq === 20000`, non 19999); i lookup per frequenza esatta (1000/20000) devono trovare il
  punto (off-by-one nella griglia). Correggi l'implementazione `eqChart.js` (o il test, se è il test a
  esprimere la semantica sbagliata) affinché sia verde. La semantica corretta: input nulli/vuoti → `[]`;
  estremi esatti; lookup per frequenza esatta.
- `frontend/src/utils/exporters.test.js:87, 129` — `generateWaveletText(...)` restituisce `undefined`
  (parte pura estratta da `App.jsx:971-1004`): deve tornare la stringa `GraphicEQ: ...` con 127 bande.
  Correggi `utils/exporters.js`.

### 2. Rifattorizzazione strutturale di `App.jsx` (il grosso)
Trasformarlo in **shell sottile < 200 righe** seguendo la tabella di estrazione di `phase-4.md` §2:
- `components/WizardShell.jsx` (header + AnimatePresence step + footer timeline `[1,2,3,4]` + nav con
  validazioni identiche + `wizardContentRef` per scroll-to-top)
- `components/AIPersona.jsx` (identico, da 422-655, stessa interface di props)
- `components/Scene3D.jsx`, `components/ManualSpecsCard.jsx`, `components/charts/EqCurveTooltip.jsx`
- `components/steps/StepWelcome.jsx` (1442-1472), `StepHardware.jsx` (1475-1822 — 386 righe, **spezzalo**
  ulteriormente: es. `HardwareProfiler` + sezione `ManualSpecs`), `StepMusic.jsx` (1825-2020),
  `StepTuning.jsx` (2023-2315), `StepEqFinal.jsx` (2318-2655 — se > 300 righe, spezza in
  `FineTuningPanel`, `EqFiltersTable`, `ExportActions`)
- **Cablare TUTTO in `App.jsx`**: `EqStateProvider` al posto di `useReducer` inline (659),
  `WizardShell`, `AIPersona`, `Scene3D`, `ManualSpecsCard`, `EqCurveTooltip`, gli step, il gate Fase 3
  sopra il wizard (1389-1395) e i 6 hook (`useEqCalculation`, `useLiveSync`, `useEqRefinement`,
  `useHardwareDiscovery`, `usePresets`, `useMediaQuery`) — oggi orfani. Il comportamento runtime deve
  restare identico (stessi payload, stessi `console.error`, stesse classi CSS).

### 3. Scomposizione di `OnboardingAiStep.jsx` (676 → tutti < 300)
Cartella `src/components/onboarding-ai/`: `OnboardingAiStep.jsx` orchestratore + `ChoiceView`,
`LocalView`, `CloudView`, `ProfileForm`, `SavedProfileCard`, `ManageView`, `shared.jsx` (TierBadge/
FieldError/Spinner/renderMessages/renderTierNote). Importa `aiConfig.js` (nessuna reimplementazione),
`OnboardingAiStep.css` invariato, garanzie security identiche (chiave solo nella POST di creazione,
azzerata dopo, mascherata da `hasApiKey`, niente console con dati sensibili).

### 4. Wiring hook/context e verifica finale
- `useEqCalculation`/`useLiveSync`/`useEqRefinement`/`useHardwareDiscovery`/`usePresets` usati da App/step.
- `git checkout` di `implementation/plan_state.json` (ripristino stato).
- Self-check: `npm test` (root) → exit 0 (65 backend + tutti i frontend verdi); `npm run build` (frontend)
  → exit 0; ogni file `.jsx` nuovo/modificato < ~300 righe, `App.jsx` < 200; `git diff --stat` per
  verificare confine (AudioPlayerAB/SearchableCombobox/App.css/backend intoccati).

## Vincoli non negoziabili (sintesi, vedi phase-4.md per i dettagli)
- Nessuna nuova dipendenza; `frontend/package-lock.json` invariato (diff vuoto).
- Non toccare: `server.js`, `engine/**`, `test/*.test.js`, `implementation/plan_state.json`,
  `AudioPlayerAB.jsx`, `SearchableCombobox.jsx`, `App.css`, `aiConfig.js`, `aiConfig.test.js`, `smoke.test.js`.
- Non committare. Nessun fetch verso host ≠ `http://localhost:3001` (passa da `api/client.js` `API_BASE`).
- Numerazione step 0-4, clamps, timeline `[1,2,3,4]`, `maxStepReached`, gate IA sopra il wizard: invariati.
- Nessun restyling estetico (Fase 5), nessuna vista tabellare Recharts, nessuna chat dockable.

## Definition of Done (verificabili)
1. `npm test` root → exit 0 (i 19 test rossi sono verdi, nessuna regressione backend/frontend esistenti).
2. `npm run build` (frontend) → exit 0.
3. `App.jsx` < 200 righe, shell sottile; tutti gli step/componenti cablati e usati; nessun modulo orfano.
4. Ogni file `.jsx` creato/modificato in Fase 4 < ~300 righe; `OnboardingAiStep` scomposto in `onboarding-ai/`.
5. `git diff -- implementation/plan_state.json` vuoto.
6. Security: grep su file nuovi → 0 match `sk-`, `Bearer `, `C:\Users`, `AIza`, `ghp_`, `AKIA`.

## Se questo è un retry
Tentativo 3. I problemi del tentativo 2 sono elencati sopra (report `implementation/reports/phase-4-qa.md`).
Risolvili TUTTI. Se dopo l'implementazione i gate FAILANO di nuovo, la fase resta `blocked` e richiederà
decisione umana: fai in modo che questo non accada (self-check completo prima di dichiararti finito).
