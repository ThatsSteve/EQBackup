const fs = require('fs');
const path = require('path');

let dbData = null;
let dacAmpDbData = null;

function loadHardwareDb() {
  if (!dbData) {
    const filePath = path.join(__dirname, 'autoeq_db.json');
    if (fs.existsSync(filePath)) {
      dbData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else {
      dbData = [];
    }
  }
  return dbData;
}

function loadDacAmpDb() {
  if (!dacAmpDbData) {
    const filePath = path.join(__dirname, 'dac_amp_db.json');
    if (fs.existsSync(filePath)) {
      dacAmpDbData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else {
      dacAmpDbData = [];
    }
  }
  return dacAmpDbData;
}

function loadKnowledgeGraph() {
  const filePath = path.join(__dirname, 'knowledge_graph.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return { hardware: [], artists: [], descriptors: {} };
}

function saveKnowledgeGraph(graph) {
  try {
    const filePath = path.join(__dirname, 'knowledge_graph.json');
    fs.writeFileSync(filePath, JSON.stringify(graph, null, 2), 'utf-8');
    console.log(`[HardwareResolver] Grafo di Conoscenza aggiornato e salvato con successo (Auto-Apprendimento).`);
  } catch (err) {
    console.error(`[HardwareResolver] Errore salvataggio Grafo:`, err.message);
  }
}

/**
 * Ritorna l'elenco dei marchi unici disponibili per una determinata categoria (headphone, dac, amp)
 */
function getBrands(type = 'headphone') {
  const db = loadHardwareDb();
  const graph = loadKnowledgeGraph();
  const dacAmpDb = loadDacAmpDb();
  
  const brands = new Set();
  const matchType = (itemType) => !type || type === 'all' || (itemType && itemType.toLowerCase().includes(type.toLowerCase()));
  
  db.filter(item => matchType(item.type)).forEach(item => {
    if (item.brand) brands.add(item.brand);
  });
  
  (graph.hardware || []).filter(item => matchType(item.type)).forEach(item => {
    if (item.brand) brands.add(item.brand);
  });

  dacAmpDb.filter(item => matchType(item.type)).forEach(item => {
    if (item.brand) brands.add(item.brand);
  });

  // Aggiungiamo opzione "Altro / Custom"
  const sortedBrands = Array.from(brands).sort();
  if (!sortedBrands.includes("Altro / Custom")) {
    sortedBrands.push("Altro / Custom");
  }
  return sortedBrands;
}

/**
 * Ritorna l'elenco dei modelli per un determinato brand e categoria
 */
function getModels(brand, type = 'headphone') {
  if (!brand || brand === "Altro / Custom") return [];
  
  const db = loadHardwareDb();
  const graph = loadKnowledgeGraph();
  const dacAmpDb = loadDacAmpDb();
  const models = new Map();

  const matchType = (itemType) => !type || type === 'all' || (itemType && itemType.toLowerCase().includes(type.toLowerCase()));

  db.filter(item => 
    matchType(item.type) && 
    (item.brand && item.brand.toLowerCase() === brand.toLowerCase())
  ).forEach(item => {
    models.set(item.model || item.name, item);
  });

  (graph.hardware || []).filter(item => 
    matchType(item.type) && 
    (item.brand && item.brand.toLowerCase() === brand.toLowerCase())
  ).forEach(item => {
    models.set(item.model || item.name || item.id, item);
  });

  dacAmpDb.filter(item => 
    matchType(item.type) && 
    (item.brand && item.brand.toLowerCase() === brand.toLowerCase())
  ).forEach(item => {
    const enrichedItem = {
      ...item,
      architecture: item.architecture || 'Solid-State',
      impedance: item.output_impedance_ohms || 0.1
    };
    models.set(item.model || item.name || item.id, enrichedItem);
  });

  return Array.from(models.values());
}

/**
 * Parser AI Locale per specifiche Web (LM Studio / Qwen / Gemma - RAG Pattern)
 * Timeout 15s per garantire resilienza senza bloccare il server Node.js.
 */
async function parseSpecsWithLocalAI(query, type, abstractText) {
  if (!abstractText || abstractText.trim().length < 15) {
    return { found: false, brand_model: query, type: type };
  }
  try {
    console.log(`[HardwareResolver] [Livello 2 - AI RAG] Interrogazione LM Studio per specifiche di '${query}'...`);
    const systemPrompt = `Sei un software engineer acustico e parser AI locale (RAG Pattern). Il tuo compito è analizzare il testo web grezzo fornito ed estrarre le specifiche tecniche esatte per il dispositivo audio richiesto. Restituisci ESCLUSIVAMENTE un oggetto JSON valido secondo lo schema specificato, senza testo markdown o commenti.`;
    const userPrompt = `Analizza le specifiche tecniche di "${query}" (Categoria target: ${type}) dal seguente testo grezzo scaricato dal web:\n"${abstractText.slice(0, 3000)}"\n\nRestituisci UNICAMENTE un oggetto JSON con la seguente struttura esatta:\n{\n  "found": true oppure false (setta true solo se il testo si riferisce a un dispositivo audio reale e hai trovato o stimato con certezza le sue specifiche acustiche o elettriche),\n  "brand_model": "${query}",\n  "type": "Headphone" oppure "DAC" oppure "Amplifier" oppure "IEM",\n  "impedance_ohms": numero intero in Ohm (es. 32, 16, 250, 300, 100, 1) oppure null,\n  "sensitivity_db_mw": numero intero in dB/mW o SPL (es. 98, 105, 115, 120) oppure null,\n  "architecture": "Open-Back" oppure "Closed-Back" oppure "Planar" oppure "Dynamic" oppure "Solid-State" oppure "Tube" oppure null,\n  "thd_percentage": numero decimale (es. 0.05, 0.1, 1.0) oppure null\n}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout di sicurezza

    const response = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 300
      })
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      let rawContent = data.choices[0].message.content.trim();
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) rawContent = jsonMatch[0];
      const parsed = JSON.parse(rawContent);
      if (parsed && typeof parsed === 'object') {
        console.log(`[HardwareResolver] [Livello 2 - AI RAG] Analisi completata con successo da LM Studio:`, parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[HardwareResolver] [Livello 2 - AI RAG] LM Studio offline, errore o timeout (15s): ${err.message}. Fallback e sicurezza: found=false.`);
  }
  return { found: false, brand_model: query, type: type };
}

/**
 * Ricerca Web Attiva (Scraper Web Node.js / Ricerca Online API):
 * Interroga DuckDuckGo / web con gestione robusta degli errori e timeout
 * per estrarre il testo grezzo e passarlo al modello locale per la formattazione.
 */
async function searchWebSpecs(query, type = 'headphone') {
  if (!query || query.toLowerCase().includes("custom") || query.toLowerCase().includes("altro") || query.toLowerCase().includes("--") || query.length < 3) {
    return { found: false, brand_model: query, type: type };
  }
  try {
    console.log(`[HardwareResolver] [Livello 2] Avvio ricerca Web attiva (Scraper Node.js) per: '${query}' (${type})...`);
    
    let abstractText = "";
    
    // 1. Tentativo di fetch tramite DuckDuckGo API con timeout robusto (3500ms)
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query + " " + type + " audio impedance sensitivity thd")}&format=json&no_redirect=1`;
      const res = await fetch(ddgUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        abstractText += " " + (data.AbstractText || (data.RelatedTopics && data.RelatedTopics[0] ? data.RelatedTopics[0].Text : ""));
      }
    } catch (e) {
      console.warn(`[HardwareResolver] DuckDuckGo scraper timeout/errore:`, e.message);
    }

    // 2. Tentativo di fetch tramite Wikipedia Search API con timeout robusto (3500ms)
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + " audio specifications")}&format=json`;
      const resWiki = await fetch(wikiUrl, { signal: AbortSignal.timeout(3500) });
      if (resWiki.ok) {
        const dataWiki = await resWiki.json();
        if (dataWiki.query && dataWiki.query.search && dataWiki.query.search.length > 0) {
          abstractText += " " + dataWiki.query.search.map(s => s.snippet).join(" ");
        }
      }
    } catch (e) {
      console.warn(`[HardwareResolver] Wikipedia search timeout/errore:`, e.message);
    }

    // Se la ricerca web fallisce o non restituisce alcun testo significativo
    if (!abstractText || abstractText.trim().length < 15) {
      console.warn(`[HardwareResolver] Nessun dato testuale rilevante trovato sul Web per '${query}'. Restituzione found: false per fallback UI.`);
      return { found: false, brand_model: query, type: type };
    }

    // Estrazione intelligente di marca e modello da qualsiasi stringa
    const words = query.trim().split(/\s+/);
    const brand = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
    const modelClean = words.slice(1).join(" ") || query;

    // Integrazione LM Studio (RAG Pattern)
    const aiParsed = await parseSpecsWithLocalAI(query, type, abstractText);

    // Se LM Studio restituisce found: false o è offline e non ci ha dato una risposta valida
    if (!aiParsed || aiParsed.found === false) {
      // Come richiesto: "Se LM Studio è offline, va in timeout o il web non restituisce risultati validi, il backend deve restituire un oggetto con found: false."
      return { found: false, brand_model: query, type: type };
    }

    // Mappatura tra lo schema standard RAG e le proprietà interne del motore e della UI
    const imp = typeof aiParsed.impedance_ohms === 'number' ? aiParsed.impedance_ohms : 32;
    const sens = typeof aiParsed.sensitivity_db_mw === 'number' ? aiParsed.sensitivity_db_mw : 100;
    const arch = aiParsed.architecture || "Open-Back";
    const thd = typeof aiParsed.thd_percentage === 'number' ? aiParsed.thd_percentage : null;

    console.log(`[HardwareResolver] Specifiche RAG ultimate per '${query}' (${brand}): Impedenza ${imp} Ohm, Sensibilità ${sens} dB, Arch: ${arch}, THD: ${thd || 'N/A'}.`);
    return {
      found: true,
      id: query.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
      brand: brand,
      model: modelClean,
      brand_model: aiParsed.brand_model || query,
      name: query,
      type: aiParsed.type || type,
      impedance: imp,
      impedance_ohms: imp,
      sensitivity: sens,
      sensitivity_db_mw: sens,
      architecture: arch,
      thd_percentage: thd
    };
  } catch (err) {
    console.warn(`[HardwareResolver] Ricerca Web API fallita per '${query}':`, err.message);
  }
  return { found: false, brand_model: query, type: type };
}

