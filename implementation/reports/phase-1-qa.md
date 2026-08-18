# QA Gate — Fase 1: Stabilizzazione critica (backend)

**Data:** 2026-08-17
**Verificatore:** qa-verifier (permessi: sola scrittura `implementation/reports/*`; bash: `npm test*`, `npm run*`, `curl` localhost/127.0.0.1, `git diff*`, `git log*`, `grep *`)
**Commit di riferimento:** `26fd0b5` (HEAD; working tree + index con modifiche Fase 0 + Fase 1 non committate)
**Gate di sicurezza precedente:** PASS (`implementation/reports/phase-1-security.md`)
**Esito complessivo:** **PASS** (0 FAIL; 1 criterio marcato NON VERIFICABILE AUTOMATICAMENTE con motivazione e procedura manuale proposta)

---

## Criterio di accettazione ufficiale (piano, sez. 5 FASE 1)

> Un test end-to-end (hardware + 2 artisti → filtri generati) produce una curva EQ non vuota e coerente con i guardrails.

| # | Criterio | Esito | Evidenza |
|---|---|---|---|
| CA-1 | `test/phase1-e2e.test.js` esiste, è deterministico/OFFLINE e passa | ✅ PASS | File presente in `test/phase1-e2e.test.js` (63 righe, CommonJS, Vitest+Supertest). `npm test` dalla root → **exit 0**: backend `Test Files 2 passed (2), Tests 3 passed (3)` (smoke 2 + E2E 1), frontend `Test Files 1 passed (1), Tests 1 passed (1)`. Durata suite backend **280ms** → nessuna chiamata di rete (un timeout LM Studio da solo ne avrebbe richiesti 45s). |
| CA-2 | L'E2E dimostra: status 200 su `POST /api/calculate-eq` | ✅ PASS | Asserzione in `test/phase1-e2e.test.js:35` (`expect(res.status).toBe(200)`) e `:36` (`expect(res.body.success).toBe(true)`). Test passato (incluso nel run exit 0). |
| CA-3 | L'E2E dimostra: `filters.length > 0` (curva non vuota) | ✅ PASS | Asserzioni `test/phase1-e2e.test.js:42-43` (`Array.isArray(payload.filters)` e `length > 0`). Test passato. |
| CA-4 | L'E2E dimostra: ogni `gain ∈ [-12, +9]` dB | ✅ PASS | Loop asserzioni `test/phase1-e2e.test.js:46-48` (`gain >= -12.0` e `gain <= 9.0` su **ogni** filtro). Test passato. |
| CA-5 | L'E2E dimostra: ogni `q ∈ [0.5, 3.5]` | ✅ PASS | Loop asserzioni `test/phase1-e2e.test.js:49-52` (Q verificato quando presente, per ogni filtro). Test passato. |
| CA-6 | L'E2E dimostra: `preamp <= 0` | ✅ PASS | Asserzione `test/phase1-e2e.test.js:56`. Test passato. |
| CA-7 | L'E2E dimostra: almeno un filtro `origin` contenente `ARTISTA` (profilo ponderato artisti raggiunge il calcolo) | ✅ PASS | Asserzione `test/phase1-e2e.test.js:60-61` (`filters.filter(f => String(f.origin||'').includes('ARTISTA')).length > 0`). Test passato. La catena è verificabile a monte: `calculateWeightedArtistProfile` (riga 12 `aiOrchestrator.js`) → `desiderata` non vuoto nei rami deterministici → `mergeAndSecureFilters` (riga 167 `server.js` → `aiData.desiderata`) → `translateDesiderataToFilters(desiderata, 'ARTISTA: daft punk + hans zimmer')` (`coreCalculator.js:161,202`). |
| CA-8 | Il test è deterministico e OFFLINE (artisti nel grafo locale, headphone su fallback dummy, `destination: 'clipboard'`, nessuna chiamata a LM Studio/MusicBrainz/iTunes/AutoEq remoto) | ✅ PASS | **Artisti locali**: `engine/knowledge_graph.json` contiene i nodi `daft_punk` (riga 198) e `hans_zimmer` (riga 231), entrambi con `recommended_modifiers` → `queryAudioGraph` risolve senza `fetchArtistFromExternalAPI` (iTunes/MusicBrainz). **Headphone su fallback**: `acme test hp 9000` non matcha `engine/autoeq_db.json` (grep: nessun match) → `fetchHeadphoneProfile` cade su `dummy_autoeq.txt` (presente in root, 6 righe, `Preamp: -5.6 dB` + 5 filtri PK) — nessun fetch GitHub AutoEq. **LM Studio**: profilo wizard `local-graph` (`server.js:25-26`) → early-return skip, nessuna chiamata a `localhost:1234`. **Nessuna scrittura**: `destination: 'clipboard'` → ramo `else` di `/api/calculate-eq` (`server.js:176-179`), nessuna `writeEqFileDebounced`. **Grep sul file di test**: nessun match per `fetch(`, `http://`, `https://`, `writeFile`, `EqualizerAPO`, `localhost:1234`. Durata 280ms conferma empiricamente l'assenza di I/O di rete. |
| CA-9 | Prova manuale dell'endpoint via `curl` verso `127.0.0.1` | ⚠️ NON VERIFICABILE AUTOMATICAMENTE | Il gate non ha tra i comandi consentiti `node server.js` (solo `npm test*`, `npm run*`, `curl*`, `git diff*`, `git log*`, `grep *`) e non esiste uno script npm `start`. `curl.exe -s -m 3 http://127.0.0.1:3001/api/engine-status` non ha prodotto risposta (nessun server attivo — atteso). Il test Supertest esercita però la **vera app Express esportata** (`server.js:374` `module.exports = app`) con richieste HTTP in-process sul route reale, ed è quindi l'evidenza primaria dichiarata dal prompt di fase ("il test E2E è la sua evidenza primaria"). Procedura manuale di conferma in §Note N.1. |

