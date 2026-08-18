const fs = require('fs');
const path = require('path');

let graphData = null;

function loadGraph() {
  if (!graphData) {
    const raw = fs.readFileSync(path.join(__dirname, 'knowledge_graph.json'), 'utf-8');
    graphData = JSON.parse(raw);
  }
  return graphData;
}

function saveGraph(graph) {
  try {
    const filePath = path.join(__dirname, 'knowledge_graph.json');
    fs.writeFileSync(filePath, JSON.stringify(graph, null, 2), 'utf-8');
    graphData = graph;
    console.log(`[GraphEngine] Grafo acustico salvato e aggiornato su disco (Auto-Apprendimento completato).`);
  } catch (err) {
    console.error(`[GraphEngine] Errore salvataggio grafo acustico:`, err.message);
  }
}

/**
 * Ingestion Dinamica da API Esterna (Fallback Automatico):
 * Interroga iTunes Search API / MusicBrainz per recuperare genere e stile.
 */
async function fetchArtistFromExternalAPI(artistName) {
  try {
    console.log(`[GraphEngine] Ingestion dinamica: ricerca di '${artistName}' su API esterne (iTunes/MusicBrainz)...`);
    
    // 1. Fallback 1: iTunes Search API (Veloce, pubblica, zero key)
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=1`;
    const res = await fetch(itunesUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        const result = data.results[0];
        const genre = result.primaryGenreName || "Pop";
        console.log(`[GraphEngine] Artista trovato su iTunes API: ${result.artistName} (Genere: ${genre})`);
        return {
          name: result.artistName,
          genres: [genre]
        };
      }
    }
  } catch (err) {
    console.warn(`[GraphEngine] iTunes API lookup failed per '${artistName}':`, err.message);
  }

  try {
    // 2. Fallback 2: MusicBrainz API (Open metadata)
    const mbUrl = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(artistName)}&fmt=json&limit=1`;
    const resMb = await fetch(mbUrl, { 
      headers: { 'User-Agent': 'PersonalEQ-AI-Concierge/3.0 ( http://localhost:3001 )' },
      signal: AbortSignal.timeout(4000) 
    });
    if (resMb.ok) {
      const dataMb = await resMb.json();
      if (dataMb && dataMb.artists && dataMb.artists.length > 0) {
        const art = dataMb.artists[0];
        const tags = (art.tags || []).map(t => t.name).slice(0, 3);
        const genre = tags.length > 0 ? tags.join(', ') : "Alternative";
        console.log(`[GraphEngine] Artista trovato su MusicBrainz API: ${art.name} (Generi/Tag: ${genre})`);
        return {
          name: art.name,
          genres: tags.length > 0 ? tags : [genre]
        };
      }
    }
  } catch (err) {
    console.warn(`[GraphEngine] MusicBrainz API lookup failed per '${artistName}':`, err.message);
  }

  console.log(`[GraphEngine] Artista '${artistName}' non trovato su API esterne. Mappatura su profilo acustico generico custom.`);
  return {
    name: artistName,
    genres: ["Alternative / Custom"]
  };
}

/**
 * Pipeline Ibrida di Risoluzione del Grafo Acustico
 */
