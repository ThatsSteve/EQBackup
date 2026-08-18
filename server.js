const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// --- Import Motore Backend Modulare ---
const { fetchHeadphoneProfile } = require('./engine/autoeqParser');
const { generateAIFilters, buildMessages } = require('./engine/aiOrchestrator');
const { mergeAndSecureFilters, refineAndSecureFilters, calculateMaxCumulativeGain, testEngineAccuracy } = require('./engine/dspEngine/coreCalculator');
const { compileOutput } = require('./engine/outputCompiler');
const { syncAutoEqDb } = require('./engine/autoeqDownloader');
const { getBrands, getModels, resolveHardware } = require('./engine/hardwareResolver');
const presetManager = require('./engine/presetManager');
const { checkApoPermissions, writeEqFileDebounced } = require('./engine/fileSync');

// --- Import Layer AI (Fase 2): registry provider, probe, schema, sanitizzazione ---
const { queryAudioGraph } = require('./engine/graphEngine');
const { calculateWeightedArtistProfile } = require('./engine/dspEngine/genreArtistMatrix');
const { sanitizePromptData } = require('./engine/ai/promptSanitizer');
const aiRegistry = require('./engine/ai/registry').defaultRegistry;
const { probeProvider: capabilityProbe } = require('./engine/ai/capabilityProbe');
const eqIntentSchema = require('./engine/ai/schema/eqIntentSchema');

const app = express();
const PORT = 3001;

// --- Fase 7: CORS ristretto (solo origine frontend locale) ---
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    const err = new Error('Origine non autorizzata.');
    err.status = 403;
    return callback(err);
  }
}));
app.use(express.json());

// --- Fase 7: Rate-limit manuale in-memory sugli endpoint verso servizi terzi ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;
const rateBuckets = new Map();

function thirdPartyRateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.resetAt > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Troppe richieste. Riprova tra poco.' });
  }
  return next();
}

// --- GIUNTURA FASE 2/3: Profilo IA attivo per il wizard (/api/calculate-eq) ---
// Fase 1: il wizard usa il motore deterministico locale (Grafo di Conoscenza),
// calcolo istantaneo quando non c'è messaggio utente — comportamento invariato
// rispetto al pre-refactor. Nelle Fasi 2/3 questa decisione sarà sostituita dal
// profilo IA selezionato dall'utente; la variabile d'ambiente PEQ_WIZARD_AI_PROFILE
// permette di cambiarla senza toccare il codice.
const WIZARD_AI_PROFILE = process.env.PEQ_WIZARD_AI_PROFILE || 'local-graph';
const skipLMStudioForWizard = WIZARD_AI_PROFILE === 'local-graph';

app.get('/api/live-sync/check', (req, res) => {
    const status = checkApoPermissions();
    res.json(status);
});

app.get('/api/sync-autoeq', thirdPartyRateLimit, async (req, res) => {
    const result = await syncAutoEqDb();
    if (result.success) {
        res.json(result);
    } else {
        res.status(500).json(result);
    }
});

