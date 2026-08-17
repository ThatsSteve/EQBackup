/**
 * Compilatore Multilingua:
 * Converte l'array di filtri finale nel formato richiesto dal client (e-apo, roon, clipboard).
 */

function compileOutput(finalData, destinationFormat) {
    const { preamp, filters, customCommands } = finalData;

    switch (destinationFormat) {
        case 'roon':
            return compileRoonFormat(preamp, filters, customCommands);
        case 'clipboard':
            return compileClipboardFormat(preamp, filters, customCommands);
        case 'e-apo':
        default:
            return compileEApoFormat(preamp, filters, customCommands);
    }
}

function compileEApoFormat(preamp, filters, customCommands) {
    let output = '';
    
    // Inserisci prima eventuali comandi custom (es. Channel o Copy)
    if (customCommands && customCommands.length > 0) {
        output += customCommands.join('\n') + '\n\n';
    }

    output += `Preamp: ${preamp.toFixed(1)} dB\n`;
    
    filters.forEach((f, index) => {
        output += `Filter ${index + 1}: ON ${f.type} Fc ${f.freq} Hz Gain ${f.gain.toFixed(1)} dB Q ${f.q}\n`;
    });

    return output;
}

function compileRoonFormat(preamp, filters, customCommands) {
    // Formato Roon
    // Per ora esportiamo un JSON strutturato mappato per i DSP Roon
    return JSON.stringify({
        metadata: {
            title: "Personal AI EQ for Roon",
            generator: "AI-Native EQ Engine"
        },
        preamp: Number(preamp.toFixed(2)),
        bands: filters.map((f, i) => ({
            id: i + 1,
            type: mapTypeToRoon(f.type),
            frequency: f.freq,
            gain: Number(f.gain.toFixed(2)),
            q: Number(f.q)
        }))
    }, null, 2);
}

function compileClipboardFormat(preamp, filters, customCommands) {
    // Formato testuale human-readable per copia-incolla manuale
    let output = `🎧 PERSONAL AI EQ SETTINGS 🎧\n`;
    output += `================================\n`;
    output += `Preamp: ${preamp.toFixed(1)} dB\n\n`;
    
    if (filters.length === 0) {
        output += `Nessun filtro applicato.\n`;
    } else {
        filters.forEach((f, i) => {
            output += `Band ${i + 1}: [${f.type}]  ${f.freq} Hz  |  Gain: ${f.gain >= 0 ? '+' : ''}${f.gain.toFixed(1)} dB  |  Q: ${f.q}\n`;
        });
    }
    
    output += `================================\n`;
    return output;
}

function mapTypeToRoon(type) {
    const map = {
        'PK': 'Parametric', // o 'Peak' a seconda della versione Roon API
        'LS': 'LowShelf',
        'HS': 'HighShelf',
        'LSC': 'LowShelf',
        'HSC': 'HighShelf'
    };
    return map[type] || 'Parametric';
}

module.exports = {
    compileOutput
};
