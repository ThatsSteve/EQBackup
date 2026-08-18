# Task — Fase 4: Design system & rifattorizzazione frontend

## Obiettivo
Fondamenta del redesign come da piano 1.4 e sezione 5 FASE 4: **centralizzare i token di design** (colore, tipografia, spaziatura, breakpoint) come unica sorgente di verità, **scomporre il monolite `frontend/src/App.jsx` (2.730 righe)** in `WizardShell` + step separati + `contexts/EqStateContext` + hook dedicati (`useEqCalculation`, `useLiveSync`), **scomporre `OnboardingAiStep.jsx` (676 righe)** sotto il tetto delle ~300 righe, e garantire **layout responsive mobile/desktop dalla stessa base di componenti** — mantenendo **comportamento funzionale identico pre/post refactor** (regressione zero, verificata da `qa-verifier` contro la Fase 1) e **nessun file di componente sopra ~300 righe**.

## Contesto (verificato sul codice reale al 2026-08-18)

- Sei `frontend-redesign-dev`. Repo: `C:\Users\yscuo\Desktop\EQ` (git; HEAD `26fd0b5`; working tree con modifiche Fasi 0/1/2/3 **non committate**). **Non committare nulla**: la commit avviene a fine ciclo dall'orchestratore.
- Fasi 0-3 sono DONE con gate security=PASS e QA=PASS (report in `implementation/reports/phase-{0,1,2,3}-{security,qa}.md`). Fase 4 è `ready` in `implementation/plan_state.json` (`attempts: 0`) — primo tentativo.
- Il **backend è completo e fuori scope** (65 test pass: engine/ai, endpoint profili, SSE): **non toccare `server.js`, `engine/**`, `test/*.test.js`**. La Fase 4 è frontend-only.
- Test attuali da mantenere verdi: frontend **23 test** (`frontend/src/smoke.test.js` 1 + `frontend/src/ai/aiConfig.test.js` 22), backend 65. `npm test` dalla root = `vitest run && npm --prefix frontend test` (`package.json` root, verificato).

### La skill `frontend-design` NON è disponibile in questo ambiente
Il piano (1.4) dice "vedi `frontend-design` skill per i vincoli di stile disponibili in questo ambiente". **Verificato: nessuna skill con questo nome è registrata qui** (disponibile solo `customize-opencode`). I vincoli di stile di questa fase sono quindi **vincolati direttamente ai principi del piano §1.4** (elencati sotto, sezione "Cosa implementare → 1. Design tokens"). Se la skill comparisse, puoi consultarla; in sua assenza i principi del piano sono la fonte.

### Mappa strutturale di `frontend/src/App.jsx` (2.730 righe, verificata)

