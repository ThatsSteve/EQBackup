# Task — Fase 1: Stabilizzazione critica

## Obiettivo
Rendere end-to-end funzionante la pipeline attuale (hardware + artisti → filtri EQ) prima di aggiungere la nuova astrazione IA, altrimenti i test della Fase 2 non hanno una baseline affidabile.

## Contesto
- Sei `backend-ai-dev`. Repo: `C:\Users\yscuo\Desktop\EQ` (git, HEAD `26fd0b5`, working tree con modifiche della Fase 0 **non committate**). Non committare nulla tu: la commit avviene a fine ciclo dall'orchestratore.
- La Fase 0 (Governance & tooling) è DONE con gate security=PASS e QA=PASS. Harness Vitest+Supertest attivo: `vitest.config.js` include `test/**/*.test.js` (CommonJS, `globals: true`); `npm test` dalla root = `vitest run && npm --prefix frontend test`. `test/smoke.test.js` evita volutamente `require('./server')` perché oggi `server.js` fa `app.listen` e `testEngineAccuracy()` a require-time.
- I bug sotto vengono da un audit datato: **LOCALIZZA e CONFERMA ciascuno leggendo il codice reale prima di correggerlo** (i riferimenti di riga sono indicativi e possono essere sfalsati). Se un riferimento non combacia, correggi sulla base di ciò che trovi e segnalalo nel riepilogo finale.
- `engine/knowledge_graph.json` contiene dati utente ed è gitignored (resta su disco): leggerlo sì, committarlo mai.
- La verifica dei criteri di accettazione di questa fase sarà fatta da `qa-verifier` nel gate successivo del ciclo: il test automatizzato che produci (punto 5) è la sua evidenza primaria.

## Cosa implementare

### 1. `engine/aiOrchestrator.js` — fix `ReferenceError: graphResult`
- Riga 5: `queryAudioGraph` viene destrutturata solo in `{ graphFilters, extractedFacts }`, ma restituisce anche `foundArtists` (`engine/graphEngine.js`, ultima riga del return).
- Righe 125 e 137: si referenzia `graphResult.foundArtists` — la variabile `graphResult` **non esiste** → `ReferenceError` su entrambi i rami (successo LM Studio e fallback).
- Fix: destrutturare anche `foundArtists` e restituirlo in **tutti e tre** i punti di ritorno: early-return skip (righe 11–17, oggi lo omette — `server.js:157` legge `aiData.foundArtists`), ramo successo (righe 121–126), ramo fallback (righe 133–138).

