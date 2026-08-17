const fs = require('fs');
const path = require('path');

const MATRIX_PATH = path.join(__dirname, '../engine/dspEngine/genreArtistMatrix.json');

// Mock data (in produzione verrebbero prelevati via API, es. Spotify Audio Features)
const incomingArtists = [
    {
        name: "adele",
        metrics: {
            acousticness: 0.85, // Alta
            energy: 0.40,
            loudness: 0.50,
            valence: 0.30,
            danceability: 0.20
        }
    },
    {
        name: "skrillex",
        metrics: {
            acousticness: 0.05,
            energy: 0.95,       // Alta
            loudness: 0.90,     // Alta
            valence: 0.60,
            danceability: 0.85  // Alta
        }
    },
    {
        name: "kendrick lamar",
        metrics: {
            acousticness: 0.20,
            energy: 0.75,
            loudness: 0.80,
            valence: 0.55,
            danceability: 0.80
        }
    }
];

function translateMetricsToIntent(metrics) {
    let sub_bass = 0, mid_bass = 0, low_mids = 0, high_mids = 0, presence = 0, brilliance = 0;

    // 1. Acousticness alta (>0.6) -> Incr low_mids, riduci sub_bass
    if (metrics.acousticness > 0.6) {
        low_mids += 2.0;
        sub_bass -= 1.5;
        high_mids += 1.0;
    }

    // 2. Energy & Loudness alte -> Incr mid_bass e presence
    if (metrics.energy > 0.7 && metrics.loudness > 0.7) {
        mid_bass += 1.8;
        presence += 1.5;
    }

    // 3. Valence & Danceability -> Brilliance e sub_bass
    if (metrics.danceability > 0.7) {
        sub_bass += 2.0;
        brilliance += 1.0;
    }

    // Normalizziamo (Clamp tra -5.0 e +5.0)
    const clamp = (val) => Number(Math.max(-5.0, Math.min(5.0, val)).toFixed(2));

    return [
        clamp(sub_bass),
        clamp(mid_bass),
        clamp(low_mids),
        clamp(high_mids),
        clamp(presence),
        clamp(brilliance)
    ];
}

function runIngestion() {
    console.log("[Data Ingestion] Lettura JSON della matrice...");
    
    let matrixData = { genres: {}, artists: {}, default: [0,0,0,0,0,0] };
    try {
        if (fs.existsSync(MATRIX_PATH)) {
            const rawData = fs.readFileSync(MATRIX_PATH, 'utf8');
            matrixData = JSON.parse(rawData);
        }
    } catch (error) {
        console.error("Errore lettura file:", error);
        return;
    }

    if (!matrixData.artists) matrixData.artists = {};

    let upsertCount = 0;

    incomingArtists.forEach(artist => {
        const intentVector = translateMetricsToIntent(artist.metrics);
        
        // Evitiamo di sovrascrivere hardcoded originali se presenti e se preferiamo mantenerli?
        // Il requisito dice "effettui l'upsert e salvi senza sovrascrivere i profili esistenti (a meno che non sia intenzionale? "senza sovrascrivere" = solo nuovi? facciamo overwrite solo se non c'e)"
        const key = artist.name.toLowerCase();
        if (!matrixData.artists[key]) {
            matrixData.artists[key] = intentVector;
            console.log(`[Data Ingestion] Inserito nuovo artista: ${key} -> [${intentVector}]`);
            upsertCount++;
        } else {
            console.log(`[Data Ingestion] Artista ${key} già presente. Skip.`);
        }
    });

    if (upsertCount > 0) {
        fs.writeFileSync(MATRIX_PATH, JSON.stringify(matrixData, null, 2), 'utf8');
        console.log(`[Data Ingestion] Completata! ${upsertCount} nuovi artisti aggiunti al Grafo Locale.`);
    } else {
        console.log(`[Data Ingestion] Nessun nuovo artista inserito.`);
    }
}

runIngestion();