async function queryAudioGraph(payload, userMessage = "") {
  const graph = loadGraph();
  const rawArtistFilters = [];
  const graphFilters = [];
  const extractedFacts = [];

  // 1. Parsing Hardware (Fuzzy Match alias)
  const userHp = (payload.hardware?.headphone || payload.headphone || '').toLowerCase().trim();
  if (userHp) {
    const matchedHp = graph.hardware.find(h => 
      h.id === userHp || h.aliases.some(alias => userHp.includes(alias))
    );
    if (matchedHp) {
      extractedFacts.push(`Hardware identificato: ${matchedHp.id}. Applicate correzioni per deficit noti.`);
      matchedHp.deficits.forEach(d => graphFilters.push(d.suggested_filter));
    } else {
      extractedFacts.push(`Hardware '${userHp}' non presente nel Grafo. Verrà applicato tuning generico.`);
    }
  }

  let foundArtists = [];

  const candidateArtists = new Set(payload.musicalIdentity?.artists || payload.selectedArtists || []);
  
  if (userMessage && typeof userMessage === 'string') {
    // Controllo se artisti del grafo sono citati nel messaggio della chat
    graph.artists.forEach(a => {
      if (a.aliases && a.aliases.some(alias => alias.length > 2 && userMessage.toLowerCase().includes(alias.toLowerCase()))) {
        candidateArtists.add(a.id);
      }
    });

    // Controllo NLP su parole chiave (es. "ascolto", "artista", "gruppo", "piace", "adoro")
    const keywordRegex = /(?:ascolt(?:o|are)|fan di|adoro|piace|musica di|artista|artisti|gruppo|band|cantante|come|aggiungi|profilo di)\s+([A-Z][a-zA-Z0-9\s-]{2,25}?)(?:[\s,.;!?]|$)/g;
    let match;
    while ((match = keywordRegex.exec(userMessage)) !== null) {
      const possibleArtist = match[1].trim();
      if (possibleArtist && possibleArtist.length > 2 && !/^(di|che|con|per|una|uno|questo|quello|i|le|gli|cuffie|bassi|medi|alti|filtri|suono|audio|più|meno)$/i.test(possibleArtist)) {
        candidateArtists.add(possibleArtist);
      }
    }
  }

  let newArtistIngested = false;

  for (const artInput of candidateArtists) {
    if (!artInput) continue;
    const artClean = artInput.toLowerCase().trim();
    
    // Ricerca Locale nel Grafo
    const matchedArt = graph.artists.find(a => 
      a.id === artClean || (a.aliases && a.aliases.some(alias => artClean.includes(alias) || alias.includes(artClean)))
    );

    if (matchedArt) {
      extractedFacts.push(`[Grafo Locale] Artista risolto: ${matchedArt.name || matchedArt.id} (Genere: ${matchedArt.genre || 'N/A'}).`);
      foundArtists.push({ name: matchedArt.name || matchedArt.id, genres: (matchedArt.genre || '').split(',').map(s=>s.trim()) });

      // Filtri consigliati per artista: presenti solo nei nodi del grafo locale,
      // MAI nei nodi creati da ingestion esterna (difensivo: optional chaining).
      if (Array.isArray(matchedArt.recommended_modifiers) && matchedArt.recommended_modifiers.length > 0) {
        matchedArt.recommended_modifiers.forEach(modifier => graphFilters.push({ ...modifier }));
      }
    } else {
      // Ingestion Dinamica da API Esterna (Fallback Automatico)
      const apiData = await fetchArtistFromExternalAPI(artInput);
      
      const cleanId = artInput.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const newArtistNode = {
        id: cleanId,
        name: apiData.name,
        aliases: [cleanId, apiData.name.toLowerCase(), artInput.toLowerCase()],
        genre: apiData.genres.join(', '),
        source: "external_api_ingestion",
        ingested_at: new Date().toISOString()
      };

      // Auto-Apprendimento: Inserimento nel grafo
      graph.artists.push(newArtistNode);
      newArtistIngested = true;

      extractedFacts.push(`[Ingestion Dinamica + Auto-Apprendimento] Artista '${apiData.name}' acquisito da API esterne (Genere: ${apiData.genres.join('/')}).`);
      foundArtists.push(newArtistNode);
    }
  }

  if (newArtistIngested) {
    saveGraph(graph);
  }

  const candidateGenres = payload.musicalIdentity?.genres || payload.selectedGenres || [];
  if (candidateGenres.length > 0) {
    foundArtists.push({ name: 'Selected Genres', genres: candidateGenres });
  }

  // L'engine calcolerà i desiderata per questi artisti
  if (foundArtists.length > 0) {
     extractedFacts.push(`[Motore DSP] Trovati ${foundArtists.length} elementi timbrici (Generi/Artisti). Verrà calcolata la matrice acustica ponderata.`);
  }

  // 3. Parsing Descrittori Frequenza (Bassi, Medi, Alti) - Se presenti nel grafo
  const prefs = payload.frequencyPreferences || {};
  ['bass', 'mids', 'treble'].forEach(band => {
    const val = prefs[band];
    if (val && graph.descriptors[band] && graph.descriptors[band][val]) {
      const filters = graph.descriptors[band][val];
      if (filters.length > 0) {
        extractedFacts.push(`Preferenza ${band}: '${val}' -> Applicati ${filters.length} filtri dedicati.`);
        graphFilters.push(...filters);
      }
    }
  });

  return { graphFilters, extractedFacts, foundArtists };
}

module.exports = { queryAudioGraph };