/**
 * Helper per il riconoscimento di categoria di DAC o AMP
 */
function detectDeviceCategory(query, type) {
  const q = (query || '').toLowerCase();
  if (type === 'dac' || q.includes('dac') || q.includes('dongle') || q.includes('audio interface') || q.includes('scheda audio') || q.includes('topping') || q.includes('chord') || q.includes('smsl') || q.includes('fiio') || q.includes('ibasso')) {
    if (q.includes('dongle') || q.includes('portatile') || q.includes('usb-c') || q.includes('go') || q.includes('hip')) return "DAC USB Portatile / Dongle USB-C";
    if (q.includes('interface') || q.includes('scheda') || q.includes('motu') || q.includes('focusrite') || q.includes('scarlett')) return "Interfaccia Audio Desktop";
    return "DAC / Scheda Audio Desktop Hi-Res";
  }
  if (type === 'amp' || q.includes('amp') || q.includes('amplifi') || q.includes('magni') || q.includes('zen can') || q.includes('a90') || q.includes('valvolare') || q.includes('tube')) {
    if (q.includes('tube') || q.includes('valvol') || q.includes('ta-')) return "Amplificatore Valvolare per Cuffie";
    if (q.includes('portatile') || q.includes('portable')) return "Amplificatore per Cuffie Portatile";
    return "Amplificatore per Cuffie Desktop Dedicato";
  }
  return null;
}

