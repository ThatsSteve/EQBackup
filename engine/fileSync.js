const fs = require('fs');
const path = require('path');

const APO_CONFIG_DIR = 'C:\\Program Files\\EqualizerAPO\\config';
const PERSONAL_EQ_FILE = path.join(APO_CONFIG_DIR, 'PersonalEQ.txt');

/**
 * Controlla se Node ha i permessi per scrivere nella cartella di sistema.
 * Utile per validare il Live Sync prima di attivarlo.
 */
function checkApoPermissions() {
    try {
        if (!fs.existsSync(APO_CONFIG_DIR)) {
            return { success: false, error: 'Directory Equalizer APO non trovata. Verifica che E-APO sia installato in C:\\Program Files\\EqualizerAPO.' };
        }
        // Test rapido di scrittura / append (non distruttivo)
        fs.appendFileSync(PERSONAL_EQ_FILE, '');
        return { success: true };
    } catch (err) {
        if (err.code === 'EPERM' || err.code === 'EACCES') {
            return { 
                success: false, 
                error: 'Permessi insufficienti. Devi avviare il backend Node.js (o il terminale) come Amministratore per poter scrivere in C:\\Program Files.'
            };
        }
        return { success: false, error: err.message };
    }
}

let writeTimeout = null;

/**
 * Scrittura ritardata (debounced) per evitare micro-scritture I/O pesanti 
 * durante il trascinamento fluido degli slider.
 */
function writeEqFileDebounced(content) {
    if (writeTimeout) clearTimeout(writeTimeout);
    writeTimeout = setTimeout(() => {
        try {
            // Aggiungiamo un'intestazione di sicurezza/Live Sync
            const finalContent = `# Personal EQ - Live Sync Output\n${content}`;
            fs.writeFileSync(PERSONAL_EQ_FILE, finalContent, 'utf-8');
            console.log(`[FileSync] Scrittura su disco E-APO completata con successo.`);
        } catch (err) {
            console.error(`[FileSync] Errore critico durante la scrittura su file E-APO:`, err.message);
        }
    }, 200);
}

module.exports = {
    checkApoPermissions,
    writeEqFileDebounced,
    PERSONAL_EQ_FILE
};