| Blocco | Righe | Contenuto |
|---|---|---|
| Costanti dati | 14-45 | `GENRES_LIST`, `BASS_OPTIONS`, `MIDS_OPTIONS`, `TREBLE_OPTIONS` (pure) |
| `initialState` | 47-74 | `step:0, setupMode, targetCurve, headphone, dac, amp, uploadedFiles, selectedGenres, selectedArtists, baseVol, balance, threshold, soundstage, bass, mids, treble, listeningPreferences{6 gain}, destination:'e-apo', chatHistory` |
| `reducer` | 76-115 | `SET_STEP`, `NEXT_STEP` → `Math.min(4, ...)` (riga 79), `PREV_STEP` → `Math.max(0, ...)` (riga 80), `UPDATE`, `UPDATE_PREF`, `TOGGLE_GENRE` (+ derivazione `targetCurve`), `TOGGLE_ARTIST` (max 5), `APPEND_CHAT` |
| `calculateTripleChartData` | 118-156 | helper puro (curva triple, 51 punti) |
| `CustomTooltip` | 158-185 | tooltip Recharts (stili inline) |
| `Scene3D` | 188-226 | canvas @react-three/fiber (particelle, light) |
| `ManualSpecsCard` | 229-419 | scheda inserimento manuale specifiche DAC/Amp/Cuffia (+OCR finto) |
| `AIPersona` | 422-655 | chat concierge (233 righe, già <300): context msg su step 1-4 (435-449), hidden su `state.step===0` (509), `fetch /api/chat` (470), tutorOptions, handleSend |
| `App()` main | 658-2728 | vedi sotto |
| — reducer istanza | 659 | `useReducer(reducer, initialState)` |
| — gate Fase 3 | 664-683 | `aiOnboardingDone` (localStorage `PEQ_AI_ONBOARDING_DONE`, SOLO booleano), `aiSettingsOpen`, `useEffect` GET profili che auto-completa se esiste profilo attivo |
| — stato UI/dominio | 685-724 | `isServerConnected, engineStatus, eqData, exportRawData, availableArtists, searchArtistQuery, copied, showError, isMobileChatOpen, uploadedAudioTrack, presets, presetName, debounceTimer, wizardContentRef, paramEq, aiPrompt, isAiProcessing`, hardware (`brands, models, selectedBrand, hwStatus, hwLoading, activeLevel3Form, manualSpecs, customInputMode`), EQ (`baselineEqData, aiGeneratedEqData, activeTabEq, activeAccordionTab, historyLog, refinementHistory, isRefining, activeFaq`), `maxStepReached` (723), `isLiveSyncEnabled` (724) |
| — `toggleLiveSync` | 726-744 | check `GET /api/live-sync/check` + toggle |
| — `handleBrandChange` | 746-767 | `GET /api/hardware/models?brand=&type=` |
| — `handleResolveHardware` | 769-821 | `POST /api/hardware/resolve` + `APPEND_CHAT` con tutorOptions/deviceType |
| — fetch iniziali | 823-855 | `GET brands` x3, `GET /api/artists`, `GET /api/presets`, `GET /api/engine-status` (mount) |
| — presets | 857-896 | `LOCAL_STORAGE_KEY='PersonalEQ_Presets'` + load/save + `handleActivatePreset` (setta `step:3`!) |
| — **sync EQ debounced** | 899-935 | debounce 200ms → `POST /api/calculate-eq` `{state, destination}`; setta `eqData`/`baselineEqData`/`aiGeneratedEqData`/`exportRawData`; `setIsServerConnected` |
| — `maxStepReached` effect | 937-948 | incremento + reset stati step 4 quando `state.step < 4` |
| — export | 950-1024 | `copyToClipboard`, `downloadFile` (E-APO), `downloadWavelet` (loop 127 bande, parte pura), `downloadPassportJSON` (parte pura) |
| — artisti | 1026-1091 | `handleAddCustomArtist`, `handleResolveArtistOnline` (`POST /api/resolve-artist`) |
| — refinement EQ | 1093-1291 | `applyOrAddFilter` (puro, 1093-1097), `handleUndoRefinement`, `handleRefineEQ`, `handleApplyParametric`, `handleAiParametric` (`POST /api/eq/refine` x4 + `/api/chat`), `handleRestoreBaseline`, `handleRestoreAI` |
| — derived | 1293-1338 | `varianti` (motion), `chartData` (1299-1303), `filteredArtists`, `mapGenresToDefaults` (puro, 1307-1338) |
| — gate completamento + nav | 1341-1372 | `handleAiOnboardingComplete` (1341-1348, scroll difensivo su `wizardContentRef`), `handleNextStep` (1350-1372, validazioni step 1 cuffia obbligatoria / step 2 default generi) |
| — render | 1374-2727 | `canvas-bg`+`Canvas`+`Scene3D` (1376-1380); `app-container` (1381); `main-wizard-wrapper` (1388); **gate** `(!aiOnboardingDone \|\| aiSettingsOpen) ? <OnboardingAiStep/> : <wizard>` (1389-1395); wizard `motion.div` (1396-2708) con header (1402-1436: titolo, ⚙️ Impostazioni IA 1412-1419, select presets 1421-1432), `wizard-content ref={wizardContentRef}` (1438) con `AnimatePresence` → **step 0** (1442-1472), **step 1** (1475-1822), **step 2** (1825-2020), **step 3** (2023-2315), **step 4** (2318-2655); footer timeline `[1,2,3,4]` + nav (2659-2707, `NEXT` 2700-2704); `AIPersona` (2713); FAB mobile `state.step > 0` (2716-2723) |

**Fatti verificati da usare come baseline di regressione:**
- **18 fetch hardcoded** `http://localhost:3001` in App.jsx, righe: 470, 672, 732, 774, 825, 828, 831, 835, 842, 849, 906, 1047, 1104, 1160, 1194, 1227, 1259, 1279 (tutti con `headers: {'Content-Type':'application/json'}`).
- **21 condizioni su `state.step`**: righe 435, 443, 445, 447, 509, 900, 916, 922, 938, 941, 1351, 1357, 1442, 1475, 1825, 2023, 2318, 2659, 2671, 2700, 2716.
- **12 `console.error` pre-esistenti** in App.jsx (righe 761, 817, 840, 847, 854, 866, 929, 1088, 1121, 1177, 1211, 1246): vanno **spostati senza modifiche di contenuto** nei nuovi file (nessuno contiene dati sensibili).
- `vite.config.js` senza proxy; porta dev default **5173**; `frontend/package.json` ESM, devDeps solo vite/vitest/oxlint/plugin-react (nessun jsdom/@testing-library, e **non installarli**).