---

## Definition of Done (prompt operativo `implementation/prompts/phase-1.md`)

| # | Criterio DoD | Esito | Evidenza raccolta |
|---|---|---|---|
| 1 | `engine/aiOrchestrator.js` senza riferimenti `graphResult`; `foundArtists` destrutturato e presente in tutti e 3 i punti di ritorno; modulo si carica senza errori | ✅ PASS | **Grep** `graphResult` su `aiOrchestrator.js` → nessun match. **Lettura file**: riga 6 `const { graphFilters, extractedFacts, foundArtists } = await queryAudioGraph(...)`; `foundArtists` restituito nel ritorno early-return skip (riga 21), nel ramo successo LM Studio (riga 135) e nel ramo fallback (riga 147). **Diff** (vs HEAD `26fd0b5`): `foundArtists: graphResult.foundArtists || []` → `foundArtists` in entrambi i rami. **Caricamento**: il modulo è caricato da `server.js` (`:8`), che a sua volta è caricato da `test/phase1-e2e.test.js:16` (`require('../server')`) — il test passa ⇒ il modulo si carica senza errori. |
| 2 | `graphEngine.js` estrae `recommended_modifiers` dai nodi artista risolti nel grafo locale, in modo difensivo; import morti di `genreArtistMatrix` rimossi | ✅ PASS | **Lettura file** `graphEngine.js:146-148`: `if (Array.isArray(matchedArt.recommended_modifiers) && matchedArt.recommended_modifiers.length > 0) { ... graphFilters.push({ ...modifier }) }` — difensivo (guardia `Array.isArray` + check lunghezza, mai crash sui nodi da ingestion esterna che non hanno il campo). **Diff**: rimossa la riga 3 `const { mapGenresToAcousticProfile, harmonizeArtistFilters } = require('./dspEngine/genreArtistMatrix');` (i due nomi non esistono negli export del modulo → erano `undefined`). Nessun altro import di `genreArtistMatrix` nel file (grep di lettura: solo `fs` e `path`). |
| 3 | `calculateWeightedArtistProfile` invocata nel flusso reale; nel percorso deterministico di `generateAIFilters` i `desiderata` derivano da `foundArtists` (non più `{}`) e raggiungono `mergeAndSecureFilters` | ✅ PASS | **`aiOrchestrator.js:2`**: import; **`:12`**: `const localDesiderata = calculateWeightedArtistProfile(foundArtists);`; **`:19`** (early-return skip) e **`:145`** (fallback): `desiderata: localDesiderata` (era `{}` prima — diff confermato). Raggiunge `mergeAndSecureFilters` via `server.js:167` (`aiData.desiderata`). Il percorso deterministico è l'effettivo flusso del wizard (`local-graph` + `userMessage=""` → early-return). Evidenza end-to-end: CA-7 (filtro con `origin` ARTISTA nel payload). |
| 4 | `coreCalculator.js`: preamp finale combina anti-clipping e preamp AutoEq (mai meno protettivo del solo AutoEq); guardrails su tutti i filtri, base inclusa | ✅ PASS | **`coreCalculator.js:219-229`**: `let finalPreamp = basePreamp; if (totalMaxGain > 0) { const antiClippingPreamp = -totalMaxGain - 0.2; finalPreamp = Math.min(basePreamp, antiClippingPreamp); }` — invariante: se `basePreamp < 0` → `finalPreamp <= basePreamp` (mai meno protettivo); vincolo `picco + preamp <= 0` preservato dal `min`. `:231` `if (finalPreamp > 0) finalPreamp = 0;` (sicurezza ulteriore). **Guardrails su tutti**: `:214` `const securedMergedFilters = applyPsychoacousticGuardrails(mergedFilters);` applicata a base `AUTOEQ` + extra, e `:235` restituisce `filters: securedMergedFilters` (era `mergedFilters` grezzo — diff confermato). Guardrails: gain `[-12,+9]`, Q `[0.5,3.5]` (`:11-27`). Verifica runtime coperta dal test E2E su ogni filtro emesso (CA-4/CA-5) e da `testEngineAccuracy()` (solo `node server.js`, non a require-time). |
| 5 | `server.js` non contiene `skipLMStudio = true` hardcoded; punto di decisione esplicito, revisionabile e marcato come giuntura Fase 2/3 | ✅ PASS | **Grep** `skipLMStudio\s*=\s*true` su `server.js` → nessun match. **`server.js:19-26`**: commento `--- GIUNTURA FASE 2/3: Profilo IA attivo per il wizard ---` + `const WIZARD_AI_PROFILE = process.env.PEQ_WIZARD_AI_PROFILE || 'local-graph';` + `const skipLMStudioForWizard = WIZARD_AI_PROFILE === 'local-graph';` — nessun letterale booleano `true` nel corpo dell'endpoint; decisione derivata da costante/env con nome esplicito; default `local-graph` preserva il comportamento attuale del wizard (calcolo deterministico istantaneo dal grafo). `:163` passa `skipLMStudioForWizard`. |
| 6 | `test/phase1-e2e.test.js` esiste e passa con tutte le asserzioni richieste; nessuna dipendenza da rete esterna o LM Studio | ✅ PASS | Vedi CA-1..CA-8. File presente, run `npm test` exit 0, tutte le asserzioni richieste dal DoD presenti e passate; offline per costruzione e per esecuzione (280ms). |
| 7 | `npm test` dalla root esce con codice 0 (backend + frontend) | ✅ PASS | Eseguito `npm test` dalla root: backend 2 file/3 test pass, poi `npm --prefix frontend test`: 1 file/1 test pass. Nessun errore nel run → exit 0. `package.json:7` `"test": "vitest run && npm --prefix frontend test"`. |
| 8 | Nessun segreto/path personale nei file toccati; nessun nuovo `console.log` con dati hardware/artisti in chiaro oltre il necessario | ✅ PASS | **Grep** su `*.js` dell'intero repo (pattern `sk-[A-Za-z0-9]{16,}`, `api[_-]?key`, `Bearer `, `C:\Users`) → **nessun match**. **Log**: `genreArtistMatrix.js` — i `console.log` diagnostici `[ARTIST ENGINE DIAGNOSTIC]` con nomi artisti sono stati rimossi (diff confermato; resta solo `console.error` per errore lettura JSON, `:14`); `aiOrchestrator.js` — nessun `console.*` aggiunto (solo il `console.warn` pre-esistente `:139` con `err.message`, mai payload utente); `graphEngine.js` — nessun nuovo log nel diff (i `console.log` con nomi artista pre-esistenti vivono solo nel ramo di ingestion esterna, non toccati dalla fase); `coreCalculator.js` — i 2 `console.log` aggiunti (`:227-228`) contengono **solo valori numerici in dB** (`totalMaxGain`, `finalPreamp`), nessun nome/hardware/artista; `server.js` — nessun nuovo log. |
| 9 | `git diff -- implementation/plan_state.json` è vuoto per il dev; `node server.js` continua a fare bind su `127.0.0.1:3001` | ✅ PASS | **plan_state.json**: `git diff HEAD -- implementation/plan_state.json` → contiene **solo** il cambio di stato dell'orchestrator (`current_phase: 1`, fase 0 `done` con `last_security/last_qa: PASS`, fase 1 `qa_review`, nota in `notes`). Nessuna modifica a codice funzionale. **Bind**: `server.js:17` `const PORT = 3001;`, `:369` `app.listen(PORT, '127.0.0.1', ...)` — invariato. Refactor `require.main === module` (`:365`) e `module.exports = app` (`:374`): con `node server.js` parte il listener su `127.0.0.1:3001` + `testEngineAccuracy()`; sotto `require` (test) nessun listener — comportamento invariato. |

