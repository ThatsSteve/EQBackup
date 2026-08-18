/**
 * Modulo deterministico di calcolo DSP (Digital Signal Processing).
 * Implementa i Guardrails Psicoacustici e la logica di calcolo dei filtri.
 */

/**
 * Limitazione Guadagno Totale e Bounding del Fattore Q.
 * Il guadagno cumulativo per singola banda non deve mai superare il range [-12 dB, +9 dB].
 * Mantiene i valori Q nell'intervallo [0.5, 3.5].
 */
function applyPsychoacousticGuardrails(filters) {
    return filters.map(f => {
        const safeFilter = { ...f };
        
        // Bounding Gain
        if (safeFilter.gain !== undefined) {
            safeFilter.gain = Math.max(-12.0, Math.min(9.0, safeFilter.gain));
        }

        // Bounding Q factor
        if (safeFilter.q !== undefined && (safeFilter.type === 'PK' || safeFilter.type === 'LS' || safeFilter.type === 'HS')) {
            safeFilter.q = Math.max(0.5, Math.min(3.5, safeFilter.q));
        }

        return safeFilter;
    });
}

/**
 * Merge dei Filtri Vicini
 * Se due filtri di tipo Peaking distano meno di 0.5 ottave, uniscili algebricamente.
 */
function mergeProximityFilters(filters) {
    if (!filters || filters.length === 0) return [];

    let merged = [];
    const peakingFilters = filters.filter(f => f.type === 'PK');
    const otherFilters = filters.filter(f => f.type !== 'PK');

    // Sort peaking filters by frequency
    peakingFilters.sort((a, b) => a.freq - b.freq);

    for (const filter of peakingFilters) {
        if (merged.length === 0) {
            merged.push(filter);
            continue;
        }

        const last = merged[merged.length - 1];
        const octavesDistance = Math.abs(Math.log2(filter.freq / last.freq));

        if (octavesDistance < 0.5) {
            // Unisci algebricamente i due filtri
            // Frequenza media (logaritmica), Gain somma, Q media
            const newFreq = Math.round(Math.sqrt(last.freq * filter.freq));
            const newGain = last.gain + filter.gain;
            const newQ = (last.q + filter.q) / 2;

            merged[merged.length - 1] = {
                ...last,
                freq: newFreq,
                gain: newGain,
                q: newQ,
                origin: last.origin // Mantieni l'origine dominante
            };
        } else {
            merged.push(filter);
        }
    }

    // Ricombiniamo e applichiamo di nuovo il guardrail sui gain sommati
    return applyPsychoacousticGuardrails([...otherFilters, ...merged]);
}

/**
 * Approssimazione del guadagno massimo cumulativo per prevenire il clipping.
 * Simula la risposta in frequenza su 100 punti logaritmici tra 20Hz e 20kHz.
 */
function calculateMaxCumulativeGain(filters) {
    if (!filters || filters.length === 0) return 0;
    
    let maxGain = 0;
    
    // 100 punti logaritmici tra 20Hz e 20kHz
    const minFreq = 20;
    const maxFreq = 20000;
    const points = 100;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const step = (logMax - logMin) / (points - 1);

    for (let i = 0; i < points; i++) {
        const freq = Math.pow(10, logMin + i * step);
        let currentGainAtFreq = 0;
        
        for (const f of filters) {
            const octavesDistance = Math.abs(Math.log2(freq / f.freq));
            
            // Approssimazione curva del filtro (semplificata per il worst-case scenario di fase)
            if (f.type === 'PK') {
                const bandwidthOctaves = 1 / (f.q || 1.41);
                if (octavesDistance < bandwidthOctaves) {
                    const influence = 1 - (octavesDistance / bandwidthOctaves);
                    currentGainAtFreq += f.gain * influence;
                }
            } else if (f.type === 'LS' || f.type === 'LSC') {
                if (freq <= f.freq) {
                    currentGainAtFreq += f.gain;
                } else if (octavesDistance < 1) { 
                    currentGainAtFreq += f.gain * (1 - octavesDistance);
                }
            } else if (f.type === 'HS' || f.type === 'HSC') {
                if (freq >= f.freq) {
                    currentGainAtFreq += f.gain;
                } else if (octavesDistance < 1) {
                    currentGainAtFreq += f.gain * (1 - octavesDistance);
                }
            }
        }
        
        if (currentGainAtFreq > maxGain) {
            maxGain = currentGainAtFreq;
        }
    }
    
    return Number(maxGain.toFixed(2));
}