### Componenti e file esistenti (dimensioni verificate)
- `frontend/src/App.jsx` — 2.730 righe (monolite da scomporre).
- `frontend/src/components/OnboardingAiStep.jsx` — **676 righe** (da scomporre): `API_PROFILES` (41), `TierBadge`/`FieldError`/`Spinner` (43-55), `fetchProfiles` (84-107), `handleCreateProfile` (160-189, chiave azzerata a 176), `handleTestProfile` (192-216), `handleActivateProfile` (219-240, tier 3 mai bloccante), `renderForm` (263-332), `renderSavedProfileCard` (335-382), `renderMessages`/`renderTierNote` (384-396), modalità **manage** (399-497), onboarding choice/local/cloud (507-563, 565-624, 626-672). `OnboardingAiStep.css` — 316 righe, prefisso `aionb-`, media query a 297 (`prefers-reduced-motion`) e 308 (`max-width:640px`).
- `frontend/src/components/AudioPlayerAB.jsx` — 911 righe, `frontend/src/components/SearchableCombobox.jsx` — 327 righe: **pre-esistenti, >300, NON in scope di scomposizione per questa fase** (fix/redesign player = Fase 5; vedi DA CHIARIRE 1). **Non toccarli.**
- `frontend/src/index.css` — 1.006 righe: `:root` (2-13) con **10 custom properties** (`--bg-dark:#07080a; --bg-panel:rgba(15,18,25,0.85); --text-main:#f8fafc; --text-muted:#94a3b8; --accent-blue:#3b82f6; --accent-blue-glow; --accent-cyan:#00f0ff; --accent-cyan-glow; --border-color:rgba(255,255,255,0.08); --border-active:rgba(0,240,255,0.4)`), classi riusabili (`.glass-panel` 62, `.step-container` 244, `.step-title` 253, `.step-subtitle` 263, `.options-grid` 282, `.option-card` 297, `.badge` 362, `.input-group` 387, `.input-label` 400, `.hardware-input` 414, `.btn-primary` 526, `.btn-secondary` 548, `.error-text` 234, `.timeline-*` 98-232, `.chart-container` 792, `.eq-table` 832…), media query 200 (`768px`) e 217 (`500px`).
- `frontend/src/App.css` — media query 307 (`900px`) e 408 (`768px`); layout `.sidebar-concierge` / `.mobile-chat-fab` / `.mobile-open` (base responsive esistente).
- `frontend/src/ai/aiConfig.js` — modulo puro Fase 3 (presets, `tierToBadge`, `isKeyRequired`, `validateProfileForm`, `defaultProfileName`, `maskedKeyLabel`); `frontend/src/ai/aiConfig.test.js` — 22 test.
- `frontend/src/main.jsx` — importa `./index.css` poi `<App/>` in StrictMode.

### Note dai gate della Fase 3 (report in `implementation/reports/phase-3-{security,qa}.md`)
- **`isKeyRequired`** (`aiConfig.js:111-119`, nota security §3.4): tratta come "cloud" ogni endpoint non-localhost → un IP LAN RFC1918 richiederebbe la chiave. Nota del report: "da riesaminare in Fase 4/5". **Decisione per questa fase: NON modificarlo** (cambierebbe validazione + i 2 test esistenti; rischio non necessario in una fase strutturale). Valuta e documenta la tua posizione nel messaggio finale; l'eventuale estensione a RFC1918 è una micro-decisione di UX da registrare, non da eseguire qui.
- CORS permissivo `*` (`server.js:36`) e rate-limit assenti: **azioni Fase 7, non toccare**.
- Advisory pre-esistenti nel lock frontend: `nanoid <3.3.18` (high), `postcss <=8.5.22` (moderate): **nessuna nuova dipendenza**, `frontend/package-lock.json` invariato.
- Resa visiva: "da confermare umanamente" (limite di fase senza jsdom/@testing-library). La Fase 4 **non deve cambiare la resa**: l'unica conferma visiva richiesta è l'assenza di regressioni evidenti.

### Decisioni già prese (vincolanti, esegui come indicato)

**Confine Fase 4 / Fase 5 — netto e non negoziabile:**
- **FA la Fase 4:** (1) token di design centralizzati e pronti all'uso; (2) scomposizione strutturale di `App.jsx` e `OnboardingAiStep.jsx` sotto il tetto ~300 righe; (3) `EqStateContext` + reducer puro; (4) hook `useEqCalculation` e `useLiveSync` (più eventuali supplementari); (5) estrazione di moduli puri testabili; (6) stessa base di componenti mobile/desktop (nessun duplicato per viewport); (7) i componenti estratti usano i token **dove già esistenti** (cioè le `var(--...)` che il codice oggi già usa e le classi di `index.css`, senza restyling forzato); (8) regressione zero.
- **NON FA la Fase 4 (appartiene a Fase 5):** applicazione estetica completa del design system a tutti gli step (conversione dei colori hardcoded tipo `#00f0ff`/`#ffb142` inline negli step in token, restyling dei contenuti), fix dei bug del player `AudioPlayerAB` (`biquadNodesRef`, doppio volume, RAF loop), vista tabellare alternativa per i grafici Recharts, chat persistente dockable/bottom-sheet (Fase 6), **rinumerazione degli step/timeline** (solo valutazione e documentazione), migrazione di tutte le media query CSS esistenti ai token, spostamento/modifica del gate IA. Se un'estrazione ti "costringe" a un ritocco estetico, evitalo: sposta il codice **identico**.

**Numerazione step — invariata:** `state.step` resta **0-4**; `step:0` resta la biforcazione Interattivo/Analitico dentro il wizard; il gate IA della Fase 3 resta **sopra** il wizard (`App.jsx:1389-1395`); reducer clamps `Math.min(4,...)`/`Math.max(0,...)`, timeline `[1,2,3,4]`, `maxStepReached` invariati. Il gate può restare in `App.jsx` (che diventa shell sottile) o trasferirsi in `WizardShell`; il comportamento (`mode` onboarding/manage, `onComplete`/`onClose`, scroll-to-top su completamento quando il wizard è montato) deve restare identico. Valuta nel messaggio finale se una futura rinumerazione sarebbe auspicabile (nota per Fase 5) ma **non eseguirla**.