---

## Regressione Fase 0 (baseline funzionale)

| Check | Esito | Evidenza |
|---|---|---|
| `npm test` dalla root exit 0 (pipeline completa backend + frontend) | ✅ PASS | Eseguito: backend 2 file/3 test pass + frontend 1 file/1 test pass, nessun errore → exit 0. Stessa pipeline della Fase 0 (`vitest run && npm --prefix frontend test`), ora con 1 test in più (E2E Fase 1) che passa. |
| `test/smoke.test.js` (Fase 0) ancora funzionante | ✅ PASS | Incluso nel run root: 2 test pass (asserzione banale + supertest caricabile). Continua a non richiedere `./server` (nessun listener/testEngineAccuracy a require-time). |
| `frontend/src/smoke.test.js` (Fase 0) ancora funzionante | ✅ PASS | `npm --prefix frontend test`: 1/1 pass. |
| Nessuna modifica a codice frontend | ✅ PASS | `git diff HEAD -- frontend/src frontend/vite.config.js` → nessun output (diff fase = solo `package.json`/lock Fase 0). |
| Nessuna regressione sugli endpoint pre-esistenti | ✅ PASS | Diff Fase 1 su `server.js` limita i tocchi a: giuntura `WIZARD_AI_PROFILE`, chiamata `generateAIFilters` con `skipLMStudioForWizard`, parametro `aiData.foundArtists` a `mergeAndSecureFilters`, refactor avvio/bind. Nessun endpoint rimosso o cambiato di rotta; `/api/chat` e `/api/eq/refine` invariati. |

