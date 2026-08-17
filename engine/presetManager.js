const fs = require('fs');
const path = require('path');
const { compileOutput } = require('./outputCompiler');
const { PERSONAL_EQ_FILE } = require('./fileSync');

const PRESETS_FILE = path.join(__dirname, 'saved_presets.json');

// Assicura che il file dei preset esista
if (!fs.existsSync(PRESETS_FILE)) {
    fs.writeFileSync(PRESETS_FILE, JSON.stringify([]));
}

function getPresets() {
    try {
        const data = fs.readFileSync(PRESETS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error('[PresetManager] Errore lettura preset:', err.message);
        return [];
    }
}

function savePreset(name, hardware, filters, preamp) {
    const presets = getPresets();
    const newPreset = {
        id: Date.now().toString(),
        name,
        date: new Date().toISOString(),
        hardware,
        filters,
        preamp
    };
    presets.push(newPreset);
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2));
    return newPreset;
}

function activatePreset(id) {
    const presets = getPresets();
    const preset = presets.find(p => p.id === id);
    if (!preset) throw new Error('Preset non trovato');

    // Rigenera il file PersonalEQ.txt
    const payload = { filters: preset.filters, preamp: preset.preamp };
    const compiledOutput = compileOutput(payload, 'e-apo');
    
    fs.writeFileSync(PERSONAL_EQ_FILE, compiledOutput, 'utf-8');
    console.log(`[PresetManager] Preset ${preset.name} attivato e scritto su E-APO.`);
    
    return { payload, fileContent: compiledOutput };
}

module.exports = {
    getPresets,
    savePreset,
    activatePreset
};