**Comportamenti che devono restare identici (baseline di regressione):** wizard step 0-4 con stessi contenuti; timeline e `maxStepReached`; gate IA Fase 3 (onboarding a 3 opzioni, quick-start locali, endpoint manuale, "Nessuna IA" sempre percorribile, gestione multi-profilo da ⚙️ Impostazioni IA, lista vuota senza crash, chiave mai riletta/mascherata via `hasApiKey`); chat `AIPersona` (hidden su step 0, messaggi contestuali su step 1-4, tutorOptions con deviceType che agiscono su `setHwStatus`/`setActiveLevel3Form`, engine badge, FAB mobile); live sync; presets (header + step 4 + attivazione che porta a `step:3`); export Appunti/E-APO/Wavelet/JSON; ricerca artisti online + custom; hardware profiler con badge e card manuali; grafici (stessi dati `chartData`); scroll-to-top su navigazione.

## Cosa implementare

### 1. Design tokens centralizzati — unica sorgente di verità
Nuova cartella `frontend/src/design-tokens/`:

- **`tokens.js`** — modulo **puro ES** (testabile senza DOM) che esporta un oggetto unico con sezioni:
  - `colors`: palette **tema scuro default** coerente con i colori reali dell'app (verificati in `index.css` e negli inline di App.jsx/componenti): superfici/glass con livelli di profondità (`--bg-dark #07080a`, pannelli `rgba(15,18,25,0.85)` con blur, bordi), testo (`--text-main #f8fafc`, `--text-muted #94a3b8`), accenti (`--accent-cyan #00f0ff`, `--accent-blue #3b82f6`, glow), semantici (`#00ff87` successo, `#ffb142` warning, `#ff3366`/`#ff4757` pericolo/errore, `#10b981`, `#ffa500`), bande timbriche step 3 (`#ff416c` bassi, `#d452d1` medi, `#00ff87` alti), input `#13131f`/`#0c1016`. Non inventare palette: **riorganizza i valori già in uso**.
  - `gradients`: **`waveform`** (accento a gradiente ispirato a forma d'onda, es. `linear-gradient(135deg, #00f0ff, #3b82f6)` — coerente con `.timeline-track-fill`/`.btn-primary` attuali), `textTitle` (gradiente testuale di `.title`).
  - `typography`: `ui` (sans tecnico, stack attuale `'Inter', -apple-system, ...` da `index.css:17`) e **`display` (font per i titoli)** — stack di sistema senza caricare font (zero nuove dipendenze: vedi DA CHIARIRE 2); scale pesi e dimensioni.
  - `spacing`: scala coerente con i valori usati (gap 8/10/12/14/16/20/24, padding 14/16/20/24/32/48).
  - `breakpoints`: `{ mobile: 640, tablet: 768, desktop: 1024 }` (px) — **unica sorgente di verità**: nessuna nuova media query con valori diversi da questi; le media query esistenti (500/640/768/900) non si toccano in Fase 4.
  - `radii`, `shadows` (profondità: riprendere i box-shadow di `.glass-panel`/`.option-card`), `blurs` (vetro: 12/28px), `motion` (duration/easing + handling `prefers-reduced-motion`).
  - Helper puro **`tokensToCssVars(tokens)`** → stringa `:root { ... }` completa, incluse **alias con i 10 nomi legacy** di `index.css` (`--bg-dark`, `--text-muted`, `--accent-cyan`, ecc.) **con valori identici** (App.css, AudioPlayerAB, OnboardingAiStep.css e inline in App.jsx li usano: rimuoverli romperebbe la resa).
- **`tokens.css`** — le custom properties effettive (derivate da `tokens.js`, header con commento "mantenere in sync con tokens.js"), **importato da `index.css`** (sostituendo il blocco `:root` attuale, che deve risultare identico come valori) **o** da `main.jsx` prima di `index.css` (ordine di import a tua scelta, risultato identico).
- **`tokens.test.js`** (Vitest, puro): shape delle sezioni non vuote; breakpoints mobile-first e positivi; coppie testo-su-superficie principali con contrasto ≥ 4.5:1 (implementa `contrastRatio(hexA, hexB)` puro con luminanza relativa WCAG — es. `--text-main` su `--bg-dark` e `--text-muted` su `--bg-dark`); `tokensToCssVars` genera stringa che inizia con `:root {` e contiene tutti i 10 nomi legacy con gli stessi valori di oggi.
- Principi §1.4 da rispettare NEI TOKEN (non nel restyling, che è Fase 5): tema scuro default; superfici vetro/profondità; accenti a gradiente ispirati a forma d'onda; sans tecnico per UI + display per titoli; evitare l'aspetto "Tailwind di default" (niente utility-soup generica: i token sono semantici, non classi utility); focus visibile e `prefers-reduced-motion` previsti nei token (`motion`/`focus`).

### 2. Scomposizione di `App.jsx` — mapping obbligatorio (righe sorgenti verificate)

`App.jsx` diventa uno **shell sottile di composizione** (target < 200 righe): `EqStateProvider` (o provider + `useReducer`), gate Fase 3 (stati `aiOnboardingDone`/`aiSettingsOpen` + effect GET profili + `handleAiOnboardingComplete`), layout (`canvas-bg` + `Scene3D`, `app-container`), `WizardShell`, `AIPersona`, FAB. **Non deve contenere logica di step, fetch di dominio o JSX di step.**

| Nuovo file | Sorgente (App.jsx) | Contenuto |
|---|---|---|
| `src/components/WizardShell.jsx` | 1402-1436 (header), 1438-2657 (container step), 2659-2707 (footer) + `varianti` (1293-1297) + `handleNextStep` (1350-1372) | header (titolo + select presets + ⚙️ Impostazioni IA via prop `onOpenAiSettings`), contenitore `AnimatePresence` che renderizza lo step corrente, footer timeline `[1,2,3,4]` + Avanti/Indietro con validazioni identiche; gestisce `wizardContentRef` per lo scroll-to-top su navigazione |
| `src/components/steps/StepWelcome.jsx` | 1442-1472 | step 0 biforcazione (Interattivo/Analitico) |
| `src/components/steps/StepHardware.jsx` | 1475-1822 | step 1 hardware profiler (SearchableCombobox x3, badge, `ManualSpecsCard`, drop-zone upload) |
| `src/components/steps/StepMusic.jsx` | 1825-2020 | step 2 (interactive: brano/upload; analytical: generi + artisti + targetCurve) |
| `src/components/steps/StepTuning.jsx` | 2023-2315 | step 3 (interactive: AudioPlayerAB + grafico live; analytical: BASS/MIDS/TREBLE + AudioPlayerAB + brief) |
| `src/components/steps/StepEqFinal.jsx` | 2318-2655 | step 4 (tab A/B, grafico, fine-tuning, parametrico, AI prompt, cronologia, tabella EQ, FAQ, export, presets) |
| `src/components/AIPersona.jsx` | 422-655 | chat concierge **identica** (stessa interface di props di oggi: `state, dispatch, setEqData, setExportRawData, engineStatus, isMobileChatOpen, setIsMobileChatOpen, activeLevel3Form, setActiveLevel3Form, manualSpecs, setManualSpecs, setHwStatus, isLiveSyncEnabled`) |
| `src/components/Scene3D.jsx` | 188-226 | canvas 3D identico |
| `src/components/ManualSpecsCard.jsx` | 229-419 | card manuale identica (props attuali) |
| `src/components/charts/EqCurveTooltip.jsx` | 158-185 | `CustomTooltip` identico |
| `src/contexts/EqStateContext.jsx` | — | provider + `useEqState()` (vedi punto 3) |
| `src/contexts/eqReducer.js` | 47-115 | `initialState` + `reducer` **puri**, identici riga per riga (vedi punto 3) |
| `src/hooks/useEqCalculation.js` | 899-935 + stati 687-688/715-716 + `chartData` (1299-1303) | sync debounced 200ms → `POST /api/calculate-eq`, gestione `payload`/`agnosticEq`/`fileContent`, `isServerConnected`; espone `eqData, exportRawData, baselineEqData, aiGeneratedEqData, chartData` |
| `src/hooks/useLiveSync.js` | 724 + 726-744 | `isLiveSyncEnabled` + `toggleLiveSync` (check `GET /api/live-sync/check`) |
| `src/hooks/useEqRefinement.js` | 1093-1291 | refinement/parametrico/AI/undo/restore + `applyOrAddFilter` (spostata qui o in utils) + `historyLog, refinementHistory, isRefining, paramEq, aiPrompt, isAiProcessing, activeTabEq` |
| `src/hooks/useHardwareDiscovery.js` | 707-713 (stati), 746-767, 769-821, 825-833 (fetch brands) | brands/models/selectedBrand/customInputMode/hwLoading/hwStatus/activeLevel3Form/manualSpecs + `handleBrandChange`, `handleResolveHardware` |
| `src/hooks/usePresets.js` | 857-896, 842-847 (fetch presets) | presets/presetName + load localStorage + `handleSavePreset`, `handleActivatePreset` (che fa `SET_STEP 3`) — **condiviso da WizardShell (header) e StepEqFinal** |
| `src/hooks/useMediaQuery.js` | — | `useMediaQuery(name)` su `window.matchMedia` con valori da `tokens.breakpoints` |
| `src/data/eqOptions.js` | 14-45 | `GENRES_LIST`, `BASS_OPTIONS`, `MIDS_OPTIONS`, `TREBLE_OPTIONS` (puri) |
| `src/utils/eqChart.js` | 118-156 | `calculateTripleChartData` (puro) |
| `src/utils/genreDefaults.js` | 1307-1338 | `mapGenresToDefaults` (puro) |
| `src/utils/exporters.js` | 971-1004 (parte pura: generazione testo GraphicEQ 127 bande), 1006-1024 (parte pura: oggetto passport) | `generateWaveletText(eqData)`, `buildPassportData(eqData, state)` puri + wrapper DOM sottili (`downloadFile`, `downloadWavelet`, `downloadPassportJSON`, `copyToClipboard`) |
| `src/api/client.js` | — | `export const API_BASE = 'http://localhost:3001';` — **tutti** i fetch del frontend (App.jsx 18 occorrenze + OnboardingAiStep 4) usano `${API_BASE}/api/...`; helper `apiGet`/`apiPost` opzionali ma a body/header identici |

**Regole di estrazione:** sposta il codice **identico** (stessi payload, stessi messaggi, stessi `console.error`, stesse classi CSS, stessi stili inline). Ogni componente estratto riceve via props o context solo ciò che usa. Ogni stato condiviso tra più componenti estratti (es. `presets`, `activeLevel3Form`/`manualSpecs`/`setHwStatus` usati da AIPersona E StepHardware, `uploadedAudioTrack` usato da StepMusic E StepTuning, `isLiveSyncEnabled` usato da StepTuning/StepEqFinal) deve risiedere a livello `App` (via hook) e scendere come props, esattamente come oggi. Nessun componente sopra ~300 righe; se un file supera il tetto, spezza ulteriormente (es. `StepEqFinal` in `FineTuningPanel`, `EqFiltersTable`, `ExportActions`).

### 3. Context + reducer puro
- `src/contexts/eqReducer.js` — `initialState` + `reducer` copiati **identici** da App.jsx:47-115 (i 7 action type, clamps 4/0, max 5 artisti, derivazione `targetCurve` in `TOGGLE_GENRE`). Modulo puro, nessun import React.
- `src/contexts/EqStateContext.jsx` — `EqStateProvider` (`useReducer(reducer, initialState)`) + `useEqState()`; sostituisce `useReducer` a App.jsx:659. **La semantica di `state.step` (0-4) e di ogni campo non cambia.**

### 4. Hook dedicati
- `useEqCalculation` (sync debounced `POST /api/calculate-eq`, dipendenze/stato identici: il debounce di 200ms con cleanup e `setIsServerConnected` a true/false come oggi; `baselineEqData`/`aiGeneratedEqData` valorizzati solo a `state.step === 4` come oggi) e `useLiveSync` come da tabella. Hook supplementari (`useEqRefinement`, `useHardwareDiscovery`, `usePresets`, `useMediaQuery`) ammessi e raccomandati se servono a rispettare il tetto ~300 righe. Ogni hook < 300 righe.
- **NON estrarre** logica del player o dei grafici oltre lo spostamento: `AudioPlayerAB.jsx` resta intoccato (Fase 5).

### 5. Scomposizione di `OnboardingAiStep.jsx` (676 → tutti < 300)
Cartella `src/components/onboarding-ai/` (nomi a tua discrezione, struttura sotto):
- `OnboardingAiStep.jsx` — orchestratore delle viste (state profile/views/test, `fetchProfiles`, `handleCreateProfile`/`handleTestProfile`/`handleActivateProfile`/`handleLocalQuickStart`, routing choice/local/cloud/manage). **< 300 righe.**
- `ChoiceView.jsx` (da 507-563), `LocalView.jsx` (565-624), `CloudView.jsx` (626-672) — viste.
- `ProfileForm.jsx` (263-332), `SavedProfileCard.jsx` (335-382), `ManageView.jsx` (399-497).
- `shared.jsx` o simile per `TierBadge`/`FieldError`/`Spinner` (43-55) + `renderMessages`/`renderTierNote` (384-396).
- **Non reimplementare nulla**: importa `aiConfig.js` (presets, `tierToBadge`, `isKeyRequired`, `validateProfileForm`, `defaultProfileName`, `maskedKeyLabel`) e `OnboardingAiStep.css` (stesso prefisso `aionb-`; il CSS può restare un file unico, non è un componente). Security invariata: chiave solo nel body della singola POST di creazione, azzeramento campo dopo il salvataggio, stato mascherato da `hasApiKey`, nessun `console.*` con dati sensibili, nessun fetch non-`localhost:3001`, "Nessuna IA" percorribile senza backend, lista vuota = stato normale.

### 6. Moduli puri estratti e test (Vitest, zero nuove dipendenze)
Come da tabella punto 2: `eqOptions`, `eqChart`, `genreDefaults`, `exporters` (parti pure), `eqReducer`, `tokens`. Test richiesti (file `*.test.js` accanto al modulo):
- `eqReducer.test.js` — tutti i 7 action: `NEXT_STEP`/`PREV_STEP` clamps (non scende sotto 0, non sale sopra 4), `SET_STEP`, `UPDATE`, `UPDATE_PREF` (merge parziale), `TOGGLE_GENRE` (aggiungi/rimuovi + derivazione `targetCurve`), `TOGGLE_ARTIST` (max 5 + toggle-off), `APPEND_CHAT`.
- `eqChart.test.js` — punti/curve: input nulli → `[]`; valori calcolati per PK/LS/HS su 51 punti; output con `freq`/`manualGain`/`aiGain`/`baselineGain`.
- `genreDefaults.test.js` — hip-hop/edm, rock/metal, jazz/classica, pop/r&b, acustico, gaming, default neutro.
- `exporters.test.js` — `generateWaveletText` (127 bande 10-20k, stringa `GraphicEQ:`), `buildPassportData` (shape e campi).
- `eqOptions.test.js` — liste non vuote, id univoci, valori numerici.
- `tokens.test.js` — come da punto 1.
- **Non toccare** `smoke.test.js` e `aiConfig.test.js` (restano verdi). Nessun test di componente DOM (niente jsdom/@testing-library).

### 7. Layout responsive dalla stessa base di componenti
- **Nessun componente duplicato per viewport** (mobile vs desktop): gli stessi step/componenti si adattano via CSS. Verifica che `.sidebar-concierge`/`.mobile-chat-fab`/`.mobile-open` e le media query di `App.css` (307, 408) e `index.css` (200, 217) continuino a funzionare **senza modifiche di contenuto** (App.css NON si tocca; index.css si tocca SOLO per l'import di tokens.css).
- Le nuove media query (solo se indispensabili per i nuovi file) devono usare **solo** valori di `tokens.breakpoints` (640/768/1024) e `prefers-reduced-motion` via token `motion`. Non introdurre breakpoint inventati.
- `useMediaQuery` è pronto e disponibile per gli adattamenti JS che serviranno; in questa fase il suo uso non è obbligatorio se nessun adattamento JS è necessario.

## Vincoli non negoziabili
- **Sezione 1.3 del piano (vale per ogni fase):** nessuna API key, endpoint privato o token in codice, `.git`, log o file di stato in chiaro. Il refactor **non deve reintrodurre log di chiavi o dati personali**: i 12 `console.error` pre-esistenti si spostano identici e senza aggiunte di dati sensibili; nessun nuovo `console.*` con valori sensibili; `localStorage` resta solo per il flag booleano `PEQ_AI_ONBOARDING_DONE` e `PersonalEQ_Presets` (già esistenti, invariati).
- **Security checklist Fase 3 (resta valida):** la chiave API compare solo nel body della singola `POST /api/ai/profiles`; dopo il salvataggio è azzerata e mascherata da `hasApiKey`, mai riletta, mai loggata. La scomposizione di `OnboardingAiStep` deve preservare tutto questo **senza reimplementare**.
- **Fase 2 §3.1:** comunicazione solo con `http://localhost:3001` (unico host). Tutti i fetch passano a `API_BASE` con **stesso valore**. Mai `fetch` verso provider esterni o locali dal browser.
- **Fase 2 §3.3 / Fase 3 §3.3:** nessuna nuova dipendenza (né runtime né dev); **non installare jsdom/@testing-library**; `frontend/package-lock.json` **invariato** (diff vuoto); advisory `nanoid`/`postcss` pre-esistenti da non peggiorare.
- **Confine Fase 4/5** come da "Decisioni già prese": niente restyling estetico dei contenuti degli step, niente fix ai player, niente vista tabellare Recharts, niente chat persistente/dockable, niente rinumerazione step, niente migrazione delle media query esistenti. **`AudioPlayerAB.jsx` e `SearchableCombobox.jsx` intoccati.**
- **Numerazione step e gate invariati:** `state.step` 0-4, clamps 4/0, timeline `[1,2,3,4]`, `maxStepReached`, gate IA sopra il wizard. I 21 riferimenti `state.step` devono avere la stessa semantica di oggi.
- **Regressione zero:** `npm test` dalla root exit 0 (65 backend invariati + 23 frontend invariati + nuovi test puri); `npm run build` in `frontend/` exit 0; comportamento runtime identico (vedi baseline nel Contesto).
- **Non toccare il backend** (`server.js`, `engine/**`, `test/*.test.js`); **non toccare `implementation/plan_state.json`**; **non committare**; **non invocare altri agenti** (lavora in autonomia). Backend CommonJS, frontend ESM.
- Se durante l'implementazione scopri un blocco non previsto (es. un'estrazione che richiederebbe di cambiare comportamento o di toccare file fuori scope), **fermati e riportalo nel messaggio finale** invece di forzare una soluzione più ampia.

## Definition of Done (tutte verificabili — verificale tu stesso prima di dichiararti finito)
1. **Criterio di accettazione ufficiale (righe):** nessun file di componente (`.jsx`) **creato o riorganizzato dalla Fase 4** supera le ~300 righe; `App.jsx` risultante è uno shell sottile (**< 200 righe**); `OnboardingAiStep.jsx` è scomposto con ogni sotto-componente < 300 righe. Verifica con lettura/conteggio su ogni file nuovo. (Per i componenti pre-esistenti >300 non toccati: vedi DA CHIARIRE 1.)
2. **Criterio di accettazione ufficiale (regressione zero):** comportamento del wizard identico pre/post refactor. Verificabile: step 0-4 stessi contenuti e numerazione; timeline `[1,2,3,4]`; `maxStepReached`; gate IA (onboarding/manage/"Nessuna IA"/tier 3 mai bloccante/lista vuota); chat `AIPersona` (hidden su step 0, messaggi contestuali 1-4, tutorOptions, engine badge); FAB; live sync; presets (header + step 4 + attivazione → `step:3`); export; ricerca artisti; grafici (stessi `chartData`). `git diff` di `App.jsx` sarà ampio ma **solo strutturale**.
3. **Regressione zero (suite):** `npm test` dalla root → exit 0 (backend 65 invariati; frontend: smoke 1 + aiConfig 22 invariati + nuovi test puri tutti verdi). `npm run build` (frontend) → exit 0.
4. **Token centralizzati:** `frontend/src/design-tokens/tokens.js` + `tokens.css` esistono; `tokens.css` (o `main.jsx`) importato; i 10 nomi legacy di `:root` preservati con valori identici; `tokens.test.js` verde (shape, breakpoint mobile-first, contrasto AA, output `tokensToCssVars` con alias legacy). Breakpoint: nessuna **nuova** media query con valori diversi da `tokens.breakpoints` (grep `@media` sui file nuovi).
5. **Context:** `EqStateContext.jsx` + `eqReducer.js` puri (stessi `initialState`/`reducer` di oggi, riga per riga); `eqReducer.test.js` verde sui 7 action type con clamps e max 5.
6. **Hook:** `useEqCalculation` e `useLiveSync` esistono e sono usati da `App`/step; eventuali hook supplementari < 300 righe.
7. **OnboardingAiStep scomposto:** struttura multi-file in `src/components/onboarding-ai/`, tutti < 300 righe, funzionante in entrambe le modalità (onboarding + manage) con la stessa UX e le stesse garanzie security di oggi; nessuna reimplementazione di `aiConfig.js`.
8. **Confine Fase 4/5 rispettato:** `AudioPlayerAB.jsx` e `SearchableCombobox.jsx` intoccati (diff vuoto); nessun restyling estetico degli step; nessuna vista tabellare Recharts; nessuna chat dockable/bottom-sheet; numerazione step e gate invariati; `App.css` intoccato.
9. **Security:** grep su tutti i file nuovi/modificati → nessun match `sk-[A-Za-z0-9]{8,}`, `Bearer `, `C:\Users`, `AIza`, `ghp_`, `AKIA`; nessun `console.*` con dati sensibili nei file nuovi (i `console.error` pre-esistenti spostati sono ammessi, identici); nessun `fetch(` verso host ≠ `http://localhost:3001`; nessuna nuova dipendenza; `frontend/package-lock.json` con diff vuoto.
10. **Vincoli operativi:** `git diff -- implementation/plan_state.json` vuoto; nessun commit; nessun file backend modificato (`git status --short` / `git diff --stat`); `frontend/src/ai/aiConfig.js`, `aiConfig.test.js` e `smoke.test.js` intoccati.
11. **Stessa base responsive:** nessun componente duplicato per viewport; adattamenti responsive solo via CSS esistente + `tokens.breakpoints`.

## Self-check richiesto (riporta TUTTO nel messaggio finale)
- **Mappa di estrazione:** per ogni nuovo file, i riferimenti file:riga sorgente in `App.jsx`/`OnboardingAiStep.jsx` da cui è stato estratto e il motivo. Elenco completo file creati/modificati.
- **Righe finali:** conteggio righe di ogni file di componente nuovo (tutti < ~300) e di `App.jsx` (target < 200).
- **Regressione:** come hai garantito comportamento identico; exit code di `npm test` (root) e `npm run build` (frontend); elenco test nuovi con conteggio.
- **Numerazione step:** conferma esplicita che `state.step` 0-4, clamps, timeline `[1,2,3,4]`, `maxStepReached` e gate IA sopra il wizard sono invariati; valutazione (documentata, NON eseguita) sull'eventuale rinumerazione futura.
- **Confine Fase 4/5:** dichiarazione esplicita di cosa NON hai toccato (AudioPlayerAB, SearchableCombobox, App.css, backend, aiConfig) e verifica con `git diff --stat`.
- **Token:** valori scelti per `breakpoints`, `typography.display` (e perché non cambia la resa), gradiente waveform, e come hai preservato i 10 nomi legacy di `:root`.
- **Decisioni registrate:** posizione sul `isKeyRequired`/RFC1918 (nota 3.4 report Fase 3); se hai spostato il gate in WizardShell o l'hai lasciato in App; gestione di `wizardContentRef`/scroll-to-top.
- **Security:** esito dei grep del punto 9 DoD sui file toccati; conferma `package-lock.json` invariato.
- **Vincoli:** `git diff -- implementation/plan_state.json` (atteso vuoto); nessun commit; nessun file backend toccato.
- Nota esplicita: criterio di accettazione e security checklist saranno verificati da `qa-verifier` e `security-auditor` nel gate successivo.

## DA CHIARIRE (per l'orchestratore, non bloccanti per questa fase)
1. **Interpretazione del tetto ~300 righe:** `AudioPlayerAB.jsx` (911 righe) e `SearchableCombobox.jsx` (327 righe) sono componenti pre-esistenti >300 che la Fase 4 **non scompone** (fix/redesign player = Fase 5, scope esplicito del piano). Il criterio "nessun file di componente sopra ~300 righe" è quindi applicato ai file **creati o riorganizzati dalla Fase 4**. Se l'orchestratore/qa-verifier vuole il criterio in senso assoluto su tutto il frontend, serve una decisione (es. decomporre AudioPlayerAB in Fase 5) da registrare prima del gate QA.
2. **Font display:** caricare un vero display font richiede una nuova dipendenza (es. @fontsource) o asset self-hosted, vietati in questa fase (lock invariato). Il token `typography.display` usa uno stack di sistema che oggi fallback sul sans attuale → resa invariata. La decisione di aggiungere il font è di Fase 5 (autorizzazione a toccare `package-lock.json`).
3. **Valori dei breakpoint token:** scelti `{mobile:640, tablet:768, desktop:1024}`; le media query esistenti (500/640/768/900px) restano invariate in Fase 4 e saranno migrate ai token durante il restyling Fase 5.

## Se questo è un retry
Non applicabile: la Fase 4 è al primo tentativo (`attempts: 0` in `implementation/plan_state.json`, nessun report FAIL precedente).