/**
 * Converte l'oggetto delle preferenze d'ascolto (se presente)
 */
function convertListeningPreferencesToFilters(prefs = {}) {
    const bandConfigs = [
        { key: 'sub_bass_gain', freq: 40, type: 'LS', q: 0.71 },
        { key: 'mid_bass_gain', freq: 120, type: 'PK', q: 1.0 },
        { key: 'low_mids_gain', freq: 500, type: 'PK', q: 1.0 },
        { key: 'high_mids_gain', freq: 2000, type: 'PK', q: 1.0 },
        { key: 'presence_gain', freq: 6000, type: 'PK', q: 1.4 },
        { key: 'brilliance_gain', freq: 10000, type: 'HS', q: 0.71 }
    ];

    const filters = [];
    for (const config of bandConfigs) {
        const gain = parseFloat(prefs[config.key]) || 0;
        if (gain !== 0) {
            filters.push({
                type: config.type,
                freq: config.freq,
                gain: gain,
                q: config.q,
                origin: 'MANUALE'
            });
        }
    }
    return filters;
}

/**
 * Traduce gli intenti semantici dell'LLM (o del profilo ponderato artisti) in filtri parametrici fisici reali.
 */
function translateDesiderataToFilters(desiderata = {}, artistTag = 'ARTISTA') {
    const filters = [];
    
    if (desiderata.sub_bass_intent) {
        filters.push({ type: 'LS', freq: 40, gain: Number(desiderata.sub_bass_intent), q: 0.71, origin: artistTag });
    }
    if (desiderata.mid_bass_intent) {
        filters.push({ type: 'PK', freq: 120, gain: Number(desiderata.mid_bass_intent), q: 1.0, origin: artistTag });
    }
    if (desiderata.low_mids_intent) {
        filters.push({ type: 'PK', freq: 500, gain: Number(desiderata.low_mids_intent), q: 1.0, origin: artistTag });
    }
    if (desiderata.high_mids_intent) {
        filters.push({ type: 'PK', freq: 2500, gain: Number(desiderata.high_mids_intent), q: 1.2, origin: artistTag });
    }
    if (desiderata.presence_intent) {
        filters.push({ type: 'PK', freq: 6000, gain: Number(desiderata.presence_intent), q: 1.4, origin: artistTag });
    }
    if (desiderata.brilliance_intent) {
        filters.push({ type: 'HS', freq: 10000, gain: Number(desiderata.brilliance_intent), q: 0.71, origin: artistTag });
    }

    return applyPsychoacousticGuardrails(filters);
}

/**
 * Orchestratore DSP: unisce profilo base, filtri generati dal grafo/LLM e preferenze manuali
 */
