const path = require('path');
const { parseAutoEq } = require('./src/parser');
const { processEQ, toApoString } = require('./src/core');

function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log("Utilizzo: node test_phase2.js <keyword_semantica>");
        console.log("Esempio: node test_phase2.js calore_voci");
        console.log("Esempio: node test_phase2.js rock_punch");
        process.exit(0);
    }

    const keyword = args[0].toLowerCase();
    const dummyProfilePath = path.join(__dirname, 'dummy_autoeq.txt');

    console.log("=== FASE 2: TEST MOTORE MATEMATICO ===");
    console.log(`1. Caricamento profilo base (flat) da: ${dummyProfilePath}`);
    
    let parsedBaseEq;
    try {
        parsedBaseEq = parseAutoEq(dummyProfilePath);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }

    console.log(`2. Applicazione richiesta semantica: "${keyword}"`);
    const finalAgnosticEq = processEQ(parsedBaseEq, [keyword]);

    console.log("\n--- JSON AGNOSTICO RISULTANTE (Rappresentazione Universale) ---");
    console.log(JSON.stringify(finalAgnosticEq, null, 2));

    console.log("\n--- TESTO GENERATO PER EQUALIZER APO ---");
    const apoString = toApoString(finalAgnosticEq);
    console.log(apoString);
    console.log("======================================");
}

main();
