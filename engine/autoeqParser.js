const fs = require('fs');
const path = require('path');

/**
 * Modulo Dati Hardware:
 * Gestisce il recupero e il parsing dei profili AutoEQ e dei file custom.
 */

async function fetchHeadphoneProfile(headphoneModel, targetCurve, uploadedFiles = []) {
    if (uploadedFiles && uploadedFiles.length > 0) {
        console.log(`[AutoEqParser] Parsing file custom: ${uploadedFiles[0].name || 'file'}`);
        return parseCustomMeasurement(uploadedFiles[0]); 
    }

    console.log(`[AutoEqParser] Ricerca profilo per: ${headphoneModel || 'Unknown'}, target: ${targetCurve || 'Harman'}`);

    const DB_PATH = path.join(__dirname, 'autoeq_db.json');
    if (headphoneModel && fs.existsSync(DB_PATH)) {
        try {
            const dbContent = fs.readFileSync(DB_PATH, 'utf-8');
            const indexData = JSON.parse(dbContent);
            const userHp = headphoneModel.toLowerCase().trim();
            
            // Ricerca per ID, nome esatto o match parziale nel database
            const match = indexData.find(item => 
              (item.id && item.id === userHp) || 
              (item.name && item.name.toLowerCase() === userHp) || 
              (item.name && item.name.toLowerCase().includes(userHp))
            );
            
            if (match) {
                console.log(`[AutoEqParser] Trovata corrispondenza nel DB AutoEq: ${match.name}`);
                const url = match.parametricEqUrl || `https://raw.githubusercontent.com/jaakkopasanen/AutoEq/master/results/${encodeURI(match.path || '')}/${encodeURIComponent(match.name + ' ParametricEQ.txt')}`;
                
                console.log(`[AutoEqParser] Fetching ParametricEQ da: ${url}`);
                const res = await fetch(url);
                if (res.ok) {
                    const text = await res.text();
                    return parseAutoEqContent(text);
                }
            } else {
                console.log(`[AutoEqParser] Nessuna corrispondenza trovata in autoeq_db.json per '${headphoneModel}'`);
            }
        } catch (err) {
            console.error('[AutoEqParser] Errore lettura/fetch da autoeq_db:', err.message);
        }
    }

    // Fallback: file dummy locale
    const DUMMY_PROFILE_PATH = path.join(__dirname, '..', 'dummy_autoeq.txt');
    if (fs.existsSync(DUMMY_PROFILE_PATH)) {
        console.log('[AutoEqParser] Caricamento dummy_autoeq.txt di fallback');
        const content = fs.readFileSync(DUMMY_PROFILE_PATH, 'utf-8');
        return parseAutoEqContent(content);
    }

    console.log('[AutoEqParser] Nessun profilo trovato, restituisco array vuoto.');
    return { preamp: 0, filters: [] };
}

/**
 * Parser per i file scaricati da AutoEQ (Formato Parametric Eq testo)
 */
function parseAutoEqContent(content) {
    const lines = content.split('\n');
    let preamp = 0;
    const filters = [];

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;

        if (line.toLowerCase().startsWith('preamp:')) {
            const match = line.match(/Preamp:\s*([\-\d.]+)\s*dB/i);
            if (match) preamp = parseFloat(match[1]);
            continue;
        }

        if (line.toLowerCase().startsWith('filter')) {
            const match = line.match(/ON\s+([A-Z0-9]+)\s+Fc\s+([\d.]+)\s+Hz\s+Gain\s+([\-\d.]+)\s+dB\s+Q\s+([\d.]+)/i);
            if (match) {
                filters.push({
                    type: match[1].toUpperCase(),
                    freq: parseFloat(match[2]),
                    gain: parseFloat(match[3]),
                    q: parseFloat(match[4])
                });
            }
        }
    }

    return { preamp, filters };
}

/**
 * Parser per file custom (placeholder espandibile)
 */
function parseCustomMeasurement(fileData) {
    // Al momento restituisce array vuoto o un parser rudimentale CSV
    return { preamp: 0, filters: [] };
}

module.exports = {
    fetchHeadphoneProfile,
    parseAutoEqContent
};