function mergeAndSecureFilters(baseProfile, graphFilters = [], desiderata = {}, listeningPreferences = {}, foundArtists = []) {
    const { preamp: basePreamp = 0, filters: _baseFilters = [] } = baseProfile || {};
    
    // Assegna AUTOEQ a baseFilters
    const baseFilters = _baseFilters.map(f => ({ ...f, origin: 'AUTOEQ' }));
    
    // Genera l'etichetta ARTISTA con il nome
    let artistTag = 'ARTISTA';
    if (foundArtists && foundArtists.length > 0) {
        const names = foundArtists.map(a => a.name).join(' + ');
        artistTag = `ARTISTA: ${names}`;
    }

    let rawDesiderataFilters = translateDesiderataToFilters(desiderata, artistTag);
    // graphFilters potrebbe contenere isManual, per sicurezza mappiamo se non hanno origin
    const safeGraphFilters = graphFilters.map(f => ({ ...f, origin: f.origin || 'AUTOEQ' }));
    let tuningFilters = convertListeningPreferencesToFilters(listeningPreferences);

    // Uniamo i filtri extra e li compattiamo
    let extraFilters = mergeProximityFilters([...safeGraphFilters, ...rawDesiderataFilters, ...tuningFilters]);

    // Fonde tutto per il calcolo cumulativo
    const mergedFilters = [...baseFilters, ...extraFilters];

    // Guardrails psicoacustici su TUTTI i filtri, base AutoEq inclusa (nessuna eccezione)
    const securedMergedFilters = applyPsychoacousticGuardrails(mergedFilters);

    // Calcolo automatico Preamp anti-clipping sulla curva effettivamente emessa
    const totalMaxGain = calculateMaxCumulativeGain(securedMergedFilters);
    
    let finalPreamp = basePreamp;
    
    if (totalMaxGain > 0) {
        // Combinazione dei due contributi: il preamp anti-clipping (-dB_peak - 0.2 dB)
        // SI COMBINA con il preamp AutoEq, non lo sostituisce. Il risultato è il più
        // protettivo dei due (mai meno protettivo del solo preamp AutoEq).
        const antiClippingPreamp = -totalMaxGain - 0.2;
        finalPreamp = Math.min(basePreamp, antiClippingPreamp);
        console.log(`[coreCalculator] Rilevato picco cumulativo di +${totalMaxGain.toFixed(2)} dB.`);
        console.log(`[coreCalculator] Preamp finale regolato a ${finalPreamp.toFixed(2)} dB per headroom assoluto.`);
    }

    if (finalPreamp > 0) finalPreamp = 0;

    return {
        preamp: finalPreamp,
        filters: securedMergedFilters,
        metadata: {
            source: 'coreCalculator',
            extraFiltersApplied: extraFilters.length
        }
    };
}

/**
 * Rifinitura manuale post-calcolo (utile per l'endpoint di refine)
 */
function refineAndSecureFilters(filters, basePreamp = -6.0) {
    const safeFilters = mergeProximityFilters(filters);
    const maxGain = calculateMaxCumulativeGain(safeFilters);
    
    let safePreamp = basePreamp;
    if (maxGain > 0) {
        safePreamp = -maxGain - 0.2;
    }
    return {
        preamp: safePreamp,
        filters: safeFilters
    };
}

/**
 * Test unitario interno: simula configurazioni estreme e convalida i guardrails.
 */
function testEngineAccuracy() {
    console.log("[TEST] Avvio testEngineAccuracy()...");
    
    // Simula 5 artisti bassy con LLM che richiede il massimo bass boost (intent +5)
    const testDesiderata = {
        sub_bass_intent: 5.0,
        mid_bass_intent: 5.0,
        low_mids_intent: 5.0,
        high_mids_intent: 5.0,
        presence_intent: 5.0,
        brilliance_intent: 5.0
    };

    const graphFilters = [
        { type: 'PK', freq: 110, gain: 4.0, q: 0.1 }, // Q out of bounds, will be clamped
        { type: 'PK', freq: 130, gain: 4.0, q: 4.0 }  // Close to 120Hz mid_bass, will merge
    ];

    const result = mergeAndSecureFilters({}, graphFilters, testDesiderata, {});

    let passed = true;

    // Test a) I filtri sono validi e bounded?
    result.filters.forEach(f => {
        if (f.gain > 9.0 || f.gain < -12.0) {
            console.error(`[TEST FALLITO] Gain fuori range: ${f.gain} dB`);
            passed = false;
        }
        if (f.q !== undefined && (f.q < 0.5 || f.q > 3.5)) {
            console.error(`[TEST FALLITO] Q factor fuori range: ${f.q}`);
            passed = false;
        }
    });

    // Test b) Preamp anti-clipping
    const cumulativePeak = calculateMaxCumulativeGain(result.filters);
    const finalPeak = cumulativePeak + result.preamp;
    if (finalPeak > 0) {
        console.error(`[TEST FALLITO] Possibile clipping digitale residuo! Peak finale: ${finalPeak} dB`);
        passed = false;
    }

    if (passed) {
        console.log("[TEST] testEngineAccuracy() SUPERATO CON SUCCESSO. Guardrails attivi e funzionanti.");
    }

    return passed;
}

module.exports = {
    mergeAndSecureFilters,
    refineAndSecureFilters,
    calculateMaxCumulativeGain,
    translateDesiderataToFilters,
    testEngineAccuracy
};