---

## Note e verifiche manuali proposte per i criteri NON VERIFICABILI

### N.1 — Conferma live di `POST /api/calculate-eq` via `curl` (CA-9)
La verifica richiede un server in ascolto, avviabile solo con `node server.js` — non tra i comandi consentiti al gate (`permission.bash`). Il test Supertest è l'evidenza primaria (stessa app, stesso route, richieste HTTP reali in-process). Per la conferma manuale end-to-end con server vero:

```
# 1. Avviare il server (terminal 1, dalla root del repo)
node server.js
# atteso: [TEST] testEngineAccuracy() SUPERATO... e [API] Server in ascolto su http://127.0.0.1:3001

# 2. In un secondo terminal, chiamare l'endpoint con lo stesso body del test
curl.exe -s -X POST http://127.0.0.1:3001/api/calculate-eq -H "Content-Type: application/json" -d '{"state":{"headphone":"acme test hp 9000","targetCurve":"Harman","selectedArtists":["daft_punk","hans_zimmer"],"selectedGenres":[],"bass":"neutro","mids":"piatte","treble":"smooth"},"destination":"clipboard"}'
# Atteso: {"success":true,...} con payload.filters non vuoto, gain ∈ [-12,+9], q ∈ [0.5,3.5], preamp <= 0,
# e almeno un filtro con origin che contiene "ARTISTA".
```

