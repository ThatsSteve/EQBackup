const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// --- Import Motore Backend Modulare ---
const { fetchHeadphoneProfile } = require('./engine/autoeqParser');
const { generateAIFilters } = require('./engine/aiOrchestrator');
const { mergeAndSecureFilters, refineAndSecureFilters, calculateMaxCumulativeGain, testEngineAccuracy } = require('./engine/dspEngine/coreCalculator');
const { compileOutput } = require('./engine/outputCompiler');
const { syncAutoEqDb } = require('./engine/autoeqDownloader');
const { getBrands, getModels, resolveHardware } = require('./engine/hardwareResolver');
const presetManager = require('./engine/presetManager');
const { checkApoPermissions, writeEqFileDebounced } = require('./engine/fileSync');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/live-sync/check', (req, res) => {
    const status = checkApoPermissions();
    res.json(status);
});

app.get('/api/sync-autoeq', async (req, res) => {
    const result = await syncAutoEqDb();
    if (result.success) {
        res.json(result);
    } else {
        res.status(500).json(result);
    }
});

app.get('/api/artists', (req, res) => {
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

app.post('/api/hardware/resolve', async (req, res) => {
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
        // In /api/eq (sincronizzazione stato in tempo reale durante il Wizard) utilizziamo sempre il calcolo immediato dal Grafo di Conoscenza
        const skipLMStudio = true;
        const aiData = await generateAIFilters(AIPayload, "", skipLMStudio);

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

app.post('/api/chat', async (req, res) => {
  try {
    const { message, aiPayload, destination } = req.body;
    
    // Costruiamo un payload strutturato unificato
    const structuredPayload = {
      metadata: { timestamp: new Date().toISOString(), version: "3.1-graph-engine", context: "Personal EQ Chat" },
      hardware: { headphone: aiPayload.headphone || aiPayload.hardware?.headphone || "", dac: aiPayload.dac || aiPayload.hardware?.dac || "", amp: aiPayload.amp || aiPayload.hardware?.amp || "" },
      uploadedData: aiPayload.uploadedFiles || aiPayload.uploadedData || [],
      musicalIdentity: { targetCurve: aiPayload.targetCurve, artists: aiPayload.selectedArtists || aiPayload.musicalIdentity?.artists || [], genres: aiPayload.selectedGenres || aiPayload.musicalIdentity?.genres || [] },
      psychoacoustics: { baseVolume: aiPayload.baseVol, fletcherMunsonThreshold: aiPayload.threshold, tiltBalance: aiPayload.balance, beatPunch: aiPayload.beat },
      spatial: { soundstage: aiPayload.soundstage },
      listening_preferences: aiPayload.listeningPreferences || aiPayload.listening_preferences || {},
      frequencyPreferences: { bass: aiPayload.bass || "neutro", mids: aiPayload.mids || "piatte", treble: aiPayload.treble || "smooth" }
    };

    // Otteniamo il profilo base hardware (come fa /api/eq)
    const baseProfile = await fetchHeadphoneProfile(structuredPayload.hardware.headphone, structuredPayload.musicalIdentity.targetCurve, structuredPayload.uploadedData);

    // 1. Genera filtri tramite Grafo + LM Studio (passando messaggio e payload strutturato)
    const aiResult = await generateAIFilters(structuredPayload, message);

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

const { resolveArtistOnline } = require('./engine/dspEngine/artistResolver');

app.post('/api/resolve-artist', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nome artista mancante." });
  
  const artist = await resolveArtistOnline(name);
  if (artist) {
      res.json({ success: true, artist });
  } else {
      res.json({ success: false, message: "Non trovato o impossibile risolvere." });
  }
});

// Test automatico del motore DSP all'avvio
testEngineAccuracy();

app.listen(PORT, '127.0.0.1', () => {
    console.log(`[API] Server in ascolto su http://127.0.0.1:${PORT}`);
});