### 2. `engine/graphEngine.js` + collegamento di `calculateWeightedArtistProfile`
- I nodi artista in `engine/knowledge_graph.json` hanno il campo `recommended_modifiers` (es. `daft_punk`, `hans_zimmer`, `adele` — verifica con una grep). `queryAudioGraph` **non lo estrae mai**: al match (righe ~141–143) pusha in `foundArtists` solo `{name, genres}`. Di conseguenza i filtri consigliati per artista non entrano mai in `graphFilters` e la curva EQ non riceve il contributo artista.
- Fix: quando un artista risolve nel grafo locale, estrarre i suoi `recommended_modifiers` e pusharli in `graphFilters`. Essere difensivi: i nodi creati da ingestion esterna (righe ~149–156) **non hanno** `recommended_modifiers` → optional chaining / filtro, mai crash.
- Riga 3: `graphEngine.js` importa `{ mapGenresToAcousticProfile, harmonizeArtistFilters }` da `./dspEngine/genreArtistMatrix`, ma questi due nomi **non esistono negli export** del modulo (che esporta solo `calculateWeightedArtistProfile` e `getProfileForGenre`): sono import morti che valgono `undefined`. Rimuoverli o sostituirli con ciò che serve davvero.
- `calculateWeightedArtistProfile` (`engine/dspEngine/genreArtistMatrix.js`, riga 38, esportata a riga 89) **non è chiamata da nessuna parte del flusso reale** (verificato: nessun require/import oltre all'export). Collegarla: nel percorso deterministico di `generateAIFilters` (early-return skip e fallback), calcolare `desiderata = calculateWeightedArtistProfile(foundArtists)` e restituirla — oggi quei rami restituiscono `desiderata: {}` (righe 14 e 136), quindi il profilo ponderato artisti non raggiunge mai `mergeAndSecureFilters`. La scelta del punto di chiamata è tua, ma il requisito è: i 6 intenti ponderati devono arrivare a `mergeAndSecureFilters` quando non c'è LM Studio.
- Nota security (vedi vincoli): collegando `calculateWeightedArtistProfile`, i suoi `console.log` diagnostici con nomi artisti in chiaro (righe ~79–83) inizieranno a girare a ogni step del wizard. È console locale, non rete — ma vanno valutati: rimuoverli o renderli minimi se non servono al debug, e riportare la decisione nel riepilogo finale.

### 3. `engine/dspEngine/coreCalculator.js` — preamp combinato + guardrails sui filtri base
- `mergeAndSecureFilters` (riga 216): `finalPreamp = basePreamp`, poi se `totalMaxGain > 0` → `finalPreamp = -totalMaxGain - 0.2` (righe 218–223): il preamp anti-clipping **sovrascrive** il preamp AutoEq (`basePreamp`). Deve **combinarsi** con esso, non sostituirlo. Invarianti da rispettare: il preamp finale riflette entrambi i contributi; non è mai meno protettivo del solo preamp AutoEq (se `basePreamp < 0` → `finalPreamp <= basePreamp`); il vincolo anti-clipping `picco cumulativo + preamp <= 0` resta valido.
- Riga 193: i filtri base AutoEq (`_baseFilters` → `origin: 'AUTOEQ'`) **non passano** da `applyPsychoacousticGuardrails` — passano solo gli extra (via `mergeProximityFilters`, riga 208), e `mergedFilters` (riga 211) è restituito grezzo (riga 229). Applicare i guardrails (gain `[-12, +9]` dB, Q `[0.5, 3.5]`) a **tutti** i filtri, base AutoEq inclusa, senza eccezioni — è anche vincolo del tuo agente.

### 4. `server.js` — rimuovere `skipLMStudio = true` hardcoded
- Righe 152–153: `const skipLMStudio = true;` passato a `generateAIFilters`. Rimuovere l'hardcoded: diventerà una scelta esplicita del profilo IA attivo (Fase 2/3).
- Sostituirlo con un punto di decisione esplicito e revisionabile (es. costante/config dal nome esplicito, o variabile d'ambiente) — **nessun letterale booleano `true` nel corpo dell'endpoint**. Il default della Fase 1 deve preservare il comportamento attuale del wizard (calcolo deterministico istantaneo dal grafo quando non c'è messaggio utente) e va marcato chiaramente come la giuntura dove Fase 2/3 collegherà il profilo IA attivo.
- Il test E2E non deve dipendere da LM Studio acceso o spento.

### 5. Refactor minimo per testabilità + test E2E automatizzato (evidenza del criterio di accettazione)
- `server.js` oggi esegue `app.listen` e `testEngineAccuracy()` a require-time (righe ~353–357). Per testare con Supertest serve esportare `app` senza avviare il listener: `module.exports` dell'app e `app.listen` dietro `if (require.main === module)` (valutare se guardare allo stesso modo `testEngineAccuracy()`). Comportamento invariato con `node server.js` (stessa porta 3001, bind `127.0.0.1`).
- Creare `test/phase1-e2e.test.js` (CommonJS, Vitest + Supertest, nella cartella `test/` già configurata): dimostra end-to-end via HTTP su `POST /api/calculate-eq` con hardware + 2 artisti → curva EQ non vuota e coerente con i guardrails. Requisiti del test:
  - **Deterministico e OFFLINE**: nessuna chiamata a rete esterna (niente iTunes/MusicBrainz via `queryAudioGraph`, niente AutoEq remoto da `fetchHeadphoneProfile`, niente LM Studio). Artisti scelti presenti nel grafo locale (es. `daft_punk`, `hans_zimmer` — entrambi con `recommended_modifiers`); hardware che **non matcha** in `engine/autoeq_db.json`, così `fetchHeadphoneProfile` cade sul fallback locale `dummy_autoeq.txt` (verificare sul codice reale al momento; se il modello scelto risulta nel DB, stub della fetch esterna).
  - `destination: 'clipboard'` (o `'roon'`) nel body: il test non deve **mai** scrivere su `C:\Program Files\EqualizerAPO\config`.
  - Asserzioni minime: status 200; `payload.filters.length > 0`; ogni `gain` in `[-12, +9]`; ogni `q` in `[0.5, 3.5]`; `preamp <= 0`; almeno un filtro con `origin` contenente `ARTISTA` (prova che il profilo ponderato artisti raggiunge il calcolo).

## Vincoli non negoziabili
- **Sezione 1.3 del piano (vale per ogni fase):** nessuna API key, endpoint privato o token in codice, `.git`, log o file di stato in chiaro. `.env` resta solo per variabili di sviluppo locali.
- **Security checklist della fase:** il fix non deve riesporre log con dati hardware/artisti in chiaro oltre il necessario (vedi punto 2: valutare i `console.log` diagnostici; non aggiungerne di nuovi con nomi utente/artisti/hardware).
- **Fase 0 §3.1:** il CORS permissivo (`server.js:19`) è pre-esistente e **non è scope** di questa fase risolverlo, ma **non peggiorarlo** e non introdurre nuove superfici di rete (la rivalidazione è prevista in Fase 2). **§3.2:** vulnerabilità frontend pre-esistenti (nanoid/postcss) fuori scope — non toccare `frontend/package-lock.json`.
- Guardrails fisici invariati: gain `[-12, +9]` dB e Q `[0.5, 3.5]` restano hard limit in `coreCalculator.js`, applicati a **tutti** i filtri (base AutoEq + extra), senza eccezioni.
- Timeout esplicito su ogni fetch verso servizi esterni, `clearTimeout` in blocco `finally`: non introdurre fetch senza timeout.
- CommonJS alla root (`"type": "commonjs"`): codice e test in `require()`/`module.exports`.
- **Non toccare `implementation/plan_state.json`** (lo aggiorna solo l'orchestrator): il tuo `git diff` su quel file deve restare vuoto.
- **Non committare**: le modifiche restano nel working tree, la commit avviene a fine ciclo. `engine/knowledge_graph.json` resta gitignored.
- **Non invocare altri agenti** (`permission.task` negato): lavora in autonomia.
- Se incontri un blocco tecnico non previsto, riportalo nel messaggio finale con i dettagli invece di aggirarlo silenziosamente.

## Definition of Done (tutte verificabili, verificale tu stesso)
1. `engine/aiOrchestrator.js` non contiene più alcun riferimento a `graphResult`; `foundArtists` è destrutturato da `queryAudioGraph` e presente in tutti e 3 i punti di ritorno; il modulo si carica senza errori (`node -e "require('./engine/aiOrchestrator')"`).
2. `engine/graphEngine.js` estrae i `recommended_modifiers` degli artisti risolti nel grafo locale e li include in `graphFilters`, in modo difensivo sui nodi senza il campo; gli import morti di `genreArtistMatrix` (riga 3) sono rimossi o corretti.
3. `calculateWeightedArtistProfile` è invocata nel flusso reale: nel percorso deterministico di `generateAIFilters` i `desiderata` derivano da `foundArtists` (non più `{}`) e raggiungono `mergeAndSecureFilters`.
4. `engine/dspEngine/coreCalculator.js`: il preamp finale combina contributo anti-clipping e preamp AutoEq (mai meno protettivo del solo AutoEq); `applyPsychoacousticGuardrails` è applicata a tutti i filtri, base inclusa.
5. `server.js` non contiene `skipLMStudio = true` hardcoded; il punto di decisione è esplicito, revisionabile e marcato come giuntura per la Fase 2/3.
6. `test/phase1-e2e.test.js` esiste e passa: `/api/calculate-eq` con hardware + 2 artisti restituisce curva non vuota, `gain ∈ [-12, +9]`, `q ∈ [0.5, 3.5]`, `preamp <= 0`, almeno un filtro `origin` contenente `ARTISTA`; nessuna dipendenza da rete esterna o LM Studio.
7. `npm test` dalla root esce con codice 0 (backend + frontend).
8. Nessun segreto/path personale reintrodotto nei file toccati (grep `sk-`, `api_key`, `Bearer `, `C:\Users\...` → nessun match nei file nuovi/modificati); nessun nuovo `console.log` con dati hardware/artisti in chiaro oltre il necessario.
9. `git diff -- implementation/plan_state.json` è vuoto; `node server.js` continua a fare bind su `127.0.0.1:3001`.

## Self-check richiesto (riporta TUTTO nel messaggio finale)
- Elenco dei file modificati/creati con motivazione sintetica per ciascuno (inclusa la decisione sui `console.log` diagnostici del punto 2).
- Per ciascuno dei 4 bug: conferma di averlo localizzato nel codice reale (file e riga) e descrizione del fix applicato.
- Exit code e output di `npm test` (root) e del test E2E singolo.
- Output di `git diff -- implementation/plan_state.json` (atteso: vuoto).
- Esito dei grep di sicurezza sui file toccati.
- Nota esplicita: il criterio di accettazione end-to-end sarà verificato da `qa-verifier` nel gate successivo del ciclo; `test/phase1-e2e.test.js` è la sua evidenza primaria.

## Se questo è un retry
Non applicabile: la Fase 1 è al primo tentativo (`attempts: 0`, nessun report FAIL precedente).