### N.2 — Guardrails nei casi limite estremi (intenti a ±5.0, filtri sovrapposti)
La verifica strutturale è coperta dal codice (`applyPsychoacousticGuardrails` applicata alla curva finale completa, `coreCalculator.js:214`, e i guardrails restano hard limit dopo il merge di prossimità — `mergeProximityFilters` riapplica i guardrails sui gain sommati, `:72`) e dal `testEngineAccuracy()` che simula 5 intenti a `+5.0` con filtri Q fuori range (eseguito solo a `node server.js`, vedi N.1). Il caso "filtri sovrapposti con intenti estremi" è simulabile manualmente così:

```
node -e "const c=require('./engine/dspEngine/coreCalculator'); const g=[{type:'PK',freq:110,gain:12,q:0.1},{type:'PK',freq:130,gain:9,q:4.0}]; const r=c.mergeAndSecureFilters({preamp:-3,filters:[{type:'PK',freq:120,gain:11,q:0.2}]},g,{sub_bass_intent:5,mid_bass_intent:5,low_mids_intent:5,high_mids_intent:5,presence_intent:5,brilliance_intent:5},{}); console.log(r.preamp, Math.min(...r.filters.map(f=>f.gain)), Math.max(...r.filters.map(f=>f.gain)), Math.min(...r.filters.map(f=>f.q||1)), Math.max(...r.filters.map(f=>f.q||1)));"
# Atteso: preamp <= 0 (mai meno protettivo di -3), gain massimo <= 9, Q tutti in [0.5,3.5]
```

---

## Problemi da correggere

**Nessuno (esito PASS).** Nessun criterio in FAIL.

Osservazioni non bloccanti (tracciamento, non correzione):
- La conferma live via `curl` con server reale (N.1) e il caso limite estremo simulato (N.2) restano da eseguire manualmente una volta: strutturalmente non eseguibili dal gate (serve `node server.js` / `node -e`, non consentiti dai permessi). La copertura automatica è comunque completa: il test E2E verifica tutti i guardrails sulla curva effettivamente emessa, e il codice applica i guardrails come hard limit su tutta la curva finale.
- Nota di contesto coerente con il report security: i `console.log` con nomi artisti ancora presenti in `graphEngine.js` (righe 31/41/49/65/73/76) e `artistResolver.js` sono **pre-esistenti** e confinati al ramo di ingestion esterna (azione esplicita dell'utente), non introdotti né ri-esposti dalla Fase 1; il fix di fase ha rimosso quelli che giravano a ogni step del wizard.
- Modifiche della fase non ancora committate (working tree + index): la commit avviene a fine ciclo, come da governance.

---

## Conclusione

Il **criterio di accettazione ufficiale** della Fase 1 (hardware + 2 artisti → curva EQ non vuota e coerente con i guardrails) è **verificato automaticamente e superato** dal test `test/phase1-e2e.test.js`, che passa nel run completo `npm test` (exit 0) ed è dimostrato **offline e deterministico** (artisti nel grafo locale, headphone su fallback dummy, `destination: 'clipboard'`, profilo `local-graph`, nessun riferimento di rete nel file). Tutti i **9 punti del Definition of Done** risultano soddisfatti sul codice reale (grep + lettura diff), inclusi i guardrails su tutti i filtri, il preamp combinato mai meno protettivo del solo AutoEq, l'assenza di segreti/path personali e il bind `127.0.0.1:3001` invariato. Nessuna regressione sulla baseline Fase 0 (`npm test` exit 0, smoke test backend + frontend pass).

**Esito: PASS.** (CA-9 marcato NON VERIFICABILE AUTOMATICAMENTE con motivazione e procedura manuale N.1; accettato come da governance del gate.)