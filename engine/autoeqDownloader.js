const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'autoeq_db.json');
// Indice globale ufficiale in formato Markdown dal repository di Jaakko Pasanen
const AUTOEQ_INDEX_URL = 'https://raw.githubusercontent.com/jaakkopasanen/AutoEq/master/results/INDEX.md';

const KNOWN_BRANDS = [
  "Audio-Technica", "Dan Clark Audio", "Ultimate Ears", "Campfire Audio", "Meze Audio", "64 Audio",
  "Sennheiser", "Beyerdynamic", "HiFiMAN", "Moondrop", "Audeze", "Focal", "Shure", "Sony", "Bose",
  "Apple", "Samsung", "AKG", "Denon", "FiiO", "Grado", "JVC", "Koss", "Meze", "Phillips", "Pioneer",
  "Stax", "Yamaha", "Tangzu", "Thieaudio", "Truthear", "Letshuoer", "Tin Hifi", "7Hz", "Simgot",
  "Dunu", "Tanchjim", "SeeAudio", "Softears", "Kato", "Blon", "CCA", "KZ", "QOA", "IKKO", "Etymotic", "Final Audio", "Abyss"
];

async function syncAutoEqDb() {
  try {
    console.log("[AutoEq Downloader] Avvio download massivo del catalogo AutoEq (INDEX.md)...");
    const response = await fetch(AUTOEQ_INDEX_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const mdText = await response.text();
    const lines = mdText.split('\n');
    console.log(`[AutoEq Downloader] Letto indice AutoEq: ${lines.length} righe totali.`);

    // Caricamento del DB locale esistente per preservare dispositivi custom, DAC e AMP
    const mergedDb = new Map();
    if (fs.existsSync(DB_PATH)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        if (Array.isArray(existingData)) {
          existingData.forEach(item => {
            const key = item.id || (item.name ? item.name.toLowerCase() : null);
            if (key) mergedDb.set(key, item);
          });
          console.log(`[AutoEq Downloader] Caricati ${mergedDb.size} profili preesistenti dal database locale.`);
        }
      } catch (e) {
        console.warn("[AutoEq Downloader] Impossibile leggere il DB esistente, avvio indicizzazione pulita:", e.message);
      }
    }

    let parsedCount = 0;
    for (let line of lines) {
      line = line.trim();
      // Formato atteso: - [Model Name](./source/target_type/Model%20Name) by source on rig
      const match = line.match(/^-\s+\[(.*?)\]\(\.?\/(.*?)\)/);
      if (!match) continue;

      const rawName = match[1].trim();
      let relPath = decodeURIComponent(match[2].trim());
      // Rimozione eventuale ./ in testa
      if (relPath.startsWith('./')) relPath = relPath.slice(2);

      const id = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (!id) continue;

      // Estrazione Marca e Modello
      let brand = "Generic";
      let model = rawName;
      for (const b of KNOWN_BRANDS) {
        if (rawName.toLowerCase().startsWith(b.toLowerCase())) {
          brand = b;
          model = rawName.slice(b.length).trim() || rawName;
          break;
        }
      }
      if (brand === "Generic") {
        const words = rawName.split(/\s+/);
        if (words.length > 1) {
          brand = words[0];
          model = words.slice(1).join(" ");
        }
      }

      // Identificazione Tipologia e Architettura
      const isIem = /in-ear|iem|earbud|711|crinacle.*in-ear|harman_in-ear/i.test(relPath) || /iem|in-ear|ie\s|\sie$/i.test(rawName);
      const isClosed = !isIem && /closed|xm4|xm5|airpods|momentum|quietcomfort|bathys|maxwell|m50x|dt 770|mdr-7506/i.test(rawName);
      const architecture = isIem ? "in-ear" : (isClosed ? "closed" : "open");

      // Stima acustica impedenza e sensibilità di default (se non nota nel DB esistente)
      let impedance = isIem ? 16 : (/800|600|650|1990|990|utopia|susvara|t1|pro/i.test(rawName) ? 250 : 32);
      let sensitivity = isIem ? 115 : 100;

      // Costruzione link diretto al file ParametricEQ
      const encodedPath = encodeURI(relPath);
      const encodedFileName = encodeURIComponent(`${rawName} ParametricEQ.txt`);
      const parametricEqUrl = `https://raw.githubusercontent.com/jaakkopasanen/AutoEq/master/results/${encodedPath}/${encodedFileName}`;

      const existingItem = mergedDb.get(id);
      if (existingItem) {
        // Preserva proprietà custom esplicite ma aggiorna link e path AutoEq
        mergedDb.set(id, {
          ...existingItem,
          path: relPath,
          parametricEqUrl: parametricEqUrl
        });
      } else {
        mergedDb.set(id, {
          id,
          brand,
          model,
          name: rawName,
          type: "headphone",
          impedance,
          sensitivity,
          architecture,
          path: relPath,
          parametricEqUrl
        });
      }
      parsedCount++;
    }

    const finalArray = Array.from(mergedDb.values()).sort((a, b) => {
      const bComp = (a.brand || "").localeCompare(b.brand || "");
      if (bComp !== 0) return bComp;
      return (a.model || "").localeCompare(b.model || "");
    });

    fs.writeFileSync(DB_PATH, JSON.stringify(finalArray, null, 2), 'utf-8');
    console.log(`[AutoEq Downloader] Sincronizzazione completata con successo! Indicizzati ${parsedCount} profili da AutoEq. Totale DB locale: ${finalArray.length} dispositivi.`);
    return { success: true, count: finalArray.length, message: `Database sincronizzato: ${finalArray.length} profili totali.` };
  } catch (err) {
    console.error("[AutoEq Downloader] Errore durante la sincronizzazione massiva AutoEq:", err);
    return { success: false, error: err.message };
  }
}

// Supporto esecuzione autonoma da riga di comando (CLI)
if (require.main === module) {
  syncAutoEqDb().then(res => {
    if (res.success) {
      console.log(`[CLI] Sincronizzazione completata: ${res.message}`);
      process.exit(0);
    } else {
      console.error(`[CLI] Fallimento sincronizzazione: ${res.error}`);
      process.exit(1);
    }
  });
}

module.exports = { syncAutoEqDb };
