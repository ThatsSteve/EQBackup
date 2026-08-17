const fs = require('fs');
const path = require('path');

const APO_CONFIG_DIR = 'C:\\Program Files\\EqualizerAPO\\config';
const CONFIG_FILE = path.join(APO_CONFIG_DIR, 'config.txt');
const PERSONAL_EQ_FILE = path.join(APO_CONFIG_DIR, 'PersonalEQ.txt');

// Assicuriamoci che l'include sia presente nel config principale
function ensureInclude() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            console.error(`Errore: ${CONFIG_FILE} non trovato. Equalizer APO è installato?`);
            process.exit(1);
        }

        const configContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const includeDirective = 'Include: PersonalEQ.txt';

        if (!configContent.includes(includeDirective)) {
            console.log(`Aggiunta della direttiva "${includeDirective}" a config.txt...`);
            fs.appendFileSync(CONFIG_FILE, `\n${includeDirective}\n`, 'utf-8');
            console.log('Direttiva aggiunta con successo.');
        } else {
            console.log('Direttiva Include già presente in config.txt.');
        }
    } catch (err) {
        console.error('Errore durante la modifica di config.txt:', err.message);
        console.error('Assicurati di avere i permessi di scrittura (potrebbe servire eseguire come Amministratore).');
        process.exit(1);
    }
}

// Scrive il profilo EQ
function applyProfile(profile) {
    let eqContent = '';

    // Commento di base
    eqContent += `# Generato automaticamente da Personal EQ - ${new Date().toISOString()}\n\n`;

    if (profile === 'bass') {
        console.log('Applicazione del profilo: BASS BOOST (+15dB su Low Shelf a 100Hz)');
        // Aggiungiamo un Low Shelf molto marcato e abbassiamo un po' il preamp per evitare clipping
        eqContent += `Preamp: -5 dB\n`;
        eqContent += `Filter 1: ON LS Fc 100 Hz Gain 15 dB Q 0.7071\n`;
    } else if (profile === 'flat') {
        console.log('Applicazione del profilo: FLAT (Nessuna alterazione)');
        // Un semplice Preamp a 0 fa da reset
        eqContent += `Preamp: 0 dB\n`;
    } else {
        console.error(`Profilo sconosciuto: ${profile}. Usa 'bass' o 'flat'.`);
        process.exit(1);
    }

    try {
        fs.writeFileSync(PERSONAL_EQ_FILE, eqContent, 'utf-8');
        console.log(`Scrittura completata in ${PERSONAL_EQ_FILE}. Il suono dovrebbe essere cambiato istantaneamente.`);
    } catch (err) {
        console.error(`Errore durante la scrittura di ${PERSONAL_EQ_FILE}:`, err.message);
        process.exit(1);
    }
}

function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Utilizzo: node poc.js <bass|flat>');
        process.exit(0);
    }

    const profile = args[0].toLowerCase();
    
    ensureInclude();
    applyProfile(profile);
}

main();