/**
 * Architettura di Risoluzione Hardware a 3 Livelli (Fallback Pipeline)
 */
async function resolveHardware(deviceInput, type = 'headphone') {
  if (!deviceInput) {
    return { status: "EMPTY", level: 0, message: "Nessun dispositivo specificato." };
  }

  const queryStr = typeof deviceInput === 'object' 
    ? `${deviceInput.brand || ''} ${deviceInput.model || ''}`.trim() 
    : deviceInput.trim();

  const queryClean = queryStr.toLowerCase();

  // Controllo critico: se l'utente ha selezionato un'opzione "Altro / Custom", non tentare mai di risolvere online un placeholder!
  if (queryClean.includes("custom model") || queryClean.includes("altro") || queryClean.includes("--") || queryClean === "custom" || queryClean.includes("altro / custom")) {
    return {
      status: "REQUIRES_USER_INPUT",
      level: 3,
      query: queryStr,
      message: `Hai selezionato l'inserimento di un modello personalizzato. Digita il nome esatto del tuo modello oppure compila le specifiche nel Concierge AI in basso.`
    };
  }

  // ------------------------------------------------------------------
  // LIVELLO 1 — Check Database Locale & knowledge_graph.json
  // ------------------------------------------------------------------
  const db = loadHardwareDb();
  const graph = loadKnowledgeGraph();

  // Cerca nel DB locale
  let localMatch = db.find(item => 
    (!type || type === 'all' || item.type === type) && 
    (item.id === queryClean || 
     item.name.toLowerCase() === queryClean || 
     (item.brand && item.model && `${item.brand} ${item.model}`.toLowerCase() === queryClean) ||
     queryClean.includes(item.id) || 
     (queryClean.length > 3 && item.name.toLowerCase().includes(queryClean)))
  );

  if (!localMatch) {
    // Cerca nel knowledge_graph.json
    localMatch = (graph.hardware || []).find(item => 
      (!type || type === 'all' || item.type === type) && 
      (item.id === queryClean || 
       (item.name && item.name.toLowerCase() === queryClean) ||
       (item.aliases && item.aliases.some(alias => queryClean.includes(alias) || alias.includes(queryClean))))
    );
  }

  if (!localMatch) {
    // Cerca in dac_amp_db.json
    const dacAmpDb = loadDacAmpDb();
    const matchType = (itemType) => !type || type === 'all' || (itemType && itemType.toLowerCase().includes(type.toLowerCase()));
    localMatch = dacAmpDb.find(item => {
      if (!matchType(item.type)) return false;
      const itemName = item.model || item.name || '';
      const fullStr = `${item.brand || ''} ${itemName}`.trim().toLowerCase();
      return (
        item.id === queryClean ||
        itemName.toLowerCase() === queryClean ||
        fullStr === queryClean ||
        queryClean.includes(item.id) ||
        (queryClean.length > 3 && itemName.toLowerCase().includes(queryClean)) ||
        (queryClean.length > 3 && fullStr.includes(queryClean))
      );
    });
  }

  if (localMatch) {
    console.log(`[HardwareResolver] [Livello 1] Trovato nel DB/Grafo Locale: ${localMatch.name || localMatch.model || localMatch.id}`);
    let msg = `Modello '${localMatch.name || localMatch.model || localMatch.id}' identificato nel database locale. Misurazioni ed equalizzazione di correzione caricate all'istante.`;
    let tutorOpts = null;
    if (type === 'dac' || type === 'amp') {
      const cat = detectDeviceCategory(queryStr, type) || (type === 'dac' ? "DAC / Scheda Audio" : "Amplificatore per Cuffie");
      if (type === 'dac') {
        msg = `Ho identificato '${localMatch.name || localMatch.model || localMatch.id}' come un ${cat} nel nostro archivio! Le specifiche di questo componente non alterano direttamente la curva EQ della cuffia, ma sono fondamentali per una catena audio trasparente bit-perfect. Vuoi che ti guidi nella configurazione di ASIO/WASAPI o sample rate?`;
        tutorOpts = [
          "Come configurare Audirvana/Foobar in modalità Bit-Perfect (ASIO/WASAPI)?",
          "Quale frequenza di campionamento e attenuazione digitale usare?",
          "Salta configurazione DAC (Non altera l'EQ - Prosegui)"
        ];
      } else {
        msg = `Ho identificato '${localMatch.name || localMatch.model || localMatch.id}' come un ${cat} nel nostro archivio! La sua risposta è lineare (non influisce sull'EQ), ma possiamo ottimizzare il guadagno (Gain) e il Preamp anti-clipping per la tua cuffia. Vuoi un consiglio sulla regolazione del Gain?`;
        tutorOpts = [
          "Come regolare il Gain in base all'impedenza della mia cuffia?",
          "Calcola l'headroom di potenza per evitare il clipping dell'EQ",
          "Salta configurazione AMP (Non altera l'EQ - Prosegui)"
        ];
      }
    }
    return {
      status: "RESOLVED_LOCAL",
      level: 1,
      data: localMatch,
      tutorOptions: tutorOpts,
      message: msg
    };
  }

  // ------------------------------------------------------------------
  // LIVELLO 2 — Ricerca Web Attiva & Auto-Apprendimento
  // ------------------------------------------------------------------
  const webSpecs = await searchWebSpecs(queryStr, type);
  if (webSpecs && webSpecs.found !== false) {
    console.log(`[HardwareResolver] [Livello 2] Risolto tramite ricerca online: ${webSpecs.name}`);
    
    // Salvataggio automatico nel Grafo Locale (Auto-Apprendimento)
    if (!graph.hardware) graph.hardware = [];
    const newHardwareNode = {
      ...webSpecs,
      aliases: [webSpecs.id, webSpecs.name.toLowerCase(), queryClean],
      deficits: [
        {
          issue: "compensazione_generica_auto_apprendimento",
          suggested_filter: { type: "PK", freq: 2000, gain: 1.5, q: 1.0 }
        }
      ],
      source: "online_web_search_auto_learning",
      ingested_at: new Date().toISOString()
    };
    
    graph.hardware.push(newHardwareNode);
    saveKnowledgeGraph(graph);

    let msg = `Misurazioni e specifiche tecniche per '${webSpecs.name}' acquisite dal Web e memorizzate permanentemente nel Grafo di Conoscenza (Auto-Apprendimento attivo).`;
    let tutorOpts = null;
    if (type === 'dac' || type === 'amp') {
      const cat = detectDeviceCategory(queryStr, type) || (type === 'dac' ? "DAC / Scheda Audio" : "Amplificatore per Cuffie");
      if (type === 'dac') {
        msg = `Ho risolto online le specifiche per '${webSpecs.name}' (${cat}). Le sue specifiche di conversione non alterano direttamente la curva EQ (che dipende dalla cuffia), ma sono cruciali per il bit-perfect e l'attenuazione digitale. Vuoi che ti guidi nella configurazione ASIO/WASAPI?`;
        tutorOpts = [
          "Spiegami come impostare il flusso Bit-Perfect (ASIO/WASAPI)",
          "Quale frequenza di campionamento e attenuazione digitale usare?",
          "Salta setup DAC (Non influisce sull'EQ - Prosegui)"
        ];
      } else {
        msg = `Ho risolto online le specifiche per '${webSpecs.name}' (${cat}). Il suo stadio di amplificazione ha un impatto marginale sulla curva EQ, ma è cruciale per la dinamica e per evitare il clipping quando applichi il Preamp dell'EQ. Vuoi aiuto sul Gain?`;
        tutorOpts = [
          "Come regolare il Gain in base all'impedenza della mia cuffia?",
          "Spiegami come impostare il Preamp per evitare il clipping dell'EQ",
          "Salta setup Amplificatore (Non influisce sull'EQ - Prosegui)"
        ];
      }
    }

    return {
      status: "RESOLVED_ONLINE",
      level: 2,
      data: newHardwareNode,
      tutorOptions: tutorOpts,
      message: msg
    };
  }

  // ------------------------------------------------------------------
  // LIVELLO 3 — Fallback Conversazionale & Multimodale con AI Concierge
  // ------------------------------------------------------------------
  console.log(`[HardwareResolver] [Livello 3] Modello ignoto ('${queryStr}'). Innesco intervento AI Concierge e form UI manuale.`);
  if (type === 'dac' || type === 'amp') {
    const cat = detectDeviceCategory(queryStr, type) || (type === 'dac' ? "DAC / Scheda Audio" : "Amplificatore per Cuffie");
    const isDac = type === 'dac';
    return {
      status: "REQUIRES_USER_INPUT",
      level: 3,
      query: queryStr,
      type: type,
      found: false,
      isTutorMode: true,
      category: cat,
      tutorOptions: isDac ? [
        "Spiegami come impostare il flusso Bit-Perfect (ASIO/WASAPI)",
        "Quale frequenza di campionamento e attenuazione digitale usare?",
        "Salta setup manuale DAC (Non impatta sulla curva EQ - Prosegui)"
      ] : [
        "Come regolare il Gain in base all'impedenza della mia cuffia?",
        "Spiegami come impostare il Preamp per evitare il clipping dell'EQ",
        "Salta setup manuale Amplificatore (Non impatta sulla curva EQ - Prosegui)"
      ],
      message: isDac
        ? `Ho identificato il tuo dispositivo '${queryStr}' come un ${cat}. Le specifiche di questo componente non alterano direttamente la curva di risposta in frequenza dell'EQ (che dipende principalmente dalle tue cuffie), ma sono fondamentali per la catena di segnale e il bit-perfect. Vuoi che ti spieghi come configurarlo al meglio nel tuo sistema (es. impostazioni bit-perfect, ASIO/WASAPI o sample rate)?`
        : `Ho identificato il tuo dispositivo '${queryStr}' come un ${cat}. Le sue specifiche tecniche (come guadagno e potenza) hanno un impatto marginale sulla curva di risposta in frequenza dell'EQ rispetto alle cuffie, ma sono cruciali per la dinamica del segnale e per evitare la distorsione da clipping. Vuoi che ti guidi nella configurazione ottimale del gain e dell'adattamento di impedenza?`
    };
  }

  return {
    status: "REQUIRES_USER_INPUT",
    level: 3,
    query: queryStr,
    type: type,
    found: false,
    message: `Non ho trovato misurazioni preesistenti nel nostro database o sul Web per '${queryStr}'. L'AI Concierge è pronta in Chat per guidarti nella compilazione rapida delle specifiche o nell'analisi di un grafico OCR!`
  };
}

module.exports = {
  loadHardwareDb,
  getBrands,
  getModels,
  resolveHardware
};