app.get('/api/artists', thirdPartyRateLimit, (req, res) => {
    try {
        const artistsPath = path.join(__dirname, 'src', 'artists.json');
        const artistsData = JSON.parse(fs.readFileSync(artistsPath, 'utf-8'));
        res.json({ success: true, artists: artistsData });
    } catch (err) {
        console.error('[API] Errore caricamento artisti:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- API PRESET ---
app.get('/api/presets', (req, res) => {
    try {
        res.json({ success: true, presets: presetManager.getPresets() });
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/presets/save', (req, res) => {
    try {
        const { name, hardware, filters, preamp } = req.body;
        const preset = presetManager.savePreset(name, hardware, filters, preamp);
        res.json({ success: true, preset });
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/presets/activate', (req, res) => {
    try {
        const { id } = req.body;
        const result = presetManager.activatePreset(id);
        res.json({ success: true, ...result });
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- API ENGINE STATUS ---
app.get('/api/engine-status', async (req, res) => {
    try {
        const response = await fetch('http://localhost:1234/v1/models', { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
            res.json({ success: true, engine: 'LM Studio' });
        } else {
            res.json({ success: true, engine: 'Local Knowledge Graph' });
        }
    } catch (err) {
        // Se c'è errore di connessione/timeout, LM Studio non è attivo
        res.json({ success: true, engine: 'Local Knowledge Graph' });
    }
});

// --- API HARDWARE DISCOVERY PIPELINE (Cascata & 3 Livelli) ---
app.get('/api/hardware/brands', (req, res) => {
  try {
    const type = req.query.type || 'headphone';
    const brands = getBrands(type);
    res.json({ success: true, brands });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/hardware/models', (req, res) => {
  try {
    const { brand, type } = req.query;
    const models = getModels(brand, type || 'headphone');
    res.json({ success: true, models });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/hardware/resolve', thirdPartyRateLimit, async (req, res) => {
  try {
    const { device, type } = req.body;
    const resolution = await resolveHardware(device, type || 'headphone');
    res.json({ success: true, resolution });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


app.post('/api/calculate-eq', async (req, res) => {
    try {
        const { state, destination = 'e-apo' } = req.body;
        console.log(`\n[API] Ricevuta richiesta EQ. Destinazione: ${destination}`);

        // Costruzione Payload JSON strutturato per AI
        const AIPayload = {
            metadata: { timestamp: new Date().toISOString(), version: "3.0-graph-engine", context: "Personal EQ Profiling" },
            hardware: { headphone: state.headphone || "", dac: state.dac || "", amp: state.amp || "" },
            uploadedData: state.uploadedFiles || [],
            musicalIdentity: { targetCurve: state.targetCurve, artists: state.selectedArtists || [], genres: state.selectedGenres || [] },
            psychoacoustics: { baseVolume: state.baseVol, fletcherMunsonThreshold: state.threshold, tiltBalance: state.balance, beatPunch: state.beat },
            spatial: { soundstage: state.soundstage },
            listening_preferences: state.listeningPreferences || {
                sub_bass_gain: 0,
                mid_bass_gain: 0,
                low_mids_gain: 0,
                high_mids_gain: 0,
                presence_gain: 0,
                brilliance_gain: 0
            },
            frequencyPreferences: { bass: state.bass || "neutro", mids: state.mids || "piatte", treble: state.treble || "smooth" }
        };

        // 1. Modulo Dati Hardware
        const baseProfile = await fetchHeadphoneProfile(AIPayload.hardware.headphone, AIPayload.musicalIdentity.targetCurve, AIPayload.uploadedData);

        // 2. Modulo Decisionale AI (Grafo Locale)
        // In /api/calculate-eq (sincronizzazione stato in tempo reale durante il Wizard)
        // il bypass di LM Studio è deciso dal profilo IA attivo (giuntura Fase 2/3):
        // in Fase 1 il valore è 'local-graph' → calcolo deterministico istantaneo.
        const aiData = await generateAIFilters(AIPayload, "", skipLMStudioForWizard);

        // 3. Modulo DSP & Sicurezza Anti-Clipping
        // aiData contiene .graphFilters e .desiderata
        const finalData = mergeAndSecureFilters(baseProfile, aiData.graphFilters, aiData.desiderata, AIPayload.listening_preferences, aiData.foundArtists);

        // 4. Compilatore Multilingua
        const finalOutput = compileOutput(finalData, destination);

        // Esecuzione/Scrittura
        if (destination === 'e-apo') {
            writeEqFileDebounced(finalOutput);
            res.json({ success: true, message: 'EQ calcolata e applicata in background.', payload: finalData, baseProfile });
        } else {
            console.log(`[API] Export generato per formato ${destination}. Nessuna modifica a Equalizer APO.`);
            res.json({ success: true, fileContent: finalOutput, message: `Profilo esportato in formato ${destination}`, payload: finalData, baseProfile });
        }
    } catch (err) {
        console.error('[API] Errore critico nel motore:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/eq/refine', async (req, res) => {
    try {
        const { filters, destination = 'e-apo', basePreamp = -6.0 } = req.body;
        console.log(`[API] Ricevuta richiesta Rifinitura (Fine-Tuning). Destinazione: ${destination}`);
        
        if (!Array.isArray(filters)) {
            return res.status(400).json({ success: false, error: 'Lista filtri non valida.' });
        }

        // 2. Ricalcolo Preamp di sicurezza tramite coreCalculator
        const refinedData = refineAndSecureFilters(filters, basePreamp);
        refinedData.customCommands = [];

        const finalOutput = compileOutput(refinedData, destination);

        if (destination === 'e-apo') {
            writeEqFileDebounced(finalOutput);
            res.json({ 
                success: true, 
                message: 'Micro-variazioni applicate con successo in tempo reale su Equalizer APO.', 
                payload: refinedData,
                fileContent: finalOutput 
            });
        } else {
            res.json({ 
                success: true, 
                fileContent: finalOutput, 
                message: `Profilo di rifinitura esportato in formato ${destination}`, 
                payload: refinedData 
            });
        }
    } catch (err) {
        console.error('[API] Errore durante la rifinitura EQ:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/eq/refine/ai', async (req, res) => {
    try {
        const { prompt, filters, destination = 'e-apo', basePreamp = -6.0 } = req.body;
        console.log(`[API] Ricevuta richiesta Rifinitura AI. Prompt: "${prompt}"`);
        
        if (!Array.isArray(filters)) {
            return res.status(400).json({ success: false, error: 'Lista filtri non valida.' });
        }

        let freq = 1000;
        let gain = 0;
        let q = 1.41;
        let type = 'PK';
        let msg = '';

        const text = prompt.toLowerCase();
        
        // Semplice NLP Rule-based per la demo
        let gainMatch = text.match(/([+-]?\d+(?:\.\d+)?)\s*db/);
        let freqMatch = text.match(/(\d+(?:\.\d+)?)\s*(hz|khz)/);
        
        if (gainMatch) {
            gain = parseFloat(gainMatch[1]);
            if (text.includes('abbassa') || text.includes('riduci') || text.includes('meno')) {
                gain = -Math.abs(gain);
            }
        } else {
            if (text.includes('abbassa') || text.includes('riduci') || text.includes('taglia')) gain = -2;
            else if (text.includes('alza') || text.includes('aumenta') || text.includes('più')) gain = +2;
        }

        if (freqMatch) {
            freq = parseFloat(freqMatch[1]);
            if (freqMatch[2] === 'khz') freq *= 1000;
        } else {
            if (text.includes('basso') || text.includes('bassi') || text.includes('kick')) freq = 60;
            else if (text.includes('voce') || text.includes('voci') || text.includes('cantato')) freq = 2000;
            else if (text.includes('chitarre') || text.includes('chitarra')) freq = 3000;
            else if (text.includes('sibilanti') || text.includes('piatti')) freq = 7000;
            else if (text.includes('aria') || text.includes('dettaglio')) { freq = 10000; type = 'HS'; }
        }

        msg = `Ho applicato un filtro di ${gain > 0 ? '+' : ''}${gain}dB a ${freq}Hz.`;

        // Applica il filtro aggiungendolo in coda come filtro manuale
        filters.push({ type, freq, gain, q, isManual: true });
        filters.sort((a, b) => a.freq - b.freq);

        // Ricalcolo Preamp di sicurezza tramite coreCalculator
        const refinedData = refineAndSecureFilters(filters, basePreamp);
        refinedData.customCommands = [];

        const finalOutput = compileOutput(refinedData, destination);

        if (destination === 'e-apo') {
            writeEqFileDebounced(finalOutput);
        }

        res.json({ 
            success: true, 
            message: msg, 
            payload: refinedData,
            fileContent: finalOutput 
        });

    } catch (err) {
        console.error('[API] Errore durante la rifinitura AI:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Costruzione Payload strutturato unificato per la chat (usato da /api/chat
// e dal canale SSE /api/chat/stream).
function buildStructuredPayload(aiPayload) {
  return {
    metadata: { timestamp: new Date().toISOString(), version: "3.1-graph-engine", context: "Personal EQ Chat" },
    hardware: { headphone: aiPayload.headphone || aiPayload.hardware?.headphone || "", dac: aiPayload.dac || aiPayload.hardware?.dac || "", amp: aiPayload.amp || aiPayload.hardware?.amp || "" },
    uploadedData: aiPayload.uploadedFiles || aiPayload.uploadedData || [],
    musicalIdentity: { targetCurve: aiPayload.targetCurve, artists: aiPayload.selectedArtists || aiPayload.musicalIdentity?.artists || [], genres: aiPayload.selectedGenres || aiPayload.musicalIdentity?.genres || [] },
    psychoacoustics: { baseVolume: aiPayload.baseVol, fletcherMunsonThreshold: aiPayload.threshold, tiltBalance: aiPayload.balance, beatPunch: aiPayload.beat },
    spatial: { soundstage: aiPayload.soundstage },
    listening_preferences: aiPayload.listeningPreferences || aiPayload.listening_preferences || {},
    frequencyPreferences: { bass: aiPayload.bass || "neutro", mids: aiPayload.mids || "piatte", treble: aiPayload.treble || "smooth" }
  };
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, aiPayload, destination, chatHistory } = req.body;
    const structuredPayload = buildStructuredPayload(aiPayload || {});

    // Contesto strutturato corrente (Fase 6): step del wizard + filtri EQ live.
    const currentState = {
      step: aiPayload?.step,
      currentFilters: Array.isArray(aiPayload?.currentFilters) ? aiPayload.currentFilters : []
    };

    // Otteniamo il profilo base hardware (come fa /api/eq)
    const baseProfile = await fetchHeadphoneProfile(structuredPayload.hardware.headphone, structuredPayload.musicalIdentity.targetCurve, structuredPayload.uploadedData);

    // 1. Genera filtri tramite Grafo + provider IA (profilo attivo se presente)
    const aiResult = await generateAIFilters(structuredPayload, message, undefined, chatHistory || [], currentState);

    // 2. Sicurezza Anti-Clipping e PreAmp
    // Passiamo baseProfile per unire la correzione hardware al tuning dell'IA e degli artisti
    const securedFilters = mergeAndSecureFilters(
      baseProfile, 
      aiResult.graphFilters, 
      aiResult.desiderata, 
      structuredPayload.listening_preferences,
      aiResult.foundArtists || []
    );
    // 3. Compilazione Output
    const compiledOutput = compileOutput(securedFilters, destination || 'e-apo');

    // 4. Se E-APO è la destinazione, aggiorna il file PersonalEQ.txt
    if (destination === 'e-apo' || !destination) {
      writeEqFileDebounced(compiledOutput);
    }

    res.json({
      success: true,
      reply: aiResult.message,     // Compatibilità col frontend (App.jsx gestisce `data.reply`)
      message: aiResult.message,   // Compatibilità extra
      filters: securedFilters.filters,
      fileContent: compiledOutput,
      payload: securedFilters,     // App.jsx legge data.payload per aggiornare il grafico e tabella
      baseProfile: baseProfile
    });
  } catch (error) {
    console.error("Errore nell'endpoint /api/chat:", error);
    res.status(500).json({ error: "Errore durante l'elaborazione della richiesta." });
  }
});

// --- API AI PROFILES (Fase 2: layer di astrazione provider IA) ---
app.post('/api/ai/profiles', async (req, res) => {
  try {
    const { name, type, baseUrl, apiKey, model } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Campo "name" obbligatorio.' });
    }
    if (!aiRegistry.SUPPORTED_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: 'Tipo provider non supportato.' });
    }
    const profile = await aiRegistry.createProfile({ name, type, baseUrl, apiKey, model });
    res.status(201).json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Impossibile creare il profilo.' });
  }
});

app.get('/api/ai/profiles', async (req, res) => {
  try {
    const profiles = await aiRegistry.listProfiles();
    res.json({ success: true, profiles });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Impossibile leggere i profili.' });
  }
});

app.post('/api/ai/profiles/:id/test', async (req, res) => {
  try {
    const adapter = await aiRegistry.getAdapter(req.params.id);
    if (!adapter) {
      return res.status(404).json({ success: false, error: 'Profilo non trovato.' });
    }
    const probe = await capabilityProbe(adapter);
    res.json({ success: probe.ok, tier: probe.tier, latencyMs: probe.latencyMs, modelName: probe.modelName });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Test del provider non riuscito.' });
  }
});

app.post('/api/ai/profiles/:id/activate', async (req, res) => {
  try {
    const profile = await aiRegistry.getProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profilo non trovato.' });
    }
    // Probe se non ancora eseguito (tier non assegnato). Non rende mai la
    // risposta bloccante: un tier 3 resta attivabile (chat conversazionale).
    if (profile.tier === null || profile.tier === undefined) {
      const adapter = await aiRegistry.getAdapter(req.params.id);
      const probe = await capabilityProbe(adapter);
      await aiRegistry.updateProfile(req.params.id, { tier: probe.tier });
    }
    const activated = await aiRegistry.setActiveProfile(req.params.id);
    res.json({ success: true, profile: activated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Attivazione del profilo non riuscita.' });
  }
});

// --- CANALE SSE /api/chat/stream (Fase 2, streaming per la chat Fase 6) ---
// Scelta progettuale: endpoint SEPARATO da POST /api/chat per non rompere il
// contratto JSON esistente (App.jsx legge data.reply). Contratto eventi SSE:
//   data: {"type":"delta","text":"..."}           — delta token-by-token
//   data: {"type":"done","reply":"...","desiderata":{...},"tier":1|2|"local-graph"}
//   data: {"type":"error","message":"..."}        — errore sanitizzato
//   data: {"type":"ping"}                         — heartbeat (15s)
// Nessun profilo attivo o provider tier 3 → fallback deterministico, MAI
// errore bloccante. Chiusura pulita su req.on('close') con abort del fetch.
app.post('/api/chat/stream', async (req, res) => {
  const { message = '', aiPayload = {}, chatHistory = [], destination = 'e-apo' } = req.body || {};
  const structuredPayload = buildStructuredPayload(aiPayload || {});

  // Contesto strutturato corrente (Fase 6): step del wizard + filtri EQ live.
  const currentState = {
    step: aiPayload.step,
    currentFilters: Array.isArray(aiPayload.currentFilters) ? aiPayload.currentFilters : []
  };

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const send = (event) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const heartbeat = setInterval(() => send({ type: 'ping' }), 15000);
  const controller = new AbortController();
  let aborted = false;
  req.on('close', () => {
    aborted = true;
    controller.abort();
  });

  try {
    const { graphFilters, extractedFacts, foundArtists } = await queryAudioGraph(structuredPayload, message);
    // Sanitizzazione web-derived prima della composizione dei messages.
    const safeFacts = sanitizePromptData(extractedFacts).slice(0, 8);
    const chatMessages = buildMessages(structuredPayload, message, safeFacts, chatHistory, currentState);

    const activeProfile = await aiRegistry.getActiveProfile();
    const adapter = await aiRegistry.getActiveAdapter();
    const useActiveProvider = Boolean(activeProfile) && (activeProfile.tier === 1 || activeProfile.tier === 2) && Boolean(adapter);

    let finalReply = '';
    let finalDesiderata = null;
    let finalTier = 'local-graph';

    if (useActiveProvider) {
      const generator = await adapter.chat({
        messages: chatMessages,
        schema: eqIntentSchema,
        stream: true,
        signal: controller.signal
      });
      for await (const evt of generator) {
        if (aborted) break;
        if (evt.type === 'delta') {
          send({ type: 'delta', text: evt.text });
        } else if (evt.type === 'done') {
          finalReply = evt.parsed ? evt.parsed.message : '';
          finalDesiderata = evt.parsed ? evt.parsed.desiderata : null;
          finalTier = evt.tier;
        } else if (evt.type === 'error') {
          send({ type: 'error', message: evt.message });
        }
      }
    } else {
      // Fallback deterministico: nessun profilo attivo o provider inaffidabile.
      finalDesiderata = calculateWeightedArtistProfile(foundArtists);
      finalReply = "[Modalità Locale] Nessun profilo AI attivo o provider inaffidabile. Applicate le regole deterministiche dal Grafo Acustico.";
      send({ type: 'delta', text: finalReply });
    }

    // done SEMPRE subito (contratto SSE invariato); la proposta di modifica
    // EQ arriva come evento separato e NON viene MAI applicata in automatico
    // (Fase 6: il frontend la mostra come diff accettabile/rifiutabile).
    // Nota: NODE 16+ emette 'close' sul request quando il body è stato letto
    // (non solo su disconnect), quindi NON usare `aborted` qui — solo la
    // guardia res.destroyed evita errori su connessione davvero chiusa.
    if (!res.destroyed) send({ type: 'done', reply: finalReply, desiderata: finalDesiderata, tier: finalTier });

    try {
      const baseProfile = await fetchHeadphoneProfile(structuredPayload.hardware.headphone, structuredPayload.musicalIdentity.targetCurve, structuredPayload.uploadedData);
      const proposal = mergeAndSecureFilters(
        baseProfile,
        graphFilters.slice(0, 12),
        finalDesiderata || {},
        structuredPayload.listening_preferences,
        foundArtists || []
      );
      if (!res.destroyed) send({ type: 'proposal', proposal });
    } catch (err) {
      // Proposta opzionale: se non calcolabile la chat resta funzionale.
    }
  } catch (err) {
    if (!res.destroyed) send({ type: 'error', message: "Errore durante l'elaborazione della richiesta." });
  } finally {
    clearInterval(heartbeat);
    controller.abort();
    res.end();
  }
});

const { resolveArtistOnline } = require('./engine/dspEngine/artistResolver');

app.post('/api/resolve-artist', thirdPartyRateLimit, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nome artista mancante." });

  try {
    const artist = await resolveArtistOnline(name);
    if (artist) {
        res.json({ success: true, artist });
    } else {
        res.json({ success: false, message: "Non trovato o impossibile risolvere." });
    }
  } catch (err) {
    console.error(`[API] Errore in /api/resolve-artist: ${err.message}`);
    res.status(500).json({ success: false, message: "Errore interno durante la risoluzione." });
  }
});

// --- Fase 7: 404 JSON globale + error handler finale (mai HTML, mai stack trace) ---
app.use((req, res) => {
  res.status(404).json({ error: 'Risorsa non trovata.' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? 'Errore interno del server.' : (err.message || 'Richiesta non valida.');
  if (status === 500) console.error('[API] Errore non gestito:', err);
  res.status(status).json({ error: message });
});

// Avvio del server solo quando eseguito direttamente (`node server.js`):
// in fase di test (require) l'app viene esportata senza listener attivo.
// Comportamento invariato: stessa porta 3001, bind 127.0.0.1, test motore DSP all'avvio.
if (require.main === module) {
    // Test automatico del motore DSP all'avvio
    testEngineAccuracy();

    app.listen(PORT, '127.0.0.1', () => {
        console.log(`[API] Server in ascolto su http://127.0.0.1:${PORT}`);
    });
}

module.exports = app;
