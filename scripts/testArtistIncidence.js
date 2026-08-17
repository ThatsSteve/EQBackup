const { mergeAndSecureFilters } = require('../engine/dspEngine/coreCalculator');

function getGainAtFreq(filters, freq) {
    let currentGainAtFreq = 0;
    for (const f of filters) {
        const octavesDistance = Math.abs(Math.log2(freq / f.freq));
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
    return currentGainAtFreq;
}

function runTest() {
    console.log("=== Avvio Test Differenziale Artisti ===");

    // Base profile fisso
    const baseProfile = {
        preamp: -2.0,
        filters: [{ type: 'PK', freq: 100, gain: -1.0, q: 1.0 }] // Filtro finto base
    };

    // Desiderata 1: "Daft Punk" (Electronic)
    const desiderataDaftPunk = {
        sub_bass_intent: 3.8,
        mid_bass_intent: 1.2,
        low_mids_intent: -1.2,
        high_mids_intent: 0.5,
        presence_intent: 0.0,
        brilliance_intent: 2.0
    };

    // Desiderata 2: "Adele" (Acousticness alta)
    const desiderataAdele = {
        sub_bass_intent: -1.5,
        mid_bass_intent: 0.0,
        low_mids_intent: 2.0,
        high_mids_intent: 1.0,
        presence_intent: 0.0,
        brilliance_intent: 0.0
    };

    const artistsDaft = [{ name: "Daft Punk" }];
    const artistsAdele = [{ name: "Adele" }];

    // Calcolo filtri
    const resDaftPunk = mergeAndSecureFilters(baseProfile, [], desiderataDaftPunk, {}, artistsDaft);
    const resAdele = mergeAndSecureFilters(baseProfile, [], desiderataAdele, {}, artistsAdele);

    // Misurazione guadagni
    const daftSubBass = getGainAtFreq(resDaftPunk.filters, 40);
    const adeleSubBass = getGainAtFreq(resAdele.filters, 40);

    const daftHighMids = getGainAtFreq(resDaftPunk.filters, 2500);
    const adeleHighMids = getGainAtFreq(resAdele.filters, 2500);

    const diffSubBass = Math.abs(daftSubBass - adeleSubBass);
    const diffHighMids = Math.abs(daftHighMids - adeleHighMids);

    console.log(`[Daft Punk] Gain a 40Hz: ${daftSubBass.toFixed(2)} dB | a 2kHz: ${daftHighMids.toFixed(2)} dB`);
    console.log(`[Adele]     Gain a 40Hz: ${adeleSubBass.toFixed(2)} dB | a 2kHz: ${adeleHighMids.toFixed(2)} dB`);
    console.log(`Differenza Sub-Bass (40Hz): ${diffSubBass.toFixed(2)} dB`);
    console.log(`Differenza High-Mids (2kHz): ${diffHighMids.toFixed(2)} dB`);

    if (diffSubBass > 0 && diffHighMids > 0) {
        console.log(`[TEST OK] Incidenza Artisti Verificata con successo.`);
    } else {
        console.error(`[TEST FALLITO] I profili artista non stanno causando variazioni!`);
    }
}

runTest();
